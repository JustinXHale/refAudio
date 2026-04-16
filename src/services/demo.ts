import type { Match, Participant, ParticipantRole } from '@/types'
import { DEFAULT_MAX_REFS } from '@/types'

const STORAGE_KEY = 'refOpenMic_demo_matches'
const SAVED_KEY_PREFIX = 'refOpenMic_demo_saved_'

function savedStorageKey(userId: string) {
  return SAVED_KEY_PREFIX + userId
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function now(): unknown {
  return { toDate: () => new Date(), seconds: Date.now() / 1000, nanoseconds: 0 }
}

function toTimestamp(date: Date): unknown {
  return { toDate: () => date, seconds: date.getTime() / 1000, nanoseconds: 0 }
}

function loadMatches(): Match[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw, (_key, value) => {
      if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
        return { ...value, toDate: () => new Date(value.seconds * 1000) }
      }
      return value
    })
  } catch {
    return []
  }
}

function saveMatches(matches: Match[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(matches))
  listeners.forEach((cb) => cb())
}

function ensureFields(match: Match): Match {
  if (!match.adminIds) match.adminIds = [match.creatorId]
  if (!match.waitingRoom) match.waitingRoom = []
  if (!match.notifyList) match.notifyList = []
  if (!match.refCode) match.refCode = generateCode()
  if (match.isPrivate == null) match.isPrivate = false
  if (!match.eventType) match.eventType = 'sport'
  if (!match.eventSubtype) match.eventSubtype = 'rugby'
  return match
}

type Listener = () => void
const listeners = new Set<Listener>()

export function subscribe(callback: Listener): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export interface CreateMatchInput {
  title: string
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

export function demoCreateMatch(input: CreateMatchInput): string {
  const id = generateId()
  const match: Match = {
    id,
    createdAt: now(),
    updatedAt: now(),
    title: input.title,
    level: 'club',
    location: input.location,
    ...(input.eventPhotoUrl ? { eventPhotoUrl: input.eventPhotoUrl } : {}),
    scheduledTime: toTimestamp(input.scheduledTime),
    eventType: input.eventType,
    eventSubtype: input.eventSubtype,
    status: 'upcoming',
    isPublic: !input.isPrivate,
    isPrivate: input.isPrivate,
    allowSpectators: input.allowSpectators,
    refCode: generateCode(),
    spectatorCode: input.isPrivate ? generateCode() : undefined,
    creatorId: input.creatorId,
    adminIds: [input.creatorId],
    activeRefs: [input.creatorId],
    waitingRoom: [],
    notifyList: [],
    spectatorCount: 0,
    roomId: id,
    roomName: `match-${id}`,
    maxRefs: input.maxRefs || DEFAULT_MAX_REFS,
    maxSpectators: 100,
  } as Match

  const matches = loadMatches()
  matches.push(match)
  saveMatches(matches)
  return id
}

export function demoGetMatch(matchId: string): Match | null {
  const match = loadMatches().find((m) => m.id === matchId) || null
  if (match) ensureFields(match)
  return match
}

export function demoGetLiveMatches(): Match[] {
  return loadMatches().filter((m) => m.status === 'live' && m.isPublic)
}

export function demoGetUpcomingMatches(): Match[] {
  return loadMatches().filter((m) => m.status === 'upcoming' && m.isPublic)
}

/** Bookmarked match IDs (local demo). Prunes IDs if the match was deleted. */
export function demoGetSavedMatchIds(userId: string): string[] {
  try {
    const raw = localStorage.getItem(savedStorageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed)) return []
    const existing = new Set(loadMatches().map((m) => m.id))
    const pruned = parsed.filter((id) => typeof id === 'string' && existing.has(id))
    if (pruned.length !== parsed.length) {
      localStorage.setItem(savedStorageKey(userId), JSON.stringify(pruned))
    }
    return pruned
  } catch {
    return []
  }
}

/** Returns true if the match is now saved. */
export function demoToggleSaveMatch(userId: string, matchId: string): boolean {
  const ids = [...demoGetSavedMatchIds(userId)]
  const idx = ids.indexOf(matchId)
  if (idx >= 0) {
    ids.splice(idx, 1)
    localStorage.setItem(savedStorageKey(userId), JSON.stringify(ids))
    listeners.forEach((cb) => cb())
    return false
  }
  ids.push(matchId)
  localStorage.setItem(savedStorageKey(userId), JSON.stringify(ids))
  listeners.forEach((cb) => cb())
  return true
}

function scheduledTimeMs(m: Match): number {
  const st = m.scheduledTime as { toDate?: () => Date } | undefined
  if (st && typeof st.toDate === 'function') return st.toDate().getTime()
  return 0
}

