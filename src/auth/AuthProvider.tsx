// src/auth/AuthProvider.tsx
// SOMA ODÉ — Auth Provider (VERSÃO SIMPLIFICADA PARA DEBUG)
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Role } from './permissions'

type AuthUser = {
  id: string
  email: string
  role: Role
  artistId?: string
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

  async function handleSession(session: any) {
    if (!session?.user) {
      setUser(null)
      setLoading(false)
      return
    }

    const role = (session.user.user_metadata?.role || 'viewer') as Role
    const userId = session.user.id
    let artistId: string | undefined

    if (role === 'artist') {
      try {
        const { data, error } = await supabase
          .from('artists')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()
        if (!error && data) {
          artistId = data.id
        }
      } catch (err) {
        console.error('Erro ao buscar artistId:', err)
      }
    }

    setUser({
      id: userId,
      email: session.user.email || '',
      role,
      artistId,
    })
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      try {
        const { data } = await supabase.auth.getSession()
        await handleSession(data.session)
      } catch (err) {
        console.error('Erro ao iniciar sessão:', err)
        setLoading(false)
      }
    }

    init()

    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      await handleSession(session)
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