// src/components/ArtistPortal.tsx
// SOMA ODÉ — Portal do Artista (COMPLETO: secção 03 igual ao Admin)
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { loadArtistByUserId, saveArtistToSupabase } from '../data/artistsSupabaseStore'
import { loadProposalsForArtist, updateProposalStatusInSupabase } from '../data/proposalsSupabaseStore'
import type { Artist } from '../types/artist'
import type { Proposal } from '../types/proposal'
import { PROPOSAL_STATUSES } from '../types/proposal'
import { materialsCount, cartografiaCount } from '../types/artist'
import CountryPicker from './CountryPicker'

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
    const safetyTimer = setTimeout(() => {
      setLoading(false)
    }, 5000)

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
        try { const p = await loadProposalsForArtist(a.id); setProposals(p) } catch (err) { console.error(err) }
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function respondProposal(proposalId: string, accept: boolean) {
    setResponding(proposalId)
    try { await updateProposalStatusInSupabase(proposalId, accept ? 'aceite' : 'recusada'); await load() }
    catch (err) { console.error(err); alert('Erro ao responder.') }
    finally { setResponding(null) }
  }

  function openLink(url: string) { window.open(url, '_blank', 'noopener,noreferrer') }

  async function saveProfile() {
    if (!artist) return
    setSaving(true); setMessage('')
    try { await saveArtistToSupabase(artist); setMessage('Perfil guardado com sucesso!') }
    catch (err) { console.error(err); setMessage('Erro ao guardar.') }
    finally { setSaving(false) }
  }

  function update(field: string, value: any) { setArtist(prev => prev ? { ...prev, [field]: value } as Artist : null) }

  function toggleArrayItem(field: string, item: string) {
    const current = ((artist as any)?.[field] as string[]) || []
    const next = current.includes(item)
      ? current.filter((x: string) => x !== item)
      : [...current, item]
    update(field, next)
  }

  if (loading) return <div style={s.center}>A carregar o teu perfil...</div>
  if (!artist) return <div style={s.empty}><h2 style={s.h2}>Bem-vindo ao SOMA ODE</h2><p style={s.subtitle}>O teu perfil ainda nao foi configurado. Contacta a SOMA.</p></div>

  const m = materialsCount(artist.materials)
  const c = cartografiaCount(artist.cartografia)
  const proposalsActive = proposals.filter(p => !['recusada', 'recusada_externamente'].includes(p.status))

  return (
    <div style={s.wrap}>
      <header style={s.hero}>
        <div><h1 style={s.title}>{artist.name || 'Artista'}</h1><p style={s.subtitle}>{[artist.base, artist.origin].filter(Boolean).join(' · ') || 'Localizacao por preencher'}</p></div>
        <div style={s.heroStats}>
          <div style={s.stat}><span style={s.statLabel}>Materiais</span><span style={s.statValue}>{m.done}/{m.total}</span></div>
          <div style={s.stat}><span style={s.statLabel}>Cartografia</span><span style={s.statValue}>{c.filled}/{c.total}</span></div>
          <div style={s.stat}><span style={s.statLabel}>Propostas</span><span style={s.statValue}>{proposalsActive.length}</span></div>
        </div>
      </header>
      <nav style={s.tabs}>
        <button onClick={() => setView('profile')} style={{ ...s.tab, ...(view === 'profile' ? s.tabActive : {}) }}>Meu Perfil</button>
        <button onClick={() => setView('proposals')} style={{ ...s.tab, ...(view === 'proposals' ? s.tabActive : {}) }}>Oportunidades para mim {proposalsActive.length > 0 && <span style={s.badge}>{proposalsActive.length}</span>}</button>
      </nav>
      {message && <div style={s.message}>{message}</div>}
      {view === 'profile' && (
        <>
          <nav style={s.sectionTabs}>{SECTIONS.map(sec => <button key={sec.id} onClick={() => setSection(sec.id)} style={{ ...s.sectionTab, ...(section === sec.id ? s.sectionTabActive : {}) }}>{sec.id} · {sec.label}</button>)}</nav>
          <div style={s.section}>
            {section === '01' && <Section01 data={artist} onChange={update} />}
            {section === '02' && <Section02 data={artist} onChange={update} />}
            {section === '03' && <Section03 data={artist} onChange={update} toggle={toggleArrayItem} />}
            {section === '04' && <Section04 data={artist} onChange={update} />}
            {section === '05' && <Section05 data={artist} onChange={update} />}
            {section === '06' && <Section06 data={artist} onChange={update} />}
            {section === '07' && <Section07 data={artist} onChange={update} onSave={saveProfile} />}
            {section === '09' && <Section09 data={artist} onChange={update} />}
          </div>
          <div style={s.footer}>
            <button style={s.btn} onClick={() => { const idx = SECTIONS.findIndex(x => x.id === section); if (idx > 0) setSection(SECTIONS[idx - 1].id) }}>← Anterior</button>
            <button style={s.primaryBtn} onClick={saveProfile} disabled={saving}>{saving ? 'A guardar...' : 'Guardar Perfil'}</button>
            <button style={s.btn} onClick={() => { const idx = SECTIONS.findIndex(x => x.id === section); if (idx < SECTIONS.length - 1) setSection(SECTIONS[idx + 1].id) }}>Seguinte →</button>
          </div>
        </>
      )}
      {view === 'proposals' && (
        <div style={s.section}><h2 style={s.h2}>Oportunidades para mim</h2>
          {proposals.length === 0 ? <div style={s.empty}><p>Ainda nao ha oportunidades.</p></div> :
            <div style={s.proposalsList}>{proposals.map(p => { const status = PROPOSAL_STATUSES.find(st => st.id === p.status); const isPending = p.status === 'sugerida'; return <article key={p.id} style={s.proposalCard}><div style={s.proposalHeader}><span style={{ ...s.statusBadge, background: (status && status.color) || '#666' }}>{(status && status.label) || p.status}</span>{p.opportunityDeadline && <span style={s.deadline}>{new Date(p.opportunityDeadline).toLocaleDateString('pt-PT')}</span>}</div><h3 style={s.proposalTitle}>{p.opportunityTitle}</h3>{p.opportunityOrganization && <p style={s.proposalMeta}>{p.opportunityOrganization}{p.opportunityCountry ? ' · ' + p.opportunityCountry : ''}</p>}{p.producerNotes && <div style={s.notesBox}><span style={s.notesLabel}>Mensagem da {p.producerName || 'equipa SOMA'}:</span><p style={s.notes}>{p.producerNotes}</p></div>}{p.opportunityLink && <button type="button" onClick={() => openLink(p.opportunityLink as string)} style={s.linkButton}>Ver oportunidade</button>}{isPending && <div style={s.actions}><button style={s.acceptBtn} disabled={responding === p.id} onClick={() => respondProposal(p.id, true)}>{responding === p.id ? '...' : 'Aceitar'}</button><button style={s.refuseBtn} disabled={responding === p.id} onClick={() => respondProposal(p.id, false)}>{responding === p.id ? '...' : 'Recusar'}</button></div>}</article> })}</div>}
        </div>
      )}
    </div>
  )
}