/** Events you created or joined, plus any you saved for later (still also listed under Events). */
export function demoGetUserMatches(userId: string): Match[] {
  const all = loadMatches()
  const byRelation = all.filter(
    (m) =>
      m.creatorId === userId ||
      m.activeRefs.includes(userId) ||
      (m.waitingRoom && m.waitingRoom.includes(userId)) ||
      (m.notifyList && m.notifyList.includes(userId)),
  )
  const savedIds = demoGetSavedMatchIds(userId)
  const bySaved = savedIds
    .map((id) => all.find((m) => m.id === id))
    .filter((m): m is Match => m != null)
  const map = new Map<string, Match>()
  for (const m of [...byRelation, ...bySaved]) {
    map.set(m.id, ensureFields({ ...m }))
  }
  return Array.from(map.values()).sort((a, b) => scheduledTimeMs(a) - scheduledTimeMs(b))
}

export function demoStartMatch(matchId: string, userId: string) {
  const matches = loadMatches()
  const match = matches.find((m) => m.id === matchId)
  if (!match) throw new Error('Match not found')
  ensureFields(match)
  if (match.creatorId !== userId && !match.adminIds.includes(userId)) {
    throw new Error('Not authorized')
  }
  match.status = 'live'
  match.startedAt = now() as Match['startedAt']

  for (const uid of match.waitingRoom) {
    if (match.activeRefs.length < match.maxRefs && !match.activeRefs.includes(uid)) {
      match.activeRefs.push(uid)
    }
  }
  match.waitingRoom = []

  saveMatches(matches)

  if (match.notifyList.length > 0) {
    console.log(
      `[Demo] Notified ${match.notifyList.length} user(s) that "${match.title}" is now live`,
    )
  }
}

export function demoEndMatch(matchId: string, userId: string) {
  const matches = loadMatches()
  const match = matches.find((m) => m.id === matchId)
  if (!match) throw new Error('Match not found')
  ensureFields(match)
  if (match.creatorId !== userId && !match.adminIds.includes(userId)) {
    throw new Error('Not authorized')
  }
  match.status = 'ended'
  match.endedAt = now() as Match['endedAt']
  saveMatches(matches)
}

export function demoDeleteMatch(matchId: string, userId: string) {
  const matches = loadMatches()
  const match = matches.find((m) => m.id === matchId)
  if (!match) throw new Error('Match not found')
  if (match.creatorId !== userId) throw new Error('Only the creator can delete a match')
  saveMatches(matches.filter((m) => m.id !== matchId))
}

/**
 * Try to join using any 6-char code. Returns the match and which code type matched.
 */
export function demoJoinByCode(
  code: string,
  userId: string,
): { matchId: string; status: Match['status']; codeType: 'ref' | 'spectator' } | null {
  const upper = code.toUpperCase()
  const matches = loadMatches()

  // Check ref codes first
  const refMatch = matches.find((m) => m.refCode === upper && m.status !== 'ended')
  if (refMatch) {
    ensureFields(refMatch)
    if (refMatch.status === 'upcoming') {
      if (!refMatch.waitingRoom.includes(userId) && !refMatch.activeRefs.includes(userId)) {
        refMatch.waitingRoom.push(userId)
      }
    } else if (refMatch.status === 'live') {
      if (refMatch.activeRefs.length < refMatch.maxRefs && !refMatch.activeRefs.includes(userId)) {
        refMatch.activeRefs.push(userId)
      }
    }
    saveMatches(matches)
    return { matchId: refMatch.id, status: refMatch.status, codeType: 'ref' }
  }

  // Check spectator codes
  const specMatch = matches.find(
    (m) => m.spectatorCode === upper && m.status !== 'ended',
  )
  if (specMatch) {
    return { matchId: specMatch.id, status: specMatch.status, codeType: 'spectator' }
  }

  return null
}

export function demoJoinWaitingRoom(matchId: string, userId: string) {
  const matches = loadMatches()
  const match = matches.find((m) => m.id === matchId)
  if (!match) throw new Error('Match not found')
  ensureFields(match)
  if (
    !match.waitingRoom.includes(userId) &&
    !match.activeRefs.includes(userId)
  ) {
    match.waitingRoom.push(userId)
  }
  saveMatches(matches)
}

export function demoLeaveWaitingRoom(matchId: string, userId: string) {
  const matches = loadMatches()
  const match = matches.find((m) => m.id === matchId)
  if (!match) return
  ensureFields(match)
  match.waitingRoom = match.waitingRoom.filter((id) => id !== userId)
  saveMatches(matches)
}

export function demoToggleNotify(matchId: string, userId: string): boolean {
  const matches = loadMatches()
  const match = matches.find((m) => m.id === matchId)
  if (!match) throw new Error('Match not found')
  ensureFields(match)
  const idx = match.notifyList.indexOf(userId)
  if (idx >= 0) {
    match.notifyList.splice(idx, 1)
    saveMatches(matches)
    return false
  } else {
    match.notifyList.push(userId)
    saveMatches(matches)
    return true
  }
}

export function demoJoinAsSpectator(matchId: string, _userId: string) {
  const matches = loadMatches()
  const match = matches.find((m) => m.id === matchId)
  if (!match) throw new Error('Match not found')
  match.spectatorCount += 1
  saveMatches(matches)
}

