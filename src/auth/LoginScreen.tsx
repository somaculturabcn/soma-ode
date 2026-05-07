// src/auth/LoginScreen.tsx
// SOMA ODÉ — Login + Registo Artista + Registo Produtor Independente

import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'register_artist' | 'register_producer' | 'forgot'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<Mode>('login')

  // ── Login ─────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(error.message.includes('Invalid login credentials')
        ? 'Email ou senha incorretos.' : error.message)
    }
    setLoading(false)
  }

  // ── Registo Artista ───────────────────────────────────

  async function handleRegisterArtist(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMessage('')

    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { role: 'artist' } },
    })

    if (error) { setMessage(error.message); setLoading(false); return }

    if (data?.user) {
      const { error: insertError } = await supabase.from('artists').insert({
        id: crypto.randomUUID(),
        user_id: data.user.id,
        artistic_name: '',
        email,
        disciplines: [], languages: [], keywords: [],
        target_countries: [], materials: {}, mobility: {},
        projects: [], cartografia: {}, crm: {},
        payload: { name: '', email },
        organization_id: '00000000-0000-0000-0000-000000000001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      if (insertError) console.error('Erro ao criar perfil artista:', insertError)
      setMessage('Conta criada! Verifica o teu email e depois faz login.')
    }
    setLoading(false)
  }

  // ── Registo Produtor ──────────────────────────────────

  async function handleRegisterProducer(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim()) { setMessage('Indica o nome da tua agência ou organização.'); return }
    setLoading(true); setMessage('')

    // 1. Cria utilizador
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { role: 'producer' } },
    })

    if (error) { setMessage(error.message); setLoading(false); return }

    if (data?.user) {
      // 2. Cria organização
      const orgId = crypto.randomUUID()
      const slug = orgName.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

      const { error: orgError } = await supabase.from('organizations').insert({
        id: orgId,
        name: orgName.trim(),
        slug,
        owner_id: data.user.id,
        plan: 'free',
      })

      if (orgError) {
        console.error('Erro ao criar organização:', orgError)
        setMessage('Conta criada mas houve um erro na configuração. Contacta a SOMA.')
        setLoading(false); return
      }

      // 3. Guarda organization_id no metadata do user
      await supabase.auth.updateUser({
        data: { role: 'producer', organization_id: orgId },
      })

      setMessage(`Conta de produtor criada para "${orgName.trim()}"! Verifica o teu email e depois faz login.`)
    }
    setLoading(false)
  }

  // ── Recuperar senha ───────────────────────────────────

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMessage('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://soma-ode.vercel.app',
    })
    setMessage(error ? error.message : 'Email de recuperação enviado! Verifica a tua caixa de entrada.')
    setLoading(false)
  }

  function submit(e: React.FormEvent) {
    if (mode === 'login') return handleLogin(e)
    if (mode === 'register_artist') return handleRegisterArtist(e)
    if (mode === 'register_producer') return handleRegisterProducer(e)
    return handleForgot(e)
  }

  const isSuccess = message.includes('criada') || message.includes('enviado')

  return (
    <div style={st.container}>
      <div style={st.card}>

        {/* Logo */}
        <div style={st.header}>
          <h1 style={st.logo}>SOMA</h1>
          <p style={st.tagline}>CULTURA · ODÉ</p>
        </div>

        {/* Título */}
        <div style={st.welcome}>
          <h2 style={st.welcomeTitle}>
            {mode === 'login' && 'Bem-vinda de volta'}
            {mode === 'register_artist' && 'Criar conta — Artista'}
            {mode === 'register_producer' && 'Criar conta — Produtor/a'}
            {mode === 'forgot' && 'Recuperar senha'}
          </h2>
          <p style={st.welcomeText}>
            {mode === 'login' && 'Acede ao teu perfil, oportunidades e cartografia.'}
            {mode === 'register_artist' && 'Regista-te como artista e começa a construir o teu perfil.'}
            {mode === 'register_producer' && 'Cria o teu workspace independente para gerir o teu roster e eventos.'}
            {mode === 'forgot' && 'Insere o teu email para recuperar a senha.'}
          </p>
        </div>

        {/* Mensagem */}
        {message && (
          <div style={{
            ...st.message,
            background: isSuccess ? 'rgba(110,243,165,0.1)' : 'rgba(255,207,92,0.1)',
            border: isSuccess ? '1px solid rgba(110,243,165,0.3)' : '1px solid rgba(255,207,92,0.3)',
            color: isSuccess ? '#6ef3a5' : '#ffcf5c',
          }}>
            {message}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={submit} style={st.form}>

          {mode === 'register_producer' && (
            <label style={st.label}>
              Nome da agência / organização
              <input style={st.input} value={orgName} onChange={e => setOrgName(e.target.value)}
                required placeholder="Ex: Baile Total Produções" />
            </label>
          )}

          <label style={st.label}>
            Email
            <input type="email" style={st.input} value={email}
              onChange={e => setEmail(e.target.value)} required placeholder="o teu@email.com" />
          </label>

          {mode !== 'forgot' && (
            <label style={st.label}>
              Senha
              <input type="password" style={st.input} value={password}
                onChange={e => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
            </label>
          )}

          <button type="submit" style={st.button} disabled={loading}>
            {loading ? '⏳ A processar...'
              : mode === 'login' ? 'Entrar'
              : mode === 'register_artist' ? 'Criar conta artista'
              : mode === 'register_producer' ? 'Criar conta produtor'
              : 'Enviar link'}
          </button>
        </form>

        {/* Seleção de tipo de conta (só no login) */}
        {mode === 'login' && (
          <div style={st.registerOptions}>
            <p style={st.registerLabel}>Ainda não tens conta?</p>
            <div style={st.registerBtns}>
              <button style={st.registerBtn}
                onClick={() => { setMode('register_artist'); setMessage('') }}>
                🎤 Sou artista
              </button>
              <button style={st.registerBtnProducer}
                onClick={() => { setMode('register_producer'); setMessage('') }}>
                🎪 Sou produtor/a
              </button>
            </div>
          </div>
        )}

        {/* Links de volta */}
        {mode !== 'login' && (
          <div style={st.links}>
            <button style={st.link}
              onClick={() => { setMode('login'); setMessage('') }}>
              ← Voltar ao login
            </button>
            {mode === 'login' && (
              <button style={st.link}
                onClick={() => { setMode('forgot'); setMessage('') }}>
                Esqueci a senha
              </button>
            )}
          </div>
        )}

        {mode === 'login' && (
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <button style={st.link}
              onClick={() => { setMode('forgot'); setMessage('') }}>
              Esqueci a senha
            </button>
          </div>
        )}
      </div>

      <p style={st.footer}>SOMA ODÉ — Plataforma de Inteligência Curatorial</p>
    </div>
  )
}

const st: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, color: '#fff', fontFamily: 'system-ui, sans-serif' },
  card: { width: '100%', maxWidth: 420, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '32px 28px' },
  header: { textAlign: 'center', marginBottom: 24 },
  logo: { fontSize: 28, fontWeight: 900, letterSpacing: '0.12em', color: '#1A6994', margin: 0 },
  tagline: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.2em', margin: '4px 0 0' },
  welcome: { textAlign: 'center', marginBottom: 24 },
  welcomeTitle: { fontSize: 20, color: '#fff', margin: '0 0 8px' },
  welcomeText: { fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' },
  input: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '12px 14px', fontSize: 14, outline: 'none' },
  button: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
  message: { padding: '12px 14px', borderRadius: 8, fontSize: 13, lineHeight: 1.4, marginBottom: 16, textAlign: 'center' },
  registerOptions: { marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 },
  registerLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 12 },
  registerBtns: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  registerBtn: { background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '12px 8px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  registerBtnProducer: { background: 'rgba(26,105,148,0.15)', color: '#60b4e8', border: '1px solid rgba(26,105,148,0.3)', borderRadius: 8, padding: '12px 8px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  links: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 20 },
  link: { background: 'none', border: 'none', color: '#60b4e8', fontSize: 13, cursor: 'pointer', padding: 0 },
  footer: { marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
}