// ─── SECÇÃO 01: IDENTIDADE ──────────────────────────────
function Section01({ data, onChange }: { data: any; onChange: (f: string, v: any) => void }) {
  return <div><h2 style={s.h2}>01 · Identidade</h2><div style={s.grid2}>
    <F label="Nome artistico" v={data.name || ''} onChange={v => onChange('name', v)} />
    <F label="Nome legal" v={data.legalName || ''} onChange={v => onChange('legalName', v)} />
    <F label="Pronomes" v={data.pronouns || ''} onChange={v => onChange('pronouns', v)} />
    <F label="Email" v={data.email || ''} onChange={v => onChange('email', v)} />
    <F label="Telefone" v={data.phone || ''} onChange={v => onChange('phone', v)} />
    <F label="Instagram" v={data.instagram || ''} onChange={v => onChange('instagram', v)} />
    <F label="Website" v={data.website || ''} onChange={v => onChange('website', v)} />
    <F label="Video / Vimeo" v={data.videoLink || ''} onChange={v => onChange('videoLink', v)} />
    <F label="Google Drive (pasta SOMA)" v={data.driveLink || ''} onChange={v => onChange('driveLink', v)} />
  </div></div>
}

// ─── SECÇÃO 02: LOCALIZAÇÃO ─────────────────────────────
function Section02({ data, onChange }: { data: any; onChange: (f: string, v: any) => void }) {
  return <div><h2 style={s.h2}>02 · Localização</h2><div style={s.grid2}>
    <F label="País de origem" v={data.origin || ''} onChange={v => onChange('origin', v)} />
    <F label="Cidade de origem" v={data.originCity || ''} onChange={v => onChange('originCity', v)} />
    <F label="Cidade base atual" v={data.base || ''} onChange={v => onChange('base', v)} />
    <F label="País de residência" v={data.residenceCountry || ''} onChange={v => onChange('residenceCountry', v)} />
  </div></div>
}

