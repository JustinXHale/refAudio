import { useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined'
import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import { useAuth } from '@/contexts/AuthContext'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { useMatch } from '@/hooks/useMatches'
import { useSavedMatchIds } from '@/hooks/useSavedMatchIds'
import { toggleSaveMatch } from '@/services/savedMatches'
import {
  startMatch,
  endMatch,
  deleteMatch,
  joinMatchAsSpectator,
  setRefRole,
} from '@/services/matches'
import {
  demoStartMatch,
  demoEndMatch,
  demoDeleteMatch,
  demoJoinAsSpectator,
  demoLeaveWaitingRoom,
  demoToggleNotify,
  demoAddFakeRefs,
  demoUpdateMaxRefs,
  demoSetRefRole,
} from '@/services/demo'
import { MAX_REFS_LIMIT, REF_ROLE_OPTIONS } from '@/types'
import { refDisplayName } from '@/lib/refNames'
import { useToast } from '@/contexts/ToastContext'

export function MatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const { match, loading } = useMatch(matchId)
  const { user, isDemo } = useAuth()
  const savedIds = useSavedMatchIds()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [saveSaving, setSaveSaving] = useState(false)

  if (!user && !loading) {
    return <Navigate to="/login" replace />
  }

  if (loading) {
    return (
      <AppShell>
        <Header title="Event Details" showBack />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={240}>
          <CircularProgress />
        </Box>
      </AppShell>
    )
  }

  if (!match) {
    return (
      <AppShell>
        <Header title="Event Details" showBack />
        <Stack alignItems="center" py={8} px={2} spacing={2}>
          <Typography color="text.secondary" fontWeight={600}>
            Event not found
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')}>
            Go Home
          </Button>
        </Stack>
      </AppShell>
    )
  }

  const isCreator = user?.uid === match.creatorId
  const isAdmin = user ? match.adminIds?.includes(user.uid) || isCreator : false
  const isRef = user ? match.activeRefs.includes(user.uid) : false
  const isInWaitingRoom = user ? (match.waitingRoom ?? []).includes(user.uid) : false
  const isOnNotifyList = user ? (match.notifyList ?? []).includes(user.uid) : false
  const waitingRoom = match.waitingRoom ?? []
  const canJoinAsSpectator =
    user &&
    match.allowSpectators &&
    match.spectatorCount < match.maxSpectators &&
    !isRef

  const scheduledDate =
    match.scheduledTime &&
    typeof match.scheduledTime === 'object' &&
    'toDate' in match.scheduledTime
      ? (match.scheduledTime as { toDate: () => Date }).toDate()
      : new Date(match.scheduledTime as unknown as string)

  const handleStartMatch = async () => {
    if (!user || !matchId) return
    try {
      setError(null)
      if (isDemo) {
        demoStartMatch(matchId, user.uid)
      } else {
        await startMatch(matchId, user.uid)
      }
      showToast('Event is live!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start match')
      showToast('Failed to start event', 'error')
    }
  }

  const handleEndMatch = async () => {
    if (!user || !matchId) return
    if (!window.confirm('End match for all participants?')) return
    try {
      setError(null)
      if (isDemo) {
        demoEndMatch(matchId, user.uid)
      } else {
        await endMatch(matchId, user.uid)
      }
      showToast('Event ended')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end match')
      showToast('Failed to end event', 'error')
    }
  }

  const handleDeleteMatch = async () => {
    if (!user || !matchId) return
    if (!window.confirm('Delete this event permanently? This cannot be undone.')) return
    try {
      setError(null)
      if (isDemo) {
        demoDeleteMatch(matchId, user.uid)
      } else {
        await deleteMatch(matchId, user.uid)
      }
      showToast('Event deleted')
      navigate(-1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
      showToast('Failed to delete event', 'error')
    }
  }

  const handleJoinAsSpectator = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    if (!matchId) return
    setJoining(true)
    try {
      setError(null)
      if (isDemo) {
        demoJoinAsSpectator(matchId, user.uid)
      } else {
        await joinMatchAsSpectator(matchId, user.uid)
      }
      if (match.status === 'live') {
        navigate(`/match/${matchId}/room?role=spectator`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join')
    }
    setJoining(false)
  }

  const handleEnterRoom = () => {
    const role = isRef ? 'referee' : 'spectator'
    navigate(`/match/${matchId}/room?role=${role}`)
  }

  const handleLeaveWaitingRoom = () => {
    if (!user || !matchId) return
    if (isDemo) demoLeaveWaitingRoom(matchId, user.uid)
  }

  const handleToggleNotify = () => {
    if (!user || !matchId) return
    if (isDemo) demoToggleNotify(matchId, user.uid)
  }

  const isSaved = !!(user && matchId && savedIds.includes(matchId))

  const handleToggleSave = async () => {
    if (!user || !matchId) return
    setSaveSaving(true)
    try {
      setError(null)
      await toggleSaveMatch(user.uid, matchId, isDemo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update saved events')
    } finally {
      setSaveSaving(false)
    }
  }

  const handleAddDemoRefs = (toWaiting: boolean) => {
    if (!matchId) return
    demoAddFakeRefs(matchId, toWaiting)
  }

  const handleMaxRefsChange = (newMax: number) => {
    if (!user || !matchId || !isDemo) return
    demoUpdateMaxRefs(matchId, user.uid, newMax)
  }

  const statusChip = {
    upcoming: { label: 'UPCOMING', color: 'info' as const },
    live: { label: 'LIVE', color: 'error' as const },
    ended: { label: 'ENDED', color: 'default' as const },
  }

  const handleSetRefRole = async (targetUserId: string, newRole: string) => {
    if (!user || !matchId) return
    try {
      if (isDemo) {
        demoSetRefRole(matchId, user.uid, targetUserId, newRole || null)
      } else {
        await setRefRole(matchId, targetUserId, newRole || null)
      }
    } catch {
      showToast('Failed to update role', 'error')
    }
  }

  const s = statusChip[match.status]

  return (
    <AppShell>
      <Header title="Event Details" showBack />
      <Container maxWidth="sm" sx={{ py: 3, maxWidth: 512 }}>
        <Stack spacing={3}>
          {error && <Alert severity="error">{error}</Alert>}

          <Card elevation={2} sx={{ overflow: 'hidden' }}>
            {match.eventPhotoUrl && (
              <CardMedia
                component="img"
                height="200"
                image={match.eventPhotoUrl}
                alt={`${match.title} event photo`}
                sx={{ objectFit: 'cover' }}
              />
            )}
            <CardContent>
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                <Chip size="small" label={s.label} color={s.color} variant={match.status === 'live' ? 'filled' : 'outlined'} />
                {match.isPrivate && <Chip size="small" label="Private" color="warning" variant="outlined" />}
              </Stack>

              <Typography variant="h6" fontWeight={700} gutterBottom>
                {match.title}
              </Typography>

              <Stack spacing={1} sx={{ mt: 2 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <PlaceOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled', mt: 0.25 }} />
                  <Typography variant="body2" color="text.secondary">
                    {match.location}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <CalendarTodayOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled', mt: 0.25 }} />
                  <Typography variant="body2" color="text.secondary">
                    {scheduledDate.toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    at {scheduledDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {(isAdmin || isRef) && (
            <Card elevation={2}>
              <CardContent>
                <Stack spacing={2}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: (theme) => theme.palette.primary.main + '14',
                      border: 1,
                      borderColor: 'primary.main',
                      borderOpacity: 0.25,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      Ref Code — share with your crew
                    </Typography>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                      <Typography variant="h5" fontFamily="monospace" fontWeight={700} letterSpacing={4}>
                        {match.refCode}
                      </Typography>
                      <Button size="small" onClick={() => { navigator.clipboard.writeText(match.refCode); showToast('Ref code copied') }}>
                        Copy
                      </Button>
                    </Stack>
                  </Box>

                  {match.isPrivate && match.spectatorCode && isAdmin && (
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'warning.50',
                        border: 1,
                        borderColor: 'warning.light',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Spectator Code — share with people who should listen
                      </Typography>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                        <Typography variant="h5" fontFamily="monospace" fontWeight={700} letterSpacing={4}>
                          {match.spectatorCode}
                        </Typography>
                        <Button size="small" color="warning" onClick={() => { navigator.clipboard.writeText(match.spectatorCode || ''); showToast('Spectator code copied') }}>
                          Copy
                        </Button>
                      </Stack>
                    </Box>
                  )}

                  {isAdmin && match.status === 'upcoming' && (
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Max referees
                      </Typography>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleMaxRefsChange(match.maxRefs - 1)}
                          disabled={match.maxRefs <= 1}
                          aria-label="Decrease max referees"
                        >
                          −
                        </IconButton>
                        <Typography variant="body2" fontWeight={700} sx={{ minWidth: 24, textAlign: 'center' }}>
                          {match.maxRefs}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleMaxRefsChange(match.maxRefs + 1)}
                          disabled={match.maxRefs >= MAX_REFS_LIMIT}
                          aria-label="Increase max referees"
                        >
                          +
                        </IconButton>
                      </Stack>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}

          <Card elevation={2}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Referee Team ({match.activeRefs.length}/{match.maxRefs})
                </Typography>
                {match.status === 'upcoming' && isAdmin && isDemo && (
                  <Button size="small" onClick={() => handleAddDemoRefs(false)}>
                    + Add demo refs
                  </Button>
                )}
              </Stack>

              <Stack spacing={1}>
                {match.activeRefs.length === 0 ? (
                  <Typography variant="body2" color="text.disabled">
                    No referees connected yet
                  </Typography>
                ) : (
                  match.activeRefs.map((refId, i) => {
                    const name = refDisplayName(refId, i, user?.uid)
                    const assignedRole = match.refRoles?.[refId] || ''
                    return (
                      <Stack
                        key={refId}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ py: 1, px: 1.5, bgcolor: 'grey.100', borderRadius: 2 }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', flexShrink: 0 }} />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>
                              {name}
                            </Typography>
                            {assignedRole && !isAdmin && (
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {assignedRole}
                              </Typography>
                            )}
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                          {isAdmin && match.status !== 'ended' ? (
                            <FormControl size="small" sx={{ minWidth: 130 }}>
                              <InputLabel id={`role-label-${refId}`} shrink sx={{ fontSize: '0.75rem' }}>
                                Role
                              </InputLabel>
                              <Select
                                labelId={`role-label-${refId}`}
                                label="Role"
                                displayEmpty
                                notched
                                value={assignedRole}
                                onChange={(e) => handleSetRefRole(refId, e.target.value)}
                                sx={{ fontSize: '0.75rem', height: 30, '& .MuiSelect-select': { py: 0.5 } }}
                              >
                                <MenuItem value="">
                                  <em>No role</em>
                                </MenuItem>
                                {REF_ROLE_OPTIONS.map((r) => (
                                  <MenuItem key={r} value={r} sx={{ fontSize: '0.8rem' }}>
                                    {r}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          ) : (
                            <>
                              {assignedRole && (
                                <Chip size="small" label={assignedRole} variant="outlined" />
                              )}
                            </>
                          )}
                          {refId === match.creatorId && (
                            <Chip size="small" label="Creator" color="primary" variant="outlined" />
                          )}
                        </Stack>
                      </Stack>
                    )
                  })
                )}
              </Stack>

              {match.allowSpectators && (
                <Typography variant="caption" color="text.disabled" sx={{ mt: 2, display: 'block' }}>
                  {match.spectatorCount} spectator{match.spectatorCount !== 1 ? 's' : ''} listening
                </Typography>
              )}
            </CardContent>
          </Card>

          {match.status === 'upcoming' && (isAdmin || isInWaitingRoom) && (
            <Card elevation={2}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Waiting Room ({waitingRoom.length})
                  </Typography>
                  {isAdmin && isDemo && (
                    <Button size="small" onClick={() => handleAddDemoRefs(true)}>
                      + Add to lobby
                    </Button>
                  )}
                </Stack>

                {waitingRoom.length === 0 ? (
                  <Typography variant="body2" color="text.disabled">
                    No one waiting yet. Refs with the code can pre-join here.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {waitingRoom.map((uid, i) => (
                      <Stack
                        key={uid}
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ py: 1, px: 1.5, bgcolor: 'info.50', borderRadius: 2 }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'info.main' }} />
                          <Typography variant="body2" fontWeight={600}>
                            {refDisplayName(uid, i, user?.uid)}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="info.main">
                          Pre-joined
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
                <Typography variant="caption" color="text.disabled" sx={{ mt: 2, display: 'block' }}>
                  Waiting room refs auto-connect when the match starts.
                </Typography>
              </CardContent>
            </Card>
          )}

          <Stack spacing={2}>
            {isAdmin && match.status === 'upcoming' && (
              <Button variant="contained" size="large" fullWidth onClick={handleStartMatch}>
                Start Event
                {waitingRoom.length > 0 && (
                  <Typography component="span" variant="body2" sx={{ ml: 0.5, opacity: 0.9 }}>
                    ({waitingRoom.length} waiting)
                  </Typography>
                )}
              </Button>
            )}

            {isAdmin && match.status === 'live' && (
              <>
                <Button variant="contained" size="large" fullWidth onClick={handleEnterRoom}>
                  Enter Event Room
                </Button>
                <Button variant="outlined" color="error" size="large" fullWidth onClick={handleEndMatch}>
                  End Event
                </Button>
              </>
            )}

            {!isAdmin && isRef && match.status === 'live' && (
              <Button variant="contained" size="large" fullWidth onClick={handleEnterRoom}>
                Enter Event Room
              </Button>
            )}

            {isInWaitingRoom && match.status === 'upcoming' && (
              <Alert severity="info">
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  You&apos;re in the waiting room
                </Typography>
                <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                  You&apos;ll be auto-connected when the match starts.
                </Typography>
                <Button size="small" onClick={handleLeaveWaitingRoom}>
                  Leave waiting room
                </Button>
              </Alert>
            )}

            {isInWaitingRoom && match.status === 'live' && (
              <Button variant="contained" size="large" fullWidth onClick={handleEnterRoom}>
                Enter Event Room
              </Button>
            )}

            {!isRef && !isInWaitingRoom && match.status === 'live' && canJoinAsSpectator && !match.isPrivate && (
              <Button variant="contained" color="secondary" size="large" fullWidth onClick={handleJoinAsSpectator} disabled={joining}>
                {joining ? 'Joining...' : 'Listen as Spectator'}
              </Button>
            )}

            {user && !isRef && !isInWaitingRoom && match.status === 'upcoming' && !match.isPrivate && (
              <Button
                variant={isOnNotifyList ? 'contained' : 'outlined'}
                color={isOnNotifyList ? 'success' : 'primary'}
                size="large"
                fullWidth
                onClick={handleToggleNotify}
              >
                {isOnNotifyList ? 'Notifications On' : 'Notify Me When Live'}
              </Button>
            )}

            {user && !isCreator && match.status !== 'ended' && (
              <Button
                variant={isSaved ? 'contained' : 'outlined'}
                color="secondary"
                size="large"
                fullWidth
                disabled={saveSaving}
                onClick={handleToggleSave}
              >
                {isSaved ? 'Saved for later' : 'Save for later'}
              </Button>
            )}

            {match.status === 'ended' && (
              <Typography align="center" color="text.secondary" variant="body2">
                This event has ended.
              </Typography>
            )}

            {isCreator && (
              <Button color="error" fullWidth onClick={handleDeleteMatch}>
                Delete Event
              </Button>
            )}
          </Stack>
        </Stack>
      </Container>
    </AppShell>
  )
}
