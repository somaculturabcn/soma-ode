// src/App.tsx — SOMA ODÉ v5.0 — Simplificado: 5 ecrãs
import { useState } from 'react'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import { LanguageProvider, useLanguage, LANG_FLAGS, type Lang } from './i18n/LanguageContext'
import LoginScreen from './auth/LoginScreen'

// ── Novos componentes v5 ────────────────────────────────────────────────────
import ArtistProfileSetup from './components/ArtistProfileSetup'
import RadarView from './components/RadarView'
import MatchPanel from './components/MatchPanel'
import BookingManager from './components/BookingManager'

// ── Componentes existentes que se mantêm ────────────────────────────────────
import ArtistManager from './components/ArtistManager'
import ProjectManager from './components/ProjectManager'
import ContactsView from './components/ContactsView'
import DashboardHome from './components/DashboardHome'
import SettingsPanel from './components/SettingsPanel'

type Tab = 'HOME' | 'PERFIL' | 'RADAR' | 'MATCH' | 'BOOKING' | 'ARTISTAS' | 'PROJETOS' | 'CONTACTOS' | 'SETTINGS'

// ── Tabs por role ───────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, string> = {
  HOME: '🏠', PERFIL: '🎤', RADAR: '📡', MATCH: '🎯',
  BOOKING: '✈️', ARTISTAS: '👥', PROJETOS: '📁', CONTACTOS: '📇', SETTINGS: '⚙️',
}

const artistTabs: { id: Tab; label: string }[] = [
  { id: 'HOME',    label: 'Início' },
  { id: 'PERFIL',  label: 'Meu Perfil' },
  { id: 'RADAR',   label: 'Radar' },
  { id: 'MATCH',   label: 'Matches' },
  { id: 'SETTINGS', label: 'Config' },
]

const producerTabs: { id: Tab; label: string }[] = [
  { id: 'HOME',      label: 'Início' },
  { id: 'ARTISTAS',  label: 'Artistas' },
  { id: 'RADAR',     label: 'Radar' },
  { id: 'MATCH',     label: 'Matches' },
  { id: 'BOOKING',   label: 'Booking' },
  { id: 'PROJETOS',  label: 'Projetos' },
  { id: 'CONTACTOS', label: 'Contactos' },
  { id: 'SETTINGS',  label: 'Config' },
]

const adminTabs: { id: Tab; label: string }[] = [
  { id: 'HOME',      label: 'Início' },
  { id: 'ARTISTAS',  label: 'Artistas' },
  { id: 'RADAR',     label: 'Radar' },
  { id: 'MATCH',     label: 'Matches' },
  { id: 'BOOKING',   label: 'Booking' },
  { id: 'PROJETOS',  label: 'Projetos' },
  { id: 'CONTACTOS', label: 'Contactos' },
  { id: 'SETTINGS',  label: 'Config' },
]

// ── Role Setup (mantém-se) ──────────────────────────────────────────────────

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
        <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.2em', marginBottom: 24 }}>ODÉ</div>
        <h1 style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Quem és tu?</h1>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 24px', lineHeight: 1.5 }}>
          Para terminar o registo, diz-nos como vais usar a plataforma.
        </p>

        {msg && <div style={s.errorMsg}>{msg}</div>}

        {step === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={s.fieldLabel}>Telefone *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={ddi} onChange={e => setDdi(e.target.value)} style={s.selectSmall}>
                  {['+34','+55','+351','+33','+44','+49','+1','+52','+54','+56','+57','+238','+244','+258'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input style={{ ...s.input, flex: 1 }} type="tel" value={phone} placeholder="612 345 678"
                  onChange={e => setPhone(e.target.value.replace(/[^0-9\s\-]/g, ''))} />
              </div>
            </div>

            <button style={s.roleBtn} onClick={() => confirm('artist')} disabled={loading}>
              <span style={{ fontSize: 28 }}>🎤</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Sou artista</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Quero encontrar oportunidades e gerir a minha carreira</div>
              </div>
            </button>

            <button style={{ ...s.roleBtn, background: 'rgba(26,105,148,0.08)', borderColor: 'rgba(26,105,148,0.4)' }}
              onClick={() => setStep('producer_details')} disabled={loading}>
              <span style={{ fontSize: 28 }}>🏢</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Sou produtor/a</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Quero gerir artistas, booking e oportunidades</div>
              </div>
            </button>

            {loading && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>A configurar...</p>}
          </div>
        )}

        {step === 'producer_details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={s.fieldLabel}>Nome da organização *</label>
            <input style={s.input} value={orgName} placeholder="Ex: Xiphefu Produções"
              onChange={e => setOrgName(e.target.value)} />
            <button style={s.primaryBtn} disabled={loading} onClick={() => confirm('producer')}>
              {loading ? 'A configurar...' : 'Confirmar e entrar'}
            </button>
            <button style={s.linkBtn} onClick={() => setStep('choose')}>← Voltar</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Lang Switcher ───────────────────────────────────────────────────────────

function LangSwitcher() {
  const { lang, setLang } = useLanguage()
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {(['pt', 'es', 'en'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)} style={{
          background: lang === l ? 'rgba(255,255,255,0.2)' : 'transparent',
          border: '1px solid rgba(255,255,255,0.15)', borderRadius: 5,
          color: '#fff', padding: '3px 7px', fontSize: 11, cursor: 'pointer',
        }}>
          {LANG_FLAGS[l]}
        </button>
      ))}
    </div>
  )
}

