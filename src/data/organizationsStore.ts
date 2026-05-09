// src/data/organizationsStore.ts
import { supabase } from '../lib/supabase'

export type ProducerOrganization = {
  id: string
  name: string
  slug?: string
  owner_id?: string
  plan?: string

  legal_name?: string
  nif?: string
  phone?: string
  instagram?: string
  website?: string

  address?: string
  zip_code?: string
  city?: string
  country?: string

  bio?: string
  disciplines?: string[]
  target_countries?: string[]

  iban?: string
  bank_name?: string
  payment_method?: string
  currency?: string

  portfolio_link?: string
  presskit_link?: string

  cartografia?: {
    raiz?: string
    campo?: string
    teia?: string
    rota?: string
    values?: string[]
    artistProfiles?: string[]
    territories?: string[]
    partners?: string[]
    goals?: string[]
  }

  created_at?: string
  updated_at?: string
}

export async function loadOrganizationById(id: string): Promise<ProducerOrganization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Erro ao carregar organização:', error)
    return null
  }

  return data as ProducerOrganization | null
}

export async function saveOrganization(org: ProducerOrganization): Promise<ProducerOrganization | null> {
  const payload = {
    ...org,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('organizations')
    .upsert(payload)
    .select('*')
    .single()

  if (error) {
    console.error('Erro ao guardar organização:', error)
    throw error
  }

  return data as ProducerOrganization
}