import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
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
  creatorId: string
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
    adminIds: [input.creatorId],
    activeRefs: [input.creatorId],
    waitingRoom: [],
    notifyList: [],
    spectatorCount: 0,
    roomId: '',
    roomName: '',
    maxRefs: input.maxRefs || DEFAULT_MAX_REFS,
    maxSpectators: 100,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const ref = collection(requireDb(), 'matches')
  const docRef = await addDoc(ref, matchData)
  await updateDoc(docRef, {
    roomId: docRef.id,
    roomName: `match-${docRef.id}`,
  })
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

export function subscribeToLiveMatches(
  callback: (matches: Match[]) => void,
): Unsubscribe {
  const q = query(
    collection(requireDb(), 'matches'),
    where('status', '==', 'live'),
    where('isPublic', '==', true),
    orderBy('startedAt', 'desc'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match))
  })
}

export function subscribeToUpcomingMatches(
  callback: (matches: Match[]) => void,
): Unsubscribe {
  const q = query(
    collection(requireDb(), 'matches'),
    where('status', '==', 'upcoming'),
    where('isPublic', '==', true),
    orderBy('scheduledTime', 'asc'),
  )
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Match))
  })
}

export async function startMatch(matchId: string, userId: string) {
  const match = await getMatch(matchId)
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
  await updateDoc(doc(requireDb(), 'matches', matchId), updates)
}

export async function endMatch(matchId: string, userId: string) {
  const match = await getMatch(matchId)
  if (!match) throw new Error('Match not found')
  const admins = match.adminIds || [match.creatorId]
  if (!admins.includes(userId)) {
    throw new Error('Only admins can end the match')
  }
  await updateDoc(doc(requireDb(), 'matches', matchId), {
    status: 'ended',
    endedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteMatch(matchId: string, userId: string) {
  const match = await getMatch(matchId)
  if (!match) throw new Error('Match not found')
  if (match.creatorId !== userId) {
    throw new Error('Only the creator can delete a match')
  }
  await deleteDoc(doc(requireDb(), 'matches', matchId))
}

export async function joinMatchAsRef(matchId: string, userId: string) {
  const database = requireDb()
  const match = await getMatch(matchId)
  if (!match) throw new Error('Match not found')
  if (match.activeRefs.length >= match.maxRefs) {
    throw new Error('Match is full (max 5 referees)')
  }
  if (match.activeRefs.includes(userId)) return

  await updateDoc(doc(database, 'matches', matchId), {
    activeRefs: arrayUnion(userId),
    updatedAt: serverTimestamp(),
  })

  await addDoc(collection(database, 'matches', matchId, 'participants'), {
    matchId,
    userId,
    role: 'referee' as ParticipantRole,
    joinedAt: serverTimestamp(),
    isConnected: true,
    isMuted: false,
  })
}

export async function joinMatchAsSpectator(matchId: string, userId: string) {
  const database = requireDb()
  const match = await getMatch(matchId)
  if (!match) throw new Error('Match not found')
  if (!match.allowSpectators) throw new Error('Spectators not allowed')
  if (match.spectatorCount >= match.maxSpectators) {
    throw new Error('Spectator limit reached')
  }

  await updateDoc(doc(database, 'matches', matchId), {
    spectatorCount: increment(1),
    updatedAt: serverTimestamp(),
  })

  await addDoc(collection(database, 'matches', matchId, 'participants'), {
    matchId,
    userId,
    role: 'spectator' as ParticipantRole,
    joinedAt: serverTimestamp(),
    isConnected: true,
  })
}

export async function leaveMatch(
  matchId: string,
  userId: string,
  role: ParticipantRole,
) {
  const database = requireDb()
  if (role === 'spectator') {
    await updateDoc(doc(database, 'matches', matchId), {
      spectatorCount: increment(-1),
      updatedAt: serverTimestamp(),
    })
  } else {
    await updateDoc(doc(database, 'matches', matchId), {
      activeRefs: arrayRemove(userId),
      updatedAt: serverTimestamp(),
    })
  }
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
      resolve({ id: d.id, ...d.data() } as Match)
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
      resolve({ id: d.id, ...d.data() } as Match)
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
