// src/components/BookingManager.tsx
// SOMA ODÉ v5 — CRM de Booking: envio de press kits, tracking, tournée

import { useState, useEffect } from 'react'
import { realOpportunities } from '../data/realOpportunities'

const BOOKING_KEY = 'soma_booking_contacts'
const PROFILE_KEY = 'soma_artist_profile'

type BookingStatus = 'pendente' | 'enviado' | 'respondido' | 'confirmado' | 'rejeitado'

interface BookingContact {
  id: string
  venueName: string
  contactEmail: string
  contactPerson: string
  city: string
  country: string
  status: BookingStatus
  sentDate?: string
  notes: string
  lastUpdated: string
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  pendente:   { label: 'Pendente',   color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  enviado:    { label: 'Enviado',    color: '#60b4e8', bg: 'rgba(96,180,232,0.1)' },
  respondido: { label: 'Respondido', color: '#ffcf5c', bg: 'rgba(255,207,92,0.1)' },
  confirmado: { label: 'Confirmado', color: '#6ef3a5', bg: 'rgba(110,243,165,0.1)' },
  rejeitado:  { label: 'Rejeitado',  color: '#f97066', bg: 'rgba(249,112,102,0.1)' },
}

export default function BookingManager() {
  const [contacts, setContacts] = useState<BookingContact[]>([])
  const [view, setView] = useState<'pipeline' | 'add' | 'email'>('pipeline')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<BookingStatus | 'todos'>('todos')

  // Carregar contactos
  useEffect(() => {
    try {
      const stored = localStorage.getItem(BOOKING_KEY)
      if (stored) setContacts(JSON.parse(stored))
    } catch { /* */ }
  }, [])

  function save(list: BookingContact[]) {
    setContacts(list)
    localStorage.setItem(BOOKING_KEY, JSON.stringify(list))
  }

  function updateStatus(id: string, status: BookingStatus) {
    save(contacts.map(c => c.id === id ? { ...c, status, lastUpdated: new Date().toISOString() } : c))
  }

  function updateNotes(id: string, notes: string) {
    save(contacts.map(c => c.id === id ? { ...c, notes, lastUpdated: new Date().toISOString() } : c))
  }

  function removeContact(id: string) {
    save(contacts.filter(c => c.id !== id))
  }

  const filtered = filterStatus === 'todos' ? contacts : contacts.filter(c => c.status === filterStatus)

  // Stats
  const stats = {
    total: contacts.length,
    enviado: contacts.filter(c => c.status === 'enviado').length,
    respondido: contacts.filter(c => c.status === 'respondido').length,
    confirmado: contacts.filter(c => c.status === 'confirmado').length,
  }

  return (
    <div style={st.page}>
      <div style={st.headerRow}>
        <div>
          <h1 style={st.title}>✈️ Booking</h1>
          <p style={st.sub}>Envia press kits, acompanha respostas e organiza a tournée</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...st.tabBtn, ...(view === 'pipeline' ? st.tabActive : {}) }} onClick={() => setView('pipeline')}>Pipeline</button>
          <button style={{ ...st.tabBtn, ...(view === 'add' ? st.tabActive : {}) }} onClick={() => setView('add')}>+ Adicionar</button>
          <button style={{ ...st.tabBtn, ...(view === 'email' ? st.tabActive : {}) }} onClick={() => setView('email')}>📧 Gerar Email</button>
        </div>
      </div>

      {/* Stats */}
      <div style={st.statsRow}>
        <StatBox label="Total" value={stats.total} color="#94a3b8" />
        <StatBox label="Enviados" value={stats.enviado} color="#60b4e8" />
        <StatBox label="Respondidos" value={stats.respondido} color="#ffcf5c" />
        <StatBox label="Confirmados" value={stats.confirmado} color="#6ef3a5" />
      </div>

      {view === 'pipeline' && (
        <PipelineView
          contacts={filtered}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          onUpdateStatus={updateStatus}
          onUpdateNotes={updateNotes}
          onRemove={removeContact}
        />
      )}

      {view === 'add' && (
        <AddFromRadar
          existingIds={new Set(contacts.map(c => c.id))}
          onAdd={(newContacts) => {
            save([...contacts, ...newContacts])
            setView('pipeline')
          }}
        />
      )}

      {view === 'email' && (
        <EmailGenerator contacts={contacts.filter(c => selectedIds.has(c.id) || c.status === 'pendente')} />
      )}
    </div>
  )
}

// ── Pipeline View ──────────────────────────────────────────────────────────

