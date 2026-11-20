// src/components/LandingPage.tsx — Tema claro (Manual da Marca SOMA)
import { colors, shadows, radius } from '../theme'

type Props = {
  onLogin: () => void
  onRegister: () => void
  onRadar: () => void
}

export default function LandingPage({ onLogin, onRegister, onRadar }: Props) {
  return (
    <div style={st.page}>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <header style={st.hero}>
        <div style={st.heroContent}>
          <div style={st.logoRow}>
            <img src="/soma-logo.png" alt="SOMA Cultura" style={{ height: 48 }} />
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
            <button style={{ background: 'none', border: 'none', fontSize: 13, padding: '8px 16px', color: colors.textMuted, cursor: 'pointer' }} onClick={onRadar}>
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
          O SOMA ODÉ é uma ferramenta criada pela <strong style={{ color: colors.primary }}>SOMA Cultura</strong> (Barcelona)
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
      <section style={{ ...st.section, background: colors.bgPage, maxWidth: 'none', padding: '60px 20px' }}>
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
      <section style={{ ...st.section, background: colors.primary, maxWidth: 'none', padding: '48px 20px' }}>
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
          A <strong style={{ color: colors.primary }}>SOMA Cultura</strong> é uma associação
          de produção cultural catalã-brasileira fundada em 2018 em Barcelona.
          Trabalhamos na interseção entre arte, migração e identidade, com foco
          em artistas negros, migrantes e LGBTQIA+.
        </p>
        <p style={st.sectionText}>
          O nome <strong style={{ color: colors.primary }}>ODÉ</strong> vem do orixá da caça —
          aquele que encontra caminhos. É isso que esta plataforma faz:
          encontra os melhores caminhos para a tua arte chegar mais longe.
        </p>
      </section>

      {/* ── CTA final ────────────────────────────────────────────── */}
      <section style={{ ...st.section, background: colors.bgPage, textAlign: 'center', maxWidth: 'none', padding: '60px 20px' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/soma-logo.png" alt="SOMA Cultura" style={{ height: 20 }} />
            <span style={{ fontSize: 10, color: colors.textMuted }}>ODÉ</span>
          </div>
          <div style={{ fontSize: 12, color: colors.textMuted }}>
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
      <h3 style={{ margin: '0 0 8px', fontSize: 16, color: colors.text }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 13, color: colors.textSecondary, lineHeight: 1.6 }}>{desc}</p>
    </div>
  )
}

function AudienceCard({ icon, title, items }: { icon: string; title: string; items: string[] }) {
  return (
    <div style={st.audienceCard}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ margin: '0 0 12px', fontSize: 16, color: colors.text }}>{title}</h3>
      <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'none' }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.8, position: 'relative', paddingLeft: 4 }}>
            <span style={{ position: 'absolute', left: -16, color: colors.primary }}>·</span>
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
      <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{number}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{label}</div>
    </div>
  )
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: colors.bg, color: colors.text, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" },

  // Hero
  hero: { padding: '80px 20px 60px', textAlign: 'center', background: colors.bg },
  heroContent: { maxWidth: 700, margin: '0 auto' },
  logoRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 },
  logoAccent: { fontSize: 28, fontWeight: 300, color: colors.textMuted, letterSpacing: '0.25em' },
  headline: { fontSize: 40, fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px', color: colors.text },
  subheadline: { fontSize: 16, lineHeight: 1.7, color: colors.textSecondary, margin: '0 0 32px', maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' },
  heroButtons: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 },
  heroNote: { fontSize: 12, color: colors.textMuted },

  // Buttons
  primaryBtn: { background: colors.primary, color: '#fff', border: 'none', borderRadius: radius.sm, padding: '14px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s' },
  secondaryBtn: { background: 'transparent', color: colors.primary, border: `1px solid ${colors.primaryBorder}`, borderRadius: radius.sm, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer' },

  // Sections
  section: { padding: '60px 20px', maxWidth: 900, margin: '0 auto' },
  sectionTitle: { fontSize: 24, fontWeight: 700, color: colors.text, textAlign: 'center', margin: '0 0 20px' },
  sectionText: { fontSize: 15, lineHeight: 1.8, color: colors.textSecondary, textAlign: 'center', maxWidth: 700, margin: '0 auto 16px' },

  // Steps
  stepsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, maxWidth: 900, margin: '0 auto' },
  stepCard: { background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '24px 20px', textAlign: 'center', position: 'relative', boxShadow: shadows.card },
  stepNumber: { position: 'absolute', top: 12, left: 16, fontSize: 11, fontWeight: 900, color: colors.primary, background: colors.primaryBg, borderRadius: 20, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' },

  // Audience
  audienceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  audienceCard: { background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '24px 20px', boxShadow: shadows.card },

  // Stats
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, maxWidth: 700, margin: '0 auto' },

  // Footer
  footer: { borderTop: `1px solid ${colors.border}`, padding: '24px 20px' },
  footerContent: { maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  footerLink: { fontSize: 12, color: colors.textMuted, textDecoration: 'none' },
}
