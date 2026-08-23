// src/types/matchTypes.ts
// SOMA ODÉ — Tipos e constantes do módulo de Oportunidades
// Extraído de MatchView.tsx (modularização)

export function safeArr(val: any): string[] {
    if (Array.isArray(val)) return val
    if (typeof val === 'string' && val.trim()) return val.split(',').map((s: string) => s.trim()).filter(Boolean)
    return []
  }
  
  export type Recurrence = 'anual' | 'semestral' | 'irregular' | 'unica'
  
  export type Opportunity = {
    id: string
    title: string
    organization?: string
    type?: string
    country?: string
    countryName?: string
    city?: string
    disciplines?: string[]
    languages?: string[]
    deadline?: string
    openingDate?: string
    recurrence?: Recurrence
    usualOpeningMonth?: number
    usualDeadlineMonth?: number
    recurrenceNotes?: string
    summary?: string
    description?: string
    link?: string
    keywords?: string[]
    themes?: string[]
    requirements?: string[]
    assignedArtistId?: string
    assignedArtistName?: string
    coversCosts?: boolean
    isPrivate?: boolean
    status?: string
    source?: string
    notes?: string
    createdAt?: string
    updatedAt?: string
    sharedWith?: string[]
    organizationId?: string
    _matchScore?: number
    _matchReasons?: string[]
    _fromWeb?: boolean
    _fromSupabase?: boolean
  }
  
  export type ArtistLite = { id: string; artisticName?: string; name?: string; legalName?: string }
  
  export type SavedSearch = {
    id: string
    name: string
    query: string
    countries: string
    disciplines: string
    languages: string
    maxResults: number
    opportunityType?: string
    selectedCountries?: string[]
    selectedDisciplines?: string[]
    searchQueries?: string[]
    applicantProfile?: string
    recurrenceMode?: 'ativas_agora' | 'recorrentes' | 'ambas'
    usualOpeningMonth?: number
    usualDeadlineMonth?: number
    recurrenceNotes?: string
  }
  
  // ─── Constantes ──────────────────────────────────────────────────────────────
  
  export const STORAGE_KEY = 'soma-manual-opportunities-v1'
  export const ARTISTS_KEY = 'soma-artists-v2'
  export const SCORE_THRESHOLD = 20
  export const GEMINI_MODEL = 'gemini-2.5-flash'
  
  export const TYPE_COLORS: Record<string, string> = {
    residency: '#6ef3a5', residencia: '#6ef3a5',
    festival: '#ffcf5c',
    open_call: '#60b4e8',
    showcase: '#ff9f5c',
    grant: '#c084fc', premio: '#c084fc',
    mobilidade: '#38bdf8',
    financiamento: '#4ade80',
    venue: '#f472b6', festa: '#f472b6', clube: '#f472b6', party: '#f472b6',
  }
  
  export const TYPE_ICONS: Record<string, string> = {
    residency: '🏠', residencia: '🏠',
    festival: '🎪', open_call: '📋', showcase: '🎤',
    grant: '🏆', premio: '🏆', mobilidade: '✈️', financiamento: '💰',
    venue: '🏛', festa: '🎉', clube: '🎧', party: '🎉',
  }
  
  export const RECURRENCE_OPTIONS: { value: Recurrence; label: string; color: string }[] = [
    { value: 'anual', label: '🔄 Anual', color: '#6ef3a5' },
    { value: 'semestral', label: '🔄 Semestral', color: '#60b4e8' },
    { value: 'irregular', label: '⚡ Irregular', color: '#ffcf5c' },
    { value: 'unica', label: '1️⃣ Única', color: 'rgba(255,255,255,0.5)' },
  ]