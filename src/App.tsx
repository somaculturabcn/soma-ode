// src/App.tsx — SOMA ODÉ v5.3 — Roles + Admin + Radar público
import { useState, useEffect } from 'react'

// ── Componentes ────────────────────────────────────────────────────────────
import LandingPage from './components/LandingPage'
import AuthScreen from './components/AuthScreen'
import ArtistProfileSetup from './components/ArtistProfileSetup'
import RadarView from './components/RadarView'
import MatchPanel from './components/MatchPanel'
import BookingManager from './components/BookingManager'
import SettingsPanel from './components/SettingsPanel'

// ── Tipos ──────────────────────────────────────────────────────────────────
type UserRole = 'artista' | 'produtor' | 'admin'
type Screen = 'landing' | 'login' | 'register' | 'radar-public' | 'app'
type Tab = 'HOME' | 'PERFIL' | 'RADAR' | 'MATCH' | 'BOOKING' | 'REDE' | 'SETTINGS'

type User = {
  email: string
  id: string
  name?: string
  role?: UserRole
}

// ── Admins da plataforma ───────────────────────────────────────────────────
const ADMIN_EMAILS = ['somaculturabcn@gmail.com']

function getEffectiveRole(user: User): UserRole {
  if (ADMIN_EMAILS.includes(user.email)) return 'admin'
  return user.role || 'artista'
}

// ── Tabs por papel ─────────────────────────────────────────────────────────
function getTabsForRole(role: UserRole): { id: Tab; icon: string; label: string }[] {
  const common = [
    { id: 'HOME' as Tab,     icon: '🏠', label: 'Início' },
    { id: 'RADAR' as Tab,    icon: '📡', label: 'Radar' },
    { id: 'MATCH' as Tab,    icon: '🎯', label: 'Match' },
    { id: 'BOOKING' as Tab,  icon: '✈️', label: 'Booking' },
  ]

  if (role === 'admin') {
    return [
      ...common.slice(0, 1),
      { id: 'PERFIL',   icon: '🎤', label: 'Perfil' },
      { id: 'REDE',     icon: '👥', label: 'Rede' },
      ...common.slice(1),
      { id: 'SETTINGS', icon: '⚙️', label: 'Config' },
    ]
  }

  if (role === 'produtor') {
    return [
      ...common.slice(0, 1),
      { id: 'REDE',     icon: '👥', label: 'Artistas' },
      ...common.slice(1),
      { id: 'SETTINGS', icon: '⚙️', label: 'Config' },
    ]
  }

  // artista
  return [
    ...common.slice(0, 1),
    { id: 'PERFIL',   icon: '🎤', label: 'Perfil' },
    ...common.slice(1),
    { id: 'REDE',     icon: '👥', label: 'Produtores' },
    { id: 'SETTINGS', icon: '⚙️', label: 'Config' },
  ]
}

