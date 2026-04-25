// src/components/MatchView.tsx
// SOMA ODÉ — Oportunidades v4.5
// Buscador geral + importação CSV de venues/festivais + edição + matching com artista

import { useMemo, useRef, useState } from 'react'
import type { Artist } from '../types/artist'
import type { Opportunity, ScoredOpportunity } from '../types/opportunity'
import { runMatch } from '../data/matchEngine'
import { mockOpportunities } from '../data/mockOpportunities'
import { realOpportunities } from '../data/realOpportunities'
import {
  getManualOpportunities,
  addManualOpportunity,
  updateManualOpportunity,
  deleteManualOpportunity,
  clearCsvOpportunities,
} from '../data/manualOpportunitiesStore'

interface MatchViewProps {
  artist: Artist | null
}

type OpportunityWithSource = Opportunity & {
  origin?: 'real' | 'mock' | 'manual'
}

function cleanText(value?: string) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function sortOpportunities<T extends Opportunity>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const A = cleanText(a.title || a.organization || '')
    const B = cleanText(b.title || b.organization || '')
    return A.localeCompare(B)
  })
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && insideQuotes && next === '"') {
      current += '"'
      i++
      continue
    }

    if (char === '"') {
      insideQuotes = !insideQuotes
      continue
    }

    if ((char === ',' || char === ';') && !insideQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  result.push(current.trim())
  return result
}

function normalizeHeader(header: string) {
  return cleanText(header)
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
}

function getValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const normalized = normalizeHeader(key)
    if (row[normalized]) return row[normalized]
  }
  return ''
}

function parseCountryCity(value: string) {
  const raw = (value || '').trim()

  if (!raw) return { country: '', city: '' }

  // Formato do teu Excel: "AT - Viena", "GE - Hamburgo", "BE - Bruxelas"
  if (raw.includes(' - ')) {
    const [country, ...cityParts] = raw.split(' - ')
    return {
      country: country.trim(),
      city: cityParts.join(' - ').trim(),
    }
  }

  // Formato alternativo: "Viena, AT"
  if (raw.includes(',')) {
    const parts = raw.split(',').map(x => x.trim()).filter(Boolean)
    if (parts.length >= 2) {
      return {
        city: parts[0],
        country: parts[1],
      }
    }
  }

  return { country: '', city: raw }
}

function normalizeType(typeRaw: string): Opportunity['type'] {
  const t = cleanText(typeRaw)

  if (t.includes('festival')) return 'festival'
  if (t.includes('showcase')) return 'showcase'
  if (t.includes('resid')) return 'residency'
  if (t.includes('grant') || t.includes('financi') || t.includes('fundo')) return 'grant'
  if (t.includes('commission') || t.includes('comissao')) return 'commission'

  return 'open_call'
}

function normalizeDisciplines(typeRaw: string, explicitDisciplines: string) {
  if (explicitDisciplines) {
    return explicitDisciplines
      .split(/[|,;]/)
      .map(x => cleanText(x))
      .filter(Boolean)
  }

  const t = cleanText(typeRaw)

  if (t.includes('musica') || t.includes('music') || t.includes('festival') || t.includes('venue')) {
    return ['musica']
  }

  if (t.includes('cinema') || t.includes('film')) return ['cinema']
  if (t.includes('teatro')) return ['teatro']
  if (t.includes('danca') || t.includes('dança')) return ['danca']
  if (t.includes('performance')) return ['performance']

  return ['musica']
}

