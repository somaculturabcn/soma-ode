// src/components/CsvImporter.tsx
// SOMA ODÉ v7 — Importador de CSV para oportunidades/festivais
// Suporta: festival, venue, residency, open_call, etc.
// Colunas esperadas: title, organization, country, city, type, deadline, url, disciplines, ...

import { useState, useRef } from 'react'
import type { Opportunity, OpportunityType } from '../types/opportunity'
import { addManualOpportunity } from '../data/manualOpportunitiesStore'

interface Props {
  onClose: () => void
  onImported: (count: number) => void
}

type ParsedRow = Record<string, string>

// ── Mapeamento de colunas CSV → campos Opportunity ─────────────────────────

const COLUMN_MAP: Record<string, keyof Opportunity | 'skip'> = {
  // Português
  titulo: 'title', nome: 'title', festival: 'title',
  organizacao: 'organization', organizaçao: 'organization', entidade: 'organization',
  pais: 'country', país: 'country',
  cidade: 'city',
  tipo: 'type',
  prazo: 'deadline', deadline: 'deadline', data_limite: 'deadline',
  url: 'url', link: 'url', website: 'url', site: 'url',
  disciplinas: 'disciplines', areas: 'disciplines', area: 'disciplines',
  descricao: 'description', descrição: 'description',
  notas: 'notes',
  email: 'contactEmail', contacto: 'contactEmail',
  cache: 'feeOffered', cachê: 'feeOffered', fee: 'feeOffered',
  moeda: 'feeCurrency', currency: 'feeCurrency',
  cobre_custos: 'coversCosts',
  data_abertura: 'openingDate', abertura: 'openingDate',
  data_evento: 'eventDate', evento: 'eventDate',
  idiomas: 'languages',
  // English
  title: 'title', name: 'title',
  organization: 'organization', org: 'organization',
  country: 'country',
  city: 'city',
  type: 'type',
  disciplines: 'disciplines',
  description: 'description',
  notes: 'notes',
  contact_email: 'contactEmail',
  covers_costs: 'coversCosts',
  opening_date: 'openingDate',
  event_date: 'eventDate',
  languages: 'languages',
  region: 'region',
  keywords: 'keywords',
  status: 'status',
}

const VALID_TYPES: OpportunityType[] = ['festival', 'residency', 'grant', 'open_call', 'commission', 'showcase', 'venue', 'party', 'funding', 'network', 'other']

function normalizeColName(col: string): string {
  return col.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }

  // Detect separator
  const firstLine = lines[0]
  const sep = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ','

  const headers = firstLine.split(sep).map(h => h.replace(/^"|"$/g, '').trim())
  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map(c => c.replace(/^"|"$/g, '').trim())
    if (cells.every(c => !c)) continue
    const row: ParsedRow = {}
    headers.forEach((h, idx) => { row[h] = cells[idx] || '' })
    rows.push(row)
  }

  return { headers, rows }
}

function rowToOpportunity(row: ParsedRow, headers: string[]): Opportunity | null {
  const mapped: Record<string, string> = {}

  for (const h of headers) {
    const norm = normalizeColName(h)
    const field = COLUMN_MAP[norm] || COLUMN_MAP[h.toLowerCase().trim()]
    if (field && field !== 'skip') {
      mapped[field] = row[h] || ''
    }
  }

  const title = mapped.title?.trim()
  if (!title) return null

  const typeRaw = (mapped.type || 'festival').toLowerCase().trim()
  const type: OpportunityType = VALID_TYPES.includes(typeRaw as any) ? typeRaw as OpportunityType : 'festival'

  const disciplines = (mapped.disciplines || 'musica')
    .split(/[,;|]/).map(d => d.trim().toLowerCase()).filter(Boolean)

  const languages = (mapped.languages || '')
    .split(/[,;|]/).map(l => l.trim().toLowerCase()).filter(Boolean)

  const keywords = (mapped.keywords || '')
    .split(/[,;|]/).map(k => k.trim()).filter(Boolean)

  const country = (mapped.country || '').toUpperCase().substring(0, 2)

  return {
    id: 'csv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
    title,
    organization: mapped.organization || title,
    url: mapped.url || '',
    type,
    status: (mapped.status as any) || 'open',

    country,
    countryName: mapped.country || country,
    city: mapped.city || '',
    region: mapped.region || '',

    disciplines,
    languages,

    coversCosts: ['sim', 'yes', 'true', '1', 'si'].includes((mapped.coversCosts || '').toLowerCase()),
    feeOffered: mapped.feeOffered ? Number(mapped.feeOffered) : undefined,
    feeCurrency: mapped.feeCurrency || 'EUR',

    deadline: mapped.deadline || '',
    openingDate: mapped.openingDate || '',
    eventDate: mapped.eventDate || '',

    contactEmail: mapped.contactEmail || '',
    description: mapped.description || '',
    notes: mapped.notes || '',
    keywords,
    source: 'csv-import',
  }
}

// ── Componente ────────────────────────────────────────────────────────────

