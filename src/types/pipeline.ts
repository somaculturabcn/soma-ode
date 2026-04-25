// src/types/pipeline.ts
// SOMA ODÉ — Tipos do Pipeline CRM

export type PipelineStatus =
  | 'lead'
  | 'contactado'
  | 'enviado'
  | 'follow_up'
  | 'negociacao'
  | 'confirmado'
  | 'realizado'
  | 'perdido'

export const PIPELINE_LABELS: Record<PipelineStatus, string> = {
  lead: 'Lead',
  contactado: 'Contactado',
  enviado: 'Material enviado',
  follow_up: 'Follow-up',
  negociacao: 'Negociação',
  confirmado: 'Confirmado',
  realizado: 'Realizado',
  perdido: 'Perdido',
}

export type PipelineOrigin =
  | 'contacto'
  | 'oportunidade'
  | 'artista'
  | 'manual'

export interface PipelineItem {
  id: string
  title: string

  status: PipelineStatus
  origin: PipelineOrigin

  contactId?: string
  contactName?: string
  organization?: string
  email?: string
  phone?: string

  artistId?: string
  artistName?: string

  opportunityId?: string
  opportunityTitle?: string

  priority?: 'baixa' | 'media' | 'alta'
  deadline?: string

  notes?: string

  createdAt: string
  updatedAt: string
}