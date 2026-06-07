// src/auth/LoginScreen.tsx
// SOMA ODÉ — Login completo: Google OAuth, email/senha, signup artista/produtor,
// recuperação de senha, nova senha (recovery link), i18n PT-BR/ES/EN
// + ecrã de escolha de role para novos utilizadores Google OAuth

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage, LANG_FLAGS, type Lang } from '../i18n/LanguageContext'

type Mode = 'login' | 'artist' | 'producer' | 'forgot' | 'new_password' | 'choose_role'

export default function LoginScreen() {
  const { lang, setLang, t } = useLanguage()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  // Detecta link de recovery OU utilizador Google sem role
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('type=recovery')) {
      const params = new URLSearchParams(hash.substring(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(() => {
          setMode('new_password')
          window.history.replaceState({}, '', window.location.pathname)
        })
      } else {
        setMode('new_password')
        window.history.replaceState({}, '', window.location.pathname)
      }
      return
    }

    // Verifica se é um utilizador Google OAuth sem role (viewer)
    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user
      if (!user) return
      const role = user.user_metadata?.role || user.app_metadata?.role
      const provider = user.app_metadata?.provider
      // Se entrou pelo Google E não tem role definido → pede escolha
      if (provider === 'google' && (!role || role === 'viewer')) {
        setMode('choose_role')
      }
    })
  }, [])

  function msg(text: string, error = false) {
    setMessage(text)
    setIsError(error)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); msg('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) msg(t.wrong_credentials, true)
    setLoading(false)
  }

  async function handleGoogle() {
    setLoading(true); msg('')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    setLoading(false)
  }

  async function handleSignupArtist(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); msg('')
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { role: 'artist' } },
    })
    if (error) { msg(error.message, true); setLoading(false); return }
    if (data?.user) {
      await supabase.from('artists').insert({
        id: crypto.randomUUID(), user_id: data.user.id,
        artistic_name: '', email,
        disciplines: [], languages: [], keywords: [], target_countries: [],
        materials: {}, mobility: {}, projects: [], cartografia: {}, crm: {},
        payload: { name: '', email },
        organization_id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      })
      msg(t.account_created)
    }
    setLoading(false)
  }

  async function handleSignupProducer(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim()) { msg(t.org_name + ' é obrigatório.', true); return }
    setLoading(true); msg('')
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { role: 'producer', pending_org_name: orgName.trim() } },
    })
    if (error) { msg(error.message, true); setLoading(false); return }
    if (data?.user) msg(t.account_created)
    setLoading(false)
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); msg('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    msg(error ? error.message : t.recovery_sent, !!error)
    setLoading(false)
  }

  async function handleNewPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPass !== confirmPass) { msg(t.passwords_no_match, true); return }
    setLoading(true); msg('')
    const { error } = await supabase.auth.updateUser({ password: newPass })
    if (error) {
      msg(error.message, true)
    } else {
      msg(t.password_saved)
      setTimeout(() => window.location.replace('/'), 2000)
    }
    setLoading(false)
  }

  // Escolha de role para utilizadores Google OAuth novos
  async function handleChooseRole(role: 'artist' | 'producer') {
    setLoading(true); msg('')
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData?.session?.user
    if (!user) { msg('Sessão expirada. Tenta entrar novamente.', true); setLoading(false); return }

    // Guarda role nos metadados do utilizador
    const { error } = await supabase.auth.updateUser({
      data: { role, pending_org_name: role === 'producer' ? orgName.trim() || 'A minha organização' : undefined }
    })

    if (error) { msg(error.message, true); setLoading(false); return }

    // Se for artista, cria registo na tabela artists
    if (role === 'artist') {
      await supabase.from('artists').insert({
        id: crypto.randomUUID(), user_id: user.id,
        artistic_name: user.user_metadata?.full_name || '',
        email: user.email || '',
        disciplines: [], languages: [], keywords: [], target_countries: [],
        materials: {}, mobility: {}, projects: [], cartografia: {}, crm: {},
        payload: { name: user.user_metadata?.full_name || '', email: user.email || '' },
        organization_id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      })
    }

    // Força refresh da sessão para carregar novo role
    await supabase.auth.refreshSession()
    window.location.reload()
  }

  const titles: Record<Mode, string> = {
    login: t.welcome_back,
    artist: t.create_artist,
    producer: t.create_producer,
    forgot: t.forgot_title,
    new_password: t.new_password_title,
    choose_role: 'Quem és tu?',
  }
  const subtitles: Record<Mode, string> = {
    login: t.welcome_sub,
    artist: t.create_artist_sub,
    producer: t.create_producer_sub,
    forgot: t.forgot_sub,
    new_password: t.new_password_sub,
    choose_role: 'Para terminar o registo, diz-nos como vais usar a plataforma.',
  }

  return (
    <div style={s.page}>
      <div style={s.card}>

        <div style={s.langRow}>
          {(['pt', 'es', 'en'] as Lang[]).map(l => (
            <button key={l} onClick={() => setLang(l)}
              style={{ ...s.langBtn, ...(lang === l ? s.langBtnActive : {}) }}>
              {LANG_FLAGS[l]} {l.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={s.logo}>SOMA</div>
        <div style={s.logoSub}>CULTURA · ODÉ</div>

        <h1 style={s.title}>{titles[mode]}</h1>
        <p style={s.subtitle}>{subtitles[mode]}</p>

        {message && (
          <div style={{ ...s.message, borderColor: isError ? 'rgba(255,100,100,0.3)' : 'rgba(110,243,165,0.3)', color: isError ? '#ff8a8a' : '#6ef3a5', background: isError ? 'rgba(255,100,100,0.08)' : 'rgba(110,243,165,0.08)' }}>
            {message}
          </div>
        )}

        {/* ── ESCOLHA DE ROLE (Google OAuth novos utilizadores) ── */}
        {mode === 'choose_role' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button style={s.roleCard} onClick={() => handleChooseRole('artist')} disabled={loading}>
              <span style={s.roleEmoji}>🎤</span>
              <div>
                <div style={s.roleTitle}>Sou artista</div>
                <div style={s.roleDesc}>Quero gerir o meu perfil e receber propostas de apresentação</div>
              </div>
            </button>

            <button style={{ ...s.roleCard, borderColor: 'rgba(26,105,148,0.4)', background: 'rgba(26,105,148,0.08)' }}
              onClick={() => setMode('choose_role_producer'  as Mode)} disabled={loading}>
              <span style={s.roleEmoji}>🏢</span>
              <div>
                <div style={s.roleTitle}>Sou produtor/a ou organização</div>
                <div style={s.roleDesc}>Quero gerir artistas, contratos e oportunidades</div>
              </div>
            </button>

            {loading && <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>A configurar conta...</p>}
          </div>
        )}

        {/* Ecrã intermédio para produtor Google — pede nome da org */}
        {(mode as string) === 'choose_role_producer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={s.label}>Nome da organização / nome artístico</label>
            <input style={s.input} value={orgName} placeholder="Ex: Xiphefu Produções"
              onChange={e => setOrgName(e.target.value)} />
            <button style={s.primaryBtn} disabled={loading}
              onClick={() => handleChooseRole('producer')}>
              {loading ? 'A configurar...' : 'Confirmar e entrar'}
            </button>
            <button style={s.linkBtn} onClick={() => setMode('choose_role')}>
              ← Voltar
            </button>
          </div>
        )}

        {/* ── LOGIN NORMAL ── */}
        {mode === 'login' && (
          <>
            <form onSubmit={handleLogin} style={s.form}>
              <label style={s.label}>{t.email}</label>
              <input style={s.input} type="email" value={email} placeholder="seu@email.com"
                onChange={e => setEmail(e.target.value)} required />
              <label style={s.label}>{t.password}</label>
              <input style={s.input} type="password" value={password} placeholder="••••••••"
                onChange={e => setPassword(e.target.value)} required minLength={6} />
              <button style={s.primaryBtn} type="submit" disabled={loading}>
                {loading ? '...' : t.enter}
              </button>
            </form>

            <div style={s.orRow}>
              <div style={s.orLine} />
              <span style={s.orText}>{t.or}</span>
              <div style={s.orLine} />
            </div>

            <button style={s.googleBtn} onClick={handleGoogle} disabled={loading}>
              <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              {t.continue_google}
            </button>

            <div style={s.divider} />
            <p style={s.noAccount}>{t.no_account}</p>
            <div style={s.signupRow}>
              <button style={s.artistBtn} onClick={() => { setMode('artist'); msg('') }}>
                {t.im_artist}
              </button>
              <button style={s.producerBtn} onClick={() => { setMode('producer'); msg('') }}>
                {t.im_producer}
              </button>
            </div>
            <button style={s.linkBtn} onClick={() => { setMode('forgot'); msg('') }}>
              {t.forgot}
            </button>
          </>
        )}

        {mode === 'artist' && (
          <form onSubmit={handleSignupArtist} style={s.form}>
            <label style={s.label}>{t.email}</label>
            <input style={s.input} type="email" value={email} placeholder="seu@email.com"
              onChange={e => setEmail(e.target.value)} required />
            <label style={s.label}>{t.password}</label>
            <input style={s.input} type="password" value={password} placeholder="min. 6 caracteres"
              onChange={e => setPassword(e.target.value)} required minLength={6} />
            <button style={s.primaryBtn} type="submit" disabled={loading}>
              {loading ? '...' : t.create_artist_btn}
            </button>
            <button style={s.linkBtn} type="button" onClick={() => { setMode('login'); msg('') }}>
              {t.back_login}
            </button>
          </form>
        )}

        {mode === 'producer' && (
          <form onSubmit={handleSignupProducer} style={s.form}>
            <label style={s.label}>{t.org_name}</label>
            <input style={s.input} value={orgName} placeholder={t.org_placeholder}
              onChange={e => setOrgName(e.target.value)} required />
            <label style={s.label}>{t.email}</label>
            <input style={s.input} type="email" value={email} placeholder="seu@email.com"
              onChange={e => setEmail(e.target.value)} required />
            <label style={s.label}>{t.password}</label>
            <input style={s.input} type="password" value={password} placeholder="min. 6 caracteres"
              onChange={e => setPassword(e.target.value)} required minLength={6} />
            <button style={s.primaryBtn} type="submit" disabled={loading}>
              {loading ? '...' : t.create_producer_btn}
            </button>
            <button style={s.linkBtn} type="button" onClick={() => { setMode('login'); msg('') }}>
              {t.back_login}
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} style={s.form}>
            <label style={s.label}>{t.email}</label>
            <input style={s.input} type="email" value={email} placeholder="seu@email.com"
              onChange={e => setEmail(e.target.value)} required />
            <button style={s.primaryBtn} type="submit" disabled={loading}>
              {loading ? '...' : t.send_link}
            </button>
            <button style={s.linkBtn} type="button" onClick={() => { setMode('login'); msg('') }}>
              {t.back_login}
            </button>
          </form>
        )}

        {mode === 'new_password' && (
          <form onSubmit={handleNewPassword} style={s.form}>
            <label style={s.label}>{t.new_password}</label>
            <input style={s.input} type="password" value={newPass} placeholder="min. 6 caracteres"
              onChange={e => setNewPass(e.target.value)} required minLength={6} />
            <label style={s.label}>{t.confirm_password}</label>
            <input style={s.input} type="password" value={confirmPass} placeholder="repita a senha"
              onChange={e => setConfirmPass(e.target.value)} required minLength={6} />
            <button style={s.primaryBtn} type="submit" disabled={loading}>
              {loading ? '...' : t.save_password}
            </button>
          </form>
        )}

        <p style={s.footer}>{t.footer}</p>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'system-ui, -apple-system, sans-serif' },
  card: { width: '100%', maxWidth: 440, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '32px 28px', color: '#fff' },
  langRow: { display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 20 },
  langBtn: { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontFamily: 'inherit' },
  langBtnActive: { background: 'rgba(26,105,148,0.25)', border: '1px solid rgba(26,105,148,0.5)', color: '#60b4e8' },
  logo: { textAlign: 'center', fontSize: 28, fontWeight: 900, letterSpacing: '0.12em', color: '#1A6994', marginBottom: 4 },
  logoSub: { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.2em', marginBottom: 24 },
  title: { textAlign: 'center', fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: '#fff' },
  subtitle: { textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: '0 0 24px' },
  message: { padding: '10px 14px', borderRadius: 8, fontSize: 13, lineHeight: 1.4, marginBottom: 16, border: '1px solid', textAlign: 'center' },
  form: { display: 'flex', flexDirection: 'column', gap: 10 },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em' },
  input: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '12px 14px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  primaryBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4, width: '100%' },
  orRow: { display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px' },
  orLine: { flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' },
  orText: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },
  googleBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#fff', color: '#111', border: 'none', borderRadius: 8, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  divider: { height: 1, background: 'rgba(255,255,255,0.07)', margin: '20px 0 16px' },
  noAccount: { textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px' },
  signupRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 },
  artistBtn: { background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '12px 8px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 },
  producerBtn: { background: 'rgba(26,105,148,0.15)', color: '#60b4e8', border: '1px solid rgba(26,105,148,0.3)', borderRadius: 8, padding: '12px 8px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 },
  linkBtn: { background: 'none', border: 'none', color: '#60b4e8', fontSize: 13, cursor: 'pointer', padding: '8px 0', textAlign: 'center', width: '100%' },
  footer: { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 24, marginBottom: 0 },
  // Novos estilos para escolha de role
  roleCard: { display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', textAlign: 'left', width: '100%', color: '#fff', fontFamily: 'inherit', transition: 'border-color .2s' },
  roleEmoji: { fontSize: 28, flexShrink: 0 },
  roleTitle: { fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#fff' },
  roleDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 },
}