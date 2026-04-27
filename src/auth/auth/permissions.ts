export type Role = 'admin' | 'manager' | 'producer' | 'artist' | 'viewer'

export const PERMISSIONS: Record<Role, string[]> = {
  admin: ['*'],

  manager: [
    'artists',
    'opportunities',
    'contacts',
    'contracts',
    'pipeline',
    'documents',
    'applications',
    'reports',
  ],

  producer: [
    'opportunities',
    'pipeline',
    'applications',
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