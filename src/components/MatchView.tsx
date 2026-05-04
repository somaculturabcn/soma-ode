// src/components/MatchView.tsx
// SOMA ODÉ — Oportunidades
// Cards totalmente editáveis: deadline, abertura, recorrência, notas
// Scout por disciplina → encontra → edita → associa a artista → propõe

import { useEffect, useMemo, useRef, useState } from 'react'
import ScoutUrlExtractor from './ScoutUrlExtractor'
import ScoutSavedSearches from './ScoutSavedSearches'
import ProposeOpportunityButton from './ProposeOpportunityButton'
import SomaAnalysisModal, { type ArtistForAnalysis } from './SomaAnalysisModal'
import { mockOpportunities } from '../data/mockOpportunities'
import { realOpportunities } from '../data/realOpportunities'
import { loadArtistsFromSupabase } from '../data/artistsSupabaseStore'

// ─── Helper ───────────────────────────────────────────────
function safeArr(val: any): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string' && val.trim()) return val.split(',').map((s: string) => s.trim()).filter(Boolean)
  return []
}

// ─── Tipos ────────────────────────────────────────────────

type Recurrence = 'anual' | 'semestral' | 'irregular' | 'unica'

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
  openingDate?: string       // data de abertura
  recurrence?: Recurrence    // recorrência
  nextEdition?: string       // próxima edição prevista
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
  notes?: string             // notas internas
  createdAt?: string
  updatedAt?: string
  _matchScore?: number
  _matchReasons?: string[]
  _fromWeb?: boolean
}

type ArtistLite = { id: string; artisticName?: string; name?: string; legalName?: string }

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
}

const STORAGE_KEY = 'soma-manual-opportunities-v1'
const ARTISTS_KEY = 'soma-artists-v2'
const SCORE_THRESHOLD = 45

const RECURRENCE_OPTIONS: { value: Recurrence; label: string; color: string }[] = [
  { value: 'anual', label: '🔄 Anual', color: '#6ef3a5' },
  { value: 'semestral', label: '🔄 Semestral', color: '#60b4e8' },
  { value: 'irregular', label: '⚡ Irregular', color: '#ffcf5c' },
  { value: 'unica', label: '1️⃣ Única', color: 'rgba(255,255,255,0.5)' },
]

const TYPE_COLORS: Record<string, string> = {
  residency: '#6ef3a5',
  residencia: '#6ef3a5',
  festival: '#ffcf5c',
  open_call: '#60b4e8',
  showcase: '#ff9f5c',
  grant: '#c084fc',
  premio: '#c084fc',
  mobilidade: '#38bdf8',
  financiamento: '#4ade80',
  venue: 'rgba(255,255,255,0.45)',
}

// ─── Utilitários ──────────────────────────────────────────

