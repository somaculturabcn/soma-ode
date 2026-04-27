import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleLogin() {
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) setError(error.message)
  }

  async function handleRegister() {
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'viewer', // default
        },
      },
    })

    if (error) setError(error.message)
  }

  return (
    <div style={styles.wrap}>
      <h2>SOMA ODÉ</h2>

      <input
        placeholder="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={styles.input}
      />

      <input
        type="password"
        placeholder="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={styles.input}
      />

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <button onClick={handleLogin} style={styles.btn}>
        Login
      </button>

      <button onClick={handleRegister} style={styles.btnSecondary}>
        Criar conta
      </button>
    </div>
  )
}

const styles: any = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxWidth: 300,
    margin: '100px auto',
  },
  input: {
    padding: 10,
  },
  btn: {
    padding: 10,
    background: '#1A6994',
    color: '#fff',
  },
  btnSecondary: {
    padding: 10,
  },
}