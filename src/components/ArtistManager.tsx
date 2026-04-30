// src/components/ArtistManager.tsx
// SOMA ODÉ — Artist Manager v2 (9 secções + Cartografia + Supabase + Inputs de tags corrigidos)

import { useEffect, useState } from 'react'
import type { Artist, Project, ArtistMaterials, ArtistMobility } from '../types/artist'
import { emptyArtist, materialsCount, cartografiaCount } from '../types/artist'
import {
  loadArtistsFromSupabase,
  saveArtistToSupabase,
  deleteArtistFromSupabase,
} from '../data/artistsSupabaseStore'

// ─── Constantes UI ────────────────────────────────────────

const SECTIONS = [
  { id: '01', label: 'Identidade' },
  { id: '02', label: 'Localização' },
  { id: '03', label: 'Perfil' },
  { id: '04', label: 'Países' },
  { id: '05', label: 'Mobilidade' },
  { id: '06', label: 'Materiais' },
  { id: '07', label: 'Projectos' },
  { id: '08', label: 'CRM Interno' },
  { id: '09', label: 'Cartografia SOMA' },
] as const

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

const REGIONS: { label: string; emoji: string; countries: { code: string; name: string }[] }[] = [
  { label: 'Europa Ocidental', emoji: '🌍', countries: [
    { code: 'ES', name: 'Espanha' }, { code: 'PT', name: 'Portugal' },
    { code: 'FR', name: 'França' }, { code: 'IT', name: 'Itália' },
    { code: 'DE', name: 'Alemanha' }, { code: 'NL', name: 'Países Baixos' },
    { code: 'BE', name: 'Bélgica' }, { code: 'CH', name: 'Suíça' },
    { code: 'AT', name: 'Áustria' }, { code: 'IE', name: 'Irlanda' },
    { code: 'GB', name: 'Reino Unido' }, { code: 'LU', name: 'Luxemburgo' },
  ]},
  { label: 'Europa do Sul/Leste', emoji: '🌍', countries: [
    { code: 'GR', name: 'Grécia' }, { code: 'PL', name: 'Polónia' },
    { code: 'CZ', name: 'Chéquia' }, { code: 'HU', name: 'Hungria' },
    { code: 'RO', name: 'Roménia' }, { code: 'BG', name: 'Bulgária' },
    { code: 'HR', name: 'Croácia' }, { code: 'SI', name: 'Eslovénia' },
  ]},
  { label: 'Países Nórdicos', emoji: '🌍', countries: [
    { code: 'SE', name: 'Suécia' }, { code: 'NO', name: 'Noruega' },
    { code: 'DK', name: 'Dinamarca' }, { code: 'FI', name: 'Finlândia' },
    { code: 'IS', name: 'Islândia' },
  ]},
  { label: 'América do Sul', emoji: '🌎', countries: [
    { code: 'BR', name: 'Brasil' }, { code: 'AR', name: 'Argentina' },
    { code: 'CL', name: 'Chile' }, { code: 'UY', name: 'Uruguai' },
    { code: 'CO', name: 'Colômbia' }, { code: 'PE', name: 'Peru' },
    { code: 'EC', name: 'Equador' }, { code: 'BO', name: 'Bolívia' },
    { code: 'PY', name: 'Paraguai' }, { code: 'VE', name: 'Venezuela' },
  ]},
  { label: 'América Central/Caraíbas', emoji: '🌎', countries: [
    { code: 'MX', name: 'México' }, { code: 'CU', name: 'Cuba' },
    { code: 'DO', name: 'Rep. Dominicana' }, { code: 'PR', name: 'Porto Rico' },
    { code: 'CR', name: 'Costa Rica' }, { code: 'PA', name: 'Panamá' },
    { code: 'GT', name: 'Guatemala' },
  ]},
  { label: 'América do Norte', emoji: '🌎', countries: [
    { code: 'US', name: 'EUA' }, { code: 'CA', name: 'Canadá' },
  ]},
  { label: 'África Lusófona', emoji: '🌍', countries: [
    { code: 'AO', name: 'Angola' }, { code: 'MZ', name: 'Moçambique' },
    { code: 'CV', name: 'Cabo Verde' }, { code: 'GW', name: 'Guiné-Bissau' },
    { code: 'ST', name: 'São Tomé e Príncipe' },
  ]},
  { label: 'África Ocidental', emoji: '🌍', countries: [
    { code: 'SN', name: 'Senegal' }, { code: 'NG', name: 'Nigéria' },
    { code: 'GH', name: 'Gana' }, { code: 'CI', name: 'Costa do Marfim' },
    { code: 'ML', name: 'Mali' }, { code: 'BF', name: 'Burkina Faso' },
  ]},
  { label: 'África Oriental e Austral', emoji: '🌍', countries: [
    { code: 'ZA', name: 'África do Sul' }, { code: 'KE', name: 'Quénia' },
    { code: 'UG', name: 'Uganda' }, { code: 'TZ', name: 'Tanzânia' },
    { code: 'ET', name: 'Etiópia' },
  ]},
  { label: 'Médio Oriente', emoji: '🌏', countries: [
    { code: 'AE', name: 'Emirados' }, { code: 'IL', name: 'Israel' },
    { code: 'TR', name: 'Turquia' }, { code: 'LB', name: 'Líbano' },
    { code: 'EG', name: 'Egito' }, { code: 'MA', name: 'Marrocos' },
    { code: 'TN', name: 'Tunísia' },
  ]},
  { label: 'Ásia Oriental', emoji: '🌏', countries: [
    { code: 'JP', name: 'Japão' }, { code: 'KR', name: 'Coreia do Sul' },
    { code: 'CN', name: 'China' }, { code: 'TW', name: 'Taiwan' },
    { code: 'HK', name: 'Hong Kong' },
  ]},
  { label: 'Ásia do Sul/Sudeste', emoji: '🌏', countries: [
    { code: 'IN', name: 'Índia' }, { code: 'TH', name: 'Tailândia' },
    { code: 'VN', name: 'Vietname' }, { code: 'ID', name: 'Indonésia' },
    { code: 'PH', name: 'Filipinas' }, { code: 'SG', name: 'Singapura' },
  ]},
  { label: 'Oceânia', emoji: '🌏', countries: [
    { code: 'AU', name: 'Austrália' }, { code: 'NZ', name: 'Nova Zelândia' },
  ]},
]

