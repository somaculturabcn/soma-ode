// src/components/ScoutSavedSearches.tsx
// SOMA ODÉ — Scout proativo com buscas salvas

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'

type SavedSearch = {
  id: string
  name: string
  query: string
  countries: string[]
  disciplines: string[]
  languages: string[]
  limit: number
  createdAt: string
  updatedAt: string
}

type OpportunitySuggestion = {
  title: string
  organization?: string
  type?: string
  country?: string
  countryCode?: string
  city?: string
  regionId?: string
  disciplines?: string[]
  languages?: string[]
  deadline?: string
  summary?: string
  link?: string
  keywords?: string[]
  requirements?: string[]
  coverage?: {
    travel?: boolean
    accommodation?: boolean
    meals?: boolean
    production?: boolean
    fee?: boolean
  }
  coversCosts?: boolean
  notes?: string
}

type Props = {
  onSave?: (opportunity: any) => void
}

const SEARCHES_KEY = 'soma-scout-saved-searches-v1'

function getStoredSearches(): SavedSearch[] {
  try {
    const raw = localStorage.getItem(SEARCHES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredSearches(searches: SavedSearch[]) {
  localStorage.setItem(SEARCHES_KEY, JSON.stringify(searches))
}

function splitTags(value: string) {
  return value
    .split(',')
    .map(x => x.trim())
    .filter(Boolean)
}

function joinTags(value?: string[]) {
  return Array.isArray(value) ? value.join(', ') : ''
}

function emptySearch(): SavedSearch {
  const now = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    name: '',
    query: '',
    countries: [],
    disciplines: [],
    languages: [],
    limit: 8,
    createdAt: now,
    updatedAt: now,
  }
}

function normalizeOpportunity(op: OpportunitySuggestion) {
  return {
    id: crypto.randomUUID(),
    title: op.title || 'Oportunidade sem título',
    organization: op.organization || '',
    type: op.type || 'Edital',
    country: op.countryCode || op.country || '',
    countryName: op.country || '',
    countryCode: op.countryCode || '',
    city: op.city || '',
    regionId: op.regionId || '',
    regionLabel: op.regionId || '',
    disciplines: op.disciplines || [],
    languages: op.languages || [],
    deadline: op.deadline || '',
    summary: op.summary || '',
    description: op.summary || '',
    link: op.link || '',
    keywords: op.keywords || [],
    themes: op.keywords || [],
    genres: [],
    requirements: op.requirements || [],
    coverage: op.coverage || {},
    coversCosts: Boolean(op.coversCosts),
    status: 'open',
    source: 'scout_proativo',
    notes: op.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function readableError(data: any) {
  if (typeof data?.detail === 'string') return data.detail
  if (data?.detail?.error?.message) return data.detail.error.message
  if (data?.detail?.message) return data.detail.message
  if (data?.error) return data.error

  try {
    return JSON.stringify(data)
  } catch {
    return 'Erro no Scout proativo.'
  }
}

export default function ScoutSavedSearches({ onSave }: Props) {
  const [searches, setSearches] = useState<SavedSearch[]>(getStoredSearches())
  const [editing, setEditing] = useState<SavedSearch | null>(null)
  const [activeSearchId, setActiveSearchId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<OpportunitySuggestion[]>([])

  const activeSearch = useMemo(
    () => searches.find(s => s.id === activeSearchId) || searches[0],
    [searches, activeSearchId]
  )

  function persist(next: SavedSearch[]) {
    setSearches(next)
    saveStoredSearches(next)
  }

  function saveSearch() {
    if (!editing) return

    if (!editing.name.trim()) {
      alert('A busca precisa de nome.')
      return
    }

    if (!editing.query.trim()) {
      alert('A busca precisa de uma frase de pesquisa.')
      return
    }

    const updated = {
      ...editing,
      updatedAt: new Date().toISOString(),
    }

    const exists = searches.some(s => s.id === updated.id)
    const next = exists
      ? searches.map(s => (s.id === updated.id ? updated : s))
      : [updated, ...searches]

    persist(next)
    setActiveSearchId(updated.id)
    setEditing(null)
  }

  function deleteSearch(id: string) {
    if (!confirm('Apagar esta busca salva?')) return
    const next = searches.filter(s => s.id !== id)
    persist(next)
    if (activeSearchId === id) setActiveSearchId('')
  }

  async function runSearch(search: SavedSearch) {
    setError('')
    setResults([])
    setLoading(true)

    try {
      const res = await fetch('/api/scout-search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(search),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(readableError(data))
      }

      setResults(Array.isArray(data.results) ? data.results : [])
    } catch (err: any) {
      setError(err?.message || 'Erro ao executar busca.')
    } finally {
      setLoading(false)
    }
  }

  function saveOpportunity(op: OpportunitySuggestion) {
    const normalized = normalizeOpportunity(op)

    if (onSave) {
      onSave(normalized)
    } else {
      const raw = localStorage.getItem('soma-manual-opportunities-v1')
      const current = raw ? JSON.parse(raw) : []
      localStorage.setItem('soma-manual-opportunities-v1', JSON.stringify([normalized, ...current]))
    }

    alert('Oportunidade guardada.')
  }

  return (
    <section style={styles.box}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Scout proativo</h2>
          <p style={styles.subtitle}>
            Guarda pesquisas estratégicas e executa buscas online para descobrir novas oportunidades.
          </p>
        </div>

        <button style={styles.primaryBtn} onClick={() => setEditing(emptySearch())}>
          + Nova busca
        </button>
      </div>

      {searches.length === 0 && (
        <div style={styles.empty}>
          Nenhuma busca salva ainda. Cria a primeira busca, por exemplo:
          <br />
          <strong>residências artísticas performance diáspora Europa 2026</strong>
        </div>
      )}

      {searches.length > 0 && (
        <>
          <div style={styles.toolbar}>
            <select
              style={styles.select}
              value={activeSearch?.id || ''}
              onChange={e => setActiveSearchId(e.target.value)}
            >
              {searches.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              style={styles.primaryBtn}
              disabled={!activeSearch || loading}
              onClick={() => activeSearch && runSearch(activeSearch)}
            >
              {loading ? 'A procurar...' : '🔎 Executar busca'}
            </button>

            {activeSearch && (
              <>
                <button style={styles.secondaryBtn} onClick={() => setEditing(activeSearch)}>
                  Editar busca
                </button>

                <button style={styles.dangerBtn} onClick={() => deleteSearch(activeSearch.id)}>
                  Apagar
                </button>
              </>
            )}
          </div>

          {activeSearch && (
            <div style={styles.searchInfo}>
              <strong>{activeSearch.query}</strong>
              <span>
                Países: {joinTags(activeSearch.countries) || 'todos'} · Disciplinas:{' '}
                {joinTags(activeSearch.disciplines) || 'todas'} · Idiomas:{' '}
                {joinTags(activeSearch.languages) || 'todos'}
              </span>
            </div>
          )}
        </>
      )}

      {error && <div style={styles.error}>⚠ {error}</div>}

      {results.length > 0 && (
        <div style={styles.results}>
          <h3 style={styles.resultsTitle}>Sugestões encontradas</h3>

          {results.map((op, index) => (
            <article key={`${op.link}-${index}`} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={styles.badge}>{op.type || 'Edital'}</span>
                <span style={styles.deadline}>{op.deadline || 'sem deadline'}</span>
              </div>

              <h4 style={styles.cardTitle}>{op.title}</h4>

              <p style={styles.meta}>
                {[op.organization, op.city, op.country].filter(Boolean).join(' · ') || 'Sem local/organização'}
              </p>

              <p style={styles.summary}>{op.summary || 'Sem resumo.'}</p>

              <div style={styles.tags}>
                {(op.disciplines || []).map(d => (
                  <span key={d} style={styles.tag}>{d}</span>
                ))}
                {op.coversCosts && <span style={styles.costTag}>custos cobertos</span>}
              </div>

              <div style={styles.cardActions}>
                {op.link && (
                  <a href={op.link} target="_blank" rel="noopener noreferrer" style={styles.link}>
                    abrir edital →
                  </a>
                )}

                <button style={styles.primaryBtn} onClick={() => saveOpportunity(op)}>
                  Guardar oportunidade
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>
                  {searches.some(s => s.id === editing.id) ? 'Editar busca' : 'Nova busca salva'}
                </h3>
                <p style={styles.modalSubtitle}>Define uma busca que podes repetir sempre que quiseres.</p>
              </div>

              <button style={styles.secondaryBtn} onClick={() => setEditing(null)}>
                Fechar
              </button>
            </div>

            <label style={styles.label}>
              Nome da busca
              <input
                style={styles.input}
                placeholder="Ex: Residências performance Europa"
                value={editing.name}
                onChange={e => setEditing({ ...editing, name: e.target.value })}
              />
            </label>

            <label style={styles.label}>
              Frase de busca
              <textarea
                style={styles.textarea}
                placeholder="Ex: open call residência artística performance artistas afrodescendentes Europa 2026"
                value={editing.query}
                onChange={e => setEditing({ ...editing, query: e.target.value })}
              />
            </label>

            <div style={styles.grid}>
              <label style={styles.label}>
                Países preferidos
                <input
                  style={styles.input}
                  placeholder="Portugal, Espanha, França"
                  value={joinTags(editing.countries)}
                  onChange={e => setEditing({ ...editing, countries: splitTags(e.target.value) })}
                />
              </label>

              <label style={styles.label}>
                Disciplinas
                <input
                  style={styles.input}
                  placeholder="performance, musica, danca"
                  value={joinTags(editing.disciplines)}
                  onChange={e => setEditing({ ...editing, disciplines: splitTags(e.target.value) })}
                />
              </label>

              <label style={styles.label}>
                Idiomas
                <input
                  style={styles.input}
                  placeholder="PT, ES, EN"
                  value={joinTags(editing.languages)}
                  onChange={e => setEditing({ ...editing, languages: splitTags(e.target.value) })}
                />
              </label>

              <label style={styles.label}>
                Máximo de resultados
                <input
                  style={styles.input}
                  type="number"
                  min={3}
                  max={15}
                  value={editing.limit}
                  onChange={e => setEditing({ ...editing, limit: Number(e.target.value) })}
                />
              </label>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.secondaryBtn} onClick={() => setEditing(null)}>
                Cancelar
              </button>

              <button style={styles.primaryBtn} onClick={saveSearch}>
                Guardar busca
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

const styles: Record<string, CSSProperties> = {
  box: {
    background: '#050505',
    border: '1px solid rgba(26,105,148,0.45)',
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
    color: '#fff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    margin: 0,
    color: '#60b4e8',
    fontSize: 22,
  },
  subtitle: {
    margin: '6px 0 0',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
  },
  empty: {
    border: '1px dashed rgba(255,255,255,0.16)',
    borderRadius: 12,
    padding: 18,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
  },
  toolbar: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 12,
  },
  select: {
    background: '#0a0a0a',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 8,
    padding: '10px 12px',
    minWidth: 260,
    fontSize: 13,
  },
  input: {
    width: '100%',
    background: '#0a0a0a',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    boxSizing: 'border-box',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    minHeight: 100,
    background: '#0a0a0a',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    boxSizing: 'border-box',
    outline: 'none',
    resize: 'vertical',
  },
  primaryBtn: {
    background: '#1A6994',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  secondaryBtn: {
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    cursor: 'pointer',
  },
  dangerBtn: {
    background: 'rgba(255,70,70,0.12)',
    color: '#ff8a8a',
    border: '1px solid rgba(255,70,70,0.25)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    cursor: 'pointer',
  },
  searchInfo: {
    background: '#000',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  error: {
    marginTop: 12,
    color: '#ff8a8a',
    background: 'rgba(255,70,70,0.10)',
    border: '1px solid rgba(255,70,70,0.25)',
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
    whiteSpace: 'pre-wrap',
  },
  results: {
    marginTop: 18,
  },
  resultsTitle: {
    margin: '0 0 12px',
    fontSize: 18,
  },
  card: {
    background: '#111',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  badge: {
    background: 'rgba(26,105,148,0.24)',
    color: '#60b4e8',
    borderRadius: 20,
    padding: '3px 9px',
    fontSize: 11,
    fontWeight: 800,
  },
  deadline: {
    color: '#ffcf5c',
    fontSize: 12,
    fontWeight: 700,
  },
  cardTitle: {
    margin: 0,
    fontSize: 17,
  },
  meta: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  summary: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 13,
    lineHeight: 1.45,
  },
  tags: {
    display: 'flex',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  tag: {
    fontSize: 11,
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.65)',
    padding: '2px 8px',
    borderRadius: 20,
  },
  costTag: {
    fontSize: 11,
    background: 'rgba(110,243,165,0.12)',
    color: '#6ef3a5',
    padding: '2px 8px',
    borderRadius: 20,
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 14,
  },
  link: {
    color: '#60b4e8',
    textDecoration: 'none',
    fontSize: 13,
    alignSelf: 'center',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.82)',
    zIndex: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: 'min(900px, 100%)',
    maxHeight: '92vh',
    overflowY: 'auto',
    background: '#000',
    border: '1px solid #1A6994',
    borderRadius: 16,
    padding: 22,
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18,
  },
  modalTitle: {
    margin: 0,
    color: '#60b4e8',
    fontSize: 24,
  },
  modalSubtitle: {
    margin: '4px 0 0',
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginBottom: 12,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
}