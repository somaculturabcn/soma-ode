// src/components/ArtistPortal.tsx
// SOMA ODÉ — Portal do Artista (VERSÃO ESTÁVEL E CORRIGIDA)

import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { loadArtistByUserId, saveArtistToSupabase } from '../data/artistsSupabaseStore'
import { loadProposalsForArtist, updateProposalStatusInSupabase } from '../data/proposalsSupabaseStore'
import type { Artist } from '../types/artist'
import type { Proposal } from '../types/proposal'
import { PROPOSAL_STATUSES } from '../types/proposal'
import { materialsCount, cartografiaCount } from '../types/artist'

// ─── FUNÇÕES AUXILIARES ──────────────────────────────────
function joinTags(arr?: string[]) {
  return Array.isArray(arr) ? arr.join(', ') : ''
}

function splitTags(str: string) {
  return str.split(',').map(x => x.trim()).filter(Boolean)
}
// ──────────────────────────────────────────────────────────

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
    if (user?.id) load()
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
        } catch (err) {
          console.error('Erro a carregar propostas:', err)
        }
      }
    } catch (err) {
      console.error('Erro a carregar portal:', err)
    } finally {
      setLoading(false)
    }
  }

  async function respondProposal(proposalId: string, accept: boolean) {
    setResponding(proposalId)
    try {
      const newStatus = accept ? 'aceite' : 'recusada'
      await updateProposalStatusInSupabase(proposalId, newStatus)
      await load()
    } catch (err) {
      console.error(err)
      alert('Erro ao responder.')
    } finally {
      setResponding(null)
    }
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
      setMessage('Erro ao guardar.')
    } finally {
      setSaving(false)
    }
  }

  function update(field: string, value: any) {
    setArtist(prev => prev ? { ...prev, [field]: value } as Artist : null)
  }

  if (loading) {
    return <div style={s.center}>A carregar o teu perfil...</div>
  }

  if (!artist) {
    return (
      <div style={s.empty}>
        <h2 style={s.h2}>Bem-vindo ao SOMA ODE</h2>
        <p style={s.subtitle}>O teu perfil ainda nao foi configurado. Contacta a SOMA.</p>
      </div>
    )
  }

  const m = materialsCount(artist.materials)
  const c = cartografiaCount(artist.cartografia)
  const proposalsActive = proposals.filter(p => !['recusada', 'recusada_externamente'].includes(p.status))

  return (
    <div style={s.wrap}>
      <header style={s.hero}>
        <div>
          <h1 style={s.title}>{artist.name || 'Artista'}</h1>
          <p style={s.subtitle}>{[artist.base, artist.origin].filter(Boolean).join(' · ') || 'Localizacao por preencher'}</p>
        </div>
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
          <nav style={s.sectionTabs}>
            {SECTIONS.map(sec => (
              <button key={sec.id} onClick={() => setSection(sec.id)} style={{ ...s.sectionTab, ...(section === sec.id ? s.sectionTabActive : {}) }}>{sec.id} · {sec.label}</button>
            ))}
          </nav>

          <div style={s.section}>
            {section === '01' && <Section01 data={artist} onChange={update} />}
            {section === '02' && <Section02 data={artist} onChange={update} />}
            {section === '03' && <Section03 data={artist} onChange={update} />}
            {section === '04' && <Section04 data={artist} onChange={update} />}
            {section === '05' && <Section05 data={artist} onChange={update} />}
            {section === '06' && <Section06 data={artist} onChange={update} />}
            {section === '07' && <Section07 data={artist} onChange={update} />}
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
        <div style={s.section}>
          <h2 style={s.h2}>Oportunidades para mim</h2>
          {proposals.length === 0 ? (
            <div style={s.empty}><p>Ainda nao ha oportunidades.</p></div>
          ) : (
            <div style={s.proposalsList}>
              {proposals.map(p => {
                const status = PROPOSAL_STATUSES.find(st => st.id === p.status)
                const isPending = p.status === 'sugerida'
                return (
                  <article key={p.id} style={s.proposalCard}>
                    <div style={s.proposalHeader}>
                      <span style={{ ...s.statusBadge, background: (status && status.color) || '#666' }}>{(status && status.label) || p.status}</span>
                      {p.opportunityDeadline && <span style={s.deadline}>{new Date(p.opportunityDeadline).toLocaleDateString('pt-PT')}</span>}
                    </div>
                    <h3 style={s.proposalTitle}>{p.opportunityTitle}</h3>
                    {p.opportunityOrganization && <p style={s.proposalMeta}>{p.opportunityOrganization}{p.opportunityCountry ? ' · ' + p.opportunityCountry : ''}</p>}
                    {p.producerNotes && <div style={s.notesBox}><span style={s.notesLabel}>Mensagem da {p.producerName || 'equipa SOMA'}:</span><p style={s.notes}>{p.producerNotes}</p></div>}
                    {p.opportunityLink && <button type="button" onClick={() => openLink(p.opportunityLink as string)} style={s.linkButton}>Ver oportunidade</button>}
                    {isPending && (
                      <div style={s.actions}>
                        <button style={s.acceptBtn} disabled={responding === p.id} onClick={() => respondProposal(p.id, true)}>{responding === p.id ? '...' : 'Aceitar'}</button>
                        <button style={s.refuseBtn} disabled={responding === p.id} onClick={() => respondProposal(p.id, false)}>{responding === p.id ? '...' : 'Recusar'}</button>
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

function Section01({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  return (
    <div>
      <h2 style={s.h2}>01 · Identidade</h2>
      <div style={s.grid2}>
        <Field label="Nome artistico" value={data.name || ''} onChange={v => onChange('name', v)} />
        <Field label="Nome legal" value={data.legalName || ''} onChange={v => onChange('legalName', v)} />
        <Field label="Pronomes" value={data.pronouns || ''} onChange={v => onChange('pronouns', v)} />
        <Field label="Email" value={data.email || ''} onChange={v => onChange('email', v)} />
        <Field label="Telefone" value={data.phone || ''} onChange={v => onChange('phone', v)} />
        <Field label="Instagram" value={data.instagram || ''} onChange={v => onChange('instagram', v)} />
        <Field label="Website" value={data.website || ''} onChange={v => onChange('website', v)} />
        <Field label="Video / Vimeo" value={data.videoLink || ''} onChange={v => onChange('videoLink', v)} />
        <Field label="Google Drive" value={data.driveLink || ''} onChange={v => onChange('driveLink', v)} />
      </div>
    </div>
  )
}

function Section02({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  return (
    <div>
      <h2 style={s.h2}>02 · Localização</h2>
      <div style={s.grid2}>
        <Field label="País de origem" value={data.origin || ''} onChange={v => onChange('origin', v)} />
        <Field label="Cidade de origem" value={data.originCity || ''} onChange={v => onChange('originCity', v)} />
        <Field label="Cidade base atual" value={data.base || ''} onChange={v => onChange('base', v)} />
        <Field label="País de residência" value={data.residenceCountry || ''} onChange={v => onChange('residenceCountry', v)} />
      </div>
    </div>
  )
}

function Section03({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  return (
    <div>
      <h2 style={s.h2}>03 · Perfil</h2>
      <FieldArea label="Bio curta" value={data.bio || ''} onChange={v => onChange('bio', v)} />
      <div style={s.grid2}>
        <Field label="Disciplinas" value={joinTags(data.disciplines)} onChange={v => onChange('disciplines', splitTags(v))} />
        <Field label="Função profissional" value={joinTags(data.specialties)} onChange={v => onChange('specialties', splitTags(v))} />
        <Field label="Idiomas" value={joinTags(data.languages)} onChange={v => onChange('languages', splitTags(v.toUpperCase()))} />
        <Field label="Keywords" value={joinTags(data.keywords)} onChange={v => onChange('keywords', splitTags(v))} />
        <Field label="Temas" value={joinTags(data.themes)} onChange={v => onChange('themes', splitTags(v))} />
        <Field label="Géneros" value={joinTags(data.genres)} onChange={v => onChange('genres', splitTags(v))} />
      </div>
    </div>
  )
}

function Section04({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  return (
    <div>
      <h2 style={s.h2}>04 · Países alvo</h2>
      <Field label="Países de interesse (ES, PT, BR, FR...)" value={joinTags(data.targetCountries)} onChange={v => onChange('targetCountries', splitTags(v).map((x: string) => x.toUpperCase()))} />
    </div>
  )
}

function Section05({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  const mob = data.mobility || {}
  return (
    <div>
      <h2 style={s.h2}>05 · Mobilidade</h2>
      <div style={s.checkRow}>
        <Check label="Pode viajar" checked={mob.canTravel !== false} onChange={v => onChange('mobility', { ...mob, canTravel: v })} />
        <Check label="Passaporte UE" checked={mob.hasEUPassport === true} onChange={v => onChange('mobility', { ...mob, hasEUPassport: v })} />
      </div>
      <div style={s.grid2}>
        <Field label="País do passaporte" value={mob.passportCountry || ''} onChange={v => onChange('mobility', { ...mob, passportCountry: v })} />
        <Field label="Cachê mínimo (€)" value={String(data.minFee || '')} onChange={v => onChange('minFee', v ? Number(v) : undefined)} />
        <Field label="Disponibilidade" value={data.availability || ''} onChange={v => onChange('availability', v)} />
        <Field label="Necessidades de visto" value={mob.visaNotes || ''} onChange={v => onChange('mobility', { ...mob, visaNotes: v })} />
      </div>
    </div>
  )
}

function Section06({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  const mats = data.materials || {}
  const tog = (k: string) => onChange('materials', { ...mats, [k]: !mats[k] })
  return (
    <div>
      <h2 style={s.h2}>06 · Materiais</h2>
      <div style={s.checkRow}>
        {['bioPT', 'bioEN', 'bioES', 'pressPhoto', 'videoPresentation', 'technicalRider', 'pressKit'].map(k => (
          <Check key={k} label={k} checked={mats[k] === true} onChange={() => tog(k)} />
        ))}
      </div>
      <div style={s.grid2}>
        <Field label="Spotify" value={mats.spotifyLink || ''} onChange={v => onChange('materials', { ...mats, spotifyLink: v })} />
        <Field label="Bandcamp" value={mats.bandcampLink || ''} onChange={v => onChange('materials', { ...mats, bandcampLink: v })} />
        <Field label="YouTube" value={mats.youtubeLink || ''} onChange={v => onChange('materials', { ...mats, youtubeLink: v })} />
        <Field label="SoundCloud" value={mats.soundcloudLink || ''} onChange={v => onChange('materials', { ...mats, soundcloudLink: v })} />
      </div>
    </div>
  )
}

function Section07({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  const projects = data.projects || []
  const add = () => onChange('projects', [...projects, { id: crypto.randomUUID(), name: '', format: '', duration: '', summary: '' }])
  const upd = (id: string, f: string, v: any) => onChange('projects', projects.map((p: any) => p.id === id ? { ...p, [f]: v } : p))
  const del = (id: string) => onChange('projects', projects.filter((p: any) => p.id !== id))
  return (
    <div>
      <h2 style={s.h2}>07 · Projectos</h2>
      {projects.map((p: any, i: number) => (
        <div key={p.id} style={s.projectCard}>
          <strong>Projecto {i + 1}</strong>
          <Field label="Nome" value={p.name || ''} onChange={v => upd(p.id, 'name', v)} />
          <Field label="Formato" value={p.format || ''} onChange={v => upd(p.id, 'format', v)} />
          <Field label="Duração" value={p.duration || ''} onChange={v => upd(p.id, 'duration', v)} />
          <FieldArea label="Resumo" value={p.summary || ''} onChange={v => upd(p.id, 'summary', v)} />
          <button style={s.dangerBtn} onClick={() => del(p.id)}>Remover</button>
        </div>
      ))}
      <button style={s.primaryBtn} onClick={add}>+ Adicionar projecto</button>
    </div>
  )
}

function Section09({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  const c = data.cartografia || {}
  return (
    <div>
      <h2 style={s.h2}>09 · Cartografia SOMA</h2>
      <details style={s.detail} open>
        <summary style={s.summary}>🌱 RAIZ — origens, tensões, vocabulário</summary>
        <FieldArea label="Origens" value={c.raiz?.origins || ''} onChange={v => onChange('cartografia', { ...c, raiz: { ...c.raiz, origins: v } })} />
        <FieldArea label="Tensões fundamentais" value={c.raiz?.tensions || ''} onChange={v => onChange('cartografia', { ...c, raiz: { ...c.raiz, tensions: v } })} />
        <Field label="Vocabulário (palavras-chave)" value={joinTags(c.raiz?.vocabulario)} onChange={v => onChange('cartografia', { ...c, raiz: { ...c.raiz, vocabulario: splitTags(v) } })} />
      </details>
      <details style={s.detail}>
        <summary style={s.summary}>🎯 CAMPO — quem recebe e por quê</summary>
        <FieldArea label="Perfis de audiência" value={c.campo?.audienceProfiles || ''} onChange={v => onChange('cartografia', { ...c, campo: { ...c.campo, audienceProfiles: v } })} />
        <FieldArea label="Motivação de adesão" value={c.campo?.motivation || ''} onChange={v => onChange('cartografia', { ...c, campo: { ...c.campo, motivation: v } })} />
        <Field label="Territórios da audiência" value={joinTags(c.campo?.audienceTerritories)} onChange={v => onChange('cartografia', { ...c, campo: { ...c.campo, audienceTerritories: splitTags(v) } })} />
      </details>
      <details style={s.detail}>
        <summary style={s.summary}>🕸️ TEIA — estrutura do circuito</summary>
        <FieldArea label="Pares" value={c.teia?.pares || ''} onChange={v => onChange('cartografia', { ...c, teia: { ...c.teia, pares: v } })} />
        <FieldArea label="Quem legitima" value={c.teia?.legitimacy || ''} onChange={v => onChange('cartografia', { ...c, teia: { ...c.teia, legitimacy: v } })} />
        <FieldArea label="Redes de influência" value={c.teia?.influenceNetworks || ''} onChange={v => onChange('cartografia', { ...c, teia: { ...c.teia, influenceNetworks: v } })} />
      </details>
      <details style={s.detail}>
        <summary style={s.summary}>🧭 ROTA — próximos territórios</summary>
        <FieldArea label="Gaps" value={c.rota?.gaps || ''} onChange={v => onChange('cartografia', { ...c, rota: { ...c.rota, gaps: v } })} />
        <Field label="Corredores estratégicos" value={joinTags(c.rota?.corredores)} onChange={v => onChange('cartografia', { ...c, rota: { ...c.rota, corredores: splitTags(v) } })} />
        <FieldArea label="Plano de expansão" value={c.rota?.expansionPlan || ''} onChange={v => onChange('cartografia', { ...c, rota: { ...c.rota, expansionPlan: v } })} />
      </details>
    </div>
  )
}

// ─── COMPONENTES BASE ────────────────────────────────────

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label style={s.field}><span style={s.fieldLabel}>{label}</span><input style={s.input} value={value} onChange={e => onChange(e.target.value)} /></label>
}

function FieldArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label style={s.field}><span style={s.fieldLabel}>{label}</span><textarea style={s.textarea} value={value} onChange={e => onChange(e.target.value)} /></label>
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label style={s.check}><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /> {label}</label>
}

// ─── ESTILOS ─────────────────────────────────────────────

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