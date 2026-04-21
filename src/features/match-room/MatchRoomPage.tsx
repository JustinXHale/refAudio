import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate, Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import TuneIcon from '@mui/icons-material/Tune'
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined'
import MicOffOutlinedIcon from '@mui/icons-material/MicOffOutlined'
import CallEndIcon from '@mui/icons-material/CallEnd'
import { ConnectionState, RoomEvent, Track, type Room } from 'livekit-client'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from '@/components/layout/Header'
import { useMatch } from '@/hooks/useMatches'
import {
  leaveMatch,
  subscribeToParticipants,
  ensureRefParticipant,
  removeParticipant,
  muteParticipant,
  muteAllParticipants,
  grantAdmin,
  revokeAdmin,
  transferOwnership,
  endMatch,
} from '@/services/matches'
import { useToast } from '@/contexts/ToastContext'
import {
  connectToRoom,
  setMicEnabled,
  disconnectRoom,
  isLiveKitConfigured,
} from '@/services/livekit'
import {
  demoLeaveMatch,
  demoGetParticipants,
  demoRemoveParticipant,
  demoGrantAdmin,
  demoRevokeAdmin,
  demoToggleMuteParticipant,
  demoMuteAll,
  demoUnmuteAll,
  subscribe as demoSubscribe,
} from '@/services/demo'
import type { Participant, ParticipantRole } from '@/types'
import { SESSION_LIMIT_MINUTES } from '@/types'

