// src/types/artist.ts
// SOMA ODÉ — Artist type completo com Google Drive + Cartografia + Portal do Artista
// v2: Inclui legacyOfResistance, carePractices, ethicalAlliances, invisibleWorkNotes (Angela Davis)
// v3: Inclui dossierUrl, dossierText e campos extraídos do PDF (Supabase Storage + Gemini)

// ─── Sub-tipos ─────────────────────────────────────────────

export type Project = {
  id: string
  name: string
  format?: string
  duration?: string
  coversCosts?: boolean
  videoLink?: string
  summary?: string
  technicalNeeds?: string
  // Mini-Cartografia do Projeto
  projectTargetAudience?: string
  projectTerritories?: string
  projectKeywords?: string[]
  projectFormat?: string
  hasCirculated?: boolean
  circulationHistory?: string
  // Davis: Visibilização do Trabalho Invisível
  invisibleWorkNotes?: string
  driveLink?: string
  dossierLink?: string
  language?: string

  // ─── Dossier PDF (Supabase Storage) ──────────────────────
  dossierUrl?: string          // URL para descarregar o PDF original
  dossierFileName?: string     // nome do ficheiro: "PICUMÃ_ES.pdf"
  dossierUploadedAt?: string   // ISO timestamp do upload
  dossierWordCount?: number    // número de palavras extraídas

  // ─── Dados extraídos do PDF (para match contextual) ──────
  dossierText?: string         // texto completo extraído pelo Gemini
  methodology?: string         // metodologia descrita no dossier
  references?: string[]        // referências artísticas mencionadas
  communities?: string[]       // comunidades envolvidas (ballroom, trans, afro, etc.)
  highlights?: string          // aspectos únicos para candidaturas europeias
}

export type ArtistMaterials = {
  bioPT?: boolean
  bioEN?: boolean
  bioES?: boolean
  bioCA?: boolean
  pressPhoto?: boolean
  videoPresentation?: boolean
  technicalRider?: boolean
  pressKit?: boolean
  pressClippings?: boolean
  spotifyLink?: string
  bandcampLink?: string
  soundcloudLink?: string
  youtubeLink?: string
  tiktokHandle?: string
  driveBioPT?: string
  driveBioEN?: string
  drivePhotos?: string
  driveRider?: string
  drivePressKit?: string
}

export type ArtistMobility = {
  canTravel?: boolean
  hasEUPassport?: boolean
  hasEUBankAccount?: boolean
  hasBRBankAccount?: boolean
  passportCountry?: string
  visaNotes?: string
}

export type ArtistDrive = {
  folderUrl?: string
  bioUrl?: string
  photosUrl?: string
  videosUrl?: string
  riderUrl?: string
  dossierUrl?: string
  contractsUrl?: string
  pressUrl?: string
}

// ─── Cartografia SOMA ──────────────────────────────────────

export type CartografiaState = 'empty' | 'draft' | 'in_conversation' | 'validated'

export type CartografiaRaiz = {
  state?: CartografiaState
  origins?: string
  tensions?: string
  vocabulario?: string[]
  // Davis: Legado de Resistência
  legacyOfResistance?: string
  carePractices?: string
}

export type CartografiaCampo = {
  state?: CartografiaState
  audienceProfiles?: string
  motivation?: string
  audienceTerritories?: string[]
}

export type CartografiaTeia = {
  state?: CartografiaState
  pares?: string
  legitimacy?: string
  influenceNetworks?: string
  // Davis: Auditoria de Alianças Éticas
  ethicalAlliances?: string
}

export type CartografiaRota = {
  state?: CartografiaState
  gaps?: string
  corredores?: string[]
  expansionPlan?: string
}

export type Cartografia = {
  raiz?: CartografiaRaiz
  campo?: CartografiaCampo
  teia?: CartografiaTeia
  rota?: CartografiaRota
  somaPositioning?: string
}

// ─── Artist ────────────────────────────────────────────────

export type Artist = {
  id: string
  userId?: string

  name: string
  artisticName?: string
  legalName?: string
  pronouns?: string
  email?: string
  phone?: string
  instagram?: string
  website?: string
  videoLink?: string
  driveLink?: string

  origin?: string
  originCity?: string
  base?: string
  residenceCountry?: string
  targetCountries: string[]

  disciplines: string[]
  specialties: string[]
  languages: string[]
  keywords: string[]
  themes?: string[]
  genres?: string[]
  bio?: string

  materials: ArtistMaterials
  drive: ArtistDrive
  mobility: ArtistMobility
  projects: Project[]

  minFee?: number
  availability?: string
  active?: boolean

  cartografia?: Cartografia
  internal?: any

  createdAt?: string
  updatedAt?: string
}

// ─── Helpers ───────────────────────────────────────────────

export function emptyArtist(): Omit<Artist, 'id'> {
  return {
    userId: undefined,
    name: '',
    artisticName: '',
    legalName: '',
    pronouns: '',
    email: '',
    phone: '',
    instagram: '',
    website: '',
    videoLink: '',
    driveLink: '',

    origin: '',
    originCity: '',
    base: '',
    residenceCountry: '',
    targetCountries: [],

    disciplines: [],
    specialties: [],
    languages: [],
    keywords: [],
    themes: [],
    genres: [],
    bio: '',

    materials: {},
    drive: {},
    mobility: {
      canTravel: true,
      hasEUPassport: false,
    },
    projects: [],

    minFee: 0,
    availability: '',
    active: true,

    cartografia: {
      raiz: {
        state: 'empty',
        vocabulario: [],
        legacyOfResistance: '',
        carePractices: '',
      },
      campo: { state: 'empty', audienceTerritories: [] },
      teia: { state: 'empty', ethicalAlliances: '' },
      rota: { state: 'empty', corredores: [] },
    },
    internal: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function materialsCount(materials: ArtistMaterials = {}) {
  const keys: (keyof ArtistMaterials)[] = [
    'bioPT', 'bioEN', 'bioES', 'bioCA',
    'pressPhoto', 'videoPresentation',
    'technicalRider', 'pressKit', 'pressClippings',
  ]
  const done = keys.filter(k => Boolean(materials[k])).length
  return { done, total: keys.length }
}

export function cartografiaCount(c: Cartografia = {}): { filled: number; total: number } {
  let filled = 0
  const total = 17

  if (c.raiz?.origins) filled++
  if (c.raiz?.tensions) filled++
  if (c.raiz?.vocabulario && c.raiz.vocabulario.length > 0) filled++
  if (c.raiz?.legacyOfResistance) filled++
  if (c.raiz?.carePractices) filled++

  if (c.campo?.audienceProfiles) filled++
  if (c.campo?.motivation) filled++
  if (c.campo?.audienceTerritories && c.campo.audienceTerritories.length > 0) filled++

  if (c.teia?.pares) filled++
  if (c.teia?.legitimacy) filled++
  if (c.teia?.influenceNetworks) filled++
  if (c.teia?.ethicalAlliances) filled++

  if (c.rota?.gaps) filled++
  if (c.rota?.corredores && c.rota.corredores.length > 0) filled++
  if (c.rota?.expansionPlan) filled++

  if (c.somaPositioning) filled++

  return { filled, total }
}