// src/components/ArtistManager.tsx
// SOMA ODÉ — Gestão de Artistas v2
// Mantém o cadastro completo + adiciona CARTOGRAFIA SOMA + Inteligência Cultural

import React, { useState } from 'react'
import type { Artist, Project, ArtistMaterials, ArtistMobility } from '../types/artist'
import { emptyArtist, materialsCount } from '../types/artist'
import CountryPicker from './CountryPicker'
import { gerarAnaliseCartografia } from '../services/cartografiaAI'

// ─── Tipos CARTOGRAFIA ────────────────────────────────────────────────────────

type CartografiaSoma = {
  raiz: {
    origens: string
    tensoes: string
    vocabulario: string[]
  }
  campo: {
    perfisAudiencia: string
    motivacaoAdesao: string
    territoriosPublico: string[]
  }
  teia: {
    pares: string
    legitimacao: string
    redesInfluencia: string
    tradutoresValor: string
  }
  rota: {
    gaps: string
    corredores: string[]
    planoExpansao: string
  }
  posicionamentoEstrategico: string
}

type ArtistWithCartografia = Artist & {
  cartografia?: CartografiaSoma
}

type ArtistForm = Omit<Artist, 'id'> & {
  cartografia?: CartografiaSoma
}

const emptyCartografia: CartografiaSoma = {
  raiz: {
    origens: '',
    tensoes: '',
    vocabulario: [],
  },
  campo: {
    perfisAudiencia: '',
    motivacaoAdesao: '',
    territoriosPublico: [],
  },
  teia: {
    pares: '',
    legitimacao: '',
    redesInfluencia: '',
    tradutoresValor: '',
  },
  rota: {
    gaps: '',
    corredores: [],
    planoExpansao: '',
  },
  posicionamentoEstrategico: '',
}

function normalizeCartografia(cartografia?: Partial<CartografiaSoma>): CartografiaSoma {
  return {
    ...emptyCartografia,
    ...(cartografia || {}),
    raiz: {
      ...emptyCartografia.raiz,
      ...(cartografia?.raiz || {}),
    },
    campo: {
      ...emptyCartografia.campo,
      ...(cartografia?.campo || {}),
    },
    teia: {
      ...emptyCartografia.teia,
      ...(cartografia?.teia || {}),
    },
    rota: {
      ...emptyCartografia.rota,
      ...(cartografia?.rota || {}),
    },
  }
}

// ─── Estilos base ─────────────────────────────────────────────────────────────

const s = {
  wrap: {
    maxWidth: 860,
    margin: '0 auto',
    padding: '24px 20px',
    color: '#fff',
    background: '#000',
    minHeight: '100vh',
  } as React.CSSProperties,
  title: {
    color: '#1A6994',
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '0.04em',
    marginBottom: 4,
  } as React.CSSProperties,
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    letterSpacing: '0.12em',
    marginBottom: 28,
  } as React.CSSProperties,
  section: {
    marginBottom: 24,
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#1A6994',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottom: '0.5px solid rgba(26,105,148,0.3)',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '10px 12px',
    marginBottom: 10,
    background: '#0a0a0a',
    color: '#fff',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
  } as React.CSSProperties,
  inputHalf: {
    width: '48%',
    padding: '10px 12px',
    background: '#0a0a0a',
    color: '#fff',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
  } as React.CSSProperties,
  select: {
    width: '100%',
    padding: '10px 12px',
    marginBottom: 10,
    background: '#0a0a0a',
    color: '#fff',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
  } as React.CSSProperties,
  row: {
    display: 'flex',
    gap: 10,
    marginBottom: 10,
  } as React.CSSProperties,
  btn: {
    padding: '10px 20px',
    background: '#1A6994',
    border: 'none',
    color: '#fff',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.04em',
  } as React.CSSProperties,
  btnSecondary: {
    padding: '8px 14px',
    background: 'transparent',
    border: '0.5px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.6)',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
  } as React.CSSProperties,
  btnDanger: {
    padding: '6px 12px',
    background: 'transparent',
    border: '0.5px solid rgba(220,60,60,0.4)',
    color: 'rgba(220,80,80,0.8)',
    borderRadius: 6,
    fontSize: 11,
    cursor: 'pointer',
  } as React.CSSProperties,
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 10px',
    background: 'rgba(26,105,148,0.15)',
    border: '0.5px solid rgba(26,105,148,0.3)',
    borderRadius: 20,
    fontSize: 12,
    color: '#60b4e8',
    margin: '0 4px 4px 0',
  } as React.CSSProperties,
  tagRemove: {
    cursor: 'pointer',
    opacity: 0.6,
    fontSize: 14,
    lineHeight: 1,
  } as React.CSSProperties,
  card: {
    border: '0.5px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: '16px 18px',
    marginBottom: 12,
    background: '#050505',
  } as React.CSSProperties,
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  } as React.CSSProperties,
  cardName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
  } as React.CSSProperties,
  cardMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 3,
  } as React.CSSProperties,
  badge: {
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 20,
    fontWeight: 600,
    letterSpacing: '0.05em',
  } as React.CSSProperties,
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    borderBottom: '0.5px solid rgba(255,255,255,0.05)',
    cursor: 'pointer',
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    padding: '10px 12px',
    marginBottom: 10,
    background: '#0a0a0a',
    color: '#fff',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: 70,
    fontFamily: 'inherit',
  } as React.CSSProperties,
  intelligenceBox: {
    border: '0.5px solid rgba(124,58,237,0.45)',
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
    background: 'rgba(124,58,237,0.08)',
  } as React.CSSProperties,
  btnPurple: {
    padding: '10px 18px',
    background: '#7c3aed',
    border: 'none',
    color: '#fff',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.03em',
  } as React.CSSProperties,
}

