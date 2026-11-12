// src/components/AuthScreen.tsx
// SOMA ODÉ — Ecrã de login/registo com Supabase (ou localStorage fallback)

import { useState } from 'react'
import { supabase, hasSupabase } from '../lib/supabase'

type Props = {
  mode: 'login' | 'register'
  onBack: () => void
  onSuccess: (user: { email: string; id: string }) => void
}

export default function AuthScreen({ mode: initialMode, onBack, onSuccess }: Props) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!email.trim() || !password.trim()) {
        throw new Error('Preenche email e password')
      }
      if (password.length < 6) {
        throw new Error('A password precisa de pelo menos 6 caracteres')
      }

      if (hasSupabase) {
        // ── Supabase auth ────────────────────────────────────────
        if (mode === 'register') {
          const { data, error: err } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { name: name.trim() || undefined } }
          })
          if (err) throw new Error(translateError(err.message))
          if (data.user) {
            // Alguns projetos Supabase exigem confirmação de email
            if (data.session) {
              localStorage.setItem('soma_user', JSON.stringify({ email: data.user.email, id: data.user.id }))
              onSuccess({ email: data.user.email!, id: data.user.id })
            } else {
              setSuccess('Conta criada! Verifica o teu email para confirmar.')
            }
          }
        } else {
          const { data, error: err } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })
          if (err) throw new Error(translateError(err.message))
          if (data.user) {
            localStorage.setItem('soma_user', JSON.stringify({ email: data.user.email, id: data.user.id }))
            onSuccess({ email: data.user.email!, id: data.user.id })
          }
        }
      } else {
        // ── Fallback localStorage (sem Supabase) ─────────────────
        const userId = 'local_' + email.trim().replace(/[^a-z0-9]/g, '_')
        const userData = { email: email.trim(), id: userId, name: name.trim() }
        localStorage.setItem('soma_user', JSON.stringify(userData))
        onSuccess(userData)
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={st.page}>
      <div style={st.container}>
        {/* Back */}
        <button style={st.backBtn} onClick={onBack}>← Voltar</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={st.logoRow}>
            <span style={st.logo}>SOMA</span>
            <span style={st.logoAccent}>ODÉ</span>
          </div>
          <h1 style={st.title}>
            {mode === 'register' ? 'Criar conta' : 'Entrar'}
          </h1>
          <p style={st.subtitle}>
            {mode === 'register'
              ? 'Cria a tua conta para guardar o teu perfil e aceder de qualquer dispositivo.'
              : 'Entra na tua conta para aceder ao teu perfil e oportunidades.'}
          </p>
        </div>

        {/* Modo offline notice */}
        {!hasSupabase && (
          <div style={st.notice}>
            ℹ️ Modo offline — os dados ficam guardados neste browser (localStorage).
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={st.form}>
          {mode === 'register' && (
            <div style={st.field}>
              <label style={st.label}>Nome (opcional)</label>
              <input
                style={st.input}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="O teu nome artístico ou real"
                autoComplete="name"
              />
            </div>
          )}

          <div style={st.field}>
            <label style={st.label}>Email</label>
            <input
              style={st.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="exemplo@email.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div style={st.field}>
            <label style={st.label}>Password</label>
            <input
              style={st.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </div>

          {error && <div style={st.error}>{error}</div>}
          {success && <div style={st.success}>{success}</div>}

          <button style={{ ...st.primaryBtn, opacity: loading ? 0.6 : 1 }} disabled={loading} type="submit">
            {loading
              ? '...'
              : mode === 'register'
                ? 'Criar conta →'
                : 'Entrar →'}
          </button>
        </form>

        {/* Toggle mode */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          {mode === 'register' ? (
            <p style={st.toggleText}>
              Já tens conta?{' '}
              <span style={st.toggleLink} onClick={() => { setMode('login'); setError(''); setSuccess('') }}>
                Entra aqui
              </span>
            </p>
          ) : (
            <p style={st.toggleText}>
              Não tens conta?{' '}
              <span style={st.toggleLink} onClick={() => { setMode('register'); setError(''); setSuccess('') }}>
                Regista-te
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email ou password incorretos'
  if (msg.includes('User already registered')) return 'Este email já está registado'
  if (msg.includes('Email rate limit')) return 'Muitas tentativas. Espera um pouco.'
  if (msg.includes('Password should be')) return 'A password precisa de pelo menos 6 caracteres'
  return msg
}

const st: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  container: { width: '100%', maxWidth: 420 },
  backBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', padding: '4px 0', marginBottom: 16 },
  logoRow: { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8, marginBottom: 16 },
  logo: { fontSize: 32, fontWeight: 900, letterSpacing: '0.12em', color: '#1A6994' },
  logoAccent: { fontSize: 22, fontWeight: 300, color: '#ffcf5c', letterSpacing: '0.25em' },
  title: { margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#fff' },
  subtitle: { margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 },
  notice: { padding: '10px 14px', borderRadius: 8, fontSize: 12, marginBottom: 20, background: 'rgba(96,180,232,0.08)', border: '1px solid rgba(96,180,232,0.2)', color: '#60b4e8' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  input: { background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: '12px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const },
  primaryBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
  error: { padding: '10px 14px', borderRadius: 8, fontSize: 13, background: 'rgba(249,112,102,0.08)', border: '1px solid rgba(249,112,102,0.3)', color: '#f97066' },
  success: { padding: '10px 14px', borderRadius: 8, fontSize: 13, background: 'rgba(110,243,165,0.08)', border: '1px solid rgba(110,243,165,0.3)', color: '#6ef3a5' },
  toggleText: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  toggleLink: { color: '#60b4e8', cursor: 'pointer', fontWeight: 600 },
}
