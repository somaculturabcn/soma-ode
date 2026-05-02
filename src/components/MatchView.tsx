// src/components/MatchView.tsx
// SOMA ODÉ — Oportunidades com busca dupla: base registada + Gemini web
// Quando "Executar" é clicado:
//   1. IMEDIATO: filtra e ordena oportunidades registadas por relevância
//   2. PARALELO: Gemini gera queries localizadas por país e busca na web

import { useEffect, useMemo, useRef, useState } from 'react'
import ScoutUrlExtractor from './ScoutUrlExtractor'
import ScoutSavedSearches from './ScoutSavedSearches'
import ProposeOpportunityButton from './ProposeOpportunityButton'
import { mockOpportunities } from '../data/mockOpportunities'
import { realOpportunities } from '../data/realOpportunities'
import {
  gerarEstrategiaBuscaMultilingue,
  type BuscaEstruturada,
  type QueryLocalizada,
} from '../services/searchStrategyAI'

// ─── Helper: garante sempre array ────────────────────────
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
  regionId?: string
  regionLabel?: string
  disciplines?: string[]
  languages?: string[]
  deadline?: string
  summary?: string
  description?: string
  link?: string
  keywords?: string[]
  themes?: string[]
  genres?: string[]
  requirements?: string[]
  assignedArtistId?: string
  assignedArtistName?: string
  coverage?: { travel?: boolean; accommodation?: boolean; meals?: boolean; production?: boolean; fee?: boolean }
  coversCosts?: boolean
  status?: string
  source?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
  // Campos de resultado de busca
  _matchScore?: number
  _matchReasons?: string[]
  _fromWeb?: boolean
  _idiomaBusca?: string // NOVO: indica em que idioma foi encontrada
}

type ArtistLite = {
  id: string
  artisticName?: string
  name?: string
  legalName?: string
  disciplines?: string[] // NOVO: para busca estruturada
  targetCountries?: string[] // NOVO: países alvo do artista
}

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
  tipoOportunidade?: string // NOVO: tipo de oportunidade (residência, edital, festival...)
}

// ─── Constantes ───────────────────────────────────────────

const STORAGE_KEY = 'soma-manual-opportunities-v1'
const ARTISTS_KEY = 'soma-artists-v2'

// ─── Utilitários ──────────────────────────────────────────