// ── App principal ───────────────────────────────────────────────────────────

function AppContent() {
  const { user, loading, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('HOME')

  if (loading) return <div style={s.loading}>A carregar SOMA ODÉ...</div>
  if (!user) return <LoginScreen />
  if (user.needsRoleSetup) return <RoleSetupScreen />

  const role = user.role
  const tabs = role === 'artist' ? artistTabs : role === 'producer' ? producerTabs : adminTabs
  const safeTab = tabs.find(t => t.id === activeTab) ? activeTab : 'HOME'

  return (
    <div style={s.app}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header style={s.header}>
        <div style={s.logoWrap}>
          <span style={s.logo}>SOMA</span>
          <span style={s.logoSub}>ODÉ</span>
        </div>

        <nav style={s.nav}>
          {tabs.map(tab => (
            <button key={tab.id}
              style={{ ...s.navBtn, ...(safeTab === tab.id ? s.navBtnActive : {}) }}
              onClick={() => setActiveTab(tab.id)}>
              <span style={{ fontSize: 14 }}>{TAB_ICONS[tab.id]}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div style={s.userBox}>
          <LangSwitcher />
          <span style={s.userText}>{user.email?.split('@')[0]}</span>
          <button style={s.logoutBtn} onClick={async () => { await signOut(); window.location.reload() }}>Sair</button>
        </div>
      </header>

      {/* ── Conteúdo ───────────────────────────────────────────────── */}
      <main style={s.main}>
        {safeTab === 'HOME'      && <DashboardHome onNavigate={(t: string) => setActiveTab(t as Tab)} />}
        {safeTab === 'PERFIL'    && <ArtistProfileSetup />}
        {safeTab === 'ARTISTAS'  && <ArtistManager />}
        {safeTab === 'RADAR'     && <RadarView />}
        {safeTab === 'MATCH'     && <MatchPanel />}
        {safeTab === 'BOOKING'   && <BookingManager />}
        {safeTab === 'PROJETOS'  && <ProjectManager />}
        {safeTab === 'CONTACTOS' && <ContactsView />}
        {safeTab === 'SETTINGS'  && <SettingsPanel />}
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

// ── Estilos ─────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  app: { minHeight: '100vh', background: '#000', color: '#fff', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  loading: { padding: 40, color: '#fff', background: '#000', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },

  header: { background: '#0a0a0a', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', position: 'sticky', top: 0, zIndex: 100, height: 56, gap: 16 },
  logoWrap: { display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0 },
  logo: { fontSize: 20, fontWeight: 900, letterSpacing: '0.12em', color: '#1A6994' },
  logoSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.18em' },

  nav: { display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center', flexWrap: 'wrap' },
  navBtn: { display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid transparent', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' },
  navBtnActive: { background: 'rgba(26,105,148,0.15)', color: '#fff', borderColor: 'rgba(26,105,148,0.4)' },

  userBox: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  userText: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  logoutBtn: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11 },

  main: { minHeight: 'calc(100vh - 56px)' },

  // Form elements
  input: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '12px 14px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' as const },
  selectSmall: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '12px 8px', fontSize: 13, width: 100, flexShrink: 0 },
  fieldLabel: { fontSize: 12, color: 'rgba(255,255,255,0.55)', display: 'block', marginBottom: 6 },
  primaryBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%' },
  linkBtn: { background: 'none', border: 'none', color: '#60b4e8', fontSize: 13, cursor: 'pointer', padding: '8px 0', textAlign: 'center' as const },
  roleBtn: { display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', textAlign: 'left' as const, width: '100%', color: '#fff', fontFamily: 'inherit' },
  errorMsg: { padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, border: '1px solid rgba(255,100,100,0.3)', color: '#ff8a8a', background: 'rgba(255,100,100,0.08)', textAlign: 'center' as const },
}