export function MatchRoomPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const [searchParams] = useSearchParams()
  const role = (searchParams.get('role') || 'spectator') as ParticipantRole
  const { match, loading } = useMatch(matchId)
  const { user, isDemo } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  // Compute early so initial state for stage is correct without re-render
  const isRefRole = useMemo(() => role === 'referee' || role === 'creator', [role])

  const [stage, setStage] = useState<'precheck' | 'in-room'>(isRefRole ? 'precheck' : 'in-room')
  const [micPermission, setMicPermission] = useState<'pending' | 'granted' | 'denied'>('pending')
  const [micLevel, setMicLevel] = useState(0)
  const [sessionSecondsLeft, setSessionSecondsLeft] = useState<number | null>(null)

  const [participants, setParticipants] = useState<Participant[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('connecting')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [remoteCount, setRemoteCount] = useState(0)
  const [speakingMap, setSpeakingMap] = useState<Record<string, number>>({})

  const roomRef = useRef<Room | null>(null)
  const connectingRef = useRef(false)
  const micStreamRef = useRef<MediaStream | null>(null)
  const micAnimFrameRef = useRef<number | null>(null)
  const sessionWarned10Ref = useRef(false)
  const sessionWarned5Ref = useRef(false)
  /** Keeps LiveKit in sync when dynacast/republish toggles the mic (e.g. first subscriber joins). */
  const isMutedRef = useRef(isMuted)
  useEffect(() => {
    isMutedRef.current = isMuted
  }, [isMuted])

  // Mic pre-check: request permission and show audio level for refs before entering the room
  useEffect(() => {
    if (stage !== 'precheck') return

    let cancelled = false
    let animId: number | null = null
    let stream: MediaStream | null = null
    let audioCtx: AudioContext | null = null

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        micStreamRef.current = stream
        setMicPermission('granted')

        audioCtx = new AudioContext()
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        const data = new Uint8Array(analyser.frequencyBinCount)

        const tick = () => {
          analyser.getByteFrequencyData(data)
          const avg = data.reduce((s, v) => s + v, 0) / data.length
          setMicLevel(Math.min(100, Math.round((avg / 128) * 100)))
          animId = requestAnimationFrame(tick)
          micAnimFrameRef.current = animId
        }
        tick()
      } catch {
        if (!cancelled) setMicPermission('denied')
      }
    }

    void start()

    return () => {
      cancelled = true
      if (animId !== null) cancelAnimationFrame(animId)
      if (stream) stream.getTracks().forEach((t) => t.stop())
      if (audioCtx) void audioCtx.close()
      micStreamRef.current = null
      micAnimFrameRef.current = null
      setMicLevel(0)
    }
  }, [stage])

  // Session timer: counts down from SESSION_LIMIT_MINUTES based on match.startedAt
  useEffect(() => {
    if (!match?.startedAt || match.status !== 'live') return

    const startedAtMs = (match.startedAt as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0
    if (!startedAtMs) return

    const limitMs = SESSION_LIMIT_MINUTES * 60 * 1000

    const tick = () => {
      const elapsed = Date.now() - startedAtMs
      const left = Math.max(0, Math.floor((limitMs - elapsed) / 1000))
      setSessionSecondsLeft(left)

      const leftMin = Math.ceil(left / 60)
      if (leftMin <= 10 && !sessionWarned10Ref.current) {
        sessionWarned10Ref.current = true
        showToast(`⚠️ 10 minutes remaining in this session`, 'error')
      }
      if (leftMin <= 5 && !sessionWarned5Ref.current) {
        sessionWarned5Ref.current = true
        showToast(`⚠️ 5 minutes remaining — session ending soon`, 'error')
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [match?.startedAt, match?.status, showToast])

  // Auto-end when session limit expires
  useEffect(() => {
    if (sessionSecondsLeft !== 0) return
    if (!matchId || !user) return

    if (roomRef.current) {
      disconnectRoom(roomRef.current)
      roomRef.current = null
    }

    const isAdmin = match?.adminIds?.includes(user.uid) || match?.creatorId === user.uid
    if (!isDemo && isAdmin && matchId) {
      void endMatch(matchId, user.uid).catch(() => {})
    }

    showToast('Session limit reached (100 min) — event ended', 'error')
    navigate(`/match/${matchId}`, { replace: true })
  }, [sessionSecondsLeft, matchId, user, match, isDemo, navigate, showToast])

  const isRef = role === 'referee' || role === 'creator'
  const canPublish = isRef

  const myParticipant = participants.find((p) => p.userId === user?.uid)

  useEffect(() => {
    if (isDemo || !roomRef.current || !user) return
    if (myParticipant?.isMutedByAdmin === undefined) return
    const adminMuted = !!myParticipant.isMutedByAdmin
    setMicEnabled(roomRef.current, !adminMuted)
    setIsMuted(adminMuted)
  }, [isDemo, myParticipant?.isMutedByAdmin, myParticipant?.userId, user?.uid])

  useEffect(() => {
    if (!matchId) return
    if (isDemo) {
      const refresh = () => setParticipants(demoGetParticipants(matchId))
      refresh()
      return demoSubscribe(refresh)
    }
    if (!user) return
    return subscribeToParticipants(matchId, setParticipants)
  }, [matchId, isDemo, user])

  useEffect(() => {
    if (!match || !user || !matchId || isDemo) return
    const displayName = user.displayName || 'Referee'
    const participantRole = isRef ? (match.creatorId === user.uid ? 'creator' : 'referee') : 'spectator'
    ensureRefParticipant(matchId, user.uid, displayName, participantRole).catch(() => {})
  }, [match, user, matchId, isDemo, isRef])

  // LiveKit connection — only start after pre-check stage is complete
  useEffect(() => {
    if (stage !== 'in-room') return
    if (!match || !user || isDemo || !isLiveKitConfigured) {
      if (isDemo) {
        const timer = setTimeout(() => setConnectionState('connected'), 1500)
        return () => clearTimeout(timer)
      }
      if (!isLiveKitConfigured && !isDemo) {
        setConnectionState('error')
        setErrorMsg('LiveKit is not configured. Check environment variables.')
      }
      return
    }

    if (connectingRef.current || roomRef.current) return
    connectingRef.current = true

    const roomName = match.roomName || `match-${match.id}`
    const displayName = user.displayName || 'Referee'

    connectToRoom(roomName, user.uid, displayName, canPublish, {
      onConnectionStateChanged: (state: ConnectionState) => {
        if (state === ConnectionState.Connected) {
          setConnectionState('connected')
          setErrorMsg(null)
        } else if (state === ConnectionState.Disconnected) {
          setConnectionState('disconnected')
        } else if (state === ConnectionState.Reconnecting) {
          setConnectionState('connecting')
        }
      },
      onRoomReady: (room) => {
        roomRef.current = room
        connectingRef.current = false
        setRemoteCount(room.remoteParticipants.size)
        if (canPublish) {
          room.on(RoomEvent.LocalTrackPublished, (publication) => {
            if (publication.source !== Track.Source.Microphone) return
            if (!isMutedRef.current) return
            void room.localParticipant.setMicrophoneEnabled(false)
          })
        }
      },
      onParticipantConnected: () => {
        setRemoteCount((c) => c + 1)
        const room = roomRef.current
        if (room && canPublish) {
          void room.localParticipant.setMicrophoneEnabled(!isMutedRef.current)
        }
      },
      onParticipantDisconnected: () => {
        setRemoteCount((c) => Math.max(0, c - 1))
      },
      onActiveSpeakersChanged: (speakers) => {
        const map: Record<string, number> = {}
        for (const s of speakers) {
          if (s.isSpeaking) map[s.identity] = s.audioLevel
        }
        setSpeakingMap(map)
      },
    }).catch((err) => {
        console.error('LiveKit connect failed:', err)
        setConnectionState('error')
        setErrorMsg(
          err instanceof Error ? err.message : 'Failed to connect to audio room',
        )
        connectingRef.current = false
      })

    return () => {
      if (roomRef.current) {
        disconnectRoom(roomRef.current)
        roomRef.current = null
      }
      connectingRef.current = false
    }
  }, [match, user, isDemo, canPublish, stage])

  // When Firestore marks the match ended, all clients navigate out; LiveKit disconnects in cleanup.
  // Follow-up: close the server-side room via LiveKit API or a Cloud Function for immediate teardown.
  useEffect(() => {
    if (match?.status === 'ended') {
      navigate(`/match/${matchId}`, { replace: true })
    }
  }, [match?.status, matchId, navigate])

  const handleToggleMic = useCallback(() => {
    if (isDemo) {
      setIsMuted((m) => !m)
      return
    }
    if (!roomRef.current) return
    const newMuted = !isMuted
    setIsMuted(newMuted)
    setMicEnabled(roomRef.current, !newMuted)
  }, [isMuted, isDemo])

  const handleLeave = useCallback(async () => {
    if (!matchId || !user) return

    if (roomRef.current) {
      disconnectRoom(roomRef.current)
      roomRef.current = null
    }

    try {
      if (isDemo) {
        demoLeaveMatch(matchId, user.uid, role)
      } else {
        await leaveMatch(matchId, user.uid, role)
      }
    } catch {
      // leaveMatch may timeout if Firestore is unresponsive; navigate regardless
    } finally {
      navigate(`/match/${matchId}`, { replace: true })
    }
  }, [matchId, user, role, navigate, isDemo])

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'grey.900',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-busy="true"
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress sx={{ color: 'common.white' }} />
          <Typography variant="caption" sx={{ color: 'grey.500' }}>
            Loading event...
          </Typography>
        </Stack>
      </Box>
    )
  }

  if (!match || !user) {
    return <Navigate to="/" replace />
  }

  const isAdmin =
    match.adminIds?.includes(user.uid) || match.creatorId === user.uid

  if (stage === 'precheck') {
    const micOk = micPermission === 'granted'
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'grey.900',
          color: 'common.white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 3,
        }}
      >
        <Stack spacing={3} sx={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={700}>
            Mic Check
          </Typography>
          <Typography variant="body2" color="grey.400">
            Before entering the room, confirm your microphone is working.
          </Typography>

          {micPermission === 'pending' && (
            <Stack alignItems="center" spacing={1.5}>
              <CircularProgress sx={{ color: 'primary.main' }} />
              <Typography variant="caption" color="grey.500">
                Requesting microphone access...
              </Typography>
            </Stack>
          )}

          {micPermission === 'denied' && (
            <Alert severity="error">
              Microphone access was denied. Please allow mic access in your browser settings and refresh.
            </Alert>
          )}

          {micPermission === 'granted' && (
            <Stack spacing={2} alignItems="center">
              <Typography variant="caption" color="success.light">
                Microphone access granted ✓
              </Typography>
              <Box sx={{ width: '100%' }}>
                <Typography variant="caption" color="grey.500" display="block" sx={{ mb: 0.5 }}>
                  Audio level — speak to test
                </Typography>
                <Box
                  sx={{
                    width: '100%',
                    height: 12,
                    bgcolor: 'grey.800',
                    borderRadius: 6,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${micLevel}%`,
                      bgcolor: micLevel > 60 ? 'success.main' : micLevel > 20 ? 'primary.main' : 'grey.600',
                      borderRadius: 6,
                      transition: 'width 0.08s ease, background-color 0.2s',
                    }}
                  />
                </Box>
              </Box>
            </Stack>
          )}

          <Button
            variant="contained"
            size="large"
            disabled={!micOk}
            onClick={() => {
              if (micStreamRef.current) {
                micStreamRef.current.getTracks().forEach((t) => t.stop())
                micStreamRef.current = null
              }
              if (micAnimFrameRef.current !== null) {
                cancelAnimationFrame(micAnimFrameRef.current)
                micAnimFrameRef.current = null
              }
              setStage('in-room')
            }}
          >
            Enter Room
          </Button>

          <Button
            size="small"
            sx={{ color: 'grey.500' }}
            onClick={() => navigate(`/match/${matchId}`, { replace: true })}
          >
            Cancel
          </Button>
        </Stack>
      </Box>
    )
  }
  const isCreator = match.creatorId === user.uid
  const refs = participants.filter(
    (p) => p.role === 'referee' || p.role === 'creator',
  )
  const spectatorCount = match.spectatorCount

  const handleRemove = async (targetUserId: string) => {
    if (!matchId || !isAdmin) return
    if (targetUserId === match.creatorId) return
    if (!window.confirm('Remove this participant?')) return
    try {
      if (isDemo) {
        demoRemoveParticipant(matchId, user.uid, targetUserId)
      } else {
        await removeParticipant(matchId, targetUserId)
      }
      showToast('Participant removed')
    } catch {
      showToast('Failed to remove participant', 'error')
    }
  }

  const handleToggleAdmin = async (
    targetUserId: string,
    currentlyAdmin: boolean,
  ) => {
    if (!matchId || !isCreator) return
    try {
      if (isDemo) {
        if (currentlyAdmin) {
          demoRevokeAdmin(matchId, user.uid, targetUserId)
        } else {
          demoGrantAdmin(matchId, user.uid, targetUserId)
        }
      } else {
        if (currentlyAdmin) {
          await revokeAdmin(matchId, targetUserId)
        } else {
          await grantAdmin(matchId, targetUserId)
        }
      }
      showToast(currentlyAdmin ? 'Admin rights removed' : 'Admin rights granted')
    } catch {
      showToast('Failed to update admin rights', 'error')
    }
  }

  const handleToggleMuteParticipant = async (targetUserId: string) => {
    if (!matchId || !isAdmin) return
    const target = participants.find((p) => p.userId === targetUserId)
    const newMuted = !target?.isMutedByAdmin
    try {
      if (isDemo) {
        demoToggleMuteParticipant(matchId, targetUserId)
      } else {
        await muteParticipant(matchId, targetUserId, newMuted)
      }
    } catch {
      showToast('Failed to update mute', 'error')
    }
  }

  const handleMuteAll = async () => {
    if (!matchId || !isAdmin) return
    try {
      if (isDemo) {
        demoMuteAll(matchId)
      } else {
        await muteAllParticipants(matchId, true)
      }
      showToast('All refs muted')
    } catch {
      showToast('Failed to mute all', 'error')
    }
  }

  const handleUnmuteAll = async () => {
    if (!matchId || !isAdmin) return
    try {
      if (isDemo) {
        demoUnmuteAll(matchId)
      } else {
        await muteAllParticipants(matchId, false)
      }
      showToast('All refs unmuted')
    } catch {
      showToast('Failed to unmute all', 'error')
    }
  }

  const handleTransferOwnership = async (targetUserId: string) => {
    if (!matchId || !isCreator) return
    const target = participants.find((p) => p.userId === targetUserId)
    const name = target?.displayName || 'this person'
    if (!window.confirm(`Transfer ownership to ${name}? You will lose owner privileges.`)) return
    try {
      if (!isDemo) {
        await transferOwnership(matchId, user.uid, targetUserId)
      }
      showToast(`Ownership transferred to ${name}`)
    } catch {
      showToast('Failed to transfer ownership', 'error')
    }
  }

  const connectionColors = {
    connecting: 'warning.main',
    connected: 'success.main',
    disconnected: 'error.main',
    error: 'error.main',
  } as const

  const connectionLabels = {
    connecting: 'Connecting...',
    connected: 'Connected',
    disconnected: 'Reconnecting...',
    error: 'Error',
  } as const

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'grey.900',
        color: 'common.white',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Header
        variant="dark"
        title={match.title}
        rightAction={
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {sessionSecondsLeft !== null && (
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{
                  color: sessionSecondsLeft <= 300 ? 'error.light' : sessionSecondsLeft <= 600 ? 'warning.light' : 'grey.400',
                }}
              >
                {String(Math.floor(sessionSecondsLeft / 60)).padStart(2, '0')}:{String(sessionSecondsLeft % 60).padStart(2, '0')}
              </Typography>
            )}
            <Typography
              variant="caption"
              fontWeight={600}
              sx={{ color: connectionColors[connectionState] }}
            >
              {connectionLabels[connectionState]}
            </Typography>
            {isAdmin && (
              <IconButton
                onClick={() => setShowPanel(!showPanel)}
                aria-label="Manage participants"
                aria-expanded={showPanel}
                aria-controls="manage-panel"
                sx={{
                  color: 'grey.400',
                  '&:hover': { color: 'common.white' },
                }}
                size="small"
              >
                <TuneIcon />
              </IconButton>
            )}
          </Stack>
        }
      />

      {errorMsg && (
        <Alert severity="error" sx={{ mx: 2, mt: 1 }}>
          {errorMsg}
        </Alert>
      )}

      {showPanel && isAdmin && (
        <Paper
          id="manage-panel"
          square
          elevation={0}
          sx={{
            bgcolor: 'grey.800',
            borderBottom: 1,
            borderColor: 'grey.700',
            color: 'grey.100',
          }}
        >
          <Box sx={{ maxWidth: 512, mx: 'auto', px: 2, py: 2 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 2 }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={700}
                color="grey.200"
              >
                Manage Participants
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={handleMuteAll}
                >
                  Mute All
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  onClick={handleUnmuteAll}
                >
                  Unmute All
                </Button>
              </Stack>
            </Stack>

            <Stack spacing={1}>
              {refs.map((p) => {
                const pIsCreator = p.userId === match.creatorId
                const pIsAdmin = match.adminIds?.includes(p.userId)
                const isSelf = p.userId === user.uid
                return (
                  <Stack
                    key={p.id}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      py: 1,
                      px: 1.5,
                      bgcolor: 'grey.900',
                      borderRadius: 2,
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ minWidth: 0 }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: p.isMutedByAdmin
                            ? 'error.main'
                            : 'success.main',
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="body2" color="grey.300" noWrap>
                        {p.displayName}
                      </Typography>
                      {pIsCreator && (
                        <Chip
                          size="small"
                          label="Creator"
                          sx={{
                            bgcolor: 'primary.dark',
                            color: 'primary.contrastText',
                          }}
                        />
                      )}
                      {pIsAdmin && !pIsCreator && (
                        <Chip
                          size="small"
                          label="Admin"
                          color="warning"
                          variant="outlined"
                        />
                      )}
                      {p.isMutedByAdmin && (
                        <Typography variant="caption" color="error.light">
                          Muted
                        </Typography>
                      )}
                    </Stack>

                    {!isSelf && (
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ flexShrink: 0 }}
                      >
                        <Button
                          size="small"
                          variant="contained"
                          color={p.isMutedByAdmin ? 'success' : 'error'}
                          onClick={() =>
                            handleToggleMuteParticipant(p.userId)
                          }
                        >
                          {p.isMutedByAdmin ? 'Unmute' : 'Mute'}
                        </Button>
                        {isCreator && !pIsCreator && (
                          <>
                            <Button
                              size="small"
                              variant="outlined"
                              color="warning"
                              onClick={() =>
                                handleToggleAdmin(p.userId, !!pIsAdmin)
                              }
                            >
                              {pIsAdmin ? '- Admin' : '+ Admin'}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="info"
                              onClick={() =>
                                handleTransferOwnership(p.userId)
                              }
                            >
                              Transfer
                            </Button>
                          </>
                        )}
                        {!pIsCreator && (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleRemove(p.userId)}
                          >
                            Remove
                          </Button>
                        )}
                      </Stack>
                    )}
                  </Stack>
                )
              })}
            </Stack>

            {match.allowSpectators && spectatorCount > 0 && (
              <Typography
                variant="caption"
                color="grey.500"
                sx={{ mt: 2, display: 'block' }}
              >
                {spectatorCount} spectator
                {spectatorCount !== 1 ? 's' : ''} listening
              </Typography>
            )}

            <Stack spacing={1} sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'grey.700' }}>
              <Typography variant="caption" color="grey.400" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Share Codes
              </Typography>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="caption" color="grey.500">Ref Code</Typography>
                  <Typography variant="body2" color="grey.200" fontFamily="monospace" fontWeight={700} letterSpacing={2}>
                    {match.refCode}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  sx={{ color: 'grey.400' }}
                  onClick={() => { navigator.clipboard.writeText(match.refCode); showToast('Ref code copied') }}
                >
                  Copy
                </Button>
              </Stack>
              {match.isPrivate && match.spectatorCode && (
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="caption" color="grey.500">Spectator Code</Typography>
                    <Typography variant="body2" color="grey.200" fontFamily="monospace" fontWeight={700} letterSpacing={2}>
                      {match.spectatorCode}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    sx={{ color: 'grey.400' }}
                    onClick={() => { navigator.clipboard.writeText(match.spectatorCode || ''); showToast('Spectator code copied') }}
                  >
                    Copy
                  </Button>
                </Stack>
              )}
            </Stack>
          </Box>
        </Paper>
      )}

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          maxWidth: 512,
          mx: 'auto',
          width: '100%',
          px: 2,
          py: 3,
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Chip
            label={
              isRef
                ? isAdmin
                  ? 'REFEREE (Admin)'
                  : 'REFEREE'
                : 'SPECTATOR (Listen Only)'
            }
            size="small"
            sx={{
              fontWeight: 700,
              bgcolor: isRef
                ? isAdmin
                  ? 'warning.dark'
                  : 'primary.dark'
                : 'grey.700',
              color: 'common.white',
            }}
          />
        </Box>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ textAlign: 'center' }}>
            {connectionState === 'connected' ? (
              (() => {
                const anyoneSpeaking = Object.keys(speakingMap).length > 0
                const maxLevel = anyoneSpeaking
                  ? Math.max(...Object.values(speakingMap))
                  : 0
                return (
                  <>
                    <Stack
                      direction="row"
                      justifyContent="center"
                      spacing={0.5}
                      sx={{ mb: 3 }}
                    >
                      {[...Array(5)].map((_, i) => {
                        const barBaseHeight = 20 + (i % 3) * 10
                        const active = anyoneSpeaking && !isMuted
                        return (
                          <Box
                            key={i}
                            sx={{
                              width: 6,
                              height: active
                                ? `${Math.max(8, barBaseHeight * maxLevel)}px`
                                : `${barBaseHeight}px`,
                              bgcolor: isMuted
                                ? 'error.main'
                                : active
                                  ? 'success.main'
                                  : 'grey.600',
                              borderRadius: 1,
                              transition: 'height 0.15s ease, background-color 0.2s',
                              opacity: isMuted ? 0.4 : active ? 1 : 0.3,
                              '@media (prefers-reduced-motion: reduce)': {
                                transition: 'none',
                              },
                            }}
                          />
                        )
                      })}
                    </Stack>
                    <Typography variant="body2" color="grey.400">
                      {isRef
                        ? isMuted
                          ? 'Your mic is muted'
                          : anyoneSpeaking
                            ? 'Comms active'
                            : 'Your mic is live'
                        : anyoneSpeaking
                          ? 'Referee comms active'
                          : 'Listening — comms quiet'}
                    </Typography>
                    {!isDemo && remoteCount > 0 && (
                      <Typography
                        variant="caption"
                        color="grey.600"
                        sx={{ mt: 1, display: 'block' }}
                      >
                        {remoteCount} other participant
                        {remoteCount !== 1 ? 's' : ''} in room
                      </Typography>
                    )}
                  </>
                )
              })()
            ) : connectionState === 'error' ? (
              <Typography variant="body2" color="error.light">
                Connection failed
              </Typography>
            ) : (
              <Stack alignItems="center" spacing={2}>
                <CircularProgress sx={{ color: 'common.white' }} />
                <Typography variant="caption" color="grey.500">
                  {isRef
                    ? 'Connecting mic and audio...'
                    : 'Connecting to listen...'}
                </Typography>
              </Stack>
            )}
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1 }}
          >
            <Typography
              variant="caption"
              color="grey.500"
              sx={{ textTransform: 'uppercase', letterSpacing: 1 }}
            >
              Referees ({refs.length}/{match.maxRefs})
            </Typography>
            {isAdmin && (
              <Button
                size="small"
                onClick={() => setShowPanel(!showPanel)}
                aria-expanded={showPanel}
                aria-controls="manage-panel"
              >
                {showPanel ? 'Hide controls' : 'Manage'}
              </Button>
            )}
          </Stack>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {refs.length === 0 ? (
              <Typography variant="body2" color="grey.600">
                Waiting for refs...
              </Typography>
            ) : (
              refs.map((p) => {
                const audioLevel = speakingMap[p.userId] ?? 0
                const isSpeaking = audioLevel > 0
                const muted = !!p.isMutedByAdmin
                return (
                  <Stack
                    key={p.id}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      bgcolor: 'grey.800',
                      borderRadius: 999,
                      px: 1.5,
                      py: 0.75,
                      transition: 'box-shadow 0.2s',
                      boxShadow: isSpeaking && !muted
                        ? '0 0 0 2px rgba(76,175,80,0.6)'
                        : 'none',
                    }}
                  >
                    {isSpeaking && !muted ? (
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing="2px"
                        sx={{ width: 12, height: 14, flexShrink: 0 }}
                      >
                        {[0, 1, 2].map((i) => (
                          <Box
                            key={i}
                            sx={{
                              width: 3,
                              borderRadius: 0.5,
                              bgcolor: 'success.main',
                              height: `${Math.max(4, Math.min(14, audioLevel * 14 * (0.6 + Math.random() * 0.4)))}px`,
                              transition: 'height 0.1s ease',
                            }}
                          />
                        ))}
                      </Stack>
                    ) : (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: muted
                            ? 'error.main'
                            : p.isConnected
                              ? 'success.main'
                              : 'error.main',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <Typography variant="body2" color={isSpeaking && !muted ? 'success.light' : 'grey.300'}>
                      {p.displayName}
                    </Typography>
                  </Stack>
                )
              })
            )}
          </Stack>
          {match.allowSpectators && (
            <Typography
              variant="caption"
              color="grey.500"
              sx={{ mt: 1.5, display: 'block' }}
            >
              {spectatorCount} spectator
              {spectatorCount !== 1 ? 's' : ''} listening
            </Typography>
          )}
        </Box>

        <Stack
          direction="row"
          justifyContent="center"
          alignItems="center"
          spacing={4}
          sx={{ pb: 3 }}
        >
          {isRef && (
            <IconButton
              onClick={handleToggleMic}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              sx={{
                width: 64,
                height: 64,
                bgcolor: isMuted ? 'error.dark' : 'grey.700',
                color: isMuted ? 'error.light' : 'common.white',
                '&:hover': {
                  bgcolor: isMuted ? 'error.main' : 'grey.600',
                },
              }}
            >
              {isMuted ? (
                <MicOffOutlinedIcon fontSize="large" />
              ) : (
                <MicNoneOutlinedIcon fontSize="large" />
              )}
            </IconButton>
          )}

          <IconButton
            onClick={handleLeave}
            aria-label="Leave match"
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'error.main',
              color: 'common.white',
              '&:hover': { bgcolor: 'error.dark' },
            }}
          >
            <CallEndIcon fontSize="large" />
          </IconButton>
        </Stack>

        {isDemo && (
          <Typography
            variant="caption"
            color="grey.700"
            textAlign="center"
            sx={{ py: 2, borderTop: 1, borderColor: 'grey.800' }}
          >
            Demo Mode — audio simulated locally
          </Typography>
        )}
      </Box>
    </Box>
  )
}