export function demoLeaveMatch(matchId: string, userId: string, role: ParticipantRole) {
  const matches = loadMatches()
  const match = matches.find((m) => m.id === matchId)
  if (!match) return
  ensureFields(match)
  if (role === 'spectator') {
    match.spectatorCount = Math.max(0, match.spectatorCount - 1)
  } else {
    match.activeRefs = match.activeRefs.filter((id) => id !== userId)
    match.adminIds = match.adminIds.filter((id) => id !== userId)
  }
  saveMatches(matches)
}

export function demoRemoveParticipant(matchId: string, adminId: string, targetUserId: string) {
  const matches = loadMatches()
  const match = matches.find((m) => m.id === matchId)
  if (!match) throw new Error('Match not found')
  ensureFields(match)
  if (!match.adminIds.includes(adminId)) throw new Error('Not authorized')
  match.activeRefs = match.activeRefs.filter((id) => id !== targetUserId)
  match.adminIds = match.adminIds.filter((id) => id !== targetUserId)
  saveMatches(matches)
}

export function demoGrantAdmin(matchId: string, granterId: string, targetUserId: string) {
  const matches = loadMatches()
  const match = matches.find((m) => m.id === matchId)
  if (!match) throw new Error('Match not found')
  ensureFields(match)
  if (match.creatorId !== granterId) throw new Error('Only the match creator can grant admin')
  if (!match.adminIds.includes(targetUserId)) {
    match.adminIds.push(targetUserId)
  }
  saveMatches(matches)
}

export function demoRevokeAdmin(matchId: string, revokerId: string, targetUserId: string) {
  const matches = loadMatches()
  const match = matches.find((m) => m.id === matchId)
  if (!match) throw new Error('Match not found')
  ensureFields(match)
  if (match.creatorId !== revokerId) throw new Error('Only the match creator can revoke admin')
  if (targetUserId === match.creatorId) throw new Error('Cannot remove creator admin')
  match.adminIds = match.adminIds.filter((id) => id !== targetUserId)
  saveMatches(matches)
}

export function demoUpdateMaxRefs(matchId: string, userId: string, newMax: number) {
  const matches = loadMatches()
  const match = matches.find((m) => m.id === matchId)
  if (!match) throw new Error('Match not found')
  ensureFields(match)
  if (match.creatorId !== userId && !match.adminIds.includes(userId)) {
    throw new Error('Not authorized')
  }
  match.maxRefs = Math.max(1, Math.min(10, newMax))
  saveMatches(matches)
}

const mutedParticipants = new Set<string>()

export function demoToggleMuteParticipant(matchId: string, targetUserId: string): boolean {
  const key = `${matchId}:${targetUserId}`
  if (mutedParticipants.has(key)) {
    mutedParticipants.delete(key)
    listeners.forEach((cb) => cb())
    return false
  } else {
    mutedParticipants.add(key)
    listeners.forEach((cb) => cb())
    return true
  }
}

export function demoMuteAll(matchId: string) {
  const match = demoGetMatch(matchId)
  if (!match) return
  match.activeRefs.forEach((uid) => {
    if (uid !== match.creatorId) {
      mutedParticipants.add(`${matchId}:${uid}`)
    }
  })
  listeners.forEach((cb) => cb())
}

export function demoUnmuteAll(matchId: string) {
  const match = demoGetMatch(matchId)
  if (!match) return
  match.activeRefs.forEach((uid) => {
    mutedParticipants.delete(`${matchId}:${uid}`)
  })
  listeners.forEach((cb) => cb())
}

export function demoGetParticipants(matchId: string): Participant[] {
  const match = demoGetMatch(matchId)
  if (!match) return []
  const demoNames = ['You', 'AR1 - Jordan', 'AR2 - Casey', 'TMO - Riley', 'Reserve - Alex']
  return match.activeRefs.map((uid, i) => ({
    id: `p-${i}`,
    matchId,
    userId: uid,
    displayName: uid === 'demo-user-001' ? 'You' : demoNames[i] || `Ref ${uid.slice(0, 4)}`,
    role: (uid === match.creatorId ? 'creator' : 'referee') as ParticipantRole,
    joinedAt: now(),
    isConnected: true,
    isMuted: false,
    isMutedByAdmin: mutedParticipants.has(`${matchId}:${uid}`),
  })) as Participant[]
}

export function demoAddFakeRefs(matchId: string, toWaitingRoom = false) {
  const matches = loadMatches()
  const match = matches.find((m) => m.id === matchId)
  if (!match) return
  ensureFields(match)
  const fakeIds = ['ref-jordan', 'ref-casey', 'ref-riley']
  for (const fakeId of fakeIds) {
    if (toWaitingRoom) {
      if (!match.waitingRoom.includes(fakeId) && !match.activeRefs.includes(fakeId)) {
        match.waitingRoom.push(fakeId)
      }
    } else {
      if (match.activeRefs.length < match.maxRefs && !match.activeRefs.includes(fakeId)) {
        match.activeRefs.push(fakeId)
      }
    }
  }
  saveMatches(matches)
}
