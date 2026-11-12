// src/components/MatchPanel.tsx
// SOMA ODÉ v5 — Match: artista × oportunidades com score
// Self-contained — não depende de runMatch.ts nem matchHelpers.ts

import { useState, useEffect, useMemo } from 'react'
import { realOpportunities } from '../data/realOpportunities'
import type { Opportunity } from '../types/opportunity'
import { hasApiKey } from '../services/aiService'

const PROFILE_KEY = 'soma_artist_profile'

interface ArtistProfile {
  keywords: string[]
  disciplines: string[]
  themes: string[]
  targetCountries: string[]
  languages: string[]
  summary: string
}

interface MatchResult {
  percentage: number
  reasons: string[]
  warnings: string[]
}

interface ScoredOpp extends Opportunity {
  match: MatchResult
}

// ── Matching local simples ─────────────────────────────────────────────────

function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

function scoreMatch(artist: ArtistProfile, opp: Opportunity): MatchResult {
  let score = 0
  const reasons: string[] = []
  const warnings: string[] = []

  // País-alvo
  if (artist.targetCountries.includes(opp.country)) {
    score += 25
    reasons.push(`País-alvo: ${opp.country}`)
  } else {
    score += 5
  }

  // Disciplinas
  const oppDisc = (opp.disciplines || []).map(norm)
  const artistDisc = artist.disciplines.map(norm)
  const discMatch = artistDisc.filter(d => oppDisc.some(od => od.includes(d) || d.includes(od)))
  if (discMatch.length > 0) {
    score += 20 + Math.min(discMatch.length * 5, 10)
    reasons.push(`Disciplinas: ${discMatch.join(', ')}`)
  } else if (oppDisc.includes('multidisciplinar')) {
    score += 15
    reasons.push('Aceita multidisciplinar')
  } else {
    warnings.push('Disciplinas não coincidem diretamente')
  }

  // Keywords/temas
  const oppText = norm(`${opp.title} ${opp.description || ''} ${(opp.keywords || []).join(' ')} ${(opp.themes || []).join(' ')}`)
  const kwMatch = artist.keywords.filter(k => oppText.includes(norm(k)))
  if (kwMatch.length > 0) {
    score += Math.min(kwMatch.length * 5, 20)
    reasons.push(`Keywords: ${kwMatch.slice(0, 3).join(', ')}`)
  }

  // Idioma
  const oppLangs = (opp.languages || []).map(norm)
  const langMatch = artist.languages.filter(l => oppLangs.includes(norm(l)))
  if (langMatch.length > 0 || oppLangs.length === 0) {
    score += 10
    if (langMatch.length > 0) reasons.push(`Idioma: ${langMatch.join(', ')}`)
  } else {
    warnings.push(`Idiomas requeridos: ${oppLangs.join(', ')}`)
  }

  // Cobre custos
  if (opp.coversCosts) {
    score += 10
    reasons.push('Cobre custos')
  }

  return { percentage: Math.min(score, 100), reasons, warnings }
}

// ── Componente ─────────────────────────────────────────────────────────────

export default function MatchPanel() {
  const [profile, setProfile] = useState<ArtistProfile | null>(null)
  const [minScore, setMinScore] = useState(20)
  const [ran, setRan] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROFILE_KEY)
      if (stored) setProfile(JSON.parse(stored))
    } catch { /* */ }
  }, [])

  const results: ScoredOpp[] = useMemo(() => {
    if (!profile || !ran) return []
    return realOpportunities
      .map(opp => ({ ...opp, match: scoreMatch(profile, opp) }))
      .filter(o => o.match.percentage >= minScore)
      .sort((a, b) => b.match.percentage - a.match.percentage)
  }, [profile, minScore, ran])

  if (!profile) {
    return (
      <div style={st.page}>
        <h1 style={st.title}>🎯 Match</h1>
        <div style={st.empty}>
          Ainda não tens perfil. Vai ao ecrã <strong>Meu Perfil</strong> e responde às 4 perguntas primeiro.
        </div>
      </div>
    )
  }

  return (
    <div style={st.page}>
      <h1 style={st.title}>🎯 Match</h1>
      <p style={st.sub}>
        Cruza o teu perfil com {realOpportunities.length} oportunidades
        {!hasApiKey() && ' (modo offline)'}
      </p>

      {/* Controls */}
      <div style={st.controls}>
        <div>
          <label style={st.label}>Score mínimo</label>
          <select style={st.select} value={minScore} onChange={e => { setMinScore(Number(e.target.value)); setRan(true) }}>
            <option value={0}>Todos</option>
            <option value={20}>20+</option>
            <option value={40}>40+</option>
            <option value={60}>60+ (bons)</option>
            <option value={80}>80+ (fortes)</option>
          </select>
        </div>
        <button style={st.runBtn} onClick={() => setRan(true)}>
          ▶ Executar Match
        </button>
      </div>

      {/* Resultados */}
      {ran && results.length > 0 && (
        <div>
          <h2 style={st.sectionTitle}>{results.length} matches encontrados</h2>
          <div style={st.grid}>
            {results.map(opp => {
              const score = opp.match.percentage
              const scoreColor = score >= 70 ? '#6ef3a5' : score >= 40 ? '#ffcf5c' : '#f97066'
              return (
                <div key={opp.id} style={st.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 15, color: '#fff' }}>{opp.title}</h3>
                    <div style={{ fontSize: 22, fontWeight: 900, color: scoreColor }}>{score}%</div>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                    {opp.organization && `${opp.organization} · `}{opp.city || ''} ({opp.country})
                  </p>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginBottom: 10 }}>
                    <div style={{ height: 4, borderRadius: 2, background: scoreColor, width: `${score}%`, transition: 'width 0.5s' }} />
                  </div>
                  {opp.match.reasons.map((r, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#6ef3a5', marginBottom: 2 }}>✓ {r}</div>
                  ))}
                  {opp.match.warnings.map((w, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#ffcf5c', marginBottom: 2 }}>⚠ {w}</div>
                  ))}
                  {opp.url && (
                    <a href={opp.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: '#60b4e8', textDecoration: 'none', marginTop: 8, display: 'inline-block' }}>
                      Ver página →
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {ran && results.length === 0 && (
        <div style={st.empty}>Nenhum match com score ≥ {minScore}%. Tenta baixar o mínimo.</div>
      )}

      {!ran && (
        <div style={st.empty}>
          Clica "Executar Match" para cruzar o teu perfil com {realOpportunities.length} oportunidades
        </div>
      )}
    </div>
  )
}

const st: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '28px 20px', color: '#fff' },
  title: { margin: 0, fontSize: 28, color: '#60b4e8' },
  sub: { margin: '4px 0 20px', color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  controls: { display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 24, padding: '16px 18px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 },
  label: { display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  select: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '10px 12px', fontSize: 13, minWidth: 160 },
  runBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  sectionTitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: 600, margin: '0 0 12px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 },
  card: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px' },
  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 40, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 14 },
}
