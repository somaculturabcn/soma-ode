// src/services/activityLog.ts
// SOMA ODÉ — Sistema de log de atividades (exportável para Excel/CSV)

export type ActivityEntry = {
  id: string
  timestamp: string       // ISO string
  user: string            // email
  role: string            // admin | artista | produtor
  module: string          // PERFIL | RADAR | MATCH | BOOKING | REDE | SETTINGS
  action: string          // criar | editar | apagar | ver | exportar | guardar
  detail: string          // descrição legível
  data?: Record<string, any>  // dados extra (opcional)
}

const STORAGE_KEY = 'soma_activity_log'

/** Lê todo o log */
export function getActivityLog(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** Adiciona uma entrada ao log */
export function logActivity(
  module: string,
  action: string,
  detail: string,
  data?: Record<string, any>
): void {
  try {
    const user = (() => {
      try {
        const u = localStorage.getItem('soma_user')
        return u ? JSON.parse(u) : { email: 'anónimo', role: 'visitante' }
      } catch {
        return { email: 'anónimo', role: 'visitante' }
      }
    })()

    const entry: ActivityEntry = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      user: user.email || 'anónimo',
      role: user.role || 'artista',
      module,
      action,
      detail,
      data,
    }

    const log = getActivityLog()
    log.push(entry)

    // Limita a 5000 entradas para não encher o localStorage
    if (log.length > 5000) log.splice(0, log.length - 5000)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
  } catch {
    // silencioso — log é best-effort
  }
}

/** Limpa todo o log */
export function clearActivityLog(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/** Exporta o log para CSV (abre no Excel) */
export function exportActivityCSV(): string {
  const log = getActivityLog()
  const BOM = '﻿' // para o Excel reconhecer UTF-8

  const header = 'Data/Hora;Utilizador;Papel;Módulo;Ação;Descrição;Dados Extra'
  const rows = log.map(e => {
    const date = new Date(e.timestamp).toLocaleString('pt-PT', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
    const extra = e.data ? JSON.stringify(e.data).replace(/"/g, "'") : ''
    return `${date};${e.user};${e.role};${e.module};${e.action};${esc(e.detail)};${esc(extra)}`
  })

  return BOM + [header, ...rows].join('\n')
}

/** Faz download do CSV no browser */
export function downloadActivityCSV(): void {
  const csv = exportActivityCSV()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `soma-ode-atividade-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function esc(s: string): string {
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}
