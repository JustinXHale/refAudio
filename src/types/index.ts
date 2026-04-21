import type { Timestamp } from 'firebase/firestore'

export type MatchLevel = 'MLR' | 'club' | 'youth' | 'high-school' | 'other'
export type MatchStatus = 'upcoming' | 'live' | 'ended'
export type ParticipantRole = 'creator' | 'referee' | 'spectator'

export type EventType = 'sport' | 'concert' | 'class' | 'conference' | 'other'
export type EventSubtype = {
  sport: 'rugby' | 'soccer' | 'basketball' | 'football' | 'other'
  concert: 'rock' | 'pop' | 'classical' | 'jazz' | 'other'
  class: 'workshop' | 'seminar' | 'training' | 'lecture' | 'other'
  conference: 'tech' | 'business' | 'academic' | 'other'
  other: 'other'
}

export interface UserProfile {
  id: string
  createdAt: Timestamp
  updatedAt: Timestamp
  displayName: string
  email?: string
  phoneNumber?: string
  photoURL?: string
  /** If true, event detail may show email + mailto for organizer contact (POC). */
  showEmailPublic?: boolean
  /** Match IDs the user bookmarked to track (still listed in public Events too). */
  savedMatchIds?: string[]
}

/** Labels the creator can assign to each ref (keyed by userId). */
export type RefRole = typeof REF_ROLE_OPTIONS[number]

export const REF_ROLE_OPTIONS = [
  'Head Referee',
  'Assistant Referee',
  'TMO',
  'Touch Judge',
  'Reserve Official',
  'Timekeeper',
  'Other',
] as const

export interface Match {
  id: string
  createdAt: Timestamp
  updatedAt: Timestamp

  title: string
  level: MatchLevel
  location: string
  scheduledTime: Timestamp
  /** Cover image: HTTPS URL or JPEG data URL (POC). */
  eventPhotoUrl?: string
  eventType: EventType
  eventSubtype?: string

  status: MatchStatus
  startedAt?: Timestamp
  endedAt?: Timestamp

  /** Soft-hide from discovery lists; document retained for history/stats. */
  archived?: boolean
  archivedAt?: Timestamp
  /** Denormalized at create time for display without cross-user profile reads. */
  creatorDisplayName?: string

  /** High-water mark for concurrent spectators (updated on join). */
  peakSpectators?: number

  isPublic: boolean
  isPrivate: boolean
  allowSpectators: boolean
  refCode: string
  spectatorCode?: string

  creatorId: string
  adminIds: string[]
  activeRefs: string[]
  waitingRoom: string[]
  notifyList: string[]
  spectatorCount: number

  /** Creator-assigned role labels for each ref (userId → role string). */
  refRoles?: Record<string, string>
  /** Display names for each ref, written on join so event detail page can show real names. */
  refNames?: Record<string, string>

  roomId: string
  roomName: string

  maxRefs: number
  maxSpectators: number
}

export interface Participant {
  id: string
  matchId: string
  userId: string
  displayName?: string
  role: ParticipantRole
  joinedAt: Timestamp
  leftAt?: Timestamp
  isConnected: boolean
  isMuted?: boolean
  isMutedByAdmin?: boolean
  audioQuality?: 'good' | 'poor' | 'disconnected'
}

export const DEFAULT_MAX_REFS = 3
export const FREE_TIER_MAX_REFS = 3
export const MAX_REFS_LIMIT = 10
export const MAX_SPECTATORS = 100
export const FREE_TIER_MAX_SPECTATORS = 12
/** Total LiveKit concurrent participant ceiling per room (refs + spectators). */
export const LIVEKIT_ROOM_CAPACITY = 100
export const SESSION_LIMIT_MINUTES = 100
