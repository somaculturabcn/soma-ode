// src/data/eventsSupabaseStore.ts
// SOMA ODÉ — Store Supabase para Eventos

import { supabase } from '../lib/supabase'
import type { SomaEvent } from '../types/event'

// ─── Load ─────────────────────────────────────────────────

export async function loadEvents(organizationId: string): Promise<SomaEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('organization_id', organizationId)
    .order('event_date', { ascending: false })

  if (error) {
    console.error('Erro ao carregar eventos:', error)
    return []
  }
  return (data || []).map(rowToEvent)
}

// ─── Save (insert ou update) ──────────────────────────────

export async function saveEvent(event: SomaEvent): Promise<void> {
  const { error } = await supabase
    .from('events')
    .upsert(eventToRow(event), { onConflict: 'id' })
  if (error) throw error
}

// ─── Delete ───────────────────────────────────────────────

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Conversões ───────────────────────────────────────────

function rowToEvent(row: any): SomaEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name || '',
    type: row.type || 'festa',
    eventDate: row.event_date || '',
    startTime: row.start_time || '',
    endTime: row.end_time || '',
    venueName: row.venue_name || '',
    venueAddress: row.venue_address || '',
    venueCity: row.venue_city || 'Barcelona',
    venueCountry: row.venue_country || 'España',
    venueCapacity: row.venue_capacity,
    venueContact: row.venue_contact || '',
    venueInstagram: row.venue_instagram || '',
    artistIds: row.artist_ids || [],
    team: row.team || [],
    budget: row.budget || {},
    audience: row.audience || {},
    communication: row.communication || {},
    status: row.status || 'ideia',
    notes: row.notes || '',
    postEventNotes: row.post_event_notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function eventToRow(e: SomaEvent): any {
  return {
    id: e.id,
    organization_id: e.organizationId,
    name: e.name,
    type: e.type,
    event_date: e.eventDate || null,
    start_time: e.startTime || null,
    end_time: e.endTime || null,
    venue_name: e.venueName || null,
    venue_address: e.venueAddress || null,
    venue_city: e.venueCity || null,
    venue_country: e.venueCountry || null,
    venue_capacity: e.venueCapacity || null,
    venue_contact: e.venueContact || null,
    venue_instagram: e.venueInstagram || null,
    artist_ids: e.artistIds || [],
    team: e.team || [],
    budget: e.budget || {},
    audience: e.audience || {},
    communication: e.communication || {},
    status: e.status,
    notes: e.notes || null,
    post_event_notes: e.postEventNotes || null,
    updated_at: new Date().toISOString(),
  }
}