// src/components/MatchView.tsx
// SOMA ODÉ — Oportunidades com Google Search Grounding
// Scout executa:
//   1. BASE: filtra oportunidades registadas com score >= 45
//   2. WEB: Gemini + Google Search em tempo real → editais reais actuais

import { useEffect, useMemo, useRef, useState } from 'react'
import ScoutUrlExtractor from './ScoutUrlExtractor'
import ScoutSavedSearches from './ScoutSavedSearches'
import ProposeOpportunityButton from './ProposeOpportunityButton'
import { mockOpportunities } from '../data/mockOpportunities'
import { realOpportunities } from '../data/realOpportunities'

// ─── Helper ───────────────────────────────────────────────
function safeArr(val: any): string[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string' && val.trim()) return val.split(',').map((s: string) => s.trim()).filter(Boolean)
  return []
}

// ─── Tipos ────────────────────────────────────────────────

type Opportunity = {
  id: string
  title: string
  organization?: string
  type?: string
  country?: string
  countryName?: string
  countryCode?: string
  city?: string
  disciplines?: string[]
  languages?: string[]
  deadline?: string
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

type ArtistLite = { id: string; artisticName?: string; name?: string; legalName?: string }

type SavedSearch = {
  id: string
  name: string
  query: string
  countries: string
  disciplines: string
  languages: string
  maxResults: number
  artistId?: string
  artistName?: string
  projectId?: string
  projectName?: string
}

const STORAGE_KEY = 'soma-manual-opportunities-v1'
const ARTISTS_KEY = 'soma-artists-v2'
const SCORE_THRESHOLD = 45

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
    id: crypto.randomUUID(), title: '', organization: '', type: 'Edital',
    country: '', countryName: '', city: '', disciplines: [], languages: [],
    deadline: '', summary: '', description: '', link: '', keywords: [],
    coversCosts: false, status: 'open', source: 'manual',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
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
  if (d === null) return 'sem deadline'
  if (d < 0) return 'prazo passou'
  if (d === 0) return 'hoje'
  if (d <= 30) return `${d} dias`
  return deadline ?? ''
}

// ─── Scoring por projecto ─────────────────────────────────

function scoreOpportunity(op: Opportunity, search: SavedSearch): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  const searchDiscs = safeArr(search.disciplines).map(d => cleanText(d.replace(/^[^\s]+ /, '')))
  const opDiscs = safeArr(op.disciplines).map(d => cleanText(d))
  const opText = cleanText([op.title, op.summary, op.description, ...safeArr(op.keywords)].join(' '))

  // Disciplinas — peso principal
  if (searchDiscs.length > 0 && opDiscs.length > 0) {
    const matches = searchDiscs.filter(sd => opDiscs.some(od => od.includes(sd) || sd.includes(od) || opText.includes(sd)))
    if (matches.length > 0) {
      score += Math.min(40, matches.length * 15)
      reasons.push(`Disciplina: ${matches.slice(0, 2).join(', ')}`)
    } else {
      score -= 20
    }
  }

  // Keywords do projecto
  const queryWords = cleanText(search.query).split(/\s+/)
    .filter(w => w.length > 4 && !['para', 'como', 'open', 'call', 'residencia', 'festival', 'artes', 'musica'].includes(w))
  const kwMatches = queryWords.filter(w => opText.includes(w))
  if (kwMatches.length > 0) {
    score += Math.min(30, kwMatches.length * 8)
    reasons.push(`${kwMatches.length} palavras-chave`)
  }

  // País
  if (search.countries) {
    const searchCountries = search.countries.split(',').map(c => cleanText(c.trim())).filter(c => c.length > 2 && !c.includes('→'))
    const opCountry = cleanText(op.countryName || op.country || '')
    if (searchCountries.some(c => opCountry.includes(c) || c.includes(opCountry)) && opCountry) {
      score += 20
      reasons.push(`País: ${op.countryName || op.country}`)
    }
  }

  if (op.coversCosts) { score += 10; reasons.push('Cobre custos') }

  const dias = daysLeft(op.deadline)
  if (dias !== null && dias < 0) score -= 15

  return { score: Math.max(0, Math.min(100, score)), reasons }
}

// ─── Busca Gemini com Google Search Grounding ─────────────

