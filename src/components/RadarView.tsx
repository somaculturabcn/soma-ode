// src/components/RadarView.tsx
// SOMA ODÉ v5 — Radar de Editais + Festivais
// Inspirado no radareditais.clubemma.com.br — filtros visuais, destaques, deadline

import { useState, useMemo } from 'react'
import { realOpportunities } from '../data/realOpportunities'
import type { Opportunity } from '../types/opportunity'

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
  festival: '#60b4e8', venue: '#94a3b8', residency: '#c084fc', open_call: '#ffcf5c',
  showcase: '#fb923c', grant: '#6ef3a5', funding: '#f97066', commission: '#e879f9',
}

const DISCIPLINES = ['Todas', 'musica', 'danca', 'teatro', 'performance', 'artes visuais', 'audiovisual', 'literatura', 'circo', 'som', 'multidisciplinar']

// ── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(deadline: string | undefined): number | null {
  if (!deadline) return null
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
}

function deadlineLabel(days: number | null): { text: string; color: string } {
  if (days === null) return { text: 'Sem prazo', color: 'rgba(255,255,255,0.3)' }
  if (days < 0) return { text: 'Encerrado', color: '#f97066' }
  if (days <= 7) return { text: `${days}d — URGENTE`, color: '#f97066' }
  if (days <= 30) return { text: `${days} dias`, color: '#ffcf5c' }
  return { text: `${days} dias`, color: '#6ef3a5' }
}

// ── Componente ──────────────────────────────────────────────────────────────

export default function RadarView() {
  const [region, setRegion] = useState('Todas')
  const [type, setType] = useState('Todos')
  const [discipline, setDiscipline] = useState('Todas')
  const [search, setSearch] = useState('')
  const [hideExpired, setHideExpired] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Usar oportunidades reais
  const allOpps = useMemo(() => {
    return [...realOpportunities]
  }, [])

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

  return (
    <div style={st.page}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={st.header}>
        <div>
          <h1 style={st.title}>📡 Radar</h1>
          <p style={st.sub}>Editais, festivais, residências e open calls</p>
        </div>
        <div style={st.counter}>
          <span style={st.counterNum}>{filtered.length}</span>
          <span style={st.counterLabel}>oportunidades</span>
        </div>
      </div>

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
                onToggle={() => setExpandedId(expandedId === o.id ? null : o.id)} highlight />
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
                onToggle={() => setExpandedId(expandedId === o.id ? null : o.id)} />
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
  const textColor = active ? (color || '#60b4e8') : 'rgba(255,255,255,0.5)'

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

function OpportunityCard({ opp, expanded, onToggle, highlight }: {
  opp: Opportunity; expanded: boolean; onToggle: () => void; highlight?: boolean
}) {
  const days = daysUntil(opp.deadline)
  const dl = deadlineLabel(days)
  const typeColor = TYPE_COLORS[opp.type] || '#94a3b8'

  return (
    <div style={{
      ...st.card,
      ...(highlight ? { borderColor: 'rgba(26,105,148,0.3)', background: 'rgba(26,105,148,0.05)' } : {}),
    }} onClick={onToggle}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: typeColor, border: `1px solid ${typeColor}40`, background: `${typeColor}10` }}>
          {TYPE_LABELS[opp.type] || opp.type}
        </span>
        <span style={{ fontSize: 11, color: dl.color, fontWeight: 600 }}>{dl.text}</span>
      </div>

      {/* Title */}
      <h3 style={{ margin: '0 0 4px', fontSize: 15, color: '#fff', lineHeight: 1.3 }}>{opp.title}</h3>
      <p style={{ margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
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
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {opp.description && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, margin: '0 0 8px' }}>{opp.description}</p>}
          {opp.contactEmail && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>📧 {opp.contactEmail}</p>}
          {opp.contactPerson && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 4px' }}>👤 {opp.contactPerson}</p>}
          {opp.url && (
            <a href={opp.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#60b4e8', textDecoration: 'none' }}
              onClick={e => e.stopPropagation()}>
              🔗 Ver página oficial →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '28px 20px', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  title: { margin: 0, fontSize: 28, color: '#60b4e8' },
  sub: { margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  counter: { textAlign: 'right', flexShrink: 0 },
  counterNum: { display: 'block', fontSize: 32, fontWeight: 900, color: '#1A6994' },
  counterLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },

  searchInput: { width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px', fontSize: 14, outline: 'none', marginBottom: 16, boxSizing: 'border-box' as const },

  filterSection: { marginBottom: 10 },
  filterLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 },
  chips: { display: 'flex', gap: 5, flexWrap: 'wrap' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 20, cursor: 'pointer' },

  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 600, margin: '0 0 12px' },

  highlightGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 },

  card: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.15s' },
  tag: { fontSize: 11, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', padding: '2px 8px', borderRadius: 20 },
  costTag: { fontSize: 11, background: 'rgba(110,243,165,0.1)', color: '#6ef3a5', padding: '2px 8px', borderRadius: 20 },
  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 14 },
}
