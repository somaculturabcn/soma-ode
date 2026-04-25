// src/components/DeadlineBadge.tsx
// SOMA ODÉ — Badge visual de prazo
// Mostra urgência consoante quantos dias faltam

import { getDeadlineInfo } from '../utils/deadlines'

type Props = {
  deadline?: string | null
  size?: 'sm' | 'md'
  showIcon?: boolean
}

export default function DeadlineBadge({ deadline, size = 'sm', showIcon = true }: Props) {
  const info = getDeadlineInfo(deadline)

  if (info.urgency === 'sem_prazo') return null

  const padding = size === 'sm' ? '3px 9px' : '5px 12px'
  const fontSize = size === 'sm' ? 11 : 12

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding,
      borderRadius: 20,
      fontSize,
      fontWeight: 600,
      color: info.color,
      background: info.bg,
      border: `0.5px solid ${info.borderColor}`,
      whiteSpace: 'nowrap' as const,
    }}>
      {showIcon && <span style={{ fontSize: fontSize - 1 }}>{info.emoji}</span>}
      <span>{info.label}</span>
    </span>
  )
}