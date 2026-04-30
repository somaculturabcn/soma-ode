// src/auth/AuthProvider.tsx
// SOMA ODÉ — Auth Provider com timeout de segurança
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
    let isMounted = true
    
    // Timeout de segurança: força loading = false após 4 segundos
    const safetyTimer = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('AuthProvider: timeout de segurança atingido, a forçar loading=false')
        setLoading(false)
      }
    }, 4000)

    async function init() {
      try {
        const { data } = await supabase.auth.getSession()
        if (!isMounted) return
        
        if (data.session?.user) {
          const sessionUser = data.session.user
          const role = (sessionUser.user_metadata?.role || 'viewer') as Role
          
          let artistId: string | undefined
          if (role === 'artist') {
            try {
              const { data: artistData } = await supabase
                .from('artists')
                .select('id')
                .eq('user_id', sessionUser.id)
                .maybeSingle()
              if (artistData) artistId = artistData.id
            } catch (err) {
              console.error('Erro ao buscar artistId:', err)
            }
          }
          
          if (isMounted) {
            setUser({
              id: sessionUser.id,
              email: sessionUser.email || '',
              role,
              artistId,
            })
          }
        }
      } catch (err) {
        console.error('Erro ao iniciar AuthProvider:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
          clearTimeout(safetyTimer)
        }
      }
    }

    init()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return
      
      if (session?.user) {
        const sessionUser = session.user
        const role = (sessionUser.user_metadata?.role || 'viewer') as Role
        
        let artistId: string | undefined
        if (role === 'artist') {
          try {
            const { data: artistData } = await supabase
              .from('artists')
              .select('id')
              .eq('user_id', sessionUser.id)
              .maybeSingle()
            if (artistData) artistId = artistData.id
          } catch (err) {
            console.error('Erro ao buscar artistId:', err)
          }
        }
        
        setUser({
          id: sessionUser.id,
          email: sessionUser.email || '',
          role,
          artistId,
        })
      } else {
        setUser(null)
      }
    })

    return () => {
      isMounted = false
      clearTimeout(safetyTimer)
      authListener?.subscription?.unsubscribe()
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