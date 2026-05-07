// src/components/ArtistPortal.tsx
// SOMA ODÉ — Portal do Artista
// Secções: 01-07 + 09 (sem CRM Interno)
// Cartografia completa com Angela Davis — somaPositioning em modo leitura

import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { loadArtistByUserId, saveArtistToSupabase } from '../data/artistsSupabaseStore'
import { loadProposalsForArtist, updateProposalStatusInSupabase } from '../data/proposalsSupabaseStore'
import type { Artist } from '../types/artist'
import type { Proposal } from '../types/proposal'
import { PROPOSAL_STATUSES } from '../types/proposal'
import { materialsCount, cartografiaCount } from '../types/artist'
import CountryPicker from './CountryPicker'
import ProjectDossierUpload from './ProjectDossierUpload'
import type { ExtractedDossier } from '../services/pdfExtractor'

const SECTIONS = [
  { id: '01', label: 'Identidade' },
  { id: '02', label: 'Localização' },
  { id: '03', label: 'Perfil' },
  { id: '04', label: 'Países' },
  { id: '05', label: 'Mobilidade' },
  { id: '06', label: 'Materiais' },
  { id: '07', label: 'Projectos' },
  { id: '09', label: 'Cartografia' },
]

const DISCIPLINES = [
  '🎵 Música', '💃 Dança', '🎭 Teatro', '🔥 Performance',
  '🎨 Artes Visuais', '🎬 Cinema', '💡 Instalação',
  '🎧 Arte Sonora', '📚 Pesquisa', '✨ Multidisciplinar',
]

const SPECIALTIES = [
  '🎤 Artista', '🎛 Produtor/a', '🎧 DJ', '🎉 Promotor/a de festa',
  '📣 Promotor/a cultural', '🤝 Associação / colectivo',
  '🏛 Gestor/a cultural', '📋 Agente / booker',
  '🖼 Curador/a', '📅 Programador/a', '💼 Manager',
  '💿 Selo / label', '🎪 Festival / evento',
  '🏠 Espaço cultural / venue', '📚 Investigador/a', '🎓 Educador/a',
]

const LANGUAGES = ['PT', 'EN', 'ES', 'FR', 'IT', 'DE', 'CA', 'GL', 'ZH', 'JA', 'KO', 'RU', 'HI']

