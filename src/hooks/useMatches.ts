import { useEffect, useState, useCallback } from 'react'
import type { Match } from '@/types'
import { isFirebaseConfigured } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import {
  subscribeToLiveMatches,
  subscribeToUpcomingMatches,
  subscribeToMatch,
  subscribeToUserMatches,
} from '@/services/matches'
import {
  demoGetLiveMatches,
  demoGetUpcomingMatches,
  demoGetMatch,
  demoGetUserMatches,
  subscribe as demoSubscribe,
} from '@/services/demo'

export function useLiveMatches() {
  const { isDemo } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setMatches(demoGetLiveMatches())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isDemo) {
      refresh()
      return demoSubscribe(refresh)
    }
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    const unsub = subscribeToLiveMatches((data) => {
      setMatches(data)
      setLoading(false)
    })
    return unsub
  }, [isDemo, refresh])

  return { matches, loading }
}

export function useUpcomingMatches() {
  const { isDemo } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setMatches(demoGetUpcomingMatches())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isDemo) {
      refresh()
      return demoSubscribe(refresh)
    }
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    const unsub = subscribeToUpcomingMatches((data) => {
      setMatches(data)
      setLoading(false)
    })
    return unsub
  }, [isDemo, refresh])

  return { matches, loading }
}

export function useUserMatches() {
  const { isDemo, user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!user) {
      setMatches([])
      setLoading(false)
      return
    }
    setMatches(demoGetUserMatches(user.uid))
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) {
      setMatches([])
      setLoading(false)
      return
    }
    if (isDemo) {
      refresh()
      return demoSubscribe(refresh)
    }
    if (!isFirebaseConfigured) {
      setMatches([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = subscribeToUserMatches(user.uid, (data) => {
      setMatches(data)
      setLoading(false)
    })
    return unsub
  }, [isDemo, user, refresh])

  return { matches, loading }
}

export function useMatch(matchId: string | undefined) {
  const { isDemo } = useAuth()
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (matchId) setMatch(demoGetMatch(matchId))
    setLoading(false)
  }, [matchId])

  useEffect(() => {
    if (!matchId) {
      setLoading(false)
      return
    }
    if (isDemo) {
      refresh()
      return demoSubscribe(refresh)
    }
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    const unsub = subscribeToMatch(matchId, (data) => {
      setMatch(data)
      setLoading(false)
    })
    return unsub
  }, [matchId, isDemo, refresh])

  return { match, loading }
}
