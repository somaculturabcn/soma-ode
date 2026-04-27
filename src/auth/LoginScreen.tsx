import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function submit() {
    setMessage('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: 'viewer',
            },
          },
        })

        if (error) throw error

        setMessage('Conta criada. Verifica o email se o Supabase pedir confirmação.')
      }
    } catch (err: any) {
      setMessage(err?.message || 'Erro de autenticação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>SOMA</div>
        <div style={styles.sub}>CULTURA · ODÉ</div>

        <h1 style={styles.title}>
          {mode === 'login' ? 'Entrar' : 'Criar conta'}
        </h1>

        <input
          style={styles.input}
          type="email"
          placeholder="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          style={styles.input}
          type="password"
          placeholder="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {message && <div style={styles.message}>{message}</div>}

        <button style={styles.primaryBtn} onClick={submit} disabled={loading}>
          {loading ? 'Aguarda...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        <button
          style={styles.secondaryBtn}
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setMessage('')
          }}
        >
          {mode === 'login' ? 'Criar nova conta' : 'Já tenho conta'}
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#000',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    width: 360,
    background: '#0a0a0a',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  logo: {
    fontSize: 24,
    fontWeight: 900,
    letterSpacing: '0.16em',
  },
  sub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: '0.18em',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    margin: '0 0 10px',
    color: '#60b4e8',
  },
  input: {
    background: '#111',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 8,
    padding: '12px 14px',
    fontSize: 14,
    outline: 'none',
  },
  message: {
    color: '#ffcf5c',
    fontSize: 13,
    lineHeight: 1.4,
  },
  primaryBtn: {
    background: '#1A6994',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 14px',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
  },
  secondaryBtn: {
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    cursor: 'pointer',
  },
}