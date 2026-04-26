// src/components/MatchView.tsx
// SOMA ODÉ — Oportunidades v5 (Claude · 2026-04-25)
// Buscador geral + importar CSV + adicionar manualmente + EDITAR qualquer oportunidade
// Quando editas uma oportunidade real/mock, guarda uma cópia em manualOpportunitiesStore
// (override). A original fica intacta no código.

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

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface MatchViewProps {
  artist: Artist | null
}

type OppWithOrigin = Opportunity & { _origin: 'real' | 'mock' | 'manual' }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clean(v?: string) {
  return (v || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim()
}

function combineAll(manual: Opportunity[]): OppWithOrigin[] {
  const map = new Map<string, OppWithOrigin>()
  for (const o of realOpportunities) map.set(o.id, { ...o, _origin: 'real' })
  for (const o of mockOpportunities) if (!map.has(o.id)) map.set(o.id, { ...o, _origin: 'mock' })
  for (const o of manual) map.set(o.id, { ...o, _origin: 'manual' })
  return Array.from(map.values()).sort((a, b) => clean(a.title).localeCompare(clean(b.title)))
}

function parseLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue }
    if ((ch === ',' || ch === ';') && !inQ) { out.push(cur.trim()); cur = ''; continue }
    cur += ch
  }
  out.push(cur.trim())
  return out
}

function normH(h: string) {
  return clean(h).replace(/\s+/g, '_').replace(/-/g, '_')
}

function gv(row: Record<string, string>, keys: string[]) {
  for (const k of keys) { const v = row[normH(k)]; if (v) return v }
  return ''
}

function parseCity(raw: string): { country: string; city: string } {
  const s = (raw || '').trim()
  if (!s) return { country: '', city: '' }
  if (s.includes(' - ')) {
    const [c, ...rest] = s.split(' - ')
    return { country: c.trim(), city: rest.join(' - ').trim() }
  }
  if (s.includes(',')) {
    const [city, country] = s.split(',').map(x => x.trim())
    return { country, city }
  }
  return { country: '', city: s }
}

function guessType(t: string): Opportunity['type'] {
  const s = clean(t)
  if (s.includes('festival')) return 'festival'
  if (s.includes('showcase')) return 'showcase'
  if (s.includes('resid')) return 'residency'
  if (s.includes('grant') || s.includes('financ') || s.includes('fundo')) return 'grant'
  if (s.includes('commission') || s.includes('comissao')) return 'commission'
  return 'open_call'
}

function guessDiscs(typeRaw: string, discRaw: string): string[] {
  if (discRaw) return discRaw.split(/[,;|]/).map(d => clean(d)).filter(Boolean)
  const t = clean(typeRaw)
  if (t.includes('teatro') || t.includes('theatre')) return ['teatro']
  if (t.includes('danca') || t.includes('dance')) return ['danca']
  if (t.includes('cinema') || t.includes('film')) return ['cinema']
  if (t.includes('performance')) return ['performance']
  return ['musica']
}

function normCC(raw: string): string {
  const code = raw.toUpperCase().trim()
  const fix: Record<string, string> = { GE: 'DE', CZE: 'CZ', WAL: 'GB', UK: 'GB' }
  return fix[code] || code
}

