// src/App.tsx — SOMA ODÉ v6.0 — Tema claro (Manual da Marca SOMA)
import { useState, useEffect } from 'react'
import { colors, shadows, radius, baseStyles } from './theme'

// ── Componentes ────────────────────────────────────────────────────────────
import LandingPage from './components/LandingPage'
import AuthScreen from './components/AuthScreen'
import ArtistProfileSetup from './components/ArtistProfileSetup'
import RadarView from './components/RadarView'
import MatchPanel from './components/MatchPanel'
import BookingManager from './components/BookingManager'
import SettingsPanel from './components/SettingsPanel'
import AdminArtistsPanel from './components/AdminArtistsPanel'
import ProjectManager from './components/ProjectManager'
import { logActivity } from './services/activityLog'

// ── Tipos ──────────────────────────────────────────────────────────────────
type UserRole = 'artista' | 'produtor' | 'admin'
type Screen = 'landing' | 'login' | 'register' | 'radar-public' | 'app'
type Tab = 'HOME' | 'PERFIL' | 'PROJETOS' | 'RADAR' | 'MATCH' | 'BOOKING' | 'REDE' | 'ARTISTAS' | 'SETTINGS'

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
      { id: 'PERFIL' as Tab,    icon: '🎤', label: 'Perfil' },
      { id: 'ARTISTAS' as Tab,  icon: '🎭', label: 'Artistas' },
      { id: 'PROJETOS' as Tab,  icon: '🗂', label: 'Projetos' },
      { id: 'REDE' as Tab,      icon: '👥', label: 'Rede' },
      ...common.slice(1),
      { id: 'SETTINGS' as Tab,  icon: '⚙️', label: 'Config' },
    ]
  }

  if (role === 'produtor') {
    return [
      ...common.slice(0, 1),
      { id: 'PROJETOS' as Tab,  icon: '🗂', label: 'Projetos' },
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
    const contactType = form.type || defaultType
    save([...contacts, { ...form, name: form.name.trim(), type: contactType }])
    logActivity('REDE', 'criar', `Adicionou contacto: ${form.name.trim()} (${contactType})`, { name: form.name.trim(), type: contactType, email: form.email })
    setForm({ name: '', email: '', type: '', notes: '' })
    setShowForm(false)
  }

  function removeContact(i: number) {
    const c = contacts[i]
    logActivity('REDE', 'apagar', `Removeu contacto: ${c?.name || '?'}`)
    save(contacts.filter((_, idx) => idx !== i))
  }

  const isAdmin = role === 'admin'
  const title = role === 'produtor' ? 'Os meus artistas' : role === 'artista' ? 'Os meus produtores' : 'Rede completa'
  const addLabel = role === 'produtor' ? 'Adicionar artista' : role === 'artista' ? 'Adicionar produtor/a' : 'Adicionar contacto'

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 20px', color: colors.text }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: colors.primary }}>👥 {title}</h1>
          {isAdmin && <span style={{ fontSize: 11, color: colors.admin, background: colors.adminBg, padding: '2px 8px', borderRadius: 4, marginTop: 4, display: 'inline-block', fontWeight: 600 }}>ADMIN — acesso total</span>}
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          ...baseStyles.button, padding: '8px 16px',
        }}>
          + {addLabel}
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div style={{ ...baseStyles.card, marginBottom: 16 }}>
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
              <button onClick={addContact} style={baseStyles.button}>
                Guardar
              </button>
              <button onClick={() => setShowForm(false)} style={baseStyles.buttonSecondary}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {contacts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted, fontSize: 14 }}>
          Ainda não tens contactos na rede. Clica em "{addLabel}" para começar.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {contacts.map((c, i) => (
            <div key={i} style={{ ...baseStyles.card, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: colors.text, fontSize: 14 }}>{c.name}</span>
                  <span style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600, textTransform: 'uppercase',
                    background: c.type === 'artista' ? colors.artistaBg : c.type === 'produtor' ? colors.produtorBg : colors.bgInput,
                    color: c.type === 'artista' ? colors.artista : c.type === 'produtor' ? colors.produtor : colors.textMuted,
                  }}>{c.type || '—'}</span>
                </div>
                {c.email && <div style={{ fontSize: 12, color: colors.textSecondary }}>{c.email}</div>}
                {c.notes && <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{c.notes}</div>}
              </div>
              <button onClick={() => removeContact(i)} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 14, padding: 4 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const inputSt: React.CSSProperties = {
  ...baseStyles.input,
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
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', color: colors.text }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h1 style={{ fontSize: 32, margin: 0, color: colors.text, fontWeight: 800 }}>
          {userName ? `Olá, ${userName}!` : 'SOMA ODÉ'}
        </h1>
        {role === 'admin' && (
          <span style={{ fontSize: 10, background: colors.adminBg, color: colors.admin, padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>ADMIN</span>
        )}
      </div>
      <p style={{ margin: '0 0 4px', color: colors.textSecondary, fontSize: 14 }}>
        {role === 'produtor' ? '🏢 Produtor/a cultural' : role === 'admin' ? '👑 Administradora da plataforma' : '🎤 Artista'}
      </p>
      <p style={{ margin: '0 0 32px', color: colors.textMuted, fontSize: 13 }}>
        Plataforma de gestão cultural — artistas × oportunidades
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {(role === 'artista' || role === 'admin') && (
          <QuickCard icon="🎤" title="Meu Perfil" sub={hasProfile ? '✅ Configurado' : '⚠️ Por configurar'}
            color={hasProfile ? colors.success : colors.warning} onClick={() => onNavigate('PERFIL')} />
        )}
        {role === 'produtor' && (
          <QuickCard icon="👥" title="Artistas" sub={`${networkCount} na rede`}
            color={colors.produtor} onClick={() => onNavigate('REDE')} />
        )}
        {role === 'admin' && (
          <QuickCard icon="👥" title="Rede" sub={`${networkCount} contactos`}
            color={colors.produtor} onClick={() => onNavigate('REDE')} />
        )}
        <QuickCard icon="📡" title="Radar" sub="100 oportunidades" color={colors.primary} onClick={() => onNavigate('RADAR')} />
        <QuickCard icon="🎯" title="Match" sub={hasProfile ? 'Pronto a cruzar' : 'Precisa de perfil'}
          color={colors.produtor} onClick={() => onNavigate('MATCH')} />
        <QuickCard icon="✈️" title="Booking" sub={`${bookingCount} contactos`} color="#E67E22" onClick={() => onNavigate('BOOKING')} />
      </div>

      <div style={{ ...baseStyles.card, marginTop: 32 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 14, color: colors.textSecondary }}>
          🚀 {role === 'produtor' ? 'Como gerir artistas' : 'Como começar'}
        </h3>
        <ol style={{ margin: 0, paddingLeft: 20, color: colors.textSecondary, fontSize: 13, lineHeight: 2 }}>
          {role === 'produtor' ? (
            <>
              <li>Vai a <strong style={{ color: colors.primary, cursor: 'pointer' }} onClick={() => onNavigate('REDE')}>Artistas</strong> e adiciona os artistas do teu roster</li>
              <li>Explora o <strong style={{ color: colors.primary, cursor: 'pointer' }} onClick={() => onNavigate('RADAR')}>Radar</strong> — filtra por região, tipo e área</li>
              <li>Corre o <strong style={{ color: colors.primary, cursor: 'pointer' }} onClick={() => onNavigate('MATCH')}>Match</strong> para cada artista</li>
              <li>Gere candidaturas no <strong style={{ color: colors.primary, cursor: 'pointer' }} onClick={() => onNavigate('BOOKING')}>Booking</strong></li>
            </>
          ) : (
            <>
              <li>Vai a <strong style={{ color: colors.primary, cursor: 'pointer' }} onClick={() => onNavigate('PERFIL')}>Perfil</strong> e responde às 4 perguntas</li>
              <li>Explora o <strong style={{ color: colors.primary, cursor: 'pointer' }} onClick={() => onNavigate('RADAR')}>Radar</strong> — filtra por região, tipo e área</li>
              <li>Corre o <strong style={{ color: colors.primary, cursor: 'pointer' }} onClick={() => onNavigate('MATCH')}>Match</strong> para encontrar as melhores oportunidades</li>
              <li>Adiciona venues ao <strong style={{ color: colors.primary, cursor: 'pointer' }} onClick={() => onNavigate('BOOKING')}>Booking</strong> e gera emails</li>
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
      ...baseStyles.card, padding: '18px 16px', cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = shadows.md; e.currentTarget.style.borderColor = colors.primaryBorder }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = shadows.card; e.currentTarget.style.borderColor = colors.border }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color, fontWeight: 600 }}>{sub}</div>
    </div>
  )
}

