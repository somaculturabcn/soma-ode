// src/components/ProposeOpportunityButton.tsx
// SOMA ODÉ — Botão para propor uma oportunidade a uma artista

import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { loadArtistsFromSupabase } from '../data/artistsSupabaseStore'
import { addProposalToSupabase } from '../data/proposalsSupabaseStore'
import type { Artist } from '../types/artist'

type Props = {
  opportunity: any
}

export default function ProposeOpportunityButton({ opportunity }: Props) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [artists, setArtists] = useState<Artist[]>([])
  const [selectedArtist, setSelectedArtist] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (open && artists.length === 0) {
      loadArtistsFromSupabase()
        .then(data => setArtists((data || []).filter(Boolean)))
        .catch(err => console.error(err))
    }
  }, [open, artists.length])

  async function submit() {
    if (!selectedArtist) {
      alert('Escolhe um artista.')
      return
    }

    setSaving(true)
    try {
      const artist = artists.find(a => a.id === selectedArtist)

      await addProposalToSupabase({
        artistId: selectedArtist,
        artistName: artist?.name || '',
        producerId: user?.id,
        producerName: user?.email,

        opportunityId: opportunity.id,
        opportunityTitle: opportunity.title || 'Sem título',
        opportunityOrganization: opportunity.organization || '',
        opportunityCountry: opportunity.country || opportunity.countryName || '',
        opportunityDeadline: opportunity.deadline || undefined,
        opportunityLink: opportunity.link || opportunity.url || '',

        status: 'sugerida',
        producerNotes: notes,
      })

      setDone(true)
      setTimeout(() => {
        setOpen(false)
        setDone(false)
        setNotes('')
        setSelectedArtist('')
      }, 1500)
    } catch (err) {
      console.error(err)
      alert('Erro a criar proposta.')
    }
    setSaving(false)
  }

  return (
    <>
      <button style={s.openBtn} onClick={() => setOpen(true)}>
        📨 Propor a artista
      </button>

      {open && (
        <div style={s.overlay} onClick={() => !saving && setOpen(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.title}>Propor oportunidade</h3>
            <p style={s.subtitle}>{opportunity.title}</p>

            {done ? (
              <div style={s.done}>
                ✓ Proposta enviada com sucesso à artista.
              </div>
            ) : (
              <>
                <label style={s.label}>
                  Escolher artista
                  <select
                    style={s.input}
                    value={selectedArtist}
                    onChange={e => setSelectedArtist(e.target.value)}
                  >
                    <option value="">— escolhe um artista —</option>
                    {artists.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name || 'sem nome'}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={s.label}>
                  Notas para a artista
                  <textarea
                    style={s.textarea}
                    rows={5}
                    placeholder="Ex: achei que faz sentido para o teu trabalho com..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </label>

                <div style={s.actions}>
                  <button style={s.cancelBtn} onClick={() => setOpen(false)} disabled={saving}>
                    Cancelar
                  </button>
                  <button style={s.submitBtn} onClick={submit} disabled={saving || !selectedArtist}>
                    {saving ? 'A enviar...' : 'Enviar proposta'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const s: Record<string, React.CSSProperties> = {
  openBtn: {
    background: 'rgba(192,132,252,0.15)',
    color: '#c084fc',
    border: '1px solid rgba(192,132,252,0.35)',
    borderRadius: 6,
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    background: '#0a0a0a',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 24,
    color: '#fff',
  },
  title: { margin: 0, fontSize: 20, color: '#60b4e8' },
  subtitle: { margin: '4px 0 18px', color: 'rgba(255,255,255,0.55)', fontSize: 13 },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 14,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: '0.05em',
  },
  input: {
    background: '#000',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 6,
    padding: '10px 12px',
    fontSize: 13,
    outline: 'none',
  },
  textarea: {
    background: '#000',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 6,
    padding: 12,
    fontSize: 13,
    outline: 'none',
    resize: 'vertical',
  },
  actions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  cancelBtn: {
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    padding: '10px 16px',
    fontSize: 13,
    cursor: 'pointer',
  },
  submitBtn: {
    background: '#1A6994',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '10px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
  done: {
    padding: 14,
    background: 'rgba(110,243,165,0.12)',
    border: '1px solid rgba(110,243,165,0.3)',
    borderRadius: 8,
    color: '#6ef3a5',
    textAlign: 'center',
    fontSize: 14,
  },
}