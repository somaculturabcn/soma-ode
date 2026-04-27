// src/components/MatchView.tsx
// SOMA ODÉ — Oportunidades / MatchView
// Lista + CSV + Scout URL + Scout Proativo

import { useEffect, useMemo, useRef, useState } from 'react'
import ScoutUrlExtractor from './ScoutUrlExtractor'
import ScoutSavedSearches from './ScoutSavedSearches'
import { mockOpportunities } from '../data/mockOpportunities'
import { realOpportunities } from '../data/realOpportunities'

type Opportunity = any

const STORAGE_KEY = 'soma-manual-opportunities-v1'

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

function cleanText(value?: string) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function splitTags(value: string) {
  return value.split(',').map(x => x.trim()).filter(Boolean)
}

function joinTags(value?: string[]) {
  return Array.isArray(value) ? value.join(', ') : ''
}

function daysLeft(deadline?: string) {
  if (!deadline) return null
  const d = new Date(deadline)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function parseCsv(text: string): Opportunity[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(/[;,]/)

  return lines.slice(1).map(line => {
    const values = line.split(/[;,]/)

    const obj: any = {}
    headers.forEach((h, i) => obj[h.trim()] = values[i])

    return {
      id: crypto.randomUUID(),
      title: obj.title || obj.name || 'Oportunidade',
      organization: obj.organization || '',
      type: obj.type || 'Edital',
      country: obj.country || '',
      city: obj.city || '',
      deadline: obj.deadline || '',
      summary: obj.summary || '',
      link: obj.link || '',
      disciplines: splitTags(obj.disciplines || ''),
      languages: splitTags(obj.languages || ''),
      keywords: splitTags(obj.keywords || ''),
      requirements: splitTags(obj.requirements || ''),
      coversCosts: obj.coversCosts === 'true',
      source: 'csv'
    }
  })
}

export default function MatchView() {
  const fileRef = useRef<HTMLInputElement | null>(null)

  const [manual, setManual] = useState<Opportunity[]>([])
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Opportunity | null>(null)

  useEffect(() => {
    setManual(getManualOpportunities())
  }, [])

  function persist(next: Opportunity[]) {
    setManual(next)
    saveManualOpportunities(next)
  }

  function handleScoutSave(op: Opportunity) {
    persist([op, ...manual])
  }

  async function handleCsv(file: File) {
    const text = await file.text()
    const parsed = parseCsv(text)
    persist([...parsed, ...manual])
  }

  const all = useMemo(() => {
    return [...manual, ...mockOpportunities, ...realOpportunities]
  }, [manual])

  const filtered = useMemo(() => {
    const q = cleanText(search)

    return all.filter(op =>
      cleanText(JSON.stringify(op)).includes(q)
    )
  }, [all, search])

  return (
    <div style={styles.wrap}>
      <h1 style={styles.title}>Oportunidades</h1>

      {/* BOTÕES */}
      <div style={styles.actions}>
        <button onClick={() => fileRef.current?.click()} style={styles.secondaryBtn}>
          Importar CSV
        </button>

        <input
          ref={fileRef}
          type="file"
          style={{ display: 'none' }}
          onChange={e => e.target.files && handleCsv(e.target.files[0])}
        />
      </div>

      {/* SCOUT */}
      <ScoutUrlExtractor onSave={handleScoutSave} />
      <ScoutSavedSearches onSave={handleScoutSave} />

      {/* SEARCH */}
      <input
        style={styles.input}
        placeholder="Buscar..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* LIST */}
      <div style={styles.grid}>
        {filtered.map(op => (
          <div key={op.id} style={styles.card}>
            <h3>{op.title}</h3>
            <p>{op.organization}</p>
            <p>{op.summary}</p>

            {op.link && (
              <a href={op.link} target="_blank">
                ver →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const styles: any = {
  wrap: {
    padding: 20,
    color: '#fff'
  },
  title: {
    fontSize: 28,
    marginBottom: 20
  },
  actions: {
    marginBottom: 20
  },
  input: {
    width: '100%',
    padding: 10,
    marginBottom: 20
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))',
    gap: 12
  },
  card: {
    background: '#111',
    padding: 12,
    borderRadius: 8
  },
  secondaryBtn: {
    background: '#333',
    color: '#fff',
    padding: 10,
    border: 'none',
    borderRadius: 6
  }
}