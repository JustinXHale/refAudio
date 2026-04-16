import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { useAuth } from '@/contexts/AuthContext'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { createMatch } from '@/services/matches'
import { demoCreateMatch } from '@/services/demo'
import { DEFAULT_MAX_REFS, MAX_REFS_LIMIT, type EventType } from '@/types'

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
  const { user, isDemo } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [eventType, setEventType] = useState<EventType>('sport')
  const [eventSubtype, setEventSubtype] = useState('rugby')
  const [isPrivate, setIsPrivate] = useState(false)
  const [allowSpectators, setAllowSpectators] = useState(true)
  const [maxRefs, setMaxRefs] = useState(DEFAULT_MAX_REFS)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user) {
    navigate('/login')
    return null
  }

  const canSubmit = title.trim() && location.trim() && date && time

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
        eventType,
        eventSubtype,
        isPrivate,
        allowSpectators,
        maxRefs,
        creatorId: user.uid,
      }

      let matchId: string
      if (isDemo) {
        matchId = demoCreateMatch(input)
      } else {
        matchId = await createMatch({ ...input, level: 'club' })
      }
      navigate(`/match/${matchId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create match')
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      <Header title="Create Match" showBack />
      <Container maxWidth="sm" component="form" onSubmit={handleSubmit} sx={{ py: 3, maxWidth: 512 }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            id="title"
            label="Match Title"
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
            <FormControl fullWidth>
              <InputLabel id="event-type-label">Event Type</InputLabel>
              <Select
                labelId="event-type-label"
                label="Event Type"
                value={eventType}
                onChange={(e) => {
                  const newType = e.target.value as EventType
                  setEventType(newType)
                  setEventSubtype(SUBTYPE_OPTIONS[newType][0].value)
                }}
              >
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
          </Stack>

          <Box>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Max Referees: {maxRefs}
            </Typography>
            <Slider
              value={maxRefs}
              onChange={(_, v) => setMaxRefs(v as number)}
              min={1}
              max={MAX_REFS_LIMIT}
              valueLabelDisplay="auto"
            />
            <Typography variant="caption" color="text.secondary">
              How many refs can connect (1–{MAX_REFS_LIMIT})
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
                  <Typography variant="body2" fontWeight={600}>
                    Allow Spectators
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Let the public listen in on ref comms
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', ml: 0, '& .MuiFormControlLabel-label': { flex: 1 } }}
            />
            <FormControlLabel
              control={
                <Switch checked={isPrivate} onChange={(_, c) => setIsPrivate(c)} color="primary" />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Private Event
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isPrivate
                      ? 'Spectators need a code to listen'
                      : 'Anyone can find and listen to this match'}
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
            {submitting ? 'Creating...' : 'Create Match'}
          </Button>
        </Stack>
      </Container>
    </AppShell>
  )
}
