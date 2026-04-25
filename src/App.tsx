// src/App.tsx
// SOMA ODÉ — App principal (Claude · 2026-04-25)
// Tabs: Artistas · Oportunidades · Contactos · Contratos · Pipeline

import { useState } from 'react'
import type { Artist } from './types/artist'
import ArtistManager from './components/ArtistManager'
import MatchView from './components/MatchView'
import ContactsView from './components/ContactsView'
import ContractManager from './components/ContractManager'
import PipelineView from './components/PipelineView'

type Tab = 'artistas' | 'oportunidades' | 'contactos' | 'contratos' | 'pipeline'

export default function App() {
  const [tab, setTab] = useState<Tab>('artistas')
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null)

  function handleSelectArtist(artist: Artist) {
    setSelectedArtist(artist)
    setTab('oportunidades')
  }

  return (
    <div style={s.app}>
      <header style={s.header}>
        <div style={s.brand}>
          <span style={s.brandMain}>SOMA</span>
          <span style={s.brandSub}>CULTURA · ODÉ</span>
        </div>
        <nav style={s.nav}>
          {(
            [
              { id: 'artistas',      label: 'Artistas' },
              { id: 'oportunidades', label: 'Oportunidades' },
              { id: 'contactos',     label: 'Contactos' },
              { id: 'contratos',     label: 'Contratos' },
              { id: 'pipeline',      label: 'Pipeline' },
            ] as { id: Tab; label: string }[]
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{ ...s.navBtn, ...(tab === id ? s.navBtnActive : {}) }}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {tab === 'artistas' && (
          <ArtistManager
            selectedArtistId={selectedArtist?.id}
            onSelect={handleSelectArtist}
          />
        )}
        {tab === 'oportunidades' && <MatchView artist={selectedArtist} />}
        {tab === 'contactos'     && <ContactsView />}
        {tab === 'contratos'     && <ContractManager />}
        {tab === 'pipeline'      && <PipelineView />}
      </main>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    background: '#000',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    height: 60,
    background: '#1A6994',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  brand: { display: 'flex', alignItems: 'baseline', gap: 8 },
  brandMain: { fontSize: 18, fontWeight: 900, letterSpacing: '0.1em', color: '#fff' },
  brandSub: { fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.6)' },
  nav: { display: 'flex', gap: 4 },
  navBtn: {
    padding: '7px 16px',
    background: 'transparent',
    border: '1px solid transparent',
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    cursor: 'pointer',
    borderRadius: 7,
    fontWeight: 400,
    letterSpacing: '0.04em',
  },
  navBtnActive: {
    background: 'rgba(255,255,255,0.18)',
    border: '1px solid rgba(255,255,255,0.35)',
    color: '#fff',
    fontWeight: 700,
  },
}