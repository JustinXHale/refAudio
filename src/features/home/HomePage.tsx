import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import Divider from '@mui/material/Divider'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded'
import ViewListRoundedIcon from '@mui/icons-material/ViewListRounded'
import { AppShell } from '@/components/layout/AppShell'
import { MatchCard } from '@/components/match/MatchCard'
import { MatchListItem } from '@/components/match/MatchListItem'
import { useLiveMatches, useUpcomingMatches, useUserMatches } from '@/hooks/useMatches'
import { useSavedMatchIds } from '@/hooks/useSavedMatchIds'
import { useAuth } from '@/contexts/AuthContext'
import { isFirebaseConfigured } from '@/lib/firebase'

type Tab = 'events' | 'my-events'
type ViewMode = 'grid' | 'list'

export function HomePage() {
  const { isDemo, user } = useAuth()
  const savedIds = useSavedMatchIds()
  const [tab, setTab] = useState<Tab>('events')
  const { matches: liveMatches, loading: liveLoading } = useLiveMatches()
  const { matches: upcomingMatches, loading: upcomingLoading } = useUpcomingMatches()
  const { matches: myMatches, loading: myMatchesLoading } = useUserMatches()

  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('')
  const [locationFilter, setLocationFilter] = useState<string>('')

  const publicEvents = useMemo(() => {
    return [...liveMatches, ...upcomingMatches].sort((a, b) => {
      const aDate =
        typeof a.scheduledTime === 'object' && 'toDate' in a.scheduledTime
          ? (a.scheduledTime as { toDate: () => Date }).toDate()
          : new Date(a.scheduledTime as unknown as string)
      const bDate =
        typeof b.scheduledTime === 'object' && 'toDate' in b.scheduledTime
          ? (b.scheduledTime as { toDate: () => Date }).toDate()
          : new Date(b.scheduledTime as unknown as string)
      return aDate.getTime() - bDate.getTime()
    })
  }, [liveMatches, upcomingMatches])

  const uniqueDates = useMemo(() => {
    const dates = new Set<string>()
    publicEvents.forEach((match) => {
      const date =
        typeof match.scheduledTime === 'object' && 'toDate' in match.scheduledTime
          ? (match.scheduledTime as { toDate: () => Date }).toDate()
          : new Date(match.scheduledTime as unknown as string)
      dates.add(date.toLocaleDateString())
    })
    return Array.from(dates).sort()
  }, [publicEvents])

  const uniqueEventTypes = useMemo(() => {
    const types = new Set<string>()
    publicEvents.forEach((match) => {
      if (match.eventType) types.add(match.eventType)
    })
    return Array.from(types).sort()
  }, [publicEvents])

  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>()
    publicEvents.forEach((match) => {
      if (match.location) locations.add(match.location)
    })
    return Array.from(locations).sort()
  }, [publicEvents])

  const filteredPublicEvents = useMemo(() => {
    return publicEvents.filter((match) => {
      const matchDate =
        typeof match.scheduledTime === 'object' && 'toDate' in match.scheduledTime
          ? (match.scheduledTime as { toDate: () => Date }).toDate()
          : new Date(match.scheduledTime as unknown as string)

      if (dateFilter && matchDate.toLocaleDateString() !== dateFilter) return false
      if (eventTypeFilter && match.eventType !== eventTypeFilter) return false
      if (locationFilter && match.location !== locationFilter) return false

      return true
    })
  }, [publicEvents, dateFilter, eventTypeFilter, locationFilter])

  const showFilters =
    tab === 'events' &&
    (uniqueDates.length > 1 || uniqueEventTypes.length > 1 || uniqueLocations.length > 1)
  const hasActiveFilters = dateFilter || eventTypeFilter || locationFilter

  const matches = tab === 'events' ? filteredPublicEvents : myMatches
  const loading = tab === 'events' ? liveLoading || upcomingLoading : myMatchesLoading

  return (
    <AppShell>
      <Container maxWidth="sm" disableGutters sx={{ maxWidth: 600, mx: 'auto' }}>
        <Box sx={{ px: 2, pt: 3, pb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  component="img"
                  src="/favicon.png"
                  alt=""
                  sx={{ height: 32, objectFit: 'contain' }}
                />
                <Typography variant="h4" component="h1" fontWeight={700}>
                  refOpenMic
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Referee communication for everyone &middot; v0.4
              </Typography>
            </Box>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, v) => { if (v) setViewMode(v) }}
              size="small"
              aria-label="View mode"
            >
              <ToggleButton value="grid" aria-label="Grid view">
                <GridViewRoundedIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="list" aria-label="List view">
                <ViewListRoundedIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Box>

        {!isFirebaseConfigured && !isDemo && (
          <Box sx={{ px: 2, mb: 2 }}>
            <Alert severity="warning">
              <Typography variant="body2" fontWeight={600}>
                Setup Required
              </Typography>
              <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
                Copy <code>.env.example</code> to <code>.env</code> and add your Firebase
                credentials, then restart the dev server.
              </Typography>
            </Alert>
          </Box>
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v as Tab)}
          variant="fullWidth"
          aria-label="Event sections"
          sx={{
            px: 2,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
          }}
        >
          <Tab value="events" label="Events" />
          <Tab
            value="my-events"
            label={
              <Stack direction="row" alignItems="center" spacing={0.5} component="span">
                <span>My Events</span>
                {myMatches.length > 0 && (
                  <Chip label={myMatches.length} size="small" color="primary" variant="outlined" />
                )}
              </Stack>
            }
          />
        </Tabs>

        {showFilters && (
          <Stack spacing={1.5} sx={{ px: 2, pt: 2, pb: 1 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              Filters
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
              {uniqueDates.length > 1 && (
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel id="filter-date">Date</InputLabel>
                  <Select
                    labelId="filter-date"
                    label="Date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  >
                    <MenuItem value="">All Dates</MenuItem>
                    {uniqueDates.map((date) => (
                      <MenuItem key={date} value={date}>
                        {date}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {uniqueEventTypes.length > 1 && (
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel id="filter-type">Type</InputLabel>
                  <Select
                    labelId="filter-type"
                    label="Type"
                    value={eventTypeFilter}
                    onChange={(e) => setEventTypeFilter(e.target.value)}
                  >
                    <MenuItem value="">All Types</MenuItem>
                    {uniqueEventTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {uniqueLocations.length > 1 && (
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="filter-loc">Location</InputLabel>
                  <Select
                    labelId="filter-loc"
                    label="Location"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                  >
                    <MenuItem value="">All Locations</MenuItem>
                    {uniqueLocations.map((location) => (
                      <MenuItem key={location} value={location}>
                        {location}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {hasActiveFilters && (
                <Button size="small" onClick={() => {
                  setDateFilter('')
                  setEventTypeFilter('')
                  setLocationFilter('')
                }}>
                  Clear all
                </Button>
              )}
            </Stack>
          </Stack>
        )}

        <Box sx={{ px: 2, py: 2 }}>
          {loading ? (
            <Stack alignItems="center" py={6} spacing={2}>
              <CircularProgress color="primary" />
              <Typography variant="body2" color="text.secondary">
                Loading events...
              </Typography>
            </Stack>
          ) : matches.length === 0 ? (
            <Stack alignItems="center" py={6} spacing={1}>
              <Typography variant="h3" component="span" role="img" aria-hidden sx={{ opacity: 0.4 }}>
                {tab === 'events' && hasActiveFilters
                  ? '🔍'
                  : tab === 'my-events'
                    ? '🏟️'
                    : '📅'}
              </Typography>
              <Typography variant="body1" fontWeight={600} color="text.secondary">
                {tab === 'events' && hasActiveFilters
                  ? 'No events match your filters'
                  : tab === 'my-events'
                    ? 'No events yet'
                    : 'No public events'}
              </Typography>
              <Typography variant="body2" color="text.disabled">
                {tab === 'events' && hasActiveFilters
                  ? 'Try adjusting your filters'
                  : tab === 'my-events'
                    ? 'Create or join a match, or save one from the Events list'
                    : 'Check back later or create an event'}
              </Typography>
            </Stack>
          ) : viewMode === 'grid' ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1.5,
              }}
            >
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  saved={!!user && savedIds.includes(match.id)}
                  compact
                />
              ))}
            </Box>
          ) : (
            <List disablePadding>
              {matches.map((match, i) => (
                <Box key={match.id}>
                  {i > 0 && <Divider component="li" sx={{ mx: 1.5 }} />}
                  <MatchListItem
                    match={match}
                    saved={!!user && savedIds.includes(match.id)}
                  />
                </Box>
              ))}
            </List>
          )}
        </Box>
      </Container>
    </AppShell>
  )
}
