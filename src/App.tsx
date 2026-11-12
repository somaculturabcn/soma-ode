// src/App.tsx — SOMA ODÉ v5.2 — Landing page + Auth + App
import { useState, useEffect } from 'react'

// ── Componentes ────────────────────────────────────────────────────────────
import LandingPage from './components/LandingPage'
import AuthScreen from './components/AuthScreen'
import ArtistProfileSetup from './components/ArtistProfileSetup'
import RadarView from './components/RadarView'
import MatchPanel from './components/MatchPanel'
import BookingManager from './components/BookingManager'
import SettingsPanel from './components/SettingsPanel'

type Screen = 'landing' | 'login' | 'register' | 'app'
type Tab = 'HOME' | 'PERFIL' | 'RADAR' | 'MATCH' | 'BOOKING' | 'SETTINGS'

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'HOME',     icon: '🏠', label: 'Início' },
  { id: 'PERFIL',   icon: '🎤', label: 'Perfil' },
  { id: 'RADAR',    icon: '📡', label: 'Radar' },
  { id: 'MATCH',    icon: '🎯', label: 'Match' },
  { id: 'BOOKING',  icon: '✈️', label: 'Booking' },
  { id: 'SETTINGS', icon: '⚙️', label: 'Config' },
]

// ── Home Screen (dentro da app) ────────────────────────────────────────────
function HomeScreen({ onNavigate, userName }: { onNavigate: (t: Tab) => void; userName?: string }) {
  let hasProfile = false
  let bookingCount = 0
  try {
    hasProfile = !!localStorage.getItem('soma_artist_profile')
    const raw = localStorage.getItem('soma_booking_contacts')
    if (raw) bookingCount = JSON.parse(raw).length
  } catch { /* */ }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', color: '#fff' }}>
      <h1 style={{ fontSize: 36, margin: '0 0 4px', color: '#60b4e8' }}>
        {userName ? `Olá, ${userName}!` : 'SOMA ODÉ'}
      </h1>
      <p style={{ margin: '0 0 32px', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
        Plataforma de gestão cultural — artistas × oportunidades
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        <QuickCard icon="🎤" title="Meu Perfil" sub={hasProfile ? '✅ Configurado' : '⚠️ Por configurar'}
          color={hasProfile ? '#6ef3a5' : '#ffcf5c'} onClick={() => onNavigate('PERFIL')} />
        <QuickCard icon="📡" title="Radar" sub="100 oportunidades" color="#60b4e8" onClick={() => onNavigate('RADAR')} />
        <QuickCard icon="🎯" title="Match" sub={hasProfile ? 'Pronto a cruzar' : 'Precisa de perfil'}
          color="#c084fc" onClick={() => onNavigate('MATCH')} />
        <QuickCard icon="✈️" title="Booking" sub={`${bookingCount} contactos`} color="#fb923c" onClick={() => onNavigate('BOOKING')} />
      </div>

      <div style={{ marginTop: 40, padding: 20, background: '#0a0a0a', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>🚀 Como começar</h3>
        <ol style={{ margin: 0, paddingLeft: 20, color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 2 }}>
          <li>Vai a <strong style={{ color: '#60b4e8', cursor: 'pointer' }} onClick={() => onNavigate('PERFIL')}>Perfil</strong> e responde às 4 perguntas</li>
          <li>Explora o <strong style={{ color: '#60b4e8', cursor: 'pointer' }} onClick={() => onNavigate('RADAR')}>Radar</strong> — filtra por região, tipo e área</li>
          <li>Corre o <strong style={{ color: '#60b4e8', cursor: 'pointer' }} onClick={() => onNavigate('MATCH')}>Match</strong> para encontrar as melhores oportunidades</li>
          <li>Adiciona venues ao <strong style={{ color: '#60b4e8', cursor: 'pointer' }} onClick={() => onNavigate('BOOKING')}>Booking</strong> e gera emails</li>
        </ol>
      </div>
    </div>
  )
}

function QuickCard({ icon, title, sub, color, onClick }: {
  icon: string; title: string; sub: string; color: string; onClick: () => void
}) {
  return (
    <div onClick={onClick} style={{
      background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12,
      padding: '18px 16px', cursor: 'pointer', transition: 'border-color 0.15s',
    }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color }}>{sub}</div>
    </div>
  )
}

// ── App principal ──────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [tab, setTab] = useState<Tab>('HOME')
  const [user, setUser] = useState<{ email: string; id: string; name?: string } | null>(null)

  // Verificar se já está logged in
  useEffect(() => {
    try {
      const stored = localStorage.getItem('soma_user')
      if (stored) {
        const u = JSON.parse(stored)
        setUser(u)
        setScreen('app')
      }
    } catch { /* */ }
  }, [])

  function handleAuthSuccess(u: { email: string; id: string; name?: string }) {
    setUser(u)
    setScreen('app')
  }

  function handleLogout() {
    localStorage.removeItem('soma_user')
    setUser(null)
    setScreen('landing')
  }

  // ── Landing page ─────────────────────────────────────────────
  if (screen === 'landing') {
    return (
      <LandingPage
        onLogin={() => setScreen('login')}
        onRegister={() => setScreen('register')}
      />
    )
  }

  // ── Auth screen ──────────────────────────────────────────────
  if (screen === 'login' || screen === 'register') {
    return (
      <AuthScreen
        mode={screen}
        onBack={() => setScreen('landing')}
        onSuccess={handleAuthSuccess}
      />
    )
  }

  // ── App principal (autenticado) ──────────────────────────────
  function renderContent() {
    switch (tab) {
      case 'HOME':     return <HomeScreen onNavigate={setTab} userName={user?.name || user?.email?.split('@')[0]} />
      case 'PERFIL':   return <ArtistProfileSetup />
      case 'RADAR':    return <RadarView />
      case 'MATCH':    return <MatchPanel />
      case 'BOOKING':  return <BookingManager />
      case 'SETTINGS': return <SettingsPanel />
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 52, borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: '#050505', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#1A6994', letterSpacing: '-0.02em' }}>SOMA</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>ODÉ v5.2</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            {user?.email}
          </span>
          <button onClick={handleLogout} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '4px 10px', fontSize: 11, color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer',
          }}>
            Sair
          </button>
        </div>
      </header>

      {/* ── Nav tabs ─────────────────────────────────────────────── */}
      <nav style={{
        display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: '#050505', overflowX: 'auto', position: 'sticky', top: 52, zIndex: 99,
      }}>
        {TABS.map(t => {
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6,
              padding: '12px 18px', fontSize: 13, fontWeight: active ? 700 : 400,
              color: active ? '#60b4e8' : 'rgba(255,255,255,0.4)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: active ? '2px solid #1A6994' : '2px solid transparent',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}>
              <span>{t.icon}</span> {t.label}
            </button>
          )
        })}
      </nav>

      {/* ── Conteúdo ─────────────────────────────────────────────── */}
      <main>{renderContent()}</main>
    </div>
  )
}
