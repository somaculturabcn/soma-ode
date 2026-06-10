// src/components/DashboardHome.tsx
// SOMA ODÉ — Página de boas-vindas por role
// Admin: métricas globais + atalhos de gestão
// Producer: projetos + artistas + oportunidades + atalhos
// Artist: perfil + propostas + próximos eventos

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

type Props = {
  onNavigate: (tab: string) => void
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
function AdminDashboard({ onNavigate }: Props) {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    artists: 0, producers: 0, opportunities: 0, contracts: 0, projects: 0, events: 0
  })

  useEffect(() => {
    async function load() {
      const [a, o, c, p, e] = await Promise.all([
        supabase.from('artists').select('id', { count: 'exact', head: true }),
        supabase.from('opportunities').select('id', { count: 'exact', head: true }),
        supabase.from('contracts').select('id', { count: 'exact', head: true }),
        supabase.from('projects').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        artists: a.count || 0,
        producers: 0,
        opportunities: o.count || 0,
        contracts: c.count || 0,
        projects: p.count || 0,
        events: e.count || 0,
      })
    }
    load()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const name = user?.email?.split('@')[0] || 'Tâmara'

  return (
    <div style={s.page}>
      {/* Header boas-vindas */}
      <div style={s.welcomeBlock}>
        <div style={s.welcomeLeft}>
          <div style={s.somaTag}>SOMA ODÉ · ADMIN</div>
          <h1 style={s.welcomeTitle}>{greeting}, {name} 👋</h1>
          <p style={s.welcomeSub}>Visão geral da plataforma e gestão curatorial da SOMA Cultura Barcelona.</p>
        </div>
        <div style={s.somaLogo}>ODÉ</div>
      </div>

      {/* Métricas */}
      <div style={s.metricsGrid}>
        {[
          { label: 'Artistas', value: stats.artists, icon: '🎤', tab: 'ARTISTAS', color: '#6ef3a5' },
          { label: 'Oportunidades', value: stats.opportunities, icon: '🎯', tab: 'OPORTUNIDADES', color: '#60b4e8' },
          { label: 'Projetos', value: stats.projects, icon: '🗂', tab: 'PROJETOS', color: '#c084fc' },
          { label: 'Contratos', value: stats.contracts, icon: '📝', tab: 'CONTRATOS', color: '#fbbf24' },
          { label: 'Eventos', value: stats.events, icon: '🎪', tab: 'EVENTOS', color: '#f97316' },
        ].map(m => (
          <button key={m.tab} style={s.metricCard} onClick={() => onNavigate(m.tab)}>
            <div style={s.metricIcon}>{m.icon}</div>
            <div style={{ ...s.metricValue, color: m.color }}>{m.value}</div>
            <div style={s.metricLabel}>{m.label}</div>
          </button>
        ))}
      </div>

      {/* Atalhos rápidos */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Acesso rápido</div>
        <div style={s.shortcutsGrid}>
          {[
            { label: 'Gerir artistas', desc: 'Cadastrar, editar, Cartografia SOMA', icon: '🎤', tab: 'ARTISTAS' },
            { label: 'Ver oportunidades', desc: 'Editais, open calls, matching', icon: '🎯', tab: 'OPORTUNIDADES' },
            { label: 'Projetos', desc: 'Hub de circulação e coprodução', icon: '🗂', tab: 'PROJETOS' },
            { label: 'Contratos', desc: 'Gerir contratos e pagamentos', icon: '📝', tab: 'CONTRATOS' },
            { label: 'Pipeline', desc: 'Estado das negociações', icon: '📊', tab: 'PIPELINE' },
            { label: 'Documentos', desc: 'Cartas-convite e documentação', icon: '📁', tab: 'DOCUMENTOS' },
          ].map(sc => (
            <button key={sc.tab} style={s.shortcutCard} onClick={() => onNavigate(sc.tab)}>
              <span style={s.scIcon}>{sc.icon}</span>
              <div>
                <div style={s.scLabel}>{sc.label}</div>
                <div style={s.scDesc}>{sc.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── PRODUCER DASHBOARD ──────────────────────────────────────────────────────
function ProducerDashboard({ onNavigate }: Props) {
  const { user } = useAuth()
  const [stats, setStats] = useState({ projects: 0, artists: 0, opportunities: 0, contracts: 0 })
  const [orgName, setOrgName] = useState('')

  useEffect(() => {
    async function load() {
      if (!user) return

      // Nome da org
      const { data: org } = await supabase
        .from('organizations').select('name').eq('owner_id', user.id).maybeSingle()
      if (org) setOrgName(org.name)

      // Métricas do produtor
      const { data: orgData } = await supabase
        .from('organizations').select('id').eq('owner_id', user.id).maybeSingle()
      if (!orgData) return

      const [p, c] = await Promise.all([
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('organization_id', orgData.id),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('organization_id', orgData.id),
      ])

      // Oportunidades abertas (globais)
      const { count: opp } = await supabase
        .from('opportunities').select('id', { count: 'exact', head: true })

      setStats({
        projects: p.count || 0,
        artists: 0,
        opportunities: opp || 0,
        contracts: c.count || 0,
      })
    }
    load()
  }, [user])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const displayName = orgName || user?.email?.split('@')[0] || ''

  return (
    <div style={s.page}>
      <div style={{ ...s.welcomeBlock, background: 'linear-gradient(135deg, rgba(26,105,148,0.15) 0%, rgba(0,0,0,0) 60%)' }}>
        <div style={s.welcomeLeft}>
          <div style={{ ...s.somaTag, color: '#60b4e8', borderColor: 'rgba(26,105,148,0.4)' }}>SOMA ODÉ · PRODUTOR/A</div>
          <h1 style={s.welcomeTitle}>{greeting}! 👋</h1>
          {displayName && <div style={s.orgName}>{displayName}</div>}
          <p style={s.welcomeSub}>O teu espaço de gestão de projetos, artistas e oportunidades de circulação.</p>
        </div>
        <div style={{ ...s.somaLogo, color: 'rgba(96,180,232,0.15)' }}>ODÉ</div>
      </div>

      {/* Métricas */}
      <div style={{ ...s.metricsGrid, gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Projetos', value: stats.projects, icon: '🗂', tab: 'PROJETOS', color: '#c084fc' },
          { label: 'Oportunidades', value: stats.opportunities, icon: '🎯', tab: 'OPORTUNIDADES', color: '#60b4e8' },
          { label: 'Contratos', value: stats.contracts, icon: '📝', tab: 'CONTRATOS', color: '#fbbf24' },
          { label: 'Pipeline', value: 0, icon: '📊', tab: 'PIPELINE', color: '#6ef3a5' },
        ].map(m => (
          <button key={m.tab} style={s.metricCard} onClick={() => onNavigate(m.tab)}>
            <div style={s.metricIcon}>{m.icon}</div>
            <div style={{ ...s.metricValue, color: m.color }}>{m.value}</div>
            <div style={s.metricLabel}>{m.label}</div>
          </button>
        ))}
      </div>

      {/* Dois blocos: próximos passos + atalhos */}
      <div style={s.twoCol}>
        <div style={s.block}>
          <div style={s.sectionTitle}>Próximos passos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { step: '1', text: 'Completa o teu perfil de produtora', action: () => onNavigate('PERFIL'), done: false },
              { step: '2', text: 'Cria o teu primeiro projeto', action: () => onNavigate('PROJETOS'), done: stats.projects > 0 },
              { step: '3', text: 'Explora oportunidades disponíveis', action: () => onNavigate('OPORTUNIDADES'), done: false },
              { step: '4', text: 'Adiciona artistas ao teu roster', action: () => onNavigate('ARTISTAS'), done: false },
            ].map(item => (
              <button key={item.step} style={{ ...s.stepCard, opacity: item.done ? 0.5 : 1 }} onClick={item.action}>
                <div style={{ ...s.stepNum, background: item.done ? '#6ef3a5' : 'rgba(26,105,148,0.3)', color: item.done ? '#000' : '#60b4e8' }}>
                  {item.done ? '✓' : item.step}
                </div>
                <span style={s.stepText}>{item.text}</span>
                {!item.done && <span style={s.stepArrow}>→</span>}
              </button>
            ))}
          </div>
        </div>

        <div style={s.block}>
          <div style={s.sectionTitle}>Acesso rápido</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Perfil da produtora', icon: '🏢', tab: 'PERFIL' },
              { label: 'Projetos de circulação', icon: '🗂', tab: 'PROJETOS' },
              { label: 'Oportunidades & editais', icon: '🎯', tab: 'OPORTUNIDADES' },
              { label: 'Contratos', icon: '📝', tab: 'CONTRATOS' },
              { label: 'Documentos', icon: '📁', tab: 'DOCUMENTOS' },
            ].map(sc => (
              <button key={sc.tab} style={s.quickLink} onClick={() => onNavigate(sc.tab)}>
                <span>{sc.icon}</span>
                <span style={s.quickLinkLabel}>{sc.label}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ARTIST DASHBOARD ────────────────────────────────────────────────────────
function ArtistDashboard({ onNavigate }: Props) {
  const { user } = useAuth()
  const [artistName, setArtistName] = useState('')
  const [profileComplete, setProfileComplete] = useState(false)

  useEffect(() => {
    async function load() {
      if (!user) return
      const { data } = await supabase
        .from('artists').select('artistic_name, disciplines, cartografia')
        .or(`user_id.eq.${user.id},auth_user_id.eq.${user.id}`)
        .maybeSingle()
      if (data) {
        setArtistName(data.artistic_name || '')
        setProfileComplete(!!(data.artistic_name && data.disciplines?.length > 0))
      }
    }
    load()
  }, [user])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const displayName = artistName || user?.email?.split('@')[0] || ''

  return (
    <div style={s.page}>
      <div style={{ ...s.welcomeBlock, background: 'linear-gradient(135deg, rgba(110,243,165,0.08) 0%, rgba(0,0,0,0) 60%)' }}>
        <div style={s.welcomeLeft}>
          <div style={{ ...s.somaTag, color: '#6ef3a5', borderColor: 'rgba(110,243,165,0.3)' }}>SOMA ODÉ · ARTISTA</div>
          <h1 style={s.welcomeTitle}>{greeting}, {displayName} 🎤</h1>
          <p style={s.welcomeSub}>O teu portal de circulação internacional. Gere o teu perfil, acompanha propostas e oportunidades.</p>
        </div>
        <div style={{ ...s.somaLogo, color: 'rgba(110,243,165,0.1)' }}>ODÉ</div>
      </div>

      {/* Estado do perfil */}
      {!profileComplete && (
        <div style={s.alertCard}>
          <span style={s.alertIcon}>⚠️</span>
          <div>
            <div style={s.alertTitle}>O teu perfil está incompleto</div>
            <div style={s.alertSub}>Um perfil completo aumenta as tuas hipóteses de ser encontrado/a para oportunidades.</div>
          </div>
          <button style={s.alertBtn} onClick={() => onNavigate('PORTAL')}>Completar →</button>
        </div>
      )}

      {/* Acções principais */}
      <div style={s.artistCards}>
        <button style={{ ...s.artistCard, borderColor: 'rgba(110,243,165,0.3)' }} onClick={() => onNavigate('PORTAL')}>
          <div style={s.artistCardIcon}>👤</div>
          <div style={s.artistCardTitle}>O meu perfil</div>
          <div style={s.artistCardDesc}>Actualiza a tua bio, disciplinas, Cartografia SOMA e materiais</div>
          <div style={{ ...s.artistCardBtn, background: 'rgba(110,243,165,0.1)', color: '#6ef3a5', borderColor: 'rgba(110,243,165,0.3)' }}>Editar perfil →</div>
        </button>

        <button style={{ ...s.artistCard, borderColor: 'rgba(96,180,232,0.3)' }} onClick={() => onNavigate('PORTAL')}>
          <div style={s.artistCardIcon}>📬</div>
          <div style={s.artistCardTitle}>Propostas recebidas</div>
          <div style={s.artistCardDesc}>Consulta e responde às propostas de apresentação e colaboração</div>
          <div style={{ ...s.artistCardBtn, background: 'rgba(96,180,232,0.1)', color: '#60b4e8', borderColor: 'rgba(96,180,232,0.3)' }}>Ver propostas →</div>
        </button>

        <button style={{ ...s.artistCard, borderColor: 'rgba(192,132,252,0.3)' }} onClick={() => onNavigate('PORTAL')}>
          <div style={s.artistCardIcon}>🌍</div>
          <div style={s.artistCardTitle}>Circulação internacional</div>
          <div style={s.artistCardDesc}>Oportunidades de residência, festival e open call compatíveis com o teu perfil</div>
          <div style={{ ...s.artistCardBtn, background: 'rgba(192,132,252,0.1)', color: '#c084fc', borderColor: 'rgba(192,132,252,0.3)' }}>Explorar →</div>
        </button>
      </div>

      {/* Info SOMA */}
      <div style={s.somaInfo}>
        <div style={s.somaInfoTitle}>Sobre o SOMA ODÉ</div>
        <p style={s.somaInfoText}>
          A SOMA Cultura é uma associação cultural de Barcelona focada em artistas negros, migrantes e LGBTQIA+.
          Esta plataforma apoia a tua circulação internacional através da metodologia Cartografia SOMA.
        </p>
        <a href="https://somacultura.com" target="_blank" rel="noreferrer" style={s.somaInfoLink}>somacultura.com →</a>
      </div>
    </div>
  )
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function DashboardHome({ onNavigate }: Props) {
  const { user } = useAuth()

  if (!user) return null

  if (user.role === 'admin' || user.role === 'manager') {
    return <AdminDashboard onNavigate={onNavigate} />
  }

  if (user.role === 'producer') {
    return <ProducerDashboard onNavigate={onNavigate} />
  }

  return <ArtistDashboard onNavigate={onNavigate} />
}

// ─── ESTILOS ─────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: { padding: '28px 32px', maxWidth: 1100, margin: '0 auto', color: '#fff', fontFamily: 'system-ui, sans-serif' },
  welcomeBlock: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0) 60%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '28px 32px', marginBottom: 28 },
  welcomeLeft: { flex: 1 },
  somaTag: { display: 'inline-block', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 10px', marginBottom: 12 },
  welcomeTitle: { fontSize: 28, fontWeight: 800, margin: '0 0 10px', color: '#fff', lineHeight: 1.2 },
  orgName: { fontSize: 16, fontWeight: 600, color: '#60b4e8', marginBottom: 8 },
  welcomeSub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0, maxWidth: 520 },
  somaLogo: { fontSize: 72, fontWeight: 900, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.04)', flexShrink: 0, lineHeight: 1 },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 },
  metricCard: { background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '20px 16px', textAlign: 'center', cursor: 'pointer', transition: 'border-color .2s', fontFamily: 'inherit' },
  metricIcon: { fontSize: 24, marginBottom: 10 },
  metricValue: { fontSize: 32, fontWeight: 800, lineHeight: 1, marginBottom: 6 },
  metricLabel: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', marginBottom: 14, textTransform: 'uppercase' },
  shortcutsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
  shortcutCard: { display: 'flex', alignItems: 'center', gap: 14, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', color: '#fff', fontFamily: 'inherit' },
  scIcon: { fontSize: 22, flexShrink: 0 },
  scLabel: { fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 },
  scDesc: { fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
  block: { background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 },
  stepCard: { display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', textAlign: 'left', color: '#fff', fontFamily: 'inherit', width: '100%' },
  stepNum: { width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 },
  stepText: { fontSize: 13, flex: 1 },
  stepArrow: { color: 'rgba(255,255,255,0.3)', fontSize: 14 },
  quickLink: { display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', color: '#fff', fontFamily: 'inherit', width: '100%' },
  quickLinkLabel: { fontSize: 13, flex: 1, textAlign: 'left' },
  alertCard: { display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, padding: '16px 20px', marginBottom: 24 },
  alertIcon: { fontSize: 24, flexShrink: 0 },
  alertTitle: { fontSize: 14, fontWeight: 600, color: '#fbbf24', marginBottom: 2 },
  alertSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  alertBtn: { background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' },
  artistCards: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  artistCard: { background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '24px 20px', cursor: 'pointer', textAlign: 'left', color: '#fff', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 10 },
  artistCardIcon: { fontSize: 32 },
  artistCardTitle: { fontSize: 16, fontWeight: 700 },
  artistCardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, flex: 1 },
  artistCardBtn: { display: 'inline-block', fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20, border: '1px solid', marginTop: 4, width: 'fit-content' },
  somaInfo: { background: 'rgba(26,105,148,0.08)', border: '1px solid rgba(26,105,148,0.2)', borderRadius: 12, padding: '20px 24px' },
  somaInfoTitle: { fontSize: 13, fontWeight: 600, color: '#60b4e8', marginBottom: 8 },
  somaInfoText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: '0 0 10px' },
  somaInfoLink: { fontSize: 12, color: '#60b4e8', textDecoration: 'none' },
}