// src/components/ScoutSavedSearches.tsx
// SOMA ODÉ — Scout Proativo
// Busca por DISCIPLINA + TIPO + PAÍSES
// Artista é opcional — a oportunidade existe independentemente

import { useState } from 'react'

// ─── Tipos ────────────────────────────────────────────────

type OpportunityType = 'residencia' | 'open_call' | 'festival' | 'showcase' | 'premio' | 'mobilidade' | 'financiamento' | 'todos'
type Discipline = 'performance' | 'artes_visuais' | 'cinema' | 'danca' | 'instalacao' | 'investigacao' | 'musica' | 'multidisciplinar'

export interface SavedSearch {
  id: string
  name: string
  query: string
  countries: string
  disciplines: string
  languages: string
  maxResults: number
  opportunityType: OpportunityType
  selectedCountries: string[]
  selectedDisciplines: Discipline[]
  createdAt: string
  lastRunAt?: string
}

interface Props {
  onSave?: (search: SavedSearch) => void
}

// ─── Constantes ───────────────────────────────────────────

const STORAGE_KEY = 'soma-scout-v4'

const OPPORTUNITY_TYPES: { value: OpportunityType; label: string; icon: string }[] = [
  { value: 'todos', label: 'Todos os tipos', icon: '🔍' },
  { value: 'residencia', label: 'Residência', icon: '🏠' },
  { value: 'open_call', label: 'Open Call', icon: '📋' },
  { value: 'festival', label: 'Festival', icon: '🎪' },
  { value: 'showcase', label: 'Showcase', icon: '🎤' },
  { value: 'premio', label: 'Prémio / Bolsa', icon: '🏆' },
  { value: 'mobilidade', label: 'Mobilidade', icon: '✈️' },
  { value: 'financiamento', label: 'Financiamento', icon: '💰' },
]

const DISCIPLINES: { value: Discipline; label: string; icon: string; keywords: string[] }[] = [
  { value: 'performance', label: 'Performance', icon: '🔥', keywords: ['performance', 'artes vivas', 'artes performativas', 'performing arts'] },
  { value: 'artes_visuais', label: 'Artes Visuais', icon: '🎨', keywords: ['artes visuais', 'visual arts', 'arte contemporânea', 'contemporary art'] },
  { value: 'cinema', label: 'Cinema / Vídeo', icon: '🎬', keywords: ['cinema', 'film', 'vídeo', 'audiovisual', 'documentário'] },
  { value: 'danca', label: 'Dança', icon: '💃', keywords: ['dança', 'dance', 'coreografia', 'choreography'] },
  { value: 'instalacao', label: 'Instalação', icon: '💡', keywords: ['instalação', 'installation', 'site-specific'] },
  { value: 'investigacao', label: 'Investigação', icon: '📚', keywords: ['investigação artística', 'artistic research', 'arte e teoria'] },
  { value: 'musica', label: 'Música', icon: '🎵', keywords: ['música', 'music', 'som', 'sound', 'audio'] },
  { value: 'multidisciplinar', label: 'Multidisciplinar', icon: '✨', keywords: ['multidisciplinar', 'interdisciplinar', 'hybrid arts'] },
]

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
      { code: 'IT', name: 'Itália', flag: '🇮🇹' },
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
  {
    region: 'África',
    countries: [
      { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
      { code: 'NG', name: 'Nigéria', flag: '🇳🇬' },
      { code: 'ZA', name: 'África do Sul', flag: '🇿🇦' },
      { code: 'AO', name: 'Angola', flag: '🇦🇴' },
    ],
  },
]

const ALL_COUNTRIES = COUNTRY_REGIONS.flatMap(r => r.countries)

