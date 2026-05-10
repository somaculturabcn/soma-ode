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

type Tab =
  | 'PERFIL'
  | 'ARTISTAS'
  | 'OPORTUNIDADES'
  | 'CONTACTOS'
  | 'CONTRATOS'
  | 'PIPELINE'
  | 'DOCUMENTOS'
  | 'EVENTOS'

const tabs: { id: Tab; label: string; permission?: string; producerOnly?: boolean }[] = [
  { id: 'PERFIL', label: 'Perfil', producerOnly: true },
  { id: 'ARTISTAS', label: 'Artistas', permission: 'artists' },
  { id: 'OPORTUNIDADES', label: 'Oportunidades', permission: 'opportunities' },
  { id: 'EVENTOS', label: 'Eventos', permission: 'contracts' },
  { id: 'CONTACTOS', label: 'Contactos', permission: 'contacts' },
  { id: 'CONTRATOS', label: 'Contratos', permission: 'contracts' },
  { id: 'PIPELINE', label: 'Pipeline', permission: 'pipeline' },
  { id: 'DOCUMENTOS', label: 'Documentos', permission: 'documents' },
]

// Selector de idioma — aparece no header
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

function AppContent() {
  const { user, loading, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('PERFIL')

  if (loading) {
    return <div style={styles.loading}>A carregar...</div>
  }

  if (!user) {
    return <LoginScreen />
  }

  if (user.role === 'artist') {
    return (
      <div style={styles.app}>
        <header style={styles.header}>
          <div style={styles.logoWrap}>
            <span style={styles.logo}>SOMA</span>
            <span style={styles.logoSub}>CULTURA · ODÉ · PORTAL</span>
          </div>
          <div style={styles.userBox}>
            <LangSwitcher />
            <span style={styles.userText}>{user.email}</span>
            <button style={styles.logoutBtn} onClick={async () => { await signOut(); window.location.reload() }}>
              Sair
            </button>
          </div>
        </header>
        <main style={styles.main}>
          <ArtistPortal />
        </main>
      </div>
    )
  }

  const visibleTabs = tabs.filter(tab => {
    if (tab.producerOnly) return user.role === 'producer'
    if (!tab.permission) return true
    return hasAccess(user.role as any, tab.permission)
  })

  const safeTab = visibleTabs.find(t => t.id === activeTab)
    ? activeTab
    : visibleTabs[0]?.id

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.logoWrap}>
          <span style={styles.logo}>SOMA</span>
          <span style={styles.logoSub}>CULTURA · ODÉ</span>
        </div>

        <nav style={styles.nav}>
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              style={{ ...styles.navButton, ...(safeTab === tab.id ? styles.navButtonActive : {}) }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div style={styles.userBox}>
          <LangSwitcher />
          <span style={styles.userText}>{user.email} · {user.role}</span>
          <button style={styles.logoutBtn} onClick={async () => { await signOut(); window.location.reload() }}>
            Sair
          </button>
        </div>
      </header>

      <main style={styles.main}>
        {safeTab === 'PERFIL' && user.role === 'producer' && <ProducerPortal />}
        {safeTab === 'ARTISTAS' && hasAccess(user.role as any, 'artists') && <ArtistManager />}
        {safeTab === 'OPORTUNIDADES' && hasAccess(user.role as any, 'opportunities') && <MatchView />}
        {safeTab === 'EVENTOS' && hasAccess(user.role as any, 'contracts') && <EventManager />}
        {safeTab === 'CONTACTOS' && hasAccess(user.role as any, 'contacts') && <ContactsView />}
        {safeTab === 'CONTRATOS' && hasAccess(user.role as any, 'contracts') && <ContractManager />}
        {safeTab === 'PIPELINE' && hasAccess(user.role as any, 'pipeline') && <PipelineView />}
        {safeTab === 'DOCUMENTOS' && hasAccess(user.role as any, 'documents') && <DocumentsView />}
      </main>
    </div>
  )
}

// LanguageProvider envolve tudo — única mudança estrutural
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
  app: {
    minHeight: '100vh',
    background: '#000',
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  loading: {
    padding: 40,
    color: '#fff',
    background: '#000',
    minHeight: '100vh',
  },
  header: {
    height: 58,
    background: '#1A6994',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxSizing: 'border-box',
    gap: 20,
  },
  logoWrap: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  logo: { fontSize: 20, fontWeight: 900, letterSpacing: '0.12em', color: '#fff' },
  logoSub: { fontSize: 11, color: 'rgba(255,255,255,0.68)', letterSpacing: '0.18em', whiteSpace: 'nowrap' },
  nav: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center', flex: 1 },
  navButton: {
    background: 'transparent',
    color: '#fff',
    border: '1px solid transparent',
    borderRadius: 7,
    padding: '8px 15px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  navButtonActive: {
    background: 'rgba(255,255,255,0.18)',
    border: '1px solid rgba(255,255,255,0.42)',
  },
  userBox: { display: 'flex', alignItems: 'center', gap: 10 },
  userText: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  logoutBtn: {
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff',
    padding: '6px 10px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 12,
  },
  main: { minHeight: 'calc(100vh - 58px)', background: '#000' },
}