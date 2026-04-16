import Box from '@mui/material/Box'
import CssBaseline from '@mui/material/CssBaseline'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { HomePage } from '@/features/home/HomePage'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProfilePage } from '@/features/auth/ProfilePage'
import { CreateMatchPage } from '@/features/match-creation/CreateMatchPage'
import { MatchDetailPage } from '@/features/match-detail/MatchDetailPage'
import { JoinByCodePage } from '@/features/match-detail/JoinByCodePage'
import { MatchRoomPage } from '@/features/match-room/MatchRoomPage'

/** Matches `vite.config` `base` (e.g. `/refOpenMic` on GitHub Pages). */
const routerBasename =
  import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '')

function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <AuthProvider>
        <ToastProvider>
          <CssBaseline />
          <Box sx={{ minHeight: '100vh' }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/create" element={<CreateMatchPage />} />
              <Route path="/match/:matchId" element={<MatchDetailPage />} />
              <Route path="/match/:matchId/room" element={<MatchRoomPage />} />
              <Route path="/join" element={<JoinByCodePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Box>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
