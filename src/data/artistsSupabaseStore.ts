// src/data/artistsSupabaseStore.ts
// SOMA ODÉ — Store Supabase para Artist completo (9 secções + Portal do Artista)

import { supabase } from '../lib/supabase'
import type { Artist } from '../types/artist'
import { emptyArtist } from '../types/artist'

// ─── LOAD ─────────────────────────────────────────

export async function loadArtistsFromSupabase(): Promise<Artist[]> {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao carregar artistas:', error)
    return []
  }

  return (data || []).map(rowToArtist)
}

// ─── LOAD ARTIST BY USER ID ──────────────────────
// Usado pelo Portal do Artista: carrega só o artista ligado ao utilizador

export async function loadArtistByUserId(userId: string): Promise<Artist | null> {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('Erro ao carregar artista por user_id:', error)
    return null
  }

  if (!data) return null
  return rowToArtist(data)
}

// ─── SAVE (insert ou update) ──────────────────────

export async function saveArtistToSupabase(artist: Artist) {
  const row = artistToRow(artist)

  const { error } = await supabase
    .from('artists')
    .upsert(row, { onConflict: 'id' })

  if (error) {
    console.error('ERRO REAL SUPABASE:', error)
    throw error
  }
}

// ─── DELETE ───────────────────────────────────────

export async function deleteArtistFromSupabase(id: string) {
  const { error } = await supabase
    .from('artists')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao apagar artista:', error)
    throw error
  }
}

// ─── Conversões ───────────────────────────────────

function artistToRow(a: Artist): any {
  return {
    id: a.id,
    user_id: a.userId || null,

    // 01 · Identidade
    artistic_name: a.name || a.artisticName || '',
    legal_name: a.legalName || null,
    pronouns: a.pronouns || null,
    email: a.email || null,
    phone: a.phone || null,
    instagram: a.instagram || null,
    website: a.website || null,
    video_link: a.videoLink || null,
    drive_link: a.driveLink || null,

    // 02 · Localização
    origin_country: a.origin || null,
    base_city: a.base || null,
    residence_country: a.residenceCountry || null,

    // 03 · Perfil
    disciplines: a.disciplines || [],
    specialties: a.specialties || [],
    languages: a.languages || [],
    keywords: a.keywords || [],
    themes: a.themes || [],
    genres: a.genres || [],
    bio: a.bio || null,

    // 04 · Países
    target_countries: a.targetCountries || [],

    // 05 · Mobilidade (jsonb)
    mobility: a.mobility || {},

    // 06 · Materiais (jsonb)
    materials: a.materials || {},

    // 07 · Projectos (jsonb)
    projects: a.projects || [],

    // 08 · CRM Interno (jsonb) — mapeado de internal
    crm: a.internal || {},

    // 09 · Cartografia SOMA (jsonb)
    cartografia: a.cartografia || {},

    // Meta
    active: a.active !== false,
    updated_at: new Date().toISOString(),

    // Backup completo
    payload: a,
  }
}

function rowToArtist(row: any): Artist {
  // Se houver payload completo, usa-o como base
  if (row.payload && typeof row.payload === 'object') {
    return {
      ...emptyArtist(),
      ...row.payload,
      id: row.id,
      userId: row.user_id,
      name: row.artistic_name || row.payload.name || '',
      cartografia: row.cartografia || row.payload.cartografia || {},
      materials: row.materials || row.payload.materials || {},
      mobility: row.mobility || row.payload.mobility || {},
      projects: row.projects || row.payload.projects || [],
      internal: row.crm || row.payload.internal || {},
      updatedAt: row.updated_at || row.payload.updatedAt,
    }
  }

  // Senão, reconstrói de colunas
  return {
    ...emptyArtist(),
    id: row.id,
    userId: row.user_id,
    name: row.artistic_name || '',
    legalName: row.legal_name || '',
    pronouns: row.pronouns || '',
    email: row.email || '',
    phone: row.phone || '',
    instagram: row.instagram || '',
    website: row.website || '',
    videoLink: row.video_link || '',
    driveLink: row.drive_link || '',

    origin: row.origin_country || '',
    base: row.base_city || '',
    residenceCountry: row.residence_country || '',
    targetCountries: row.target_countries || [],

    disciplines: row.disciplines || [],
    specialties: row.specialties || [],
    languages: row.languages || [],
    keywords: row.keywords || [],
    themes: row.themes || [],
    genres: row.genres || [],
    bio: row.bio || '',

    mobility: row.mobility || {},
    materials: row.materials || {},
    projects: row.projects || [],
    internal: row.crm || {},
    cartografia: row.cartografia || {},

    active: row.active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}