// ─── Opções dos campos ────────────────────────────────────────────────────────

const DISCIPLINES = [
  { id: 'musica', label: '🎵 Música' },
  { id: 'danca', label: '💃 Dança' },
  { id: 'teatro', label: '🎭 Teatro' },
  { id: 'performance', label: '🔥 Performance' },
  { id: 'artes_visuais', label: '🎨 Artes Visuais' },
  { id: 'cinema', label: '🎬 Cinema' },
  { id: 'instalacao', label: '💡 Instalação' },
  { id: 'som', label: '🎧 Arte Sonora' },
  { id: 'pesquisa', label: '📚 Pesquisa' },
  { id: 'multidisciplinar', label: '✨ Multidisciplinar' },
]

const SPECIALTIES_BY_DISCIPLINE: Record<string, string[]> = {
  musica: ['DJ', 'Cantor/a', 'Instrumentista', 'Compositor/a', 'Produtor/a musical', 'Sound designer', 'Performer', 'Pesquisador/a', 'Música experimental', 'Electrónica'],
  danca: ['Bailarino/a', 'Coreógrafo/a', 'Director/a', 'Professor/a', 'Produtor/a', 'Dança contemporânea', 'Dança urbana', 'Voguing / Ballroom'],
  teatro: ['Actor/Actriz', 'Director/a', 'Dramaturgo/a', 'Produtor/a', 'Teatralidades negras', 'Teatro físico', 'Teatro documentário', 'Teatro comunitário'],
  performance: ['Performance art', 'Performance política', 'Performance sonora', 'Body art', 'Duracional', 'Site-specific', 'Live coding'],
  artes_visuais: ['Pintura', 'Escultura', 'Fotografia', 'Vídeo arte', 'Arte digital', 'Arte urbana', 'Curadoria', 'Instalação'],
  cinema: ['Director/a', 'Roteirista', 'Actor/Actriz', 'Montador/a', 'Director/a de fotografia', 'Produtor/a executivo/a'],
  instalacao: ['Instalação sonora', 'Instalação visual', 'Instalação imersiva', 'Arte contextual'],
  som: ['Sound art', 'Field recording', 'Música concreta', 'Síntese', 'Performance sonora'],
  pesquisa: ['Investigação artística', 'Curadoria crítica', 'Escrita criativa', 'Mediação cultural'],
  multidisciplinar: ['Arte afrodiaspórica', 'Práticas decoloniais', 'Arte queer', 'Arte comunitária', 'Arte activista'],
}

const LANGUAGES = ['PT', 'EN', 'ES', 'CA', 'FR', 'DE', 'IT', 'AR']

// ─── Componente principal ─────────────────────────────────────────────────────

const normalizeArtist = (a: any): ArtistWithCartografia => {
  const base = emptyArtist()

  return {
    ...base,
    ...a,

    id: a.id || crypto.randomUUID(),

    disciplines: Array.isArray(a.disciplines) ? a.disciplines : [],
    specialties: Array.isArray(a.specialties) ? a.specialties : [],
    targetCountries: Array.isArray(a.targetCountries) ? a.targetCountries : [],
    languages: Array.isArray(a.languages) ? a.languages : [],
    keywords: Array.isArray(a.keywords) ? a.keywords : [],
    themes: Array.isArray(a.themes) ? a.themes : [],
    projects: Array.isArray(a.projects) ? a.projects : [],

    materials: {
      ...base.materials,
      ...(a.materials || {}),
    },

    mobility: {
      ...base.mobility,
      ...(a.mobility || {}),
    },

    internal: {
      ...base.internal,
      ...(a.internal || {}),
    },

    cartografia: normalizeCartografia(a.cartografia),
  }
}

