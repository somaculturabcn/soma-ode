// src/components/ContactsView.tsx
// SOMA ODÉ — Contactos
// Ver + adicionar manual + editar + apagar + importar CSV + limpar CSV + enviar ao pipeline
//
// Regra aplicada:
// - admin/manager vê contactsSOMA + todos os contactos manuais/importados
// - producer/artist vê Contactos, mas só os seus próprios contactos manuais/importados
// - producer/artist NÃO vê os 112 contactos da SOMA

import { useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { contactsSOMA } from '../data/contactsSOMA'
import {
  type Contact,
  getManualContacts,
  addManualContact,
  updateManualContact,
  deleteManualContact,
  saveManualContacts,
} from '../data/manualContactsStore'
import { addPipelineItem, getPipeline } from '../data/pipelineStore'

type OwnedContact = Contact & {
  ownerUserId?: string
  ownerEmail?: string
  ownerRole?: string
  visibility?: 'private' | 'organization' | 'admin'
}

type ContactWithOrigin = OwnedContact & {
  origin: 'soma' | 'manual'
}

function getUserId(user: any) {
  return user?.id || user?.user_id || user?.auth_user_id || ''
}

function getUserEmail(user: any) {
  return user?.email || ''
}

function getUserRole(user: any) {
  return (
    user?.role ||
    user?.user_metadata?.role ||
    user?.raw_user_meta_data?.role ||
    'viewer'
  )
}

function isAdminRole(role: string) {
  return role === 'admin' || role === 'manager'
}

function contactBelongsToUser(contact: OwnedContact, userId: string, userEmail: string) {
  if (contact.ownerUserId && contact.ownerUserId === userId) return true
  if (contact.ownerEmail && userEmail && contact.ownerEmail === userEmail) return true
  return false
}

function attachOwner(contact: Contact, user: any): OwnedContact {
  return {
    ...contact,
    ownerUserId: getUserId(user),
    ownerEmail: getUserEmail(user),
    ownerRole: getUserRole(user),
    visibility: 'private',
  }
}

function emptyContact(user: any): OwnedContact {
  return attachOwner({
    id: crypto.randomUUID(),
    name: '',
    organization: '',
    role: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    website: '',
    instagram: '',
    linkedin: '',
    tiktok: '',
    disciplines: [],
    notes: '',
    source: 'manual',
  }, user)
}

function cleanText(value?: string) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s@.+-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanPhone(value?: string) {
  return (value || '').replace(/\D/g, '')
}

function sortContacts<T extends { name?: string; organization?: string }>(contacts: T[]): T[] {
  return [...contacts].sort((a, b) => {
    const nameA = cleanText(a.name || a.organization || '')
    const nameB = cleanText(b.name || b.organization || '')
    return nameA.localeCompare(nameB)
  })
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && insideQuotes && next === '"') {
      current += '"'
      i++
      continue
    }

    if (char === '"') {
      insideQuotes = !insideQuotes
      continue
    }

    if ((char === ',' || char === ';') && !insideQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  result.push(current.trim())
  return result
}

function normalizeHeader(header: string) {
  return cleanText(header).replace(/\s+/g, '_').replace(/-/g, '_')
}

function getValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const normalized = normalizeHeader(key)
    if (row[normalized]) return row[normalized]
  }
  return ''
}

function parseContactsCsv(text: string): Contact[] {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const headers = splitCsvLine(lines[0]).map(normalizeHeader)

  return lines
    .slice(1)
    .map(line => {
      const values = splitCsvLine(line)
      const row: Record<string, string> = {}

      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })

      const disciplinesRaw = getValue(row, [
        'disciplinas', 'disciplines', 'area', 'área', 'areas', 'áreas',
      ])

      return {
        id: crypto.randomUUID(),
        name: getValue(row, ['name', 'nome', 'nombre', 'contacto', 'contato', 'persona']),
        organization: getValue(row, [
          'organization', 'organização', 'organizacao', 'organizacion', 'empresa', 'entidade',
        ]),
        role: getValue(row, ['role', 'cargo', 'função', 'funcao', 'funcion', 'puesto']),
        email: getValue(row, ['email', 'e-mail', 'mail', 'correo']),
        phone: getValue(row, [
          'phone', 'telefone', 'telefono', 'teléfono', 'telemovel', 'móvil', 'movil',
        ]),
        country: getValue(row, ['country', 'pais', 'país']),
        city: getValue(row, ['city', 'cidade', 'ciudad']),
        website: getValue(row, ['website', 'site', 'web', 'url']),
        instagram: getValue(row, ['instagram', 'ig']),
        linkedin: getValue(row, ['linkedin']),
        tiktok: getValue(row, ['tiktok', 'tik_tok']),
        disciplines: disciplinesRaw
          ? disciplinesRaw.split(/[|,;]/).map(x => x.trim()).filter(Boolean)
          : [],
        notes: getValue(row, ['notes', 'notas', 'observaciones', 'observações']),
        source: 'csv',
      }
    })
    .filter(c => c.name || c.email || c.phone || c.organization)
}

