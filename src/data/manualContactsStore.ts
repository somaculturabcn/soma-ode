// src/data/manualContactsStore.ts
// SOMA ODÉ — armazenamento local de contactos manuais

export type Contact = {
  id: string
  name: string
  organization?: string
  role?: string
  email?: string
  phone?: string
  country?: string
  city?: string
  website?: string
  instagram?: string
  linkedin?: string
  tiktok?: string
  disciplines?: string[]
  notes?: string
  source?: string
}

const STORAGE_KEY = 'soma_manual_contacts_v1'

export function getManualContacts(): Contact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveManualContacts(contacts: Contact[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts))
}

export function addManualContact(contact: Contact) {
  const current = getManualContacts()
  saveManualContacts([contact, ...current])
}

export function updateManualContact(contact: Contact) {
  const current = getManualContacts()
  const exists = current.some(c => c.id === contact.id)

  if (exists) {
    saveManualContacts(current.map(c => c.id === contact.id ? contact : c))
  } else {
    saveManualContacts([contact, ...current])
  }
}

export function deleteManualContact(id: string) {
  const current = getManualContacts()
  saveManualContacts(current.filter(c => c.id !== id))
}