import { useState, useRef, useMemo } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Slider from '@mui/material/Slider'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { useAuth } from '@/contexts/AuthContext'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { createMatch } from '@/services/matches'
import { demoCreateMatch } from '@/services/demo'
import { EVENT_PHOTO_PRESETS, compressImageFileToDataUrl } from '@/lib/eventPhotos'
import { FREE_TIER_MAX_REFS, FREE_TIER_MAX_SPECTATORS, LIVEKIT_ROOM_CAPACITY, type EventType } from '@/types'
import { useToast } from '@/contexts/ToastContext'

const EVENT_TYPE_OPTIONS: Array<{ value: EventType; label: string }> = [
  { value: 'sport', label: 'Sport' },
  { value: 'concert', label: 'Concert' },
  { value: 'class', label: 'Class/Workshop' },
  { value: 'conference', label: 'Conference' },
  { value: 'other', label: 'Other' },
]

const SUBTYPE_OPTIONS: Record<EventType, Array<{ value: string; label: string }>> = {
  sport: [
    { value: 'rugby', label: 'Rugby' },
    { value: 'soccer', label: 'Soccer' },
    { value: 'basketball', label: 'Basketball' },
    { value: 'football', label: 'Football' },
    { value: 'other', label: 'Other' },
  ],
  concert: [
    { value: 'rock', label: 'Rock' },
    { value: 'pop', label: 'Pop' },
    { value: 'classical', label: 'Classical' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'other', label: 'Other' },
  ],
  'class': [
    { value: 'workshop', label: 'Workshop' },
    { value: 'seminar', label: 'Seminar' },
    { value: 'training', label: 'Training' },
    { value: 'lecture', label: 'Lecture' },
    { value: 'other', label: 'Other' },
  ],
  conference: [
    { value: 'tech', label: 'Tech' },
    { value: 'business', label: 'Business' },
    { value: 'academic', label: 'Academic' },
    { value: 'other', label: 'Other' },
  ],
  other: [{ value: 'other', label: 'Other' }],
}

