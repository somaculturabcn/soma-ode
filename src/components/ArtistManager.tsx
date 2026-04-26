// src/components/ArtistManager.tsx
// SOMA ODÉ — Gestão de Artistas v3.2 (Claude · 2026-04-25)
// 9 secções completas + Cartografia SOMA + análise IA
// Compatível com localStorage soma-artists-v2

import { useState, useEffect } from 'react'
import type { Artist } from '../types/artist'

// ─── Tipos locais ─────────────────────────────────────────────────────────────

interface Project {
  id: string
  name: string
  format: string
  duration: string
  language: string
  summary: string
  technicalNeeds: string
  videoLink: string
  coversCosts: boolean
  minFee: number | undefined
  hasToured: boolean
  tourHistory: string
}

interface Cartografia {
  // RAIZ — identidade profunda
  origens: string
  tensoes: string
  vocabularioProprio: string
  // CAMPO — público
  perfisAudiencia: string
  motivacaoAdesao: string
  territoriosPublico: string
  // TEIA — circuito
  pares: string
  legitimacao: string
  redesInfluencia: string
  tradutoresValor: string
  // ROTA — estratégia
  gaps: string
  corredoresNaturais: string
  planoExpansao: string
}

interface ArtistFull {
  id: string
  // 01 Identidade
  name: string
  legalName: string
  pronouns: string
  email: string
  phone: string
  instagram: string
  website: string
  videoLink: string
  driveLink: string
  // 02 Localização
  origin: string
  base: string
  residenceCountry: string
  // 03 Perfil artístico
  disciplines: string[]
  specialties: string[]
  keywords: string[]
  themes: string[]
  genres: string[]
  bio: string
  languages: string[]
  aestheticLanguage: string
  // 04 Países
  targetCountries: string[]
  // 05 Mobilidade
  canTravel: boolean
  hasEUPassport: boolean
  passportCountry: string
  minFee: number | undefined
  availability: string
  visaNeeds: string
  // 06 Materiais
  materials: {
    bioPT: boolean; bioEN: boolean; bioES: boolean; bioCA: boolean; bioFR: boolean
    pressPhoto: boolean; videoPresentation: boolean; technicalRider: boolean
    pressKit: boolean; pressClippings: boolean
    spotifyLink: string; bandcampLink: string; youtubeLink: string
    instagramLink: string; soundcloudLink: string
  }
  // 07 Projectos
  projects: Project[]
  // 08 CRM interno
  internal: {
    contractStatus: string
    notes: string
    priority: string
    lastContact: string
    booker: string
    somaFeePercent: number
  }
  // 09 Cartografia
  cartografia: Cartografia
  // Meta
  active: boolean
  hasMusikModule: boolean
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

function emptyArtist(): ArtistFull {
  return {
    id: '',
    name: '', legalName: '', pronouns: '', email: '', phone: '',
    instagram: '', website: '', videoLink: '', driveLink: '',
    origin: '', base: '', residenceCountry: '',
    disciplines: [], specialties: [], keywords: [], themes: [], genres: [],
    bio: '', languages: [], aestheticLanguage: '',
    targetCountries: [],
    canTravel: true, hasEUPassport: false, passportCountry: '', minFee: undefined,
    availability: '', visaNeeds: '',
    materials: {
      bioPT: false, bioEN: false, bioES: false, bioCA: false, bioFR: false,
      pressPhoto: false, videoPresentation: false, technicalRider: false,
      pressKit: false, pressClippings: false,
      spotifyLink: '', bandcampLink: '', youtubeLink: '',
      instagramLink: '', soundcloudLink: '',
    },
    projects: [],
    internal: {
      contractStatus: 'sem_contrato', notes: '', priority: 'media',
      lastContact: '', booker: '', somaFeePercent: 20,
    },
    cartografia: {
      origens: '', tensoes: '', vocabularioProprio: '',
      perfisAudiencia: '', motivacaoAdesao: '', territoriosPublico: '',
      pares: '', legitimacao: '', redesInfluencia: '', tradutoresValor: '',
      gaps: '', corredoresNaturais: '', planoExpansao: '',
    },
    active: true, hasMusikModule: false,
  }
}

function normalize(raw: any): ArtistFull {
  const base = emptyArtist()
  return {
    ...base,
    ...raw,
    materials: { ...base.materials, ...(raw.materials || {}) },
    internal: { ...base.internal, ...(raw.internal || {}) },
    cartografia: { ...base.cartografia, ...(raw.cartografia || {}) },
    disciplines: raw.disciplines || (raw.artType ? [raw.artType] : []),
    specialties: raw.specialties || [],
    keywords: raw.keywords || [],
    themes: raw.themes || [],
    genres: raw.genres || [],
    languages: raw.languages || [],
    targetCountries: raw.targetCountries || (raw.targetRegions ? [] : []),
    projects: (raw.projects || []).map((p: any) => ({
      id: p.id || crypto.randomUUID(),
      name: p.name || '',
      format: p.format || '',
      duration: p.duration || '',
      language: p.language || '',
      summary: p.summary || '',
      technicalNeeds: p.technicalNeeds || '',
      videoLink: p.videoLink || '',
      coversCosts: !!p.coversCosts,
      minFee: p.minFee,
      hasToured: !!p.hasToured,
      tourHistory: p.tourHistory || '',
    })),
  }
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'soma-artists-v2'

function loadArtists(): ArtistFull[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw).map(normalize)
  } catch { return [] }
}

function saveArtists(artists: ArtistFull[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(artists))
}

// ─── Disciplinas disponíveis ──────────────────────────────────────────────────

