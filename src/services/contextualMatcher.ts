// src/components/ContextualMatchPanel.tsx
// SOMA ODÉ — Match contextual on-demand
// Scoring LOCAL (instantâneo) + Análise SOMA individual (IA)
// Fechado por defeito — clica no header para abrir

import { useState } from 'react'
import SomaAnalysisModal, { type ArtistForAnalysis, type OpportunityForAnalysis } from './SomaAnalysisModal'

interface Props {
  artists: any[]
  opportunities: any[]
}

// ─── Scoring local ────────────────────────────────
// Sem API — corre no browser, resultado instantâneo

function safeArr(v: any): string[] {
  if (Array.isArray(v)) return v
  if (typeof v === 'string' && v.trim()) return v.split(',').map((s: string) => s.trim()).filter(Boolean)
  return []
}

function scoreOpportunity(op: any, artist: any, project: any): number {
  let score = 0

  const artistCountries = [
    ...safeArr(artist.targetCountries),
    ...safeArr(artist.cartografia?.rota?.corredores),
  ].map((c: string) => c.toLowerCase())

  const artistKeywords = [
    ...safeArr(artist.disciplines),
    ...safeArr(artist.keywords),
    ...safeArr(artist.cartografia?.raiz?.vocabulario),
    ...safeArr(project?.projectKeywords),
    project?.projectFormat || '',
  ].map((k: string) => k.toLowerCase()).filter(Boolean)

  const opText = [
    op.title, op.summary, op.organization,
    ...safeArr(op.disciplines),
    ...safeArr(op.keywords),
    op.type || '',
  ].join(' ').toLowerCase()

  const opCountry = (op.countryName || op.country || '').toLowerCase()

  // País: 30 pontos
  if (artistCountries.some(c => c.length > 2 && (opCountry.includes(c) || c.includes(opCountry)))) {
    score += 30
  }

  // Keywords: até 40 pontos
  const kwMatches = artistKeywords.filter(k => k.length > 3 && opText.includes(k))
  score += Math.min(40, kwMatches.length * 8)

  // Disciplina directa: 15 pontos
  const opDisciplines = safeArr(op.disciplines).map((d: string) => d.toLowerCase())
  const artistDisc = safeArr(artist.disciplines).map((d: string) => d.toLowerCase())
  if (opDisciplines.some(d => artistDisc.some(a => a.includes(d) || d.includes(a)))) {
    score += 15
  }

  // Custos cobertos: 10 pontos
  if (op.coversCosts) score += 10

  // Residência: bónus 5 pontos
  if (op.type === 'residencia' || op.type === 'residency') score += 5

  // Penalização: deadline passada
  if (op.deadline) {
    const days = Math.ceil((new Date(op.deadline).getTime() - Date.now()) / 86400000)
    if (days < 0) score -= 25
    else if (days < 30) score += 5 // urgente mas aberta: bónus
  }

  return Math.max(0, Math.min(100, score))
}

function getVerdict(score: number): string {
  if (score >= 75) return 'forte'
  if (score >= 55) return 'bom'
  if (score >= 35) return 'possivel'
  return 'fraco'
}

const VERDICT_COLORS: Record<string, string> = {
  forte: '#6ef3a5', bom: '#60b4e8', possivel: '#ffcf5c', fraco: 'rgba(255,255,255,0.3)',
}
const VERDICT_LABELS: Record<string, string> = {
  forte: '🔥 Forte', bom: '✅ Bom', possivel: '⚡ Possível', fraco: '— Fraco',
}

// ─── Componente ───────────────────────────────────

