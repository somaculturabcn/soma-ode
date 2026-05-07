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

    // 07 · Projectos (jsonb) — inclui dossierText e campos extraídos do PDF
    projects: a.projects || [],

    // 08 · CRM Interno (jsonb)
    crm: a.internal || {},

    // 09 · Cartografia SOMA (jsonb)
    cartografia: a.cartografia || {},

    // Meta
    active: a.active !== false,
    updated_at: new Date().toISOString(),

    // Backup completo (sempre actualizado)
    payload: a,
  }
}

function rowToArtist(row: any): Artist {
  // Merge colunas com payload — colunas têm sempre prioridade (mais recentes)
  // Excepção: projects e cartografia — a coluna é sempre mais recente que o payload
  const payload = (row.payload && typeof row.payload === 'object') ? row.payload : {}

  // Projects: a coluna `projects` é SEMPRE a fonte de verdade
  // (inclui dossierText, dossierUrl e todos os campos do PDF)
  const projects = mergeProjects(row.projects, payload.projects)

  return {
    ...emptyArtist(),
    ...payload,
    id: row.id,
    userId: row.user_id,
    name: row.artistic_name || payload.name || '',
    legalName: row.legal_name || payload.legalName || '',
    pronouns: row.pronouns || payload.pronouns || '',
    email: row.email || payload.email || '',
    phone: row.phone || payload.phone || '',
    instagram: row.instagram || payload.instagram || '',
    website: row.website || payload.website || '',
    videoLink: row.video_link || payload.videoLink || '',
    driveLink: row.drive_link || payload.driveLink || '',
    origin: row.origin_country || payload.origin || '',
    base: row.base_city || payload.base || '',
    residenceCountry: row.residence_country || payload.residenceCountry || '',
    targetCountries: row.target_countries || payload.targetCountries || [],
    disciplines: row.disciplines || payload.disciplines || [],
    specialties: row.specialties || payload.specialties || [],
    languages: row.languages || payload.languages || [],
    keywords: row.keywords || payload.keywords || [],
    themes: row.themes || payload.themes || [],
    genres: row.genres || payload.genres || [],
    bio: row.bio || payload.bio || '',
    mobility: row.mobility || payload.mobility || {},
    materials: row.materials || payload.materials || {},
    projects,
    internal: row.crm || payload.internal || {},
    cartografia: row.cartografia || payload.cartografia || {},
    active: row.active !== false,
    createdAt: row.created_at || payload.createdAt,
    updatedAt: row.updated_at || payload.updatedAt,
  }
}

// Merge de projects: usa a coluna como base e enriquece com campos do payload
// que possam estar em falta — garante que dossierText nunca se perde
function mergeProjects(colProjects: any[], payloadProjects: any[]): any[] {
  const col = Array.isArray(colProjects) ? colProjects : []
  const pay = Array.isArray(payloadProjects) ? payloadProjects : []

  if (!col.length) return pay
  if (!pay.length) return col

  // Para cada projecto na coluna, verifica se o payload tem campos extra
  return col.map(cp => {
    const pp = pay.find((p: any) => p.id === cp.id)
    if (!pp) return cp
    // A coluna tem prioridade, mas o payload pode ter campos que a coluna perdeu
    // (por ex. se o payload foi guardado mais tarde)
    return {
      ...pp,  // payload como base
      ...cp,  // coluna sobrepõe — tem os dados mais recentes
    }
  })
}