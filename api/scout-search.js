// api/scout-search.js
// SOMA ODÉ — Scout proativo com busca web OpenAI

const DEFAULT_MODEL = process.env.OPENAI_SEARCH_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'

function safeJsonParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {}
    }
    return null
  }
}

function extractOutputText(data) {
  if (data.output_text) return data.output_text

  const chunks = []

  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) chunks.push(content.text)
      if (content.type === 'text' && content.text) chunks.push(content.text)
    }
  }

  return chunks.join('\n').trim()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      query,
      countries = [],
      disciplines = [],
      languages = [],
      limit = 8,
    } = req.body || {}

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query obrigatória.' })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'OPENAI_API_KEY não configurada no Vercel.'
      })
    }

    const prompt = `
És o Scout cultural da SOMA ODÉ.

Procura oportunidades culturais reais e atuais na web para esta busca:

BUSCA:
${query}

FILTROS:
Países preferidos: ${countries.join(', ') || 'sem filtro'}
Disciplinas: ${disciplines.join(', ') || 'sem filtro'}
Idiomas: ${languages.join(', ') || 'sem filtro'}
Número máximo de resultados: ${limit}

Procura oportunidades como:
- residências artísticas
- festivais
- open calls
- editais
- showcases
- prémios
- bolsas
- oportunidades de circulação
- comissões artísticas

Responde APENAS em JSON válido, sem markdown.

Formato obrigatório:

{
  "results": [
    {
      "title": "",
      "organization": "",
      "type": "Residência | Festival | Edital | Showcase | Touring | Comissão | Premio | Outro",
      "country": "",
      "countryCode": "",
      "city": "",
      "regionId": "",
      "disciplines": [],
      "languages": [],
      "deadline": "YYYY-MM-DD ou vazio",
      "summary": "",
      "link": "",
      "keywords": [],
      "requirements": [],
      "coverage": {
        "travel": false,
        "accommodation": false,
        "meals": false,
        "production": false,
        "fee": false
      },
      "coversCosts": false,
      "notes": ""
    }
  ]
}

Regras:
- Só devolve oportunidades com link.
- Se não encontrares deadline, deixa vazio.
- Não inventes dados.
- Prioriza oportunidades abertas ou com deadline futuro.
- summary deve ser curto e útil para produção cultural.
- disciplines deve usar valores simples: musica, danca, teatro, performance, cinema, artes_visuais, pesquisa, multidisciplinar.
`

    const ai = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        tools: [{ type: 'web_search_preview' }],
        input: prompt,
      }),
    })

    if (!ai.ok) {
      const detail = await ai.text()

      let parsed = detail
      try {
        parsed = JSON.parse(detail)
      } catch {}

      return res.status(ai.status).json({
        error: 'Erro na API da OpenAI.',
        status: ai.status,
        detail: parsed,
      })
    }

    const data = await ai.json()
    const raw = extractOutputText(data)
    const parsed = safeJsonParse(raw)

    if (!parsed || !Array.isArray(parsed.results)) {
      return res.status(500).json({
        error: 'A IA não devolveu resultados válidos.',
        raw: raw.slice(0, 1200),
      })
    }

    return res.status(200).json({
      results: parsed.results.slice(0, Number(limit) || 8),
    })
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'Erro desconhecido no Scout proativo.',
    })
  }
}