export default function ContextualMatchPanel({ artists, opportunities }: Props) {
  const [open, setOpen] = useState(false)
  const [artistId, setArtistId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [hasRun, setHasRun] = useState(false)
  const [analysisOp, setAnalysisOp] = useState<any>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)

  const [expandedId, setExpandedId] = useState<string | null>(null)

  const selectedArtist = artists.find(a => a.id === artistId) || null
  const projects = safeArr((selectedArtist as any)?.projects)
  const selectedProject = projects.find((p: any) => p.id === projectId) || null
  const hasDossier = Boolean(selectedProject?.dossierText)

  function handleArtistChange(id: string) {
    setArtistId(id); setProjectId(''); setResults([]); setHasRun(false)
  }

  function runMatch() {
    if (!selectedArtist) return
    const scored = opportunities
      .map(op => ({ op, score: scoreOpportunity(op, selectedArtist, selectedProject) }))
      .filter(r => r.score >= 20)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
    setResults(scored)
    setHasRun(true)
  }

  // Prepara o artista no formato exacto que SomaAnalysisModal espera
  const artistForAnalysis: ArtistForAnalysis | null = selectedArtist ? {
    name: selectedArtist.name || '',
    bio: selectedArtist.bio || '',
    origin: selectedArtist.origin || '',
    base: selectedArtist.base || '',
    disciplines: safeArr(selectedArtist.disciplines),
    languages: safeArr(selectedArtist.languages),
    keywords: safeArr(selectedArtist.keywords),
    themes: safeArr(selectedArtist.themes),
    cartografia: selectedArtist.cartografia || {},
    project: selectedProject ? {
      name: selectedProject.name || '',
      format: selectedProject.projectFormat || selectedProject.format || '',
      summary: selectedProject.summary || '',
      keywords: safeArr(selectedProject.projectKeywords),
      territories: selectedProject.projectTerritories || '',
      targetAudience: selectedProject.projectTargetAudience || '',
    } : undefined,
  } : null

  const verdictCounts = results.reduce((acc, r) => {
    const v = getVerdict(r.score)
    acc[v] = (acc[v] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div style={s.wrap}>

      {/* Header toggle */}
      <div style={s.header} onClick={() => setOpen(o => !o)}>
        <div style={s.headerLeft}>
          <span>🎯</span>
          <div>
            <span style={s.title}>Match Contextual</span>
            <span style={s.subtitle}>
              {open
                ? ' — selecciona artista + projecto e clica Encontrar'
                : ' — encontra oportunidades por perfil de artista'}
            </span>
          </div>
        </div>
        <span style={s.chevron}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={s.body}>

          {/* Selectors */}
          <div style={s.selectors}>
            <div style={s.group}>
              <label style={s.label}>Artista</label>
              <select style={s.select} value={artistId} onChange={e => handleArtistChange(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {artists.map(a => (
                  <option key={a.id} value={a.id}>{a.name || 'Artista'}</option>
                ))}
              </select>
            </div>

            <div style={s.group}>
              <label style={s.label}>Projecto (opcional)</label>
              <select style={s.select} value={projectId}
                onChange={e => { setProjectId(e.target.value); setResults([]); setHasRun(false) }}
                disabled={!artistId}>
                <option value="">— Sem projecto específico —</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name || 'Projecto'}{p.dossierText ? ' 📄' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              style={{ ...s.runBtn, opacity: !artistId ? 0.5 : 1 }}
              onClick={runMatch}
              disabled={!artistId}
            >
              🔍 Encontrar
            </button>
          </div>

          {/* Contexto usado */}
          {selectedArtist && (
            <div style={s.contextBar}>
              <span style={s.badgeBlue}>
                📊 {safeArr(selectedArtist.disciplines).join(', ') || 'disciplinas'} · {safeArr(selectedArtist.targetCountries).slice(0, 4).join(', ') || 'países'}
              </span>
              {selectedProject && (
                <span style={hasDossier ? s.badgeGreen : s.badgeGray}>
                  {hasDossier ? '📄 Dossier incluído' : `📁 ${selectedProject.name}`}
                </span>
              )}
              <span style={s.badgeGray}>{opportunities.length} oportunidades na base</span>
            </div>
          )}

          {/* Resultados */}
          {hasRun && (
            <div style={{ marginTop: 14 }}>
              <div style={s.resultsHeader}>
                <strong style={{ color: '#fff', fontSize: 13 }}>
                  {results.length} oportunidades relevantes encontradas
                </strong>
                <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' as const }}>
                  {['forte', 'bom', 'possivel'].map(v =>
                    verdictCounts[v] ? (
                      <span key={v} style={{ fontSize: 11, color: VERDICT_COLORS[v], fontWeight: 700 }}>
                        {VERDICT_LABELS[v]} ({verdictCounts[v]})
                      </span>
                    ) : null
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {results.map(({ op, score }) => {
                  const verdict = getVerdict(score)
                  const vc = VERDICT_COLORS[verdict]
                  const days = op.deadline
                    ? Math.ceil((new Date(op.deadline).getTime() - Date.now()) / 86400000)
                    : null

                  return (
                    <div key={op.id} style={{ ...s.card, borderColor: `${vc}35`, flexDirection: 'column', alignItems: 'stretch' }}>
                      {/* ── Linha principal ── */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <div style={s.cardLeft}
                          onClick={() => setExpandedId(expandedId === op.id ? null : op.id)}
                          role="button" tabIndex={0}
                        >
                          <span style={{ fontSize: 22, fontWeight: 900, color: vc, minWidth: 38, textAlign: 'center' as const }}>
                            {score}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{op.title}</div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                              {[op.organization, op.city, op.countryName || op.country].filter(Boolean).join(' · ')}
                              {days !== null && days >= 0 && (
                                <span style={{ color: days < 30 ? '#ff8a8a' : '#ffcf5c', marginLeft: 8 }}>
                                  ⏱ {days}d
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: 10, color: vc, fontWeight: 700 }}>{VERDICT_LABELS[verdict]}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                          {artistForAnalysis && (
                            <button style={s.analysisBtn}
                              onClick={() => { setAnalysisOp(op); setShowAnalysis(true) }}>
                              🔬 Análise
                            </button>
                          )}
                          <button
                            style={{ ...s.expandBtn, color: expandedId === op.id ? '#60b4e8' : 'rgba(255,255,255,0.4)' }}
                            onClick={() => setExpandedId(expandedId === op.id ? null : op.id)}
                          >
                            {expandedId === op.id ? '▲' : '▼'}
                          </button>
                        </div>
                      </div>

                      {/* ── Detalhes expandidos ── */}
                      {expandedId === op.id && (
                        <div style={s.details}>
                          {/* Tags */}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 10 }}>
                            {op.type && <span style={s.tag}>{op.type}</span>}
                            {op.coversCosts && <span style={{ ...s.tag, color: '#6ef3a5', borderColor: 'rgba(110,243,165,0.3)' }}>✅ Custos cobertos</span>}
                            {op.deadline && (
                              <span style={{ ...s.tag, color: days !== null && days < 30 ? '#ff8a8a' : '#ffcf5c' }}>
                                📅 Deadline: {new Date(op.deadline).toLocaleDateString('pt-PT')}
                                {days !== null && days >= 0 && ` (${days} dias)`}
                              </span>
                            )}
                            {op.openingDate && (
                              <span style={s.tag}>🗓 Abertura: {new Date(op.openingDate).toLocaleDateString('pt-PT')}</span>
                            )}
                          </div>

                          {/* Descrição */}
                          {(op.summary || op.description) && (
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, marginBottom: 12 }}>
                              {op.summary || op.description}
                            </p>
                          )}

                          {/* Notas internas */}
                          {op.notes && (
                            <div style={{ fontSize: 11, color: 'rgba(255,207,92,0.8)', background: 'rgba(255,207,92,0.06)', border: '1px solid rgba(255,207,92,0.2)', borderRadius: 6, padding: '6px 10px', marginBottom: 10 }}>
                              📝 {op.notes}
                            </div>
                          )}

                          {/* Acções */}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                            {op.link && (
                              <a
                                href={op.link.startsWith('http') ? op.link : `https://${op.link}`}
                                target="_blank" rel="noopener noreferrer"
                                style={s.detailLink}
                              >
                                🔗 Ver edital completo
                              </a>
                            )}
                            <button
                              style={s.pipelineBtn}
                              onClick={() => {
                                const key = 'soma-pipeline-proposals'
                                const existing = JSON.parse(localStorage.getItem(key) || '[]')
                                const already = existing.find((p: any) => p.opId === op.id && p.artistId === artistId)
                                if (already) { alert('Esta oportunidade já está no pipeline para este artista.'); return }
                                const proposal = {
                                  id: crypto.randomUUID(),
                                  opId: op.id,
                                  opTitle: op.title,
                                  artistId,
                                  artistName: selectedArtist?.name || '',
                                  score,
                                  status: 'a_candidatar',
                                  addedAt: new Date().toISOString(),
                                }
                                localStorage.setItem(key, JSON.stringify([...existing, proposal]))
                                alert(`✅ "${op.title}" adicionada ao pipeline para ${selectedArtist?.name}`)
                              }}
                            >
                              ➕ Adicionar ao pipeline
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {results.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                  Sem oportunidades relevantes. Verifica as disciplinas e países do artista.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de análise individual */}
      {showAnalysis && analysisOp && artistForAnalysis && (
        <SomaAnalysisModal
          opportunity={analysisOp}
          artist={artistForAnalysis}
          onClose={() => { setShowAnalysis(false); setAnalysisOp(null) }}
        />
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  wrap: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', cursor: 'pointer', userSelect: 'none' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  title: { fontSize: 14, fontWeight: 700, color: '#60b4e8' },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  chevron: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  body: { padding: '0 18px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' },
  selectors: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, paddingTop: 14, marginBottom: 10 },
  group: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' },
  select: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', cursor: 'pointer' },
  runBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '0 18px', fontSize: 13, fontWeight: 800, alignSelf: 'flex-end', height: 40, cursor: 'pointer', whiteSpace: 'nowrap' },
  contextBar: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  badgeBlue: { fontSize: 11, color: '#60b4e8', background: 'rgba(26,105,148,0.1)', border: '1px solid rgba(26,105,148,0.2)', borderRadius: 6, padding: '3px 9px' },
  badgeGreen: { fontSize: 11, color: '#6ef3a5', background: 'rgba(110,243,165,0.08)', border: '1px solid rgba(110,243,165,0.2)', borderRadius: 6, padding: '3px 9px' },
  badgeGray: { fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '3px 9px' },
  resultsHeader: { marginBottom: 4 },
  card: { background: '#111', border: '1px solid', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  cardLeft: { display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0, cursor: 'pointer' },
  linkBtn: { color: '#60b4e8', textDecoration: 'none', fontSize: 11, padding: '4px 8px', border: '1px solid rgba(96,180,232,0.3)', borderRadius: 6, whiteSpace: 'nowrap' },
  analysisBtn: { background: 'rgba(26,105,148,0.15)', color: '#60b4e8', border: '1px solid rgba(26,105,148,0.3)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' },
  expandBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' },
  details: { borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 10, paddingTop: 12 },
  tag: { fontSize: 11, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '2px 8px' },
  detailLink: { display: 'inline-flex', alignItems: 'center', gap: 4, color: '#60b4e8', textDecoration: 'none', fontSize: 12, padding: '6px 12px', border: '1px solid rgba(96,180,232,0.3)', borderRadius: 6, fontWeight: 600 },
  pipelineBtn: { background: 'rgba(110,243,165,0.1)', color: '#6ef3a5', border: '1px solid rgba(110,243,165,0.3)', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' },
}