export default function ArtistPortal() {
  const { user } = useAuth()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [view, setView] = useState<'profile' | 'proposals'>('profile')
  const [section, setSection] = useState('01')
  const [responding, setResponding] = useState<string | null>(null)

  useEffect(() => {
    const safetyTimer = setTimeout(() => setLoading(false), 5000)
    if (user?.id) {
      load().finally(() => clearTimeout(safetyTimer))
    } else {
      setLoading(false)
    }
    return () => clearTimeout(safetyTimer)
  }, [user?.id])

  async function load() {
    if (!user?.id) return
    setLoading(true)
    try {
      const a = await loadArtistByUserId(user.id)
      setArtist(a)
      if (a) {
        try {
          const p = await loadProposalsForArtist(a.id)
          setProposals(p)
        } catch (err) { console.error(err) }
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function respondProposal(proposalId: string, accept: boolean) {
    setResponding(proposalId)
    try {
      await updateProposalStatusInSupabase(proposalId, accept ? 'aceite' : 'recusada')
      await load()
    } catch (err) {
      console.error(err)
      alert('Erro ao responder.')
    } finally { setResponding(null) }
  }

  function openLink(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function saveProfile() {
    if (!artist) return
    setSaving(true)
    setMessage('')
    try {
      await saveArtistToSupabase(artist)
      setMessage('Perfil guardado com sucesso!')
    } catch (err) {
      console.error(err)
      setMessage('Erro ao guardar. Tenta de novo.')
    } finally { setSaving(false) }
  }

  function update(field: string, value: any) {
    setArtist(prev => prev ? { ...prev, [field]: value } as Artist : null)
  }

  function toggleArrayItem(field: string, item: string) {
    const current = ((artist as any)?.[field] as string[]) || []
    const next = current.includes(item)
      ? current.filter((x: string) => x !== item)
      : [...current, item]
    update(field, next)
  }

  if (loading) return <div style={pt.center}>A carregar o teu perfil...</div>

  if (!artist) {
    return (
      <div style={pt.emptyScreen}>
        <h2 style={pt.h2}>Bem-vindo ao SOMA ODÉ</h2>
        <p style={pt.subtitle}>O teu perfil ainda não foi configurado. Contacta a SOMA.</p>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>somaculturabcn@gmail.com</p>
      </div>
    )
  }

  const m = materialsCount(artist.materials)
  const c = cartografiaCount(artist.cartografia)
  const proposalsActive = proposals.filter(p => !['recusada', 'recusada_externamente'].includes(p.status))

  return (
    <div style={pt.wrap}>

      <header style={pt.hero}>
        <div>
          <h1 style={pt.title}>{artist.name || 'Artista'}</h1>
          <p style={pt.subtitle}>
            {[artist.base, artist.origin].filter(Boolean).join(' · ') || 'Localização por preencher'}
          </p>
        </div>
        <div style={pt.heroStats}>
          <div style={pt.stat}>
            <span style={pt.statLabel}>Materiais</span>
            <span style={pt.statValue}>{m.done}/{m.total}</span>
          </div>
          <div style={pt.stat}>
            <span style={pt.statLabel}>Cartografia</span>
            <span style={pt.statValue}>{c.filled}/{c.total}</span>
          </div>
          <div style={pt.stat}>
            <span style={pt.statLabel}>Propostas</span>
            <span style={pt.statValue}>{proposalsActive.length}</span>
          </div>
        </div>
      </header>

      <nav style={pt.tabs}>
        <button onClick={() => setView('profile')}
          style={{ ...pt.tab, ...(view === 'profile' ? pt.tabActive : {}) }}>
          Meu Perfil
        </button>
        <button onClick={() => setView('proposals')}
          style={{ ...pt.tab, ...(view === 'proposals' ? pt.tabActive : {}) }}>
          Oportunidades para mim
          {proposalsActive.length > 0 && <span style={pt.badge}>{proposalsActive.length}</span>}
        </button>
      </nav>

      {message && <div style={pt.message}>{message}</div>}

      {view === 'profile' && (
        <>
          <nav style={pt.sectionTabs}>
            {SECTIONS.map(sec => (
              <button key={sec.id} onClick={() => setSection(sec.id)}
                style={{ ...pt.sectionTab, ...(section === sec.id ? pt.sectionTabActive : {}) }}>
                {sec.id} · {sec.label}
              </button>
            ))}
          </nav>

          <div style={pt.sectionBox}>
            {section === '01' && <Section01 data={artist} onChange={update} />}
            {section === '02' && <Section02 data={artist} onChange={update} />}
            {section === '03' && <Section03 data={artist} onChange={update} toggle={toggleArrayItem} />}
            {section === '04' && <Section04 data={artist} onChange={update} />}
            {section === '05' && <Section05 data={artist} onChange={update} />}
            {section === '06' && <Section06 data={artist} onChange={update} />}
            {section === '07' && (
              <Section07
                data={artist}
                onChange={update}
                onSave={saveProfile}
                artistId={artist.id}
              />
            )}
            {section === '09' && <Section09 data={artist} onChange={update} />}
          </div>

          <div style={pt.footer}>
            <button style={pt.btn} onClick={() => {
              const idx = SECTIONS.findIndex(sec => sec.id === section)
              if (idx > 0) setSection(SECTIONS[idx - 1].id)
            }}>← Anterior</button>

            <button style={pt.primaryBtn} onClick={saveProfile} disabled={saving}>
              {saving ? 'A guardar...' : '💾 Guardar Perfil'}
            </button>

            <button style={pt.btn} onClick={() => {
              const idx = SECTIONS.findIndex(sec => sec.id === section)
              if (idx < SECTIONS.length - 1) setSection(SECTIONS[idx + 1].id)
            }}>Seguinte →</button>
          </div>
        </>
      )}

      {view === 'proposals' && (
        <div style={pt.sectionBox}>
          <h2 style={pt.h2}>Oportunidades para mim</h2>
          {proposals.length === 0 ? (
            <div style={pt.emptyInline}>
              <p>Ainda não há oportunidades propostas para ti.</p>
              <p style={{ opacity: 0.6 }}>A equipa SOMA está a fazer curadoria.</p>
            </div>
          ) : (
            <div style={pt.proposalsList}>
              {proposals.map(p => {
                const statusObj = PROPOSAL_STATUSES.find(x => x.id === p.status)
                const isPending = p.status === 'sugerida'
                return (
                  <article key={p.id} style={pt.proposalCard}>
                    <div style={pt.proposalHeader}>
                      <span style={{ ...pt.statusBadge, background: (statusObj && statusObj.color) || '#666' }}>
                        {(statusObj && statusObj.label) || p.status}
                      </span>
                      {p.opportunityDeadline && (
                        <span style={pt.deadline}>
                          {new Date(p.opportunityDeadline).toLocaleDateString('pt-PT')}
                        </span>
                      )}
                    </div>
                    <h3 style={pt.proposalTitle}>{p.opportunityTitle}</h3>
                    {p.opportunityOrganization && (
                      <p style={pt.proposalMeta}>
                        {p.opportunityOrganization}{p.opportunityCountry ? ' · ' + p.opportunityCountry : ''}
                      </p>
                    )}
                    {p.producerNotes && (
                      <div style={pt.notesBox}>
                        <span style={pt.notesLabel}>Mensagem da {p.producerName || 'equipa SOMA'}:</span>
                        <p style={pt.notes}>{p.producerNotes}</p>
                      </div>
                    )}
                    {p.opportunityLink && (
                      <button type="button" style={pt.linkButton}
                        onClick={() => openLink(p.opportunityLink as string)}>
                        Ver oportunidade →
                      </button>
                    )}
                    {isPending && (
                      <div style={pt.actions}>
                        <button style={pt.acceptBtn} disabled={responding === p.id}
                          onClick={() => respondProposal(p.id, true)}>
                          {responding === p.id ? '...' : 'Aceitar'}
                        </button>
                        <button style={pt.refuseBtn} disabled={responding === p.id}
                          onClick={() => respondProposal(p.id, false)}>
                          {responding === p.id ? '...' : 'Recusar'}
                        </button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── SECÇÕES ─────────────────────────────────────────────

function Section01({ data, onChange }: { data: any; onChange: (f: string, v: any) => void }) {
  return (
    <div>
      <h2 style={pt.h2}>01 · Identidade</h2>
      <div style={pt.grid2}>
        <F label="Nome artístico" v={data.name || ''} onChange={v => onChange('name', v)} />
        <F label="Nome legal" v={data.legalName || ''} onChange={v => onChange('legalName', v)} />
        <F label="Pronomes" v={data.pronouns || ''} onChange={v => onChange('pronouns', v)} />
        <F label="Email" v={data.email || ''} onChange={v => onChange('email', v)} />
        <F label="Telefone" v={data.phone || ''} onChange={v => onChange('phone', v)} />
        <F label="Instagram" v={data.instagram || ''} onChange={v => onChange('instagram', v)} />
        <F label="Website" v={data.website || ''} onChange={v => onChange('website', v)} />
        <F label="Vídeo / Vimeo" v={data.videoLink || ''} onChange={v => onChange('videoLink', v)} />
      </div>
      <F label="Google Drive (pasta SOMA)" v={data.driveLink || ''} onChange={v => onChange('driveLink', v)} />
    </div>
  )
}

function Section02({ data, onChange }: { data: any; onChange: (f: string, v: any) => void }) {
  return (
    <div>
      <h2 style={pt.h2}>02 · Localização</h2>
      <div style={pt.grid2}>
        <F label="País de origem" v={data.origin || ''} onChange={v => onChange('origin', v)} />
        <F label="Cidade de origem" v={data.originCity || ''} onChange={v => onChange('originCity', v)} />
        <F label="Cidade base atual" v={data.base || ''} onChange={v => onChange('base', v)} />
        <F label="País de residência" v={data.residenceCountry || ''} onChange={v => onChange('residenceCountry', v)} />
      </div>
    </div>
  )
}

function Section03({ data, onChange, toggle }: {
  data: any; onChange: (f: string, v: any) => void; toggle: (field: string, item: string) => void
}) {
  const disciplines = (data.disciplines as string[]) || []
  const specialties = (data.specialties as string[]) || []
  const langs = (data.languages as string[]) || []
  return (
    <div>
      <h2 style={pt.h2}>03 · Perfil artístico</h2>
      <div style={{ marginBottom: 18 }}>
        <span style={pt.fieldLabel}>Disciplinas</span>
        <div style={pt.chipGrid}>
          {DISCIPLINES.map(d => (
            <button key={d} type="button" onClick={() => toggle('disciplines', d)}
              style={{ ...pt.chip, ...(disciplines.includes(d) ? pt.chipActive : {}) }}>{d}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <span style={pt.fieldLabel}>Função profissional</span>
        <div style={pt.chipGrid}>
          {SPECIALTIES.map(sp => (
            <button key={sp} type="button" onClick={() => toggle('specialties', sp)}
              style={{ ...pt.chip, ...(specialties.includes(sp) ? pt.chipActive : {}) }}>{sp}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <span style={pt.fieldLabel}>Idiomas</span>
        <div style={pt.chipGrid}>
          {LANGUAGES.map(l => (
            <button key={l} type="button" onClick={() => toggle('languages', l)}
              style={{ ...pt.chip, ...(langs.includes(l) ? pt.chipActive : {}) }}>{l}</button>
          ))}
        </div>
      </div>
      <F label="Keywords (vírgula separa)"
        v={Array.isArray(data.keywords) ? data.keywords.join(', ') : (data.keywords || '')}
        onChange={v => onChange('keywords', v.split(',').map((x: string) => x.trim()).filter(Boolean))} />
      <F label="Temas (vírgula separa)"
        v={Array.isArray(data.themes) ? data.themes.join(', ') : (data.themes || '')}
        onChange={v => onChange('themes', v.split(',').map((x: string) => x.trim()).filter(Boolean))} />
      <F label="Géneros (vírgula separa)"
        v={Array.isArray(data.genres) ? data.genres.join(', ') : (data.genres || '')}
        onChange={v => onChange('genres', v.split(',').map((x: string) => x.trim()).filter(Boolean))} />
      <FA label="Bio curta" v={data.bio || ''} onChange={v => onChange('bio', v)} />
    </div>
  )
}

function Section04({ data, onChange }: { data: any; onChange: (f: string, v: any) => void }) {
  const safeCountries = Array.isArray(data?.targetCountries) ? data.targetCountries : []
  return (
    <div>
      <h2 style={pt.h2}>04 · Países alvo</h2>
      <CountryPicker selectedCountries={safeCountries} onChange={(codes: string[]) => onChange('targetCountries', codes)} />
    </div>
  )
}

function Section05({ data, onChange }: { data: any; onChange: (f: string, v: any) => void }) {
  const mob = data.mobility || {}
  return (
    <div>
      <h2 style={pt.h2}>05 · Mobilidade</h2>
      <div style={pt.checkRow}>
        <C label="Pode viajar" checked={mob.canTravel !== false} onChange={v => onChange('mobility', { ...mob, canTravel: v })} />
        <C label="Passaporte UE" checked={mob.hasEUPassport === true} onChange={v => onChange('mobility', { ...mob, hasEUPassport: v })} />
        <C label="Conta bancária UE" checked={mob.hasEUBankAccount === true} onChange={v => onChange('mobility', { ...mob, hasEUBankAccount: v })} />
        <C label="Conta bancária BR" checked={mob.hasBRBankAccount === true} onChange={v => onChange('mobility', { ...mob, hasBRBankAccount: v })} />
      </div>
      <div style={pt.grid2}>
        <F label="País do passaporte" v={mob.passportCountry || ''} onChange={v => onChange('mobility', { ...mob, passportCountry: v })} />
        <F label="Cachê mínimo (€)" v={String(data.minFee || '')} onChange={v => onChange('minFee', v ? Number(v) : undefined)} />
        <F label="Disponibilidade" v={data.availability || ''} onChange={v => onChange('availability', v)} />
        <F label="Necessidades de visto" v={mob.visaNotes || ''} onChange={v => onChange('mobility', { ...mob, visaNotes: v })} />
      </div>
    </div>
  )
}

function Section06({ data, onChange }: { data: any; onChange: (f: string, v: any) => void }) {
  const mats = data.materials || {}
  const tog = (k: string) => onChange('materials', { ...mats, [k]: !mats[k] })
  const checks = [
    { key: 'bioPT', label: '📝 Bio PT' }, { key: 'bioEN', label: '📝 Bio EN' },
    { key: 'bioES', label: '📝 Bio ES' }, { key: 'pressPhoto', label: '📸 Foto press' },
    { key: 'videoPresentation', label: '🎬 Vídeo' }, { key: 'technicalRider', label: '🎚 Rider técnico' },
    { key: 'pressKit', label: '📰 Press kit' }, { key: 'pressClippings', label: '📑 Press clippings' },
  ]
  return (
    <div>
      <h2 style={pt.h2}>06 · Materiais</h2>
      <p style={pt.hint}>Marca o que já tens disponível. A SOMA usa isto para o matching com editais.</p>
      <div style={pt.checkRow}>
        {checks.map(item => <C key={item.key} label={item.label} checked={mats[item.key] === true} onChange={() => tog(item.key)} />)}
      </div>
      <div style={pt.grid2}>
        <F label="Spotify" v={mats.spotifyLink || ''} onChange={v => onChange('materials', { ...mats, spotifyLink: v })} />
        <F label="Bandcamp" v={mats.bandcampLink || ''} onChange={v => onChange('materials', { ...mats, bandcampLink: v })} />
        <F label="YouTube" v={mats.youtubeLink || ''} onChange={v => onChange('materials', { ...mats, youtubeLink: v })} />
        <F label="SoundCloud" v={mats.soundcloudLink || ''} onChange={v => onChange('materials', { ...mats, soundcloudLink: v })} />
        <F label="Drive Bio PT" v={mats.driveBioPT || ''} onChange={v => onChange('materials', { ...mats, driveBioPT: v })} />
        <F label="Drive Bio EN" v={mats.driveBioEN || ''} onChange={v => onChange('materials', { ...mats, driveBioEN: v })} />
        <F label="Drive Fotos" v={mats.drivePhotos || ''} onChange={v => onChange('materials', { ...mats, drivePhotos: v })} />
        <F label="Drive Rider" v={mats.driveRider || ''} onChange={v => onChange('materials', { ...mats, driveRider: v })} />
      </div>
    </div>
  )
}

function Section07({ data, onChange, onSave, artistId }: {
  data: any; onChange: (f: string, v: any) => void; onSave: () => Promise<void>; artistId: string
}) {
  const projects = data.projects || []
  const [expanded, setExpanded] = useState<string | null>(null)

  function add() {
    const newId = crypto.randomUUID()
    onChange('projects', [...projects, {
      id: newId, name: '', format: '', duration: '', language: '',
      summary: '', technicalNeeds: '', videoLink: '', driveLink: '', dossierLink: '',
      projectTargetAudience: '', projectTerritories: '',
      projectKeywords: [], projectFormat: '', hasCirculated: false, circulationHistory: '',
    }])
    setExpanded(newId)
  }

  function upd(id: string, field: string, value: any) {
    onChange('projects', projects.map((p: any) => p.id === id ? { ...p, [field]: value } : p))
  }

  function del(id: string) {
    if (confirm('Remover este projeto?')) {
      onChange('projects', projects.filter((p: any) => p.id !== id))
      if (expanded === id) setExpanded(null)
    }
  }

  // Callback quando o dossier é extraído — actualiza o projecto e guarda automaticamente
  function handleDossierExtracted(projectId: string, dossier: ExtractedDossier) {
    const updatedProjects = projects.map((p: any) =>
      p.id === projectId
        ? {
            ...p,
            dossierUrl: dossier.dossierUrl,
            dossierFileName: dossier.dossierFileName,
            dossierUploadedAt: dossier.dossierUploadedAt,
            dossierWordCount: dossier.dossierWordCount,
            dossierText: dossier.dossierText,
            methodology: dossier.methodology,
            references: dossier.references,
            communities: dossier.communities,
            highlights: dossier.highlights,
            projectFormat: p.projectFormat || dossier.format,
            projectKeywords: (p.projectKeywords || []).length ? p.projectKeywords : dossier.keywords,
            summary: p.summary || dossier.summary,
          }
        : p
    )
    onChange('projects', updatedProjects)
    // Guarda automaticamente após o upload
    onSave()
  }

  return (
    <div>
      <h2 style={pt.h2}>07 · Projectos</h2>
      {projects.map((p: any, i: number) => (
        <div key={p.id} style={pt.projectCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
            <div>
              <strong>Projeto {i + 1}: {p.name || 'Sem nome'}</strong>
              {p.dossierFileName && (
                <span style={{ fontSize: 11, color: '#6ef3a5', marginLeft: 8 }}>📄 {p.dossierFileName}</span>
              )}
              {p.projectKeywords && p.projectKeywords.length > 0 && (
                <div style={{ fontSize: 11, color: '#ffcf5c', marginTop: 4 }}>
                  {Array.isArray(p.projectKeywords) ? p.projectKeywords.join(', ') : p.projectKeywords}
                </div>
              )}
            </div>
            <span style={{ color: '#60b4e8', fontSize: 18 }}>{expanded === p.id ? '▲' : '▼'}</span>
          </div>
          {expanded === p.id && (
            <div style={{ marginTop: 14 }}>
              <F label="Nome do projeto" v={p.name || ''} onChange={v => upd(p.id, 'name', v)} />
              <div style={pt.grid2}>
                <F label="Formato" v={p.format || ''} onChange={v => upd(p.id, 'format', v)} />
                <F label="Duração" v={p.duration || ''} onChange={v => upd(p.id, 'duration', v)} />
                <F label="Idioma da obra" v={p.language || ''} onChange={v => upd(p.id, 'language', v)} />
              </div>
              <FA label="Resumo do projeto" v={p.summary || ''} onChange={v => upd(p.id, 'summary', v)}
                helper="Descreve em 3-5 frases. Usado nas candidaturas." />
              <FA label="Necessidades técnicas" v={p.technicalNeeds || ''} onChange={v => upd(p.id, 'technicalNeeds', v)} />
              <div style={pt.grid2}>
                <F label="Link Vídeo" v={p.videoLink || ''} onChange={v => upd(p.id, 'videoLink', v)} />
                <F label="Link Drive" v={p.driveLink || ''} onChange={v => upd(p.id, 'driveLink', v)} />
                <F label="Link Dossier" v={p.dossierLink || ''} onChange={v => upd(p.id, 'dossierLink', v)} />
              </div>
              <FA label="🧭 Público-alvo do projeto" v={p.projectTargetAudience || ''}
                onChange={v => upd(p.id, 'projectTargetAudience', v)} helper="Quem é o público ideal?" />
              <FA label="Territórios onde o projeto faz sentido" v={p.projectTerritories || ''}
                onChange={v => upd(p.id, 'projectTerritories', v)} helper="Em que cidades, países ou regiões?" />
              <F label="Keywords do projeto (vírgula separa)"
                v={Array.isArray(p.projectKeywords) ? p.projectKeywords.join(', ') : (p.projectKeywords || '')}
                onChange={v => upd(p.id, 'projectKeywords', v.split(',').map((x: string) => x.trim()).filter(Boolean))} />
              <F label="Formato de apresentação" v={p.projectFormat || ''}
                onChange={v => upd(p.id, 'projectFormat', v)} helper="Ex: Concerto, Performance, DJ Set" />
              <div style={{ marginTop: 8, marginBottom: 12 }}>
                <C label="Já circulou / foi apresentado?" checked={p.hasCirculated === true}
                  onChange={v => upd(p.id, 'hasCirculated', v)} />
              </div>
              {p.hasCirculated && (
                <FA label="Histórico de circulação" v={p.circulationHistory || ''}
                  onChange={v => upd(p.id, 'circulationHistory', v)} helper="Onde já foi apresentado? Em que contexto?" />
              )}

              {/* ─── Dossier PDF ─── */}
              <div style={pt.dossierSection}>
                <div style={pt.dossierTitle}>📄 Dossier do projecto</div>
                <p style={pt.hint}>
                  Faz upload do teu dossier em PDF. Fica guardado de forma segura e é usado para melhorar o matching com oportunidades.
                </p>
                <ProjectDossierUpload
                  projectId={p.id}
                  projectName={p.name || 'Projecto'}
                  artistId={artistId}
                  dossierFileName={p.dossierFileName}
                  dossierUrl={p.dossierUrl}
                  dossierUploadedAt={p.dossierUploadedAt}
                  dossierWordCount={p.dossierWordCount}
                  onExtracted={handleDossierExtracted}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button style={pt.primaryBtn} onClick={onSave}>💾 Guardar Projeto</button>
                <button style={pt.dangerBtn} onClick={() => del(p.id)}>🗑 Remover</button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button style={{ ...pt.primaryBtn, marginTop: 12 }} onClick={add}>+ Adicionar projeto</button>
    </div>
  )
}

function Section09({ data, onChange }: { data: any; onChange: (f: string, v: any) => void }) {
  const c = data.cartografia || {}

  function updRaiz(field: string, value: any) {
    onChange('cartografia', { ...c, raiz: { ...(c.raiz || {}), [field]: value } })
  }
  function updCampo(field: string, value: any) {
    onChange('cartografia', { ...c, campo: { ...(c.campo || {}), [field]: value } })
  }
  function updTeia(field: string, value: any) {
    onChange('cartografia', { ...c, teia: { ...(c.teia || {}), [field]: value } })
  }
  function updRota(field: string, value: any) {
    onChange('cartografia', { ...c, rota: { ...(c.rota || {}), [field]: value } })
  }

  return (
    <div>
      <h2 style={pt.h2}>09 · Cartografia SOMA</h2>
      <p style={pt.hint}>
        Metodologia de inteligência curatorial — Angela Davis, Paul Gilroy, Pierre Bourdieu e bell hooks.
        O vocabulário que escolhes alimenta automaticamente o matching com editais e residências.
      </p>

      <details style={pt.detail} open>
        <summary style={pt.summary}>🌱 RAIZ — origens, tensões, vocabulário e legado de resistência</summary>
        <FA label="Origens (texto livre)" v={c.raiz?.origins || ''} onChange={v => updRaiz('origins', v)}
          helper="Que histórias, territórios, culturas ou experiências atravessam o teu trabalho?" />
        <FA label="Tensões fundamentais" v={c.raiz?.tensions || ''} onChange={v => updRaiz('tensions', v)}
          helper="Que conflitos ou contradições movem a tua criação? (deslocamento, língua, raça, género, memória)" />
        <F label="⭐ Vocabulário (5-8 palavras únicas, vírgula separa)"
          v={Array.isArray(c.raiz?.vocabulario) ? c.raiz.vocabulario.join(', ') : (c.raiz?.vocabulario || '')}
          onChange={v => updRaiz('vocabulario', v.split(',').map((x: string) => x.trim()).filter(Boolean))}
          helper="Palavras que só tu usas. Alimentam o motor de matching automaticamente." />
        <FA label="✊🏿 Legado de Resistência (Angela Davis)" v={c.raiz?.legacyOfResistance || ''}
          onChange={v => updRaiz('legacyOfResistance', v)}
          helper="Como o teu trabalho dialoga com a memória histórica de resistência? Que legados de luta e insurgência estética honras?" />
        <FA label="🤲 Práticas de Cuidado Comunitário" v={c.raiz?.carePractices || ''}
          onChange={v => updRaiz('carePractices', v)}
          helper="Que práticas de cuidado coletivo sustentam o teu processo criativo? Como a tua comunidade resiste à desumanização cotidiana?" />
      </details>

      <details style={pt.detail}>
        <summary style={pt.summary}>🎯 CAMPO — quem recebe e por quê</summary>
        <FA label="Perfis de audiência" v={c.campo?.audienceProfiles || ''} onChange={v => updCampo('audienceProfiles', v)}
          helper="Quem costuma se conectar com o teu trabalho? (Públicos, comunidades, cenas, gerações)" />
        <FA label="Motivação de adesão" v={c.campo?.motivation || ''} onChange={v => updCampo('motivation', v)}
          helper="Por que as pessoas se conectam? (Identificação, festa, cura, política, espiritualidade, comunidade)" />
        <F label="Territórios da audiência (vírgula separa)"
          v={Array.isArray(c.campo?.audienceTerritories) ? c.campo.audienceTerritories.join(', ') : (c.campo?.audienceTerritories || '')}
          onChange={v => updCampo('audienceTerritories', v.split(',').map((x: string) => x.trim()).filter(Boolean))}
          helper="Em que cidades, países ou comunidades o teu trabalho faz sentido?" />
      </details>

      <details style={pt.detail}>
        <summary style={pt.summary}>🕸️ TEIA — estrutura do circuito e alianças éticas</summary>
        <FA label="Pares (artistas similares)" v={c.teia?.pares || ''} onChange={v => updTeia('pares', v)}
          helper="Que artistas, cenas ou movimentos dialogam com o teu trabalho?" />
        <FA label="Quem legitima" v={c.teia?.legitimacy || ''} onChange={v => updTeia('legitimacy', v)}
          helper="Onde já apresentaste, foste reconhecida ou validada? (Festivais, espaços, prémios, imprensa, residências)" />
        <FA label="Redes de influência" v={c.teia?.influenceNetworks || ''} onChange={v => updTeia('influenceNetworks', v)}
          helper="Que redes, festivais, instituições ou espaços poderiam fortalecer a tua circulação?" />
        <FA label="🤝 Alianças Éticas (Angela Davis)" v={c.teia?.ethicalAlliances || ''}
          onChange={v => updTeia('ethicalAlliances', v)}
          helper="Que instituições demonstram prática antirracista REAL? Quais evitam a 'diversidade cosmética'?" />
      </details>

      <details style={pt.detail}>
        <summary style={pt.summary}>🧭 ROTA — próximos territórios e estratégia de liberdade</summary>
        <FA label="Gaps (territórios em falta)" v={c.rota?.gaps || ''} onChange={v => updRota('gaps', v)}
          helper="O que falta hoje para aplicares melhor a editais? (Materiais, contactos, recursos, tempo)" />
        <F label="Corredores estratégicos (vírgula separa)"
          v={Array.isArray(c.rota?.corredores) ? c.rota.corredores.join(', ') : (c.rota?.corredores || '')}
          onChange={v => updRota('corredores', v.split(',').map((x: string) => x.trim()).filter(Boolean))}
          helper="Quais seriam os caminhos naturais de circulação? (Ex: Barcelona → Lisboa → Berlim → São Paulo)" />
        <FA label="Plano de expansão" v={c.rota?.expansionPlan || ''} onChange={v => updRota('expansionPlan', v)}
          helper="Onde gostarias de estar nos próximos 12–24 meses? Fala de países, formatos, colaborações e ambições reais." />
      </details>

      {c.somaPositioning && (
        <div style={pt.somaBox}>
          <div style={pt.somaLabel}>
            ✨ Posicionamento estratégico SOMA
            <span style={pt.somaTag}>elaborado pela equipa SOMA · só leitura</span>
          </div>
          <p style={pt.somaText}>{c.somaPositioning}</p>
        </div>
      )}
    </div>
  )
}

// ─── Helpers de input ─────────────────────────────────────

function F({ label, v, onChange, helper }: {
  label: string; v: string; onChange: (v: string) => void; helper?: string
}) {
  return (
    <label style={pt.field}>
      <span style={pt.fieldLabel}>{label}</span>
      <input style={pt.input} value={v} onChange={e => onChange(e.target.value)} placeholder={helper} />
    </label>
  )
}

function FA({ label, v, onChange, helper }: {
  label: string; v: string; onChange: (v: string) => void; helper?: string
}) {
  return (
    <label style={pt.field}>
      <span style={pt.fieldLabel}>{label}</span>
      <textarea style={pt.textarea} value={v} onChange={e => onChange(e.target.value)}
        placeholder={helper} rows={3} />
    </label>
  )
}

function C({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label style={pt.checkItem}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

// ─── Styles ───────────────────────────────────────────────

const pt: Record<string, React.CSSProperties> = {
  center: { padding: 60, textAlign: 'center', color: '#fff' },
  emptyScreen: { padding: 60, textAlign: 'center', color: '#fff', maxWidth: 500, margin: '0 auto' },
  emptyInline: { padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.5)' },
  wrap: { maxWidth: 1100, margin: '0 auto', padding: '32px 22px', color: '#fff' },

  hero: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 28, flexWrap: 'wrap', gap: 20,
    paddingBottom: 22, borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  title: { margin: 0, fontSize: 32, color: '#fff', fontWeight: 700 },
  subtitle: { margin: '6px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: 14 },
  heroStats: { display: 'flex', gap: 28 },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  statValue: { fontSize: 22, fontWeight: 700, color: '#60b4e8' },

  tabs: { display: 'flex', gap: 8, marginBottom: 24 },
  tab: {
    background: 'transparent', color: 'rgba(255,255,255,0.65)',
    border: '1px solid rgba(255,255,255,0.14)', padding: '10px 18px',
    borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  tabActive: { background: '#1A6994', color: '#fff', border: '1px solid #1A6994' },
  badge: { background: '#ffcf5c', color: '#000', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10 },

  sectionTabs: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 },
  sectionTab: {
    padding: '7px 12px', background: 'transparent',
    border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)',
    borderRadius: 8, fontSize: 12, cursor: 'pointer',
  },
  sectionTabActive: { background: '#1A6994', color: '#fff', border: '1px solid #1A6994' },

  sectionBox: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 },
  h2: { color: '#60b4e8', fontSize: 13, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 0, marginBottom: 20, textAlign: 'center' },
  hint: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 16, lineHeight: 1.5 },

  message: {
    background: 'rgba(96,180,232,0.12)', border: '1px solid rgba(96,180,232,0.25)',
    color: '#b8e2ff', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 13,
  },

  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  btn: {
    background: 'rgba(255,255,255,0.06)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer',
  },
  primaryBtn: {
    background: '#1A6994', color: '#fff', border: 'none',
    borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer',
  },
  dangerBtn: {
    background: 'rgba(255,70,70,0.12)', color: '#ff8a8a',
    border: '1px solid rgba(255,70,70,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer',
  },

  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 },

  field: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 },
  fieldLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  input: {
    background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  textarea: {
    background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 8, padding: 12, fontSize: 13, minHeight: 90,
    outline: 'none', resize: 'vertical', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
  },

  chipGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 14 },
  chip: {
    padding: '8px 14px', background: 'transparent', color: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(255,255,255,0.14)', borderRadius: 24, fontSize: 13, cursor: 'pointer',
  },
  chipActive: { background: 'rgba(26,105,148,0.3)', color: '#fff', border: '1px solid #1A6994' },

  checkRow: { display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 },
  checkItem: { display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer' },

  detail: { background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 14, marginBottom: 12 },
  summary: { fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: 14 },

  somaBox: {
    marginTop: 20, padding: 18,
    background: 'rgba(26,105,148,0.07)',
    border: '1px solid rgba(26,105,148,0.35)',
    borderRadius: 10,
  },
  somaLabel: {
    fontSize: 11, color: '#60b4e8', letterSpacing: '0.1em', textTransform: 'uppercase',
    marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10,
  },
  somaTag: {
    fontSize: 10, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.06)',
    padding: '2px 8px', borderRadius: 10, letterSpacing: '0.04em', textTransform: 'none',
  },
  somaText: { margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.7, fontStyle: 'italic' },

  projectCard: { background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 16, marginTop: 14 },

  // Dossier section
  dossierSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTop: '1px solid rgba(255,255,255,0.07)',
  },
  dossierTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#60b4e8',
    marginBottom: 8,
  },

  proposalsList: { display: 'grid', gap: 14 },
  proposalCard: { background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 18 },
  proposalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  statusBadge: { color: '#000', padding: '3px 10px', borderRadius: 14, fontSize: 11, fontWeight: 700 },
  deadline: { color: '#ffcf5c', fontSize: 12, fontWeight: 600 },
  proposalTitle: { margin: '0 0 6px', fontSize: 18, color: '#fff' },
  proposalMeta: { margin: '0 0 12px', color: 'rgba(255,255,255,0.55)', fontSize: 13 },
  notesBox: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12, marginBottom: 12 },
  notesLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em' },
  notes: { margin: '4px 0 0', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, fontSize: 13 },
  linkButton: {
    background: 'transparent', color: '#60b4e8', border: '1px solid rgba(96,180,232,0.3)',
    padding: '6px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer', marginBottom: 12,
  },
  actions: { display: 'flex', gap: 10, marginTop: 14 },
  acceptBtn: {
    background: 'rgba(110,243,165,0.18)', color: '#6ef3a5',
    border: '1px solid rgba(110,243,165,0.35)', padding: '10px 18px',
    borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  refuseBtn: {
    background: 'rgba(255,70,70,0.12)', color: '#ff8a8a',
    border: '1px solid rgba(255,70,70,0.25)', padding: '10px 18px',
    borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
}