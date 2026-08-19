// src/auth/LoginScreen.tsx
// SOMA ODÉ — Login + Registo completo (só email/password)
// Fluxo: login | artist | producer | forgot | new_password
// Google OAuth removido — registo exige telefone+DDI; produtor exige organização

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLanguage, LANG_FLAGS, type Lang } from '../i18n/LanguageContext'

type Mode = 'login' | 'artist' | 'producer' | 'forgot' | 'new_password'

// DDI list — países mais relevantes para a SOMA primeiro
const DDI_LIST = [
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: '+34', flag: '🇪🇸', name: 'España' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+49', flag: '🇩🇪', name: 'Deutschland' },
  { code: '+39', flag: '🇮🇹', name: 'Italia' },
  { code: '+31', flag: '🇳🇱', name: 'Netherlands' },
  { code: '+32', flag: '🇧🇪', name: 'Belgium' },
  { code: '+41', flag: '🇨🇭', name: 'Switzerland' },
  { code: '+43', flag: '🇦🇹', name: 'Austria' },
  { code: '+46', flag: '🇸🇪', name: 'Sweden' },
  { code: '+47', flag: '🇳🇴', name: 'Norway' },
  { code: '+45', flag: '🇩🇰', name: 'Denmark' },
  { code: '+358', flag: '🇫🇮', name: 'Finland' },
  { code: '+48', flag: '🇵🇱', name: 'Poland' },
  { code: '+1', flag: '🇺🇸', name: 'USA / Canada' },
  { code: '+52', flag: '🇲🇽', name: 'México' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: '+58', flag: '🇻🇪', name: 'Venezuela' },
  { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: '+51', flag: '🇵🇪', name: 'Peru' },
  { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
  { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
  { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
  { code: '+238', flag: '🇨🇻', name: 'Cabo Verde' },
  { code: '+244', flag: '🇦🇴', name: 'Angola' },
  { code: '+258', flag: '🇲🇿', name: 'Moçambique' },
  { code: '+239', flag: '🇸🇹', name: 'São Tomé' },
  { code: '+245', flag: '🇬🇼', name: 'Guiné-Bissau' },
  { code: '+225', flag: '🇨🇮', name: 'Côte d\'Ivoire' },
  { code: '+221', flag: '🇸🇳', name: 'Senegal' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+212', flag: '🇲🇦', name: 'Marrocos' },
]

function PhoneField({ ddi, setDdi, phone, setPhone }: {
  ddi: string; setDdi: (v: string) => void
  phone: string; setPhone: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <select
        value={ddi}
        onChange={e => setDdi(e.target.value)}
        style={{ ...s.input, width: 110, flexShrink: 0, paddingRight: 6 }}
      >
        {DDI_LIST.map(d => (
          <option key={d.code + d.name} value={d.code}>
            {d.flag} {d.code}
          </option>
        ))}
      </select>
      <input
        style={{ ...s.input, flex: 1 }}
        type="tel"
        value={phone}
        placeholder="612 345 678"
        onChange={e => setPhone(e.target.value.replace(/[^0-9\s\-]/g, ''))}
        required
      />
    </div>
  )
}

export default function LoginScreen() {
  const { lang, setLang, t } = useLanguage()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [orgName, setOrgName] = useState('')
  const [phone, setPhone] = useState('')
  const [ddi, setDdi] = useState('+34')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const hash = window.location.hash

    // Recovery link
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
    }
  }, [])

  function msg(text: string, error = false) {
    setMessage(text); setIsError(error)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); msg('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) msg(t.wrong_credentials, true)
    setLoading(false)
  }

  async function handleSignupArtist(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) { msg('Telefone é obrigatório.', true); return }
    setLoading(true); msg('')
    const fullPhone = `${ddi} ${phone.trim()}`
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { role: 'artist', phone: fullPhone } },
    })
    if (error) { msg(error.message, true); setLoading(false); return }
    if (data?.user) {
      await supabase.from('artists').insert({
        id: crypto.randomUUID(), user_id: data.user.id,
        artistic_name: '', email, phone: fullPhone,
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
    if (!phone.trim()) { msg('Telefone é obrigatório.', true); return }
    setLoading(true); msg('')
    const fullPhone = `${ddi} ${phone.trim()}`
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { role: 'producer', pending_org_name: orgName.trim(), phone: fullPhone } },
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
    if (error) { msg(error.message, true) }
    else { msg(t.password_saved); setTimeout(() => window.location.replace('/'), 2000) }
    setLoading(false)
  }

  const goBack = () => { setMode('login'); msg('') }

  // ── RENDER ──────────────────────────────────────────────────────────────────

  const TITLES: Record<Mode, string> = {
    login: t.welcome_back,
    artist: t.create_artist,
    producer: t.create_producer,
    forgot: t.forgot_title,
    new_password: t.new_password_title,
  }
  const SUBS: Record<Mode, string> = {
    login: t.welcome_sub,
    artist: t.create_artist_sub,
    producer: t.create_producer_sub,
    forgot: t.forgot_sub,
    new_password: t.new_password_sub,
  }

  return (
    <div style={s.page}>
      <div style={s.card}>

        {/* Idiomas */}
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
        <h1 style={s.title}>{TITLES[mode]}</h1>
        <p style={s.subtitle}>{SUBS[mode]}</p>

        {message && (
          <div style={{ ...s.message, borderColor: isError ? 'rgba(255,100,100,0.3)' : 'rgba(110,243,165,0.3)', color: isError ? '#ff8a8a' : '#6ef3a5', background: isError ? 'rgba(255,100,100,0.08)' : 'rgba(110,243,165,0.08)' }}>
            {message}
          </div>
        )}

        {/* ── LOGIN ── */}
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

            <div style={s.divider} />
            <p style={s.noAccount}>{t.no_account}</p>
            <div style={s.signupRow}>
              <button style={s.artistBtn} onClick={() => { setMode('artist'); msg('') }}>{t.im_artist}</button>
              <button style={s.producerBtn} onClick={() => { setMode('producer'); msg('') }}>{t.im_producer}</button>
            </div>
            <button style={s.linkBtn} onClick={() => { setMode('forgot'); msg('') }}>{t.forgot}</button>
          </>
        )}

        {/* ── REGISTO ARTISTA ── */}
        {mode === 'artist' && (
          <>
            <div style={s.regHeader}>
              <span style={s.regBadge}>🎤 Registo — Artista</span>
            </div>

            <form onSubmit={handleSignupArtist} style={s.form}>
              <label style={s.label}>{t.email}</label>
              <input style={s.input} type="email" value={email} placeholder="seu@email.com"
                onChange={e => setEmail(e.target.value)} required />
              <label style={s.label}>{t.password}</label>
              <input style={s.input} type="password" value={password} placeholder="min. 6 caracteres"
                onChange={e => setPassword(e.target.value)} required minLength={6} />
              <label style={s.label}>Telefone *</label>
              <PhoneField ddi={ddi} setDdi={setDdi} phone={phone} setPhone={setPhone} />
              <button style={s.primaryBtn} type="submit" disabled={loading}>
                {loading ? '...' : t.create_artist_btn}
              </button>
            </form>
            <button style={s.linkBtn} type="button" onClick={goBack}>{t.back_login}</button>
          </>
        )}

        {/* ── REGISTO PRODUTOR/A ── */}
        {mode === 'producer' && (
          <>
            <div style={s.regHeader}>
              <span style={{ ...s.regBadge, background: 'rgba(26,105,148,0.2)', color: '#60b4e8', borderColor: 'rgba(26,105,148,0.4)' }}>🏢 Registo — Produtor/a</span>
            </div>

            <form onSubmit={handleSignupProducer} style={s.form}>
              <label style={s.label}>{t.org_name} *</label>
              <input style={s.input} value={orgName} placeholder={t.org_placeholder}
                onChange={e => setOrgName(e.target.value)} required />
              <label style={s.label}>{t.email}</label>
              <input style={s.input} type="email" value={email} placeholder="seu@email.com"
                onChange={e => setEmail(e.target.value)} required />
              <label style={s.label}>{t.password}</label>
              <input style={s.input} type="password" value={password} placeholder="min. 6 caracteres"
                onChange={e => setPassword(e.target.value)} required minLength={6} />
              <label style={s.label}>Telefone *</label>
              <PhoneField ddi={ddi} setDdi={setDdi} phone={phone} setPhone={setPhone} />
              <button style={s.primaryBtn} type="submit" disabled={loading}>
                {loading ? '...' : t.create_producer_btn}
              </button>
            </form>
            <button style={s.linkBtn} type="button" onClick={goBack}>{t.back_login}</button>
          </>
        )}

        {/* ── FORGOT ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgot} style={s.form}>
            <label style={s.label}>{t.email}</label>
            <input style={s.input} type="email" value={email} placeholder="seu@email.com"
              onChange={e => setEmail(e.target.value)} required />
            <button style={s.primaryBtn} type="submit" disabled={loading}>
              {loading ? '...' : t.send_link}
            </button>
            <button style={s.linkBtn} type="button" onClick={goBack}>{t.back_login}</button>
          </form>
        )}

        {/* ── NEW PASSWORD ── */}
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
  card: { width: '100%', maxWidth: 460, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '32px 28px', color: '#fff' },
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
  divider: { height: 1, background: 'rgba(255,255,255,0.07)', margin: '20px 0 16px' },
  noAccount: { textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 12px' },
  signupRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 },
  artistBtn: { background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '12px 8px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 },
  producerBtn: { background: 'rgba(26,105,148,0.15)', color: '#60b4e8', border: '1px solid rgba(26,105,148,0.3)', borderRadius: 8, padding: '12px 8px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 },
  linkBtn: { background: 'none', border: 'none', color: '#60b4e8', fontSize: 13, cursor: 'pointer', padding: '8px 0', textAlign: 'center', width: '100%' },
  footer: { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 24, marginBottom: 0 },
  regHeader: { marginBottom: 16 },
  regBadge: { fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' },
}