// src/components/ProjectManager.tsx
// SOMA ODÉ — Gestão de Projetos
// Hub curatorial: identidade + linguagens + artistas + Cartografia SOMA + circulação + materiais

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

// ─── TIPOS ───────────────────────────────────────────────────────────────────

type ArtistExternal = { name: string; role: string; origin: string }

type Project = {
  id: string
  organization_id: string
  created_by: string
  name: string
  slug: string
  description: string
  type: string
  status: string
  disciplines: string[]
  disciplines_other: string
  artists_roster: string[]
  artists_external: ArtistExternal[]
  target_countries: string[]
  target_regions: string[]
  languages: string[]
  start_date: string
  end_date: string
  budget: number | null
  currency: string
  cartografia: Record<string, any>
  video_link: string
  dossier_link: string
  presskit_link: string
  drive_link: string
  created_at: string
  updated_at: string
}

type RosterArtist = { id: string; artistic_name: string; email: string }

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const DISCIPLINES = [
  'Música','Dança','Teatro','Performance','Artes Visuais',
  'Cinema','Circo','Literatura','Instalação','Som','Pesquisa','Multidisciplinar'
]

const PROJECT_TYPES = [
  { value: 'projeto', label: 'Projeto' },
  { value: 'tournee', label: 'Tournée / Circulação' },
  { value: 'coproducao', label: 'Coprodução' },
  { value: 'festival', label: 'Festival' },
  { value: 'residencia', label: 'Residência' },
  { value: 'outro', label: 'Outro' },
]

const PROJECT_STATUSES = [
  { value: 'desenvolvimento', label: 'Em desenvolvimento', color: '#60b4e8' },
  { value: 'activo', label: 'Activo', color: '#6ef3a5' },
  { value: 'concluido', label: 'Concluído', color: 'rgba(255,255,255,0.4)' },
  { value: 'cancelado', label: 'Cancelado', color: '#ff8a8a' },
]

const REGIONS = [
  'Europa','América Latina','Brasil','América do Norte',
  'África','Ásia','Médio Oriente','Global'
]

const LANGUAGES_LIST = [
  'Português','Español','English','Français','Deutsch',
  'Italiano','Arabic','Mandarin','Yorùbá','Wolof','Swahili'
]

const CURRENCIES = ['EUR','BRL','USD','GBP']

const SECTIONS = [
  '01 Identidade',
  '02 Linguagens',
  '03 Artistas',
  '04 Circulação',
  '05 Cartografia',
  '06 Materiais',
]

const emptyCartografia = {
  raiz: { origens: '', referencias: '', memorias: '', territorio: '' },
  campo: { temas: '', publicos: '', contextos: '', impacto: '' },
  teia: { colaboradores: '', redes: '', instituicoes: '', conexoes: '' },
  rota: { paises_alvo: '', formatos: '', edicoes: '', oportunidades: '' },
}

