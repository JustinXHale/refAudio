import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Divider from '@mui/material/Divider'
import SearchIcon from '@mui/icons-material/Search'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { useAuth } from '@/contexts/AuthContext'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { useToast } from '@/contexts/ToastContext'
import {
  getAllMatchesForAdmin,
  deleteMatchAsAdmin,
  archiveMatchAsAdmin,
  endMatchAsAdmin,
} from '@/services/matches'
import type { Match } from '@/types'

// ─── helpers ─────────────────────────────────────────────────────────────────

function toDate(ts: unknown): Date | null {
  if (!ts) return null
  if (typeof ts === 'object' && 'toDate' in (ts as object)) {
    return (ts as { toDate: () => Date }).toDate()
  }
  return null
}

function durationMinutes(match: Match): number | null {
  const s = toDate(match.startedAt)
  const e = toDate(match.endedAt)
  if (!s || !e) return null
  const ms = e.getTime() - s.getTime()
  return ms < 0 ? null : Math.round(ms / 60000)
}

// ─── stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card elevation={1} sx={{ flex: 1, minWidth: 0 }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="h5" fontWeight={700} color="primary.main" lineHeight={1.1}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.25 }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

// ─── analytics tab ───────────────────────────────────────────────────────────

function AnalyticsTab({ matches }: { matches: Match[] }) {
  const total = matches.length
  const live = matches.filter((m) => m.status === 'live').length
  const ended = matches.filter((m) => m.status === 'ended').length
  const upcoming = matches.filter((m) => m.status === 'upcoming').length
  const archived = matches.filter((m) => m.archived).length

  const uniqueOrganizers = new Set(matches.map((m) => m.creatorId)).size

  const totalSpectatorSessions = matches.reduce(
    (sum, m) => sum + Math.max(0, m.peakSpectators ?? m.spectatorCount ?? 0),
    0,
  )
  const peakEverSpectators = Math.max(
    0,
    ...matches.map((m) => m.peakSpectators ?? m.spectatorCount ?? 0),
  )

  const endedWithDuration = matches.filter((m) => m.status === 'ended' && durationMinutes(m) !== null)
  const avgDurationMin =
    endedWithDuration.length > 0
      ? Math.round(
          endedWithDuration.reduce((s, m) => s + (durationMinutes(m) ?? 0), 0) /
            endedWithDuration.length,
        )
      : null

  // Event type breakdown
  const byType: Record<string, number> = {}
  matches.forEach((m) => {
    const t = m.eventType || 'other'
    byType[t] = (byType[t] ?? 0) + 1
  })
  const typeEntries = Object.entries(byType).sort((a, b) => b[1] - a[1])

  // Top organizers
  const byOrganizer: Record<string, { name: string; count: number }> = {}
  matches.forEach((m) => {
    const id = m.creatorId
    if (!byOrganizer[id]) byOrganizer[id] = { name: m.creatorDisplayName || 'Unknown', count: 0 }
    byOrganizer[id].count++
  })
  const topOrganizers = Object.values(byOrganizer)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Avg refs per ended event
  const avgRefs =
    ended > 0
      ? (
          matches
            .filter((m) => m.status === 'ended')
            .reduce((s, m) => s + (m.activeRefs?.length ?? 0), 0) / ended
        ).toFixed(1)
      : null

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          Overview
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
          <StatCard label="Total events" value={total} />
          <StatCard label="Live now" value={live} />
          <StatCard label="Upcoming" value={upcoming} />
          <StatCard label="Ended" value={ended} />
          <StatCard label="Archived" value={archived} />
          <StatCard label="Organizers" value={uniqueOrganizers} />
        </Box>
      </Box>

      <Divider />

      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          Spectators
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
          <StatCard
            label="Peak ever (single event)"
            value={peakEverSpectators}
          />
          <StatCard
            label="Total spectator sessions"
            value={totalSpectatorSessions}
            sub="Sum of peak per event"
          />
        </Box>
      </Box>

      <Divider />

      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          Referee activity
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
          {avgRefs !== null && (
            <StatCard label="Avg refs / ended event" value={avgRefs} />
          )}
          {avgDurationMin !== null && (
            <StatCard
              label="Avg event duration"
              value={`${avgDurationMin} min`}
              sub={`${endedWithDuration.length} ended events with timer`}
            />
          )}
        </Box>
      </Box>

      <Divider />

      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          Events by type
        </Typography>
        <Stack spacing={0.75}>
          {typeEntries.map(([type, count]) => (
            <Stack key={type} direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                {type}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: Math.max(4, (count / total) * 120),
                    height: 8,
                    bgcolor: 'primary.main',
                    borderRadius: 4,
                    opacity: 0.7,
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 24, textAlign: 'right' }}>
                  {count}
                </Typography>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          Top organizers
        </Typography>
        <Stack spacing={0.75}>
          {topOrganizers.map((org, i) => (
            <Stack key={i} direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="body2" noWrap sx={{ flex: 1, mr: 1 }}>
                {org.name}
              </Typography>
              <Chip size="small" label={`${org.count} event${org.count !== 1 ? 's' : ''}`} variant="outlined" />
            </Stack>
          ))}
        </Stack>
      </Box>
    </Stack>
  )
}

