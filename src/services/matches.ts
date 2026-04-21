import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  runTransaction,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Match, MatchLevel, Participant, ParticipantRole } from '@/types'
import { DEFAULT_MAX_REFS } from '@/types'

function requireDb() {
  if (!db) throw new Error('Firebase not configured')
  return db
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export interface CreateMatchInput {
  title: string
  level: MatchLevel
  location: string
  scheduledTime: Date
  eventType: string
  eventSubtype?: string
  eventPhotoUrl?: string
  isPrivate: boolean
  allowSpectators: boolean
  maxRefs: number
  maxSpectators?: number
  creatorId: string
  creatorDisplayName: string
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s — check Firestore rules`)), ms),
    ),
  ])
}

export async function createMatch(input: CreateMatchInput): Promise<string> {
  const matchData: Record<string, unknown> = {
    title: input.title,
    level: input.level,
    location: input.location,
    scheduledTime: input.scheduledTime,
    eventType: input.eventType,
    eventSubtype: input.eventSubtype || null,
    eventPhotoUrl: input.eventPhotoUrl || null,
    status: 'upcoming' as const,
    isPublic: !input.isPrivate,
    isPrivate: input.isPrivate,
    allowSpectators: input.allowSpectators,
    refCode: generateCode(),
    spectatorCode: input.isPrivate ? generateCode() : null,
    creatorId: input.creatorId,
    creatorDisplayName: input.creatorDisplayName,
    adminIds: [input.creatorId],
    activeRefs: [input.creatorId],
    refNames: { [input.creatorId]: input.creatorDisplayName },
    waitingRoom: [],
    notifyList: [],
    spectatorCount: 0,
    peakSpectators: 0,
    archived: false,
    roomId: '',
    roomName: '',
    maxRefs: input.maxRefs || DEFAULT_MAX_REFS,
    maxSpectators: input.maxSpectators ?? 100,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const ref = collection(requireDb(), 'matches')
  const docRef = await withTimeout(addDoc(ref, matchData), 10000, 'createMatch:addDoc')
  await withTimeout(
    updateDoc(docRef, { roomId: docRef.id, roomName: `match-${docRef.id}` }),
    10000,
    'createMatch:updateDoc',
  )
  return docRef.id
}

export async function getMatch(matchId: string): Promise<Match | null> {
  const snap = await getDoc(doc(requireDb(), 'matches', matchId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Match
}

export function subscribeToMatch(
  matchId: string,
  callback: (match: Match | null) => void,
): Unsubscribe {
  return onSnapshot(doc(requireDb(), 'matches', matchId), (snap) => {
    if (!snap.exists()) {
      callback(null)
      return
    }
    callback({ id: snap.id, ...snap.data() } as Match)
  })
}

/** Exclude archived matches client-side so anonymous queries stay rule-compatible. */
function filterOutArchived(docs: { id: string; data: () => Record<string, unknown> }[]): Match[] {
  return docs
    .filter((d) => (d.data() as { archived?: boolean }).archived !== true)
    .map((d) => ({ id: d.id, ...d.data() }) as Match)
}

function scheduledMs(m: Match): number {
  const st = m.scheduledTime as { toDate?: () => Date } | undefined
  if (st && typeof st.toDate === 'function') return st.toDate().getTime()
  return 0
}

function startedMs(m: Match): number {
  const st = m.startedAt as { toDate?: () => Date } | undefined
  if (st && typeof st.toDate === 'function') return st.toDate().getTime()
  return 0
}

/**
 * Public home lists: one Firestore listener on `isPublic == true` only, then filter by `status`
 * in memory. Compound queries (`status` + `isPublic`) are prone to `permission-denied` for
 * signed-out clients when rules only constrain `isPublic` — the rules engine aligns cleanly
 * with a single equality on `isPublic`.
 */
type PublicBucket = 'live' | 'upcoming' | 'ended'

const publicBuckets: Record<
  PublicBucket,
  Set<(matches: Match[]) => void>
> = {
  live: new Set(),
  upcoming: new Set(),
  ended: new Set(),
}

let publicMatchesUnsub: Unsubscribe | null = null
let publicMatchesCache: Match[] = []

/** Fired when the shared public listener errors or recovers (message null = ok). */
const publicListenerErrorSubscribers = new Set<(message: string | null) => void>()
let lastPublicListenerMessage: string | null = null

function setPublicListenerErrorMessage(message: string | null) {
  lastPublicListenerMessage = message
  publicListenerErrorSubscribers.forEach((fn) => fn(message))
}

/** Subscribe to Firestore errors from the shared public matches listener (dev/ops UX). */
export function subscribePublicMatchesListenerError(
  callback: (message: string | null) => void,
): Unsubscribe {
  publicListenerErrorSubscribers.add(callback)
  callback(lastPublicListenerMessage)
  return () => {
    publicListenerErrorSubscribers.delete(callback)
  }
}

function sortPublicByBucket(bucket: PublicBucket, list: Match[]): Match[] {
  const out = [...list]
  if (bucket === 'live') {
    out.sort((a, b) => startedMs(b) - startedMs(a))
  } else if (bucket === 'upcoming') {
    out.sort((a, b) => scheduledMs(a) - scheduledMs(b))
  } else {
    out.sort((a, b) => scheduledMs(b) - scheduledMs(a))
  }
  return out
}

function derivePublicBucket(bucket: PublicBucket, all: Match[]): Match[] {
  const filtered = all.filter((m) => m.status === bucket)
  return sortPublicByBucket(bucket, filtered)
}

function notifyPublicBucket(bucket: PublicBucket) {
  const list = derivePublicBucket(bucket, publicMatchesCache)
  publicBuckets[bucket].forEach((cb) => cb(list))
}

function notifyAllPublicBuckets() {
  ;(['live', 'upcoming', 'ended'] as const).forEach((b) => notifyPublicBucket(b))
}

function tearDownPublicListenerIfIdle() {
  const total =
    publicBuckets.live.size + publicBuckets.upcoming.size + publicBuckets.ended.size
  if (total === 0 && publicMatchesUnsub) {
    publicMatchesUnsub()
    publicMatchesUnsub = null
    publicMatchesCache = []
    setPublicListenerErrorMessage(null)
  }
}

function ensurePublicMatchesListener() {
  if (publicMatchesUnsub) return

  const q = query(collection(requireDb(), 'matches'), where('isPublic', '==', true))
  publicMatchesUnsub = onSnapshot(
    q,
    (snap) => {
      setPublicListenerErrorMessage(null)
      publicMatchesCache = filterOutArchived(snap.docs)
      notifyAllPublicBuckets()
    },
    (err: { code?: string; message?: string }) => {
      const msg =
        err.code === 'permission-denied'
          ? 'Firestore is blocking public event reads until rules are deployed. On your machine: firebase login (or firebase login --reauth), set your default project to the same ID as VITE_FIREBASE_PROJECT_ID, then run npm run deploy:firestore-rules. Paste the rules from firestore.rules into the Firebase Console → Firestore → Rules if you cannot use the CLI.'
          : (err.message ?? 'Firestore listener failed')
      setPublicListenerErrorMessage(msg)
      if (import.meta.env.DEV) {
        console.warn('public matches listener:', err)
      }
      publicMatchesCache = []
      notifyAllPublicBuckets()
    },
  )
}

function subscribeToPublicBucket(
  bucket: PublicBucket,
  callback: (matches: Match[]) => void,
): Unsubscribe {
  ensurePublicMatchesListener()
  publicBuckets[bucket].add(callback)
  callback(derivePublicBucket(bucket, publicMatchesCache))
  return () => {
    publicBuckets[bucket].delete(callback)
    tearDownPublicListenerIfIdle()
  }
}

export function subscribeToLiveMatches(
  callback: (matches: Match[]) => void,
): Unsubscribe {
  return subscribeToPublicBucket('live', callback)
}

export function subscribeToUpcomingMatches(
  callback: (matches: Match[]) => void,
): Unsubscribe {
  return subscribeToPublicBucket('upcoming', callback)
}

export function subscribeToEndedPublicMatches(
  callback: (matches: Match[]) => void,
): Unsubscribe {
  return subscribeToPublicBucket('ended', callback)
}

export async function startMatch(matchId: string, userId: string) {
  const match = await withTimeout(getMatch(matchId), 10000, 'startMatch:getMatch')
  if (!match) throw new Error('Match not found')
  const admins = match.adminIds || [match.creatorId]
  if (!admins.includes(userId)) {
    throw new Error('Only admins can start the match')
  }
  const updates: Record<string, unknown> = {
    status: 'live',
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  if (match.waitingRoom?.length) {
    const newRefs = match.waitingRoom.filter(
      (uid) => !match.activeRefs.includes(uid),
    )
    updates.activeRefs = arrayUnion(...newRefs)
    updates.waitingRoom = []
  }
  await withTimeout(updateDoc(doc(requireDb(), 'matches', matchId), updates), 10000, 'startMatch:updateDoc')
}

export async function endMatch(matchId: string, userId: string) {
  const match = await withTimeout(getMatch(matchId), 10000, 'endMatch:getMatch')
  if (!match) throw new Error('Match not found')
  const admins = match.adminIds || [match.creatorId]
  if (!admins.includes(userId)) {
    throw new Error('Only admins can end the match')
  }
  await withTimeout(
    updateDoc(doc(requireDb(), 'matches', matchId), {
      status: 'ended',
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    10000,
    'endMatch:updateDoc',
  )
}

export async function deleteMatch(matchId: string, userId: string) {
  const match = await withTimeout(getMatch(matchId), 10000, 'deleteMatch:getMatch')
  if (!match) throw new Error('Match not found')
  if (match.creatorId !== userId) {
    throw new Error('Only the creator can delete a match')
  }
  await withTimeout(deleteDoc(doc(requireDb(), 'matches', matchId)), 10000, 'deleteMatch:deleteDoc')
}

export async function archiveMatch(matchId: string, userId: string): Promise<void> {
  const match = await withTimeout(getMatch(matchId), 10000, 'archiveMatch:getMatch')
  if (!match) throw new Error('Match not found')
  if (match.creatorId !== userId) {
    throw new Error('Only the creator can archive a match')
  }
  await withTimeout(
    updateDoc(doc(requireDb(), 'matches', matchId), {
      archived: true,
      archivedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    10000,
    'archiveMatch',
  )
}

export async function unarchiveMatch(matchId: string, userId: string): Promise<void> {
  const match = await withTimeout(getMatch(matchId), 10000, 'unarchiveMatch:getMatch')
  if (!match) throw new Error('Match not found')
  if (match.creatorId !== userId) {
    throw new Error('Only the creator can unarchive a match')
  }
  await withTimeout(
    updateDoc(doc(requireDb(), 'matches', matchId), {
      archived: false,
      archivedAt: null,
      updatedAt: serverTimestamp(),
    }),
    10000,
    'unarchiveMatch',
  )
}

/** Toggle current user on match notify list (Notify me when live). */
export async function toggleNotify(matchId: string, userId: string): Promise<boolean> {
  const database = requireDb()
  const matchRef = doc(database, 'matches', matchId)
  const snap = await withTimeout(getDoc(matchRef), 10000, 'toggleNotify:get')
  if (!snap.exists()) throw new Error('Match not found')
  const notifyList = (snap.data()?.notifyList as string[] | undefined) ?? []
  const on = notifyList.includes(userId)
  await withTimeout(
    updateDoc(matchRef, {
      notifyList: on ? arrayRemove(userId) : arrayUnion(userId),
      updatedAt: serverTimestamp(),
    }),
    10000,
    'toggleNotify:update',
  )
  return !on
}

export async function joinMatchAsRef(matchId: string, userId: string, displayName?: string) {
  const database = requireDb()
  const match = await getMatch(matchId)
  if (!match) throw new Error('Match not found')
  if (match.activeRefs.length >= match.maxRefs) {
    throw new Error(`Match is full (max ${match.maxRefs} referee${match.maxRefs !== 1 ? 's' : ''} — free tier)`)
  }
  if (match.activeRefs.includes(userId)) return

  const name = displayName || 'Referee'
  const nameKey = `refNames.${userId}`

  await updateDoc(doc(database, 'matches', matchId), {
    activeRefs: arrayUnion(userId),
    [nameKey]: name,
    updatedAt: serverTimestamp(),
  })

  await addDoc(collection(database, 'matches', matchId, 'participants'), {
    matchId,
    userId,
    displayName: name,
    role: 'referee' as ParticipantRole,
    joinedAt: serverTimestamp(),
    isConnected: true,
    isMuted: false,
  })
}

export async function joinMatchAsSpectator(matchId: string, userId: string) {
  const database = requireDb()
  const matchRef = doc(database, 'matches', matchId)
  const participantsRef = collection(database, 'matches', matchId, 'participants')

  const existing = await getDocs(query(participantsRef, where('userId', '==', userId)))
  const alreadySpectator = existing.docs.some(
    (d) => (d.data() as Participant).role === 'spectator',
  )
  if (alreadySpectator) return

  const newPartRef = doc(participantsRef)

  await runTransaction(database, async (transaction) => {
    const matchSnap = await transaction.get(matchRef)
    if (!matchSnap.exists()) throw new Error('Match not found')
    const m = matchSnap.data() as Match
    if (!m.allowSpectators) throw new Error('Spectators not allowed')
    const count = m.spectatorCount ?? 0
    if (count >= m.maxSpectators) {
      throw new Error('Spectator limit reached')
    }
    const newCount = count + 1
    const peak = m.peakSpectators ?? 0
    transaction.update(matchRef, {
      spectatorCount: newCount,
      peakSpectators: Math.max(peak, newCount),
      updatedAt: serverTimestamp(),
    })
    transaction.set(newPartRef, {
      matchId,
      userId,
      displayName: '',
      role: 'spectator' as ParticipantRole,
      joinedAt: serverTimestamp(),
      isConnected: true,
    })
  })
}

export async function leaveMatch(
  matchId: string,
  userId: string,
  role: ParticipantRole,
) {
  const database = requireDb()
  const matchRef = doc(database, 'matches', matchId)
  if (role === 'spectator') {
    await withTimeout(
      runTransaction(database, async (transaction) => {
        const matchSnap = await transaction.get(matchRef)
        if (!matchSnap.exists()) return
        const count = (matchSnap.data()?.spectatorCount as number | undefined) ?? 0
        transaction.update(matchRef, {
          spectatorCount: Math.max(0, count - 1),
          updatedAt: serverTimestamp(),
        })
      }),
      10000,
      'leaveMatch:transaction',
    )
  } else {
    await withTimeout(
      updateDoc(matchRef, {
        activeRefs: arrayRemove(userId),
        updatedAt: serverTimestamp(),
      }),
      5000,
      'leaveMatch:updateDoc',
    )
  }
}

/**
 * Ensures the user has a participant document in the subcollection.
 * Called when entering the room — the creator is in activeRefs but
 * doesn't get a participant doc from createMatch.
 */
export async function ensureRefParticipant(
  matchId: string,
  userId: string,
  displayName: string,
  role: ParticipantRole = 'referee',
): Promise<void> {
  const database = requireDb()
  const participantsRef = collection(database, 'matches', matchId, 'participants')
  const q = query(participantsRef, where('userId', '==', userId))
  const snap = await getDocs(q)
  if (!snap.empty) {
    const d = snap.docs[0]
    const existing = d.data() as Participant
    const needsRoleUpdate =
      existing.role === 'spectator' && (role === 'referee' || role === 'creator')
    const needsNameUpdate = !existing.displayName && displayName
    if (needsRoleUpdate || needsNameUpdate) {
      await updateDoc(d.ref, {
        ...(needsRoleUpdate ? { role } : {}),
        ...(displayName ? { displayName } : {}),
      })
    }
    return
  }

  await addDoc(participantsRef, {
    matchId,
    userId,
    displayName,
    role,
    joinedAt: serverTimestamp(),
    isConnected: true,
    isMuted: false,
  })
}

export async function removeParticipant(
  matchId: string,
  targetUserId: string,
): Promise<void> {
  const database = requireDb()
  await withTimeout(
    updateDoc(doc(database, 'matches', matchId), {
      activeRefs: arrayRemove(targetUserId),
      updatedAt: serverTimestamp(),
    }),
    10000,
    'removeParticipant:updateDoc',
  )
  const participantsRef = collection(database, 'matches', matchId, 'participants')
  const q = query(participantsRef, where('userId', '==', targetUserId))
  const snap = await getDocs(q)
  const deletes = snap.docs.map((d) => deleteDoc(d.ref))
  await Promise.all(deletes)
}

export async function muteParticipant(
  matchId: string,
  targetUserId: string,
  muted: boolean,
): Promise<void> {
  const database = requireDb()
  const participantsRef = collection(database, 'matches', matchId, 'participants')
  const q = query(participantsRef, where('userId', '==', targetUserId))
  const snap = await getDocs(q)
  const updates = snap.docs.map((d) =>
    updateDoc(d.ref, { isMutedByAdmin: muted }),
  )
  await withTimeout(Promise.all(updates), 10000, 'muteParticipant')
}

export async function muteAllParticipants(
  matchId: string,
  muted: boolean,
): Promise<void> {
  const database = requireDb()
  const participantsRef = collection(database, 'matches', matchId, 'participants')
  const q = query(participantsRef, where('role', 'in', ['referee', 'creator']))
  const snap = await getDocs(q)
  const updates = snap.docs.map((d) =>
    updateDoc(d.ref, { isMutedByAdmin: muted }),
  )
  await withTimeout(Promise.all(updates), 10000, 'muteAllParticipants')
}

export async function grantAdmin(
  matchId: string,
  targetUserId: string,
): Promise<void> {
  const database = requireDb()
  await withTimeout(
    updateDoc(doc(database, 'matches', matchId), {
      adminIds: arrayUnion(targetUserId),
      updatedAt: serverTimestamp(),
    }),
    10000,
    'grantAdmin',
  )
}

export async function revokeAdmin(
  matchId: string,
  targetUserId: string,
): Promise<void> {
  const database = requireDb()
  await withTimeout(
    updateDoc(doc(database, 'matches', matchId), {
      adminIds: arrayRemove(targetUserId),
      updatedAt: serverTimestamp(),
    }),
    10000,
    'revokeAdmin',
  )
}

export async function transferOwnership(
  matchId: string,
  currentOwnerId: string,
  newOwnerId: string,
): Promise<void> {
  const database = requireDb()
  const match = await getMatch(matchId)
  if (!match) throw new Error('Match not found')
  if (match.creatorId !== currentOwnerId) throw new Error('Only the owner can transfer ownership')
  await withTimeout(
    updateDoc(doc(database, 'matches', matchId), {
      creatorId: newOwnerId,
      adminIds: arrayUnion(newOwnerId),
      updatedAt: serverTimestamp(),
    }),
    10000,
    'transferOwnership',
  )
}

export async function setRefRole(
  matchId: string,
  targetUserId: string,
  role: string | null,
): Promise<void> {
  const database = requireDb()
  const key = `refRoles.${targetUserId}`
  await withTimeout(
    updateDoc(doc(database, 'matches', matchId), {
      [key]: role || '',
      updatedAt: serverTimestamp(),
    }),
    10000,
    'setRefRole:updateDoc',
  )
}

export async function findMatchByCode(
  code: string,
): Promise<Match | null> {
  const upper = code.toUpperCase()
  const database = requireDb()
  const matchesRef = collection(database, 'matches')

  // Search ref codes first
  const refQ = query(
    matchesRef,
    where('refCode', '==', upper),
    where('status', 'in', ['upcoming', 'live']),
  )

  const refResult = await new Promise<Match | null>((resolve) => {
    const unsub = onSnapshot(refQ, (snap) => {
      unsub()
      if (snap.empty) {
        resolve(null)
        return
      }
      const d = snap.docs[0]
      const m = { id: d.id, ...d.data() } as Match
      resolve(m.archived ? null : m)
    })
  })

  if (refResult) return refResult

  // Then search spectator codes
  const specQ = query(
    matchesRef,
    where('spectatorCode', '==', upper),
    where('status', 'in', ['upcoming', 'live']),
  )

  return new Promise((resolve) => {
    const unsub = onSnapshot(specQ, (snap) => {
      unsub()
      if (snap.empty) {
        resolve(null)
        return
      }
      const d = snap.docs[0]
      const m = { id: d.id, ...d.data() } as Match
      resolve(m.archived ? null : m)
    })
  })
}

export function subscribeToParticipants(
  matchId: string,
  callback: (participants: Participant[]) => void,
): Unsubscribe {
  const participantsRef = collection(
    requireDb(),
    'matches',
    matchId,
    'participants',
  )
  return onSnapshot(participantsRef, (snap) => {
    callback(
      snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Participant),
    )
  })
}

function matchScheduledMs(m: Match): number {
  const st = m.scheduledTime as { toDate?: () => Date } | undefined
  if (st && typeof st.toDate === 'function') return st.toDate().getTime()
  return 0
}

/**
 * Matches for "My Events": created by user, joined (ref/waiting/notify), plus bookmarked IDs
 * from `users/{uid}.savedMatchIds`. Bookmarked matches still appear in the public Events list.
 */
export function subscribeToUserMatches(
  userId: string,
  callback: (matches: Match[]) => void,
): Unsubscribe {
  const database = requireDb()
  const matchesRef = collection(database, 'matches')
  const userRef = doc(database, 'users', userId)

  const packs = {
    created: [] as Match[],
    active: [] as Match[],
    waiting: [] as Match[],
    notify: [] as Match[],
    saved: [] as Match[],
  }

  const emit = () => {
    const map = new Map<string, Match>()
    for (const m of [
      ...packs.created,
      ...packs.active,
      ...packs.waiting,
      ...packs.notify,
      ...packs.saved,
    ]) {
      map.set(m.id, m)
    }
    const list = Array.from(map.values()).sort(
      (a, b) => matchScheduledMs(a) - matchScheduledMs(b),
    )
    callback(list)
  }

  const unsubs: Unsubscribe[] = []

  unsubs.push(
    onSnapshot(query(matchesRef, where('creatorId', '==', userId)), (snap) => {
      packs.created = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match)
      emit()
    }),
  )

  unsubs.push(
    onSnapshot(
      query(matchesRef, where('activeRefs', 'array-contains', userId)),
      (snap) => {
        packs.active = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match)
        emit()
      },
    ),
  )

  unsubs.push(
    onSnapshot(
      query(matchesRef, where('waitingRoom', 'array-contains', userId)),
      (snap) => {
        packs.waiting = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match)
        emit()
      },
    ),
  )

  unsubs.push(
    onSnapshot(
      query(matchesRef, where('notifyList', 'array-contains', userId)),
      (snap) => {
        packs.notify = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match)
        emit()
      },
    ),
  )

  unsubs.push(
    onSnapshot(userRef, (snap) => {
      const ids =
        (snap.data()?.savedMatchIds as string[] | undefined)?.filter(Boolean) ?? []
      void Promise.all(ids.map((id) => getDoc(doc(database, 'matches', id)))).then(
        (snaps) => {
          const fetched: Match[] = []
          for (const ms of snaps) {
            if (ms.exists()) {
              fetched.push({ id: ms.id, ...ms.data() } as Match)
            }
          }
          packs.saved = fetched
          emit()
        },
      )
    }),
  )

  return () => {
    unsubs.forEach((u) => u())
  }
}

export async function endMatchAsAdmin(matchId: string): Promise<void> {
  await withTimeout(
    updateDoc(doc(requireDb(), 'matches', matchId), {
      status: 'ended',
      endedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    10000,
    'endMatchAsAdmin',
  )
}

export async function deleteMatchAsAdmin(matchId: string): Promise<void> {
  await withTimeout(deleteDoc(doc(requireDb(), 'matches', matchId)), 10000, 'deleteMatchAsAdmin:deleteDoc')
}

export async function archiveMatchAsAdmin(matchId: string): Promise<void> {
  await withTimeout(
    updateDoc(doc(requireDb(), 'matches', matchId), {
      archived: true,
      archivedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    10000,
    'archiveMatchAsAdmin',
  )
}

export async function getAllMatchesForAdmin(): Promise<Match[]> {
  const database = requireDb()
  const snap = await withTimeout(
    getDocs(collection(database, 'matches')),
    15000,
    'getAllMatchesForAdmin',
  )
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match)
}

export async function toggleSavedMatchForUser(
  userId: string,
  matchId: string,
): Promise<boolean> {
  const database = requireDb()
  const userRef = doc(database, 'users', userId)
  const snap = await getDoc(userRef)
  const existing = (snap.data()?.savedMatchIds as string[] | undefined) ?? []
  const wasSaved = existing.includes(matchId)
  await updateDoc(userRef, {
    savedMatchIds: wasSaved ? arrayRemove(matchId) : arrayUnion(matchId),
    updatedAt: serverTimestamp(),
  })
  return !wasSaved
}
