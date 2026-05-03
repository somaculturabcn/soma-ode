// src/components/ScoutSavedSearches.tsx
// SOMA ODÉ — Scout Proativo (redesenhado)
// Fluxo: produtor selecciona projecto → tipo de oportunidade → países → Executar
// A query é construída automaticamente a partir do tipo do projecto, não das disciplinas do artista

import { useEffect, useState, useMemo } from 'react'
import { loadArtistsFromSupabase } from '../data/artistsSupabaseStore'
import type { Artist } from '../types/artist'

// ─── Helper ───────────────────────────────────────────────
function safeArray<T = string>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'string' && value.trim().length > 0)
    return value.split(',').map(s => s.trim()).filter(Boolean) as T[]
  return []
}

// ─── Tipos ────────────────────────────────────────────────

type OpportunityType = 'residencia' | 'open_call' | 'festival' | 'premio' | 'mobilidade' | 'financiamento'

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
  opportunityType?: OpportunityType
  selectedCountries?: string[]
  createdAt: string
  lastRunAt?: string
}

interface ScoutSavedSearchesProps {
  onSave?: (search: SavedSearch) => void
}

const STORAGE_KEY = 'soma-scout-saved-searches-v3'

// Tipos de oportunidade com labels e keywords para o Gemini
const OPPORTUNITY_TYPES: { value: OpportunityType; label: string; icon: string; keywords: string[] }[] = [
  { value: 'residencia', label: 'Residência artística', icon: '🏠', keywords: ['residencia artística', 'artist residency', 'residência artística', 'residencia de creación'] },
  { value: 'open_call', label: 'Open Call / Edital', icon: '📋', keywords: ['open call', 'edital', 'convocatoria artística', 'call for artists'] },
  { value: 'festival', label: 'Festival', icon: '🎪', keywords: ['festival', 'festival de artes performativas', 'festival internacional'] },
  { value: 'premio', label: 'Prémio / Bolsa', icon: '🏆', keywords: ['premio artístico', 'beca de creación', 'bolsa artística', 'grant'] },
  { value: 'mobilidade', label: 'Mobilidade / Touring', icon: '✈️', keywords: ['movilidad artística', 'programa de movilidad', 'touring', 'circulación internacional'] },
  { value: 'financiamento', label: 'Financiamento', icon: '💰', keywords: ['financiación cultural', 'apoyo a la creación', 'fundo cultural', 'apoio à criação'] },
]

