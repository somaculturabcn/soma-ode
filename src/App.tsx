// src/App.tsx — SOMA ODÉ
import { useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { LanguageProvider, useLanguage, LANG_FLAGS, type Lang } from './i18n/LanguageContext'
import LoginScreen from './auth/LoginScreen'
import { hasAccess } from './auth/permissions'

import ArtistManager from './components/ArtistManager'
import MatchView from './components/MatchView'
import ContactsView from './components/ContactsView'
import ContractManager from './components/ContractManager'
import PipelineView from './components/PipelineView'
import DocumentsView from './components/DocumentsView'
import ArtistPortal from './components/ArtistPortal'
import EventManager from './components/EventManager'
import ProducerPortal from './components/ProducerPortal'
import ProjectManager from './components/ProjectManager'
import DashboardHome from './components/DashboardHome'

type Tab =
  | 'HOME'
  | 'PERFIL'
  | 'ARTISTAS'
  | 'PROJETOS'
  | 'OPORTUNIDADES'
  | 'CONTACTOS'
  | 'CONTRATOS'
  | 'PIPELINE'
  | 'DOCUMENTOS'
  | 'EVENTOS'
  | 'PORTAL'
  | 'PRODUTORES'

const adminTabs: { id: Tab; label: string }[] = [
  { id: 'HOME',         label: 'Início' },
  { id: 'ARTISTAS',     label: 'Artistas' },
  { id: 'PROJETOS',     label: 'Projetos' },
  { id: 'OPORTUNIDADES',label: 'Oportunidades' },
  { id: 'EVENTOS',      label: 'Eventos' },
  { id: 'CONTACTOS',    label: 'Contactos' },
  { id: 'CONTRATOS',    label: 'Contratos' },
  { id: 'PIPELINE',     label: 'Pipeline' },
  { id: 'DOCUMENTOS',   label: 'Documentos' },
]

const producerTabs: { id: Tab; label: string }[] = [
  { id: 'HOME',         label: 'Início' },
  { id: 'PERFIL',       label: 'Perfil' },
  { id: 'PROJETOS',     label: 'Projetos' },
  { id: 'ARTISTAS',     label: 'Artistas' },
  { id: 'OPORTUNIDADES',label: 'Oportunidades' },
  { id: 'EVENTOS',      label: 'Eventos' },
  { id: 'CONTACTOS',    label: 'Contactos' },
  { id: 'CONTRATOS',    label: 'Contratos' },
  { id: 'PIPELINE',     label: 'Pipeline' },
  { id: 'DOCUMENTOS',   label: 'Documentos' },
]

const artistTabs: { id: Tab; label: string }[] = [
  { id: 'HOME',         label: 'Início' },
  { id: 'PORTAL',       label: 'O meu perfil' },
  { id: 'PROJETOS',     label: 'Projetos' },
  { id: 'OPORTUNIDADES',label: 'Oportunidades' },
  { id: 'EVENTOS',      label: 'Eventos' },
  { id: 'PRODUTORES',   label: 'Produtores' },
  { id: 'CONTACTOS',    label: 'Contactos' },
  { id: 'CONTRATOS',    label: 'Contratos' },
  { id: 'PIPELINE',     label: 'Pipeline' },
  { id: 'DOCUMENTOS',   label: 'Documentos' },
]

function ArtistPlaceholder({ title, emoji, text }: { title: string; emoji: string; text: string }) {
  return (
    <div style={{ maxWidth: 640, margin: '40px auto', textAlign: 'center', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '48px 24px', border: '1px dashed rgba(255,255,255,0.14)', borderRadius: 16, background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{text}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 16 }}>Em construção para o teu perfil de artista.</div>
    </div>
  )
}

function LangSwitcher() {
  const { lang, setLang } = useLanguage()
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {(['pt', 'es', 'en'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)} style={{
          background: lang === l ? 'rgba(255,255,255,0.2)' : 'transparent',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 5, color: '#fff', padding: '3px 7px',
          fontSize: 11, cursor: 'pointer',
        }}>
          {LANG_FLAGS[l]}
        </button>
      ))}
    </div>
  )
}

