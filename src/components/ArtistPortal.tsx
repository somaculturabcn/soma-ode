// src/components/ArtistPortal.tsx
// SOMA ODÉ — Portal do Artista (COMPLETO: edita tudo menos CRM Interno)

import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { loadArtistByUserId, saveArtistToSupabase } from '../data/artistsSupabaseStore'
import { loadProposalsForArtist, updateProposalStatusInSupabase } from '../data/proposalsSupabaseStore'
import type { Artist } from '../types/artist'
import type { Proposal } from '../types/proposal'
import { PROPOSAL_STATUSES } from '../types/proposal'
import { materialsCount, cartografiaCount } from '../types/artist'

const SECTIONS = [
  { id: '01', label: 'Identidade' },
  { id: '02', label: 'Localização' },
  { id: '03', label: 'Perfil' },
  { id: '04', label: 'Países' },
  { id: '05', label: 'Mobilidade' },
  { id: '06', label: 'Materiais' },
  { id: '07', label: 'Projectos' },
  { id: '09', label: 'Cartografia SOMA' }, // 08 CRM Interno fica de fora
] as const

export default function ArtistPortal() {
  const { user } = useAuth()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [view, setView] = useState<'profile' | 'proposals'>('profile')
  const [section, setSection] = useState<string>('01')
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
        const p = await loadProposalsForArtist(a.id)
        setProposals(p)
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
      alert('Erro ao responder à proposta.')
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
      setMessage('Perfil guardado com sucesso.')
    } catch (err) {
      console.error('Erro ao guardar perfil:', err)
      setMessage('Erro ao guardar perfil. Tenta de novo.')
    } finally {
      setSaving(false)
    }
  }

  function update(field: keyof Artist, value: any) {
    setArtist(prev => prev ? { ...prev, [field]: value } : null)
  }

  function splitTags(value: string) {
    return value.split(',').map(x => x.trim()).filter(Boolean)
  }

  function joinTags(value?: string[]) {
    return Array.isArray(value) ? value.join(', ') : ''
  }

  if (loading) {
    return <div style={s.center}>A carregar o teu perfil...</div>
  }

  if (!artist) {
    return (
      <div style={s.empty}>
        <h2 style={s.h2}>Bem-vindo ao SOMA ODE</h2>
        <p style={s.subtitle}>O teu perfil ainda nao foi configurado pela equipa SOMA.</p>
        <p style={s.subtitle}>Contacta: somaculturabcn@gmail.com</p>
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
          <p style={s.subtitle}>
            {[artist.base, artist.origin].filter(Boolean).join(' · ') || 'Localizacao por preencher'}
          </p>
        </div>
        <div style={s.heroStats}>
          <div style={s.stat}>
            <span style={s.statLabel}>Materiais</span>
            <span style={s.statValue}>{m.done}/{m.total}</span>
          </div>
          <div style={s.stat}>
            <span style={s.statLabel}>Cartografia</span>
            <span style={s.statValue}>{c.filled}/{c.total}</span>
          </div>
          <div style={s.stat}>
            <span style={s.statLabel}>Propostas</span>
            <span style={s.statValue}>{proposalsActive.length}</span>
          </div>
        </div>
      </header>

      <nav style={s.tabs}>
        <button onClick={() => setView('profile')} style={{ ...s.tab, ...(view === 'profile' ? s.tabActive : {}) }}>
          Meu Perfil
        </button>
        <button onClick={() => setView('proposals')} style={{ ...s.tab, ...(view === 'proposals' ? s.tabActive : {}) }}>
          Oportunidades para mim
          {proposalsActive.length > 0 && <span style={s.badge}>{proposalsActive.length}</span>}
        </button>
      </nav>

      {message && <div style={s.message}>{message}</div>}

      {view === 'profile' && (
        <>
          <nav style={s.sectionTabs}>
            {SECTIONS.map(sec => (
              <button
                key={sec.id}
                onClick={() => setSection(sec.id)}
                style={{ ...s.sectionTab, ...(section === sec.id ? s.sectionTabActive : {}) }}
              >
                {sec.id} · {sec.label}
              </button>
            ))}
          </nav>

          <div style={s.section}>
            {section === '01' && <Section01 artist={artist} update={update} />}
            {section === '02' && <Section02 artist={artist} update={update} />}
            {section === '03' && <Section03 artist={artist} update={update} />}
            {section === '04' && <Section04 artist={artist} update={update} />}
            {section === '05' && <Section05 artist={artist} update={update} />}
            {section === '06' && <Section06 artist={artist} update={update} />}
            {section === '07' && <Section07 artist={artist} update={update} />}
            {section === '09' && <Section09 artist={artist} update={update} />}
          </div>

          <div style={s.footer}>
            <button style={s.secondaryBtn} onClick={() => {
              const idx = SECTIONS.findIndex(s => s.id === section)
              if (idx > 0) setSection(SECTIONS[idx - 1].id)
            }}>
              ← Anterior
            </button>
            <button style={s.primaryBtn} onClick={saveProfile} disabled={saving}>
              {saving ? 'A guardar...' : 'Guardar Perfil'}
            </button>
            <button style={s.secondaryBtn} onClick={() => {
              const idx = SECTIONS.findIndex(s => s.id === section)
              if (idx < SECTIONS.length - 1) setSection(SECTIONS[idx + 1].id)
            }}>
              Seguinte →
            </button>
          </div>
        </>
      )}

      {view === 'proposals' && (
        <ProposalsView proposals={proposals} responding={responding} onRespond={respondProposal} onOpenLink={openLink} />
      )}
    </div>
  )
}

