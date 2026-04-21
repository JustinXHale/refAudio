import { useNavigate } from 'react-router-dom'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import CardMedia from '@mui/material/CardMedia'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import BookmarkAddedOutlinedIcon from '@mui/icons-material/BookmarkAddedOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import type { Match } from '@/types'
import { refDisplayName } from '@/lib/refNames'

interface MatchCardProps {
  match: Match
  /** Show bookmark chip when this match is in the user's saved list */
  saved?: boolean
  /** Tighter layout for 2-column grid */
  compact?: boolean
}

export function MatchCard({ match, saved, compact }: MatchCardProps) {
  const navigate = useNavigate()

  const scheduledDate =
    match.scheduledTime && 'toDate' in match.scheduledTime
      ? match.scheduledTime.toDate()
      : new Date(match.scheduledTime as unknown as string)

  const waitingCount = match.waitingRoom?.length ?? 0

  const teamSummary = match.activeRefs.length > 0
    ? match.activeRefs
        .slice(0, 3)
        .map((uid, i) => {
          const name = refDisplayName(uid, i)
          const role = match.refRoles?.[uid]
          return role ? `${name} (${role})` : name
        })
        .join(', ') + (match.activeRefs.length > 3 ? ` +${match.activeRefs.length - 3}` : '')
    : null

  return (
    <Card
      elevation={2}
      sx={{
        transition: (theme) =>
          theme.transitions.create(['box-shadow'], { duration: theme.transitions.duration.shorter }),
        '&:hover': { boxShadow: 4 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...(match.status === 'ended' || match.archived
          ? {
              opacity: 0.72,
              bgcolor: 'action.hover',
              filter: 'grayscale(0.35)',
            }
          : {}),
      }}
    >
      <CardActionArea
        onClick={() => navigate(`/match/${match.id}`)}
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <CardMedia
          component="img"
          height={compact ? 100 : 140}
          image={match.eventPhotoUrl || '/favicon.png'}
          alt={`${match.title} event photo`}
          sx={{ objectFit: match.eventPhotoUrl ? 'cover' : 'contain', bgcolor: 'action.hover', p: match.eventPhotoUrl ? 0 : 2 }}
        />
        <CardContent sx={{ p: compact ? 1.25 : 2, flex: 1 }}>
          <Stack direction="row" spacing={compact ? 1 : 2} alignItems="flex-start" justifyContent="space-between">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 0.5 }}>
                {match.status === 'live' && (
                  <Chip
                    size="small"
                    color="error"
                    variant="outlined"
                    label="LIVE"
                    sx={{ fontWeight: 700, height: compact ? 20 : 24, '& .MuiChip-label': { px: compact ? 0.75 : 1 } }}
                  />
                )}
                {match.status === 'ended' && (
                  <Chip
                    size="small"
                    color="default"
                    variant="outlined"
                    label="ENDED"
                    sx={{ fontWeight: 700, height: compact ? 20 : 24, '& .MuiChip-label': { px: compact ? 0.75 : 1 } }}
                  />
                )}
                {!compact && match.archived && (
                  <Chip size="small" label="Archived" color="default" variant="outlined" />
                )}
                {!compact && match.isPrivate && (
                  <Chip size="small" label="Private" color="warning" variant="outlined" />
                )}
                {!compact && match.status === 'upcoming' && waitingCount > 0 && (
                  <Chip
                    size="small"
                    label={`${waitingCount} in lobby`}
                    color="info"
                    variant="outlined"
                  />
                )}
                {!compact && saved && (
                  <Chip
                    size="small"
                    icon={<BookmarkAddedOutlinedIcon sx={{ fontSize: '1rem !important' }} />}
                    label="Saved"
                    color="secondary"
                    variant="outlined"
                  />
                )}
              </Stack>

              <Typography variant={compact ? 'body2' : 'subtitle1'} fontWeight={600} noWrap>
                {match.title}
              </Typography>
              <Typography variant={compact ? 'caption' : 'body2'} color="text.secondary" noWrap sx={{ mt: 0.25 }}>
                {match.location}
              </Typography>
              {teamSummary && (
                <Typography variant="caption" color="text.disabled" noWrap sx={{ mt: 0.25, display: 'block', fontSize: compact ? '0.7rem' : undefined }}>
                  {teamSummary}
                </Typography>
              )}
              <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                {scheduledDate.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                at{' '}
                {scheduledDate.toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Typography>
            </Box>

            {!compact && (
              <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
                <Stack direction="row" alignItems="center" spacing={0.5} color="text.secondary">
                  <GroupsOutlinedIcon aria-hidden sx={{ fontSize: 16 }} />
                  <Typography variant="caption">{match.activeRefs.length} refs</Typography>
                </Stack>
                {match.allowSpectators && (
                  <Stack direction="row" alignItems="center" spacing={0.5} color="text.secondary">
                    <VisibilityOutlinedIcon aria-hidden sx={{ fontSize: 16 }} />
                    <Typography variant="caption">{match.spectatorCount} listening</Typography>
                  </Stack>
                )}
              </Stack>
            )}
          </Stack>

          {compact && (
            <Stack direction="row" spacing={1.5} sx={{ mt: 0.5 }} color="text.secondary">
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <GroupsOutlinedIcon aria-hidden sx={{ fontSize: 13 }} />
                <Typography variant="caption">{match.activeRefs.length}</Typography>
              </Stack>
              {match.allowSpectators && (
                <Stack direction="row" alignItems="center" spacing={0.25}>
                  <VisibilityOutlinedIcon aria-hidden sx={{ fontSize: 13 }} />
                  <Typography variant="caption">{match.spectatorCount}</Typography>
                </Stack>
              )}
            </Stack>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
