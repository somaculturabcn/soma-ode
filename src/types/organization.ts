// src/types/organization.ts
// SOMA ODÉ — Tipo de Organização (multi-produtor)

export type OrgPlan = 'free' | 'pro'

export type Organization = {
  id: string
  name: string
  slug?: string
  ownerId?: string
  plan: OrgPlan
  createdAt?: string
  updatedAt?: string
}

// ID fixo da SOMA Cultura — todos os dados existentes pertencem a esta org
export const SOMA_ORG_ID = '00000000-0000-0000-0000-000000000001'