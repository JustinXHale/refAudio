import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { demoGetSavedMatchIds, subscribe as demoSubscribe } from '@/services/demo'

/** Current user's bookmarked match IDs (synced with My Events saved list). */
export function useSavedMatchIds(): string[] {
  const { user, isDemo } = useAuth()
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    if (!user) {
      setIds([])
      return
    }
    if (isDemo) {
      setIds(demoGetSavedMatchIds(user.uid))
      return demoSubscribe(() => setIds(demoGetSavedMatchIds(user.uid)))
    }
    if (!db || !isFirebaseConfigured) {
      setIds([])
      return
    }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      setIds((snap.data()?.savedMatchIds as string[]) || [])
    })
    return unsub
  }, [user, isDemo])

  return ids
}
