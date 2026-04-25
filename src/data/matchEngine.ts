// src/data/matchEngine.ts
// SOMA ODÉ — Motor de matching v4 integrado
// (Claude · 2026-04-22 · integração baseada em v4 da conversa paralela)
//
// Mudanças face à v3:
//
// 1. DISCIPLINA é BLOQUEADOR. Sem overlap → edital não aparece.
// 2. isGlobal NÃO é passe-livre. Global só pontua na camada 4 com peso baixo.
// 3. PROXIMIDADE em 4 camadas: local(≤50km) → regional → país-alvo → global.
// 4. CUSTOS granulares (coverage travel/accommodation/meals/production/fee).
// 5. CAPACITY: número de pessoas suportadas vs tamanho do grupo.
// 6. STATUS: closed/archived = bloqueador.
//
// Ajustes face ao v4 da conversa paralela (decidido com o utilizador):
//
// A. Artista com canTravel=false em edital fora do país → WARNING FORTE,
//    não bloqueador. A situação "não pode viajar" é frequentemente
//    temporária; o humano decide se age ou arquiva.
// B. Capacity não declarada → score 0, sem penalização (antes: 50% do peso),
//    para não pontuar artificialmente editais com dados incompletos.
// C. Peso de country reduzido mais (era 10, agora 5) porque proximity já
//    absorve a dimensão geográfica principal. Country serve só para
//    confirmar alinhamento nominal.

import type { Artist } from '../types/artist';
import type {
  Opportunity,
  MatchBreakdown,
  MatchResult,
  ScoredOpportunity,
  RequirementKey,
  CoverageDetails,
} from '../types/opportunity';

// ─── Pesos (somam 100) ───────────────────────────────────────────────────────

const WEIGHTS = {
  disciplines: 20,   // pré-requisito bloqueador, mas ainda pesa quando passa
  proximity: 22,     // NOVO — cidade vs regional vs alvo vs global
  country: 5,        // reduzido (ajuste C) — proximity absorve a maior parte
  language: 10,
  costs: 15,         // reflete restrição financeira real
  capacity: 8,       // NOVO — número de pessoas suportadas
  affinity: 15,      // aumentado — é o valor curatorial da SOMA
  materials: 5,
} as const;

const MAX_SCORE = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

// ─── Sinónimos ───────────────────────────────────────────────────────────────

const SYNONYM_GROUPS: string[][] = [
  ['diaspora', 'afro-diaspora', 'afrodiaspora', 'afrodiasporico', 'afrodescendencia', 'afrodescendente'],
  ['queer', 'lgbtqia', 'lgbt', 'lgbtq', 'nao-binario', 'transgenero', 'trans'],
  ['decolonial', 'descolonial', 'pos-colonial', 'poscolonial', 'anti-colonial'],
  ['negro', 'preto', 'afro', 'afro-brasileiro', 'afrobrasileiro', 'black'],
  ['experimental', 'pesquisa', 'investigacao', 'research'],
  ['corpo', 'corporeo', 'corporal', 'body'],
  ['ritual', 'sagrado', 'espiritual', 'ancestral'],
  ['comunitario', 'comunidade', 'coletivo', 'colectivo'],
  ['som', 'sonoro', 'audio', 'sound'],
  ['danca', 'dance', 'movimento'],
  ['performance', 'performatico', 'performativo'],
  ['migrante', 'migracao', 'migration', 'immigrant', 'imigrante'],
  ['politica', 'activismo', 'ativismo', 'activist'],
  ['feminino', 'feminista', 'mulher', 'mulheres', 'women'],
  ['tecnologia', 'digital', 'tech', 'technology'],
  ['funk', 'brega-funk', 'funk-carioca', 'bregafunk'],
  ['afrobeats', 'afropop', 'afrohouse', 'afro-house'],
  ['hip-hop', 'hiphop', 'rap'],
  ['electronic', 'electronica', 'eletronica', 'club'],
];

