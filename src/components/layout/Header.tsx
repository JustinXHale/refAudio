import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  title: string
  showBack?: boolean
  rightAction?: React.ReactNode
  /** Dark bar for match room and other full-bleed dark screens */
  variant?: 'default' | 'dark'
}

export function Header({
  title,
  showBack,
  rightAction,
  variant = 'default',
}: HeaderProps) {
  const navigate = useNavigate()
  const isDark = variant === 'dark'

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        bgcolor: isDark ? 'grey.900' : 'background.paper',
        color: isDark ? 'common.white' : 'text.primary',
        borderBottom: 1,
        borderColor: isDark ? 'grey.800' : 'divider',
      }}
    >
      <Toolbar
        sx={{
          minHeight: { xs: 56 },
          maxWidth: 512,
          width: '100%',
          mx: 'auto',
          px: 2,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          {showBack && (
            <IconButton
              edge="start"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              sx={{
                color: isDark ? 'grey.300' : 'text.secondary',
                ml: -0.5,
              }}
              size="small"
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography
            variant="h6"
            component="h1"
            sx={{
              fontWeight: 600,
              fontSize: '1.125rem',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </Typography>
        </Stack>
        {rightAction ? <Box>{rightAction}</Box> : null}
      </Toolbar>
    </AppBar>
  )
}
