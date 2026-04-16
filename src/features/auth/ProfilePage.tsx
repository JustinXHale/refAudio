import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import { useAuth } from '@/contexts/AuthContext'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'

export function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  if (!user) {
    navigate('/login')
    return null
  }

  const initial = (profile?.displayName || 'R')[0].toUpperCase()

  return (
    <AppShell>
      <Header title="Profile" />
      <Container maxWidth="sm" sx={{ py: 3, maxWidth: 512 }}>
        <Card elevation={2}>
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            {user.photoURL ? (
              <Avatar src={user.photoURL} sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }} />
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
              {profile?.displayName || 'Referee'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {user.email}
            </Typography>
          </CardContent>
        </Card>

        <Box sx={{ mt: 3 }}>
          <Button fullWidth variant="outlined" color="error" size="large" onClick={handleSignOut}>
            Sign Out
          </Button>
        </Box>
      </Container>
    </AppShell>
  )
}
