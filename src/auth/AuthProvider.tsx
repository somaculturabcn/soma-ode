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
  needsRoleSetup?: boolean
}

type AuthContextType = {
  user: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
  completeRoleSetup: (role: 'artist' | 'producer', organizationName?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  completeRoleSetup: async () => {},
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

      await hydrateUser(sessionUser, mounted)
    }

    init().catch(err => {
      console.error('Erro AuthProvider:', err)
      if (mounted) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      if (!session?.user) {
        setUser(null)
        setLoading(false)
        return
      }

      setLoading(true)
      await hydrateUser(session.user, mounted)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function hydrateUser(sessionUser: any, mounted = true) {
    const meta = sessionUser.user_metadata || {}
    const metaRole = meta.role as Role | undefined

    if (!metaRole) {
      if (mounted) {
        setUser({
          id: sessionUser.id,
          email: sessionUser.email || '',
          role: 'viewer' as Role,
          organizationId: SOMA_ORG_ID,
          needsRoleSetup: true,
        })
        setLoading(false)
      }
      return
    }

    const role = metaRole
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
      needsRoleSetup: false,
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

  async function completeRoleSetup(role: 'artist' | 'producer', organizationName?: string) {
    setLoading(true)

    const { data } = await supabase.auth.getUser()
    const sessionUser = data.user

    if (!sessionUser) {
      setLoading(false)
      return
    }

    const currentMeta = sessionUser.user_metadata || {}

    const nextMeta: Record<string, any> = {
      ...currentMeta,
      role,
    }

    if (role === 'producer') {
      nextMeta.pending_org_name =
        organizationName?.trim() ||
        currentMeta.full_name ||
        sessionUser.email?.split('@')[0] ||
        'Minha Organização'
    }

    const { error } = await supabase.auth.updateUser({
      data: nextMeta,
    })

    if (error) {
      console.error('Erro ao definir perfil:', error)
      setLoading(false)
      return
    }

    const { data: refreshed } = await supabase.auth.refreshSession()
    if (refreshed.session?.user) {
      await hydrateUser(refreshed.session.user, true)
    } else {
      setLoading(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, completeRoleSetup }}>
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