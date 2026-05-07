// src/auth/permissions.ts
// SOMA ODÉ — Roles e permissões
// Produtor independente tem acesso completo ao seu workspace

export type Role = 'admin' | 'manager' | 'producer' | 'artist' | 'viewer'

export const PERMISSIONS: Record<Role, string[]> = {
  admin: ['*'],

  manager: [
    'artists', 'opportunities', 'events', 'contacts',
    'contracts', 'pipeline', 'documents', 'applications', 'reports',
  ],

  // Produtor independente — acesso completo ao seu próprio workspace
  producer: [
    'artists', 'opportunities', 'events', 'contacts',
    'contracts', 'pipeline', 'documents', 'applications', 'reports',
  ],

  artist: [
    'own_profile', 'own_applications',
  ],

  viewer: [
    'opportunities',
  ],
}

export function hasAccess(role: Role, resource: string) {
  const rules = PERMISSIONS[role] || []
  return rules.includes('*') || rules.includes(resource)
}