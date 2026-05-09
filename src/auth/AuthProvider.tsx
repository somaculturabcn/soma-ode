// src/auth/AuthProvider.tsx
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
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data } = await supabase.auth.getSession()
      const sessionUser = data.session?.user

      if (!sessionUser) {
        if (mounted) setLoading(false)
        return
      }

      const meta = sessionUser.user_metadata || {}
      const role = (meta.role || 'viewer') as Role
      let organizationId = SOMA_ORG_ID

      if (role === 'admin' || role === 'manager') {
        organizationId = SOMA_ORG_ID
      }

      if (role === 'producer') {
        organizationId = await getOrCreateProducerOrg(sessionUser.id, sessionUser.email || '', meta)
      }

      if (role !== 'admin' && role !== 'manager' && role !== 'producer' && meta.organization_id) {
        organizationId = meta.organization_id
      }

      const baseUser: AuthUser = {
        id: sessionUser.id,
        email: sessionUser.email || '',
        role,
        organizationId,
      }

      if (mounted) setUser(baseUser)

      if (role === 'artist') {
        const { data: artistData } = await supabase
          .from('artists')
          .select('id')
          .or(`user_id.eq.${sessionUser.id},auth_user_id.eq.${sessionUser.id}`)
          .maybeSingle()

        if (mounted && artistData) {
          setUser(prev => (prev ? { ...prev, artistId: artistData.id } : null))
        }
      }

      if (mounted) setLoading(false)
    }

    init().catch(err => {
      console.error('Erro AuthProvider:', err)
      if (mounted) setLoading(false)
    })

    return () => {
      mounted = false
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

async function getOrCreateProducerOrg(userId: string, email: string, meta: any): Promise<string> {
  if (meta.organization_id) return meta.organization_id

  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', userId)
    .maybeSingle()

  if (existing?.id) {
    await supabase.auth.updateUser({
      data: { ...meta, organization_id: existing.id },
    })
    return existing.id
  }

  const orgName =
    meta.pending_org_name ||
    meta.organization_name ||
    email.split('@')[0] ||
    'Minha Organização'

  const orgId = crypto.randomUUID()
  const slug = orgName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

  const { error } = await supabase.from('organizations').insert({
    id: orgId,
    name: orgName,
    slug,
    owner_id: userId,
    plan: 'free',
  })

  if (error) {
    console.error('Erro ao criar organização do produtor:', error)
    return orgId
  }

  await supabase.auth.updateUser({
    data: { ...meta, organization_id: orgId },
  })

  return orgId
}

export function useAuth() {
  return useContext(AuthContext)
}