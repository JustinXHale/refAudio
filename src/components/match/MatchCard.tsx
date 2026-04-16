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

interface MatchCardProps {
  match: Match
  /** Show bookmark chip when this match is in the user's saved list */
  saved?: boolean
}

export function MatchCard({ match, saved }: MatchCardProps) {
  const navigate = useNavigate()

  const scheduledDate =
    match.scheduledTime && 'toDate' in match.scheduledTime
      ? match.scheduledTime.toDate()
      : new Date(match.scheduledTime as unknown as string)

  const waitingCount = match.waitingRoom?.length ?? 0

  return (
    <Card
      elevation={2}
      sx={{
        transition: (theme) =>
          theme.transitions.create(['box-shadow'], { duration: theme.transitions.duration.shorter }),
        '&:hover': { boxShadow: 4 },
      }}
    >
      <CardActionArea onClick={() => navigate(`/match/${match.id}`)}>
        {match.eventPhotoUrl && (
          <CardMedia
            component="img"
            height="140"
            image={match.eventPhotoUrl}
            alt=""
            sx={{ objectFit: 'cover' }}
          />
        )}
        <CardContent sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 0.5 }}>
                {match.status === 'live' && (
                  <Chip
                    size="small"
                    color="error"
                    variant="outlined"
                    label="LIVE"
                    sx={{ fontWeight: 700, '& .MuiChip-label': { px: 1 } }}
                  />
                )}
                {match.isPrivate && (
                  <Chip size="small" label="Private" color="warning" variant="outlined" />
                )}
                {match.status === 'upcoming' && waitingCount > 0 && (
                  <Chip
                    size="small"
                    label={`${waitingCount} in lobby`}
                    color="info"
                    variant="outlined"
                  />
                )}
                {saved && (
                  <Chip
                    size="small"
                    icon={<BookmarkAddedOutlinedIcon sx={{ fontSize: '1rem !important' }} />}
                    label="Saved"
                    color="secondary"
                    variant="outlined"
                  />
                )}
              </Stack>

              <Typography variant="subtitle1" fontWeight={600} noWrap>
                {match.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {match.location}
              </Typography>
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

            <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
              <Stack direction="row" alignItems="center" spacing={0.5} color="text.secondary">
                <GroupsOutlinedIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">{match.activeRefs.length} refs</Typography>
              </Stack>
              {match.allowSpectators && (
                <Stack direction="row" alignItems="center" spacing={0.5} color="text.secondary">
                  <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption">{match.spectatorCount} listening</Typography>
                </Stack>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
