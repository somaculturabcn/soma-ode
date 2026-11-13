// src/components/LandingPage.tsx
// SOMA ODÉ — Landing page pública

import { useState } from 'react'

type Props = {
  onLogin: () => void
  onRegister: () => void
  onRadar: () => void
}

export default function LandingPage({ onLogin, onRegister, onRadar }: Props) {
  const [showVideo, setShowVideo] = useState(false)

  return (
    <div style={st.page}>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <header style={st.hero}>
        <div style={st.heroContent}>
          <div style={st.logoRow}>
            <span style={st.logo}>SOMA</span>
            <span style={st.logoAccent}>ODÉ</span>
          </div>
          <h1 style={st.headline}>
            Conecta o teu talento<br />com o mundo
          </h1>
          <p style={st.subheadline}>
            Plataforma de gestão cultural que cruza artistas com festivais,
            residências e editais internacionais. Feita por e para artistas
            negros, migrantes e LGBTQIA+.
          </p>
          <div style={st.heroButtons}>
            <button style={st.primaryBtn} onClick={onRegister}>
              Criar conta grátis →
            </button>
            <button style={st.secondaryBtn} onClick={onLogin}>
              Já tenho conta
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <button style={{ ...st.secondaryBtn, border: 'none', fontSize: 13, padding: '8px 16px', color: 'rgba(255,255,255,0.4)' }} onClick={onRadar}>
              📡 Explorar Radar sem conta
            </button>
          </div>
          <p style={st.heroNote}>
            100% grátis · Sem cartão de crédito · Dados protegidos
          </p>
        </div>
      </header>

      {/* ── O que é ──────────────────────────────────────────────── */}
      <section style={st.section}>
        <h2 style={st.sectionTitle}>O que é o SOMA ODÉ?</h2>
        <p style={st.sectionText}>
          O SOMA ODÉ é uma ferramenta criada pela <strong style={{ color: '#60b4e8' }}>SOMA Cultura</strong> (Barcelona)
          para ajudar artistas independentes a encontrar oportunidades internacionais —
          festivais, residências artísticas, editais, open calls e bolsas —
          de forma organizada e inteligente.
        </p>
        <p style={st.sectionText}>
          Em vez de perder horas a procurar editais espalhados pela internet,
          o SOMA ODÉ cruza o teu perfil artístico com mais de 100 oportunidades
          reais na Europa, Brasil e África, e mostra-te as que mais combinam contigo.
        </p>
      </section>

      {/* ── Como funciona ────────────────────────────────────────── */}
      <section style={{ ...st.section, background: '#050505' }}>
        <h2 style={st.sectionTitle}>Como funciona</h2>
        <div style={st.stepsGrid}>
          <StepCard step="1" icon="🎤" title="Cria o teu perfil"
            desc="Responde a 4 perguntas sobre a tua arte, público, referências e objetivos. A IA gera o teu perfil curatorial automaticamente." />
          <StepCard step="2" icon="📡" title="Explora o Radar"
            desc="Navega por 100+ festivais, residências e open calls. Filtra por país, disciplina, tipo e deadline." />
          <StepCard step="3" icon="🎯" title="Recebe Matches"
            desc="O algoritmo cruza o teu perfil com as oportunidades e mostra as que têm melhor score de compatibilidade." />
          <StepCard step="4" icon="✈️" title="Gere o Booking"
            desc="Adiciona venues à tua pipeline, acompanha o estado de cada contacto e gera emails de apresentação." />
        </div>
      </section>

      {/* ── Para quem ────────────────────────────────────────────── */}
      <section style={st.section}>
        <h2 style={st.sectionTitle}>Para quem é</h2>
        <div style={st.audienceGrid}>
          <AudienceCard icon="🎤" title="Artistas independentes"
            items={['Músicos, bailarinos, performers, artistas visuais', 'Que querem circular internacionalmente', 'Que não têm agente ou produtora']} />
          <AudienceCard icon="🏢" title="Produtoras culturais"
            items={['Gestão de roster de artistas', 'Candidaturas a editais em escala', 'Pipeline de booking organizado']} />
          <AudienceCard icon="🌍" title="Coletivos e associações"
            items={['Foco em diversidade e inclusão', 'Artistas da diáspora africana e latina', 'Comunidades LGBTQIA+']} />
        </div>
      </section>

      {/* ── Números ──────────────────────────────────────────────── */}
      <section style={{ ...st.section, background: '#050505' }}>
        <div style={st.statsGrid}>
          <StatCard number="100+" label="Oportunidades reais" />
          <StatCard number="15+" label="Países cobertos" />
          <StatCard number="8" label="Disciplinas artísticas" />
          <StatCard number="0€" label="Custo para artistas" />
        </div>
      </section>

      {/* ── Sobre a SOMA ─────────────────────────────────────────── */}
      <section style={st.section}>
        <h2 style={st.sectionTitle}>Quem somos</h2>
        <p style={st.sectionText}>
          A <strong style={{ color: '#60b4e8' }}>SOMA Cultura</strong> é uma associação
          de produção cultural catalã-brasileira fundada em 2018 em Barcelona.
          Trabalhamos na interseção entre arte, migração e identidade, com foco
          em artistas negros, migrantes e LGBTQIA+.
        </p>
        <p style={st.sectionText}>
          O nome <strong style={{ color: '#ffcf5c' }}>ODÉ</strong> vem do orixá da caça —
          aquele que encontra caminhos. É isso que esta plataforma faz:
          encontra os melhores caminhos para a tua arte chegar mais longe.
        </p>
      </section>

      {/* ── CTA final ────────────────────────────────────────────── */}
      <section style={{ ...st.section, background: '#050505', textAlign: 'center' }}>
        <h2 style={{ ...st.sectionTitle, fontSize: 28 }}>Pronto para começar?</h2>
        <p style={{ ...st.sectionText, maxWidth: 500, margin: '0 auto 24px' }}>
          Cria o teu perfil em 5 minutos e descobre que oportunidades
          combinam com a tua arte.
        </p>
        <button style={{ ...st.primaryBtn, fontSize: 16, padding: '16px 36px' }} onClick={onRegister}>
          Criar conta grátis →
        </button>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer style={st.footer}>
        <div style={st.footerContent}>
          <div>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#1A6994', letterSpacing: '0.1em' }}>SOMA</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 6 }}>ODÉ</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            © 2024 SOMA Cultura · Barcelona
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="https://somacultura.com" target="_blank" rel="noopener noreferrer" style={st.footerLink}>somacultura.com</a>
            <a href="https://instagram.com/somacultura" target="_blank" rel="noopener noreferrer" style={st.footerLink}>Instagram</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function StepCard({ step, icon, title, desc }: { step: string; icon: string; title: string; desc: string }) {
  return (
    <div style={st.stepCard}>
      <div style={st.stepNumber}>{step}</div>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#fff' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{desc}</p>
    </div>
  )
}

function AudienceCard({ icon, title, items }: { icon: string; title: string; items: string[] }) {
  return (
    <div style={st.audienceCard}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#fff' }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'none' }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, position: 'relative', paddingLeft: 4 }}>
            <span style={{ position: 'absolute', left: -16, color: '#1A6994' }}>·</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <div style={{ fontSize: 36, fontWeight: 900, color: '#1A6994', marginBottom: 4 }}>{number}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{label}</div>
    </div>
  )
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' },

  // Hero
  hero: { padding: '80px 20px 60px', textAlign: 'center', background: 'linear-gradient(180deg, #050a10 0%, #000 100%)' },
  heroContent: { maxWidth: 700, margin: '0 auto' },
  logoRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, marginBottom: 24 },
  logo: { fontSize: 48, fontWeight: 900, letterSpacing: '0.12em', color: '#1A6994' },
  logoAccent: { fontSize: 32, fontWeight: 300, color: '#ffcf5c', letterSpacing: '0.25em' },
  headline: { fontSize: 40, fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px', color: '#fff' },
  subheadline: { fontSize: 16, lineHeight: 1.7, color: 'rgba(255,255,255,0.55)', margin: '0 0 32px', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' },
  heroButtons: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 },
  heroNote: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },

  // Buttons
  primaryBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s' },
  secondaryBtn: { background: 'transparent', color: '#60b4e8', border: '1px solid rgba(96,180,232,0.3)', borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer' },

  // Sections
  section: { padding: '60px 20px', maxWidth: 900, margin: '0 auto' },
  sectionTitle: { fontSize: 24, fontWeight: 700, color: '#fff', textAlign: 'center', margin: '0 0 20px' },
  sectionText: { fontSize: 15, lineHeight: 1.8, color: 'rgba(255,255,255,0.55)', textAlign: 'center', maxWidth: 700, margin: '0 auto 16px' },

  // Steps
  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, maxWidth: 900, margin: '0 auto' },
  stepCard: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 20px', textAlign: 'center', position: 'relative' },
  stepNumber: { position: 'absolute', top: 12, left: 16, fontSize: 11, fontWeight: 900, color: '#1A6994', background: 'rgba(26,105,148,0.15)', borderRadius: 20, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  // Audience
  audienceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  audienceCard: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 20px' },

  // Stats
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, maxWidth: 700, margin: '0 auto' },

  // Footer
  footer: { borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px 20px' },
  footerContent: { maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  footerLink: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' },
}
