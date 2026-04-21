import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import AddIcon from '@mui/icons-material/Add'
import KeyIcon from '@mui/icons-material/Key'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import { useAuth } from '@/contexts/AuthContext'

export function BottomNav() {
  const { user } = useAuth()
  const { pathname } = useLocation()

  const items = useMemo(() => {
    const list: Array<{ to: string; label: string; icon: React.ReactNode }> = [
      { to: '/', label: 'Events', icon: <HomeOutlinedIcon /> },
    ]
    if (user) {
      list.push({ to: '/create', label: 'Create', icon: <AddIcon /> })
    }
    list.push({ to: '/join', label: 'Join Code', icon: <KeyIcon /> })
    list.push({
      to: user ? '/profile' : '/login',
      label: user ? 'Profile' : 'Sign In',
      icon: <PersonOutlineIcon />,
    })
    return list
  }, [user])

  const value = useMemo(() => {
    if (pathname === '/') return 0
    if (user) {
      if (pathname.startsWith('/create')) return 1
      if (pathname.startsWith('/join')) return 2
      if (pathname.startsWith('/profile')) return 3
    } else {
      if (pathname.startsWith('/join')) return 1
      if (pathname.startsWith('/login')) return 2
    }
    return false
  }, [pathname, user])

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        pb: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <Paper square elevation={8} sx={{ borderTop: 1, borderColor: 'divider' }}>
        <BottomNavigation
          value={value}
          showLabels
          sx={{
            maxWidth: 512,
            mx: 'auto',
            minHeight: 64,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              py: 1,
            },
          }}
        >
          {items.map((item, index) => (
            <BottomNavigationAction
              key={item.to}
              label={item.label}
              icon={item.icon}
              component={Link}
              to={item.to}
              value={index}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  )
}
