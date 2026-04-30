// src/components/ArtistPortal.tsx
// SOMA ODÉ — Portal do Artista (Editável, guarda no Supabase)
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { loadArtistByUserId, saveArtistToSupabase } from '../data/artistsSupabaseStore'
import { loadProposalsForArtist, updateProposalStatusInSupabase } from '../data/proposalsSupabaseStore'
import type { Artist } from '../types/artist'
import type { Proposal } from '../types/proposal'
import { PROPOSAL_STATUSES } from '../types/proposal'
import { materialsCount, cartografiaCount } from '../types/artist'

export default function ArtistPortal() {
  const { user } = useAuth()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [view, setView] = useState<'profile' | 'proposals'>('profile')
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
        <section style={s.section}>
          <h2 style={s.h2}>Meu Perfil</h2>
          <div style={s.grid2}>
            <Input label="Nome artistico" value={artist.name} onChange={v => update('name', v)} />
            <Input label="Email" value={artist.email || ''} onChange={v => update('email', v)} />
            <Input label="Pronomes" value={(artist as any).pronouns || ''} onChange={v => update('pronouns' as any, v)} />
            <Input label="Telefone" value={(artist as any).phone || ''} onChange={v => update('phone' as any, v)} />
            <Input label="Instagram" value={(artist as any).instagram || ''} onChange={v => update('instagram' as any, v)} />
            <Input label="Website" value={(artist as any).website || ''} onChange={v => update('website' as any, v)} />
            <Input label="Cidade base" value={(artist as any).base || ''} onChange={v => update('base' as any, v)} />
            <Input label="País origem" value={(artist as any).origin || ''} onChange={v => update('origin' as any, v)} />
          </div>

          <Textarea label="Bio" value={(artist as any).bio || ''} onChange={v => update('bio' as any, v)} />

          <div style={s.grid2}>
            <Input
              label="Disciplinas (separar por vírgula)"
              value={joinTags(artist.disciplines)}
              onChange={v => update('disciplines', splitTags(v))}
            />
            <Input
              label="Idiomas (separar por vírgula)"
              value={joinTags(artist.languages)}
              onChange={v => update('languages', splitTags(v.toUpperCase()))}
            />
          </div>

          <div style={s.footer}>
            <button style={s.primaryBtn} onClick={saveProfile} disabled={saving}>
              {saving ? 'A guardar...' : 'Guardar Perfil'}
            </button>
          </div>
        </section>
      )}

      {view === 'proposals' && (
        <ProposalsView proposals={proposals} responding={responding} onRespond={respondProposal} onOpenLink={openLink} />
      )}
    </div>
  )
}

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
                <span style={{ ...s.statusBadge, background: (status && status.color) || '#666' }}>
                  {(status && status.label) || p.status}
                </span>
                {p.opportunityDeadline && (
                  <span style={s.deadline}>
                    {new Date(p.opportunityDeadline).toLocaleDateString('pt-PT')}
                  </span>
                )}
              </div>
              <h3 style={s.proposalTitle}>{p.opportunityTitle}</h3>
              {p.opportunityOrganization && (
                <p style={s.proposalMeta}>
                  {p.opportunityOrganization}
                  {p.opportunityCountry ? ' · ' + p.opportunityCountry : ''}
                </p>
              )}
              {p.producerNotes && (
                <div style={s.notesBox}>
                  <span style={s.notesLabel}>Mensagem da {p.producerName || 'equipa SOMA'}:</span>
                  <p style={s.notes}>{p.producerNotes}</p>
                </div>
              )}
              {p.opportunityLink && (
                <button type="button" onClick={() => onOpenLink(p.opportunityLink as string)} style={s.linkButton}>
                  Ver oportunidade
                </button>
              )}
              {isPending && (
                <div style={s.actions}>
                  <button style={s.acceptBtn} disabled={isResponding} onClick={() => onRespond(p.id, true)}>
                    {isResponding ? '...' : 'Aceitar'}
                  </button>
                  <button style={s.refuseBtn} disabled={isResponding} onClick={() => onRespond(p.id, false)}>
                    {isResponding ? '...' : 'Recusar'}
                  </button>
                </div>
              )}
              {p.artistResponse && (
                <div style={s.responseBox}>
                  <span style={s.notesLabel}>A tua resposta:</span>
                  <p style={s.notes}>{p.artistResponse}</p>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label style={s.field}>
      <span style={s.fieldLabel}>{label}</span>
      <input style={s.input} value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label style={s.field}>
      <span style={s.fieldLabel}>{label}</span>
      <textarea style={s.textarea} value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

const s: Record<string, React.CSSProperties> = {
  center: { padding: 60, textAlign: 'center', color: '#fff' },
  empty: { padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.6)' },
  wrap: { maxWidth: 1100, margin: '0 auto', padding: '32px 22px', color: '#fff' },
  hero: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28,
    flexWrap: 'wrap', gap: 20, paddingBottom: 22, borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  title: { margin: 0, fontSize: 34, color: '#fff' },
  subtitle: { margin: '6px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: 14 },
  heroStats: { display: 'flex', gap: 24 },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  statValue: { fontSize: 22, fontWeight: 700, color: '#60b4e8' },
  tabs: { display: 'flex', gap: 8, marginBottom: 24 },
  tab: {
    background: 'transparent', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.14)',
    padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  tabActive: { background: '#1A6994', color: '#fff', border: '1px solid #1A6994' },
  badge: { background: '#ffcf5c', color: '#000', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10 },
  section: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 },
  h2: { color: '#60b4e8', fontSize: 20, marginTop: 0, marginBottom: 18 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 },
  fieldLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  input: {
    background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8,
    padding: '10px 12px', fontSize: 13, outline: 'none',
  },
  textarea: {
    background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8,
    padding: 12, fontSize: 13, minHeight: 95, outline: 'none', resize: 'vertical', fontFamily: 'inherit',
  },
  footer: { display: 'flex', justifyContent: 'flex-end', marginTop: 18 },
  primaryBtn: {
    background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px',
    fontSize: 13, fontWeight: 800, cursor: 'pointer',
  },
  message: {
    background: 'rgba(96,180,232,0.12)', border: '1px solid rgba(96,180,232,0.25)', color: '#b8e2ff',
    borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 13,
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
  responseBox: { background: 'rgba(110,243,165,0.06)', border: '1px solid rgba(110,243,165,0.2)', borderRadius: 8, padding: 12, marginTop: 12 },
  linkButton: {
    background: 'transparent', color: '#60b4e8', border: '1px solid rgba(96,180,232,0.3)', padding: '6px 12px',
    borderRadius: 6, fontSize: 13, cursor: 'pointer', marginBottom: 12,
  },
  actions: { display: 'flex', gap: 10, marginTop: 14 },
  acceptBtn: {
    background: 'rgba(110,243,165,0.18)', color: '#6ef3a5', border: '1px solid rgba(110,243,165,0.35)',
    padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  refuseBtn: {
    background: 'rgba(255,70,70,0.12)', color: '#ff8a8a', border: '1px solid rgba(255,70,70,0.25)',
    padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
}