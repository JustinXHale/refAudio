import { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import TextField from '@mui/material/TextField'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { db } from '@/lib/firebase'

export function ProfilePage() {
  const { user, profile, signOut, refreshProfile, isDemo, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [showEmailPublic, setShowEmailPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '')
      setShowEmailPublic(!!profile.showEmailPublic)
    }
  }, [profile])

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const handleSave = async () => {
    if (!user || isDemo || !db) {
      setMessage('Profile editing is available when signed in with Firebase (not demo mode).')
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim() || 'Referee',
        showEmailPublic,
        updatedAt: serverTimestamp(),
      })
      await refreshProfile()
      setMessage('Saved.')
    } catch {
      setMessage('Could not save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const initial = (profile?.displayName || displayName || 'R')[0].toUpperCase()

  return (
    <AppShell>
      <Header title="Profile" />
      <Container maxWidth="sm" sx={{ py: 3, maxWidth: 512 }}>
        <Card elevation={2}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            {user.photoURL ? (
              <Avatar src={user.photoURL} alt={profile?.displayName || 'Profile photo'} sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }} />
            ) : (
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  mx: 'auto',
                  mb: 2,
                  bgcolor: 'primary.main',
                  fontSize: '1.75rem',
                  fontWeight: 700,
                }}
              >
                {initial}
              </Avatar>
            )}
            <Typography variant="h6" fontWeight={600}>
              {profile?.displayName || displayName || 'Referee'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {user.email}
            </Typography>
          </CardContent>
        </Card>

        <Card elevation={2} sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Public event details
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              Your display name is stored on events you create. Email is never shown to others unless you allow it below.
            </Typography>
            {isDemo && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Demo mode: sign in with Google or email to edit and save your profile.
              </Alert>
            )}
            {message && (
              <Alert severity={message === 'Saved.' ? 'success' : 'error'} sx={{ mb: 2 }}>
                {message}
              </Alert>
            )}
            <Stack spacing={2}>
              <TextField
                label="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                fullWidth
                disabled={isDemo}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showEmailPublic}
                    onChange={(_, v) => setShowEmailPublic(v)}
                    disabled={isDemo}
                  />
                }
                label="Show my email on my event pages (mailto link)"
              />
              <Button variant="contained" onClick={handleSave} disabled={saving || isDemo}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {isSuperAdmin && (
          <Card elevation={2} sx={{ mt: 2, border: 2, borderColor: 'warning.main' }}>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} color="warning.dark" gutterBottom>
                Super Admin
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                You have platform-wide admin access. Handle with care.
              </Typography>
              <Button
                fullWidth
                variant="contained"
                color="warning"
                onClick={() => navigate('/admin')}
              >
                Open Admin Console
              </Button>
            </CardContent>
          </Card>
        )}

        <Box sx={{ mt: 3 }}>
          <Button fullWidth variant="outlined" color="error" size="large" onClick={handleSignOut}>
            Sign Out
          </Button>
        </Box>
      </Container>
    </AppShell>
  )
}
