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

    if (!url) {
      return res.status(400).json({ error: 'URL obrigatória.' })
    }

    // 🔹 1. Ler página
    const page = await fetch(url, {
      headers: { 'user-agent': 'SOMA-ODE-Scout/1.0' }
    })

    if (!page.ok) {
      return res.status(400).json({
        error: `Não consegui ler a página. Status: ${page.status}`
      })
    }

    const html = await page.text()
    const text = stripHtml(html).slice(0, 15000)

    // 🔹 2. Fallback se não houver API KEY
    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({
        opportunity: fallbackExtract(url, text),
        warning: 'OPENAI_API_KEY não configurada.'
      })
    }

    // 🔹 3. Prompt
    const prompt = `
Extrai uma oportunidade cultural em JSON.

Campos:

{
  "title": "",
  "organization": "",
  "type": "",
  "country": "",
  "countryCode": "",
  "city": "",
  "regionId": "",
  "disciplines": [],
  "languages": [],
  "deadline": "",
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

Texto:
${text}
`

    // 🔹 4. OpenAI call
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
          { role: 'system', content: 'Responde apenas JSON válido.' },
          { role: 'user', content: prompt }
        ]
      })
    })

    // 🔴 DEBUG REAL
    if (!ai.ok) {
      const detail = await ai.text()

      let parsed = detail
      try {
        parsed = JSON.parse(detail)
      } catch {}

      return res.status(ai.status).json({
        error: 'Erro na API da OpenAI',
        status: ai.status,
        detail: parsed
      })
    }

    const data = await ai.json()
    const raw = data.choices?.[0]?.message?.content || ''

    let opportunity

    try {
      opportunity = JSON.parse(raw)
    } catch {
      return res.status(500).json({
        error: 'JSON inválido da OpenAI',
        raw: raw.slice(0, 800)
      })
    }

    return res.status(200).json({ opportunity })

  } catch (err) {
    return res.status(500).json({
      error: err.message || 'Erro interno'
    })
  }
}