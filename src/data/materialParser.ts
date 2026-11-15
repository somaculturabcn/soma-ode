// src/data/materialParser.ts
// SOMA ODÉ — Parser de materiais (EPK, Clipping, Dossier)
// Extrai dados estruturados de texto bruto para enriquecer perfil do artista

import type { ParsedMaterial, MaterialSource } from '../types/artist'

// ── Listas de referência ──────────────────────────────────────────────────

const KNOWN_FESTIVALS = [
  'primavera sound', 'sonar', 'nuits sonores', 'le guess who', 'sxsw',
  'womex', 'transmusicales', 'eurosonic', 'roskilde', 'sziget',
  'montreux jazz', 'north sea jazz', 'jazz à vienne', 'glastonbury',
  'lollapalooza', 'rock in rio', 'coachella', 'tomorrowland',
  'afropunk', 'bom dia boa música', 'mimo', 'sesc', 'ccbb',
  'virada cultural', 'sesc pompeia', 'itaú cultural', 'casa de francisca',
  'music box', 'vk brussels', 'cinetol', 'paradiso', 'melkweg',
  'bimhuis', 'café oto', 'village underground', 'barbican',
  'philharmonie', 'berghain', 'kantine am berghain', 'festsaal kreuzberg',
  'festa da música', 'noites de verão', 'out.fest', 'tremor',
  'nos alive', 'super bock super rock', 'boom festival',
  'mutek', 'jazz em agosto', 'casa da música', 'coliseu',
  'bozar', 'ancienne belgique', 'ab', 'botanique', 'beursschouwburg',
  'melt festival', 'fusion festival', 'dekmantel', 'pitch festival',
  'worldwide festival', 'dimensions', 'outlook', 'les nuits botanique',
  'couleur café', 'gent jazz', 'dour festival',
  'batida', 'noite branca', 'festa do avante', 'fnac live',
  'fête de la musique', 'we love green', 'pitchfork music festival',
  'electric castle', 'exit festival', 'lowlands', 'best kept secret',
  'down the rabbit hole', 'into the great wide open',
  'c/o pop', 'reeperbahn', 'jazzahead', 'babel med', 'visa for music',
  'womad', 'sauti za busara', 'nyege nyege', 'lake of stars',
  'fest angers', 'les suds à arles', 'africolor', 'banlieues bleues',
]

const KNOWN_PRESS = [
  'folha de s.paulo', 'folha de são paulo', 'folha', 'estadão', 'o globo',
  'billboard', 'pitchfork', 'the wire', 'resident advisor', 'ra',
  'mixmag', 'dj mag', 'fader', 'crack magazine', 'the quietus',
  'noize', 'rolling stone', 'vice', 'i-d', 'dazed', 'paper',
  'the guardian', 'nyt', 'new york times', 'le monde', 'libération',
  'el país', 'la vanguardia', 'telerama', 'les inrocks', 'trax',
  'tsugi', 'fip', 'radio france', 'france inter', 'france culture',
  'bbc radio', 'bbc 6 music', 'nts', 'rinse', 'worldwide fm',
  'gilles peterson', 'boiler room', 'kexp', 'kcrw', 'soho radio',
  'sounds and colours', 'afropop worldwide', 'bandcamp daily',
  'stereogum', 'consequence of sound', 'música instantânea',
  'volume morto', 'soundx', 'hits perdidos', 'tenho mais discos',
  'screamyell', 'monkeybuzz', 'popload', 'revista trip', 'trip',
  'bravo', 'mtv', 'multishow', 'canal brasil',
  'rfi', 'rádio 3', 'antena 3', 'flur', 'mondo sonoro',
]