// ─── SECÇÕES DO PERFIL ──────────────────────────────────

function Section01({ artist, update }: { artist: Artist; update: (field: keyof Artist, value: any) => void }) {
  return (
    <div>
      <h2 style={s.h2}>01 · Identidade e contacto</h2>
      <div style={s.grid2}>
        <Input label="Nome artístico" value={artist.name} onChange={v => update('name', v)} />
        <Input label="Nome legal" value={(artist as any).legalName || ''} onChange={v => update('legalName' as any, v)} />
        <Input label="Pronomes" value={(artist as any).pronouns || ''} onChange={v => update('pronouns' as any, v)} />
        <Input label="Email" value={artist.email || ''} onChange={v => update('email', v)} />
        <Input label="Telefone" value={(artist as any).phone || ''} onChange={v => update('phone' as any, v)} />
        <Input label="Instagram" value={(artist as any).instagram || ''} onChange={v => update('instagram' as any, v)} />
        <Input label="Website" value={(artist as any).website || ''} onChange={v => update('website' as any, v)} />
        <Input label="Vídeo / Vimeo" value={(artist as any).videoLink || ''} onChange={v => update('videoLink' as any, v)} />
      </div>
      <Input label="Google Drive (pasta da SOMA)" value={(artist as any).driveLink || ''} onChange={v => update('driveLink' as any, v)} />
    </div>
  )
}

function Section02({ artist, update }: { artist: Artist; update: (field: keyof Artist, value: any) => void }) {
  return (
    <div>
      <h2 style={s.h2}>02 · Localização</h2>
      <div style={s.grid2}>
        <Input label="País de origem" value={(artist as any).origin || ''} onChange={v => update('origin' as any, v)} />
        <Input label="Cidade de origem" value={(artist as any).originCity || ''} onChange={v => update('originCity' as any, v)} />
        <Input label="Cidade base atual" value={(artist as any).base || ''} onChange={v => update('base' as any, v)} />
        <Input label="País de residência" value={(artist as any).residenceCountry || ''} onChange={v => update('residenceCountry' as any, v)} />
      </div>
    </div>
  )
}

