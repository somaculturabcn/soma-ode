// src/components/ArtistManager.tsx
// SOMA ODÉ — Artist Manager v3.1
// Cadastro + edição + Google Drive + auto materiais
// Mantém localStorage em soma-artists-v2

import { useEffect, useState } from 'react'
import type { Artist, ArtistDrive, ArtistMaterials, ArtistMobility, Project } from '../types/artist'
import { materialsCount } from '../types/artist'

const STORAGE_KEY = 'soma-artists-v2'

function getStored(): Artist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.map(normalizeArtist) : []
  } catch {
    return []
  }
}

function saveStored(data: Artist[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function newProject(): Project {
  return {
    id: crypto.randomUUID(),
    name: '',
    format: '',
    duration: '',
    coversCosts: false,
    videoLink: '',
    summary: '',
    technicalNeeds: '',
  }
}

function emptyArtist(): Artist {
  return {
    id: crypto.randomUUID(),
    name: '',
    artisticName: '',
    legalName: '',
    pronouns: '',
    email: '',
    phone: '',
    instagram: '',
    website: '',
    videoLink: '',
    driveLink: '',

    origin: '',
    originCity: '',
    base: '',
    residenceCountry: '',
    targetCountries: [],

    disciplines: [],
    specialties: [],
    languages: [],
    keywords: [],
    themes: [],
    genres: [],
    bio: '',

    materials: {},
    drive: {},
    mobility: {
      canTravel: true,
      hasEUPassport: false,
      hasEUBankAccount: false,
      hasBRBankAccount: false,
      passportCountry: '',
      visaNotes: '',
    },
    projects: [],

    minFee: 0,
    availability: '',
    active: true,

    cartografia: {},
    internal: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function normalizeArtist(a: any): Artist {
  const base = emptyArtist()

  return {
    ...base,
    ...a,
    id: a?.id || crypto.randomUUID(),
    name: a?.name || '',
    targetCountries: Array.isArray(a?.targetCountries) ? a.targetCountries : [],
    disciplines: Array.isArray(a?.disciplines) ? a.disciplines : [],
    specialties: Array.isArray(a?.specialties) ? a.specialties : [],
    languages: Array.isArray(a?.languages) ? a.languages : [],
    keywords: Array.isArray(a?.keywords) ? a.keywords : [],
    themes: Array.isArray(a?.themes) ? a.themes : [],
    genres: Array.isArray(a?.genres) ? a.genres : [],
    projects: Array.isArray(a?.projects) ? a.projects : [],
    materials: {
      ...base.materials,
      ...(a?.materials || {}),
    },
    drive: {
      ...base.drive,
      ...(a?.drive || {}),
    },
    mobility: {
      ...base.mobility,
      ...(a?.mobility || {}),
    },
    active: a?.active !== false,
  }
}

function autoMaterialsFromDrive(artist: Artist): ArtistMaterials {
  return {
    ...artist.materials,
    pressPhoto: Boolean(artist.materials?.pressPhoto || artist.drive?.photosUrl),
    videoPresentation: Boolean(artist.materials?.videoPresentation || artist.drive?.videosUrl),
    technicalRider: Boolean(artist.materials?.technicalRider || artist.drive?.riderUrl),
    pressKit: Boolean(artist.materials?.pressKit || artist.drive?.dossierUrl),
    pressClippings: Boolean(artist.materials?.pressClippings || artist.drive?.pressUrl),
  }
}

function splitTags(value: string): string[] {
  return value
    .split(',')
    .map(x => x.trim())
    .filter(Boolean)
}

function joinTags(value?: string[]) {
  return Array.isArray(value) ? value.join(', ') : ''
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0a0a0a',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 13,
  boxSizing: 'border-box',
  outline: 'none',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 90,
  resize: 'vertical',
  fontFamily: 'inherit',
}

const sectionStyle: React.CSSProperties = {
  background: '#050505',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: 18,
  marginBottom: 18,
}

const sectionTitleStyle: React.CSSProperties = {
  color: '#60b4e8',
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 14,
}

const btnPrimary: React.CSSProperties = {
  background: '#1A6994',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 12,
  cursor: 'pointer',
}

const btnDanger: React.CSSProperties = {
  background: 'rgba(255,70,70,0.12)',
  color: '#ff8a8a',
  border: '1px solid rgba(255,70,70,0.25)',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 12,
  cursor: 'pointer',
}

export default function ArtistManager() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [editing, setEditing] = useState<Artist | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setArtists(getStored())
  }, [])

  const filtered = artists.filter(a => {
    const q = search.toLowerCase().trim()
    if (!q) return true

    return [
      a.name,
      a.artisticName,
      a.email,
      a.base,
      a.residenceCountry,
      ...(a.disciplines || []),
      ...(a.keywords || []),
    ]
      .join(' ')
      .toLowerCase()
      .includes(q)
  })

  function saveArtist(artist: Artist) {
    if (!artist.name.trim()) {
      alert('O artista precisa de nome.')
      return
    }

    const updated: Artist = {
      ...artist,
      materials: autoMaterialsFromDrive(artist),
      updatedAt: new Date().toISOString(),
    }

    const exists = artists.some(a => a.id === updated.id)

    const next = exists
      ? artists.map(a => (a.id === updated.id ? updated : a))
      : [...artists, { ...updated, createdAt: new Date().toISOString() }]

    setArtists(next)
    saveStored(next)
    setEditing(null)
  }

  function removeArtist(id: string) {
    if (!confirm('Apagar artista?')) return

    const next = artists.filter(a => a.id !== id)
    setArtists(next)
    saveStored(next)
    setEditing(null)
  }

  function setField<K extends keyof Artist>(field: K, value: Artist[K]) {
    if (!editing) return
    setEditing({ ...editing, [field]: value })
  }

  function setDrive(field: keyof ArtistDrive, value: string) {
    if (!editing) return
    setEditing({
      ...editing,
      drive: {
        ...(editing.drive || {}),
        [field]: value,
      },
    })
  }

  function setMaterial(field: keyof ArtistMaterials, value: boolean) {
    if (!editing) return
    setEditing({
      ...editing,
      materials: {
        ...(editing.materials || {}),
        [field]: value,
      },
    })
  }

  function setMobility(field: keyof ArtistMobility, value: any) {
    if (!editing) return
    setEditing({
      ...editing,
      mobility: {
        ...(editing.mobility || {}),
        [field]: value,
      },
    })
  }

  function updateProject(index: number, field: keyof Project, value: any) {
    if (!editing) return

    const projects = [...(editing.projects || [])]
    projects[index] = {
      ...projects[index],
      [field]: value,
    }

    setEditing({
      ...editing,
      projects,
    })
  }

  function addProject() {
    if (!editing) return
    setEditing({
      ...editing,
      projects: [...(editing.projects || []), newProject()],
    })
  }

  function removeProject(index: number) {
    if (!editing) return
    setEditing({
      ...editing,
      projects: editing.projects.filter((_, i) => i !== index),
    })
  }

  return (
    <div style={{ maxWidth: 1050, margin: '0 auto', padding: 20, color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26 }}>Artistas</h2>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
            {artists.length} artista{artists.length !== 1 ? 's' : ''} no roster
          </p>
        </div>

        <button style={btnPrimary} onClick={() => setEditing(emptyArtist())}>
          + Novo artista
        </button>
      </div>

      <input
        style={{ ...inputStyle, marginBottom: 18 }}
        placeholder="Pesquisar artista, cidade, disciplina, keyword..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {filtered.length === 0 && (
        <div style={{ color: 'rgba(255,255,255,0.35)', padding: 40, textAlign: 'center' }}>
          Nenhum artista encontrado.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {filtered.map(a => {
          const mat = materialsCount(a.materials)
          const pct = mat.total ? Math.round((mat.done / mat.total) * 100) : 0

          return (
            <div key={a.id} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{a.name || 'Artista sem nome'}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
                    {[a.base, a.residenceCountry].filter(Boolean).join(' · ')}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 20,
                    background: a.active ? 'rgba(110,243,165,0.12)' : 'rgba(255,255,255,0.06)',
                    color: a.active ? '#6ef3a5' : 'rgba(255,255,255,0.35)',
                    height: 'fit-content',
                  }}
                >
                  {a.active ? 'ativo' : 'inativo'}
                </span>
              </div>

              <div style={{ marginTop: 8, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {(a.disciplines || []).slice(0, 5).map(d => (
                  <span key={d} style={{ fontSize: 11, background: 'rgba(26,105,148,0.22)', color: '#60b4e8', padding: '2px 8px', borderRadius: 20 }}>
                    {d}
                  </span>
                ))}
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                Materiais: {pct}%
              </div>

              {a.drive?.folderUrl && (
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  🔗{' '}
                  <a href={a.drive.folderUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#7ab6ff' }}>
                    Pasta Google Drive
                  </a>
                </div>
              )}

              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <button style={btnSecondary} onClick={() => setEditing(normalizeArtist(a))}>
                  Editar
                </button>
                <button style={btnDanger} onClick={() => removeArtist(a.id)}>
                  Apagar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {editing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.82)',
            zIndex: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            style={{
              width: 'min(920px, 100%)',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#000',
              border: '1px solid #1A6994',
              borderRadius: 16,
              padding: 22,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 24 }}>
                  {artists.some(a => a.id === editing.id) ? 'Editar artista' : 'Novo artista'}
                </h3>
                <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  Perfil completo + Google Drive + materiais
                </p>
              </div>

              <button style={btnSecondary} onClick={() => setEditing(null)}>
                Fechar
              </button>
            </div>

            <section style={sectionStyle}>
              <div style={sectionTitleStyle}>01 · Identidade</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input style={inputStyle} placeholder="Nome artístico *" value={editing.name} onChange={e => setField('name', e.target.value)} />
                <input style={inputStyle} placeholder="Nome legal" value={editing.legalName || ''} onChange={e => setField('legalName', e.target.value)} />
                <input style={inputStyle} placeholder="Pronomes" value={editing.pronouns || ''} onChange={e => setField('pronouns', e.target.value)} />
                <input style={inputStyle} placeholder="Email" value={editing.email || ''} onChange={e => setField('email', e.target.value)} />
                <input style={inputStyle} placeholder="Telefone" value={editing.phone || ''} onChange={e => setField('phone', e.target.value)} />
                <input style={inputStyle} placeholder="Instagram" value={editing.instagram || ''} onChange={e => setField('instagram', e.target.value)} />
                <input style={inputStyle} placeholder="Website" value={editing.website || ''} onChange={e => setField('website', e.target.value)} />
                <input style={inputStyle} placeholder="Vídeo / YouTube / Vimeo" value={editing.videoLink || ''} onChange={e => setField('videoLink', e.target.value)} />
              </div>
            </section>

            <section style={sectionStyle}>
              <div style={sectionTitleStyle}>02 · Localização</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input style={inputStyle} placeholder="País de origem" value={editing.origin || ''} onChange={e => setField('origin', e.target.value)} />
                <input style={inputStyle} placeholder="Cidade de origem" value={editing.originCity || ''} onChange={e => setField('originCity', e.target.value)} />
                <input style={inputStyle} placeholder="Cidade base" value={editing.base || ''} onChange={e => setField('base', e.target.value)} />
                <input style={inputStyle} placeholder="País de residência" value={editing.residenceCountry || ''} onChange={e => setField('residenceCountry', e.target.value)} />
              </div>

              <input
                style={{ ...inputStyle, marginTop: 10 }}
                placeholder="Países alvo separados por vírgula. Ex: ES, PT, BR, DE"
                value={joinTags(editing.targetCountries)}
                onChange={e => setField('targetCountries', splitTags(e.target.value))}
              />
            </section>

            <section style={sectionStyle}>
              <div style={sectionTitleStyle}>03 · Perfil artístico</div>

              <input
                style={inputStyle}
                placeholder="Disciplinas separadas por vírgula. Ex: musica, performance"
                value={joinTags(editing.disciplines)}
                onChange={e => setField('disciplines', splitTags(e.target.value))}
              />

              <input
                style={{ ...inputStyle, marginTop: 10 }}
                placeholder="Especialidades separadas por vírgula. Ex: DJ, cantora, performer"
                value={joinTags(editing.specialties)}
                onChange={e => setField('specialties', splitTags(e.target.value))}
              />

              <input
                style={{ ...inputStyle, marginTop: 10 }}
                placeholder="Idiomas separados por vírgula. Ex: PT, EN, ES"
                value={joinTags(editing.languages)}
                onChange={e => setField('languages', splitTags(e.target.value))}
              />

              <input
                style={{ ...inputStyle, marginTop: 10 }}
                placeholder="Keywords separadas por vírgula"
                value={joinTags(editing.keywords)}
                onChange={e => setField('keywords', splitTags(e.target.value))}
              />

              <input
                style={{ ...inputStyle, marginTop: 10 }}
                placeholder="Temas separados por vírgula"
                value={joinTags(editing.themes)}
                onChange={e => setField('themes', splitTags(e.target.value))}
              />

              <input
                style={{ ...inputStyle, marginTop: 10 }}
                placeholder="Géneros separados por vírgula"
                value={joinTags(editing.genres)}
                onChange={e => setField('genres', splitTags(e.target.value))}
              />

              <textarea
                style={{ ...textareaStyle, marginTop: 10 }}
                placeholder="Bio curta"
                value={editing.bio || ''}
                onChange={e => setField('bio', e.target.value)}
              />
            </section>

            <section style={sectionStyle}>
              <div style={sectionTitleStyle}>04 · Google Drive / Materiais</div>

              <p style={{ marginTop: 0, color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>
                Cola aqui os links da pasta e dos materiais do artista no Google Drive da SOMA.
                Quando existir link de fotos, vídeos, rider, dossier ou press, o sistema marca automaticamente o material como disponível.
              </p>

              <input style={inputStyle} placeholder="Pasta Google Drive do artista" value={editing.drive?.folderUrl || ''} onChange={e => setDrive('folderUrl', e.target.value)} />
              <input style={{ ...inputStyle, marginTop: 10 }} placeholder="Bio / PDF" value={editing.drive?.bioUrl || ''} onChange={e => setDrive('bioUrl', e.target.value)} />
              <input style={{ ...inputStyle, marginTop: 10 }} placeholder="Fotos / Press photos" value={editing.drive?.photosUrl || ''} onChange={e => setDrive('photosUrl', e.target.value)} />
              <input style={{ ...inputStyle, marginTop: 10 }} placeholder="Vídeos" value={editing.drive?.videosUrl || ''} onChange={e => setDrive('videosUrl', e.target.value)} />
              <input style={{ ...inputStyle, marginTop: 10 }} placeholder="Rider técnico" value={editing.drive?.riderUrl || ''} onChange={e => setDrive('riderUrl', e.target.value)} />
              <input style={{ ...inputStyle, marginTop: 10 }} placeholder="Dossier / Press Kit" value={editing.drive?.dossierUrl || ''} onChange={e => setDrive('dossierUrl', e.target.value)} />
              <input style={{ ...inputStyle, marginTop: 10 }} placeholder="Contratos" value={editing.drive?.contractsUrl || ''} onChange={e => setDrive('contractsUrl', e.target.value)} />
              <input style={{ ...inputStyle, marginTop: 10 }} placeholder="Press / clipping" value={editing.drive?.pressUrl || ''} onChange={e => setDrive('pressUrl', e.target.value)} />

              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['bioPT', 'Bio PT'],
                  ['bioEN', 'Bio EN'],
                  ['bioES', 'Bio ES'],
                  ['bioCA', 'Bio CA'],
                  ['pressPhoto', 'Foto imprensa'],
                  ['videoPresentation', 'Vídeo apresentação'],
                  ['technicalRider', 'Rider técnico'],
                  ['pressKit', 'Press kit / dossier'],
                  ['pressClippings', 'Press clippings'],
                ].map(([field, label]) => (
                  <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.72)' }}>
                    <input
                      type="checkbox"
                      checked={Boolean((editing.materials as any)?.[field])}
                      onChange={e => setMaterial(field as keyof ArtistMaterials, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </section>

            <section style={sectionStyle}>
              <div style={sectionTitleStyle}>05 · Mobilidade</div>

              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={Boolean(editing.mobility?.canTravel)} onChange={e => setMobility('canTravel', e.target.checked)} />
                  Pode viajar
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={Boolean(editing.mobility?.hasEUPassport)} onChange={e => setMobility('hasEUPassport', e.target.checked)} />
                  Passaporte UE
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={Boolean(editing.mobility?.hasEUBankAccount)} onChange={e => setMobility('hasEUBankAccount', e.target.checked)} />
                  Conta EU
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={Boolean(editing.mobility?.hasBRBankAccount)} onChange={e => setMobility('hasBRBankAccount', e.target.checked)} />
                  Conta BR
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input style={inputStyle} placeholder="País do passaporte" value={editing.mobility?.passportCountry || ''} onChange={e => setMobility('passportCountry', e.target.value)} />
                <input style={inputStyle} placeholder="Cachê mínimo (€)" type="number" value={editing.minFee || ''} onChange={e => setField('minFee', Number(e.target.value))} />
              </div>

              <input style={{ ...inputStyle, marginTop: 10 }} placeholder="Disponibilidade" value={editing.availability || ''} onChange={e => setField('availability', e.target.value)} />

              <textarea style={{ ...textareaStyle, marginTop: 10 }} placeholder="Notas sobre vistos" value={editing.mobility?.visaNotes || ''} onChange={e => setMobility('visaNotes', e.target.value)} />
            </section>

            <section style={sectionStyle}>
              <div style={sectionTitleStyle}>06 · Projectos</div>

              {(editing.projects || []).map((p, index) => (
                <div key={p.id || index} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                    <strong>Projecto {index + 1}</strong>
                    <button style={btnDanger} onClick={() => removeProject(index)}>Remover</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input style={inputStyle} placeholder="Nome do projecto" value={p.name || ''} onChange={e => updateProject(index, 'name', e.target.value)} />
                    <input style={inputStyle} placeholder="Formato" value={p.format || ''} onChange={e => updateProject(index, 'format', e.target.value)} />
                    <input style={inputStyle} placeholder="Duração" value={p.duration || ''} onChange={e => updateProject(index, 'duration', e.target.value)} />
                    <input style={inputStyle} placeholder="Vídeo / dossier" value={p.videoLink || ''} onChange={e => updateProject(index, 'videoLink', e.target.value)} />
                  </div>

                  <textarea style={{ ...textareaStyle, marginTop: 10 }} placeholder="Resumo" value={p.summary || ''} onChange={e => updateProject(index, 'summary', e.target.value)} />

                  <textarea style={{ ...textareaStyle, marginTop: 10 }} placeholder="Necessidades técnicas" value={p.technicalNeeds || ''} onChange={e => updateProject(index, 'technicalNeeds', e.target.value)} />

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                    <input type="checkbox" checked={Boolean(p.coversCosts)} onChange={e => updateProject(index, 'coversCosts', e.target.checked)} />
                    Precisa que cubra custos
                  </label>
                </div>
              ))}

              <button style={btnSecondary} onClick={addProject}>
                + Adicionar projecto
              </button>
            </section>

            <section style={sectionStyle}>
              <div style={sectionTitleStyle}>07 · Estado interno</div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={editing.active !== false} onChange={e => setField('active', e.target.checked)} />
                Artista ativo no roster
              </label>
            </section>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 10 }}>
              <button style={btnSecondary} onClick={() => setEditing(null)}>
                Cancelar
              </button>

              {artists.some(a => a.id === editing.id) && (
                <button style={btnDanger} onClick={() => removeArtist(editing.id)}>
                  Apagar
                </button>
              )}

              <button style={btnPrimary} onClick={() => saveArtist(editing)}>
                Guardar artista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}