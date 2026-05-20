// src/data/opportunitiesSupabaseStore.ts
// SOMA ODÉ — Store Supabase para Oportunidades
// Pública = todos vêem | Privada = criador + admins

import { supabase } from '../lib/supabase'

// ─── Auth helper ──────────────────────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id || null
}

// ─── Load ─────────────────────────────────────────────────

export async function loadOpportunitiesFromSupabase(): Promise<any[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao carregar oportunidades:', error)
    return []
  }

  return (data || []).map(rowToOp)
}

// ─── Save ─────────────────────────────────────────────────

export async function saveOpportunityToSupabase(op: any, organizationId: string): Promise<void> {
  const currentUserId = await getCurrentUserId()

  const { error } = await supabase
    .from('opportunities')
    .upsert(opToRow(op, organizationId, currentUserId), { onConflict: 'id' })

  if (error) throw error
}

// ─── Batch save ───────────────────────────────────────────

export async function saveOpportunitiesBatch(ops: any[], organizationId: string): Promise<void> {
  const currentUserId = await getCurrentUserId()
  const rows = ops.map(op => opToRow(op, organizationId, currentUserId))

  const { error } = await supabase
    .from('opportunities')
    .upsert(rows, { onConflict: 'id' })

  if (error) throw error
}

// ─── Delete ───────────────────────────────────────────────

export async function deleteOpportunityFromSupabase(id: string): Promise<void> {
  const { error } = await supabase
    .from('opportunities')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ─── Partilhar com produtor ───────────────────────────────

export async function shareOpportunityWithProducer(
  opportunityId: string,
  targetOrgId: string,
  somaOrgId: string,
  opportunity: any,
): Promise<void> {
  const currentUserId = await getCurrentUserId()

  const { data: existing } = await supabase
    .from('opportunities')
    .select('id, shared_with')
    .eq('id', opportunityId)
    .maybeSingle()

  if (existing) {
    const current = existing.shared_with || []

    if (current.includes(targetOrgId)) return

    const { error } = await supabase
      .from('opportunities')
      .update({ shared_with: [...current, targetOrgId] })
      .eq('id', opportunityId)

    if (error) throw error
  } else {
    const { error } = await supabase
      .from('opportunities')
      .insert({
        ...opToRow(opportunity, somaOrgId, currentUserId),
        shared_with: [targetOrgId],
      })

    if (error) throw error
  }
}

// ─── Carregar orgs de produtores ──────────────────────────

export async function loadProducerOrgs(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name')
    .neq('id', '00000000-0000-0000-0000-000000000001')
    .order('name')

  if (error) {
    console.error(error)
    return []
  }

  return data || []
}

// ─── Conversões ───────────────────────────────────────────

function rowToOp(row: any): any {
  return {
    id: row.id,
    organizationId: row.organization_id,
    createdBy: row.created_by || '',
    title: row.title || '',
    organization: row.organization_name || '',
    organizationName: row.organization_name || '',
    type: row.type || 'open_call',
    country: row.country || '',
    countryName: row.country_name || '',
    city: row.city || '',
    disciplines: row.disciplines || [],
    keywords: row.keywords || [],
    deadline: row.deadline || '',
    openingDate: row.opening_date || '',
    recurrence: row.recurrence || 'anual',
    usualOpeningMonth: row.usual_opening_month,
    usualDeadlineMonth: row.usual_deadline_month,
    recurrenceNotes: row.recurrence_notes || '',
    summary: row.summary || '',
    description: row.description || '',
    link: row.link || '',
    coversCosts: Boolean(row.covers_costs),
    isPrivate: Boolean(row.is_private),
    status: row.status || 'open',
    source: row.source || 'supabase',
    notes: row.notes || '',
    assignedArtistId: row.assigned_artist_id || '',
    assignedArtistName: row.assigned_artist_name || '',
    sharedWith: row.shared_with || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    _fromSupabase: true,
  }
}

function opToRow(op: any, organizationId: string, currentUserId: string | null): any {
  return {
    id: op.id,
    organization_id: organizationId,
    created_by: op.createdBy || op.created_by || currentUserId,
    title: op.title || '',
    organization_name: op.organization || op.organizationName || '',
    type: op.type || 'open_call',
    country: op.country || null,
    country_name: op.countryName || op.country || null,
    city: op.city || null,
    disciplines: op.disciplines || [],
    keywords: op.keywords || [],
    deadline: op.deadline || null,
    opening_date: op.openingDate || null,
    recurrence: op.recurrence || 'anual',
    usual_opening_month: op.usualOpeningMonth || null,
    usual_deadline_month: op.usualDeadlineMonth || null,
    recurrence_notes: op.recurrenceNotes || null,
    summary: op.summary || null,
    description: op.description || null,
    link: op.link || null,
    covers_costs: Boolean(op.coversCosts),
    is_private: Boolean(op.isPrivate),
    status: op.status || 'open',
    source: op.source || 'manual',
    notes: op.notes || null,
    assigned_artist_id: op.assignedArtistId || null,
    assigned_artist_name: op.assignedArtistName || null,
    shared_with: op.sharedWith || [],
    updated_at: new Date().toISOString(),
  }
}