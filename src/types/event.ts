// src/types/event.ts
// SOMA ODÉ — Módulo Festas/Eventos

// ─── Sub-tipos ────────────────────────────────────────────

export type EventType = 'festa' | 'show' | 'festival' | 'residencia' | 'showcase' | 'outro'
export type EventStatus = 'ideia' | 'confirmado' | 'em_producao' | 'realizado' | 'cancelado'

export type EventTeamMember = {
  id: string
  name: string
  role: string         // DJ, performer, técnico, bar, segurança, produtor, fotógrafo
  fee?: number         // cachê em €
  contact?: string
  notes?: string
}

export type EventBudget = {
  // Receita estimada
  ticketPrice?: number         // preço de entrada €
  ticketsExpected?: number     // público esperado
  barRevenue?: number          // receita bar estimada €

  // Receita real (pós-evento)
  ticketRevenueActual?: number
  barRevenueActual?: number
  totalRevenueActual?: number

  // Custos
  artistFees?: number          // total cachês artistas €
  productionCosts?: number     // produção / técnica €
  marketingCosts?: number      // ads / impressão €
  venueRent?: number           // aluguel / split venue €
  otherCosts?: number

  // Resultado
  profit?: number              // calculado: receita - custos
  notes?: string
}

export type EventAudience = {
  expected?: number            // público esperado
  actual?: number              // público real (pós-evento)
  entryPrice?: number          // € na porta
  freeEntryUntil?: string      // ex: "00:00"
  listInfo?: string            // "lista via DM até 00h"
  discountCode?: string        // ex: FERNA7
  discountPrice?: number       // € com desconto
}

export type EventComms = {
  concept?: string             // conceito / tagline do evento
  channels?: string[]          // ['instagram', 'whatsapp', 'tiktok']
  mainCopy?: string            // texto principal usado
  adsBudget?: number           // € investido em ads
  adsResult?: string           // notas pós-campanha
  hashtags?: string[]
  instagramPost?: string       // link do post
  ticketLink?: string          // link de venda
}

// ─── Evento principal ─────────────────────────────────────

export type SomaEvent = {
  id: string
  organizationId: string

  // Identificação
  name: string
  type: EventType
  eventDate?: string           // ISO date: "2026-05-08"
  startTime?: string           // "23:00"
  endTime?: string             // "05:00"

  // Venue
  venueName?: string
  venueAddress?: string
  venueCity?: string
  venueCountry?: string
  venueCapacity?: number
  venueContact?: string
  venueInstagram?: string

  // Artistas e equipa
  artistIds: string[]          // IDs do roster ligados
  team: EventTeamMember[]      // equipa do evento

  // Financeiro, público e comunicação
  budget: EventBudget
  audience: EventAudience
  communication: EventComms

  // Status e notas
  status: EventStatus
  notes?: string               // notas internas pré-evento
  postEventNotes?: string      // recap pós-evento: o que correu bem/mal

  createdAt?: string
  updatedAt?: string
}

// ─── Helpers ──────────────────────────────────────────────

export function emptyEvent(organizationId: string): Omit<SomaEvent, 'id'> {
  return {
    organizationId,
    name: '',
    type: 'festa',
    eventDate: '',
    startTime: '',
    endTime: '',
    venueName: '',
    venueAddress: '',
    venueCity: 'Barcelona',
    venueCountry: 'España',
    venueCapacity: undefined,
    venueContact: '',
    venueInstagram: '',
    artistIds: [],
    team: [],
    budget: {},
    audience: {},
    communication: {},
    status: 'ideia',
    notes: '',
    postEventNotes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  festa: '🎉 Festa',
  show: '🎤 Show',
  festival: '🎪 Festival',
  residencia: '🏠 Residência',
  showcase: '🎯 Showcase',
  outro: '📌 Outro',
}

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  ideia: '💡 Ideia',
  confirmado: '✅ Confirmado',
  em_producao: '⚙️ Em produção',
  realizado: '🎊 Realizado',
  cancelado: '❌ Cancelado',
}

export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  ideia: '#888780',
  confirmado: '#60b4e8',
  em_producao: '#ffcf5c',
  realizado: '#6ef3a5',
  cancelado: '#ff8a8a',
}

export const TEAM_ROLES = [
  'DJ', 'Performer', 'Técnico de som', 'Técnico de luz',
  'Produtor/a', 'Bar', 'Segurança', 'Fotógrafo/a',
  'Vídeo', 'Decoração', 'Recepção', 'Outro',
]