// api/scout-url.js
// SOMA ODÉ — Scout assistido por URL usando OpenAI

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'

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
  return {
    title: 'Oportunidade extraída por URL',
    organization: '',
    type: 'Edital',
    country: '',
    countryCode: '',
    city: '',
    regionId: '',
    disciplines: [],
    languages: [],
    deadline: '',
    summary: text.slice(0, 700),
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
    notes: 'Extração básica. Rever manualmente.'
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

    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({
        opportunity: fallbackExtract(url, text),
        warning: 'OPENAI_API_KEY não configurada. Usei extração básica.'
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
- requirements pode incluir: bio, pressPhoto, videoPresentation, technicalRider, pressKit, pressClippings, motivationLetter, projectDescription.
- disciplines deve usar valores simples: musica, danca, teatro, performance, cinema, artes_visuais, pesquisa, multidisciplinar.
- Faz uma síntese curta, prática e útil para produção.

TEXTO DA PÁGINA:
${text}
`

    const ai = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Responde apenas com JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!ai.ok) {
      const detail = await ai.text()
      return res.status(500).json({
        error: 'Erro na API da OpenAI.',
        detail: detail.slice(0, 800)
      })
    }

    const data = await ai.json()
    const raw = data.choices?.[0]?.message?.content || ''

    let opportunity

    try {
      opportunity = JSON.parse(raw)
    } catch {
      return res.status(500).json({
        error: 'A IA devolveu JSON inválido.',
        raw: raw.slice(0, 1000)
      })
    }

    return res.status(200).json({ opportunity })
  } catch (error) {
    return res.status(500).json({
      error: error?.message || 'Erro desconhecido no Scout.'
    })
  }
}