function parseOpportunitiesCsv(text: string): Opportunity[] {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const headers = splitCsvLine(lines[0]).map(normalizeHeader)

  return lines
    .slice(1)
    .map(line => {
      const values = splitCsvLine(line)
      const row: Record<string, string> = {}

      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })

      const name = getValue(row, ['nome', 'name', 'titulo', 'título', 'title'])
      const typeOriginal = getValue(row, ['tipo', 'type', 'categoria'])
      const site = getValue(row, ['site', 'website', 'web', 'url', 'link'])
      const dates = getValue(row, ['datas', 'dates', 'data', 'date'])
      const contactEmail = getValue(row, ['contato', 'contacto', 'email', 'mail'])
      const responsible = getValue(row, ['responsavel', 'responsável', 'responsible', 'programador', 'booker'])
      const cityRaw = getValue(row, ['cidade', 'city', 'local', 'location'])
      const observations = getValue(row, ['observacao', 'observação', 'observacoes', 'observações', 'observations', 'notas', 'notes'])
      const disciplinesRaw = getValue(row, ['disciplinas', 'disciplines', 'area', 'área'])

      const geo = parseCountryCity(cityRaw)

      const notes = [
        typeOriginal ? `Tipo original: ${typeOriginal}` : '',
        dates ? `Datas: ${dates}` : '',
        responsible ? `Responsável: ${responsible}` : '',
        observations ? `Observações: ${observations}` : '',
      ].filter(Boolean).join(' · ')

      const type = normalizeType(typeOriginal)
      const disciplines = normalizeDisciplines(typeOriginal, disciplinesRaw)

      return {
        id: 'csv-opp-' + crypto.randomUUID(),
        title: name || site || contactEmail || 'Oportunidade sem nome',
        organization: name || '',
        url: site || '',
        type,
        status: 'open',
        country: geo.country,
        countryName: geo.country,
        city: geo.city,
        disciplines,
        languages: [],
        coversCosts: false,
        deadline: '2026-12-31',
        contactEmail,
        notes,
        source: 'csv-opportunities',
        keywords: [typeOriginal, ...disciplines, geo.city, geo.country].filter(Boolean),
      } as Opportunity
    })
    .filter(o => o.title || o.organization || o.url || o.contactEmail)
}

function combineOpportunities(manual: Opportunity[]): OpportunityWithSource[] {
  const map = new Map<string, OpportunityWithSource>()

  for (const o of realOpportunities) {
    map.set(o.id, { ...o, origin: 'real' })
  }

  for (const o of mockOpportunities) {
    if (!map.has(o.id)) map.set(o.id, { ...o, origin: 'mock' })
  }

  for (const o of manual) {
    map.set(o.id, { ...o, origin: 'manual' })
  }

  return sortOpportunities(Array.from(map.values()))
}