const COUNTRY_PATTERNS: Record<string, string[]> = {
  'BR': ['brasil', 'brazil', 'são paulo', 'rio de janeiro', 'salvador', 'recife', 'belo horizonte', 'brasília', 'curitiba', 'porto alegre', 'belém', 'fortaleza'],
  'ES': ['espanha', 'spain', 'españa', 'barcelona', 'madrid', 'zaragoza', 'sevilla', 'valencia', 'bilbao', 'málaga', 'granada'],
  'FR': ['frança', 'france', 'paris', 'lyon', 'marseille', 'toulouse', 'bordeaux', 'nantes', 'lille', 'strasbourg'],
  'PT': ['portugal', 'lisboa', 'lisbon', 'porto', 'coimbra', 'faro'],
  'NL': ['holanda', 'netherlands', 'países baixos', 'amsterdam', 'rotterdam', 'utrecht', 'haia', 'the hague'],
  'BE': ['bélgica', 'belgium', 'bruxelas', 'brussels', 'gent', 'ghent', 'antwerp', 'antuérpia', 'liège'],
  'DE': ['alemanha', 'germany', 'berlin', 'berlim', 'hamburg', 'hamburgo', 'munich', 'münchen', 'colônia', 'cologne', 'köln', 'frankfurt'],
  'UK': ['reino unido', 'uk', 'england', 'inglaterra', 'london', 'londres', 'manchester', 'birmingham', 'bristol', 'glasgow', 'edinburgh'],
  'IT': ['itália', 'italy', 'italia', 'roma', 'rome', 'milão', 'milan', 'napoli', 'torino', 'bologna', 'firenze'],
  'US': ['eua', 'usa', 'estados unidos', 'united states', 'new york', 'los angeles', 'chicago', 'austin', 'brooklyn'],
  'JP': ['japão', 'japan', 'tokyo', 'tóquio', 'osaka', 'kyoto'],
  'MX': ['méxico', 'mexico', 'cidade do méxico', 'mexico city', 'guadalajara', 'oaxaca'],
  'AR': ['argentina', 'buenos aires'],
  'CO': ['colômbia', 'colombia', 'bogotá', 'medellín'],
  'CL': ['chile', 'santiago'],
  'CH': ['suíça', 'switzerland', 'zurique', 'zurich', 'genebra', 'geneva', 'montreux'],
  'AT': ['áustria', 'austria', 'viena', 'vienna', 'wien'],
  'SE': ['suécia', 'sweden', 'estocolmo', 'stockholm', 'malmö'],
  'DK': ['dinamarca', 'denmark', 'copenhagen', 'copenhaga'],
  'NO': ['noruega', 'norway', 'oslo', 'bergen'],
  'MA': ['marrocos', 'morocco', 'rabat', 'casablanca', 'marrakech'],
  'SN': ['senegal', 'dakar'],
  'CV': ['cabo verde', 'cape verde'],
  'AO': ['angola', 'luanda'],
  'MZ': ['moçambique', 'mozambique', 'maputo'],
}

const GENRE_PATTERNS = [
  'afrobeat', 'afrobeats', 'afro-brasileir', 'afro-pop', 'afropop',
  'mpb', 'samba', 'bossa nova', 'forró', 'maracatu', 'coco', 'frevo',
  'baião', 'pagode', 'axé', 'manguebeat', 'tecnobrega', 'brega',
  'funk carioca', 'funk brasileiro', 'trap', 'rap', 'hip hop', 'hip-hop',
  'r&b', 'soul', 'jazz', 'free jazz', 'jazz fusion', 'nu jazz',
  'electronic', 'eletrônic', 'techno', 'house', 'deep house', 'drum and bass',
  'jungle', 'bass music', 'dub', 'dubstep', 'reggae', 'dancehall',
  'kuduro', 'kizomba', 'semba', 'funaná', 'tarraxinha', 'batida',
  'cumbia', 'reggaeton', 'latin', 'bolero', 'son',
  'experimental', 'noise', 'ambient', 'drone', 'field recording',
  'world music', 'folk', 'singer-songwriter', 'canção', 'nova canção',
  'performance', 'arte sonora', 'sound art', 'spoken word',
  'punk', 'post-punk', 'rock', 'indie', 'pop', 'new wave',
  'flamenco', 'fado', 'música popular', 'tropicália', 'tropicalia',
  'candomblé', 'capoeira', 'ijexá', 'jongo', 'tambor de crioula',
]