// Países organizados por região (os mais relevantes para o roster SOMA)
const COUNTRY_REGIONS = [
  {
    region: 'Europa Ocidental',
    countries: [
      { code: 'DE', name: 'Alemanha', flag: '🇩🇪' },
      { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
      { code: 'FR', name: 'França', flag: '🇫🇷' },
      { code: 'NL', name: 'Países Baixos', flag: '🇳🇱' },
      { code: 'BE', name: 'Bélgica', flag: '🇧🇪' },
      { code: 'ES', name: 'Espanha', flag: '🇪🇸' },
      { code: 'CH', name: 'Suíça', flag: '🇨🇭' },
      { code: 'AT', name: 'Áustria', flag: '🇦🇹' },
      { code: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
      { code: 'IE', name: 'Irlanda', flag: '🇮🇪' },
    ],
  },
  {
    region: 'Europa do Norte',
    countries: [
      { code: 'SE', name: 'Suécia', flag: '🇸🇪' },
      { code: 'NO', name: 'Noruega', flag: '🇳🇴' },
      { code: 'DK', name: 'Dinamarca', flag: '🇩🇰' },
      { code: 'FI', name: 'Finlândia', flag: '🇫🇮' },
    ],
  },
  {
    region: 'América do Sul',
    countries: [
      { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
      { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
      { code: 'CL', name: 'Chile', flag: '🇨🇱' },
      { code: 'CO', name: 'Colômbia', flag: '🇨🇴' },
    ],
  },
  {
    region: 'América do Norte',
    countries: [
      { code: 'US', name: 'EUA', flag: '🇺🇸' },
      { code: 'CA', name: 'Canadá', flag: '🇨🇦' },
      { code: 'MX', name: 'México', flag: '🇲🇽' },
    ],
  },
]

function loadSearches(): SavedSearch[] {
  try {
    // Suporta chave anterior e nova
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('soma-scout-saved-searches-v2')
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveSearches(searches: SavedSearch[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(searches))
}

// Constrói a query para o Gemini a partir do tipo + formato do projecto
function buildQuery(
  project: any,
  opportunityType: OpportunityType,
  selectedCountries: string[],
): string {
  const typeInfo = OPPORTUNITY_TYPES.find(t => t.value === opportunityType)
  const mainKeyword = typeInfo?.keywords[0] || 'residencia artística'

  // Tipo do projecto (performance, instalação, investigação)
  const projectFormat = project?.projectFormat || ''
  const projectKeywords = safeArray(project?.projectKeywords).slice(0, 3)

  // Construir query limpa
  const parts = [
    mainKeyword,
    projectFormat,
    ...projectKeywords,
  ].filter(Boolean)

  const year = new Date().getFullYear()
  return `${parts.join(' ')} ${year} ${year + 1}`.trim()
}

// Constrói o campo disciplines para o Gemini (baseado no projecto, não no artista)
function buildDisciplines(project: any, opportunityType: OpportunityType): string {
  const typeInfo = OPPORTUNITY_TYPES.find(t => t.value === opportunityType)
  const projectFormat = project?.projectFormat || ''
  const projectKeywords = safeArray(project?.projectKeywords).slice(0, 4)

  return [
    projectFormat,
    ...projectKeywords,
    ...(typeInfo?.keywords.slice(0, 2) || []),
  ].filter(Boolean).join(', ')
}

// ─── Componente ───────────────────────────────────────────

export default function ScoutSavedSearches({ onSave }: ScoutSavedSearchesProps) {
  const [searches, setSearches] = useState<SavedSearch[]>(loadSearches())
  const [showModal, setShowModal] = useState(false)
  const [artists, setArtists] = useState<Artist[]>([])
  const [loadingArtists, setLoadingArtists] = useState(false)

  // Formulário simplificado
  const [artistId, setArtistId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [opportunityType, setOpportunityType] = useState<OpportunityType>('residencia')
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [searchName, setSearchName] = useState('')
  const [maxResults, setMaxResults] = useState(8)

  const selectedArtist = useMemo(() => artists.find(a => a.id === artistId) || null, [artists, artistId])
  const artistProjects = useMemo(() => safeArray((selectedArtist as any)?.projects), [selectedArtist])
  const selectedProject = useMemo(() => artistProjects.find((p: any) => p.id === projectId) || null, [artistProjects, projectId])

  useEffect(() => {
    if (showModal && artists.length === 0) {
      setLoadingArtists(true)
      loadArtistsFromSupabase()
        .then(data => setArtists(data || []))
        .catch(console.error)
        .finally(() => setLoadingArtists(false))
    }
  }, [showModal])

  // Quando artista muda → pré-seleccionar países do perfil
  useEffect(() => {
    if (!selectedArtist) { setSelectedCountries([]); setProjectId(''); return }
    const artistCountries = safeArray(selectedArtist.targetCountries).slice(0, 8)
    setSelectedCountries(artistCountries)
    setProjectId('')
  }, [selectedArtist])

  // Nome automático quando projecto + tipo estão seleccionados
  useEffect(() => {
    if (selectedProject && opportunityType) {
      const typeLabel = OPPORTUNITY_TYPES.find(t => t.value === opportunityType)?.label || ''
      setSearchName(`${selectedProject.name || 'Projecto'} — ${typeLabel}`)
    }
  }, [selectedProject, opportunityType])

  function toggleCountry(code: string) {
    setSelectedCountries(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  function toggleRegion(codes: string[]) {
    const allSelected = codes.every(c => selectedCountries.includes(c))
    if (allSelected) {
      setSelectedCountries(prev => prev.filter(c => !codes.includes(c)))
    } else {
      setSelectedCountries(prev => Array.from(new Set([...prev, ...codes])))
    }
  }

  function handleArtistChange(id: string) {
    setArtistId(id)
    setProjectId('')
    setSearchName('')
  }

  function handleSave() {
    if (!artistId) { alert('Selecciona um artista.'); return }
    if (!projectId) { alert('Selecciona um projecto.'); return }
    if (selectedCountries.length === 0) { alert('Selecciona pelo menos um país.'); return }
    if (!searchName.trim()) { alert('Dá um nome à busca.'); return }

    const query = buildQuery(selectedProject, opportunityType, selectedCountries)
    const disciplines = buildDisciplines(selectedProject, opportunityType)
    const countries = selectedCountries.join(', ')
    const languages = safeArray(selectedArtist?.languages).join(', ')

    const newSearch: SavedSearch = {
      id: crypto.randomUUID(),
      name: searchName,
      query,
      countries,
      disciplines,
      languages,
      maxResults,
      artistId,
      artistName: selectedArtist?.name || '',
      projectId,
      projectName: (selectedProject as any)?.name || '',
      opportunityType,
      selectedCountries,
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
    if (!confirm('Apagar esta busca?')) return
    const updated = searches.filter(s => s.id !== id)
    setSearches(updated)
    saveSearches(updated)
  }

  function handleRun(search: SavedSearch) {
    const updated = searches.map(s =>
      s.id === search.id ? { ...s, lastRunAt: new Date().toISOString() } : s
    )
    setSearches(updated)
    saveSearches(updated)
    onSave?.(search)
  }

  function resetForm() {
    setArtistId(''); setProjectId(''); setOpportunityType('residencia')
    setSelectedCountries([]); setSearchName(''); setMaxResults(8)
  }

  function openModal() { resetForm(); setShowModal(true) }

  // ─── RENDER ─────────────────────────────────────────────

  return (
    <div style={sc.wrap}>
      <div style={sc.header}>
        <div>
          <h3 style={sc.title}>🔍 Scout Proativo</h3>
          <p style={sc.subtitle}>{searches.length} busca{searches.length !== 1 ? 's' : ''} guardada{searches.length !== 1 ? 's' : ''}</p>
        </div>
        <button style={sc.primaryBtn} onClick={openModal}>+ Nova busca</button>
      </div>

      {/* LISTA DE BUSCAS GUARDADAS */}
      {searches.length > 0 && (
        <div style={sc.searchList}>
          {searches.map(search => {
            const typeInfo = OPPORTUNITY_TYPES.find(t => t.value === search.opportunityType)
            return (
              <div key={search.id} style={sc.searchCard}>
                <div style={sc.searchCardTop}>
                  <div style={{ flex: 1 }}>
                    <div style={sc.searchName}>{search.name}</div>
                    <div style={sc.searchTags}>
                      {search.artistName && (
                        <span style={sc.tagArtist}>🎤 {search.artistName}</span>
                      )}
                      {search.projectName && (
                        <span style={sc.tagProject}>📁 {search.projectName}</span>
                      )}
                      {typeInfo && (
                        <span style={sc.tagType}>{typeInfo.icon} {typeInfo.label}</span>
                      )}
                    </div>
                    {search.selectedCountries && search.selectedCountries.length > 0 && (
                      <div style={sc.countryRow}>
                        {search.selectedCountries.slice(0, 8).map(c => {
                          const found = COUNTRY_REGIONS.flatMap(r => r.countries).find(x => x.code === c)
                          return found ? (
                            <span key={c} style={sc.countryChip}>{found.flag} {found.code}</span>
                          ) : null
                        })}
                        {search.selectedCountries.length > 8 && (
                          <span style={sc.countryChip}>+{search.selectedCountries.length - 8}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={sc.searchActions}>
                    <button style={sc.runBtn} onClick={() => handleRun(search)}>▶ Executar</button>
                    <button style={sc.deleteBtn} onClick={() => handleDelete(search.id)}>✕</button>
                  </div>
                </div>
                {search.lastRunAt && (
                  <div style={sc.lastRun}>
                    Última execução: {new Date(search.lastRunAt).toLocaleDateString('pt-PT')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div style={sc.overlay}>
          <div style={sc.modal}>
            <div style={sc.modalHeader}>
              <div>
                <h2 style={sc.modalTitle}>Nova busca Scout</h2>
                <p style={sc.modalSubtitle}>Selecciona projecto → tipo de oportunidade → países</p>
              </div>
              <button style={sc.closeBtn} onClick={() => setShowModal(false)}>Fechar</button>
            </div>

            {/* PASSO 1 — ARTISTA + PROJECTO */}
            <div style={sc.step}>
              <div style={sc.stepLabel}>
                <span style={sc.stepNum}>1</span>
                Artista e projecto
              </div>
              <div style={sc.row2}>
                <div>
                  <label style={sc.label}>Artista</label>
                  <select style={sc.select} value={artistId} onChange={e => handleArtistChange(e.target.value)} disabled={loadingArtists}>
                    <option value="">{loadingArtists ? 'A carregar...' : '— Seleccionar artista —'}</option>
                    {artists.map(a => <option key={a.id} value={a.id}>{a.name || 'Artista sem nome'}</option>)}
                  </select>
                </div>
                <div>
                  <label style={sc.label}>Projecto</label>
                  <select style={sc.select} value={projectId} onChange={e => setProjectId(e.target.value)} disabled={!artistId || artistProjects.length === 0}>
                    <option value="">{!artistId ? '— Selecciona artista —' : '— Seleccionar projecto —'}</option>
                    {artistProjects.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name || 'Projecto sem nome'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview do projecto */}
              {selectedProject && (
                <div style={sc.projectPreview}>
                  <div style={sc.projectPreviewTitle}>📁 {(selectedProject as any).name}</div>
                  {(selectedProject as any).projectFormat && (
                    <span style={sc.projectTag}>Formato: {(selectedProject as any).projectFormat}</span>
                  )}
                  {safeArray((selectedProject as any).projectKeywords).slice(0, 5).map((k: string) => (
                    <span key={k} style={sc.projectTag}>{k}</span>
                  ))}
                  {(selectedProject as any).summary && (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '6px 0 0', lineHeight: 1.4 }}>
                      {(selectedProject as any).summary.substring(0, 120)}...
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* PASSO 2 — TIPO DE OPORTUNIDADE */}
            <div style={sc.step}>
              <div style={sc.stepLabel}>
                <span style={sc.stepNum}>2</span>
                Que tipo de oportunidade procurar?
              </div>
              <div style={sc.typeGrid}>
                {OPPORTUNITY_TYPES.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setOpportunityType(t.value)}
                    style={{
                      ...sc.typeBtn,
                      ...(opportunityType === t.value ? sc.typeBtnActive : {}),
                    }}>
                    <span style={{ fontSize: 22 }}>{t.icon}</span>
                    <span style={{ fontSize: 12, marginTop: 4 }}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* PASSO 3 — PAÍSES */}
            <div style={sc.step}>
              <div style={sc.stepLabel}>
                <span style={sc.stepNum}>3</span>
                Em que países procurar?
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginLeft: 8 }}>
                  {selectedCountries.length} seleccionados
                  {selectedArtist && ' · pré-seleccionados do perfil'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <button style={sc.regionAllBtn} onClick={() => {
                  const all = COUNTRY_REGIONS.flatMap(r => r.countries.map(c => c.code))
                  setSelectedCountries(selectedCountries.length === all.length ? [] : all)
                }}>
                  {selectedCountries.length > 50 ? '× Limpar' : '🌍 Todos'}
                </button>
                <button style={sc.regionAllBtn} onClick={() => setSelectedCountries([])}>× Limpar</button>
              </div>
              {COUNTRY_REGIONS.map(region => {
                const codes = region.countries.map(c => c.code)
                const allSel = codes.every(c => selectedCountries.includes(c))
                return (
                  <div key={region.region} style={{ marginBottom: 14 }}>
                    <div style={sc.regionHeader}>
                      <span style={sc.regionLabel}>{region.region}</span>
                      <button style={sc.regionToggle} onClick={() => toggleRegion(codes)}>
                        {allSel ? '− remover' : '+ todos'}
                      </button>
                    </div>
                    <div style={sc.countryGrid}>
                      {region.countries.map(c => (
                        <button key={c.code} type="button"
                          onClick={() => toggleCountry(c.code)}
                          style={{
                            ...sc.countryBtn,
                            ...(selectedCountries.includes(c.code) ? sc.countryBtnActive : {}),
                          }}>
                          {c.flag} {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* PASSO 4 — NOME + CONFIRMAR */}
            <div style={sc.step}>
              <div style={sc.stepLabel}>
                <span style={sc.stepNum}>4</span>
                Confirmar e guardar
              </div>
              <div style={sc.row2}>
                <div>
                  <label style={sc.label}>Nome da busca</label>
                  <input style={sc.input} value={searchName}
                    onChange={e => setSearchName(e.target.value)}
                    placeholder="Ex: PICUMÃ — Residência Europa" />
                </div>
                <div>
                  <label style={sc.label}>Máximo de resultados</label>
                  <input style={sc.input} type="number" min={3} max={15}
                    value={maxResults} onChange={e => setMaxResults(Number(e.target.value))} />
                </div>
              </div>

              {/* Preview da query que vai ser enviada */}
              {selectedProject && selectedCountries.length > 0 && (
                <div style={sc.queryPreview}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Query que será enviada ao Gemini:</span>
                  <div style={{ color: '#60b4e8', fontSize: 12, marginTop: 4 }}>
                    "{buildQuery(selectedProject, opportunityType, selectedCountries)}"
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>
                    Países: {selectedCountries.join(', ')}
                  </div>
                </div>
              )}
            </div>

            <div style={sc.modalFooter}>
              <button style={sc.cancelBtn} onClick={() => setShowModal(false)}>Cancelar</button>
              <button style={sc.primaryBtn} onClick={handleSave}
                disabled={!artistId || !projectId || selectedCountries.length === 0}>
                💾 Guardar busca
              </button>
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
  searchName: { fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 },
  searchTags: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  tagArtist: { fontSize: 11, color: '#60b4e8', background: 'rgba(26,105,148,0.15)', border: '1px solid rgba(26,105,148,0.25)', borderRadius: 6, padding: '2px 8px' },
  tagProject: { fontSize: 11, color: '#ffcf5c', background: 'rgba(255,207,92,0.1)', border: '1px solid rgba(255,207,92,0.25)', borderRadius: 6, padding: '2px 8px' },
  tagType: { fontSize: 11, color: '#6ef3a5', background: 'rgba(110,243,165,0.1)', border: '1px solid rgba(110,243,165,0.25)', borderRadius: 6, padding: '2px 8px' },
  countryRow: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  countryChip: { fontSize: 10, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '2px 6px' },
  searchActions: { display: 'flex', gap: 6, flexShrink: 0 },
  runBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  deleteBtn: { background: 'rgba(255,70,70,0.1)', color: '#ff8a8a', border: '1px solid rgba(255,70,70,0.2)', borderRadius: 6, padding: '7px 10px', fontSize: 12, cursor: 'pointer' },
  lastRun: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { width: 'min(820px, 100%)', maxHeight: '94vh', overflowY: 'auto', background: '#000', border: '1px solid #1A6994', borderRadius: 16, padding: 24 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' },
  modalTitle: { margin: 0, color: '#60b4e8', fontSize: 22 },
  modalSubtitle: { margin: '6px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  closeBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', flexShrink: 0 },

  step: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 18, marginBottom: 12 },
  stepLabel: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14 },
  stepNum: { background: '#1A6994', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 },

  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label: { display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 },
  input: { width: '100%', background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  select: { width: '100%', background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', cursor: 'pointer' },

  projectPreview: { marginTop: 12, padding: 12, background: 'rgba(255,207,92,0.04)', border: '1px solid rgba(255,207,92,0.2)', borderRadius: 8, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  projectPreviewTitle: { width: '100%', fontSize: 13, fontWeight: 700, color: '#ffcf5c', marginBottom: 4 },
  projectTag: { fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(255,207,92,0.1)', border: '1px solid rgba(255,207,92,0.25)', color: '#ffcf5c' },

  typeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
  typeBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '14px 10px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, cursor: 'pointer', color: 'rgba(255,255,255,0.6)', transition: 'all 0.15s' },
  typeBtnActive: { background: 'rgba(26,105,148,0.25)', border: '1px solid #1A6994', color: '#fff' },

  regionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  regionLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' },
  regionToggle: { background: 'transparent', color: '#60b4e8', border: 'none', fontSize: 11, cursor: 'pointer' },
  regionAllBtn: { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer' },
  countryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6 },
  countryBtn: { padding: '7px 10px', background: 'transparent', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12, cursor: 'pointer', textAlign: 'left' },
  countryBtnActive: { background: 'rgba(26,105,148,0.25)', color: '#fff', border: '1px solid #1A6994' },

  queryPreview: { marginTop: 12, padding: 12, background: 'rgba(26,105,148,0.06)', border: '1px solid rgba(26,105,148,0.2)', borderRadius: 8 },

  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' },
  cancelBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer' },
  primaryBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer' },
}