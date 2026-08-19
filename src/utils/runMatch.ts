// src/utils/runMatch.ts
// SOMA ODÉ — Motor de matching com lógica de proximidade por anéis
// Anel 1: cidade base → Anel 2: país → Anel 3: região → Anel 4: global

import type { Artist } from '../types/artist'
import type { Opportunity, ScoredOpportunity, MatchResult, MatchBreakdown } from '../types/opportunity'

// ─── Normalização ───────────────────────────────────────────────────────────

export function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

// Mapas de países para regiões
const REGION_MAP: Record<string, string> = {
  // Europa
  ES: 'Europa', PT: 'Europa', FR: 'Europa', DE: 'Europa', IT: 'Europa',
  BE: 'Europa', NL: 'Europa', GB: 'Europa', SE: 'Europa', DK: 'Europa',
  NO: 'Europa', FI: 'Europa', AT: 'Europa', CH: 'Europa', PL: 'Europa',
  IE: 'Europa', CZ: 'Europa', IS: 'Europa', RS: 'Europa', BG: 'Europa',
  // Brasil
  BR: 'Brasil',
  // América Latina
  AR: 'América Latina', CO: 'América Latina', MX: 'América Latina',
  CL: 'América Latina', UY: 'América Latina', PE: 'América Latina',
  // EUA / Canada
  US: 'América do Norte', CA: 'América do Norte',
  // África
  UG: 'África', SN: 'África', ZA: 'África', CV: 'África', AO: 'África', MZ: 'África',
}

// Países considerados "Europa próxima" para Barcelona
const EUROPA_PROXIMA_BCN = ['ES', 'PT', 'FR', 'IT', 'BE', 'NL']
const EUROPA_NORDICA = ['SE', 'DK', 'NO', 'FI', 'IS', 'NL', 'DE', 'AT', 'CH', 'PL', 'CZ']

// ─── Anel de proximidade ─────────────────────────────────────────────────────

export function calcProximity(
  artistCity: string,
  artistCountry: string,
  oppCity: string,
  oppCountry: string,
  targetCountries: string[],
): MatchBreakdown['proximity'] {
  const aC = norm(artistCity)
  const aCtry = (artistCountry || '').toUpperCase()
  const oC = norm(oppCity)
  const oCtry = (oppCountry || '').toUpperCase()

  // Anel 1: mesma cidade
  if (aC && oC && aC === oC) return 'local'
  if (aCtry && oCtry && aCtry === oCtry) return 'regional'

  // Anel 3: países alvo do artista
  if (targetCountries.map(c => c.toUpperCase()).includes(oCtry)) return 'target'

  // Anel 4: global
  if (oCtry) return 'global'

  return 'none'
}

// Bonus de score por proximidade
export function proximityBonus(proximity: MatchBreakdown['proximity']): number {
  switch (proximity) {
    case 'local':    return 25  // Barcelona → Barcelona: máximo
    case 'regional': return 18  // Barcelona → Espanha
    case 'target':   return 10  // País alvo declarado
    case 'global':   return 0   // Fora dos targets
    case 'none':     return 0
    default:         return 0
  }
}

// ─── Custo estimado de touring ───────────────────────────────────────────────

export interface TourCost {
  voo: number          // custo estimado voo por pessoa (€)
  diaria: number       // diária hotel estimada (€)
  pessoas: number      // nº de pessoas no grupo
  diasEstimados: number
  totalEstimado: number
  moeda: string
  observacao: string
}

export function estimateTourCost(
  fromCountry: string,
  toCountry: string,
  toCity: string,
  groupSize: number,
  eventDays = 2,
): TourCost {
  const from = fromCountry.toUpperCase()
  const to = toCountry.toUpperCase()
  const pessoas = Math.max(groupSize || 1, 1)

  let voo = 0
  let diaria = 80
  let observacao = ''

  if (from === to) {
    // Mesmo país — deslocamento terrestre
    voo = 60
    diaria = 70
    observacao = 'Deslocamento interno — trem ou carro'
  } else if (EUROPA_PROXIMA_BCN.includes(to)) {
    // Europa próxima de Barcelona
    voo = 120
    diaria = 90
    observacao = 'Voo curto Europa'
  } else if (EUROPA_NORDICA.includes(to)) {
    // Norte da Europa
    voo = 220
    diaria = 110
    observacao = 'Voo médio — Norte da Europa'
  } else if (REGION_MAP[to] === 'Europa') {
    voo = 200
    diaria = 100
    observacao = 'Voo médio europeu'
  } else if (to === 'BR') {
    voo = 700
    diaria = 50
    observacao = 'Voo transatlântico — Brasil'
  } else if (REGION_MAP[to] === 'América Latina') {
    voo = 800
    diaria = 60
    observacao = 'Voo longo — América Latina'
  } else if (REGION_MAP[to] === 'América do Norte') {
    voo = 600
    diaria = 130
    observacao = 'Voo longo — América do Norte'
  } else {
    voo = 900
    diaria = 80
    observacao = 'Destino internacional — custo estimado'
  }

  const totalEstimado = (voo + diaria * eventDays) * pessoas

  return { voo, diaria, pessoas, diasEstimados: eventDays, totalEstimado, moeda: '€', observacao }
}