function Section03({ artist, update }: { artist: Artist; update: (field: keyof Artist, value: any) => void }) {
  return (
    <div>
      <h2 style={s.h2}>03 · Perfil artístico</h2>
      <Textarea label="Bio curta" value={(artist as any).bio || ''} onChange={v => update('bio' as any, v)} />
      <div style={s.grid2}>
        <Input label="Disciplinas (vírgula separa)" value={joinTags(artist.disciplines)} onChange={v => update('disciplines', splitTags(v))} />
        <Input label="Função profissional" value={joinTags(artist.specialties)} onChange={v => update('specialties', splitTags(v))} />
        <Input label="Idiomas" value={joinTags(artist.languages)} onChange={v => update('languages', splitTags(v.toUpperCase()))} />
        <Input label="Keywords" value={joinTags(artist.keywords)} onChange={v => update('keywords', splitTags(v))} />
        <Input label="Temas" value={joinTags(artist.themes)} onChange={v => update('themes', splitTags(v))} />
        <Input label="Géneros" value={joinTags(artist.genres)} onChange={v => update('genres', splitTags(v))} />
      </div>
    </div>
  )
}

function Section04({ artist, update }: { artist: Artist; update: (field: keyof Artist, value: any) => void }) {
  return (
    <div>
      <h2 style={s.h2}>04 · Países alvo</h2>
      <Input label="Países de interesse (vírgula separa, ex: ES, PT, BR, FR)" value={joinTags(artist.targetCountries)} onChange={v => update('targetCountries', splitTags(v.toUpperCase()))} />
    </div>
  )
}

function Section05({ artist, update }: { artist: Artist; update: (field: keyof Artist, value: any) => void }) {
  return (
    <div>
      <h2 style={s.h2}>05 · Mobilidade e disponibilidade</h2>
      <div style={s.checkRow}>
        <Check label="Pode viajar" checked={(artist as any).mobility?.canTravel !== false} onChange={v => update('mobility' as any, { ...(artist as any).mobility, canTravel: v })} />
        <Check label="Tem passaporte UE" checked={(artist as any).mobility?.hasEUPassport === true} onChange={v => update('mobility' as any, { ...(artist as any).mobility, hasEUPassport: v })} />
      </div>
      <div style={s.grid2}>
        <Input label="País do passaporte" value={(artist as any).mobility?.passportCountry || ''} onChange={v => update('mobility' as any, { ...(artist as any).mobility, passportCountry: v })} />
        <Input label="Cachê mínimo (€)" value={String((artist as any).minFee || '')} onChange={v => update('minFee' as any, v ? Number(v) : undefined)} />
        <Input label="Disponibilidade" value={(artist as any).availability || ''} onChange={v => update('availability' as any, v)} />
        <Input label="Necessidades de visto" value={(artist as any).mobility?.visaNotes || ''} onChange={v => update('mobility' as any, { ...(artist as any).mobility, visaNotes: v })} />
      </div>
    </div>
  )
}

function Section06({ artist, update }: { artist: Artist; update: (field: keyof Artist, value: any) => void }) {
  const mats = (artist as any).materials || {}
  function toggleMat(field: string) {
    update('materials' as any, { ...mats, [field]: !mats[field] })
  }
  return (
    <div>
      <h2 style={s.h2}>06 · Materiais</h2>
      <div style={s.checkRow}>
        {['bioPT', 'bioEN', 'bioES', 'pressPhoto', 'videoPresentation', 'technicalRider', 'pressKit'].map(k => (
          <Check key={k} label={k} checked={mats[k] === true} onChange={() => toggleMat(k)} />
        ))}
      </div>
      <div style={s.grid2}>
        <Input label="Spotify" value={mats.spotifyLink || ''} onChange={v => update('materials' as any, { ...mats, spotifyLink: v })} />
        <Input label="Bandcamp" value={mats.bandcampLink || ''} onChange={v => update('materials' as any, { ...mats, bandcampLink: v })} />
        <Input label="YouTube" value={mats.youtubeLink || ''} onChange={v => update('materials' as any, { ...mats, youtubeLink: v })} />
        <Input label="SoundCloud" value={mats.soundcloudLink || ''} onChange={v => update('materials' as any, { ...mats, soundcloudLink: v })} />
      </div>
    </div>
  )
}

