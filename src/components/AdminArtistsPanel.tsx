// src/components/AdminArtistsPanel.tsx
// SOMA ODÉ v7 — Painel Admin de Artistas (CRUD completo)
// Admin pode: listar todos, ver/editar perfil, registar novo, apagar

import { useState, useEffect, useCallback } from 'react'
import type { Artist } from '../types/artist'
import { emptyArtist } from '../types/artist'
import { loadArtistsFromSupabase, saveArtistToSupabase, deleteArtistFromSupabase } from '../data/artistsSupabaseStore'

// ── Sub-componentes ──────────────────────────────────────────────────────

function ArtistFormModal({ artist, onSave, onClose }: {
  artist: Artist | null
  onSave: (a: Artist) => void
  onClose: () => void
}) {
  const isEdit = !!artist
  const [form, setForm] = useState<Artist>(() => {
    if (artist) return { ...artist }
    return { id: 'artist-' + Date.now(), ...emptyArtist() } as Artist
  })
  const [saving, setSaving] = useState(false)

  function u(field: keyof Artist, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function splitComma(v: string): string[] {
    return v.split(',').map(s => s.trim()).filter(Boolean)
  }

  async function handleSave() {
    if (!form.name?.trim() && !form.artisticName?.trim()) {
      alert('Nome artístico é obrigatório')
      return
    }
    setSaving(true)
    try {
      const toSave = {
        ...form,
        name: form.name || form.artisticName || '',
        updatedAt: new Date().toISOString(),
      }
      await saveArtistToSupabase(toSave)
      onSave(toSave)
    } catch (err: any) {
      alert('Erro ao guardar: ' + (err?.message || 'desconhecido'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={modal.overlay} onClick={onClose}>
      <div style={modal.box} onClick={e => e.stopPropagation()}>
        <div style={modal.header}>
          <h2 style={modal.title}>{isEdit ? `Editar: ${form.name || form.artisticName}` : 'Novo Artista'}</h2>
          <button onClick={onClose} style={modal.closeBtn}>✕</button>
        </div>

        <div style={modal.scroll}>
          {/* 01 · Identidade */}
          <Section title="01 · Identidade">
            <Grid>
              <Input label="Nome artístico *" value={form.name || form.artisticName || ''} onChange={v => { u('name', v); u('artisticName', v) }} />
              <Input label="Nome legal" value={form.legalName || ''} onChange={v => u('legalName', v)} />
              <Input label="Pronomes" value={form.pronouns || ''} onChange={v => u('pronouns', v)} placeholder="ele/dele, ela/dela..." />
              <Input label="Email" value={form.email || ''} onChange={v => u('email', v)} type="email" />
              <Input label="Telefone" value={form.phone || ''} onChange={v => u('phone', v)} />
              <Input label="Instagram" value={form.instagram || ''} onChange={v => u('instagram', v)} placeholder="@handle" />
              <Input label="Website" value={form.website || ''} onChange={v => u('website', v)} />
              <Input label="Link vídeo" value={form.videoLink || ''} onChange={v => u('videoLink', v)} />
            </Grid>
          </Section>

          {/* 02 · Localização */}
          <Section title="02 · Localização">
            <Grid>
              <Input label="País de origem" value={form.origin || ''} onChange={v => u('origin', v)} placeholder="BR, CO, SN..." />
              <Input label="Cidade de origem" value={form.originCity || ''} onChange={v => u('originCity', v)} />
              <Input label="Base atual" value={form.base || ''} onChange={v => u('base', v)} placeholder="Barcelona, Lisboa..." />
              <Input label="País residência" value={form.residenceCountry || ''} onChange={v => u('residenceCountry', v)} placeholder="ES, PT..." />
              <Input label="Países-alvo (vírgulas)" value={(form.targetCountries || []).join(', ')} onChange={v => u('targetCountries', splitComma(v))} wide placeholder="ES, FR, NL, DE..." />
            </Grid>
          </Section>

          {/* 03 · Perfil artístico */}
          <Section title="03 · Perfil artístico">
            <Grid>
              <Input label="Disciplinas (vírgulas)" value={(form.disciplines || []).join(', ')} onChange={v => u('disciplines', splitComma(v))} wide placeholder="musica, performance, danca..." />
              <Input label="Especialidades" value={(form.specialties || []).join(', ')} onChange={v => u('specialties', splitComma(v))} wide placeholder="funk, afrobeat, teatro físico..." />
              <Input label="Idiomas" value={(form.languages || []).join(', ')} onChange={v => u('languages', splitComma(v))} placeholder="pt, en, es, fr..." />
              <Input label="Géneros" value={(form.genres || []).join(', ')} onChange={v => u('genres', splitComma(v))} placeholder="funk, hip-hop, experimental..." />
              <Input label="Keywords" value={(form.keywords || []).join(', ')} onChange={v => u('keywords', splitComma(v))} wide placeholder="afro-brasileiro, diáspora, LGBTQIA+..." />
            </Grid>
            <div style={{ marginTop: 10 }}>
              <label style={inp.label}>Bio</label>
              <textarea
                style={{ ...inp.input, minHeight: 100, resize: 'vertical' }}
                value={form.bio || ''}
                onChange={e => u('bio', e.target.value)}
                placeholder="Biografia do artista..."
              />
            </div>
          </Section>

          {/* 04 · Mobilidade */}
          <Section title="04 · Mobilidade">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              <CheckItem label="Pode viajar" checked={form.mobility?.canTravel !== false} onChange={v => u('mobility', { ...form.mobility, canTravel: v })} />
              <CheckItem label="Passaporte UE" checked={!!form.mobility?.hasEUPassport} onChange={v => u('mobility', { ...form.mobility, hasEUPassport: v })} />
              <CheckItem label="Conta bancária UE" checked={!!form.mobility?.hasEUBankAccount} onChange={v => u('mobility', { ...form.mobility, hasEUBankAccount: v })} />
              <CheckItem label="Conta bancária BR" checked={!!form.mobility?.hasBRBankAccount} onChange={v => u('mobility', { ...form.mobility, hasBRBankAccount: v })} />
            </div>
            <Grid>
              <Input label="País do passaporte" value={form.mobility?.passportCountry || ''} onChange={v => u('mobility', { ...form.mobility, passportCountry: v })} />
              <Input label="Notas de visto" value={form.mobility?.visaNotes || ''} onChange={v => u('mobility', { ...form.mobility, visaNotes: v })} />
            </Grid>
          </Section>

          {/* 05 · Materiais disponíveis */}
          <Section title="05 · Materiais disponíveis">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {(['bioPT', 'bioEN', 'bioES', 'pressPhoto', 'videoPresentation', 'technicalRider', 'pressKit', 'pressClippings'] as const).map(k => (
                <CheckItem key={k} label={k.replace(/([A-Z])/g, ' $1').trim()} checked={!!(form.materials as any)?.[k]} onChange={v => u('materials', { ...form.materials, [k]: v })} />
              ))}
            </div>
          </Section>

          {/* 06 · Financeiro */}
          <Section title="06 · Financeiro e disponibilidade">
            <Grid>
              <Input label="Cachê mínimo (€)" value={form.minFee ? String(form.minFee) : ''} onChange={v => u('minFee', v ? Number(v) : 0)} type="number" />
              <Input label="Disponibilidade" value={form.availability || ''} onChange={v => u('availability', v)} placeholder="Imediata, a partir de março..." />
            </Grid>
            <div style={{ marginTop: 8 }}>
              <CheckItem label="Artista ativo" checked={form.active !== false} onChange={v => u('active', v)} />
            </div>
          </Section>
        </div>

        {/* Actions */}
        <div style={modal.actions}>
          <button onClick={onClose} style={modal.cancelBtn}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={modal.saveBtn}>
            {saving ? 'A guardar...' : isEdit ? 'Atualizar artista' : 'Registar artista'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Helper sub-components ─────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, marginTop: 16 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 12, color: '#60b4e8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</h3>
      {children}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>{children}</div>
}

function Input({ label, value, onChange, type, placeholder, wide }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; wide?: boolean
}) {
  return (
    <div style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <label style={inp.label}>{label}</label>
      <input
        style={inp.input}
        type={type || 'text'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#ddd', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

// ── Painel principal ──────────────────────────────────────────────────────

export default function AdminArtistsPanel() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Artist | null | 'new'>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Supabase
      const fromDb = await loadArtistsFromSupabase()
      // localStorage fallback
      let fromLocal: Artist[] = []
      try {
        const raw = localStorage.getItem('soma_artist_profile')
        if (raw) {
          const p = JSON.parse(raw)
          if (p && p.name) {
            fromLocal = [{ id: 'local-profile', ...p, createdAt: p.createdAt || new Date().toISOString() }]
          }
        }
      } catch { /* */ }

      // Merge: Supabase primeiro, depois locais que não existam no DB
      const dbIds = new Set(fromDb.map(a => a.id))
      const merged = [...fromDb, ...fromLocal.filter(a => !dbIds.has(a.id))]
      setArtists(merged)
    } catch {
      // fallback to localStorage only
      try {
        const raw = localStorage.getItem('soma_artist_profile')
        if (raw) {
          const p = JSON.parse(raw)
          if (p && p.name) setArtists([{ id: 'local-profile', ...p }])
        }
      } catch { /* */ }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = artists.filter(a => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const hay = `${a.name} ${a.artisticName || ''} ${a.email || ''} ${(a.disciplines || []).join(' ')} ${a.base || ''} ${a.origin || ''}`.toLowerCase()
    return hay.includes(q)
  })

  async function handleDelete(a: Artist) {
    if (!confirm(`Apagar "${a.name || a.artisticName}"? Esta ação não pode ser desfeita.`)) return
    try {
      if (!a.id.startsWith('local-')) {
        await deleteArtistFromSupabase(a.id)
      }
      setArtists(prev => prev.filter(x => x.id !== a.id))
    } catch (err: any) {
      alert('Erro: ' + (err?.message || 'desconhecido'))
    }
  }

  function handleSave(saved: Artist) {
    setArtists(prev => {
      const idx = prev.findIndex(a => a.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
    setEditing(null)
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: '#60b4e8' }}>🎤 Gestão de Artistas</h1>
          <span style={{ fontSize: 11, color: '#ffcf5c', background: 'rgba(255,207,92,0.1)', padding: '2px 8px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>
            ADMIN — {artists.length} artista{artists.length !== 1 ? 's' : ''} registado{artists.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={() => setEditing('new')} style={{
          background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          + Novo Artista
        </button>
      </div>

      {/* Search */}
      <input
        style={{
          width: '100%', boxSizing: 'border-box',
          background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff',
          marginBottom: 16, outline: 'none',
        }}
        placeholder="🔍 Buscar por nome, disciplina, cidade..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.4)' }}>
          A carregar artistas...
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
          {search ? 'Nenhum artista encontrado com esses filtros.' : 'Ainda não há artistas registados. Clica em "+ Novo Artista" para começar.'}
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(a => {
            const isExpanded = expandedId === a.id
            return (
              <div key={a.id} style={{
                background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12, overflow: 'hidden',
              }}>
                {/* Row header */}
                <div
                  style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: 'rgba(96,180,232,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, color: '#60b4e8', fontWeight: 700, flexShrink: 0,
                    }}>
                      {(a.name || a.artisticName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.name || a.artisticName || 'Sem nome'}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {a.base && <span>📍 {a.base}</span>}
                        {(a.disciplines || []).length > 0 && <span>🎭 {a.disciplines.slice(0, 3).join(', ')}</span>}
                        {a.email && <span>✉ {a.email}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                      background: a.active !== false ? 'rgba(110,243,165,0.1)' : 'rgba(249,112,102,0.1)',
                      color: a.active !== false ? '#6ef3a5' : '#f97066',
                    }}>
                      {a.active !== false ? 'Ativo' : 'Inativo'}
                    </span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginTop: 12 }}>
                      <DetailItem label="Nome legal" value={a.legalName} />
                      <DetailItem label="Pronomes" value={a.pronouns} />
                      <DetailItem label="Origem" value={a.origin} />
                      <DetailItem label="Base" value={a.base} />
                      <DetailItem label="Idiomas" value={(a.languages || []).join(', ')} />
                      <DetailItem label="Keywords" value={(a.keywords || []).join(', ')} />
                      <DetailItem label="Géneros" value={(a.genres || []).join(', ')} />
                      <DetailItem label="Países-alvo" value={(a.targetCountries || []).join(', ')} />
                      <DetailItem label="Passaporte UE" value={a.mobility?.hasEUPassport ? 'Sim' : 'Não'} />
                      <DetailItem label="Cachê mínimo" value={a.minFee ? `€${a.minFee}` : undefined} />
                      <DetailItem label="Projetos" value={a.projects?.length ? `${a.projects.length} projeto(s)` : undefined} />
                      <DetailItem label="Instagram" value={a.instagram} />
                    </div>
                    {a.bio && (
                      <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxHeight: 100, overflow: 'auto' }}>
                        {a.bio}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                      <button onClick={() => setEditing(a)} style={actBtn('#1A6994')}>✏️ Editar</button>
                      <button onClick={() => handleDelete(a)} style={actBtn('#7f1d1d')}>🗑 Apagar</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {editing !== null && (
        <ArtistFormModal
          artist={editing === 'new' ? null : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#fff' }}>{value}</div>
    </div>
  )
}

function actBtn(bg: string): React.CSSProperties {
  return {
    background: bg, color: '#fff', border: 'none', borderRadius: 6,
    padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
  }
}

// ── Styles ────────────────────────────────────────────────────────────────

const inp = {
  label: {
    display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)',
    marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.04em',
  },
  input: {
    width: '100%', boxSizing: 'border-box' as const,
    background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none',
    fontFamily: 'inherit',
  },
}

const modal: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16,
  },
  box: {
    background: '#050505', border: '1px solid #1A6994', borderRadius: 16,
    width: 'min(900px, 96vw)', maxHeight: '94vh', display: 'flex', flexDirection: 'column',
    boxShadow: '0 0 40px rgba(26,105,148,0.3)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  title: { margin: 0, fontSize: 20, color: '#fff', fontWeight: 800 },
  closeBtn: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
    fontSize: 18, cursor: 'pointer', padding: 4,
  },
  scroll: {
    flex: 1, overflowY: 'auto', padding: '0 24px 16px',
  },
  actions: {
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  cancelBtn: {
    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
    border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer',
  },
  saveBtn: {
    background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8,
    padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
}
