// src/components/PipelineView.tsx
// SOMA ODÉ — Pipeline de oportunidades (Claude · 2026-04-25)
// Kanban simples: arrasta oportunidades entre fases de produção

import { useState, useMemo } from 'react'
import { mockOpportunities } from '../data/mockOpportunities'
import { realOpportunities } from '../data/realOpportunities'
import { getManualOpportunities } from '../data/manualOpportunitiesStore'
import type { Opportunity } from '../types/opportunity'

const STAGES = [
  { id: 'nova',        label: 'Nova',                color: '#60b4e8' },
  { id: 'analise',     label: 'Em análise',           color: '#ffcf5c' },
  { id: 'preparar',    label: 'Preparar candidatura', color: '#c084fc' },
  { id: 'enviada',     label: 'Enviada',              color: '#6ef3a5' },
  { id: 'negociacao',  label: 'Em negociação',        color: '#fb923c' },
  { id: 'fechada',     label: 'Fechada',              color: '#f87171' },
]

const PIPELINE_KEY = 'soma_pipeline_v2'

function getPipeline(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(PIPELINE_KEY) || '{}') } catch { return {} }
}

function savePipeline(p: Record<string, string>) {
  localStorage.setItem(PIPELINE_KEY, JSON.stringify(p))
}

export default function PipelineView() {
  const [pipeline, setPipeline] = useState<Record<string, string>>(getPipeline)
  const [filter, setFilter] = useState('')

  const allOpportunities: Opportunity[] = useMemo(() => {
    const map = new Map<string, Opportunity>()
    for (const o of realOpportunities) map.set(o.id, o)
    for (const o of mockOpportunities) if (!map.has(o.id)) map.set(o.id, o)
    for (const o of getManualOpportunities()) map.set(o.id, o)
    return Array.from(map.values())
  }, [])

  const q = filter.toLowerCase()
  const visible = allOpportunities.filter(o =>
    !q || [o.title, o.organization, o.city, o.country].join(' ').toLowerCase().includes(q)
  )

  function getStage(id: string) { return pipeline[id] || 'nova' }

  function moveStage(id: string, stage: string) {
    const updated = { ...pipeline, [id]: stage }
    setPipeline(updated)
    savePipeline(updated)
  }

  const inStage = (stageId: string) => visible.filter(o => getStage(o.id) === stageId)

  const totalActive = visible.filter(o => !['fechada'].includes(getStage(o.id))).length

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <div>
          <h2 style={s.title}>Pipeline</h2>
          <p style={s.subtitle}>{totalActive} oportunidades activas · {visible.length} total</p>
        </div>
        <input
          style={s.search}
          placeholder="🔍 Filtrar oportunidades..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </header>

      <div style={s.board}>
        {STAGES.map(stage => {
          const items = inStage(stage.id)
          return (
            <div key={stage.id} style={s.column}>
              <div style={s.columnHeader}>
                <span style={{ ...s.dot, background: stage.color }} />
                <span style={s.columnLabel}>{stage.label}</span>
                <span style={s.count}>{items.length}</span>
              </div>

              {items.length === 0 && (
                <div style={s.empty}>—</div>
              )}

              {items.map(op => (
                <div key={op.id} style={s.card}>
                  <div style={s.cardTitle}>{op.title}</div>
                  <div style={s.cardMeta}>
                    {op.organization !== op.title && op.organization ? `${op.organization} · ` : ''}
                    {op.country}{op.city ? ` · ${op.city}` : ''}
                  </div>
                  <div style={s.cardType}>{op.type}</div>

                  <select
                    style={s.stageSelect}
                    value={getStage(op.id)}
                    onChange={e => moveStage(op.id, e.target.value)}
                  >
                    {STAGES.map(st => (
                      <option key={st.id} value={st.id}>{st.label}</option>
                    ))}
                  </select>

                  {op.url && (
                    <a href={op.url} target="_blank" rel="noreferrer" style={s.link}>
                      ver →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1400, margin: '0 auto', padding: '24px 20px', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { margin: 0, fontSize: 24, color: '#fff' },
  subtitle: { margin: '4px 0 0', color: '#bbb', fontSize: 13 },
  search: { padding: '10px 14px', background: '#0a0a0a', color: '#fff', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 13, outline: 'none', minWidth: 240 },
  board: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, alignItems: 'start', overflowX: 'auto' },
  column: { background: '#050505', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 12, minWidth: 180 },
  columnHeader: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  columnLabel: { fontSize: 12, fontWeight: 700, color: '#fff', flex: 1, letterSpacing: '0.04em' },
  count: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600 },
  empty: { color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', padding: '16px 0' },
  card: { background: '#0a0a0a', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, marginBottom: 8 },
  cardTitle: { fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4, lineHeight: 1.3 },
  cardMeta: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 6 },
  cardType: { fontSize: 10, padding: '2px 8px', background: 'rgba(26,105,148,0.2)', color: '#60b4e8', borderRadius: 10, display: 'inline-block', marginBottom: 8 },
  stageSelect: { width: '100%', padding: '5px 8px', background: '#111', color: '#fff', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 6, fontSize: 11, cursor: 'pointer', marginBottom: 6 },
  link: { fontSize: 11, color: '#7ab6ff', textDecoration: 'none' },
}