// src/components/ArtistPortal.tsx
// SOMA ODÉ — Portal do Artista (VERSÃO CORRIGIDA: sem "A carregar..." infinito)
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { loadArtistByUserId, saveArtistToSupabase } from '../data/artistsSupabaseStore'
import { loadProposalsForArtist, updateProposalStatusInSupabase } from '../data/proposalsSupabaseStore'
import type { Artist } from '../types/artist'
import type { Proposal } from '../types/proposal'
import { PROPOSAL_STATUSES } from '../types/proposal'
import { materialsCount, cartografiaCount } from '../types/artist'
import CountryPicker from './CountryPicker'

function joinTags(arr?: string[]) { return Array.isArray(arr) ? arr.join(', ') : '' }
function splitTags(str: string) { return str.split(',').map(x => x.trim()).filter(Boolean) }

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
    // Só tenta carregar se o user estiver realmente disponível
    if (user?.id) {
      load()
    } else {
      // Se não houver user, para o loading
      setLoading(false)
    }
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
            {section === '03' && <Section03 data={artist} onChange={update} />}
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

function Section02({ data, onChange }: { data: any; onChange: (f: string, v: any) => void }) {
  return <div><h2 style={s.h2}>02 · Localização</h2><div style={s.grid2}>
    <F label="País de origem" v={data.origin || ''} onChange={v => onChange('origin', v)} />
    <F label="Cidade de origem" v={data.originCity || ''} onChange={v => onChange('originCity', v)} />
    <F label="Cidade base atual" v={data.base || ''} onChange={v => onChange('base', v)} />
    <F label="País de residência" v={data.residenceCountry || ''} onChange={v => onChange('residenceCountry', v)} />
  </div></div>
}

function Section03({ data, onChange }: { data: any; onChange: (f: string, v: any) => void }) {
  return <div><h2 style={s.h2}>03 · Perfil</h2>
    <FA label="Bio curta" v={data.bio || ''} onChange={v => onChange('bio', v)} />
    <div style={s.grid2}>
      <F label="Disciplinas" v={joinTags(data.disciplines)} onChange={v => onChange('disciplines', splitTags(v))} />
      <F label="Função profissional" v={joinTags(data.specialties)} onChange={v => onChange('specialties', splitTags(v))} />
      <F label="Idiomas" v={joinTags(data.languages)} onChange={v => onChange('languages', splitTags(v.toUpperCase()))} />
      <F label="Keywords" v={joinTags(data.keywords)} onChange={v => onChange('keywords', splitTags(v))} />
      <F label="Temas" v={joinTags(data.themes)} onChange={v => onChange('themes', splitTags(v))} />
      <F label="Géneros" v={joinTags(data.genres)} onChange={v => onChange('genres', splitTags(v))} />
    </div>
  </div>
}

function Section04({ data, onChange }: { data: any; onChange: (f: string, v: any) => void }) {
  return <div><h2 style={s.h2}>04 · Países alvo</h2>
    <CountryPicker selectedCountries={data.targetCountries || []} onChange={(codes: string[]) => onChange('targetCountries', codes)} />
  </div>
}

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