function parseCsv(text: string): Opportunity[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = parseLine(lines[0]).map(normH)
  const results: Opportunity[] = []

  for (const line of lines.slice(1)) {
    const vals = parseLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = vals[i] || '' })

    const name    = gv(row, ['nome', 'name', 'titulo', 'title', 'festival', 'venue'])
    const typeRaw = gv(row, ['tipo', 'type', 'categoria'])
    const site    = gv(row, ['site', 'website', 'url', 'link', 'web'])
    const dates   = gv(row, ['datas', 'dates', 'data', 'date'])
    const email   = gv(row, ['contato', 'contacto', 'email', 'mail', 'e_mail'])
    const resp    = gv(row, ['responsavel', 'responsavel', 'responsible', 'programador'])
    const cityRaw = gv(row, ['cidade', 'city', 'local', 'location'])
    const paisRaw = gv(row, ['pais', 'country', 'pais_codigo', 'country_code', 'codigo'])
    const obs     = gv(row, ['observacoes', 'observacoes', 'observations', 'notas', 'notes'])
    const discRaw = gv(row, ['disciplinas', 'disciplines', 'area', 'areas'])

    if (!name && !site && !email) continue

    let country = ''
    let city = cityRaw
    if (paisRaw) {
      country = normCC(paisRaw)
    } else {
      const geo = parseCity(cityRaw)
      country = geo.country
      city = geo.city
    }

    const title = name || '(sem nome)'
    if (title === '(sem nome)' && !site) continue

    const notes = [
      typeRaw && 'Tipo: ' + typeRaw,
      dates   && 'Datas: ' + dates,
      resp    && 'Responsavel: ' + resp,
      obs,
    ].filter(Boolean).join(' . ')

    results.push({
      id: 'csv-opp-' + crypto.randomUUID(),
      title,
      organization: name || title,
      url: site || '',
      type: guessType(typeRaw),
      status: 'open',
      country,
      countryName: country,
      city,
      disciplines: guessDiscs(typeRaw, discRaw),
      languages: [],
      coversCosts: false,
      deadline: '2026-12-31',
      contactEmail: email || undefined,
      contactPerson: resp || undefined,
      notes: notes || undefined,
      source: 'csv-opportunities',
      keywords: [typeRaw, city, country].filter(Boolean),
    } as Opportunity)
  }
  return results
}

// ─── Estado vazio do formulário ───────────────────────────────────────────────