function Section07({ artist, update }: { artist: Artist; update: (field: keyof Artist, value: any) => void }) {
  const projects = (artist as any).projects || []
  function addProject() {
    update('projects' as any, [...projects, { id: crypto.randomUUID(), name: '', format: '', duration: '', summary: '' }])
  }
  function updProject(id: string, field: string, value: any) {
    update('projects' as any, projects.map((p: any) => p.id === id ? { ...p, [field]: value } : p))
  }
  function removeProject(id: string) {
    update('projects' as any, projects.filter((p: any) => p.id !== id))
  }
  return (
    <div>
      <h2 style={s.h2}>07 · Projectos</h2>
      {projects.map((p: any, i: number) => (
        <div key={p.id} style={s.projectCard}>
          <strong>Projecto {i + 1}</strong>
          <div style={s.grid2}>
            <Input label="Nome" value={p.name || ''} onChange={v => updProject(p.id, 'name', v)} />
            <Input label="Formato" value={p.format || ''} onChange={v => updProject(p.id, 'format', v)} />
            <Input label="Duração" value={p.duration || ''} onChange={v => updProject(p.id, 'duration', v)} />
          </div>
          <Textarea label="Resumo" value={p.summary || ''} onChange={v => updProject(p.id, 'summary', v)} />
          <button style={s.dangerBtn} onClick={() => removeProject(p.id)}>Remover projecto</button>
        </div>
      ))}
      <button style={s.primaryBtn} onClick={addProject}>+ Adicionar projecto</button>
    </div>
  )
}

function Section09({ artist, update }: { artist: Artist; update: (field: keyof Artist, value: any) => void }) {
  const c = (artist as any).cartografia || {}
  function updRaiz(field: string, value: any) {
    update('cartografia' as any, { ...c, raiz: { ...c.raiz, [field]: value } })
  }
  function updCampo(field: string, value: any) {
    update('cartografia' as any, { ...c, campo: { ...c.campo, [field]: value } })
  }
  function updTeia(field: string, value: any) {
    update('cartografia' as any, { ...c, teia: { ...c.teia, [field]: value } })
  }
  function updRota(field: string, value: any) {
    update('cartografia' as any, { ...c, rota: { ...c.rota, [field]: value } })
  }
  return (
    <div>
      <h2 style={s.h2}>09 · Cartografia SOMA</h2>
      <details style={s.detail} open>
        <summary style={s.summary}>🌱 RAIZ — origens, tensões, vocabulário</summary>
        <Textarea label="Origens" value={c.raiz?.origins || ''} onChange={v => updRaiz('origins', v)} />
        <Textarea label="Tensões fundamentais" value={c.raiz?.tensions || ''} onChange={v => updRaiz('tensions', v)} />
        <Input label="Vocabulário (5-8 palavras únicas)" value={joinTags(c.raiz?.vocabulario)} onChange={v => updRaiz('vocabulario', splitTags(v))} />
      </details>
      <details style={s.detail}>
        <summary style={s.summary}>🎯 CAMPO — quem recebe e por quê</summary>
        <Textarea label="Perfis de audiência" value={c.campo?.audienceProfiles || ''} onChange={v => updCampo('audienceProfiles', v)} />
        <Textarea label="Motivação de adesão" value={c.campo?.motivation || ''} onChange={v => updCampo('motivation', v)} />
        <Input label="Territórios da audiência" value={joinTags(c.campo?.audienceTerritories)} onChange={v => updCampo('audienceTerritories', splitTags(v))} />
      </details>
      <details style={s.detail}>
        <summary style={s.summary}>🕸️ TEIA — estrutura do circuito</summary>
        <Textarea label="Pares (artistas similares)" value={c.teia?.pares || ''} onChange={v => updTeia('pares', v)} />
        <Textarea label="Quem legitima" value={c.teia?.legitimacy || ''} onChange={v => updTeia('legitimacy', v)} />
        <Textarea label="Redes de influência" value={c.teia?.influenceNetworks || ''} onChange={v => updTeia('influenceNetworks', v)} />
      </details>
      <details style={s.detail}>
        <summary style={s.summary}>🧭 ROTA — próximos territórios</summary>
        <Textarea label="Gaps (territórios em falta)" value={c.rota?.gaps || ''} onChange={v => updRota('gaps', v)} />
        <Input label="Corredores estratégicos" value={joinTags(c.rota?.corredores)} onChange={v => updRota('corredores', splitTags(v))} />
        <Textarea label="Plano de expansão" value={c.rota?.expansionPlan || ''} onChange={v => updRota('expansionPlan', v)} />
      </details>
    </div>
  )
}

