// src/auth/AuthProvider.tsx
// SOMA ODÉ — Auth Provider com suporte a multi-organização

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Role } from './permissions'
import { SOMA_ORG_ID } from '../types/organization'

type AuthUser = {
  id: string
  email: string
  role: Role
  organizationId: string       // ID da organização do produtor
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

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return

      if (data.session?.user) {
        const u = data.session.user
        const role = (u.user_metadata?.role || 'viewer') as Role

        // Admin e manager usam sempre a org SOMA
        let organizationId = SOMA_ORG_ID

        if (role !== 'admin' && role !== 'manager') {
          // Para outros roles, busca a org do user na tabela organizations
          // Primeiro tenta org_id guardado no metadata (mais rápido)
          if (u.user_metadata?.organization_id) {
            organizationId = u.user_metadata.organization_id
          } else {
            // Busca na tabela
            const { data: orgData } = await supabase
              .from('organizations')
              .select('id')
              .eq('owner_id', u.id)
              .maybeSingle()
            if (orgData) organizationId = orgData.id
          }
        }

        const baseUser: AuthUser = {
          id: u.id,
          email: u.email || '',
          role,
          organizationId,
        }

        setUser(baseUser)

        // Para artistas, busca o artistId em paralelo
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
      }

      if (mounted) setLoading(false)
    }).catch(() => {
      if (mounted) setLoading(false)
    })

    return () => { mounted = false }
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