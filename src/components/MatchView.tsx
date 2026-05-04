// src/components/MatchView.tsx
// SOMA ODÉ — Oportunidades / MatchView v6
// Inteligência de recorrência + Scout multilíngue
// Lê searchQueries do ScoutSavedSearches v6
// Inclui: abertura habitual, deadline habitual, confiança, estado de preparação, venues/festas/clubes, associações e projetos sociais

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import ScoutUrlExtractor from './ScoutUrlExtractor'
import ScoutSavedSearches from './ScoutSavedSearches'
import ProposeOpportunityButton from './ProposeOpportunityButton'
import SomaAnalysisModal, { type ArtistForAnalysis } from './SomaAnalysisModal'
import { mockOpportunities } from '../data/mockOpportunities'
import { realOpportunities } from '../data/realOpportunities'
import { loadArtistsFromSupabase } from '../data/artistsSupabaseStore'

// ─── Helpers ──────────────────────────────────────────────

function safeArr(val: any): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string' && val.trim()) return val.split(',').map((s: string) => s.trim()).filter(Boolean)
  return []
}

function cleanText(v?: string) {
  return (v || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function splitTags(v: string) {
  return v.split(',').map(x => x.trim()).filter(Boolean)
}

function joinTags(v?: string[] | string) {
  if (Array.isArray(v)) return v.join(', ')
  return typeof v === 'string' ? v : ''
}

function escapeCsv(v: any) {
  const s = Array.isArray(v) ? v.join(', ') : String(v ?? '')
  return `"${s.replace(/"/g, '""')}"`
}

// ─── Tipos ────────────────────────────────────────────────

type Recurrence = 'anual' | 'semestral' | 'irregular' | 'unica'
type RecurrenceConfidence = 'alta' | 'media' | 'baixa'
type PreparationStatus = 'mapear' | 'preparar' | 'pronto' | 'enviado'

type Opportunity = {
  id: string
  title: string
  organization?: string
  type?: string
  country?: string
  countryName?: string
  city?: string
  disciplines?: string[]
  languages?: string[]
  deadline?: string
  openingDate?: string
  recurrence?: Recurrence
  usualOpeningMonth?: number
  usualDeadlineMonth?: number
  recurrenceNotes?: string
  recurrenceConfidence?: RecurrenceConfidence
  preparationStatus?: PreparationStatus
  summary?: string
  description?: string
  link?: string
  keywords?: string[]
  themes?: string[]
  requirements?: string[]
  assignedArtistId?: string
  assignedArtistName?: string
  coversCosts?: boolean
  status?: string
  source?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
  _matchScore?: number
  _matchReasons?: string[]
  _fromWeb?: boolean
}

type ArtistLite = {
  id: string
  artisticName?: string
  name?: string
  legalName?: string
}

type SavedSearch = {
  id: string
  name: string
  query: string
  countries: string
  disciplines: string
  languages: string
  maxResults: number
  opportunityType?: string
  selectedCountries?: string[]
  selectedDisciplines?: string[]
  searchQueries?: string[]
  applicantProfile?: string
  recurrenceMode?: 'ativas_agora' | 'recorrentes' | 'ambas'
  usualOpeningMonth?: number
  usualDeadlineMonth?: number
  recurrenceNotes?: string
}

const STORAGE_KEY = 'soma-manual-opportunities-v1'
const ARTISTS_KEY = 'soma-artists-v2'
const SCORE_THRESHOLD = 20
const GEMINI_MODEL = 'gemini-2.5-flash'

const MONTHS = [
  { value: 1, label: 'Janeiro', short: 'Jan' },
  { value: 2, label: 'Fevereiro', short: 'Fev' },
  { value: 3, label: 'Março', short: 'Mar' },
  { value: 4, label: 'Abril', short: 'Abr' },
  { value: 5, label: 'Maio', short: 'Mai' },
  { value: 6, label: 'Junho', short: 'Jun' },
  { value: 7, label: 'Julho', short: 'Jul' },
  { value: 8, label: 'Agosto', short: 'Ago' },
  { value: 9, label: 'Setembro', short: 'Set' },
  { value: 10, label: 'Outubro', short: 'Out' },
  { value: 11, label: 'Novembro', short: 'Nov' },
  { value: 12, label: 'Dezembro', short: 'Dez' },
]

const TYPE_COLORS: Record<string, string> = {
  residency: '#6ef3a5',
  residencia: '#6ef3a5',
  festival: '#ffcf5c',
  open_call: '#60b4e8',
  showcase: '#ff9f5c',
  grant: '#c084fc',
  premio: '#c084fc',
  beca: '#c084fc',
  mobilidade: '#38bdf8',
  financiamento: '#4ade80',
  subvencao: '#4ade80',
  associacao: '#facc15',
  projeto_social: '#86efac',
  educacao: '#93c5fd',
  mediacao: '#67e8f9',
  venue: '#f472b6',
  festa: '#f472b6',
  clube: '#f472b6',
  party: '#f472b6',
}

const TYPE_ICONS: Record<string, string> = {
  residency: '🏠',
  residencia: '🏠',
  festival: '🎪',
  open_call: '📋',
  showcase: '🎤',
  grant: '🏆',
  premio: '🏆',
  beca: '🎓',
  mobilidade: '✈️',
  financiamento: '💰',
  subvencao: '🏛️',
  associacao: '🤝',
  projeto_social: '🌱',
  educacao: '📚',
  mediacao: '🧭',
  venue: '🏛',
  festa: '🎉',
  clube: '🎧',
  party: '🎉',
}

const RECURRENCE_OPTIONS: { value: Recurrence; label: string; color: string }[] = [
  { value: 'anual', label: '🔄 Anual', color: '#6ef3a5' },
  { value: 'semestral', label: '🔄 Semestral', color: '#60b4e8' },
  { value: 'irregular', label: '⚡ Irregular', color: '#ffcf5c' },
  { value: 'unica', label: '1️⃣ Única', color: 'rgba(255,255,255,0.5)' },
]

const CONFIDENCE_OPTIONS: { value: RecurrenceConfidence; label: string; color: string }[] = [
  { value: 'alta', label: 'Alta', color: '#6ef3a5' },
  { value: 'media', label: 'Média', color: '#ffcf5c' },
  { value: 'baixa', label: 'Baixa', color: '#ff8a8a' },
]

const PREPARATION_OPTIONS: { value: PreparationStatus; label: string; color: string }[] = [
  { value: 'mapear', label: 'Mapear', color: 'rgba(255,255,255,0.45)' },
  { value: 'preparar', label: 'Preparar', color: '#ffcf5c' },
  { value: 'pronto', label: 'Pronto', color: '#6ef3a5' },
  { value: 'enviado', label: 'Enviado', color: '#60b4e8' },
]

// ─── Local storage ────────────────────────────────────────

function getManualOpportunities(): Opportunity[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveManualOpportunities(data: Opportunity[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function getArtists(): ArtistLite[] {
  try {
    const p = JSON.parse(localStorage.getItem(ARTISTS_KEY) || '[]')
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

function emptyOpportunity(): Opportunity {
  return {
    id: crypto.randomUUID(),
    title: '',
    organization: '',
    type: 'open_call',
    country: '',
    countryName: '',
    city: '',
    disciplines: [],
    languages: [],
    deadline: '',
    openingDate: '',
    recurrence: 'anual',
    usualOpeningMonth: undefined,
    usualDeadlineMonth: undefined,
    recurrenceNotes: '',
    recurrenceConfidence: 'media',
    preparationStatus: 'mapear',
    summary: '',
    description: '',
    link: '',
    keywords: [],
    coversCosts: false,
    status: 'open',
    source: 'manual',
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ─── Datas e recorrência ──────────────────────────────────

function daysLeft(deadline?: string) {
  if (!deadline) return null
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / 86400000)
}

function deadlineLabel(deadline?: string) {
  const d = daysLeft(deadline)
  if (d === null) return null
  if (d < 0) return { text: 'prazo passou', color: 'rgba(255,255,255,0.3)' }
  if (d === 0) return { text: 'hoje!', color: '#ff8a8a' }
  if (d <= 7) return { text: `${d} dias ⚠️`, color: '#ff8a8a' }
  if (d <= 30) return { text: `${d} dias`, color: '#ffcf5c' }
  return { text: `${d} dias`, color: 'rgba(255,255,255,0.5)' }
}

function monthName(month?: number, short = false) {
  if (!month) return ''
  const m = MONTHS.find(x => x.value === month)
  return short ? m?.short || '' : m?.label || ''
}

function monthsUntil(month?: number) {
  if (!month) return null
  const now = new Date()
  const current = now.getMonth() + 1
  let diff = month - current
  if (diff < 0) diff += 12
  return diff
}

function recurrenceSignal(op: Opportunity) {
  const openingDiff = monthsUntil(op.usualOpeningMonth)
  const deadlineDiff = monthsUntil(op.usualDeadlineMonth)

  if (op.deadline) {
    const d = daysLeft(op.deadline)
    if (d !== null && d >= 0 && d <= 30) {
      return {
        label: `deadline em ${d} dias`,
        color: '#ff8a8a',
        priority: 3,
      }
    }
  }

  if (openingDiff !== null && openingDiff <= 1) {
    return {
      label: `abre em ${monthName(op.usualOpeningMonth, true)}`,
      color: '#ffcf5c',
      priority: 2,
    }
  }

  if (openingDiff !== null && openingDiff <= 3) {
    return {
      label: `preparar para ${monthName(op.usualOpeningMonth, true)}`,
      color: '#60b4e8',
      priority: 1,
    }
  }

  if (deadlineDiff !== null && deadlineDiff <= 3) {
    return {
      label: `deadline típico: ${monthName(op.usualDeadlineMonth, true)}`,
      color: '#c084fc',
      priority: 1,
    }
  }

  return null
}

// ─── Scoring ──────────────────────────────────────────────

function scoreOpportunity(op: Opportunity, search: SavedSearch): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  const searchDiscs = safeArr(search.disciplines).map(d => cleanText(d.replace(/^[^\s]+ /, '')))
  const selectedDiscs = safeArr(search.selectedDisciplines).map(d => cleanText(d))
  const queryWords = safeArr(search.searchQueries).length > 0
    ? safeArr(search.searchQueries).join(' ')
    : search.query

  const opDiscs = safeArr(op.disciplines).map(d => cleanText(d))
  const opText = cleanText([
    op.title,
    op.summary,
    op.description,
    op.organization,
    op.type,
    op.countryName,
    op.country,
    op.city,
    op.recurrenceNotes,
    ...safeArr(op.keywords),
    ...safeArr(op.disciplines),
  ].join(' '))

  const allSearchTerms = [...searchDiscs, ...selectedDiscs]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)

  if (allSearchTerms.length > 0) {
    const matches = allSearchTerms.filter(sd =>
      opDiscs.some(od => od.includes(sd) || sd.includes(od)) || opText.includes(sd),
    )
    if (matches.length > 0) {
      score += Math.min(40, matches.length * 12)
      reasons.push(`Linguagem: ${matches.slice(0, 2).join(', ')}`)
    }
  }

  const qWords = cleanText(queryWords)
    .split(/\s+/)
    .filter(w => w.length > 4)
    .filter(w => !['open', 'call', 'para', 'como', 'todos', 'tipos', 'artists', 'artist', 'cultural'].includes(w))

  const kwMatches = qWords.filter(w => opText.includes(w))
  if (kwMatches.length > 0) {
    score += Math.min(25, kwMatches.length * 5)
    reasons.push(`${Math.min(kwMatches.length, 5)} termo${kwMatches.length > 1 ? 's' : ''} de busca`)
  }

  if (search.countries) {
    const sc = search.countries.split(',').map(c => cleanText(c.trim())).filter(c => c.length > 1)
    const opC = cleanText(op.countryName || op.country || '')
    if (opC && sc.some(c => opC.includes(c) || c.includes(opC))) {
      score += 20
      reasons.push(`País: ${op.countryName || op.country}`)
    }
  }

  if (search.opportunityType && search.opportunityType !== 'todos') {
    const wanted = cleanText(search.opportunityType)
    const current = cleanText(op.type || '')
    if (current.includes(wanted) || wanted.includes(current)) {
      score += 15
      reasons.push(`Tipo: ${op.type}`)
    }
  }

  if (search.recurrenceMode === 'recorrentes' && op.recurrence && op.recurrence !== 'unica') {
    score += 10
    reasons.push('Recorrente')
  }

  if (op.coversCosts) {
    score += 10
    reasons.push('Cobre custos')
  }

  const signal = recurrenceSignal(op)
  if (signal?.priority === 3) score += 8
  if (signal?.priority === 2) score += 5

  const dias = daysLeft(op.deadline)
  if (dias !== null && dias < 0) score -= 8

  return { score: Math.max(0, Math.min(100, score)), reasons }
}

// ─── Gemini ───────────────────────────────────────────────

function buildPrompt(search: SavedSearch): string {
  const queryList = safeArr(search.searchQueries).length > 0
    ? safeArr(search.searchQueries)
    : [search.query].filter(Boolean)

  const max = Math.min(search.maxResults || 10, 12)
  const isVenueType = ['venue', 'festa', 'clube', 'party'].includes(search.opportunityType || '')
  const isSocialType = ['associacao', 'projeto_social', 'educacao', 'mediacao', 'subvencao', 'financiamento'].includes(search.opportunityType || '')
  const isRecurring = search.recurrenceMode === 'recorrentes'

  return `És um pesquisador cultural para a SOMA ODÉ, plataforma de inteligência cultural baseada em Barcelona.

TAREFA:
Encontrar oportunidades REAIS para artistas, coletivos, associações culturais e projetos sociais/culturais.

IMPORTANTE:
- Usa as queries multilíngues abaixo.
- Prioriza links oficiais, páginas de inscrição, páginas de programa, instituições e venues reais.
- Não inventes links.
- Se uma oportunidade for recorrente, identifica o mês provável de abertura e deadline quando possível.
- Se não tiver deadline atual, mas for recorrente/anual, devolve mesmo assim com recurrence="anual".
- Responde APENAS com JSON válido.

TIPO DE BUSCA:
${search.opportunityType || 'todos'}

PERFIL:
${search.applicantProfile || 'todos'}

MODO DE RECORRÊNCIA:
${search.recurrenceMode || 'ambas'}

DISCIPLINAS / LINGUAGENS:
${search.disciplines || 'não especificado'}

PAÍSES:
${search.countries || 'não especificado'}

QUERIES MULTILÍNGUES:
${queryList.map((q, i) => `${i + 1}. ${q}`).join('\n')}

${isVenueType ? `FOCO ESPECÍFICO:
Procura venues, clubes, festas, ciclos, espaços culturais, programadores, open decks e contextos de booking.
Inclui informação útil para contacto/programação.` : ''}

${isSocialType ? `FOCO ESPECÍFICO:
Procura editais para associações, subvenções, projetos comunitários, mediação cultural, educação artística, cultura antirracista, migração, juventude, bairro e inclusão social.` : ''}

${isRecurring ? `FOCO EM RECORRÊNCIA:
Mesmo que o edital atual ainda não esteja aberto, devolve oportunidades anuais importantes e tenta inferir:
- usualOpeningMonth
- usualDeadlineMonth
- recurrenceNotes
- recurrenceConfidence` : ''}

FORMATO JSON OBRIGATÓRIO:
{
  "opportunities": [
    {
      "title": "nome exacto da oportunidade",
      "organization": "organização/instituição/venue",
      "country": "país em português",
      "countryCode": "código ISO 2 letras",
      "city": "cidade",
      "type": "residencia|open_call|festival|showcase|premio|beca|mobilidade|financiamento|subvencao|associacao|projeto_social|educacao|mediacao|venue|festa|clube",
      "deadline": "YYYY-MM-DD ou null",
      "openingDate": "YYYY-MM-DD ou null",
      "recurrence": "anual|semestral|irregular|unica",
      "usualOpeningMonth": 1,
      "usualDeadlineMonth": 5,
      "recurrenceConfidence": "alta|media|baixa",
      "recurrenceNotes": "nota curta sobre ciclo, histórico ou preparação antecipada",
      "preparationStatus": "mapear",
      "coversCosts": true,
      "summary": "2-3 frases em português: o que é, para quem, o que oferece e por que é útil",
      "link": "URL oficial verificável",
      "disciplines": ["performance", "teatro", "cinema", "audiovisual", "música", "projeto social"],
      "keywords": ["open call", "residência", "associação", "beca"]
    }
  ]
}

DEVOLVE NO MÁXIMO ${max} RESULTADOS.`
}

async function callGemini(apiKey: string, body: any, retries = 2): Promise<any> {
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
        await new Promise(r => setTimeout(r, 1800 * (i + 1)))
        continue
      }

      throw new Error(`Gemini ${code}: ${msg}`)
    } catch (err: any) {
      if (i === retries) throw err
      await new Promise(r => setTimeout(r, 1200))
    }
  }

  throw new Error('Gemini não respondeu após várias tentativas')
}

function parseGeminiResponse(data: any): Opportunity[] {
  try {
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    if (!text || text.length < 10) return []

    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0])

    return safeArr(parsed.opportunities)
      .filter((op: any) => op.title && (op.link || op.organization))
      .map((op: any) => ({
        id: crypto.randomUUID(),
        title: op.title || '',
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
        recurrenceConfidence: op.recurrenceConfidence || 'media',
        recurrenceNotes: op.recurrenceNotes || '',
        preparationStatus: op.preparationStatus || 'mapear',
        summary: op.summary || '',
        description: op.summary || '',
        link: op.link || '',
        coversCosts: Boolean(op.coversCosts),
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

async function searchWithGemini(search: SavedSearch): Promise<{ results: Opportunity[]; note: string; method: string }> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada no .env')

  const prompt = buildPrompt(search)

  try {
    const data = await callGemini(apiKey, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
    })

    const results = parseGeminiResponse(data)
    const hasGrounding = Boolean(data?.candidates?.[0]?.groundingMetadata?.webSearchQueries)

    if (results.length > 0) {
      return {
        results,
        note: `${results.length} resultado${results.length !== 1 ? 's' : ''}${hasGrounding ? ' via Google Search' : ''}`,
        method: hasGrounding ? 'grounding' : 'gemini',
      }
    }
  } catch (err: any) {
    console.warn('[Scout] Grounding falhou:', err.message)
  }

  const data = await callGemini(apiKey, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.25, maxOutputTokens: 4096 },
  })

  const results = parseGeminiResponse(data)
  if (results.length === 0) throw new Error('Gemini não encontrou resultados úteis.')

  return {
    results,
    note: `${results.length} sugestões Gemini`,
    method: 'internal',
  }
}

// ─── CSV ──────────────────────────────────────────────────

function parseCsv(text: string): Opportunity[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(/[;,]/).map(h => cleanText(h).replace(/\s+/g, '_'))

  return lines.slice(1).map(line => {
    const values = line.split(/[;,]/).map(v => v.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })

    const get = (...keys: string[]) => {
      for (const k of keys) {
        const n = cleanText(k).replace(/\s+/g, '_')
        if (row[n]) return row[n]
      }
      return ''
    }

    return {
      id: crypto.randomUUID(),
      title: get('title', 'titulo') || 'Sem título',
      organization: get('organization', 'organizacao'),
      type: get('type', 'tipo') || 'open_call',
      country: get('country', 'pais'),
      countryName: get('country', 'pais'),
      city: get('city', 'cidade'),
      disciplines: splitTags(get('disciplines', 'disciplinas')),
      deadline: get('deadline', 'prazo'),
      openingDate: get('openingDate', 'abertura'),
      recurrence: (get('recurrence', 'recorrencia') || 'anual') as Recurrence,
      usualOpeningMonth: Number(get('usualOpeningMonth', 'mes_abertura')) || undefined,
      usualDeadlineMonth: Number(get('usualDeadlineMonth', 'mes_deadline')) || undefined,
      recurrenceNotes: get('recurrenceNotes', 'notas_recorrencia'),
      recurrenceConfidence: (get('recurrenceConfidence', 'confianca_recorrencia') || 'media') as RecurrenceConfidence,
      preparationStatus: (get('preparationStatus', 'estado_preparacao') || 'mapear') as PreparationStatus,
      summary: get('summary', 'resumo'),
      link: get('link', 'url'),
      keywords: splitTags(get('keywords', 'tags')),
      notes: get('notes', 'notas'),
      coversCosts: ['sim', 'yes', 'true', '1'].includes(cleanText(get('coversCosts', 'custos'))),
      status: 'open',
      source: 'csv',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  })
}

// ─── Componente principal ─────────────────────────────────

export default function MatchView() {
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [manual, setManual] = useState<Opportunity[]>([])
  const [artists, setArtists] = useState<ArtistLite[]>([])
  const [editing, setEditing] = useState<Opportunity | null>(null)
  const [assigning, setAssigning] = useState<Opportunity | null>(null)
  const [selectedArtistId, setSelectedArtistId] = useState('')

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('todos')
  const [countryFilter, setCountryFilter] = useState('todos')
  const [onlyCosts, setOnlyCosts] = useState(false)
  const [showExpired, setShowExpired] = useState(false)
  const [onlyPrepare, setOnlyPrepare] = useState(false)

  const [activeScout, setActiveScout] = useState<SavedSearch | null>(null)
  const [webResults, setWebResults] = useState<Opportunity[]>([])
  const [webLoading, setWebLoading] = useState(false)
  const [webError, setWebError] = useState('')
  const [webNote, setWebNote] = useState('')
  const [webMethod, setWebMethod] = useState('')

  const [analysisOp, setAnalysisOp] = useState<Opportunity | null>(null)
  const [analysisArtist, setAnalysisArtist] = useState<ArtistForAnalysis | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [quickEdit, setQuickEdit] = useState<string | null>(null)

  useEffect(() => {
    setManual(getManualOpportunities())
    setArtists(getArtists())
  }, [])

  function persist(next: Opportunity[]) {
    setManual(next)
    saveManualOpportunities(next)
  }

  const allOpportunities: Opportunity[] = useMemo(() => {
    const real = Array.isArray(realOpportunities) ? realOpportunities : []
    const mock = Array.isArray(mockOpportunities) ? mockOpportunities : []

    const normalized = [...manual, ...real, ...mock].map((op: any) => ({
      ...op,
      id: op.id || crypto.randomUUID(),
      title: op.title || op.name || 'Sem título',
      organization: op.organization || '',
      type: op.type || 'open_call',
      country: op.country || '',
      countryName: op.countryName || op.country || '',
      disciplines: safeArr(op.disciplines),
      keywords: safeArr(op.keywords || op.themes),
      status: op.status || 'open',
      recurrence: op.recurrence || 'anual',
      usualOpeningMonth: Number(op.usualOpeningMonth) || undefined,
      usualDeadlineMonth: Number(op.usualDeadlineMonth) || undefined,
      recurrenceConfidence: op.recurrenceConfidence || 'media',
      recurrenceNotes: op.recurrenceNotes || '',
      preparationStatus: op.preparationStatus || 'mapear',
    }))

    const seen = new Set<string>()
    return normalized.filter(op => {
      const key = cleanText(`${op.title}-${op.organization}`)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [manual])

  async function handleScoutExecute(savedSearch: SavedSearch) {
    setActiveScout(savedSearch)
    setSearch('')
    setWebResults([])
    setWebError('')
    setWebNote('')
    setWebMethod('')
    setWebLoading(true)

    try {
      const { results, note, method } = await searchWithGemini(savedSearch)
      const enriched = results.map(op => ({
        ...op,
        usualOpeningMonth: op.usualOpeningMonth || savedSearch.usualOpeningMonth,
        usualDeadlineMonth: op.usualDeadlineMonth || savedSearch.usualDeadlineMonth,
        recurrenceNotes: op.recurrenceNotes || savedSearch.recurrenceNotes || '',
      }))
      setWebResults(enriched)
      setWebNote(note)
      setWebMethod(method)
    } catch (err: any) {
      console.error('[Scout] Erro final:', err)
      setWebError(err.message || 'Erro ao buscar. Verifica a API key e tenta de novo.')
    } finally {
      setWebLoading(false)
    }
  }

  function handleScoutCallback(data: any) {
    if (data && data.query !== undefined && data.name !== undefined) {
      handleScoutExecute(data as SavedSearch)
    } else {
      handleScoutSave(data as Opportunity)
    }
  }

  function handleScoutSave(op: Opportunity) {
    persist([op, ...getManualOpportunities()])
  }

  function clearScout() {
    setActiveScout(null)
    setSearch('')
    setWebResults([])
    setWebError('')
    setWebNote('')
    setWebMethod('')
  }

  function saveWebOpportunity(op: Opportunity) {
    const toSave = {
      ...op,
      source: 'web_scout',
      _fromWeb: undefined,
      _matchScore: undefined,
      _matchReasons: undefined,
    }
    persist([toSave, ...getManualOpportunities()])
    setWebResults(prev => prev.filter(w => w.id !== op.id))
  }

  async function openAnalysis(op: Opportunity) {
    setAnalysisOp(op)
    setLoadingAnalysis(true)

    try {
      if ((activeScout as any)?.artistId) {
        const allArtists = await loadArtistsFromSupabase()
        const artist = allArtists.find((a: any) => a.id === (activeScout as any).artistId) as any

        if (artist) {
          setAnalysisArtist({
            name: artist.name || 'Artista',
            bio: artist.bio,
            origin: artist.origin,
            base: artist.base,
            disciplines: safeArr(artist.disciplines),
            languages: safeArr(artist.languages),
            keywords: safeArr(artist.keywords),
            cartografia: artist.cartografia,
          })
        } else {
          setAnalysisArtist({ name: (activeScout as any)?.artistName || 'Artista SOMA' })
        }
      } else {
        setAnalysisArtist({ name: 'Artista SOMA' })
      }
    } catch {
      setAnalysisArtist({ name: 'Artista SOMA' })
    }

    setLoadingAnalysis(false)
  }

  const filteredBase: Opportunity[] = useMemo(() => {
    const q = cleanText(search)

    return allOpportunities
      .map(op => {
        if (activeScout) {
          const { score, reasons } = scoreOpportunity(op, activeScout)
          return { ...op, _matchScore: score, _matchReasons: reasons }
        }
        return op
      })
      .filter(op => {
        if (activeScout && (op._matchScore || 0) < SCORE_THRESHOLD) return false
        if (typeFilter !== 'todos' && op.type !== typeFilter) return false
        if (countryFilter !== 'todos' && (op.countryName || op.country) !== countryFilter) return false
        if (onlyCosts && !op.coversCosts) return false
        if (onlyPrepare && !recurrenceSignal(op)) return false
        if (!showExpired && daysLeft(op.deadline) !== null && (daysLeft(op.deadline) || 0) < 0) return false

        if (!q) return true

        return cleanText([
          op.title,
          op.organization,
          op.countryName,
          op.city,
          op.summary,
          op.notes,
          op.recurrenceNotes,
          ...safeArr(op.disciplines),
          ...safeArr(op.keywords),
        ].join(' ')).includes(q)
      })
      .sort((a, b) => {
        const sa = recurrenceSignal(a)?.priority || 0
        const sb = recurrenceSignal(b)?.priority || 0
        if (sa !== sb) return sb - sa

        if (activeScout) return (b._matchScore || 0) - (a._matchScore || 0)

        const da = daysLeft(a.deadline)
        const db = daysLeft(b.deadline)

        if (da === null && db === null) return 0
        if (da === null) return 1
        if (db === null) return -1
        return da - db
      })
  }, [allOpportunities, search, typeFilter, countryFilter, onlyCosts, showExpired, onlyPrepare, activeScout])

  const types = useMemo(() => Array.from(new Set(allOpportunities.map(o => o.type).filter(Boolean))).sort(), [allOpportunities])
  const countries = useMemo(() => Array.from(new Set(allOpportunities.map(o => o.countryName || o.country).filter(Boolean))).sort(), [allOpportunities])

  const urgentCount = useMemo(() => allOpportunities.filter(op => {
    const d = daysLeft(op.deadline)
    return d !== null && d >= 0 && d <= 14
  }).length, [allOpportunities])

  const prepareCount = useMemo(() => allOpportunities.filter(op => recurrenceSignal(op)).length, [allOpportunities])

  function saveOpportunity(op: Opportunity) {
    if (!op.title.trim()) {
      alert('Título obrigatório.')
      return
    }

    const updated = { ...op, updatedAt: new Date().toISOString() }
    const exists = manual.some(o => o.id === updated.id)

    persist(exists ? manual.map(o => o.id === updated.id ? updated : o) : [updated, ...manual])
    setEditing(null)
    setQuickEdit(null)
  }

  function quickUpdate(id: string, field: keyof Opportunity, value: any) {
    const isManual = manual.some(o => o.id === id)

    if (!isManual) {
      const op = allOpportunities.find(o => o.id === id)
      if (!op) return
      persist([{ ...op, [field]: value, source: 'editado', updatedAt: new Date().toISOString() }, ...manual])
    } else {
      persist(manual.map(o => o.id === id ? { ...o, [field]: value, updatedAt: new Date().toISOString() } : o))
    }
  }

  function deleteOpportunity(id: string) {
    if (!confirm('Apagar esta oportunidade?')) return
    persist(manual.filter(o => o.id !== id))
    setEditing(null)
  }

  function duplicateToEdit(op: Opportunity) {
    setEditing({
      ...emptyOpportunity(),
      ...op,
      id: manual.some(o => o.id === op.id) ? op.id : crypto.randomUUID(),
      _fromWeb: undefined,
      _matchScore: undefined,
      _matchReasons: undefined,
      updatedAt: new Date().toISOString(),
    })
  }

  function assignArtist() {
    if (!assigning) return

    const artist = artists.find(a => a.id === selectedArtistId)
    if (!artist) {
      alert('Selecciona um artista.')
      return
    }

    const name = artist.artisticName || artist.name || 'Artista'
    quickUpdate(assigning.id, 'assignedArtistId', artist.id)
    quickUpdate(assigning.id, 'assignedArtistName', name)
    setAssigning(null)
    setSelectedArtistId('')
  }

  async function handleCsv(file: File) {
    const text = await file.text()
    const parsed = parseCsv(text)
    persist([...parsed, ...manual])
    alert(`${parsed.length} oportunidades importadas.`)
    if (fileRef.current) fileRef.current.value = ''
  }

  function exportCsv() {
    const headers = [
      'title',
      'organization',
      'type',
      'country',
      'city',
      'deadline',
      'openingDate',
      'recurrence',
      'usualOpeningMonth',
      'usualDeadlineMonth',
      'recurrenceConfidence',
      'preparationStatus',
      'disciplines',
      'keywords',
      'coversCosts',
      'link',
      'summary',
      'notes',
      'recurrenceNotes',
      'source',
    ]

    const rows = filteredBase.map(op =>
      [
        op.title,
        op.organization,
        op.type,
        op.countryName,
        op.city,
        op.deadline,
        op.openingDate,
        op.recurrence,
        op.usualOpeningMonth,
        op.usualDeadlineMonth,
        op.recurrenceConfidence,
        op.preparationStatus,
        op.disciplines,
        op.keywords,
        op.coversCosts ? 'true' : 'false',
        op.link,
        op.summary,
        op.notes,
        op.recurrenceNotes,
        op.source,
      ].map(escapeCsv).join(','),
    )

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `soma-oportunidades-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function renderCard(op: Opportunity, isWeb = false) {
    const isManual = manual.some(m => m.id === op.id)
    const dl = deadlineLabel(op.deadline)
    const signal = recurrenceSignal(op)
    const hasScore = !isWeb && activeScout && op._matchScore !== undefined
    const scoreColor = (op._matchScore || 0) >= 60 ? '#6ef3a5' : (op._matchScore || 0) >= 35 ? '#ffcf5c' : 'rgba(255,255,255,0.4)'
    const typeKey = (op.type || '').toLowerCase()
    const typeColor = TYPE_COLORS[typeKey] || 'rgba(255,255,255,0.5)'
    const typeIcon = TYPE_ICONS[typeKey] || '📌'
    const urgent = dl && (daysLeft(op.deadline) || 999) <= 7 && (daysLeft(op.deadline) || -1) >= 0
    const isQuickEdit = quickEdit === op.id
    const recInfo = RECURRENCE_OPTIONS.find(r => r.value === op.recurrence)
    const confidence = CONFIDENCE_OPTIONS.find(c => c.value === op.recurrenceConfidence)
    const prep = PREPARATION_OPTIONS.find(p => p.value === op.preparationStatus)

    return (
      <article
        key={op.id}
        style={{
          ...st.card,
          borderColor: isWeb
            ? 'rgba(96,180,232,0.4)'
            : urgent
              ? 'rgba(255,138,138,0.5)'
              : signal
                ? `${signal.color}60`
                : hasScore && (op._matchScore || 0) >= 60
                  ? 'rgba(110,243,165,0.3)'
                  : 'rgba(255,255,255,0.08)',
          background: isWeb ? 'rgba(26,105,148,0.05)' : '#111',
        }}
      >
        <div style={st.cardTop}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ ...st.typeTag, color: typeColor, borderColor: `${typeColor}50`, background: `${typeColor}15` }}>
              {isWeb ? '🌐 ' : `${typeIcon} `}{op.type || 'edital'}
            </span>

            {recInfo && !isWeb && (
              <span style={{ fontSize: 10, color: recInfo.color, opacity: 0.8 }}>{recInfo.label}</span>
            )}

            {signal && (
              <span style={{ ...st.signalTag, color: signal.color, borderColor: `${signal.color}45`, background: `${signal.color}12` }}>
                ⏳ {signal.label}
              </span>
            )}

            {hasScore && (
              <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor }}>{op._matchScore}%</span>
            )}
          </div>

          {dl && <span style={{ fontSize: 11, fontWeight: 700, color: dl.color }}>{dl.text}</span>}
        </div>

        <h3 style={st.cardTitle}>{op.title}</h3>

        <p style={st.cardMeta}>
          {[op.organization, op.city, op.countryName || op.country].filter(Boolean).join(' · ') || 'Sem entidade'}
        </p>

        {op.assignedArtistName && (
          <div style={st.artistTag}>🎤 {op.assignedArtistName}</div>
        )}

        {hasScore && op._matchReasons && op._matchReasons.length > 0 && (
          <div style={st.reasons}>
            {op._matchReasons.map((r, i) => <span key={i}>✓ {r}</span>)}
          </div>
        )}

        <p style={st.summary}>{op.summary || op.description || 'Sem resumo ainda.'}</p>

        {(op.usualOpeningMonth || op.usualDeadlineMonth || op.recurrenceNotes) && (
          <div style={st.recurrenceBox}>
            <div style={st.recurrenceBoxTitle}>🔁 Inteligência de recorrência</div>
            <div style={st.recurrenceMiniGrid}>
              {op.usualOpeningMonth && <span>Abre: <strong>{monthName(op.usualOpeningMonth)}</strong></span>}
              {op.usualDeadlineMonth && <span>Deadline: <strong>{monthName(op.usualDeadlineMonth)}</strong></span>}
              {confidence && <span>Confiança: <strong style={{ color: confidence.color }}>{confidence.label}</strong></span>}
              {prep && <span>Estado: <strong style={{ color: prep.color }}>{prep.label}</strong></span>}
            </div>
            {op.recurrenceNotes && <p style={st.recurrenceNotes}>{op.recurrenceNotes}</p>}
          </div>
        )}

        <div style={st.tags}>
          {safeArr(op.disciplines).slice(0, 4).map(d => <span key={d} style={st.tag}>{d}</span>)}
          {op.coversCosts && <span style={st.costTag}>custos cobertos</span>}
          {!activeScout && !isWeb && (
            <span style={st.sourceTag}>{isManual ? op.source || 'manual' : 'base'}</span>
          )}
        </div>

        {op.notes && !isQuickEdit && (
          <div style={st.notesBox}>📝 {op.notes}</div>
        )}

        {isQuickEdit && !isWeb && (
          <div style={st.quickEditBox}>
            <div style={st.quickEditGrid}>
              <div>
                <span style={st.qLabel}>Deadline candidatura</span>
                <input style={st.qInput} type="date" defaultValue={op.deadline || ''}
                  onBlur={e => quickUpdate(op.id, 'deadline', e.target.value)} />
              </div>

              <div>
                <span style={st.qLabel}>Data de abertura</span>
                <input style={st.qInput} type="date" defaultValue={op.openingDate || ''}
                  onBlur={e => quickUpdate(op.id, 'openingDate', e.target.value)} />
              </div>

              <div>
                <span style={st.qLabel}>Recorrência</span>
                <select style={st.qInput} defaultValue={op.recurrence || 'anual'}
                  onChange={e => quickUpdate(op.id, 'recurrence', e.target.value)}>
                  {RECURRENCE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div>
                <span style={st.qLabel}>Estado preparação</span>
                <select style={st.qInput} defaultValue={op.preparationStatus || 'mapear'}
                  onChange={e => quickUpdate(op.id, 'preparationStatus', e.target.value)}>
                  {PREPARATION_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <div>
                <span style={st.qLabel}>Mês habitual abertura</span>
                <select style={st.qInput} defaultValue={op.usualOpeningMonth || ''}
                  onChange={e => quickUpdate(op.id, 'usualOpeningMonth', e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">—</option>
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div>
                <span style={st.qLabel}>Mês habitual deadline</span>
                <select style={st.qInput} defaultValue={op.usualDeadlineMonth || ''}
                  onChange={e => quickUpdate(op.id, 'usualDeadlineMonth', e.target.value ? Number(e.target.value) : undefined)}>
                  <option value="">—</option>
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div>
                <span style={st.qLabel}>Confiança previsão</span>
                <select style={st.qInput} defaultValue={op.recurrenceConfidence || 'media'}
                  onChange={e => quickUpdate(op.id, 'recurrenceConfidence', e.target.value)}>
                  {CONFIDENCE_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <span style={st.qLabel}>Link oficial</span>
                <input style={st.qInput} defaultValue={op.link || ''} placeholder="https://..."
                  onBlur={e => quickUpdate(op.id, 'link', e.target.value)} />
              </div>
            </div>

            <span style={st.qLabel}>Notas de recorrência</span>
            <textarea style={st.qTextarea} defaultValue={op.recurrenceNotes || ''}
              placeholder="Ex: abre todos os anos entre março e abril; preparar materiais em janeiro..."
              onBlur={e => quickUpdate(op.id, 'recurrenceNotes', e.target.value)} />

            <span style={st.qLabel}>Notas internas</span>
            <textarea style={st.qTextarea} defaultValue={op.notes || ''}
              placeholder="Estratégia, histórico, contactos, como apresentar..."
              onBlur={e => quickUpdate(op.id, 'notes', e.target.value)} />

            <button style={st.qDoneBtn} onClick={() => setQuickEdit(null)}>✓ Fechar edição</button>
          </div>
        )}

        <div style={st.cardActions}>
          {op.link && (
            <a href={op.link} target="_blank" rel="noopener noreferrer" style={st.link}>ver →</a>
          )}

          {!isWeb && (
            <button style={st.editQuickBtn} onClick={() => setQuickEdit(isQuickEdit ? null : op.id)}>
              {isQuickEdit ? '✓ Fechar' : '✏️ Editar'}
            </button>
          )}

          <button style={st.analysisBtn} onClick={() => openAnalysis(op)} disabled={loadingAnalysis}>
            🔬 Análise
          </button>

          {!isWeb && <ProposeOpportunityButton opportunity={op} />}

          <button style={st.secondaryBtn} onClick={() => { setAssigning(op); setSelectedArtistId(op.assignedArtistId || '') }}>
            Associar
          </button>

          {isWeb
            ? <button style={st.primaryBtn} onClick={() => saveWebOpportunity(op)}>💾 Guardar</button>
            : <button style={st.secondaryBtn} onClick={() => duplicateToEdit(op)}>{isManual ? 'Editar mais' : 'Duplicar'}</button>
          }

          {isManual && !isWeb && (
            <button style={st.dangerBtn} onClick={() => deleteOpportunity(op.id)}>✕</button>
          )}
        </div>
      </article>
    )
  }

  return (
    <div style={st.wrap}>
      <header style={st.header}>
        <div>
          <h1 style={st.title}>Oportunidades</h1>
          <p style={st.subtitle}>
            {activeScout
              ? `${filteredBase.length} relevantes de ${allOpportunities.length} · Scout: ${activeScout.name}`
              : `${filteredBase.length} de ${allOpportunities.length}`}
            {webResults.length > 0 && ` · ${webResults.length} novas`}
            {urgentCount > 0 && <span style={{ color: '#ff8a8a', marginLeft: 8 }}>⚠️ {urgentCount} urgentes</span>}
            {prepareCount > 0 && <span style={{ color: '#ffcf5c', marginLeft: 8 }}>⏳ {prepareCount} a preparar</span>}
          </p>
        </div>

        <div style={st.headerActions}>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleCsv(f) }} />
          <button style={st.secondaryBtn} onClick={() => fileRef.current?.click()}>📥 CSV</button>
          <button style={st.secondaryBtn} onClick={exportCsv}>📤 Exportar</button>
          <button style={st.primaryBtn} onClick={() => setEditing(emptyOpportunity())}>+ Nova</button>
        </div>
      </header>

      <ScoutUrlExtractor onSave={handleScoutSave} />
      <ScoutSavedSearches onSave={handleScoutCallback} />

      {activeScout && (
        <div style={st.scoutBanner}>
          <div>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>🔍</span>
            <strong> {activeScout.name}</strong>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginLeft: 8 }}>
              {safeArr(activeScout.searchQueries).length} queries multilíngues
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {webLoading && <span style={{ color: '#60b4e8', fontSize: 12 }}>⟳ A pesquisar com Gemini...</span>}
            {webNote && !webLoading && (
              <span style={{ fontSize: 12, color: webMethod === 'grounding' ? '#6ef3a5' : '#ffcf5c' }}>
                {webMethod === 'grounding' ? '🌐' : '🧠'} {webNote}
              </span>
            )}
            {webError && !webLoading && <span style={{ color: '#ff8a8a', fontSize: 12 }}>⚠ {webError}</span>}
            <button style={st.clearBtn} onClick={clearScout}>× Limpar</button>
          </div>
        </div>
      )}

      <section style={st.toolbar}>
        <input style={st.input}
          placeholder="Pesquisar título, organização, país, disciplina..."
          value={search}
          onChange={e => { setSearch(e.target.value); if (activeScout) setActiveScout(null) }} />

        <select style={st.select} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          {types.map(t => <option key={t} value={t}>{TYPE_ICONS[t] || '📌'} {t}</option>)}
        </select>

        <select style={st.select} value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
          <option value="todos">Todos os países</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <label style={st.check}>
          <input type="checkbox" checked={onlyCosts} onChange={e => setOnlyCosts(e.target.checked)} />
          Custos cobertos
        </label>

        <label style={st.check}>
          <input type="checkbox" checked={onlyPrepare} onChange={e => setOnlyPrepare(e.target.checked)} />
          A preparar
        </label>

        <label style={st.check}>
          <input type="checkbox" checked={showExpired} onChange={e => setShowExpired(e.target.checked)} />
          Mostrar expiradas
        </label>
      </section>

      {webResults.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={st.sectionHeader}>
            <h2 style={st.sectionTitle}>
              {webMethod === 'grounding' ? '🌐 Google Search' : '🧠 Gemini'} — {webResults.length} encontradas
            </h2>
            <p style={st.sectionSub}>
              Guarda as relevantes → edita recorrência → associa ao artista/projeto.
            </p>
          </div>
          <div style={st.grid}>{webResults.map(op => renderCard(op, true))}</div>
        </section>
      )}

      <section>
        {activeScout && filteredBase.length > 0 && (
          <div style={st.sectionHeader}>
            <h2 style={st.sectionTitle}>
              📁 Base — {filteredBase.length} relevantes
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginLeft: 8 }}>
                (score ≥ {SCORE_THRESHOLD}%)
              </span>
            </h2>
          </div>
        )}

        {filteredBase.length === 0 && (
          <div style={st.empty}>
            <p>{activeScout ? 'Nenhuma oportunidade relevante na base.' : 'Nenhuma oportunidade encontrada.'}</p>
            <p style={{ opacity: 0.6, fontSize: 12 }}>Usa o Scout, importa CSV ou adiciona manualmente.</p>
          </div>
        )}

        <div style={st.grid}>{filteredBase.map(op => renderCard(op, false))}</div>
      </section>

      {assigning && (
        <div style={st.overlay}>
          <div style={st.smallModal}>
            <h2 style={st.modalTitle}>Associar artista</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 14 }}>{assigning.title}</p>

            <label style={st.label}>Artista
              <select style={st.input} value={selectedArtistId} onChange={e => setSelectedArtistId(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {artists.map(a => <option key={a.id} value={a.id}>{a.artisticName || a.name || 'Artista'}</option>)}
              </select>
            </label>

            <div style={st.modalFooter}>
              <button style={st.secondaryBtn} onClick={() => setAssigning(null)}>Cancelar</button>
              <button style={st.primaryBtn} onClick={assignArtist}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div style={st.overlay}>
          <div style={st.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={st.modalTitle}>{manual.some(o => o.id === editing.id) ? 'Editar' : 'Nova'} oportunidade</h2>
              <button style={st.secondaryBtn} onClick={() => setEditing(null)}>Fechar</button>
            </div>

            <div style={st.formGrid}>
              <label style={st.label}>Título *
                <input style={st.input} value={editing.title}
                  onChange={e => setEditing({ ...editing, title: e.target.value })} />
              </label>

              <label style={st.label}>Organização / Venue
                <input style={st.input} value={editing.organization || ''}
                  onChange={e => setEditing({ ...editing, organization: e.target.value })} />
              </label>

              <label style={st.label}>Tipo
                <select style={st.input} value={editing.type || 'open_call'}
                  onChange={e => setEditing({ ...editing, type: e.target.value })}>
                  <option value="residencia">🏠 Residência</option>
                  <option value="open_call">📋 Open Call / Edital</option>
                  <option value="festival">🎪 Festival</option>
                  <option value="showcase">🎤 Showcase</option>
                  <option value="premio">🏆 Prémio</option>
                  <option value="beca">🎓 Beca / Bolsa</option>
                  <option value="mobilidade">✈️ Mobilidade</option>
                  <option value="financiamento">💰 Financiamento</option>
                  <option value="subvencao">🏛️ Subvenção</option>
                  <option value="associacao">🤝 Edital associação</option>
                  <option value="projeto_social">🌱 Projeto social</option>
                  <option value="educacao">📚 Educação artística</option>
                  <option value="mediacao">🧭 Mediação cultural</option>
                  <option value="venue">🏛 Venue / Espaço cultural</option>
                  <option value="festa">🎉 Festa / Noite / Ciclo</option>
                  <option value="clube">🎧 Clube nocturno</option>
                </select>
              </label>

              <label style={st.label}>Recorrência
                <select style={st.input} value={editing.recurrence || 'anual'}
                  onChange={e => setEditing({ ...editing, recurrence: e.target.value as Recurrence })}>
                  {RECURRENCE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>

              <label style={st.label}>País
                <input style={st.input} value={editing.countryName || editing.country || ''}
                  onChange={e => setEditing({ ...editing, countryName: e.target.value, country: e.target.value })} />
              </label>

              <label style={st.label}>Cidade
                <input style={st.input} value={editing.city || ''}
                  onChange={e => setEditing({ ...editing, city: e.target.value })} />
              </label>

              <label style={st.label}>📅 Deadline
                <input style={st.input} type="date" value={editing.deadline || ''}
                  onChange={e => setEditing({ ...editing, deadline: e.target.value })} />
              </label>

              <label style={st.label}>🔓 Data de abertura
                <input style={st.input} type="date" value={editing.openingDate || ''}
                  onChange={e => setEditing({ ...editing, openingDate: e.target.value })} />
              </label>

              <label style={st.label}>Mês habitual abertura
                <select style={st.input} value={editing.usualOpeningMonth || ''}
                  onChange={e => setEditing({ ...editing, usualOpeningMonth: e.target.value ? Number(e.target.value) : undefined })}>
                  <option value="">—</option>
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </label>

              <label style={st.label}>Mês habitual deadline
                <select style={st.input} value={editing.usualDeadlineMonth || ''}
                  onChange={e => setEditing({ ...editing, usualDeadlineMonth: e.target.value ? Number(e.target.value) : undefined })}>
                  <option value="">—</option>
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </label>

              <label style={st.label}>Confiança recorrência
                <select style={st.input} value={editing.recurrenceConfidence || 'media'}
                  onChange={e => setEditing({ ...editing, recurrenceConfidence: e.target.value as RecurrenceConfidence })}>
                  {CONFIDENCE_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>

              <label style={st.label}>Estado preparação
                <select style={st.input} value={editing.preparationStatus || 'mapear'}
                  onChange={e => setEditing({ ...editing, preparationStatus: e.target.value as PreparationStatus })}>
                  {PREPARATION_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </label>

              <label style={st.label}>Link oficial
                <input style={st.input} value={editing.link || ''}
                  onChange={e => setEditing({ ...editing, link: e.target.value })} />
              </label>

              <label style={st.label}>Disciplinas
                <input style={st.input} value={joinTags(editing.disciplines)}
                  onChange={e => setEditing({ ...editing, disciplines: splitTags(e.target.value) })}
                  placeholder="performance, teatro, cinema, audiovisual..." />
              </label>
            </div>

            <label style={st.check}>
              <input type="checkbox" checked={Boolean(editing.coversCosts)}
                onChange={e => setEditing({ ...editing, coversCosts: e.target.checked })} />
              Cobre custos
            </label>

            <label style={{ ...st.label, marginTop: 12 }}>Resumo / Descrição
              <textarea style={st.textarea} value={editing.summary || ''}
                onChange={e => setEditing({ ...editing, summary: e.target.value, description: e.target.value })} />
            </label>

            <label style={st.label}>Notas de recorrência
              <textarea style={st.textarea} value={editing.recurrenceNotes || ''}
                onChange={e => setEditing({ ...editing, recurrenceNotes: e.target.value })}
                placeholder="Ex: abre todos os anos em março; preparar material em janeiro..." />
            </label>

            <label style={st.label}>Notas internas
              <textarea style={st.textarea} value={editing.notes || ''}
                onChange={e => setEditing({ ...editing, notes: e.target.value })}
                placeholder="Estratégia, histórico, contactos, como apresentar..." />
            </label>

            <div style={st.modalFooter}>
              <button style={st.secondaryBtn} onClick={() => setEditing(null)}>Cancelar</button>
              {manual.some(o => o.id === editing.id) && (
                <button style={st.dangerBtn} onClick={() => deleteOpportunity(editing.id)}>Apagar</button>
              )}
              <button style={st.primaryBtn} onClick={() => saveOpportunity(editing)}>💾 Guardar</button>
            </div>
          </div>
        </div>
      )}

      {analysisOp && analysisArtist && !loadingAnalysis && (
        <SomaAnalysisModal
          opportunity={{
            title: analysisOp.title,
            organization: analysisOp.organization,
            type: analysisOp.type,
            countryName: analysisOp.countryName,
            city: analysisOp.city,
            summary: analysisOp.summary,
            link: analysisOp.link,
            disciplines: safeArr(analysisOp.disciplines),
            keywords: safeArr(analysisOp.keywords),
            coversCosts: analysisOp.coversCosts,
            deadline: analysisOp.deadline,
          }}
          artist={analysisArtist}
          onClose={() => { setAnalysisOp(null); setAnalysisArtist(null) }}
        />
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────

const st: Record<string, CSSProperties> = {
  wrap: { maxWidth: 1180, margin: '0 auto', padding: '28px 22px', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20 },
  headerActions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 30, color: '#60b4e8' },
  subtitle: { margin: '5px 0 0', color: 'rgba(255,255,255,0.48)', fontSize: 13 },

  scoutBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: 'rgba(26,105,148,0.12)', border: '1px solid rgba(26,105,148,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13 },
  clearBtn: { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer' },

  toolbar: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 22 },
  input: { width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '10px 12px', fontSize: 13, boxSizing: 'border-box', outline: 'none' },
  select: { background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '10px 12px', fontSize: 13, minWidth: 150 },
  check: { display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.65)', fontSize: 13, whiteSpace: 'nowrap' },

  sectionHeader: { marginBottom: 12 },
  sectionTitle: { margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 600 },
  sectionSub: { fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, marginBottom: 28 },
  card: { background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeTag: { fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, border: '1px solid' },
  signalTag: { fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, border: '1px solid' },
  cardTitle: { margin: '0 0 4px', fontSize: 16, lineHeight: 1.3 },
  cardMeta: { color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: '0 0 6px' },
  artistTag: { fontSize: 11, color: '#6ef3a5', background: 'rgba(110,243,165,0.08)', border: '1px solid rgba(110,243,165,0.2)', borderRadius: 6, padding: '4px 8px', marginBottom: 6, display: 'inline-block' },
  reasons: { display: 'flex', flexDirection: 'column', gap: 2, color: '#6ef3a5', fontSize: 11, marginBottom: 8 },
  summary: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.45, minHeight: 40, margin: '6px 0' },

  recurrenceBox: { marginTop: 10, background: 'rgba(255,207,92,0.045)', border: '1px solid rgba(255,207,92,0.16)', borderRadius: 8, padding: 10 },
  recurrenceBoxTitle: { color: '#ffcf5c', fontSize: 11, fontWeight: 700, marginBottom: 6 },
  recurrenceMiniGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.55)' },
  recurrenceNotes: { margin: '8px 0 0', color: 'rgba(255,255,255,0.48)', fontSize: 12, lineHeight: 1.4 },

  tags: { display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 },
  tag: { fontSize: 11, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', padding: '2px 8px', borderRadius: 20 },
  costTag: { fontSize: 11, background: 'rgba(110,243,165,0.1)', color: '#6ef3a5', padding: '2px 8px', borderRadius: 20 },
  sourceTag: { fontSize: 11, background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)', padding: '2px 8px', borderRadius: 20 },
  notesBox: { marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,207,92,0.05)', border: '1px solid rgba(255,207,92,0.15)', borderRadius: 6, padding: '6px 10px' },

  quickEditBox: { marginTop: 12, padding: 14, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 },
  quickEditGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
  qLabel: { display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 },
  qInput: { width: '100%', background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '8px 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box' },
  qTextarea: { width: '100%', background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '8px 10px', fontSize: 12, outline: 'none', resize: 'vertical', minHeight: 60, boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 8 },
  qDoneBtn: { background: 'rgba(110,243,165,0.1)', color: '#6ef3a5', border: '1px solid rgba(110,243,165,0.25)', borderRadius: 6, padding: '6px 12px', fontSize: 11, cursor: 'pointer', marginTop: 8 },

  cardActions: { display: 'flex', justifyContent: 'flex-end', gap: 5, flexWrap: 'wrap', marginTop: 12 },
  link: { color: '#60b4e8', textDecoration: 'none', fontSize: 12, alignSelf: 'center' },
  editQuickBtn: { background: 'rgba(255,207,92,0.1)', color: '#ffcf5c', border: '1px solid rgba(255,207,92,0.25)', borderRadius: 7, padding: '6px 10px', fontSize: 11, cursor: 'pointer' },
  analysisBtn: { background: 'rgba(192,132,252,0.1)', color: '#c084fc', border: '1px solid rgba(192,132,252,0.25)', borderRadius: 7, padding: '6px 10px', fontSize: 11, cursor: 'pointer' },

  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.45)', padding: 40, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12 },

  primaryBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 13px', fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  secondaryBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '7px 11px', fontSize: 12, cursor: 'pointer' },
  dangerBtn: { background: 'rgba(255,70,70,0.1)', color: '#ff8a8a', border: '1px solid rgba(255,70,70,0.2)', borderRadius: 8, padding: '7px 10px', fontSize: 12, cursor: 'pointer' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { width: 'min(900px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: '#000', border: '1px solid #1A6994', borderRadius: 16, padding: 22 },
  smallModal: { width: 'min(500px, 100%)', background: '#000', border: '1px solid #1A6994', borderRadius: 16, padding: 22 },
  modalTitle: { margin: '0 0 4px', color: '#60b4e8', fontSize: 20 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 },
  label: { display: 'flex', flexDirection: 'column', gap: 5, color: 'rgba(255,255,255,0.55)', fontSize: 12, marginBottom: 10 },
  textarea: { width: '100%', minHeight: 90, background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: 12, fontSize: 13, boxSizing: 'border-box', outline: 'none', resize: 'vertical', fontFamily: 'inherit' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
}