function loadSearches(): SavedSearch[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveSearches(searches: SavedSearch[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(searches))
}

// Constrói query limpa para o Gemini
function buildQuery(disciplines: Discipline[], type: OpportunityType, countries: string[]): string {
  const discKeywords = disciplines
    .flatMap(d => DISCIPLINES.find(x => x.value === d)?.keywords.slice(0, 1) || [])
    .join(' ')

  const typeKeyword = type === 'todos' ? 'oportunidade cultural'
    : OPPORTUNITY_TYPES.find(t => t.value === type)?.label.toLowerCase() || 'oportunidade'

  const year = new Date().getFullYear()
  return `${typeKeyword} ${discKeywords} afrodiaspórico diáspora ${year} ${year + 1}`.trim()
}

// ─── Componente ───────────────────────────────────────────

export default function ScoutSavedSearches({ onSave }: Props) {
  const [searches, setSearches] = useState<SavedSearch[]>(loadSearches())
  const [showModal, setShowModal] = useState(false)

  // Formulário
  const [selectedDisciplines, setSelectedDisciplines] = useState<Discipline[]>([])
  const [opportunityType, setOpportunityType] = useState<OpportunityType>('todos')
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [searchName, setSearchName] = useState('')
  const [maxResults, setMaxResults] = useState(10)

  function toggleDiscipline(d: Discipline) {
    setSelectedDisciplines(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    )
  }

  function toggleCountry(code: string) {
    setSelectedCountries(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  function toggleRegion(codes: string[]) {
    const allSel = codes.every(c => selectedCountries.includes(c))
    setSelectedCountries(prev =>
      allSel ? prev.filter(c => !codes.includes(c)) : Array.from(new Set([...prev, ...codes]))
    )
  }

  function handleSave() {
    if (selectedDisciplines.length === 0) { alert('Selecciona pelo menos uma disciplina.'); return }
    if (selectedCountries.length === 0) { alert('Selecciona pelo menos um país.'); return }

    const name = searchName.trim() || [
      OPPORTUNITY_TYPES.find(t => t.value === opportunityType)?.label,
      selectedDisciplines.map(d => DISCIPLINES.find(x => x.value === d)?.label).join(' + '),
    ].filter(Boolean).join(' · ')

    const query = buildQuery(selectedDisciplines, opportunityType, selectedCountries)
    const disciplines = selectedDisciplines
      .flatMap(d => DISCIPLINES.find(x => x.value === d)?.keywords.slice(0, 2) || [])
      .join(', ')

    const newSearch: SavedSearch = {
      id: crypto.randomUUID(),
      name,
      query,
      countries: selectedCountries.join(', '),
      disciplines,
      languages: 'PT, EN, ES',
      maxResults,
      opportunityType,
      selectedCountries,
      selectedDisciplines,
      createdAt: new Date().toISOString(),
    }

    const updated = [newSearch, ...searches]
    setSearches(updated); saveSearches(updated)
    onSave?.(newSearch)
    setShowModal(false); resetForm()
  }

  function handleDelete(id: string) {
    if (!confirm('Apagar esta busca?')) return
    const updated = searches.filter(s => s.id !== id)
    setSearches(updated); saveSearches(updated)
  }

  function handleRun(search: SavedSearch) {
    const updated = searches.map(s =>
      s.id === search.id ? { ...s, lastRunAt: new Date().toISOString() } : s
    )
    setSearches(updated); saveSearches(updated)
    onSave?.(search)
  }

  function resetForm() {
    setSelectedDisciplines([]); setOpportunityType('todos')
    setSelectedCountries([]); setSearchName(''); setMaxResults(10)
  }

  return (
    <div style={sc.wrap}>
      <div style={sc.header}>
        <div>
          <h3 style={sc.title}>🔍 Scout Proativo</h3>
          <p style={sc.subtitle}>{searches.length} busca{searches.length !== 1 ? 's' : ''} guardada{searches.length !== 1 ? 's' : ''}</p>
        </div>
        <button style={sc.primaryBtn} onClick={() => { resetForm(); setShowModal(true) }}>+ Nova busca</button>
      </div>

      {/* LISTA DE BUSCAS */}
      {searches.length > 0 && (
        <div style={sc.list}>
          {searches.map(search => {
            const typeInfo = OPPORTUNITY_TYPES.find(t => t.value === search.opportunityType)
            const discInfos = (search.selectedDisciplines || []).map(d => DISCIPLINES.find(x => x.value === d)).filter(Boolean)
            return (
              <div key={search.id} style={sc.card}>
                <div style={sc.cardTop}>
                  <div style={{ flex: 1 }}>
                    <div style={sc.cardName}>{search.name}</div>
                    <div style={sc.cardTags}>
                      {typeInfo && typeInfo.value !== 'todos' && (
                        <span style={sc.tagType}>{typeInfo.icon} {typeInfo.label}</span>
                      )}
                      {discInfos.map(d => d && (
                        <span key={d.value} style={sc.tagDisc}>{d.icon} {d.label}</span>
                      ))}
                    </div>
                    <div style={sc.cardCountries}>
                      {(search.selectedCountries || []).slice(0, 10).map(c => {
                        const found = ALL_COUNTRIES.find(x => x.code === c)
                        return <span key={c} style={sc.countryChip}>{found?.flag} {c}</span>
                      })}
                      {(search.selectedCountries || []).length > 10 && (
                        <span style={sc.countryChip}>+{search.selectedCountries.length - 10}</span>
                      )}
                    </div>
                  </div>
                  <div style={sc.cardActions}>
                    <button style={sc.runBtn} onClick={() => handleRun(search)}>▶ Executar</button>
                    <button style={sc.deleteBtn} onClick={() => handleDelete(search.id)}>✕</button>
                  </div>
                </div>
                {search.lastRunAt && (
                  <div style={sc.lastRun}>Última execução: {new Date(search.lastRunAt).toLocaleDateString('pt-PT')}</div>
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
                <p style={sc.modalSubtitle}>Disciplina + tipo + países → o Gemini encontra oportunidades reais</p>
              </div>
              <button style={sc.closeBtn} onClick={() => setShowModal(false)}>Fechar</button>
            </div>

            {/* PASSO 1 — DISCIPLINAS */}
            <div style={sc.step}>
              <div style={sc.stepLabel}>
                <span style={sc.stepNum}>1</span>
                Disciplinas
                <span style={sc.stepHint}>selecciona uma ou mais — o scout vai buscar para estas práticas</span>
              </div>
              <div style={sc.discGrid}>
                {DISCIPLINES.map(d => (
                  <button key={d.value} type="button"
                    onClick={() => toggleDiscipline(d.value)}
                    style={{ ...sc.discBtn, ...(selectedDisciplines.includes(d.value) ? sc.discBtnActive : {}) }}>
                    <span style={{ fontSize: 22 }}>{d.icon}</span>
                    <span style={{ fontSize: 12, marginTop: 4, fontWeight: selectedDisciplines.includes(d.value) ? 700 : 400 }}>
                      {d.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* PASSO 2 — TIPO */}
            <div style={sc.step}>
              <div style={sc.stepLabel}>
                <span style={sc.stepNum}>2</span>
                Tipo de oportunidade
                <span style={sc.stepHint}>podes seleccionar "Todos" para uma busca mais ampla</span>
              </div>
              <div style={sc.typeGrid}>
                {OPPORTUNITY_TYPES.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => setOpportunityType(t.value)}
                    style={{ ...sc.typeBtn, ...(opportunityType === t.value ? sc.typeBtnActive : {}) }}>
                    <span style={{ fontSize: 18 }}>{t.icon}</span>
                    <span style={{ fontSize: 11, marginTop: 3 }}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* PASSO 3 — PAÍSES */}
            <div style={sc.step}>
              <div style={sc.stepLabel}>
                <span style={sc.stepNum}>3</span>
                Países
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginLeft: 8 }}>
                  {selectedCountries.length} seleccionados
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button style={sc.quickBtn} onClick={() => {
                  // Europa toda
                  const europa = COUNTRY_REGIONS.slice(0, 2).flatMap(r => r.countries.map(c => c.code))
                  setSelectedCountries(Array.from(new Set([...selectedCountries, ...europa])))
                }}>🌍 Europa</button>
                <button style={sc.quickBtn} onClick={() => {
                  const latam = COUNTRY_REGIONS.find(r => r.region === 'América do Sul')?.countries.map(c => c.code) || []
                  setSelectedCountries(Array.from(new Set([...selectedCountries, ...latam])))
                }}>🌎 América do Sul</button>
                <button style={sc.quickBtn} onClick={() => setSelectedCountries([])}>× Limpar</button>
              </div>
              {COUNTRY_REGIONS.map(region => {
                const codes = region.countries.map(c => c.code)
                const allSel = codes.every(c => selectedCountries.includes(c))
                return (
                  <div key={region.region} style={{ marginBottom: 12 }}>
                    <div style={sc.regionHeader}>
                      <span style={sc.regionLabel}>{region.region}</span>
                      <button style={sc.regionToggle} onClick={() => toggleRegion(codes)}>
                        {allSel ? '− remover' : '+ todos'}
                      </button>
                    </div>
                    <div style={sc.countryGrid}>
                      {region.countries.map(c => (
                        <button key={c.code} type="button" onClick={() => toggleCountry(c.code)}
                          style={{ ...sc.countryBtn, ...(selectedCountries.includes(c.code) ? sc.countryBtnActive : {}) }}>
                          {c.flag} {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* PASSO 4 — CONFIRMAR */}
            <div style={sc.step}>
              <div style={sc.stepLabel}>
                <span style={sc.stepNum}>4</span>
                Nome da busca
              </div>
              <div style={sc.row2}>
                <div>
                  <input style={sc.input} value={searchName}
                    onChange={e => setSearchName(e.target.value)}
                    placeholder={selectedDisciplines.length > 0
                      ? `Ex: ${OPPORTUNITY_TYPES.find(t => t.value === opportunityType)?.label} · ${selectedDisciplines.map(d => DISCIPLINES.find(x => x.value === d)?.label).join(' + ')}`
                      : 'Nome da busca (opcional — gerado automaticamente)'} />
                </div>
                <div>
                  <input style={sc.input} type="number" min={3} max={20} value={maxResults}
                    onChange={e => setMaxResults(Number(e.target.value))}
                    placeholder="Máx resultados" />
                </div>
              </div>

              {/* Preview da query */}
              {selectedDisciplines.length > 0 && selectedCountries.length > 0 && (
                <div style={sc.preview}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Query Gemini + Google Search:</span>
                  <div style={{ color: '#60b4e8', fontSize: 12, marginTop: 4 }}>
                    "{buildQuery(selectedDisciplines, opportunityType, selectedCountries)}"
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 4 }}>
                    {selectedCountries.join(', ')}
                  </div>
                </div>
              )}
            </div>

            <div style={sc.footer}>
              <button style={sc.cancelBtn} onClick={() => setShowModal(false)}>Cancelar</button>
              <button style={sc.primaryBtn} onClick={handleSave}
                disabled={selectedDisciplines.length === 0 || selectedCountries.length === 0}>
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

  list: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 },
  card: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14 },
  cardTop: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  cardName: { fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 },
  cardTags: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  tagType: { fontSize: 11, color: '#6ef3a5', background: 'rgba(110,243,165,0.1)', border: '1px solid rgba(110,243,165,0.25)', borderRadius: 6, padding: '2px 8px' },
  tagDisc: { fontSize: 11, color: '#60b4e8', background: 'rgba(26,105,148,0.15)', border: '1px solid rgba(26,105,148,0.25)', borderRadius: 6, padding: '2px 8px' },
  cardCountries: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  countryChip: { fontSize: 10, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '2px 6px' },
  cardActions: { display: 'flex', gap: 6, flexShrink: 0 },
  runBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  deleteBtn: { background: 'rgba(255,70,70,0.1)', color: '#ff8a8a', border: '1px solid rgba(255,70,70,0.2)', borderRadius: 6, padding: '7px 10px', fontSize: 12, cursor: 'pointer' },
  lastRun: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { width: 'min(820px, 100%)', maxHeight: '94vh', overflowY: 'auto', background: '#000', border: '1px solid #1A6994', borderRadius: 16, padding: 24 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' },
  modalTitle: { margin: 0, color: '#60b4e8', fontSize: 22 },
  modalSubtitle: { margin: '6px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  closeBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', flexShrink: 0 },

  step: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 18, marginBottom: 12 },
  stepLabel: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14, flexWrap: 'wrap' },
  stepNum: { background: '#1A6994', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 },
  stepHint: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 400 },

  discGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  discBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, cursor: 'pointer', color: 'rgba(255,255,255,0.6)', gap: 2 },
  discBtnActive: { background: 'rgba(26,105,148,0.25)', border: '2px solid #1A6994', color: '#fff' },

  typeGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  typeBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 6px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.6)', gap: 3 },
  typeBtnActive: { background: 'rgba(26,105,148,0.2)', border: '2px solid #1A6994', color: '#fff' },

  quickBtn: { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  regionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  regionLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' },
  regionToggle: { background: 'transparent', color: '#60b4e8', border: 'none', fontSize: 11, cursor: 'pointer' },
  countryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6 },
  countryBtn: { padding: '7px 10px', background: 'transparent', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12, cursor: 'pointer', textAlign: 'left' },
  countryBtnActive: { background: 'rgba(26,105,148,0.25)', color: '#fff', border: '1px solid #1A6994' },

  row2: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 },
  input: { width: '100%', background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  preview: { padding: 12, background: 'rgba(26,105,148,0.06)', border: '1px solid rgba(26,105,148,0.2)', borderRadius: 8 },

  footer: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' },
  cancelBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer' },
  primaryBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer' },
}