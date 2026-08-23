// src/utils/geminiScout.ts
// SOMA ODÉ — Motor de busca web com Gemini (Google Search Grounding + fallback)
// Extraído de MatchView.tsx (modularização)

import { safeArr, type Opportunity, type SavedSearch, GEMINI_MODEL } from '../types/matchTypes'

// ─── Prompt builder ──────────────────────────────────────────────────────────

export function buildPrompt(search: SavedSearch): string {
  const hasMultilingualQueries = safeArr(search.searchQueries).length > 0
  const topQueries = hasMultilingualQueries
    ? safeArr(search.searchQueries).slice(0, 3)
    : [search.query].filter(Boolean)

  const typeLabels: Record<string, string> = {
    residencia: 'residências artísticas',
    open_call: 'open calls e editais',
    festival: 'festivais',
    showcase: 'showcases profissionais',
    premio: 'prémios e bolsas',
    beca: 'becas e bolsas de criação',
    mobilidade: 'programas de mobilidade',
    financiamento: 'financiamentos culturais',
    subvencao: 'subvenções culturais',
    associacao: 'editais para associações',
    projeto_social: 'projetos sociais e comunitários',
    educacao: 'projetos de educação artística',
    mediacao: 'mediação cultural',
    venue: 'venues e espaços culturais',
    festa: 'festas, noites e ciclos',
    clube: 'clubes nocturnos e espaços de festa',
    todos: 'oportunidades culturais',
  }

  const typeLabel = typeLabels[search.opportunityType || 'todos'] || 'oportunidades culturais'
  const disciplines = safeArr(search.disciplines).slice(0, 5).join(', ') || 'performance, artes contemporâneas'
  const countries = (search.selectedCountries || search.countries.split(','))
    .map((c: string) => c.trim()).filter(Boolean).slice(0, 8).join(', ') || 'Europa'
  const isRecurring = search.recurrenceMode === 'recorrentes'
  const isVenueType = ['venue', 'festa', 'clube', 'party'].includes(search.opportunityType || '')
  const queriesBlock = topQueries.length > 0
    ? 'QUERIES (usa para pesquisar):\n' + topQueries.map((q, i) => `${i + 1}. ${q}`).join('\n')
    : ''

  if (isVenueType) {
    return `Encontra ${Math.min(search.maxResults || 10, 10)} venues, clubes, festas ou espaços culturais reais que programam artistas afrodiaspóricos, queer e migrantes.

PAÍSES/CIDADES: ${countries}
LINGUAGENS: ${disciplines}
${topQueries.length > 0 ? `QUERIES: ${topQueries.join(' | ')}` : ''}

Responde APENAS com JSON válido:
{
  "opportunities": [
    {
      "title": "nome do venue ou festa",
      "organization": "promotora ou venue",
      "country": "país em português",
      "countryCode": "código ISO 2 letras",
      "city": "cidade",
      "type": "venue",
      "deadline": null,
      "recurrence": "irregular",
      "coversCosts": false,
      "summary": "2-3 frases: tipo de programação, perfil do público, como contactar",
      "link": "URL oficial verificável",
      "disciplines": ["música", "dj", "performance"],
      "keywords": ["afrodiaspórico", "queer", "electrónica"]
    }
  ]
}`
  }

  return `Encontra ${Math.min(search.maxResults || 10, 10)} ${typeLabel} REAIS para artistas negros, migrantes e LGBTQIA+ da diáspora afro-lusófona.

TIPO: ${typeLabel}
LINGUAGENS/PRÁTICAS: ${disciplines}
PAÍSES: ${countries}
PERFIL: ${search.applicantProfile || 'artista individual, coletivo, associação cultural'}
${isRecurring ? 'MODO: Inclui oportunidades recorrentes/anuais mesmo sem deadline atual aberto' : ''}

${queriesBlock}

REGRAS:
- Só oportunidades REAIS com links verificáveis
- Se recorrente/anual, inclui mesmo sem deadline atual
- Devolve mês habitual de abertura e deadline se soubers
- Não inventes links

Responde APENAS com JSON válido:
{
  "opportunities": [
    {
      "title": "nome exacto",
      "organization": "organização",
      "country": "país em português",
      "countryCode": "código ISO 2 letras",
      "city": "cidade",
      "type": "${search.opportunityType || 'open_call'}",
      "deadline": "YYYY-MM-DD ou null",
      "openingDate": "YYYY-MM-DD ou null",
      "recurrence": "anual|semestral|irregular|unica",
      "usualOpeningMonth": 3,
      "usualDeadlineMonth": 5,
      "recurrenceNotes": "nota curta sobre ciclo ou histórico",
      "coversCosts": true,
      "summary": "2-3 frases em português: o que é, para quem, o que oferece",
      "link": "URL oficial directa",
      "disciplines": ["performance", "artes visuais", "teatro"],
      "keywords": ["afrodiaspórico", "queer", "open call"]
    }
  ]
}`
}

