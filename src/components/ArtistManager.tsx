// src/components/ArtistManager.tsx
// SOMA ODÉ — Artist Manager (Supabase version)

import { useEffect, useState } from 'react'
import {
  loadArtistsFromSupabase,
  saveArtistToSupabase,
  deleteArtistFromSupabase,
} from '../data/artistsSupabaseStore'

// ─── Tipo simplificado (podes expandir depois) ─────────────────

type Artist = {
  id: string
  name: string
  email: string
  base: string
  origin: string
  disciplines: string[]
  bio: string
}

// ─── Componente ────────────────────────────────────────────────

export default function ArtistManager() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [editing, setEditing] = useState<Artist | null>(null)
  const [loading, setLoading] = useState(true)

  // ─── LOAD ────────────────────────────────────────────────────

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const data = await loadArtistsFromSupabase()
      setArtists(data)
    } catch (err) {
      console.error(err)
      alert('Erro ao carregar artistas')
    }
    setLoading(false)
  }

  // ─── CRUD ────────────────────────────────────────────────────

  function newArtist() {
    setEditing({
      id: crypto.randomUUID(),
      name: '',
      email: '',
      base: '',
      origin: '',
      disciplines: [],
      bio: '',
    })
  }

  async function save() {
    if (!editing) return

    if (!editing.name.trim()) {
      alert('Nome obrigatório')
      return
    }

    try {
      await saveArtistToSupabase(editing)
      await load()
      setEditing(null)
    } catch (err) {
      console.error(err)
      alert('Erro ao guardar artista')
    }
  }

  async function remove(id: string) {
    if (!confirm('Apagar artista?')) return

    try {
      await deleteArtistFromSupabase(id)
      await load()
    } catch (err) {
      console.error(err)
      alert('Erro ao apagar artista')
    }
  }

  function update(field: keyof Artist, value: any) {
    if (!editing) return
    setEditing({ ...editing, [field]: value })
  }

  // ─── UI LISTA ────────────────────────────────────────────────

  if (loading) {
    return <div style={{ padding: 20 }}>Carregando...</div>
  }

  if (!editing) {
    return (
      <div style={styles.wrap}>
        <h2>Artistas ({artists.length})</h2>

        <button style={styles.primary} onClick={newArtist}>
          + Novo artista
        </button>

        {artists.length === 0 && (
          <p style={{ opacity: 0.6 }}>Nenhum artista ainda</p>
        )}

        <div style={styles.grid}>
          {artists.map(a => (
            <div key={a.id} style={styles.card}>
              <h3>{a.name}</h3>
              <p>{a.base} · {a.origin}</p>

              <div style={styles.actions}>
                <button onClick={() => setEditing(a)}>Editar</button>
                <button onClick={() => remove(a.id)}>Apagar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── UI FORM ────────────────────────────────────────────────

  return (
    <div style={styles.wrap}>
      <h2>{editing.name || 'Novo artista'}</h2>

      <div style={styles.form}>
        <input
          placeholder="Nome"
          value={editing.name}
          onChange={e => update('name', e.target.value)}
        />

        <input
          placeholder="Email"
          value={editing.email}
          onChange={e => update('email', e.target.value)}
        />

        <input
          placeholder="Cidade base"
          value={editing.base}
          onChange={e => update('base', e.target.value)}
        />

        <input
          placeholder="País origem"
          value={editing.origin}
          onChange={e => update('origin', e.target.value)}
        />

        <textarea
          placeholder="Bio"
          value={editing.bio}
          onChange={e => update('bio', e.target.value)}
        />
      </div>

      <div style={styles.actions}>
        <button onClick={() => setEditing(null)}>Cancelar</button>
        <button style={styles.primary} onClick={save}>
          Guardar
        </button>
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────

const styles: any = {
  wrap: {
    padding: 20,
    color: '#fff',
  },
  grid: {
    display: 'grid',
    gap: 12,
    marginTop: 20,
  },
  card: {
    padding: 12,
    background: '#111',
    borderRadius: 8,
  },
  actions: {
    display: 'flex',
    gap: 8,
    marginTop: 10,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 20,
  },
  primary: {
    background: '#1A6994',
    color: '#fff',
    padding: '8px 12px',
    border: 'none',
    borderRadius: 6,
  },
}