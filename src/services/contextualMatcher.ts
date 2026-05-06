// src/services/contextualMatcher.ts
// SOMA ODÉ — Match contextual artista × oportunidades
// Usa dossier completo + Cartografia para scoring real com IA
// Substitui o match por keywords por análise semântica profunda

const GEMINI_MODEL = 'gemini-2.5-flash'

// ─── Tipos ────────────────────────────────────────────────

export interface ContextualMatch {
  opportunityId: string
  score: number                // 0-100
  verdict: 'forte' | 'bom' | 'possivel' | 'fraco'
  mainReason: string           // razão principal em 1 frase específica
  strengths: string[]          // pontos fortes concretos
  challenges: string[]         // desafios ou pontos fracos honestos
  angle: string                // ângulo de candidatura — o que enfatizar
}

export interface MatchResults {
  artistName: string
  projectName: string
  projectId: string
  totalAnalyzed: number
  matches: ContextualMatch[]
  runAt: string
}

// ─── Construção do contexto do artista ───────────────────

function buildArtistContext(artist: any, project: any): string {
  const c = artist.cartografia || {}
  const raiz = c.raiz || {}
  const campo = c.campo || {}
  const teia = c.teia || {}
  const rota = c.rota || {}

  const lines: string[] = [
    `═══ ARTISTA ═══`,
    `Nome: ${artist.name || ''}`,
    artist.bio ? `Bio: ${artist.bio}` : '',
    artist.origin ? `Origem: ${artist.origin}` : '',
    artist.base ? `Base: ${artist.base}` : '',
    (artist.languages || []).length ? `Idiomas: ${(artist.languages || []).join(', ')}` : '',

    `\n═══ PROJECTO: ${project.name || ''} ═══`,
    project.projectFormat ? `Formato: ${project.projectFormat}` : '',
    project.summary ? `Resumo: ${project.summary}` : '',
    (project.projectKeywords || []).length ? `Keywords: ${(project.projectKeywords || []).join(', ')}` : '',
    project.duration ? `Duração: ${project.duration}` : '',
    project.methodology ? `Metodologia: ${project.methodology}` : '',
    project.communities?.length ? `Comunidades: ${project.communities.join(', ')}` : '',
    project.references?.length ? `Referências: ${project.references.join(', ')}` : '',
    project.technicalNeeds ? `Necessidades técnicas: ${project.technicalNeeds}` : '',
    project.highlights ? `Destaques: ${project.highlights}` : '',

    // Dossier text (most important context — truncated to fit token budget)
    project.dossierText
      ? `\n═══ DOSSIER COMPLETO (excerto) ═══\n${project.dossierText.substring(0, 2500)}`
      : '',

    `\n═══ CARTOGRAFIA SOMA ═══`,
    raiz.vocabulario?.length ? `Vocabulário: ${raiz.vocabulario.join(', ')}` : '',
    raiz.tensions ? `Tensões: ${raiz.tensions}` : '',
    raiz.legacyOfResistance ? `Legado de resistência: ${raiz.legacyOfResistance}` : '',
    raiz.communityCarePractices ? `Práticas de cuidado: ${raiz.communityCarePractices}` : '',
    campo.audienceProfiles ? `Públicos: ${campo.audienceProfiles}` : '',
    campo.audienceTerritories?.length ? `Territórios: ${campo.audienceTerritories.join(', ')}` : '',
    teia.pares ? `Pares artísticos: ${teia.pares}` : '',
    teia.influenceNetworks ? `Redes: ${teia.influenceNetworks}` : '',
    teia.ethicalAlliances ? `Alianças éticas: ${teia.ethicalAlliances}` : '',
    rota.corredores?.length ? `Corredores: ${rota.corredores.join(', ')}` : '',
    rota.gaps ? `Gaps: ${rota.gaps}` : '',
    c.somaPositioning ? `Posicionamento SOMA: ${c.somaPositioning}` : '',
  ]

  return lines.filter(Boolean).join('\n')
}

function buildOpportunitiesBlock(opportunities: any[]): string {
  return opportunities.map((op, i) => [
    `[${i + 1}] ID:${op.id}`,
    `Título: ${op.title}`,
    op.organization ? `Organização: ${op.organization}` : '',
    op.type ? `Tipo: ${op.type}` : '',
    `País: ${op.countryName || op.country || ''}`,
    op.city ? `Cidade: ${op.city}` : '',
    (op.disciplines || []).length ? `Disciplinas aceites: ${op.disciplines.join(', ')}` : '',
    (op.keywords || []).length ? `Keywords: ${op.keywords.join(', ')}` : '',
    `Cobre custos: ${op.coversCosts ? 'Sim' : 'Não'}`,
    op.deadline ? `Deadline: ${op.deadline}` : '',
    op.summary ? `Descrição: ${op.summary.substring(0, 300)}` : '',
  ].filter(Boolean).join('\n')).join('\n\n---\n\n')
}

