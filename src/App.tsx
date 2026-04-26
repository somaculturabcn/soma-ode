// src/App.tsx — SOMA ODÉ
// Menu principal + Documentos/Google Drive

import { useState } from 'react'

import ArtistManager from './components/ArtistManager'
import MatchView from './components/MatchView'
import ContactsView from './components/ContactsView'
import ContractManager from './components/ContractManager'
import PipelineView from './components/PipelineView'
import GoogleDriveConnect from './components/GoogleDriveConnect'

type Tab =
  | 'ARTISTAS'
  | 'OPORTUNIDADES'
  | 'CONTACTOS'
  | 'CONTRATOS'
  | 'PIPELINE'
  | 'DOCUMENTOS'

const tabs: { id: Tab; label: string }[] = [
  { id: 'ARTISTAS', label: 'Artistas' },
  { id: 'OPORTUNIDADES', label: 'Oportunidades' },
  { id: 'CONTACTOS', label: 'Contactos' },
  { id: 'CONTRATOS', label: 'Contratos' },
  { id: 'PIPELINE', label: 'Pipeline' },
  { id: 'DOCUMENTOS', label: 'Documentos' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('ARTISTAS')

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div style={styles.logoWrap}>
          <span style={styles.logo}>SOMA</span>
          <span style={styles.logoSub}>CULTURA · ODÉ</span>
        </div>

        <nav style={styles.nav}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              style={{
                ...styles.navButton,
                ...(activeTab === tab.id ? styles.navButtonActive : {}),
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main style={styles.main}>
        {activeTab === 'ARTISTAS' && <ArtistManager />}
        {activeTab === 'OPORTUNIDADES' && <MatchView />}
        {activeTab === 'CONTACTOS' && <ContactsView />}
        {activeTab === 'CONTRATOS' && <ContractManager />}
        {activeTab === 'PIPELINE' && <PipelineView />}
        {activeTab === 'DOCUMENTOS' && <GoogleDriveConnect />}
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#000',
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
  },

  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },

  logo: {
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: '0.12em',
    color: '#fff',
  },

  logoSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.68)',
    letterSpacing: '0.18em',
    whiteSpace: 'nowrap',
  },

  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },

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

  main: {
    minHeight: 'calc(100vh - 58px)',
    background: '#000',
  },
}