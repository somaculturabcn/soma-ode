// src/components/SettingsPanel.tsx
// SOMA ODÉ v5 — Painel de configurações

import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { saveApiKey, hasApiKey } from '../services/aiService'

export default function SettingsPanel() {
  const { user, signOut } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [hasKey, setHasKey] = useState(false)

  useEffect(() => {
    setHasKey(hasApiKey())
    try {
      const stored = localStorage.getItem('soma_gemini_key')
      if (stored) setApiKey(stored)
    } catch { /* */ }
  }, [])

  function handleSaveKey() {
    if (apiKey.trim().length > 10) {
      saveApiKey(apiKey.trim())
      setHasKey(true)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  function handleRemoveKey() {
    localStorage.removeItem('soma_gemini_key')
    setApiKey('')
    setHasKey(hasApiKey())
  }

  function clearAllData() {
    if (confirm('Tens a certeza? Isto vai apagar TODOS os dados locais (perfil, artistas, booking, etc.)')) {
      const keys = ['soma_artist_profile', 'soma_artist_answers', 'soma_artists', 'soma_booking_contacts', 'soma_manual_opportunities', 'soma_gemini_key']
      keys.forEach(k => localStorage.removeItem(k))
      window.location.reload()
    }
  }

  return (
    <div style={st.page}>
      <h1 style={st.title}>⚙️ Configurações</h1>

      {/* Conta */}
      <Section title="Conta">
        <InfoRow label="Email" value={user?.email || '—'} />
        <InfoRow label="Role" value={user?.role || '—'} />
        <InfoRow label="Organização" value={user?.orgId || '—'} />
        <div style={{ marginTop: 12 }}>
          <button style={st.dangerBtn} onClick={async () => { await signOut(); window.location.reload() }}>
            Terminar sessão
          </button>
        </div>
      </Section>

      {/* Gemini API Key */}
      <Section title="IA — Gemini API Key">
        <p style={st.hint}>
          A IA usa o Gemini Flash (grátis até 1500 req/dia). Sem chave, funciona em modo offline com perfis básicos.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: hasKey ? '#6ef3a5' : '#f97066' }}>
            {hasKey ? '✓ Chave configurada' : '✗ Sem chave'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ ...st.input, flex: 1 }}
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Cola aqui a tua chave Gemini API..."
          />
          <button style={st.primaryBtn} onClick={handleSaveKey}>
            {saved ? '✓ Guardado!' : 'Guardar'}
          </button>
        </div>
        {hasKey && (
          <button style={{ ...st.linkBtn, marginTop: 8 }} onClick={handleRemoveKey}>
            Remover chave
          </button>
        )}
        <p style={{ ...st.hint, marginTop: 8 }}>
          Obtém a tua chave em{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#60b4e8' }}>
            aistudio.google.com/apikey
          </a>
        </p>
      </Section>

      {/* Dados locais */}
      <Section title="Dados locais">
        <p style={st.hint}>
          Os teus dados estão guardados no browser (localStorage). São locais — não sincronizam entre dispositivos.
        </p>
        <StorageInfo />
        <div style={{ marginTop: 12 }}>
          <button style={st.dangerBtn} onClick={clearAllData}>
            🗑 Apagar todos os dados locais
          </button>
        </div>
      </Section>

      {/* Sobre */}
      <Section title="Sobre">
        <InfoRow label="Versão" value="SOMA ODÉ v5.0" />
        <InfoRow label="Stack" value="React 19 + TypeScript + Vite + Supabase" />
        <InfoRow label="IA" value="Gemini 2.5 Flash (free tier)" />
        <p style={{ ...st.hint, marginTop: 12 }}>
          SOMA Cultura — Produção cultural catalã-brasileira focada em artistas negros, migrantes e LGBTQIA+.
          Barcelona, 2024.
        </p>
      </Section>
    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={st.section}>
      <h2 style={st.sectionTitle}>{title}</h2>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#fff' }}>{value}</span>
    </div>
  )
}

function StorageInfo() {
  const keys = [
    { key: 'soma_artist_profile', label: 'Perfil artístico' },
    { key: 'soma_artist_answers', label: 'Respostas do perfil' },
    { key: 'soma_artists', label: 'Lista de artistas' },
    { key: 'soma_booking_contacts', label: 'Contactos booking' },
    { key: 'soma_manual_opportunities', label: 'Oportunidades manuais' },
    { key: 'soma_gemini_key', label: 'Chave Gemini' },
  ]

  return (
    <div>
      {keys.map(({ key, label }) => {
        let size = '—'
        try {
          const val = localStorage.getItem(key)
          if (val) size = `${(val.length / 1024).toFixed(1)} KB`
        } catch { /* */ }
        return (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
            <span style={{ fontSize: 12, color: size === '—' ? 'rgba(255,255,255,0.2)' : '#6ef3a5' }}>{size}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Estilos ─────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  page: { maxWidth: 600, margin: '0 auto', padding: '28px 20px', color: '#fff' },
  title: { margin: '0 0 24px', fontSize: 28, color: '#60b4e8' },
  section: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '18px 20px', marginBottom: 16 },
  sectionTitle: { margin: '0 0 12px', fontSize: 15, color: '#fff', fontWeight: 700 },
  hint: { margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 },
  input: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' as const },
  primaryBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const },
  dangerBtn: { background: 'rgba(249,112,102,0.1)', color: '#f97066', border: '1px solid rgba(249,112,102,0.3)', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer' },
  linkBtn: { background: 'none', border: 'none', color: '#f97066', fontSize: 12, cursor: 'pointer', padding: 0 },
}
