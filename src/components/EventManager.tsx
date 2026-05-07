// src/components/EventManager.tsx
// SOMA ODÉ — Módulo Festas e Eventos

import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthProvider'
import {
  loadEvents, saveEvent, deleteEvent
} from '../data/eventsSupabaseStore'
import { loadArtistsFromSupabase } from '../data/artistsSupabaseStore'
import type { SomaEvent, EventTeamMember } from '../types/event'
import {
  emptyEvent, EVENT_TYPE_LABELS, EVENT_STATUS_LABELS,
  EVENT_STATUS_COLORS, TEAM_ROLES
} from '../types/event'
import type { Artist } from '../types/artist'

// ─── Helpers ──────────────────────────────────────────────

function calcProfit(budget: any): number {
  const revenue = (budget.ticketRevenueActual || 0) + (budget.barRevenueActual || 0)
  const costs = (budget.artistFees || 0) + (budget.productionCosts || 0) +
    (budget.marketingCosts || 0) + (budget.venueRent || 0) + (budget.otherCosts || 0)
  return revenue - costs
}

function calcTotalTeamFees(team: EventTeamMember[]): number {
  return team.reduce((acc, m) => acc + (m.fee || 0), 0)
}

function formatDate(d?: string): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('pt-BR') } catch { return d }
}

// ─── Componente principal ─────────────────────────────────