// ─── Core runMatch ────────────────────────────────────────────────────────────

export interface RunMatchOptions {
  hideBlocked?: boolean
  minScore?: number
  artistCity?: string    // cidade base do artista
  groupSize?: number     // tamanho do grupo/banda
}

export function runMatch(
  artist: Artist,
  opportunities: Opportunity[],
  options: RunMatchOptions = {},
): ScoredOpportunity[] {
  const { hideBlocked = false, minScore = 0 } = options

  // Dados base do artista
  const artistCity    = options.artistCity || (artist as any).city || ''
  const artistCountry = (artist as any).country || (artist.targetCountries?.[0]) || 'ES'
  const groupSize     = options.groupSize || 1

  const artistDisciplines = (artist.disciplines || []).map(norm)
  const artistTargets     = (artist.targetCountries || []).map(c => c.toUpperCase())
  const artistLangs       = (artist.languages || []).map(norm)
  const artistKeywords    = [
    ...(artist.keywords || []),
    ...(artist.themes || []),
    ...(artist.cartografia?.raiz?.vocabulario || []),
  ].map(norm)
  const artistMinFee      = (artist as any).minFee || (artist as any).cache_minimo || 0

  return opportunities
    .map(opp => {
      const reasons: string[]  = []
      const warnings: string[] = []
      const blockers: string[] = []
      let score = 0

      const bd: MatchBreakdown = {
        disciplines: false,
        country:     false,
        language:    false,
        costs:       false,
        affinity:    false,
        mobility:    false,
        materials:   false,
        proximity:   'none',
        capacity:    false,
      }

      // ── 1. DISCIPLINA (obrigatório) ────────────────────────────────────────
      const oppDiscs = (opp.disciplines || []).map(norm)
      if (oppDiscs.length === 0 || artistDisciplines.length === 0) {
        // sem info de disciplina — não bloqueia, mas não pontua
        bd.disciplines = true
        score += 5
      } else {
        const discMatch = artistDisciplines.some(d =>
          oppDiscs.some(od => od.includes(d) || d.includes(od))
        )
        if (discMatch) {
          bd.disciplines = true
          score += 20
          reasons.push('Disciplina compatível')
        } else {
          blockers.push(`Disciplina sem overlap (edital: ${opp.disciplines.join(', ')})`)
          if (hideBlocked) return null
        }
      }

      // ── 2. PROXIMIDADE (anéis) ─────────────────────────────────────────────
      const proximity = calcProximity(
        artistCity, artistCountry,
        opp.city || '', opp.country,
        artistTargets
      )
      bd.proximity = proximity
      const pBonus = proximityBonus(proximity)
      score += pBonus

      if (proximity === 'local') {
        reasons.push(`Na tua cidade (${opp.city})`)
        bd.country = true
      } else if (proximity === 'regional') {
        reasons.push(`No teu país (${opp.country})`)
        bd.country = true
      } else if (proximity === 'target') {
        reasons.push(`País alvo (${opp.country})`)
        bd.country = true
      } else {
        // País fora dos targets — avisa mas não bloqueia
        const region = REGION_MAP[opp.country.toUpperCase()] || opp.country
        warnings.push(`${region} não está nos países alvo`)
      }

      // ── 3. IDIOMA ────────────────────────────────────────────────────────
      const reqLangs = (opp.requiredLanguages || opp.languages || []).map(norm)
      if (reqLangs.length === 0) {
        bd.language = true
        score += 10
      } else {
        const langMatch = reqLangs.some(l => artistLangs.includes(l))
        if (langMatch) {
          bd.language = true
          score += 10
          reasons.push('Idioma compatível')
        } else {
          warnings.push(`Idioma do edital: ${opp.requiredLanguages?.join(', ')} — artista não tem`)
        }
      }

      // ── 4. CUSTOS / CACHÊ ──────────────────────────────────────────────────
      if (opp.coversCosts) {
        bd.costs = true
        score += 15
        reasons.push(`Cobre custos + cachê ${opp.feeOffered ? `€${opp.feeOffered}` : ''}`)

        // Verifica se o cachê está acima do mínimo
        if (opp.feeOffered && artistMinFee && opp.feeOffered >= artistMinFee) {
          score += 5
          reasons.push(`Cachê €${opp.feeOffered} acima do mínimo (€${artistMinFee})`)
        } else if (opp.feeOffered && artistMinFee && opp.feeOffered < artistMinFee) {
          warnings.push(`Cachê €${opp.feeOffered} abaixo do mínimo (€${artistMinFee})`)
        }
      } else {
        warnings.push('Não cobre custos — verificar funding')
      }

      // ── 5. AFINIDADE / VOCABULÁRIO ─────────────────────────────────────────
      const oppKeywords = [
        ...(opp.keywords || []),
        ...(opp.themes || []),
        ...(opp.genres || []),
        opp.title, opp.description || '',
      ].join(' ').split(/\s+/).map(norm).filter(w => w.length > 3)

      const affinityMatches = artistKeywords.filter(k =>
        k.length > 3 && oppKeywords.some(ok => ok.includes(k) || k.includes(ok))
      )

      if (affinityMatches.length > 0) {
        bd.affinity = true
        const affinityScore = Math.min(affinityMatches.length * 4, 16)
        score += affinityScore
        reasons.push(`Afinidade conceptual: ${affinityMatches.slice(0, 2).join(', ')}`)
      }

      // ── 6. MOBILIDADE ─────────────────────────────────────────────────────
      const needsEU = opp.requiresEUPassport
      const artistHasEU = (artist as any).euPassport || (artist as any).passaporte_ue || false

      if (needsEU && !artistHasEU) {
        bd.mobility = false
        blockers.push('Requer passaporte UE — artista não tem')
        score -= 20
        if (hideBlocked) return null
      } else {
        bd.mobility = true
      }

      // ── 7. CAPACIDADE DO GRUPO ─────────────────────────────────────────────
      const maxPeople = opp.peopleSupported || 99
      if (groupSize <= maxPeople) {
        bd.capacity = true
        if (groupSize > 1) reasons.push(`Suporta ${maxPeople} pessoas (grupo: ${groupSize})`)
      } else {
        bd.capacity = false
        warnings.push(`Edital suporta ${maxPeople} pessoa(s) — grupo tem ${groupSize}`)
        score -= 10
      }

      // ── 8. MATERIAIS ───────────────────────────────────────────────────────
      const reqMaterials = opp.requirements || []
      const artistMaterials = (artist as any).materiais || {}
      const missingMaterials = reqMaterials.filter(r => !artistMaterials[r])

      if (missingMaterials.length === 0 && reqMaterials.length > 0) {
        bd.materials = true
        score += 5
      } else if (missingMaterials.length > 0) {
        bd.materials = false
        const labels: Record<string, string> = {
          bio: 'bio', pressPhoto: 'foto de imprensa', videoPresentation: 'vídeo de apresentação',
          technicalRider: 'rider técnico', pressKit: 'press kit',
          motivationLetter: 'carta de motivação', projectDescription: 'descrição de projeto',
          pressClippings: 'clippings',
        }
        warnings.push(`Faltam materiais: ${missingMaterials.map(m => labels[m] || m).join(', ')}`)
      }

      // ── PRAZO ──────────────────────────────────────────────────────────────
      if (opp.deadline) {
        const dias = Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86400000)
        if (dias < 0) {
          blockers.push('Prazo expirado')
          if (hideBlocked) return null
          score -= 30
        } else if (dias <= 7) {
          warnings.push(`Prazo em ${dias} dia(s) — URGENTE`)
          score -= 5
        } else if (dias <= 30) {
          warnings.push(`Prazo em ${dias} dias`)
        }
      }

      // ── SCORE FINAL ────────────────────────────────────────────────────────
      const percentage = Math.max(0, Math.min(100, Math.round(score)))

      const match: MatchResult = { percentage, breakdown: bd, reasons, warnings, blockers }
      return { ...opp, match } as ScoredOpportunity
    })
    .filter((o): o is ScoredOpportunity => o !== null && o.match.percentage >= minScore)
    .sort((a, b) => b.match.percentage - a.match.percentage)
}