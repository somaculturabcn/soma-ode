// src/components/ContactsView.tsx
// SOMA ODÉ — Contactos
// Ver + adicionar manual + editar + apagar + importar CSV + limpar CSV + enviar ao pipeline

import { useMemo, useRef, useState } from 'react'
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

type ContactWithOrigin = Contact & {
  origin: 'mil' | 'manual'
}

function emptyContact(): Contact {
  return {
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
  }
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
        'disciplinas',
        'disciplines',
        'area',
        'área',
        'areas',
        'áreas',
      ])

      return {
        id: crypto.randomUUID(),
        name: getValue(row, ['name', 'nome', 'nombre', 'contacto', 'contato', 'persona']),
        organization: getValue(row, [
          'organization',
          'organização',
          'organizacao',
          'organizacion',
          'empresa',
          'entidade',
        ]),
        role: getValue(row, ['role', 'cargo', 'função', 'funcao', 'funcion', 'puesto']),
        email: getValue(row, ['email', 'e-mail', 'mail', 'correo']),
        phone: getValue(row, [
          'phone',
          'telefone',
          'telefono',
          'teléfono',
          'telemovel',
          'móvil',
          'movil',
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
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [manualContacts, setManualContacts] = useState<Contact[]>(getManualContacts())
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editing, setEditing] = useState<Contact | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [importSummary, setImportSummary] = useState('')

  const allContacts: ContactWithOrigin[] = useMemo(() => {
    const imported: ContactWithOrigin[] = contactsSOMA.map((c: any) => ({
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
      source: 'MIL',
      origin: 'mil',
    }))

    return sortContacts([
      ...manualContacts.map(c => ({ ...c, origin: 'manual' as const })),
      ...imported,
    ])
  }, [manualContacts])

  const roles = useMemo(() => {
    const counts = new Map<string, number>()

    for (const c of allContacts) {
      const role = c.role || 'Outro'
      counts.set(role, (counts.get(role) || 0) + 1)
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
          c.name,
          c.organization,
          c.role,
          c.email,
          c.phone,
          c.country,
          c.city,
          c.website,
          c.instagram,
          c.linkedin,
          c.tiktok,
          c.notes,
          ...(c.disciplines || []),
        ].join(' ')
      ).includes(q)
    })

    return sortContacts(result)
  }, [allContacts, search, roleFilter])

  function refresh() {
    setManualContacts(getManualContacts())
  }

  function startNewContact() {
    setEditing(emptyContact())
    setIsNew(true)
  }

  function startEditContact(contact: ContactWithOrigin) {
    setEditing({
      id: contact.origin === 'mil' ? crypto.randomUUID() : contact.id,
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
      source: contact.origin === 'mil' ? 'MIL duplicado/editado' : contact.source || 'manual',
    })

    setIsNew(contact.origin === 'mil')
  }

  function saveContact() {
    if (!editing) return

    if (!editing.name.trim() && !editing.organization?.trim()) {
      alert('O contacto precisa de nome ou organização.')
      return
    }

    const cleanContact: Contact = {
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

    const duplicated = isDuplicate(cleanContact, allContacts)

    if (duplicated) {
      const ok = confirm(
        'Este contacto parece duplicado por email ou telefone. Queres guardar mesmo assim?'
      )
      if (!ok) return
    }

    if (isNew) addManualContact(cleanContact)
    else updateManualContact(cleanContact)

    refresh()
    setEditing(null)
    setIsNew(false)
  }

  function removeContact(id: string) {
    if (!confirm('Apagar este contacto manual?')) return

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
    const current = getManualContacts()
    const csvContacts = current.filter(c => c.source === 'csv')
    const next = current.filter(c => c.source !== 'csv')

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
    const current = getManualContacts()

    if (current.length === 0) {
      alert('Não há contactos manuais para apagar.')
      return
    }

    if (
      !confirm(
        `ATENÇÃO: apagar TODOS os ${current.length} contactos manuais? Isto mantém só os contactos MIL.`
      )
    ) {
      return
    }

    saveManualContacts([])
    refresh()

    const summary = `${current.length} contactos manuais apagados. Ficaram apenas os contactos MIL.`
    setImportSummary(summary)
    alert(summary)
  }

  async function handleCsvImport(file: File) {
    const text = await file.text()
    const parsed = parseContactsCsv(text)

    const existingManualWithoutCsv = getManualContacts().filter(c => c.source !== 'csv')

    saveManualContacts(existingManualWithoutCsv)
    setManualContacts(existingManualWithoutCsv)

    let imported = 0
    let duplicated = 0
    let incomplete = 0

    let currentAll: ContactWithOrigin[] = [
      ...existingManualWithoutCsv.map(c => ({ ...c, origin: 'manual' as const })),
      ...contactsSOMA.map((c: any) => ({
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
        source: 'MIL',
        origin: 'mil' as const,
      })),
    ]

    const toSave: Contact[] = [...existingManualWithoutCsv]

    for (const contact of parsed) {
      if (!contact.name && !contact.organization && !contact.email && !contact.phone) {
        incomplete++
        continue
      }

      if (isDuplicate(contact, currentAll)) {
        duplicated++
        continue
      }

      toSave.push(contact)
      imported++
      currentAll = [{ ...contact, origin: 'manual' }, ...currentAll]
    }

    saveManualContacts(sortContacts(toSave))
    refresh()

    const summary = `${parsed.length} contactos lidos · ${imported} importados · ${duplicated} duplicados saltados · ${incomplete} incompletos · CSV anterior substituído`
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
            {filtered.length} de {allContacts.length} contactos · {contactsSOMA.length} MIL ·{' '}
            {manualContacts.length} manuais
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

      <div style={styles.importHelp}>
        A lista está em ordem alfabética. <b>Limpar CSV</b> apaga só contactos importados por CSV.
        <b> Limpar manuais</b> apaga todos os contactos manuais e deixa apenas os contactos MIL.
      </div>

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
          {roles.map(([role, count]) => (
            <option key={role} value={role}>
              {role} ({count})
            </option>
          ))}
        </select>
      </div>

      <div style={styles.grid}>
        {filtered.map(c => {
          const duplicated = isDuplicate(c, allContacts)

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
                  <span style={c.origin === 'manual' ? styles.manualBadge : styles.milBadge}>
                    {c.origin === 'manual' ? 'manual' : 'MIL'}
                  </span>
                </div>
              </div>

              <div style={styles.contactLines}>
                {c.email && (
                  <a href={`mailto:${c.email}`} style={styles.link}>
                    ✉ {c.email}
                  </a>
                )}

                {c.phone && (
                  <a href={`tel:${c.phone}`} style={styles.link}>
                    ☎ {c.phone}
                  </a>
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

                <button style={styles.secondaryBtn} onClick={() => startEditContact(c)}>
                  {c.origin === 'mil' ? 'Duplicar / editar' : 'Editar'}
                </button>

                {c.origin === 'manual' && (
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
                onChange={e =>
                  setEditing({
                    ...editing,
                    disciplines: e.target.value.split(',').map(x => x.trim()).filter(Boolean),
                  })
                }
              />

              <input
                style={styles.input}
                placeholder="Fonte"
                value={editing.source || ''}
                onChange={e => setEditing({ ...editing, source: e.target.value })}
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
  importHelp: {
    marginBottom: 18,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 10,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    lineHeight: 1.5,
  },
  toolbar: { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  search: {
    flex: '1 1 300px',
    padding: '10px 14px',
    background: '#0a0a0a',
    color: '#fff',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
  },
  select: {
    padding: '10px 14px',
    background: '#0a0a0a',
    color: '#fff',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
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
  milBadge: { fontSize: 10, padding: '2px 8px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', borderRadius: 10 },
  contactLines: { display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8 },
  link: { fontSize: 12, color: '#7ab6ff', textDecoration: 'none', wordBreak: 'break-all' },
  meta: { fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  notes: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 10, lineHeight: 1.5 },
  actions: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' },
  pipelineBtn: {
    background: 'rgba(110,243,165,0.08)',
    border: '1px solid rgba(110,243,165,0.25)',
    color: '#6ef3a5',
    padding: '8px 12px',
    borderRadius: 8,
    fontSize: 12,
    cursor: 'pointer',
  },
  importBtn: {
    background: 'rgba(255,207,92,0.10)',
    color: '#ffcf5c',
    border: '1px solid rgba(255,207,92,0.30)',
    borderRadius: 8,
    padding: '9px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  clearBtn: {
    background: 'rgba(255,80,80,0.10)',
    color: '#ff8a8a',
    border: '1px solid rgba(255,80,80,0.25)',
    borderRadius: 8,
    padding: '9px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  clearAllBtn: {
    background: 'rgba(255,255,255,0.06)',
    color: '#ddd',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 8,
    padding: '9px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  primaryBtn: {
    background: '#1676a3',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: '9px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryBtn: {
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    cursor: 'pointer',
  },
  dangerBtn: {
    background: 'rgba(255,70,70,0.12)',
    color: '#ff8a8a',
    border: '1px solid rgba(255,70,70,0.25)',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: 'min(820px, 100%)',
    maxHeight: '90vh',
    overflowY: 'auto',
    background: '#050505',
    border: '1px solid #1676a3',
    borderRadius: 14,
    padding: 22,
  },
  modalTitle: { margin: '0 0 18px', color: '#fff', fontSize: 22 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 },
  input: { background: '#111', color: '#fff', border: '1px solid #1676a3', borderRadius: 8, padding: '11px 12px', fontSize: 13, outline: 'none' },
  textarea: {
    width: '100%',
    minHeight: 110,
    marginTop: 10,
    background: '#111',
    color: '#fff',
    border: '1px solid #1676a3',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
}