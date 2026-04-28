// src/components/PipelineView.tsx
// SOMA ODÉ — Pipeline de oportunidades conectado ao Supabase

import { useEffect, useMemo, useState } from 'react'
import { mockOpportunities } from '../data/mockOpportunities'
import { realOpportunities } from '../data/realOpportunities'
import { getManualOpportunities } from '../data/manualOpportunitiesStore'
import {
  loadPipelineFromSupabase,
  addPipelineItemToSupabase,
  updatePipelineStatusInSupabase,
} from '../data/pipelineSupabaseStore'
import type { Opportunity } from '../types/opportunity'
import type { PipelineItem, PipelineStatus } from '../types/pipeline'

const STAGES: { id: PipelineStatus; label: string; color: string }[] = [
  { id: 'nova', label: 'Nova', color: '#60b4e8' },
  { id: 'analise', label: 'Em análise', color: '#ffcf5c' },
  { id: 'preparar', label: 'Preparar candidatura', color: '#c084fc' },
  { id: 'enviada', label: 'Enviada', color: '#6ef3a5' },
  { id: 'negociacao', label: 'Em negociação', color: '#fb923c' },
  { id: 'fechada', label: 'Fechada', color: '#f87171' },
]

function getOpportunityLink(op: any) {
  return op.url || op.link || op.website || ''
}

function normalizeOpportunity(op: any): Opportunity {
  return {
    ...op,
    id: op.id,
    title: op.title || op.name || 'Oportunidade sem título',
    organization: op.organization || op.org || '',
    country: op.country || op.countryName || op.countryCode || '',
    city: op.city || '',
    type: op.type || 'Edital',
  }
}

