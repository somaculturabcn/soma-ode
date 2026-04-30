// src/auth/LoginScreen.tsx
// SOMA ODÉ — Tela de Login com Registo Aberto para Artistas
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setMessage('Email ou senha incorretos.')
      } else {
        setMessage(error.message)
      }
    }
    setLoading(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // Criar conta como artista automaticamente
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'artist' },
      },
    })

    if (error) {
      setMessage(error.message)
    } else if (data?.user) {
      // Criar perfil de artista automaticamente
      const newArtist = {
        id: crypto.randomUUID(),
        user_id: data.user.id,
        artistic_name: '',
        email: email,
        name: '',
        disciplines: [],
        languages: [],
        keywords: [],
        target_countries: [],
        bio: '',
        materials: {},
        mobility: {},
        projects: [],
        cartografia: {},
        crm: {},
        payload: { name: '', email: email },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { error: insertError } = await supabase
        .from('artists')
        .insert(newArtist)

      if (insertError) {
        console.error('Erro ao criar perfil:', insertError)
        setMessage('Conta criada mas houve um erro ao criar o perfil. Contacta a SOMA.')
      } else {
        setMessage('Conta criada com sucesso! Verifica o teu email para confirmar o registo. Depois faz login.')
      }
    }
    setLoading(false)
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://soma-ode.vercel.app',
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Email de recuperação enviado! Verifica a tua caixa de entrada.')
    }
    setLoading(false)
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.logo}>SOMA</h1>
          <p style={styles.tagline}>CULTURA · ODÉ</p>
        </div>

        <div style={styles.welcome}>
          <h2 style={styles.welcomeTitle}>
            {mode === 'login' && 'Bem-vinda de volta'}
            {mode === 'register' && 'Cria a tua conta'}
            {mode === 'forgot' && 'Recuperar senha'}
          </h2>
          <p style={styles.welcomeText}>
            {mode === 'login' && 'Acede ao teu perfil artístico, oportunidades e cartografia.'}
            {mode === 'register' && 'Regista-te como Artista e começa a construir o teu perfil.'}
            {mode === 'forgot' && 'Insere o teu email para recuperar a senha.'}
          </p>
        </div>

        {message && (
          <div style={{
            ...styles.message,
            background: message.includes('sucesso') ? 'rgba(110,243,165,0.12)' : 'rgba(255,207,92,0.12)',
            border: message.includes('sucesso') ? '1px solid rgba(110,243,165,0.3)' : '1px solid rgba(255,207,92,0.3)',
            color: message.includes('sucesso') ? '#6ef3a5' : '#ffcf5c',
          }}>
            {message}
          </div>
        )}

        <form onSubmit={mode === 'forgot' ? handleForgotPassword : mode === 'register' ? handleRegister : handleLogin} style={styles.form}>
          <label style={styles.label}>
            Email
            <input type="email" style={styles.input} value={email} onChange={e => setEmail(e.target.value)} required placeholder="o teu@email.com" />
          </label>

          {mode !== 'forgot' && (
            <label style={styles.label}>
              Senha
              <input type="password" style={styles.input} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
            </label>
          )}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? '⏳ A processar...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Enviar link'}
          </button>
        </form>

        <div style={styles.links}>
          {mode === 'login' && (
            <>
              <button style={styles.link} onClick={() => { setMode('register'); setMessage('') }}>Criar nova conta</button>
              <span style={styles.separator}>·</span>
              <button style={styles.link} onClick={() => { setMode('forgot'); setMessage('') }}>Esqueci a senha</button>
            </>
          )}
          {(mode === 'register' || mode === 'forgot') && (
            <button style={styles.link} onClick={() => { setMode('login'); setMessage('') }}>← Voltar ao login</button>
          )}
        </div>
      </div>

      <p style={styles.footer}>SOMA ODÉ — Plataforma de Inteligência Curatorial</p>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', color: '#fff', fontFamily: 'system-ui, sans-serif' },
  card: { width: '100%', maxWidth: '420px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '32px 28px' },
  header: { textAlign: 'center', marginBottom: '24px' },
  logo: { fontSize: '28px', fontWeight: 900, letterSpacing: '0.12em', color: '#1A6994', margin: '0' },
  tagline: { fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.2em', margin: '4px 0 0' },
  welcome: { textAlign: 'center', marginBottom: '24px' },
  welcomeTitle: { fontSize: '20px', color: '#fff', margin: '0 0 8px' },
  welcomeText: { fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.5', margin: '0' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  label: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em' },
  input: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '8px', padding: '12px 14px', fontSize: '14px', outline: 'none' },
  button: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: '8px', padding: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginTop: '4px' },
  message: { padding: '12px 14px', borderRadius: '8px', fontSize: '13px', lineHeight: '1.4', marginBottom: '16px', textAlign: 'center' },
  links: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '20px' },
  link: { background: 'none', border: 'none', color: '#60b4e8', fontSize: '13px', cursor: 'pointer', padding: '0' },
  separator: { color: 'rgba(255,255,255,0.2)' },
  footer: { marginTop: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
}