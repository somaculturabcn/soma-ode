// src/services/aiService.ts
// SOMA ODÉ — Serviço unificado de IA (Gemini Flash free tier)
// Fallback robusto: tenta .env → tenta window → funciona sem IA (modo offline)

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// ─── API Key com múltiplos fallbacks ────────────────────────────────────────

function getApiKey(): string | null {
  // 1. Vite .env (forma normal)
  try {
    const env = import.meta.env?.VITE_GEMINI_API_KEY
    if (env && env !== 'SUBSTITUI_PELA_TUA_CHAVE_GEMINI' && env.length > 10) return env
  } catch { /* ignora */ }

  // 2. localStorage (fallback StackBlitz)
  try {
    const stored = localStorage.getItem('soma_gemini_key')
    if (stored && stored.length > 10) return stored
  } catch { /* ignora */ }

  // 3. window global (fallback para debug)
  try {
    const win = (window as any).__SOMA_GEMINI_KEY__
    if (win && win.length > 10) return win
  } catch { /* ignora */ }

  return null
}

// Guardar key manualmente (para o painel de settings)
export function saveApiKey(key: string) {
  localStorage.setItem('soma_gemini_key', key)
}

export function hasApiKey(): boolean {
  return getApiKey() !== null
}

// ─── Chamada Gemini genérica ────────────────────────────────────────────────

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  error?: { message?: string }
}

export async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('NO_API_KEY')

  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`

  const body: any = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  }

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GEMINI_ERROR: ${res.status} — ${err.slice(0, 200)}`)
  }

  const data: GeminiResponse = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('GEMINI_EMPTY')

  return text
}

// ─── Gerar perfil artístico a partir de 4 respostas ─────────────────────────

export interface ArtistProfileAI {
  keywords: string[]
  disciplines: string[]
  themes: string[]
  targetCountries: string[]
  targetCities: string[]
  languages: string[]
  summary: string
  audienceProfile: string
  powerMap: string
  positioningAdvice: string
}

export async function generateArtistProfile(answers: {
  identity: string
  audience: string
  power: string
  direction: string
}): Promise<ArtistProfileAI> {
  const prompt = `Analisa estas respostas de um artista e gera um perfil estruturado em JSON.

RESPOSTAS DO ARTISTA:
1. Quem és? ${answers.identity}
2. Para quem? ${answers.audience}
3. Quem manda no teu mundo? ${answers.power}
4. Para onde queres ir? ${answers.direction}

Responde APENAS com JSON válido neste formato:
{
  "keywords": ["até 10 palavras-chave sobre o artista"],
  "disciplines": ["música", "dança", "teatro", "performance", "artes visuais", etc.],
  "themes": ["temas e conceitos do trabalho"],
  "targetCountries": ["códigos ISO 2 letras: ES, FR, DE, BR, etc."],
  "targetCities": ["cidades-alvo mencionadas"],
  "languages": ["pt", "es", "en", "fr", etc.],
  "summary": "Resumo de 2-3 frases sobre o artista",
  "audienceProfile": "Perfil do público em 2-3 frases",
  "powerMap": "Quem são os gatekeepers/decisores do nicho, 2-3 frases",
  "positioningAdvice": "Conselho de posicionamento em 2-3 frases"
}`

  const system = `És um curador especializado em arte contemporânea afro-diaspórica, migração e LGBTQIA+. Trabalhas para a SOMA Cultura em Barcelona. Extrai informação estruturada das respostas do artista. Sê específico e honesto. Responde sempre em português.`

  try {
    const text = await callGemini(prompt, system)
    return JSON.parse(text)
  } catch (e: any) {
    if (e.message === 'NO_API_KEY') {
      // Modo offline — perfil básico extraído das respostas
      return extractProfileOffline(answers)
    }
    throw e
  }
}

// ─── Fallback offline — extrai perfil sem IA ────────────────────────────────

