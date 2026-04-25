// src/components/ContractManager.tsx
// SOMA ODÉ — Gestão de Contratos
// Contratos por artista: booking, residência, comissão, etc.
// Persistência em localStorage key: 'soma-contracts-v1'

import { useState } from 'react'
import DeadlineBadge from './DeadlineBadge'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type ContractType =
  | 'booking'
  | 'residencia'
  | 'comissao'
  | 'coproducao'
  | 'management'
  | 'distribuicao'
  | 'outro'

export type ContractStatus =
  | 'em_negociacao'
  | 'pendente_assinatura'
  | 'activo'
  | 'concluido'
  | 'cancelado'

export type Contract = {
  id: string
  artistName: string        // nome do artista (referência)
  artistId?: string         // id do artista no roster (opcional)
  title: string             // ex: "Booking Jamboree Barcelona Oct 2026"
  type: ContractType
  status: ContractStatus
  counterpart: string       // quem é a outra parte (festival, venue, etc.)
  counterpartContact?: string
  fee: number               // cachê em €
  feePercentageSoma: number // % da SOMA (normalmente 20)
  currency: 'EUR' | 'BRL' | 'USD' | 'GBP'
  startDate: string         // ISO date
  endDate?: string
  signedDate?: string
  deliverables?: string     // o que o artista entrega
  conditions?: string       // custos cobertos, alojamento, etc.
  driveLink?: string        // link para PDF no Drive
  notes?: string
  createdAt: string
  updatedAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<ContractStatus, string> = {
  em_negociacao: 'Em negociação',
  pendente_assinatura: 'Pendente assinatura',
  activo: 'Activo',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const STATUS_COLORS: Record<ContractStatus, { bg: string; color: string }> = {
  em_negociacao: { bg: 'rgba(239,159,39,0.15)', color: '#EF9F27' },
  pendente_assinatura: { bg: 'rgba(96,180,232,0.15)', color: '#60b4e8' },
  activo: { bg: 'rgba(29,158,117,0.15)', color: '#5dcaa5' },
  concluido: { bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' },
  cancelado: { bg: 'rgba(220,60,60,0.12)', color: 'rgba(220,80,80,0.7)' },
}

const TYPE_LABELS: Record<ContractType, string> = {
  booking: '🎤 Booking',
  residencia: '🏠 Residência',
  comissao: '✍️ Comissão',
  coproducao: '🤝 Co-produção',
  management: '📋 Management',
  distribuicao: '🎵 Distribuição',
  outro: '📄 Outro',
}

function empty(): Omit<Contract, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    artistName: '',
    artistId: '',
    title: '',
    type: 'booking',
    status: 'em_negociacao',
    counterpart: '',
    counterpartContact: '',
    fee: 0,
    feePercentageSoma: 20,
    currency: 'EUR',
    startDate: '',
    endDate: '',
    signedDate: '',
    deliverables: '',
    conditions: '',
    driveLink: '',
    notes: '',
  }
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = {
  wrap: { maxWidth: 860, margin: '0 auto', padding: '24px 20px', color: '#fff', background: '#000', minHeight: '100vh' } as React.CSSProperties,
  title: { color: '#1A6994', fontSize: 26, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 4 } as React.CSSProperties,
  sub: { color: 'rgba(255,255,255,0.35)', fontSize: 12, letterSpacing: '0.1em', marginBottom: 28 } as React.CSSProperties,
  section: { marginBottom: 22 } as React.CSSProperties,
  sectionTitle: {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const,
    color: '#1A6994', marginBottom: 10, paddingBottom: 6,
    borderBottom: '0.5px solid rgba(26,105,148,0.3)',
  } as React.CSSProperties,
  row: { display: 'flex', gap: 10, marginBottom: 10 } as React.CSSProperties,
  input: {
    width: '100%', padding: '10px 12px', marginBottom: 10,
    background: '#0a0a0a', color: '#fff',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: 6, fontSize: 13, outline: 'none',
  } as React.CSSProperties,
  half: { width: '48%', padding: '10px 12px', background: '#0a0a0a', color: '#fff', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 6, fontSize: 13, outline: 'none' } as React.CSSProperties,
  select: {
    width: '100%', padding: '10px 12px', marginBottom: 10,
    background: '#0a0a0a', color: '#fff',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: 6, fontSize: 13, outline: 'none', cursor: 'pointer',
  } as React.CSSProperties,
  textarea: {
    width: '100%', padding: '10px 12px', marginBottom: 10,
    background: '#0a0a0a', color: '#fff',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: 6, fontSize: 13, outline: 'none',
    resize: 'vertical' as const, minHeight: 70, fontFamily: 'inherit',
  } as React.CSSProperties,
  btn: { padding: '10px 20px', background: '#1A6994', border: 'none', color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' } as React.CSSProperties,
  btnSec: { padding: '8px 14px', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)', borderRadius: 6, fontSize: 12, cursor: 'pointer' } as React.CSSProperties,
  btnDanger: { padding: '6px 12px', background: 'transparent', border: '0.5px solid rgba(220,60,60,0.4)', color: 'rgba(220,80,80,0.8)', borderRadius: 6, fontSize: 11, cursor: 'pointer' } as React.CSSProperties,
  card: { border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px 18px', marginBottom: 12, background: '#050505' } as React.CSSProperties,
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ContractManager() {
  const [contracts, setContracts] = useState<Contract[]>(() => {
    try {
      const raw = localStorage.getItem('soma-contracts-v1')
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  const [view, setView] = useState<'list' | 'form'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(empty())
  const [filterStatus, setFilterStatus] = useState<ContractStatus | 'todos'>('todos')

  // ── Guardar ────────────────────────────────────────────────────────────────

  function save() {
    const now = new Date().toISOString()
    let updated: Contract[]

    if (editingId) {
      updated = contracts.map(c =>
        c.id === editingId ? { ...form, id: editingId, createdAt: c.createdAt, updatedAt: now } : c
      )
    } else {
      updated = [...contracts, { ...form, id: crypto.randomUUID(), createdAt: now, updatedAt: now }]
    }

    setContracts(updated)
    localStorage.setItem('soma-contracts-v1', JSON.stringify(updated))
    resetForm()
    setView('list')
  }

  function deleteContract(id: string) {
    if (!confirm('Apagar este contrato?')) return
    const updated = contracts.filter(c => c.id !== id)
    setContracts(updated)
    localStorage.setItem('soma-contracts-v1', JSON.stringify(updated))
  }

  function editContract(c: Contract) {
    setForm({ ...c })
    setEditingId(c.id)
    setView('form')
    window.scrollTo(0, 0)
  }

  function resetForm() {
    setForm(empty())
    setEditingId(null)
  }

  const set = (f: string, v: unknown) => setForm(prev => ({ ...prev, [f]: v }))

  // ── Métricas ───────────────────────────────────────────────────────────────

  const totalFee = contracts
    .filter(c => c.status === 'activo' || c.status === 'concluido')
    .reduce((s, c) => s + c.fee, 0)

  const totalSoma = contracts
    .filter(c => c.status === 'activo' || c.status === 'concluido')
    .reduce((s, c) => s + (c.fee * c.feePercentageSoma / 100), 0)

  const active = contracts.filter(c => c.status === 'activo').length
  const pending = contracts.filter(c => c.status === 'em_negociacao' || c.status === 'pendente_assinatura').length

  const filtered = filterStatus === 'todos' ? contracts : contracts.filter(c => c.status === filterStatus)

  // ── LISTA ──────────────────────────────────────────────────────────────────

  if (view === 'list') {
    return (
      <div style={s.wrap}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div style={s.title}>CONTRATOS</div>
            <div style={s.sub}>SOMA ODÉ · CRM INTERNO · {contracts.length} contrato{contracts.length !== 1 ? 's' : ''}</div>
          </div>
          <button style={s.btn} onClick={() => { resetForm(); setView('form') }}>+ Novo contrato</button>
        </div>

        {/* Métricas */}
        {contracts.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'Activos', value: active, color: '#5dcaa5' },
              { label: 'Em negociação', value: pending, color: '#EF9F27' },
              { label: 'Total captado (€)', value: `${totalFee.toLocaleString('pt-PT')} €`, color: '#60b4e8' },
              { label: `Fee SOMA (€)`, value: `${Math.round(totalSoma).toLocaleString('pt-PT')} €`, color: '#1A6994' },
            ].map(m => (
              <div key={m.label} style={{ background: '#050505', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{m.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filtro de status */}
        {contracts.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' as const }}>
            {(['todos', 'em_negociacao', 'pendente_assinatura', 'activo', 'concluido', 'cancelado'] as const).map(st => (
              <button key={st} onClick={() => setFilterStatus(st)}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                  fontWeight: filterStatus === st ? 700 : 400,
                  background: filterStatus === st ? 'rgba(26,105,148,0.25)' : 'transparent',
                  border: `0.5px solid ${filterStatus === st ? '#1A6994' : 'rgba(255,255,255,0.12)'}`,
                  color: filterStatus === st ? '#60b4e8' : 'rgba(255,255,255,0.45)',
                }}
              >
                {st === 'todos' ? 'Todos' : STATUS_LABELS[st]}
                {st !== 'todos' && (
                  <span style={{ marginLeft: 5, opacity: 0.6 }}>
                    ({contracts.filter(c => c.status === st).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Lista vazia */}
        {contracts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>
            Nenhum contrato ainda.<br />Clica em "+ Novo contrato" para começar.
          </div>
        )}

        {/* Cards */}
        {filtered.map(c => {
          const stStyle = STATUS_COLORS[c.status]
          const somaFee = Math.round(c.fee * c.feePercentageSoma / 100)

          return (
            <div key={c.id} style={{ ...s.card, borderColor: c.status === 'activo' ? 'rgba(29,158,117,0.25)' : 'rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' as const }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{c.title}</span>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: stStyle.bg, color: stStyle.color }}>
                      {STATUS_LABELS[c.status]}
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{TYPE_LABELS[c.type]}</span>
                    {c.endDate && (c.status === 'activo' || c.status === 'pendente_assinatura') && (
                      <DeadlineBadge deadline={c.endDate} />
                    )}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                    🎭 {c.artistName} · 🏛 {c.counterpart}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#5dcaa5' }}>
                    {c.fee.toLocaleString('pt-PT')} {c.currency}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                    SOMA: {somaFee.toLocaleString('pt-PT')} {c.currency} ({c.feePercentageSoma}%)
                  </div>
                </div>
              </div>

              {/* Datas */}
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8, flexWrap: 'wrap' as const }}>
                {c.startDate && <span>📅 Início: {new Date(c.startDate).toLocaleDateString('pt-PT')}</span>}
                {c.endDate && <span>📅 Fim: {new Date(c.endDate).toLocaleDateString('pt-PT')}</span>}
                {c.signedDate && <span>✍️ Assinado: {new Date(c.signedDate).toLocaleDateString('pt-PT')}</span>}
              </div>

              {/* Condições */}
              {c.conditions && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
                  📋 {c.conditions}
                </div>
              )}

              {/* Notas */}
              {c.notes && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginBottom: 6 }}>
                  {c.notes}
                </div>
              )}

              {/* Acções */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <div>
                  {c.driveLink && (
                    <a href={c.driveLink} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 12, color: '#1A6994', textDecoration: 'none' }}>
                      📁 Ver contrato no Drive
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {/* Mudar status rápido */}
                  {c.status === 'em_negociacao' && (
                    <button style={{ ...s.btnSec, fontSize: 11 }}
                      onClick={() => {
                        const updated = contracts.map(x => x.id === c.id ? { ...x, status: 'pendente_assinatura' as ContractStatus, updatedAt: new Date().toISOString() } : x)
                        setContracts(updated)
                        localStorage.setItem('soma-contracts-v1', JSON.stringify(updated))
                      }}>
                      → Pendente assinatura
                    </button>
                  )}
                  {c.status === 'pendente_assinatura' && (
                    <button style={{ ...s.btnSec, fontSize: 11, borderColor: 'rgba(29,158,117,0.4)', color: '#5dcaa5' }}
                      onClick={() => {
                        const updated = contracts.map(x => x.id === c.id ? { ...x, status: 'activo' as ContractStatus, signedDate: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString() } : x)
                        setContracts(updated)
                        localStorage.setItem('soma-contracts-v1', JSON.stringify(updated))
                      }}>
                      ✓ Marcar como activo
                    </button>
                  )}
                  {c.status === 'activo' && (
                    <button style={{ ...s.btnSec, fontSize: 11 }}
                      onClick={() => {
                        const updated = contracts.map(x => x.id === c.id ? { ...x, status: 'concluido' as ContractStatus, updatedAt: new Date().toISOString() } : x)
                        setContracts(updated)
                        localStorage.setItem('soma-contracts-v1', JSON.stringify(updated))
                      }}>
                      ✓ Marcar concluído
                    </button>
                  )}
                  <button style={s.btnSec} onClick={() => editContract(c)}>editar</button>
                  <button style={s.btnDanger} onClick={() => deleteContract(c.id)}>apagar</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── FORMULÁRIO ─────────────────────────────────────────────────────────────

  return (
    <div style={s.wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={s.title}>{editingId ? 'EDITAR CONTRATO' : 'NOVO CONTRATO'}</div>
          <div style={s.sub}>SOMA ODÉ · CRM INTERNO</div>
        </div>
        <button style={s.btnSec} onClick={() => { resetForm(); setView('list') }}>← voltar</button>
      </div>

      {/* 01. Identificação */}
      <div style={s.section}>
        <div style={s.sectionTitle}>01 · Identificação</div>
        <input style={s.input} placeholder="Título do contrato *  (ex: Booking Jamboree Barcelona — Out 2026)"
          value={form.title} onChange={e => set('title', e.target.value)} />
        <div style={s.row}>
          <input style={{ ...s.half }} placeholder="Nome do artista *"
            value={form.artistName} onChange={e => set('artistName', e.target.value)} />
          <input style={{ ...s.half }} placeholder="Contraparte *  (festival, venue, label…)"
            value={form.counterpart} onChange={e => set('counterpart', e.target.value)} />
        </div>
        <input style={s.input} placeholder="Contacto da contraparte  (email / telefone)"
          value={form.counterpartContact ?? ''} onChange={e => set('counterpartContact', e.target.value)} />
        <div style={s.row}>
          <select style={{ ...s.half, marginBottom: 0 }} value={form.type}
            onChange={e => set('type', e.target.value as ContractType)}>
            {(Object.entries(TYPE_LABELS) as [ContractType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select style={{ ...s.half, marginBottom: 0 }} value={form.status}
            onChange={e => set('status', e.target.value as ContractStatus)}>
            {(Object.entries(STATUS_LABELS) as [ContractStatus, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 02. Valores */}
      <div style={s.section}>
        <div style={s.sectionTitle}>02 · Valores e fee SOMA</div>
        <div style={s.row}>
          <input style={{ ...s.half }} placeholder="Cachê total (€) *" type="number"
            value={form.fee || ''} onChange={e => set('fee', Number(e.target.value))} />
          <select style={{ ...s.half, marginBottom: 0 }} value={form.currency}
            onChange={e => set('currency', e.target.value)}>
            <option value="EUR">EUR €</option>
            <option value="BRL">BRL R$</option>
            <option value="USD">USD $</option>
            <option value="GBP">GBP £</option>
          </select>
        </div>
        <div style={s.row}>
          <input style={{ ...s.half }} placeholder="% fee SOMA (normalmente 20)"
            type="number" value={form.feePercentageSoma}
            onChange={e => set('feePercentageSoma', Number(e.target.value))} />
          <div style={{ ...s.half, display: 'flex', alignItems: 'center', color: '#5dcaa5', fontSize: 13, padding: '10px 12px', background: '#0a0a0a', borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.12)' }}>
            Fee SOMA: {Math.round(form.fee * form.feePercentageSoma / 100).toLocaleString('pt-PT')} {form.currency}
          </div>
        </div>
      </div>

      {/* 03. Datas */}
      <div style={s.section}>
        <div style={s.sectionTitle}>03 · Datas</div>
        <div style={s.row}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Data de início / actuação</div>
            <input style={{ ...s.input, marginBottom: 0 }} type="date"
              value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Data de fim (se aplicável)</div>
            <input style={{ ...s.input, marginBottom: 0 }} type="date"
              value={form.endDate ?? ''} onChange={e => set('endDate', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Data de assinatura</div>
            <input style={{ ...s.input, marginBottom: 0 }} type="date"
              value={form.signedDate ?? ''} onChange={e => set('signedDate', e.target.value)} />
          </div>
        </div>
      </div>

      {/* 04. Condições */}
      <div style={s.section}>
        <div style={s.sectionTitle}>04 · Condições e entregáveis</div>
        <textarea style={s.textarea}
          placeholder="Condições logísticas  (ex: cobre viagens, alojamento para 7 pessoas, cena + 80€ buyout)"
          value={form.conditions ?? ''} onChange={e => set('conditions', e.target.value)} />
        <textarea style={s.textarea}
          placeholder="O que o artista entrega  (ex: 2 shows de 60min, rider técnico, soundcheck às 18h)"
          value={form.deliverables ?? ''} onChange={e => set('deliverables', e.target.value)} />
      </div>

      {/* 05. Documentos e notas */}
      <div style={s.section}>
        <div style={s.sectionTitle}>05 · Documentos e notas internas</div>
        <input style={s.input} placeholder="Link para o contrato no Google Drive (PDF)"
          value={form.driveLink ?? ''} onChange={e => set('driveLink', e.target.value)} />
        <textarea style={s.textarea}
          placeholder="Notas internas SOMA  (só visível para a equipa)"
          value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
      </div>

      {/* Guardar */}
      <div style={{ paddingTop: 16, borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', gap: 12 }}>
        <button style={{ ...s.btn, flex: 1 }} onClick={save}>
          {editingId ? '✓ Guardar alterações' : '+ Criar contrato'}
        </button>
        <button style={s.btnSec} onClick={() => { resetForm(); setView('list') }}>cancelar</button>
      </div>
    </div>
  )
}