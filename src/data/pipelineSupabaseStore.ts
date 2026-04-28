// src/data/pipelineSupabaseStore.ts
// SOMA ODÉ — Store Supabase para Pipeline CRM

import { supabase } from '../lib/supabase'
import type { PipelineItem, PipelineStatus } from '../types/pipeline'

// ─── LOAD ─────────────────────────────────────────

export async function loadPipelineFromSupabase(): Promise<PipelineItem[]> {
  const { data, error } = await supabase
    .from('pipeline_items')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao carregar pipeline:', error)
    return []
  }

  return (data || []).map(rowToItem)
}

// ─── ADD ──────────────────────────────────────────

export async function addPipelineItemToSupabase(
  item: Omit<PipelineItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PipelineItem | null> {
  const now = new Date().toISOString()

  const newItem: PipelineItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }

  const row = itemToRow(newItem)

  const { error } = await supabase.from('pipeline_items').insert(row)

  if (error) {
    console.error('🔥 ERRO ao adicionar pipeline:', error)
    throw error
  }

  return newItem
}

// ─── UPDATE ───────────────────────────────────────

export async function updatePipelineItemInSupabase(updated: PipelineItem) {
  const row = itemToRow({
    ...updated,
    updatedAt: new Date().toISOString(),
  })

  const { error } = await supabase
    .from('pipeline_items')
    .update(row)
    .eq('id', updated.id)

  if (error) {
    console.error('🔥 ERRO ao actualizar pipeline:', error)
    throw error
  }
}

// ─── UPDATE STATUS ─────────────────────────────────

export async function updatePipelineStatusInSupabase(
  id: string,
  status: PipelineStatus
) {
  const { error } = await supabase
    .from('pipeline_items')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('🔥 ERRO ao mudar status:', error)
    throw error
  }
}

// ─── DELETE ───────────────────────────────────────

export async function deletePipelineItemFromSupabase(id: string) {
  const { error } = await supabase
    .from('pipeline_items')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('🔥 ERRO ao apagar pipeline:', error)
    throw error
  }
}

// ─── Conversões ───────────────────────────────────

function itemToRow(item: PipelineItem): any {
  return {
    id: item.id,
    title: item.title,
    status: item.status,
    origin: item.origin || 'manual',

    contact_id: item.contactId || null,
    contact_name: item.contactName || null,
    organization: item.organization || null,
    email: item.email || null,
    phone: item.phone || null,

    artist_id: item.artistId || null,
    artist_name: item.artistName || null,

    opportunity_id: item.opportunityId || null,
    opportunity_title: item.opportunityTitle || null,

    priority: item.priority || 'media',
    deadline: item.deadline || null,
    notes: item.notes || null,

    updated_at: item.updatedAt,
    payload: item,
  }
}

function rowToItem(row: any): PipelineItem {
  // Se houver payload completo, usa-o (tem tudo)
  if (row.payload && typeof row.payload === 'object') {
    return {
      ...row.payload,
      id: row.id,
      // Sobrescreve com colunas (mais frescas)
      status: row.status,
      title: row.title,
      updatedAt: row.updated_at,
    }
  }

  // Senão, reconstrói de colunas
  return {
    id: row.id,
    title: row.title,
    status: row.status as PipelineStatus,
    origin: row.origin || 'manual',

    contactId: row.contact_id,
    contactName: row.contact_name,
    organization: row.organization,
    email: row.email,
    phone: row.phone,

    artistId: row.artist_id,
    artistName: row.artist_name,

    opportunityId: row.opportunity_id,
    opportunityTitle: row.opportunity_title,

    priority: row.priority,
    deadline: row.deadline,
    notes: row.notes,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}