// src/lib/supabase.ts
// SOMA ODÉ — Cliente Supabase (com fallback offline)

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const hasSupabase = !!(supabaseUrl && supabaseAnonKey)

// Cria cliente real se tem credenciais, senão cria um dummy que nunca conecta
export const supabase: SupabaseClient = hasSupabase
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder')
