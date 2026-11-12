// src/components/ArtistProfileSetup.tsx
// SOMA ODÉ v5 — Perfil artístico: 4 perguntas → IA gera perfil estruturado

import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { generateArtistProfile, hasApiKey, type ArtistProfileAI } from '../services/aiService'

const STORAGE_KEY = 'soma_artist_profile'
const ANSWERS_KEY = 'soma_artist_answers'

type Step = 0 | 1 | 2 | 3 | 'generating' | 'done'

const QUESTIONS = [
  { key: 'identity', emoji: '🎤', title: 'Quem és?', placeholder: 'Conta-nos sobre ti: o que fazes, de onde vens, que tipo de arte crias, o que te torna único/a...\n\nEx: "Sou cantora brasileira a viver em Barcelona, faço MPB com influências de jazz e música africana. Canto em português e espanhol."' },
  { key: 'audience', emoji: '👥', title: 'Para quem?', placeholder: 'Quem é o teu público? Quem vai aos teus shows, quem compra/ouve o teu trabalho?\n\nEx: "O meu público são pessoas entre 25-45 anos, interessadas em world music, comunidade brasileira na Europa, programadores de festivais multiculturais."' },
  { key: 'power', emoji: '🏛️', title: 'Quem manda no teu mundo?', placeholder: 'Que festivais, curadores, media, playlists ou instituições decidem quem aparece no teu nicho?\n\nEx: "Os festivais WOMEX, Babel Med, Visa for Music são onde se decide. Curadores como X e Y. Playlists de world music no Spotify."' },
  { key: 'direction', emoji: '🧭', title: 'Para onde queres ir?', placeholder: 'Que países, que palcos, que tipo de carreira queres construir nos próximos 2 anos?\n\nEx: "Quero fazer uma tournée pela Europa — França, Alemanha, Holanda. Candidatar-me a residências artísticas. Tocar em festivais de verão."' },
]

