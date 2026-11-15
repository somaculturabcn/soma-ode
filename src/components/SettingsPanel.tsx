// src/components/SettingsPanel.tsx
// SOMA ODÉ v5 — Painel de configurações

import { useState, useEffect } from 'react'
import { saveApiKey, hasApiKey } from '../services/aiService'
import { getActivityLog, downloadActivityCSV, clearActivityLog, logActivity } from '../services/activityLog'

export default function SettingsPanel() {
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

  function exportAllData() {
    try {
      const dataKeys = [
        'soma_user', 'soma_artist_profile', 'soma_artist_answers',
        'soma_artists', 'soma_booking_contacts', 'soma_manual_opportunities',
        'soma_activity_log'
      ]
      const exportData: Record<string, unknown> = {
        _meta: {
          plataforma: 'SOMA ODÉ',
          exportado_em: new Date().toISOString(),
          versao: '7.0',
          nota_legal: 'Exportação de dados pessoais conforme Art. 20 RGPD (Direito à Portabilidade)',
        }
      }
      for (const key of dataKeys) {
        try {
          const val = localStorage.getItem(key)
          if (val) exportData[key.replace('soma_', '')] = JSON.parse(val)
        } catch { /* skip non-JSON */ }
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `soma-ode-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      logActivity('RGPD', 'exportar_dados', 'Dados pessoais exportados (JSON)')
    } catch (err) {
      alert('Erro ao exportar: ' + (err instanceof Error ? err.message : 'desconhecido'))
    }
  }

  function deleteAllDataRgpd() {
    const step1 = confirm(
      '⚠️ ATENÇÃO: Apagar todos os dados?\n\n' +
      'Esta ação é irreversível e remove:\n' +
      '• Perfil e conta\n' +
      '• Artistas e cartografias\n' +
      '• Contatos de booking\n' +
      '• Oportunidades guardadas\n' +
      '• Registo de atividade\n' +
      '• Chave de API\n\n' +
      'Conforme Art. 17 RGPD (Direito ao Esquecimento).'
    )
    if (!step1) return

    const step2 = confirm(
      '🗑️ CONFIRMAÇÃO FINAL\n\n' +
      'Escreve OK para confirmar. Ao clicar em OK, todos os teus dados serão apagados permanentemente.'
    )
    if (!step2) return

    // Log antes de apagar
    logActivity('RGPD', 'apagar_dados', 'Utilizador solicitou eliminação total dos dados pessoais')

    // Apagar tudo
    const allSomaKeys = Object.keys(localStorage).filter(k => k.startsWith('soma_'))
    allSomaKeys.forEach(k => localStorage.removeItem(k))

    alert('✓ Todos os teus dados foram apagados.\nA sessão será encerrada.')
    window.location.reload()
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
        <InfoRow label="Email" value={(() => { try { const u = localStorage.getItem('soma_user'); return u ? JSON.parse(u).email : '—' } catch { return '—' } })()} />
        <InfoRow label="Modo" value={(() => { try { return localStorage.getItem('soma_user') ? 'Autenticado' : 'Visitante' } catch { return '—' } })()} />
        <div style={{ marginTop: 12 }}>
          <button style={st.dangerBtn} onClick={() => { localStorage.clear(); window.location.reload() }}>
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

      {/* Registo de atividade */}
      <Section title="Registo de Atividade">
        <p style={st.hint}>
          Todas as tuas ações na plataforma ficam registadas. Exporta para CSV (Excel/Google Sheets) a qualquer momento.
        </p>
        <ActivityLogSection />
      </Section>

      {/* RGPD — Direitos sobre os teus dados */}
      <Section title="🛡️ Proteção de dados (RGPD)">
        <p style={st.hint}>
          Conforme o RGPD (UE) e a LOPDGDD (Espanha), tens direito a aceder, exportar e apagar os teus dados pessoais a qualquer momento.
        </p>

        {/* Exportar */}
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>📦 Exportar os meus dados</h3>
          <p style={st.hint}>
            Descarrega todos os teus dados em formato JSON — perfil, artistas, oportunidades, booking e configurações.
          </p>
          <button style={st.primaryBtn} onClick={exportAllData}>
            📦 Descarregar os meus dados (JSON)
          </button>
        </div>

        {/* Info sobre consentimento */}
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>📋 Consentimento</h3>
          <ConsentInfo />
        </div>

        {/* Apagar */}
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>🗑️ Apagar todos os meus dados</h3>
          <p style={{ ...st.hint, color: '#f97066' }}>
            Ação irreversível. Remove todos os teus dados pessoais da plataforma: perfil, artistas, contatos, oportunidades e configurações. Conforme Art. 17 do RGPD (Direito ao Esquecimento).
          </p>
          <button style={st.dangerBtn} onClick={deleteAllDataRgpd}>
            🗑️ Apagar todos os meus dados permanentemente
          </button>
        </div>

        {/* IA */}
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>🤖 Uso de Inteligência Artificial</h3>
          <p style={st.hint}>
            A SOMA ODÉ utiliza o modelo Gemini 2.5 Flash (Google) para gerar perfis artísticos na Cartografia e sugestões de Match com oportunidades. Nenhum dado pessoal é enviado para treinar modelos de IA. Tens direito a pedir revisão humana de qualquer decisão automatizada (Art. 22 RGPD).
          </p>
        </div>
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
        <InfoRow label="Versão" value="SOMA ODÉ v7.0" />
        <InfoRow label="Stack" value="React 19 + TypeScript + Vite + Supabase" />
        <InfoRow label="IA" value="Gemini 2.5 Flash (free tier)" />
        <InfoRow label="Conformidade" value="RGPD (UE) + LOPDGDD (ES)" />
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

function ActivityLogSection() {
  const log = getActivityLog()
  const recent = log.slice(-10).reverse()

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button style={{ background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          onClick={() => {
            logActivity('SETTINGS', 'exportar', 'Exportou log de atividade para CSV')
            downloadActivityCSV()
          }}>
          📊 Exportar CSV ({log.length} registos)
        </button>
        {log.length > 0 && (
          <button style={{ background: 'rgba(249,112,102,0.1)', color: '#f97066', border: '1px solid rgba(249,112,102,0.3)', borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}
            onClick={() => {
              if (confirm('Apagar todo o registo de atividade?')) {
                clearActivityLog()
                window.location.reload()
              }
            }}>
            Limpar log
          </button>
        )}
      </div>
      {recent.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>Últimas ações:</div>
          {recent.map(e => (
            <div key={e.id} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 11 }}>
              <span style={{ color: 'rgba(255,255,255,0.25)', minWidth: 115, flexShrink: 0 }}>
                {new Date(e.timestamp).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span style={{ color: '#60b4e8', minWidth: 60, flexShrink: 0 }}>{e.module}</span>
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{e.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ConsentInfo() {
  let consentAt = '—'
  let consentVersion = '—'
  try {
    const user = JSON.parse(localStorage.getItem('soma_user') || '{}')
    if (user.rgpd_consent_at) {
      consentAt = new Date(user.rgpd_consent_at).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    }
    if (user.rgpd_consent_version) consentVersion = `v${user.rgpd_consent_version}`
  } catch { /* */ }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Data do consentimento</span>
        <span style={{ fontSize: 12, color: consentAt === '—' ? '#f97066' : '#6ef3a5' }}>{consentAt}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Versão da política</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{consentVersion}</span>
      </div>
      {consentAt === '—' && (
        <p style={{ fontSize: 11, color: '#f97066', marginTop: 6, lineHeight: 1.4 }}>
          ⚠️ Sem registo de consentimento. Contas criadas antes da v7 devem aceitar a nova Política de Privacidade.
        </p>
      )}
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