export default function EventManager() {
  const { user } = useAuth()
  const [events, setEvents] = useState<SomaEvent[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editing, setEditing] = useState<SomaEvent | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('todos')

  const orgId = user?.organizationId || '00000000-0000-0000-0000-000000000001'

  useEffect(() => {
    Promise.all([
      loadEvents(orgId),
      loadArtistsFromSupabase(),
    ]).then(([evs, arts]) => {
      setEvents(evs)
      setArtists(arts)
      setLoading(false)
    })
  }, [orgId])

  function newEvent() {
    const id = crypto.randomUUID()
    setEditing({ id, ...emptyEvent(orgId) })
    setView('form')
    setMessage('')
  }

  function editEvent(ev: SomaEvent) {
    setEditing({ ...ev })
    setView('form')
    setMessage('')
  }

  async function handleSave() {
    if (!editing || !editing.name.trim()) {
      setMessage('⚠ Nome do evento é obrigatório.')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      await saveEvent(editing)
      const updated = await loadEvents(orgId)
      setEvents(updated)
      setMessage('✅ Evento guardado!')
      setTimeout(() => setView('list'), 1200)
    } catch (err: any) {
      setMessage(`Erro: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Apagar este evento?')) return
    await deleteEvent(id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  function upd(field: string, value: any) {
    setEditing(prev => prev ? { ...prev, [field]: value } : null)
  }

  function updNested(parent: string, field: string, value: any) {
    setEditing(prev => {
      if (!prev) return null
      return { ...prev, [parent]: { ...(prev as any)[parent], [field]: value } }
    })
  }

  const filtered = filterStatus === 'todos'
    ? events
    : events.filter(e => e.status === filterStatus)

  // ── LISTA ─────────────────────────────────────────────

  if (view === 'list') {
    return (
      <div style={s.wrap}>
        <div style={s.pageHeader}>
          <div>
            <h1 style={s.pageTitle}>Eventos</h1>
            <p style={s.pageCount}>{events.length} eventos · {events.filter(e => e.status === 'realizado').length} realizados</p>
          </div>
          <button style={s.primaryBtn} onClick={newEvent}>+ Novo evento</button>
        </div>

        {/* Filtro de status */}
        <div style={s.filterRow}>
          {['todos', 'ideia', 'confirmado', 'em_producao', 'realizado', 'cancelado'].map(st => (
            <button key={st}
              style={{ ...s.filterBtn, ...(filterStatus === st ? s.filterBtnActive : {}) }}
              onClick={() => setFilterStatus(st)}>
              {st === 'todos' ? 'Todos' : EVENT_STATUS_LABELS[st as keyof typeof EVENT_STATUS_LABELS] || st}
            </button>
          ))}
        </div>

        {loading && <div style={s.empty}>A carregar...</div>}

        {!loading && filtered.length === 0 && (
          <div style={s.empty}>
            <p>Nenhum evento ainda.</p>
            <p style={{ opacity: 0.5, fontSize: 13 }}>Clica em "+ Novo evento" para começar.</p>
          </div>
        )}

        <div style={s.grid}>
          {filtered.map(ev => {
            const statusColor = EVENT_STATUS_COLORS[ev.status]
            const totalFees = calcTotalTeamFees(ev.team)
            const profit = calcProfit(ev.budget)
            const eventArtists = artists.filter(a => ev.artistIds.includes(a.id))

            return (
              <div key={ev.id} style={{ ...s.card, borderColor: `${statusColor}40` }}>
                {/* Topo */}
                <div style={s.cardTop}>
                  <div style={{ flex: 1 }}>
                    <span style={{ ...s.typeBadge, color: statusColor, borderColor: `${statusColor}30` }}>
                      {EVENT_TYPE_LABELS[ev.type]}
                    </span>
                    <h3 style={s.cardTitle}>{ev.name || 'Sem nome'}</h3>
                    <div style={s.cardMeta}>
                      {ev.eventDate && <span>📅 {formatDate(ev.eventDate)}</span>}
                      {ev.startTime && <span>🕐 {ev.startTime}{ev.endTime ? `–${ev.endTime}` : ''}</span>}
                      {ev.venueName && <span>📍 {ev.venueName}{ev.venueCity ? `, ${ev.venueCity}` : ''}</span>}
                    </div>
                  </div>
                  <span style={{ ...s.statusBadge, color: statusColor }}>
                    {EVENT_STATUS_LABELS[ev.status]}
                  </span>
                </div>

                {/* Artistas */}
                {eventArtists.length > 0 && (
                  <div style={s.artistChips}>
                    {eventArtists.slice(0, 4).map(a => (
                      <span key={a.id} style={s.chip}>{a.name}</span>
                    ))}
                    {eventArtists.length > 4 && <span style={s.chip}>+{eventArtists.length - 4}</span>}
                  </div>
                )}

                {/* Financeiro rápido */}
                {(totalFees > 0 || ev.budget.marketingCosts) && (
                  <div style={s.budgetRow}>
                    {totalFees > 0 && <span style={s.budgetItem}>🎤 Equipa: {totalFees}€</span>}
                    {ev.budget.marketingCosts ? <span style={s.budgetItem}>📣 Ads: {ev.budget.marketingCosts}€</span> : null}
                    {ev.status === 'realizado' && (
                      <span style={{ ...s.budgetItem, color: profit >= 0 ? '#6ef3a5' : '#ff8a8a', fontWeight: 700 }}>
                        {profit >= 0 ? '↑' : '↓'} Resultado: {profit}€
                      </span>
                    )}
                  </div>
                )}

                {/* Acções */}
                <div style={s.cardActions}>
                  <button style={s.editBtn} onClick={() => editEvent(ev)}>✏ Editar</button>
                  <button style={s.deleteBtn} onClick={() => handleDelete(ev.id)}>🗑</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── FORMULÁRIO ────────────────────────────────────────

  if (!editing) return null
  const b = editing.budget
  const aud = editing.audience
  const comm = editing.communication

  return (
    <div style={s.wrap}>
      {/* Header do form */}
      <div style={s.formHeader}>
        <button style={s.backBtn} onClick={() => setView('list')}>← Voltar</button>
        <h2 style={s.formTitle}>{editing.name || 'Novo evento'}</h2>
        <button style={{ ...s.primaryBtn, opacity: saving ? 0.6 : 1 }}
          onClick={handleSave} disabled={saving}>
          {saving ? 'A guardar...' : '💾 Guardar'}
        </button>
      </div>

      {message && <div style={{ ...s.message, color: message.startsWith('✅') ? '#6ef3a5' : '#ffcf5c' }}>{message}</div>}

      {/* ── 01 INFO BÁSICA ── */}
      <Section title="01 · Informação básica">
        <F label="Nome do evento *" v={editing.name} onChange={v => upd('name', v)} />
        <div style={s.grid2}>
          <div style={s.field}>
            <label style={s.fieldLabel}>Tipo</label>
            <select style={s.select} value={editing.type} onChange={e => upd('type', e.target.value)}>
              {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div style={s.field}>
            <label style={s.fieldLabel}>Status</label>
            <select style={s.select} value={editing.status} onChange={e => upd('status', e.target.value)}>
              {Object.entries(EVENT_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <F label="Data" v={editing.eventDate || ''} onChange={v => upd('eventDate', v)} type="date" />
          <F label="Hora início" v={editing.startTime || ''} onChange={v => upd('startTime', v)} placeholder="23:00" />
          <F label="Hora fim" v={editing.endTime || ''} onChange={v => upd('endTime', v)} placeholder="05:00" />
        </div>
        <FA label="Notas internas" v={editing.notes || ''} onChange={v => upd('notes', v)} />
      </Section>

      {/* ── 02 VENUE ── */}
      <Section title="02 · Venue">
        <div style={s.grid2}>
          <F label="Nome do venue" v={editing.venueName || ''} onChange={v => upd('venueName', v)} />
          <F label="Instagram do venue" v={editing.venueInstagram || ''} onChange={v => upd('venueInstagram', v)} placeholder="@luaclub.barcelona" />
          <F label="Cidade" v={editing.venueCity || ''} onChange={v => upd('venueCity', v)} />
          <F label="País" v={editing.venueCountry || ''} onChange={v => upd('venueCountry', v)} />
          <F label="Endereço" v={editing.venueAddress || ''} onChange={v => upd('venueAddress', v)} />
          <F label="Capacidade" v={String(editing.venueCapacity || '')} onChange={v => upd('venueCapacity', v ? Number(v) : undefined)} type="number" />
          <F label="Contacto venue" v={editing.venueContact || ''} onChange={v => upd('venueContact', v)} />
        </div>
      </Section>

      {/* ── 03 ARTISTAS DO ROSTER ── */}
      <Section title="03 · Artistas do roster">
        <p style={s.hint}>Selecciona artistas do teu roster que participam neste evento.</p>
        <div style={s.chipGrid}>
          {artists.map(a => {
            const selected = editing.artistIds.includes(a.id)
            return (
              <button key={a.id} type="button"
                style={{ ...s.chip, ...(selected ? s.chipActive : {}) }}
                onClick={() => {
                  const ids = selected
                    ? editing.artistIds.filter(id => id !== a.id)
                    : [...editing.artistIds, a.id]
                  upd('artistIds', ids)
                }}>
                {a.name}
              </button>
            )
          })}
          {artists.length === 0 && <span style={s.hint}>Sem artistas no roster ainda.</span>}
        </div>
      </Section>

      {/* ── 04 EQUIPA ── */}
      <Section title="04 · Equipa e cachês">
        <div style={{ marginBottom: 12 }}>
          {editing.team.map((member, i) => (
            <div key={member.id} style={s.teamRow}>
              <input style={{ ...s.input, flex: 2 }} placeholder="Nome" value={member.name}
                onChange={e => {
                  const team = [...editing.team]
                  team[i] = { ...team[i], name: e.target.value }
                  upd('team', team)
                }} />
              <select style={{ ...s.select, flex: 1 }} value={member.role}
                onChange={e => {
                  const team = [...editing.team]
                  team[i] = { ...team[i], role: e.target.value }
                  upd('team', team)
                }}>
                {TEAM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input style={{ ...s.input, width: 80 }} placeholder="Cachê €" type="number"
                value={member.fee || ''}
                onChange={e => {
                  const team = [...editing.team]
                  team[i] = { ...team[i], fee: e.target.value ? Number(e.target.value) : undefined }
                  upd('team', team)
                }} />
              <button style={s.removeBtn}
                onClick={() => upd('team', editing.team.filter((_, j) => j !== i))}>✕</button>
            </div>
          ))}
        </div>
        <button style={s.addBtn}
          onClick={() => upd('team', [...editing.team, {
            id: crypto.randomUUID(), name: '', role: 'DJ', fee: undefined
          }])}>
          + Adicionar pessoa
        </button>
        {editing.team.length > 0 && (
          <p style={{ ...s.hint, marginTop: 8 }}>
            Total em cachês: <strong style={{ color: '#ffcf5c' }}>{calcTotalTeamFees(editing.team)}€</strong>
          </p>
        )}
      </Section>

      {/* ── 05 PÚBLICO ── */}
      <Section title="05 · Público e entradas">
        <div style={s.grid2}>
          <F label="Público esperado" v={String(aud.expected || '')}
            onChange={v => updNested('audience', 'expected', v ? Number(v) : undefined)} type="number" />
          <F label="Público real (pós-evento)" v={String(aud.actual || '')}
            onChange={v => updNested('audience', 'actual', v ? Number(v) : undefined)} type="number" />
          <F label="Preço de entrada (€)" v={String(aud.entryPrice || '')}
            onChange={v => updNested('audience', 'entryPrice', v ? Number(v) : undefined)} type="number" />
          <F label="Entrada gratuita até" v={aud.freeEntryUntil || ''}
            onChange={v => updNested('audience', 'freeEntryUntil', v)} placeholder="00:00" />
          <F label="Código de desconto" v={aud.discountCode || ''}
            onChange={v => updNested('audience', 'discountCode', v)} placeholder="FERNA7" />
          <F label="Preço com desconto (€)" v={String(aud.discountPrice || '')}
            onChange={v => updNested('audience', 'discountPrice', v ? Number(v) : undefined)} type="number" />
        </div>
        <F label="Info lista" v={aud.listInfo || ''}
          onChange={v => updNested('audience', 'listInfo', v)} placeholder="Lista via DM até 00h" />
        <F label="Link ticket" v={comm.ticketLink || ''}
          onChange={v => updNested('communication', 'ticketLink', v)} placeholder="https://membrz.club/..." />
      </Section>

      {/* ── 06 FINANCEIRO ── */}
      <Section title="06 · Financeiro">
        <div style={s.grid2}>
          <F label="Receita tickets (real €)" v={String(b.ticketRevenueActual || '')}
            onChange={v => updNested('budget', 'ticketRevenueActual', v ? Number(v) : 0)} type="number" />
          <F label="Receita bar (real €)" v={String(b.barRevenueActual || '')}
            onChange={v => updNested('budget', 'barRevenueActual', v ? Number(v) : 0)} type="number" />
          <F label="Total cachês equipa (€)" v={String(b.artistFees !== undefined ? b.artistFees : calcTotalTeamFees(editing.team))}
            onChange={v => updNested('budget', 'artistFees', v ? Number(v) : 0)} type="number" />
          <F label="Produção / técnica (€)" v={String(b.productionCosts || '')}
            onChange={v => updNested('budget', 'productionCosts', v ? Number(v) : 0)} type="number" />
          <F label="Marketing / ads (€)" v={String(b.marketingCosts || '')}
            onChange={v => updNested('budget', 'marketingCosts', v ? Number(v) : 0)} type="number" />
          <F label="Aluguel / split venue (€)" v={String(b.venueRent || '')}
            onChange={v => updNested('budget', 'venueRent', v ? Number(v) : 0)} type="number" />
          <F label="Outros custos (€)" v={String(b.otherCosts || '')}
            onChange={v => updNested('budget', 'otherCosts', v ? Number(v) : 0)} type="number" />
        </div>
        {/* Resultado automático */}
        <div style={s.profitBox}>
          <div style={s.profitRow}>
            <span>Total receita</span>
            <strong>{(b.ticketRevenueActual || 0) + (b.barRevenueActual || 0)}€</strong>
          </div>
          <div style={s.profitRow}>
            <span>Total custos</span>
            <strong>{(b.artistFees || calcTotalTeamFees(editing.team)) + (b.productionCosts || 0) + (b.marketingCosts || 0) + (b.venueRent || 0) + (b.otherCosts || 0)}€</strong>
          </div>
          <div style={{ ...s.profitRow, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 4 }}>
            <span style={{ fontWeight: 700 }}>Resultado</span>
            <strong style={{ color: calcProfit(b) >= 0 ? '#6ef3a5' : '#ff8a8a', fontSize: 18 }}>
              {calcProfit(b) >= 0 ? '+' : ''}{calcProfit(b)}€
            </strong>
          </div>
          <F label="Notas financeiras" v={b.notes || ''}
            onChange={v => updNested('budget', 'notes', v)} />
        </div>
      </Section>

      {/* ── 07 COMUNICAÇÃO ── */}
      <Section title="07 · Comunicação e marketing">
        <FA label="Conceito / copy principal" v={comm.concept || ''}
          onChange={v => updNested('communication', 'concept', v)}
          placeholder="SE JOGA NA LUA 🌙 — o texto central do evento" />
        <F label="Canais (vírgula separa)" v={(comm.channels || []).join(', ')}
          onChange={v => updNested('communication', 'channels', v.split(',').map(x => x.trim()).filter(Boolean))}
          placeholder="instagram, whatsapp, tiktok" />
        <div style={s.grid2}>
          <F label="Budget ads (€)" v={String(comm.adsBudget || '')}
            onChange={v => updNested('communication', 'adsBudget', v ? Number(v) : 0)} type="number" />
          <F label="Link post principal" v={comm.instagramPost || ''}
            onChange={v => updNested('communication', 'instagramPost', v)}
            placeholder="https://instagram.com/p/..." />
        </div>
        <FA label="Resultado da campanha (pós-evento)" v={comm.adsResult || ''}
          onChange={v => updNested('communication', 'adsResult', v)} />
      </Section>

      {/* ── 08 RECAP PÓS-EVENTO ── */}
      {(editing.status === 'realizado' || editing.postEventNotes) && (
        <Section title="08 · Recap pós-evento">
          <FA label="O que correu bem, o que mudar, notas para próxima edição"
            v={editing.postEventNotes || ''} onChange={v => upd('postEventNotes', v)} />
        </Section>
      )}

      {/* Footer */}
      <div style={s.formFooter}>
        <button style={s.backBtn} onClick={() => setView('list')}>← Cancelar</button>
        <button style={{ ...s.primaryBtn, opacity: saving ? 0.6 : 1 }}
          onClick={handleSave} disabled={saving}>
          {saving ? 'A guardar...' : '💾 Guardar evento'}
        </button>
      </div>
    </div>
  )
}

// ─── Componentes auxiliares ───────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle}>{title}</h3>
      {children}
    </div>
  )
}

function F({ label, v, onChange, type, placeholder }: {
  label: string; v: string; onChange: (v: string) => void
  type?: string; placeholder?: string
}) {
  return (
    <label style={s.field}>
      <span style={s.fieldLabel}>{label}</span>
      <input style={s.input} value={v} type={type || 'text'}
        placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function FA({ label, v, onChange, placeholder }: {
  label: string; v: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <label style={s.field}>
      <span style={s.fieldLabel}>{label}</span>
      <textarea style={s.textarea} value={v} placeholder={placeholder}
        rows={3} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

// ─── Styles ───────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1100, margin: '0 auto', padding: '32px 22px', color: '#fff' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 32, fontWeight: 700, color: '#fff', margin: 0 },
  pageCount: { fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' },
  filterRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 },
  filterBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: 20, padding: '6px 14px', fontSize: 12, cursor: 'pointer' },
  filterBtnActive: { background: '#1A6994', color: '#fff', border: '1px solid #1A6994' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 },
  card: { background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 18 },
  cardTop: { display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  typeBadge: { fontSize: 11, border: '1px solid', borderRadius: 6, padding: '2px 8px', marginBottom: 6, display: 'inline-block' },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#fff', margin: '4px 0' },
  cardMeta: { display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  statusBadge: { fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 },
  artistChips: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  chip: { fontSize: 11, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', borderRadius: 20, padding: '3px 10px', cursor: 'pointer' },
  chipActive: { background: 'rgba(26,105,148,0.3)', color: '#fff', border: '1px solid #1A6994' },
  chipGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  budgetRow: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, fontSize: 12 },
  budgetItem: { color: 'rgba(255,255,255,0.55)' },
  cardActions: { display: 'flex', gap: 8, marginTop: 12 },
  editBtn: { flex: 1, background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  deleteBtn: { background: 'rgba(255,70,70,0.1)', color: '#ff8a8a', border: '1px solid rgba(255,70,70,0.2)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' },
  primaryBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  backBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer' },
  formHeader: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 },
  formTitle: { flex: 1, fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 },
  formFooter: { display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' },
  message: { marginBottom: 14, fontSize: 13, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  section: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 22, marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#60b4e8', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 0, marginBottom: 18, textAlign: 'center' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 },
  fieldLabel: { fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  input: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' },
  textarea: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: 12, fontSize: 13, minHeight: 80, outline: 'none', resize: 'vertical', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  select: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', cursor: 'pointer' },
  hint: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10 },
  teamRow: { display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' },
  addBtn: { background: 'rgba(26,105,148,0.15)', color: '#60b4e8', border: '1px dashed rgba(26,105,148,0.4)', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' },
  removeBtn: { background: 'transparent', color: 'rgba(255,255,255,0.3)', border: 'none', fontSize: 16, cursor: 'pointer', flexShrink: 0 },
  profitBox: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 16, marginTop: 8 },
  profitRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  empty: { textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)' },
}