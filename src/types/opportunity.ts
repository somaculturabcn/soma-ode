// src/types/opportunity.ts
// SOMA ODÉ — Tipo Opportunity v4.3

export type OpportunityType =
  | 'festival'
  | 'residency'
  | 'grant'
  | 'open_call'
  | 'commission'
  | 'showcase'
  | 'venue'
  | 'party'
  | 'funding'
  | 'network'
  | 'other'

export type OpportunityStatus =
  | 'open'
  | 'rolling'
  | 'closed'
  | 'archived'

export type RequirementKey =
  | 'bio'
  | 'pressPhoto'
  | 'videoPresentation'
  | 'technicalRider'
  | 'pressKit'
  | 'pressClippings'
  | 'motivationLetter'
  | 'projectDescription'

export type CoverageDetails = {
  travel?: boolean
  accommodation?: boolean
  meals?: boolean
  production?: boolean
  fee?: boolean
}

export interface Opportunity {
  id: string

  title: string
  organization: string
  url: string
  type: OpportunityType
  status?: OpportunityStatus

  country: string
  countryName: string
  city?: string
  region?: string
  latitude?: number
  longitude?: number
  isGlobal?: boolean

  disciplines: string[]
  themes?: string[]
  genres?: string[]
  languages?: string[]
  requiredLanguages?: string[]

  coversCosts: boolean
  coverage?: CoverageDetails
  feeOffered?: number
  feeCurrency?: string
  peopleSupported?: number
  requiresEUPassport?: boolean

  requirements?: RequirementKey[]

  deadline: string
  openingDate?: string
  materialDeadline?: string
  eventDate?: string

  keywords?: string[]
  description?: string
  notes?: string
  source?: string

  contactEmail?: string
  contactId?: string
  contactName?: string
  contactOrganization?: string
  contactRole?: string
  contactPhone?: string
  contactWebsite?: string
  contactInstagram?: string
  contactLinkedin?: string
  contactTiktok?: string
}

export interface MatchBreakdown {
  disciplines: boolean
  country: boolean
  language: boolean
  costs: boolean
  affinity: boolean
  mobility: boolean
  materials: boolean
  proximity?: 'local' | 'regional' | 'target' | 'global' | 'none'
  capacity?: boolean
}

export interface MatchResult {
  percentage: number
  breakdown: MatchBreakdown
  reasons: string[]
  warnings: string[]
  blockers: string[]
}

export interface ScoredOpportunity extends Opportunity {
  match: MatchResult
}
// ═══ TIPOS PARA SCOUT POR PROJETO ═══

export type ScoutTarget = 
  | { type: 'artist'; artistId: string }
  | { type: 'project'; artistId: string; projectId: string }

export interface ScoutRequest {
  target: ScoutTarget
  filtros?: {
    paises?: string[]
    disciplinas?: string[]
    formato?: string
    cacheMin?: number
    prazoMaximo?: string // YYYY-MM-DD
  }
  scoreMinimo?: number
}

export interface ProjectForScout {
  id: string
  name: string
  format: string
  duration: string
  language: string
  summary: string
  technicalNeeds: string
  projectTargetAudience: string
  projectTerritories: string
  projectKeywords: string[]
  projectFormat: string
  hasCirculated: boolean
  circulationHistory: string
}

export interface ProjectMatchContext {
  // O que o projeto "empresta" ao artista para o matching
  disciplinas: string[]
  formato: string
  territorios: string[]     // países/cidades extraídos do projectTerritories
  keywords: string[]
  publicoAlvo: string
  tamanhoGrupo: number
  cacheMinimo?: number
  idioma: string
  necessidadesTecnicas: string
}