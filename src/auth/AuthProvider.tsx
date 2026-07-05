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

// Tempo máximo (ms) que a app espera pelo arranque antes de libertar o ecrã
// de carregamento. Evita que a app fique presa em "A carregar..." quando o
// Supabase está pausado (plano Free) ou a rede está lenta.
const BOOT_TIMEOUT_MS = 8000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // ── Rede de segurança ──────────────────────────────────────────────
    // Se nada resolver o arranque em BOOT_TIMEOUT_MS, libertamos o ecrã de
    // carregamento à força. A app mostra o login em vez de congelar.
    // Se, entretanto, a sessão for hidratada, o estado atualiza normalmente.
    const safetyTimer = setTimeout(() => {
      if (mounted) {
        console.warn(
          'AuthProvider: timeout de arranque atingido — a libertar o ecrã de carregamento. ' +
          'Provável causa: Supabase pausado ou rede lenta.'
        )
        setLoading(false)
      }
    }, BOOT_TIMEOUT_MS)

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
      clearTimeout(safetyTimer)
      listener.subscription.unsubscribe()
    }
  }, [])

  async function hydrateUser(sessionUser: any, mounted = true) {
    const meta = sessionUser.user_metadata || {}

    // O role vem da tabela `profiles` (fonte segura), não do user_metadata.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', sessionUser.id)
      .maybeSingle()
    const dbRole = (profile?.role ?? '') as string
    const metaRole = (dbRole && dbRole !== 'pending' ? dbRole : undefined) as Role | undefined

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

    if (role === 'producer' || role === 'artist') {
      organizationId = await getOrCreateProducerOrg(sessionUser.id, sessionUser.email || '', meta)
    }

    if (role !== 'admin' && role !== 'manager' && role !== 'producer' && role !== 'artist' && meta.organization_id) {
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

    // Nome da organização fica no metadata (não é sensível) — usado ao criar a org.
    if (role === 'producer') {
      const pendingOrgName =
        organizationName?.trim() ||
        currentMeta.full_name ||
        sessionUser.email?.split('@')[0] ||
        'Minha Organização'
      await supabase.auth.updateUser({ data: { ...currentMeta, pending_org_name: pendingOrgName } })
    }

    // O role é gravado na tabela profiles (fonte segura).
    // O trigger no Supabase permite apenas pending -> artist/producer.
    const { error } = await supabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', sessionUser.id)

    if (error) {
      console.error('Erro ao definir perfil:', error)
      setLoading(false)
      return
    }

    await hydrateUser(sessionUser, true)
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