const SYNONYM_INDEX: Map<string, string> = (() => {
  const idx = new Map<string, string>();
  for (const group of SYNONYM_GROUPS) {
    const canonical = group[0];
    for (const term of group) idx.set(term, canonical);
  }
  return idx;
})();

// ─── Normalização ────────────────────────────────────────────────────────────

function norm(s: string | undefined | null): string {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function canon(term: string): string {
  const n = norm(term);
  return SYNONYM_INDEX.get(n) ?? n;
}

function canonList(list: string[] | undefined): string[] {
  return (list ?? []).map(canon).filter(Boolean);
}

function hasOverlap(a: string[] | undefined, b: string[] | undefined): boolean {
  const A = canonList(a);
  const B = canonList(b);
  if (A.length === 0 || B.length === 0) return false;
  const setB = new Set(B);
  return A.some((x) => setB.has(x));
}

function sharedTerms(a: string[] | undefined, b: string[] | undefined): string[] {
  const A = new Set(canonList(a));
  const B = canonList(b);
  return Array.from(new Set(B.filter((t) => A.has(t))));
}

// ─── Geografia: Haversine ────────────────────────────────────────────────────

function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Cidades conhecidas — expandir conforme artistas/editais novos
const CITY_COORDS: Record<string, [number, number, string]> = {
  barcelona:          [41.3874,  2.1686,  'Catalunya'],
  madrid:             [40.4168, -3.7038,  'Madrid'],
  lisboa:             [38.7169, -9.1399,  'Lisboa'],
  porto:              [41.1579, -8.6291,  'Norte'],
  paris:              [48.8566,  2.3522,  'Île-de-France'],
  marseille:          [43.2965,  5.3698,  'PACA'],
  toulouse:           [43.6047,  1.4442,  'Occitanie'],
  berlin:             [52.5200, 13.4050,  'Berlin'],
  berlim:             [52.5200, 13.4050,  'Berlin'],
  london:             [51.5074, -0.1278,  'Greater London'],
  bruxelas:           [50.8503,  4.3517,  'Bruxelles'],
  brussels:           [50.8503,  4.3517,  'Bruxelles'],
  amsterdam:          [52.3676,  4.9041,  'Noord-Holland'],
  amesterdao:         [52.3676,  4.9041,  'Noord-Holland'],
  linz:               [48.3069, 14.2858,  'Oberösterreich'],
  'buenos aires':     [-34.6037, -58.3816, 'CABA'],
  austin:             [30.2672, -97.7431, 'Texas'],
  dakar:              [14.7167, -17.4677, 'Dakar'],
  'sao paulo':        [-23.5505, -46.6333, 'Sudeste'],
  'rio de janeiro':   [-22.9068, -43.1729, 'Sudeste'],
  salvador:           [-12.9714, -38.5014, 'Nordeste'],
  recife:             [-8.0476, -34.8770,  'Nordeste'],
  zurich:             [47.3769,  8.5417,  'Zürich'],
  zurique:            [47.3769,  8.5417,  'Zürich'],
};

function cityKey(city: string | undefined): string {
  return norm(city).replace(/[^a-z\s]/g, '');
}

function artistCoords(artist: Artist): { lat: number; lng: number; region?: string } | null {
  const key = cityKey(artist.base);
  if (CITY_COORDS[key]) {
    const [lat, lng, region] = CITY_COORDS[key];
    return { lat, lng, region };
  }
  return null;
}

function oppCoords(opp: Opportunity): { lat: number; lng: number } | null {
  if (typeof opp.latitude === 'number' && typeof opp.longitude === 'number') {
    return { lat: opp.latitude, lng: opp.longitude };
  }
  const key = cityKey(opp.city);
  if (CITY_COORDS[key]) {
    const [lat, lng] = CITY_COORDS[key];
    return { lat, lng };
  }
  return null;
}

// ─── Camadas de proximidade ──────────────────────────────────────────────────

type ProximityLayer = 'local' | 'regional' | 'target' | 'global' | 'none';

interface ProximityScore {
  layer: ProximityLayer;
  points: number;
  label: string;
}

const REGIONAL_NEIGHBORS: Record<string, string[]> = {
  ES: ['PT', 'FR', 'AD'],
  PT: ['ES'],
  FR: ['ES', 'BE', 'DE', 'IT', 'CH'],
  DE: ['FR', 'BE', 'NL', 'AT', 'PL', 'CZ', 'CH'],
  BE: ['FR', 'DE', 'NL'],
  NL: ['BE', 'DE'],
  AT: ['DE', 'CH', 'IT', 'CZ'],
  CH: ['FR', 'DE', 'IT', 'AT'],
  BR: ['AR', 'UY', 'PY', 'BO'],
  AR: ['BR', 'UY', 'PY', 'CL', 'BO'],
};

function computeProximity(artist: Artist, opp: Opportunity): ProximityScore {
  const artistResidence = norm(artist.residenceCountry).toUpperCase();
  const oppCountry = norm(opp.country).toUpperCase();
  const artistTargets = canonList(artist.targetCountries).map((c) => c.toUpperCase());

  // Camada 1: local (cidade+50km) — requer coordenadas de ambos
  const aCoords = artistCoords(artist);
  const oCoords = oppCoords(opp);
  if (aCoords && oCoords) {
    const distance = haversineKm(aCoords.lat, aCoords.lng, oCoords.lat, oCoords.lng);
    if (distance <= 50) {
      return {
        layer: 'local',
        points: WEIGHTS.proximity,
        label: `Local (${Math.round(distance)}km de ${artist.base})`,
      };
    }
    if (distance <= 300 && artistResidence === oppCountry) {
      return {
        layer: 'regional',
        points: Math.round(WEIGHTS.proximity * 0.8),
        label: `Regional (${Math.round(distance)}km)`,
      };
    }
  }

  // Camada 2: regional — mesmo país OU país vizinho
  if (oppCountry && artistResidence === oppCountry) {
    return {
      layer: 'regional',
      points: Math.round(WEIGHTS.proximity * 0.75),
      label: `Regional (${opp.countryName})`,
    };
  }
  const neighbors = REGIONAL_NEIGHBORS[artistResidence] ?? [];
  if (neighbors.includes(oppCountry)) {
    return {
      layer: 'regional',
      points: Math.round(WEIGHTS.proximity * 0.65),
      label: `Vizinho (${opp.countryName})`,
    };
  }

  // Camada 3: país-alvo declarado
  if (artistTargets.includes(oppCountry)) {
    return {
      layer: 'target',
      points: Math.round(WEIGHTS.proximity * 0.5),
      label: `País-alvo (${opp.countryName})`,
    };
  }

  // Camada 4: global — só se isGlobal explícito
  if (opp.isGlobal) {
    return {
      layer: 'global',
      points: Math.round(WEIGHTS.proximity * 0.2),
      label: 'Global',
    };
  }

  return { layer: 'none', points: 0, label: 'Fora do escopo geográfico' };
}

// ─── Custos: avaliação granular ──────────────────────────────────────────────

interface CostsEval {
  sufficient: boolean;
  score: number;
  summary: string;
  isHardProblem: boolean;
}

function evaluateCosts(artist: Artist, opp: Opportunity): CostsEval {
  const cov: CoverageDetails = opp.coverage ?? {};
  const parts: string[] = [];
  let score = 0;

  if (cov.travel) { score += 4; parts.push('viagem'); }
  if (cov.accommodation) { score += 4; parts.push('hospedagem'); }
  if (cov.meals) { score += 2; parts.push('alimentação'); }
  if (cov.production) { score += 2; parts.push('produção'); }
  if (cov.fee) { score += 3; parts.push('cachê'); }

  if (score === 0 && opp.coversCosts) {
    score = 8;
    parts.push('cobre custos');
  }

  if (opp.feeOffered && opp.feeOffered > 0) {
    if (!cov.fee) { score += 3; parts.push(`€${opp.feeOffered}`); }
  }

  score = Math.min(score, WEIGHTS.costs);

  const artistMin = artist.minFee ?? 0;
  if (artistMin > 0 && opp.feeOffered && opp.feeOffered < artistMin) {
    return {
      sufficient: false,
      score: Math.max(0, score - 5),
      summary: `cachê €${opp.feeOffered} abaixo do mínimo (€${artistMin})`,
      isHardProblem: true,
    };
  }

  if (!opp.coversCosts && !cov.travel && !cov.accommodation && !opp.feeOffered) {
    return {
      sufficient: false,
      score: 0,
      summary: 'sem suporte financeiro declarado',
      isHardProblem: true,
    };
  }

  const sufficient = score >= 8;
  return {
    sufficient,
    score,
    summary: parts.length ? parts.join(' · ') : 'parcial',
    isHardProblem: false,
  };
}

// ─── Capacity ────────────────────────────────────────────────────────────────

interface CapacityEval {
  ok: boolean;
  score: number;
  note?: string;
}

function groupSize(artist: Artist): number {
  // Heurística: lê o campo `format` dos projectos
  const formats = (artist.projects ?? [])
    .map((p) => norm(p.format))
    .filter(Boolean);
  for (const f of formats) {
    if (/\bsolo\b/.test(f)) return 1;
    if (/\bduo\b/.test(f)) return 2;
    if (/\btrio\b/.test(f)) return 3;
    if (/\bquart[eé]to\b/.test(f)) return 4;
    if (/\bbanda\b/.test(f)) return 4;
  }
  return 1;
}

function evaluateCapacity(artist: Artist, opp: Opportunity): CapacityEval {
  const needed = groupSize(artist);
  const supported = opp.peopleSupported;

  // Ajuste B: não declarado → neutro (0 pontos, sem penalização)
  if (typeof supported !== 'number') {
    return { ok: true, score: 0 };
  }

  if (supported >= needed) {
    return {
      ok: true,
      score: WEIGHTS.capacity,
      note: `suporta ${supported} pessoa${supported > 1 ? 's' : ''}`,
    };
  }

  return {
    ok: false,
    score: 0,
    note: `edital suporta ${supported}, artista precisa de ${needed}`,
  };
}

// ─── Requirements ────────────────────────────────────────────────────────────

function artistLangsWithBio(artist: Artist): string[] {
  const m = artist.materials;
  const langs: string[] = [];
  if (m.bioPT) langs.push('pt');
  if (m.bioEN) langs.push('en');
  if (m.bioES) langs.push('es');
  if (m.bioCA) langs.push('ca');
  return langs;
}

function checkRequirements(
  artist: Artist,
  requirements: RequirementKey[] | undefined,
): { ok: boolean; missing: string[] } {
  if (!requirements || requirements.length === 0) {
    return { ok: true, missing: [] };
  }
  const missing: string[] = [];
  const m = artist.materials;
  for (const req of requirements) {
    switch (req) {
      case 'bio':
        if (!(m.bioPT || m.bioEN || m.bioES || m.bioCA) && !artist.bio) missing.push('bio');
        break;
      case 'pressPhoto':
        if (!m.pressPhoto) missing.push('foto de imprensa');
        break;
      case 'videoPresentation':
        if (!m.videoPresentation) missing.push('vídeo de apresentação');
        break;
      case 'technicalRider':
        if (!m.technicalRider) missing.push('rider técnico');
        break;
      case 'pressKit':
        if (!m.pressKit) missing.push('press kit');
        break;
      case 'pressClippings':
        if (!m.pressClippings) missing.push('press clippings');
        break;
      case 'motivationLetter':
        missing.push('carta de motivação');
        break;
      case 'projectDescription':
        if (!artist.projects?.some((p) => p.summary?.trim())) missing.push('descrição de projecto');
        break;
    }
  }
  return { ok: missing.length === 0, missing };
}

// ─── Afinidade ───────────────────────────────────────────────────────────────

function buildArtistAffinity(artist: Artist): string[] {
  const vocab = artist.cartografia?.raiz?.vocabulario ?? [];
  return [
    ...(artist.keywords ?? []),
    ...(artist.themes ?? []),
    ...(artist.genres ?? []),
    ...(artist.specialties ?? []),
    ...vocab,
    ...(artist.culturalRoots ?? []),
    ...(artist.diasporaAffiliations ?? []),
  ];
}

function buildOpportunityAffinity(opp: Opportunity): string[] {
  const descWords = (opp.description ?? '').split(/\s+/).filter((w) => w.length > 4);
  return [
    ...(opp.keywords ?? []),
    ...(opp.themes ?? []),
    ...(opp.genres ?? []),
    ...descWords,
  ];
}

// ─── Função principal ────────────────────────────────────────────────────────

export function getMatchScore(artist: Artist, opp: Opportunity): MatchResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const blockers: string[] = [];

  // ═══ BLOQUEADORES ═══

  // 1. Disciplina
  const disciplinesMatch = hasOverlap(artist.disciplines, opp.disciplines);
  if (!disciplinesMatch) {
    blockers.push(
      `Disciplina incompatível (edital: ${opp.disciplines.join(', ') || '—'})`,
    );
  } else {
    reasons.push('Disciplina alinhada');
  }

  // 2. Status
  if (opp.status === 'closed' || opp.status === 'archived') {
    blockers.push('Edital fechado');
  }

  // 3. Deadline passada (excepto rolling)
  const daysToDeadline = daysUntil(opp.deadline);
  const isRolling = opp.status === 'rolling';
  if (!isRolling && daysToDeadline !== null && daysToDeadline < 0) {
    blockers.push('Deadline já passou');
  }

  // 4. Passaporte UE
  if (opp.requiresEUPassport && !artist.mobility?.hasEUPassport) {
    blockers.push('Edital exige passaporte UE — artista não tem');
  }

  // Ajuste A: canTravel=false em país diferente → WARNING forte, não bloqueador
  const mob = artist.mobility;
  const sameCountry = norm(opp.country) === norm(artist.residenceCountry);
  if (mob?.canTravel === false && !sameCountry) {
    warnings.push('⚠️ Artista marcou indisponível para viajar — rever antes de candidatar');
  }

  // Short-circuit em bloqueadores
  if (blockers.length > 0) {
    return {
      percentage: 0,
      breakdown: {
        disciplines: disciplinesMatch,
        country: false,
        language: false,
        costs: false,
        affinity: false,
        mobility: false,
        materials: false,
        proximity: 'none',
        capacity: false,
      },
      reasons,
      warnings,
      blockers,
    };
  }

  // ═══ SCORES ═══

  // — Proximidade
  const prox = computeProximity(artist, opp);
  if (prox.layer !== 'none') {
    reasons.push(prox.label);
  } else {
    warnings.push('Fora do escopo geográfico do artista');
  }

  // — País (complementar, peso baixo)
  const artistCountries = canonList(artist.targetCountries).map((c) => c.toUpperCase());
  const oppCountry = norm(opp.country).toUpperCase();
  const countryMatch =
    prox.layer === 'local' ||
    prox.layer === 'regional' ||
    artistCountries.includes(oppCountry);

  // — Idioma
  const languageMatch = hasOverlap(artist.languages, opp.languages);
  if (languageMatch) {
    reasons.push('Idioma compatível');
  } else if (opp.languages && opp.languages.length > 0) {
    warnings.push(`Sem idioma comum (edital: ${opp.languages.join('/')})`);
  }

  // — Materiais por idioma obrigatório
  if (opp.requiredLanguages && opp.requiredLanguages.length > 0) {
    const covered = artistLangsWithBio(artist);
    const missingLangs = opp.requiredLanguages
      .map(norm)
      .filter((lang) => !covered.includes(lang));
    if (missingLangs.length > 0) {
      warnings.push(`Precisa de bio em ${missingLangs.join('/').toUpperCase()}`);
    }
  }

  // — Materiais (requirements)
  const reqCheck = checkRequirements(artist, opp.requirements);
  if (opp.requirements && opp.requirements.length > 0) {
    if (reqCheck.ok) {
      reasons.push('Materiais completos');
    } else {
      warnings.push(`Faltam: ${reqCheck.missing.join(', ')}`);
    }
  }

  // — Custos
  const costs = evaluateCosts(artist, opp);
  if (costs.sufficient) {
    reasons.push(`Suporte: ${costs.summary}`);
  } else if (costs.isHardProblem) {
    warnings.push(`Custos: ${costs.summary}`);
  } else if (costs.summary !== 'parcial') {
    warnings.push(`Suporte parcial: ${costs.summary}`);
  }

  // — Capacity
  const cap = evaluateCapacity(artist, opp);
  if (!cap.ok && cap.note) {
    warnings.push(cap.note);
  } else if (cap.note) {
    reasons.push(cap.note);
  }

  // — Afinidade
  const artistAffinity = buildArtistAffinity(artist);
  const oppAffinity = buildOpportunityAffinity(opp);
  const affinityMatch = hasOverlap(artistAffinity, oppAffinity);
  if (affinityMatch) {
    const shared = sharedTerms(artistAffinity, oppAffinity);
    if (shared.length > 0) {
      reasons.push(`Afinidade: ${shared.slice(0, 3).join(', ')}`);
    }
  }

  // — Deadline próxima
  if (!isRolling && daysToDeadline !== null && daysToDeadline >= 0 && daysToDeadline < 14) {
    warnings.push(`⏰ Deadline em ${daysToDeadline} dias`);
  }

  // ═══ SOMA ═══

  const breakdown: MatchBreakdown = {
    disciplines: disciplinesMatch,
    country: countryMatch,
    language: languageMatch,
    costs: costs.sufficient,
    affinity: affinityMatch,
    mobility: true,
    materials: reqCheck.ok,
    proximity: prox.layer,
    capacity: cap.ok,
  };

  let total = 0;
  if (breakdown.disciplines) total += WEIGHTS.disciplines;
  total += prox.points;
  if (breakdown.country) total += WEIGHTS.country;
  if (breakdown.language) total += WEIGHTS.language;
  total += costs.score;
  total += cap.score;
  if (breakdown.affinity) total += WEIGHTS.affinity;
  if (breakdown.materials) total += WEIGHTS.materials;

  const percentage = Math.min(100, Math.round((total / MAX_SCORE) * 100));

  return { percentage, breakdown, reasons, warnings, blockers };
}

// ─── Match global ordenado ───────────────────────────────────────────────────

export function runMatch(
  artist: Artist | null,
  opportunities: Opportunity[],
  options?: { hideBlocked?: boolean },
): ScoredOpportunity[] {
  if (!artist) return [];
  const hideBlocked = options?.hideBlocked ?? false;

  const scored = opportunities
    .map((opp) => ({ ...opp, match: getMatchScore(artist, opp) }));

  const filtered = hideBlocked
    ? scored.filter((s) => s.match.blockers.length === 0)
    : scored;

  return filtered.sort((a, b) => {
    if (a.match.blockers.length !== b.match.blockers.length) {
      return a.match.blockers.length - b.match.blockers.length;
    }
    return b.match.percentage - a.match.percentage;
  });
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function daysUntil(isoDate: string): number | null {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const ms = d.getTime() - now.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}