export default function CsvImporter({ onClose, onImported }: Props) {
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [parsed, setParsed] = useState<{ headers: string[]; rows: ParsedRow[] }>({ headers: [], rows: [] })
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (!text) { setError('Ficheiro vazio'); return }

      const result = parseCSV(text)
      if (result.headers.length === 0) { setError('Nenhuma coluna encontrada'); return }
      if (result.rows.length === 0) { setError('Nenhuma linha de dados encontrada'); return }

      setParsed(result)

      const opps = result.rows
        .map(row => rowToOpportunity(row, result.headers))
        .filter((o): o is Opportunity => o !== null)

      if (opps.length === 0) {
        setError('Nenhuma oportunidade válida. Verifica que o CSV tem pelo menos a coluna "title" ou "titulo".')
        return
      }

      setOpportunities(opps)
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleImport() {
    opportunities.forEach(o => addManualOpportunity(o))
    setStep('done')
    onImported(opportunities.length)
  }

  return (
    <div style={st.overlay} onClick={onClose}>
      <div style={st.box} onClick={e => e.stopPropagation()}>
        <div style={st.header}>
          <h2 style={st.title}>
            {step === 'upload' ? '📁 Importar CSV' : step === 'preview' ? '👁 Preview' : '✅ Importado!'}
          </h2>
          <button onClick={onClose} style={st.closeBtn}>✕</button>
        </div>

        {step === 'upload' && (
          <div style={st.body}>
            <p style={st.desc}>
              Importa festivais, venues, residências e editais a partir de um ficheiro CSV.
              O ficheiro deve ter pelo menos a coluna <strong>title</strong> (ou <strong>titulo</strong>).
            </p>

            <div style={st.expectedCols}>
              <div style={st.colsTitle}>Colunas reconhecidas:</div>
              <div style={st.colsList}>
                title · organization · country · city · type · deadline · url · disciplines · description · notes · email · fee · covers_costs · opening_date · event_date · languages · keywords · status
              </div>
            </div>

            <div style={st.dropzone} onClick={() => fileRef.current?.click()}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
              <div style={{ color: '#60b4e8', fontWeight: 600, fontSize: 14 }}>Clica para selecionar CSV</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4 }}>
                Suporta CSV, TSV (tab), separador ; ou ,
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" style={{ display: 'none' }} onChange={handleFile} />

            {error && <div style={st.error}>{error}</div>}
          </div>
        )}

        {step === 'preview' && (
          <div style={st.body}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                {parsed.headers.length} colunas · {parsed.rows.length} linhas · <strong style={{ color: '#6ef3a5' }}>{opportunities.length} oportunidades válidas</strong>
              </span>
              <button onClick={() => { setStep('upload'); setError('') }} style={st.backBtn}>← Voltar</button>
            </div>

            <div style={st.tableWrap}>
              <table style={st.table}>
                <thead>
                  <tr>
                    <th style={st.th}>#</th>
                    <th style={st.th}>Título</th>
                    <th style={st.th}>Organização</th>
                    <th style={st.th}>País</th>
                    <th style={st.th}>Cidade</th>
                    <th style={st.th}>Tipo</th>
                    <th style={st.th}>Deadline</th>
                    <th style={st.th}>URL</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities.slice(0, 50).map((o, i) => (
                    <tr key={o.id}>
                      <td style={st.td}>{i + 1}</td>
                      <td style={{ ...st.td, fontWeight: 600, color: '#fff' }}>{o.title}</td>
                      <td style={st.td}>{o.organization}</td>
                      <td style={st.td}>{o.country}</td>
                      <td style={st.td}>{o.city}</td>
                      <td style={st.td}>{o.type}</td>
                      <td style={st.td}>{o.deadline || '—'}</td>
                      <td style={st.td}>{o.url ? '🔗' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {opportunities.length > 50 && (
              <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
                Mostrando 50 de {opportunities.length}
              </div>
            )}

            <div style={st.actions}>
              <button onClick={onClose} style={st.cancelBtn}>Cancelar</button>
              <button onClick={handleImport} style={st.importBtn}>
                Importar {opportunities.length} oportunidade{opportunities.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div style={st.body}>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 18, color: '#6ef3a5', fontWeight: 700, marginBottom: 8 }}>
                {opportunities.length} oportunidade{opportunities.length !== 1 ? 's' : ''} importada{opportunities.length !== 1 ? 's' : ''}!
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                Já aparecem no Radar. Podes editá-las individualmente ou apagá-las.
              </p>
              <button onClick={onClose} style={{ ...st.importBtn, marginTop: 16 }}>Fechar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16,
  },
  box: {
    background: '#050505', border: '1px solid #1A6994', borderRadius: 16,
    width: 'min(960px, 96vw)', maxHeight: '94vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 0 40px rgba(26,105,148,0.3)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  title: { margin: 0, fontSize: 20, color: '#fff', fontWeight: 800 },
  closeBtn: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
    fontSize: 18, cursor: 'pointer', padding: 4,
  },
  body: { padding: '20px 24px', flex: 1, overflowY: 'auto' },
  desc: { color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.7, margin: '0 0 16px' },
  expectedCols: {
    background: 'rgba(96,180,232,0.04)', border: '1px solid rgba(96,180,232,0.1)',
    borderRadius: 8, padding: '12px 14px', marginBottom: 16,
  },
  colsTitle: { fontSize: 11, color: '#60b4e8', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' },
  colsList: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 },
  dropzone: {
    border: '2px dashed rgba(96,180,232,0.25)', borderRadius: 12,
    padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  error: {
    marginTop: 12, padding: '10px 14px', background: 'rgba(249,112,102,0.1)',
    border: '1px solid rgba(249,112,102,0.2)', borderRadius: 8,
    color: '#f97066', fontSize: 13,
  },
  tableWrap: { overflowX: 'auto', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th: {
    textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)',
    color: '#60b4e8', fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.03)',
    color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', maxWidth: 200,
    overflow: 'hidden', textOverflow: 'ellipsis',
  },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelBtn: {
    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
    border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer',
  },
  importBtn: {
    background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8,
    padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  backBtn: {
    background: 'none', border: 'none', color: '#60b4e8', fontSize: 12, cursor: 'pointer',
  },
}
