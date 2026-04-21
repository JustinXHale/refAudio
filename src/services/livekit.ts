/**
 * LiveKit service for refOpenMic POC.
 *
 * Token generation runs client-side using jose (browser JWT).
 * This is acceptable for a POC with 5-10 testers.
 * Production should move token generation to a Cloud Function.
 */
import { SignJWT } from 'jose'
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
  Participant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
  type LocalTrackPublication,
} from 'livekit-client'

/** Detach must use the same element reference as attach, or audio can keep playing. */
const audioElementsByTrackSid = new Map<string, HTMLAudioElement>()

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL as string | undefined
const API_KEY = import.meta.env.VITE_LIVEKIT_API_KEY as string | undefined
const API_SECRET = import.meta.env.VITE_LIVEKIT_API_SECRET as string | undefined

export const isLiveKitConfigured = Boolean(LIVEKIT_URL && API_KEY && API_SECRET)

export async function generateToken(
  roomName: string,
  participantIdentity: string,
  participantName: string,
  canPublish: boolean,
): Promise<string> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('LiveKit API key/secret not configured')
  }
  const secret = new TextEncoder().encode(API_SECRET)
  const now = Math.floor(Date.now() / 1000)

  return new SignJWT({
    sub: participantIdentity,
    iss: API_KEY,
    nbf: now,
    exp: now + 6000,
    jti: `${participantIdentity}-${now}`,
    name: participantName,
    video: {
      roomJoin: true,
      room: roomName,
      canPublish,
      canSubscribe: true,
      canPublishData: false,
    },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret)
}

/** Optional hook: invoked synchronously after connect + initial mic (if publishing), before `connectToRoom` returns. */
export type OnRoomReady = (room: Room) => void

export interface RoomCallbacks {
  onConnectionStateChanged: (state: ConnectionState) => void
  onTrackSubscribed: (
    track: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => void
  onTrackUnsubscribed: (
    track: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) => void
  onParticipantConnected: (participant: RemoteParticipant) => void
  onParticipantDisconnected: (participant: RemoteParticipant) => void
  onActiveSpeakersChanged: (speakers: Participant[]) => void
}

export async function connectToRoom(
  roomName: string,
  participantIdentity: string,
  participantName: string,
  canPublish: boolean,
  callbacks: Partial<RoomCallbacks> & { onRoomReady?: OnRoomReady },
): Promise<Room> {
  if (!LIVEKIT_URL) throw new Error('LiveKit URL not configured')

  const token = await generateToken(
    roomName,
    participantIdentity,
    participantName,
    canPublish,
  )

  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
    audioCaptureDefaults: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })

  if (callbacks.onConnectionStateChanged) {
    room.on(
      RoomEvent.ConnectionStateChanged,
      callbacks.onConnectionStateChanged,
    )
  }

  room.on(
    RoomEvent.TrackSubscribed,
    (track: RemoteTrack, publication: RemoteTrackPublication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach() as HTMLAudioElement
        const sid = publication.trackSid
        if (sid) audioElementsByTrackSid.set(sid, el)
      }
      callbacks.onTrackSubscribed?.(publication, participant)
    },
  )

  room.on(
    RoomEvent.TrackUnsubscribed,
    (track: RemoteTrack, publication: RemoteTrackPublication, participant) => {
      const sid = publication.trackSid
      const el = sid ? audioElementsByTrackSid.get(sid) : undefined
      if (el) {
        track.detach(el)
        el.srcObject = null
        audioElementsByTrackSid.delete(sid!)
      } else {
        track.detach()
      }
      callbacks.onTrackUnsubscribed?.(publication, participant)
    },
  )

  if (callbacks.onParticipantConnected) {
    room.on(RoomEvent.ParticipantConnected, callbacks.onParticipantConnected)
  }
  if (callbacks.onParticipantDisconnected) {
    room.on(
      RoomEvent.ParticipantDisconnected,
      callbacks.onParticipantDisconnected,
    )
  }

  if (callbacks.onActiveSpeakersChanged) {
    room.on(
      RoomEvent.ActiveSpeakersChanged,
      callbacks.onActiveSpeakersChanged,
    )
  }

  await room.connect(LIVEKIT_URL, token)

  if (canPublish) {
    await room.localParticipant.setMicrophoneEnabled(true)
  }

  callbacks.onRoomReady?.(room)

  return room
}

export function setMicEnabled(room: Room, enabled: boolean): void {
  room.localParticipant.setMicrophoneEnabled(enabled)
}

export function getMicPublication(room: Room): LocalTrackPublication | undefined {
  return room.localParticipant.getTrackPublication(Track.Source.Microphone)
}

export function disconnectRoom(room: Room): void {
  room.disconnect()
  audioElementsByTrackSid.clear()
}
