// src/auth/permissions.ts
// SOMA ODÉ — Roles e permissões
// Contactos:
// - admin vê tudo
// - producer pode gerir os seus próprios contactos
// - artist pode gerir os seus próprios contactos simples
// A separação dos dados acontece dentro do ContactsView + Supabase/RLS.

export type Role = 'admin' | 'manager' | 'producer' | 'artist' | 'viewer'

export const PERMISSIONS: Record<Role, string[]> = {
  admin: ['*'],

  manager: [
    'artists',
    'opportunities',
    'events',
    'contacts',
    'contracts',
    'pipeline',
    'documents',
    'applications',
    'reports',
  ],

  // Produtor independente — acesso ao seu workspace.
  // Pode usar Contactos, mas só deve ver/criar os seus próprios contactos.
  producer: [
    'artists',
    'opportunities',
    'events',
    'contacts',
    'contracts',
    'pipeline',
    'documents',
    'applications',
    'reports',
  ],

  // Artista — pode gerir o próprio perfil, candidaturas e contactos simples.
  artist: [
    'own_profile',
    'own_applications',
    'contacts',
  ],

  viewer: [
    'opportunities',
  ],
}

export function hasAccess(role: Role, resource: string) {
  const rules = PERMISSIONS[role] || []
  return rules.includes('*') || rules.includes(resource)
}