// ─── Componente ──────────────────────────────────────────

export default function ArtistManager() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [editing, setEditing] = useState<Artist | null>(null)
  const [section, setSection] = useState<string>('01')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const data = await loadArtistsFromSupabase()
      setArtists((data || []).filter(Boolean))
    } catch (err) {
      console.error(err)
      alert('Erro ao carregar artistas')
    }
    setLoading(false)
  }

  function newArtist() {
    setEditing({ ...emptyArtist(), id: crypto.randomUUID() })
    setSection('01')
  }

  async function save() {
    if (!editing) return
    if (!editing.name?.trim()) {
      alert('Nome artístico obrigatório')
      return
    }

    setSaving(true)
    try {
      const updated: Artist = {
        ...editing,
        updatedAt: new Date().toISOString(),
      }
      await saveArtistToSupabase(updated)
      await load()
      setEditing(null)
    } catch (err) {
      console.error(err)
      alert('Erro ao guardar artista. Vê a consola.')
    }
    setSaving(false)
  }

  async function remove(id: string) {
    if (!confirm('Apagar artista? Esta acção não pode ser desfeita.')) return
    try {
      await deleteArtistFromSupabase(id)
      setArtists(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      console.error(err)
      alert('Erro ao apagar artista')
    }
  }

  function update<K extends keyof Artist>(field: K, value: Artist[K]) {
    if (!editing) return
    setEditing(prev => prev ? { ...prev, [field]: value } : prev)
  }

  function toggleArrayItem(field: keyof Artist, item: string) {
    if (!editing) return
    const current = (editing[field] as string[]) || []
    const next = current.includes(item)
      ? current.filter(x => x !== item)
      : [...current, item]
    update(field, next as any)
  }

  // ─── LOADING ─────────────────────────────────────────

  if (loading) {
    return <div style={s.loading}>⏳ A carregar artistas...</div>
  }

  // ─── LISTA ───────────────────────────────────────────

  if (!editing) {
    return (
      <div style={s.wrap}>
        <header style={s.header}>
          <div>
            <h1 style={s.title}>Artistas</h1>
            <p style={s.subtitle}>{artists.length} no roster</p>
          </div>
          <button style={s.primary} onClick={newArtist}>+ Novo artista</button>
        </header>

        {artists.length === 0 && (
          <div style={s.empty}>
            <p>Nenhum artista ainda.</p>
            <p style={{ opacity: 0.6 }}>Clica em "+ Novo artista" para começar.</p>
          </div>
        )}

        <div style={s.grid}>
          {artists.map(a => {
            const m = materialsCount(a.materials || {})
            const c = cartografiaCount(a.cartografia || {})
            return (
              <article key={a.id} style={s.card}>
                <h3 style={s.cardTitle}>{a.name || '—'}</h3>
                <p style={s.cardMeta}>
                  {[a.base, a.origin].filter(Boolean).join(' · ') || 'Sem localização'}
                </p>
                {a.disciplines && a.disciplines.length > 0 && (
                  <div style={s.tags}>
                    {a.disciplines.slice(0, 3).map(d => (
                      <span key={d} style={s.tag}>{d}</span>
                    ))}
                  </div>
                )}
                <div style={s.progress}>
                  <span>Materiais {m.done}/{m.total}</span>
                  <span>Cartografia {c.filled}/{c.total}</span>
                </div>
                <div style={s.cardActions}>
                  <button style={s.secondary} onClick={() => { setEditing(a); setSection('01') }}>
                    Editar
                  </button>
                  <button style={s.danger} onClick={() => remove(a.id)}>
                    Apagar
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── FORM ────────────────────────────────────────────

  return (
    <div style={s.wrap}>
      <header style={s.formHeader}>
        <h1 style={s.title}>{editing.name || 'Novo artista'}</h1>
        <div style={s.formActions}>
          <button style={s.secondary} onClick={() => setEditing(null)}>Cancelar</button>
          <button style={s.primary} onClick={save} disabled={saving}>
            {saving ? '⏳ A guardar...' : '💾 Guardar artista'}
          </button>
        </div>
      </header>

      <nav style={s.tabs}>
        {SECTIONS.map(sec => (
          <button
            key={sec.id}
            onClick={() => setSection(sec.id)}
            style={{ ...s.tab, ...(section === sec.id ? s.tabActive : {}) }}
          >
            {sec.id} · {sec.label}
          </button>
        ))}
      </nav>

      <div style={s.section}>
        {section === '01' && <Section01 a={editing} update={update} />}
        {section === '02' && <Section02 a={editing} update={update} />}
        {section === '03' && <Section03 a={editing} update={update} toggle={toggleArrayItem} />}
        {section === '04' && <Section04 a={editing} update={update} />}
        {section === '05' && <Section05 a={editing} update={update} />}
        {section === '06' && <Section06 a={editing} update={update} />}
        {section === '07' && <Section07 a={editing} update={update} />}
        {section === '08' && <Section08 a={editing} update={update} />}
        {section === '09' && <Section09 a={editing} update={update} />}
      </div>

      <footer style={s.formFooter}>
        <button style={s.secondary} onClick={() => {
          const idx = SECTIONS.findIndex(s => s.id === section)
          if (idx > 0) setSection(SECTIONS[idx - 1].id)
        }}>← Anterior</button>

        <button style={s.primary} onClick={save} disabled={saving}>
          {saving ? '⏳ A guardar...' : '💾 Guardar artista'}
        </button>

        <button style={s.secondary} onClick={() => {
          const idx = SECTIONS.findIndex(s => s.id === section)
          if (idx < SECTIONS.length - 1) setSection(SECTIONS[idx + 1].id)
        }}>Seguinte →</button>
      </footer>
    </div>
  )
}

// ─── Secções ─────────────────────────────────────────────

type SecProps = {
  a: Artist
  update: <K extends keyof Artist>(field: K, value: Artist[K]) => void
}

type SecPropsToggle = SecProps & { toggle: (field: keyof Artist, item: string) => void }

function Section01({ a, update }: SecProps) {
  return (
    <div>
      <h2 style={s.h2}>01 · Identidade e contacto</h2>
      <div style={s.grid2}>
        <Field label="Nome artístico *">
          <input style={s.input} value={a.name || ''} onChange={e => update('name', e.target.value)} />
        </Field>
        <Field label="Nome legal">
          <input style={s.input} value={a.legalName || ''} onChange={e => update('legalName', e.target.value)} />
        </Field>
        <Field label="Pronomes">
          <input style={s.input} placeholder="ele/ela/elu/they" value={a.pronouns || ''} onChange={e => update('pronouns', e.target.value)} />
        </Field>
        <Field label="Email">
          <input style={s.input} type="email" value={a.email || ''} onChange={e => update('email', e.target.value)} />
        </Field>
        <Field label="Telefone">
          <input style={s.input} value={a.phone || ''} onChange={e => update('phone', e.target.value)} />
        </Field>
        <Field label="Instagram">
          <input style={s.input} placeholder="@handle" value={a.instagram || ''} onChange={e => update('instagram', e.target.value)} />
        </Field>
        <Field label="Website">
          <input style={s.input} value={a.website || ''} onChange={e => update('website', e.target.value)} />
        </Field>
        <Field label="Vídeo / Vimeo">
          <input style={s.input} value={a.videoLink || ''} onChange={e => update('videoLink', e.target.value)} />
        </Field>
      </div>
      <Field label="Google Drive (pasta da SOMA)">
        <input style={s.input} value={a.driveLink || ''} onChange={e => update('driveLink', e.target.value)} />
      </Field>
    </div>
  )
}

function Section02({ a, update }: SecProps) {
  return (
    <div>
      <h2 style={s.h2}>02 · Localização</h2>
      <div style={s.grid2}>
        <Field label="País de origem">
          <input style={s.input} value={a.origin || ''} onChange={e => update('origin', e.target.value)} />
        </Field>
        <Field label="Cidade de origem">
          <input style={s.input} value={a.originCity || ''} onChange={e => update('originCity', e.target.value)} />
        </Field>
        <Field label="Cidade base actual">
          <input style={s.input} value={a.base || ''} onChange={e => update('base', e.target.value)} />
        </Field>
        <Field label="País de residência">
          <input style={s.input} value={a.residenceCountry || ''} onChange={e => update('residenceCountry', e.target.value)} />
        </Field>
      </div>
    </div>
  )
}

function Section03({ a, update, toggle }: SecPropsToggle) {
  return (
    <div>
      <h2 style={s.h2}>03 · Perfil artístico</h2>

      <Field label="Disciplinas (clica para seleccionar)">
        <div style={s.chipGrid}>
          {DISCIPLINES.map(d => (
            <button key={d} type="button"
              onClick={() => toggle('disciplines', d.replace(/^[^\s]+ /, '').toLowerCase())}
              style={{
                ...s.chip,
                ...(a.disciplines?.includes(d.replace(/^[^\s]+ /, '').toLowerCase()) ? s.chipActive : {})
              }}>
              {d}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Função profissional">
        <div style={s.chipGrid}>
          {SPECIALTIES.map(sp => (
            <button key={sp} type="button"
              onClick={() => toggle('specialties', sp)}
              style={{
                ...s.chip,
                ...(a.specialties?.includes(sp) ? s.chipActive : {})
              }}>
              {sp}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Idiomas">
        <div style={s.chipGrid}>
          {LANGUAGES.map(l => (
            <button key={l} type="button"
              onClick={() => toggle('languages', l)}
              style={{
                ...s.chip,
                ...(a.languages?.includes(l) ? s.chipActive : {})
              }}>
              {l}
            </button>
          ))}
        </div>
      </Field>

      {/* ─── INPUTS CORRIGIDOS: aceitam vírgulas ─── */}
      <Field label="Keywords (vírgula separa)">
        <input style={s.input}
          placeholder="afro, queer, decolonial, ritual..."
          value={(a.keywords || []).join(', ')}
          onChange={e => update('keywords', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} />
      </Field>

      <Field label="Temas (vírgula separa)">
        <input style={s.input}
          placeholder="identidade, corpo, memória..."
          value={(a.themes || []).join(', ')}
          onChange={e => update('themes', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} />
      </Field>

      <Field label="Géneros (vírgula separa)">
        <input style={s.input}
          placeholder="performance, música eletrônica..."
          value={(a.genres || []).join(', ')}
          onChange={e => update('genres', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} />
      </Field>

      <Field label="Bio curta">
        <textarea style={s.textarea} rows={4} value={a.bio || ''}
          onChange={e => update('bio', e.target.value)} />
      </Field>
    </div>
  )
}

function Section04({ a, update }: SecProps) {
  const selected = a.targetCountries || []

  function toggleCountry(code: string) {
    update('targetCountries', selected.includes(code)
      ? selected.filter(c => c !== code)
      : [...selected, code])
  }

  function selectRegion(codes: string[]) {
    const all = codes.every(c => selected.includes(c))
    update('targetCountries', all
      ? selected.filter(c => !codes.includes(c))
      : Array.from(new Set([...selected, ...codes])))
  }

  function selectAll() {
    const all = REGIONS.flatMap(r => r.countries.map(c => c.code))
    update('targetCountries', selected.length === all.length ? [] : all)
  }

  return (
    <div>
      <h2 style={s.h2}>04 · Países alvo</h2>

      <div style={s.toolbarRow}>
        <button style={s.secondary} onClick={selectAll}>
          {selected.length > 50 ? '× Limpar todos' : '🌍 Seleccionar todos'}
        </button>
        <button style={s.danger} onClick={() => update('targetCountries', [])}>× Limpar</button>
        <span style={s.counter}>{selected.length} países seleccionados</span>
      </div>

      {REGIONS.map(region => {
        const codes = region.countries.map(c => c.code)
        const allSelected = codes.every(c => selected.includes(c))
        return (
          <div key={region.label} style={s.regionBlock}>
            <div style={s.regionHeader}>
              <span style={s.regionTitle}>{region.emoji} {region.label}</span>
              <button style={s.regionToggle} onClick={() => selectRegion(codes)}>
                {allSelected ? '− remover todos' : '+ seleccionar todos'}
              </button>
            </div>
            <div style={s.countryGrid}>
              {region.countries.map(c => (
                <button key={c.code} type="button"
                  onClick={() => toggleCountry(c.code)}
                  style={{
                    ...s.country,
                    ...(selected.includes(c.code) ? s.countryActive : {})
                  }}>
                  {c.code} · {c.name}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Section05({ a, update }: SecProps) {
  function updMobility(field: keyof ArtistMobility, value: any) {
    update('mobility', { ...(a.mobility || {}), [field]: value })
  }

  return (
    <div>
      <h2 style={s.h2}>05 · Mobilidade e disponibilidade</h2>

      <div style={s.checkRow}>
        <label style={s.check}>
          <input type="checkbox"
            checked={a.mobility?.canTravel !== false}
            onChange={e => updMobility('canTravel', e.target.checked)} />
          Pode viajar
        </label>
        <label style={s.check}>
          <input type="checkbox"
            checked={a.mobility?.hasEUPassport === true}
            onChange={e => updMobility('hasEUPassport', e.target.checked)} />
          Tem passaporte UE
        </label>
        <label style={s.check}>
          <input type="checkbox"
            checked={a.mobility?.hasEUBankAccount === true}
            onChange={e => updMobility('hasEUBankAccount', e.target.checked)} />
          Conta bancária UE
        </label>
        <label style={s.check}>
          <input type="checkbox"
            checked={a.mobility?.hasBRBankAccount === true}
            onChange={e => updMobility('hasBRBankAccount', e.target.checked)} />
          Conta bancária BR
        </label>
      </div>

      <div style={s.grid2}>
        <Field label="País do passaporte">
          <input style={s.input} value={a.mobility?.passportCountry || ''}
            onChange={e => updMobility('passportCountry', e.target.value)} />
        </Field>
        <Field label="Cachê mínimo (€)">
          <input style={s.input} type="number" value={a.minFee || 0}
            onChange={e => update('minFee', Number(e.target.value))} />
        </Field>
        <Field label="Disponibilidade / períodos">
          <input style={s.input} placeholder="Outubro 2026, fins-de-semana..."
            value={a.availability || ''}
            onChange={e => update('availability', e.target.value)} />
        </Field>
        <Field label="Necessidades de visto">
          <input style={s.input} value={a.mobility?.visaNotes || ''}
            onChange={e => updMobility('visaNotes', e.target.value)} />
        </Field>
      </div>
    </div>
  )
}

function Section06({ a, update }: SecProps) {
  function updMaterials(field: keyof ArtistMaterials, value: any) {
    update('materials', { ...(a.materials || {}), [field]: value })
  }

  const checkboxes: { key: keyof ArtistMaterials; label: string }[] = [
    { key: 'bioPT', label: '📝 Bio PT' },
    { key: 'bioEN', label: '📝 Bio EN' },
    { key: 'bioES', label: '📝 Bio ES' },
    { key: 'bioCA', label: '📝 Bio CA' },
    { key: 'pressPhoto', label: '📸 Foto press' },
    { key: 'videoPresentation', label: '🎬 Vídeo apresentação' },
    { key: 'technicalRider', label: '🎚 Rider técnico' },
    { key: 'pressKit', label: '📰 Press kit' },
    { key: 'pressClippings', label: '📑 Press clippings' },
  ]

  const links: { key: keyof ArtistMaterials; label: string }[] = [
    { key: 'spotifyLink', label: 'Spotify' },
    { key: 'bandcampLink', label: 'Bandcamp' },
    { key: 'soundcloudLink', label: 'Soundcloud' },
    { key: 'youtubeLink', label: 'YouTube' },
    { key: 'tiktokHandle', label: 'TikTok @' },
  ]

  return (
    <div>
      <h2 style={s.h2}>06 · Materiais</h2>

      <Field label="Checklist">
        <div style={s.checkRow}>
          {checkboxes.map(c => (
            <label key={c.key} style={s.check}>
              <input type="checkbox"
                checked={a.materials?.[c.key] === true}
                onChange={e => updMaterials(c.key, e.target.checked)} />
              {c.label}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Links de streaming/social">
        <div style={s.grid2}>
          {links.map(l => (
            <Field key={l.key} label={l.label}>
              <input style={s.input}
                value={(a.materials?.[l.key] as string) || ''}
                onChange={e => updMaterials(l.key, e.target.value)} />
            </Field>
          ))}
        </div>
      </Field>
    </div>
  )
}

function Section07({ a, update }: SecProps) {
  const projects = (a as any).projects || []
  const [expanded, setExpanded] = useState<string | null>(null)

  function addProject() {
    const newId = crypto.randomUUID()
    const newProject = {
      id: newId,
      name: '', format: '', duration: '', language: '',
      summary: '', technicalNeeds: '',
      videoLink: '', driveLink: '', dossierLink: '',
      projectTargetAudience: '', projectTerritories: '',
      projectKeywords: [] as string[],
      projectFormat: '',
      hasCirculated: false, circulationHistory: '',
    }
    update('projects' as any, [...projects, newProject])
    setExpanded(newId)
  }

  function updateProject(id: string, field: string, value: any) {
    update('projects' as any, projects.map((p: any) => p.id === id ? { ...p, [field]: value } : p))
  }

  function removeProject(id: string) {
    if (confirm('Remover este projeto?')) {
      update('projects' as any, projects.filter((p: any) => p.id !== id))
      if (expanded === id) setExpanded(null)
    }
  }

  return (
    <div>
      <h2 style={s.h2}>07 · Projectos</h2>
      {projects.map((p: any, i: number) => (
        <div key={p.id} style={s.projectCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
            <div>
              <strong>Projeto {i + 1}: {p.name || 'Sem nome'}</strong>
              {p.projectKeywords && p.projectKeywords.length > 0 && <div style={{ fontSize: 11, color: '#ffcf5c', marginTop: 4 }}>{Array.isArray(p.projectKeywords) ? p.projectKeywords.join(', ') : p.projectKeywords}</div>}
            </div>
            <span style={{ color: '#60b4e8', fontSize: 18 }}>{expanded === p.id ? '▲' : '▼'}</span>
          </div>

          {expanded === p.id && (
            <div style={{ marginTop: 14 }}>
              <h4 style={{ color: '#60b4e8', marginBottom: 8 }}>📋 Dados do Projeto</h4>
              <Field label="Nome do projeto"><input style={s.input} value={p.name || ''} onChange={e => updateProject(p.id, 'name', e.target.value)} /></Field>
              <div style={s.grid2}>
                <Field label="Formato"><input style={s.input} value={p.format || ''} onChange={e => updateProject(p.id, 'format', e.target.value)} /></Field>
                <Field label="Duração"><input style={s.input} value={p.duration || ''} onChange={e => updateProject(p.id, 'duration', e.target.value)} /></Field>
                <Field label="Idioma da obra"><input style={s.input} value={p.language || ''} onChange={e => updateProject(p.id, 'language', e.target.value)} /></Field>
              </div>
              <Field label="Resumo do projeto"><textarea style={s.textarea} value={p.summary || ''} onChange={e => updateProject(p.id, 'summary', e.target.value)} /></Field>
              <Field label="Necessidades técnicas"><textarea style={s.textarea} value={p.technicalNeeds || ''} onChange={e => updateProject(p.id, 'technicalNeeds', e.target.value)} /></Field>

              <h4 style={{ color: '#60b4e8', marginBottom: 8, marginTop: 18 }}>🔗 Links de Materiais</h4>
              <div style={s.grid2}>
                <Field label="Link Vídeo"><input style={s.input} value={p.videoLink || ''} onChange={e => updateProject(p.id, 'videoLink', e.target.value)} /></Field>
                <Field label="Link Drive"><input style={s.input} value={p.driveLink || ''} onChange={e => updateProject(p.id, 'driveLink', e.target.value)} /></Field>
                <Field label="Link Dossier"><input style={s.input} value={p.dossierLink || ''} onChange={e => updateProject(p.id, 'dossierLink', e.target.value)} /></Field>
              </div>

              <h4 style={{ color: '#ffcf5c', marginBottom: 8, marginTop: 18 }}>🧭 Mini-Cartografia do Projeto</h4>
              <Field label="Público-alvo do projeto"><textarea style={s.textarea} value={p.projectTargetAudience || ''} onChange={e => updateProject(p.id, 'projectTargetAudience', e.target.value)} placeholder="Quem é o público ideal para este projeto?" /></Field>
              <Field label="Territórios onde o projeto faz sentido"><textarea style={s.textarea} value={p.projectTerritories || ''} onChange={e => updateProject(p.id, 'projectTerritories', e.target.value)} placeholder="Em que cidades, países ou regiões?" /></Field>
              <Field label="Keywords do projeto (vírgula separa)"><input style={s.input} value={Array.isArray(p.projectKeywords) ? p.projectKeywords.join(', ') : (p.projectKeywords || '')} onChange={e => updateProject(p.id, 'projectKeywords', e.target.value.split(',').map((x: string) => x.trim()).filter(Boolean))} placeholder="Ex: ritual, experimental, spoken word" /></Field>
              <Field label="Formato de apresentação"><input style={s.input} value={p.projectFormat || ''} onChange={e => updateProject(p.id, 'projectFormat', e.target.value)} placeholder="Ex: Concerto, Performance, Instalação, DJ Set" /></Field>
              <div style={{ marginTop: 8, marginBottom: 12 }}>
                <label style={s.check}><input type="checkbox" checked={p.hasCirculated === true} onChange={e => updateProject(p.id, 'hasCirculated', e.target.checked)} /> Já circulou / foi apresentado?</label>
              </div>
              {p.hasCirculated && (
                <Field label="Histórico de circulação"><textarea style={s.textarea} value={p.circulationHistory || ''} onChange={e => updateProject(p.id, 'circulationHistory', e.target.value)} placeholder="Onde já foi apresentado? Em que contexto?" /></Field>
              )}

              <div style={{ marginTop: 16 }}>
                <button style={s.danger} onClick={() => removeProject(p.id)}>🗑 Remover projeto</button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button style={s.primary} onClick={addProject}>+ Adicionar projeto</button>
    </div>
  )
}

function Section08({ a, update }: SecProps) {
  function updInternal(field: string, value: any) {
    update('internal', { ...(a.internal || {}), [field]: value })
  }

  const intl = a.internal || {}

  return (
    <div>
      <h2 style={s.h2}>08 · CRM Interno</h2>

      <div style={s.grid2}>
        <Field label="Status do contrato">
          <select style={s.input} value={intl.contractStatus || 'no_contract'}
            onChange={e => updInternal('contractStatus', e.target.value)}>
            <option value="no_contract">Sem contrato</option>
            <option value="in_negotiation">Em negociação</option>
            <option value="active">Activo</option>
            <option value="paused">Pausa</option>
            <option value="ended">Terminado</option>
          </select>
        </Field>
        <Field label="Prioridade">
          <select style={s.input} value={intl.priority || 'medium'}
            onChange={e => updInternal('priority', e.target.value)}>
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
          </select>
        </Field>
        <Field label="Booker / contacto">
          <input style={s.input} value={intl.bookerName || ''}
            onChange={e => updInternal('bookerName', e.target.value)} />
        </Field>
        <Field label="Email do booker">
          <input style={s.input} value={intl.bookerEmail || ''}
            onChange={e => updInternal('bookerEmail', e.target.value)} />
        </Field>
        <Field label="Fee SOMA (%)">
          <input style={s.input} type="number" value={intl.somaFeePercent || 0}
            onChange={e => updInternal('somaFeePercent', Number(e.target.value))} />
        </Field>
      </div>

      <Field label="Notas internas (privadas)">
        <textarea style={s.textarea} rows={5} value={intl.internalNotes || ''}
          onChange={e => updInternal('internalNotes', e.target.value)} />
      </Field>
    </div>
  )
}

function Section09({ a, update }: SecProps) {
  const c = a.cartografia || {}

  function updRaiz(field: string, value: any) {
    update('cartografia', { ...c, raiz: { ...(c.raiz || {}), [field]: value } })
  }
  function updCampo(field: string, value: any) {
    update('cartografia', { ...c, campo: { ...(c.campo || {}), [field]: value } })
  }
  function updTeia(field: string, value: any) {
    update('cartografia', { ...c, teia: { ...(c.teia || {}), [field]: value } })
  }
  function updRota(field: string, value: any) {
    update('cartografia', { ...c, rota: { ...(c.rota || {}), [field]: value } })
  }

  return (
    <div>
      <h2 style={s.h2}>09 · Cartografia SOMA</h2>
      <p style={s.subtitle}>
        Conclusões da entrevista curatorial. ⭐ Vocabulário alimenta o matching automaticamente.
      </p>

      <details style={s.detail} open>
        <summary style={s.summary}>🌱 RAIZ — origens, tensões, vocabulário</summary>
        <Field label="Origens (texto livre)">
          <textarea style={s.textarea} rows={3} value={c.raiz?.origins || ''}
            onChange={e => updRaiz('origins', e.target.value)} />
        </Field>
        <Field label="Tensões fundamentais">
          <textarea style={s.textarea} rows={3} value={c.raiz?.tensions || ''}
            onChange={e => updRaiz('tensions', e.target.value)} />
        </Field>
        <Field label="⭐ Vocabulário (5-8 palavras únicas, vírgula separa)">
          <input style={s.input}
            placeholder="diáspora, ritual, terreiro, fronteira..."
            value={(c.raiz?.vocabulario || []).join(', ')}
            onChange={e => updRaiz('vocabulario', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} />
        </Field>
      </details>

      <details style={s.detail}>
        <summary style={s.summary}>🌊 CAMPO — quem recebe e por quê</summary>
        <Field label="Perfis de audiência">
          <textarea style={s.textarea} rows={3} value={c.campo?.audienceProfiles || ''}
            onChange={e => updCampo('audienceProfiles', e.target.value)} />
        </Field>
        <Field label="Motivação de adesão">
          <textarea style={s.textarea} rows={3} value={c.campo?.motivation || ''}
            onChange={e => updCampo('motivation', e.target.value)} />
        </Field>
        <Field label="Territórios da audiência (vírgula separa)">
          <input style={s.input}
            value={(c.campo?.audienceTerritories || []).join(', ')}
            onChange={e => updCampo('audienceTerritories', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} />
        </Field>
      </details>

      <details style={s.detail}>
        <summary style={s.summary}>🕸 TEIA — estrutura do circuito</summary>
        <Field label="Pares (artistas similares)">
          <textarea style={s.textarea} rows={3} value={c.teia?.pares || ''}
            onChange={e => updTeia('pares', e.target.value)} />
        </Field>
        <Field label="Quem legitima">
          <textarea style={s.textarea} rows={3} value={c.teia?.legitimacy || ''}
            onChange={e => updTeia('legitimacy', e.target.value)} />
        </Field>
        <Field label="Redes de influência">
          <textarea style={s.textarea} rows={3} value={c.teia?.influenceNetworks || ''}
            onChange={e => updTeia('influenceNetworks', e.target.value)} />
        </Field>
      </details>

      <details style={s.detail}>
        <summary style={s.summary}>🗺 ROTA — próximos territórios</summary>
        <Field label="Gaps (territórios em falta)">
          <textarea style={s.textarea} rows={3} value={c.rota?.gaps || ''}
            onChange={e => updRota('gaps', e.target.value)} />
        </Field>
        <Field label="Corredores estratégicos (vírgula separa)">
          <input style={s.input}
            value={(c.rota?.corredores || []).join(', ')}
            onChange={e => updRota('corredores', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} />
        </Field>
        <Field label="Plano de expansão">
          <textarea style={s.textarea} rows={3} value={c.rota?.expansionPlan || ''}
            onChange={e => updRota('expansionPlan', e.target.value)} />
        </Field>
      </details>

      <Field label="✨ Posicionamento estratégico SOMA">
        <textarea style={s.textareaBig} rows={5} value={c.somaPositioning || ''}
          onChange={e => update('cartografia', { ...c, somaPositioning: e.target.value })} />
      </Field>
    </div>
  )
}

// ─── Field helper ────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={s.field}>
      <span style={s.label}>{label}</span>
      {children}
    </label>
  )
}

// ─── Styles ──────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  wrap: { padding: '24px 22px', maxWidth: 1180, margin: '0 auto', color: '#fff' },
  loading: { padding: 40, textAlign: 'center', color: '#fff' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  formHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  formActions: { display: 'flex', gap: 10 },
  formFooter: { display: 'flex', justifyContent: 'space-between', marginTop: 24, alignItems: 'center' },
  title: { margin: 0, fontSize: 28, color: '#fff' },
  subtitle: { margin: '4px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: 13 },
  empty: { padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.5)', background: '#0a0a0a', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)' },

  tabs: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' },
  tab: { padding: '8px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', borderRadius: 8, fontSize: 12, cursor: 'pointer' },
  tabActive: { background: '#1A6994', color: '#fff', border: '1px solid #1A6994' },

  section: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 22 },
  h2: { color: '#60b4e8', textAlign: 'center', fontSize: 14, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 0, marginBottom: 22 },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },

  card: { background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 },
  cardTitle: { margin: '0 0 4px', fontSize: 17 },
  cardMeta: { margin: '0 0 10px', color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  tags: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  tag: { background: 'rgba(26,105,148,0.18)', color: '#60b4e8', padding: '2px 8px', borderRadius: 20, fontSize: 11 },
  progress: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 12 },
  cardActions: { display: 'flex', gap: 8, justifyContent: 'flex-end' },

  field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 },
  label: { fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' },
  input: { background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', width: '100%' },
  textarea: { background: '#000', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, padding: 12, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', width: '100%' },
  textareaBig: { background: '#000', color: '#fff', border: '1px solid #1A6994', borderRadius: 8, padding: 12, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', width: '100%' },

  chipGrid: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  chip: { padding: '8px 14px', background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 24, fontSize: 13, cursor: 'pointer' },
  chipActive: { background: 'rgba(26,105,148,0.3)', color: '#fff', border: '1px solid #1A6994' },

  checkRow: { display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 },
  check: { display: 'flex', gap: 8, alignItems: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer' },

  toolbarRow: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' },
  counter: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },

  regionBlock: { marginBottom: 18 },
  regionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  regionTitle: { color: '#fff', fontSize: 14, fontWeight: 600 },
  regionToggle: { background: 'transparent', color: '#60b4e8', border: 'none', fontSize: 12, cursor: 'pointer' },
  countryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 },
  country: { padding: '6px 10px', background: 'transparent', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 11, cursor: 'pointer', textAlign: 'left' },
  countryActive: { background: 'rgba(26,105,148,0.3)', color: '#fff', border: '1px solid #1A6994' },

  detail: { background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 14, marginBottom: 12 },
  summary: { fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: 14 },

  projectCard: { background: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 16, marginTop: 14 },

  primary: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  secondary: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer' },
  danger: { background: 'rgba(255,70,70,0.12)', color: '#ff8a8a', border: '1px solid rgba(255,70,70,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer' },
}