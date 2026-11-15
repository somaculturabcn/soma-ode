// src/components/AiDisclosureBanner.tsx
// SOMA ODÉ v7 — Banner de transparência sobre uso de IA (Art. 22 RGPD)

import { useState } from 'react'

type Props = {
  /** Contexto onde aparece: match, cartografia, comparacao */
  context: 'match' | 'cartografia' | 'comparacao'
  /** Compact = uma linha só, expandível */
  compact?: boolean
}

const messages: Record<string, { short: string; detail: string }> = {
  match: {
    short: '🤖 Este Match usa IA (Gemini) para calcular a compatibilidade.',
    detail: 'O score é gerado pelo modelo Gemini 2.5 Flash com base na tua Cartografia SOMA e no perfil da oportunidade. Os teus dados NÃO são usados para treinar modelos. Tens direito a pedir revisão humana deste resultado (Art. 22 RGPD). Contacta: privacidade@somacultura.com',
  },
  cartografia: {
    short: '🤖 O perfil da Cartografia é gerado com apoio de IA (Gemini).',
    detail: 'As tuas respostas aos 4 eixos (RAIZ, CAMPO, TEIA, ROTA) são processadas pelo Gemini 2.5 Flash para gerar um perfil artístico estruturado. Podes editar ou rejeitar o perfil gerado. Os teus dados NÃO são usados para treinar modelos. Contacta: privacidade@somacultura.com',
  },
  comparacao: {
    short: '🤖 A comparação de artistas usa IA para cruzar perfis.',
    detail: 'O Motor de Comparação utiliza a Cartografia SOMA de ambos os artistas, processada pelo Gemini 2.5 Flash, para identificar afinidades e divergências. Nenhum dado pessoal é partilhado entre artistas sem consentimento. Contacta: privacidade@somacultura.com',
  },
}

export default function AiDisclosureBanner({ context, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false)
  const msg = messages[context]

  if (compact && !expanded) {
    return (
      <div style={st.compactBar} onClick={() => setExpanded(true)}>
        <span style={st.compactText}>{msg.short}</span>
        <span style={st.expandBtn}>Saber mais ↓</span>
      </div>
    )
  }

  return (
    <div style={st.banner}>
      <div style={st.header}>
        <span style={st.headerText}>{msg.short}</span>
        {compact && (
          <span style={st.collapseBtn} onClick={() => setExpanded(false)}>✕</span>
        )}
      </div>
      <p style={st.detail}>{msg.detail}</p>
      <div style={st.footer}>
        <span style={st.badge}>RGPD Art. 22 · Decisão automatizada</span>
        <span style={st.badge}>Dados não usados para treino</span>
      </div>
    </div>
  )
}

const st: Record<string, React.CSSProperties> = {
  banner: {
    background: 'rgba(96,180,232,0.05)',
    border: '1px solid rgba(96,180,232,0.15)',
    borderRadius: 10,
    padding: '14px 16px',
    marginBottom: 16,
  },
  compactBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    background: 'rgba(96,180,232,0.04)',
    border: '1px solid rgba(96,180,232,0.1)',
    borderRadius: 8,
    padding: '8px 14px',
    marginBottom: 12,
    cursor: 'pointer',
  },
  compactText: { fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  expandBtn: { fontSize: 10, color: '#60b4e8', whiteSpace: 'nowrap' as const, flexShrink: 0 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerText: { fontSize: 13, fontWeight: 600, color: '#60b4e8' },
  collapseBtn: { fontSize: 14, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '0 4px' },
  detail: { margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 },
  footer: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
  badge: {
    fontSize: 10,
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: 6,
    background: 'rgba(96,180,232,0.08)',
    color: 'rgba(96,180,232,0.7)',
    border: '1px solid rgba(96,180,232,0.12)',
  },
}
