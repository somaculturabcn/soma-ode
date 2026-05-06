// src/components/ContextualMatchPanel.tsx
// SOMA ODÉ — Painel de match contextual on-demand
// Artista + Projecto (com dossier) × Oportunidades da base → score real com IA

import { useState } from 'react'
import { runContextualMatch, type MatchResults, type ContextualMatch } from '../services/contextualMatcher'

interface Props {
  artists: any[]
  opportunities: any[]
}

const VERDICT_COLORS: Record<string, string> = {
  forte: '#6ef3a5',
  bom: '#60b4e8',
  possivel: '#ffcf5c',
  fraco: 'rgba(255,255,255,0.35)',
}

const VERDICT_LABELS: Record<string, string> = {
  forte: '🔥 Forte encaixe',
  bom: '✅ Bom encaixe',
  possivel: '⚡ Possível',
  fraco: '— Fraco',
}

export default function ContextualMatchPanel({ artists, opportunities }: Props) {
  const [artistId, setArtistId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<MatchResults | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const selectedArtist = artists.find(a => a.id === artistId) || null
  const projects = (selectedArtist as any)?.projects || []
  const selectedProject = projects.find((p: any) => p.id === projectId) || null
  const hasDossier = Boolean(selectedProject?.dossierText)

  function handleArtistChange(id: string) {
    setArtistId(id)
    setProjectId('')
    setResults(null)
    setError('')
  }

  async function runMatch() {
    if (!selectedArtist || !selectedProject) return

    setLoading(true)
    setError('')
    setResults(null)

    try {
      const res = await runContextualMatch(selectedArtist, selectedProject, opportunities)
      setResults(res)
    } catch (err: any) {
      setError(err.message || 'Erro ao correr o match.')
    } finally {
      setLoading(false)
    }
  }

  // Get full opportunity data for a match result
  function getOpportunity(id: string) {
    return opportunities.find(op => op.id === id) || null
  }

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.icon}>🎯</span>
          <div>
            <div style={s.title}>Match Contextual</div>
            <div style={s.subtitle}>
              Selecciona artista + projecto → IA analisa a base completa
            </div>
          </div>
        </div>
      </div>

      {/* Selectors */}
      <div style={s.selectors}>
        <div style={s.selectorGroup}>
          <label style={s.label}>Artista</label>
          <select
            style={s.select}
            value={artistId}
            onChange={e => handleArtistChange(e.target.value)}
          >
            <option value="">— Seleccionar artista —</option>
            {artists.map(a => (
              <option key={a.id} value={a.id}>{a.name || 'Artista sem nome'}</option>
            ))}
          </select>
        </div>

        <div style={s.selectorGroup}>
          <label style={s.label}>Projecto</label>
          <select
            style={s.select}
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            disabled={!artistId || projects.length === 0}
          >
            <option value="">
              {!artistId ? '— Selecciona artista —' : projects.length === 0 ? '— Sem projectos —' : '— Seleccionar projecto —'}
            </option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name || 'Projecto sem nome'}
                {p.dossierText ? ' 📄' : ''}
              </option>
            ))}
          </select>
        </div>

        <button
          style={{
            ...s.runBtn,
            opacity: (!artistId || !projectId || loading) ? 0.5 : 1,
            cursor: (!artistId || !projectId || loading) ? 'not-allowed' : 'pointer',
          }}
          onClick={runMatch}
          disabled={!artistId || !projectId || loading}
        >
          {loading ? '⟳ A analisar...' : '🎯 Correr match'}
        </button>
      </div>

      {/* Context indicators */}
      {selectedProject && (
        <div style={s.contextBar}>
          {hasDossier ? (
            <span style={s.badgeGreen}>📄 Dossier carregado — análise profunda</span>
          ) : (
            <span style={s.badgeYellow}>⚠ Sem dossier — análise por Cartografia e keywords. Faz upload do PDF para melhores resultados.</span>
          )}
          <span style={s.badgeBlue}>
            {opportunities.length} oportunidades na base
          </span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={s.loadingBox}>
          <div style={s.spinner}>⟳</div>
          <p style={s.loadingText}>
            Gemini está a analisar {opportunities.length} oportunidades com o perfil de {selectedArtist?.name}...
          </p>
          <p style={s.loadingSubtext}>
            {hasDossier ? 'A usar o dossier completo do projecto' : 'A usar Cartografia e keywords do projecto'}
          </p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={s.errorBox}>
          ⚠ {error}
          <button style={s.retryBtn} onClick={runMatch}>↺ Tentar novamente</button>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div style={s.results}>
          <div style={s.resultsHeader}>
            <div style={s.resultsTitle}>
              {results.matches.length} oportunidades analisadas
              <span style={s.resultsSubtitle}>
                {results.artistName} · {results.projectName} · {new Date(results.runAt).toLocaleDateString('pt-PT')}
              </span>
            </div>
            <div style={s.resultsSummary}>
              {['forte', 'bom', 'possivel', 'fraco'].map(v => {
                const count = results.matches.filter(m => m.verdict === v).length
                if (!count) return null
                return (
                  <span key={v} style={{ ...s.verdictCount, color: VERDICT_COLORS[v] }}>
                    {VERDICT_LABELS[v]} ({count})
                  </span>
                )
              })}
            </div>
          </div>

          <div style={s.matchList}>
            {results.matches.map((match, idx) => {
              const op = getOpportunity(match.opportunityId)
              if (!op) return null
              const isExpanded = expandedId === match.opportunityId
              const vc = VERDICT_COLORS[match.verdict]

              return (
                <div
                  key={match.opportunityId}
                  style={{
                    ...s.matchCard,
                    borderColor: `${vc}40`,
                    background: match.verdict === 'forte' ? 'rgba(110,243,165,0.04)' : '#111',
                  }}
                >
                  <div style={s.matchTop} onClick={() => setExpandedId(isExpanded ? null : match.opportunityId)}>
                    <div style={s.matchRank}>
                      <span style={{ ...s.score, color: vc }}>{match.score}</span>
                      <span style={s.scoreLabel}>/100</span>
                    </div>

                    <div style={s.matchInfo}>
                      <div style={s.matchTitle}>{op.title}</div>
                      <div style={s.matchMeta}>
                        {[op.organization, op.city, op.countryName || op.country].filter(Boolean).join(' · ')}
                      </div>
                      <div style={{ ...s.verdict, color: vc }}>
                        {VERDICT_LABELS[match.verdict]}
                      </div>
                      <div style={s.mainReason}>{match.mainReason}</div>
                    </div>

                    <div style={s.matchActions}>
                      {op.link && (
                        <a href={op.link} target="_blank" rel="noopener noreferrer" style={s.linkBtn}
                          onClick={e => e.stopPropagation()}>
                          ver →
                        </a>
                      )}
                      <button style={s.expandBtn}>
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={s.matchDetail}>
                      {match.strengths.length > 0 && (
                        <div style={s.detailSection}>
                          <div style={s.detailLabel}>💪 Pontos fortes</div>
                          {match.strengths.map((s, i) => (
                            <div key={i} style={sty.strengthRow}>✓ {s}</div>
                          ))}
                        </div>
                      )}

                      {match.challenges.length > 0 && (
                        <div style={s.detailSection}>
                          <div style={s.detailLabel}>⚠ Desafios</div>
                          {match.challenges.map((c, i) => (
                            <div key={i} style={sty.challengeRow}>→ {c}</div>
                          ))}
                        </div>
                      )}

                      {match.angle && (
                        <div style={s.angleBox}>
                          <div style={s.detailLabel}>🎯 Ângulo de candidatura</div>
                          <div style={s.angleText}>{match.angle}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    background: '#0a0a0a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  icon: { fontSize: 22, marginTop: 2 },
  title: { fontSize: 16, fontWeight: 700, color: '#60b4e8' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 3 },
  selectors: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr auto',
    gap: 10,
    marginBottom: 12,
  },
  selectorGroup: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' },
  select: {
    background: '#111',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  },
  runBtn: {
    background: '#1A6994',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '0 18px',
    fontSize: 13,
    fontWeight: 800,
    alignSelf: 'flex-end',
    height: 40,
    whiteSpace: 'nowrap',
  },
  contextBar: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  badgeGreen: {
    fontSize: 11,
    color: '#6ef3a5',
    background: 'rgba(110,243,165,0.08)',
    border: '1px solid rgba(110,243,165,0.2)',
    borderRadius: 6,
    padding: '4px 10px',
  },
  badgeYellow: {
    fontSize: 11,
    color: '#ffcf5c',
    background: 'rgba(255,207,92,0.08)',
    border: '1px solid rgba(255,207,92,0.2)',
    borderRadius: 6,
    padding: '4px 10px',
  },
  badgeBlue: {
    fontSize: 11,
    color: '#60b4e8',
    background: 'rgba(26,105,148,0.1)',
    border: '1px solid rgba(26,105,148,0.2)',
    borderRadius: 6,
    padding: '4px 10px',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '36px 20px',
    color: '#fff',
  },
  spinner: { fontSize: 28, color: '#60b4e8', marginBottom: 12 },
  loadingText: { fontSize: 14, marginBottom: 6 },
  loadingSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  errorBox: {
    background: 'rgba(255,70,70,0.06)',
    border: '1px solid rgba(255,70,70,0.2)',
    borderRadius: 10,
    padding: '14px 16px',
    color: '#ff8a8a',
    fontSize: 13,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retryBtn: {
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 12,
    cursor: 'pointer',
  },
  results: { marginTop: 16 },
  resultsHeader: { marginBottom: 14 },
  resultsTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  resultsSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 400,
  },
  resultsSummary: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  verdictCount: {
    fontSize: 11,
    fontWeight: 600,
  },
  matchList: { display: 'flex', flexDirection: 'column', gap: 8 },
  matchCard: {
    background: '#111',
    border: '1px solid',
    borderRadius: 10,
    overflow: 'hidden',
  },
  matchTop: {
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
    padding: '14px 16px',
    cursor: 'pointer',
  },
  matchRank: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
    minWidth: 44,
  },
  score: { fontSize: 26, fontWeight: 900, lineHeight: 1 },
  scoreLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 },
  matchInfo: { flex: 1 },
  matchTitle: { fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 },
  matchMeta: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 },
  verdict: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  mainReason: { fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.45 },
  matchActions: { display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start' },
  linkBtn: {
    color: '#60b4e8',
    textDecoration: 'none',
    fontSize: 12,
    padding: '5px 8px',
    border: '1px solid rgba(96,180,232,0.3)',
    borderRadius: 6,
  },
  expandBtn: {
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '5px 8px',
    fontSize: 11,
    cursor: 'pointer',
  },
  matchDetail: {
    padding: '0 16px 16px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  detailSection: {},
  detailLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 6,
    fontWeight: 700,
  },
  angleBox: {
    background: 'rgba(26,105,148,0.08)',
    border: '1px solid rgba(26,105,148,0.2)',
    borderRadius: 8,
    padding: '10px 14px',
  },
  angleText: {
    fontSize: 13,
    color: '#fff',
    lineHeight: 1.5,
    marginTop: 6,
  },
}

// Inner styles for strength/challenge rows (avoiding collision with s)
const sty: Record<string, React.CSSProperties> = {
  strengthRow: {
    fontSize: 12,
    color: 'rgba(110,243,165,0.85)',
    padding: '3px 0',
    lineHeight: 1.4,
  },
  challengeRow: {
    fontSize: 12,
    color: 'rgba(255,207,92,0.85)',
    padding: '3px 0',
    lineHeight: 1.4,
  },
}