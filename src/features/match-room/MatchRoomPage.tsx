import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
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
import { ConnectionState, type Room } from 'livekit-client'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from '@/components/layout/Header'
import { useMatch } from '@/hooks/useMatches'
import { leaveMatch, subscribeToParticipants } from '@/services/matches'
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

export function MatchRoomPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const [searchParams] = useSearchParams()
  const role = (searchParams.get('role') || 'spectator') as ParticipantRole
  const { match, loading } = useMatch(matchId)
  const { user, isDemo } = useAuth()
  const navigate = useNavigate()

  const [participants, setParticipants] = useState<Participant[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('connecting')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [remoteCount, setRemoteCount] = useState(0)

  const roomRef = useRef<Room | null>(null)
  const connectingRef = useRef(false)

  const isRef = role === 'referee' || role === 'creator'
  const canPublish = isRef

  useEffect(() => {
    if (!matchId) return
    if (isDemo) {
      const refresh = () => setParticipants(demoGetParticipants(matchId))
      refresh()
      return demoSubscribe(refresh)
    }
    return subscribeToParticipants(matchId, setParticipants)
  }, [matchId, isDemo])

  // LiveKit connection
  useEffect(() => {
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
      onParticipantConnected: () => {
        setRemoteCount((c) => c + 1)
      },
      onParticipantDisconnected: () => {
        setRemoteCount((c) => Math.max(0, c - 1))
      },
    })
      .then((room) => {
        roomRef.current = room
        setRemoteCount(room.remoteParticipants.size)
        connectingRef.current = false
      })
      .catch((err) => {
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
  }, [match, user, isDemo, canPublish])

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
      // Best-effort cleanup
    }
    navigate(`/match/${matchId}`, { replace: true })
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
      >
        <CircularProgress sx={{ color: 'common.white' }} />
      </Box>
    )
  }

  if (!match || !user) {
    navigate('/')
    return null
  }

  const isAdmin =
    match.adminIds?.includes(user.uid) || match.creatorId === user.uid
  const isCreator = match.creatorId === user.uid
  const refs = participants.filter(
    (p) => p.role === 'referee' || p.role === 'creator',
  )
  const spectatorCount = match.spectatorCount

  const handleRemove = (targetUserId: string) => {
    if (!matchId || !isAdmin || !isDemo) return
    if (!window.confirm('Remove this participant?')) return
    demoRemoveParticipant(matchId, user.uid, targetUserId)
  }

  const handleToggleAdmin = (
    targetUserId: string,
    currentlyAdmin: boolean,
  ) => {
    if (!matchId || !isCreator || !isDemo) return
    if (currentlyAdmin) {
      demoRevokeAdmin(matchId, user.uid, targetUserId)
    } else {
      demoGrantAdmin(matchId, user.uid, targetUserId)
    }
  }

  const handleToggleMuteParticipant = (targetUserId: string) => {
    if (!matchId || !isAdmin || !isDemo) return
    demoToggleMuteParticipant(matchId, targetUserId)
  }

  const handleMuteAll = () => {
    if (!matchId || !isAdmin || !isDemo) return
    demoMuteAll(matchId)
  }

  const handleUnmuteAll = () => {
    if (!matchId || !isAdmin || !isDemo) return
    demoUnmuteAll(matchId)
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
              <>
                <Stack
                  direction="row"
                  justifyContent="center"
                  spacing={0.5}
                  sx={{ mb: 3 }}
                >
                  {[...Array(5)].map((_, i) => (
                    <Box
                      key={i}
                      sx={{
                        width: 6,
                        height: `${20 + (i % 3) * 10}px`,
                        bgcolor: isMuted ? 'error.main' : 'success.main',
                        borderRadius: 1,
                        animation: isMuted
                          ? 'none'
                          : 'pulse 0.8s ease-in-out infinite',
                        animationDelay: `${i * 0.15}s`,
                        opacity: isMuted ? 0.4 : undefined,
                        '@keyframes pulse': {
                          '0%, 100%': { opacity: 0.4 },
                          '50%': { opacity: 1 },
                        },
                      }}
                    />
                  ))}
                </Stack>
                <Typography variant="body2" color="grey.400">
                  {isRef
                    ? isMuted
                      ? 'Your mic is muted'
                      : 'Your mic is live'
                    : 'Listening to referee comms'}
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
              refs.map((p) => (
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
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: p.isMutedByAdmin
                        ? 'error.main'
                        : p.isConnected
                          ? 'success.main'
                          : 'error.main',
                    }}
                  />
                  <Typography variant="body2" color="grey.300">
                    {p.displayName}
                  </Typography>
                </Stack>
              ))
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
