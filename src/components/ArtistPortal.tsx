// src/components/ArtistPortal.tsx
// SOMA ODÉ — Portal do Artista
// O artista vê o seu perfil + propostas curatoriais que a SOMA lhe envia

import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { loadArtistByUserId } from '../data/artistsSupabaseStore'
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
  const [view, setView] = useState<'profile' | 'proposals'>('profile')
  const [responding, setResponding] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      load()
    }
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
    }

    setLoading(false)
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
    }
    setResponding(null)
  }

  // ─── LOADING ────────────────────────────────────────

  if (loading) {
    return <div style={s.center}>⏳ A carregar o teu perfil...</div>
  }

  // ─── ARTISTA NÃO LIGADO ─────────────────────────────

  if (!artist) {
    return (
      <div style={s.empty}>
        <h2 style={s.h2}>Bem-vindo/a ao SOMA ODÉ</h2>
        <p style={s.subtitle}>
          O teu perfil ainda não foi configurado pela equipa SOMA.
        </p>
        <p style={s.subtitle}>
          Por favor, contacta a SOMA Cultura para activar o teu acesso:
          <br />
          <a href="mailto:somaculturabcn@gmail.com" style={s.link}>
            somaculturabcn@gmail.com
          </a>
        </p>
      </div>
    )
  }

  // ─── PORTAL ─────────────────────────────────────────

  const m = materialsCount(artist.materials)
  const c = cartografiaCount(artist.cartografia)

  const proposalsActive = proposals.filter(p =>
    !['recusada', 'recusada_externamente'].includes(p.status)
  )

  return (
    <div style={s.wrap}>
      {/* Hero */}
      <header style={s.hero}>
        <div>
          <h1 style={s.title}>{artist.name || 'Artista'}</h1>
          <p style={s.subtitle}>
            {[artist.base, artist.origin].filter(Boolean).join(' · ') || 'Localização por preencher'}
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

      {/* Tabs */}
      <nav style={s.tabs}>
        <button
          onClick={() => setView('profile')}
          style={{ ...s.tab, ...(view === 'profile' ? s.tabActive : {}) }}
        >
          🎨 Meu Perfil
        </button>
        <button
          onClick={() => setView('proposals')}
          style={{ ...s.tab, ...(view === 'proposals' ? s.tabActive : {}) }}
        >
          📨 Oportunidades para mim
          {proposalsActive.length > 0 && (
            <span style={s.badge}>{proposalsActive.length}</span>
          )}
        </button>
      </nav>

      {/* Content */}
      {view === 'profile' && <ProfileView artist={artist} />}
      {view === 'proposals' && (
        <ProposalsView
          proposals={proposals}
          responding={responding}
          onRespond={respondProposal}
        />
      )}
    </div>
  )
}

// ─── Profile View ───────────────────────────────────────

function ProfileView({ artist }: { artist: Artist }) {
  return (
    <div style={s.section}>
      <h2 style={s.h2}>Perfil</h2>

      <div style={s.grid2}>
        <Field label="Nome artístico" value={artist.name} />
        <Field label="Email" value={artist.email} />
        <Field label="Pronomes" value={artist.pronouns} />
        <Field label="Telefone" value={artist.phone} />
        <Field label="Instagram" value={artist.instagram} />
        <Field label="Website" value={artist.website} />
        <Field label="Cidade base" value={artist.base} />
        <Field label="País origem" value={artist.origin} />
      </div>

      {artist.bio && (
        <div style={s.bioBox}>
          <span style={s.fieldLabel}>Bio</span>
          <p style={s.bio}>{artist.bio}</p>
        </div>
      )}

      {artist.disciplines && artist.disciplines.length > 0 && (
        <div style={s.tagsBox}>
          <span style={s.fieldLabel}>Disciplinas</span>
          <div style={s.tags}>
            {artist.disciplines.map(d => (
              <span key={d} style={s.tag}>{d}</span>
            ))}
          </div>
        </div>
      )}

      {artist.cartografia?.raiz?.vocabulario && artist.cartografia.raiz.vocabulario.length > 0 && (
        <div style={s.tagsBox}>
          <span style={s.fieldLabel}>⭐ Vocabulário Cartografia</span>
          <div style={s.tags}>
            {artist.cartografia.raiz.vocabulario.map(v => (
              <span key={v} style={s.tagHighlight}>{v}</span>
            ))}
          </div>
        </div>
      )}

      <div style={s.note}>
        💡 Para editar o teu perfil ou preencher mais informação, contacta a equipa SOMA.
        <br />
        <span style={{ opacity: 0.6 }}>Em breve poderás editar directamente daqui.</span>
      </div>
    </div>
  )
}

// ─── Proposals View ─────────────────────────────────────

