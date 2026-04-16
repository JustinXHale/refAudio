import { isFirebaseConfigured } from '@/lib/firebase'
import { demoToggleSaveMatch } from '@/services/demo'
import { toggleSavedMatchForUser } from '@/services/matches'

/** Toggle bookmark for a match (demo: localStorage; Firebase: users/{uid}.savedMatchIds). */
export async function toggleSaveMatch(
  userId: string,
  matchId: string,
  isDemo: boolean,
): Promise<boolean> {
  if (isDemo) {
    return demoToggleSaveMatch(userId, matchId)
  }
  if (!isFirebaseConfigured) {
    throw new Error('Firebase not configured')
  }
  return toggleSavedMatchForUser(userId, matchId)
}
