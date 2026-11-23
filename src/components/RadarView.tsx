// src/components/RadarView.tsx
// SOMA ODÉ v5 — Radar de Editais + Festivais
// Inspirado no radareditais.clubemma.com.br — filtros visuais, destaques, deadline

import { useState, useMemo, useCallback } from 'react'
import { realOpportunities } from '../data/realOpportunities'
import { getManualOpportunities, deleteManualOpportunity } from '../data/manualOpportunitiesStore'
import type { Opportunity } from '../types/opportunity'
import OpportunityForm from './OpportunityForm'
import CsvImporter from './CsvImporter'
import { colors, shadows, radius } from '../theme'

// ── Constantes ──────────────────────────────────────────────────────────────

const REGIONS: Record<string, string[]> = {
  'Todas': [],
  'Espanha': ['ES'],
  'Portugal': ['PT'],
  'França': ['FR'],
  'Alemanha': ['DE'],
  'Europa Norte': ['SE', 'DK', 'NO', 'FI', 'IS', 'NL'],
  'Europa Central': ['AT', 'CH', 'CZ', 'PL', 'BE'],
  'Reino Unido': ['GB', 'IE'],
  'Itália': ['IT'],
  'Brasil': ['BR'],
  'África': ['UG', 'SN', 'ZA', 'CV', 'AO', 'MZ'],
  'Internacional': [],
}

const TYPES = ['Todos', 'festival', 'venue', 'residency', 'open_call', 'showcase', 'grant', 'funding', 'commission']
const TYPE_LABELS: Record<string, string> = {
  'Todos': 'Todos', festival: 'Festival', venue: 'Venue', residency: 'Residência',
  open_call: 'Open Call', showcase: 'Showcase', grant: 'Edital/Grant', funding: 'Funding', commission: 'Commission',
}
const TYPE_COLORS: Record<string, string> = {
  festival: colors.primary, venue: '#94a3b8', residency: '#c084fc', open_call: colors.admin,
  showcase: '#fb923c', grant: '#6ef3a5', funding: '#f97066', commission: '#e879f9',
}

const DISCIPLINES = ['Todas', 'musica', 'danca', 'teatro', 'performance', 'artes visuais', 'audiovisual', 'literatura', 'circo', 'som', 'multidisciplinar']

// ── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(deadline: string | undefined): number | null {
  if (!deadline) return null
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
}

function deadlineLabel(days: number | null): { text: string; color: string } {
  if (days === null) return { text: 'Sem prazo', color: colors.textMuted }
  if (days < 0) return { text: 'Encerrado', color: colors.danger }
  if (days <= 7) return { text: `${days}d — URGENTE`, color: colors.danger }
  if (days <= 30) return { text: `${days} dias`, color: colors.admin }
  return { text: `${days} dias`, color: colors.success }
}

// ── Componente ──────────────────────────────────────────────────────────────