function emptyForm(): Partial<Opportunity> {
  return {
    title: '', organization: '', url: '', type: 'open_call', status: 'open',
    country: '', countryName: '', city: '', disciplines: [], languages: [],
    coversCosts: false, deadline: '', contactEmail: '', notes: '', keywords: [],
    description: '', feeOffered: undefined, peopleSupported: undefined,
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MatchView({ artist }: MatchViewProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const [manual, setManual] = useState<Opportunity[]>(getManualOpportunities)
  const [editing, setEditing] = useState<{ opp: Partial<Opportunity>; isNew: boolean } | null>(null)
  const [showBlocked, setShowBlocked] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [costsFilter, setCostsFilter] = useState(false)
  const [importNote, setImportNote] = useState('')

  const all = useMemo(() => combineAll(manual), [manual])

  const filtered = useMemo(() => {
    const q = clean(search)
    return all.filter(o => {
      if (typeFilter !== 'all' && o.type !== typeFilter) return false
      if (countryFilter !== 'all' && clean(o.country) !== clean(countryFilter)) return false
      if (costsFilter && !o.coversCosts) return false
      if (!q) return true
      return clean([o.title, o.organization, o.city, o.country, o.contactEmail, o.notes, ...(o.disciplines || []), ...(o.keywords || [])].join(' ')).includes(q)
    })
  }, [all, search, typeFilter, countryFilter, costsFilter])

  const countries = useMemo(() => Array.from(new Set(all.map(o => o.country).filter(Boolean))).sort(), [all])
  const types = useMemo(() => Array.from(new Set(all.map(o => o.type).filter(Boolean))).sort(), [all])

  const matched = useMemo(() => {
    if (!artist) return []
    return runMatch(artist, filtered, { hideBlocked: false })
  }, [artist, filtered])

  const viable = matched.filter(r => r.match.blockers.length === 0)
  const blocked = matched.filter(r => r.match.blockers.length > 0)

  function refresh() { setManual(getManualOpportunities()) }

  // — Importar CSV
  async function handleCsv(file: File) {
    const text = await file.text()
    const parsed = parseCsv(text)
    clearCsvOpportunities()
    parsed.forEach(addManualOpportunity)
    refresh()
    setImportNote(`✅ ${parsed.length} oportunidades importadas`)
    if (fileRef.current) fileRef.current.value = ''
  }

  // — Abrir editor
  function openEdit(opp: OppWithOrigin) {
    if (opp._origin === 'manual') {
      setEditing({ opp: { ...opp }, isNew: false })
    } else {
      // Cria cópia editável em manual (override)
      setEditing({ opp: { ...opp, id: opp.id, source: 'manual' }, isNew: true })
    }
  }

  function openNew() {
    setEditing({ opp: emptyForm(), isNew: true })
  }

  // — Guardar edição
  function saveEdit() {
    if (!editing) return
    const { opp, isNew } = editing
    if (!opp.title?.trim()) { alert('Título obrigatório.'); return }
    const final: Opportunity = {
      id: opp.id || 'manual-opp-' + crypto.randomUUID(),
      title: opp.title || '',
      organization: opp.organization || opp.title || '',
      url: opp.url || '',
      type: (opp.type as Opportunity['type']) || 'open_call',
      status: (opp.status as Opportunity['status']) || 'open',
      country: opp.country || '',
      countryName: opp.countryName || opp.country || '',
      city: opp.city || '',
      disciplines: opp.disciplines || [],
      languages: opp.languages || [],
      coversCosts: !!opp.coversCosts,
      deadline: opp.deadline || '2026-12-31',
      contactEmail: opp.contactEmail || '',
      contactPerson: opp.contactPerson || '',
      notes: opp.notes || '',
      description: opp.description || '',
      feeOffered: opp.feeOffered,
      peopleSupported: opp.peopleSupported,
      source: 'manual',
      keywords: opp.keywords || [],
    }
    if (isNew) addManualOpportunity(final)
    else updateManualOpportunity(final)
    refresh()
    setEditing(null)
  }

  function deleteOpp(id: string) {
    if (!confirm('Apagar esta oportunidade?')) return
    deleteManualOpportunity(id)
    refresh()
  }

  const manualIds = useMemo(() => new Set(manual.map(o => o.id)), [manual])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={s.wrap}>

      {/* Header */}
      <header style={s.header}>
        <div>
          <h2 style={s.title}>Oportunidades <span style={s.badge}>v5</span></h2>
          {artist
            ? <p style={s.sub}>Matches para <b>{artist.name}</b> · {viable.length} viáveis · {blocked.length} bloqueadas</p>
            : <p style={s.sub}>Base geral · selecciona um artista para ver matching</p>}
          <p style={s.pool}>{filtered.length} de {all.length} · {realOpportunities.length} reais · {mockOpportunities.length} exemplo · {manual.length} manuais</p>
          {importNote && <p style={s.note}>{importNote}</p>}
        </div>
        <div style={s.actions}>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleCsv(f) }} />
          <button style={s.btnImport} onClick={() => fileRef.current?.click()}>📥 Importar CSV</button>
          <button style={s.btnClear} onClick={() => { clearCsvOpportunities(); refresh(); setImportNote('CSV apagado') }}>Limpar CSV</button>
          <button style={s.btnPrimary} onClick={openNew}>+ Adicionar</button>
        </div>
      </header>

      {/* Filtros */}
      <div style={s.toolbar}>
        <input style={s.search} value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar por nome, cidade, email, disciplina..." />
        <select style={s.select} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">Todos os tipos</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={s.select} value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
          <option value="all">Todos os países</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={s.checkLabel}>
          <input type="checkbox" checked={costsFilter} onChange={e => setCostsFilter(e.target.checked)} style={{ accentColor: '#1A6994' }} />
          Só com custos cobertos
        </label>
      </div>

      {/* Lista com matching ou sem */}
      {artist ? (
        <>
          <div style={s.grid}>
            {viable.map(o => <OppCard key={o.id} opp={o} isManual={manualIds.has(o.id)} onEdit={() => openEdit(o as OppWithOrigin)} onDelete={() => deleteOpp(o.id)} />)}
          </div>
          {viable.length === 0 && <div style={s.empty}>Nenhuma oportunidade viável com estes filtros.</div>}
          {blocked.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <button style={s.toggleBtn} onClick={() => setShowBlocked(!showBlocked)}>
                {showBlocked ? '▾' : '▸'} {blocked.length} bloqueadas · porquê?
              </button>
              {showBlocked && (
                <div style={{ ...s.grid, marginTop: 12 }}>
                  {blocked.map(o => <OppCard key={o.id} opp={o} isManual={manualIds.has(o.id)} onEdit={() => openEdit(o as OppWithOrigin)} onDelete={() => deleteOpp(o.id)} />)}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div style={s.grid}>
          {filtered.map(o => <BaseCard key={o.id} opp={o} isManual={manualIds.has(o.id)} onEdit={() => openEdit(o)} onDelete={() => deleteOpp(o.id)} />)}
          {filtered.length === 0 && <div style={s.empty}>Nenhuma oportunidade encontrada.</div>}
        </div>
      )}

      {/* Modal de edição */}
      {editing && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>{editing.isNew && !editing.opp.id ? 'Nova oportunidade' : 'Editar oportunidade'}</h3>

            <div style={s.formGrid}>
              <Field label="Título *" value={editing.opp.title || ''} onChange={v => setEditing(e => e && { ...e, opp: { ...e.opp, title: v } })} />
              <Field label="Organização / venue" value={editing.opp.organization || ''} onChange={v => setEditing(e => e && { ...e, opp: { ...e.opp, organization: v } })} />
              <Field label="País (ES, PT, AT...)" value={editing.opp.country || ''} onChange={v => setEditing(e => e && { ...e, opp: { ...e.opp, country: v, countryName: v } })} />
              <Field label="Cidade" value={editing.opp.city || ''} onChange={v => setEditing(e => e && { ...e, opp: { ...e.opp, city: v } })} />
              <Field label="Website / edital" value={editing.opp.url || ''} onChange={v => setEditing(e => e && { ...e, opp: { ...e.opp, url: v } })} />
              <Field label="Email contacto" value={editing.opp.contactEmail || ''} onChange={v => setEditing(e => e && { ...e, opp: { ...e.opp, contactEmail: v } })} />
              <Field label="Pessoa contacto" value={editing.opp.contactPerson || ''} onChange={v => setEditing(e => e && { ...e, opp: { ...e.opp, contactPerson: v } })} />
              <Field label="Deadline (AAAA-MM-DD)" value={editing.opp.deadline || ''} onChange={v => setEditing(e => e && { ...e, opp: { ...e.opp, deadline: v } })} type="date" />
              <Field label="Cachê oferecido (€)" value={String(editing.opp.feeOffered || '')} onChange={v => setEditing(e => e && { ...e, opp: { ...e.opp, feeOffered: v ? Number(v) : undefined } })} type="number" />
              <Field label="Pessoas suportadas" value={String(editing.opp.peopleSupported || '')} onChange={v => setEditing(e => e && { ...e, opp: { ...e.opp, peopleSupported: v ? Number(v) : undefined } })} type="number" />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={s.fieldLabel}>Tipo</label>
                <select style={s.input} value={editing.opp.type || 'open_call'}
                  onChange={e => setEditing(ed => ed && { ...ed, opp: { ...ed.opp, type: e.target.value as Opportunity['type'] } })}>
                  <option value="open_call">Edital / Open call</option>
                  <option value="festival">Festival</option>
                  <option value="residency">Residência</option>
                  <option value="showcase">Showcase</option>
                  <option value="grant">Financiamento</option>
                  <option value="commission">Comissão</option>
                  <option value="venue">Venue / Sala</option>
                  <option value="market">Mercado profissional</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={s.fieldLabel}>Status</label>
                <select style={s.input} value={editing.opp.status || 'open'}
                  onChange={e => setEditing(ed => ed && { ...ed, opp: { ...ed.opp, status: e.target.value as Opportunity['status'] } })}>
                  <option value="open">Aberto</option>
                  <option value="rolling">Sempre aberto</option>
                  <option value="closed">Fechado</option>
                  <option value="draft">Rascunho</option>
                </select>
              </div>
            </div>

            <Field label="Disciplinas (musica, danca, performance...)" value={(editing.opp.disciplines || []).join(', ')}
              onChange={v => setEditing(e => e && { ...e, opp: { ...e.opp, disciplines: v.split(',').map(x => x.trim().toLowerCase()).filter(Boolean) } })} full />

            <Field label="Idiomas (pt, es, en, fr...)" value={(editing.opp.languages || []).join(', ')}
              onChange={v => setEditing(e => e && { ...e, opp: { ...e.opp, languages: v.split(',').map(x => x.trim().toLowerCase()).filter(Boolean) } })} full />

            <Field label="Keywords (separadas por vírgula)" value={(editing.opp.keywords || []).join(', ')}
              onChange={v => setEditing(e => e && { ...e, opp: { ...e.opp, keywords: v.split(',').map(x => x.trim()).filter(Boolean) } })} full />

            <label style={s.checkLabel}>
              <input type="checkbox" checked={!!editing.opp.coversCosts}
                onChange={e => setEditing(ed => ed && { ...ed, opp: { ...ed.opp, coversCosts: e.target.checked } })}
                style={{ accentColor: '#1A6994' }} />
              Cobre custos (viagem / alojamento)
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
              <label style={s.fieldLabel}>Notas / requisitos / responsáveis</label>
              <textarea style={s.textarea} value={editing.opp.notes || ''}
                onChange={e => setEditing(ed => ed && { ...ed, opp: { ...ed.opp, notes: e.target.value } })}
                placeholder="Notas internas, requisitos da candidatura, responsáveis..." />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
              <label style={s.fieldLabel}>Descrição pública</label>
              <textarea style={s.textarea} value={editing.opp.description || ''}
                onChange={e => setEditing(ed => ed && { ...ed, opp: { ...ed.opp, description: e.target.value } })}
                placeholder="Descrição do edital / festival para mostrar na ficha..." />
            </div>

            <div style={s.modalActions}>
              <button style={s.btnSecondary} onClick={() => setEditing(null)}>Cancelar</button>
              <button style={s.btnPrimary} onClick={saveEdit}>
                {editing.isNew && !editing.opp.id ? 'Criar oportunidade' : 'Guardar alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, value, onChange, type = 'text', full }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; full?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: full ? '1 / -1' : undefined }}>
      <label style={s.fieldLabel}>{label}</label>
      <input style={s.input} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={label} />
    </div>
  )
}

// ─── Card com matching ────────────────────────────────────────────────────────

function OppCard({ opp, isManual, onEdit, onDelete }: {
  opp: ScoredOpportunity; isManual: boolean; onEdit: () => void; onDelete: () => void
}) {
  const { match } = opp
  const blocked = match.blockers.length > 0
  const color = blocked ? '#666' : match.percentage >= 70 ? '#6ef3a5' : match.percentage >= 40 ? '#ffcf5c' : '#ff8a8a'

  return (
    <article style={{ ...s.card, opacity: blocked ? 0.55 : 1 }}>
      <div style={s.cardTop}>
        <div>
          <h3 style={s.cardTitle}>{opp.title}</h3>
          <div style={s.pills}>
            <span style={s.pill}>{opp.type}</span>
            {opp.coversCosts && <span style={{ ...s.pill, background: 'rgba(93,202,165,0.15)', color: '#5dcaa5' }}>custos cobertos</span>}
          </div>
        </div>
        <span style={{ ...s.score, color }}>{match.percentage}%</span>
      </div>

      <p style={s.meta}>{[opp.organization !== opp.title && opp.organization, opp.countryName || opp.country, opp.city].filter(Boolean).join(' · ')}</p>
      <p style={s.meta}>{(opp.disciplines || []).join(' · ')} · {opp.status === 'rolling' ? '🔁 sempre aberto' : `até ${new Date(opp.deadline).toLocaleDateString('pt-PT')}`}</p>
      {opp.contactEmail && <p style={s.contact}>✉ <a href={`mailto:${opp.contactEmail}`} style={s.link}>{opp.contactEmail}</a></p>}
      {opp.feeOffered && <p style={s.meta}>💶 €{opp.feeOffered}</p>}

      {match.reasons.length > 0 && <Block color="rgba(110,243,165,0.08)" title="✓ A favor" items={match.reasons.slice(0, 3)} />}
      {match.warnings.length > 0 && <Block color="rgba(255,207,92,0.08)" title="⚠ Atenção" items={match.warnings.slice(0, 3)} />}
      {match.blockers.length > 0 && <Block color="rgba(255,138,138,0.08)" title="✕ Bloqueios" items={match.blockers} />}

      <div style={s.cardFooter}>
        <button style={s.btnEdit} onClick={onEdit}>✏ Editar</button>
        {opp.url && <a href={opp.url} target="_blank" rel="noreferrer" style={s.link}>ver site →</a>}
        {isManual && <button style={s.btnDelete} onClick={onDelete}>apagar</button>}
      </div>
    </article>
  )
}

// ─── Card sem matching ────────────────────────────────────────────────────────

function BaseCard({ opp, isManual, onEdit, onDelete }: {
  opp: OppWithOrigin; isManual: boolean; onEdit: () => void; onDelete: () => void
}) {
  return (
    <article style={s.card}>
      <div style={s.cardTop}>
        <div>
          <h3 style={s.cardTitle}>{opp.title}</h3>
          <div style={s.pills}>
            <span style={s.pill}>{opp.type}</span>
            {opp._origin !== 'manual' && <span style={{ ...s.pill, background: 'rgba(110,243,165,0.1)', color: '#6ef3a5' }}>{opp._origin}</span>}
            {opp.coversCosts && <span style={{ ...s.pill, background: 'rgba(93,202,165,0.15)', color: '#5dcaa5' }}>custos cobertos</span>}
          </div>
        </div>
      </div>
      <p style={s.meta}>{[opp.organization !== opp.title && opp.organization, opp.countryName || opp.country, opp.city].filter(Boolean).join(' · ')}</p>
      <p style={s.meta}>{(opp.disciplines || []).join(' · ')} · {opp.status === 'rolling' ? '🔁 sempre aberto' : opp.deadline ? `até ${new Date(opp.deadline).toLocaleDateString('pt-PT')}` : '—'}</p>
      {opp.contactEmail && <p style={s.contact}>✉ <a href={`mailto:${opp.contactEmail}`} style={s.link}>{opp.contactEmail}</a></p>}
      {opp.feeOffered && <p style={s.meta}>💶 €{opp.feeOffered}</p>}
      {opp.notes && <p style={s.notes}>{opp.notes}</p>}
      <div style={s.cardFooter}>
        <button style={s.btnEdit} onClick={onEdit}>✏ Editar</button>
        {opp.url && <a href={opp.url} target="_blank" rel="noreferrer" style={s.link}>ver site →</a>}
        {isManual && <button style={s.btnDelete} onClick={onDelete}>apagar</button>}
      </div>
    </article>
  )
}

// ─── Block de razões/avisos ───────────────────────────────────────────────────

function Block({ color, title, items }: { color: string; title: string; items: string[] }) {
  return (
    <div style={{ marginTop: 8, padding: 8, background: color, borderRadius: 6 }}>
      <strong style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{title}</strong>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.5 }}>
        {items.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1180, margin: '0 auto', padding: '24px 20px', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 24, color: '#fff' },
  badge: { fontSize: 11, color: '#6ef3a5', background: 'rgba(110,243,165,0.12)', padding: '2px 8px', borderRadius: 10, marginLeft: 8, fontWeight: 400 },
  sub: { margin: '4px 0 0', color: '#bbb', fontSize: 14 },
  pool: { margin: '3px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  note: { margin: '4px 0 0', color: '#6ef3a5', fontSize: 12 },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
  toolbar: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 10, marginBottom: 18, alignItems: 'center' },
  search: { padding: '10px 14px', background: '#0a0a0a', color: '#fff', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 13, outline: 'none' },
  select: { padding: '10px 14px', background: '#0a0a0a', color: '#fff', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 13, outline: 'none' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.65)', cursor: 'pointer', whiteSpace: 'nowrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 },
  card: { background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, padding: 16, color: '#eee', display: 'flex', flexDirection: 'column', gap: 4 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 },
  cardTitle: { margin: 0, fontSize: 15, lineHeight: 1.3, color: '#fff' },
  pills: { display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  pill: { fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' },
  score: { fontWeight: 700, fontSize: 20, whiteSpace: 'nowrap' },
  meta: { margin: '2px 0', fontSize: 13, color: '#aaa' },
  contact: { margin: '2px 0', fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  notes: { fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 },
  link: { color: '#7ab6ff', textDecoration: 'none' },
  cardFooter: { marginTop: 10, display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' },
  btnEdit: { background: 'rgba(26,105,148,0.15)', color: '#60b4e8', border: '0.5px solid rgba(26,105,148,0.4)', borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  btnDelete: { background: 'rgba(255,70,70,0.1)', color: '#ff8a8a', border: '0.5px solid rgba(255,70,70,0.3)', borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  toggleBtn: { background: 'transparent', border: '0.5px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  empty: { textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.35)', fontSize: 14 },
  btnPrimary: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer' },
  btnImport: { background: 'rgba(255,207,92,0.1)', color: '#ffcf5c', border: '1px solid rgba(255,207,92,0.3)', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnClear: { background: 'rgba(255,80,80,0.08)', color: '#ff8a8a', border: '1px solid rgba(255,80,80,0.25)', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { width: 'min(900px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#050505', border: '1px solid #1A6994', borderRadius: 14, padding: 24 },
  modalTitle: { margin: '0 0 20px', color: '#fff', fontSize: 22 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 10 },
  fieldLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.05em' },
  input: { background: '#111', color: '#fff', border: '1px solid rgba(26,105,148,0.5)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' },
  textarea: { background: '#111', color: '#fff', border: '1px solid rgba(26,105,148,0.5)', borderRadius: 8, padding: 10, fontSize: 13, outline: 'none', width: '100%', minHeight: 80, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
}