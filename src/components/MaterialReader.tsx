// src/components/MaterialReader.tsx
// SOMA ODÉ — Leitor de Materiais (EPK / Clipping / Dossier / Rider)
// Extrai texto de PDF ou aceita texto colado, parsea dados estruturados

import { useState, useRef, useCallback } from 'react'
import type { ParsedMaterial, MaterialSource } from '../types/artist'
import { parseMaterialText, aggregateMaterials } from '../data/materialParser'

interface Props {
  artistName: string
  existingMaterials: ParsedMaterial[]
  onSave: (materials: ParsedMaterial[]) => void
  onClose: () => void
}

type InputMode = 'upload' | 'paste'

const SOURCE_OPTIONS: { value: MaterialSource; label: string; icon: string }[] = [
  { value: 'epk', label: 'EPK / Press Kit', icon: '📋' },
  { value: 'clipping', label: 'Clipping / Imprensa', icon: '📰' },
  { value: 'dossier', label: 'Dossier de Projeto', icon: '📁' },
  { value: 'bio', label: 'Biografia', icon: '📝' },
  { value: 'rider', label: 'Rider Técnico', icon: '🔧' },
  { value: 'other', label: 'Outro', icon: '📎' },
]

// ── PDF text extraction via pdf.js ────────────────────────────────────────

async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist')

  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
    pages.push(pageText)
  }

  return pages.join('\n\n')
}

// ── Componente ────────────────────────────────────────────────────────────

