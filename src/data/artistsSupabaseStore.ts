// src/data/artistsSupabaseStore.ts
import { supabase } from '../lib/supabase'

export async function loadArtistsFromSupabase() {
  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao carregar artistas:', error)
    return []
  }

  return (data || []).map(row => row.payload).filter(Boolean)
}

export async function saveArtistToSupabase(artist: any) {
  const payload = artist

  const { error } = await supabase
    .from('artists')
    .upsert({
      id: artist.id,
      artistic_name: artist.name,
      legal_name: artist.legalName,
      email: artist.email,
      phone: artist.phone,
      instagram: artist.instagram,
      website: artist.website,
      origin_country: artist.origin,
      base_city: artist.base,
      residence_country: artist.residenceCountry,
      disciplines: artist.disciplines || [],
      languages: artist.languages || [],
      bio: artist.bio,
      keywords: artist.keywords || [],
      target_countries: artist.targetCountries || [],
      projects: artist.projects || [],
      materials_count: Object.entries(artist.materials || {}).filter(
        ([, v]) => typeof v === 'boolean' && v
      ).length,
      mobility: {
        canTravel: artist.canTravel,
        hasEUPassport: artist.hasEUPassport,
        passportCountry: artist.passportCountry,
        minFee: artist.minFee,
        availability: artist.availability,
        visaNeeds: artist.visaNeeds,
      },
      payload,
    })

  if (error) {
    console.error('Erro ao guardar artista:', error)
    throw error
  }
}

export async function deleteArtistFromSupabase(id: string) {
  const { error } = await supabase.from('artists').delete().eq('id', id)

  if (error) {
    console.error('Erro ao apagar artista:', error)
    throw error
  }
}