// src/services/contextualMatcher.ts
// SOMA ODÉ — Match contextual artista × oportunidades
// Usa campos estruturados do dossier (highlights, methodology, references, communities)
// quando dossierText está vazio — extracção robusta do PDF

const GEMINI_MODEL = 'gemini-2.5-flash'

// ─── Tipos ────────────────────────────────────────────────

export interface ContextualMatch {
  opportunityId: string
  score: number
  verdict: 'forte' | 'bom' | 'possivel' | 'fraco'
  mainReason: string
  strengths: string[]
  challenges: string[]
  angle: string
}

export interface MatchResults {
  artistName: string
  projectName: string
  projectId: string
  totalAnalyzed: number
  matches: ContextualMatch[]
  runAt: string
}

// ─── Contexto do artista ──────────────────────────────────

function buildArtistContext(artist: any, project: any): string {
  const c = artist.cartografia || {}
  const raiz = c.raiz || {}
  const campo = c.campo || {}
  const teia = c.teia || {}
  const rota = c.rota || {}

  // Usa dossierText se existir; senão usa campos estruturados extraídos do PDF
  const hasDossierText = project?.dossierText && project.dossierText.length > 50
  const hasStructuredData = project?.highlights || project?.methodology || project?.references?.length

  let dossierContext = ''
  if (hasDossierText) {
    dossierContext = `\nDOSSIER (excerto):\n${project.dossierText.substring(0, 2000)}`
  } else if (hasStructuredData) {
    const parts: string[] = []
    if (project.methodology) parts.push(`Metodologia: ${project.methodology}`)
    if (project.highlights) parts.push(`Destaques: ${project.highlights}`)
    if (Array.isArray(project.references) && project.references.length) {
      parts.push(`Referências: ${project.references.join(', ')}`)
    }
    if (Array.isArray(project.communities) && project.communities.length) {
      parts.push(`Comunidades: ${project.communities.join(', ')}`)
    }
    if (parts.length) {
      dossierContext = `\nDADOS DO DOSSIER (extraídos do PDF):\n${parts.join('\n')}`
    }
  }

  const lines: string[] = [
    `ARTISTA: ${artist.name || ''}`,
    artist.bio ? `Bio: ${artist.bio}` : '',
    artist.origin ? `Origem: ${artist.origin}` : '',
    artist.base ? `Base: ${artist.base}` : '',
    (artist.languages || []).length ? `Idiomas: ${(artist.languages || []).join(', ')}` : '',

    `\nPROJECTO: ${project?.name || ''}`,
    project?.projectFormat ? `Formato: ${project.projectFormat}` : '',
    project?.summary ? `Resumo: ${project.summary}` : '',
    (project?.projectKeywords || []).length
      ? `Keywords: ${(project.projectKeywords || []).join(', ')}` : '',

    dossierContext,

    `\nCARTOGRAFIA SOMA:`,
    raiz.vocabulario?.length ? `Vocabulário: ${raiz.vocabulario.join(', ')}` : '',
    raiz.tensions ? `Tensões: ${raiz.tensions}` : '',
    raiz.legacyOfResistance ? `Legado: ${raiz.legacyOfResistance}` : '',
    raiz.carePractices ? `Cuidado: ${raiz.carePractices}` : '',
    campo.audienceProfiles ? `Públicos: ${campo.audienceProfiles}` : '',
    teia.ethicalAlliances ? `Alianças: ${teia.ethicalAlliances}` : '',
    rota.corredores?.length ? `Corredores: ${rota.corredores.join(', ')}` : '',
    c.somaPositioning ? `Posicionamento SOMA: ${c.somaPositioning}` : '',
  ]

  return lines.filter(Boolean).join('\n')
}

// ─── Bloco de oportunidades ───────────────────────────────

function buildOpportunitiesBlock(opportunities: any[]): string {
  return opportunities.map((op, i) => [
    `[${i + 1}] ID:${op.id}`,
    `Título: ${op.title}`,
    op.organization ? `Org: ${op.organization}` : '',
    op.type ? `Tipo: ${op.type}` : '',
    `País: ${op.countryName || op.country || ''}`,
    (op.disciplines || []).length ? `Disc: ${(op.disciplines as string[]).slice(0, 3).join(', ')}` : '',
    op.coversCosts ? `Custos: Sim` : '',
    op.summary ? `Info: ${op.summary.substring(0, 150)}` : '',
  ].filter(Boolean).join('\n')).join('\n\n')
}

// ─── Pré-filtragem ────────────────────────────────────────

function safeArr(v: any): string[] {
  if (Array.isArray(v)) return v
  if (typeof v === 'string' && v.trim()) return v.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

function preFilter(opportunities: any[], artist: any, project: any): any[] {
  const artistCountries = [
    ...safeArr(artist.targetCountries),
    ...safeArr(artist.cartografia?.rota?.corredores),
  ].map(c => c.toLowerCase())

  const projectKeywords = [
    ...safeArr(artist.disciplines),
    ...safeArr(artist.keywords),
    ...safeArr(artist.cartografia?.raiz?.vocabulario),
    ...safeArr(project?.projectKeywords),
    project?.projectFormat || '',
    project?.highlights || '',
  ].map(k => k.toLowerCase()).filter(Boolean)

  const scored = opportunities.map(op => {
    let preScore = 0
    const opText = [
      op.title, op.summary, op.organization,
      ...safeArr(op.disciplines), ...safeArr(op.keywords),
    ].join(' ').toLowerCase()

    const opCountry = (op.countryName || op.country || '').toLowerCase()
    if (artistCountries.some(c => c.length > 2 && (opCountry.includes(c) || c.includes(opCountry)))) {
      preScore += 30
    }

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
    .slice(0, 10)
    .map(s => s.op)
}

// ─── Match principal ──────────────────────────────────────

export async function runContextualMatch(
  artist: any,
  project: any,
  opportunities: any[],
): Promise<MatchResults> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada')
  if (!artist) throw new Error('Artista não encontrado')
  if (!project) throw new Error('Projecto não encontrado')
  if (!opportunities.length) throw new Error('Sem oportunidades na base')

  const hasDossier = Boolean(
    (project.dossierText && project.dossierText.length > 50) ||
    project.highlights || project.methodology ||
    (Array.isArray(project.references) && project.references.length)
  )

  const filtered = preFilter(opportunities, artist, project)
  const artistContext = buildArtistContext(artist, project)
  const opBlock = buildOpportunitiesBlock(filtered)

  const prompt = `És um curador especializado em arte contemporânea afro-diaspórica da SOMA Cultura (Barcelona).

Analisa o encaixe REAL entre este perfil artístico e cada oportunidade. Sê específico e honesto.
Score: 0-100 | Verdict: "forte" (>75), "bom" (55-75), "possivel" (35-55), "fraco" (<35)

${artistContext}

OPORTUNIDADES (${filtered.length}):
${opBlock}

Responde com JSON válido — analisa TODAS as ${filtered.length} oportunidades:
{"matches":[{"opportunityId":"id","score":0,"verdict":"forte|bom|possivel|fraco","mainReason":"1 frase específica","strengths":["ponto 1"],"challenges":["desafio"],"angle":"ângulo de candidatura"}]}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Gemini ${res.status}: ${err?.error?.message || 'erro'}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  if (!text) throw new Error('Gemini não devolveu análise')

  let parsed: any = null
  try {
    parsed = JSON.parse(text)
  } catch {
    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]) } catch {}
    }
  }

  if (!parsed?.matches?.length) {
    throw new Error('Resposta sem JSON válido — tenta novamente')
  }

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