// ─── Pre-filtragem inteligente ────────────────────────────
// Selecciona as 25 mais prometedoras antes de enviar à IA
// (economiza tokens e foca em candidatas reais)

function preFilter(opportunities: any[], artist: any, project: any): any[] {
  const artistCountries = [
    ...(artist.targetCountries || []),
    ...(artist.cartografia?.rota?.corredores || []),
  ].map((c: string) => c.toLowerCase())

  const projectKeywords = [
    ...(project.projectKeywords || []),
    ...(artist.cartografia?.raiz?.vocabulario || []),
    project.projectFormat || '',
  ].map((k: string) => k.toLowerCase())

  const scored = opportunities.map(op => {
    let preScore = 0
    const opText = [
      op.title, op.summary, op.organization,
      ...(op.disciplines || []), ...(op.keywords || []),
    ].join(' ').toLowerCase()

    const opCountry = (op.countryName || op.country || '').toLowerCase()
    if (artistCountries.some(c => opCountry.includes(c) || c.includes(opCountry))) preScore += 30

    const kwMatches = projectKeywords.filter(k => k.length > 3 && opText.includes(k))
    preScore += Math.min(40, kwMatches.length * 8)

    if (op.coversCosts) preScore += 10
    if (op.type === 'residencia' || op.type === 'residency') preScore += 10

    const days = op.deadline
      ? Math.ceil((new Date(op.deadline).getTime() - Date.now()) / 86400000)
      : null
    if (days !== null && days < 0) preScore -= 20

    return { op, preScore }
  })

  return scored
    .sort((a, b) => b.preScore - a.preScore)
    .slice(0, 25)
    .map(s => s.op)
}

// ─── Match principal ──────────────────────────────────────

export async function runContextualMatch(
  artist: any,
  project: any,
  opportunities: any[],
): Promise<MatchResults> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada no .env')
  if (!artist) throw new Error('Artista não encontrado')
  if (!project) throw new Error('Projecto não encontrado')
  if (!opportunities.length) throw new Error('Sem oportunidades na base para analisar')

  const filtered = preFilter(opportunities, artist, project)
  const artistContext = buildArtistContext(artist, project)
  const opBlock = buildOpportunitiesBlock(filtered)

  const hasDossier = Boolean(project.dossierText)

  const prompt = `És um curador especializado em arte contemporânea afro-diaspórica e gestor cultural da SOMA Cultura (Barcelona).
Trabalhas com artistas negros, migrantes e LGBTQIA+.

Analisa o encaixe real entre este perfil artístico e cada oportunidade listada.
${hasDossier ? 'O dossier completo do projecto está incluído — usa-o para uma análise profunda.' : 'Usa a Cartografia SOMA e os dados do projecto para inferir o encaixe.'}

Sê honesto e específico. Evita análises genéricas.
Score: 0-100 (encaixe real com ESTA oportunidade)
Verdict: "forte" (>75), "bom" (55-75), "possivel" (35-55), "fraco" (<35)

${artistContext}

═══════════════════════════════
OPORTUNIDADES PARA ANALISAR (${filtered.length}):
═══════════════════════════════
${opBlock}

Responde APENAS com JSON válido. Analisa TODAS as ${filtered.length} oportunidades:
{
  "matches": [
    {
      "opportunityId": "id exacto da oportunidade listada",
      "score": número 0-100,
      "verdict": "forte|bom|possivel|fraco",
      "mainReason": "razão principal em 1 frase curta e específica — menciona aspectos concretos do projecto e da oportunidade",
      "strengths": ["ponto forte concreto 1", "ponto forte concreto 2"],
      "challenges": ["desafio ou ponto fraco honesto"],
      "angle": "ângulo concreto de candidatura — o que enfatizar nesta candidatura específica"
    }
  ]
}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Gemini ${res.status}: ${err?.error?.message || 'erro desconhecido'}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  if (!text) throw new Error('Gemini não devolveu análise')

  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  const jsonMatch = clean.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Resposta sem JSON válido')

  const parsed = JSON.parse(jsonMatch[0])

  const matches: ContextualMatch[] = (parsed.matches || [])
    .filter((m: any) => m.opportunityId && typeof m.score === 'number')
    .sort((a: ContextualMatch, b: ContextualMatch) => b.score - a.score)

  return {
    artistName: artist.name || 'Artista',
    projectName: project.name || 'Projecto',
    projectId: project.id || '',
    totalAnalyzed: filtered.length,
    matches,
    runAt: new Date().toISOString(),
  }
}