export function CreateMatchPage() {
  const { user, isDemo, isPro } = useAuth()
  const isPaid = isPro || isDemo
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [eventType, setEventType] = useState<EventType | ''>('')
  const [eventSubtype, setEventSubtype] = useState('')
  const [customEventType, setCustomEventType] = useState('')
  const [customEventSubtype, setCustomEventSubtype] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [allowSpectators, setAllowSpectators] = useState(true)
  const [maxRefs, setMaxRefs] = useState(FREE_TIER_MAX_REFS)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const randomPresetUrl = useMemo(
    () => EVENT_PHOTO_PRESETS[Math.floor(Math.random() * EVENT_PHOTO_PRESETS.length)].url,
    [],
  )
  const [eventPhotoUrl, setEventPhotoUrl] = useState<string | null>(randomPresetUrl)
  const [photoCompressing, setPhotoCompressing] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const PAID_MAX_REFS = 8
  const canSubmit =
    title.trim() &&
    location.trim() &&
    date &&
    time &&
    eventType &&
    (eventType !== 'other' || customEventType.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const scheduledTime = new Date(`${date}T${time}`)
      const input = {
        title: title.trim(),
        location: location.trim(),
        scheduledTime,
        eventType: eventType as EventType,
        eventSubtype: eventSubtype === 'other' && customEventSubtype.trim()
          ? customEventSubtype.trim()
          : eventSubtype,
        ...(eventType === 'other' && customEventType.trim()
          ? { customEventTypeLabel: customEventType.trim() }
          : {}),
        ...(eventPhotoUrl ? { eventPhotoUrl } : {}),
        isPrivate,
        allowSpectators,
        maxRefs,
        maxSpectators: isPaid ? LIVEKIT_ROOM_CAPACITY - maxRefs : FREE_TIER_MAX_SPECTATORS,
        creatorId: user.uid,
        creatorDisplayName: user.displayName || 'Organizer',
      }

      let matchId: string
      if (isDemo) {
        matchId = demoCreateMatch(input)
      } else {
        matchId = await createMatch({ ...input, level: 'club' })
      }
      showToast('Event created!')
      navigate(`/match/${matchId}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create match')
      showToast('Failed to create event', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      <Header title="Create Event" showBack />
      <Container maxWidth="sm" component="form" onSubmit={handleSubmit} sx={{ py: 3, maxWidth: 512 }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            id="title"
            label="Event Title"
            required
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Oak Park HS vs Lincoln"
            inputProps={{ maxLength: 100 }}
          />

          <TextField
            id="location"
            label="Location"
            required
            fullWidth
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Seattle, WA"
            inputProps={{ maxLength: 100 }}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              id="date"
              label="Date"
              type="date"
              required
              fullWidth
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              id="time"
              label="Time"
              type="time"
              required
              fullWidth
              value={time}
              onChange={(e) => setTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth required>
              <InputLabel id="event-type-label" shrink required>Event Type</InputLabel>
              <Select
                labelId="event-type-label"
                label="Event Type *"
                notched
                value={eventType}
                onChange={(e) => {
                  const newType = e.target.value as EventType
                  setEventType(newType)
                  setCustomEventType('')
                  setCustomEventSubtype('')
                  setEventSubtype(newType !== 'other' ? SUBTYPE_OPTIONS[newType][0].value : '')
                }}
                displayEmpty
                renderValue={(val) =>
                  val
                    ? EVENT_TYPE_OPTIONS.find((o) => o.value === val)?.label
                    : <em style={{ color: 'inherit', opacity: 0.4 }}>Select a type</em>
                }
              >
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {eventType && eventType !== 'other' && (
              <FormControl fullWidth>
                <InputLabel id="subtype-label">Category</InputLabel>
                <Select
                  labelId="subtype-label"
                  label="Category"
                  value={eventSubtype}
                  onChange={(e) => setEventSubtype(e.target.value)}
                >
                  {SUBTYPE_OPTIONS[eventType].map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>

          {eventType === 'other' && (
            <TextField
              label="Describe your event type"
              fullWidth
              required
              value={customEventType}
              onChange={(e) => setCustomEventType(e.target.value)}
              placeholder="e.g. Debate, Tournament, Rehearsal…"
              inputProps={{ maxLength: 60 }}
            />
          )}

          {eventSubtype === 'other' && eventType !== 'other' && (
            <TextField
              label="Describe the category"
              fullWidth
              value={customEventSubtype}
              onChange={(e) => setCustomEventSubtype(e.target.value)}
              placeholder="e.g. Flag football, Jazz fusion…"
              inputProps={{ maxLength: 60 }}
            />
          )}

          {/* ── Event photo (collapsible) ── */}
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            {/* Header row — always visible */}
            <Stack
              direction="row"
              alignItems="center"
              spacing={1.5}
              onClick={() => setPhotoOpen((o) => !o)}
              sx={{ px: 1.5, py: 1, cursor: 'pointer', userSelect: 'none' }}
            >
              {/* Thumbnail preview */}
              <Box
                sx={{
                  width: 48,
                  height: 30,
                  borderRadius: 1,
                  overflow: 'hidden',
                  flexShrink: 0,
                  bgcolor: 'action.hover',
                }}
              >
                {eventPhotoUrl && (
                  <Box
                    component="img"
                    src={eventPhotoUrl}
                    alt=""
                    aria-hidden
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <Typography variant="body2" fontWeight={600}>
                    Event photo
                  </Typography>
                  {!isPaid && (
                    <Chip
                      icon={<LockOutlinedIcon sx={{ fontSize: '0.7rem !important' }} />}
                      label="Pro to pick"
                      size="small"
                      sx={{ fontSize: '0.6rem', height: 16 }}
                    />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {isPaid ? 'Tap to choose or upload' : 'Random photo assigned — upgrade to choose'}
                </Typography>
              </Box>

              <IconButton size="small" tabIndex={-1} aria-label={photoOpen ? 'Collapse' : 'Expand'}>
                <ExpandMoreIcon
                  sx={{
                    transform: photoOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </IconButton>
            </Stack>

            {/* Expandable body */}
            <Collapse in={photoOpen}>
              <Box sx={{ px: 1.5, pb: 1.5 }}>
                {isPaid ? (
                  <>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 1,
                        mb: 1.5,
                      }}
                    >
                      {EVENT_PHOTO_PRESETS.map((preset) => {
                        const selected = eventPhotoUrl === preset.url
                        return (
                          <Box
                            key={preset.id}
                            component="button"
                            type="button"
                            onClick={() => setEventPhotoUrl(preset.url)}
                            aria-label={`Select photo${selected ? ' (selected)' : ''}`}
                            aria-pressed={selected}
                            sx={{
                              position: 'relative',
                              p: 0,
                              border: 2,
                              borderColor: selected ? 'primary.main' : 'divider',
                              borderRadius: 2,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              bgcolor: 'background.paper',
                              aspectRatio: '16 / 10',
                              transition: (theme) =>
                                theme.transitions.create(['border-color'], {
                                  duration: theme.transitions.duration.shorter,
                                }),
                              '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
                            }}
                          >
                            <Box
                              component="img"
                              src={preset.url}
                              alt=""
                              aria-hidden
                              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              loading="lazy"
                            />
                          </Box>
                        )
                      })}
                    </Box>

                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      <Button
                        type="button"
                        size="small"
                        variant="outlined"
                        disabled={!eventPhotoUrl}
                        onClick={() => setEventPhotoUrl(null)}
                      >
                        No photo
                      </Button>
                      <Button
                        type="button"
                        size="small"
                        variant="outlined"
                        disabled={photoCompressing}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {photoCompressing ? 'Processing…' : 'Upload your photo'}
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          e.target.value = ''
                          if (!file) return
                          setPhotoCompressing(true)
                          setError(null)
                          try {
                            const dataUrl = await compressImageFileToDataUrl(file)
                            setEventPhotoUrl(dataUrl)
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Could not use that image')
                          } finally {
                            setPhotoCompressing(false)
                          }
                        }}
                      />
                    </Stack>
                  </>
                ) : (
                  /* Free tier — show the assigned photo, locked */
                  <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', aspectRatio: '16 / 6' }}>
                    {eventPhotoUrl && (
                      <Box
                        component="img"
                        src={eventPhotoUrl}
                        alt=""
                        aria-hidden
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    )}
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: 'rgba(0,0,0,0.45)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                      }}
                    >
                      <LockOutlinedIcon sx={{ color: 'common.white', fontSize: 28 }} />
                      <Typography variant="caption" sx={{ color: 'common.white', textAlign: 'center' }}>
                        Upgrade to Pro to choose your photo
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
            </Collapse>
          </Box>

          <Box sx={{ pr: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography id="max-refs-label" variant="body2" fontWeight={600}>
                Max Referees: {maxRefs}
              </Typography>
              {!isPaid && <Chip label="Free: up to 3" size="small" sx={{ fontSize: '0.65rem', height: 18 }} />}
            </Stack>
            <Tooltip
              title="Upgrade to Pro to unlock up to 8 referees"
              placement="top"
              disableFocusListener={isPaid}
              disableHoverListener={isPaid}
              disableTouchListener={isPaid}
            >
              <Slider
                value={maxRefs}
                onChange={(_, v) => {
                  const val = v as number
                  setMaxRefs(isPaid ? val : Math.min(val, FREE_TIER_MAX_REFS))
                }}
                min={1}
                max={PAID_MAX_REFS}
                step={1}
                marks={isPaid
                  ? [{ value: PAID_MAX_REFS, label: `${PAID_MAX_REFS} refs` }]
                  : [
                      { value: FREE_TIER_MAX_REFS, label: 'Free' },
                      { value: PAID_MAX_REFS, label: 'Pro 🔒' },
                    ]
                }
                valueLabelDisplay="auto"
                aria-labelledby="max-refs-label"
                getAriaValueText={(v) => `${v} referee${v !== 1 ? 's' : ''}`}
                sx={isPaid ? {} : {
                  '& .MuiSlider-track': {
                    background: (theme) =>
                      `linear-gradient(to right, ${theme.palette.primary.main} 0%, ${theme.palette.primary.main} ${((FREE_TIER_MAX_REFS - 1) / (PAID_MAX_REFS - 1)) * 100}%, ${theme.palette.action.disabled} ${((FREE_TIER_MAX_REFS - 1) / (PAID_MAX_REFS - 1)) * 100}%)`,
                    border: 'none',
                  },
                  '& .MuiSlider-rail': { opacity: 0.3 },
                }}
              />
            </Tooltip>
            <Typography variant="caption" color="text.secondary">
              Drag past 3 unlocks with Pro plan
            </Typography>
          </Box>

          <Stack spacing={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={allowSpectators}
                  onChange={(_, c) => setAllowSpectators(c)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography variant="body2" fontWeight={600}>
                      Allow Spectators
                    </Typography>
                    <Tooltip
                      title={
                        <Box sx={{ p: 0.5 }}>
                          <Typography variant="caption" display="block" fontWeight={700} sx={{ mb: 0.5 }}>
                            Listener limits
                          </Typography>
                          <Typography variant="caption" display="block">
                            Free: up to {FREE_TIER_MAX_SPECTATORS} listeners ({FREE_TIER_MAX_REFS} refs + {FREE_TIER_MAX_SPECTATORS} = {FREE_TIER_MAX_REFS + FREE_TIER_MAX_SPECTATORS} total)
                          </Typography>
                          <Typography variant="caption" display="block">
                            Pro: up to {LIVEKIT_ROOM_CAPACITY - maxRefs} listeners (room capacity of {LIVEKIT_ROOM_CAPACITY} minus your {maxRefs} ref{maxRefs !== 1 ? 's' : ''})
                          </Typography>
                        </Box>
                      }
                      arrow
                      placement="top"
                    >
                      <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary', cursor: 'help' }} />
                    </Tooltip>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Let the public listen in on ref comms
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', ml: 0, '& .MuiFormControlLabel-label': { flex: 1 } }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={isPrivate}
                  disabled={!isPaid}
                  onChange={(_, c) => setIsPrivate(c)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <Typography variant="body2" fontWeight={600} color={isPaid ? 'text.primary' : 'text.disabled'}>
                      Private Event
                    </Typography>
                    {!isPaid && <Chip label="Pro" size="small" sx={{ fontSize: '0.6rem', height: 16 }} />}
                  </Stack>
                  <Typography variant="caption" color={isPaid ? 'text.secondary' : 'text.disabled'}>
                    {isPaid
                      ? isPrivate
                        ? 'Spectators need a code to listen'
                        : 'Anyone can find and listen to this match'
                      : 'Unlock on Pro — spectators need a code to listen'}
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', ml: 0, '& .MuiFormControlLabel-label': { flex: 1 } }}
            />
          </Stack>

          <Alert severity="info" variant="outlined">
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              How codes work
            </Typography>
            <Typography variant="body2" color="text.secondary" component="div">
              <strong>Ref Code</strong> — share with your officiating crew. Only people with this code can
              speak.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {isPrivate ? (
                <>
                  <strong>Spectator Code</strong> — share with anyone you want to listen in. Without it,
                  nobody can find or join as spectator.
                </>
              ) : (
                <>Spectators can find and listen from the public match listing — no code needed.</>
              )}
            </Typography>
          </Alert>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            disabled={!canSubmit || submitting}
          >
            {submitting ? 'Creating...' : 'Create Event'}
          </Button>
        </Stack>
      </Container>
    </AppShell>
  )
}
