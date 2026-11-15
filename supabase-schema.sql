-- ============================================================================
-- SOMA ODÉ — Schema Supabase Completo
-- Executa no SQL Editor do Supabase (https://supabase.com/dashboard)
-- Ordem: extensões → tabelas → RLS → storage → triggers
-- ============================================================================

-- ── 0. Extensões ─────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ══════════════════════════════════════════════════════════════════════════
-- 1. PROFILES (fonte segura de role — ligada ao auth.users)
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (role IN ('pending','artista','produtor','admin')),
  organization_id UUID,
  full_name     TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cada user vê/edita o próprio perfil
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger: cria perfil automaticamente ao criar user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'pending'),
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    now(), now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ══════════════════════════════════════════════════════════════════════════
-- 2. ORGANIZATIONS (produtoras / associações)
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS organizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID REFERENCES auth.users(id),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE,
  plan            TEXT DEFAULT 'free',

  legal_name      TEXT,
  nif             TEXT,
  phone           TEXT,
  instagram       TEXT,
  website         TEXT,

  address         TEXT,
  zip_code        TEXT,
  city            TEXT,
  country         TEXT,

  bio             TEXT,
  disciplines     TEXT[] DEFAULT '{}',
  target_countries TEXT[] DEFAULT '{}',

  iban            TEXT,
  bank_name       TEXT,
  payment_method  TEXT,
  currency        TEXT DEFAULT 'EUR',

  portfolio_link  TEXT,
  presskit_link   TEXT,

  cartografia     JSONB DEFAULT '{}',

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgs_select_all" ON organizations
  FOR SELECT USING (true);

CREATE POLICY "orgs_insert_own" ON organizations
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "orgs_update_own" ON organizations
  FOR UPDATE USING (auth.uid() = owner_id);


-- ══════════════════════════════════════════════════════════════════════════
-- 3. ARTISTS (perfis de artistas — colunas + payload JSONB)
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS artists (
  id                TEXT PRIMARY KEY,
  user_id           UUID REFERENCES auth.users(id),

  -- 01 · Identidade
  artistic_name     TEXT NOT NULL DEFAULT '',
  legal_name        TEXT,
  pronouns          TEXT,
  email             TEXT,
  phone             TEXT,
  instagram         TEXT,
  website           TEXT,
  video_link        TEXT,
  drive_link        TEXT,

  -- 02 · Localização
  origin_country    TEXT,
  base_city         TEXT,
  residence_country TEXT,

  -- 03 · Perfil artístico
  disciplines       TEXT[] DEFAULT '{}',
  specialties       TEXT[] DEFAULT '{}',
  languages         TEXT[] DEFAULT '{}',
  keywords          TEXT[] DEFAULT '{}',
  themes            TEXT[] DEFAULT '{}',
  genres            TEXT[] DEFAULT '{}',
  bio               TEXT,

  -- 04 · Países-alvo
  target_countries  TEXT[] DEFAULT '{}',

  -- 05 · Mobilidade (JSONB)
  mobility          JSONB DEFAULT '{}',

  -- 06 · Materiais disponíveis (JSONB — booleans: bioPT, bioEN, pressKit, etc.)
  materials         JSONB DEFAULT '{}',

  -- 07 · Projetos (JSONB array — inclui dossierText e campos extraídos do PDF)
  projects          JSONB DEFAULT '[]',

  -- 08 · Materiais Parseados (JSONB array — EPK, Clipping, Dossier parseados)
  parsed_materials  JSONB DEFAULT '[]',

  -- 09 · CRM interno (JSONB)
  crm               JSONB DEFAULT '{}',

  -- 10 · Cartografia SOMA (JSONB)
  cartografia       JSONB DEFAULT '{}',

  -- Meta
  active            BOOLEAN DEFAULT true,
  drive_folder_id   TEXT,

  -- Payload completo (backup/fallback)
  payload           JSONB DEFAULT '{}',

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

-- Admin vê todos; artista vê só o próprio
CREATE POLICY "artists_select" ON artists
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'produtor'
    )
  );

CREATE POLICY "artists_insert" ON artists
  FOR INSERT WITH CHECK (true);