function Section07({ data, onChange, onSave }: { data: any; onChange: (f: string, v: any) => void; onSave: () => Promise<void> }) {
  const projects = data.projects || []
  const [expanded, setExpanded] = useState<string | null>(null)

  const add = () => {
    const newId = crypto.randomUUID()
    const newProject = {
      id: newId, name: '', format: '', duration: '', language: '',
      summary: '', technicalNeeds: '', videoLink: '', driveLink: '', dossierLink: '',
      projectTargetAudience: '', projectTerritories: '', projectKeywords: [],
      projectFormat: '', hasCirculated: false, circulationHistory: '',
    }
    onChange('projects', [...projects, newProject])
    setExpanded(newId)
  }

  const upd = (id: string, f: string, v: any) => {
    onChange('projects', projects.map((p: any) => p.id === id ? { ...p, [f]: v } : p))
  }

  const del = (id: string) => {
    if (confirm('Remover este projeto?')) {
      onChange('projects', projects.filter((p: any) => p.id !== id))
      if (expanded === id) setExpanded(null)
    }
  }

  const saveProject = async (id: string) => {
    await onSave()
    setExpanded(null)
  }

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
            <div style={s.grid2}>
              <F label="Formato" v={p.format || ''} onChange={v => upd(p.id, 'format', v)} />
              <F label="Duração" v={p.duration || ''} onChange={v => upd(p.id, 'duration', v)} />
              <F label="Idioma da obra" v={p.language || ''} onChange={v => upd(p.id, 'language', v)} />
            </div>
            <FA label="Resumo do projeto" v={p.summary || ''} onChange={v => upd(p.id, 'summary', v)} />
            <FA label="Necessidades técnicas" v={p.technicalNeeds || ''} onChange={v => upd(p.id, 'technicalNeeds', v)} />
            <h4 style={{ color: '#60b4e8', marginBottom: 8, marginTop: 18 }}>🔗 Links de Materiais</h4>
            <div style={s.grid2}>
              <F label="Link Vídeo" v={p.videoLink || ''} onChange={v => upd(p.id, 'videoLink', v)} />
              <F label="Link Drive" v={p.driveLink || ''} onChange={v => upd(p.id, 'driveLink', v)} />
              <F label="Link Dossier" v={p.dossierLink || ''} onChange={v => upd(p.id, 'dossierLink', v)} />
            </div>
            <h4 style={{ color: '#ffcf5c', marginBottom: 8, marginTop: 18 }}>🧭 Mini-Cartografia do Projeto</h4>
            <FA label="Público-alvo do projeto" v={p.projectTargetAudience || ''} onChange={v => upd(p.id, 'projectTargetAudience', v)} helper="Quem é o público ideal para este projeto?" />
            <FA label="Territórios onde o projeto faz sentido" v={p.projectTerritories || ''} onChange={v => upd(p.id, 'projectTerritories', v)} helper="Em que cidades, países ou regiões?" />
            <F label="Keywords do projeto" v={joinTags(p.projectKeywords)} onChange={v => upd(p.id, 'projectKeywords', splitTags(v))} helper="Ex: ritual, experimental, spoken word" />
            <F label="Formato de apresentação" v={p.projectFormat || ''} onChange={v => upd(p.id, 'projectFormat', v)} helper="Ex: Concerto, Performance, Instalação, DJ Set" />
            <div style={{ marginTop: 8, marginBottom: 12 }}><C label="Já circulou / foi apresentado?" checked={p.hasCirculated === true} onChange={v => upd(p.id, 'hasCirculated', v)} /></div>
            {p.hasCirculated && <FA label="Histórico de circulação" v={p.circulationHistory || ''} onChange={v => upd(p.id, 'circulationHistory', v)} helper="Onde já foi apresentado? Em que contexto?" />}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button style={s.primaryBtn} onClick={() => saveProject(p.id)}>💾 Guardar Projeto</button>
              <button style={s.dangerBtn} onClick={() => del(p.id)}>🗑 Remover</button>
            </div>
          </div>
        )}
      </div>
    ))}
    <button style={{ ...s.primaryBtn, marginTop: 12 }} onClick={add}>+ Adicionar projeto</button>
  </div>
}

function Section09({ data, onChange }: { data: any; onChange: (f: string, v: any) => void }) {
  const c = data.cartografia || {}
  return <div><h2 style={s.h2}>09 · Cartografia SOMA</h2>
    <details style={s.detail} open><summary style={s.summary}>🌱 RAIZ — origens, tensões, vocabulário</summary><FA label="Origens" v={c.raiz?.origins || ''} onChange={v => onChange('cartografia', { ...c, raiz: { ...c.raiz, origins: v } })} /><FA label="Tensões fundamentais" v={c.raiz?.tensions || ''} onChange={v => onChange('cartografia', { ...c, raiz: { ...c.raiz, tensions: v } })} /><F label="Vocabulário" v={joinTags(c.raiz?.vocabulario)} onChange={v => onChange('cartografia', { ...c, raiz: { ...c.raiz, vocabulario: splitTags(v) } })} /></details>
    <details style={s.detail}><summary style={s.summary}>🎯 CAMPO — quem recebe e por quê</summary><FA label="Perfis de audiência" v={c.campo?.audienceProfiles || ''} onChange={v => onChange('cartografia', { ...c, campo: { ...c.campo, audienceProfiles: v } })} /><FA label="Motivação de adesão" v={c.campo?.motivation || ''} onChange={v => onChange('cartografia', { ...c, campo: { ...c.campo, motivation: v } })} /><F label="Territórios da audiência" v={joinTags(c.campo?.audienceTerritories)} onChange={v => onChange('cartografia', { ...c, campo: { ...c.campo, audienceTerritories: splitTags(v) } })} /></details>
    <details style={s.detail}><summary style={s.summary}>🕸️ TEIA — estrutura do circuito</summary><FA label="Pares" v={c.teia?.pares || ''} onChange={v => onChange('cartografia', { ...c, teia: { ...c.teia, pares: v } })} /><FA label="Quem legitima" v={c.teia?.legitimacy || ''} onChange={v => onChange('cartografia', { ...c, teia: { ...c.teia, legitimacy: v } })} /><FA label="Redes de influência" v={c.teia?.influenceNetworks || ''} onChange={v => onChange('cartografia', { ...c, teia: { ...c.teia, influenceNetworks: v } })} /></details>
    <details style={s.detail}><summary style={s.summary}>🧭 ROTA — próximos territórios</summary><FA label="Gaps" v={c.rota?.gaps || ''} onChange={v => onChange('cartografia', { ...c, rota: { ...c.rota, gaps: v } })} /><F label="Corredores estratégicos" v={joinTags(c.rota?.corredores)} onChange={v => onChange('cartografia', { ...c, rota: { ...c.rota, corredores: splitTags(v) } })} /><FA label="Plano de expansão" v={c.rota?.expansionPlan || ''} onChange={v => onChange('cartografia', { ...c, rota: { ...c.rota, expansionPlan: v } })} /></details>
  </div>
}

