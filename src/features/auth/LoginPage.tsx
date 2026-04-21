import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import TextField from '@mui/material/TextField'
import Link from '@mui/material/Link'
import { useAuth } from '@/contexts/AuthContext'
import { Header } from '@/components/layout/Header'

export function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInDemo, firebaseReady, loading, user, isDemo } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  // Already authenticated — no reason to be on the login page
  if ((user || isDemo) && !loading) {
    return <Navigate to="/" replace />
  }

  const resetForm = () => {
    setError(null)
    setEmail('')
    setPassword('')
    setDisplayName('')
  }

  const toggleMode = () => {
    resetForm()
    setMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'))
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Email and password are required.')
      return
    }
    if (mode === 'sign-up' && !displayName.trim()) {
      setError('Display name is required.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    try {
      setSubmitting(true)
      if (mode === 'sign-up') {
        await signUpWithEmail(email.trim(), password, displayName.trim())
      } else {
        await signInWithEmail(email.trim(), password)
      }
      navigate('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed'
      if (msg.includes('auth/email-already-in-use')) {
        setError('An account with this email already exists. Try signing in.')
      } else if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
        setError('Invalid email or password.')
      } else if (msg.includes('auth/invalid-email')) {
        setError('Please enter a valid email address.')
      } else if (msg.includes('auth/weak-password')) {
        setError('Password is too weak. Use at least 6 characters.')
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setError(null)
      setGoogleLoading(true)
      await signInWithGoogle()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleDemoSignIn = () => {
    signInDemo()
    navigate('/')
  }

  const isSignUp = mode === 'sign-up'

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Header title={isSignUp ? 'Create Account' : 'Sign In'} showBack />

      <Container maxWidth="sm" sx={{ py: 6, maxWidth: 512 }}>
        <Stack spacing={3} alignItems="center" textAlign="center" sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              component="img"
              src="/favicon.png"
              alt=""
              sx={{ height: 40, objectFit: 'contain' }}
            />
            <Typography variant="h4" component="p" fontWeight={700}>
              refOpenMic
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {isSignUp ? 'Create an account to get started' : 'Sign in to create and join events'} &middot; v0.5
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          {/* Email / Password form */}
          {firebaseReady && (
            <Box component="form" onSubmit={handleEmailSubmit}>
              <Stack spacing={2}>
                {isSignUp && (
                  <TextField
                    label="Display Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    fullWidth
                    autoComplete="name"
                    size="medium"
                  />
                )}
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  autoComplete="email"
                  size="medium"
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  size="medium"
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={submitting || loading}
                >
                  {submitting
                    ? (isSignUp ? 'Creating Account...' : 'Signing In...')
                    : (isSignUp ? 'Create Account' : 'Sign In')}
                </Button>
              </Stack>
            </Box>
          )}

          {firebaseReady && (
            <Typography variant="body2" textAlign="center">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <Link component="button" variant="body2" onClick={toggleMode} underline="hover">
                {isSignUp ? 'Sign in' : 'Sign up'}
              </Link>
            </Typography>
          )}

          <Stack direction="row" alignItems="center" spacing={1}>
            <Divider sx={{ flex: 1 }} />
            <Typography variant="caption" color="text.disabled">
              or
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Stack>

          {firebaseReady && (
            <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              startIcon={
                <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              }
            >
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </Button>
          )}

          <Stack direction="row" alignItems="center" spacing={1}>
            <Divider sx={{ flex: 1 }} />
            <Typography variant="caption" color="text.disabled">
              or
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Stack>

          <Button fullWidth variant="text" size="large" onClick={handleDemoSignIn}>
            Try Demo Mode
          </Button>
          <Typography variant="caption" color="text.disabled" textAlign="center">
            Demo mode lets you test the full app flow with local data.
          </Typography>
        </Stack>

        <Typography variant="caption" color="text.disabled" textAlign="center" display="block" sx={{ mt: 4 }}>
          Browse events without signing in from the home screen.
        </Typography>
      </Container>
    </Box>
  )
}
