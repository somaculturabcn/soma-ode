// api/scout-url.js
// SOMA ODÉ — Scout assistido por URL
// Recebe URL, lê página, usa Claude API para extrair oportunidade em JSON.

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929'

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function fallbackExtract(url, text) {
  const titleMatch = text.match(/.{0,80}(open call|convocatoria|call|residency|residência|festival).{0,120}/i)

  return {
    title: titleMatch ? titleMatch[0].trim().slice(0, 160) : 'Oportunidade extraída por URL',
    organization: '',
    type: 'Edital',
    country: '',
    countryCode: '',
    city: '',
    regionId: '',
    disciplines: [],
    languages: [],
    deadline: '',
    summary: text.slice(0, 500),
    link: url,
    keywords: [],
    requirements: [],
    coverage: {
      travel: false,
      accommodation: false,
      meals: false,
      production: false,
      fee: false
    },
    coversCosts: false,
    notes: 'Extração automática sem IA completa. Rever manualmente.'
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { url } = req.body || {}

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL obrigatória.' })
    }

    const page = await fetch(url, {
      headers: {
        'user-agent': 'SOMA-ODE-Scout/1.0'
      }
    })

    if (!page.ok) {
      return res.status(400).json({
        error: `Não consegui ler a página. Status: ${page.status}`
      })
    }

    const html = await page.text()
    const text = stripHtml(html).slice(0, 18000)

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(200).json({
        opportunity: fallbackExtract(url, text),
        warning: 'ANTHROPIC_API_KEY não configurada. Usei extração básica.'
      })
    }

    const prompt = `
És um assistente de produção cultural da SOMA ODÉ.

Lê o texto de uma página de oportunidade cultural e extrai uma oportunidade estruturada.

Responde APENAS em JSON válido. Não uses markdown.

Campos obrigatórios:

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
  "deadline": "YYYY-MM-DD ou vazio se não houver",
  "summary": "",
  "link": "${url}",
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

Regras:
- Se não souber um campo, deixa vazio.
- countryCode deve ser ISO de 2 letras quando possível: ES, PT, BR, FR, DE etc.
- regionId deve seguir estes valores quando possível:
  europa_ocidental, europa_do_leste, america_sul, america_norte_central,
  africa_ocidental, africa_oriental_austral, africa_norte,
  medio_oriente, asia_oriental, asia_meridional, sudeste_asiatico, oceania.
- requirements pode incluir: bio, pressPhoto, videoPresentation, technicalRider, pressKit, pressClippings, motivationLetter, projectDescription.
- disciplines deve usar valores simples: musica, danca, teatro, performance, cinema, artes_visuais, pesquisa, multidisciplinar.
- Faz uma síntese curta, prática e útil para produção.

TEXTO DA PÁGINA:
${text}
`

    const ai = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        max_tokens: 1800,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!ai.ok) {
      const err = await ai.text()
      return res.status(500).json({
        error: 'Erro na API da Anthropic.',
        detail: err.slice(0, 500)
      })
    }

    const data = await ai.json()
    const raw = (data.content || [])
      .map(block => block.type === 'text' ? block.text : '')
      .join('\n')
      .trim()

    const cleaned = raw
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/i, '')
      .trim()

    let opportunity

    try {
      opportunity = JSON.parse(cleaned)
    } catch {
      return res.status(500).json({
        error: 'A IA devolveu JSON inválido.',
        raw: cleaned.slice(0, 1000)
      })
    }

    return res.status(200).json({ opportunity })
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'Erro desconhecido no Scout.'
    })
  }
}