CREATE POLICY "artists_update" ON artists
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "artists_delete" ON artists
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ══════════════════════════════════════════════════════════════════════════
-- 4. OPPORTUNITIES (editais, festivais, residências)
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS opportunities (
  id                    TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  organization_id       UUID REFERENCES organizations(id),
  created_by            UUID REFERENCES auth.users(id),

  title                 TEXT NOT NULL DEFAULT '',
  organization_name     TEXT,
  type                  TEXT DEFAULT 'open_call',
  status                TEXT DEFAULT 'open',
  source                TEXT DEFAULT 'manual',

  country               TEXT,
  country_name          TEXT,
  city                  TEXT,

  disciplines           TEXT[] DEFAULT '{}',
  keywords              TEXT[] DEFAULT '{}',

  deadline              TEXT,
  opening_date          TEXT,
  recurrence            TEXT DEFAULT 'anual',
  usual_opening_month   INT,
  usual_deadline_month  INT,
  recurrence_notes      TEXT,

  summary               TEXT,
  description           TEXT,
  link                  TEXT,
  notes                 TEXT,

  covers_costs          BOOLEAN DEFAULT false,
  is_private            BOOLEAN DEFAULT false,

  assigned_artist_id    TEXT,
  assigned_artist_name  TEXT,

  shared_with           UUID[] DEFAULT '{}',

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opps_select" ON opportunities
  FOR SELECT USING (
    NOT is_private
    OR created_by = auth.uid()
    OR organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
    OR auth.uid()::uuid = ANY(shared_with)
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "opps_insert" ON opportunities
  FOR INSERT WITH CHECK (true);

CREATE POLICY "opps_update" ON opportunities
  FOR UPDATE USING (
    created_by = auth.uid()
    OR organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "opps_delete" ON opportunities
  FOR DELETE USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ══════════════════════════════════════════════════════════════════════════
-- 5. PROJECTS (projetos de produtor — espetáculos, turnês, etc.)
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS projects (
  id                TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  organization_id   UUID REFERENCES organizations(id),
  name              TEXT NOT NULL DEFAULT '',
  description       TEXT,
  status            TEXT DEFAULT 'rascunho',
  type              TEXT DEFAULT 'show',

  artist_ids        TEXT[] DEFAULT '{}',
  artists_external  JSONB DEFAULT '[]',

  dates             JSONB DEFAULT '{}',
  budget            JSONB DEFAULT '{}',
  logistics         JSONB DEFAULT '{}',
  communication     JSONB DEFAULT '{}',
  cartografia       JSONB DEFAULT '{}',

  notes             TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ══════════════════════════════════════════════════════════════════════════
-- 6. CONTRACTS (contratos entre produtor e artista)
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS contracts (
  id                TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  organization_id   UUID REFERENCES organizations(id),
  artist_id         TEXT REFERENCES artists(id),
  project_id        TEXT,

  type              TEXT DEFAULT 'booking',
  status            TEXT DEFAULT 'rascunho',

  fee               NUMERIC,
  currency          TEXT DEFAULT 'EUR',
  payment_terms     TEXT,

  start_date        TEXT,
  end_date          TEXT,

  terms             TEXT,
  notes             TEXT,

  drive_folder_id   TEXT,

  payload           JSONB DEFAULT '{}',

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_select" ON contracts
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "contracts_insert" ON contracts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "contracts_update" ON contracts
  FOR UPDATE USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ══════════════════════════════════════════════════════════════════════════
-- 7. EVENTS (eventos — festas, showcases, etc.)
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS events (
  id                TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  organization_id   UUID REFERENCES organizations(id),
  name              TEXT NOT NULL DEFAULT '',
  type              TEXT DEFAULT 'festa',

  event_date        TEXT,
  start_time        TEXT,
  end_time          TEXT,

  venue_name        TEXT,
  venue_address     TEXT,
  venue_city        TEXT DEFAULT 'Barcelona',
  venue_country     TEXT DEFAULT 'España',
  venue_capacity    INT,
  venue_contact     TEXT,
  venue_instagram   TEXT,

  artist_ids        TEXT[] DEFAULT '{}',
  team              JSONB DEFAULT '[]',
  budget            JSONB DEFAULT '{}',
  audience          JSONB DEFAULT '{}',
  communication     JSONB DEFAULT '{}',

  status            TEXT DEFAULT 'ideia',
  notes             TEXT,
  post_event_notes  TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select" ON events
  FOR SELECT USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "events_insert" ON events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "events_update" ON events
  FOR UPDATE USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "events_delete" ON events
  FOR DELETE USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ══════════════════════════════════════════════════════════════════════════
-- 8. PIPELINE_ITEMS (CRM — contactos e follow-ups)
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pipeline_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title               TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT 'lead',
  origin              TEXT DEFAULT 'manual',

  contact_id          TEXT,
  contact_name        TEXT,
  organization        TEXT,
  email               TEXT,
  phone               TEXT,

  artist_id           TEXT,
  artist_name         TEXT,

  opportunity_id      TEXT,
  opportunity_title   TEXT,

  priority            TEXT DEFAULT 'media',
  deadline            TEXT,
  notes               TEXT,

  payload             JSONB DEFAULT '{}',

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE pipeline_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_select" ON pipeline_items
  FOR SELECT USING (true);

CREATE POLICY "pipeline_insert" ON pipeline_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "pipeline_update" ON pipeline_items
  FOR UPDATE USING (true);

CREATE POLICY "pipeline_delete" ON pipeline_items
  FOR DELETE USING (true);


-- ══════════════════════════════════════════════════════════════════════════
-- 9. ARTIST_PROPOSALS (propostas de oportunidade enviadas a artistas)
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS artist_proposals (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id                 TEXT NOT NULL,
  producer_id               UUID REFERENCES auth.users(id),
  producer_name             TEXT,

  opportunity_id            TEXT,
  opportunity_title         TEXT NOT NULL DEFAULT '',
  opportunity_organization  TEXT,
  opportunity_country       TEXT,
  opportunity_deadline      TEXT,
  opportunity_link          TEXT,

  status                    TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','accepted','declined','expired')),
  producer_notes            TEXT,
  artist_response           TEXT,
  artist_responded_at       TIMESTAMPTZ,

  payload                   JSONB DEFAULT '{}',

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE artist_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_select" ON artist_proposals
  FOR SELECT USING (true);

CREATE POLICY "proposals_insert" ON artist_proposals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "proposals_update" ON artist_proposals
  FOR UPDATE USING (true);

CREATE POLICY "proposals_delete" ON artist_proposals
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ══════════════════════════════════════════════════════════════════════════
-- 10. NOTIFICATIONS (alertas internos)
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        TEXT NOT NULL DEFAULT 'info',
  title       TEXT NOT NULL DEFAULT '',
  body        TEXT,
  metadata    JSONB DEFAULT '{}',
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select" ON notifications
  FOR SELECT USING (true);

CREATE POLICY "notif_insert" ON notifications
  FOR INSERT WITH CHECK (true);


-- ══════════════════════════════════════════════════════════════════════════
-- 11. STORAGE BUCKET (dossiers PDF)
-- ══════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('dossiers', 'dossiers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "dossiers_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'dossiers');

CREATE POLICY "dossiers_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'dossiers');

CREATE POLICY "dossiers_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'dossiers');


-- ══════════════════════════════════════════════════════════════════════════
-- 12. ÍNDICES (performance)
-- ══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_artists_user_id ON artists(user_id);
CREATE INDEX IF NOT EXISTS idx_artists_active ON artists(active);
CREATE INDEX IF NOT EXISTS idx_opps_org ON opportunities(organization_id);
CREATE INDEX IF NOT EXISTS idx_opps_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opps_deadline ON opportunities(deadline);
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_org ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_contracts_org ON contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_status ON pipeline_items(status);
CREATE INDEX IF NOT EXISTS idx_proposals_artist ON artist_proposals(artist_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON artist_proposals(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);


-- ══════════════════════════════════════════════════════════════════════════
-- 13. SE JÁ TENS AS TABELAS — SQLs PARA ADICIONAR COLUNAS NOVAS
--     (executa só se receberes erros de "column does not exist")
-- ══════════════════════════════════════════════════════════════════════════

-- Coluna parsed_materials (nova — para materiais parseados EPK/Clipping/Dossier)
ALTER TABLE artists ADD COLUMN IF NOT EXISTS parsed_materials JSONB DEFAULT '[]';

-- Colunas de recorrência nas oportunidades
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'anual';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS usual_opening_month INT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS usual_deadline_month INT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS recurrence_notes TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS summary TEXT;

-- Colunas de partilha
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS shared_with UUID[] DEFAULT '{}';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS assigned_artist_id TEXT;
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS assigned_artist_name TEXT;

-- Coluna payload nos artists (backup completo)
ALTER TABLE artists ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}';

-- Coluna drive_folder_id nos artists
ALTER TABLE artists ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;

-- Cartografia e campos extra na organização
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS cartografia JSONB DEFAULT '{}';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS portfolio_link TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS presskit_link TEXT;


-- ══════════════════════════════════════════════════════════════════════════
-- FIM
-- ══════════════════════════════════════════════════════════════════════════
