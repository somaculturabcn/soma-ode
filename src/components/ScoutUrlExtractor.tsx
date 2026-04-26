// src/components/ScoutUrlExtractor.tsx
// SOMA ODÉ — Scout assistido por URL
// Cola URL → IA extrai oportunidade → revisar → guardar

import { useState } from 'react'

type ExtractedOpportunity = {
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

const STORAGE_KEY = 'soma-manual-opportunities-v1'

function getStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStored(data: any[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
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

function normalizeForStore(op: ExtractedOpportunity) {
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
    source: 'scout_url',
    notes: op.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export default function ScoutUrlExtractor({ onSave }: Props) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')
  const [opportunity, setOpportunity] = useState<ExtractedOpportunity | null>(null)

  async function extract() {
    setError('')
    setWarning('')
    setLoading(true)
    setOpportunity(null)

    try {
      const res = await fetch('/api/scout-url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao extrair oportunidade.')
      }

      setOpportunity(data.opportunity)
      if (data.warning) setWarning(data.warning)
    } catch (err: any) {
      setError(err?.message || 'Erro ao usar Scout.')
    } finally {
      setLoading(false)
    }
  }

  function update<K extends keyof ExtractedOpportunity>(field: K, value: ExtractedOpportunity[K]) {
    if (!opportunity) return
    setOpportunity({ ...opportunity, [field]: value })
  }

  function saveOpportunity() {
    if (!opportunity) return

    const normalized = normalizeForStore(opportunity)

    if (onSave) {
      onSave(normalized)
    } else {
      const current = getStored()
      saveStored([normalized, ...current])
    }

    alert('Oportunidade guardada. Atualiza/abre Oportunidades para ver na lista.')
    setUrl('')
    setOpportunity(null)
  }

  return (
    <section style={styles.box}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Scout por URL</h2>
          <p style={styles.subtitle}>
            Cola o link de um edital, festival, residência ou open call. A IA extrai os campos principais.
          </p>
        </div>
      </div>

      <div style={styles.row}>
        <input
          style={styles.input}
          placeholder="https://..."
          value={url}
          onChange={e => setUrl(e.target.value)}
        />

        <button
          style={{
            ...styles.primaryBtn,
            opacity: loading || !url.trim() ? 0.6 : 1,
            cursor: loading || !url.trim() ? 'not-allowed' : 'pointer',
          }}
          disabled={loading || !url.trim()}
          onClick={extract}
        >
          {loading ? 'A extrair...' : '🔍 Extrair'}
        </button>
      </div>

      {error && <div style={styles.error}>⚠ {error}</div>}
      {warning && <div style={styles.warning}>⚠ {warning}</div>}

      {opportunity && (
        <div style={styles.result}>
          <h3 style={styles.resultTitle}>Rever oportunidade antes de guardar</h3>

          <div style={styles.grid}>
            <label style={styles.label}>
              Título
              <input style={styles.input} value={opportunity.title || ''} onChange={e => update('title', e.target.value)} />
            </label>

            <label style={styles.label}>
              Organização
              <input style={styles.input} value={opportunity.organization || ''} onChange={e => update('organization', e.target.value)} />
            </label>

            <label style={styles.label}>
              Tipo
              <select style={styles.input} value={opportunity.type || 'Edital'} onChange={e => update('type', e.target.value)}>
                <option>Edital</option>
                <option>Residência</option>
                <option>Festival</option>
                <option>Showcase</option>
                <option>Touring</option>
                <option>Comissão</option>
                <option>Premio</option>
                <option>Outro</option>
              </select>
            </label>

            <label style={styles.label}>
              Deadline
              <input style={styles.input} type="date" value={opportunity.deadline || ''} onChange={e => update('deadline', e.target.value)} />
            </label>

            <label style={styles.label}>
              País
              <input style={styles.input} value={opportunity.country || ''} onChange={e => update('country', e.target.value)} />
            </label>

            <label style={styles.label}>
              Código país
              <input style={styles.input} value={opportunity.countryCode || ''} onChange={e => update('countryCode', e.target.value.toUpperCase())} />
            </label>

            <label style={styles.label}>
              Cidade
              <input style={styles.input} value={opportunity.city || ''} onChange={e => update('city', e.target.value)} />
            </label>

            <label style={styles.label}>
              Região ID
              <input style={styles.input} value={opportunity.regionId || ''} onChange={e => update('regionId', e.target.value)} />
            </label>

            <label style={styles.label}>
              Disciplinas
              <input
                style={styles.input}
                value={joinTags(opportunity.disciplines)}
                onChange={e => update('disciplines', splitTags(e.target.value))}
              />
            </label>

            <label style={styles.label}>
              Idiomas
              <input
                style={styles.input}
                value={joinTags(opportunity.languages)}
                onChange={e => update('languages', splitTags(e.target.value))}
              />
            </label>

            <label style={styles.label}>
              Keywords
              <input
                style={styles.input}
                value={joinTags(opportunity.keywords)}
                onChange={e => update('keywords', splitTags(e.target.value))}
              />
            </label>

            <label style={styles.label}>
              Requisitos
              <input
                style={styles.input}
                value={joinTags(opportunity.requirements)}
                onChange={e => update('requirements', splitTags(e.target.value))}
              />
            </label>
          </div>

          <label style={styles.label}>
            Resumo
            <textarea
              style={styles.textarea}
              value={opportunity.summary || ''}
              onChange={e => update('summary', e.target.value)}
            />
          </label>

          <label style={styles.checkbox}>
            <input
              type="checkbox"
              checked={Boolean(opportunity.coversCosts)}
              onChange={e => update('coversCosts', e.target.checked)}
            />
            Cobre custos
          </label>

          <label style={styles.label}>
            Notas internas
            <textarea
              style={styles.textarea}
              value={opportunity.notes || ''}
              onChange={e => update('notes', e.target.value)}
            />
          </label>

          <div style={styles.actions}>
            <button style={styles.secondaryBtn} onClick={() => setOpportunity(null)}>
              Cancelar
            </button>

            <button style={styles.primaryBtn} onClick={saveOpportunity}>
              Guardar oportunidade
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  box: {
    background: '#050505',
    border: '1px solid rgba(26,105,148,0.45)',
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
    color: '#fff',
  },
  header: {
    marginBottom: 14,
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
  row: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
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
  error: {
    marginTop: 12,
    color: '#ff8a8a',
    background: 'rgba(255,70,70,0.10)',
    border: '1px solid rgba(255,70,70,0.25)',
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
  },
  warning: {
    marginTop: 12,
    color: '#ffcf5c',
    background: 'rgba(255,207,92,0.10)',
    border: '1px solid rgba(255,207,92,0.25)',
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
  },
  result: {
    marginTop: 18,
    background: '#000',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 18,
  },
  resultTitle: {
    margin: '0 0 14px',
    color: '#fff',
    fontSize: 18,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginBottom: 12,
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
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginBottom: 12,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
}