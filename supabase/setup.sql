-- ============================================================
-- SOMA ODÉ — Setup Supabase (correr no SQL Editor do Supabase)
-- https://whfkiutqcvytecycwamh.supabase.co → SQL Editor → New Query
-- ============================================================

-- 1. Perfis de utilizadores (estende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'artista' CHECK (role IN ('artista', 'produtor', 'admin')),
  organization TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Perfis artísticos (respostas + perfil gerado pela IA)
CREATE TABLE IF NOT EXISTS public.artist_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Respostas às 4 perguntas
  answer_identity TEXT,
  answer_audience TEXT,
  answer_power TEXT,
  answer_direction TEXT,
  -- Perfil gerado
  summary TEXT,
  disciplines TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  themes TEXT[] DEFAULT '{}',
  target_countries TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  audience_profile TEXT,
  power_map TEXT,
  positioning_advice TEXT,
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Rede de contactos (artistas↔produtores)
CREATE TABLE IF NOT EXISTS public.network_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  contact_type TEXT NOT NULL DEFAULT 'outro' CHECK (contact_type IN ('artista', 'produtor', 'venue', 'outro')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Contactos de booking (pipeline CRM)
CREATE TABLE IF NOT EXISTS public.booking_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  venue_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  country TEXT,
  status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'contacted', 'replied', 'negotiating', 'confirmed', 'rejected')),
  notes TEXT,
  opportunity_id TEXT, -- referência à oportunidade do Radar
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Oportunidades guardadas/favoritas
CREATE TABLE IF NOT EXISTS public.saved_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  opportunity_key TEXT NOT NULL, -- chave da oportunidade no Radar
  notes TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, opportunity_key)
);

-- ============================================================
-- TRIGGER: criar perfil automaticamente ao registar
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'artista')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apagar trigger se já existir e recriar
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS (Row Level Security) — cada pessoa vê só os seus dados
-- ============================================================

-- Profiles: ver o próprio, admin vê todos
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Artist profiles
ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own artist profile" ON public.artist_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all artist profiles" ON public.artist_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Network contacts
ALTER TABLE public.network_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own network" ON public.network_contacts
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all network" ON public.network_contacts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Booking contacts
ALTER TABLE public.booking_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own bookings" ON public.booking_contacts
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all bookings" ON public.booking_contacts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Saved opportunities
ALTER TABLE public.saved_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved opps" ON public.saved_opportunities
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all saved opps" ON public.saved_opportunities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_artist_profiles_user ON public.artist_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_network_contacts_owner ON public.network_contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_booking_contacts_owner ON public.booking_contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_saved_opportunities_user ON public.saved_opportunities(user_id);

-- ============================================================
-- DONE! A plataforma está pronta.
-- ============================================================
