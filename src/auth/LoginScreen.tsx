// src/auth/LoginScreen.tsx
// SOMA ODÉ — Tela de Login com boas-vindas e opções de registo
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [registerRole, setRegisterRole] = useState<'artist' | 'producer'>('artist')

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

    if (registerRole === 'producer') {
      setMessage('O registo como Produtor requer aprovação da equipa SOMA. Enviamos um email para somaculturabcn@gmail.com com o teu pedido. Entraremos em contacto em breve.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'artist' },
      },
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Conta criada com sucesso! Verifica o teu email para confirmar o registo.')
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
        {/* Header com Boas-Vindas */}
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
            {mode === 'login' && 'Acede ao teu perfil artístico, oportunidades e propostas curatoriais.'}
            {mode === 'register' && 'Junta-te à rede SOMA ODÉ e começa a construir a tua cartografia artística.'}
            {mode === 'forgot' && 'Insere o teu email para receberes um link de recuperação.'}
          </p>
        </div>

        {/* Mensagem de feedback */}
        {message && (
          <div style={{
            ...styles.message,
            background: message.includes('sucesso') || message.includes('enviado') ? 'rgba(110,243,165,0.12)' : 'rgba(255,207,92,0.12)',
            border: message.includes('sucesso') || message.includes('enviado') ? '1px solid rgba(110,243,165,0.3)' : '1px solid rgba(255,207,92,0.3)',
            color: message.includes('sucesso') || message.includes('enviado') ? '#6ef3a5' : '#ffcf5c',
          }}>
            {message}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={mode === 'forgot' ? handleForgotPassword : mode === 'register' ? handleRegister : handleLogin} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              type="email"
              style={styles.input}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="o teu@email.com"
            />
          </label>

          {mode !== 'forgot' && (
            <label style={styles.label}>
              Senha
              <input
                type="password"
                style={styles.input}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </label>
          )}

          {/* Seleção de role (apenas no registo) */}
          {mode === 'register' && (
            <div style={styles.roleSelector}>
              <label style={styles.label}>Tipo de conta</label>
              <div style={styles.roleButtons}>
                <button
                  type="button"
                  style={{
                    ...styles.roleBtn,
                    ...(registerRole === 'artist' ? styles.roleBtnActive : {}),
                  }}
                  onClick={() => setRegisterRole('artist')}
                >
                  🎨 Artista
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.roleBtn,
                    ...(registerRole === 'producer' ? styles.roleBtnActive : {}),
                  }}
                  onClick={() => setRegisterRole('producer')}
                >
                  📋 Produtor/a
                </button>
              </div>
              {registerRole === 'producer' && (
                <p style={styles.roleNote}>
                  Contas de Produtor requerem aprovação manual da equipa SOMA.
                </p>
              )}
              {registerRole === 'artist' && (
                <p style={styles.roleNote}>
                  Como Artista, terás acesso ao teu perfil, cartografia e oportunidades.
                </p>
              )}
            </div>
          )}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? '⏳ A processar...' : 
              mode === 'login' ? 'Entrar' : 
              mode === 'register' ? 'Criar conta' : 
              'Enviar link de recuperação'}
          </button>
        </form>

        {/* Links de modo */}
        <div style={styles.links}>
          {mode === 'login' && (
            <>
              <button style={styles.link} onClick={() => { setMode('register'); setMessage('') }}>
                Criar nova conta
              </button>
              <span style={styles.separator}>·</span>
              <button style={styles.link} onClick={() => { setMode('forgot'); setMessage('') }}>
                Esqueci a senha
              </button>
            </>
          )}
          {(mode === 'register' || mode === 'forgot') && (
            <button style={styles.link} onClick={() => { setMode('login'); setMessage('') }}>
              ← Voltar ao login
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <p style={styles.footer}>
        SOMA ODÉ — Plataforma de Inteligência Curatorial e Circulação Artística
      </p>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    color: '#fff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#0a0a0a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '32px 28px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logo: {
    fontSize: '28px',
    fontWeight: 900,
    letterSpacing: '0.12em',
    color: '#1A6994',
    margin: '0',
  },
  tagline: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '0.2em',
    margin: '4px 0 0',
  },
  welcome: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  welcomeTitle: {
    fontSize: '20px',
    color: '#fff',
    margin: '0 0 8px',
  },
  welcomeText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.55)',
    lineHeight: '1.5',
    margin: '0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: '0.05em',
  },
  input: {
    background: '#111',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '8px',
    padding: '12px 14px',
    fontSize: '14px',
    outline: 'none',
  },
  roleSelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  roleButtons: {
    display: 'flex',
    gap: '10px',
  },
  roleBtn: {
    flex: 1,
    padding: '10px',
    background: '#111',
    color: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'center',
  },
  roleBtnActive: {
    background: 'rgba(26,105,148,0.3)',
    color: '#fff',
    border: '1px solid #1A6994',
  },
  roleNote: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    margin: '4px 0 0',
    lineHeight: '1.4',
  },
  button: {
    background: '#1A6994',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '14px',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '4px',
  },
  message: {
    padding: '12px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    lineHeight: '1.4',
    marginBottom: '16px',
    textAlign: 'center',
  },
  links: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    marginTop: '20px',
  },
  link: {
    background: 'none',
    border: 'none',
    color: '#60b4e8',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '0',
  },
  separator: {
    color: 'rgba(255,255,255,0.2)',
  },
  footer: {
    marginTop: '20px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
}