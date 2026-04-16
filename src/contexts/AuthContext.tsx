import {
  createContext,
  useContext,
  useEffect,
  useState,
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
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>
  signInDemo: () => void
  signOut: () => Promise<void>
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
          const snap = await getDoc(profileRef)

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
        } catch {
          setProfile({
            id: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Referee',
            email: firebaseUser.email || undefined,
            photoURL: firebaseUser.photoURL || undefined,
          } as unknown as UserProfile)
        }
      } else {
        setProfile(null)
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

  const signInDemo = () => {
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
      return
    }
    if (!auth) return
    await firebaseSignOut(auth)
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        firebaseReady: isFirebaseConfigured,
        isDemo,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInDemo,
        signOut,
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