function extractProfileOffline(answers: {
  identity: string
  audience: string
  power: string
  direction: string
}): ArtistProfileAI {
  const all = `${answers.identity} ${answers.audience} ${answers.power} ${answers.direction}`.toLowerCase()

  // Detectar disciplinas
  const discMap: Record<string, string> = {
    'música': 'musica', 'musica': 'musica', 'cantor': 'musica', 'cantora': 'musica',
    'dj': 'musica', 'rapper': 'musica', 'mc': 'musica', 'banda': 'musica',
    'dança': 'danca', 'danca': 'danca', 'bailarin': 'danca', 'coreograf': 'danca',
    'teatro': 'teatro', 'ator': 'teatro', 'atriz': 'teatro', 'dramatur': 'teatro',
    'performance': 'performance', 'performan': 'performance',
    'visual': 'artes visuais', 'pintor': 'artes visuais', 'escultor': 'artes visuais',
    'fotograf': 'fotografia', 'foto': 'fotografia',
    'audiovisual': 'audiovisual', 'cinema': 'audiovisual', 'video': 'audiovisual',
    'literatur': 'literatura', 'poet': 'literatura', 'escrit': 'literatura',
    'circo': 'circo',
  }
  const disciplines = [...new Set(
    Object.entries(discMap)
      .filter(([key]) => all.includes(key))
      .map(([, val]) => val)
  )]
  if (disciplines.length === 0) disciplines.push('multidisciplinar')

  // Detectar países
  const countryMap: Record<string, string> = {
    'brasil': 'BR', 'brazil': 'BR', 'espanha': 'ES', 'españa': 'ES', 'spain': 'ES',
    'barcelona': 'ES', 'madrid': 'ES', 'portugal': 'PT', 'lisboa': 'PT',
    'frança': 'FR', 'france': 'FR', 'paris': 'FR',
    'alemanha': 'DE', 'germany': 'DE', 'berlim': 'DE', 'berlin': 'DE',
    'itália': 'IT', 'italia': 'IT', 'italy': 'IT',
    'holanda': 'NL', 'amsterdam': 'NL', 'países baixos': 'NL',
    'uk': 'GB', 'reino unido': 'GB', 'london': 'GB', 'londres': 'GB',
    'bélgica': 'BE', 'belgica': 'BE', 'bruxelas': 'BE',
    'suíça': 'CH', 'suica': 'CH', 'suecia': 'SE',
  }
  const targetCountries = [...new Set(
    Object.entries(countryMap)
      .filter(([key]) => all.includes(key))
      .map(([, val]) => val)
  )]
  if (targetCountries.length === 0) targetCountries.push('ES')

  // Detectar idiomas
  const langMap: Record<string, string> = {
    'português': 'pt', 'portugues': 'pt', 'portuguese': 'pt',
    'espanhol': 'es', 'español': 'es', 'spanish': 'es', 'castellano': 'es',
    'inglês': 'en', 'ingles': 'en', 'english': 'en',
    'francês': 'fr', 'frances': 'fr', 'french': 'fr',
    'catalão': 'ca', 'catala': 'ca', 'català': 'ca',
  }
  const languages = [...new Set(
    Object.entries(langMap)
      .filter(([key]) => all.includes(key))
      .map(([, val]) => val)
  )]
  if (languages.length === 0) languages.push('pt', 'es')

  // Keywords simples
  const words = all.split(/[\s,;.!?]+/).filter(w => w.length > 4)
  const stopwords = new Set(['sobre', 'também', 'quando', 'porque', 'ainda', 'muito', 'entre', 'desde', 'tenho', 'minha', 'minhas', 'nosso', 'nossa', 'quero', 'gosto', 'sempre', 'nunca', 'fazer', 'seria', 'posso', 'acho'])
  const keywords = [...new Set(words.filter(w => !stopwords.has(w)))].slice(0, 10)

  return {
    keywords,
    disciplines,
    themes: keywords.slice(0, 5),
    targetCountries,
    targetCities: [],
    languages,
    summary: answers.identity.slice(0, 200),
    audienceProfile: answers.audience.slice(0, 200),
    powerMap: answers.power.slice(0, 200),
    positioningAdvice: answers.direction.slice(0, 200),
  }
}

// ─── Match artista × oportunidade ───────────────────────────────────────────

export interface AIMatchResult {
  score: number
  verdict: 'forte' | 'bom' | 'possivel' | 'fraco'
  reason: string
  strengths: string[]
  challenges: string[]
}

export async function matchArtistOpportunity(
  artistSummary: string,
  opportunityTitle: string,
  opportunityDescription: string,
): Promise<AIMatchResult> {
  const prompt = `Avalia o encaixe entre este artista e esta oportunidade.

ARTISTA: ${artistSummary}

OPORTUNIDADE: ${opportunityTitle}
${opportunityDescription}

Responde APENAS com JSON:
{
  "score": 0-100,
  "verdict": "forte" | "bom" | "possivel" | "fraco",
  "reason": "Frase principal do match",
  "strengths": ["pontos fortes", "max 3"],
  "challenges": ["desafios", "max 3"]
}`

  try {
    const text = await callGemini(prompt)
    return JSON.parse(text)
  } catch {
    return { score: 50, verdict: 'possivel', reason: 'Match estimado (IA offline)', strengths: [], challenges: [] }
  }
}
