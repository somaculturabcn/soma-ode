// src/utils/deadlines.ts
// SOMA ODÉ — Helper central para alertas de prazo
// Usado em OpportunitiesView, MatchesView e ContractManager

export type DeadlineUrgency = 'expirado' | 'critico' | 'urgente' | 'proximo' | 'tranquilo' | 'sem_prazo'

export type DeadlineInfo = {
  urgency: DeadlineUrgency
  daysLeft: number | null
  label: string         // "expirado há 5 dias", "faltam 12 dias", etc.
  emoji: string
  color: string
  bg: string
  borderColor: string
}

// ─── Cores por urgência ───────────────────────────────────────────────────────

const STYLES: Record<DeadlineUrgency, { color: string; bg: string; borderColor: string; emoji: string }> = {
  expirado:  { color: 'rgba(160,160,160,0.7)', bg: 'rgba(255,255,255,0.04)',  borderColor: 'rgba(255,255,255,0.1)', emoji: '⊘' },
  critico:   { color: '#ff5454',                bg: 'rgba(220,40,40,0.15)',   borderColor: 'rgba(220,40,40,0.45)',  emoji: '🔴' },
  urgente:   { color: '#ff9b4d',                bg: 'rgba(220,120,40,0.13)',  borderColor: 'rgba(220,120,40,0.4)',  emoji: '⚠' },
  proximo:   { color: '#fbbf24',                bg: 'rgba(251,191,36,0.1)',   borderColor: 'rgba(251,191,36,0.3)',  emoji: '⏰' },
  tranquilo: { color: 'rgba(255,255,255,0.45)', bg: 'transparent',             borderColor: 'rgba(255,255,255,0.1)', emoji: '📅' },
  sem_prazo: { color: 'rgba(255,255,255,0.3)',  bg: 'transparent',             borderColor: 'rgba(255,255,255,0.08)', emoji: '—' },
}

// ─── Função principal ─────────────────────────────────────────────────────────

export function getDeadlineInfo(deadline?: string | null): DeadlineInfo {
  if (!deadline) {
    return { urgency: 'sem_prazo', daysLeft: null, label: 'sem prazo', ...STYLES.sem_prazo }
  }

  const target = new Date(deadline)
  if (isNaN(target.getTime())) {
    return { urgency: 'sem_prazo', daysLeft: null, label: 'data inválida', ...STYLES.sem_prazo }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const diffMs = target.getTime() - today.getTime()
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24))

  let urgency: DeadlineUrgency
  let label: string

  if (days < 0) {
    urgency = 'expirado'
    label = days === -1 ? 'expirou ontem' : `expirou há ${Math.abs(days)} dias`
  } else if (days === 0) {
    urgency = 'critico'
    label = 'hoje'
  } else if (days <= 7) {
    urgency = 'critico'
    label = days === 1 ? 'amanhã' : `${days} dias`
  } else if (days <= 30) {
    urgency = 'urgente'
    label = `${days} dias`
  } else if (days <= 60) {
    urgency = 'proximo'
    label = `${days} dias`
  } else {
    urgency = 'tranquilo'
    label = formatDate(target)
  }

  return { urgency, daysLeft: days, label, ...STYLES[urgency] }
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Contadores ───────────────────────────────────────────────────────────────

export function countUrgent<T extends { deadline?: string }>(items: T[]): number {
  return items.filter(it => {
    const info = getDeadlineInfo(it.deadline)
    return info.urgency === 'critico' || info.urgency === 'urgente'
  }).length
}

export function countCritical<T extends { deadline?: string }>(items: T[]): number {
  return items.filter(it => getDeadlineInfo(it.deadline).urgency === 'critico').length
}