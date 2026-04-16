import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import { BottomNav } from './BottomNav'

interface AppShellProps {
  children: ReactNode
  hideNav?: boolean
}

const bottomReserve = 'calc(64px + env(safe-area-inset-bottom, 0px))'

export function AppShell({ children, hideNav }: AppShellProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <Box
        component="main"
        sx={{
          flex: 1,
          pb: hideNav ? 0 : bottomReserve,
        }}
      >
        {children}
      </Box>
      {!hideNav && <BottomNav />}
    </Box>
  )
}
