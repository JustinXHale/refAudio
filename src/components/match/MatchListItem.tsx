import { useNavigate } from 'react-router-dom'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import SportsIcon from '@mui/icons-material/Sports'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import BookmarkAddedOutlinedIcon from '@mui/icons-material/BookmarkAddedOutlined'
import type { Match } from '@/types'
import { refDisplayName } from '@/lib/refNames'

interface MatchListItemProps {
  match: Match
  saved?: boolean
}

export function MatchListItem({ match, saved }: MatchListItemProps) {
  const navigate = useNavigate()

  const scheduledDate =
    match.scheduledTime && 'toDate' in match.scheduledTime
      ? match.scheduledTime.toDate()
      : new Date(match.scheduledTime as unknown as string)

  const dateStr = scheduledDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const timeStr = scheduledDate.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <ListItemButton
      onClick={() => navigate(`/match/${match.id}`)}
      sx={{
        borderRadius: 2,
        px: 1.5,
        py: 1,
        gap: 1.5,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <ListItemAvatar sx={{ minWidth: 'auto' }}>
        {match.eventPhotoUrl ? (
          <Avatar
            variant="rounded"
            src={match.eventPhotoUrl}
            alt={`${match.title} event photo`}
            sx={{ width: 48, height: 48 }}
          />
        ) : (
          <Avatar variant="rounded" sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
            <SportsIcon sx={{ color: 'primary.contrastText' }} />
          </Avatar>
        )}
      </ListItemAvatar>

      <ListItemText
        disableTypography
        primary={
          <Stack direction="row" alignItems="center" spacing={0.75}>
            {match.status === 'live' && (
              <Chip
                size="small"
                color="error"
                variant="outlined"
                label="LIVE"
                sx={{ fontWeight: 700, height: 20, '& .MuiChip-label': { px: 0.75 } }}
              />
            )}
            {saved && (
              <BookmarkAddedOutlinedIcon sx={{ fontSize: 16, color: 'secondary.main', flexShrink: 0 }} />
            )}
            <Typography variant="body2" fontWeight={600} noWrap>
              {match.title}
            </Typography>
          </Stack>
        }
        secondary={
          <>
            <Typography variant="caption" color="text.secondary" noWrap component="p">
              {match.location} &middot; {dateStr} at {timeStr}
            </Typography>
            {match.activeRefs.length > 0 && (
              <Typography variant="caption" color="text.disabled" noWrap component="p">
                {match.activeRefs.slice(0, 3).map((uid, i) => {
                  const name = refDisplayName(uid, i)
                  const role = match.refRoles?.[uid]
                  return role ? `${name} (${role})` : name
                }).join(', ')}
                {match.activeRefs.length > 3 ? ` +${match.activeRefs.length - 3}` : ''}
              </Typography>
            )}
          </>
        }
      />

      <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
        <Stack direction="row" alignItems="center" spacing={0.5} color="text.secondary">
          <GroupsOutlinedIcon aria-hidden sx={{ fontSize: 14 }} />
          <Typography variant="caption">
            {match.activeRefs.length}
          </Typography>
          {match.allowSpectators && (
            <>
              <VisibilityOutlinedIcon aria-hidden sx={{ fontSize: 14, ml: 0.5 }} />
              <Typography variant="caption">
                {match.spectatorCount}
              </Typography>
            </>
          )}
        </Stack>
      </Box>
    </ListItemButton>
  )
}
