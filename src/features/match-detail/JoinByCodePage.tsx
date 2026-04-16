import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import Paper from '@mui/material/Paper'
import MicOutlinedIcon from '@mui/icons-material/MicOutlined'
import { useAuth } from '@/contexts/AuthContext'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { findMatchByCode } from '@/services/matches'
import { demoJoinByCode } from '@/services/demo'

export function JoinByCodePage() {
  const { user, isDemo } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6 || searching) return

    if (!user) {
      navigate('/login')
      return
    }

    setSearching(true)
    setError(null)
    setInfo(null)

    try {
      if (isDemo) {
        const result = demoJoinByCode(code, user.uid)
        if (!result) {
          setError('No match found for that code. Check with your organizer and try again.')
          setSearching(false)
          return
        }

        if (result.codeType === 'ref') {
          if (result.status === 'upcoming') {
            setInfo("You've been added to the waiting room. You'll auto-connect when the match starts.")
            setTimeout(() => navigate(`/match/${result.matchId}`), 1500)
          } else {
            navigate(`/match/${result.matchId}/room?role=referee`)
          }
        } else {
          navigate(`/match/${result.matchId}`)
        }
      } else {
        const match = await findMatchByCode(code)
        if (!match) {
          setError('No match found for that code. Check with your organizer and try again.')
          setSearching(false)
          return
        }
        navigate(`/match/${match.id}`)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setSearching(false)
    }
  }

  return (
    <AppShell>
      <Header title="Enter Code" showBack />
      <Container maxWidth="sm" sx={{ py: 4, maxWidth: 512 }}>
        <Stack alignItems="center" textAlign="center" spacing={2} sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.9,
            }}
          >
            <MicOutlinedIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h6" fontWeight={700}>
            Join with Code
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Enter a ref code or spectator code shared by the match organizer
          </Typography>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {info && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {info}
          </Alert>
        )}

        <Stack component="form" onSubmit={handleSubmit} spacing={2}>
          <TextField
            fullWidth
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ABC123"
            inputProps={{
              maxLength: 6,
              style: {
                textAlign: 'center',
                fontSize: '1.5rem',
                letterSpacing: '0.3em',
                fontFamily: 'ui-monospace, monospace',
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={code.length !== 6 || searching}
          >
            {searching ? 'Joining...' : 'Join Match'}
          </Button>
        </Stack>

        <Stack spacing={2} sx={{ mt: 4 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" gutterBottom>
              Ref Code
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Shared by the organizer with the officiating crew. Gives you full-duplex audio. If the match
              hasn&apos;t started, you&apos;ll wait in the lobby and auto-connect when it goes live.
            </Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" gutterBottom>
              Spectator Code
            </Typography>
            <Typography variant="body2" color="text.secondary">
              For private events only. Lets you listen in on referee comms. Public matches don&apos;t need
              a code — just find them on the home screen.
            </Typography>
          </Paper>
        </Stack>
      </Container>
    </AppShell>
  )
}