export default function RadarView({ isAdmin }: { isAdmin?: boolean } = {}) {
  const [region, setRegion] = useState('Todas')
  const [type, setType] = useState('Todos')
  const [discipline, setDiscipline] = useState('Todas')
  const [search, setSearch] = useState('')
  const [hideExpired, setHideExpired] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  // Usar oportunidades reais + manuais/CSV
  const allOpps = useMemo(() => {
    const manual = getManualOpportunities()
    return [...manual, ...realOpportunities]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  // Filtrar
  const filtered = useMemo(() => {
    return allOpps
      .filter(o => {
        // Região
        if (region !== 'Todas') {
          const countries = REGIONS[region]
          if (countries && countries.length > 0 && !countries.includes(o.country)) return false
        }
        // Tipo
        if (type !== 'Todos' && o.type !== type) return false
        // Disciplina
        if (discipline !== 'Todas' && !(o.disciplines || []).some(d =>
          d.toLowerCase().includes(discipline.toLowerCase())
        )) return false
        // Expirados
        if (hideExpired) {
          const days = daysUntil(o.deadline)
          if (days !== null && days < 0) return false
        }
        // Busca
        if (search.trim()) {
          const q = search.toLowerCase()
          const hay = `${o.title} ${o.organization || ''} ${o.city || ''} ${(o.keywords || []).join(' ')}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        // Ordenar por deadline (mais urgentes primeiro)
        const da = daysUntil(a.deadline)
        const db = daysUntil(b.deadline)
        if (da === null && db === null) return 0
        if (da === null) return 1
        if (db === null) return -1
        return da - db
      })
  }, [allOpps, region, type, discipline, search, hideExpired])

  // Destaques: os que fecham em breve + cobrem custos
  const highlights = useMemo(() => {
    return filtered
      .filter(o => {
        const days = daysUntil(o.deadline)
        return days !== null && days > 0 && days <= 60 && o.coversCosts
      })
      .slice(0, 4)
  }, [filtered])

  function handleDeleteOpp(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Apagar esta oportunidade?')) return
    deleteManualOpportunity(id)
    refresh()
  }

  return (
    <div style={st.page}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={st.header}>
        <div>
          <h1 style={st.title}>📡 Radar</h1>
          <p style={st.sub}>Editais, festivais, residências e open calls</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setShowAddForm(true)} style={st.adminBtn}>+ Adicionar</button>
              <button onClick={() => setShowCsvImport(true)} style={st.adminBtnAlt}>📁 Importar CSV</button>
            </div>
          )}
          <div style={st.counter}>
            <span style={st.counterNum}>{filtered.length}</span>
            <span style={st.counterLabel}>oportunidades</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddForm && <OpportunityForm onClose={() => { setShowAddForm(false); refresh() }} />}
      {showCsvImport && <CsvImporter onClose={() => { setShowCsvImport(false); refresh() }} onImported={() => refresh()} />}

      {/* ── Busca ───────────────────────────────────────────────── */}
      <input
        style={st.searchInput}
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Buscar por nome, cidade, organização..."
      />

      {/* ── Filtros chips ───────────────────────────────────────── */}
      <div style={st.filterSection}>
        <div style={st.filterLabel}>Região</div>
        <div style={st.chips}>
          {Object.keys(REGIONS).map(r => (
            <Chip key={r} label={r} active={region === r} onClick={() => setRegion(r)} />
          ))}
        </div>
      </div>

      <div style={st.filterSection}>
        <div style={st.filterLabel}>Tipo</div>
        <div style={st.chips}>
          {TYPES.map(t => (
            <Chip key={t} label={TYPE_LABELS[t] || t} active={type === t} onClick={() => setType(t)}
              color={t !== 'Todos' ? TYPE_COLORS[t] : undefined} />
          ))}
        </div>
      </div>

      <div style={st.filterSection}>
        <div style={st.filterLabel}>Área</div>
        <div style={st.chips}>
          {DISCIPLINES.map(d => (
            <Chip key={d} label={d === 'Todas' ? 'Todas' : d.charAt(0).toUpperCase() + d.slice(1)} active={discipline === d} onClick={() => setDiscipline(d)} />
          ))}
        </div>
      </div>

      <label style={st.checkLabel}>
        <input type="checkbox" checked={hideExpired} onChange={e => setHideExpired(e.target.checked)} />
        Ocultar encerrados
      </label>

      {/* ── Destaques ───────────────────────────────────────────── */}
      {highlights.length > 0 && (
        <div style={st.section}>
          <h2 style={st.sectionTitle}>⭐ Destaques — cobrem custos, deadline próximo</h2>
          <div style={st.highlightGrid}>
            {highlights.map(o => (
              <OpportunityCard key={o.id} opp={o} expanded={expandedId === o.id}
                onToggle={() => setExpandedId(expandedId === o.id ? null : o.id)} highlight
                isAdmin={isAdmin} onDelete={handleDeleteOpp} />
            ))}
          </div>
        </div>
      )}

      {/* ── Lista principal ─────────────────────────────────────── */}
      <div style={st.section}>
        <h2 style={st.sectionTitle}>Todas as oportunidades ({filtered.length})</h2>
        {filtered.length === 0 ? (
          <div style={st.empty}>Nenhuma oportunidade com estes filtros. Tenta mudar a região ou a área.</div>
        ) : (
          <div style={st.grid}>
            {filtered.map(o => (
              <OpportunityCard key={o.id} opp={o} expanded={expandedId === o.id}
                onToggle={() => setExpandedId(expandedId === o.id ? null : o.id)}
                isAdmin={isAdmin} onDelete={handleDeleteOpp} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-componentes ─────────────────────────────────────────────────────────

function Chip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  const bg = active
    ? (color ? `${color}25` : 'rgba(26,105,148,0.25)')
    : 'rgba(255,255,255,0.04)'
  const border = active
    ? (color ? `${color}50` : 'rgba(26,105,148,0.5)')
    : 'rgba(255,255,255,0.1)'
  const textColor = active ? (color || colors.primary) : 'rgba(255,255,255,0.5)'

  return (
    <button onClick={onClick} style={{
      background: bg, color: textColor, border: `1px solid ${border}`,
      borderRadius: 20, padding: '5px 12px', fontSize: 12, cursor: 'pointer',
      fontWeight: active ? 700 : 400, transition: 'all 0.15s', whiteSpace: 'nowrap',
    }}>
      {label}
    </button>
  )
}

function OpportunityCard({ opp, expanded, onToggle, highlight, isAdmin, onDelete }: {
  opp: Opportunity; expanded: boolean; onToggle: () => void; highlight?: boolean; isAdmin?: boolean; onDelete?: (id: string, e: React.MouseEvent) => void
}) {
  const days = daysUntil(opp.deadline)
  const dl = deadlineLabel(days)
  const typeColor = TYPE_COLORS[opp.type] || '#94a3b8'

  return (
    <div style={{
      ...st.card,
      ...(highlight ? { background: '#145578' } : {}),
    }} onClick={onToggle}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: '#fff', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)' }}>
          {TYPE_LABELS[opp.type] || opp.type}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{dl.text}</span>
      </div>

      {/* Title */}
      <h3 style={{ margin: '0 0 4px', fontSize: 15, color: '#fff', lineHeight: 1.3 }}>{opp.title}</h3>
      <p style={{ margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
        {opp.organization && `${opp.organization} · `}{opp.city || ''}{opp.country ? ` (${opp.country})` : ''}
      </p>

      {/* Tags */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {opp.coversCosts && <span style={st.costTag}>💰 Cobre custos</span>}
        {(opp.disciplines || []).slice(0, 3).map((d, i) => (
          <span key={i} style={st.tag}>{d}</span>
        ))}
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          {opp.description && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, margin: '0 0 8px' }}>{opp.description}</p>}
          {opp.contactEmail && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px' }}>📧 {opp.contactEmail}</p>}
          {opp.contactPerson && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px' }}>👤 {opp.contactPerson}</p>}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            {opp.url && (
              <a href={opp.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#fff', textDecoration: 'underline' }}
                onClick={e => e.stopPropagation()}>
                🔗 Ver página oficial →
              </a>
            )}
            {isAdmin && opp.source && onDelete && (
              <button onClick={e => onDelete(opp.id, e)} style={{
                marginLeft: 'auto', background: 'rgba(249,112,102,0.1)', color: colors.danger,
                border: '1px solid rgba(249,112,102,0.2)', borderRadius: 6,
                padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600,
              }}>🗑 Apagar</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '28px 20px', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { margin: 0, fontSize: 28, color: '#1A6994' },
  sub: { margin: '4px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  counter: { textAlign: 'right', flexShrink: 0 },
  counterNum: { display: 'block', fontSize: 32, fontWeight: 900, color: '#1A6994' },
  counterLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },

  searchInput: { width: '100%', background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0, padding: '12px 16px', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box' as const },

  filterSection: { marginBottom: 10 },
  filterLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 },
  chips: { display: 'flex', gap: 5, flexWrap: 'wrap' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 20, cursor: 'pointer' },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 600, margin: '0 0 12px' },

  highlightGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 },

  card: { background: '#1A6994', border: 'none', borderRadius: 0, padding: '14px 16px', cursor: 'pointer', transition: 'opacity 0.15s', color: '#fff' },
  tag: { fontSize: 11, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', padding: '2px 8px', borderRadius: 20 },
  costTag: { fontSize: 11, background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 8px', borderRadius: 20, fontWeight: 600 },
  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: 40, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 0, fontSize: 14 },
  adminBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 0, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  adminBtnAlt: { background: 'rgba(96,180,232,0.1)', color: '#60b4e8', border: '1px solid rgba(96,180,232,0.2)', borderRadius: 0, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
}