function getManualOpportunities(): Opportunity[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function saveManualOpportunities(data: Opportunity[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function getArtists(): ArtistLite[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(ARTISTS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function emptyOpportunity(): Opportunity {
  return {
    id: crypto.randomUUID(), title: '', organization: '', type: 'Edital',
    country: '', countryName: '', countryCode: '', city: '',
    regionId: '', regionLabel: '', disciplines: [], languages: [], deadline: '',
    summary: '', description: '', link: '', keywords: [], themes: [], genres: [],
    requirements: [], assignedArtistId: '', assignedArtistName: '', coverage: {},
    coversCosts: false, status: 'open', source: 'manual', notes: '',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
}

function splitTags(value: string) {
  return value.split(',').map(x => x.trim()).filter(Boolean)
}

function joinTags(value?: string[] | string) {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'string') return value
  return ''
}

function cleanText(value?: string) {
  return (value || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function escapeCsv(value: any) {
  const str = Array.isArray(value) ? value.join(', ') : String(value ?? '')
  return `"${str.replace(/"/g, '""')}"`
}

function daysLeft(deadline?: string) {
  if (!deadline) return null
  const d = new Date(deadline)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function deadlineLabel(deadline?: string) {
  const days = daysLeft(deadline)
  if (days === null) return 'sem deadline'
  if (days < 0) return 'prazo passou'
  if (days === 0) return 'hoje'
  if (days <= 7) return `${days} dias`
  if (days <= 30) return `${days} dias`
  return deadline ?? ''
}

// ─── Scoring de relevância (busca na base) ────────────────

function scoreOpportunity(op: Opportunity, search: SavedSearch): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  const queryWords = cleanText(search.query).split(/\s+/).filter(w => w.length > 3)
  const opText = cleanText([
    op.title, op.organization, op.summary, op.description,
    ...safeArr(op.disciplines), ...safeArr(op.keywords), ...safeArr(op.themes),
  ].join(' '))

  // Match de palavras da query
  const queryMatches = queryWords.filter(w => opText.includes(w))
  if (queryMatches.length > 0) {
    score += Math.min(40, queryMatches.length * 8)
    reasons.push(`${queryMatches.length} palavras-chave encontradas`)
  }

  // Match de países
  if (search.countries) {
    const searchCountries = search.countries.toLowerCase().split(',').map(s => s.trim())
    const opCountry = cleanText(op.countryName || op.country || '')
    const countryMatch = searchCountries.some(c => opCountry.includes(cleanText(c)) || cleanText(c).includes(opCountry))
    if (countryMatch) {
      score += 20
      reasons.push(`País corresponde (${op.countryName || op.country})`)
    }
  }

  // Match de disciplinas
  if (search.disciplines) {
    const searchDisc = search.disciplines.toLowerCase().split(',').map(s => s.trim())
    const opDisc = safeArr(op.disciplines).map(d => d.toLowerCase())
    const discMatch = searchDisc.filter(d => opDisc.some(od => od.includes(d) || d.includes(od)))
    if (discMatch.length > 0) {
      score += 20
      reasons.push(`Disciplina alinhada: ${discMatch.join(', ')}`)
    }
  }

  // Match de idiomas
  if (search.languages) {
    const searchLangs = search.languages.toLowerCase().split(',').map(s => s.trim())
    const opLangs = safeArr(op.languages).map(l => l.toLowerCase())
    if (!opLangs.length || searchLangs.some(l => opLangs.includes(l))) {
      score += 10
      reasons.push('Idioma compatível')
    }
  }

  // Custos cobertos
  if (op.coversCosts) {
    score += 10
    reasons.push('Cobre custos')
  }

  return { score, reasons }
}

// ─── NOVO: Busca Gemini multilingue e estruturada ────────

/**
 * Busca oportunidades na web com Gemini, gerando uma query localizada
 * para cada país-alvo, no idioma correto, e agregando os resultados.
 */
async function searchWebWithGemini(busca: BuscaEstruturada, maxResults: number = 8): Promise<{ opportunities: Opportunity[]; note: string }> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada. Adicione a chave no Vercel (Settings → Environment Variables).')

  // 1. Gera as queries localizadas por país
  let localizedQueries: QueryLocalizada[] = []
  try {
    localizedQueries = await gerarEstrategiaBuscaMultilingue(busca)
  } catch (err) {
    console.warn('[MatchView] Falha ao gerar queries localizadas, usando fallback.', err)
    // Fallback: usa os países sem tradução
    localizedQueries = busca.paises.map(pais => ({
      pais,
      idioma: 'en',
      query: `${busca.disciplina} ${busca.queryOriginal} ${pais} ${busca.tipoOportunidade || ''}`,
      termosChave: busca.queryOriginal.split(',').map((s: string) => s.trim()),
    }))
  }

  if (localizedQueries.length === 0) {
    // Se não houver países, faz uma busca genérica
    localizedQueries = [{
      pais: '',
      idioma: 'pt',
      query: `${busca.disciplina} ${busca.queryOriginal} ${busca.tipoOportunidade || ''}`,
      termosChave: busca.queryOriginal.split(',').map((s: string) => s.trim()),
    }]
  }

  const currentYear = new Date().getFullYear()
  const model = 'gemini-2.0-flash'
  const url = (key: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`

  // 2. Para cada query localizada, faz uma chamada ao Gemini
  const todasOportunidades: Opportunity[] = []
  const erros: string[] = []

  for (const q of localizedQueries) {
    const systemPrompt = `És um especialista em oportunidades culturais internacionais para artistas da diáspora afro-lusófona.
Pesquisas editais, residências artísticas, festivais, open calls e programas de mobilidade que correspondem ao perfil descrito.
O artista trabalha com ${busca.disciplina} e procura por ${busca.tipoOportunidade || 'oportunidades culturais'}.
Respondes SEMPRE em JSON válido, sem markdown, sem comentários.`

    const userPrompt = `Pesquisa na web oportunidades culturais actuais (${currentYear}-${currentYear + 1}) no país ${q.pais || 'qualquer'}.

Usa esta query otimizada no idioma local (${q.idioma}): "${q.query}"

Termos chave para orientar a busca: ${q.termosChave.join(', ')}

Perfil do artista:
- Disciplina principal: ${busca.disciplina}
- Tipo de oportunidade desejada: ${busca.tipoOportunidade || 'residência, edital, festival'}
- Intenção original: ${busca.queryOriginal}

Encontra até ${Math.ceil(maxResults / localizedQueries.length)} oportunidades REAIS e ACTUAIS (com links verificáveis) em ${q.pais || 'qualquer país'}.

Para cada oportunidade, devolve:
- title: nome da oportunidade
- organization: organização que oferece
- country: país (nome em português)
- countryCode: código ISO (ex: DE, FR, PT)
- city: cidade
- type: Edital | Residência | Festival | Open Call | Prémio | Mobilidade
- deadline: data limite (formato YYYY-MM-DD, null se não encontrada)
- coversCosts: true se cobre viagem/alojamento
- summary: resumo em 2-3 frases em português
- link: URL directo do edital ou página oficial
- disciplines: array de disciplinas aceites
- keywords: array de 3-5 palavras-chave relevantes

Responde APENAS com este JSON:
{
  "opportunities": [
    {
      "title": "...",
      "organization": "...",
      "country": "...",
      "countryCode": "...",
      "city": "...",
      "type": "...",
      "deadline": "...",
      "coversCosts": true,
      "summary": "...",
      "link": "...",
      "disciplines": [],
      "keywords": []
    }
  ]
}`

    try {
      // Primeira tentativa: com Google Search grounding
      const res = await fetch(url(apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
          tools: [{ googleSearch: {} }],
        }),
      })

      let data: any
      if (!res.ok) {
        // Fallback sem googleSearch se não tiver permissão
        const res2 = await fetch(url(apiKey), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
          }),
        })
        if (!res2.ok) {
          const errBody = await res2.json().catch(() => ({}))
          erros.push(`${q.pais} (${q.idioma}): erro HTTP`)
          continue
        }
        data = await res2.json()
      } else {
        data = await res.json()
      }

      const parsed = parseGeminiOpportunitiesFromData(data, q)
      todasOportunidades.push(...parsed)
    } catch (err: any) {
      console.error(`[MatchView] Erro na busca para ${q.pais} (${q.idioma}):`, err)
      erros.push(`${q.pais} (${q.idioma}): ${err.message}`)
    }
  }

  const noteParts: string[] = []
  if (todasOportunidades.length > 0) {
    noteParts.push(`${todasOportunidades.length} oportunidades encontradas`)
  }
  if (localizedQueries.length > 1) {
    noteParts.push(`buscas em ${localizedQueries.length} idiomas`)
  }
  if (erros.length > 0) {
    noteParts.push(`${erros.length} falhas`)
  }

  return {
    opportunities: todasOportunidades,
    note: noteParts.join(' · ') || 'Nenhum resultado encontrado',
  }
}

function parseGeminiOpportunitiesFromData(data: any, queryInfo: QueryLocalizada): Opportunity[] {
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  try {
    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0])
    const opps = parsed.opportunities || []

    return opps.map((op: any) => ({
      id: crypto.randomUUID(),
      title: op.title || 'Oportunidade sem título',
      organization: op.organization || '',
      type: op.type || 'Edital',
      country: op.countryCode || op.country || queryInfo.pais || '',
      countryName: op.country || queryInfo.pais || '',
      countryCode: op.countryCode || '',
      city: op.city || '',
      disciplines: safeArr(op.disciplines),
      languages: safeArr(op.languages),
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
      _idiomaBusca: queryInfo.idioma, // NOVO: idioma em que foi encontrada
    }))
  } catch (err) {
    console.error('[MatchView] Erro ao parsear resposta Gemini:', err)
    return []
  }
}

// ─── Função de parse antiga preservada como fallback ──────
function parseGeminiOpportunities(data: any, search: SavedSearch): Opportunity[] {
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  try {
    const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim()
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return []
    const parsed = JSON.parse(jsonMatch[0])
    const opps = parsed.opportunities || []
    return opps.map((op: any) => ({
      id: crypto.randomUUID(),
      title: op.title || 'Oportunidade sem título',
      organization: op.organization || '',
      type: op.type || 'Edital',
      country: op.countryCode || op.country || '',
      countryName: op.country || '',
      countryCode: op.countryCode || '',
      city: op.city || '',
      disciplines: safeArr(op.disciplines),
      languages: safeArr(op.languages),
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
    console.error('[MatchView] Erro ao parsear resposta Gemini:', err)
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
    const get = (...keys: string[]) => {
      for (const key of keys) { const k = cleanText(key).replace(/\s+/g, '_'); if (row[k]) return row[k] }
      return ''
    }
    return {
      id: crypto.randomUUID(),
      title: get('title', 'titulo', 'título', 'nome', 'name') || 'Oportunidade sem título',
      organization: get('organization', 'organizacao', 'organização'),
      type: get('type', 'tipo') || 'Edital',
      country: get('country', 'pais', 'país'),
      countryName: get('country', 'pais', 'país'),
      countryCode: get('countryCode', 'codigo_pais'),
      city: get('city', 'cidade', 'ciudad'),
      disciplines: splitTags(get('disciplines', 'disciplinas')),
      languages: splitTags(get('languages', 'idiomas')),
      deadline: get('deadline', 'prazo'),
      summary: get('summary', 'resumo'),
      description: get('description', 'descricao'),
      link: get('link', 'url', 'website'),
      keywords: splitTags(get('keywords', 'tags')),
      requirements: splitTags(get('requirements', 'requisitos')),
      coversCosts: ['sim', 'yes', 'true', '1'].includes(cleanText(get('coversCosts', 'custos'))),
      status: 'open', source: 'csv', notes: get('notes', 'notas'),
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

  // Filtros normais
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('todos')
  const [countryFilter, setCountryFilter] = useState('todos')
  const [artistFilter, setArtistFilter] = useState('todos')
  const [onlyCosts, setOnlyCosts] = useState(false)

  // Scout executado
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
      title: op.title || op.name || 'Oportunidade sem título',
      organization: op.organization || op.org || '',
      type: op.type || 'Edital',
      country: op.country || op.countryCode || '',
      countryName: op.countryName || op.country || '',
      disciplines: safeArr(op.disciplines),
      languages: safeArr(op.languages),
      keywords: safeArr(op.keywords || op.themes),
      requirements: safeArr(op.requirements),
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

  // ─── Quando Scout é executado (ATUALIZADO) ─────────────

  async function handleScoutExecute(savedSearch: SavedSearch) {
    // 1. Activar o scout e preencher a barra de pesquisa imediatamente
    setActiveScout(savedSearch)
    setSearch(savedSearch.query)
    setWebResults([])
    setWebError('')
    setWebNote('')

    // 2. Construir a busca estruturada com disciplina, tipo e países
    const artista = artists.find(a => a.id === savedSearch.artistId)
    const disciplinaPrincipal = safeArr(artista?.disciplines || []).join(', ') || savedSearch.disciplines || 'multi-disciplinar'
    const paisesAlvo = savedSearch.countries
      ? savedSearch.countries.split(',').map(s => s.trim()).filter(Boolean)
      : (artista?.targetCountries || [])
    const tipoOportunidade = savedSearch.tipoOportunidade || savedSearch.type || 'residência, edital, festival'

    const busca: BuscaEstruturada = {
      disciplina: disciplinaPrincipal,
      tipoOportunidade: tipoOportunidade,
      paises: paisesAlvo,
      queryOriginal: savedSearch.query,
    }

    // 3. Em paralelo: buscar na web com Gemini (agora multilingue)
    setWebLoading(true)
    try {
      const { opportunities, note } = await searchWebWithGemini(busca, savedSearch.maxResults || 8)
      setWebResults(opportunities)
      setWebNote(note)
    } catch (err: any) {
      console.error('[MatchView] Erro na busca web:', err)
      setWebError(err.message || 'Erro ao buscar na web. Verifica a API key do Gemini no Vercel.')
    } finally {
      setWebLoading(false)
    }
  }

  function handleScoutSave(op: Opportunity) {
    const next = [op, ...getManualOpportunities()]
    persist(next)
  }

  function handleScoutCallback(data: any) {
    // Distinguir entre salvar oportunidade URL e executar busca salva
    if (data && data.query !== undefined && data.name !== undefined) {
      // É uma SavedSearch a ser executada
      handleScoutExecute(data as SavedSearch)
    } else {
      // É uma Opportunity a ser guardada (do URL extractor)
      handleScoutSave(data as Opportunity)
    }
  }

  function clearScout() {
    setActiveScout(null)
    setSearch('')
    setWebResults([])
    setWebError('')
    setWebNote('')
  }

  function saveWebOpportunity(op: Opportunity) {
    const toSave = { ...op, source: 'web_scout', _fromWeb: undefined, _matchScore: undefined, _matchReasons: undefined, _idiomaBusca: undefined }
    const next = [toSave, ...getManualOpportunities()]
    persist(next)
    // Remover dos resultados web (já está guardada)
    setWebResults(prev => prev.filter(w => w.id !== op.id))
    alert('Oportunidade guardada na base.')
  }

  // ─── Filtro e scoring das oportunidades da base ─────────

  const filteredBase: Opportunity[] = useMemo(() => {
    const q = cleanText(search)

    return allOpportunities
      .filter(op => {
        if (typeFilter !== 'todos' && op.type !== typeFilter) return false
        if (countryFilter !== 'todos' && (op.countryName || op.country) !== countryFilter) return false
        if (artistFilter !== 'todos' && op.assignedArtistId !== artistFilter) return false
        if (onlyCosts && !op.coversCosts) return false
        if (!q) return true
        return cleanText([
          op.title, op.organization, op.type, op.country, op.countryName,
          op.city, op.summary, op.description, op.notes, op.assignedArtistName,
          ...safeArr(op.disciplines), ...safeArr(op.keywords),
        ].join(' ')).includes(q)
      })
      .map(op => {
        if (activeScout) {
          const { score, reasons } = scoreOpportunity(op, activeScout)
          return { ...op, _matchScore: score, _matchReasons: reasons }
        }
        return op
      })
      .sort((a, b) => {
        // Se há scout activo, ordenar por score
        if (activeScout) {
          return (b._matchScore || 0) - (a._matchScore || 0)
        }
        // Senão, ordenar por deadline
        const da = daysLeft(a.deadline)
        const db = daysLeft(b.deadline)
        return (da ?? 9999) - (db ?? 9999)
      })
  }, [allOpportunities, search, typeFilter, countryFilter, artistFilter, onlyCosts, activeScout])

  const types = useMemo(() => Array.from(new Set(allOpportunities.map(o => o.type || 'Edital'))).sort(), [allOpportunities])
  const countries = useMemo(() => Array.from(new Set(allOpportunities.map(o => o.countryName || o.country).filter(Boolean))).sort(), [allOpportunities])

  function persist(next: Opportunity[]) { setManual(next); saveManualOpportunities(next) }

  function saveOpportunity(op: Opportunity) {
    if (!op.title.trim()) { alert('A oportunidade precisa de título.'); return }
    const updated = { ...op, updatedAt: new Date().toISOString() }
    const exists = manual.some(o => o.id === updated.id)
    const next = exists ? manual.map(o => o.id === updated.id ? updated : o) : [updated, ...manual]
    persist(next); setEditing(null)
  }

  function deleteOpportunity(id: string) {
    if (!confirm('Apagar esta oportunidade?')) return
    persist(manual.filter(o => o.id !== id)); setEditing(null)
  }

  function duplicateToEdit(op: Opportunity) {
    setEditing({
      ...emptyOpportunity(), ...op,
      id: manual.some(o => o.id === op.id) ? op.id : crypto.randomUUID(),
      source: manual.some(o => o.id === op.id) ? op.source || 'manual' : 'duplicado/editado',
      _fromWeb: undefined, _matchScore: undefined, _matchReasons: undefined, _idiomaBusca: undefined,
      updatedAt: new Date().toISOString(),
    })
  }

  function assignArtistToOpportunity() {
    if (!assigning) return
    const artist = artists.find(a => a.id === selectedArtistId)
    if (!artist) { alert('Seleciona um artista.'); return }
    const artistName = artist.artisticName || artist.name || artist.legalName || 'Artista'
    const updated: Opportunity = { ...assigning, assignedArtistId: artist.id, assignedArtistName: artistName, updatedAt: new Date().toISOString() }
    const exists = manual.some(o => o.id === updated.id)
    const next = exists ? manual.map(o => o.id === updated.id ? updated : o) : [updated, ...manual]
    persist(next); setAssigning(null); setSelectedArtistId('')
  }

  function unassignArtist(op: Opportunity) {
    const updated = { ...op, assignedArtistId: '', assignedArtistName: '', updatedAt: new Date().toISOString() }
    if (!manual.some(o => o.id === updated.id)) return
    persist(manual.map(o => o.id === updated.id ? updated : o))
  }

  async function handleCsv(file: File) {
    const text = await file.text()
    const parsed = parseCsv(text)
    persist([...parsed, ...manual])
    alert(`${parsed.length} oportunidades importadas.`)
    if (fileRef.current) fileRef.current.value = ''
  }

  function exportCsv() {
    const headers = ['title', 'organization', 'type', 'country', 'countryCode', 'city', 'deadline', 'disciplines', 'languages', 'keywords', 'requirements', 'coversCosts', 'assignedArtistName', 'summary', 'link', 'notes', 'source']
    const rows = filteredBase.map(op => [op.title, op.organization, op.type, op.countryName || op.country, op.countryCode, op.city, op.deadline, op.disciplines, op.languages, op.keywords, op.requirements, op.coversCosts ? 'true' : 'false', op.assignedArtistName, op.summary || op.description, op.link, op.notes, op.source].map(escapeCsv).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `soma-oportunidades-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  // ─── RENDER ──────────────────────────────────────────────

  return (
    <div style={st.wrap}>

      {/* HEADER */}
      <header style={st.header}>
        <div>
          <h1 style={st.title}>Oportunidades</h1>
          <p style={st.subtitle}>
            {filteredBase.length} de {allOpportunities.length} na base
            {webResults.length > 0 && ` · ${webResults.length} novas da web`}
            {activeScout && ` · Scout: ${activeScout.name}`}
          </p>
        </div>
        <div style={st.headerActions}>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
            onChange={e => { const file = e.target.files?.[0]; if (file) handleCsv(file) }} />
          <button style={st.secondaryBtn} onClick={() => fileRef.current?.click()}>📥 CSV</button>
          <button style={st.secondaryBtn} onClick={exportCsv}>📤 Exportar</button>
          <button style={st.primaryBtn} onClick={() => setEditing(emptyOpportunity())}>+ Nova</button>
        </div>
      </header>

      {/* SCOUT URL + SCOUT SALVO */}
      <ScoutUrlExtractor onSave={handleScoutSave} />
      <ScoutSavedSearches onSave={handleScoutCallback} />

      {/* SCOUT ACTIVO — banner */}
      {activeScout && (
        <div style={st.scoutBanner}>
          <div>
            <span style={st.scoutBannerLabel}>🔍 Scout activo:</span>
            <strong> {activeScout.name}</strong>
            {activeScout.artistName && <span style={{ color: '#60b4e8' }}> · {activeScout.artistName}</span>}
            {activeScout.projectName && <span style={{ color: '#ffcf5c' }}> · {activeScout.projectName}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {webLoading && <span style={st.loadingDot}>⟳ Gemini a pesquisar na web...</span>}
            {webNote && !webLoading && <span style={{ color: '#6ef3a5', fontSize: 12 }}>✓ {webNote}</span>}
            {webError && <span style={{ color: '#ff8a8a', fontSize: 12 }}>⚠ {webError}</span>}
            <button style={st.clearScoutBtn} onClick={clearScout}>× Limpar scout</button>
          </div>
        </div>
      )}

      {/* FILTROS */}
      <section style={st.toolbar}>
        <input style={st.input}
          placeholder="Pesquisar por título, país, disciplina, artista, keyword..."
          value={search} onChange={e => { setSearch(e.target.value); setActiveScout(null) }} />
        <select style={st.select} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={st.select} value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
          <option value="todos">Todos os países</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select style={st.select} value={artistFilter} onChange={e => setArtistFilter(e.target.value)}>
          <option value="todos">Todos os artistas</option>
          {artists.map(a => <option key={a.id} value={a.id}>{a.artisticName || a.name || 'Artista'}</option>)}
        </select>
        <label style={st.check}>
          <input type="checkbox" checked={onlyCosts} onChange={e => setOnlyCosts(e.target.checked)} />
          Só custos cobertos
        </label>
      </section>

      {/* RESULTADOS WEB DO GEMINI */}
      {webResults.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={st.sectionHeader}>
            <h2 style={st.sectionTitle}>🌐 Novas da web — Gemini encontrou {webResults.length} oportunidades</h2>
          </div>
          <div style={st.grid}>
            {webResults.map(op => (
              <article key={op.id} style={{ ...st.card, borderColor: 'rgba(96,180,232,0.35)', background: 'rgba(26,105,148,0.06)' }}>
                <div style={st.cardTop}>
                  <span style={{ ...st.badge, background: 'rgba(96,180,232,0.2)', color: '#60b4e8' }}>
                    🌐 {op.type || 'Edital'}
                  </span>
                  {/* NOVO: badge com o idioma da busca */}
                  {op._idiomaBusca && (
                    <span style={{ ...st.badge, background: 'rgba(255,207,92,0.15)', color: '#ffcf5c', marginLeft: 6 }}>
                      {op._idiomaBusca.toUpperCase()}
                    </span>
                  )}
                  <span style={{ ...st.deadlineTag, color: daysLeft(op.deadline) !== null && daysLeft(op.deadline)! <= 30 ? '#ffcf5c' : 'rgba(255,255,255,0.45)' }}>
                    {deadlineLabel(op.deadline)}
                  </span>
                </div>
                <h3 style={st.cardTitle}>{op.title}</h3>
                <p style={st.meta}>{[op.organization, op.city, op.countryName || op.country].filter(Boolean).join(' · ')}</p>
                <p style={st.summary}>{op.summary || 'Sem resumo.'}</p>
                <div style={st.tags}>
                  {safeArr(op.disciplines).slice(0, 3).map(d => <span key={d} style={st.tag}>{d}</span>)}
                  {op.coversCosts && <span style={st.costTag}>custos cobertos</span>}
                  <span style={{ ...st.sourceTag, color: '#60b4e8' }}>web</span>
                </div>
                <div style={st.cardActions}>
                  {op.link && <a href={op.link} target="_blank" rel="noopener noreferrer" style={st.link}>ver edital →</a>}
                  <button style={st.primaryBtn} onClick={() => saveWebOpportunity(op)}>💾 Guardar</button>
                  <button style={st.secondaryBtn} onClick={() => duplicateToEdit(op)}>Editar/guardar</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* RESULTADOS DA BASE */}
      <section>
        {activeScout && filteredBase.length > 0 && (
          <div style={st.sectionHeader}>
            <h2 style={st.sectionTitle}>
              📁 Base registada — {filteredBase.length} resultado{filteredBase.length !== 1 ? 's' : ''}
              {activeScout && ' ordenados por relevância'}
            </h2>
          </div>
        )}

        {filteredBase.length === 0 && !webLoading && (
          <div style={st.empty}>
            <p>Nenhuma oportunidade encontrada na base.</p>
            <p style={{ opacity: 0.6, fontSize: 12 }}>
              Importa CSV, usa o Scout por URL, ou adiciona manualmente.
            </p>
          </div>
        )}

        <div style={st.grid}>
          {filteredBase.map(op => {
            const isManual = manual.some(m => m.id === op.id)
            const d = daysLeft(op.deadline)
            const urgent = d !== null && d >= 0 && d <= 30
            const disciplines = safeArr(op.disciplines)
            const hasScore = activeScout && op._matchScore !== undefined

            return (
              <article key={op.id} style={{
                ...st.card,
                borderColor: hasScore && op._matchScore! >= 50
                  ? 'rgba(110,243,165,0.3)'
                  : urgent ? 'rgba(255,207,92,0.35)' : 'rgba(255,255,255,0.09)'
              }}>
                <div style={st.cardTop}>
                  <span style={st.badge}>{op.type || 'Edital'}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {hasScore && (
                      <span style={{
                        ...st.scoreBadge,
                        background: op._matchScore! >= 60 ? 'rgba(110,243,165,0.15)' : op._matchScore! >= 30 ? 'rgba(255,207,92,0.15)' : 'rgba(255,255,255,0.06)',
                        color: op._matchScore! >= 60 ? '#6ef3a5' : op._matchScore! >= 30 ? '#ffcf5c' : 'rgba(255,255,255,0.4)',
                      }}>
                        {op._matchScore}% match
                      </span>
                    )}
                    <span style={{ ...st.deadlineTag, color: urgent ? '#ffcf5c' : 'rgba(255,255,255,0.45)' }}>
                      {deadlineLabel(op.deadline)}
                    </span>
                  </div>
                </div>

                <h3 style={st.cardTitle}>{op.title}</h3>
                <p style={st.meta}>{[op.organization, op.city, op.countryName || op.country].filter(Boolean).join(' · ') || 'Sem entidade/local'}</p>

                {op.assignedArtistName && (
                  <div style={st.artistTag}>Artista: {op.assignedArtistName}</div>
                )}

                {/* Razões do match */}
                {hasScore && op._matchReasons && op._matchReasons.length > 0 && (
                  <div style={st.matchReasons}>
                    {op._matchReasons.slice(0, 3).map((r, i) => <span key={i}>✓ {r}</span>)}
                  </div>
                )}

                <p style={st.summary}>{op.summary || op.description || 'Sem resumo ainda.'}</p>

                <div style={st.tags}>
                  {disciplines.slice(0, 5).map(d => <span key={d} style={st.tag}>{d}</span>)}
                  {op.coversCosts && <span style={st.costTag}>custos cobertos</span>}
                  <span style={st.sourceTag}>{isManual ? op.source || 'manual' : 'base'}</span>
                </div>

                <div style={st.cardActions}>
                  {op.link && <a href={op.link} target="_blank" rel="noopener noreferrer" style={st.link}>ver edital →</a>}
                  <ProposeOpportunityButton opportunity={op} />
                  <button style={st.secondaryBtn} onClick={() => { setAssigning(op); setSelectedArtistId(op.assignedArtistId || '') }}>Associar artista</button>
                  {isManual && op.assignedArtistId && <button style={st.secondaryBtn} onClick={() => unassignArtist(op)}>Remover artista</button>}
                  <button style={st.secondaryBtn} onClick={() => duplicateToEdit(op)}>{isManual ? 'Editar' : 'Duplicar/editar'}</button>
                  {isManual && <button style={st.dangerBtn} onClick={() => deleteOpportunity(op.id)}>Apagar</button>}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* MODAL: ASSOCIAR ARTISTA */}
      {assigning && (
        <div style={st.overlay}>
          <div style={st.smallModal}>
            <div style={st.modalHeader}>
              <div>
                <h2 style={st.modalTitle}>Associar a artista</h2>
                <p style={st.modalSubtitle}>{assigning.title}</p>
              </div>
              <button style={st.secondaryBtn} onClick={() => setAssigning(null)}>Fechar</button>
            </div>
            <label style={st.label}>Artista
              <select style={st.input} value={selectedArtistId} onChange={e => setSelectedArtistId(e.target.value)}>
                <option value="">Selecionar artista</option>
                {artists.map(a => <option key={a.id} value={a.id}>{a.artisticName || a.name || 'Artista'}</option>)}
              </select>
            </label>
            <div style={st.modalFooter}>
              <button style={st.secondaryBtn} onClick={() => setAssigning(null)}>Cancelar</button>
              <button style={st.primaryBtn} onClick={assignArtistToOpportunity}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR OPORTUNIDADE */}
      {editing && (
        <div style={st.overlay}>
          <div style={st.modal}>
            <div style={st.modalHeader}>
              <div>
                <h2 style={st.modalTitle}>{manual.some(o => o.id === editing.id) ? 'Editar' : 'Nova'} oportunidade</h2>
                <p style={st.modalSubtitle}>Guardar na base manual da SOMA</p>
              </div>
              <button style={st.secondaryBtn} onClick={() => setEditing(null)}>Fechar</button>
            </div>
            <div style={st.formGrid}>
              {[
                ['Título', 'title'], ['Organização', 'organization'], ['Tipo', 'type'],
                ['País', 'countryName'], ['Código país', 'countryCode'], ['Cidade', 'city'], ['Link', 'link'],
              ].map(([label, field]) => (
                <label key={field} style={st.label}>{label}
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
              <label style={st.label}>Keywords
                <input style={st.input} value={joinTags(editing.keywords)}
                  onChange={e => setEditing({ ...editing, keywords: splitTags(e.target.value), themes: splitTags(e.target.value) })} />
              </label>
            </div>
            <label style={st.check}>
              <input type="checkbox" checked={Boolean(editing.coversCosts)} onChange={e => setEditing({ ...editing, coversCosts: e.target.checked })} />
              Cobre custos
            </label>
            <label style={st.label}>Resumo
              <textarea style={st.textarea} value={editing.summary || ''}
                onChange={e => setEditing({ ...editing, summary: e.target.value, description: e.target.value })} />
            </label>
            <label style={st.label}>Notas
              <textarea style={st.textarea} value={editing.notes || ''}
                onChange={e => setEditing({ ...editing, notes: e.target.value })} />
            </label>
            <div style={st.modalFooter}>
              <button style={st.secondaryBtn} onClick={() => setEditing(null)}>Cancelar</button>
              {manual.some(o => o.id === editing.id) && <button style={st.dangerBtn} onClick={() => deleteOpportunity(editing.id)}>Apagar</button>}
              <button style={st.primaryBtn} onClick={() => saveOpportunity(editing)}>Guardar oportunidade</button>
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

  scoutBanner: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
    background: 'rgba(26,105,148,0.12)', border: '1px solid rgba(26,105,148,0.3)',
    borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13,
  },
  scoutBannerLabel: { color: 'rgba(255,255,255,0.6)', marginRight: 6 },
  loadingDot: { color: '#60b4e8', fontSize: 12, animation: 'pulse 1s infinite' },
  clearScoutBtn: {
    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6,
    padding: '5px 10px', fontSize: 11, cursor: 'pointer',
  },

  sectionHeader: { marginBottom: 12 },
  sectionTitle: { margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 600 },

  toolbar: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 22 },
  input: { width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '10px 12px', fontSize: 13, boxSizing: 'border-box', outline: 'none' },
  select: { background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '10px 12px', fontSize: 13, minWidth: 160 },
  check: { display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.68)', fontSize: 13 },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, marginBottom: 28 },
  card: { background: '#111', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: 16 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 },
  badge: { background: 'rgba(26,105,148,0.24)', color: '#60b4e8', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 800 },
  deadlineTag: { fontSize: 12, fontWeight: 700 },
  scoreBadge: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 },
  cardTitle: { margin: '0 0 4px', fontSize: 17 },
  meta: { color: 'rgba(255,255,255,0.45)', fontSize: 12, minHeight: 18, margin: '0 0 6px' },
  artistTag: { color: '#6ef3a5', fontSize: 12, background: 'rgba(110,243,165,0.10)', border: '1px solid rgba(110,243,165,0.18)', borderRadius: 8, padding: '6px 8px', marginBottom: 6 },
  matchReasons: { display: 'flex', flexDirection: 'column', gap: 2, color: '#6ef3a5', fontSize: 11, marginBottom: 8 },
  summary: { color: 'rgba(255,255,255,0.62)', fontSize: 13, lineHeight: 1.45, minHeight: 50, margin: '6px 0' },
  tags: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 },
  tag: { fontSize: 11, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', padding: '2px 8px', borderRadius: 20 },
  costTag: { fontSize: 11, background: 'rgba(110,243,165,0.12)', color: '#6ef3a5', padding: '2px 8px', borderRadius: 20 },
  sourceTag: { fontSize: 11, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', padding: '2px 8px', borderRadius: 20 },
  cardActions: { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: 14 },
  link: { color: '#60b4e8', textDecoration: 'none', fontSize: 13, alignSelf: 'center' },

  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.45)', padding: 40, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12, marginBottom: 24 },

  primaryBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer' },
  secondaryBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 12px', fontSize: 12, cursor: 'pointer' },
  dangerBtn: { background: 'rgba(255,70,70,0.12)', color: '#ff8a8a', border: '1px solid rgba(255,70,70,0.25)', borderRadius: 8, padding: '9px 12px', fontSize: 12, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { width: 'min(980px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: '#000', border: '1px solid #1A6994', borderRadius: 16, padding: 22 },
  smallModal: { width: 'min(620px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#000', border: '1px solid #1A6994', borderRadius: 16, padding: 22 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 18 },
  modalTitle: { margin: 0, color: '#60b4e8', fontSize: 24 },
  modalSubtitle: { margin: '4px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, color: 'rgba(255,255,255,0.55)', fontSize: 12, marginBottom: 12 },
  textarea: { width: '100%', minHeight: 110, background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: 12, fontSize: 13, boxSizing: 'border-box', outline: 'none', resize: 'vertical' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
}