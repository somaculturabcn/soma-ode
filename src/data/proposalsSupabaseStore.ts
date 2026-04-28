// src/data/proposalsSupabaseStore.ts
// SOMA ODÉ — Store de Propostas (curadoria SOMA → Artistas)

import { supabase } from '../lib/supabase'
import type { Proposal, ProposalStatus } from '../types/proposal'

// ─── LOAD ─────────────────────────────────────────

export async function loadProposalsFromSupabase(): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('artist_proposals')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao carregar propostas:', error)
    return []
  }

  return (data || []).map(rowToProposal)
}

export async function loadProposalsForArtist(artistId: string): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('artist_proposals')
    .select('*')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao carregar propostas do artista:', error)
    return []
  }

  return (data || []).map(rowToProposal)
}

// ─── ADD ──────────────────────────────────────────

export async function addProposalToSupabase(
  proposal: Omit<Proposal, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Proposal | null> {
  const now = new Date().toISOString()

  const newProposal: Proposal = {
    ...proposal,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }

  const row = proposalToRow(newProposal)

  const { error } = await supabase.from('artist_proposals').insert(row)

  if (error) {
    console.error('🔥 ERRO ao adicionar proposta:', error)
    throw error
  }

  return newProposal
}

// ─── UPDATE ───────────────────────────────────────

export async function updateProposalInSupabase(updated: Proposal) {
  const row = proposalToRow({
    ...updated,
    updatedAt: new Date().toISOString(),
  })

  const { error } = await supabase
    .from('artist_proposals')
    .update(row)
    .eq('id', updated.id)

  if (error) {
    console.error('🔥 ERRO ao actualizar proposta:', error)
    throw error
  }
}

export async function updateProposalStatusInSupabase(
  id: string,
  status: ProposalStatus,
  artistResponse?: string
) {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (artistResponse !== undefined) {
    updateData.artist_response = artistResponse
    updateData.artist_responded_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('artist_proposals')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('🔥 ERRO ao mudar status da proposta:', error)
    throw error
  }
}

// ─── DELETE ───────────────────────────────────────

export async function deleteProposalFromSupabase(id: string) {
  const { error } = await supabase
    .from('artist_proposals')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('🔥 ERRO ao apagar proposta:', error)
    throw error
  }
}

// ─── Conversões ───────────────────────────────────

function proposalToRow(p: Proposal): any {
  return {
    id: p.id,
    artist_id: p.artistId,
    producer_id: p.producerId || null,
    producer_name: p.producerName || null,

    opportunity_id: p.opportunityId || null,
    opportunity_title: p.opportunityTitle,
    opportunity_organization: p.opportunityOrganization || null,
    opportunity_country: p.opportunityCountry || null,
    opportunity_deadline: p.opportunityDeadline || null,
    opportunity_link: p.opportunityLink || null,

    status: p.status,
    producer_notes: p.producerNotes || null,
    artist_response: p.artistResponse || null,
    artist_responded_at: p.artistRespondedAt || null,

    updated_at: p.updatedAt || new Date().toISOString(),
    payload: p,
  }
}

function rowToProposal(row: any): Proposal {
  if (row.payload && typeof row.payload === 'object') {
    return {
      ...row.payload,
      id: row.id,
      status: row.status,
      updatedAt: row.updated_at,
    }
  }

  return {
    id: row.id,
    artistId: row.artist_id,
    producerId: row.producer_id,
    producerName: row.producer_name,

    opportunityId: row.opportunity_id,
    opportunityTitle: row.opportunity_title,
    opportunityOrganization: row.opportunity_organization,
    opportunityCountry: row.opportunity_country,
    opportunityDeadline: row.opportunity_deadline,
    opportunityLink: row.opportunity_link,

    status: row.status,
    producerNotes: row.producer_notes,
    artistResponse: row.artist_response,
    artistRespondedAt: row.artist_responded_at,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}