// ── Ecrã de escolha de role ──────────────────────────────────────────────────
function RoleSetupScreen() {
  const { completeRoleSetup } = useAuth()
  const [orgName, setOrgName] = useState('')
  const [step, setStep] = useState<'choose' | 'producer_details'>('choose')
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [ddi, setDdi] = useState('+34')
  const [msg, setMsg] = useState('')

  async function confirm(role: 'artist' | 'producer') {
    if (!phone.trim()) { setMsg('Telefone é obrigatório.'); return }
    if (role === 'producer' && !orgName.trim()) { setMsg('Nome da organização é obrigatório.'); return }
    setLoading(true)
    await completeRoleSetup(role, role === 'producer' ? orgName.trim() : undefined)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '32px 28px', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', fontSize: 28, fontWeight: 900, letterSpacing: '0.12em', color: '#1A6994', marginBottom: 4 }}>SOMA</div>
        <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.2em', marginBottom: 24 }}>CULTURA · ODÉ</div>
        <h1 style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Quem és tu?</h1>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 24px', lineHeight: 1.5 }}>
          Para terminar o registo, diz-nos como vais usar a plataforma.
        </p>

        {msg && <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, border: '1px solid rgba(255,100,100,0.3)', color: '#ff8a8a', background: 'rgba(255,100,100,0.08)', textAlign: 'center' }}>{msg}</div>}

        {step === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: 6 }}>Telefone *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={ddi} onChange={e => setDdi(e.target.value)}
                  style={{ background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '12px 8px', fontSize: 13, width: 100, flexShrink: 0 }}>
                  {['+34','+55','+351','+33','+44','+49','+1','+52','+54','+56','+57','+238','+244','+258'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input style={{ background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '12px 14px', fontSize: 14, outline: 'none', flex: 1 }}
                  type="tel" value={phone} placeholder="612 345 678"
                  onChange={e => setPhone(e.target.value.replace(/[^0-9\s\-]/g, ''))} />
              </div>
            </div>

            <button style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', textAlign: 'left', width: '100%', color: '#fff', fontFamily: 'inherit' }}
              onClick={() => confirm('artist')} disabled={loading}>
              <span style={{ fontSize: 28 }}>🎤</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Sou artista</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>Quero gerir o meu perfil e receber propostas</div>
              </div>
            </button>

            <button style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(26,105,148,0.08)', border: '1px solid rgba(26,105,148,0.4)', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', textAlign: 'left', width: '100%', color: '#fff', fontFamily: 'inherit' }}
              onClick={() => setStep('producer_details')} disabled={loading}>
              <span style={{ fontSize: 28 }}>🏢</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Sou produtor/a ou organização</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>Quero gerir artistas, contratos e oportunidades</div>
              </div>
            </button>

            {loading && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>A configurar conta...</p>}
          </div>
        )}

        {step === 'producer_details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Nome da organização / agência *</label>
            <input style={{ background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '12px 14px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' as const }}
              value={orgName} placeholder="Ex: Xiphefu Produções"
              onChange={e => setOrgName(e.target.value)} />
            <button style={{ background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%' }}
              disabled={loading} onClick={() => confirm('producer')}>
              {loading ? 'A configurar...' : 'Confirmar e entrar'}
            </button>
            <button style={{ background: 'none', border: 'none', color: '#60b4e8', fontSize: 13, cursor: 'pointer', padding: '8px 0', textAlign: 'center' as const, width: '100%' }}
              onClick={() => setStep('choose')}>← Voltar</button>
          </div>
        )}
      </div>
    </div>
  )
}