const [artists, setArtists] = useState<ArtistWithCartografia[]>(() => {
  const saved = localStorage.getItem('soma-artists-v2')

  if (!saved) return []

  try {
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed.map(normalizeArtist) : []
  } catch {
    return []
  }
})

  try {
    const parsed = JSON.parse(saved)

    return parsed.map((a: any) => ({
      ...emptyArtist(),
      ...a,
      targetCountries: Array.isArray(a.targetCountries) ? a.targetCountries : [],
      disciplines: Array.isArray(a.disciplines) ? a.disciplines : [],
      specialties: Array.isArray(a.specialties) ? a.specialties : [],
      languages: Array.isArray(a.languages) ? a.languages : [],
      keywords: Array.isArray(a.keywords) ? a.keywords : [],
      themes: Array.isArray(a.themes) ? a.themes : [],
      projects: Array.isArray(a.projects) ? a.projects : [],
      materials: {
        ...emptyArtist().materials,
        ...(a.materials || {}),
      },
      mobility: {
        ...emptyArtist().mobility,
        ...(a.mobility || {}),
      },
      internal: {
        ...emptyArtist().internal,
        ...(a.internal || {}),
      },
      cartografia: normalizeCartografia(a.cartografia),
    }))
  } catch {
    return []
  }
})

  const [view, setView] = useState<'list' | 'form'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ArtistForm>({
    ...emptyArtist(),
    cartografia: emptyCartografia,
  })
  const [projectInput, setProjectInput] = useState<Partial<Project>>({})
  const [keywordInput, setKeywordInput] = useState('')
  const [themeInput, setThemeInput] = useState('')
  const [langInput, setLangInput] = useState('')
  const [loadingIA, setLoadingIA] = useState(false)
  const [analiseIA, setAnaliseIA] = useState<any>(null)

  const cartografia = normalizeCartografia(form.cartografia)

  // ── Guardar / actualizar ──────────────────────────────────────────────────

  function save() {
    const now = new Date().toISOString()
    let updated: ArtistWithCartografia[]

    if (editingId) {
      updated = artists.map(a =>
        a.id === editingId ? { ...form, id: editingId, updatedAt: now } as ArtistWithCartografia : a
      )
    } else {
      const newArtist: ArtistWithCartografia = {
        ...form,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      } as ArtistWithCartografia
      updated = [...artists, newArtist]
    }

    setArtists(updated)
    localStorage.setItem('soma-artists-v2', JSON.stringify(updated))
    resetForm()
    setView('list')
  }

  function resetForm() {
    setForm({
      ...emptyArtist(),
      cartografia: emptyCartografia,
    })
    setEditingId(null)
    setProjectInput({})
    setKeywordInput('')
    setThemeInput('')
    setLangInput('')
    setAnaliseIA(null)
  }

  function editArtist(a: ArtistWithCartografia) {
    setForm({
      ...a,
      cartografia: normalizeCartografia(a.cartografia),
    })
    setEditingId(a.id)
    setView('form')
    setAnaliseIA(null)
    window.scrollTo(0, 0)
  }

  function deleteArtist(id: string) {
    if (!confirm('Apagar este artista?')) return
    const updated = artists.filter(a => a.id !== id)
    setArtists(updated)
    localStorage.setItem('soma-artists-v2', JSON.stringify(updated))
  }

  // ── Helpers de campo ──────────────────────────────────────────────────────

  const set = (field: keyof ArtistForm, val: unknown) =>
    setForm(f => ({ ...f, [field]: val }))

  const setMobility = (field: keyof ArtistMobility, val: unknown) =>
    setForm(f => ({ ...f, mobility: { ...f.mobility, [field]: val } }))

  const setMaterial = (field: keyof ArtistMaterials, val: unknown) =>
    setForm(f => ({ ...f, materials: { ...f.materials, [field]: val } }))

  function setCartografia(section: keyof CartografiaSoma, field: string, val: unknown) {
    setForm(f => {
      const current = normalizeCartografia(f.cartografia)

      return {
        ...f,
        cartografia: {
          ...current,
          [section]: {
            ...(current as any)[section],
            [field]: val,
          },
        },
      }
    })
  }

  function setCartografiaArray(section: keyof CartografiaSoma, field: string, val: string) {
    const arr = val
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)

    setCartografia(section, field, arr)
  }

  function setPosicionamentoEstrategico(val: string) {
    setForm(f => ({
      ...f,
      cartografia: {
        ...normalizeCartografia(f.cartografia),
        posicionamentoEstrategico: val,
      },
    }))
  }

  async function handleGerarInteligenciaCultural() {
    try {
      setLoadingIA(true)

      const artistPayload = {
        ...form,
        cartografia: normalizeCartografia(form.cartografia),
      }

      const result = await gerarAnaliseCartografia(artistPayload)

      setAnaliseIA(result)
      setPosicionamentoEstrategico(result?.posicionamento || '')
    } catch (error) {
      console.error('Erro ao gerar inteligência cultural:', error)
      alert('Erro ao gerar estratégia de inteligência cultural.')
    } finally {
      setLoadingIA(false)
    }
  }

  function toggleArray(field: 'disciplines' | 'specialties' | 'targetCountries' | 'languages' | 'keywords' | 'themes', val: string) {
    const arr = (form[field] as string[]) ?? []
    const updated = arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
    set(field, updated)
  }

  function addTag(field: 'keywords' | 'themes' | 'languages', val: string, clear: () => void) {
    if (!val.trim()) return
    const arr = (form[field] as string[]) ?? []
    if (!arr.includes(val.trim())) set(field, [...arr, val.trim()])
    clear()
  }

  function addProject() {
    if (!projectInput.name?.trim()) return
    const newProj: Project = {
      id: crypto.randomUUID(),
      name: projectInput.name ?? '',
      format: projectInput.format ?? '',
      duration: projectInput.duration ?? '',
      coversCosts: projectInput.coversCosts ?? false,
      videoLink: projectInput.videoLink ?? '',
      summary: projectInput.summary ?? '',
      technicalNeeds: projectInput.technicalNeeds ?? '',
    }
    set('projects', [...form.projects, newProj])
    setProjectInput({})
  }

  function removeProject(id: string) {
    set('projects', form.projects.filter(p => p.id !== id))
  }

  // ── Vista lista ───────────────────────────────────────────────────────────

  if (view === 'list') {
    return (
      <div style={s.wrap}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div style={s.title}>SOMA ODÉ</div>
            <div style={s.subtitle}>GESTÃO DE ARTISTAS · {artists.length} no roster</div>
          </div>
          <button style={s.btn} onClick={() => { resetForm(); setView('form') }}>
            + Novo artista
          </button>
        </div>

        {artists.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
            Nenhum artista no roster ainda.<br />Clica em "+ Novo artista" para começar.
          </div>
        )}

        {artists.map(a => {
          const mat = materialsCount(a.materials)
          const matPct = Math.round((mat.done / mat.total) * 100)

          return (
            <div key={a.id} style={s.card}>
              <div style={s.cardHeader}>
                <div>
                  <div style={s.cardName}>{a.name}</div>
                  <div style={s.cardMeta}>
                    {[a.base, a.residenceCountry].filter(Boolean).join(' · ')}
                    {a.disciplines.length > 0 && ' · ' + a.disciplines.join(', ')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
                  <span style={{ ...s.badge, background: a.active ? 'rgba(29,158,117,0.15)' : 'rgba(255,255,255,0.07)', color: a.active ? '#5dcaa5' : 'rgba(255,255,255,0.3)' }}>
                    {a.active ? 'activo' : 'inactivo'}
                  </span>
                  <span style={{ ...s.badge, background: 'rgba(26,105,148,0.12)', color: '#60b4e8' }}>
                    materiais {matPct}%
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 12 }}>
                {a.targetCountries.slice(0, 6).map(c => (
                  <span key={c} style={{ fontSize: 11, padding: '2px 7px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, color: 'rgba(255,255,255,0.5)' }}>{c}</span>
                ))}
                {a.targetCountries.length > 6 && (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>+{a.targetCountries.length - 6}</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                  {a.projects.length} projecto{a.projects.length !== 1 ? 's' : ''}
                  {a.email && ' · ' + a.email}
                  {a.driveLink && (
                    <a href={a.driveLink} target="_blank" rel="noopener noreferrer"
                      style={{ marginLeft: 10, color: '#1A6994', textDecoration: 'none' }}>
                      📁 Drive
                    </a>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={s.btnSecondary} onClick={() => editArtist(a)}>editar</button>
                  <button style={s.btnDanger} onClick={() => deleteArtist(a.id)}>apagar</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Vista formulário ──────────────────────────────────────────────────────

  const activeSpecialties = form.disciplines.flatMap(d => SPECIALTIES_BY_DISCIPLINE[d] ?? [])

  return (
    <div style={s.wrap}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={s.title}>{editingId ? 'EDITAR ARTISTA' : 'NOVO ARTISTA'}</div>
          <div style={s.subtitle}>SOMA ODÉ · PERFIL CURATORIAL COMPLETO</div>
        </div>
        <button style={s.btnSecondary} onClick={() => { resetForm(); setView('list') }}>← voltar</button>
      </div>

      {/* ── 1. DADOS DE CONTACTO ── */}
      <div style={s.section}>
        <div style={s.sectionTitle}>01 · Identidade e contacto</div>
        <div style={s.row}>
          <input style={{ ...s.inputHalf }} placeholder="Nome artístico *" value={form.name} onChange={e => set('name', e.target.value)} />
          <input style={{ ...s.inputHalf }} placeholder="Nome legal (opcional)" value={form.legalName ?? ''} onChange={e => set('legalName', e.target.value)} />
        </div>
        <div style={s.row}>
          <input style={{ ...s.inputHalf }} placeholder="Pronomes (ele/ela/elu)" value={form.pronouns ?? ''} onChange={e => set('pronouns', e.target.value)} />
          <input style={{ ...s.inputHalf }} placeholder="Email *" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div style={s.row}>
          <input style={{ ...s.inputHalf }} placeholder="Telefone com DDI (+34...)" value={form.phone} onChange={e => set('phone', e.target.value)} />
          <input style={{ ...s.inputHalf }} placeholder="Instagram" value={form.instagram} onChange={e => set('instagram', e.target.value)} />
        </div>
        <div style={s.row}>
          <input style={{ ...s.inputHalf }} placeholder="Website" value={form.website ?? ''} onChange={e => set('website', e.target.value)} />
          <input style={{ ...s.inputHalf }} placeholder="Vídeo / Vimeo / YouTube" value={form.videoLink ?? ''} onChange={e => set('videoLink', e.target.value)} />
        </div>
        <input style={s.input} placeholder="Pasta Google Drive (link)" value={form.driveLink ?? ''} onChange={e => set('driveLink', e.target.value)} />
      </div>

      {/* ── 2. LOCALIZAÇÃO ── */}
      <div style={s.section}>
        <div style={s.sectionTitle}>02 · Localização e raízes</div>
        <div style={s.row}>
          <input style={{ ...s.inputHalf }} placeholder="País de origem (ex: BR)" value={form.origin} onChange={e => set('origin', e.target.value)} />
          <input style={{ ...s.inputHalf }} placeholder="Cidade de origem" value={form.originCity ?? ''} onChange={e => set('originCity', e.target.value)} />
        </div>
        <div style={s.row}>
          <input style={{ ...s.inputHalf }} placeholder="Cidade base actual" value={form.base} onChange={e => set('base', e.target.value)} />
          <input style={{ ...s.inputHalf }} placeholder="País de residência (ex: ES)" value={form.residenceCountry} onChange={e => set('residenceCountry', e.target.value)} />
        </div>
      </div>

      {/* ── 3. PERFIL ARTÍSTICO ── */}
      <div style={s.section}>
        <div style={s.sectionTitle}>03 · Perfil artístico</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Disciplinas principais (selecciona todas que se aplicam)</div>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 16 }}>
          {DISCIPLINES.map(d => (
            <button key={d.id} onClick={() => toggleArray('disciplines', d.id)}
              style={{ padding: '6px 14px', borderRadius: 20, border: '0.5px solid', fontSize: 12, cursor: 'pointer',
                background: form.disciplines.includes(d.id) ? 'rgba(26,105,148,0.25)' : 'transparent',
                borderColor: form.disciplines.includes(d.id) ? '#1A6994' : 'rgba(255,255,255,0.15)',
                color: form.disciplines.includes(d.id) ? '#60b4e8' : 'rgba(255,255,255,0.5)',
              }}>
              {d.label}
            </button>
          ))}
        </div>

        {activeSpecialties.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Especialidades</div>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 16 }}>
              {activeSpecialties.map(sp => (
                <button key={sp} onClick={() => toggleArray('specialties', sp)}
                  style={{ padding: '4px 12px', borderRadius: 20, border: '0.5px solid', fontSize: 11, cursor: 'pointer',
                    background: form.specialties.includes(sp) ? 'rgba(26,105,148,0.2)' : 'transparent',
                    borderColor: form.specialties.includes(sp) ? 'rgba(26,105,148,0.6)' : 'rgba(255,255,255,0.1)',
                    color: form.specialties.includes(sp) ? '#60b4e8' : 'rgba(255,255,255,0.4)',
                  }}>
                  {sp}
                </button>
              ))}
            </div>
          </>
        )}

        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Idiomas</div>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 12 }}>
          {LANGUAGES.map(l => (
            <button key={l} onClick={() => toggleArray('languages', l)}
              style={{ padding: '4px 12px', borderRadius: 20, border: '0.5px solid', fontSize: 12, cursor: 'pointer',
                background: (form.languages ?? []).includes(l) ? 'rgba(26,105,148,0.2)' : 'transparent',
                borderColor: (form.languages ?? []).includes(l) ? 'rgba(26,105,148,0.6)' : 'rgba(255,255,255,0.1)',
                color: (form.languages ?? []).includes(l) ? '#60b4e8' : 'rgba(255,255,255,0.4)',
              }}>
              {l}
            </button>
          ))}
        </div>

        <textarea style={s.textarea} placeholder="Bio curta (PT) — até 3 linhas" value={form.bio ?? ''} onChange={e => set('bio', e.target.value)} />

        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Keywords temáticas</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input style={{ ...s.input, marginBottom: 0, flex: 1 }} placeholder="ex: diáspora, corpo, memória, ritual" value={keywordInput} onChange={e => setKeywordInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { addTag('keywords', keywordInput, () => setKeywordInput('')) } }} />
          <button style={s.btnSecondary} onClick={() => addTag('keywords', keywordInput, () => setKeywordInput(''))}>+</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          {(form.keywords ?? []).map(k => (
            <span key={k} style={s.tag}>{k}<span style={s.tagRemove} onClick={() => set('keywords', (form.keywords ?? []).filter(x => x !== k))}>×</span></span>
          ))}
        </div>
      </div>

      {/* ── 4. PAÍSES DE INTERESSE ── */}
      <div style={s.section}>
        <div style={s.sectionTitle}>04 · Países e territórios de interesse</div>
        <CountryPicker
          selected={form.targetCountries}
          onChange={codes => set('targetCountries', codes)}
          label="Países prioritários para circulação — pesquisa por nome ou código ISO (ex: BR, ES, DE)"
        />
      </div>

      {/* ── 5. MOBILIDADE ── */}
      <div style={s.section}>
        <div style={s.sectionTitle}>05 · Mobilidade</div>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 16, marginBottom: 14 }}>
          {[
            { field: 'canTravel' as keyof ArtistMobility, label: 'Pode viajar' },
            { field: 'hasEUPassport' as keyof ArtistMobility, label: 'Passaporte UE' },
            { field: 'hasEUBankAccount' as keyof ArtistMobility, label: 'Conta bancária EU' },
            { field: 'hasBRBankAccount' as keyof ArtistMobility, label: 'Conta bancária BR' },
          ].map(({ field, label }) => (
            <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
              <input type="checkbox" checked={!!form.mobility[field]} onChange={e => setMobility(field, e.target.checked)} />
              {label}
            </label>
          ))}
        </div>
        <div style={s.row}>
          <input style={{ ...s.inputHalf }} placeholder="País do passaporte (ex: BR)" value={form.mobility.passportCountry ?? ''} onChange={e => setMobility('passportCountry', e.target.value)} />
          <input style={{ ...s.inputHalf }} placeholder="Notas sobre vistos" value={form.mobility.visaNotes ?? ''} onChange={e => setMobility('visaNotes', e.target.value)} />
        </div>
        <div style={s.row}>
          <input style={{ ...s.inputHalf }} placeholder="Cachê mínimo (€)" type="number" value={form.minFee ?? ''} onChange={e => set('minFee', Number(e.target.value))} />
          <input style={{ ...s.inputHalf }} placeholder="Disponibilidade (ex: Maio–Setembro)" value={form.availability ?? ''} onChange={e => set('availability', e.target.value)} />
        </div>
      </div>

      {/* ── 6. MATERIAIS ── */}
      <div style={s.section}>
        <div style={s.sectionTitle}>06 · Materiais disponíveis</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          {[
            { field: 'bioPT' as keyof ArtistMaterials, label: 'Bio PT' },
            { field: 'bioEN' as keyof ArtistMaterials, label: 'Bio EN' },
            { field: 'bioES' as keyof ArtistMaterials, label: 'Bio ES' },
            { field: 'bioCA' as keyof ArtistMaterials, label: 'Bio CA' },
            { field: 'pressPhoto' as keyof ArtistMaterials, label: 'Foto de imprensa (HD)' },
            { field: 'videoPresentation' as keyof ArtistMaterials, label: 'Vídeo de apresentação' },
            { field: 'technicalRider' as keyof ArtistMaterials, label: 'Rider técnico' },
            { field: 'pressKit' as keyof ArtistMaterials, label: 'Dossier de imprensa' },
            { field: 'pressClippings' as keyof ArtistMaterials, label: 'Press clippings' },
          ].map(({ field, label }) => (
            <label key={field} style={s.checkRow}>
              <input type="checkbox" checked={!!form.materials[field]} onChange={e => setMaterial(field, e.target.checked)} />
              <span style={{ color: form.materials[field] ? '#5dcaa5' : 'rgba(255,255,255,0.5)' }}>
                {form.materials[field] ? '✓' : '○'} {label}
              </span>
            </label>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={s.row}>
            <input style={{ ...s.inputHalf }} placeholder="Spotify link" value={form.materials.spotifyLink ?? ''} onChange={e => setMaterial('spotifyLink', e.target.value)} />
            <input style={{ ...s.inputHalf }} placeholder="Bandcamp link" value={form.materials.bandcampLink ?? ''} onChange={e => setMaterial('bandcampLink', e.target.value)} />
          </div>
          <div style={s.row}>
            <input style={{ ...s.inputHalf }} placeholder="YouTube link" value={form.materials.youtubeLink ?? ''} onChange={e => setMaterial('youtubeLink', e.target.value)} />
            <input style={{ ...s.inputHalf }} placeholder="TikTok @handle" value={form.materials.tiktokHandle ?? ''} onChange={e => setMaterial('tiktokHandle', e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── 7. PROJECTOS ── */}
      <div style={s.section}>
        <div style={s.sectionTitle}>07 · Projectos</div>

        {form.projects.map(p => (
          <div key={p.id} style={{ ...s.card, borderColor: 'rgba(26,105,148,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
                  {[p.format, p.duration].filter(Boolean).join(' · ')}
                  {p.coversCosts && ' · custos cobertos'}
                </div>
                {p.summary && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{p.summary}</div>}
              </div>
              <button style={s.btnDanger} onClick={() => removeProject(p.id)}>×</button>
            </div>
          </div>
        ))}

        <div style={{ ...s.card, borderStyle: 'dashed' }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>+ Novo projecto</div>
          <div style={s.row}>
            <input style={{ ...s.inputHalf, marginBottom: 0 }} placeholder="Nome do projecto *" value={projectInput.name ?? ''} onChange={e => setProjectInput(p => ({ ...p, name: e.target.value }))} />
            <input style={{ ...s.inputHalf, marginBottom: 0 }} placeholder="Formato (Solo, Duo, Live AV...)" value={projectInput.format ?? ''} onChange={e => setProjectInput(p => ({ ...p, format: e.target.value }))} />
          </div>
          <div style={{ ...s.row, marginTop: 8 }}>
            <input style={{ ...s.inputHalf, marginBottom: 0 }} placeholder="Duração (ex: 60min)" value={projectInput.duration ?? ''} onChange={e => setProjectInput(p => ({ ...p, duration: e.target.value }))} />
            <input style={{ ...s.inputHalf, marginBottom: 0 }} placeholder="Vídeo / dossier link" value={projectInput.videoLink ?? ''} onChange={e => setProjectInput(p => ({ ...p, videoLink: e.target.value }))} />
          </div>
          <textarea style={{ ...s.textarea, marginTop: 8 }} placeholder="Resumo curto (para candidaturas)" value={projectInput.summary ?? ''} onChange={e => setProjectInput(p => ({ ...p, summary: e.target.value }))} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', marginBottom: 10 }}>
            <input type="checkbox" checked={projectInput.coversCosts ?? false} onChange={e => setProjectInput(p => ({ ...p, coversCosts: e.target.checked }))} />
            Festival / residência cobre custos de produção e viagem
          </label>
          <button style={s.btnSecondary} onClick={addProject}>+ Adicionar projecto</button>
        </div>
      </div>

      {/* ── 8. CRM INTERNO ── */}
      <div style={s.section}>
        <div style={s.sectionTitle}>08 · CRM interno SOMA</div>
        <div style={s.row}>
          <select style={{ ...s.select, width: '48%', marginBottom: 0 }} value={form.internal.contractStatus} onChange={e => setForm(f => ({ ...f, internal: { ...f.internal, contractStatus: e.target.value as Artist['internal']['contractStatus'] } }))}>
            <option value="sem_contrato">Sem contrato</option>
            <option value="em_negociacao">Em negociação</option>
            <option value="activo">Contrato activo</option>
            <option value="expirado">Expirado</option>
          </select>
          <select style={{ ...s.select, width: '48%', marginBottom: 0 }} value={form.internal.priority} onChange={e => setForm(f => ({ ...f, internal: { ...f.internal, priority: e.target.value as Artist['internal']['priority'] } }))}>
            <option value="baixa">Prioridade baixa</option>
            <option value="media">Prioridade média</option>
            <option value="alta">Prioridade alta</option>
          </select>
        </div>
        <div style={{ ...s.row, marginTop: 10 }}>
          <input style={{ ...s.inputHalf }} placeholder="Booker responsável na SOMA" value={form.internal.booker ?? ''} onChange={e => setForm(f => ({ ...f, internal: { ...f.internal, booker: e.target.value } }))} />
          <input style={{ ...s.inputHalf }} placeholder="Contrato (link Drive)" value={form.internal.contractFile ?? ''} onChange={e => setForm(f => ({ ...f, internal: { ...f.internal, contractFile: e.target.value } }))} />
        </div>
        <textarea style={s.textarea} placeholder="Notas internas (só visível para a SOMA)" value={form.internal.notes ?? ''} onChange={e => setForm(f => ({ ...f, internal: { ...f.internal, notes: e.target.value } }))} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />
          Artista activo no roster
        </label>
      </div>

      {/* ── 9. CARTOGRAFIA SOMA ── */}
      <div style={s.section}>
        <div style={s.sectionTitle}>09 · CARTOGRAFIA SOMA</div>

        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
          Camada de inteligência cultural que lê todos os dados anteriores do artista e ajuda a definir posicionamento, rota e decisões de circulação.
        </div>

        <div style={s.card}>
          <div style={{ color: '#60b4e8', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
            RAIZ · identidade artística profunda
          </div>
          <textarea style={s.textarea} placeholder="Origens — território, ancestralidade, deslocamento, matriz cultural" value={cartografia.raiz.origens} onChange={e => setCartografia('raiz', 'origens', e.target.value)} />
          <textarea style={s.textarea} placeholder="Tensões — contradições criativas, conflitos produtivos, fronteiras do trabalho" value={cartografia.raiz.tensoes} onChange={e => setCartografia('raiz', 'tensoes', e.target.value)} />
          <input style={s.input} placeholder="Vocabulário próprio — separar por vírgula" value={cartografia.raiz.vocabulario.join(', ')} onChange={e => setCartografiaArray('raiz', 'vocabulario', e.target.value)} />
        </div>

        <div style={s.card}>
          <div style={{ color: '#60b4e8', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
            CAMPO · público e recepção
          </div>
          <textarea style={s.textarea} placeholder="Perfis de audiência — quem já consome, assiste ou acompanha" value={cartografia.campo.perfisAudiencia} onChange={e => setCartografia('campo', 'perfisAudiencia', e.target.value)} />
          <textarea style={s.textarea} placeholder="Motivação de adesão — por que esse público se conecta com o trabalho" value={cartografia.campo.motivacaoAdesao} onChange={e => setCartografia('campo', 'motivacaoAdesao', e.target.value)} />
          <input style={s.input} placeholder="Territórios do público — separar por vírgula" value={cartografia.campo.territoriosPublico.join(', ')} onChange={e => setCartografiaArray('campo', 'territoriosPublico', e.target.value)} />
        </div>

        <div style={s.card}>
          <div style={{ color: '#60b4e8', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
            TEIA · circuito, pares e legitimação
          </div>
          <textarea style={s.textarea} placeholder="Pares — artistas, coletivos, cenas próximas" value={cartografia.teia.pares} onChange={e => setCartografia('teia', 'pares', e.target.value)} />
          <textarea style={s.textarea} placeholder="Legitimação — festivais, espaços, prêmios, residências, curadorias que validam este percurso" value={cartografia.teia.legitimacao} onChange={e => setCartografia('teia', 'legitimacao', e.target.value)} />
          <textarea style={s.textarea} placeholder="Redes de influência — quem programa quem, quem abre portas, quais circuitos importam" value={cartografia.teia.redesInfluencia} onChange={e => setCartografia('teia', 'redesInfluencia', e.target.value)} />
          <textarea style={s.textarea} placeholder="Quem traduz valor — curadores, jornalistas, programadores, instituições que sabem explicar este trabalho" value={cartografia.teia.tradutoresValor} onChange={e => setCartografia('teia', 'tradutoresValor', e.target.value)} />
        </div>

        <div style={s.card}>
          <div style={{ color: '#60b4e8', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
            ROTA · expansão e próximos territórios
          </div>
          <textarea style={s.textarea} placeholder="Gaps — o que falta para circular melhor: material, rede, idioma, validação, técnica, produção" value={cartografia.rota.gaps} onChange={e => setCartografia('rota', 'gaps', e.target.value)} />
          <input style={s.input} placeholder="Corredores naturais — separar por vírgula. Ex: Barcelona, Lisboa, Berlin, Salvador" value={cartografia.rota.corredores.join(', ')} onChange={e => setCartografiaArray('rota', 'corredores', e.target.value)} />
          <textarea style={s.textarea} placeholder="Plano de expansão — próximos passos, mercados, festivais ou instituições-alvo" value={cartografia.rota.planoExpansao} onChange={e => setCartografia('rota', 'planoExpansao', e.target.value)} />
        </div>

        <div style={s.intelligenceBox}>
          <div style={{ color: '#c4b5fd', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
            POSICIONAMENTO ESTRATÉGICO SOMA
          </div>

          <textarea
            style={s.textarea}
            placeholder="Síntese estratégica gerada pela SOMA ou pela inteligência cultural"
            value={cartografia.posicionamentoEstrategico}
            onChange={e => setPosicionamentoEstrategico(e.target.value)}
          />

          <button
            style={{
              ...s.btnPurple,
              opacity: loadingIA ? 0.6 : 1,
              cursor: loadingIA ? 'not-allowed' : 'pointer',
            }}
            disabled={loadingIA}
            onClick={handleGerarInteligenciaCultural}
          >
            {loadingIA ? 'A gerar inteligência cultural...' : 'Gerar estratégia de inteligência cultural'}
          </button>

          {analiseIA && (
            <div style={{ marginTop: 16, padding: 14, borderRadius: 8, background: 'rgba(0,0,0,0.35)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontWeight: 700, color: '#c4b5fd', marginBottom: 8 }}>Inteligência cultural</div>

              {analiseIA.posicionamento && (
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
                  <strong>Posicionamento:</strong> {analiseIA.posicionamento}
                </p>
              )}

              {analiseIA.territorioFoco?.local && (
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>
                  <strong>Território foco:</strong> {analiseIA.territorioFoco.local}
                  {analiseIA.territorioFoco.justificativa ? ` — ${analiseIA.territorioFoco.justificativa}` : ''}
                </p>
              )}

              {analiseIA.matchesPrioritarios?.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 700, marginTop: 12 }}>Matches prioritários</div>
                  <ul style={{ marginTop: 6 }}>
                    {analiseIA.matchesPrioritarios.map((m: any, i: number) => (
                      <li key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                        <strong>{m.tipo}</strong> — {m.justificativa}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {analiseIA.rotaEstrategica?.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 700, marginTop: 12 }}>Rota estratégica</div>
                  <ul style={{ marginTop: 6 }}>
                    {analiseIA.rotaEstrategica.map((r: any, i: number) => (
                      <li key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                        <strong>{r.passo}</strong>: {r.acao} {r.motivo ? `— ${r.motivo}` : ''}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {analiseIA.alertas?.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: '#fca5a5', fontWeight: 700, marginTop: 12 }}>Alertas</div>
                  <ul style={{ marginTop: 6 }}>
                    {analiseIA.alertas.map((a: any, i: number) => (
                      <li key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                        <strong>{a.contexto}</strong> — {a.motivo}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── GUARDAR ── */}
      <div style={{ paddingTop: 16, borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', gap: 12 }}>
        <button style={{ ...s.btn, flex: 1 }} onClick={save}>
          {editingId ? '✓ Guardar alterações' : '+ Guardar artista'}
        </button>
        <button style={s.btnSecondary} onClick={() => { resetForm(); setView('list') }}>cancelar</button>
      </div>
    </div>
  )
}