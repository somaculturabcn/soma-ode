// src/components/ScoutPanel.tsx
// SOMA ODÉ — Painel de scout proativo com seleção de projeto

import { useState, useEffect } from 'react'
import type { Artist } from '../types/artist'
import type { Opportunity, ScoredOpportunity, ProjectForScout, ScoutTarget } from '../types/opportunity'
import { runMatchWithTarget } from '../services/matchEngine'

interface ScoutPanelProps {
  artist: Artist
  opportunities: Opportunity[]
  onMatchSelect?: (match: ScoredOpportunity) => void
}

export default function ScoutPanel({ artist, opportunities, onMatchSelect }: ScoutPanelProps) {
  const [targetType, setTargetType] = useState<'artist' | 'project'>('artist')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [results, setResults] = useState<ScoredOpportunity[]>([])
  const [loading, setLoading] = useState(false)
  const [scoreMinimo, setScoreMinimo] = useState(50)

  const projects = (artist as any).projects as ProjectForScout[] || []

  useEffect(() => {
    executarScout()
  }, [targetType, selectedProjectId, scoreMinimo])

  async function executarScout() {
    setLoading(true)
    try {
      const resultado = runMatchWithTarget(
        artist,
        projects,
        opportunities,
        {
          target: targetType === 'artist'
            ? { type: 'artist', artistId: artist.id }
            : { type: 'project', artistId: artist.id, projectId: selectedProjectId },
          scoreMinimo,
        },
        { hideBlocked: true },
      )
      setResults(resultado)
    } catch (err) {
      console.error('Erro no scout:', err)
    }
    setLoading(false)
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  return (
    <div style={s.wrap}>
      {/* CABEÇALHO */}
      <div style={s.header}>
        <h2 style={s.title}>🔍 Scout Proativo</h2>
        <p style={s.subtitle}>
          {artist.name} · {opportunities.length} oportunidades disponíveis
        </p>
      </div>

      {/* SELETOR DE ALVO */}
      <div style={s.targetSelector}>
        <span style={s.targetLabel}>Buscar oportunidades para:</span>
        <div style={s.targetOptions}>
          <button
            onClick={() => setTargetType('artist')}
            style={{
              ...s.targetBtn,
              ...(targetType === 'artist' ? s.targetBtnActive : {}),
            }}
          >
            🎨 Artista completo
          </button>

          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => {
                setTargetType('project')
                setSelectedProjectId(project.id)
              }}
              style={{
                ...s.targetBtn,
                ...(targetType === 'project' && selectedProjectId === project.id
                  ? s.targetBtnActive
                  : {}),
              }}
            >
              {project.projectFormat === 'DJ Set' ? '🎧' : 
               project.projectFormat?.toLowerCase().includes('performance') ? '🎭' :
               project.projectFormat?.toLowerCase().includes('concerto') ? '🎵' : '📦'}
              {' '}{project.name || `Projeto sem nome`}
            </button>
          ))}
        </div>
      </div>

      {/* INFO DO PROJETO SELECIONADO */}
      {targetType === 'project' && selectedProject && (
        <div style={s.projectInfo}>
          <h3 style={s.projectName}>{selectedProject.name}</h3>
          <div style={s.projectTags}>
            {selectedProject.projectFormat && (
              <span style={s.tag}>{selectedProject.projectFormat}</span>
            )}
            {selectedProject.language && (
              <span style={s.tag}>{selectedProject.language.toUpperCase()}</span>
            )}
            {selectedProject.projectTargetAudience && (
              <span style={s.tag}>👥 {selectedProject.projectTargetAudience}</span>
            )}
          </div>
          {selectedProject.projectTerritories && (
            <p style={s.projectTerritories}>
              🌍 Territórios: {selectedProject.projectTerritories}
            </p>
          )}
          {selectedProject.projectKeywords?.length > 0 && (
            <div style={s.keywordsRow}>
              {selectedProject.projectKeywords.map(k => (
                <span key={k} style={s.keyword}>{k}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FILTROS */}
      <div style={s.filtros}>
        <label style={s.filtroLabel}>
          Score mínimo:
          <select
            value={scoreMinimo}
            onChange={e => setScoreMinimo(Number(e.target.value))}
            style={s.filtroSelect}
          >
            <option value={0}>Todos</option>
            <option value={30}>30%+</option>
            <option value={50}>50%+</option>
            <option value={70}>70%+</option>
            <option value={85}>85%+</option>
          </select>
        </label>
        <button onClick={executarScout} style={s.refreshBtn} disabled={loading}>
          {loading ? '⏳ Buscando...' : '🔄 Atualizar'}
        </button>
      </div>

      {/* RESULTADOS */}
      <div style={s.results}>
        {results.length === 0 ? (
          <div style={s.empty}>
            <p>Nenhum match encontrado com esses critérios.</p>
            <p style={s.emptyHint}>Tenta reduzir o score mínimo ou selecionar outro projeto.</p>
          </div>
        ) : (
          <>
            <p style={s.resultsCount}>
              {results.length} match{results.length !== 1 ? 'es' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </p>
            {results.map((scored, i) => (
              <MatchCard
                key={scored.id || i}
                scored={scored}
                onClick={() => onMatchSelect?.(scored)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Card de Match ──────────────────────────────────────

function MatchCard({ scored, onClick }: { scored: ScoredOpportunity; onClick?: () => void }) {
  const { match } = scored
  const isUrgente = match.warnings?.some(w => w.includes('Deadline em'))

  return (
    <div
      style={{
        ...s.matchCard,
        ...(isUrgente ? s.matchCardUrgente : {}),
      }}
      onClick={onClick}
    >
      <div style={s.matchHeader}>
        <div>
          <h4 style={s.matchTitle}>{scored.title || scored.name || 'Sem título'}</h4>
          <p style={s.matchOrg}>
            {scored.organization || '—'}
            {scored.countryName ? ` · ${scored.countryName}` : ''}
            {scored.city ? ` · ${scored.city}` : ''}
          </p>
        </div>
        <div style={{
          ...s.scoreBadge,
          background: match.percentage >= 80 ? '#6ef3a5' :
                      match.percentage >= 60 ? '#ffcf5c' :
                      '#ff8a8a',
          color: match.percentage >= 60 ? '#000' : '#fff',
        }}>
          {match.percentage}%
        </div>
      </div>

      {scored.deadline && (
        <p style={s.deadline}>
          📅 Deadline: {new Date(scored.deadline).toLocaleDateString('pt-PT')}
          {isUrgente && <span style={s.urgenteBadge}>⚠️ Urgente</span>}
        </p>
      )}

      {/* Razões do match */}
      {match.reasons?.length > 0 && (
        <div style={s.reasons}>
          {match.reasons.slice(0, 3).map((r, i) => (
            <span key={i} style={s.reason}>✅ {r}</span>
          ))}
        </div>
      )}

      {/* Warnings */}
      {match.warnings?.length > 0 && (
        <div style={s.warnings}>
          {match.warnings.slice(0, 2).map((w, i) => (
            <span key={i} style={s.warning}>⚠️ {w}</span>
          ))}
        </div>
      )}

      {/* Blockers */}
      {match.blockers?.length > 0 && (
        <div style={s.blockers}>
          {match.blockers.map((b, i) => (
            <span key={i} style={s.blocker}>🚫 {b}</span>
          ))}
        </div>
      )}

      {/* Cobertura financeira */}
      {scored.coverage && (
        <div style={s.coverage}>
          {Object.entries(scored.coverage)
            .filter(([, v]) => v)
            .map(([k]) => (
              <span key={k} style={s.coverageItem}>
                💰 {k}
              </span>
            ))}
        </div>
      )}

      {scored.feeOffered && scored.feeOffered > 0 && (
        <p style={s.fee}>Cachê: €{scored.feeOffered}</p>
      )}
    </div>
  )
}

// ─── Estilos ────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  wrap: {
    background: '#0a0a0a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 24,
    color: '#fff',
    maxWidth: 800,
    margin: '0 auto',
  },
  header: { marginBottom: 20 },
  title: { margin: 0, fontSize: 22, color: '#60b4e8' },
  subtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 4 },

  // Seletor de alvo
  targetSelector: { marginBottom: 20 },
  targetLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    display: 'block',
    marginBottom: 8,
  },
  targetOptions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  targetBtn: {
    padding: '10px 16px',
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 10,
    fontSize: 13,
    cursor: 'pointer',
  },
  targetBtnActive: {
    background: 'rgba(26,105,148,0.3)',
    color: '#fff',
    border: '1px solid #1A6994',
  },

  // Info do projeto
  projectInfo: {
    background: 'rgba(26,105,148,0.08)',
    border: '1px solid rgba(26,105,148,0.2)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  projectName: { margin: '0 0 8px', color: '#60b4e8', fontSize: 15 },
  projectTags: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  tag: {
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.7)',
    padding: '3px 10px',
    borderRadius: 12,
    fontSize: 11,
  },
  projectTerritories: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    margin: '4px 0',
  },
  keywordsRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  keyword: {
    color: '#ffcf5c',
    fontSize: 11,
    background: 'rgba(255,207,92,0.1)',
    padding: '2px 8px',
    borderRadius: 10,
  },

  // Filtros
  filtros: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  filtroLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  filtroSelect: {
    background: '#000',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 13,
  },
  refreshBtn: {
    background: '#1A6994',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    cursor: 'pointer',
    marginLeft: 'auto',
  },

  // Resultados
  results: {},
  resultsCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
  },
  empty: {
    padding: 40,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
  },
  emptyHint: { fontSize: 12, opacity: 0.6 },

  // Match card
  matchCard: {
    background: '#000',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  matchCardUrgente: {
    border: '1px solid rgba(255,207,92,0.4)',
    background: 'rgba(255,207,92,0.03)',
  },
  matchHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  matchTitle: { margin: 0, fontSize: 15, color: '#fff' },
  matchOrg: {
    margin: '4px 0 0',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  scoreBadge: {
    padding: '6px 12px',
    borderRadius: 10,
    fontSize: 16,
    fontWeight: 700,
    flexShrink: 0,
  },
  deadline: {
    margin: '8px 0',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  urgenteBadge: {
    background: 'rgba(255,68,68,0.2)',
    color: '#ff8a8a',
    padding: '2px 8px',
    borderRadius: 8,
    fontSize: 10,
    fontWeight: 600,
  },

  // Razões, warnings, blockers
  reasons: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 },
  reason: { fontSize: 11, color: '#6ef3a5' },
  warnings: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  warning: { fontSize: 11, color: '#ffcf5c' },
  blockers: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  blocker: { fontSize: 11, color: '#ff8a8a' },

  // Financeiro
  coverage: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 },
  coverageItem: {
    fontSize: 11,
    color: '#6ef3a5',
    background: 'rgba(110,243,165,0.1)',
    padding: '2px 8px',
    borderRadius: 8,
  },
  fee: {
    margin: '6px 0 0',
    fontSize: 13,
    fontWeight: 600,
    color: '#6ef3a5',
  },
}