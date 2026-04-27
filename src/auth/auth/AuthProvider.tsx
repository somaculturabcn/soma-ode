import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type User = {
  id: string
  email: string
  role: string
}

type AuthContextType = {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession()
      handleSession(data.session)
      setLoading(false)
    }

    getSession()

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleSession(session)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  function handleSession(session: any) {
    if (!session) {
      setUser(null)
      return
    }

    const role = session.user.user_metadata?.role || 'viewer'

    setUser({
      id: session.user.id,
      email: session.user.email,
      role,
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}