// ── Funções de extração ───────────────────────────────────────────────────

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function extractFestivals(text: string): string[] {
  const lower = normalize(text)
  const found = new Set<string>()

  for (const fest of KNOWN_FESTIVALS) {
    if (lower.includes(normalize(fest))) {
      // Capitalize nicely
      found.add(fest.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '))
    }
  }

  // Also look for patterns like "Festival de X", "Fest X", etc.
  const festPatterns = text.match(/(?:festival|fest|feira|mostra|bienal|encontro)\s+(?:de\s+)?[A-ZÀÁÂÃÉÈÊÍÓÔÕÚÇ][\w\sÀ-ÿ]{2,30}/gi) || []
  for (const match of festPatterns) {
    const clean = match.trim()
    if (clean.length > 8 && clean.length < 50) {
      found.add(clean)
    }
  }

  return [...found].slice(0, 50)
}

function extractPress(text: string): string[] {
  const lower = normalize(text)
  const found = new Set<string>()

  for (const press of KNOWN_PRESS) {
    if (lower.includes(normalize(press))) {
      found.add(press.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '))
    }
  }

  return [...found].slice(0, 50)
}

function extractCountries(text: string): { countries: string[], cities: string[] } {
  const lower = normalize(text)
  const countries = new Set<string>()
  const cities = new Set<string>()

  for (const [code, patterns] of Object.entries(COUNTRY_PATTERNS)) {
    for (const p of patterns) {
      if (lower.includes(normalize(p))) {
        countries.add(code)
        // If it's a city (not the first pattern which is the country name)
        if (patterns.indexOf(p) > 0) {
          cities.add(p.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '))
        }
      }
    }
  }

  return {
    countries: [...countries].sort(),
    cities: [...cities].slice(0, 30),
  }
}

function extractGenres(text: string): string[] {
  const lower = normalize(text)
  const found = new Set<string>()

  for (const genre of GENRE_PATTERNS) {
    if (lower.includes(normalize(genre))) {
      found.add(genre)
    }
  }

  return [...found].slice(0, 20)
}

function extractSocialLinks(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s<>"',)}\]]+/gi
  const socialDomains = ['instagram', 'facebook', 'twitter', 'x.com', 'tiktok', 'youtube', 'spotify', 'bandcamp', 'soundcloud', 'linkedin', 'linktr.ee']

  const urls = text.match(urlPattern) || []
  return urls
    .filter(url => socialDomains.some(d => url.toLowerCase().includes(d)))
    .slice(0, 20)
}

function extractCollaborators(text: string): string[] {
  // Look for patterns: "feat.", "ft.", "com", "produção:", "prod.", "curadoria"
  const patterns = [
    /(?:feat\.?|ft\.?|featuring)\s+([A-ZÀ-Ÿ][\w\sÀ-ÿ&]+?)(?:[,;.\n]|$)/gi,
    /(?:produção|producao|production|prod\.?)\s*[:\-]?\s*([A-ZÀ-Ÿ][\w\sÀ-ÿ&]+?)(?:[,;.\n]|$)/gi,
    /(?:curadoria|curated by|curador)\s*[:\-]?\s*([A-ZÀ-Ÿ][\w\sÀ-ÿ&]+?)(?:[,;.\n]|$)/gi,
    /(?:direção|direction|directed by)\s*[:\-]?\s*([A-ZÀ-Ÿ][\w\sÀ-ÿ&]+?)(?:[,;.\n]|$)/gi,
  ]

  const found = new Set<string>()
  for (const p of patterns) {
    let match
    while ((match = p.exec(text)) !== null) {
      const name = match[1].trim()
      if (name.length > 2 && name.length < 40) {
        found.add(name)
      }
    }
  }

  return [...found].slice(0, 20)
}

function extractLabels(text: string): string[] {
  const patterns = [
    /(?:selo|label|gravadora|editora|records?)\s*[:\-]?\s*([A-ZÀ-Ÿ][\w\sÀ-ÿ&]+?)(?:[,;.\n]|$)/gi,
    /(?:lançado|released|publicado)\s+(?:pel[oa]|by|via)\s+([A-ZÀ-Ÿ][\w\sÀ-ÿ&]+?)(?:[,;.\n]|$)/gi,
  ]

  const found = new Set<string>()
  for (const p of patterns) {
    let match
    while ((match = p.exec(text)) !== null) {
      const name = match[1].trim()
      if (name.length > 1 && name.length < 40) {
        found.add(name)
      }
    }
  }

  return [...found].slice(0, 10)
}

// ── Parser principal ──────────────────────────────────────────────────────

export function parseMaterialText(
  rawText: string,
  source: MaterialSource,
  fileName: string,
): ParsedMaterial {
  const { countries, cities } = extractCountries(rawText)

  return {
    id: 'mat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    source,
    fileName,
    uploadedAt: new Date().toISOString(),
    rawText,
    wordCount: rawText.split(/\s+/).filter(Boolean).length,
    festivalsPlayed: extractFestivals(rawText),
    pressOutlets: extractPress(rawText),
    countriesPerformed: countries,
    citiesPerformed: cities,
    collaborators: extractCollaborators(rawText),
    genres: extractGenres(rawText),
    labels: extractLabels(rawText),
    awards: [],  // TODO: pattern extraction
    highlights: [],
    socialLinks: extractSocialLinks(rawText),
  }
}

// ── Agregador: merge de todos os materiais do artista ─────────────────────

export function aggregateMaterials(materials: ParsedMaterial[]): {
  allFestivals: string[]
  allPress: string[]
  allCountries: string[]
  allCities: string[]
  allGenres: string[]
  allCollaborators: string[]
  allLabels: string[]
  allSocialLinks: string[]
  totalWords: number
} {
  const festivals = new Set<string>()
  const press = new Set<string>()
  const countries = new Set<string>()
  const cities = new Set<string>()
  const genres = new Set<string>()
  const collaborators = new Set<string>()
  const labels = new Set<string>()
  const social = new Set<string>()
  let totalWords = 0

  for (const m of materials) {
    totalWords += m.wordCount
    m.festivalsPlayed?.forEach(f => festivals.add(f))
    m.pressOutlets?.forEach(p => press.add(p))
    m.countriesPerformed?.forEach(c => countries.add(c))
    m.citiesPerformed?.forEach(c => cities.add(c))
    m.genres?.forEach(g => genres.add(g))
    m.collaborators?.forEach(c => collaborators.add(c))
    m.labels?.forEach(l => labels.add(l))
    m.socialLinks?.forEach(s => social.add(s))
  }

  return {
    allFestivals: [...festivals].sort(),
    allPress: [...press].sort(),
    allCountries: [...countries].sort(),
    allCities: [...cities].sort(),
    allGenres: [...genres].sort(),
    allCollaborators: [...collaborators].sort(),
    allLabels: [...labels].sort(),
    allSocialLinks: [...social],
    totalWords,
  }
}
