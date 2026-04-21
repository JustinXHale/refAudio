import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider, isFirebaseConfigured, emailSignIn, emailSignUp } from '@/lib/firebase'
import type { UserProfile } from '@/types'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  firebaseReady: boolean
  isDemo: boolean
  isSuperAdmin: boolean
  /** True if the user is on the Pro paid plan (or is a super admin). */
  isPro: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>
  signInDemo: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const DEMO_USER = {
  uid: 'demo-user-001',
  displayName: 'Demo Referee',
  email: 'demo@refOpenMic.app',
  photoURL: null,
} as unknown as User

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(isFirebaseConfigured)
  const [isDemo, setIsDemo] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser && db) {
        try {
          const profileRef = doc(db, 'users', firebaseUser.uid)
          const superAdminRef = doc(db, 'config', 'superAdmins')
          const proUsersRef = doc(db, 'config', 'proUsers')
          const [snap, superAdminSnap, proUsersSnap] = await Promise.all([
            getDoc(profileRef),
            getDoc(superAdminRef),
            getDoc(proUsersRef),
          ])

          if (snap.exists()) {
            setProfile({ id: snap.id, ...snap.data() } as UserProfile)
          } else {
            const newProfile = {
              displayName: firebaseUser.displayName || 'Referee',
              email: firebaseUser.email || undefined,
              photoURL: firebaseUser.photoURL || undefined,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }
            await setDoc(profileRef, newProfile)
            setProfile({
              id: firebaseUser.uid,
              ...newProfile,
            } as unknown as UserProfile)
          }

          const email = firebaseUser.email
          const superAdminEmails: string[] = superAdminSnap.exists()
            ? (superAdminSnap.data()?.emails as string[] | undefined) ?? []
            : []
          const proEmails: string[] = proUsersSnap.exists()
            ? (proUsersSnap.data()?.emails as string[] | undefined) ?? []
            : []

          const isAdmin = !!email && superAdminEmails.includes(email)
          setIsSuperAdmin(isAdmin)
          // Super admins implicitly have Pro
          setIsPro(isAdmin || (!!email && proEmails.includes(email)))
        } catch {
          setProfile({
            id: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Referee',
            email: firebaseUser.email || undefined,
            photoURL: firebaseUser.photoURL || undefined,
          } as unknown as UserProfile)
          setIsSuperAdmin(false)
          setIsPro(false)
        }
      } else {
        setProfile(null)
        setIsSuperAdmin(false)
        setIsPro(false)
      }

      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase not configured')
    await signInWithPopup(auth, googleProvider)
  }

  const signInWithEmail = async (email: string, password: string) => {
    await emailSignIn(email, password)
  }

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    await emailSignUp(email, password, displayName)
  }

  const signInDemo = async () => {
    // Sign out any active Firebase session first so onAuthStateChanged
    // doesn't race and snap the user back to their real account.
    if (auth) {
      try { await firebaseSignOut(auth) } catch { /* ignore */ }
    }
    setIsDemo(true)
    setUser(DEMO_USER)
    setProfile({
      id: DEMO_USER.uid,
      displayName: 'Demo Referee',
      email: 'demo@refOpenMic.app',
    } as unknown as UserProfile)
  }

  const signOut = async () => {
    if (isDemo) {
      setIsDemo(false)
      setUser(null)
      setProfile(null)
      setIsSuperAdmin(false)
      setIsPro(false)
      return
    }
    if (!auth) return
    await firebaseSignOut(auth)
    setProfile(null)
    setIsSuperAdmin(false)
    setIsPro(false)
  }

  const refreshProfile = useCallback(async () => {
    const u = user
    if (!u || !db || isDemo) return
    try {
      const profileRef = doc(db, 'users', u.uid)
      const snap = await getDoc(profileRef)
      if (snap.exists()) {
        setProfile({ id: snap.id, ...snap.data() } as UserProfile)
      }
    } catch {
      /* ignore */
    }
  }, [user, isDemo])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        firebaseReady: isFirebaseConfigured,
        isDemo,
        isSuperAdmin,
        isPro,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInDemo,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
