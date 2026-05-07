// src/components/ContextualMatchPanel.tsx
// SOMA ODÉ — Match contextual on-demand
// FECHADO por defeito — clica no header para abrir

import { useState } from 'react'
import { runContextualMatch, type MatchResults, type ContextualMatch } from '../services/contextualMatcher'

interface Props {
  artists: any[]
  opportunities: any[]
}

const VERDICT_COLORS: Record<string, string> = {
  forte: '#6ef3a5', bom: '#60b4e8', possivel: '#ffcf5c', fraco: 'rgba(255,255,255,0.3)',
}
const VERDICT_LABELS: Record<string, string> = {
  forte: '🔥 Forte', bom: '✅ Bom', possivel: '⚡ Possível', fraco: '— Fraco',
}

export default function ContextualMatchPanel({ artists, opportunities }: Props) {
  const [open, setOpen] = useState(false)
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
    setArtistId(id); setProjectId(''); setResults(null); setError('')
  }

  async function runMatch() {
    if (!selectedArtist || !selectedProject) return
    setLoading(true); setError(''); setResults(null)
    try {
      const res = await runContextualMatch(selectedArtist, selectedProject, opportunities)
      setResults(res)
    } catch (err: any) {
      setError(err.message || 'Erro ao correr o match.')
    } finally {
      setLoading(false)
    }
  }

  function getOpportunity(id: string) {
    return opportunities.find(op => op.id === id) || null
  }

  return (
    <div style={s.wrap}>

      {/* ── HEADER — sempre visível, clica para abrir/fechar ── */}
      <div style={s.toggleHeader} onClick={() => setOpen(o => !o)}>
        <div style={s.headerLeft}>
          <span style={{ fontSize: 18 }}>🎯</span>
          <div>
            <span style={s.title}>Match Contextual</span>
            <span style={s.subtitle}>
              {open
                ? ' — selecciona artista + projecto e clica Correr match'
                : ' — analisa oportunidades por perfil de artista'}
            </span>
          </div>
        </div>
        <span style={s.chevron}>{open ? '▲' : '▼'}</span>
      </div>

      {/* ── CORPO recolhível ── */}
      {open && (
        <div style={s.body}>

          {/* Selectors */}
          <div style={s.selectors}>
            <div style={s.selectorGroup}>
              <label style={s.label}>Artista</label>
              <select style={s.select} value={artistId} onChange={e => handleArtistChange(e.target.value)}>
                <option value="">— Seleccionar artista —</option>
                {artists.map(a => (
                  <option key={a.id} value={a.id}>{a.name || 'Artista sem nome'}</option>
                ))}
              </select>
            </div>
            <div style={s.selectorGroup}>
              <label style={s.label}>Projecto</label>
              <select style={s.select} value={projectId}
                onChange={e => setProjectId(e.target.value)}
                disabled={!artistId || projects.length === 0}>
                <option value="">
                  {!artistId ? '— Selecciona artista primeiro —'
                    : projects.length === 0 ? '— Sem projectos —'
                    : '— Seleccionar projecto —'}
                </option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name || 'Projecto sem nome'}{p.dossierText ? ' 📄' : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              style={{ ...s.runBtn, opacity: (!artistId || !projectId || loading) ? 0.5 : 1 }}
              onClick={runMatch}
              disabled={!artistId || !projectId || loading}
            >
              {loading ? '⟳ A analisar...' : '🎯 Correr match'}
            </button>
          </div>

          {/* Context indicator */}
          {selectedProject && (
            <div style={s.contextBar}>
              <span style={hasDossier ? s.badgeGreen : s.badgeYellow}>
                {hasDossier ? '📄 Dossier carregado — análise profunda' : '⚠ Sem dossier — usa Cartografia e keywords'}
              </span>
              <span style={s.badgeBlue}>{opportunities.length} oportunidades na base</span>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={s.loadingBox}>
              <div style={{ fontSize: 24, color: '#60b4e8', marginBottom: 8 }}>⟳</div>
              <div style={{ fontSize: 13 }}>Gemini a analisar {opportunities.length} oportunidades...</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                {hasDossier ? 'A usar o dossier completo' : 'A usar Cartografia e keywords'}
              </div>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div style={s.errorBox}>
              <span>⚠ {error}</span>
              <button style={s.retryBtn} onClick={runMatch}>↺ Tentar novamente</button>
            </div>
          )}

          {/* Results */}
          {results && !loading && (
            <div style={{ marginTop: 14 }}>
              <div style={s.resultsHeader}>
                <strong style={{ color: '#fff' }}>{results.matches.length} oportunidades analisadas</strong>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 10 }}>
                  {results.artistName} · {results.projectName}
                </span>
                <div style={{ marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                  {['forte', 'bom', 'possivel', 'fraco'].map(v => {
                    const count = results.matches.filter(m => m.verdict === v).length
                    return count ? (
                      <span key={v} style={{ fontSize: 11, color: VERDICT_COLORS[v], fontWeight: 700 }}>
                        {VERDICT_LABELS[v]} ({count})
                      </span>
                    ) : null
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {results.matches.map(match => {
                  const op = getOpportunity(match.opportunityId)
                  if (!op) return null
                  const vc = VERDICT_COLORS[match.verdict]
                  const isExp = expandedId === match.opportunityId
                  return (
                    <div key={match.opportunityId} style={{ ...s.matchCard, borderColor: `${vc}40` }}>
                      <div style={s.matchTop} onClick={() => setExpandedId(isExp ? null : match.opportunityId)}>
                        <div style={s.scoreBlock}>
                          <span style={{ fontSize: 24, fontWeight: 900, color: vc, lineHeight: 1 }}>{match.score}</span>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>/100</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{op.title}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                            {[op.organization, op.city, op.countryName || op.country].filter(Boolean).join(' · ')}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: vc, marginBottom: 3 }}>
                            {VERDICT_LABELS[match.verdict]}
                          </div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{match.mainReason}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexShrink: 0 }}>
                          {op.link && (
                            <a href={op.link} target="_blank" rel="noopener noreferrer"
                              style={s.linkBtn} onClick={e => e.stopPropagation()}>ver →</a>
                          )}
                          <button style={s.expandBtn}>{isExp ? '▲' : '▼'}</button>
                        </div>
                      </div>

                      {isExp && (
                        <div style={s.detail}>
                          {match.strengths?.length > 0 && (
                            <div style={{ marginBottom: 8 }}>
                              <div style={s.detailLabel}>💪 Pontos fortes</div>
                              {match.strengths.map((str, i) => (
                                <div key={i} style={{ fontSize: 12, color: '#6ef3a5', padding: '2px 0' }}>✓ {str}</div>
                              ))}
                            </div>
                          )}
                          {match.challenges?.length > 0 && (
                            <div style={{ marginBottom: 8 }}>
                              <div style={s.detailLabel}>⚠ Desafios</div>
                              {match.challenges.map((c, i) => (
                                <div key={i} style={{ fontSize: 12, color: '#ffcf5c', padding: '2px 0' }}>→ {c}</div>
                              ))}
                            </div>
                          )}
                          {match.angle && (
                            <div style={s.angleBox}>
                              <div style={s.detailLabel}>🎯 Ângulo de candidatura</div>
                              <div style={{ fontSize: 13, color: '#fff', marginTop: 6, lineHeight: 1.5 }}>{match.angle}</div>
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
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  wrap: {
    background: '#0a0a0a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  toggleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 18px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  title: { fontSize: 14, fontWeight: 700, color: '#60b4e8' },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  chevron: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  body: { padding: '0 18px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' },
  selectors: {
    display: 'grid', gridTemplateColumns: '1fr 1fr auto',
    gap: 10, paddingTop: 14, marginBottom: 12,
  },
  selectorGroup: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' },
  select: {
    background: '#111', color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', cursor: 'pointer',
  },
  runBtn: {
    background: '#1A6994', color: '#fff', border: 'none',
    borderRadius: 8, padding: '0 18px', fontSize: 13,
    fontWeight: 800, alignSelf: 'flex-end', height: 40,
    whiteSpace: 'nowrap', cursor: 'pointer',
  },
  contextBar: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  badgeGreen: { fontSize: 11, color: '#6ef3a5', background: 'rgba(110,243,165,0.08)', border: '1px solid rgba(110,243,165,0.2)', borderRadius: 6, padding: '4px 10px' },
  badgeYellow: { fontSize: 11, color: '#ffcf5c', background: 'rgba(255,207,92,0.08)', border: '1px solid rgba(255,207,92,0.2)', borderRadius: 6, padding: '4px 10px' },
  badgeBlue: { fontSize: 11, color: '#60b4e8', background: 'rgba(26,105,148,0.1)', border: '1px solid rgba(26,105,148,0.2)', borderRadius: 6, padding: '4px 10px' },
  loadingBox: { textAlign: 'center', padding: '28px 20px', color: '#fff' },
  errorBox: {
    background: 'rgba(255,70,70,0.06)', border: '1px solid rgba(255,70,70,0.2)',
    borderRadius: 10, padding: '12px 16px', color: '#ff8a8a', fontSize: 13,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  retryBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  resultsHeader: { fontSize: 13 },
  matchCard: { background: '#111', border: '1px solid', borderRadius: 10, overflow: 'hidden' },
  matchTop: { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', cursor: 'pointer' },
  scoreBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, minWidth: 40 },
  linkBtn: { color: '#60b4e8', textDecoration: 'none', fontSize: 12, padding: '4px 8px', border: '1px solid rgba(96,180,232,0.3)', borderRadius: 6 },
  expandBtn: { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' },
  detail: { padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 },
  detailLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, fontWeight: 700 },
  angleBox: { background: 'rgba(26,105,148,0.08)', border: '1px solid rgba(26,105,148,0.2)', borderRadius: 8, padding: '10px 12px' },
}