// src/auth/AuthProvider.tsx
// SOMA ODÉ — Auth Provider (VERSÃO FINAL — sem locks, sem timeouts)
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

  useEffect(() => {
    let mounted = true

    // Verificar sessão atual UMA ÚNICA VEZ
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      
      if (data.session?.user) {
        const u = data.session.user
        const role = (u.user_metadata?.role || 'viewer') as Role
        let artistId: string | undefined

        if (role === 'artist') {
          supabase
            .from('artists')
            .select('id')
            .eq('user_id', u.id)
            .maybeSingle()
            .then(({ data: artistData }) => {
              if (mounted && artistData) {
                setUser(prev => prev ? { ...prev, artistId: artistData.id } : null)
              }
            })
            .catch(console.error)
        }

        setUser({ id: u.id, email: u.email || '', role, artistId })
      }
      setLoading(false)
    }).catch(() => {
      if (mounted) setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [])

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Erro ao fazer logout:', err)
    }
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