// src/types/event.ts
// SOMA ODÉ — Módulo Festas/Eventos v2
// Artistas externos, campanhas, SWOT, análise de lucratividade

// ─── Tipos básicos ─────────────────────────────────────────

export type EventType = 'festa' | 'show' | 'festival' | 'residencia' | 'showcase' | 'outro'
export type EventStatus = 'ideia' | 'confirmado' | 'em_producao' | 'realizado' | 'cancelado'

export type AgreementType =
  | 'cache_fixo'
  | 'revenue_share'
  | 'gratuito'
  | 'troca'
  | 'a_definir'

export type PaymentMethod =
  | 'transferencia_bancaria'
  | 'paypal'
  | 'bizum'
  | 'revolut'
  | 'cash'
  | 'outro'

// ─── Artista externo (não está no roster) ─────────────────

export type ExternalArtist = {
  id: string
  name: string
  role: string               // DJ, Performer, Técnico de som, etc.
  instagram?: string
  email?: string
  phone?: string
  website?: string

  // Acordo
  agreementType: AgreementType
  fee?: number
  currency?: string          // EUR, BRL, USD
  revenueSharePercent?: number // % se revenue share
  contractNotes?: string

  // Pagamento
  paymentMethod?: PaymentMethod
  iban?: string
  bankName?: string
  paypalEmail?: string
  bizumPhone?: string
  revolutHandle?: string
  paymentNotes?: string
}

// ─── Equipa interna (produção, técnica, bar) ──────────────

export type EventTeamMember = {
  id: string
  name: string
  role: string
  fee?: number
  contact?: string
  notes?: string
}

// ─── Campanha de marketing ────────────────────────────────

export type EventCampaign = {
  hasCampaign: boolean
  platforms?: string[]         // ['instagram', 'tiktok', 'whatsapp', 'facebook', 'email']
  adsBudget?: number           // € investido em ads pagos
  organicReach?: number        // alcance orgânico estimado
  impressions?: number
  clicks?: number
  ticketsSoldOnline?: number
  discountCode?: string        // ex: FERNA7
  discountPrice?: number
  mainPostLink?: string        // link do post principal
  tikTokLink?: string
  concept?: string             // tagline / copy principal usado
  result?: string              // análise pós-campanha
}

// ─── Financeiro ───────────────────────────────────────────

export type EventBudget = {
  // Receita estimada
  ticketPrice?: number
  ticketsExpected?: number
  barRevenueEstimated?: number

  // Receita real (pós-evento)
  ticketRevenueActual?: number
  barRevenueActual?: number
  otherRevenueActual?: number

  // Custos
  artistFees?: number          // total cachês artistas externos
  teamFees?: number            // total equipa interna
  productionCosts?: number     // técnica, rider, decoração
  marketingCosts?: number      // ads + material impresso
  venueRent?: number           // aluguel ou split com venue
  otherCosts?: number

  // Notas
  notes?: string
}

// ─── Público e entradas ───────────────────────────────────

export type EventAudience = {
  expected?: number
  actual?: number
  entryPrice?: number
  freeEntryUntil?: string
  listInfo?: string
  discountCode?: string
  discountPrice?: number
  ticketLink?: string
}

// ─── Materiais do evento ──────────────────────────────────

export type EventMaterials = {
  photosLink?: string          // Google Drive, etc.
  videoLink?: string
  pressKitLink?: string
  recapVideoLink?: string
  setRecordingLink?: string
  posterLink?: string
  otherLinks?: string
}

// ─── Análise SOMA (IA) ────────────────────────────────────

export type SWOTAnalysis = {
  forcas: string[]
  fraquezas: string[]
  oportunidades: string[]
  ameacas: string[]
}

export type EventSomaAnalysis = {
  swot?: SWOTAnalysis
  lucrabilidadeScore?: number   // 0-100
  lucrabilidadeVerdict?: string // 'lucrativo' | 'equilibrado' | 'prejuizo'
  lucrabilidadeAnalysis?: string
  dicasCrescimento?: string[]
  acordoRecomendado?: string
  proximaEdicao?: string        // o que fazer na próxima edição
  generatedAt?: string
}

// ─── Evento principal ─────────────────────────────────────

export type SomaEvent = {
  id: string
  organizationId: string

  // Identificação
  name: string
  type: EventType
  eventDate?: string
  startTime?: string
  endTime?: string

  // Venue
  venueName?: string
  venueAddress?: string
  venueCity?: string
  venueCountry?: string
  venueCapacity?: number
  venueContact?: string
  venueInstagram?: string

  // Artistas
  artistIds: string[]           // IDs do roster
  externalArtists: ExternalArtist[]

  // Equipa interna
  team: EventTeamMember[]

  // Módulos
  budget: EventBudget
  audience: EventAudience
  campaign: EventCampaign
  materials: EventMaterials
  somaAnalysis?: EventSomaAnalysis

  // Status e notas
  status: EventStatus
  notes?: string
  postEventNotes?: string

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
    startTime: '23:00',
    endTime: '05:00',
    venueName: '',
    venueAddress: '',
    venueCity: 'Barcelona',
    venueCountry: 'España',
    venueCapacity: undefined,
    venueContact: '',
    venueInstagram: '',
    artistIds: [],
    externalArtists: [],
    team: [],
    budget: {},
    audience: {},
    campaign: { hasCampaign: false },
    materials: {},
    status: 'ideia',
    notes: '',
    postEventNotes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function calcProfit(ev: SomaEvent): number {
  const b = ev.budget
  const revenue = (b.ticketRevenueActual || 0) + (b.barRevenueActual || 0) + (b.otherRevenueActual || 0)
  const extFees = ev.externalArtists.reduce((a, x) => a + (x.fee || 0), 0)
  const teamFees = ev.team.reduce((a, m) => a + (m.fee || 0), 0)
  const costs = (b.artistFees ?? extFees) + (b.teamFees ?? teamFees) +
    (b.productionCosts || 0) + (b.marketingCosts || 0) +
    (b.venueRent || 0) + (b.otherCosts || 0)
  return revenue - costs
}

export function calcTotalExternalFees(artists: ExternalArtist[]): number {
  return artists.reduce((a, x) => a + (x.fee || 0), 0)
}

export function calcTotalTeamFees(team: EventTeamMember[]): number {
  return team.reduce((a, m) => a + (m.fee || 0), 0)
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

export const AGREEMENT_LABELS: Record<AgreementType, string> = {
  cache_fixo: 'Cachê fixo',
  revenue_share: 'Revenue share (%)',
  gratuito: 'Gratuito',
  troca: 'Troca / permuta',
  a_definir: 'A definir',
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  transferencia_bancaria: 'Transferência bancária',
  paypal: 'PayPal',
  bizum: 'Bizum',
  revolut: 'Revolut',
  cash: 'Cash',
  outro: 'Outro',
}

export const TEAM_ROLES = [
  'DJ', 'Performer', 'Técnico de som', 'Técnico de luz',
  'Produtor/a', 'Bar', 'Segurança', 'Fotógrafo/a',
  'Vídeo', 'Decoração', 'Recepção', 'Outro',
]

export const CAMPAIGN_PLATFORMS = [
  'instagram', 'tiktok', 'whatsapp', 'facebook', 'email', 'tiktok_ads', 'meta_ads',
]