// ─── Chamada com retry ───────────────────────────────────────────────────────

export async function callGemini(apiKey: string, body: any, retries = 3): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) return await res.json()

      const err = await res.json()
      const code = err?.error?.code || res.status
      const msg = err?.error?.message || 'erro desconhecido'

      if ((code === 503 || code === 429) && i < retries) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)))
        continue
      }

      throw new Error(`Gemini ${code}: ${msg}`)
    } catch (err: any) {
      if (i === retries) throw err
      await new Promise(r => setTimeout(r, 1500))
    }
  }

  throw new Error('Gemini não respondeu após várias tentativas')
}

// ─── Parse da resposta ───────────────────────────────────────────────────────

export function parseGeminiResponse(data: any): Opportunity[] {
  try {
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (!text || text.length < 10) return []

    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0])

    return (parsed.opportunities || [])
      .filter((op: any) => op.title && (op.link || op.organization))
      .map((op: any) => ({
        id: crypto.randomUUID(),
        title: op.title,
        organization: op.organization || '',
        type: op.type || 'open_call',
        country: op.countryCode || op.country || '',
        countryName: op.country || '',
        city: op.city || '',
        disciplines: safeArr(op.disciplines),
        keywords: safeArr(op.keywords),
        deadline: op.deadline || '',
        openingDate: op.openingDate || '',
        recurrence: op.recurrence || 'anual',
        usualOpeningMonth: Number(op.usualOpeningMonth) || undefined,
        usualDeadlineMonth: Number(op.usualDeadlineMonth) || undefined,
        recurrenceNotes: op.recurrenceNotes || '',
        summary: op.summary || '',
        description: op.summary || '',
        link: op.link || '',
        coversCosts: Boolean(op.coversCosts),
        isPrivate: false,
        status: 'open',
        source: 'gemini_web',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _fromWeb: true,
      }))
  } catch (err) {
    console.error('[Gemini] Erro ao parsear resposta:', err)
    return []
  }
}

// ─── Busca principal (grounding + fallback interno) ──────────────────────────

export async function searchWithGemini(search: SavedSearch): Promise<{ results: Opportunity[]; note: string; method: string }> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada no .env')

  const prompt = buildPrompt(search)
  const disciplines = safeArr(search.disciplines).slice(0, 3).join(', ') || 'artes'

  try {
    const data = await callGemini(apiKey, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.15, maxOutputTokens: 2048 },
    })

    const results = parseGeminiResponse(data)
    const hasGrounding = !!data?.candidates?.[0]?.groundingMetadata?.webSearchQueries

    if (results.length > 0) {
      return {
        results,
        note: `${results.length} encontradas${hasGrounding ? ' via Google Search' : ''} · ${disciplines}`,
        method: hasGrounding ? 'grounding' : 'gemini',
      }
    }
  } catch (err: any) {
    console.warn('[Scout] Google Search Grounding falhou:', err.message)
  }

  try {
    await new Promise(r => setTimeout(r, 1000))

    const data = await callGemini(apiKey, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    })

    const results = parseGeminiResponse(data)

    if (results.length > 0) {
      return {
        results,
        note: `${results.length} sugestões Gemini (base de conhecimento) · ${disciplines}`,
        method: 'internal',
      }
    }

    throw new Error('Gemini não encontrou resultados')
  } catch (err: any) {
    throw new Error(`Scout falhou: ${err.message}`)
  }
}