function PipelineView({ contacts, filterStatus, setFilterStatus, selectedIds, setSelectedIds, onUpdateStatus, onUpdateNotes, onRemove }: {
  contacts: BookingContact[]
  filterStatus: BookingStatus | 'todos'
  setFilterStatus: (s: BookingStatus | 'todos') => void
  selectedIds: Set<string>
  setSelectedIds: (s: Set<string>) => void
  onUpdateStatus: (id: string, s: BookingStatus) => void
  onUpdateNotes: (id: string, n: string) => void
  onRemove: (id: string) => void
}) {
  function toggleSelect(id: string) {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedIds(next)
  }

  return (
    <div>
      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <FilterChip label="Todos" active={filterStatus === 'todos'} onClick={() => setFilterStatus('todos')} />
        {(Object.keys(STATUS_CONFIG) as BookingStatus[]).map(s => (
          <FilterChip key={s} label={STATUS_CONFIG[s].label} active={filterStatus === s}
            color={STATUS_CONFIG[s].color} onClick={() => setFilterStatus(s)} />
        ))}
      </div>

      {contacts.length === 0 ? (
        <div style={st.empty}>
          Nenhum contacto no pipeline. Clica em "+ Adicionar" para importar venues do Radar.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contacts.map(c => (
            <ContactRow key={c.id} contact={c} selected={selectedIds.has(c.id)}
              onToggle={() => toggleSelect(c.id)}
              onStatusChange={(s) => onUpdateStatus(c.id, s)}
              onNotesChange={(n) => onUpdateNotes(c.id, n)}
              onRemove={() => onRemove(c.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function ContactRow({ contact, selected, onToggle, onStatusChange, onNotesChange, onRemove }: {
  contact: BookingContact
  selected: boolean
  onToggle: () => void
  onStatusChange: (s: BookingStatus) => void
  onNotesChange: (n: string) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[contact.status]

  return (
    <div style={{ ...st.contactCard, borderLeftColor: cfg.color }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="checkbox" checked={selected} onChange={onToggle}
          style={{ accentColor: '#1A6994', width: 16, height: 16 }} />
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong style={{ fontSize: 14, color: '#fff' }}>{contact.venueName}</strong>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, color: cfg.color, background: cfg.bg }}>{cfg.label}</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            {contact.city} ({contact.country}) · {contact.contactPerson || contact.contactEmail || '—'}
          </div>
        </div>
        <select value={contact.status} onChange={e => onStatusChange(e.target.value as BookingStatus)}
          style={{ background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', fontSize: 11 }}>
          {(Object.keys(STATUS_CONFIG) as BookingStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      {expanded && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <textarea
            value={contact.notes}
            onChange={e => onNotesChange(e.target.value)}
            placeholder="Notas sobre este contacto..."
            style={{ ...st.notesInput, width: '100%' }}
            rows={2}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
            {contact.contactEmail && (
              <a href={`mailto:${contact.contactEmail}`} style={{ fontSize: 11, color: '#60b4e8', textDecoration: 'none' }}>📧 Enviar email</a>
            )}
            <button onClick={onRemove} style={{ fontSize: 11, color: '#f97066', background: 'none', border: 'none', cursor: 'pointer' }}>🗑 Remover</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add from Radar ─────────────────────────────────────────────────────────

function AddFromRadar({ existingIds, onAdd }: {
  existingIds: Set<string>
  onAdd: (contacts: BookingContact[]) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const available = realOpportunities.filter(o =>
    (o.type === 'festival' || o.type === 'venue' || o.type === 'residency' || o.type === 'showcase') &&
    !existingIds.has(o.id)
  )

  function toggle(id: string) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  function addSelected() {
    const now = new Date().toISOString()
    const newContacts: BookingContact[] = available
      .filter(o => selected.has(o.id))
      .map(o => ({
        id: o.id,
        venueName: o.title,
        contactEmail: o.contactEmail || '',
        contactPerson: o.contactName || '',
        city: o.city || '',
        country: o.country,
        status: 'pendente' as BookingStatus,
        notes: '',
        lastUpdated: now,
      }))
    onAdd(newContacts)
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
        Seleciona festivais e venues do Radar para adicionar ao teu pipeline de booking ({available.length} disponíveis)
      </p>

      {available.length === 0 ? (
        <div style={st.empty}>Todos os venues/festivais já estão no teu pipeline.</div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
            {available.map(o => (
              <label key={o.id} style={{ ...st.addRow, background: selected.has(o.id) ? 'rgba(26,105,148,0.1)' : '#0a0a0a' }}>
                <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)}
                  style={{ accentColor: '#1A6994', width: 16, height: 16 }} />
                <div>
                  <div style={{ fontSize: 13, color: '#fff' }}>{o.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {o.city || ''} ({o.country}) · {o.type}
                  </div>
                </div>
              </label>
            ))}
          </div>
          {selected.size > 0 && (
            <button style={st.addBtn} onClick={addSelected}>
              Adicionar {selected.size} ao pipeline →
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ── Email Generator ────────────────────────────────────────────────────────

function EmailGenerator({ contacts }: { contacts: BookingContact[] }) {
  const [artistName, setArtistName] = useState('')
  const [generated, setGenerated] = useState('')

  useEffect(() => {
    try {
      const profile = localStorage.getItem(PROFILE_KEY)
      if (profile) {
        const p = JSON.parse(profile)
        if (p.summary) setArtistName(p.summary.split('.')[0] || 'o/a artista')
      }
    } catch { /* */ }
  }, [])

  function generate() {
    const template = contacts.map(c => {
      return `──────────────────────────
Para: ${c.contactEmail || '[email]'}
A/C: ${c.contactPerson || '[nome]'}
Venue: ${c.venueName} — ${c.city} (${c.country})

Assunto: Proposta artística — ${artistName || '[nome artista]'}

Olá ${c.contactPerson || '[nome]'},

Escrevo em nome de ${artistName || '[nome artista]'}, artista representado/a pela SOMA Cultura (Barcelona).

Gostaríamos de propor uma atuação/colaboração com ${c.venueName}. Em anexo segue o press kit com informações sobre o trabalho artístico, vídeos e ficha técnica.

Ficamos disponíveis para conversar sobre datas e condições.

Com os melhores cumprimentos,
[O teu nome]
SOMA Cultura — Barcelona
`
    }).join('\n')

    setGenerated(template)
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Nome do artista</label>
        <input style={st.input} value={artistName} onChange={e => setArtistName(e.target.value)}
          placeholder="Ex: Mimosa" />
      </div>

      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
        {contacts.length > 0
          ? `Vai gerar emails para ${contacts.length} contacto(s) — pendentes ou selecionados no pipeline.`
          : 'Nenhum contacto pendente ou selecionado. Vai ao pipeline e seleciona contactos.'}
      </p>

      <button style={st.generateBtn} onClick={generate} disabled={contacts.length === 0}>
        📧 Gerar emails ({contacts.length})
      </button>

      {generated && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>Emails gerados</h3>
            <button onClick={() => navigator.clipboard.writeText(generated)}
              style={{ fontSize: 11, color: '#60b4e8', background: 'none', border: '1px solid rgba(96,180,232,0.3)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
              📋 Copiar tudo
            </button>
          </div>
          <pre style={st.emailOutput}>{generated}</pre>
        </div>
      )}
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ flex: 1, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{label}</div>
    </div>
  )
}

function FilterChip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick} style={{
      background: active ? (color ? `${color}20` : 'rgba(26,105,148,0.2)') : 'rgba(255,255,255,0.04)',
      color: active ? (color || '#60b4e8') : 'rgba(255,255,255,0.5)',
      border: `1px solid ${active ? (color ? `${color}40` : 'rgba(26,105,148,0.4)') : 'rgba(255,255,255,0.1)'}`,
      borderRadius: 20, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: active ? 700 : 400,
    }}>
      {label}
    </button>
  )
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '28px 20px', color: '#fff' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  title: { margin: 0, fontSize: 28, color: '#60b4e8' },
  sub: { margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  tabBtn: { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  tabActive: { background: 'rgba(26,105,148,0.15)', color: '#fff', borderColor: 'rgba(26,105,148,0.4)' },
  statsRow: { display: 'flex', gap: 10, marginBottom: 20 },
  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 14 },
  contactCard: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '3px solid #94a3b8', borderRadius: 10, padding: '12px 14px' },
  notesInput: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 10px', fontSize: 12, resize: 'vertical' as const, fontFamily: 'inherit', boxSizing: 'border-box' as const },
  addRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, cursor: 'pointer' },
  addBtn: { marginTop: 14, background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%' },
  input: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '10px 12px', fontSize: 14, width: '100%', boxSizing: 'border-box' as const, outline: 'none' },
  generateBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  emailOutput: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 16, fontSize: 12, color: 'rgba(255,255,255,0.7)', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 500, overflowY: 'auto', fontFamily: 'monospace' },
}
