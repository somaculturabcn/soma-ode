// src/components/MatchView.tsx
// SOMA ODÉ — Oportunidades multi-tenant (orquestrador)
// Todos vêem oportunidades públicas | só dono/admin edita | admin pode marcar privada
// Modularizado: tipos em types/matchTypes.ts · helpers em utils/matchHelpers.ts
// Gemini em utils/geminiScout.ts · card em match/MatchCard.tsx · modais em match/MatchModals.tsx

import { useEffect, useMemo, useRef, useState } from 'react'
import ScoutUrlExtractor from './ScoutUrlExtractor'
import ScoutSavedSearches from './ScoutSavedSearches'
import SomaAnalysisModal, { type ArtistForAnalysis } from './SomaAnalysisModal'
import ContextualMatchPanel from './ContextualMatchPanel'
import MatchCard from './match/MatchCard'
import { AssignArtistModal, ShareProducerModal, OpportunityEditModal } from './match/MatchModals'
import { st } from './match/matchStyles'
import { mockOpportunities } from '../data/mockOpportunities'
import { realOpportunities } from '../data/realOpportunities'
import { loadArtistsFromSupabase } from '../data/artistsSupabaseStore'
import { useAuth } from '../auth/AuthProvider'
import {
  loadOpportunitiesFromSupabase,
  saveOpportunityToSupabase,
  saveOpportunitiesBatch,
  deleteOpportunityFromSupabase,
  shareOpportunityWithProducer,
  loadProducerOrgs,
} from '../data/opportunitiesSupabaseStore'
import { SOMA_ORG_ID } from '../types/organization'
import {
  safeArr,
  SCORE_THRESHOLD,
  TYPE_ICONS,
  type Opportunity,
  type ArtistLite,
  type SavedSearch,
} from '../types/matchTypes'
import {
  getManualOpportunities,
  saveManualOpportunities,
  getArtists,
  emptyOpportunity,
  cleanText,
  escapeCsv,
  daysLeft,
  scoreOpportunity,
  parseCsv,
} from '../utils/matchHelpers'
import { searchWithGemini } from '../utils/geminiScout'

