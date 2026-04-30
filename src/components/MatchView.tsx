// src/components/MatchView.tsx
// SOMA ODÉ — Oportunidades / MatchView
// Gestão completa: cards + filtros + criar/editar + CSV + Scout URL + Scout proativo + associar artista + propor

import { useEffect, useMemo, useRef, useState } from 'react'
import ScoutUrlExtractor from './ScoutUrlExtractor'
import ScoutSavedSearches from './ScoutSavedSearches'
import ProposeOpportunityButton from './ProposeOpportunityButton'
import { mockOpportunities } from '../data/mockOpportunities'
import { realOpportunities } from '../data/realOpportunities'

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
  coverage?: {
    travel?: boolean
    accommodation?: boolean
    meals?: boolean
    production?: boolean
    fee?: boolean
  }
  coversCosts?: boolean
  status?: string
  source?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

type ArtistLite = {
  id: string
  artisticName?: string
  name?: string
  legalName?: string
}

const STORAGE_KEY = 'soma-manual-opportunities-v1'
const ARTISTS_KEY = 'soma-artists-v2'

function getManualOpportunities(): Opportunity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveManualOpportunities(data: Opportunity[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function getArtists(): ArtistLite[] {
  try {
    const raw = localStorage.getItem(ARTISTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function emptyOpportunity(): Opportunity {
  return {
    id: crypto.randomUUID(),
    title: '',
    organization: '',
    type: 'Edital',
    country: '',
    countryName: '',
    countryCode: '',
    city: '',
    regionId: '',
    regionLabel: '',
    disciplines: [],
    languages: [],
    deadline: '',
    summary: '',
    description: '',
    link: '',
    keywords: [],
    themes: [],
    genres: [],
    requirements: [],
    assignedArtistId: '',
    assignedArtistName: '',
    coverage: {},
    coversCosts: false,
    status: 'open',
    source: 'manual',
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function splitTags(value: string) {
  return value.split(',').map(x => x.trim()).filter(Boolean)
}

function joinTags(value?: string[]) {
  return Array.isArray(value) ? value.join(', ') : ''
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
  return deadline
}

function parseCsv(text: string): Opportunity[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(/[;,]/).map(h => cleanText(h).replace(/\s+/g, '_'))

  return lines.slice(1).map(line => {
    const values = line.split(/[;,]/).map(v => v.trim())
    const row: Record<string, string> = {}

    headers.forEach((h, i) => {
      row[h] = values[i] || ''
    })

    const get = (...keys: string[]) => {
      for (const key of keys) {
        const k = cleanText(key).replace(/\s+/g, '_')
        if (row[k]) return row[k]
      }
      return ''
    }

    return {
      id: crypto.randomUUID(),
      title: get('title', 'titulo', 'título', 'nome', 'name') || 'Oportunidade sem título',
      organization: get('organization', 'organizacao', 'organização', 'entidade', 'empresa'),
      type: get('type', 'tipo') || 'Edital',
      country: get('country', 'pais', 'país'),
      countryName: get('country', 'pais', 'país'),
      countryCode: get('countryCode', 'codigo_pais', 'código país'),
      city: get('city', 'cidade', 'ciudad'),
      regionId: get('region', 'regionId', 'regiao', 'região'),
      regionLabel: get('region', 'regiao', 'região'),
      disciplines: splitTags(get('disciplines', 'disciplinas', 'area', 'área')),
      languages: splitTags(get('languages', 'idiomas', 'linguas', 'línguas')),
      deadline: get('deadline', 'prazo', 'fecha limite', 'fecha límite'),
      summary: get('summary', 'resumo', 'descripcion', 'descrição'),
      description: get('description', 'descricao', 'descrição'),
      link: get('link', 'url', 'website', 'site'),
      keywords: splitTags(get('keywords', 'tags', 'palavras chave')),
      requirements: splitTags(get('requirements', 'requisitos')),
      assignedArtistName: get('artist', 'artista', 'assigned_artist', 'artista_associado'),
      coversCosts: ['sim', 'yes', 'true', '1'].includes(cleanText(get('coversCosts', 'custos', 'costs'))),
      status: 'open',
      source: 'csv',
      notes: get('notes', 'notas', 'observaciones'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  })
}

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
  const [artistFilter, setArtistFilter] = useState('todos')
  const [onlyCosts, setOnlyCosts] = useState(false)

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
      disciplines: op.disciplines || [],
      languages: op.languages || [],
      keywords: op.keywords || op.themes || [],
      requirements: op.requirements || [],
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

  const types = useMemo(() => {
    return Array.from(new Set(allOpportunities.map(o => o.type || 'Edital'))).sort()
  }, [allOpportunities])

  const countries = useMemo(() => {
    return Array.from(new Set(allOpportunities.map(o => o.countryName || o.country).filter(Boolean))).sort()
  }, [allOpportunities])

  const filtered = useMemo(() => {
    const q = cleanText(search)

    return allOpportunities
      .filter(op => {
        if (typeFilter !== 'todos' && op.type !== typeFilter) return false
        if (countryFilter !== 'todos' && (op.countryName || op.country) !== countryFilter) return false
        if (artistFilter !== 'todos' && op.assignedArtistId !== artistFilter) return false
        if (onlyCosts && !op.coversCosts) return false

        if (!q) return true

        return cleanText([
          op.title,
          op.organization,
          op.type,
          op.country,
          op.countryName,
          op.city,
          op.summary,
          op.description,
          op.notes,
          op.assignedArtistName,
          ...(op.disciplines || []),
          ...(op.keywords || []),
        ].join(' ')).includes(q)
      })
      .sort((a, b) => {
        const da = daysLeft(a.deadline)
        const db = daysLeft(b.deadline)
        return (da ?? 9999) - (db ?? 9999)
      })
  }, [allOpportunities, search, typeFilter, countryFilter, artistFilter, onlyCosts])

  function persist(next: Opportunity[]) {
    setManual(next)
    saveManualOpportunities(next)
  }

  function saveOpportunity(op: Opportunity) {
    if (!op.title.trim()) {
      alert('A oportunidade precisa de título.')
      return
    }

    const updated = {
      ...op,
      updatedAt: new Date().toISOString(),
    }

    const exists = manual.some(o => o.id === updated.id)

    const next = exists
      ? manual.map(o => o.id === updated.id ? updated : o)
      : [updated, ...manual]

    persist(next)
    setEditing(null)
  }

  function deleteOpportunity(id: string) {
    if (!confirm('Apagar esta oportunidade manual/CSV?')) return
    persist(manual.filter(o => o.id !== id))
    setEditing(null)
  }

  function duplicateToEdit(op: Opportunity) {
    setEditing({
      ...emptyOpportunity(),
      ...op,
      id: manual.some(o => o.id === op.id) ? op.id : crypto.randomUUID(),
      source: manual.some(o => o.id === op.id) ? op.source || 'manual' : 'duplicado/editado',
      updatedAt: new Date().toISOString(),
    })
  }

  function handleScoutSave(op: Opportunity) {
    const next = [op, ...getManualOpportunities()]
    persist(next)
  }

  function assignArtistToOpportunity() {
    if (!assigning) return

    const artist = artists.find(a => a.id === selectedArtistId)
    if (!artist) {
      alert('Seleciona um artista.')
      return
    }

    const artistName = artist.artisticName || artist.name || artist.legalName || 'Artista'

    const updated: Opportunity = {
      ...assigning,
      assignedArtistId: artist.id,
      assignedArtistName: artistName,
      source: manual.some(o => o.id === assigning.id) ? assigning.source || 'manual' : 'associada',
      updatedAt: new Date().toISOString(),
    }

    const exists = manual.some(o => o.id === updated.id)
    const next = exists
      ? manual.map(o => o.id === updated.id ? updated : o)
      : [updated, ...manual]

    persist(next)
    setAssigning(null)
    setSelectedArtistId('')
  }

  function unassignArtist(op: Opportunity) {
    const updated = {
      ...op,
      assignedArtistId: '',
      assignedArtistName: '',
      updatedAt: new Date().toISOString(),
    }

    const exists = manual.some(o => o.id === updated.id)
    if (!exists) return

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
    const headers = [
      'title',
      'organization',
      'type',
      'country',
      'countryCode',
      'city',
      'deadline',
      'disciplines',
      'languages',
      'keywords',
      'requirements',
      'coversCosts',
      'assignedArtistName',
      'summary',
      'link',
      'notes',
      'source',
    ]

    const rows = filtered.map(op => [
      op.title,
      op.organization,
      op.type,
      op.countryName || op.country,
      op.countryCode,
      op.city,
      op.deadline,
      op.disciplines,
      op.languages,
      op.keywords,
      op.requirements,
      op.coversCosts ? 'true' : 'false',
      op.assignedArtistName,
      op.summary || op.description,
      op.link,
      op.notes,
      op.source,
    ].map(escapeCsv).join(','))

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `soma-oportunidades-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Oportunidades</h1>
          <p style={styles.subtitle}>
            {filtered.length} de {allOpportunities.length} oportunidades · edição, CSV, Scout e associação a artista
          </p>
        </div>

        <div style={styles.headerActions}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleCsv(file)
            }}
          />

          <button style={styles.secondaryBtn} onClick={() => fileRef.current?.click()}>
            📥 Importar CSV
          </button>

          <button style={styles.secondaryBtn} onClick={exportCsv}>
            📤 Exportar CSV
          </button>

          <button style={styles.primaryBtn} onClick={() => setEditing(emptyOpportunity())}>
            + Nova oportunidade
          </button>
        </div>
      </header>

      <ScoutUrlExtractor onSave={handleScoutSave} />
      <ScoutSavedSearches onSave={handleScoutSave} />

      <section style={styles.toolbar}>
        <input
          style={styles.input}
          placeholder="Pesquisar por título, país, disciplina, artista, keyword..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select style={styles.select} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select style={styles.select} value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
          <option value="todos">Todos os países</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select style={styles.select} value={artistFilter} onChange={e => setArtistFilter(e.target.value)}>
          <option value="todos">Todos os artistas</option>
          {artists.map(a => {
            const name = a.artisticName || a.name || a.legalName || 'Artista'
            return <option key={a.id} value={a.id}>{name}</option>
          })}
        </select>

        <label style={styles.check}>
          <input type="checkbox" checked={onlyCosts} onChange={e => setOnlyCosts(e.target.checked)} />
          Só custos cobertos
        </label>
      </section>

      <section style={styles.grid}>
        {filtered.map(op => {
          const isManual = manual.some(m => m.id === op.id)
          const d = daysLeft(op.deadline)
          const urgent = d !== null && d >= 0 && d <= 30

          return (
            <article key={op.id} style={{
              ...styles.card,
              borderColor: urgent ? 'rgba(255,207,92,0.35)' : 'rgba(255,255,255,0.09)'
            }}>
              <div style={styles.cardTop}>
                <span style={styles.badge}>{op.type || 'Edital'}</span>
                <span style={{
                  ...styles.deadline,
                  color: urgent ? '#ffcf5c' : 'rgba(255,255,255,0.45)'
                }}>
                  {deadlineLabel(op.deadline)}
                </span>
              </div>

              <h3 style={styles.cardTitle}>{op.title}</h3>

              <p style={styles.meta}>
                {[op.organization, op.city, op.countryName || op.country].filter(Boolean).join(' · ') || 'Sem entidade/local'}
              </p>

              {op.assignedArtistName && (
                <div style={styles.artistTag}>
                  Artista associado: {op.assignedArtistName}
                </div>
              )}

              <p style={styles.summary}>
                {op.summary || op.description || 'Sem resumo ainda.'}
              </p>

              <div style={styles.tags}>
                {(op.disciplines || []).slice(0, 5).map(d => (
                  <span key={d} style={styles.tag}>{d}</span>
                ))}
                {op.coversCosts && <span style={styles.costTag}>custos cobertos</span>}
                <span style={styles.sourceTag}>{isManual ? op.source || 'manual' : 'base'}</span>
              </div>

              <div style={styles.cardActions}>
                {op.link && (
                  <a href={op.link} target="_blank" rel="noopener noreferrer" style={styles.link}>
                    ver edital →
                  </a>
                )}

                <ProposeOpportunityButton opportunity={op} />

                <button style={styles.secondaryBtn} onClick={() => {
                  setAssigning(op)
                  setSelectedArtistId(op.assignedArtistId || '')
                }}>
                  Associar artista
                </button>

                {isManual && op.assignedArtistId && (
                  <button style={styles.secondaryBtn} onClick={() => unassignArtist(op)}>
                    Remover artista
                  </button>
                )}

                <button style={styles.secondaryBtn} onClick={() => duplicateToEdit(op)}>
                  {isManual ? 'Editar' : 'Duplicar/editar'}
                </button>

                {isManual && (
                  <button style={styles.dangerBtn} onClick={() => deleteOpportunity(op.id)}>
                    Apagar
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </section>

      {assigning && (
        <div style={styles.overlay}>
          <div style={styles.smallModal}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>Associar oportunidade a artista</h2>
                <p style={styles.modalSubtitle}>{assigning.title}</p>
              </div>

              <button style={styles.secondaryBtn} onClick={() => setAssigning(null)}>Fechar</button>
            </div>

            <label style={styles.label}>Artista
              <select
                style={styles.input}
                value={selectedArtistId}
                onChange={e => setSelectedArtistId(e.target.value)}
              >
                <option value="">Selecionar artista</option>
                {artists.map(a => {
                  const name = a.artisticName || a.name || a.legalName || 'Artista'
                  return <option key={a.id} value={a.id}>{name}</option>
                })}
              </select>
            </label>

            <div style={styles.modalFooter}>
              <button style={styles.secondaryBtn} onClick={() => setAssigning(null)}>Cancelar</button>
              <button style={styles.primaryBtn} onClick={assignArtistToOpportunity}>Guardar associação</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>
                  {manual.some(o => o.id === editing.id) ? 'Editar oportunidade' : 'Nova oportunidade'}
                </h2>
                <p style={styles.modalSubtitle}>Rever e guardar na base manual da SOMA</p>
              </div>

              <button style={styles.secondaryBtn} onClick={() => setEditing(null)}>Fechar</button>
            </div>

            <div style={styles.formGrid}>
              <label style={styles.label}>Título
                <input style={styles.input} value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
              </label>

              <label style={styles.label}>Organização
                <input style={styles.input} value={editing.organization || ''} onChange={e => setEditing({ ...editing, organization: e.target.value })} />
              </label>

              <label style={styles.label}>Tipo
                <input style={styles.input} value={editing.type || ''} onChange={e => setEditing({ ...editing, type: e.target.value })} />
              </label>

              <label style={styles.label}>Deadline
                <input style={styles.input} type="date" value={editing.deadline || ''} onChange={e => setEditing({ ...editing, deadline: e.target.value })} />
              </label>

              <label style={styles.label}>País
                <input style={styles.input} value={editing.countryName || editing.country || ''} onChange={e => setEditing({ ...editing, countryName: e.target.value, country: e.target.value })} />
              </label>

              <label style={styles.label}>Código país
                <input style={styles.input} value={editing.countryCode || ''} onChange={e => setEditing({ ...editing, countryCode: e.target.value.toUpperCase() })} />
              </label>

              <label style={styles.label}>Cidade
                <input style={styles.input} value={editing.city || ''} onChange={e => setEditing({ ...editing, city: e.target.value })} />
              </label>

              <label style={styles.label}>Região
                <input style={styles.input} value={editing.regionId || ''} onChange={e => setEditing({ ...editing, regionId: e.target.value, regionLabel: e.target.value })} />
              </label>

              <label style={styles.label}>Disciplinas
                <input style={styles.input} value={joinTags(editing.disciplines)} onChange={e => setEditing({ ...editing, disciplines: splitTags(e.target.value) })} />
              </label>

              <label style={styles.label}>Idiomas
                <input style={styles.input} value={joinTags(editing.languages)} onChange={e => setEditing({ ...editing, languages: splitTags(e.target.value) })} />
              </label>

              <label style={styles.label}>Keywords
                <input style={styles.input} value={joinTags(editing.keywords)} onChange={e => setEditing({ ...editing, keywords: splitTags(e.target.value), themes: splitTags(e.target.value) })} />
              </label>

              <label style={styles.label}>Requisitos
                <input style={styles.input} value={joinTags(editing.requirements)} onChange={e => setEditing({ ...editing, requirements: splitTags(e.target.value) })} />
              </label>

              <label style={styles.label}>Artista associado
                <select
                  style={styles.input}
                  value={editing.assignedArtistId || ''}
                  onChange={e => {
                    const artist = artists.find(a => a.id === e.target.value)
                    const name = artist ? artist.artisticName || artist.name || artist.legalName || '' : ''
                    setEditing({ ...editing, assignedArtistId: e.target.value, assignedArtistName: name })
                  }}
                >
                  <option value="">Nenhum artista</option>
                  {artists.map(a => {
                    const name = a.artisticName || a.name || a.legalName || 'Artista'
                    return <option key={a.id} value={a.id}>{name}</option>
                  })}
                </select>
              </label>

              <label style={styles.label}>Link
                <input style={styles.input} value={editing.link || ''} onChange={e => setEditing({ ...editing, link: e.target.value })} />
              </label>
            </div>

            <label style={styles.check}>
              <input type="checkbox" checked={Boolean(editing.coversCosts)} onChange={e => setEditing({ ...editing, coversCosts: e.target.checked })} />
              Cobre custos
            </label>

            <label style={styles.label}>Resumo
              <textarea style={styles.textarea} value={editing.summary || ''} onChange={e => setEditing({ ...editing, summary: e.target.value, description: e.target.value })} />
            </label>

            <label style={styles.label}>Notas internas
              <textarea style={styles.textarea} value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} />
            </label>

            <div style={styles.modalFooter}>
              <button style={styles.secondaryBtn} onClick={() => setEditing(null)}>Cancelar</button>

              {manual.some(o => o.id === editing.id) && (
                <button style={styles.dangerBtn} onClick={() => deleteOpportunity(editing.id)}>Apagar</button>
              )}

              <button style={styles.primaryBtn} onClick={() => saveOpportunity(editing)}>
                Guardar oportunidade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1180, margin: '0 auto', padding: '28px 22px', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20 },
  headerActions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 30, color: '#60b4e8' },
  subtitle: { margin: '5px 0 0', color: 'rgba(255,255,255,0.48)', fontSize: 13 },
  toolbar: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 22 },
  input: { width: '100%', background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '10px 12px', fontSize: 13, boxSizing: 'border-box', outline: 'none' },
  select: { background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '10px 12px', fontSize: 13, minWidth: 160 },
  check: { display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.68)', fontSize: 13 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 },
  card: { background: '#111', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: 16 },
  cardTop: { display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  badge: { background: 'rgba(26,105,148,0.24)', color: '#60b4e8', borderRadius: 20, padding: '3px 9px', fontSize: 11, fontWeight: 800 },
  deadline: { fontSize: 12, fontWeight: 700 },
  cardTitle: { margin: 0, fontSize: 17 },
  meta: { color: 'rgba(255,255,255,0.45)', fontSize: 12, minHeight: 18 },
  artistTag: { marginTop: 8, color: '#6ef3a5', fontSize: 12, background: 'rgba(110,243,165,0.10)', border: '1px solid rgba(110,243,165,0.18)', borderRadius: 8, padding: '6px 8px' },
  summary: { color: 'rgba(255,255,255,0.62)', fontSize: 13, lineHeight: 1.45, minHeight: 62 },
  tags: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 },
  tag: { fontSize: 11, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', padding: '2px 8px', borderRadius: 20 },
  costTag: { fontSize: 11, background: 'rgba(110,243,165,0.12)', color: '#6ef3a5', padding: '2px 8px', borderRadius: 20 },
  sourceTag: { fontSize: 11, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', padding: '2px 8px', borderRadius: 20 },
  cardActions: { display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', marginTop: 14 },
  link: { color: '#60b4e8', textDecoration: 'none', fontSize: 13, alignSelf: 'center' },
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