export default function MatchView({ artist }: MatchViewProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [manualOpportunities, setManualOpportunities] = useState<Opportunity[]>(getManualOpportunities())
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Opportunity | null>(null)
  const [showBlocked, setShowBlocked] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [disciplineFilter, setDisciplineFilter] = useState('all')
  const [importSummary, setImportSummary] = useState('')

  const allOpportunities = useMemo(() => {
    return combineOpportunities(manualOpportunities)
  }, [manualOpportunities])

  const filteredBase = useMemo(() => {
    const q = cleanText(search)

    return allOpportunities.filter(opp => {
      if (typeFilter !== 'all' && opp.type !== typeFilter) return false
      if (countryFilter !== 'all' && cleanText(opp.country) !== cleanText(countryFilter)) return false

      if (
        disciplineFilter !== 'all' &&
        !opp.disciplines.map(cleanText).includes(cleanText(disciplineFilter))
      ) {
        return false
      }

      if (!q) return true

      return cleanText([
        opp.title,
        opp.organization,
        opp.city,
        opp.country,
        opp.countryName,
        opp.type,
        opp.contactEmail,
        opp.notes,
        opp.url,
        ...(opp.disciplines || []),
        ...(opp.keywords || []),
      ].join(' ')).includes(q)
    })
  }, [allOpportunities, search, typeFilter, countryFilter, disciplineFilter])

  const countries = useMemo(() => {
    return Array.from(new Set(allOpportunities.map(o => o.country).filter(Boolean))).sort()
  }, [allOpportunities])

  const disciplines = useMemo(() => {
    return Array.from(new Set(allOpportunities.flatMap(o => o.disciplines || []).filter(Boolean))).sort()
  }, [allOpportunities])

  const types = useMemo(() => {
    return Array.from(new Set(allOpportunities.map(o => o.type).filter(Boolean))).sort()
  }, [allOpportunities])

  const matchedResults = useMemo(() => {
    if (!artist) return []
    return runMatch(artist, filteredBase, { hideBlocked: false })
  }, [artist, filteredBase])

  const viable = matchedResults.filter(r => r.match.blockers.length === 0)
  const blocked = matchedResults.filter(r => r.match.blockers.length > 0)

  function refreshManual() {
    setManualOpportunities(getManualOpportunities())
  }

  function removeManualOpportunity(id: string) {
    if (!confirm('Apagar esta oportunidade manual/importada?')) return
    deleteManualOpportunity(id)
    refreshManual()
  }

  function clearCsv() {
    if (!confirm('Apagar todas as oportunidades importadas por CSV?')) return
    clearCsvOpportunities()
    refreshManual()
    setImportSummary('Oportunidades CSV apagadas.')
  }

  async function handleCsvImport(file: File) {
    const text = await file.text()
    const parsed = parseOpportunitiesCsv(text)

    clearCsvOpportunities()

    const existing = combineOpportunities(
      getManualOpportunities().filter(o => o.source !== 'csv-opportunities')
    )

    let imported = 0
    let duplicated = 0

    for (const opp of parsed) {
      const duplicate = existing.some(e => {
        const sameTitle = cleanText(e.title) && cleanText(e.title) === cleanText(opp.title)
        const sameUrl = cleanText(e.url) && cleanText(e.url) === cleanText(opp.url)
        const sameEmail = cleanText(e.contactEmail) && cleanText(e.contactEmail) === cleanText(opp.contactEmail)
        return sameTitle || sameUrl || sameEmail
      })

      if (duplicate) {
        duplicated++
        continue
      }

      addManualOpportunity(opp)
      imported++
    }

    refreshManual()

    const summary = `${parsed.length} oportunidades lidas · ${imported} importadas · ${duplicated} duplicadas saltadas · CSV anterior substituído`
    setImportSummary(summary)
    alert(summary)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function startEdit(opp: OpportunityWithSource) {
    if (opp.origin !== 'manual') {
      const duplicated: Opportunity = {
        ...opp,
        id: 'manual-opp-' + crypto.randomUUID(),
        source: 'manual',
      }
      setEditing(duplicated)
      return
    }

    setEditing(opp)
  }

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.title}>
            Oportunidades <span style={styles.version}>v4.5</span>
          </h2>

          {artist ? (
            <p style={styles.subtitle}>
              Matches para <b>{artist.name}</b>{' '}
              <span style={styles.muted}>
                · {viable.length} viáveis · {blocked.length} bloqueadas
              </span>
            </p>
          ) : (
            <p style={styles.subtitle}>
              Base geral de oportunidades. Selecciona um artista para ver matching.
            </p>
          )}

          <p style={styles.poolSize}>
            {filteredBase.length} de {allOpportunities.length} oportunidades · {realOpportunities.length} reais ·{' '}
            {mockOpportunities.length} exemplo · {manualOpportunities.length} manuais/importadas
          </p>

          {importSummary && <p style={styles.importSummary}>{importSummary}</p>}
        </div>

        <div style={styles.headerActions}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleCsvImport(file)
            }}
          />

          <button style={styles.importBtn} onClick={() => fileInputRef.current?.click()}>
            📥 Importar CSV
          </button>

          <button style={styles.clearBtn} onClick={clearCsv}>
            Limpar CSV
          </button>

          <button style={styles.primaryBtn} onClick={() => setShowForm(true)}>
            + Adicionar oportunidade
          </button>
        </div>
      </header>

      <div style={styles.helpBox}>
        Formato recomendado do CSV: <b>Nome, Tipo, Site, Datas, Contato, Responsável, Cidade, Observações</b>.
        A coluna Cidade pode estar como <b>AT - Viena</b>, <b>ES - Barcelona</b> ou <b>Viena, AT</b>.
      </div>

      <div style={styles.toolbar}>
        <input
          style={styles.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar por nome, cidade, país, disciplina, contacto, notas..."
        />

        <select style={styles.select} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">Todos os tipos</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select style={styles.select} value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
          <option value="all">Todos os países</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select style={styles.select} value={disciplineFilter} onChange={e => setDisciplineFilter(e.target.value)}>
          <option value="all">Todas as disciplinas</option>
          {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {artist ? (
        <>
          {viable.length > 0 && (
            <section>
              <div style={styles.grid}>
                {viable.slice(0, 80).map(opp => (
                  <OpportunityCard
                    key={opp.id}
                    opp={opp}
                    onDelete={removeManualOpportunity}
                    onEdit={startEdit}
                  />
                ))}
              </div>
            </section>
          )}

          {viable.length === 0 && (
            <div style={styles.emptyResults}>
              Nenhuma oportunidade viável com os filtros actuais.
            </div>
          )}

          {blocked.length > 0 && (
            <section style={{ marginTop: 28 }}>
              <button style={styles.toggleBlocked} onClick={() => setShowBlocked(!showBlocked)}>
                {showBlocked ? '▾' : '▸'} {blocked.length} bloqueadas · porquê?
              </button>

              {showBlocked && (
                <div style={{ ...styles.grid, marginTop: 12 }}>
                  {blocked.slice(0, 40).map(opp => (
                    <OpportunityCard
                      key={opp.id}
                      opp={opp}
                      onDelete={removeManualOpportunity}
                      onEdit={startEdit}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      ) : (
        <section>
          <div style={styles.grid}>
            {filteredBase.map(opp => (
              <BaseOpportunityCard
                key={opp.id}
                opp={opp}
                onDelete={removeManualOpportunity}
                onEdit={startEdit}
              />
            ))}
          </div>

          {filteredBase.length === 0 && (
            <div style={styles.emptyResults}>Nenhuma oportunidade encontrada.</div>
          )}
        </section>
      )}

      {showForm && (
        <OpportunityManualForm
          mode="create"
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            refreshManual()
          }}
        />
      )}

      {editing && (
        <OpportunityManualForm
          mode="edit"
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refreshManual()
          }}
        />
      )}
    </div>
  )
}

function BaseOpportunityCard({
  opp,
  onDelete,
  onEdit,
}: {
  opp: OpportunityWithSource
  onDelete: (id: string) => void
  onEdit: (opp: OpportunityWithSource) => void
}) {
  return (
    <article style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <h3 style={styles.cardTitle}>{opp.title}</h3>
          <div style={styles.badgesRow}>
            <span style={styles.typeBadge}>{opp.type}</span>
            {opp.origin && <span style={styles.originBadge}>{opp.origin}</span>}
          </div>
        </div>
      </div>

      <p style={styles.meta}>
        {opp.organization && opp.organization !== opp.title ? `${opp.organization} · ` : ''}
        {[opp.countryName || opp.country, opp.city].filter(Boolean).join(' · ')}
      </p>

      <p style={styles.meta}>
        {(opp.disciplines || []).join(' · ') || 'sem disciplina'} ·{' '}
        {opp.status === 'rolling'
          ? 'sempre aberto'
          : opp.deadline
          ? `até ${new Date(opp.deadline).toLocaleDateString('pt-PT')}`
          : 'sem deadline'}
      </p>

      {opp.contactEmail && (
        <p style={styles.contactLine}>
          ✉ <a href={`mailto:${opp.contactEmail}`} style={styles.contactLink}>{opp.contactEmail}</a>
        </p>
      )}

      {opp.url && (
        <p style={styles.contactLine}>
          🌐 <a href={opp.url} target="_blank" rel="noreferrer" style={styles.contactLink}>{opp.url}</a>
        </p>
      )}

      {opp.notes && <p style={styles.notes}>{opp.notes}</p>}

      <div style={styles.cardFooter}>
        <button style={styles.secondaryBtn} onClick={() => onEdit(opp)}>
          {opp.origin === 'manual' ? 'Editar' : 'Duplicar / editar'}
        </button>

        {opp.origin === 'manual' && (
          <button style={styles.deleteBtn} onClick={() => onDelete(opp.id)}>
            Apagar
          </button>
        )}
      </div>
    </article>
  )
}

function OpportunityCard({
  opp,
  onDelete,
  onEdit,
}: {
  opp: ScoredOpportunity & OpportunityWithSource
  onDelete: (id: string) => void
  onEdit: (opp: OpportunityWithSource) => void
}) {
  const { match } = opp
  const isBlocked = match.blockers.length > 0

  const scoreColor = isBlocked
    ? '#666'
    : match.percentage >= 70
    ? '#6ef3a5'
    : match.percentage >= 40
    ? '#ffcf5c'
    : '#ff8a8a'

  return (
    <article style={{ ...styles.card, opacity: isBlocked ? 0.55 : 1 }}>
      <div style={styles.cardHeader}>
        <div>
          <h3 style={styles.cardTitle}>{opp.title}</h3>
          <div style={styles.badgesRow}>
            <span style={styles.typeBadge}>{opp.type}</span>
            {opp.origin && <span style={styles.originBadge}>{opp.origin}</span>}
          </div>
        </div>

        <span style={{ ...styles.score, color: scoreColor }}>{match.percentage}%</span>
      </div>

      <p style={styles.meta}>
        {opp.organization !== opp.title && `${opp.organization} · `}
        {opp.countryName || opp.country}
        {opp.city ? ` · ${opp.city}` : ''}
      </p>

      <p style={styles.meta}>
        {(opp.disciplines || []).join(' · ')}
        {' · '}
        {opp.status === 'rolling'
          ? 'sempre aberto'
          : `até ${new Date(opp.deadline).toLocaleDateString('pt-PT')}`}
      </p>

      {opp.contactEmail && (
        <p style={styles.contactLine}>
          ✉ <a href={`mailto:${opp.contactEmail}`} style={styles.contactLink}>{opp.contactEmail}</a>
        </p>
      )}

      {match.reasons.length > 0 && (
        <div style={styles.block}>
          <strong style={styles.blockTitle}>✓ A favor</strong>
          <ul style={styles.list}>
            {match.reasons.slice(0, 4).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {match.warnings.length > 0 && (
        <div style={styles.blockWarn}>
          <strong style={styles.blockTitle}>⚠ Atenção</strong>
          <ul style={styles.list}>
            {match.warnings.slice(0, 3).map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {match.blockers.length > 0 && (
        <div style={styles.blockError}>
          <strong style={styles.blockTitle}>✕ Bloqueios</strong>
          <ul style={styles.list}>
            {match.blockers.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      )}

      <div style={styles.cardFooter}>
        <button style={styles.secondaryBtn} onClick={() => onEdit(opp)}>
          {opp.origin === 'manual' ? 'Editar' : 'Duplicar / editar'}
        </button>

        {opp.origin === 'manual' && (
          <button style={styles.deleteBtn} onClick={() => onDelete(opp.id)}>
            Apagar
          </button>
        )}
      </div>
    </article>
  )
}

function OpportunityManualForm({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  initial?: Opportunity
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<Partial<Opportunity>>(
    initial || {
      title: '',
      organization: '',
      country: '',
      countryName: '',
      city: '',
      url: '',
      type: 'open_call',
      status: 'open',
      disciplines: [],
      languages: [],
      coversCosts: false,
      deadline: '',
      contactEmail: '',
      notes: '',
      source: 'manual',
    }
  )

  function update(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function save() {
    if (!form.title?.trim()) {
      alert('Título obrigatório.')
      return
    }

    const opp: Opportunity = {
      id: initial?.id || 'manual-opp-' + crypto.randomUUID(),
      title: form.title || '',
      organization: form.organization || form.title || '',
      url: form.url || '',
      type: form.type as any,
      status: form.status as any,
      country: form.country || '',
      countryName: form.countryName || form.country || '',
      city: form.city || '',
      disciplines: form.disciplines || [],
      languages: form.languages || [],
      coversCosts: !!form.coversCosts,
      deadline: form.deadline || '2026-12-31',
      contactEmail: form.contactEmail || '',
      notes: form.notes || '',
      source: initial?.source || 'manual',
      keywords: form.keywords || [],
    }

    if (mode === 'edit') updateManualOpportunity(opp)
    else addManualOpportunity(opp)

    onSaved()
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitle}>
          {mode === 'edit' ? 'Editar oportunidade' : 'Nova oportunidade'}
        </h3>

        <div style={styles.formGrid}>
          <input style={styles.input} placeholder="Título *" value={form.title || ''} onChange={e => update('title', e.target.value)} />
          <input style={styles.input} placeholder="Organização / venue" value={form.organization || ''} onChange={e => update('organization', e.target.value)} />
          <input style={styles.input} placeholder="País (AT, ES, PT...)" value={form.country || ''} onChange={e => update('country', e.target.value)} />
          <input style={styles.input} placeholder="Cidade" value={form.city || ''} onChange={e => update('city', e.target.value)} />
          <input style={styles.input} placeholder="Website / edital" value={form.url || ''} onChange={e => update('url', e.target.value)} />
          <input style={styles.input} placeholder="Email contacto" value={form.contactEmail || ''} onChange={e => update('contactEmail', e.target.value)} />
          <input style={styles.input} type="date" value={form.deadline || ''} onChange={e => update('deadline', e.target.value)} />

          <select style={styles.input} value={form.type || 'open_call'} onChange={e => update('type', e.target.value)}>
            <option value="open_call">Edital / Open call</option>
            <option value="festival">Festival</option>
            <option value="residency">Residência</option>
            <option value="showcase">Showcase</option>
            <option value="grant">Financiamento</option>
            <option value="commission">Comissão</option>
          </select>

          <input
            style={styles.input}
            placeholder="Disciplinas: musica, danca, performance..."
            value={(form.disciplines || []).join(', ')}
            onChange={e => update('disciplines', e.target.value.split(',').map(x => cleanText(x)).filter(Boolean))}
          />

          <input
            style={styles.input}
            placeholder="Idiomas: pt, es, en..."
            value={(form.languages || []).join(', ')}
            onChange={e => update('languages', e.target.value.split(',').map(x => cleanText(x)).filter(Boolean))}
          />
        </div>

        <label style={styles.checkbox}>
          <input type="checkbox" checked={!!form.coversCosts} onChange={e => update('coversCosts', e.target.checked)} />
          Cobre custos
        </label>

        <textarea
          style={styles.textarea}
          placeholder="Notas / requisitos / documentos / responsáveis"
          value={form.notes || ''}
          onChange={e => update('notes', e.target.value)}
        />

        <div style={styles.modalActions}>
          <button style={styles.secondaryBtn} onClick={onClose}>Cancelar</button>
          <button style={styles.primaryBtn} onClick={save}>
            {mode === 'edit' ? 'Guardar alterações' : 'Guardar oportunidade'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { maxWidth: 1180, margin: '0 auto', padding: '24px 20px', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14 },
  headerActions: { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' },
  title: { margin: 0, fontSize: 24, color: '#fff' },
  version: { fontSize: 11, color: '#6ef3a5', background: 'rgba(110,243,165,0.12)', padding: '2px 8px', borderRadius: 10, marginLeft: 8 },
  subtitle: { margin: '5px 0 0', color: '#bbb', fontSize: 14 },
  poolSize: { margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  importSummary: { margin: '5px 0 0', color: '#6ef3a5', fontSize: 12 },
  muted: { opacity: 0.7 },
  helpBox: { marginBottom: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 10, color: 'rgba(255,255,255,0.58)', fontSize: 12, lineHeight: 1.5 },
  toolbar: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, marginBottom: 18 },
  search: { padding: '11px 14px', background: '#0a0a0a', color: '#fff', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 13, outline: 'none' },
  select: { padding: '11px 14px', background: '#0a0a0a', color: '#fff', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 13, outline: 'none' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 },
  card: { background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, padding: 16, color: '#eee' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  cardTitle: { margin: 0, fontSize: 16, lineHeight: 1.3 },
  badgesRow: { display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  typeBadge: { display: 'inline-block', fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' },
  originBadge: { display: 'inline-block', fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(110,243,165,0.10)', color: '#6ef3a5' },
  score: { fontWeight: 700, fontSize: 20, whiteSpace: 'nowrap' },
  meta: { margin: '6px 0', fontSize: 13, color: '#aaa' },
  contactLine: { margin: '6px 0', fontSize: 12, color: 'rgba(255,255,255,0.5)', wordBreak: 'break-all' },
  contactLink: { color: '#7ab6ff', textDecoration: 'none' },
  notes: { fontSize: 12, color: 'rgba(255,255,255,0.50)', lineHeight: 1.5, marginTop: 10 },
  block: { marginTop: 10, padding: 8, background: 'rgba(110, 243, 165, 0.08)', borderRadius: 6 },
  blockWarn: { marginTop: 8, padding: 8, background: 'rgba(255, 207, 92, 0.08)', borderRadius: 6 },
  blockError: { marginTop: 8, padding: 8, background: 'rgba(255, 138, 138, 0.08)', borderRadius: 6 },
  blockTitle: { fontSize: 12, display: 'block', marginBottom: 4 },
  list: { margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 },
  cardFooter: { marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  deleteBtn: { background: 'rgba(255,70,70,0.12)', color: '#ff8a8a', border: '1px solid rgba(255,70,70,0.25)', borderRadius: 8, padding: '7px 10px', fontSize: 12, cursor: 'pointer' },
  toggleBlocked: { background: 'transparent', border: '0.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.65)', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  emptyResults: { textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  primaryBtn: { background: '#1676a3', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  importBtn: { background: 'rgba(255,207,92,0.10)', color: '#ffcf5c', border: '1px solid rgba(255,207,92,0.30)', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  clearBtn: { background: 'rgba(255,80,80,0.10)', color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.25)', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  secondaryBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { width: 'min(860px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#050505', border: '1px solid #1676a3', borderRadius: 14, padding: 22 },
  modalTitle: { margin: '0 0 18px', color: '#fff', fontSize: 22 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 },
  input: { background: '#111', color: '#fff', border: '1px solid #1676a3', borderRadius: 8, padding: '11px 12px', fontSize: 13, outline: 'none' },
  checkbox: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, fontSize: 13, color: '#ddd' },
  textarea: { width: '100%', minHeight: 110, marginTop: 10, background: '#111', color: '#fff', border: '1px solid #1676a3', borderRadius: 8, padding: 12, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
}