const DISCIPLINES = [
  { id: 'musica', label: '🎵 Música' },
  { id: 'danca', label: '💃 Dança' },
  { id: 'teatro', label: '🎭 Teatro' },
  { id: 'performance', label: '🔥 Performance' },
  { id: 'artes_visuais', label: '🎨 Artes Visuais' },
  { id: 'instalacao', label: '🏗 Instalação' },
  { id: 'cinema', label: '🎬 Cinema' },
  { id: 'som', label: '🔊 Som / Áudio' },
  { id: 'pesquisa', label: '🔬 Pesquisa' },
  { id: 'multidisciplinar', label: '✨ Multidisciplinar' },
]

const LANGUAGES = ['PT', 'EN', 'ES', 'CA', 'FR', 'DE', 'IT', 'NL', 'AR', 'SW', 'ZH', 'JA', 'KO', 'RU', 'HI']

const PROFESSIONAL_ROLES = [
  { id: 'artista', label: '🎤 Artista' },
  { id: 'produtor', label: '🎛 Produtor/a' },
  { id: 'dj', label: '🎧 DJ' },
  { id: 'promotor_festa', label: '🎉 Promotor/a de festa' },
  { id: 'promotor_cultural', label: '📣 Promotor/a cultural' },
  { id: 'associacao', label: '🤝 Associação / colectivo' },
  { id: 'gestor_cultural', label: '🏛 Gestor/a cultural' },
  { id: 'agente', label: '📋 Agente / booker' },
  { id: 'curador', label: '🖼 Curador/a' },
  { id: 'programador', label: '📅 Programador/a' },
  { id: 'manager', label: '💼 Manager' },
  { id: 'label', label: '💿 Selo / label' },
  { id: 'festival', label: '🎪 Festival / evento' },
  { id: 'espaco_cultural', label: '🏠 Espaço cultural / venue' },
  { id: 'investigador', label: '📚 Investigador/a' },
  { id: 'educador', label: '🎓 Educador/a' },
]

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  selectedArtistId?: string
  onSelect?: (artist: Artist) => void
}

