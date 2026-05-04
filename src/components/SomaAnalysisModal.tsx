// src/components/SomaAnalysisModal.tsx
// SOMA ODÉ — Análise profunda Gemini: oportunidade × projecto × artista
// Devolve: encaixe, argumentos a usar, onde pode falhar, como adaptar o texto

import { useState } from 'react'

// ─── Tipos ────────────────────────────────────────────────

export interface OpportunityForAnalysis {
  title: string
  organization?: string
  type?: string
  country?: string
  countryName?: string
  city?: string
  summary?: string
  description?: string
  link?: string
  disciplines?: string[]
  keywords?: string[]
  coversCosts?: boolean
  deadline?: string
}

export interface ArtistForAnalysis {
  name: string
  bio?: string
  origin?: string
  base?: string
  disciplines?: string[]
  languages?: string[]
  keywords?: string[]
  themes?: string[]
  cartografia?: {
    raiz?: { origins?: string; tensions?: string; vocabulario?: string[]; legacyOfResistance?: string }
    campo?: { audienceProfiles?: string; motivation?: string; audienceTerritories?: string[] }
    teia?: { pares?: string; legitimacy?: string; influenceNetworks?: string; ethicalAlliances?: string }
    rota?: { gaps?: string; corredores?: string[]; expansionPlan?: string }
    somaPositioning?: string
  }
  project?: {
    name?: string
    format?: string
    summary?: string
    keywords?: string[]
    territories?: string
    targetAudience?: string
  }
}

interface SomaAnalysis {
  score: number // 0-100
  verdict: 'forte' | 'medio' | 'fraco' | 'nao_recomendado'
  encaixe: string // parágrafo de 3-4 frases
  argumentos: string[] // 3-5 argumentos a usar na candidatura
  alertas: string[] // 2-3 onde pode falhar
  comoAdaptar: string[] // 2-4 sugestões concretas de como adaptar o texto
  pitchSentence: string // 1 frase de abertura para a candidatura
}

interface Props {
  opportunity: OpportunityForAnalysis
  artist: ArtistForAnalysis
  onClose: () => void
}

// ─── Função principal de análise ─────────────────────────