const F = ({ label, v, onChange, helper }: { label: string; v: string; onChange: (v: string) => void; helper?: string }) => (
  <label style={s.field}><span style={s.fieldLabel}>{label}</span>{helper && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{helper}</span>}<input style={s.input} value={v} onChange={e => onChange(e.target.value)} /></label>
)
const FA = ({ label, v, onChange, helper }: { label: string; v: string; onChange: (v: string) => void; helper?: string }) => (
  <label style={s.field}><span style={s.fieldLabel}>{label}</span>{helper && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{helper}</span>}<textarea style={s.textarea} value={v} onChange={e => onChange(e.target.value)} /></label>
)
const C = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label style={s.check}><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /> {label}</label>
)

const s: Record<string, React.CSSProperties> = {
  center: { padding: 60, textAlign: 'center', color: '#fff' },
  empty: { padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.6)' },
  wrap: { maxWidth: 1100, margin: '0 auto', padding: '32px 22px', color: '#fff' },
  hero: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 20, paddingBottom: 22, borderBottom: '1px solid rgba(255,255,255,0.1)' },
  title: { margin: 0, fontSize: 34, color: '#fff' },
  subtitle: { margin: '6px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: 14 },
  heroStats: { display: 'flex', gap: 24 },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  statValue: { fontSize: 22, fontWeight: 700, color: '#60b4e8' },
  tabs: { display: 'flex', gap: 8, marginBottom: 24 },
  tab: { background: 'transparent', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.14)', padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 },
  tabActive: { background: '#1A6994', color: '#fff', border: '1px solid #1A6994' },
  badge: { background: '#ffcf5c', color: '#000', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10 },
  sectionTabs: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' },
  sectionTab: { padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', borderRadius: 8, fontSize: 12, cursor: 'pointer' },
  sectionTabActive: { background: '#1A6994', color: '#fff', border: '1px solid #1A6994' },
  section: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 },
  h2: { color: '#60b4e8', fontSize: 18, marginTop: 0, marginBottom: 18 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 },
  fieldLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  input: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' },
  textarea: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: 12, fontSize: 13, minHeight: 95, outline: 'none', resize: 'vertical', fontFamily: 'inherit' },
  checkRow: { display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 },
  check: { display: 'flex', gap: 8, alignItems: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer' },
  footer: { display: 'flex', justifyContent: 'space-between', marginTop: 18, gap: 10 },
  primaryBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer' },
  btn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer' },
  dangerBtn: { background: 'rgba(255,70,70,0.12)', color: '#ff8a8a', border: '1px solid rgba(255,70,70,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer', marginTop: 8 },
  message: { background: 'rgba(96,180,232,0.12)', border: '1px solid rgba(96,180,232,0.25)', color: '#b8e2ff', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 13 },
  detail: { background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 14, marginBottom: 12 },
  summary: { fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: 14 },
  projectCard: { background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 16, marginBottom: 14 },
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
  linkButton: { background: 'transparent', color: '#60b4e8', border: '1px solid rgba(96,180,232,0.3)', padding: '6px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer', marginBottom: 12 },
  actions: { display: 'flex', gap: 10, marginTop: 14 },
  acceptBtn: { background: 'rgba(110,243,165,0.18)', color: '#6ef3a5', border: '1px solid rgba(110,243,165,0.35)', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  refuseBtn: { background: 'rgba(255,70,70,0.12)', color: '#ff8a8a', border: '1px solid rgba(255,70,70,0.25)', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
}