// ── Componente Rede (gestão de contactos cruzada) ──────────────────────────
function NetworkManager({ role }: { role: UserRole }) {
  const STORAGE_KEY = 'soma_network'
  const [contacts, setContacts] = useState<{ name: string; email: string; type: string; notes: string }[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', type: '', notes: '' })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setContacts(JSON.parse(raw))
    } catch { /* */ }
  }, [])

  function save(list: typeof contacts) {
    setContacts(list)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  }

  function addContact() {
    if (!form.name.trim()) return
    const defaultType = role === 'produtor' ? 'artista' : role === 'artista' ? 'produtor' : form.type || 'outro'
    save([...contacts, { ...form, name: form.name.trim(), type: form.type || defaultType }])
    setForm({ name: '', email: '', type: '', notes: '' })
    setShowForm(false)
  }

  function removeContact(i: number) {
    save(contacts.filter((_, idx) => idx !== i))
  }

  const isAdmin = role === 'admin'
  const title = role === 'produtor' ? 'Os meus artistas' : role === 'artista' ? 'Os meus produtores' : 'Rede completa'
  const addLabel = role === 'produtor' ? 'Adicionar artista' : role === 'artista' ? 'Adicionar produtor/a' : 'Adicionar contacto'

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 20px', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: '#60b4e8' }}>👥 {title}</h1>
          {isAdmin && <span style={{ fontSize: 11, color: '#ffcf5c', background: 'rgba(255,207,92,0.1)', padding: '2px 8px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>ADMIN — acesso total</span>}
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8,
          padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          + {addLabel}
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <input style={inputSt} placeholder="Nome *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
            <input style={inputSt} placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            {isAdmin && (
              <select style={{ ...inputSt, cursor: 'pointer' }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="">Tipo...</option>
                <option value="artista">Artista</option>
                <option value="produtor">Produtor/a</option>
                <option value="venue">Venue / Festival</option>
                <option value="outro">Outro</option>
              </select>
            )}
            <textarea style={{ ...inputSt, minHeight: 60, resize: 'vertical' }} placeholder="Notas (opcional)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addContact} style={{ background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Guardar
              </button>
              <button onClick={() => setShowForm(false)} style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {contacts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
          Ainda não tens contactos na rede. Clica em "{addLabel}" para começar.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contacts.map((c, i) => (
            <div key={i} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{c.name}</span>
                  <span style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600, textTransform: 'uppercase',
                    background: c.type === 'artista' ? 'rgba(96,180,232,0.1)' : c.type === 'produtor' ? 'rgba(192,132,252,0.1)' : 'rgba(255,255,255,0.05)',
                    color: c.type === 'artista' ? '#60b4e8' : c.type === 'produtor' ? '#c084fc' : 'rgba(255,255,255,0.4)',
                  }}>{c.type || '—'}</span>
                </div>
                {c.email && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{c.email}</div>}
                {c.notes && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{c.notes}</div>}
              </div>
              <button onClick={() => removeContact(i)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 14, padding: 4 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const inputSt: React.CSSProperties = {
  background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
}

// ── Home Screen ────────────────────────────────────────────────────────────
function HomeScreen({ onNavigate, userName, role }: { onNavigate: (t: Tab) => void; userName?: string; role: UserRole }) {
  let hasProfile = false
  let bookingCount = 0
  try {
    hasProfile = !!localStorage.getItem('soma_artist_profile')
    const raw = localStorage.getItem('soma_booking_contacts')
    if (raw) bookingCount = JSON.parse(raw).length
  } catch { /* */ }

  const networkCount = (() => { try { const r = localStorage.getItem('soma_network'); return r ? JSON.parse(r).length : 0 } catch { return 0 } })()

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h1 style={{ fontSize: 36, margin: 0, color: '#60b4e8' }}>
          {userName ? `Olá, ${userName}!` : 'SOMA ODÉ'}
        </h1>
        {role === 'admin' && (
          <span style={{ fontSize: 10, background: 'rgba(255,207,92,0.15)', color: '#ffcf5c', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>ADMIN</span>
        )}
      </div>
      <p style={{ margin: '0 0 4px', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
        {role === 'produtor' ? '🏢 Produtor/a cultural' : role === 'admin' ? '👑 Administradora da plataforma' : '🎤 Artista'}
      </p>
      <p style={{ margin: '0 0 32px', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
        Plataforma de gestão cultural — artistas × oportunidades
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {(role === 'artista' || role === 'admin') && (
          <QuickCard icon="🎤" title="Meu Perfil" sub={hasProfile ? '✅ Configurado' : '⚠️ Por configurar'}
            color={hasProfile ? '#6ef3a5' : '#ffcf5c'} onClick={() => onNavigate('PERFIL')} />
        )}
        {role === 'produtor' && (
          <QuickCard icon="👥" title="Artistas" sub={`${networkCount} na rede`}
            color="#c084fc" onClick={() => onNavigate('REDE')} />
        )}
        {role === 'admin' && (
          <QuickCard icon="👥" title="Rede" sub={`${networkCount} contactos`}
            color="#c084fc" onClick={() => onNavigate('REDE')} />
        )}
        <QuickCard icon="📡" title="Radar" sub="100 oportunidades" color="#60b4e8" onClick={() => onNavigate('RADAR')} />
        <QuickCard icon="🎯" title="Match" sub={hasProfile ? 'Pronto a cruzar' : 'Precisa de perfil'}
          color="#c084fc" onClick={() => onNavigate('MATCH')} />
        <QuickCard icon="✈️" title="Booking" sub={`${bookingCount} contactos`} color="#fb923c" onClick={() => onNavigate('BOOKING')} />
      </div>

      <div style={{ marginTop: 40, padding: 20, background: '#0a0a0a', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
          🚀 {role === 'produtor' ? 'Como gerir artistas' : 'Como começar'}
        </h3>
        <ol style={{ margin: 0, paddingLeft: 20, color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 2 }}>
          {role === 'produtor' ? (
            <>
              <li>Vai a <strong style={{ color: '#60b4e8', cursor: 'pointer' }} onClick={() => onNavigate('REDE')}>Artistas</strong> e adiciona os artistas do teu roster</li>
              <li>Explora o <strong style={{ color: '#60b4e8', cursor: 'pointer' }} onClick={() => onNavigate('RADAR')}>Radar</strong> — filtra por região, tipo e área</li>
              <li>Corre o <strong style={{ color: '#60b4e8', cursor: 'pointer' }} onClick={() => onNavigate('MATCH')}>Match</strong> para cada artista</li>
              <li>Gere candidaturas no <strong style={{ color: '#60b4e8', cursor: 'pointer' }} onClick={() => onNavigate('BOOKING')}>Booking</strong></li>
            </>
          ) : (
            <>
              <li>Vai a <strong style={{ color: '#60b4e8', cursor: 'pointer' }} onClick={() => onNavigate('PERFIL')}>Perfil</strong> e responde às 4 perguntas</li>
              <li>Explora o <strong style={{ color: '#60b4e8', cursor: 'pointer' }} onClick={() => onNavigate('RADAR')}>Radar</strong> — filtra por região, tipo e área</li>
              <li>Corre o <strong style={{ color: '#60b4e8', cursor: 'pointer' }} onClick={() => onNavigate('MATCH')}>Match</strong> para encontrar as melhores oportunidades</li>
              <li>Adiciona venues ao <strong style={{ color: '#60b4e8', cursor: 'pointer' }} onClick={() => onNavigate('BOOKING')}>Booking</strong> e gera emails</li>
            </>
          )}
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
  const [user, setUser] = useState<User | null>(null)

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

  function handleAuthSuccess(u: User) {
    setUser(u)
    setScreen('app')
  }

  function handleLogout() {
    localStorage.removeItem('soma_user')
    setUser(null)
    setScreen('landing')
  }

  // ── Radar público (sem login) ───────────────────────────────
  if (screen === 'radar-public') {
    return (
      <div style={{ minHeight: '100vh', background: '#000', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', height: 52, borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: '#050505',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setScreen('landing')}>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#1A6994' }}>SOMA</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>ODÉ</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginLeft: 8 }}>← voltar</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setScreen('register')} style={{
              background: '#1A6994', color: '#fff', border: 'none', borderRadius: 6,
              padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
              Criar conta grátis
            </button>
            <button onClick={() => setScreen('login')} style={{
              background: 'transparent', color: '#60b4e8', border: '1px solid rgba(96,180,232,0.3)',
              borderRadius: 6, padding: '6px 14px', fontSize: 12, cursor: 'pointer',
            }}>
              Entrar
            </button>
          </div>
        </header>
        <div style={{ padding: '8px 20px', background: 'rgba(26,105,148,0.08)', borderBottom: '1px solid rgba(26,105,148,0.15)', textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: '#60b4e8' }}>
            📡 Estás a explorar o Radar em modo público — <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => setScreen('register')}>cria conta</span> para fazer Match e Booking
          </span>
        </div>
        <RadarView />
      </div>
    )
  }

  // ── Landing page ─────────────────────────────────────────────
  if (screen === 'landing') {
    return (
      <LandingPage
        onLogin={() => setScreen('login')}
        onRegister={() => setScreen('register')}
        onRadar={() => setScreen('radar-public')}
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
  const role = user ? getEffectiveRole(user) : 'artista'
  const tabs = getTabsForRole(role)

  function renderContent() {
    switch (tab) {
      case 'HOME':     return <HomeScreen onNavigate={setTab} userName={user?.name || user?.email?.split('@')[0]} role={role} />
      case 'PERFIL':   return <ArtistProfileSetup />
      case 'RADAR':    return <RadarView />
      case 'MATCH':    return <MatchPanel />
      case 'BOOKING':  return <BookingManager />
      case 'REDE':     return <NetworkManager role={role} />
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
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>ODÉ v5.3</span>
          {role === 'admin' && (
            <span style={{ fontSize: 9, background: 'rgba(255,207,92,0.15)', color: '#ffcf5c', padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>ADMIN</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            {role === 'produtor' ? '🏢' : role === 'admin' ? '👑' : '🎤'} {user?.email}
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
        {tabs.map(t => {
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