function normalizeSomaContact(c: any): ContactWithOrigin {
  return {
    id: c.id,
    name: c.name || '',
    organization: c.organization || '',
    role: c.role || 'Outro',
    email: c.email || '',
    phone: c.phone || '',
    country: c.country || '',
    city: c.city || '',
    website: c.website || '',
    instagram: c.instagram || '',
    linkedin: c.linkedin || '',
    tiktok: c.tiktok || '',
    disciplines: c.disciplines || [],
    notes: c.notes || '',
    source: 'SOMA',
    ownerRole: 'admin',
    visibility: 'admin',
    origin: 'soma',
  }
}

function isDuplicate(candidate: Contact, all: ContactWithOrigin[]) {
  const email = cleanText(candidate.email)
  const phone = cleanPhone(candidate.phone)

  if (!email && !phone) return false

  return all.some(existing => {
    if (existing.id === candidate.id && existing.origin === 'manual') return false

    const sameEmail = email && cleanText(existing.email) === email
    const samePhone = phone && phone.length >= 7 && cleanPhone(existing.phone) === phone

    return sameEmail || samePhone
  })
}

export default function ContactsView() {
  const { user } = useAuth()
  const role = getUserRole(user)
  const isAdmin = isAdminRole(role)
  const currentUserId = getUserId(user)
  const currentUserEmail = getUserEmail(user)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [manualContacts, setManualContacts] = useState<OwnedContact[]>(
    () => getManualContacts() as OwnedContact[]
  )
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editing, setEditing] = useState<OwnedContact | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [importSummary, setImportSummary] = useState('')

  const visibleManualContacts = useMemo(() => {
    if (isAdmin) return manualContacts

    return manualContacts.filter(contact =>
      contactBelongsToUser(contact, currentUserId, currentUserEmail)
    )
  }, [manualContacts, isAdmin, currentUserId, currentUserEmail])

  const allContacts: ContactWithOrigin[] = useMemo(() => {
    const somaContacts: ContactWithOrigin[] = isAdmin
      ? contactsSOMA.map((c: any) => normalizeSomaContact(c))
      : []

    const visibleManual: ContactWithOrigin[] = visibleManualContacts.map(c => ({
      ...c,
      origin: 'manual' as const,
    }))

    return sortContacts([
      ...visibleManual,
      ...somaContacts,
    ])
  }, [visibleManualContacts, isAdmin])

  const roles = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of allContacts) {
      const currentRole = c.role || 'Outro'
      counts.set(currentRole, (counts.get(currentRole) || 0) + 1)
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [allContacts])

  const filtered = useMemo(() => {
    const q = cleanText(search)

    const result = allContacts.filter(c => {
      if (roleFilter !== 'all' && (c.role || 'Outro') !== roleFilter) return false
      if (!q) return true

      return cleanText(
        [
          c.name, c.organization, c.role, c.email, c.phone,
          c.country, c.city, c.website, c.instagram, c.linkedin,
          c.tiktok, c.notes, ...(c.disciplines || []),
        ].join(' ')
      ).includes(q)
    })

    return sortContacts(result)
  }, [allContacts, search, roleFilter])

  function refresh() {
    setManualContacts(getManualContacts() as OwnedContact[])
  }

  function startNewContact() {
    setEditing(emptyContact(user))
    setIsNew(true)
  }

  function startEditContact(contact: ContactWithOrigin) {
    if (contact.origin === 'soma') {
      alert('Este contacto faz parte da base SOMA. Por agora, a base SOMA só pode ser editada no ficheiro contactsSOMA.ts.')
      return
    }

    if (!isAdmin && !contactBelongsToUser(contact, currentUserId, currentUserEmail)) {
      alert('Não podes editar contactos de outra conta.')
      return
    }

    setEditing({
      id: contact.id,
      name: contact.name,
      organization: contact.organization,
      role: contact.role,
      email: contact.email,
      phone: contact.phone,
      country: contact.country,
      city: contact.city,
      website: contact.website,
      instagram: contact.instagram,
      linkedin: contact.linkedin,
      tiktok: contact.tiktok,
      disciplines: contact.disciplines || [],
      notes: contact.notes,
      source: contact.source || 'manual',
      ownerUserId: contact.ownerUserId,
      ownerEmail: contact.ownerEmail,
      ownerRole: contact.ownerRole,
      visibility: contact.visibility || 'private',
    })
    setIsNew(false)
  }

  function saveContact() {
    if (!editing) return

    if (!editing.name.trim() && !editing.organization?.trim()) {
      alert('O contacto precisa de nome ou organização.')
      return
    }

    const cleanContact: OwnedContact = {
      ...editing,
      name: editing.name.trim(),
      organization: editing.organization?.trim(),
      role: editing.role?.trim(),
      email: editing.email?.trim(),
      phone: editing.phone?.trim(),
      country: editing.country?.trim(),
      city: editing.city?.trim(),
      website: editing.website?.trim(),
      instagram: editing.instagram?.trim(),
      linkedin: editing.linkedin?.trim(),
      tiktok: editing.tiktok?.trim(),
      notes: editing.notes?.trim(),
      disciplines: editing.disciplines || [],
      source: editing.source || 'manual',
    }

    const finalContact: OwnedContact = isNew
      ? attachOwner(cleanContact, user)
      : {
          ...cleanContact,
          ownerUserId: cleanContact.ownerUserId || currentUserId,
          ownerEmail: cleanContact.ownerEmail || currentUserEmail,
          ownerRole: cleanContact.ownerRole || role,
          visibility: cleanContact.visibility || 'private',
        }

    if (!isAdmin && !contactBelongsToUser(finalContact, currentUserId, currentUserEmail)) {
      alert('Não podes guardar contactos em nome de outra conta.')
      return
    }

    const duplicated = isDuplicate(finalContact, allContacts)

    if (duplicated) {
      const ok = confirm('Este contacto parece duplicado por email ou telefone. Queres guardar mesmo assim?')
      if (!ok) return
    }

    if (isNew) addManualContact(finalContact)
    else updateManualContact(finalContact)

    refresh()
    setEditing(null)
    setIsNew(false)
  }

  function removeContact(id: string) {
    const contact = manualContacts.find(c => c.id === id)

    if (!contact) {
      alert('Este contacto faz parte da base SOMA e não pode ser apagado aqui.')
      return
    }

    if (!isAdmin && !contactBelongsToUser(contact, currentUserId, currentUserEmail)) {
      alert('Não podes apagar contactos de outra conta.')
      return
    }

    if (!confirm('Apagar este contacto?')) return

    deleteManualContact(id)
    refresh()
    setEditing(null)
    setIsNew(false)
  }

  function sendToPipeline(c: ContactWithOrigin) {
    const existing = getPipeline().find(item => {
      const sameEmail = c.email && item.email && cleanText(c.email) === cleanText(item.email)
      const samePhone = c.phone && item.phone && cleanPhone(c.phone) === cleanPhone(item.phone)
      return sameEmail || samePhone
    })

    if (existing) {
      alert('Este contacto já está no pipeline.')
      return
    }

    addPipelineItem({
      title: `${c.name || c.organization}${c.organization && c.name ? ' · ' + c.organization : ''}`,
      status: 'lead',
      origin: 'contacto',
      contactId: c.id,
      contactName: c.name,
      organization: c.organization,
      email: c.email,
      phone: c.phone,
      priority: 'media',
      notes: c.notes || '',
    })

    alert('Contacto enviado para o pipeline.')
  }

  function clearCsvContacts() {
    const current = getManualContacts() as OwnedContact[]

    const csvContacts = current.filter(c => {
      if (c.source !== 'csv') return false
      if (isAdmin) return true
      return contactBelongsToUser(c, currentUserId, currentUserEmail)
    })

    const next = current.filter(c => {
      if (c.source !== 'csv') return true
      if (isAdmin) return false
      return !contactBelongsToUser(c, currentUserId, currentUserEmail)
    })

    if (csvContacts.length === 0) {
      alert('Não há contactos CSV para apagar.')
      return
    }

    if (!confirm(`Apagar ${csvContacts.length} contactos importados por CSV?`)) return

    saveManualContacts(sortContacts(next))
    refresh()

    const summary = `${csvContacts.length} contactos importados por CSV foram apagados.`
    setImportSummary(summary)
    alert(summary)
  }

  function clearAllManualContacts() {
    const current = getManualContacts() as OwnedContact[]

    const contactsToDelete = current.filter(c => {
      if (isAdmin) return true
      return contactBelongsToUser(c, currentUserId, currentUserEmail)
    })

    const next = current.filter(c => {
      if (isAdmin) return false
      return !contactBelongsToUser(c, currentUserId, currentUserEmail)
    })

    if (contactsToDelete.length === 0) {
      alert('Não há contactos manuais para apagar.')
      return
    }

    const message = isAdmin
      ? `ATENÇÃO: apagar TODOS os ${contactsToDelete.length} contactos manuais/importados de todas as contas?`
      : `Apagar TODOS os teus ${contactsToDelete.length} contactos manuais/importados?`

    if (!confirm(message)) return

    saveManualContacts(sortContacts(next))
    refresh()

    const summary = isAdmin
      ? `${contactsToDelete.length} contactos manuais/importados de todas as contas apagados.`
      : `${contactsToDelete.length} contactos teus apagados.`

    setImportSummary(summary)
    alert(summary)
  }

  async function handleCsvImport(file: File) {
    const text = await file.text()
    const parsed = parseContactsCsv(text)

    const current = getManualContacts() as OwnedContact[]

    const existingManualWithoutOwnCsv = current.filter(c => {
      if (c.source !== 'csv') return true
      if (isAdmin) return false
      return !contactBelongsToUser(c, currentUserId, currentUserEmail)
    })

    saveManualContacts(existingManualWithoutOwnCsv)
    setManualContacts(existingManualWithoutOwnCsv)

    let imported = 0
    let duplicated = 0
    let incomplete = 0

    const baseForDuplicateCheck: ContactWithOrigin[] = [
      ...existingManualWithoutOwnCsv
        .filter(c => {
          if (isAdmin) return true
          return contactBelongsToUser(c, currentUserId, currentUserEmail)
        })
        .map(c => ({ ...c, origin: 'manual' as const })),
      ...(isAdmin ? contactsSOMA.map((c: any) => normalizeSomaContact(c)) : []),
    ]

    let currentAll: ContactWithOrigin[] = baseForDuplicateCheck
    const toSave: OwnedContact[] = [...existingManualWithoutOwnCsv]

    for (const contact of parsed) {
      if (!contact.name && !contact.organization && !contact.email && !contact.phone) {
        incomplete++
        continue
      }

      const ownedContact = attachOwner(contact, user)

      if (isDuplicate(ownedContact, currentAll)) {
        duplicated++
        continue
      }

      toSave.push(ownedContact)
      imported++
      currentAll = [{ ...ownedContact, origin: 'manual' }, ...currentAll]
    }

    saveManualContacts(sortContacts(toSave))
    refresh()

    const summary = `${parsed.length} lidos · ${imported} importados · ${duplicated} duplicados saltados · ${incomplete} incompletos`
    setImportSummary(summary)
    alert(summary)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.title}>Contactos</h2>
          <p style={styles.subtitle}>
            {filtered.length} de {allContacts.length} contactos
            {!isAdmin && ' · apenas os teus contactos'}
          </p>
          {importSummary && <p style={styles.importSummary}>{importSummary}</p>}
        </div>

        <div style={styles.headerActions}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleCsvImport(file)
            }}
          />

          <button style={styles.importBtn} onClick={() => fileInputRef.current?.click()}>
            📥 Importar CSV
          </button>

          <button style={styles.clearBtn} onClick={clearCsvContacts}>
            Limpar CSV
          </button>

          <button style={styles.clearAllBtn} onClick={clearAllManualContacts}>
            Limpar manuais
          </button>

          <button style={styles.primaryBtn} onClick={startNewContact}>
            + Novo contacto
          </button>
        </div>
      </header>

      <div style={styles.toolbar}>
        <input
          style={styles.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Pesquisar por nome, organização, email, país, redes..."
        />

        <select
          style={styles.select}
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="all">Todos os cargos</option>
          {roles.map(([currentRole, count]) => (
            <option key={currentRole} value={currentRole}>
              {currentRole} ({count})
            </option>
          ))}
        </select>
      </div>

      <div style={styles.grid}>
        {filtered.map(c => {
          const duplicated = isDuplicate(c, allContacts)
          const canManage =
            c.origin === 'manual' &&
            (isAdmin || contactBelongsToUser(c, currentUserId, currentUserEmail))

          return (
            <div key={`${c.origin}-${c.id}`} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <div style={styles.name}>{c.name || c.organization}</div>
                  {c.name && c.organization && <div style={styles.org}>{c.organization}</div>}
                </div>

                <div style={styles.badges}>
                  {duplicated && <span style={styles.duplicateBadge}>duplicado</span>}
                  {c.role && <span style={styles.role}>{c.role}</span>}
                  {c.origin === 'manual' && (
                    <span style={styles.manualBadge}>manual</span>
                  )}
                  {c.origin === 'soma' && isAdmin && (
                    <span style={styles.somaBadge}>SOMA</span>
                  )}
                </div>
              </div>

              <div style={styles.contactLines}>
                {c.email && (
                  <a href={`mailto:${c.email}`} style={styles.link}>✉ {c.email}</a>
                )}
                {c.phone && (
                  <a href={`tel:${c.phone}`} style={styles.link}>☎ {c.phone}</a>
                )}
                {(c.city || c.country) && (
                  <span style={styles.meta}>
                    📍 {[c.country, c.city].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>

              {c.notes && <p style={styles.notes}>{c.notes}</p>}

              <div style={styles.actions}>
                <button style={styles.pipelineBtn} onClick={() => sendToPipeline(c)}>
                  ➤ Enviar a pipeline
                </button>

                {canManage && (
                  <button style={styles.secondaryBtn} onClick={() => startEditContact(c)}>
                    Editar
                  </button>
                )}

                {canManage && (
                  <button style={styles.dangerBtn} onClick={() => removeContact(c.id)}>
                    Apagar
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {editing && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>{isNew ? 'Novo contacto' : 'Editar contacto'}</h3>

            <div style={styles.formGrid}>
              <input
                style={styles.input}
                placeholder="Nome"
                value={editing.name}
                onChange={e => setEditing({ ...editing, name: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="Organização"
                value={editing.organization || ''}
                onChange={e => setEditing({ ...editing, organization: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="Cargo / função"
                value={editing.role || ''}
                onChange={e => setEditing({ ...editing, role: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="Email"
                value={editing.email || ''}
                onChange={e => setEditing({ ...editing, email: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="Telefone"
                value={editing.phone || ''}
                onChange={e => setEditing({ ...editing, phone: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="País"
                value={editing.country || ''}
                onChange={e => setEditing({ ...editing, country: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="Cidade"
                value={editing.city || ''}
                onChange={e => setEditing({ ...editing, city: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="Website"
                value={editing.website || ''}
                onChange={e => setEditing({ ...editing, website: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="Instagram"
                value={editing.instagram || ''}
                onChange={e => setEditing({ ...editing, instagram: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="LinkedIn"
                value={editing.linkedin || ''}
                onChange={e => setEditing({ ...editing, linkedin: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="TikTok"
                value={editing.tiktok || ''}
                onChange={e => setEditing({ ...editing, tiktok: e.target.value })}
              />
              <input
                style={styles.input}
                placeholder="Disciplinas separadas por vírgula"
                value={(editing.disciplines || []).join(', ')}
                onChange={e => setEditing({
                  ...editing,
                  disciplines: e.target.value.split(',').map(x => x.trim()).filter(Boolean),
                })}
              />
            </div>

            <textarea
              style={styles.textarea}
              placeholder="Notas internas"
              value={editing.notes || ''}
              onChange={e => setEditing({ ...editing, notes: e.target.value })}
            />

            <div style={styles.modalActions}>
              <button style={styles.secondaryBtn} onClick={() => setEditing(null)}>
                Cancelar
              </button>
              {!isNew && (
                <button style={styles.dangerBtn} onClick={() => removeContact(editing.id)}>
                  Apagar
                </button>
              )}
              <button style={styles.primaryBtn} onClick={saveContact}>
                Guardar contacto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1100, margin: '0 auto', padding: '24px 20px', color: '#fff' },
  header: { marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  headerActions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 24, color: '#fff' },
  subtitle: { margin: '4px 0 0', color: '#bbb', fontSize: 14 },
  importSummary: { margin: '4px 0 0', color: '#6ef3a5', fontSize: 12 },
  toolbar: { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  search: {
    flex: '1 1 300px', padding: '10px 14px', background: '#0a0a0a', color: '#fff',
    border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 13, outline: 'none',
  },
  select: {
    padding: '10px 14px', background: '#0a0a0a', color: '#fff',
    border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 13, outline: 'none', cursor: 'pointer',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 },
  card: { background: '#111', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 16px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: 700, color: '#fff' },
  org: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
  badges: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' },
  role: { fontSize: 10, padding: '2px 8px', background: 'rgba(26,105,148,0.15)', color: '#60b4e8', borderRadius: 10, whiteSpace: 'nowrap' },
  duplicateBadge: { fontSize: 10, padding: '2px 8px', background: 'rgba(255,80,80,0.16)', color: '#ff8a8a', borderRadius: 10 },
  manualBadge: { fontSize: 10, padding: '2px 8px', background: 'rgba(110,243,165,0.12)', color: '#6ef3a5', borderRadius: 10 },
  somaBadge: { fontSize: 10, padding: '2px 8px', background: 'rgba(255,207,92,0.12)', color: '#ffcf5c', borderRadius: 10 },
  contactLines: { display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 },
  link: { fontSize: 12, color: '#7ab6ff', textDecoration: 'none', wordBreak: 'break-all' },
  meta: { fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  notes: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 10, lineHeight: 1.5 },
  actions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' },
  pipelineBtn: {
    background: 'rgba(110,243,165,0.08)', border: '1px solid rgba(110,243,165,0.25)',
    color: '#6ef3a5', padding: '8px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
  },
  importBtn: {
    background: 'rgba(255,207,92,0.10)', color: '#ffcf5c',
    border: '1px solid rgba(255,207,92,0.30)', borderRadius: 8,
    padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  clearBtn: {
    background: 'rgba(255,80,80,0.10)', color: '#ff8a8a',
    border: '1px solid rgba(255,80,80,0.25)', borderRadius: 8,
    padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  clearAllBtn: {
    background: 'rgba(255,255,255,0.06)', color: '#ddd',
    border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8,
    padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  primaryBtn: {
    background: '#1676a3', color: '#fff',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
    padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  secondaryBtn: {
    background: 'rgba(255,255,255,0.06)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
    padding: '8px 12px', fontSize: 12, cursor: 'pointer',
  },
  dangerBtn: {
    background: 'rgba(255,70,70,0.12)', color: '#ff8a8a',
    border: '1px solid rgba(255,70,70,0.25)', borderRadius: 8,
    padding: '8px 12px', fontSize: 12, cursor: 'pointer',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  modal: {
    width: 'min(820px, 100%)', maxHeight: '90vh', overflowY: 'auto',
    background: '#050505', border: '1px solid #1676a3', borderRadius: 14, padding: 22,
  },
  modalTitle: { margin: '0 0 18px', color: '#fff', fontSize: 22 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 },
  input: {
    background: '#111', color: '#fff', border: '1px solid #1676a3',
    borderRadius: 8, padding: '11px 12px', fontSize: 13, outline: 'none',
  },
  textarea: {
    width: '100%', minHeight: 110, marginTop: 10, background: '#111', color: '#fff',
    border: '1px solid #1676a3', borderRadius: 8, padding: 12, fontSize: 13,
    outline: 'none', resize: 'vertical', boxSizing: 'border-box',
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
}
