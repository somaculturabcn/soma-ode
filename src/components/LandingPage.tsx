// src/components/LandingPage.tsx — Estilo somacultura.com (screenshots reais)
// Hero escuro full-bleed + split layout (texto esq / cards dir) + cards azuis
import { colors, radius } from '../theme'

type Props = {
  onLogin: () => void
  onRegister: () => void
  onRadar: () => void
}

/* ── Social SVG icons (like somacultura.com nav) ─────────────────── */
const InstagramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
)
const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
)
const TwitterIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
)

export default function LandingPage({ onLogin, onRegister, onRadar }: Props) {
  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Nav bar (estilo somacultura.com) ──────────────────────── */}
      <nav style={st.nav}>
        <img src="/soma-logo.png" alt="SOMA Cultura" style={{ height: 36, filter: 'brightness(0) invert(1)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={st.navLink} onClick={onRadar}>Radar</span>
          <a href="https://somacultura.com" target="_blank" rel="noopener noreferrer" style={st.navLink}>Artistas</a>
          <span style={st.navLink} onClick={onLogin}>Contacto</span>
          <div style={{ display: 'flex', gap: 14, marginLeft: 8, color: 'rgba(255,255,255,0.7)' }}>
            <a href="https://instagram.com/somacultura" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}><InstagramIcon /></a>
            <a href="https://facebook.com/somacultura" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}><FacebookIcon /></a>
            <a href="https://twitter.com/somacultura" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}><TwitterIcon /></a>
          </div>
          <button style={st.navBtnPrimary} onClick={onRegister}>Entrar</button>
        </div>
      </nav>

      {/* ── Nav mobile ──────────────────────────────────────────── */}
      <nav style={st.navMobile}>
        <img src="/soma-logo.png" alt="SOMA Cultura" style={{ height: 28, filter: 'brightness(0) invert(1)' }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...st.navBtnPrimary, padding: '6px 14px', fontSize: 12 }} onClick={onLogin}>Entrar</button>
          <button style={{ ...st.navBtnPrimary, padding: '6px 14px', fontSize: 12 }} onClick={onRegister}>Criar conta</button>
        </div>
      </nav>

      {/* ── Hero (full-bleed escuro, como MC Carol slide) ─────────── */}
      <header style={st.hero}>
        {/* Gradient overlay over abstract pattern */}
        <div style={st.heroPattern} />
        <div style={st.heroGradient} />
        <div style={st.heroContent}>
          <h1 style={st.heroTitle}>ODÉ</h1>
          <p style={st.heroYear}>2024</p>
          <button style={st.heroBtn} onClick={onRegister}>Começar</button>
        </div>
      </header>

      {/* ── Split: Texto esquerda + Feature cards direita ─────────── */}
      {/* (como "¿Qué es la asociacion?" + event cards em somacultura) */}
      <section style={st.splitSection}>
        <div style={st.splitContainer}>
          {/* Coluna esquerda: conceito */}
          <div style={st.splitLeft}>
            <div style={st.somaIcon}>◉</div>
            <h2 style={st.splitTitle}>O que é<br />SOMA ODÉ?</h2>
            <p style={st.splitQuote}>
              "Eufórico, narcótico, agradavelmente alucinatório."
            </p>
            <p style={st.splitText}>
              <strong style={{ color: '#fff' }}>SOMA</strong> — a pílula do <em>Admirável Mundo Novo</em> de
              Aldous Huxley. Uma substância que altera a percepção, que abre portas
              para outros estados. Também é somar — o resultado de juntar partes,
              artistas, culturas e territórios que, ao encontrar-se, criam algo
              maior do que a soma de cada um.
            </p>
            <p style={st.splitText}>
              <strong style={{ color: '#fff' }}>ODÉ</strong> — orixá da caça na tradição iorubá,
              aquele que abre caminhos e encontra o que está escondido
              na floresta. É a energia de quem sai em busca, com estratégia
              e coragem.
            </p>
            <p style={st.splitText}>
              A <strong style={{ color: colors.primary }}>SOMA Cultura</strong> é uma associação
              que trabalha para promover a pluralidade, a diversidade e a
              integração através da Arte, com especial atenção e interesse
              pela arte migrante e emigrante, explorando ao máximo a sua
              transversalidade.
            </p>
            <button style={st.outlineBtn} onClick={onRadar}>Quienes somos</button>
          </div>

          {/* Coluna direita: feature cards azuis (como event cards) */}
          <div style={st.splitRight}>
            <FeatureCard
              icon="🎤"
              title="Perfil Artístico"
              desc="Responde a 4 perguntas. A IA gera o teu perfil curatorial."
              onClick={onRegister}
            />
            <FeatureCard
              icon="📡"
              title="Radar Internacional"
              desc="100+ festivais, residências e open calls em 15+ países."
              onClick={onRadar}
            />
            <FeatureCard
              icon="🎯"
              title="Match Automático"
              desc="O algoritmo cruza o teu perfil com as melhores oportunidades."
              onClick={onRegister}
            />
            <FeatureCard
              icon="✈️"
              title="Booking & Pipeline"
              desc="Gestão de contactos, tracking e emails gerados por IA."
              onClick={onRegister}
            />
          </div>
        </div>
      </section>

      {/* ── Faixa citação ────────────────────────────────────────── */}
      <section style={st.missionBand}>
        <p style={st.missionText}>
          "Feita por e para artistas negros, migrantes e LGBTQIA+ —
          porque a diversidade não é um tema, é o ponto de partida."
        </p>
      </section>

      {/* ── Para quem — cards com fundo azul (estilo event cards) ──── */}
      <section style={st.sectionDark}>
        <div style={st.wideContainer}>
          <div style={st.audienceRow}>
            <AudienceCard
              icon="🎤"
              title="Artistas independentes"
              desc="Músicos, bailarinos, performers e artistas visuais que querem circular internacionalmente sem agente."
            />
            <AudienceCard
              icon="🏢"
              title="Produtoras culturais"
              desc="Gestão de roster, candidaturas a editais em escala e pipeline de booking organizado."
            />
            <AudienceCard
              icon="🌍"
              title="Coletivos e associações"
              desc="Foco em diversidade, artistas da diáspora africana e latina, comunidades LGBTQIA+."
            />
          </div>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button style={st.wideOutlineBtn} onClick={onRadar}>Ver todas as oportunidades</button>
          </div>
        </div>
      </section>

      {/* ── Stats (números grandes, como somacultura "nuestra historia") ─ */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={st.wideContainer}>
          <div style={st.statsRow}>
            <StatBlock number="100+" label="Oportunidades" />
            <StatBlock number="15+" label="Países" />
            <StatBlock number="8" label="Disciplinas" />
            <StatBlock number="0€" label="Para artistas" />
          </div>
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────────── */}
      <section style={{ background: colors.primary, padding: '80px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 16px', color: '#fff' }}>
          Pronto para abrir<br />o teu caminho?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', margin: '0 0 32px', maxWidth: 450, marginLeft: 'auto', marginRight: 'auto' }}>
          Cria o teu perfil em 5 minutos e descobre que oportunidades
          combinam com a tua arte.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button style={st.ctaWhiteBtn} onClick={onRegister}>Criar conta grátis →</button>
          <button style={st.ctaOutlineBtn} onClick={onRadar}>Explorar sem conta</button>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 20 }}>
          100% grátis · Sem cartão de crédito · Dados protegidos (RGPD)
        </p>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer style={st.footer}>
        <div style={{ ...st.wideContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/soma-logo.png" alt="SOMA" style={{ height: 22, filter: 'brightness(0) invert(1)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', fontWeight: 300 }}>ODÉ</span>
          </div>
          <div style={{ display: 'flex', gap: 20, color: 'rgba(255,255,255,0.4)' }}>
            <a href="https://instagram.com/somacultura" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}><InstagramIcon /></a>
            <a href="https://facebook.com/somacultura" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}><FacebookIcon /></a>
            <a href="https://twitter.com/somacultura" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}><TwitterIcon /></a>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            © 2024 SOMA Cultura · Barcelona
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Sub-componentes ──────────────────────────────────────────────────

