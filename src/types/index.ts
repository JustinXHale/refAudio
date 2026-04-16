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
  /** Match IDs the user bookmarked to track (still listed in public Events too). */
  savedMatchIds?: string[]
}

export interface Match {
  id: string
  createdAt: Timestamp
  updatedAt: Timestamp

  title: string
  level: MatchLevel
  location: string
  scheduledTime: Timestamp
  eventType: EventType
  eventSubtype?: string

  status: MatchStatus
  startedAt?: Timestamp
  endedAt?: Timestamp

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

  roomId: string
  roomName: string

  maxRefs: number
  maxSpectators: number
}

export interface Participant {
  id: string
  matchId: string
  userId: string
  displayName: string
  role: ParticipantRole
  joinedAt: Timestamp
  leftAt?: Timestamp
  isConnected: boolean
  isMuted?: boolean
  isMutedByAdmin?: boolean
  audioQuality?: 'good' | 'poor' | 'disconnected'
}

export const DEFAULT_MAX_REFS = 5
export const MAX_REFS_LIMIT = 10
export const MAX_SPECTATORS = 100