function ProposalsView({
  proposals,
  responding,
  onRespond,
}: {
  proposals: Proposal[]
  responding: string | null
  onRespond: (id: string, accept: boolean) => void
}) {
  if (proposals.length === 0) {
    return (
      <div style={s.section}>
        <h2 style={s.h2}>Oportunidades para mim</h2>
        <div style={s.empty}>
          <p>Ainda não há oportunidades propostas para ti.</p>
          <p style={{ opacity: 0.6 }}>
            A equipa SOMA está a fazer curadoria — quando algo fizer sentido para o teu trabalho, aparece aqui.
          </p>
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
                <span
                  style={{ ...s.statusBadge, background: status?.color || '#666' }}
                >
                  {status?.label || p.status}
                </span>
                {p.opportunityDeadline && (
                  <span style={s.deadline}>
                    📅 {new Date(p.opportunityDeadline).toLocaleDateString('pt-PT')}
                  </span>
                )}
              </div>

              <h3 style={s.proposalTitle}>{p.opportunityTitle}</h3>

              {p.opportunityOrganization && (
                <p style={s.proposalMeta}>
                  {p.opportunityOrganization}
                  {p.opportunityCountry && ` · ${p.opportunityCountry}`}
                </p>
              )}

              {p.producerNotes && (
                <div style={s.notesBox}>
                  <span style={s.notesLabel}>
                    💬 Mensagem da {p.producerName || 'equipa SOMA'}:
                  </span>
                  <p style={s.notes}>{p.producerNotes}</p>
                </div>
              )}

              {p.opportunityLink && (
                
                  href={p.opportunityLink}
                  target="_blank"
                  rel="noreferrer"
                  style={s.opportunityLink}
                >
                  🔗 Ver oportunidade →
                </a>
              )}

              {isPending && (
                <div style={s.actions}>
                  <button
                    style={s.acceptBtn}
                    disabled={isResponding}
                    onClick={() => onRespond(p.id, true)}
                  >
                    {isResponding ? '...' : '✓ Aceitar'}
                  </button>
                  <button
                    style={s.refuseBtn}
                    disabled={isResponding}
                    onClick={() => onRespond(p.id, false)}
                  >
                    {isResponding ? '...' : '✗ Recusar'}
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

// ─── Field helper ───────────────────────────────────────

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div style={s.field}>
      <span style={s.fieldLabel}>{label}</span>
      <span style={s.fieldValue}>{value || <em style={{ opacity: 0.4 }}>vazio</em>}</span>
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  center: { padding: 60, textAlign: 'center', color: '#fff' },
  empty: { padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.6)' },

  wrap: { maxWidth: 1100, margin: '0 auto', padding: '32px 22px', color: '#fff' },

  hero: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
    flexWrap: 'wrap',
    gap: 20,
    paddingBottom: 22,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  title: { margin: 0, fontSize: 34, color: '#fff' },
  subtitle: { margin: '6px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: 14 },

  heroStats: { display: 'flex', gap: 24 },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  statValue: { fontSize: 22, fontWeight: 700, color: '#60b4e8' },

  tabs: { display: 'flex', gap: 8, marginBottom: 24 },
  tab: {
    background: 'transparent',
    color: 'rgba(255,255,255,0.65)',
    border: '1px solid rgba(255,255,255,0.14)',
    padding: '10px 18px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  tabActive: {
    background: '#1A6994',
    color: '#fff',
    border: '1px solid #1A6994',
  },
  badge: {
    background: '#ffcf5c',
    color: '#000',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 10,
  },

  section: {
    background: '#0a0a0a',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 24,
  },
  h2: { color: '#60b4e8', fontSize: 20, marginTop: 0, marginBottom: 18 },

  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 14,
    marginBottom: 18,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  fieldLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  fieldValue: { color: '#fff', fontSize: 14 },

  bioBox: { marginBottom: 18, padding: 14, background: '#000', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' },
  bio: { margin: '6px 0 0', color: 'rgba(255,255,255,0.78)', lineHeight: 1.6 },

  tagsBox: { marginBottom: 18 },
  tags: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  tag: { background: 'rgba(26,105,148,0.18)', color: '#60b4e8', padding: '4px 10px', borderRadius: 20, fontSize: 12 },
  tagHighlight: { background: 'rgba(255,207,92,0.18)', color: '#ffcf5c', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },

  note: {
    marginTop: 18,
    padding: 14,
    background: 'rgba(26,105,148,0.08)',
    border: '1px solid rgba(26,105,148,0.25)',
    borderRadius: 8,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 1.5,
  },

  proposalsList: { display: 'grid', gap: 14 },
  proposalCard: {
    background: '#000',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 18,
  },
  proposalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  statusBadge: { color: '#000', padding: '3px 10px', borderRadius: 14, fontSize: 11, fontWeight: 700 },
  deadline: { color: '#ffcf5c', fontSize: 12, fontWeight: 600 },
  proposalTitle: { margin: '0 0 6px', fontSize: 18, color: '#fff' },
  proposalMeta: { margin: '0 0 12px', color: 'rgba(255,255,255,0.55)', fontSize: 13 },

  notesBox: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12, marginBottom: 12 },
  notesLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em' },
  notes: { margin: '4px 0 0', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, fontSize: 13 },

  responseBox: { background: 'rgba(110,243,165,0.06)', border: '1px solid rgba(110,243,165,0.2)', borderRadius: 8, padding: 12, marginTop: 12 },

  opportunityLink: { color: '#60b4e8', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 12 },

  link: { color: '#60b4e8', textDecoration: 'none' },

  actions: { display: 'flex', gap: 10, marginTop: 14 },
  acceptBtn: {
    background: 'rgba(110,243,165,0.18)',
    color: '#6ef3a5',
    border: '1px solid rgba(110,243,165,0.35)',
    padding: '10px 18px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  refuseBtn: {
    background: 'rgba(255,70,70,0.12)',
    color: '#ff8a8a',
    border: '1px solid rgba(255,70,70,0.25)',
    padding: '10px 18px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
}