function buildCleanQuery(search: SavedSearch): string {
  const disciplines = safeArr(search.disciplines)
    .map(d => d.replace(/^[^\s]+ /, '').toLowerCase())
    .filter((d, i, arr) => arr.indexOf(d) === i)
    .slice(0, 3)
    .join(' ')

  const countries = search.countries
    .split(',')
    .map(c => c.trim())
    .filter(c => !c.includes('→') && c.length > 2)
    .slice(0, 3)
    .join(' ')

  const year = new Date().getFullYear()
  return `open call edital residência artística ${disciplines} ${countries} ${year} ${year + 1}`
}

async function searchWebWithGemini(search: SavedSearch): Promise<{ results: Opportunity[]; note: string }> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada')

  const cleanQuery = buildCleanQuery(search)
  const year = new Date().getFullYear()

  const disciplines = safeArr(search.disciplines)
    .map(d => d.replace(/^[^\s]+ /, ''))
    .filter((d, i, arr) => arr.indexOf(d) === i)
    .slice(0, 4).join(', ')

  const countries = search.countries.split(',')
    .filter(c => !c.includes('→') && c.trim().length > 2)
    .slice(0, 5).join(', ')

  const prompt = `Pesquisa na web oportunidades culturais REAIS e ABERTAS (${year}-${year + 1}) para:

ARTISTA: ${search.artistName || 'Artista da diáspora afro-lusófona'}
PROJECTO: ${search.projectName || 'Não especificado'}
DISCIPLINAS: ${disciplines}
PAÍSES: ${countries || 'Europa, Brasil'}
IDIOMAS: ${search.languages || 'PT, EN, ES'}

Busca especificamente: "${cleanQuery}"

Encontra ${Math.min(search.maxResults || 8, 10)} oportunidades com candidaturas ABERTAS agora.
Prioridade: residências artísticas, open calls, editais com custos cobertos.
IMPORTANTE: Só inclui oportunidades com links reais e verificáveis.
NÃO inventar — só resultados reais encontrados na pesquisa.

Responde com JSON:
{
  "opportunities": [
    {
      "title": "nome exacto",
      "organization": "organização",
      "country": "país em português",
      "countryCode": "código ISO 2 letras",
      "city": "cidade",
      "type": "Residência|Open Call|Edital|Festival|Prémio",
      "deadline": "YYYY-MM-DD ou null",
      "coversCosts": true,
      "summary": "2-3 frases em português",
      "link": "URL oficial",
      "disciplines": ["disciplina1"],
      "keywords": ["keyword1", "keyword2"]
    }
  ]
}`

  // ✅ CORRIGIDO: modelo actualizado para gemini-2.5-flash
  const model = 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  // ✅ Google Search Grounding activado
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ googleSearch: {} }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    // Fallback sem googleSearch se billing não activo
    if (err?.error?.code === 429 || err?.error?.code === 403) {
      console.warn('[MatchView] Google Search não disponível, usando conhecimento interno...')
      return searchWithoutGrounding(search, prompt)
    }
    throw new Error(`Gemini error ${res.status}: ${JSON.stringify(err).substring(0, 200)}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  if (!text || text.length < 50) {
    console.warn('[MatchView] Resposta vazia com grounding, usando fallback...')
    return searchWithoutGrounding(search, prompt)
  }

  const results = parseGeminiResponse(text)
  const hasGrounding = !!data.candidates?.[0]?.groundingMetadata?.webSearchQueries

  return {
    results,
    note: `${results.length} oportunidades encontradas${hasGrounding ? ' via Google Search' : ' via Gemini'} para: ${disciplines}`,
  }
}

async function searchWithoutGrounding(search: SavedSearch, prompt: string): Promise<{ results: Opportunity[]; note: string }> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  // ✅ CORRIGIDO: modelo actualizado para gemini-2.5-flash
  const model = 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
    }),
  })

  if (!res.ok) throw new Error('Gemini fallback também falhou')

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const results = parseGeminiResponse(text)

  const disciplines = safeArr(search.disciplines).map(d => d.replace(/^[^\s]+ /, '')).slice(0, 3).join(', ')
  return { results, note: `${results.length} sugestões Gemini (conhecimento interno) para: ${disciplines}` }
}

function parseGeminiResponse(text: string): Opportunity[] {
  try {
    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0])
    const opps = parsed.opportunities || []

    return opps
      .filter((op: any) => op.title && (op.link || op.organization))
      .map((op: any) => ({
        id: crypto.randomUUID(),
        title: op.title,
        organization: op.organization || '',
        type: op.type || 'Edital',
        country: op.countryCode || op.country || '',
        countryName: op.country || '',
        countryCode: op.countryCode || '',
        city: op.city || '',
        disciplines: safeArr(op.disciplines),
        languages: [],
        keywords: safeArr(op.keywords),
        deadline: op.deadline || '',
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
    console.error('[MatchView] Erro ao parsear Gemini:', err)
    return []
  }
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
      organization: get('organization', 'organizacao'), type: get('type', 'tipo') || 'Edital',
      country: get('country', 'pais'), countryName: get('country', 'pais'),
      city: get('city', 'cidade'), disciplines: splitTags(get('disciplines', 'disciplinas')),
      languages: splitTags(get('languages', 'idiomas')), deadline: get('deadline', 'prazo'),
      summary: get('summary', 'resumo'), link: get('link', 'url'),
      keywords: splitTags(get('keywords', 'tags')),
      coversCosts: ['sim', 'yes', 'true', '1'].includes(cleanText(get('coversCosts', 'custos'))),
      status: 'open', source: 'csv', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
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
  const [activeScout, setActiveScout] = useState<SavedSearch | null>(null)
  const [webResults, setWebResults] = useState<Opportunity[]>([])
  const [webLoading, setWebLoading] = useState(false)
  const [webError, setWebError] = useState('')
  const [webNote, setWebNote] = useState('')

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
      type: op.type || 'Edital',
      country: op.country || '',
      countryName: op.countryName || op.country || '',
      disciplines: safeArr(op.disciplines),
      languages: safeArr(op.languages),
      keywords: safeArr(op.keywords || op.themes),
      status: op.status || 'open',
    }))
    const seen = new Set<string>()
    return normalized.filter(op => {
      const key = cleanText(`${op.title}-${op.organization}-${op.deadline}`)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [manual])

  async function handleScoutExecute(savedSearch: SavedSearch) {
    setActiveScout(savedSearch)
    setSearch(savedSearch.query)
    setWebResults([])
    setWebError('')
    setWebNote('')
    setTypeFilter('todos')
    setOnlyCosts(false)

    setWebLoading(true)
    try {
      const { results, note } = await searchWebWithGemini(savedSearch)
      setWebResults(results)
      setWebNote(note)
    } catch (err: any) {
      setWebError(err.message || 'Erro ao buscar na web.')
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
    setActiveScout(null); setSearch(''); setWebResults([])
    setWebError(''); setWebNote('')
  }

  function saveWebOpportunity(op: Opportunity) {
    const toSave = { ...op, source: 'web_scout', _fromWeb: undefined, _matchScore: undefined, _matchReasons: undefined }
    persist([toSave, ...getManualOpportunities()])
    setWebResults(prev => prev.filter(w => w.id !== op.id))
    alert('Oportunidade guardada na base.')
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
        if (!q || activeScout) return true
        return cleanText([op.title, op.organization, op.countryName, op.city, op.summary, ...safeArr(op.disciplines), ...safeArr(op.keywords)].join(' ')).includes(q)
      })
      .sort((a, b) => {
        if (activeScout) return (b._matchScore || 0) - (a._matchScore || 0)
        return (daysLeft(a.deadline) ?? 9999) - (daysLeft(b.deadline) ?? 9999)
      })
  }, [allOpportunities, search, typeFilter, countryFilter, onlyCosts, activeScout])

  const types = useMemo(() => Array.from(new Set(allOpportunities.map(o => o.type || 'Edital'))).sort(), [allOpportunities])
  const countries = useMemo(() => Array.from(new Set(allOpportunities.map(o => o.countryName || o.country).filter(Boolean))).sort(), [allOpportunities])

  function persist(next: Opportunity[]) { setManual(next); saveManualOpportunities(next) }

  function saveOpportunity(op: Opportunity) {
    if (!op.title.trim()) { alert('Título obrigatório.'); return }
    const updated = { ...op, updatedAt: new Date().toISOString() }
    const exists = manual.some(o => o.id === updated.id)
    persist(exists ? manual.map(o => o.id === updated.id ? updated : o) : [updated, ...manual])
    setEditing(null)
  }

  function deleteOpportunity(id: string) {
    if (!confirm('Apagar?')) return
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
    const updated = { ...assigning, assignedArtistId: artist.id, assignedArtistName: name, updatedAt: new Date().toISOString() }
    const exists = manual.some(o => o.id === updated.id)
    persist(exists ? manual.map(o => o.id === updated.id ? updated : o) : [updated, ...manual])
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
    const headers = ['title', 'organization', 'type', 'country', 'city', 'deadline', 'disciplines', 'keywords', 'coversCosts', 'link', 'summary', 'source']
    const rows = filteredBase.map(op => [op.title, op.organization, op.type, op.countryName, op.city, op.deadline, op.disciplines, op.keywords, op.coversCosts ? 'true' : 'false', op.link, op.summary, op.source].map(escapeCsv).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `soma-oportunidades-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // ─── RENDER ──────────────────────────────────────────────

  return (
    <div style={st.wrap}>

      <header style={st.header}>
        <div>
          <h1 style={st.title}>Oportunidades</h1>
          <p style={st.subtitle}>
            {activeScout
              ? `${filteredBase.length} relevantes de ${allOpportunities.length} · Scout: ${activeScout.name}`
              : `${filteredBase.length} de ${allOpportunities.length}`}
            {webResults.length > 0 && ` · ${webResults.length} novas da web`}
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

      {/* BANNER SCOUT ACTIVO */}
      {activeScout && (
        <div style={st.scoutBanner}>
          <div>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>🔍 Scout:</span>
            <strong> {activeScout.name}</strong>
            {activeScout.artistName && <span style={{ color: '#60b4e8' }}> · {activeScout.artistName}</span>}
            {activeScout.projectName && <span style={{ color: '#ffcf5c' }}> · {activeScout.projectName}</span>}
            {activeScout.disciplines && (
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginLeft: 8 }}>
                [{safeArr(activeScout.disciplines.split(',')).map(d => d.replace(/^[^\s]+ /, '')).join(', ')}]
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {webLoading && (
              <span style={{ color: '#60b4e8', fontSize: 12 }}>
                ⟳ Google Search a pesquisar editais reais...
              </span>
            )}
            {webNote && !webLoading && <span style={{ color: '#6ef3a5', fontSize: 12 }}>✓ {webNote}</span>}
            {webError && !webLoading && <span style={{ color: '#ff8a8a', fontSize: 12 }}>⚠ {webError}</span>}
            <button style={st.clearBtn} onClick={clearScout}>× Limpar</button>
          </div>
        </div>
      )}

      {/* FILTROS normais */}
      {!activeScout && (
        <section style={st.toolbar}>
          <input style={st.input} placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
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
            Só custos cobertos
          </label>
        </section>
      )}

      {/* RESULTADOS WEB — Google Search Grounding */}
      {webResults.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={st.sectionHeader}>
            <h2 style={st.sectionTitle}>
              🌐 Google Search encontrou {webResults.length} oportunidades reais
              <span style={{ color: '#60b4e8', fontSize: 11, marginLeft: 8 }}>
                para: {safeArr(activeScout?.disciplines?.split(',') || []).map(d => d.replace(/^[^\s]+ /, '')).slice(0, 3).join(', ')}
              </span>
            </h2>
          </div>
          <div style={st.grid}>
            {webResults.map(op => (
              <article key={op.id} style={{ ...st.card, borderColor: 'rgba(96,180,232,0.4)', background: 'rgba(26,105,148,0.05)' }}>
                <div style={st.cardTop}>
                  <span style={{ ...st.badge, background: 'rgba(96,180,232,0.2)', color: '#60b4e8' }}>🌐 {op.type}</span>
                  <span style={{ fontSize: 12, color: (daysLeft(op.deadline) ?? 999) <= 30 ? '#ffcf5c' : 'rgba(255,255,255,0.4)' }}>
                    {deadlineLabel(op.deadline)}
                  </span>
                </div>
                <h3 style={st.cardTitle}>{op.title}</h3>
                <p style={st.meta}>{[op.organization, op.city, op.countryName].filter(Boolean).join(' · ')}</p>
                <p style={st.summary}>{op.summary || 'Sem resumo.'}</p>
                <div style={st.tags}>
                  {safeArr(op.disciplines).slice(0, 3).map(d => <span key={d} style={st.tag}>{d}</span>)}
                  {op.coversCosts && <span style={st.costTag}>custos cobertos</span>}
                </div>
                <div style={st.cardActions}>
                  {op.link && <a href={op.link} target="_blank" rel="noopener noreferrer" style={st.link}>ver edital →</a>}
                  <button style={st.primaryBtn} onClick={() => saveWebOpportunity(op)}>💾 Guardar</button>
                  <button style={st.secondaryBtn} onClick={() => duplicateToEdit(op)}>Editar</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* RESULTADOS BASE */}
      <section>
        {activeScout && (
          <div style={st.sectionHeader}>
            <h2 style={st.sectionTitle}>
              📁 Base — {filteredBase.length} relevantes
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginLeft: 8 }}>(score ≥ {SCORE_THRESHOLD}%)</span>
            </h2>
          </div>
        )}

        {filteredBase.length === 0 && (
          <div style={st.empty}>
            <p>{activeScout ? `Nenhuma oportunidade relevante na base para "${safeArr(activeScout.disciplines?.split(',')).map(d => d.replace(/^[^\s]+ /, '')).join(', ')}"` : 'Nenhuma oportunidade encontrada.'}</p>
            <p style={{ opacity: 0.6, fontSize: 12 }}>Guarda oportunidades da web ou importa CSV.</p>
          </div>
        )}

        <div style={st.grid}>
          {filteredBase.map(op => {
            const isManual = manual.some(m => m.id === op.id)
            const urgent = (daysLeft(op.deadline) ?? 999) <= 14 && (daysLeft(op.deadline) ?? -1) >= 0
            const hasScore = activeScout && op._matchScore !== undefined
            const scoreColor = (op._matchScore || 0) >= 70 ? '#6ef3a5' : (op._matchScore || 0) >= 50 ? '#ffcf5c' : 'rgba(255,255,255,0.4)'

            return (
              <article key={op.id} style={{
                ...st.card,
                borderColor: hasScore && (op._matchScore || 0) >= 70
                  ? 'rgba(110,243,165,0.35)'
                  : urgent ? 'rgba(255,207,92,0.35)' : 'rgba(255,255,255,0.09)'
              }}>
                <div style={st.cardTop}>
                  <span style={st.badge}>{op.type || 'Edital'}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {hasScore && <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor }}>{op._matchScore}%</span>}
                    <span style={{ fontSize: 12, color: urgent ? '#ffcf5c' : 'rgba(255,255,255,0.4)' }}>{deadlineLabel(op.deadline)}</span>
                  </div>
                </div>
                <h3 style={st.cardTitle}>{op.title}</h3>
                <p style={st.meta}>{[op.organization, op.city, op.countryName || op.country].filter(Boolean).join(' · ') || 'Sem entidade'}</p>
                {hasScore && op._matchReasons && op._matchReasons.length > 0 && (
                  <div style={st.reasons}>{op._matchReasons.map((r, i) => <span key={i}>✓ {r}</span>)}</div>
                )}
                <p style={st.summary}>{op.summary || op.description || 'Sem resumo.'}</p>
                <div style={st.tags}>
                  {safeArr(op.disciplines).slice(0, 4).map(d => <span key={d} style={st.tag}>{d}</span>)}
                  {op.coversCosts && <span style={st.costTag}>custos cobertos</span>}
                  {!activeScout && <span style={st.sourceTag}>{isManual ? 'manual' : 'base'}</span>}
                </div>
                <div style={st.cardActions}>
                  {op.link && <a href={op.link} target="_blank" rel="noopener noreferrer" style={st.link}>ver edital →</a>}
                  <ProposeOpportunityButton opportunity={op} />
                  <button style={st.secondaryBtn} onClick={() => { setAssigning(op); setSelectedArtistId(op.assignedArtistId || '') }}>Associar</button>
                  <button style={st.secondaryBtn} onClick={() => duplicateToEdit(op)}>{isManual ? 'Editar' : 'Duplicar'}</button>
                  {isManual && <button style={st.dangerBtn} onClick={() => deleteOpportunity(op.id)}>✕</button>}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* MODAL ASSOCIAR */}
      {assigning && (
        <div style={st.overlay}>
          <div style={st.smallModal}>
            <h2 style={st.modalTitle}>Associar artista</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 14 }}>{assigning.title}</p>
            <label style={st.label}>Artista
              <select style={st.input} value={selectedArtistId} onChange={e => setSelectedArtistId(e.target.value)}>
                <option value="">Seleccionar</option>
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

      {/* MODAL EDITAR */}
      {editing && (
        <div style={st.overlay}>
          <div style={st.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={st.modalTitle}>{manual.some(o => o.id === editing.id) ? 'Editar' : 'Nova'} oportunidade</h2>
              <button style={st.secondaryBtn} onClick={() => setEditing(null)}>Fechar</button>
            </div>
            <div style={st.formGrid}>
              {(['title', 'organization', 'type', 'countryName', 'city', 'link'] as (keyof Opportunity)[]).map(field => (
                <label key={field} style={st.label}>{field === 'countryName' ? 'País' : field === 'title' ? 'Título' : field === 'organization' ? 'Organização' : field === 'type' ? 'Tipo' : field === 'city' ? 'Cidade' : 'Link'}
                  <input style={st.input} value={(editing as any)[field] || ''}
                    onChange={e => setEditing({ ...editing, [field]: e.target.value })} />
                </label>
              ))}
              <label style={st.label}>Deadline
                <input style={st.input} type="date" value={editing.deadline || ''}
                  onChange={e => setEditing({ ...editing, deadline: e.target.value })} />
              </label>
              <label style={st.label}>Disciplinas
                <input style={st.input} value={joinTags(editing.disciplines)}
                  onChange={e => setEditing({ ...editing, disciplines: splitTags(e.target.value) })} />
              </label>
            </div>
            <label style={st.check}>
              <input type="checkbox" checked={Boolean(editing.coversCosts)}
                onChange={e => setEditing({ ...editing, coversCosts: e.target.checked })} />
              Cobre custos
            </label>
            <label style={{ ...st.label, marginTop: 12 }}>Resumo
              <textarea style={st.textarea} value={editing.summary || ''}
                onChange={e => setEditing({ ...editing, summary: e.target.value, description: e.target.value })} />
            </label>
            <div style={st.modalFooter}>
              <button style={st.secondaryBtn} onClick={() => setEditing(null)}>Cancelar</button>
              {manual.some(o => o.id === editing.id) && <button style={st.dangerBtn} onClick={() => deleteOpportunity(editing.id)}>Apagar</button>}
              <button style={st.primaryBtn} onClick={() => saveOpportunity(editing)}>Guardar</button>
            </div>
          </div>
        </div>
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
  select: { background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '10px 12px', fontSize: 13, minWidth: 160 },
  check: { display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.68)', fontSize: 13 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, marginBottom: 28 },
  card: { background: '#111', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: 16 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { background: 'rgba(26,105,148,0.24)', color: '#60b4e8', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 800 },
  cardTitle: { margin: '0 0 4px', fontSize: 16 },
  meta: { color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: '0 0 6px' },
  reasons: { display: 'flex', flexDirection: 'column', gap: 2, color: '#6ef3a5', fontSize: 11, marginBottom: 8 },
  summary: { color: 'rgba(255,255,255,0.62)', fontSize: 13, lineHeight: 1.45, minHeight: 44, margin: '6px 0' },
  tags: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 },
  tag: { fontSize: 11, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', padding: '2px 8px', borderRadius: 20 },
  costTag: { fontSize: 11, background: 'rgba(110,243,165,0.12)', color: '#6ef3a5', padding: '2px 8px', borderRadius: 20 },
  sourceTag: { fontSize: 11, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)', padding: '2px 8px', borderRadius: 20 },
  cardActions: { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: 14 },
  link: { color: '#60b4e8', textDecoration: 'none', fontSize: 13, alignSelf: 'center' },
  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.45)', padding: 40, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12, marginBottom: 24 },
  primaryBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer' },
  secondaryBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer' },
  dangerBtn: { background: 'rgba(255,70,70,0.12)', color: '#ff8a8a', border: '1px solid rgba(255,70,70,0.25)', borderRadius: 8, padding: '8px 10px', fontSize: 12, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { width: 'min(900px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: '#000', border: '1px solid #1A6994', borderRadius: 16, padding: 22 },
  smallModal: { width: 'min(500px, 100%)', background: '#000', border: '1px solid #1A6994', borderRadius: 16, padding: 22 },
  modalTitle: { margin: '0 0 4px', color: '#60b4e8', fontSize: 22 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, color: 'rgba(255,255,255,0.55)', fontSize: 12, marginBottom: 12 },
  textarea: { width: '100%', minHeight: 100, background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: 12, fontSize: 13, boxSizing: 'border-box', outline: 'none', resize: 'vertical' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
}