export default function ArtistManager({ selectedArtistId, onSelect }: Props) {
  const [artists, setArtists] = useState<ArtistFull[]>(loadArtists)
  const [editing, setEditing] = useState<ArtistFull | null>(null)
  const [section, setSection] = useState(1)
  const [iaLoading, setIaLoading] = useState(false)
  const [iaResult, setIaResult] = useState<string>('')
  const [search, setSearch] = useState('')

  const filtered = artists.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.base.toLowerCase().includes(search.toLowerCase())
  )

  function newArtist() {
    setEditing({ ...emptyArtist(), id: crypto.randomUUID() })
    setSection(1)
    setIaResult('')
  }

  function editArtist(a: ArtistFull) {
    setEditing({ ...a })
    setSection(1)
    setIaResult('')
  }

  function deleteArtist(id: string) {
    if (!confirm('Apagar artista? Esta acção não pode ser desfeita.')) return
    const updated = artists.filter(a => a.id !== id)
    setArtists(updated)
    saveArtists(updated)
    if (editing?.id === id) setEditing(null)
  }

  function saveArtist() {
    if (!editing) return
    if (!editing.name.trim()) { alert('Nome artístico obrigatório.'); return }
    const exists = artists.find(a => a.id === editing.id)
    const updated = exists
      ? artists.map(a => a.id === editing.id ? editing : a)
      : [...artists, editing]
    setArtists(updated)
    saveArtists(updated)
    setEditing(null)
  }

  function update(field: keyof ArtistFull, value: any) {
    setEditing(e => e ? { ...e, [field]: value } : e)
  }

  function updateMat(field: string, value: any) {
    setEditing(e => e ? { ...e, materials: { ...e.materials, [field]: value } } : e)
  }

  function updateInternal(field: string, value: any) {
    setEditing(e => e ? { ...e, internal: { ...e.internal, [field]: value } } : e)
  }

  function updateCartografia(field: keyof Cartografia, value: string) {
    setEditing(e => e ? { ...e, cartografia: { ...e.cartografia, [field]: value } } : e)
  }

  function toggleDiscipline(id: string) {
    if (!editing) return
    const has = editing.disciplines.includes(id)
    update('disciplines', has ? editing.disciplines.filter(d => d !== id) : [...editing.disciplines, id])
  }

  function toggleLang(lang: string) {
    if (!editing) return
    const has = editing.languages.includes(lang)
    update('languages', has ? editing.languages.filter(l => l !== lang) : [...editing.languages, lang])
  }

  function addProject() {
    if (!editing) return
    const p: Project = {
      id: crypto.randomUUID(), name: '', format: '', duration: '', language: '',
      summary: '', technicalNeeds: '', videoLink: '', coversCosts: false,
      minFee: undefined, hasToured: false, tourHistory: '',
    }
    update('projects', [...editing.projects, p])
  }

  function updateProject(id: string, field: keyof Project, value: any) {
    if (!editing) return
    update('projects', editing.projects.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  function removeProject(id: string) {
    if (!editing) return
    update('projects', editing.projects.filter(p => p.id !== id))
  }

  async function gerarIA() {
    if (!editing) return
    setIaLoading(true)
    setIaResult('')
    try {
      const prompt = `És um consultor especializado em carreiras de artistas afrodiaspóricos em circulação internacional. 
Analisa este perfil de artista e devolve uma análise estratégica em português, concisa e directa (máximo 400 palavras):

Nome: ${editing.name}
Base: ${editing.base}, origem: ${editing.origin}
Disciplinas: ${editing.disciplines.join(', ')}
Géneros: ${editing.genres.join(', ')}
Keywords: ${editing.keywords.join(', ')}
Temas: ${editing.themes.join(', ')}
Países de interesse: ${editing.targetCountries.join(', ')}
Idiomas: ${editing.languages.join(', ')}
Passaporte UE: ${editing.hasEUPassport ? 'Sim' : 'Não'}
Bio: ${editing.bio}

CARTOGRAFIA — RAIZ (Identidade)
Origens: ${editing.cartografia.origens}
Tensões criativas: ${editing.cartografia.tensoes}
Vocabulário próprio: ${editing.cartografia.vocabularioProprio}

CARTOGRAFIA — CAMPO (Público)
Perfis de audiência: ${editing.cartografia.perfisAudiencia}
Motivação de adesão: ${editing.cartografia.motivacaoAdesao}
Territórios do público: ${editing.cartografia.territoriosPublico}

CARTOGRAFIA — TEIA (Circuito)
Pares: ${editing.cartografia.pares}
Legitimação: ${editing.cartografia.legitimacao}
Redes de influência: ${editing.cartografia.redesInfluencia}

CARTOGRAFIA — ROTA (Estratégia)
Gaps actuais: ${editing.cartografia.gaps}
Corredores naturais: ${editing.cartografia.corredoresNaturais}
Plano de expansão: ${editing.cartografia.planoExpansao}

Responde com:
1. POSICIONAMENTO ESTRATÉGICO (2-3 frases)
2. TERRITÓRIO FOCO — qual o próximo território prioritário e porquê
3. MATCHES PRIORITÁRIOS — tipos de oportunidades mais relevantes para este perfil (residências, festivais, showcases, financiamento)
4. ROTA RECOMENDADA — 3 passos concretos
5. ALERTAS — o que evitar`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      const text = data.content?.find((b: any) => b.type === 'text')?.text || ''
      setIaResult(text)
    } catch (e) {
      setIaResult('Erro ao gerar análise. Tenta novamente.')
    }
    setIaLoading(false)
  }

  // ─── Lista de artistas ──────────────────────────────────────────────────────

  if (!editing) {
    return (
      <div style={s.wrap}>
        <div style={s.listHeader}>
          <div>
            <h2 style={s.title}>Artistas <span style={s.badge}>{artists.length}</span></h2>
            <p style={s.sub}>Roster da SOMA Cultura</p>
          </div>
          <div style={s.listActions}>
            <input style={s.search} placeholder="🔍 Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
            <button style={s.btnPrimary} onClick={newArtist}>+ Novo artista</button>
          </div>
        </div>

        {filtered.length === 0 && (
          <div style={s.empty}>
            {artists.length === 0
              ? 'Nenhum artista ainda. Clica em "+ Novo artista" para começar.'
              : 'Nenhum artista encontrado.'}
          </div>
        )}

        <div style={s.grid}>
          {filtered.map(a => {
            const matCount = Object.entries(a.materials)
              .filter(([k, v]) => typeof v === 'boolean' && v).length
            const matTotal = 10
            const cartCount = Object.values(a.cartografia).filter(v => v && v.trim()).length
            return (
              <div key={a.id} style={{ ...s.artistCard, borderColor: selectedArtistId === a.id ? '#1A6994' : 'rgba(255,255,255,0.08)' }}>
                <div style={s.artistCardTop}>
                  <div>
                    <div style={s.artistName}>{a.name}</div>
                    <div style={s.artistMeta}>{[a.base, a.origin].filter(Boolean).join(' · ')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {a.disciplines.slice(0, 2).map(d => (
                      <span key={d} style={s.pill}>{DISCIPLINES.find(x => x.id === d)?.label || d}</span>
                    ))}
                  </div>
                </div>

                {a.bio && <p style={s.artistBio}>{a.bio.slice(0, 100)}{a.bio.length > 100 ? '...' : ''}</p>}

                <div style={s.artistStats}>
                  <span style={{ ...s.stat, color: matCount >= matTotal * 0.7 ? '#6ef3a5' : '#ffcf5c' }}>
                    Materiais {matCount}/{matTotal}
                  </span>
                  <span style={{ ...s.stat, color: cartCount >= 8 ? '#6ef3a5' : cartCount >= 4 ? '#ffcf5c' : '#aaa' }}>
                    Cartografia {cartCount}/13
                  </span>
                  <span style={s.stat}>{a.projects.length} projecto{a.projects.length !== 1 ? 's' : ''}</span>
                </div>

                <div style={s.artistActions}>
                  <button style={s.btnEdit} onClick={() => editArtist(a)}>✏ Editar</button>
                  {onSelect && (
                    <button style={s.btnMatch} onClick={() => onSelect(a as unknown as Artist)}>
                      Ver oportunidades →
                    </button>
                  )}
                  <button style={s.btnDelete} onClick={() => deleteArtist(a.id)}>apagar</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── Formulário de edição ───────────────────────────────────────────────────

  const SECTIONS = [
    '01 · Identidade', '02 · Localização', '03 · Perfil',
    '04 · Países', '05 · Mobilidade', '06 · Materiais',
    '07 · Projectos', '08 · CRM Interno', '09 · Cartografia SOMA',
  ]

  return (
    <div style={s.wrap}>
      <div style={s.formHeader}>
        <div>
          <h2 style={s.title}>{editing.id && artists.find(a => a.id === editing.id) ? `Editar: ${editing.name || '—'}` : 'Novo artista'}</h2>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={s.btnSecondary} onClick={() => setEditing(null)}>Cancelar</button>
          <button style={s.btnPrimary} onClick={saveArtist}>💾 Guardar artista</button>
        </div>
      </div>

      {/* Navegação entre secções */}
      <div style={s.sectionNav}>
        {SECTIONS.map((label, i) => (
          <button key={i} style={{ ...s.sectionBtn, ...(section === i + 1 ? s.sectionBtnActive : {}) }}
            onClick={() => setSection(i + 1)}>
            {label}
          </button>
        ))}
      </div>

      <div style={s.formBody}>

        {/* ── 01 Identidade ─────────────────────────────────────────────── */}
        {section === 1 && (
          <Section title="01 · Identidade e Contacto">
            <Row2>
              <F label="Nome artístico *" value={editing.name} onChange={v => update('name', v)} />
              <F label="Nome legal" value={editing.legalName} onChange={v => update('legalName', v)} />
            </Row2>
            <Row2>
              <F label="Pronomes" value={editing.pronouns} onChange={v => update('pronouns', v)} placeholder="ele/ela/elu/they" />
              <F label="Email" value={editing.email} onChange={v => update('email', v)} type="email" />
            </Row2>
            <Row2>
              <F label="Telefone" value={editing.phone} onChange={v => update('phone', v)} />
              <F label="Instagram" value={editing.instagram} onChange={v => update('instagram', v)} placeholder="@handle" />
            </Row2>
            <Row2>
              <F label="Website" value={editing.website} onChange={v => update('website', v)} />
              <F label="Vídeo / Vimeo" value={editing.videoLink} onChange={v => update('videoLink', v)} />
            </Row2>
            <F label="Google Drive (pasta da SOMA)" value={editing.driveLink} onChange={v => update('driveLink', v)} full />
          </Section>
        )}

        {/* ── 02 Localização ─────────────────────────────────────────────── */}
        {section === 2 && (
          <Section title="02 · Localização e Raízes">
            <Row2>
              <F label="País de origem" value={editing.origin} onChange={v => update('origin', v)} />
              <F label="Cidade base" value={editing.base} onChange={v => update('base', v)} />
            </Row2>
            <F label="País de residência actual" value={editing.residenceCountry} onChange={v => update('residenceCountry', v)} />
          </Section>
        )}

        {/* ── 03 Perfil artístico ──────────────────────────────────────────── */}
        {section === 3 && (
          <Section title="03 · Perfil Artístico">
            <label style={s.fieldLabel}>Disciplinas</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {DISCIPLINES.map(d => (
                <button key={d.id} style={{ ...s.tagBtn, ...(editing.disciplines.includes(d.id) ? s.tagBtnActive : {}) }}
                  onClick={() => toggleDiscipline(d.id)}>
                  {d.label}
                </button>
              ))}
            </div>

            <label style={s.fieldLabel}>Função profissional (selecciona todas as que se aplicam)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {PROFESSIONAL_ROLES.map(r => {
                const active = (editing.specialties || []).includes(r.id)
                return (
                  <button key={r.id}
                    style={{ ...s.tagBtn, ...(active ? s.tagBtnActive : {}) }}
                    onClick={() => {
                      const current = editing.specialties || []
                      update('specialties', active ? current.filter(x => x !== r.id) : [...current, r.id])
                    }}>
                    {r.label}
                  </button>
                )
              })}
            </div>

            <label style={s.fieldLabel}>Idiomas</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {LANGUAGES.map(l => (
                <button key={l} style={{ ...s.tagBtn, ...(editing.languages.includes(l) ? s.tagBtnActive : {}) }}
                  onClick={() => toggleLang(l)}>
                  {l}
                </button>
              ))}
            </div>

            <Row2>
              <FTags label="Keywords temáticas" value={editing.keywords} onChange={v => update('keywords', v)} />
              <FTags label="Temas de trabalho" value={editing.themes} onChange={v => update('themes', v)} />
            </Row2>
            <Row2>
              <FTags label="Géneros musicais" value={editing.genres} onChange={v => update('genres', v)} />
              <F label="Linguagem estética" value={editing.aestheticLanguage} onChange={v => update('aestheticLanguage', v)} placeholder="teatro pós-dramático, afrofuturismo..." />
            </Row2>
            <FArea label="Bio curta" value={editing.bio} onChange={v => update('bio', v)} placeholder="Bio para candidaturas (150 palavras máx)..." />
          </Section>
        )}

        {/* ── 04 Países ──────────────────────────────────────────────────── */}
        {section === 4 && (
          <Section title="04 · Países e Territórios de Interesse">
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 16 }}>
              Clica nas regiões para adicionar países em bloco, ou escreve códigos ISO directamente.
            </p>

            {/* Tags dos países seleccionados */}
            {editing.targetCountries.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16, padding: 12, background: 'rgba(192,132,252,0.05)', border: '0.5px solid rgba(192,132,252,0.15)', borderRadius: 10 }}>
                {editing.targetCountries.map(c => (
                  <span key={c} style={s.countryTag}>
                    {c}
                    <button style={s.tagX} onClick={() => update('targetCountries', editing.targetCountries.filter(x => x !== c))}>×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Campo texto para escrita directa */}
            <F
              label={`${editing.targetCountries.length} países seleccionados — adicionar manualmente (ISO, vírgula)`}
              value={editing.targetCountries.join(', ')}
              onChange={v => update('targetCountries', v.split(',').map(x => x.trim().toUpperCase()).filter(Boolean))}
              full
            />

            {/* Botões de região */}
            {[
              {
                label: '🌍 Europa Ocidental',
                codes: ['ES','PT','FR','DE','BE','NL','IT','AT','CH','SE','NO','DK','FI','IE','GB','LU','IS','LI','MT','CY'],
              },
              {
                label: '🌍 Europa do Leste',
                codes: ['PL','CZ','HU','RO','BG','HR','SI','SK','RS','UA','BY','MD','MK','BA','AL','ME','XK','LT','LV','EE'],
              },
              {
                label: '🌎 América do Norte',
                codes: ['US','CA','MX'],
              },
              {
                label: '🌎 América Central e Caraíbas',
                codes: ['GT','BZ','HN','SV','NI','CR','PA','CU','DO','PR','JM','HT','TT','BB'],
              },
              {
                label: '🌎 América do Sul',
                codes: ['BR','AR','CL','CO','PE','VE','EC','BO','UY','PY','GY','SR'],
              },
              {
                label: '🌍 África Ocidental',
                codes: ['SN','NG','GH','CI','ML','BF','GN','TG','BJ','NE','MR','SL','LR','GM','GW','CV'],
              },
              {
                label: '🌍 África do Norte',
                codes: ['MA','DZ','TN','LY','EG','SD'],
              },
              {
                label: '🌍 África Oriental e Austral',
                codes: ['ET','KE','TZ','UG','RW','ZA','MZ','AO','ZM','ZW','MW','BI','DJ','SO','ER','MG','MU'],
              },
              {
                label: '🌍 África Central',
                codes: ['CM','CD','CG','CF','GA','GQ','TD','ST'],
              },
              {
                label: '🌏 Médio Oriente',
                codes: ['TR','LB','JO','PS','IL','IQ','IR','SY','SA','AE','QA','KW','BH','OM','YE'],
              },
              {
                label: '🌏 Ásia Oriental',
                codes: ['CN','JP','KR','TW','HK','MO','MN'],
              },
              {
                label: '🌏 Ásia do Sul',
                codes: ['IN','PK','BD','LK','NP','AF','MV'],
              },
              {
                label: '🌏 Ásia do Sudeste',
                codes: ['TH','VN','ID','PH','MY','SG','MM','KH','LA','BN','TL'],
              },
              {
                label: '🌏 Ásia Central',
                codes: ['KZ','UZ','TM','KG','TJ','AZ','GE','AM'],
              },
              {
                label: '🌏 Oceânia',
                codes: ['AU','NZ','FJ','PG','SB','VU','WS','TO'],
              },
            ].map(({ label, codes }) => {
              const alreadyAll = codes.every(c => editing.targetCountries.includes(c))
              return (
                <div key={label} style={{ marginTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{label}</span>
                    <button
                      style={{ ...s.regionBtn, ...(alreadyAll ? { color: '#ff8a8a', borderColor: 'rgba(255,100,100,0.3)' } : {}) }}
                      onClick={() => {
                        if (alreadyAll) {
                          update('targetCountries', editing.targetCountries.filter(c => !codes.includes(c)))
                        } else {
                          const toAdd = codes.filter(c => !editing.targetCountries.includes(c))
                          update('targetCountries', [...editing.targetCountries, ...toAdd])
                        }
                      }}
                    >
                      {alreadyAll ? '− remover todos' : '+ seleccionar todos'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {codes.map(c => {
                      const selected = editing.targetCountries.includes(c)
                      return (
                        <button
                          key={c}
                          style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            borderRadius: 6,
                            cursor: 'pointer',
                            background: selected ? 'rgba(192,132,252,0.25)' : 'rgba(255,255,255,0.04)',
                            color: selected ? '#c084fc' : 'rgba(255,255,255,0.45)',
                            border: selected ? '0.5px solid rgba(192,132,252,0.5)' : '0.5px solid rgba(255,255,255,0.1)',
                            fontWeight: selected ? 700 : 400,
                          }}
                          onClick={() => {
                            if (selected) {
                              update('targetCountries', editing.targetCountries.filter(x => x !== c))
                            } else {
                              update('targetCountries', [...editing.targetCountries, c])
                            }
                          }}
                        >
                          {c}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Botões globais */}
            <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 16, borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
              <button style={{ ...s.btnPrimary, fontSize: 12 }} onClick={() => {
                const all = ['ES','PT','FR','DE','BE','NL','IT','AT','CH','SE','NO','DK','FI','IE','GB','LU','IS','LI','MT','CY',
                  'PL','CZ','HU','RO','BG','HR','SI','SK','RS','UA','BY','MD','MK','BA','AL','ME','XK','LT','LV','EE',
                  'US','CA','MX','GT','BZ','HN','SV','NI','CR','PA','CU','DO','PR','JM','HT','TT','BB',
                  'BR','AR','CL','CO','PE','VE','EC','BO','UY','PY','GY','SR',
                  'SN','NG','GH','CI','ML','BF','GN','TG','BJ','NE','MR','SL','LR','GM','GW','CV',
                  'MA','DZ','TN','LY','EG','SD','ET','KE','TZ','UG','RW','ZA','MZ','AO','ZM','ZW','MW','BI','DJ','SO','ER','MG','MU',
                  'CM','CD','CG','CF','GA','GQ','TD','ST',
                  'TR','LB','JO','PS','IL','IQ','IR','SY','SA','AE','QA','KW','BH','OM','YE',
                  'CN','JP','KR','TW','HK','MO','MN','IN','PK','BD','LK','NP','AF','MV',
                  'TH','VN','ID','PH','MY','SG','MM','KH','LA','BN','TL',
                  'KZ','UZ','TM','KG','TJ','AZ','GE','AM','AU','NZ','FJ','PG','SB','VU','WS','TO']
                update('targetCountries', all)
              }}>🌍 Seleccionar todos os países</button>
              <button style={{ ...s.btnSecondary, fontSize: 12, color: '#ff8a8a' }} onClick={() => update('targetCountries', [])}>× Limpar todos</button>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', alignSelf: 'center' }}>
                {editing.targetCountries.length} países seleccionados
              </span>
            </div>
          </Section>
        )}

        {/* ── 05 Mobilidade ────────────────────────────────────────────────── */}
        {section === 5 && (
          <Section title="05 · Mobilidade e Disponibilidade">
            <Row2>
              <Check label="Pode viajar" checked={editing.canTravel} onChange={v => update('canTravel', v)} />
              <Check label="Tem passaporte UE" checked={editing.hasEUPassport} onChange={v => update('hasEUPassport', v)} />
            </Row2>
            <Row2>
              <F label="País do passaporte" value={editing.passportCountry} onChange={v => update('passportCountry', v)} />
              <F label="Cachê mínimo (€)" value={String(editing.minFee || '')} onChange={v => update('minFee', v ? Number(v) : undefined)} type="number" />
            </Row2>
            <Row2>
              <F label="Disponibilidade / períodos" value={editing.availability} onChange={v => update('availability', v)} placeholder="Out–Dez 2026, disponível para tours..." />
              <F label="Necessidades de visto" value={editing.visaNeeds} onChange={v => update('visaNeeds', v)} placeholder="Precisa de visto para Schengen..." />
            </Row2>
          </Section>
        )}

        {/* ── 06 Materiais ──────────────────────────────────────────────────── */}
        {section === 6 && (
          <Section title="06 · Materiais Disponíveis">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 20 }}>
              {[
                { key: 'bioPT', label: 'Bio PT' }, { key: 'bioEN', label: 'Bio EN' },
                { key: 'bioES', label: 'Bio ES' }, { key: 'bioCA', label: 'Bio CA' },
                { key: 'bioFR', label: 'Bio FR' }, { key: 'pressPhoto', label: '📸 Foto de imprensa' },
                { key: 'videoPresentation', label: '🎬 Vídeo de apresentação' }, { key: 'technicalRider', label: '🎛 Rider técnico' },
                { key: 'pressKit', label: '📁 Dossier de imprensa' }, { key: 'pressClippings', label: '📰 Press clippings' },
              ].map(({ key, label }) => (
                <Check key={key} label={label} checked={!!(editing.materials as any)[key]} onChange={v => updateMat(key, v)} />
              ))}
            </div>
            <label style={s.fieldLabel}>Links de streaming e presença digital</label>
            <Row2>
              <F label="Spotify" value={editing.materials.spotifyLink} onChange={v => updateMat('spotifyLink', v)} placeholder="https://open.spotify.com/..." />
              <F label="Bandcamp" value={editing.materials.bandcampLink} onChange={v => updateMat('bandcampLink', v)} />
            </Row2>
            <Row2>
              <F label="YouTube" value={editing.materials.youtubeLink} onChange={v => updateMat('youtubeLink', v)} />
              <F label="SoundCloud" value={editing.materials.soundcloudLink} onChange={v => updateMat('soundcloudLink', v)} />
            </Row2>
          </Section>
        )}

        {/* ── 07 Projectos ──────────────────────────────────────────────────── */}
        {section === 7 && (
          <Section title="07 · Projectos">
            {editing.projects.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 16 }}>Nenhum projecto ainda.</p>
            )}
            {editing.projects.map((p, i) => (
              <div key={p.id} style={s.projectCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <strong style={{ color: '#60b4e8' }}>Projecto {i + 1}{p.name ? ` — ${p.name}` : ''}</strong>
                  <button style={s.btnDelete} onClick={() => removeProject(p.id)}>apagar</button>
                </div>
                <Row2>
                  <F label="Nome do projecto" value={p.name} onChange={v => updateProject(p.id, 'name', v)} />
                  <F label="Formato" value={p.format} onChange={v => updateProject(p.id, 'format', v)} placeholder="Solo, duo, banda 5 pessoas..." />
                </Row2>
                <Row2>
                  <F label="Duração" value={p.duration} onChange={v => updateProject(p.id, 'duration', v)} placeholder="60 min, 90 min..." />
                  <F label="Idioma da obra" value={p.language} onChange={v => updateProject(p.id, 'language', v)} />
                </Row2>
                <Row2>
                  <F label="Vídeo / Dossier" value={p.videoLink} onChange={v => updateProject(p.id, 'videoLink', v)} />
                  <F label="Cachê mínimo (€)" value={String(p.minFee || '')} onChange={v => updateProject(p.id, 'minFee', v ? Number(v) : undefined)} type="number" />
                </Row2>
                <FArea label="Resumo (para candidaturas)" value={p.summary} onChange={v => updateProject(p.id, 'summary', v)} />
                <FArea label="Necessidades técnicas / Rider" value={p.technicalNeeds} onChange={v => updateProject(p.id, 'technicalNeeds', v)} />
                <Row2>
                  <Check label="Festival/residência cobre custos" checked={p.coversCosts} onChange={v => updateProject(p.id, 'coversCosts', v)} />
                  <Check label="Já fez tournée" checked={p.hasToured} onChange={v => updateProject(p.id, 'hasToured', v)} />
                </Row2>
                {p.hasToured && (
                  <FArea label="Histórico de apresentações" value={p.tourHistory} onChange={v => updateProject(p.id, 'tourHistory', v)} placeholder="Onde já foi apresentado..." />
                )}
              </div>
            ))}
            <button style={s.btnSecondary} onClick={addProject}>+ Adicionar projecto</button>
          </Section>
        )}

        {/* ── 08 CRM Interno ────────────────────────────────────────────────── */}
        {section === 8 && (
          <Section title="08 · CRM Interno SOMA">
            <Row2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={s.fieldLabel}>Estado do contrato</label>
                <select style={s.input} value={editing.internal.contractStatus} onChange={e => updateInternal('contractStatus', e.target.value)}>
                  <option value="sem_contrato">Sem contrato</option>
                  <option value="em_negociacao">Em negociação</option>
                  <option value="activo">Activo</option>
                  <option value="expirado">Expirado</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={s.fieldLabel}>Prioridade</label>
                <select style={s.input} value={editing.internal.priority} onChange={e => updateInternal('priority', e.target.value)}>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>
            </Row2>
            <Row2>
              <F label="Booker responsável na SOMA" value={editing.internal.booker} onChange={v => updateInternal('booker', v)} />
              <F label="Fee SOMA (%)" value={String(editing.internal.somaFeePercent)} onChange={v => updateInternal('somaFeePercent', Number(v))} type="number" />
            </Row2>
            <F label="Último contacto (data)" value={editing.internal.lastContact} onChange={v => updateInternal('lastContact', v)} type="date" />
            <FArea label="Notas internas (não partilhadas com o artista)" value={editing.internal.notes} onChange={v => updateInternal('notes', v)} />
          </Section>
        )}

        {/* ── 09 Cartografia SOMA ───────────────────────────────────────────── */}
        {section === 9 && (
          <Section title="09 · Cartografia SOMA">
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              Metodologia curatorial própria da SOMA. Inspirada em Bourdieu (capital simbólico), Gilroy (rotas/raízes), bell hooks (margem como abertura) e Glissant (opacidade/relação). Preenche progressivamente com o artista.
            </p>

            <CartografiaBlock title="🌱 RAIZ — Identidade Profunda" color="#6ef3a5">
              <FArea label="Origens — território, raízes, diáspora" value={editing.cartografia.origens} onChange={v => updateCartografia('origens', v)} placeholder="De onde vem o artista, que heranças culturais carrega, como a diáspora moldou a obra..." />
              <FArea label="Tensões criativas — contradições produtivas" value={editing.cartografia.tensoes} onChange={v => updateCartografia('tensoes', v)} placeholder="Entre origem e residência, entre línguas, entre circuitos..." />
              <FArea label="Vocabulário próprio — palavras que só este artista usa" value={editing.cartografia.vocabularioProprio} onChange={v => updateCartografia('vocabularioProprio', v)} placeholder="Conceitos, imagens, referências que definem a sua linguagem..." />
            </CartografiaBlock>

            <CartografiaBlock title="🌊 CAMPO — Público e Audiência" color="#60b4e8">
              <FArea label="Perfis de audiência — quem já consome o trabalho" value={editing.cartografia.perfisAudiencia} onChange={v => updateCartografia('perfisAudiencia', v)} placeholder="Não só demografia — por que razão vêm? Por identificação, curiosidade, contexto comunitário..." />
              <FArea label="Motivação de adesão — porquê este artista" value={editing.cartografia.motivacaoAdesao} onChange={v => updateCartografia('motivacaoAdesao', v)} placeholder="O que procuram no trabalho deste artista especificamente..." />
              <FArea label="Territórios do público — onde está a audiência" value={editing.cartografia.territoriosPublico} onChange={v => updateCartografia('territoriosPublico', v)} placeholder="Cidades, países, comunidades onde o trabalho ressoa..." />
            </CartografiaBlock>

            <CartografiaBlock title="🕸 TEIA — Circuito e Legitimação" color="#c084fc">
              <FArea label="Pares — artistas do mesmo campo" value={editing.cartografia.pares} onChange={v => updateCartografia('pares', v)} placeholder="Quem são os pares, referências, artistas com trajectória similar..." />
              <FArea label="Legitimação — quem valida este trabalho" value={editing.cartografia.legitimacao} onChange={v => updateCartografia('legitimacao', v)} placeholder="Festivais, residências, críticos, prémios que já reconheceram o trabalho..." />
              <FArea label="Redes de influência — circuito de difusão" value={editing.cartografia.redesInfluencia} onChange={v => updateCartografia('redesInfluencia', v)} placeholder="Redes, plataformas, espaços onde o trabalho circula ou quer circular..." />
              <FArea label="Tradutores de valor — quem fala do trabalho" value={editing.cartografia.tradutoresValor} onChange={v => updateCartografia('tradutoresValor', v)} placeholder="Jornalistas, curadores, programadores, académicos que mediam o acesso ao campo..." />
            </CartografiaBlock>

            <CartografiaBlock title="🗺 ROTA — Estratégia e Expansão" color="#fb923c">
              <FArea label="Gaps actuais — o que falta" value={editing.cartografia.gaps} onChange={v => updateCartografia('gaps', v)} placeholder="Materiais em falta, territórios não explorados, redes por activar..." />
              <FArea label="Corredores naturais — rotas de circulação" value={editing.cartografia.corredoresNaturais} onChange={v => updateCartografia('corredoresNaturais', v)} placeholder="Sequência lógica de territórios: Barcelona → Lisboa → Berlim → São Paulo..." />
              <FArea label="Plano de expansão — próximos 12–24 meses" value={editing.cartografia.planoExpansao} onChange={v => updateCartografia('planoExpansao', v)} placeholder="Passos concretos, oportunidades prioritárias, acções a tomar..." />
            </CartografiaBlock>

            {/* Botão IA */}
            <div style={{ marginTop: 24, padding: 20, background: 'rgba(110,243,165,0.04)', border: '1px solid rgba(110,243,165,0.15)', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <strong style={{ color: '#6ef3a5', fontSize: 15 }}>✨ Análise estratégica com IA</strong>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: '4px 0 0' }}>
                    A IA analisa o perfil completo + cartografia e devolve posicionamento, território foco, matches prioritários e rota recomendada.
                  </p>
                </div>
                <button style={{ ...s.btnPrimary, background: '#0d7a4e' }} onClick={gerarIA} disabled={iaLoading}>
                  {iaLoading ? '⏳ A analisar...' : '✨ Gerar análise'}
                </button>
              </div>

              {iaResult && (
                <div style={{ background: '#050505', border: '1px solid rgba(110,243,165,0.2)', borderRadius: 8, padding: 16, fontSize: 13, color: '#ddd', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {iaResult}
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Botão guardar sempre visível */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <button style={s.btnSecondary} onClick={() => setSection(Math.max(1, section - 1))} disabled={section === 1}>← Anterior</button>
          <button style={s.btnPrimary} onClick={saveArtist}>💾 Guardar artista</button>
          <button style={s.btnSecondary} onClick={() => setSection(Math.min(9, section + 1))} disabled={section === 9}>Seguinte →</button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ color: '#60b4e8', fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>{title}</h3>
      {children}
    </div>
  )
}

function CartografiaBlock({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28, paddingLeft: 16, borderLeft: `3px solid ${color}20` }}>
      <h4 style={{ color, fontSize: 13, fontWeight: 700, marginBottom: 14 }}>{title}</h4>
      {children}
    </div>
  )
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>{children}</div>
}

function F({ label, value, onChange, type = 'text', placeholder, full }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; placeholder?: string; full?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, gridColumn: full ? '1 / -1' : undefined, marginBottom: full ? 12 : 0 }}>
      <label style={s.fieldLabel}>{label}</label>
      <input style={s.input} type={type} value={value} placeholder={placeholder || label}
        onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function FArea({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
      <label style={s.fieldLabel}>{label}</label>
      <textarea style={s.textarea} value={value} placeholder={placeholder || label}
        onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function FTags({ label, value, onChange }: {
  label: string; value: string[]; onChange: (v: string[]) => void
}) {
  const [input, setInput] = useState('')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
      <label style={s.fieldLabel}>{label}</label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        {value.map(t => (
          <span key={t} style={s.tag}>
            {t}
            <button style={s.tagX} onClick={() => onChange(value.filter(x => x !== t))}>×</button>
          </span>
        ))}
      </div>
      <input style={s.inputSmall} value={input} placeholder="Escreve e prime Enter"
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && input.trim()) {
            onChange([...value, input.trim()])
            setInput('')
          }
        }} />
    </div>
  )
}

function Check({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#ddd', cursor: 'pointer', marginBottom: 8 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ accentColor: '#1A6994', width: 16, height: 16 }} />
      {label}
    </label>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1100, margin: '0 auto', padding: '24px 20px', color: '#fff' },
  listHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  formHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 },
  title: { margin: 0, fontSize: 24, color: '#fff' },
  badge: { fontSize: 13, background: 'rgba(26,105,148,0.25)', color: '#60b4e8', padding: '2px 10px', borderRadius: 10, marginLeft: 8 },
  sub: { margin: '4px 0 0', color: '#bbb', fontSize: 13 },
  listActions: { display: 'flex', gap: 10, alignItems: 'center' },
  search: { padding: '9px 14px', background: '#0a0a0a', color: '#fff', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 13, outline: 'none', width: 220 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 },
  artistCard: { background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 18 },
  artistCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  artistName: { fontSize: 17, fontWeight: 700, color: '#fff' },
  artistMeta: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  artistBio: { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 10 },
  artistStats: { display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  stat: { fontSize: 11, color: '#aaa' },
  artistActions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  sectionNav: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 24, padding: '12px 0', borderBottom: '0.5px solid rgba(255,255,255,0.08)' },
  sectionBtn: { padding: '6px 12px', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontSize: 11, cursor: 'pointer', borderRadius: 6, fontWeight: 400 },
  sectionBtnActive: { background: 'rgba(26,105,148,0.2)', border: '0.5px solid #1A6994', color: '#60b4e8', fontWeight: 700 },
  formBody: { background: '#0a0a0a', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 24 },
  fieldLabel: { fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em', textTransform: 'uppercase' as const },
  input: { background: '#111', color: '#fff', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' as const },
  inputSmall: { background: '#111', color: '#fff', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '7px 10px', fontSize: 12, outline: 'none', width: '100%', boxSizing: 'border-box' as const },
  textarea: { background: '#111', color: '#fff', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: 10, fontSize: 13, outline: 'none', width: '100%', minHeight: 80, resize: 'vertical' as const, boxSizing: 'border-box' as const, fontFamily: 'inherit' },
  pill: { fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' },
  tagBtn: { padding: '6px 12px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', borderRadius: 8 },
  tagBtnActive: { background: 'rgba(26,105,148,0.25)', border: '0.5px solid #1A6994', color: '#60b4e8', fontWeight: 700 },
  tag: { fontSize: 12, padding: '3px 8px', background: 'rgba(26,105,148,0.15)', color: '#60b4e8', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4 },
  tagX: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 },
  countryTag: { fontSize: 12, padding: '4px 10px', background: 'rgba(192,132,252,0.15)', color: '#c084fc', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 },
  regionBtn: { padding: '6px 12px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', fontSize: 12, cursor: 'pointer', borderRadius: 8 },
  projectCard: { background: '#111', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 16, marginBottom: 16 },
  empty: { textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.35)', fontSize: 14 },
  btnPrimary: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer' },
  btnEdit: { background: 'rgba(26,105,148,0.15)', color: '#60b4e8', border: '0.5px solid rgba(26,105,148,0.35)', borderRadius: 7, padding: '7px 14px', fontSize: 12, cursor: 'pointer' },
  btnMatch: { background: 'rgba(110,243,165,0.1)', color: '#6ef3a5', border: '0.5px solid rgba(110,243,165,0.3)', borderRadius: 7, padding: '7px 14px', fontSize: 12, cursor: 'pointer' },
  btnDelete: { background: 'rgba(255,70,70,0.08)', color: '#ff8a8a', border: '0.5px solid rgba(255,70,70,0.25)', borderRadius: 7, padding: '7px 12px', fontSize: 12, cursor: 'pointer' },
}