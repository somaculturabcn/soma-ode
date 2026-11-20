// src/components/AuthScreen.tsx — Tema claro (Manual da Marca SOMA)
import { useState } from 'react'
import { supabase, hasSupabase } from '../lib/supabase'
import { colors, shadows, radius } from '../theme'

type UserRole = 'artista' | 'produtor'

type Props = {
  mode: 'login' | 'register'
  onBack: () => void
  onSuccess: (user: { email: string; id: string; role?: UserRole }) => void
  onShowPrivacy?: () => void
}

export default function AuthScreen({ mode: initialMode, onBack, onSuccess, onShowPrivacy }: Props) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [consentRgpd, setConsentRgpd] = useState(false)
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
      if (mode === 'register' && !role) {
        throw new Error('Escolhe se és Artista ou Produtor/a')
      }
      if (mode === 'register' && !consentRgpd) {
        throw new Error('Precisas aceitar a Política de Privacidade para criar conta')
      }

      if (hasSupabase) {
        if (mode === 'register') {
          const { data, error: err } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: {
              name: name.trim() || undefined,
              role,
              rgpd_consent: true,
              rgpd_consent_at: new Date().toISOString(),
              rgpd_consent_version: '1.0',
            } }
          })
          if (err) throw new Error(translateError(err.message))
          if (data.user) {
            if (data.session) {
              localStorage.setItem('soma_user', JSON.stringify({ email: data.user.email, id: data.user.id, role }))
              onSuccess({ email: data.user.email!, id: data.user.id, role: role as UserRole })
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
            const storedRole = data.user.user_metadata?.role || 'artista'
            localStorage.setItem('soma_user', JSON.stringify({ email: data.user.email, id: data.user.id, role: storedRole }))
            onSuccess({ email: data.user.email!, id: data.user.id, role: storedRole })
          }
        }
      } else {
        const userId = 'local_' + email.trim().replace(/[^a-z0-9]/g, '_')
        const userRole = role || 'artista'
        const userData = {
          email: email.trim(), id: userId, name: name.trim(), role: userRole,
          rgpd_consent: true,
          rgpd_consent_at: new Date().toISOString(),
          rgpd_consent_version: '1.0',
        }
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
        <button style={st.backBtn} onClick={onBack}>← Voltar</button>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={st.logoRow}>
            <img src="/soma-logo.png" alt="SOMA Cultura" style={{ height: 36 }} />
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

        {!hasSupabase && (
          <div style={st.notice}>
            ℹ️ Modo offline — os dados ficam guardados neste browser (localStorage).
          </div>
        )}

        <form onSubmit={handleSubmit} style={st.form}>
          {mode === 'register' && (
            <>
              <div style={st.field}>
                <label style={st.label}>Eu sou...</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <RoleOption icon="🎤" label="Artista"
                    desc="Músico/a, bailarino/a, performer, artista visual"
                    selected={role === 'artista'} onClick={() => setRole('artista')} />
                  <RoleOption icon="🏢" label="Produtor/a"
                    desc="Produção cultural, gestão de artistas, booking"
                    selected={role === 'produtor'} onClick={() => setRole('produtor')} />
                </div>
              </div>

              <div style={st.field}>
                <label style={st.label}>Nome (opcional)</label>
                <input style={st.input} type="text" value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={role === 'produtor' ? 'Nome da produtora ou o teu nome' : 'O teu nome artístico ou real'}
                  autoComplete="name" />
              </div>
            </>
          )}

          <div style={st.field}>
            <label style={st.label}>Email</label>
            <input style={st.input} type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="exemplo@email.com" required autoComplete="email" autoFocus />
          </div>

          <div style={st.field}>
            <label style={st.label}>Password</label>
            <input style={st.input} type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres" required minLength={6}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'} />
          </div>

          {mode === 'register' && (
            <div style={st.consentBox}>
              <label style={st.consentLabel}>
                <input type="checkbox" checked={consentRgpd}
                  onChange={e => setConsentRgpd(e.target.checked)} style={st.checkbox} />
                <span style={st.consentText}>
                  Li e aceito a{' '}
                  <span style={st.consentLink}
                    onClick={e => { e.preventDefault(); onShowPrivacy?.() }}>
                    Política de Privacidade
                  </span>
                  {' '}e autorizo o tratamento dos meus dados pessoais conforme o RGPD (UE) 2016/679 e a LOPDGDD (ES) 3/2018.
                </span>
              </label>
              <p style={st.consentHint}>
                🔒 Os teus dados são protegidos. Podes exportá-los ou apagá-los a qualquer momento nas Configurações.
              </p>
            </div>
          )}

          {error && <div style={st.error}>{error}</div>}
          {success && <div style={st.success}>{success}</div>}

          <button style={{ ...st.primaryBtn, opacity: loading ? 0.6 : 1 }} disabled={loading} type="submit">
            {loading ? '...' : mode === 'register' ? 'Criar conta →' : 'Entrar →'}
          </button>
        </form>

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

function RoleOption({ icon, label, desc, selected, onClick }: {
  icon: string; label: string; desc: string; selected: boolean; onClick: () => void
}) {
  return (
    <div onClick={onClick} style={{
      flex: 1, padding: '16px 14px', borderRadius: radius.lg, cursor: 'pointer',
      background: selected ? colors.primaryBg : colors.bgInput,
      border: selected ? `2px solid ${colors.primary}` : `2px solid ${colors.border}`,
      textAlign: 'center', transition: 'all 0.15s',
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: selected ? colors.primary : colors.text, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: colors.textMuted, lineHeight: 1.4 }}>{desc}</div>
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
  page: { minHeight: '100vh', background: colors.bgPage, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  container: { width: '100%', maxWidth: 420 },
  backBtn: { background: 'none', border: 'none', color: colors.textMuted, fontSize: 13, cursor: 'pointer', padding: '4px 0', marginBottom: 16 },
  logoRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  logoAccent: { fontSize: 20, fontWeight: 300, color: colors.textMuted, letterSpacing: '0.25em' },
  title: { margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: colors.text },
  subtitle: { margin: 0, fontSize: 14, color: colors.textSecondary, lineHeight: 1.6 },
  notice: { padding: '10px 14px', borderRadius: radius.sm, fontSize: 12, marginBottom: 20, background: colors.primaryBg, border: `1px solid ${colors.primaryBorder}`, color: colors.primary },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' },
  input: { background: colors.bgInput, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: '12px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const },
  primaryBtn: { background: colors.primary, color: '#fff', border: 'none', borderRadius: radius.sm, padding: '14px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
  error: { padding: '10px 14px', borderRadius: radius.sm, fontSize: 13, background: colors.dangerBg, border: `1px solid rgba(220,38,38,0.2)`, color: colors.danger },
  success: { padding: '10px 14px', borderRadius: radius.sm, fontSize: 13, background: colors.successBg, border: `1px solid rgba(5,150,105,0.2)`, color: colors.success },
  toggleText: { fontSize: 13, color: colors.textMuted },
  toggleLink: { color: colors.primary, cursor: 'pointer', fontWeight: 600 },
  consentBox: { background: colors.bgInput, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: '14px 16px' },
  consentLabel: { display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' },
  checkbox: { width: 18, height: 18, marginTop: 2, accentColor: colors.primary, flexShrink: 0, cursor: 'pointer' },
  consentText: { fontSize: 12, color: colors.textSecondary, lineHeight: 1.6 },
  consentLink: { color: colors.primary, cursor: 'pointer', textDecoration: 'underline' },
  consentHint: { margin: '8px 0 0', fontSize: 11, color: colors.textMuted, lineHeight: 1.5, paddingLeft: 28 },
}
