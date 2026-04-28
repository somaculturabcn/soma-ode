import { supabase } from '../lib/supabase'

// ─── LOAD ─────────────────────────────────────────

export async function loadArtistsFromSupabase() {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao carregar artistas:', error)
    return []
  }

  // devolvemos payload (perfil completo)
  return (data || []).map(row => row.payload).filter(Boolean)
}

// ─── SAVE ─────────────────────────────────────────

export async function saveArtistToSupabase(artist: any) {
  const { error } = await supabase.from('artists').upsert({
    id: artist.id,

    // campos simples
    artistic_name: artist.name,
    email: artist.email,
    base_city: artist.base,
    origin_country: artist.origin,
    bio: artist.bio,

    // arrays seguros
    disciplines: artist.disciplines || [],
    languages: artist.languages || [],
    keywords: artist.keywords || [],
    target_countries: artist.targetCountries || [],

    // JSONB
    projects: artist.projects || [],
    mobility: {
      canTravel: artist.canTravel || false,
      hasEUPassport: artist.hasEUPassport || false,
    },

    // 🔥 lo más importante
    payload: artist,
  })

  if (error) {
    console.error('🔥 ERRO REAL SUPABASE:', error)
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