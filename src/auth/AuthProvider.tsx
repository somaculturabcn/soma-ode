// src/auth/AuthProvider.tsx
// SOMA ODÉ — Auth Provider com multi-organização
// A organização do produtor é criada no primeiro login (após confirmar email)

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Role } from './permissions'
import { SOMA_ORG_ID } from '../types/organization'

type AuthUser = {
  id: string
  email: string
  role: Role
  organizationId: string
  artistId?: string
}

type AuthContextType = {
  user: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null, loading: true, signOut: async () => {},
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
        const meta = u.user_metadata || {}
        const role = (meta.role || 'viewer') as Role

        let organizationId = SOMA_ORG_ID

        if (role === 'admin' || role === 'manager') {
          // SOMA team — usa sempre a org SOMA
          organizationId = SOMA_ORG_ID

        } else if (role === 'producer') {
          // Produtor — busca ou cria a organização
          organizationId = await getOrCreateProducerOrg(u.id, meta)

        } else if (meta.organization_id) {
          organizationId = meta.organization_id
        }

        const baseUser: AuthUser = { id: u.id, email: u.email || '', role, organizationId }
        setUser(baseUser)

        // Para artistas, busca o artistId
        if (role === 'artist') {
          supabase.from('artists').select('id').eq('user_id', u.id).maybeSingle()
            .then(({ data: artistData }) => {
              if (mounted && artistData) {
                setUser(prev => prev ? { ...prev, artistId: artistData.id } : null)
              }
            }).catch(console.error)
        }
      }

      if (mounted) setLoading(false)
    }).catch(() => {
      if (mounted) setLoading(false)
    })

    return () => { mounted = false }
  }, [])

  async function signOut() {
    try { await supabase.auth.signOut() } catch (err) { console.error(err) }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// Busca ou cria a organização do produtor no primeiro login
async function getOrCreateProducerOrg(userId: string, meta: any): Promise<string> {
  // 1. Já tem org_id no metadata?
  if (meta.organization_id) return meta.organization_id

  // 2. Busca na tabela organizations
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle()

  if (existing?.id) {
    // Guarda no metadata para próximo login ser mais rápido
    await supabase.auth.updateUser({ data: { ...meta, organization_id: existing.id } })
    return existing.id
  }

  // 3. Primeira vez — cria a organização com o nome guardado no metadata
  const orgName = meta.pending_org_name || meta.email?.split('@')[0] || 'Minha Organização'
  const orgId = crypto.randomUUID()
  const slug = orgName.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const { error } = await supabase.from('organizations').insert({
    id: orgId,
    name: orgName,
    slug,
    owner_id: userId,
    plan: 'free',
  })

  if (error) {
    console.error('Erro ao criar org do produtor:', error)
    return SOMA_ORG_ID // fallback
  }

  // Actualiza metadata com org_id
  await supabase.auth.updateUser({
    data: { ...meta, organization_id: orgId },
  })

  return orgId
}

export function useAuth() {
  return useContext(AuthContext)
}