function getManualOpportunities(): Opportunity[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveManualOpportunities(data: Opportunity[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
function getArtists(): ArtistLite[] {
  try {
    const p = JSON.parse(localStorage.getItem(ARTISTS_KEY) || '[]')
    return Array.isArray(p) ? p : []
  } catch { return [] }
}
function emptyOpportunity(): Opportunity {
  return {
    id: crypto.randomUUID(), title: '', organization: '', type: 'open_call',
    country: '', countryName: '', city: '', disciplines: [], languages: [],
    deadline: '', openingDate: '', recurrence: 'anual', summary: '', description: '',
    link: '', keywords: [], coversCosts: false, status: 'open', source: 'manual',
    notes: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
}
function splitTags(v: string) { return v.split(',').map(x => x.trim()).filter(Boolean) }
function joinTags(v?: string[] | string) {
  if (Array.isArray(v)) return v.join(', ')
  return typeof v === 'string' ? v : ''
}
function cleanText(v?: string) {
  return (v || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}
function escapeCsv(v: any) {
  const s = Array.isArray(v) ? v.join(', ') : String(v ?? '')
  return `"${s.replace(/"/g, '""')}"`
}
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

// ─── Scoring simples ──────────────────────────────────────

function scoreOpportunity(op: Opportunity, search: SavedSearch): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  const searchDiscs = safeArr(search.disciplines).map(d => cleanText(d.replace(/^[^\s]+ /, '')))
  const opDiscs = safeArr(op.disciplines).map(d => cleanText(d))
  const opText = cleanText([op.title, op.summary, op.description, ...safeArr(op.keywords)].join(' '))

  if (searchDiscs.length > 0 && opDiscs.length > 0) {
    const matches = searchDiscs.filter(sd => opDiscs.some(od => od.includes(sd) || sd.includes(od) || opText.includes(sd)))
    if (matches.length > 0) {
      score += Math.min(40, matches.length * 15)
      reasons.push(`Disciplina: ${matches.slice(0, 2).join(', ')}`)
    } else score -= 20
  }

  if (search.countries) {
    const sc = search.countries.split(',').map(c => cleanText(c.trim())).filter(c => c.length > 2)
    const opC = cleanText(op.countryName || op.country || '')
    if (sc.some(c => opC.includes(c) || c.includes(opC)) && opC) {
      score += 20; reasons.push(`País: ${op.countryName || op.country}`)
    }
  }

  const queryWords = cleanText(search.query).split(/\s+/).filter(w => w.length > 4)
  const kwMatches = queryWords.filter(w => opText.includes(w))
  if (kwMatches.length > 0) {
    score += Math.min(30, kwMatches.length * 8)
    reasons.push(`${kwMatches.length} palavras-chave`)
  }

  if (op.coversCosts) { score += 10; reasons.push('Cobre custos') }
  const dias = daysLeft(op.deadline)
  if (dias !== null && dias < 0) score -= 15

  return { score: Math.max(0, Math.min(100, score)), reasons }
}

// ─── Gemini web search ────────────────────────────────────

async function searchWebWithGemini(search: SavedSearch): Promise<{ results: Opportunity[]; note: string }> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada')

  const year = new Date().getFullYear()
  const typeLabel = search.opportunityType === 'todos' ? 'oportunidade cultural'
    : { residencia: 'residência artística', open_call: 'open call edital', festival: 'festival', showcase: 'showcase', premio: 'prémio bolsa', mobilidade: 'mobilidade artística', financiamento: 'financiamento cultural' }[search.opportunityType || ''] || 'oportunidade'

  const disciplines = safeArr(search.disciplines).slice(0, 4).join(', ')
  const countries = (search.selectedCountries || search.countries.split(',')).map((c: string) => c.trim()).filter(Boolean).slice(0, 8).join(', ')

  const prompt = `Pesquisa ${typeLabel}s REAIS e ACTUAIS (${year}-${year + 1}) para artistas com prática em: ${disciplines || 'artes performativas, artes visuais'}.

Contexto: representamos artistas negros, migrantes e LGBTQIA+ da diáspora afro-lusófona baseados na Europa.
Países prioritários: ${countries || 'Europa, Brasil'}
Idiomas: PT, EN, ES

Encontra ${Math.min(search.maxResults || 10, 12)} ${typeLabel}s REAIS com:
- Candidaturas abertas agora OU que abrem regularmente (ciclo anual)
- Preferência para: custos cobertos, contexto afrodiaspórico/queer/migrante
- Links verificáveis

Responde APENAS com JSON:
{
  "opportunities": [
    {
      "title": "nome exacto",
      "organization": "organização",
      "country": "país em português",
      "countryCode": "código ISO 2 letras",
      "city": "cidade",
      "type": "residencia|open_call|festival|showcase|premio|mobilidade|financiamento",
      "deadline": "YYYY-MM-DD ou null",
      "openingDate": "YYYY-MM-DD ou null",
      "recurrence": "anual|semestral|irregular|unica",
      "coversCosts": true,
      "summary": "2-3 frases em português — o que é, para quem, o que oferece",
      "link": "URL oficial directa",
      "disciplines": ["performance", "artes visuais"],
      "keywords": ["afrodiaspórico", "queer", "comunidade"]
    }
  ]
}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
      }),
    }
  )

  const data = await res.json()

  if (!res.ok) {
    // Fallback sem grounding
    const res2 = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
        }),
      }
    )
    if (!res2.ok) throw new Error('Gemini indisponível. Tenta novamente.')
    const d2 = await res2.json()
    return { results: parseGemini(d2), note: `Gemini (conhecimento interno) · ${disciplines}` }
  }

  const results = parseGemini(data)
  const hasGrounding = !!data.candidates?.[0]?.groundingMetadata?.webSearchQueries
  return {
    results,
    note: `${results.length} oportunidades${hasGrounding ? ' via Google Search' : ''} · ${disciplines}`,
  }
}

function parseGemini(data: any): Opportunity[] {
  try {
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []
    const parsed = JSON.parse(jsonMatch[0])
    return (parsed.opportunities || [])
      .filter((op: any) => op.title && (op.link || op.organization))
      .map((op: any) => ({
        id: crypto.randomUUID(),
        title: op.title, organization: op.organization || '',
        type: op.type || 'open_call',
        country: op.countryCode || op.country || '',
        countryName: op.country || '', city: op.city || '',
        disciplines: safeArr(op.disciplines), keywords: safeArr(op.keywords),
        deadline: op.deadline || '', openingDate: op.openingDate || '',
        recurrence: op.recurrence || 'anual',
        summary: op.summary || '', description: op.summary || '',
        link: op.link || '', coversCosts: Boolean(op.coversCosts),
        status: 'open', source: 'gemini_web',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        _fromWeb: true,
      }))
  } catch { return [] }
}

function parseCsv(text: string): Opportunity[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(/[;,]/).map(h => cleanText(h).replace(/\s+/g, '_'))
  return lines.slice(1).map(line => {
    const values = line.split(/[;,]/).map(v => v.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    const get = (...keys: string[]) => { for (const k of keys) { const n = cleanText(k).replace(/\s+/g, '_'); if (row[n]) return row[n] } return '' }
    return {
      id: crypto.randomUUID(), title: get('title', 'titulo') || 'Sem título',
      organization: get('organization', 'organizacao'), type: get('type', 'tipo') || 'open_call',
      country: get('country', 'pais'), countryName: get('country', 'pais'),
      city: get('city', 'cidade'), disciplines: splitTags(get('disciplines', 'disciplinas')),
      deadline: get('deadline', 'prazo'), openingDate: get('openingDate', 'abertura'),
      summary: get('summary', 'resumo'), link: get('link', 'url'),
      keywords: splitTags(get('keywords', 'tags')),
      coversCosts: ['sim', 'yes', 'true', '1'].includes(cleanText(get('coversCosts', 'custos'))),
      recurrence: 'anual' as Recurrence, status: 'open', source: 'csv',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
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
  const [activeScout, setActiveScout] = useState<SavedSearch | null>(null)
  const [webResults, setWebResults] = useState<Opportunity[]>([])
  const [webLoading, setWebLoading] = useState(false)
  const [webError, setWebError] = useState('')
  const [webNote, setWebNote] = useState('')
  const [analysisOp, setAnalysisOp] = useState<Opportunity | null>(null)
  const [analysisArtist, setAnalysisArtist] = useState<ArtistForAnalysis | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)

  // Edição rápida inline
  const [quickEdit, setQuickEdit] = useState<string | null>(null) // id do card em edição rápida

  useEffect(() => {
    setManual(getManualOpportunities())
    setArtists(getArtists())
  }, [])

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
    }))
    const seen = new Set<string>()
    return normalized.filter(op => {
      const key = cleanText(`${op.title}-${op.organization}`)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [manual])

  // ─── Scout ────────────────────────────────────────────

  async function handleScoutExecute(savedSearch: SavedSearch) {
    setActiveScout(savedSearch)
    setSearch('')
    setWebResults([])
    setWebError('')
    setWebNote('')

    setWebLoading(true)
    try {
      const { results, note } = await searchWebWithGemini(savedSearch)
      setWebResults(results)
      setWebNote(note)
    } catch (err: any) {
      setWebError(err.message || 'Erro ao buscar. Tenta novamente.')
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

  function handleScoutSave(op: Opportunity) { persist([op, ...getManualOpportunities()]) }

  function clearScout() {
    setActiveScout(null); setSearch(''); setWebResults([])
    setWebError(''); setWebNote('')
  }

  function saveWebOpportunity(op: Opportunity) {
    const toSave = { ...op, source: 'web_scout', _fromWeb: undefined, _matchScore: undefined, _matchReasons: undefined }
    persist([toSave, ...getManualOpportunities()])
    setWebResults(prev => prev.filter(w => w.id !== op.id))
  }

  // ─── Análise SOMA ─────────────────────────────────────

  async function openAnalysis(op: Opportunity) {
    setAnalysisOp(op)
    setLoadingAnalysis(true)
    try {
      if (activeScout?.artistId) {
        const allArtists = await loadArtistsFromSupabase()
        const artist = allArtists.find((a: any) => a.id === activeScout.artistId) as any
        if (artist) {
          setAnalysisArtist({
            name: artist.name || 'Artista',
            bio: artist.bio, origin: artist.origin, base: artist.base,
            disciplines: safeArr(artist.disciplines), languages: safeArr(artist.languages),
            keywords: safeArr(artist.keywords), cartografia: artist.cartografia,
          })
        }
      } else {
        setAnalysisArtist({ name: 'Artista SOMA' })
      }
    } catch { setAnalysisArtist({ name: 'Artista SOMA' }) }
    setLoadingAnalysis(false)
  }

  // ─── Filtros ──────────────────────────────────────────

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
        if (!showExpired && daysLeft(op.deadline) !== null && (daysLeft(op.deadline) || 0) < 0) return false
        if (!q) return true
        return cleanText([op.title, op.organization, op.countryName, op.city, op.summary, op.notes, ...safeArr(op.disciplines), ...safeArr(op.keywords)].join(' ')).includes(q)
      })
      .sort((a, b) => {
        if (activeScout) return (b._matchScore || 0) - (a._matchScore || 0)
        const da = daysLeft(a.deadline)
        const db = daysLeft(b.deadline)
        // Urgentes primeiro, sem deadline no fim
        if (da === null && db === null) return 0
        if (da === null) return 1
        if (db === null) return -1
        return da - db
      })
  }, [allOpportunities, search, typeFilter, countryFilter, onlyCosts, showExpired, activeScout])

  const types = useMemo(() => Array.from(new Set(allOpportunities.map(o => o.type).filter(Boolean))).sort(), [allOpportunities])
  const countries = useMemo(() => Array.from(new Set(allOpportunities.map(o => o.countryName || o.country).filter(Boolean))).sort(), [allOpportunities])

  // Alertas de prazo
  const urgentCount = useMemo(() => allOpportunities.filter(op => {
    const d = daysLeft(op.deadline)
    return d !== null && d >= 0 && d <= 14
  }).length, [allOpportunities])

  function persist(next: Opportunity[]) { setManual(next); saveManualOpportunities(next) }

  function saveOpportunity(op: Opportunity) {
    if (!op.title.trim()) { alert('Título obrigatório.'); return }
    const updated = { ...op, updatedAt: new Date().toISOString() }
    const exists = manual.some(o => o.id === updated.id)
    persist(exists ? manual.map(o => o.id === updated.id ? updated : o) : [updated, ...manual])
    setEditing(null); setQuickEdit(null)
  }

  // Actualização rápida de um campo específico
  function quickUpdate(id: string, field: keyof Opportunity, value: any) {
    const isManual = manual.some(o => o.id === id)
    if (!isManual) {
      // Promover da base para manual para poder editar
      const op = allOpportunities.find(o => o.id === id)
      if (!op) return
      const promoted = { ...op, [field]: value, source: 'editado', updatedAt: new Date().toISOString() }
      persist([promoted, ...manual])
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
      ...emptyOpportunity(), ...op,
      id: manual.some(o => o.id === op.id) ? op.id : crypto.randomUUID(),
      _fromWeb: undefined, _matchScore: undefined, _matchReasons: undefined,
      updatedAt: new Date().toISOString(),
    })
  }

  function assignArtist() {
    if (!assigning) return
    const artist = artists.find(a => a.id === selectedArtistId)
    if (!artist) { alert('Selecciona um artista.'); return }
    const name = artist.artisticName || artist.name || 'Artista'
    quickUpdate(assigning.id, 'assignedArtistId', artist.id)
    quickUpdate(assigning.id, 'assignedArtistName', name)
    setAssigning(null); setSelectedArtistId('')
  }

  async function handleCsv(file: File) {
    const text = await file.text()
    const parsed = parseCsv(text)
    persist([...parsed, ...manual])
    alert(`${parsed.length} oportunidades importadas.`)
    if (fileRef.current) fileRef.current.value = ''
  }

  function exportCsv() {
    const headers = ['title', 'organization', 'type', 'country', 'city', 'deadline', 'openingDate', 'recurrence', 'disciplines', 'keywords', 'coversCosts', 'link', 'summary', 'notes', 'source']
    const rows = filteredBase.map(op => [op.title, op.organization, op.type, op.countryName, op.city, op.deadline, op.openingDate, op.recurrence, op.disciplines, op.keywords, op.coversCosts ? 'true' : 'false', op.link, op.summary, op.notes, op.source].map(escapeCsv).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `soma-oportunidades-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // ─── CARD ─────────────────────────────────────────────

  function renderCard(op: Opportunity, isWeb = false) {
    const isManual = manual.some(m => m.id === op.id)
    const dl = deadlineLabel(op.deadline)
    const hasScore = !isWeb && activeScout && op._matchScore !== undefined
    const scoreColor = (op._matchScore || 0) >= 70 ? '#6ef3a5' : (op._matchScore || 0) >= 50 ? '#ffcf5c' : 'rgba(255,255,255,0.4)'
    const typeColor = TYPE_COLORS[op.type?.toLowerCase() || ''] || 'rgba(255,255,255,0.5)'
    const isQuickEdit = quickEdit === op.id
    const recInfo = RECURRENCE_OPTIONS.find(r => r.value === op.recurrence)

    const urgent = dl && (daysLeft(op.deadline) || 999) <= 7 && (daysLeft(op.deadline) || -1) >= 0

    return (
      <article key={op.id} style={{
        ...st.card,
        borderColor: isWeb ? 'rgba(96,180,232,0.4)' : urgent ? 'rgba(255,138,138,0.5)' : hasScore && (op._matchScore || 0) >= 70 ? 'rgba(110,243,165,0.3)' : 'rgba(255,255,255,0.08)',
        background: isWeb ? 'rgba(26,105,148,0.05)' : '#111',
      }}>

        {/* TOP: tipo + deadline */}
        <div style={st.cardTop}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ ...st.typeTag, color: typeColor, borderColor: `${typeColor}40`, background: `${typeColor}15` }}>
              {isWeb ? '🌐 ' : ''}{op.type || 'open_call'}
            </span>
            {recInfo && !isWeb && (
              <span style={{ fontSize: 10, color: recInfo.color, opacity: 0.7 }}>{recInfo.label}</span>
            )}
            {hasScore && (
              <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor }}>{op._matchScore}%</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {dl && (
              <span style={{ fontSize: 11, fontWeight: 700, color: dl.color }}>{dl.text}</span>
            )}
          </div>
        </div>

        {/* TÍTULO */}
        <h3 style={st.cardTitle}>{op.title}</h3>
        <p style={st.cardMeta}>
          {[op.organization, op.city, op.countryName || op.country].filter(Boolean).join(' · ') || 'Sem entidade'}
        </p>

        {/* ARTISTA ASSOCIADO */}
        {op.assignedArtistName && (
          <div style={st.artistTag}>🎤 {op.assignedArtistName}</div>
        )}

        {/* MATCH REASONS */}
        {hasScore && op._matchReasons && op._matchReasons.length > 0 && (
          <div style={st.reasons}>
            {op._matchReasons.map((r, i) => <span key={i}>✓ {r}</span>)}
          </div>
        )}

        {/* RESUMO */}
        <p style={st.summary}>{op.summary || op.description || 'Sem resumo ainda.'}</p>

        {/* TAGS */}
        <div style={st.tags}>
          {safeArr(op.disciplines).slice(0, 3).map(d => <span key={d} style={st.tag}>{d}</span>)}
          {op.coversCosts && <span style={st.costTag}>custos cobertos</span>}
          {!activeScout && !isWeb && <span style={st.sourceTag}>{isManual ? op.source || 'manual' : 'base'}</span>}
        </div>

        {/* EDIÇÃO RÁPIDA INLINE */}
        {isQuickEdit && !isWeb && (
          <div style={st.quickEditBox}>
            <div style={st.quickEditGrid}>
              <div>
                <label style={st.qLabel}>Deadline</label>
                <input style={st.qInput} type="date" defaultValue={op.deadline || ''}
                  onBlur={e => quickUpdate(op.id, 'deadline', e.target.value)} />
              </div>
              <div>
                <label style={st.qLabel}>Abertura</label>
                <input style={st.qInput} type="date" defaultValue={op.openingDate || ''}
                  onBlur={e => quickUpdate(op.id, 'openingDate', e.target.value)} />
              </div>
              <div>
                <label style={st.qLabel}>Recorrência</label>
                <select style={st.qInput} defaultValue={op.recurrence || 'anual'}
                  onChange={e => quickUpdate(op.id, 'recurrence', e.target.value)}>
                  {RECURRENCE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label style={st.qLabel}>Link</label>
                <input style={st.qInput} defaultValue={op.link || ''} placeholder="https://..."
                  onBlur={e => quickUpdate(op.id, 'link', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={st.qLabel}>Notas internas</label>
              <textarea style={st.qTextarea} defaultValue={op.notes || ''}
                placeholder="Notas, estratégia, contexto, histórico..."
                onBlur={e => quickUpdate(op.id, 'notes', e.target.value)} />
            </div>
            <button style={st.qDoneBtn} onClick={() => setQuickEdit(null)}>✓ Fechar edição</button>
          </div>
        )}

        {/* NOTAS (quando não em edição) */}
        {op.notes && !isQuickEdit && (
          <div style={st.notesBox}>📝 {op.notes}</div>
        )}

        {/* ACÇÕES */}
        <div style={st.cardActions}>
          {op.link && <a href={op.link} target="_blank" rel="noopener noreferrer" style={st.link}>ver edital →</a>}

          {!isWeb && (
            <button style={st.editQuickBtn} onClick={() => setQuickEdit(isQuickEdit ? null : op.id)}
              title="Editar deadline, abertura, recorrência e notas">
              {isQuickEdit ? '✓ Fechar' : '✏️ Editar'}
            </button>
          )}

          <button style={st.analysisBtn} onClick={() => openAnalysis(op)} disabled={loadingAnalysis}
            title="Análise SOMA — Gemini analisa o encaixe com o projecto">
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
          {isManual && !isWeb && <button style={st.dangerBtn} onClick={() => deleteOpportunity(op.id)}>✕</button>}
        </div>
      </article>
    )
  }

  // ─── RENDER ──────────────────────────────────────────────

  return (
    <div style={st.wrap}>

      {/* HEADER */}
      <header style={st.header}>
        <div>
          <h1 style={st.title}>Oportunidades</h1>
          <p style={st.subtitle}>
            {activeScout
              ? `${filteredBase.length} relevantes de ${allOpportunities.length} · Scout: ${activeScout.name}`
              : `${filteredBase.length} de ${allOpportunities.length}`}
            {webResults.length > 0 && ` · ${webResults.length} novas`}
            {urgentCount > 0 && <span style={{ color: '#ff8a8a', marginLeft: 8 }}>⚠️ {urgentCount} urgentes</span>}
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

      {/* BANNER SCOUT */}
      {activeScout && (
        <div style={st.scoutBanner}>
          <div>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>🔍</span>
            <strong> {activeScout.name}</strong>
            {activeScout.selectedDisciplines && activeScout.selectedDisciplines.length > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginLeft: 8 }}>
                [{activeScout.selectedDisciplines.join(', ')}]
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {webLoading && <span style={{ color: '#60b4e8', fontSize: 12 }}>⟳ A pesquisar...</span>}
            {webNote && !webLoading && <span style={{ color: '#6ef3a5', fontSize: 12 }}>✓ {webNote}</span>}
            {webError && !webLoading && <span style={{ color: '#ff8a8a', fontSize: 12 }}>⚠ {webError}</span>}
            <button style={st.clearBtn} onClick={clearScout}>× Limpar</button>
          </div>
        </div>
      )}

      {/* FILTROS */}
      <section style={st.toolbar}>
        <input style={st.input} placeholder="Pesquisar..." value={search} onChange={e => { setSearch(e.target.value); setActiveScout(null) }} />
        <select style={st.select} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
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
          <input type="checkbox" checked={showExpired} onChange={e => setShowExpired(e.target.checked)} />
          Mostrar expiradas
        </label>
      </section>

      {/* RESULTADOS WEB */}
      {webResults.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={st.sectionHeader}>
            <h2 style={st.sectionTitle}>🌐 Google Search — {webResults.length} oportunidades encontradas</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
              Guarda as relevantes → edita deadline e notas → associa ao artista certo
            </p>
          </div>
          <div style={st.grid}>{webResults.map(op => renderCard(op, true))}</div>
        </section>
      )}

      {/* RESULTADOS BASE */}
      <section>
        {activeScout && filteredBase.length > 0 && (
          <div style={st.sectionHeader}>
            <h2 style={st.sectionTitle}>
              📁 Base — {filteredBase.length} relevantes
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginLeft: 8 }}>(≥ {SCORE_THRESHOLD}% match)</span>
            </h2>
          </div>
        )}
        {filteredBase.length === 0 && (
          <div style={st.empty}>
            <p>Nenhuma oportunidade encontrada.</p>
            <p style={{ opacity: 0.6, fontSize: 12 }}>Usa o Scout para encontrar novas, ou importa CSV.</p>
          </div>
        )}
        <div style={st.grid}>{filteredBase.map(op => renderCard(op, false))}</div>
      </section>

      {/* MODAL ASSOCIAR */}
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

      {/* MODAL EDITAR COMPLETO */}
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
              <label style={st.label}>Organização
                <input style={st.input} value={editing.organization || ''}
                  onChange={e => setEditing({ ...editing, organization: e.target.value })} />
              </label>
              <label style={st.label}>Tipo
                <select style={st.input} value={editing.type || 'open_call'}
                  onChange={e => setEditing({ ...editing, type: e.target.value })}>
                  <option value="residencia">🏠 Residência</option>
                  <option value="open_call">📋 Open Call</option>
                  <option value="festival">🎪 Festival</option>
                  <option value="showcase">🎤 Showcase</option>
                  <option value="grant">🏆 Prémio / Bolsa</option>
                  <option value="mobilidade">✈️ Mobilidade</option>
                  <option value="financiamento">💰 Financiamento</option>
                  <option value="venue">🏠 Venue</option>
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
              <label style={st.label}>📅 Deadline candidatura
                <input style={st.input} type="date" value={editing.deadline || ''}
                  onChange={e => setEditing({ ...editing, deadline: e.target.value })} />
              </label>
              <label style={st.label}>🔓 Data de abertura
                <input style={st.input} type="date" value={editing.openingDate || ''}
                  onChange={e => setEditing({ ...editing, openingDate: e.target.value })} />
              </label>
              <label style={st.label}>Link oficial
                <input style={st.input} value={editing.link || ''}
                  onChange={e => setEditing({ ...editing, link: e.target.value })} />
              </label>
              <label style={st.label}>Disciplinas
                <input style={st.input} value={joinTags(editing.disciplines)}
                  onChange={e => setEditing({ ...editing, disciplines: splitTags(e.target.value) })} />
              </label>
            </div>
            <label style={st.check}>
              <input type="checkbox" checked={Boolean(editing.coversCosts)}
                onChange={e => setEditing({ ...editing, coversCosts: e.target.checked })} />
              Cobre custos (viagem, alojamento, produção, cachê)
            </label>
            <label style={{ ...st.label, marginTop: 12 }}>Resumo / Descrição
              <textarea style={st.textarea} value={editing.summary || ''}
                onChange={e => setEditing({ ...editing, summary: e.target.value, description: e.target.value })} />
            </label>
            <label style={st.label}>Notas internas (estratégia, histórico, contactos)
              <textarea style={st.textarea} value={editing.notes || ''}
                onChange={e => setEditing({ ...editing, notes: e.target.value })} />
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

      {/* MODAL ANÁLISE SOMA */}
      {analysisOp && analysisArtist && !loadingAnalysis && (
        <SomaAnalysisModal
          opportunity={{
            title: analysisOp.title, organization: analysisOp.organization,
            type: analysisOp.type, countryName: analysisOp.countryName,
            city: analysisOp.city, summary: analysisOp.summary,
            link: analysisOp.link, disciplines: safeArr(analysisOp.disciplines),
            keywords: safeArr(analysisOp.keywords), coversCosts: analysisOp.coversCosts,
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

const st: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1180, margin: '0 auto', padding: '28px 22px', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20 },
  headerActions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 30, color: '#60b4e8' },
  subtitle: { margin: '5px 0 0', color: 'rgba(255,255,255,0.48)', fontSize: 13 },

  scoutBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: 'rgba(26,105,148,0.12)', border: '1px solid rgba(26,105,148,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13 },
  clearBtn: { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer' },

  sectionHeader: { marginBottom: 12 },
  sectionTitle: { margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 600 },

  toolbar: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 22 },
  input: { width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '10px 12px', fontSize: 13, boxSizing: 'border-box', outline: 'none' },
  select: { background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '10px 12px', fontSize: 13, minWidth: 150 },
  check: { display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.65)', fontSize: 13, whiteSpace: 'nowrap' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, marginBottom: 28 },

  card: { background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeTag: { fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, border: '1px solid' },
  cardTitle: { margin: '0 0 4px', fontSize: 16, lineHeight: 1.3 },
  cardMeta: { color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: '0 0 6px' },
  artistTag: { fontSize: 11, color: '#6ef3a5', background: 'rgba(110,243,165,0.08)', border: '1px solid rgba(110,243,165,0.2)', borderRadius: 6, padding: '4px 8px', marginBottom: 6, display: 'inline-block' },
  reasons: { display: 'flex', flexDirection: 'column', gap: 2, color: '#6ef3a5', fontSize: 11, marginBottom: 8 },
  summary: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.45, minHeight: 40, margin: '6px 0' },
  tags: { display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 },
  tag: { fontSize: 11, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', padding: '2px 8px', borderRadius: 20 },
  costTag: { fontSize: 11, background: 'rgba(110,243,165,0.1)', color: '#6ef3a5', padding: '2px 8px', borderRadius: 20 },
  sourceTag: { fontSize: 11, background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)', padding: '2px 8px', borderRadius: 20 },
  notesBox: { marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,207,92,0.05)', border: '1px solid rgba(255,207,92,0.15)', borderRadius: 6, padding: '6px 10px' },

  // Edição rápida inline
  quickEditBox: { marginTop: 12, padding: 14, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 },
  quickEditGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
  qLabel: { display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 },
  qInput: { width: '100%', background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '8px 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box' },
  qTextarea: { width: '100%', background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '8px 10px', fontSize: 12, outline: 'none', resize: 'vertical', minHeight: 60, boxSizing: 'border-box', fontFamily: 'inherit' },
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