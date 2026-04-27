import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Role } from './permissions'

type AuthUser = {
  id: string
  email: string
  role: Role
}

type AuthContextType = {
  user: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  function handleSession(session: any) {
    if (!session?.user) {
      setUser(null)
      return
    }

    const role = (session.user.user_metadata?.role || 'viewer') as Role

    setUser({
      id: session.user.id,
      email: session.user.email || '',
      role,
    })
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession()
      handleSession(data.session)
      setLoading(false)
    }

    init()

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

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