export default function PipelineView() {
  const [pipelineItems, setPipelineItems] = useState<PipelineItem[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    loadPipeline()
  }, [])

  async function loadPipeline() {
    setLoading(true)
    try {
      const data = await loadPipelineFromSupabase()
      setPipelineItems(data)
    } catch (error) {
      console.error(error)
      alert('Erro ao carregar pipeline.')
    } finally {
      setLoading(false)
    }
  }

  const allOpportunities: Opportunity[] = useMemo(() => {
    const map = new Map<string, Opportunity>()

    for (const o of realOpportunities || []) {
      const op = normalizeOpportunity(o)
      map.set(op.id, op)
    }

    for (const o of mockOpportunities || []) {
      const op = normalizeOpportunity(o)
      if (!map.has(op.id)) map.set(op.id, op)
    }

    for (const o of getManualOpportunities() || []) {
      const op = normalizeOpportunity(o)
      map.set(op.id, op)
    }

    return Array.from(map.values())
  }, [])

  const pipelineByOpportunity = useMemo(() => {
    const map = new Map<string, PipelineItem>()

    for (const item of pipelineItems) {
      if (item.opportunityId) {
        map.set(item.opportunityId, item)
      }
    }

    return map
  }, [pipelineItems])

  const q = filter.toLowerCase().trim()

  const visible = allOpportunities.filter(o => {
    if (!q) return true

    return [
      o.title,
      o.organization,
      o.city,
      o.country,
      o.type,
    ]
      .join(' ')
      .toLowerCase()
      .includes(q)
  })

  function getStage(op: Opportunity): PipelineStatus {
    const item = pipelineByOpportunity.get(op.id)
    return (item?.status || 'nova') as PipelineStatus
  }

  async function moveStage(op: Opportunity, stage: PipelineStatus) {
    setSavingId(op.id)

    try {
      const existing = pipelineByOpportunity.get(op.id)

      if (existing) {
        await updatePipelineStatusInSupabase(existing.id, stage)

        setPipelineItems(prev =>
          prev.map(item =>
            item.id === existing.id
              ? { ...item, status: stage, updatedAt: new Date().toISOString() }
              : item
          )
        )
      } else {
        const created = await addPipelineItemToSupabase({
          title: op.title,
          status: stage,
          origin: 'opportunity',
          opportunityId: op.id,
          opportunityTitle: op.title,
          organization: op.organization || '',
          artistId: '',
          artistName: '',
          contactId: '',
          contactName: '',
          email: '',
          phone: '',
          priority: 'media',
          deadline: (op as any).deadline || '',
          notes: '',
        })

        if (created) {
          setPipelineItems(prev => [created, ...prev])
        }
      }
    } catch (error) {
      console.error(error)
      alert('Erro ao atualizar pipeline.')
    } finally {
      setSavingId(null)
    }
  }

  const inStage = (stageId: PipelineStatus) =>
    visible.filter(o => getStage(o) === stageId)

  const totalActive = visible.filter(o => getStage(o) !== 'fechada').length

  if (loading) {
    return (
      <div style={s.wrap}>
        <h2 style={s.title}>Pipeline</h2>
        <p style={s.subtitle}>Carregando pipeline...</p>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <div>
          <h2 style={s.title}>Pipeline</h2>
          <p style={s.subtitle}>
            {totalActive} oportunidades activas · {visible.length} total · Supabase conectado
          </p>
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

              {items.length === 0 && <div style={s.empty}>—</div>}

              {items.map(op => {
                const link = getOpportunityLink(op)
                const currentStage = getStage(op)
                const isSaving = savingId === op.id

                return (
                  <div key={op.id} style={s.card}>
                    <div style={s.cardTitle}>{op.title}</div>

                    <div style={s.cardMeta}>
                      {op.organization && op.organization !== op.title
                        ? `${op.organization} · `
                        : ''}
                      {op.country}
                      {op.city ? ` · ${op.city}` : ''}
                    </div>

                    <div style={s.cardType}>{op.type}</div>

                    <select
                      style={s.stageSelect}
                      value={currentStage}
                      disabled={isSaving}
                      onChange={e => moveStage(op, e.target.value as PipelineStatus)}
                    >
                      {STAGES.map(st => (
                        <option key={st.id} value={st.id}>
                          {st.label}
                        </option>
                      ))}
                    </select>

                    {isSaving && <div style={s.saving}>Guardando...</div>}

                    {link && (
                      <a href={link} target="_blank" rel="noreferrer" style={s.link}>
                        ver edital →
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    maxWidth: 1400,
    margin: '0 auto',
    padding: '24px 20px',
    color: '#fff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 24,
    color: '#fff',
  },
  subtitle: {
    margin: '4px 0 0',
    color: '#bbb',
    fontSize: 13,
  },
  search: {
    padding: '10px 14px',
    background: '#0a0a0a',
    color: '#fff',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    fontSize: 13,
    outline: 'none',
    minWidth: 240,
  },
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: 12,
    alignItems: 'start',
    overflowX: 'auto',
  },
  column: {
    background: '#050505',
    border: '0.5px solid rgba(255,255,255,0.07)',
    borderRadius: 10,
    padding: 12,
    minWidth: 180,
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  columnLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#fff',
    flex: 1,
    letterSpacing: '0.04em',
  },
  count: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 600,
  },
  empty: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 12,
    textAlign: 'center',
    padding: '16px 0',
  },
  card: {
    background: '#0a0a0a',
    border: '0.5px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#fff',
    marginBottom: 4,
    lineHeight: 1.3,
  },
  cardMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 6,
  },
  cardType: {
    fontSize: 10,
    padding: '2px 8px',
    background: 'rgba(26,105,148,0.2)',
    color: '#60b4e8',
    borderRadius: 10,
    display: 'inline-block',
    marginBottom: 8,
  },
  stageSelect: {
    width: '100%',
    padding: '5px 8px',
    background: '#111',
    color: '#fff',
    border: '0.5px solid rgba(255,255,255,0.15)',
    borderRadius: 6,
    fontSize: 11,
    cursor: 'pointer',
    marginBottom: 6,
  },
  saving: {
    color: '#ffcf5c',
    fontSize: 11,
    marginBottom: 6,
  },
  link: {
    fontSize: 11,
    color: '#7ab6ff',
    textDecoration: 'none',
  },
}