export default function MatchView() {
  const { user } = useAuth()
  const isProducer = user?.role === 'producer'
  const isAdmin = user?.role === 'admin' || user?.role === 'manager'
  const orgId = user?.organizationId || SOMA_ORG_ID

  const fileRef = useRef<HTMLInputElement | null>(null)

  const [manual, setManual] = useState<Opportunity[]>([])
  const [supabaseOps, setSupabaseOps] = useState<Opportunity[]>([])
  const [artists, setArtists] = useState<ArtistLite[]>([])
  const [editing, setEditing] = useState<Opportunity | null>(null)
  const [assigning, setAssigning] = useState<Opportunity | null>(null)
  const [selectedArtistId, setSelectedArtistId] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('todos')
  const [countryFilter, setCountryFilter] = useState('todos')
  const [onlyCosts, setOnlyCosts] = useState(false)
  const [showExpired, setShowExpired] = useState(false)
  const [activeScout, setActiveScout] = useState<SavedSearch | null>(null)
  const [webResults, setWebResults] = useState<Opportunity[]>([])
  const [webLoading, setWebLoading] = useState(false)
  const [webError, setWebError] = useState('')
  const [webNote, setWebNote] = useState('')
  const [webMethod, setWebMethod] = useState('')
  const [analysisOp, setAnalysisOp] = useState<Opportunity | null>(null)
  const [analysisArtist, setAnalysisArtist] = useState<ArtistForAnalysis | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [quickEdit, setQuickEdit] = useState<string | null>(null)
  const [matchArtists, setMatchArtists] = useState<any[]>([])

  const [shareOp, setShareOp] = useState<Opportunity | null>(null)
  const [producerOrgs, setProducerOrgs] = useState<{ id: string; name: string }[]>([])
  const [shareTargetOrgId, setShareTargetOrgId] = useState('')
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    if (!isProducer) setManual(getManualOpportunities())

    setArtists(getArtists())

    loadArtistsFromSupabase()
      .then(data => setMatchArtists(data || []))
      .catch(console.error)

    loadOpportunitiesFromSupabase()
      .then(ops => setSupabaseOps(ops as Opportunity[]))
      .catch(console.error)

    if (isAdmin) {
      loadProducerOrgs().then(setProducerOrgs).catch(console.error)
    }
  }, [isProducer, isAdmin])

  const allOpportunities: Opportunity[] = useMemo(() => {
    const normalizedSupabase = supabaseOps.map((op: any) => ({
      ...op,
      id: op.id || crypto.randomUUID(),
      title: op.title || 'Sem título',
      disciplines: safeArr(op.disciplines),
      keywords: safeArr(op.keywords),
      status: op.status || 'open',
      recurrence: op.recurrence || 'anual',
      isPrivate: Boolean(op.isPrivate),
      _fromSupabase: true,
    }))

    if (isProducer) return normalizedSupabase

    const real = Array.isArray(realOpportunities) ? realOpportunities : []
    const mock = Array.isArray(mockOpportunities) ? mockOpportunities : []

    const normalized = [...manual, ...normalizedSupabase, ...real, ...mock].map((op: any) => ({
      ...op,
      id: op.id || crypto.randomUUID(),
      title: op.title || op.name || 'Sem título',
      organization: op.organization || '',
      type: op.type || 'open_call',
      country: op.country || '',
      countryName: op.countryName || op.country || '',
      disciplines: safeArr(op.disciplines),
      keywords: safeArr(op.keywords || op.themes),
      status: op.status || 'open',
      recurrence: op.recurrence || 'anual',
      isPrivate: Boolean(op.isPrivate),
    }))

    const seen = new Set<string>()

    return normalized.filter(op => {
      const key = cleanText(`${op.title}-${op.organization}`)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [manual, supabaseOps, isProducer])

  async function refreshSupabaseOps() {
    const ops = await loadOpportunitiesFromSupabase()
    setSupabaseOps(ops as Opportunity[])
  }

  async function handleScoutExecute(savedSearch: SavedSearch) {
    setActiveScout(savedSearch)
    setSearch('')
    setWebResults([])
    setWebError('')
    setWebNote('')
    setWebMethod('')
    setWebLoading(true)

    try {
      const { results, note, method } = await searchWithGemini(savedSearch)

      const enriched = results.map(op => ({
        ...op,
        usualOpeningMonth: op.usualOpeningMonth || savedSearch.usualOpeningMonth,
        usualDeadlineMonth: op.usualDeadlineMonth || savedSearch.usualDeadlineMonth,
        recurrenceNotes: op.recurrenceNotes || savedSearch.recurrenceNotes || '',
      }))

      setWebResults(enriched)
      setWebNote(note)
      setWebMethod(method)
    } catch (err: any) {
      setWebError(err.message || 'Erro ao buscar. Verifica a API key e tenta de novo.')
    } finally {
      setWebLoading(false)
    }
  }

  function handleScoutCallback(data: any) {
    if (data && data.query !== undefined && data.name !== undefined) {
      handleScoutExecute(data as SavedSearch)
    } else {
      handleScoutSave(data as Opportunity)
    }
  }

  function handleScoutSave(op: Opportunity) {
    persistLocal([{ ...op, isPrivate: false }, ...getManualOpportunities()])
  }

  function clearScout() {
    setActiveScout(null)
    setSearch('')
    setWebResults([])
    setWebError('')
    setWebNote('')
    setWebMethod('')
  }

  async function saveWebOpportunity(op: Opportunity) {
    const toSave = {
      ...op,
      isPrivate: false,
      source: 'web_scout',
      _fromWeb: undefined,
      _matchScore: undefined,
      _matchReasons: undefined,
    }

    if (isProducer || isAdmin) {
      await saveOpportunityToSupabase(toSave, orgId)
      await refreshSupabaseOps()
    } else {
      persistLocal([toSave, ...getManualOpportunities()])
    }

    setWebResults(prev => prev.filter(w => w.id !== op.id))
  }

  async function openAnalysis(op: Opportunity) {
    setAnalysisOp(op)
    setLoadingAnalysis(true)

    try {
      if ((activeScout as any)?.artistId) {
        const allArtists = await loadArtistsFromSupabase()
        const artist = allArtists.find((a: any) => a.id === (activeScout as any).artistId) as any

        if (artist) {
          setAnalysisArtist({
            name: artist.name || 'Artista',
            bio: artist.bio,
            origin: artist.origin,
            base: artist.base,
            disciplines: safeArr(artist.disciplines),
            languages: safeArr(artist.languages),
            keywords: safeArr(artist.keywords),
            cartografia: artist.cartografia,
          })
        } else {
          setAnalysisArtist({ name: (activeScout as any)?.artistName || 'Artista SOMA' })
        }
      } else {
        setAnalysisArtist({ name: 'Artista SOMA' })
      }
    } catch {
      setAnalysisArtist({ name: 'Artista SOMA' })
    }

    setLoadingAnalysis(false)
  }

  const filteredBase: Opportunity[] = useMemo(() => {
    const q = cleanText(search)

    return allOpportunities
      .map(op => {
        if (activeScout) {
          const { score, reasons } = scoreOpportunity(op, activeScout)
          return { ...op, _matchScore: score, _matchReasons: reasons }
        }
        return op
      })
      .filter(op => {
        if (activeScout && (op._matchScore || 0) < SCORE_THRESHOLD) return false
        if (typeFilter !== 'todos' && op.type !== typeFilter) return false
        if (countryFilter !== 'todos' && (op.countryName || op.country) !== countryFilter) return false
        if (onlyCosts && !op.coversCosts) return false
        if (!showExpired && daysLeft(op.deadline) !== null && (daysLeft(op.deadline) || 0) < 0) return false
        if (!q) return true

        return cleanText([
          op.title,
          op.organization,
          op.countryName,
          op.city,
          op.summary,
          op.notes,
          ...safeArr(op.disciplines),
          ...safeArr(op.keywords),
        ].join(' ')).includes(q)
      })
      .sort((a, b) => {
        if (activeScout) return (b._matchScore || 0) - (a._matchScore || 0)

        const da = daysLeft(a.deadline)
        const db = daysLeft(b.deadline)

        if (da === null && db === null) return 0
        if (da === null) return 1
        if (db === null) return -1

        return da - db
      })
  }, [allOpportunities, search, typeFilter, countryFilter, onlyCosts, showExpired, activeScout])

  const types = useMemo(() => Array.from(new Set(allOpportunities.map(o => o.type).filter(Boolean))).sort(), [allOpportunities])
  const countries = useMemo(() => Array.from(new Set(allOpportunities.map(o => o.countryName || o.country).filter(Boolean))).sort(), [allOpportunities])
  const urgentCount = useMemo(() => allOpportunities.filter(op => {
    const d = daysLeft(op.deadline)
    return d !== null && d >= 0 && d <= 14
  }).length, [allOpportunities])

  function persistLocal(next: Opportunity[]) {
    setManual(next)
    saveManualOpportunities(next)
  }

  async function saveOpportunity(op: Opportunity) {
    if (!op.title.trim()) {
      alert('Título obrigatório.')
      return
    }

    const updated: Opportunity = {
      ...op,
      isPrivate: Boolean(op.isPrivate),
      updatedAt: new Date().toISOString(),
    }

    if (isProducer || isAdmin) {
      try {
        await saveOpportunityToSupabase(updated, orgId)
        await refreshSupabaseOps()
      } catch (err) {
        console.error(err)
        alert('Erro ao guardar oportunidade no Supabase.')
      }
    } else {
      const exists = manual.some(o => o.id === updated.id)
      persistLocal(exists ? manual.map(o => o.id === updated.id ? updated : o) : [updated, ...manual])
    }

    setEditing(null)
    setQuickEdit(null)
  }

  function quickUpdate(id: string, field: keyof Opportunity, value: any) {
    const op = allOpportunities.find(o => o.id === id)
    if (!op) return

    const canEditOp = isAdmin || (isProducer && op.organizationId === orgId)

    if (!canEditOp) return

    const updated = {
      ...op,
      [field]: value,
      updatedAt: new Date().toISOString(),
    }

    if (isProducer || isAdmin || op._fromSupabase) {
      setSupabaseOps(prev => prev.map((o: any) => o.id === id ? updated : o))
      saveOpportunityToSupabase(updated, op.organizationId || orgId).catch(console.error)
    } else {
      const isManual = manual.some(o => o.id === id)

      if (!isManual) {
        persistLocal([{ ...updated, source: 'editado' }, ...manual])
      } else {
        persistLocal(manual.map(o => o.id === id ? updated : o))
      }
    }
  }

  function deleteOpportunity(id: string) {
    if (!confirm('Apagar esta oportunidade?')) return

    const op = allOpportunities.find(o => o.id === id)
    const canDelete = isAdmin || (isProducer && op?.organizationId === orgId)

    if (!canDelete) {
      alert('Só podes apagar oportunidades criadas por ti.')
      return
    }

    if (isProducer || isAdmin || supabaseOps.some((o: any) => o.id === id)) {
      deleteOpportunityFromSupabase(id).catch(console.error)
      setSupabaseOps(prev => prev.filter((o: any) => o.id !== id))
    } else {
      persistLocal(manual.filter(o => o.id !== id))
    }

    setEditing(null)
  }

  function duplicateToEdit(op: Opportunity) {
    const existsInEditableBase =
      isAdmin ||
      (isProducer && op.organizationId === orgId) ||
      manual.some((o: any) => o.id === op.id)

    setEditing({
      ...emptyOpportunity(),
      ...op,
      id: existsInEditableBase ? op.id : crypto.randomUUID(),
      isPrivate: Boolean(op.isPrivate),
      _fromWeb: undefined,
      _matchScore: undefined,
      _matchReasons: undefined,
      updatedAt: new Date().toISOString(),
    })
  }

  function assignArtist() {
    if (!assigning) return

    const artist = artists.find(a => a.id === selectedArtistId)

    if (!artist) {
      alert('Selecciona um artista.')
      return
    }

    const name = artist.artisticName || artist.name || 'Artista'

    quickUpdate(assigning.id, 'assignedArtistId', artist.id)
    quickUpdate(assigning.id, 'assignedArtistName', name)

    setAssigning(null)
    setSelectedArtistId('')
  }

  async function handleCsv(file: File) {
    const text = await file.text()
    const parsed = parseCsv(text)

    if (isProducer || isAdmin) {
      await saveOpportunitiesBatch(parsed, orgId)
      await refreshSupabaseOps()
    } else {
      persistLocal([...parsed, ...manual])
    }

    alert(`${parsed.length} oportunidades importadas.`)

    if (fileRef.current) fileRef.current.value = ''
  }

  function exportCsv() {
    const headers = [
      'title', 'organization', 'type', 'country', 'city', 'deadline', 'openingDate',
      'recurrence', 'disciplines', 'keywords', 'coversCosts', 'isPrivate', 'link',
      'summary', 'notes', 'source',
    ]

    const rows = filteredBase.map(op =>
      [
        op.title, op.organization, op.type, op.countryName, op.city, op.deadline,
        op.openingDate, op.recurrence, op.disciplines, op.keywords,
        op.coversCosts ? 'true' : 'false', op.isPrivate ? 'true' : 'false',
        op.link, op.summary, op.notes, op.source,
      ].map(escapeCsv).join(',')
    )

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `soma-oportunidades-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()

    URL.revokeObjectURL(url)
  }

  // Permissões calculadas por card
  function canEditOp(op: Opportunity) {
    return isAdmin || (isProducer && op.organizationId === orgId) || (!isProducer && manual.some(m => m.id === op.id))
  }

  function renderCard(op: Opportunity, isWeb = false) {
    const editable = canEditOp(op)
    return (
      <MatchCard
        key={op.id}
        op={op}
        isWeb={isWeb}
        activeScout={activeScout}
        isQuickEdit={quickEdit === op.id}
        canEdit={editable}
        canDelete={editable}
        isAdmin={isAdmin}
        isProducer={isProducer}
        loadingAnalysis={loadingAnalysis}
        onToggleQuickEdit={() => setQuickEdit(quickEdit === op.id ? null : op.id)}
        onQuickUpdate={(field, value) => quickUpdate(op.id, field, value)}
        onAnalysis={() => openAnalysis(op)}
        onAssign={() => { setAssigning(op); setSelectedArtistId(op.assignedArtistId || '') }}
        onShare={() => { setShareOp(op); setShareTargetOrgId('') }}
        onSaveWeb={() => saveWebOpportunity(op)}
        onDuplicate={() => duplicateToEdit(op)}
        onDelete={() => deleteOpportunity(op.id)}
      />
    )
  }

  return (
    <div style={st.wrap}>
      <header style={st.header}>
        <div>
          <h1 style={st.title}>Oportunidades</h1>
          <p style={st.subtitle}>
            {activeScout
              ? `${filteredBase.length} relevantes de ${allOpportunities.length} · Scout: ${activeScout.name}`
              : `${filteredBase.length} de ${allOpportunities.length}`}
            {webResults.length > 0 && ` · ${webResults.length} novas`}
            {urgentCount > 0 && <span style={{ color: '#ff8a8a', marginLeft: 8 }}>⚠️ {urgentCount} urgentes</span>}
            {isProducer && <span style={{ color: '#60b4e8', marginLeft: 8, fontSize: 11 }}>· visão producer</span>}
          </p>
        </div>

        <div style={st.headerActions}>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleCsv(f) }} />
          <button style={st.secondaryBtn} onClick={() => fileRef.current?.click()}>📥 CSV</button>
          <button style={st.secondaryBtn} onClick={exportCsv}>📤 Exportar</button>
          <button style={st.primaryBtn} onClick={() => setEditing(emptyOpportunity())}>+ Nova</button>
        </div>
      </header>

      {!isProducer && <ScoutUrlExtractor onSave={handleScoutSave} />}
      {!isProducer && <ScoutSavedSearches onSave={handleScoutCallback} />}

      <ContextualMatchPanel artists={matchArtists} opportunities={allOpportunities} />

      {activeScout && (
        <div style={st.scoutBanner}>
          <div>
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>🔍</span>
            <strong> {activeScout.name}</strong>
            {activeScout.selectedDisciplines && activeScout.selectedDisciplines.length > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginLeft: 8 }}>
                [{safeArr(activeScout.selectedDisciplines).join(', ')}]
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {webLoading && <span style={{ color: '#60b4e8', fontSize: 12 }}>⟳ A pesquisar com Gemini...</span>}
            {webNote && !webLoading && (
              <span style={{ fontSize: 12, color: webMethod === 'grounding' ? '#6ef3a5' : '#ffcf5c' }}>
                {webMethod === 'grounding' ? '🌐' : '🧠'} {webNote}
              </span>
            )}
            {webError && !webLoading && <span style={{ color: '#ff8a8a', fontSize: 12 }}>⚠ {webError}</span>}
            <button style={st.clearBtn} onClick={clearScout}>× Limpar</button>
          </div>
        </div>
      )}

      <section style={st.toolbar}>
        <input style={st.input}
          placeholder="Pesquisar título, organização, país, disciplina..."
          value={search}
          onChange={e => { setSearch(e.target.value); if (activeScout) setActiveScout(null) }} />

        <select style={st.select} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          {types.map(t => <option key={t} value={t}>{TYPE_ICONS[t] || '📌'} {t}</option>)}
        </select>

        <select style={st.select} value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
          <option value="todos">Todos os países</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <label style={st.check}>
          <input type="checkbox" checked={onlyCosts} onChange={e => setOnlyCosts(e.target.checked)} />
          Custos cobertos
        </label>

        <label style={st.check}>
          <input type="checkbox" checked={showExpired} onChange={e => setShowExpired(e.target.checked)} />
          Mostrar expiradas
        </label>
      </section>

      {webResults.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={st.sectionHeader}>
            <h2 style={st.sectionTitle}>
              {webMethod === 'grounding' ? '🌐 Google Search' : '🧠 Gemini'} — {webResults.length} encontradas
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
              Guarda as relevantes → edita deadline e notas → associa ao artista
            </p>
          </div>
          <div style={st.grid}>{webResults.map(op => renderCard(op, true))}</div>
        </section>
      )}

      <section>
        {activeScout && filteredBase.length > 0 && (
          <div style={st.sectionHeader}>
            <h2 style={st.sectionTitle}>
              📁 Base — {filteredBase.length} relevantes
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginLeft: 8 }}>
                (score ≥ {SCORE_THRESHOLD}%)
              </span>
            </h2>
          </div>
        )}

        {filteredBase.length === 0 && (
          <div style={st.empty}>
            <p>{isProducer ? 'Ainda não tens oportunidades visíveis. Adiciona manualmente ou importa via CSV.' : activeScout ? 'Nenhuma oportunidade relevante na base.' : 'Nenhuma oportunidade encontrada.'}</p>
            {isProducer && <p style={{ opacity: 0.6, fontSize: 12, marginTop: 8 }}>A SOMA também pode publicar oportunidades para todos os produtores.</p>}
          </div>
        )}

        <div style={st.grid}>{filteredBase.map(op => renderCard(op, false))}</div>
      </section>

      {assigning && (
        <AssignArtistModal
          assigning={assigning}
          artists={artists}
          selectedArtistId={selectedArtistId}
          onSelect={setSelectedArtistId}
          onCancel={() => setAssigning(null)}
          onConfirm={assignArtist}
        />
      )}

      {shareOp && (
        <ShareProducerModal
          shareOp={shareOp}
          producerOrgs={producerOrgs}
          shareTargetOrgId={shareTargetOrgId}
          sharing={sharing}
          onSelect={setShareTargetOrgId}
          onCancel={() => { setShareOp(null); setShareTargetOrgId('') }}
          onConfirm={async () => {
            if (!shareTargetOrgId || !shareOp) return

            setSharing(true)

            try {
              await shareOpportunityWithProducer(shareOp.id, shareTargetOrgId, orgId, shareOp)
              alert(`✅ "${shareOp.title}" partilhada com sucesso!`)
              setShareOp(null)
              setShareTargetOrgId('')
              await refreshSupabaseOps()
            } catch (err: any) {
              alert('Erro ao partilhar: ' + err.message)
            } finally {
              setSharing(false)
            }
          }}
        />
      )}

      {editing && (
        <OpportunityEditModal
          editing={editing}
          isExisting={allOpportunities.some((o: any) => o.id === editing.id)}
          isAdmin={isAdmin}
          onChange={setEditing}
          onSave={() => saveOpportunity(editing)}
          onDelete={() => deleteOpportunity(editing.id)}
          onClose={() => setEditing(null)}
        />
      )}

      {analysisOp && analysisArtist && !loadingAnalysis && (
        <SomaAnalysisModal
          opportunity={{
            title: analysisOp.title,
            organization: analysisOp.organization,
            type: analysisOp.type,
            countryName: analysisOp.countryName,
            city: analysisOp.city,
            summary: analysisOp.summary,
            link: analysisOp.link,
            disciplines: safeArr(analysisOp.disciplines),
            keywords: safeArr(analysisOp.keywords),
            coversCosts: analysisOp.coversCosts,
            deadline: analysisOp.deadline,
          }}
          artist={analysisArtist}
          onClose={() => { setAnalysisOp(null); setAnalysisArtist(null) }}
        />
      )}
    </div>
  )
}