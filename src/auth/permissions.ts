// src/auth/permissions.ts
// SOMA ODÉ — Roles e permissões
// Correção temporária: produtores NÃO acessam Contactos da SOMA
// porque os 112 contactos ainda estão embutidos no frontend.

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

  // Produtor independente — acesso ao seu próprio workspace,
  // mas SEM "contacts" enquanto os contactos ainda vêm do contactsSOMA/localStorage.
  producer: [
    'artists',
    'opportunities',
    'events',
    'contracts',
    'pipeline',
    'documents',
    'applications',
    'reports',
  ],

  artist: [
    'own_profile',
    'own_applications',
  ],

  viewer: [
    'opportunities',
  ],
}

export function hasAccess(role: Role, resource: string) {
  const rules = PERMISSIONS[role] || []
  return rules.includes('*') || rules.includes(resource)
}