function FeatureCard({ icon, title, desc, onClick }: { icon: string; title: string; desc: string; onClick: () => void }) {
  return (
    <div style={st.featureCard} onClick={onClick}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
      <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#fff' }}>{title}</h3>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>{desc}</p>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 4, padding: '6px 16px', display: 'inline-block', cursor: 'pointer' }}>
        Explorar
      </span>
    </div>
  )
}

function AudienceCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={st.audienceCard}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#fff' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>{desc}</p>
    </div>
  )
}

function StatBlock({ number, label }: { number: string; label: string }) {
  return (
    <div style={{ textAlign: 'center', flex: 1, padding: '20px 12px' }}>
      <div style={{ fontSize: 52, fontWeight: 900, color: colors.primary, marginBottom: 6, letterSpacing: '-0.03em' }}>{number}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// ── Estilos ──────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  // Nav desktop
  nav: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 40px', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
  },
  navMobile: {
    display: 'none', // show via media query in real CSS — fallback hidden
  },
  navLink: {
    color: 'rgba(255,255,255,0.8)', fontSize: 14, textDecoration: 'none',
    cursor: 'pointer', fontWeight: 500,
  },
  navBtnPrimary: {
    background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 4, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },

  // Hero — full-bleed dark (like MC Carol slide)
  hero: {
    height: '100vh', minHeight: 600, display: 'flex', alignItems: 'flex-end',
    justifyContent: 'flex-start', position: 'relative', overflow: 'hidden',
    background: '#0a0a0a',
  },
  heroPattern: {
    position: 'absolute', inset: 0,
    background: `
      radial-gradient(ellipse 80% 60% at 60% 40%, rgba(26,105,148,0.15) 0%, transparent 60%),
      radial-gradient(ellipse 50% 40% at 30% 70%, rgba(26,105,148,0.08) 0%, transparent 50%)
    `,
  },
  heroGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
    background: 'linear-gradient(0deg, #0a0a0a 0%, transparent 100%)',
  },
  heroContent: {
    position: 'relative', zIndex: 2, padding: '0 40px 80px',
  },
  heroTitle: {
    fontSize: 120, fontWeight: 900, letterSpacing: '0.05em', margin: '0 0 4px',
    lineHeight: 1, color: '#fff',
  },
  heroYear: {
    fontSize: 18, color: 'rgba(255,255,255,0.4)', margin: '0 0 24px', fontWeight: 400,
  },
  heroBtn: {
    background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.5)',
    borderRadius: 0, padding: '14px 40px', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', letterSpacing: '0.05em',
  },

  // Split section (like somacultura "¿Qué es?" + event cards)
  splitSection: {
    background: '#0d0d0d', padding: '80px 0',
  },
  splitContainer: {
    maxWidth: 1100, margin: '0 auto', padding: '0 40px',
    display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 60,
    alignItems: 'start',
  },
  splitLeft: {
    paddingRight: 20,
  },
  somaIcon: {
    fontSize: 60, color: colors.primary, marginBottom: 20, fontWeight: 900,
  },
  splitTitle: {
    fontSize: 28, fontWeight: 800, margin: '0 0 20px', color: '#fff', lineHeight: 1.2,
  },
  splitQuote: {
    fontSize: 20, fontStyle: 'italic', fontWeight: 600, color: colors.primary,
    margin: '0 0 20px', lineHeight: 1.6, letterSpacing: '0.01em',
  },
  splitText: {
    fontSize: 14, lineHeight: 1.9, color: 'rgba(255,255,255,0.5)', margin: '0 0 16px',
    textAlign: 'justify' as const,
  },
  outlineBtn: {
    background: 'transparent', color: colors.primary, border: `1px solid ${colors.primary}`,
    borderRadius: 0, padding: '12px 28px', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', marginTop: 12, letterSpacing: '0.03em',
  },
  splitRight: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
  },

  // Feature cards (blue bg like somacultura event cards)
  featureCard: {
    background: colors.primary, borderRadius: 0, padding: '24px 20px',
    cursor: 'pointer', transition: 'opacity 0.15s',
  },

  // Mission
  missionBand: {
    background: '#0d0d0d', padding: '40px 20px', textAlign: 'center',
    borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  missionText: {
    fontSize: 18, fontWeight: 500, fontStyle: 'italic', color: 'rgba(255,255,255,0.4)',
    maxWidth: 650, margin: '0 auto', lineHeight: 1.7,
  },

  // Dark sections
  sectionDark: { background: '#0d0d0d', padding: '60px 0' },
  wideContainer: { maxWidth: 1100, margin: '0 auto', padding: '0 40px' },

  // Audience row (3 cards azuis)
  audienceRow: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  audienceCard: {
    background: colors.primary, padding: '28px 24px',
  },

  // Wide outline button (like "Ver todos los conciertos")
  wideOutlineBtn: {
    background: 'transparent', color: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: 0,
    padding: '14px 60px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
    letterSpacing: '0.03em',
  },

  // Stats
  statsRow: {
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
  },

  // CTA
  ctaWhiteBtn: {
    background: '#fff', color: colors.primary, border: 'none', borderRadius: 0,
    padding: '16px 36px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
  },
  ctaOutlineBtn: {
    background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: 0, padding: '16px 32px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
  },

  // Footer
  footer: {
    borderTop: '1px solid rgba(255,255,255,0.06)', padding: '24px 0',
    background: '#0d0d0d',
  },
}
