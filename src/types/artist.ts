// src/types/artist.ts
// SOMA ODÉ — Artist type completo com Google Drive

export type Project = {
  id: string
  name: string
  format?: string
  duration?: string
  coversCosts?: boolean
  videoLink?: string
  summary?: string
  technicalNeeds?: string
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

export type Artist = {
  id: string
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

  cartografia?: any
  internal?: any

  createdAt?: string
  updatedAt?: string
}

export function emptyArtist(): Omit<Artist, 'id'> {
  return {
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

    cartografia: {},
    internal: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function materialsCount(materials: ArtistMaterials = {}) {
  const keys: (keyof ArtistMaterials)[] = [
    'bioPT',
    'bioEN',
    'bioES',
    'bioCA',
    'pressPhoto',
    'videoPresentation',
    'technicalRider',
    'pressKit',
    'pressClippings',
  ]

  const done = keys.filter(k => Boolean(materials[k])).length

  return {
    done,
    total: keys.length,
  }
}