function emptyProject(orgId: string, userId: string): Omit<Project, 'id' | 'created_at' | 'updated_at'> {
  return {
    organization_id: orgId,
    created_by: userId,
    name: '', slug: '', description: '',
    type: 'projeto', status: 'desenvolvimento',
    disciplines: [], disciplines_other: '',
    artists_roster: [], artists_external: [],
    target_countries: [], target_regions: [], languages: [],
    start_date: '', end_date: '',
    budget: null, currency: 'EUR',
    cartografia: emptyCartografia,
    video_link: '', dossier_link: '', presskit_link: '', drive_link: '',
  }
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

export default function ProjectManager() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [projects, setProjects] = useState<Project[]>([])
  const [rosterArtists, setRosterArtists] = useState<RosterArtist[]>([])
  const [orgId, setOrgId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'list' | 'edit'>('list')
  const [current, setCurrent] = useState<Partial<Project> | null>(null)
  const [section, setSection] = useState(0)
  const [msg, setMsg] = useState('')
  const [isError, setIsError] = useState(false)
  const [newExtArtist, setNewExtArtist] = useState<ArtistExternal>({ name: '', role: '', origin: '' })

  useEffect(() => { loadData() }, [user])

  async function loadData() {
    if (!user) return
    setLoading(true)

    // Carrega org do utilizador
    if (!isAdmin) {
      const { data: org } = await supabase
        .from('organizations').select('id').eq('owner_id', user.id).maybeSingle()
      if (org) setOrgId(org.id)
    }

    // Carrega artistas do roster
    const { data: artists } = await supabase
      .from('artists').select('id, artistic_name, email')
    setRosterArtists(artists || [])

    // Carrega projetos
    const { data: projs } = await supabase
      .from('projects').select('*').order('created_at', { ascending: false })
    setProjects(projs || [])

    setLoading(false)
  }

  function showMsg(text: string, error = false) {
    setMsg(text); setIsError(error)
    setTimeout(() => setMsg(''), 3500)
  }

  function openNew() {
    if (!user) return
    setCurrent(emptyProject(orgId, user.id))
    setSection(0); setView('edit')
  }

  function openEdit(p: Project) {
    setCurrent({
      ...p,
      cartografia: p.cartografia && Object.keys(p.cartografia).length > 0
        ? p.cartografia : emptyCartografia,
      artists_external: p.artists_external || [],
    })
    setSection(0); setView('edit')
  }

  async function handleSave() {
    if (!current?.name?.trim()) { showMsg('O nome do projeto é obrigatório.', true); return }
    setSaving(true)
    const now = new Date().toISOString()
    const payload = {
      ...current,
      organization_id: current.organization_id || orgId,
      updated_at: now,
    }

    let error
    if (current.id) {
      const { error: e } = await supabase.from('projects').update(payload).eq('id', current.id)
      error = e
    } else {
      const { error: e } = await supabase.from('projects').insert({ ...payload, created_at: now })
      error = e
    }

    if (error) { showMsg(error.message, true) }
    else { showMsg('Projeto guardado ✓'); await loadData(); setView('list') }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar este projeto?')) return
    await supabase.from('projects').delete().eq('id', id)
    await loadData()
  }

  function set(field: string, value: any) {
    setCurrent(prev => ({ ...prev, [field]: value }))
  }

  function setCart(axis: string, field: string, value: string) {
    setCurrent(prev => ({
      ...prev,
      cartografia: {
        ...(prev?.cartografia || emptyCartografia),
        [axis]: { ...(prev?.cartografia?.[axis] || {}), [field]: value }
      }
    }))
  }

  function toggleChip(field: 'disciplines' | 'target_regions' | 'languages', val: string) {
    const arr: string[] = (current as any)?.[field] || []
    set(field, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  function addExtArtist() {
    if (!newExtArtist.name.trim()) return
    set('artists_external', [...(current?.artists_external || []), { ...newExtArtist }])
    setNewExtArtist({ name: '', role: '', origin: '' })
  }

  function removeExtArtist(i: number) {
    set('artists_external', (current?.artists_external || []).filter((_, idx) => idx !== i))
  }

  function toggleRosterArtist(id: string) {
    const arr = current?.artists_roster || []
    set('artists_roster', arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id])
  }

  const statusColor = (s: string) =>
    PROJECT_STATUSES.find(x => x.value === s)?.color || 'rgba(255,255,255,0.4)'

  // ── LISTA DE PROJETOS ────────────────────────────────────────────────────

  if (view === 'list') return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Projetos</h1>
          <p style={s.sub}>{projects.length} projeto{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button style={s.primaryBtn} onClick={openNew}>+ Novo projeto</button>
      </div>

      {msg && <div style={{ ...s.toast, borderColor: isError ? 'rgba(255,100,100,0.3)' : 'rgba(110,243,165,0.3)', color: isError ? '#ff8a8a' : '#6ef3a5' }}>{msg}</div>}

      {loading ? (
        <p style={s.empty}>A carregar...</p>
      ) : projects.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}>🗂</div>
          <p style={s.emptyTitle}>Nenhum projeto ainda</p>
          <p style={s.emptySub}>Cria o primeiro projeto para começar a gerir circulação, artistas e editais.</p>
          <button style={s.primaryBtn} onClick={openNew}>+ Criar primeiro projeto</button>
        </div>
      ) : (
        <div style={s.grid}>
          {projects.map(p => (
            <div key={p.id} style={s.card}>
              <div style={s.cardTop}>
                <span style={{ ...s.statusBadge, color: statusColor(p.status), borderColor: statusColor(p.status) + '44' }}>
                  {PROJECT_STATUSES.find(x => x.value === p.status)?.label || p.status}
                </span>
                <span style={s.typeBadge}>{PROJECT_TYPES.find(x => x.value === p.type)?.label || p.type}</span>
              </div>
              <h3 style={s.cardTitle}>{p.name}</h3>
              {p.description && <p style={s.cardDesc}>{p.description.slice(0, 100)}{p.description.length > 100 ? '…' : ''}</p>}
              {p.disciplines?.length > 0 && (
                <div style={s.chips}>
                  {p.disciplines.slice(0, 4).map(d => <span key={d} style={s.chip}>{d}</span>)}
                  {p.disciplines.length > 4 && <span style={s.chip}>+{p.disciplines.length - 4}</span>}
                </div>
              )}
              <div style={s.cardFooter}>
                {p.start_date && <span style={s.cardMeta}>{p.start_date.slice(0, 7)}{p.end_date ? ` → ${p.end_date.slice(0, 7)}` : ''}</span>}
                <div style={s.cardActions}>
                  <button style={s.editBtn} onClick={() => openEdit(p)}>Editar</button>
                  <button style={s.deleteBtn} onClick={() => handleDelete(p.id)}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── FORMULÁRIO DE EDIÇÃO ─────────────────────────────────────────────────

  const c = current || {}
  const cart = (c.cartografia as any) || emptyCartografia

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <button style={s.backBtn} onClick={() => setView('list')}>← Projetos</button>
          <h1 style={s.title}>{c.id ? c.name || 'Editar projeto' : 'Novo projeto'}</h1>
        </div>
        <button style={s.primaryBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'A guardar...' : '💾 Guardar'}
        </button>
      </div>

      {msg && <div style={{ ...s.toast, borderColor: isError ? 'rgba(255,100,100,0.3)' : 'rgba(110,243,165,0.3)', color: isError ? '#ff8a8a' : '#6ef3a5' }}>{msg}</div>}

      <div style={s.layout}>
        {/* Sidebar */}
        <div style={s.sidebar}>
          {SECTIONS.map((sec, i) => (
            <button key={sec} style={{ ...s.sideBtn, ...(section === i ? s.sideBtnActive : {}) }}
              onClick={() => setSection(i)}>{sec}</button>
          ))}
        </div>

        {/* Conteúdo */}
        <div style={s.content}>

          {/* ── 01 IDENTIDADE ── */}
          {section === 0 && (
            <div style={s.formSection}>
              <h2 style={s.sectionTitle}>01 Identidade</h2>

              <label style={s.label}>Nome do projeto *</label>
              <input style={s.input} value={c.name || ''} placeholder="Ex: Afrodiaspóricos — Circulação Europa 2027"
                onChange={e => set('name', e.target.value)} />

              <label style={s.label}>Descrição</label>
              <textarea style={s.textarea} value={c.description || ''}
                placeholder="Descreve o projeto, a sua proposta artística e objectivos de circulação..."
                onChange={e => set('description', e.target.value)} rows={4} />

              <div style={s.row2}>
                <div>
                  <label style={s.label}>Tipo</label>
                  <select style={s.select} value={c.type || 'projeto'} onChange={e => set('type', e.target.value)}>
                    {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Status</label>
                  <select style={s.select} value={c.status || 'desenvolvimento'} onChange={e => set('status', e.target.value)}>
                    {PROJECT_STATUSES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div style={s.row2}>
                <div>
                  <label style={s.label}>Data de início</label>
                  <input style={s.input} type="date" value={c.start_date || ''} onChange={e => set('start_date', e.target.value)} />
                </div>
                <div>
                  <label style={s.label}>Data de fim</label>
                  <input style={s.input} type="date" value={c.end_date || ''} onChange={e => set('end_date', e.target.value)} />
                </div>
              </div>

              <div style={s.row2}>
                <div>
                  <label style={s.label}>Orçamento estimado</label>
                  <input style={s.input} type="number" value={c.budget || ''} placeholder="0"
                    onChange={e => set('budget', e.target.value ? Number(e.target.value) : null)} />
                </div>
                <div>
                  <label style={s.label}>Moeda</label>
                  <select style={s.select} value={c.currency || 'EUR'} onChange={e => set('currency', e.target.value)}>
                    {CURRENCIES.map(cur => <option key={cur} value={cur}>{cur}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── 02 LINGUAGENS ── */}
          {section === 1 && (
            <div style={s.formSection}>
              <h2 style={s.sectionTitle}>02 Linguagens artísticas</h2>
              <p style={s.sectionDesc}>Define as disciplinas que este projeto mobiliza. Isto alimenta o matching com editais.</p>

              <label style={s.label}>Disciplinas</label>
              <div style={s.chipGrid}>
                {DISCIPLINES.map(d => (
                  <button key={d} style={{ ...s.chipToggle, ...((c.disciplines || []).includes(d) ? s.chipToggleActive : {}) }}
                    onClick={() => toggleChip('disciplines', d)}>{d}</button>
                ))}
              </div>

              <label style={s.label} style={{ marginTop: 16 }}>Outras linguagens (campo livre)</label>
              <input style={s.input} value={c.disciplines_other || ''}
                placeholder="Ex: Drag, Slam Poetry, Capoeira, Arte Digital..."
                onChange={e => set('disciplines_other', e.target.value)} />

              <label style={s.label} style={{ marginTop: 16 }}>Idiomas do projeto</label>
              <div style={s.chipGrid}>
                {LANGUAGES_LIST.map(l => (
                  <button key={l} style={{ ...s.chipToggle, ...((c.languages || []).includes(l) ? s.chipToggleActive : {}) }}
                    onClick={() => toggleChip('languages', l)}>{l}</button>
                ))}
              </div>
            </div>
          )}

          {/* ── 03 ARTISTAS ── */}
          {section === 2 && (
            <div style={s.formSection}>
              <h2 style={s.sectionTitle}>03 Artistas</h2>
              <p style={s.sectionDesc}>Os artistas são opcionais — podes gerir projetos sem artistas definidos.</p>

              <label style={s.label}>Artistas do roster SOMA</label>
              {rosterArtists.length === 0
                ? <p style={s.emptyNote}>Nenhum artista cadastrado no sistema ainda.</p>
                : (
                  <div style={s.rosterGrid}>
                    {rosterArtists.map(a => {
                      const selected = (c.artists_roster || []).includes(a.id)
                      return (
                        <button key={a.id}
                          style={{ ...s.rosterCard, ...(selected ? s.rosterCardActive : {}) }}
                          onClick={() => toggleRosterArtist(a.id)}>
                          <div style={s.rosterName}>{a.artistic_name || a.email}</div>
                          {selected && <span style={s.rosterCheck}>✓</span>}
                        </button>
                      )
                    })}
                  </div>
                )
              }

              <label style={s.label} style={{ marginTop: 20 }}>Artistas externos</label>
              <div style={s.extRow}>
                <input style={{ ...s.input, flex: 2 }} value={newExtArtist.name} placeholder="Nome"
                  onChange={e => setNewExtArtist(p => ({ ...p, name: e.target.value }))} />
                <input style={{ ...s.input, flex: 1 }} value={newExtArtist.role} placeholder="Função"
                  onChange={e => setNewExtArtist(p => ({ ...p, role: e.target.value }))} />
                <input style={{ ...s.input, flex: 1 }} value={newExtArtist.origin} placeholder="País"
                  onChange={e => setNewExtArtist(p => ({ ...p, origin: e.target.value }))} />
                <button style={s.addBtn} onClick={addExtArtist}>+</button>
              </div>

              {(c.artists_external || []).length > 0 && (
                <div style={s.extList}>
                  {(c.artists_external || []).map((a, i) => (
                    <div key={i} style={s.extItem}>
                      <span style={s.extName}>{a.name}</span>
                      {a.role && <span style={s.extRole}>{a.role}</span>}
                      {a.origin && <span style={s.extOrigin}>{a.origin}</span>}
                      <button style={s.extRemove} onClick={() => removeExtArtist(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 04 CIRCULAÇÃO ── */}
          {section === 3 && (
            <div style={s.formSection}>
              <h2 style={s.sectionTitle}>04 Circulação</h2>
              <p style={s.sectionDesc}>Define o território de interesse do projeto para matching com editais e oportunidades.</p>

              <label style={s.label}>Regiões alvo</label>
              <div style={s.chipGrid}>
                {REGIONS.map(r => (
                  <button key={r} style={{ ...s.chipToggle, ...((c.target_regions || []).includes(r) ? s.chipToggleActive : {}) }}
                    onClick={() => toggleChip('target_regions', r)}>{r}</button>
                ))}
              </div>

              <label style={s.label} style={{ marginTop: 16 }}>Países alvo (códigos ISO, separados por vírgula)</label>
              <input style={s.input}
                value={(c.target_countries || []).join(', ')}
                placeholder="ES, PT, FR, DE, BR..."
                onChange={e => set('target_countries', e.target.value.split(',').map(x => x.trim()).filter(Boolean))} />
            </div>
          )}

          {/* ── 05 CARTOGRAFIA SOMA ── */}
          {section === 4 && (
            <div style={s.formSection}>
              <h2 style={s.sectionTitle}>05 Cartografia SOMA</h2>
              <p style={s.sectionDesc}>A Cartografia do projeto orienta o matching com editais e oportunidades de circulação internacional.</p>

              {/* RAIZ */}
              <div style={s.cartBlock}>
                <div style={s.cartLabel}>🌱 RAIZ — Origens e referências</div>
                <label style={s.label}>Origens culturais e geográficas</label>
                <textarea style={s.textarea} rows={2} value={cart.raiz?.origens || ''}
                  placeholder="De onde vem este projeto? Quais as suas raízes culturais?"
                  onChange={e => setCart('raiz', 'origens', e.target.value)} />
                <label style={s.label}>Referências artísticas</label>
                <textarea style={s.textarea} rows={2} value={cart.raiz?.referencias || ''}
                  placeholder="Artistas, movimentos, tradições que influenciam este projeto"
                  onChange={e => setCart('raiz', 'referencias', e.target.value)} />
                <label style={s.label}>Memórias e patrimónios mobilizados</label>
                <textarea style={s.textarea} rows={2} value={cart.raiz?.memorias || ''}
                  placeholder="Que memórias colectivas ou patrimónios este projeto activa?"
                  onChange={e => setCart('raiz', 'memorias', e.target.value)} />
              </div>

              {/* CAMPO */}
              <div style={s.cartBlock}>
                <div style={s.cartLabel}>🌾 CAMPO — Temáticas e públicos</div>
                <label style={s.label}>Temas centrais</label>
                <textarea style={s.textarea} rows={2} value={cart.campo?.temas || ''}
                  placeholder="Que temas, questões ou narrativas este projeto aborda?"
                  onChange={e => setCart('campo', 'temas', e.target.value)} />
                <label style={s.label}>Públicos e comunidades</label>
                <textarea style={s.textarea} rows={2} value={cart.campo?.publicos || ''}
                  placeholder="A quem se dirige? Que comunidades quer alcançar?"
                  onChange={e => setCart('campo', 'publicos', e.target.value)} />
                <label style={s.label}>Contextos de apresentação</label>
                <textarea style={s.textarea} rows={2} value={cart.campo?.contextos || ''}
                  placeholder="Festivais, centros culturais, espaços alternativos, ao ar livre..."
                  onChange={e => setCart('campo', 'contextos', e.target.value)} />
              </div>

              {/* TEIA */}
              <div style={s.cartBlock}>
                <div style={s.cartLabel}>🕸 TEIA — Redes e colaborações</div>
                <label style={s.label}>Colaboradores e parceiros</label>
                <textarea style={s.textarea} rows={2} value={cart.teia?.colaboradores || ''}
                  placeholder="Quem são os colaboradores artísticos e institucionais?"
                  onChange={e => setCart('teia', 'colaboradores', e.target.value)} />
                <label style={s.label}>Redes e plataformas</label>
                <textarea style={s.textarea} rows={2} value={cart.teia?.redes || ''}
                  placeholder="A que redes internacionais este projeto pertence ou quer pertencer?"
                  onChange={e => setCart('teia', 'redes', e.target.value)} />
                <label style={s.label}>Instituições de referência</label>
                <textarea style={s.textarea} rows={2} value={cart.teia?.instituicoes || ''}
                  placeholder="Que instituições validam ou poderiam acolher este projeto?"
                  onChange={e => setCart('teia', 'instituicoes', e.target.value)} />
              </div>

              {/* ROTA */}
              <div style={s.cartBlock}>
                <div style={{ ...s.cartLabel, background: 'rgba(26,105,148,0.15)', borderLeft: '3px solid #1A6994' }}>🧭 ROTA — Circulação e oportunidades</div>
                <label style={s.label}>Países e territórios alvo</label>
                <textarea style={s.textarea} rows={2} value={cart.rota?.paises_alvo || ''}
                  placeholder="Onde este projeto quer circular nos próximos 2 anos?"
                  onChange={e => setCart('rota', 'paises_alvo', e.target.value)} />
                <label style={s.label}>Formatos de apresentação</label>
                <textarea style={s.textarea} rows={2} value={cart.rota?.formatos || ''}
                  placeholder="Show, workshop, residência, conferência, instalação, online..."
                  onChange={e => setCart('rota', 'formatos', e.target.value)} />
                <label style={s.label}>Editais e oportunidades de interesse</label>
                <textarea style={s.textarea} rows={3} value={cart.rota?.oportunidades || ''}
                  placeholder="Ibermúsicas, AC/E PICE, Creative Europe, Gulbenkian, SESC, GDA... Que linhas de financiamento fazem sentido para este projeto?"
                  onChange={e => setCart('rota', 'oportunidades', e.target.value)} />
              </div>
            </div>
          )}

          {/* ── 06 MATERIAIS ── */}
          {section === 5 && (
            <div style={s.formSection}>
              <h2 style={s.sectionTitle}>06 Materiais</h2>
              <p style={s.sectionDesc}>Links para dossier, vídeo, press kit e Google Drive do projeto.</p>

              <label style={s.label}>Vídeo / trailer</label>
              <input style={s.input} value={c.video_link || ''} placeholder="https://vimeo.com/..."
                onChange={e => set('video_link', e.target.value)} />

              <label style={s.label}>Dossier artístico</label>
              <input style={s.input} value={c.dossier_link || ''} placeholder="https://drive.google.com/..."
                onChange={e => set('dossier_link', e.target.value)} />

              <label style={s.label}>Press kit</label>
              <input style={s.input} value={c.presskit_link || ''} placeholder="https://..."
                onChange={e => set('presskit_link', e.target.value)} />

              <label style={s.label}>Pasta Google Drive</label>
              <input style={s.input} value={c.drive_link || ''} placeholder="https://drive.google.com/drive/folders/..."
                onChange={e => set('drive_link', e.target.value)} />

              {/* Links rápidos */}
              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {c.video_link && <a href={c.video_link} target="_blank" rel="noreferrer" style={s.linkBtn}>▶ Ver vídeo</a>}
                {c.dossier_link && <a href={c.dossier_link} target="_blank" rel="noreferrer" style={s.linkBtn}>📄 Dossier</a>}
                {c.drive_link && <a href={c.drive_link} target="_blank" rel="noreferrer" style={s.linkBtn}>📁 Drive</a>}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ─── ESTILOS ─────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: { padding: '24px 28px', color: '#fff', fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 700, margin: 0, color: '#fff' },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' },
  backBtn: { background: 'none', border: 'none', color: '#60b4e8', fontSize: 13, cursor: 'pointer', padding: '0 0 6px', display: 'block' },
  primaryBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  toast: { padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, border: '1px solid', textAlign: 'center', background: 'rgba(0,0,0,0.3)' },
  empty: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 },
  emptyState: { textAlign: 'center', padding: '60px 20px' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 700, margin: '0 0 8px', color: '#fff' },
  emptySub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 },
  emptyNote: { fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', margin: '8px 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 },
  card: { background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 18 },
  cardTop: { display: 'flex', gap: 8, marginBottom: 10 },
  statusBadge: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, border: '1px solid' },
  typeBadge: { fontSize: 11, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 20 },
  cardTitle: { fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: '#fff' },
  cardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 10px', lineHeight: 1.5 },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  cardMeta: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  cardActions: { display: 'flex', gap: 8 },
  editBtn: { background: 'rgba(26,105,148,0.15)', color: '#60b4e8', border: '1px solid rgba(26,105,148,0.3)', borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer' },
  deleteBtn: { background: 'rgba(255,100,100,0.08)', color: '#ff8a8a', border: '1px solid rgba(255,100,100,0.2)', borderRadius: 6, padding: '5px 8px', fontSize: 12, cursor: 'pointer' },
  chips: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 },
  chip: { fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' },
  layout: { display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24 },
  sidebar: { display: 'flex', flexDirection: 'column', gap: 4 },
  sideBtn: { background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', textAlign: 'left', padding: '10px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  sideBtnActive: { background: '#1A6994', color: '#fff', fontWeight: 600 },
  content: { background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 28 },
  formSection: { display: 'flex', flexDirection: 'column', gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: '#60b4e8' },
  sectionDesc: { fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 8px', lineHeight: 1.5 },
  label: { fontSize: 12, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em', marginTop: 4 },
  input: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '11px 14px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  textarea: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '11px 14px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' },
  select: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '11px 14px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  chipGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chipToggle: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', borderRadius: 20, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  chipToggleActive: { background: 'rgba(26,105,148,0.25)', border: '1px solid #1A6994', color: '#60b4e8', fontWeight: 600 },
  rosterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 },
  rosterCard: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', textAlign: 'left', color: '#fff', fontFamily: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  rosterCardActive: { background: 'rgba(26,105,148,0.2)', border: '1px solid #1A6994' },
  rosterName: { fontSize: 13, fontWeight: 500 },
  rosterCheck: { color: '#6ef3a5', fontSize: 14 },
  extRow: { display: 'flex', gap: 8, alignItems: 'center' },
  addBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, width: 36, height: 42, fontSize: 20, cursor: 'pointer', flexShrink: 0 },
  extList: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 },
  extItem: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 },
  extName: { fontSize: 13, fontWeight: 600, flex: 1 },
  extRole: { fontSize: 12, color: '#60b4e8', background: 'rgba(26,105,148,0.15)', padding: '2px 8px', borderRadius: 10 },
  extOrigin: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  extRemove: { background: 'none', border: 'none', color: 'rgba(255,100,100,0.6)', cursor: 'pointer', fontSize: 13, padding: 0 },
  cartBlock: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 8 },
  cartLabel: { fontSize: 13, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,0.05)', borderLeft: '3px solid rgba(255,255,255,0.3)', padding: '6px 12px', borderRadius: '0 6px 6px 0', marginBottom: 4 },
  linkBtn: { fontSize: 12, color: '#60b4e8', background: 'rgba(26,105,148,0.1)', border: '1px solid rgba(26,105,148,0.25)', borderRadius: 6, padding: '5px 12px', textDecoration: 'none', display: 'inline-block' },
}