export default function MaterialReader({ artistName, existingMaterials, onSave, onClose }: Props) {
  const [materials, setMaterials] = useState<ParsedMaterial[]>(existingMaterials)
  const [mode, setMode] = useState<InputMode>('upload')
  const [source, setSource] = useState<MaterialSource>('epk')
  const [pastedText, setPastedText] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [lastParsed, setLastParsed] = useState<ParsedMaterial | null>(null)
  const [showAggregate, setShowAggregate] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setProcessing(true)
    setLastParsed(null)

    try {
      let text = ''

      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        text = await extractTextFromPDF(file)
      } else {
        // Plain text, markdown, etc.
        text = await file.text()
      }

      if (!text.trim()) {
        setError('Não foi possível extrair texto deste ficheiro. Tenta colar o conteúdo manualmente.')
        setProcessing(false)
        return
      }

      const parsed = parseMaterialText(text, source, file.name)
      setLastParsed(parsed)
      setMaterials(prev => [...prev, parsed])
    } catch (err: any) {
      console.error('PDF parse error:', err)
      setError(`Erro ao ler ficheiro: ${err.message || 'formato não suportado'}. Tenta colar o texto manualmente.`)
    } finally {
      setProcessing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [source])

  function handlePasteSubmit() {
    if (!pastedText.trim()) {
      setError('Cola o texto do material antes de processar.')
      return
    }
    setError('')
    const parsed = parseMaterialText(pastedText, source, `${source}-colado-${Date.now()}.txt`)
    setLastParsed(parsed)
    setMaterials(prev => [...prev, parsed])
    setPastedText('')
  }

  function handleRemoveMaterial(id: string) {
    setMaterials(prev => prev.filter(m => m.id !== id))
    if (lastParsed?.id === id) setLastParsed(null)
  }

  function handleSave() {
    onSave(materials)
    onClose()
  }

  const aggregate = materials.length > 0 ? aggregateMaterials(materials) : null

  return (
    <div style={st.overlay} onClick={onClose}>
      <div style={st.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={st.header}>
          <div>
            <h2 style={st.title}>📄 Leitor de Materiais</h2>
            <div style={st.subtitle}>{artistName} · {materials.length} material(is) carregado(s)</div>
          </div>
          <button onClick={onClose} style={st.closeBtn}>✕</button>
        </div>

        <div style={st.body}>
          {/* Tipo de material + modo de input */}
          <div style={st.row}>
            <div style={st.field}>
              <label style={st.label}>Tipo de material</label>
              <select
                value={source}
                onChange={e => setSource(e.target.value as MaterialSource)}
                style={st.select}
              >
                {SOURCE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
                ))}
              </select>
            </div>
            <div style={st.field}>
              <label style={st.label}>Modo de entrada</label>
              <div style={st.toggleRow}>
                <button
                  onClick={() => setMode('upload')}
                  style={mode === 'upload' ? st.toggleActive : st.toggle}
                >📁 Upload PDF</button>
                <button
                  onClick={() => setMode('paste')}
                  style={mode === 'paste' ? st.toggleActive : st.toggle}
                >📋 Colar texto</button>
              </div>
            </div>
          </div>

          {/* Input area */}
          {mode === 'upload' ? (
            <div style={st.dropzone} onClick={() => fileRef.current?.click()}>
              {processing ? (
                <div style={{ color: '#60b4e8' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
                  <div style={{ fontWeight: 600 }}>A extrair texto do PDF...</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                  <div style={{ color: '#60b4e8', fontWeight: 600, fontSize: 14 }}>
                    Clica para selecionar PDF ou ficheiro de texto
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4 }}>
                    Suporta PDF, TXT, MD
                  </div>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.md,.rtf"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
          ) : (
            <div>
              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="Cola aqui o texto do EPK, clipping, bio ou dossier..."
                style={st.textarea}
                rows={8}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={handlePasteSubmit} style={st.processBtn}>
                  Processar texto ({pastedText.split(/\s+/).filter(Boolean).length} palavras)
                </button>
              </div>
            </div>
          )}

          {error && <div style={st.error}>{error}</div>}

          {/* Last parsed result */}
          {lastParsed && (
            <div style={st.resultCard}>
              <div style={st.resultHeader}>
                <span style={{ color: '#6ef3a5', fontWeight: 700 }}>✅ Material processado</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                  {lastParsed.wordCount} palavras · {lastParsed.fileName}
                </span>
              </div>
              <div style={st.resultGrid}>
                {lastParsed.festivalsPlayed && lastParsed.festivalsPlayed.length > 0 && (
                  <ResultTag label="Festivais" items={lastParsed.festivalsPlayed} color="#60b4e8" />
                )}
                {lastParsed.pressOutlets && lastParsed.pressOutlets.length > 0 && (
                  <ResultTag label="Imprensa" items={lastParsed.pressOutlets} color="#c084fc" />
                )}
                {lastParsed.countriesPerformed && lastParsed.countriesPerformed.length > 0 && (
                  <ResultTag label="Países" items={lastParsed.countriesPerformed} color="#f59e0b" />
                )}
                {lastParsed.citiesPerformed && lastParsed.citiesPerformed.length > 0 && (
                  <ResultTag label="Cidades" items={lastParsed.citiesPerformed} color="#34d399" />
                )}
                {lastParsed.genres && lastParsed.genres.length > 0 && (
                  <ResultTag label="Géneros" items={lastParsed.genres} color="#f472b6" />
                )}
                {lastParsed.collaborators && lastParsed.collaborators.length > 0 && (
                  <ResultTag label="Colaboradores" items={lastParsed.collaborators} color="#a78bfa" />
                )}
                {lastParsed.labels && lastParsed.labels.length > 0 && (
                  <ResultTag label="Selos" items={lastParsed.labels} color="#fb923c" />
                )}
                {lastParsed.socialLinks && lastParsed.socialLinks.length > 0 && (
                  <ResultTag label="Redes" items={lastParsed.socialLinks} color="#38bdf8" />
                )}
              </div>
            </div>
          )}

          {/* Materials list */}
          {materials.length > 0 && (
            <div style={st.section}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={st.sectionTitle}>Materiais carregados ({materials.length})</h3>
                {materials.length > 1 && (
                  <button
                    onClick={() => setShowAggregate(!showAggregate)}
                    style={st.aggBtn}
                  >
                    {showAggregate ? '▲ Esconder resumo' : '▼ Ver resumo agregado'}
                  </button>
                )}
              </div>

              {materials.map(m => (
                <div key={m.id} style={st.matRow}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>
                      {SOURCE_OPTIONS.find(o => o.value === m.source)?.icon} {m.fileName}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginLeft: 8 }}>
                      {m.wordCount} palavras · {m.festivalsPlayed?.length || 0} festivais · {m.pressOutlets?.length || 0} imprensa · {m.countriesPerformed?.length || 0} países
                    </span>
                  </div>
                  <button onClick={() => handleRemoveMaterial(m.id)} style={st.removeBtn}>🗑</button>
                </div>
              ))}

              {/* Aggregate view */}
              {showAggregate && aggregate && (
                <div style={st.aggregateBox}>
                  <div style={st.aggTitle}>📊 Dados agregados de todos os materiais</div>
                  <div style={st.resultGrid}>
                    {aggregate.allFestivals.length > 0 && (
                      <ResultTag label={`Festivais (${aggregate.allFestivals.length})`} items={aggregate.allFestivals} color="#60b4e8" />
                    )}
                    {aggregate.allPress.length > 0 && (
                      <ResultTag label={`Imprensa (${aggregate.allPress.length})`} items={aggregate.allPress} color="#c084fc" />
                    )}
                    {aggregate.allCountries.length > 0 && (
                      <ResultTag label={`Países (${aggregate.allCountries.length})`} items={aggregate.allCountries} color="#f59e0b" />
                    )}
                    {aggregate.allCities.length > 0 && (
                      <ResultTag label={`Cidades (${aggregate.allCities.length})`} items={aggregate.allCities} color="#34d399" />
                    )}
                    {aggregate.allGenres.length > 0 && (
                      <ResultTag label={`Géneros (${aggregate.allGenres.length})`} items={aggregate.allGenres} color="#f472b6" />
                    )}
                    {aggregate.allCollaborators.length > 0 && (
                      <ResultTag label={`Colaboradores (${aggregate.allCollaborators.length})`} items={aggregate.allCollaborators} color="#a78bfa" />
                    )}
                    {aggregate.allLabels.length > 0 && (
                      <ResultTag label={`Selos (${aggregate.allLabels.length})`} items={aggregate.allLabels} color="#fb923c" />
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
                    Total: {aggregate.totalWords} palavras em {materials.length} material(is)
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={st.footer}>
          <button onClick={onClose} style={st.cancelBtn}>Cancelar</button>
          <button onClick={handleSave} style={st.saveBtn}>
            Guardar {materials.length} material(is)
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-componente: tags de resultado ─────────────────────────────────────

function ResultTag({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {items.map((item, i) => (
          <span key={i} style={{
            background: `${color}15`,
            border: `1px solid ${color}30`,
            color,
            fontSize: 11,
            padding: '2px 7px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
          }}>
            {item}
          </span>
        ))}
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
  modal: {
    background: '#050505', border: '1px solid #1A6994', borderRadius: 16,
    width: 'min(900px, 96vw)', maxHeight: '94vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 0 40px rgba(26,105,148,0.3)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  title: { margin: 0, fontSize: 20, color: '#fff', fontWeight: 800 },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 },
  closeBtn: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
    fontSize: 18, cursor: 'pointer', padding: 4,
  },
  body: { padding: '20px 24px', flex: 1, overflowY: 'auto' },
  row: { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' as const },
  field: { flex: 1, minWidth: 200 },
  label: { display: 'block', fontSize: 11, color: '#60b4e8', fontWeight: 600, textTransform: 'uppercase' as const, marginBottom: 6 },
  select: {
    width: '100%', padding: '8px 10px', background: '#111', color: '#fff',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13,
  },
  toggleRow: { display: 'flex', gap: 6 },
  toggle: {
    flex: 1, padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
    color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', fontWeight: 600,
  },
  toggleActive: {
    flex: 1, padding: '8px 12px', background: 'rgba(96,180,232,0.1)',
    border: '1px solid #1A6994', borderRadius: 8,
    color: '#60b4e8', fontSize: 12, cursor: 'pointer', fontWeight: 600,
  },
  dropzone: {
    border: '2px dashed rgba(96,180,232,0.25)', borderRadius: 12,
    padding: '36px 20px', textAlign: 'center' as const, cursor: 'pointer',
    transition: 'border-color 0.2s', marginBottom: 12,
  },
  textarea: {
    width: '100%', padding: '12px 14px', background: '#111', color: '#fff',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 13,
    fontFamily: 'monospace', resize: 'vertical' as const, lineHeight: 1.6,
    boxSizing: 'border-box' as const,
  },
  processBtn: {
    background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8,
    padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
  },
  error: {
    marginTop: 8, padding: '10px 14px', background: 'rgba(249,112,102,0.1)',
    border: '1px solid rgba(249,112,102,0.2)', borderRadius: 8,
    color: '#f97066', fontSize: 13,
  },
  resultCard: {
    marginTop: 12, padding: '14px 16px',
    background: 'rgba(110,243,165,0.04)', border: '1px solid rgba(110,243,165,0.15)',
    borderRadius: 12,
  },
  resultHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, flexWrap: 'wrap' as const, gap: 8,
  },
  resultGrid: { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  section: { marginTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 },
  sectionTitle: { margin: 0, fontSize: 14, color: '#fff', fontWeight: 700 },
  matRow: {
    display: 'flex', alignItems: 'center', padding: '8px 12px',
    background: 'rgba(255,255,255,0.02)', borderRadius: 8, marginBottom: 4,
  },
  removeBtn: {
    background: 'none', border: 'none', fontSize: 14, cursor: 'pointer',
    color: 'rgba(255,255,255,0.3)', padding: 4,
  },
  aggBtn: {
    background: 'none', border: 'none', color: '#60b4e8', fontSize: 11,
    cursor: 'pointer', fontWeight: 600,
  },
  aggregateBox: {
    marginTop: 12, padding: '14px 16px',
    background: 'rgba(96,180,232,0.04)', border: '1px solid rgba(96,180,232,0.12)',
    borderRadius: 12,
  },
  aggTitle: { fontSize: 13, color: '#60b4e8', fontWeight: 700, marginBottom: 10 },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  cancelBtn: {
    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
    border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer',
  },
  saveBtn: {
    background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8,
    padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
}