function AppContent() {
  const { user, loading, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('HOME')

  function navigateTo(tab: string) {
    setActiveTab(tab as Tab)
  }

  if (loading) return <div style={styles.loading}>A carregar...</div>
  if (!user) return <LoginScreen />
  if (user.needsRoleSetup) return <RoleSetupScreen />

  // Portal artista
  if (user.role === 'artist') {
    return (
      <div style={styles.app}>
        <header style={styles.header}>
          <div style={styles.logoWrap}>
            <span style={styles.logo}>SOMA</span>
            <span style={styles.logoSub}>CULTURA · ODÉ</span>
          </div>
          <nav style={styles.nav}>
            {artistTabs.map(tab => (
              <button key={tab.id}
                style={{ ...styles.navButton, ...(activeTab === tab.id ? styles.navButtonActive : {}) }}
                onClick={() => setActiveTab(tab.id as Tab)}>
                {tab.label}
              </button>
            ))}
          </nav>
          <div style={styles.userBox}>
            <LangSwitcher />
            <span style={styles.userText}>{user.email}</span>
            <button style={styles.logoutBtn} onClick={async () => { await signOut(); window.location.reload() }}>Sair</button>
          </div>
        </header>
        <main style={styles.main}>
          {activeTab === 'HOME'      && <DashboardHome onNavigate={navigateTo} />}
          {activeTab === 'PORTAL'    && <ArtistPortal />}
          {activeTab === 'CONTACTOS' && <ContactsView />}

          {activeTab === 'PROJETOS'     && <ArtistPlaceholder title="Projetos" emoji="📁" text="Em breve: os teus projetos, com a possibilidade de ligar cada um a um produtor." />}
          {activeTab === 'OPORTUNIDADES'&& <ArtistPlaceholder title="Oportunidades" emoji="🎯" text="Em breve: editais, residências e open calls compatíveis com o teu perfil." />}
          {activeTab === 'EVENTOS'      && <ArtistPlaceholder title="Eventos" emoji="🎪" text="Em breve: os eventos onde participas." />}
          {activeTab === 'PRODUTORES'   && <ArtistPlaceholder title="Produtores" emoji="🏢" text="Em breve: o diretório de produtores, onde podes pedir para ligar os teus projetos." />}
          {activeTab === 'CONTRATOS'    && <ArtistPlaceholder title="Contratos" emoji="📄" text="Em breve: os teus contratos e pagamentos." />}
          {activeTab === 'PIPELINE'     && <ArtistPlaceholder title="Pipeline" emoji="📊" text="Em breve: o estado das tuas candidaturas e propostas." />}
          {activeTab === 'DOCUMENTOS'   && <ArtistPlaceholder title="Documentos" emoji="📎" text="Em breve: cartas-convite e documentação para as tuas candidaturas." />}
        </main>
      </div>
    )
  }

  const visibleTabs = user.role === 'producer' ? producerTabs : adminTabs

  const safeTab = visibleTabs.find(t => t.id === activeTab)
    ? activeTab
    : 'HOME'

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.logoWrap}>
          <span style={styles.logo}>SOMA</span>
          <span style={styles.logoSub}>CULTURA · ODÉ</span>
        </div>
        <nav style={styles.nav}>
          {visibleTabs.map(tab => (
            <button key={tab.id}
              style={{ ...styles.navButton, ...(safeTab === tab.id ? styles.navButtonActive : {}) }}
              onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>
        <div style={styles.userBox}>
          <LangSwitcher />
          <span style={styles.userText}>{user.email} · {user.role}</span>
          <button style={styles.logoutBtn} onClick={async () => { await signOut(); window.location.reload() }}>Sair</button>
        </div>
      </header>

      <main style={styles.main}>
        {safeTab === 'HOME'         && <DashboardHome onNavigate={navigateTo} />}
        {safeTab === 'PERFIL'       && user.role === 'producer'                    && <ProducerPortal />}
        {safeTab === 'ARTISTAS'     && hasAccess(user.role as any, 'artists')      && <ArtistManager />}
        {safeTab === 'PROJETOS'     && hasAccess(user.role as any, 'contracts')    && <ProjectManager />}
        {safeTab === 'OPORTUNIDADES'&& hasAccess(user.role as any, 'opportunities')&& <MatchView />}
        {safeTab === 'EVENTOS'      && hasAccess(user.role as any, 'contracts')    && <EventManager />}
        {safeTab === 'CONTACTOS'    && hasAccess(user.role as any, 'contacts')     && <ContactsView />}
        {safeTab === 'CONTRATOS'    && hasAccess(user.role as any, 'contracts')    && <ContractManager />}
        {safeTab === 'PIPELINE'     && hasAccess(user.role as any, 'pipeline')     && <PipelineView />}
        {safeTab === 'DOCUMENTOS'   && hasAccess(user.role as any, 'documents')    && <DocumentsView />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: { minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  loading: { padding: 40, color: '#fff', background: '#000', minHeight: '100vh' },
  header: { height: 58, background: '#1A6994', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', position: 'sticky', top: 0, zIndex: 100, boxSizing: 'border-box', gap: 20 },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  logo: { fontSize: 20, fontWeight: 900, letterSpacing: '0.12em', color: '#fff' },
  logoSub: { fontSize: 11, color: 'rgba(255,255,255,0.68)', letterSpacing: '0.18em', whiteSpace: 'nowrap' },
  nav: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center', flex: 1 },
  navButton: { background: 'transparent', color: '#fff', border: '1px solid transparent', borderRadius: 7, padding: '7px 13px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  navButtonActive: { background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.42)' },
  userBox: { display: 'flex', alignItems: 'center', gap: 10 },
  userText: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  logoutBtn: { background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  main: { minHeight: 'calc(100vh - 58px)', background: '#000' },
}