// ─── COMPONENTES AUXILIARES ──────────────────────────────

function ProposalsView({ proposals, responding, onRespond, onOpenLink }: { proposals: Proposal[]; responding: string | null; onRespond: (id: string, accept: boolean) => void; onOpenLink: (url: string) => void }) {
  if (proposals.length === 0) {
    return (
      <div style={s.section}>
        <h2 style={s.h2}>Oportunidades para mim</h2>
        <div style={s.empty}>
          <p>Ainda nao ha oportunidades propostas para ti.</p>
          <p style={{ opacity: 0.6 }}>A equipa SOMA esta a fazer curadoria.</p>
        </div>
      </div>
    )
  }
  return (
    <div style={s.section}>
      <h2 style={s.h2}>Oportunidades para mim ({proposals.length})</h2>
      <div style={s.proposalsList}>
        {proposals.map(p => {
          const status = PROPOSAL_STATUSES.find(st => st.id === p.status)
          const isPending = p.status === 'sugerida'
          const isResponding = responding === p.id
          return (
            <article key={p.id} style={s.proposalCard}>
              <div style={s.proposalHeader}>
                <span style={{ ...s.statusBadge, background: (status && status.color) || '#666' }}>{(status && status.label) || p.status}</span>
                {p.opportunityDeadline && <span style={s.deadline}>{new Date(p.opportunityDeadline).toLocaleDateString('pt-PT')}</span>}
              </div>
              <h3 style={s.proposalTitle}>{p.opportunityTitle}</h3>
              {p.opportunityOrganization && <p style={s.proposalMeta}>{p.opportunityOrganization}{p.opportunityCountry ? ' · ' + p.opportunityCountry : ''}</p>}
              {p.producerNotes && <div style={s.notesBox}><span style={s.notesLabel}>Mensagem da {p.producerName || 'equipa SOMA'}:</span><p style={s.notes}>{p.producerNotes}</p></div>}
              {p.opportunityLink && <button type="button" onClick={() => onOpenLink(p.opportunityLink as string)} style={s.linkButton}>Ver oportunidade</button>}
              {isPending && (
                <div style={s.actions}>
                  <button style={s.acceptBtn} disabled={isResponding} onClick={() => onRespond(p.id, true)}>{isResponding ? '...' : 'Aceitar'}</button>
                  <button style={s.refuseBtn} disabled={isResponding} onClick={() => onRespond(p.id, false)}>{isResponding ? '...' : 'Recusar'}</button>
                </div>
              )}
              {p.artistResponse && <div style={s.responseBox}><span style={s.notesLabel}>A tua resposta:</span><p style={s.notes}>{p.artistResponse}</p></div>}
            </article>
          )
        })}
      </div>
    </div>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label style={s.field}><span style={s.fieldLabel}>{label}</span><input style={s.input} value={value} onChange={e => onChange(e.target.value)} /></label>
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label style={s.field}><span style={s.fieldLabel}>{label}</span><textarea style={s.textarea} value={value} onChange={e => onChange(e.target.value)} /></label>
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
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
  secondaryBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer' },
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
  responseBox: { background: 'rgba(110,243,165,0.06)', border: '1px solid rgba(110,243,165,0.2)', borderRadius: 8, padding: 12, marginTop: 12 },
  linkButton: { background: 'transparent', color: '#60b4e8', border: '1px solid rgba(96,180,232,0.3)', padding: '6px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer', marginBottom: 12 },
  actions: { display: 'flex', gap: 10, marginTop: 14 },
  acceptBtn: { background: 'rgba(110,243,165,0.18)', color: '#6ef3a5', border: '1px solid rgba(110,243,165,0.35)', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  refuseBtn: { background: 'rgba(255,70,70,0.12)', color: '#ff8a8a', border: '1px solid rgba(255,70,70,0.25)', padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' },
}