// ── App principal ──────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>('landing')
  const [tab, setTab] = useState<Tab>('HOME')
  const [user, setUser] = useState<User | null>(null)
  const [viewAs, setViewAs] = useState<UserRole | null>(null)

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
    logActivity('AUTH', 'login', `Login: ${u.email} (${getEffectiveRole(u)})`)
  }

  function handleLogout() {
    logActivity('AUTH', 'logout', 'Sessão terminada')
    localStorage.removeItem('soma_user')
    setUser(null)
    setScreen('landing')
  }

  // ── Radar público (sem login) ───────────────────────────────
  if (screen === 'radar-public') {
    return (
      <div style={{ ...baseStyles.page }}>
        <header style={{
          ...baseStyles.header, height: 56,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setScreen('landing')}>
            <img src="/soma-logo.png" alt="SOMA Cultura" style={{ height: 28 }} />
            <span style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>ODÉ</span>
            <span style={{ fontSize: 11, color: colors.textMuted, marginLeft: 8 }}>← voltar</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setScreen('register')} style={baseStyles.button}>
              Criar conta grátis
            </button>
            <button onClick={() => setScreen('login')} style={{
              ...baseStyles.buttonSecondary, color: colors.primary,
            }}>
              Entrar
            </button>
          </div>
        </header>
        <div style={{ padding: '8px 20px', background: colors.primaryBg, borderBottom: `1px solid ${colors.primaryBorder}`, textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: colors.primary }}>
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
  const realRole = user ? getEffectiveRole(user) : 'artista'
  const role = viewAs || realRole
  const tabs = getTabsForRole(role)

  function renderContent() {
    switch (tab) {
      case 'HOME':     return <HomeScreen onNavigate={setTab} userName={user?.name || user?.email?.split('@')[0]} role={role} />
      case 'PERFIL':   return <ArtistProfileSetup />
      case 'RADAR':    return <RadarView isAdmin={role === 'admin'} />
      case 'MATCH':    return <MatchPanel />
      case 'BOOKING':  return <BookingManager />
      case 'REDE':     return <NetworkManager role={role} />
      case 'ARTISTAS': return <AdminArtistsPanel />
      case 'PROJETOS': return <ProjectManager userId={user?.id} userEmail={user?.email} isAdmin={role === 'admin'} />
      case 'SETTINGS': return <SettingsPanel />
    }
  }

  return (
    <div style={{ ...baseStyles.page }}>
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <header style={{
        ...baseStyles.header, height: 56,
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: shadows.sm,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/soma-logo.png" alt="SOMA Cultura" style={{ height: 28 }} />
          <span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 600, letterSpacing: '0.05em' }}>ODÉ</span>
          {realRole === 'admin' && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
              background: viewAs ? colors.primaryBg : colors.adminBg,
              color: viewAs ? colors.primary : colors.admin,
            }}>
              {viewAs ? `VISTA ${viewAs.toUpperCase()}` : 'ADMIN'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* ── Seletor de vista (só admin) ── */}
          {realRole === 'admin' && (
            <div style={{ display: 'flex', gap: 0, background: colors.bgInput, borderRadius: radius.sm, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
              {([
                { v: null,        icon: '👑', label: 'Admin' },
                { v: 'produtor' as UserRole, icon: '🏢', label: 'Produtor' },
                { v: 'artista' as UserRole,  icon: '🎤', label: 'Artista' },
              ] as const).map(opt => {
                const isActive = viewAs === opt.v
                return (
                  <button
                    key={opt.label}
                    onClick={() => { setViewAs(opt.v); setTab('HOME') }}
                    style={{
                      background: isActive ? colors.primaryBg : 'transparent',
                      border: 'none', padding: '4px 10px', fontSize: 10, fontWeight: isActive ? 700 : 500,
                      color: isActive ? colors.primary : colors.textMuted,
                      cursor: 'pointer', whiteSpace: 'nowrap',
                      borderRight: `1px solid ${colors.borderLight}`,
                    }}
                  >
                    {opt.icon} {opt.label}
                  </button>
                )
              })}
            </div>
          )}
          <span style={{ fontSize: 11, color: colors.textMuted }}>
            {role === 'produtor' ? '🏢' : role === 'admin' ? '👑' : '🎤'} {user?.email}
          </span>
          <button onClick={handleLogout} style={{
            ...baseStyles.buttonSecondary,
            padding: '4px 12px', fontSize: 11,
          }}>
            Sair
          </button>
        </div>
      </header>

      {/* ── Nav tabs ─────────────────────────────────────────────── */}
      <nav style={{
        display: 'flex', gap: 0, borderBottom: `1px solid ${colors.border}`,
        background: colors.bg, overflowX: 'auto', position: 'sticky', top: 56, zIndex: 99,
        boxShadow: shadows.sm,
      }}>
        {tabs.map(t => {
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => { setTab(t.id); logActivity(t.id, 'ver', `Abriu ${t.label}`) }} style={{
              flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6,
              padding: '12px 18px', fontSize: 13, fontWeight: active ? 700 : 500,
              color: active ? colors.primary : colors.textMuted,
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: active ? `2px solid ${colors.primary}` : '2px solid transparent',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}>
              <span>{t.icon}</span> {t.label}
            </button>
          )
        })}
      </nav>

      {/* ── Conteúdo ─────────────────────────────────────────────── */}
      <main style={{ background: colors.bgPage }}>{renderContent()}</main>
    </div>
  )
}