// ─── SECÇÃO 03: PERFIL (CHIPS + INPUTS NORMAIS) ─────────
function Section03({ data, onChange, toggle }: { data: any; onChange: (f: string, v: any) => void; toggle: (field: string, item: string) => void }) {
  const disciplines = (data.disciplines as string[]) || []
  const specialties = (data.specialties as string[]) || []
  const languagesList = (data.languages as string[]) || []

  return (
    <div>
      <h2 style={s.h2}>03 · Perfil artístico</h2>

      <div style={{ marginBottom: 18 }}>
        <span style={s.fieldLabel}>Disciplinas (clica para seleccionar)</span>
        <div style={s.chipGrid}>
          {DISCIPLINES.map(d => (
            <button key={d} type="button"
              onClick={() => toggle('disciplines', d)}
              style={{
                ...s.chip,
                ...(disciplines.includes(d) ? s.chipActive : {})
              }}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <span style={s.fieldLabel}>Função profissional</span>
        <div style={s.chipGrid}>
          {SPECIALTIES.map(sp => (
            <button key={sp} type="button"
              onClick={() => toggle('specialties', sp)}
              style={{
                ...s.chip,
                ...(specialties.includes(sp) ? s.chipActive : {})
              }}>
              {sp}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <span style={s.fieldLabel}>Idiomas</span>
        <div style={s.chipGrid}>
          {LANGUAGES.map(l => (
            <button key={l} type="button"
              onClick={() => toggle('languages', l)}
              style={{
                ...s.chip,
                ...(languagesList.includes(l) ? s.chipActive : {})
              }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <F label="Keywords (vírgula separa)" v={Array.isArray(data.keywords) ? data.keywords.join(', ') : (data.keywords || '')} onChange={v => onChange('keywords', v.split(',').map((x: string) => x.trim()).filter(Boolean))} />
      <F label="Temas (vírgula separa)" v={Array.isArray(data.themes) ? data.themes.join(', ') : (data.themes || '')} onChange={v => onChange('themes', v.split(',').map((x: string) => x.trim()).filter(Boolean))} />
      <F label="Géneros (vírgula separa)" v={Array.isArray(data.genres) ? data.genres.join(', ') : (data.genres || '')} onChange={v => onChange('genres', v.split(',').map((x: string) => x.trim()).filter(Boolean))} />

      <FA label="Bio curta" v={data.bio || ''} onChange={v => onChange('bio', v)} />
    </div>
  )
}

// ─── SECÇÃO 04: PAÍSES ──────────────────────────────────
function Section04({ data, onChange }: { data: any; onChange: (f: string, v: any) => void }) {
  const safeCountries = Array.isArray(data?.targetCountries) ? data.targetCountries : []
  return (
    <div>
      <h2 style={s.h2}>04 · Países alvo</h2>
      <CountryPicker selectedCountries={safeCountries} onChange={(codes: string[]) => onChange('targetCountries', codes)} />
    </div>
  )
}

// ─── SECÇÃO 05: MOBILIDADE ──────────────────────────────
function Section05({ data, onChange }: { data: any; onChange: (f: string, v: any) => void }) {
  const mob = data.mobility || {}
  return <div><h2 style={s.h2}>05 · Mobilidade</h2>
    <div style={s.checkRow}>
      <C label="Pode viajar" checked={mob.canTravel !== false} onChange={v => onChange('mobility', { ...mob, canTravel: v })} />
      <C label="Passaporte UE" checked={mob.hasEUPassport === true} onChange={v => onChange('mobility', { ...mob, hasEUPassport: v })} />
    </div>
    <div style={s.grid2}>
      <F label="País do passaporte" v={mob.passportCountry || ''} onChange={v => onChange('mobility', { ...mob, passportCountry: v })} />
      <F label="Cachê mínimo (€)" v={String(data.minFee || '')} onChange={v => onChange('minFee', v ? Number(v) : undefined)} />
      <F label="Disponibilidade" v={data.availability || ''} onChange={v => onChange('availability', v)} />
      <F label="Necessidades de visto" v={mob.visaNotes || ''} onChange={v => onChange('mobility', { ...mob, visaNotes: v })} />
    </div>
  </div>
}

// ─── SECÇÃO 06: MATERIAIS ───────────────────────────────
function Section06({ data, onChange }: { data: any; onChange: (f: string, v: any) => void }) {
  const mats = data.materials || {}
  const tog = (k: string) => onChange('materials', { ...mats, [k]: !mats[k] })
  return <div><h2 style={s.h2}>06 · Materiais</h2>
    <div style={s.checkRow}>
      {['bioPT', 'bioEN', 'bioES', 'pressPhoto', 'videoPresentation', 'technicalRider', 'pressKit'].map(k => <C key={k} label={k} checked={mats[k] === true} onChange={() => tog(k)} />)}
    </div>
    <div style={s.grid2}>
      <F label="Spotify" v={mats.spotifyLink || ''} onChange={v => onChange('materials', { ...mats, spotifyLink: v })} />
      <F label="Bandcamp" v={mats.bandcampLink || ''} onChange={v => onChange('materials', { ...mats, bandcampLink: v })} />
      <F label="YouTube" v={mats.youtubeLink || ''} onChange={v => onChange('materials', { ...mats, youtubeLink: v })} />
      <F label="SoundCloud" v={mats.soundcloudLink || ''} onChange={v => onChange('materials', { ...mats, soundcloudLink: v })} />
      <F label="Drive Bio PT" v={mats.driveBioPT || ''} onChange={v => onChange('materials', { ...mats, driveBioPT: v })} />
      <F label="Drive Bio EN" v={mats.driveBioEN || ''} onChange={v => onChange('materials', { ...mats, driveBioEN: v })} />
      <F label="Drive Fotos" v={mats.drivePhotos || ''} onChange={v => onChange('materials', { ...mats, drivePhotos: v })} />
      <F label="Drive Rider" v={mats.driveRider || ''} onChange={v => onChange('materials', { ...mats, driveRider: v })} />
      <F label="Drive Press Kit" v={mats.drivePressKit || ''} onChange={v => onChange('materials', { ...mats, drivePressKit: v })} />
    </div>
  </div>
}

// ─── SECÇÃO 07: PROJECTOS ───────────────────────────────
function Section07({ data, onChange, onSave }: { data: any; onChange: (f: string, v: any) => void; onSave: () => Promise<void> }) {
  const projects = data.projects || []
  const [expanded, setExpanded] = useState<string | null>(null)
  const add = () => { const newId = crypto.randomUUID(); const newProject = { id: newId, name: '', format: '', duration: '', language: '', summary: '', technicalNeeds: '', videoLink: '', driveLink: '', dossierLink: '', projectTargetAudience: '', projectTerritories: '', projectKeywords: [], projectFormat: '', hasCirculated: false, circulationHistory: '' }; onChange('projects', [...projects, newProject]); setExpanded(newId) }
  const upd = (id: string, f: string, v: any) => { onChange('projects', projects.map((p: any) => p.id === id ? { ...p, [f]: v } : p)) }
  const del = (id: string) => { if (confirm('Remover este projeto?')) { onChange('projects', projects.filter((p: any) => p.id !== id)); if (expanded === id) setExpanded(null) } }
  const saveProject = async (id: string) => { await onSave(); setExpanded(null) }
  return <div><h2 style={s.h2}>07 · Projectos</h2>
    {projects.map((p: any, i: number) => (
      <div key={p.id} style={s.projectCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
          <div><strong>Projeto {i + 1}: {p.name || 'Sem nome'}</strong>{p.projectKeywords && p.projectKeywords.length > 0 && <div style={{ fontSize: 11, color: '#ffcf5c', marginTop: 4 }}>{Array.isArray(p.projectKeywords) ? p.projectKeywords.join(', ') : p.projectKeywords}</div>}</div>
          <span style={{ color: '#60b4e8', fontSize: 18 }}>{expanded === p.id ? '▲' : '▼'}</span>
        </div>
        {expanded === p.id && (
          <div style={{ marginTop: 14 }}>
            <h4 style={{ color: '#60b4e8', marginBottom: 8 }}>📋 Dados do Projeto</h4>
            <F label="Nome do projeto" v={p.name || ''} onChange={v => upd(p.id, 'name', v)} />
            <div style={s.grid2}><F label="Formato" v={p.format || ''} onChange={v => upd(p.id, 'format', v)} /><F label="Duração" v={p.duration || ''} onChange={v => upd(p.id, 'duration', v)} /><F label="Idioma da obra" v={p.language || ''} onChange={v => upd(p.id, 'language', v)} /></div>
            <FA label="Resumo do projeto" v={p.summary || ''} onChange={v => upd(p.id, 'summary', v)} />
            <FA label="Necessidades técnicas" v={p.technicalNeeds || ''} onChange={v => upd(p.id, 'technicalNeeds', v)} />
            <h4 style={{ color: '#60b4e8', marginBottom: 8, marginTop: 18 }}>🔗 Links de Materiais</h4>
            <div style={s.grid2}><F label="Link Vídeo" v={p.videoLink || ''} onChange={v => upd(p.id, 'videoLink', v)} /><F label="Link Drive" v={p.driveLink || ''} onChange={v => upd(p.id, 'driveLink', v)} /><F label="Link Dossier" v={p.dossierLink || ''} onChange={v => upd(p.id, 'dossierLink', v)} /></div>
            <h4 style={{ color: '#ffcf5c', marginBottom: 8, marginTop: 18 }}>🧭 Mini-Cartografia do Projeto</h4>
            <FA label="Público-alvo do projeto" v={p.projectTargetAudience || ''} onChange={v => upd(p.id, 'projectTargetAudience', v)} helper="Quem é o público ideal para este projeto?" />
            <FA label="Territórios onde o projeto faz sentido" v={p.projectTerritories || ''} onChange={v => upd(p.id, 'projectTerritories', v)} helper="Em que cidades, países ou regiões?" />
            <F label="Keywords do projeto" v={Array.isArray(p.projectKeywords) ? p.projectKeywords.join(', ') : (p.projectKeywords || '')} onChange={v => upd(p.id, 'projectKeywords', v.split(',').map((x: string) => x.trim()).filter(Boolean))} helper="Ex: ritual, experimental, spoken word" />
            <F label="Formato de apresentação" v={p.projectFormat || ''} onChange={v => upd(p.id, 'projectFormat', v)} helper="Ex: Concerto, Performance, Instalação, DJ Set" />
            <div style={{ marginTop: 8, marginBottom: 12 }}><C label="Já circulou / foi apresentado?" checked={p.hasCirculated === true} onChange={v => upd(p.id, 'hasCirculated', v)} /></div>
            {p.hasCirculated && <FA label="Histórico de circulação" v={p.circulationHistory || ''} onChange={v => upd(p.id, 'circulationHistory', v)} helper="Onde já foi apresentado? Em que contexto?" />}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}><button style={s.primaryBtn} onClick={() => saveProject(p.id)}>💾 Guardar Projeto</button><button style={s.dangerBtn} onClick={() => del(p.id)}>🗑 Remover</button></div>
          </div>
        )}
      </div>
    ))}
    <button style={{ ...s.primaryBtn, marginTop: 12 }} onClick={add}>+ Adicionar projeto</button>
  </div>
}
// ─── SECÇÃO 09: CARTOGRAFIA SOMA (v2 · Angela Davis) ─────
function Section09({ data, onChange }: { data: any; onChange: (f: string, v: any) => void }) {
    const c = data.cartografia || {}
    return <div><h2 style={s.h2}>09 · Cartografia SOMA</h2>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 18, lineHeight: 1.5 }}>
        Metodologia de inteligência curatorial baseada em Angela Davis, Paul Gilroy, Pierre Bourdieu e bell hooks.
        Mapeia a tua posição no campo cultural para cruzar com oportunidades reais.
      </p>
  
      <details style={s.detail} open>
        <summary style={s.summary}>🌱 RAIZ — origens, tensões, vocabulário e legado de resistência</summary>
        <FA label="Origens (texto livre)" v={c.raiz?.origins || ''} onChange={v => onChange('cartografia', { ...c, raiz: { ...c.raiz, origins: v } })}
          helper="Que histórias, territórios, culturas ou experiências atravessam o teu trabalho?" />
        <FA label="Tensões fundamentais" v={c.raiz?.tensions || ''} onChange={v => onChange('cartografia', { ...c, raiz: { ...c.raiz, tensions: v } })}
          helper="Que conflitos ou contradições movem a tua criação? (Ex: deslocamento, língua, raça, género, memória, pertença)" />
        <F label="⭐ Vocabulário (5-8 palavras únicas, vírgula separa)" v={Array.isArray(c.raiz?.vocabulario) ? c.raiz.vocabulario.join(', ') : (c.raiz?.vocabulario || '')} onChange={v => onChange('cartografia', { ...c, raiz: { ...c.raiz, vocabulario: v.split(',').map((x: string) => x.trim()).filter(Boolean) } })}
          helper="Estas palavras alimentam o motor de matching automaticamente. Escolhe com intenção." />
        <FA label="✊🏿 Legado de Resistência" v={c.raiz?.legacyOfResistance || ''} onChange={v => onChange('cartografia', { ...c, raiz: { ...c.raiz, legacyOfResistance: v } })}
          helper="Como o teu trabalho dialoga com a memória histórica de resistência? Que legados de luta, perseverança e insurgência estética o teu trabalho honra? (Angela Davis: 'o legado da escravidão como modelos para uma nova feminidade')" />
        <FA label="🤲 Práticas de Cuidado Comunitário" v={c.raiz?.carePractices || ''} onChange={v => onChange('cartografia', { ...c, raiz: { ...c.raiz, carePractices: v } })}
          helper="Que práticas de cuidado coletivo sustentam o teu processo criativo? Como a tua comunidade se organiza para resistir à desumanização cotidiana?" />
      </details>
  
      <details style={s.detail}>
        <summary style={s.summary}>🎯 CAMPO — quem recebe e por quê</summary>
        <FA label="Perfis de audiência" v={c.campo?.audienceProfiles || ''} onChange={v => onChange('cartografia', { ...c, campo: { ...c.campo, audienceProfiles: v } })}
          helper="Quem costuma se conectar com o teu trabalho? (Públicos, comunidades, cenas, gerações)" />
        <FA label="Motivação de adesão" v={c.campo?.motivation || ''} onChange={v => onChange('cartografia', { ...c, campo: { ...c.campo, motivation: v } })}
          helper="Por que as pessoas se conectam? (Identificação, festa, cura, política, espiritualidade, comunidade)" />
        <F label="Territórios da audiência (vírgula separa)" v={Array.isArray(c.campo?.audienceTerritories) ? c.campo.audienceTerritories.join(', ') : (c.campo?.audienceTerritories || '')} onChange={v => onChange('cartografia', { ...c, campo: { ...c.campo, audienceTerritories: v.split(',').map((x: string) => x.trim()).filter(Boolean) } })}
          helper="Em que cidades, países ou comunidades o teu trabalho faz sentido?" />
      </details>
  
      <details style={s.detail}>
        <summary style={s.summary}>🕸️ TEIA — estrutura do circuito e alianças éticas</summary>
        <FA label="Pares (artistas similares)" v={c.teia?.pares || ''} onChange={v => onChange('cartografia', { ...c, teia: { ...c.teia, pares: v } })}
          helper="Que artistas, cenas ou movimentos dialogam com o teu trabalho?" />
        <FA label="Quem legitima" v={c.teia?.legitimacy || ''} onChange={v => onChange('cartografia', { ...c, teia: { ...c.teia, legitimacy: v } })}
          helper="Onde já apresentaste, foste reconhecida ou validada? (Festivais, espaços, prêmios, imprensa, residências)" />
        <FA label="Redes de influência" v={c.teia?.influenceNetworks || ''} onChange={v => onChange('cartografia', { ...c, teia: { ...c.teia, influenceNetworks: v } })}
          helper="Que redes, festivais, instituições ou espaços poderiam fortalecer a tua circulação?" />
        <FA label="🤝 Alianças Éticas" v={c.teia?.ethicalAlliances || ''} onChange={v => onChange('cartografia', { ...c, teia: { ...c.teia, ethicalAlliances: v } })}
          helper="Que instituições ou programadores demonstram uma prática antirracista e antisexista REAL? Quais evitam a 'diversidade cosmética'? (Davis: crítica à exclusão das mulheres negras por 'conveniência' política)" />
      </details>
  
      <details style={s.detail}>
        <summary style={s.summary}>🧭 ROTA — próximos territórios e estratégia de liberdade</summary>
        <FA label="Gaps (territórios em falta)" v={c.rota?.gaps || ''} onChange={v => onChange('cartografia', { ...c, rota: { ...c.rota, gaps: v } })}
          helper="O que falta hoje para aplicares melhor a editais? (Materiais, contactos, recursos, tempo)" />
        <F label="Corredores estratégicos (vírgula separa)" v={Array.isArray(c.rota?.corredores) ? c.rota.corredores.join(', ') : (c.rota?.corredores || '')} onChange={v => onChange('cartografia', { ...c, rota: { ...c.rota, corredores: v.split(',').map((x: string) => x.trim()).filter(Boolean) } })}
          helper="Quais seriam os caminhos naturais de circulação? (Ex: Barcelona → Lisboa → Berlim → São Paulo)" />
        <FA label="Plano de expansão" v={c.rota?.expansionPlan || ''} onChange={v => onChange('cartografia', { ...c, rota: { ...c.rota, expansionPlan: v } })}
          helper="Onde gostarias de estar nos próximos 12–24 meses? Fala de países, formatos, colaborações e ambições reais." />
      </details>
    </div>
  }