async function runSomaAnalysis(
  opportunity: OpportunityForAnalysis,
  artist: ArtistForAnalysis,
): Promise<SomaAnalysis> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada')

  const c = artist.cartografia || {}
  const project = artist.project

  const prompt = `És um curador especializado em arte contemporânea afro-diaspórica e gestor cultural.
Trabalhas para a SOMA Cultura (Barcelona), produtora que representa artistas negros, migrantes e LGBTQIA+.

Analisa a compatibilidade entre este projecto artístico e esta oportunidade cultural.
Sê honesto, directo e útil — não genérico.

═══════════════════════════
ARTISTA: ${artist.name}
═══════════════════════════
Bio: ${artist.bio || 'não preenchida'}
Origem: ${artist.origin || '—'} · Base: ${artist.base || '—'}
Disciplinas: ${(artist.disciplines || []).join(', ') || '—'}
Idiomas: ${(artist.languages || []).join(', ') || '—'}
Keywords: ${(artist.keywords || []).join(', ') || '—'}

CARTOGRAFIA SOMA:
- Origens: ${c.raiz?.origins || '—'}
- Tensões: ${c.raiz?.tensions || '—'}
- Vocabulário: ${(c.raiz?.vocabulario || []).join(', ') || '—'}
- Legado resistência: ${c.raiz?.legacyOfResistance || '—'}
- Perfis audiência: ${c.campo?.audienceProfiles || '—'}
- Territórios: ${(c.campo?.audienceTerritories || []).join(', ') || '—'}
- Pares: ${c.teia?.pares || '—'}
- Redes: ${c.teia?.influenceNetworks || '—'}
- Alianças éticas: ${c.teia?.ethicalAlliances || '—'}
- Gaps: ${c.rota?.gaps || '—'}
- Corredores: ${(c.rota?.corredores || []).join(', ') || '—'}
- Posicionamento SOMA: ${c.somaPositioning || '—'}

${project ? `PROJECTO: ${project.name || '—'}
Formato: ${project.format || '—'}
Resumo: ${project.summary || '—'}
Keywords: ${(project.keywords || []).join(', ') || '—'}
Territórios: ${project.territories || '—'}
Público-alvo: ${project.targetAudience || '—'}` : ''}

═══════════════════════════
OPORTUNIDADE: ${opportunity.title}
═══════════════════════════
Organização: ${opportunity.organization || '—'}
Tipo: ${opportunity.type || '—'}
País/Cidade: ${[opportunity.city, opportunity.countryName || opportunity.country].filter(Boolean).join(', ') || '—'}
Disciplinas aceites: ${(opportunity.disciplines || []).join(', ') || '—'}
Keywords: ${(opportunity.keywords || []).join(', ') || '—'}
Cobre custos: ${opportunity.coversCosts ? 'Sim' : 'Não'}
Deadline: ${opportunity.deadline || '—'}
Descrição: ${opportunity.summary || opportunity.description || '—'}

═══════════════════════════
TAREFA
═══════════════════════════
Analisa com profundidade e honestidade.
Score: 0-100 (só baseado no encaixe real, não na qualidade do projecto)
Verdict: "forte" (>70), "medio" (45-70), "fraco" (25-45), "nao_recomendado" (<25)

Responde APENAS com JSON:
{
  "score": número,
  "verdict": "forte|medio|fraco|nao_recomendado",
  "encaixe": "3-4 frases em português explicando o encaixe real entre projecto e oportunidade. Menciona elementos específicos do projecto e da oportunidade.",
  "argumentos": [
    "Argumento concreto 1 a usar na candidatura — específico, não genérico",
    "Argumento 2",
    "Argumento 3"
  ],
  "alertas": [
    "Onde pode falhar ou ponto fraco específico desta candidatura",
    "Segundo alerta"
  ],
  "comoAdaptar": [
    "Sugestão concreta de como adaptar o texto do projecto para esta oportunidade",
    "Segunda sugestão"
  ],
  "pitchSentence": "Uma frase de abertura para a carta de motivação — concreta, não genérica"
}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Gemini error: ${JSON.stringify(err).substring(0, 200)}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  const jsonMatch = clean.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Sem JSON na resposta')

  return JSON.parse(jsonMatch[0]) as SomaAnalysis
}

// ─── Componente ───────────────────────────────────────────

export default function SomaAnalysisModal({ opportunity, artist, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<SomaAnalysis | null>(null)
  const [error, setError] = useState('')
  const [started, setStarted] = useState(false)

  async function runAnalysis() {
    setLoading(true)
    setError('')
    setStarted(true)
    try {
      const result = await runSomaAnalysis(opportunity, artist)
      setAnalysis(result)
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar análise.')
    } finally {
      setLoading(false)
    }
  }

  const verdictColor = {
    forte: '#6ef3a5',
    medio: '#ffcf5c',
    fraco: '#ff9f5c',
    nao_recomendado: '#ff8a8a',
  }

  const verdictLabel = {
    forte: '✅ Forte encaixe',
    medio: '⚡ Encaixe médio',
    fraco: '⚠️ Encaixe fraco',
    nao_recomendado: '❌ Não recomendado',
  }

  return (
    <div style={st.overlay}>
      <div style={st.modal}>

        {/* HEADER */}
        <div style={st.header}>
          <div>
            <div style={st.headerLabel}>Análise SOMA</div>
            <h2 style={st.title}>{opportunity.title}</h2>
            <p style={st.subtitle}>
              {[opportunity.organization, opportunity.city, opportunity.countryName || opportunity.country].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button style={st.closeBtn} onClick={onClose}>Fechar</button>
        </div>

        {/* PROJECTO + ARTISTA */}
        <div style={st.context}>
          <span style={st.contextTag}>🎤 {artist.name}</span>
          {artist.project?.name && <span style={st.contextTag}>📁 {artist.project.name}</span>}
          {opportunity.type && <span style={st.contextTag}>🏷 {opportunity.type}</span>}
          {opportunity.coversCosts && <span style={{ ...st.contextTag, color: '#6ef3a5', borderColor: 'rgba(110,243,165,0.3)' }}>custos cobertos</span>}
        </div>

        {/* ESTADO INICIAL */}
        {!started && (
          <div style={st.startBox}>
            <p style={st.startText}>
              O Gemini vai analisar a compatibilidade entre o projecto de <strong>{artist.name}</strong> e esta oportunidade.
              Vais receber: score de encaixe, argumentos a usar, alertas e como adaptar o texto.
            </p>
            <button style={st.runBtn} onClick={runAnalysis}>
              🔍 Gerar Análise SOMA
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div style={st.loadingBox}>
            <div style={st.spinner}>⟳</div>
            <p style={st.loadingText}>Gemini está a analisar o projecto e a oportunidade...</p>
            <p style={st.loadingSubtext}>Cruzando Cartografia SOMA × critérios da oportunidade</p>
          </div>
        )}

        {/* ERRO */}
        {error && (
          <div style={st.errorBox}>
            <p>⚠️ {error}</p>
            <button style={st.retryBtn} onClick={runAnalysis}>Tentar novamente</button>
          </div>
        )}

        {/* ANÁLISE */}
        {analysis && !loading && (
          <div>

            {/* SCORE + VERDICT */}
            <div style={st.scoreBox}>
              <div style={st.scoreCircle}>
                <span style={{ ...st.scoreNum, color: verdictColor[analysis.verdict] }}>{analysis.score}</span>
                <span style={st.scoreLabel}>/ 100</span>
              </div>
              <div>
                <div style={{ ...st.verdictBadge, color: verdictColor[analysis.verdict], borderColor: `${verdictColor[analysis.verdict]}40`, background: `${verdictColor[analysis.verdict]}10` }}>
                  {verdictLabel[analysis.verdict]}
                </div>
                <p style={st.encaixe}>{analysis.encaixe}</p>
              </div>
            </div>

            {/* PITCH */}
            <div style={st.pitchBox}>
              <div style={st.sectionLabel}>✍️ Frase de abertura para a candidatura</div>
              <p style={st.pitchText}>"{analysis.pitchSentence}"</p>
              <button style={st.copyBtn} onClick={() => navigator.clipboard.writeText(analysis.pitchSentence)}>
                📋 Copiar
              </button>
            </div>

            {/* ARGUMENTOS */}
            <div style={st.section}>
              <div style={st.sectionLabel}>💪 Argumentos a usar na candidatura</div>
              <div style={st.itemList}>
                {analysis.argumentos.map((arg, i) => (
                  <div key={i} style={st.itemGreen}>
                    <span style={st.itemDot}>✓</span>
                    <span>{arg}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ALERTAS */}
            <div style={st.section}>
              <div style={st.sectionLabel}>⚠️ Onde pode falhar</div>
              <div style={st.itemList}>
                {analysis.alertas.map((alerta, i) => (
                  <div key={i} style={st.itemYellow}>
                    <span style={st.itemDot}>⚠</span>
                    <span>{alerta}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* COMO ADAPTAR */}
            <div style={st.section}>
              <div style={st.sectionLabel}>🔧 Como adaptar o texto do projecto</div>
              <div style={st.itemList}>
                {analysis.comoAdaptar.map((sug, i) => (
                  <div key={i} style={st.itemBlue}>
                    <span style={st.itemDot}>→</span>
                    <span>{sug}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* LINK */}
            {opportunity.link && (
              <div style={st.linkBox}>
                <a href={opportunity.link} target="_blank" rel="noopener noreferrer" style={st.link}>
                  Ver edital oficial →
                </a>
              </div>
            )}

            {/* REGENERAR */}
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <button style={st.retryBtn} onClick={runAnalysis}>↺ Regenerar análise</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { width: 'min(780px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: '#000', border: '1px solid #1A6994', borderRadius: 16, padding: 28, color: '#fff' },

  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' },
  headerLabel: { fontSize: 11, color: '#60b4e8', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 },
  title: { margin: 0, fontSize: 22, color: '#fff' },
  subtitle: { margin: '4px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  closeBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', flexShrink: 0 },

  context: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 },
  contextTag: { fontSize: 12, color: '#60b4e8', background: 'rgba(26,105,148,0.15)', border: '1px solid rgba(26,105,148,0.25)', borderRadius: 6, padding: '3px 10px' },

  startBox: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 28, textAlign: 'center' },
  startText: { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 },
  runBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 800, cursor: 'pointer' },

  loadingBox: { textAlign: 'center', padding: '40px 20px' },
  spinner: { fontSize: 32, color: '#60b4e8', animation: 'spin 1s linear infinite', marginBottom: 14 },
  loadingText: { color: '#fff', fontSize: 15, marginBottom: 8 },
  loadingSubtext: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },

  errorBox: { background: 'rgba(255,70,70,0.08)', border: '1px solid rgba(255,70,70,0.25)', borderRadius: 10, padding: 16, textAlign: 'center', color: '#ff8a8a' },
  retryBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer', marginTop: 10 },

  scoreBox: { display: 'flex', gap: 20, alignItems: 'flex-start', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 16 },
  scoreCircle: { display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '14px 18px' },
  scoreNum: { fontSize: 40, fontWeight: 900, lineHeight: 1 },
  scoreLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  verdictBadge: { display: 'inline-block', fontSize: 13, fontWeight: 700, border: '1px solid', borderRadius: 8, padding: '4px 12px', marginBottom: 10 },
  encaixe: { color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.6, margin: 0 },

  pitchBox: { background: 'rgba(26,105,148,0.08)', border: '1px solid rgba(26,105,148,0.25)', borderRadius: 12, padding: 18, marginBottom: 14 },
  pitchText: { color: '#fff', fontSize: 15, fontStyle: 'italic', lineHeight: 1.6, margin: '10px 0' },
  copyBtn: { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer' },

  section: { marginBottom: 14 },
  sectionLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 },
  itemList: { display: 'flex', flexDirection: 'column', gap: 8 },
  itemGreen: { display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(110,243,165,0.06)', border: '1px solid rgba(110,243,165,0.15)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 },
  itemYellow: { display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(255,207,92,0.06)', border: '1px solid rgba(255,207,92,0.15)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 },
  itemBlue: { display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(26,105,148,0.08)', border: '1px solid rgba(26,105,148,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 },
  itemDot: { flexShrink: 0, fontWeight: 700, marginTop: 1 },

  linkBox: { marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' },
  link: { color: '#60b4e8', textDecoration: 'none', fontSize: 14, fontWeight: 600 },
}