// ─── admin event card ─────────────────────────────────────────────────────────

interface AdminCardProps {
  match: Match
  busy: boolean
  onView: () => void
  onEnd: () => void
  onArchive: () => void
  onDelete: () => void
}

function AdminEventCard({ match: m, busy, onView, onEnd, onArchive, onDelete }: AdminCardProps) {
  const scheduledDate = toDate(m.scheduledTime)

  return (
    <Card
      elevation={1}
      sx={{
        opacity: m.archived ? 0.6 : 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <CardActionArea onClick={onView} sx={{ flex: 1 }}>
        <CardContent sx={{ p: 1.25, pb: '8px !important' }}>
          <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 0.5 }}>
            {m.status === 'live' && (
              <Chip size="small" color="error" variant="filled" label="LIVE"
                sx={{ fontWeight: 700, height: 20, '& .MuiChip-label': { px: 0.75 } }} />
            )}
            {m.status === 'ended' && (
              <Chip size="small" color="default" variant="outlined" label="ENDED"
                sx={{ fontWeight: 700, height: 20, '& .MuiChip-label': { px: 0.75 } }} />
            )}
            {m.status === 'upcoming' && (
              <Chip size="small" color="info" variant="outlined" label="UPCOMING"
                sx={{ fontWeight: 700, height: 20, '& .MuiChip-label': { px: 0.75 } }} />
            )}
            {m.archived && (
              <Chip size="small" variant="outlined" label="Archived"
                sx={{ height: 20, '& .MuiChip-label': { px: 0.75 } }} />
            )}
            {m.isPrivate && (
              <Chip size="small" color="warning" variant="outlined" label="Private"
                sx={{ height: 20, '& .MuiChip-label': { px: 0.75 } }} />
            )}
          </Stack>

          <Typography variant="body2" fontWeight={700} noWrap sx={{ lineHeight: 1.2 }}>
            {m.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {m.creatorDisplayName || 'Unknown'}
          </Typography>
          <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.25 }}>
            {scheduledDate
              ? scheduledDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : '—'}
          </Typography>

          <Stack direction="row" spacing={1.5} sx={{ mt: 0.75 }} color="text.secondary">
            <Stack direction="row" alignItems="center" spacing={0.25}>
              <GroupsOutlinedIcon aria-hidden sx={{ fontSize: 13 }} />
              <Typography variant="caption">
                {m.activeRefs?.length ?? 0}/{m.maxRefs}
              </Typography>
            </Stack>
            {m.allowSpectators && (
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <VisibilityOutlinedIcon aria-hidden sx={{ fontSize: 13 }} />
                <Typography variant="caption">
                  {Math.max(0, m.spectatorCount ?? 0)}
                </Typography>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>

      <Box sx={{ px: 1, pb: 1, pt: 0.5, borderTop: 1, borderColor: 'divider' }}>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
          {m.status === 'live' && (
            <Button
              size="small"
              color="error"
              variant="outlined"
              disabled={busy}
              onClick={onEnd}
              sx={{ fontSize: '0.7rem', py: 0.25, px: 0.75, minWidth: 0 }}
            >
              End
            </Button>
          )}
          <Button
            size="small"
            color="warning"
            variant="outlined"
            disabled={busy}
            onClick={onArchive}
            sx={{ fontSize: '0.7rem', py: 0.25, px: 0.75, minWidth: 0 }}
          >
            {m.archived ? 'Restore' : 'Archive'}
          </Button>
          <Button
            size="small"
            color="error"
            variant="outlined"
            disabled={busy}
            onClick={onDelete}
            sx={{ fontSize: '0.7rem', py: 0.25, px: 0.75, minWidth: 0 }}
          >
            {busy ? '…' : 'Delete'}
          </Button>
        </Stack>
      </Box>
    </Card>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export function AdminConsolePage() {
  const { user, isSuperAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<'events' | 'analytics'>('events')
  const [matches, setMatches] = useState<Match[]>([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'live' | 'ended'>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async () => {
    setFetching(true)
    setError(null)
    try {
      const all = await getAllMatchesForAdmin()
      all.sort((a, b) => {
        const aMs = toDate(a.scheduledTime)?.getTime() ?? 0
        const bMs = toDate(b.scheduledTime)?.getTime() ?? 0
        return bMs - aMs
      })
      setMatches(all)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events')
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && isSuperAdmin) void load()
  }, [authLoading, isSuperAdmin, load])

  const q = search.trim().toLowerCase()
  const visible = useMemo(() =>
    matches.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false
      if (q && !m.title.toLowerCase().includes(q) && !(m.creatorDisplayName ?? '').toLowerCase().includes(q)) return false
      return true
    }),
    [matches, statusFilter, q],
  )

  if (authLoading) {
    return (
      <AppShell>
        <Header title="Admin Console" showBack />
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={240}>
          <CircularProgress />
        </Box>
      </AppShell>
    )
  }

  if (!user || !isSuperAdmin) {
    return <Navigate to="/" replace />
  }

  const handleEnd = async (match: Match) => {
    if (match.status !== 'live') return
    if (!window.confirm(`End "${match.title}" for all participants?`)) return
    setActionLoading(match.id)
    try {
      await endMatchAsAdmin(match.id)
      setMatches((prev) => prev.map((m) => (m.id === match.id ? { ...m, status: 'ended' } : m)))
      showToast('Event ended')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to end event', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (matchId: string, title: string) => {
    if (!window.confirm(`Permanently delete "${title}"? This cannot be undone.`)) return
    setActionLoading(matchId)
    try {
      await deleteMatchAsAdmin(matchId)
      setMatches((prev) => prev.filter((m) => m.id !== matchId))
      showToast('Event deleted')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Delete failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleArchive = async (match: Match) => {
    const alreadyArchived = match.archived
    if (!window.confirm(alreadyArchived ? `Restore "${match.title}"?` : `Archive "${match.title}"?`)) return
    setActionLoading(match.id)
    try {
      await archiveMatchAsAdmin(match.id)
      setMatches((prev) =>
        prev.map((m) => (m.id === match.id ? { ...m, archived: !alreadyArchived } : m)),
      )
      showToast(alreadyArchived ? 'Event restored' : 'Event archived')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Action failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const liveCount = matches.filter((m) => m.status === 'live').length

  return (
    <AppShell>
      <Header title="Super Admin Console" showBack />

      <Container maxWidth="sm" disableGutters sx={{ maxWidth: 640, mx: 'auto' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v as 'events' | 'analytics')}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
          }}
        >
          <Tab
            value="events"
            label={liveCount > 0 ? `Events · ${liveCount} live` : 'Events'}
          />
          <Tab value="analytics" label="Analytics" />
        </Tabs>
      </Container>

      <Container maxWidth="sm" sx={{ py: 2.5, maxWidth: 640 }}>
        {activeTab === 'events' ? (
          <Stack spacing={2}>
            <Alert severity="warning" variant="outlined" sx={{ py: 0.75 }}>
              Super admin — all events visible. Handle with care.
            </Alert>

            {error && <Alert severity="error">{error}</Alert>}

            <Stack direction="row" spacing={1} flexWrap="wrap">
              {(['all', 'upcoming', 'live', 'ended'] as const).map((s) => (
                <Chip
                  key={s}
                  label={s.charAt(0).toUpperCase() + s.slice(1)}
                  variant={statusFilter === s ? 'filled' : 'outlined'}
                  color={s === 'live' ? 'error' : s === 'upcoming' ? 'info' : 'default'}
                  onClick={() => setStatusFilter(s)}
                  size="small"
                />
              ))}
            </Stack>

            <TextField
              size="small"
              placeholder="Search by title or organizer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {fetching ? 'Loading…' : `${visible.length} event${visible.length !== 1 ? 's' : ''}`}
              </Typography>
              <Button size="small" onClick={load} disabled={fetching}>
                Refresh
              </Button>
            </Stack>

            {fetching ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : visible.length === 0 ? (
              <Typography color="text.disabled" textAlign="center" py={4}>
                No events found
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 1.5,
                  alignItems: 'start',
                }}
              >
                {visible.map((m) => (
                  <AdminEventCard
                    key={m.id}
                    match={m}
                    busy={actionLoading === m.id}
                    onView={() => navigate(`/match/${m.id}`)}
                    onEnd={() => handleEnd(m)}
                    onArchive={() => handleArchive(m)}
                    onDelete={() => handleDelete(m.id, m.title)}
                  />
                ))}
              </Box>
            )}
          </Stack>
        ) : (
          fetching ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          ) : (
            <AnalyticsTab matches={matches} />
          )
        )}
      </Container>
    </AppShell>
  )
}