export default function ArtistProfileSetup() {
  const { user } = useAuth()
  const [step, setStep] = useState<Step>(0)
  const [answers, setAnswers] = useState({ identity: '', audience: '', power: '', direction: '' })
  const [profile, setProfile] = useState<ArtistProfileAI | null>(null)
  const [error, setError] = useState('')

  // Carregar dados salvos
  useEffect(() => {
    try {
      const savedAnswers = localStorage.getItem(ANSWERS_KEY)
      if (savedAnswers) setAnswers(JSON.parse(savedAnswers))
      const savedProfile = localStorage.getItem(STORAGE_KEY)
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile))
        setStep('done')
      }
    } catch { /* ignora */ }
  }, [])

  function updateAnswer(key: string, value: string) {
    setAnswers(prev => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(ANSWERS_KEY, JSON.stringify(next))
      return next
    })
  }

  async function generateProfile() {
    setStep('generating')
    setError('')
    try {
      const result = await generateArtistProfile(answers)
      setProfile(result)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result))
      setStep('done')
    } catch (e: any) {
      setError(e.message || 'Erro ao gerar perfil')
      setStep(3)
    }
  }

  function reset() {
    setStep(0)
    setProfile(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const currentQ = typeof step === 'number' ? QUESTIONS[step] : null

  // ── Vista: Perfil gerado ────────────────────────────────────────────────
  if (step === 'done' && profile) {
    return (
      <div style={st.page}>
        <div style={st.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h1 style={st.title}>O teu perfil SOMA</h1>
              <p style={st.sub}>Gerado a partir das tuas respostas{hasApiKey() ? ' com IA' : ' (modo offline)'}</p>
            </div>
            <button style={st.secondaryBtn} onClick={reset}>Refazer</button>
          </div>

          <div style={st.summary}>{profile.summary}</div>

          <div style={st.grid}>
            <ProfileBlock title="Disciplinas" items={profile.disciplines} color="#60b4e8" />
            <ProfileBlock title="Keywords" items={profile.keywords} color="#c084fc" />
            <ProfileBlock title="Temas" items={profile.themes} color="#ffcf5c" />
            <ProfileBlock title="Países-alvo" items={profile.targetCountries} color="#6ef3a5" />
            <ProfileBlock title="Idiomas" items={profile.languages} color="#f97066" />
          </div>

          <div style={st.sectionGrid}>
            <div style={st.infoBox}>
              <h3 style={st.infoTitle}>👥 Perfil de audiência</h3>
              <p style={st.infoText}>{profile.audienceProfile}</p>
            </div>
            <div style={st.infoBox}>
              <h3 style={st.infoTitle}>🏛️ Mapa de poder</h3>
              <p style={st.infoText}>{profile.powerMap}</p>
            </div>
            <div style={{ ...st.infoBox, gridColumn: '1 / -1' }}>
              <h3 style={st.infoTitle}>🧭 Posicionamento</h3>
              <p style={st.infoText}>{profile.positioningAdvice}</p>
            </div>
          </div>

          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 20 }}>
            Este perfil alimenta o Radar e o Match — quanto mais completas as respostas, melhor os resultados.
          </p>
        </div>
      </div>
    )
  }

  // ── Vista: A gerar... ───────────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <div style={st.page}>
        <div style={{ ...st.card, textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 1.5s infinite' }}>🔮</div>
          <h2 style={{ color: '#fff', margin: '0 0 8px' }}>A gerar o teu perfil...</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>A IA está a analisar as tuas respostas</p>
        </div>
      </div>
    )
  }

  // ── Vista: Perguntas (passo a passo) ────────────────────────────────────
  const q = currentQ!
  const answerKey = q.key as keyof typeof answers
  const canAdvance = answers[answerKey].trim().length > 10
  const isLast = step === 3

  return (
    <div style={st.page}>
      <div style={st.card}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {QUESTIONS.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i <= (step as number) ? '#1A6994' : 'rgba(255,255,255,0.1)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Pergunta */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>{q.emoji}</div>
          <h2 style={{ color: '#fff', margin: '0 0 4px', fontSize: 24 }}>{q.title}</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Pergunta {(step as number) + 1} de 4</p>
        </div>

        {/* Resposta */}
        <textarea
          style={st.textarea}
          value={answers[answerKey]}
          onChange={e => updateAnswer(answerKey, e.target.value)}
          placeholder={q.placeholder}
          rows={6}
          autoFocus
        />

        {error && <div style={st.errorMsg}>{error}</div>}

        {/* Navegação */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {(step as number) > 0 && (
            <button style={st.secondaryBtn} onClick={() => setStep(((step as number) - 1) as Step)}>← Voltar</button>
          )}
          <div style={{ flex: 1 }} />
          {isLast ? (
            <button style={{ ...st.primaryBtn, opacity: canAdvance ? 1 : 0.4 }}
              disabled={!canAdvance} onClick={generateProfile}>
              Gerar o meu perfil ✨
            </button>
          ) : (
            <button style={{ ...st.primaryBtn, opacity: canAdvance ? 1 : 0.4 }}
              disabled={!canAdvance} onClick={() => setStep(((step as number) + 1) as Step)}>
              Seguinte →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-componente: bloco de tags ─────────────────────────────────────────

function ProfileBlock({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (!items.length) return null
  return (
    <div>
      <h4 style={{ margin: '0 0 6px', fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</h4>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {items.map((item, i) => (
          <span key={i} style={{
            fontSize: 12, padding: '3px 10px', borderRadius: 20,
            background: `${color}15`, color, border: `1px solid ${color}30`,
          }}>{item}</span>
        ))}
      </div>
    </div>
  )
}

// ── Estilos ──────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  page: { maxWidth: 700, margin: '0 auto', padding: '32px 20px' },
  card: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px 24px' },
  title: { margin: 0, fontSize: 24, color: '#fff', fontWeight: 700 },
  sub: { margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  summary: { fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginBottom: 20, padding: '14px 16px', background: 'rgba(26,105,148,0.08)', border: '1px solid rgba(26,105,148,0.2)', borderRadius: 10 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 20 },
  sectionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  infoBox: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' },
  infoTitle: { margin: '0 0 6px', fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  infoText: { margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 },
  textarea: { width: '100%', minHeight: 140, background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: 16, fontSize: 14, lineHeight: 1.6, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' as const },
  primaryBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  secondaryBtn: { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer' },
  errorMsg: { padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 12, border: '1px solid rgba(255,100,100,0.3)', color: '#ff8a8a', background: 'rgba(255,100,100,0.08)' },
}
