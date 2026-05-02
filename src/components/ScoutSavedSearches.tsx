// src/components/ScoutSavedSearches.tsx
// SOMA ODÉ — Scout Proativo com selecção de Artista + Projecto
// CORRIGIDO: protege contra campos não-array (string, null, undefined)

import { useEffect, useState, useMemo } from 'react'
import { loadArtistsFromSupabase } from '../data/artistsSupabaseStore'
import type { Artist } from '../types/artist'

// ─── Helper de segurança ──────────────────────────────────
function safeArray<T = string>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'string' && value.trim().length > 0) return value.split(',').map(s => s.trim()).filter(Boolean) as T[]
  return []
}

// ─── Tipos ────────────────────────────────────────────────

interface SavedSearch {
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
  autoFilled?: boolean
  createdAt: string
  lastRunAt?: string
  lastResultCount?: number
}

interface ScoutSavedSearchesProps {
  onSave?: (search: SavedSearch) => void
}

const STORAGE_KEY = 'soma-scout-saved-searches-v2'

function loadSearches(): SavedSearch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveSearches(searches: SavedSearch[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(searches))
}

// ─── Componente principal ─────────────────────────────────

export default function ScoutSavedSearches({ onSave }: ScoutSavedSearchesProps) {
  const [searches, setSearches] = useState<SavedSearch[]>(loadSearches())
  const [showModal, setShowModal] = useState(false)
  const [artists, setArtists] = useState<Artist[]>([])
  const [loadingArtists, setLoadingArtists] = useState(false)

  const [form, setForm] = useState<Omit<SavedSearch, 'id' | 'createdAt'>>({
    name: '',
    query: '',
    countries: '',
    disciplines: '',
    languages: '',
    maxResults: 8,
    artistId: '',
    artistName: '',
    projectId: '',
    projectName: '',
    autoFilled: false,
  })

  const selectedArtist = useMemo(
    () => artists.find(a => a.id === form.artistId) || null,
    [artists, form.artistId]
  )

  const artistProjects = useMemo(
    () => safeArray((selectedArtist as any)?.projects),
    [selectedArtist]
  )

  const selectedProject = useMemo(
    () => artistProjects.find((p: any) => p.id === form.projectId) || null,
    [artistProjects, form.projectId]
  )

  useEffect(() => {
    if (showModal && artists.length === 0) {
      setLoadingArtists(true)
      loadArtistsFromSupabase()
        .then(data => setArtists(data || []))
        .catch(console.error)
        .finally(() => setLoadingArtists(false))
    }
  }, [showModal])

  // Auto-preencher com dados do artista
  useEffect(() => {
    if (!selectedArtist) return

    const c = selectedArtist.cartografia || {}
    const vocabulario = safeArray(c.raiz?.vocabulario).join(', ')
    const corredores = safeArray(c.rota?.corredores).join(', ')
    const territorios = safeArray(c.campo?.audienceTerritories).join(', ')

    const artistDisciplines = safeArray(selectedArtist.disciplines)
    const artistLanguages = safeArray(selectedArtist.languages)
    const targetCountries = safeArray(selectedArtist.targetCountries)

    const queryParts = [
      vocabulario && `"${vocabulario}"`,
      artistDisciplines.slice(0, 3).join(' '),
      corredores,
      c.rota?.gaps ? 'residência' : '',
    ].filter(Boolean)

    const autoQuery = queryParts.join(' ')

    const autoCountries = [
      ...safeArray(c.rota?.corredores),
      ...safeArray(c.campo?.audienceTerritories),
      ...targetCountries.slice(0, 5),
    ].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 8).join(', ')

    const autoDisciplines = artistDisciplines.join(', ')
    const autoLanguages = artistLanguages.join(', ')

    setForm(prev => ({
      ...prev,
      query: autoQuery || prev.query,
      countries: autoCountries || prev.countries,
      disciplines: autoDisciplines || prev.disciplines,
      languages: autoLanguages || prev.languages,
      autoFilled: true,
    }))
  }, [selectedArtist])

  // Refinar com dados do projecto
  useEffect(() => {
    if (!selectedProject) return

    const projectKeywords = safeArray(selectedProject.projectKeywords).join(', ')
    const projectTerritories = selectedProject.projectTerritories || ''

    setForm(prev => {
      const baseQuery = prev.query
      const projectAddition = [
        projectKeywords,
        selectedProject.projectFormat || '',
      ].filter(Boolean).join(' ')

      return {
        ...prev,
        query: projectAddition ? `${baseQuery} ${projectAddition}`.trim() : baseQuery,
        countries: projectTerritories
          ? `${prev.countries}, ${projectTerritories}`.replace(/^, /, '')
          : prev.countries,
        name: prev.name || `Scout — ${selectedProject.name || 'Projecto'}`,
      }
    })
  }, [selectedProject])

  function handleArtistChange(artistId: string) {
    const artist = artists.find(a => a.id === artistId)
    setForm(prev => ({
      ...prev,
      artistId,
      artistName: artist?.name || '',
      projectId: '',
      projectName: '',
      autoFilled: false,
      query: '',
      countries: '',
      disciplines: '',
      languages: '',
    }))
  }

  function handleProjectChange(projectId: string) {
    const project = artistProjects.find((p: any) => p.id === projectId)
    setForm(prev => ({
      ...prev,
      projectId,
      projectName: project?.name || '',
    }))
  }

  function handleSave() {
    if (!form.name.trim()) {
      alert('Dá um nome à busca.')
      return
    }
    if (!form.query.trim()) {
      alert('A frase de busca é obrigatória.')
      return
    }

    const newSearch: SavedSearch = {
      ...form,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }

    const updated = [newSearch, ...searches]
    setSearches(updated)
    saveSearches(updated)
    onSave?.(newSearch)
    setShowModal(false)
    resetForm()
  }

  function handleDelete(id: string) {
    if (!confirm('Apagar esta busca salva?')) return
    const updated = searches.filter(s => s.id !== id)
    setSearches(updated)
    saveSearches(updated)
  }

  function handleRun(search: SavedSearch) {
    const updated = searches.map(s =>
      s.id === search.id
        ? { ...s, lastRunAt: new Date().toISOString() }
        : s
    )
    setSearches(updated)
    saveSearches(updated)
    onSave?.(search)
  }

  function resetForm() {
    setForm({
      name: '', query: '', countries: '', disciplines: '',
      languages: '', maxResults: 8,
      artistId: '', artistName: '', projectId: '', projectName: '',
      autoFilled: false,
    })
  }

  function openModal() {
    resetForm()
    setShowModal(true)
  }

  // ─── RENDER ─────────────────────────────────────────────

  return (
    <div style={sc.wrap}>

      <div style={sc.header}>
        <div>
          <h3 style={sc.title}>🔍 Scout Proativo</h3>
          <p style={sc.subtitle}>
            {searches.length} busca{searches.length !== 1 ? 's' : ''} guardada{searches.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button style={sc.primaryBtn} onClick={openModal}>
          + Nova busca
        </button>
      </div>

      {searches.length > 0 && (
        <div style={sc.searchList}>
          {searches.map(search => (
            <div key={search.id} style={sc.searchCard}>
              <div style={sc.searchCardTop}>
                <div style={{ flex: 1 }}>
                  <div style={sc.searchName}>{search.name}</div>
                  {search.artistName && (
                    <div style={sc.searchArtistTag}>
                      🎤 {search.artistName}
                      {search.projectName && ` · 📁 ${search.projectName}`}
                    </div>
                  )}
                  <div style={sc.searchQuery}>"{search.query}"</div>
                  <div style={sc.searchMeta}>
                    {search.countries && <span style={sc.metaTag}>🌍 {search.countries}</span>}
                    {search.disciplines && <span style={sc.metaTag}>🎨 {search.disciplines}</span>}
                    {search.languages && <span style={sc.metaTag}>💬 {search.languages}</span>}
                  </div>
                </div>
                <div style={sc.searchActions}>
                  <button style={sc.runBtn} onClick={() => handleRun(search)}>
                    ▶ Executar
                  </button>
                  <button style={sc.deleteBtn} onClick={() => handleDelete(search.id)}>
                    ✕
                  </button>
                </div>
              </div>
              {search.lastRunAt && (
                <div style={sc.lastRun}>
                  Última execução: {new Date(search.lastRunAt).toLocaleDateString('pt-PT')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={sc.overlay}>
          <div style={sc.modal}>

            <div style={sc.modalHeader}>
              <div>
                <h2 style={sc.modalTitle}>Nova busca salva</h2>
                <p style={sc.modalSubtitle}>
                  Define uma busca que podes repetir. Associa a um artista para preencher automaticamente.
                </p>
              </div>
              <button style={sc.closeBtn} onClick={() => setShowModal(false)}>Fechar</button>
            </div>

            {/* ARTISTA + PROJECTO */}
            <div style={sc.sectionBlock}>
              <div style={sc.sectionLabel}>
                🎤 Associar a artista e projecto
                <span style={sc.sectionHint}>opcional · preenche os campos automaticamente</span>
              </div>

              <div style={sc.row2}>
                <div>
                  <label style={sc.label}>Artista</label>
                  <select
                    style={sc.select}
                    value={form.artistId || ''}
                    onChange={e => handleArtistChange(e.target.value)}
                    disabled={loadingArtists}
                  >
                    <option value="">
                      {loadingArtists ? 'A carregar artistas...' : '— Sem artista específico —'}
                    </option>
                    {artists.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name || 'Artista sem nome'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={sc.label}>Projecto</label>
                  <select
                    style={sc.select}
                    value={form.projectId || ''}
                    onChange={e => handleProjectChange(e.target.value)}
                    disabled={!form.artistId || artistProjects.length === 0}
                  >
                    <option value="">
                      {!form.artistId
                        ? '— Selecciona artista primeiro —'
                        : artistProjects.length === 0
                          ? '— Artista sem projectos —'
                          : '— Todos os projectos —'
                      }
                    </option>
                    {artistProjects.map((p: any) => {
                      const keywords = safeArray(p.projectKeywords)
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name || 'Projecto sem nome'}
                          {keywords.length > 0 && ` · ${keywords.slice(0, 2).join(', ')}`}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              {/* Preview */}
              {selectedArtist && (
                <div style={sc.autoFillPreview}>
                  <div style={sc.autoFillHeader}>
                    ✨ Preenchido automaticamente a partir da Cartografia SOMA
                  </div>
                  <div style={sc.autoFillGrid}>
                    {safeArray(selectedArtist.cartografia?.raiz?.vocabulario).length > 0 && (
                      <div>
                        <span style={sc.autoFillLabel}>Vocabulário</span>
                        <div style={sc.autoFillTags}>
                          {safeArray(selectedArtist.cartografia?.raiz?.vocabulario).map((v: string) => (
                            <span key={v} style={sc.autoFillTag}>{v}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {safeArray(selectedArtist.cartografia?.rota?.corredores).length > 0 && (
                      <div>
                        <span style={sc.autoFillLabel}>Corredores</span>
                        <div style={sc.autoFillTags}>
                          {safeArray(selectedArtist.cartografia?.rota?.corredores).map((v: string) => (
                            <span key={v} style={sc.autoFillTag}>{v}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedProject && (
                      <div>
                        <span style={sc.autoFillLabel}>Projecto seleccionado</span>
                        <div style={sc.autoFillTags}>
                          <span style={{ ...sc.autoFillTag, background: 'rgba(255,207,92,0.15)', borderColor: 'rgba(255,207,92,0.4)', color: '#ffcf5c' }}>
                            {selectedProject.name}
                          </span>
                          {safeArray(selectedProject.projectKeywords).map((k: string) => (
                            <span key={k} style={sc.autoFillTag}>{k}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CONFIGURAÇÃO */}
            <div style={sc.sectionBlock}>
              <div style={sc.sectionLabel}>⚙️ Configuração da busca</div>

              <div style={{ marginBottom: 14 }}>
                <label style={sc.label}>Nome da busca *</label>
                <input
                  style={sc.input}
                  placeholder={form.artistId
                    ? `Ex: Scout ${form.artistName} — Europa 2026`
                    : 'Ex: Residências performance Europa'
                  }
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={sc.label}>
                  Frase de busca *
                  {form.autoFilled && <span style={sc.autoLabel}>✨ auto</span>}
                </label>
                <textarea
                  style={sc.textarea}
                  placeholder="Ex: open call residência artística performance artistas afrodescendentes Europa 2026"
                  value={form.query}
                  onChange={e => setForm(prev => ({ ...prev, query: e.target.value, autoFilled: false }))}
                  rows={3}
                />
              </div>

              <div style={sc.row3}>
                <div>
                  <label style={sc.label}>
                    Países preferidos
                    {form.autoFilled && form.countries && <span style={sc.autoLabel}>✨ auto</span>}
                  </label>
                  <input style={sc.input} placeholder="Portugal, Espanha, França"
                    value={form.countries}
                    onChange={e => setForm(prev => ({ ...prev, countries: e.target.value }))} />
                </div>
                <div>
                  <label style={sc.label}>
                    Disciplinas
                    {form.autoFilled && form.disciplines && <span style={sc.autoLabel}>✨ auto</span>}
                  </label>
                  <input style={sc.input} placeholder="performance, música, dança"
                    value={form.disciplines}
                    onChange={e => setForm(prev => ({ ...prev, disciplines: e.target.value }))} />
                </div>
                <div>
                  <label style={sc.label}>
                    Idiomas
                    {form.autoFilled && form.languages && <span style={sc.autoLabel}>✨ auto</span>}
                  </label>
                  <input style={sc.input} placeholder="PT, ES, EN"
                    value={form.languages}
                    onChange={e => setForm(prev => ({ ...prev, languages: e.target.value }))} />
                </div>
              </div>

              <div style={{ maxWidth: 200 }}>
                <label style={sc.label}>Máximo de resultados</label>
                <input style={sc.input} type="number" min={1} max={20}
                  value={form.maxResults}
                  onChange={e => setForm(prev => ({ ...prev, maxResults: Number(e.target.value) }))} />
              </div>
            </div>

            <div style={sc.modalFooter}>
              <button style={sc.cancelBtn} onClick={() => setShowModal(false)}>Cancelar</button>
              <button style={sc.primaryBtn} onClick={handleSave}>💾 Guardar busca</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────

const sc: Record<string, React.CSSProperties> = {
  wrap: { marginBottom: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { margin: 0, fontSize: 16, color: '#60b4e8' },
  subtitle: { margin: '4px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  searchList: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 },
  searchCard: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14 },
  searchCardTop: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  searchName: { fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 },
  searchArtistTag: { fontSize: 11, color: '#60b4e8', background: 'rgba(26,105,148,0.15)', border: '1px solid rgba(26,105,148,0.25)', borderRadius: 6, padding: '2px 8px', display: 'inline-block', marginBottom: 6 },
  searchQuery: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', marginBottom: 8 },
  searchMeta: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  metaTag: { fontSize: 10, color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '2px 6px' },
  searchActions: { display: 'flex', gap: 6, flexShrink: 0 },
  runBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  deleteBtn: { background: 'rgba(255,70,70,0.1)', color: '#ff8a8a', border: '1px solid rgba(255,70,70,0.2)', borderRadius: 6, padding: '7px 10px', fontSize: 12, cursor: 'pointer' },
  lastRun: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { width: 'min(780px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: '#000', border: '1px solid #1A6994', borderRadius: 16, padding: 24 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' },
  modalTitle: { margin: 0, color: '#60b4e8', fontSize: 22 },
  modalSubtitle: { margin: '6px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  closeBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', flexShrink: 0 },
  sectionBlock: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 18, marginBottom: 14 },
  sectionLabel: { fontSize: 12, color: '#60b4e8', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 },
  sectionHint: { fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.02em', textTransform: 'none', fontWeight: 400 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 },
  label: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 },
  autoLabel: { fontSize: 10, color: '#ffcf5c', background: 'rgba(255,207,92,0.1)', borderRadius: 4, padding: '1px 5px', textTransform: 'none', letterSpacing: 0 },
  input: { width: '100%', background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', cursor: 'pointer' },
  textarea: { width: '100%', background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' },
  autoFillPreview: { marginTop: 12, padding: 12, background: 'rgba(26,105,148,0.06)', border: '1px solid rgba(26,105,148,0.2)', borderRadius: 8 },
  autoFillHeader: { fontSize: 11, color: '#60b4e8', marginBottom: 10, letterSpacing: '0.04em' },
  autoFillGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  autoFillLabel: { display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' },
  autoFillTags: { display: 'flex', flexWrap: 'wrap', gap: 5 },
  autoFillTag: { fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(26,105,148,0.15)', border: '1px solid rgba(26,105,148,0.3)', color: '#60b4e8' },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' },
  cancelBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer' },
  primaryBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer' },
}