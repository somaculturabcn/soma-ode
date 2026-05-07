// src/components/EventManager.tsx
// SOMA ODÉ — Módulo Festas e Eventos v2
// Artistas externos, campanha, SWOT/IA, materiais, relatório

import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { loadEvents, saveEvent, deleteEvent } from '../data/eventsSupabaseStore'
import { loadArtistsFromSupabase } from '../data/artistsSupabaseStore'
import type {
  SomaEvent, ExternalArtist, EventTeamMember,
  AgreementType, PaymentMethod
} from '../types/event'
import {
  emptyEvent, calcProfit, calcTotalExternalFees, calcTotalTeamFees,
  EVENT_TYPE_LABELS, EVENT_STATUS_LABELS, EVENT_STATUS_COLORS,
  AGREEMENT_LABELS, PAYMENT_LABELS, TEAM_ROLES, CAMPAIGN_PLATFORMS,
} from '../types/event'
import type { Artist } from '../types/artist'

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

function formatDate(d?: string) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('pt-BR') } catch { return d }
}

// ─── Componente principal ─────────────────────────────────

export default function EventManager() {
  const { user } = useAuth()
  const [events, setEvents] = useState<SomaEvent[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editing, setEditing] = useState<SomaEvent | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [analyzingAI, setAnalyzingAI] = useState(false)
  const [aiError, setAiError] = useState('')

  const orgId = user?.organizationId || '00000000-0000-0000-0000-000000000001'
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''

  useEffect(() => {
    Promise.all([loadEvents(orgId), loadArtistsFromSupabase()])
      .then(([evs, arts]) => { setEvents(evs); setArtists(arts); setLoading(false) })
  }, [orgId])

  function newEvent() {
    setEditing({ id: crypto.randomUUID(), ...emptyEvent(orgId) })
    setView('form'); setMsg('')
  }

  function editEvent(ev: SomaEvent) {
    setEditing({
      ...ev,
      externalArtists: ev.externalArtists || [],
      team: ev.team || [],
      campaign: ev.campaign || { hasCampaign: false },
      materials: ev.materials || {},
    })
    setView('form'); setMsg('')
  }

  async function handleSave() {
    if (!editing?.name?.trim()) { setMsg('⚠ Nome do evento é obrigatório.'); return }
    setSaving(true); setMsg('')
    try {
      await saveEvent(editing)
      const updated = await loadEvents(orgId)
      setEvents(updated)
      setMsg('✅ Evento guardado!')
      setTimeout(() => setView('list'), 1200)
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`)
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Apagar este evento?')) return
    await deleteEvent(id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  function upd(field: string, value: any) {
    setEditing(prev => prev ? { ...prev, [field]: value } : null)
  }

  function updNested(parent: string, field: string, value: any) {
    setEditing(prev => {
      if (!prev) return null
      return { ...prev, [parent]: { ...(prev as any)[parent], [field]: value } }
    })
  }

  // ── Análise SOMA com IA ───────────────────────────────

  async function runSomaAnalysis() {
    if (!editing || !apiKey) return
    setAnalyzingAI(true); setAiError('')

    const extNames = editing.externalArtists.map(a => `${a.name} (${a.role}, ${a.fee || 0}€)`).join(', ')
    const teamNames = editing.team.map(m => `${m.name} (${m.role}, ${m.fee || 0}€)`).join(', ')
    const totalCosts = calcTotalExternalFees(editing.externalArtists) +
      calcTotalTeamFees(editing.team) +
      (editing.budget.productionCosts || 0) +
      (editing.budget.marketingCosts || 0) +
      (editing.budget.venueRent || 0) +
      (editing.budget.otherCosts || 0)
    const totalRevenue = (editing.budget.ticketRevenueActual || 0) +
      (editing.budget.barRevenueActual || 0) +
      (editing.budget.otherRevenueActual || 0)
    const profit = totalRevenue - totalCosts
    const status = editing.status

    const prompt = `Você é especialista em produção cultural e eventos. Analise este evento e gere uma análise completa em português do Brasil.

EVENTO: ${editing.name}
Tipo: ${EVENT_TYPE_LABELS[editing.type]}
Data: ${editing.eventDate || 'não definida'}
Venue: ${editing.venueName || 'não definido'}, ${editing.venueCity || ''}
Status: ${EVENT_STATUS_LABELS[editing.status]}

ARTISTAS EXTERNOS: ${extNames || 'nenhum'}
EQUIPA INTERNA: ${teamNames || 'nenhuma'}

FINANCEIRO:
- Custos totais: ${totalCosts}€
- Receita real: ${totalRevenue}€
- Resultado: ${profit}€ (${profit >= 0 ? 'positivo' : 'negativo'})
- Marketing: ${editing.budget.marketingCosts || 0}€

CAMPANHA: ${editing.campaign?.hasCampaign ? 'sim' : 'não'}
${editing.campaign?.hasCampaign ? `Plataformas: ${(editing.campaign.platforms || []).join(', ')}` : ''}
${editing.campaign?.hasCampaign ? `Budget ads: ${editing.campaign.adsBudget || 0}€` : ''}
${editing.campaign?.hasCampaign ? `Tickets online: ${editing.campaign.ticketsSoldOnline || 0}` : ''}

PÚBLICO: esperado ${editing.audience.expected || '?'}, real ${editing.audience.actual || 'não registado'}
Entrada: ${editing.audience.entryPrice || 0}€

NOTAS: ${editing.notes || ''}
RECAP: ${editing.postEventNotes || ''}

Responda SOMENTE com JSON válido, sem texto adicional:
{
  "swot": {
    "forcas": ["frase curta 1", "frase curta 2"],
    "fraquezas": ["frase curta 1"],
    "oportunidades": ["frase curta 1"],
    "ameacas": ["frase curta 1"]
  },
  "lucrabilidadeScore": 70,
  "lucrabilidadeVerdict": "lucrativo",
  "lucrabilidadeAnalysis": "análise em 2 frases",
  "dicasCrescimento": ["dica 1", "dica 2", "dica 3"],
  "acordoRecomendado": "cachê fixo com possibilidade de bonus por público atingido",
  "proximaEdicao": "sugestão concreta para a próxima edição"
}`

    try {
      const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048, responseMimeType: 'application/json' },
        }),
      })
      if (!res.ok) throw new Error(`Gemini ${res.status}`)
      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(clean)

      setEditing(prev => prev ? {
        ...prev,
        somaAnalysis: {
          swot: parsed.swot,
          lucrabilidadeScore: parsed.lucrabilidadeScore,
          lucrabilidadeVerdict: parsed.lucrabilidadeVerdict,
          lucrabilidadeAnalysis: parsed.lucrabilidadeAnalysis,
          dicasCrescimento: parsed.dicasCrescimento,
          acordoRecomendado: parsed.acordoRecomendado,
          proximaEdicao: parsed.proximaEdicao,
          generatedAt: new Date().toISOString(),
        }
      } : null)
    } catch (err: any) {
      setAiError(`Erro na análise: ${err.message}`)
    } finally { setAnalyzingAI(false) }
  }

  // ── Relatório HTML ────────────────────────────────────

  function generateReport() {
    if (!editing) return
    const profit = calcProfit(editing)
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>${editing.name} — Relatório SOMA ODÉ</title>
<style>
body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:40px;color:#111}
h1{font-size:28px;margin-bottom:4px}
h2{font-size:16px;color:#1A6994;margin:28px 0 10px;text-transform:uppercase;letter-spacing:0.12em}
.meta{color:#666;font-size:14px;margin-bottom:24px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
.card{background:#f8f8f8;border-radius:8px;padding:14px}
.label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px}
.value{font-size:15px;font-weight:600}
.profit{font-size:24px;font-weight:800;color:${profit >= 0 ? '#15803d' : '#dc2626'}}
table{width:100%;border-collapse:collapse;font-size:14px}
th{text-align:left;padding:8px;background:#f0f0f0;font-size:12px;color:#555}
td{padding:8px;border-bottom:1px solid #eee}
.swot-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.swot-card{padding:14px;border-radius:8px}
.swot-card.f{background:#dcfce7}.swot-card.fr{background:#fee2e2}
.swot-card.o{background:#dbeafe}.swot-card.a{background:#fef9c3}
ul{margin:4px 0;padding-left:16px}li{margin:3px 0;font-size:13px}
.dicas{background:#f0f9ff;border-radius:8px;padding:16px}
footer{margin-top:40px;font-size:12px;color:#aaa;text-align:center}
</style></head>
<body>
<h1>${editing.name}</h1>
<p class="meta">${EVENT_TYPE_LABELS[editing.type]} · ${formatDate(editing.eventDate)} ${editing.startTime || ''}–${editing.endTime || ''} · ${EVENT_STATUS_LABELS[editing.status]}</p>

<h2>Venue</h2>
<p>${editing.venueName || '—'}${editing.venueAddress ? ', ' + editing.venueAddress : ''} — ${editing.venueCity || ''}</p>

${editing.externalArtists.length > 0 ? `
<h2>Artistas</h2>
<table><tr><th>Nome</th><th>Função</th><th>Acordo</th><th>Cachê</th><th>Pagamento</th></tr>
${editing.externalArtists.map(a => `<tr>
  <td><strong>${a.name}</strong>${a.instagram ? '<br><small>' + a.instagram + '</small>' : ''}</td>
  <td>${a.role}</td>
  <td>${AGREEMENT_LABELS[a.agreementType]}</td>
  <td>${a.fee ? a.fee + '€' : '—'}</td>
  <td>${a.paymentMethod ? PAYMENT_LABELS[a.paymentMethod] : '—'}</td>
</tr>`).join('')}
</table>` : ''}

${editing.team.length > 0 ? `
<h2>Equipa</h2>
<table><tr><th>Nome</th><th>Função</th><th>Cachê</th></tr>
${editing.team.map(m => `<tr><td>${m.name}</td><td>${m.role}</td><td>${m.fee ? m.fee + '€' : '—'}</td></tr>`).join('')}
</table>` : ''}

<h2>Financeiro</h2>
<div class="grid">
  <div class="card"><div class="label">Receita real</div><div class="value">${(editing.budget.ticketRevenueActual || 0) + (editing.budget.barRevenueActual || 0)}€</div></div>
  <div class="card"><div class="label">Custos totais</div><div class="value">${calcTotalExternalFees(editing.externalArtists) + calcTotalTeamFees(editing.team) + (editing.budget.productionCosts || 0) + (editing.budget.marketingCosts || 0) + (editing.budget.venueRent || 0)}€</div></div>
  <div class="card"><div class="label">Resultado</div><div class="profit">${profit >= 0 ? '+' : ''}${profit}€</div></div>
  <div class="card"><div class="label">Público real</div><div class="value">${editing.audience.actual || '—'} pessoas</div></div>
</div>

${editing.campaign?.hasCampaign ? `
<h2>Campanha</h2>
<div class="grid">
  ${editing.campaign.adsBudget ? `<div class="card"><div class="label">Budget ads</div><div class="value">${editing.campaign.adsBudget}€</div></div>` : ''}
  ${editing.campaign.ticketsSoldOnline ? `<div class="card"><div class="label">Tickets online</div><div class="value">${editing.campaign.ticketsSoldOnline}</div></div>` : ''}
  ${editing.campaign.impressions ? `<div class="card"><div class="label">Impressões</div><div class="value">${editing.campaign.impressions}</div></div>` : ''}
</div>` : ''}

${editing.somaAnalysis ? `
<h2>Análise SOMA</h2>
${editing.somaAnalysis.swot ? `
<div class="swot-grid">
  <div class="swot-card f"><strong>💪 Forças</strong><ul>${(editing.somaAnalysis.swot.forcas || []).map(f => `<li>${f}</li>`).join('')}</ul></div>
  <div class="swot-card fr"><strong>⚠ Fraquezas</strong><ul>${(editing.somaAnalysis.swot.fraquezas || []).map(f => `<li>${f}</li>`).join('')}</ul></div>
  <div class="swot-card o"><strong>🚀 Oportunidades</strong><ul>${(editing.somaAnalysis.swot.oportunidades || []).map(f => `<li>${f}</li>`).join('')}</ul></div>
  <div class="swot-card a"><strong>⚡ Ameaças</strong><ul>${(editing.somaAnalysis.swot.ameacas || []).map(f => `<li>${f}</li>`).join('')}</ul></div>
</div>` : ''}
${editing.somaAnalysis.lucrabilidadeAnalysis ? `<p><strong>Lucrabilidade:</strong> ${editing.somaAnalysis.lucrabilidadeAnalysis}</p>` : ''}
${editing.somaAnalysis.dicasCrescimento ? `
<div class="dicas"><strong>💡 Dicas de crescimento</strong><ul>${editing.somaAnalysis.dicasCrescimento.map(d => `<li>${d}</li>`).join('')}</ul></div>` : ''}
${editing.somaAnalysis.proximaEdicao ? `<p><strong>Próxima edição:</strong> ${editing.somaAnalysis.proximaEdicao}</p>` : ''}
` : ''}

${editing.postEventNotes ? `<h2>Recap pós-evento</h2><p>${editing.postEventNotes}</p>` : ''}

<footer>Relatório gerado por SOMA ODÉ · ${new Date().toLocaleDateString('pt-BR')}</footer>
</body></html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${editing.name.replace(/\s+/g, '_')}_relatorio.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = filterStatus === 'todos' ? events : events.filter(e => e.status === filterStatus)

  // ── LISTA ─────────────────────────────────────────────

  if (view === 'list') {
    return (
      <div style={s.wrap}>
        <div style={s.pageHeader}>
          <div>
            <h1 style={s.pageTitle}>Eventos</h1>
            <p style={s.pageCount}>{events.length} eventos · {events.filter(e => e.status === 'realizado').length} realizados</p>
          </div>
          <button style={s.primaryBtn} onClick={newEvent}>+ Novo evento</button>
        </div>

        <div style={s.filterRow}>
          {['todos', 'ideia', 'confirmado', 'em_producao', 'realizado', 'cancelado'].map(st => (
            <button key={st} style={{ ...s.filterBtn, ...(filterStatus === st ? s.filterBtnActive : {}) }}
              onClick={() => setFilterStatus(st)}>
              {st === 'todos' ? 'Todos' : (EVENT_STATUS_LABELS as any)[st] || st}
            </button>
          ))}
        </div>

        {loading && <div style={s.empty}>A carregar...</div>}
        {!loading && filtered.length === 0 && (
          <div style={s.empty}><p>Nenhum evento ainda.</p><p style={{ opacity: 0.5, fontSize: 13 }}>Clica em "+ Novo evento" para começar.</p></div>
        )}

        <div style={s.grid}>
          {filtered.map(ev => {
            const sc = EVENT_STATUS_COLORS[ev.status]
            const totalFees = calcTotalExternalFees(ev.externalArtists || []) + calcTotalTeamFees(ev.team || [])
            const profit = calcProfit(ev)
            const rosterArtists = artists.filter(a => ev.artistIds.includes(a.id))
            const allNames = [
              ...rosterArtists.map(a => a.name),
              ...(ev.externalArtists || []).map(a => a.name),
            ]
            return (
              <div key={ev.id} style={{ ...s.card, borderColor: `${sc}40` }}>
                <div style={s.cardTop}>
                  <div style={{ flex: 1 }}>
                    <span style={{ ...s.typeBadge, color: sc, borderColor: `${sc}30` }}>{EVENT_TYPE_LABELS[ev.type]}</span>
                    <h3 style={s.cardTitle}>{ev.name || 'Sem nome'}</h3>
                    <div style={s.cardMeta}>
                      {ev.eventDate && <span>📅 {formatDate(ev.eventDate)}</span>}
                      {ev.startTime && <span>🕐 {ev.startTime}{ev.endTime ? `–${ev.endTime}` : ''}</span>}
                      {ev.venueName && <span>📍 {ev.venueName}{ev.venueCity ? `, ${ev.venueCity}` : ''}</span>}
                    </div>
                  </div>
                  <span style={{ ...s.statusBadge, color: sc }}>{EVENT_STATUS_LABELS[ev.status]}</span>
                </div>
                {allNames.length > 0 && (
                  <div style={s.chipRow}>
                    {allNames.slice(0, 4).map(n => <span key={n} style={s.chip}>{n}</span>)}
                    {allNames.length > 4 && <span style={s.chip}>+{allNames.length - 4}</span>}
                  </div>
                )}
                {(totalFees > 0 || ev.status === 'realizado') && (
                  <div style={s.budgetRow}>
                    {totalFees > 0 && <span style={s.budgetItem}>🎤 Cachês: {totalFees}€</span>}
                    {ev.budget.marketingCosts ? <span style={s.budgetItem}>📣 Ads: {ev.budget.marketingCosts}€</span> : null}
                    {ev.status === 'realizado' && (
                      <span style={{ ...s.budgetItem, color: profit >= 0 ? '#6ef3a5' : '#ff8a8a', fontWeight: 700 }}>
                        {profit >= 0 ? '↑' : '↓'} Resultado: {profit}€
                      </span>
                    )}
                    {ev.somaAnalysis && <span style={{ ...s.budgetItem, color: '#60b4e8' }}>🔍 SWOT feito</span>}
                  </div>
                )}
                <div style={s.cardActions}>
                  <button style={s.editBtn} onClick={() => editEvent(ev)}>✏ Editar</button>
                  <button style={s.deleteBtn} onClick={() => handleDelete(ev.id)}>🗑</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── FORMULÁRIO ────────────────────────────────────────

  if (!editing) return null
  const b = editing.budget
  const aud = editing.audience
  const camp = editing.campaign || { hasCampaign: false }
  const mats = editing.materials || {}
  const analysis = editing.somaAnalysis

  return (
    <div style={s.wrap}>
      <div style={s.formHeader}>
        <button style={s.backBtn} onClick={() => setView('list')}>← Voltar</button>
        <h2 style={s.formTitle}>{editing.name || 'Novo evento'}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...s.reportBtn }} onClick={generateReport}>📄 Relatório</button>
          <button style={{ ...s.primaryBtn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? 'A guardar...' : '💾 Guardar'}
          </button>
        </div>
      </div>

      {msg && <div style={{ ...s.message, color: msg.startsWith('✅') ? '#6ef3a5' : '#ffcf5c' }}>{msg}</div>}

      {/* 01 INFO BÁSICA */}
      <Sec title="01 · Informação básica">
        <F label="Nome do evento *" v={editing.name} onChange={v => upd('name', v)} />
        <div style={s.grid2}>
          <Sel label="Tipo" v={editing.type} onChange={v => upd('type', v)}
            opts={Object.entries(EVENT_TYPE_LABELS).map(([k, l]) => ({ value: k, label: l }))} />
          <Sel label="Status" v={editing.status} onChange={v => upd('status', v)}
            opts={Object.entries(EVENT_STATUS_LABELS).map(([k, l]) => ({ value: k, label: l }))} />
          <F label="Data" v={editing.eventDate || ''} onChange={v => upd('eventDate', v)} type="date" />
          <F label="Hora início" v={editing.startTime || ''} onChange={v => upd('startTime', v)} placeholder="23:00" />
          <F label="Hora fim" v={editing.endTime || ''} onChange={v => upd('endTime', v)} placeholder="05:00" />
        </div>
        <FA label="Notas internas" v={editing.notes || ''} onChange={v => upd('notes', v)} />
      </Sec>

      {/* 02 VENUE */}
      <Sec title="02 · Venue">
        <div style={s.grid2}>
          <F label="Nome do venue" v={editing.venueName || ''} onChange={v => upd('venueName', v)} />
          <F label="Instagram do venue" v={editing.venueInstagram || ''} onChange={v => upd('venueInstagram', v)} placeholder="@luaclub.barcelona" />
          <F label="Cidade" v={editing.venueCity || ''} onChange={v => upd('venueCity', v)} />
          <F label="País" v={editing.venueCountry || ''} onChange={v => upd('venueCountry', v)} />
          <F label="Endereço" v={editing.venueAddress || ''} onChange={v => upd('venueAddress', v)} />
          <F label="Capacidade" v={String(editing.venueCapacity || '')} onChange={v => upd('venueCapacity', v ? Number(v) : undefined)} type="number" />
          <F label="Contato venue" v={editing.venueContact || ''} onChange={v => upd('venueContact', v)} />
        </div>
      </Sec>

      {/* 03 ARTISTAS DO ROSTER */}
      <Sec title="03 · Artistas do roster">
        <p style={s.hint}>Artistas já registados no sistema.</p>
        <div style={s.chipRow}>
          {artists.map(a => {
            const sel = editing.artistIds.includes(a.id)
            return (
              <button key={a.id} type="button"
                style={{ ...s.chip, ...(sel ? s.chipActive : {}) }}
                onClick={() => upd('artistIds', sel ? editing.artistIds.filter(id => id !== a.id) : [...editing.artistIds, a.id])}>
                {a.name}
              </button>
            )
          })}
          {artists.length === 0 && <span style={s.hint}>Sem artistas no roster.</span>}
        </div>
      </Sec>

      {/* 04 ARTISTAS EXTERNOS */}
      <Sec title="04 · Artistas externos">
        <p style={s.hint}>DJs, performers e outros artistas que não estão no roster. Toda a informação de contato e pagamento fica guardada aqui.</p>
        {editing.externalArtists.map((artist, i) => (
          <div key={artist.id} style={s.extArtistCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong style={{ color: '#fff', fontSize: 14 }}>{artist.name || `Artista ${i + 1}`}</strong>
              <button style={s.removeBtn} onClick={() => upd('externalArtists', editing.externalArtists.filter((_, j) => j !== i))}>✕ Remover</button>
            </div>
            <div style={s.grid2}>
              <F label="Nome *" v={artist.name} onChange={v => {
                const a = [...editing.externalArtists]; a[i] = { ...a[i], name: v }; upd('externalArtists', a)
              }} />
              <Sel label="Função" v={artist.role} onChange={v => {
                const a = [...editing.externalArtists]; a[i] = { ...a[i], role: v }; upd('externalArtists', a)
              }} opts={TEAM_ROLES.map(r => ({ value: r, label: r }))} />
              <F label="Instagram" v={artist.instagram || ''} onChange={v => {
                const a = [...editing.externalArtists]; a[i] = { ...a[i], instagram: v }; upd('externalArtists', a)
              }} placeholder="@artista" />
              <F label="Email" v={artist.email || ''} onChange={v => {
                const a = [...editing.externalArtists]; a[i] = { ...a[i], email: v }; upd('externalArtists', a)
              }} />
              <F label="Telefone / WhatsApp" v={artist.phone || ''} onChange={v => {
                const a = [...editing.externalArtists]; a[i] = { ...a[i], phone: v }; upd('externalArtists', a)
              }} />
            </div>
            <div style={s.grid2}>
              <Sel label="Tipo de acordo" v={artist.agreementType} onChange={v => {
                const a = [...editing.externalArtists]; a[i] = { ...a[i], agreementType: v as AgreementType }; upd('externalArtists', a)
              }} opts={Object.entries(AGREEMENT_LABELS).map(([k, l]) => ({ value: k, label: l }))} />
              <F label="Cachê (€)" v={String(artist.fee || '')} type="number" onChange={v => {
                const a = [...editing.externalArtists]; a[i] = { ...a[i], fee: v ? Number(v) : undefined }; upd('externalArtists', a)
              }} />
              <Sel label="Método de pagamento" v={artist.paymentMethod || ''} onChange={v => {
                const a = [...editing.externalArtists]; a[i] = { ...a[i], paymentMethod: v as PaymentMethod }; upd('externalArtists', a)
              }} opts={[{ value: '', label: '— Seleccionar —' }, ...Object.entries(PAYMENT_LABELS).map(([k, l]) => ({ value: k, label: l }))]} />
              {artist.paymentMethod === 'transferencia_bancaria' && (
                <F label="IBAN / Conta" v={artist.iban || ''} onChange={v => {
                  const a = [...editing.externalArtists]; a[i] = { ...a[i], iban: v }; upd('externalArtists', a)
                }} />
              )}
              {artist.paymentMethod === 'paypal' && (
                <F label="Email PayPal" v={artist.paypalEmail || ''} onChange={v => {
                  const a = [...editing.externalArtists]; a[i] = { ...a[i], paypalEmail: v }; upd('externalArtists', a)
                }} />
              )}
              {artist.paymentMethod === 'bizum' && (
                <F label="Telefone Bizum" v={artist.bizumPhone || ''} onChange={v => {
                  const a = [...editing.externalArtists]; a[i] = { ...a[i], bizumPhone: v }; upd('externalArtists', a)
                }} />
              )}
              {artist.paymentMethod === 'revolut' && (
                <F label="Revolut handle" v={artist.revolutHandle || ''} onChange={v => {
                  const a = [...editing.externalArtists]; a[i] = { ...a[i], revolutHandle: v }; upd('externalArtists', a)
                }} />
              )}
            </div>
            <FA label="Notas de contrato" v={artist.contractNotes || ''} onChange={v => {
              const a = [...editing.externalArtists]; a[i] = { ...a[i], contractNotes: v }; upd('externalArtists', a)
            }} />
          </div>
        ))}
        <button style={s.addBtn} onClick={() => upd('externalArtists', [...editing.externalArtists, {
          id: crypto.randomUUID(), name: '', role: 'DJ', agreementType: 'cache_fixo' as AgreementType
        }])}>
          + Adicionar artista externo
        </button>
        {editing.externalArtists.length > 0 && (
          <p style={{ ...s.hint, marginTop: 8 }}>Total em cachês externos: <strong style={{ color: '#ffcf5c' }}>{calcTotalExternalFees(editing.externalArtists)}€</strong></p>
        )}
      </Sec>

      {/* 05 EQUIPA INTERNA */}
      <Sec title="05 · Equipa de produção">
        {editing.team.map((member, i) => (
          <div key={member.id} style={s.teamRow}>
            <input style={{ ...s.input, flex: 2 }} placeholder="Nome" value={member.name}
              onChange={e => { const t = [...editing.team]; t[i] = { ...t[i], name: e.target.value }; upd('team', t) }} />
            <select style={{ ...s.select, flex: 1 }} value={member.role}
              onChange={e => { const t = [...editing.team]; t[i] = { ...t[i], role: e.target.value }; upd('team', t) }}>
              {TEAM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input style={{ ...s.input, width: 90 }} placeholder="Cachê €" type="number"
              value={member.fee || ''}
              onChange={e => { const t = [...editing.team]; t[i] = { ...t[i], fee: e.target.value ? Number(e.target.value) : undefined }; upd('team', t) }} />
            <button style={s.removeBtnInline} onClick={() => upd('team', editing.team.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button style={s.addBtn} onClick={() => upd('team', [...editing.team, { id: crypto.randomUUID(), name: '', role: 'Técnico de som' }])}>
          + Adicionar pessoa da equipa
        </button>
        {editing.team.length > 0 && (
          <p style={{ ...s.hint, marginTop: 8 }}>Total equipa: <strong style={{ color: '#ffcf5c' }}>{calcTotalTeamFees(editing.team)}€</strong></p>
        )}
      </Sec>

      {/* 06 PÚBLICO E ENTRADAS */}
      <Sec title="06 · Público e entradas">
        <div style={s.grid2}>
          <F label="Público esperado" v={String(aud.expected || '')} type="number"
            onChange={v => updNested('audience', 'expected', v ? Number(v) : undefined)} />
          <F label="Público real (pós-evento)" v={String(aud.actual || '')} type="number"
            onChange={v => updNested('audience', 'actual', v ? Number(v) : undefined)} />
          <F label="Preço de entrada (€)" v={String(aud.entryPrice || '')} type="number"
            onChange={v => updNested('audience', 'entryPrice', v ? Number(v) : undefined)} />
          <F label="Entrada gratuita até" v={aud.freeEntryUntil || ''}
            onChange={v => updNested('audience', 'freeEntryUntil', v)} placeholder="00:00" />
          <F label="Código de desconto" v={aud.discountCode || ''}
            onChange={v => updNested('audience', 'discountCode', v)} placeholder="FERNA7" />
          <F label="Preço com desconto (€)" v={String(aud.discountPrice || '')} type="number"
            onChange={v => updNested('audience', 'discountPrice', v ? Number(v) : undefined)} />
        </div>
        <F label="Info lista" v={aud.listInfo || ''} onChange={v => updNested('audience', 'listInfo', v)} placeholder="Lista via DM até 00h" />
        <F label="Link de tickets" v={aud.ticketLink || ''} onChange={v => updNested('audience', 'ticketLink', v)} placeholder="https://membrz.club/..." />
      </Sec>

      {/* 07 CAMPANHA */}
      <Sec title="07 · Campanha de marketing">
        <div style={s.toggleRow}>
          <label style={s.toggleLabel}>
            <input type="checkbox" checked={camp.hasCampaign}
              onChange={e => updNested('campaign', 'hasCampaign', e.target.checked)} />
            <span>Fez campanha de divulgação?</span>
          </label>
        </div>
        {camp.hasCampaign && (
          <>
            <div style={{ marginBottom: 12 }}>
              <span style={s.fieldLabel}>Plataformas</span>
              <div style={{ ...s.chipRow, marginTop: 6 }}>
                {CAMPAIGN_PLATFORMS.map(p => {
                  const sel = (camp.platforms || []).includes(p)
                  return (
                    <button key={p} type="button"
                      style={{ ...s.chip, ...(sel ? s.chipActive : {}) }}
                      onClick={() => {
                        const pl = camp.platforms || []
                        updNested('campaign', 'platforms', sel ? pl.filter(x => x !== p) : [...pl, p])
                      }}>
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>
            <div style={s.grid2}>
              <F label="Budget ads pagos (€)" v={String(camp.adsBudget || '')} type="number"
                onChange={v => updNested('campaign', 'adsBudget', v ? Number(v) : 0)} />
              <F label="Tickets vendidos online" v={String(camp.ticketsSoldOnline || '')} type="number"
                onChange={v => updNested('campaign', 'ticketsSoldOnline', v ? Number(v) : 0)} />
              <F label="Impressões totais" v={String(camp.impressions || '')} type="number"
                onChange={v => updNested('campaign', 'impressions', v ? Number(v) : 0)} />
              <F label="Views TikTok" v={String((camp as any).tiktokViews || '')} type="number"
                onChange={v => updNested('campaign', 'tiktokViews', v ? Number(v) : 0)} />
              <F label="Alcance orgânico estimado" v={String(camp.organicReach || '')} type="number"
                onChange={v => updNested('campaign', 'organicReach', v ? Number(v) : 0)} />
              <F label="Cliques no link" v={String(camp.clicks || '')} type="number"
                onChange={v => updNested('campaign', 'clicks', v ? Number(v) : 0)} />
              <F label="Código de desconto" v={camp.discountCode || ''}
                onChange={v => updNested('campaign', 'discountCode', v)} placeholder="FERNA7" />
            </div>
            <FA label="Conceito / copy principal da campanha" v={camp.concept || ''}
              onChange={v => updNested('campaign', 'concept', v)} placeholder="SE JOGA NA LUA 🌙..." />
            <F label="Link post Instagram" v={camp.mainPostLink || ''}
              onChange={v => updNested('campaign', 'mainPostLink', v)} placeholder="https://instagram.com/p/..." />
            {(camp.platforms || []).some(p => p.includes('tiktok')) && (
              <F label="🎵 Link vídeo TikTok" v={camp.tikTokLink || ''}
                onChange={v => updNested('campaign', 'tikTokLink', v)} placeholder="https://tiktok.com/@elbailetodobcn/video/..." />
            )}
            <FA label="Resultado da campanha (pós-evento)" v={camp.result || ''}
              onChange={v => updNested('campaign', 'result', v)} />
          </>
        )}
      </Sec>

      {/* 08 FINANCEIRO */}
      <Sec title="08 · Financeiro">
        <div style={s.grid2}>
          <F label="Receita tickets (real €)" v={String(b.ticketRevenueActual || '')} type="number"
            onChange={v => updNested('budget', 'ticketRevenueActual', v ? Number(v) : 0)} />
          <F label="Receita bar (real €)" v={String(b.barRevenueActual || '')} type="number"
            onChange={v => updNested('budget', 'barRevenueActual', v ? Number(v) : 0)} />
          <F label="Outras receitas (€)" v={String(b.otherRevenueActual || '')} type="number"
            onChange={v => updNested('budget', 'otherRevenueActual', v ? Number(v) : 0)} />
          <F label="Produção / técnica (€)" v={String(b.productionCosts || '')} type="number"
            onChange={v => updNested('budget', 'productionCosts', v ? Number(v) : 0)} />
          <F label="Marketing / impressão (€)" v={String(b.marketingCosts || '')} type="number"
            onChange={v => updNested('budget', 'marketingCosts', v ? Number(v) : 0)} />
          <F label="Aluguel / split venue (€)" v={String(b.venueRent || '')} type="number"
            onChange={v => updNested('budget', 'venueRent', v ? Number(v) : 0)} />
          <F label="Outros custos (€)" v={String(b.otherCosts || '')} type="number"
            onChange={v => updNested('budget', 'otherCosts', v ? Number(v) : 0)} />
        </div>
        {/* Resultado automático */}
        <div style={s.profitBox}>
          {[
            ['Total receita', `${(b.ticketRevenueActual || 0) + (b.barRevenueActual || 0) + (b.otherRevenueActual || 0)}€`],
            ['Cachês externos', `${calcTotalExternalFees(editing.externalArtists)}€`],
            ['Equipa interna', `${calcTotalTeamFees(editing.team)}€`],
            ['Outros custos', `${(b.productionCosts || 0) + (b.marketingCosts || 0) + (b.venueRent || 0) + (b.otherCosts || 0)}€`],
          ].map(([label, val]) => (
            <div key={label} style={s.profitRow}>
              <span>{label}</span><strong>{val}</strong>
            </div>
          ))}
          <div style={{ ...s.profitRow, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 4 }}>
            <span style={{ fontWeight: 700 }}>Resultado</span>
            <strong style={{ color: calcProfit(editing) >= 0 ? '#6ef3a5' : '#ff8a8a', fontSize: 20 }}>
              {calcProfit(editing) >= 0 ? '+' : ''}{calcProfit(editing)}€
            </strong>
          </div>
        </div>
        <FA label="Notas financeiras" v={b.notes || ''} onChange={v => updNested('budget', 'notes', v)} />
      </Sec>

      {/* 09 MATERIAIS */}
      <Sec title="09 · Materiais do evento">
        <p style={s.hint}>Links para ficheiros, fotos, vídeos e documentos relacionados com este evento.</p>
        <div style={s.grid2}>
          <F label="📸 Fotos" v={mats.photosLink || ''} onChange={v => updNested('materials', 'photosLink', v)} placeholder="Google Drive, Dropbox..." />
          <F label="🎬 Vídeo / recap" v={mats.videoLink || ''} onChange={v => updNested('materials', 'videoLink', v)} placeholder="YouTube, Vimeo..." />
          <F label="🎧 Gravação do set" v={mats.setRecordingLink || ''} onChange={v => updNested('materials', 'setRecordingLink', v)} placeholder="SoundCloud, Mixcloud..." />
          <F label="🖼 Poster / flyer" v={mats.posterLink || ''} onChange={v => updNested('materials', 'posterLink', v)} />
          <F label="📰 Press kit" v={mats.pressKitLink || ''} onChange={v => updNested('materials', 'pressKitLink', v)} />
          <F label="🔗 Outros links" v={mats.otherLinks || ''} onChange={v => updNested('materials', 'otherLinks', v)} />
        </div>
      </Sec>

      {/* 10 ANÁLISE SOMA */}
      <Sec title="10 · Análise SOMA">
        <p style={s.hint}>A IA analisa o evento e gera: SWOT, lucrabilidade, dicas de crescimento e recomendação de acordo.</p>
        <button
          style={{ ...s.primaryBtn, background: analyzingAI ? '#333' : '#1A6994', marginBottom: 16, opacity: analyzingAI ? 0.6 : 1 }}
          onClick={runSomaAnalysis}
          disabled={analyzingAI}>
          {analyzingAI ? '⟳ A analisar...' : '🔍 Gerar análise SOMA'}
        </button>
        {aiError && <p style={{ color: '#ff8a8a', fontSize: 13, marginBottom: 12 }}>⚠ {aiError}</p>}

        {analysis && (
          <div style={{ marginTop: 8 }}>
            {/* SWOT */}
            {analysis.swot && (
              <div style={s.swotGrid}>
                <SWOTCard emoji="💪" label="Forças" items={analysis.swot.forcas} color="#6ef3a5" bg="rgba(110,243,165,0.06)" />
                <SWOTCard emoji="⚠" label="Fraquezas" items={analysis.swot.fraquezas} color="#ff8a8a" bg="rgba(255,138,138,0.06)" />
                <SWOTCard emoji="🚀" label="Oportunidades" items={analysis.swot.oportunidades} color="#60b4e8" bg="rgba(96,180,232,0.06)" />
                <SWOTCard emoji="⚡" label="Ameaças" items={analysis.swot.ameacas} color="#ffcf5c" bg="rgba(255,207,92,0.06)" />
              </div>
            )}
            {/* Lucrabilidade */}
            {analysis.lucrabilidadeAnalysis && (
              <div style={s.analysisBox}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                  💰 Lucrabilidade — Score: <strong style={{ color: (analysis.lucrabilidadeScore || 0) >= 50 ? '#6ef3a5' : '#ff8a8a' }}>
                    {analysis.lucrabilidadeScore}/100
                  </strong>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: 0 }}>{analysis.lucrabilidadeAnalysis}</p>
              </div>
            )}
            {/* Dicas */}
            {analysis.dicasCrescimento && analysis.dicasCrescimento.length > 0 && (
              <div style={s.analysisBox}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>💡 Dicas de crescimento</div>
                {analysis.dicasCrescimento.map((d, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', padding: '4px 0', display: 'flex', gap: 8 }}>
                    <span style={{ color: '#60b4e8', flexShrink: 0 }}>{i + 1}.</span>{d}
                  </div>
                ))}
              </div>
            )}
            {/* Acordo recomendado */}
            {analysis.acordoRecomendado && (
              <div style={s.analysisBox}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>🤝 Acordo recomendado</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: 0 }}>{analysis.acordoRecomendado}</p>
              </div>
            )}
            {/* Próxima edição */}
            {analysis.proximaEdicao && (
              <div style={s.analysisBox}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>🔄 Próxima edição</div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: 0 }}>{analysis.proximaEdicao}</p>
              </div>
            )}
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 10 }}>
              Gerado em {analysis.generatedAt ? new Date(analysis.generatedAt).toLocaleString('pt-BR') : '—'}
            </p>
          </div>
        )}
      </Sec>

      {/* 11 RECAP */}
      <Sec title="11 · Recap pós-evento">
        <FA label="O que correu bem, o que mudar, notas para a próxima edição"
          v={editing.postEventNotes || ''} onChange={v => upd('postEventNotes', v)} />
      </Sec>

      <div style={s.formFooter}>
        <button style={s.backBtn} onClick={() => setView('list')}>← Cancelar</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.reportBtn} onClick={generateReport}>📄 Baixar relatório</button>
          <button style={{ ...s.primaryBtn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? 'A guardar...' : '💾 Guardar evento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componentes auxiliares ───────────────────────────────

function SWOTCard({ emoji, label, items, color, bg }: {
  emoji: string; label: string; items: string[]; color: string; bg: string
}) {
  return (
    <div style={{ background: bg, border: `1px solid ${color}25`, borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>{emoji} {label}</div>
      {(items || []).map((item, i) => (
        <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', padding: '2px 0' }}>→ {item}</div>
      ))}
    </div>
  )
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle}>{title}</h3>
      {children}
    </div>
  )
}

function F({ label, v, onChange, type, placeholder }: {
  label: string; v: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <label style={s.field}>
      <span style={s.fieldLabel}>{label}</span>
      <input style={s.input} value={v} type={type || 'text'} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function FA({ label, v, onChange, placeholder }: {
  label: string; v: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <label style={s.field}>
      <span style={s.fieldLabel}>{label}</span>
      <textarea style={s.textarea} value={v} placeholder={placeholder} rows={3} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function Sel({ label, v, onChange, opts }: {
  label: string; v: string; onChange: (v: string) => void; opts: { value: string; label: string }[]
}) {
  return (
    <label style={s.field}>
      <span style={s.fieldLabel}>{label}</span>
      <select style={s.select} value={v} onChange={e => onChange(e.target.value)}>
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

// ─── Styles ───────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1100, margin: '0 auto', padding: '32px 22px', color: '#fff' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 32, fontWeight: 700, color: '#fff', margin: 0 },
  pageCount: { fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' },
  filterRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 },
  filterBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: 20, padding: '6px 14px', fontSize: 12, cursor: 'pointer' },
  filterBtnActive: { background: '#1A6994', color: '#fff', border: '1px solid #1A6994' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 },
  card: { background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 18 },
  cardTop: { display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  typeBadge: { fontSize: 11, border: '1px solid', borderRadius: 6, padding: '2px 8px', marginBottom: 6, display: 'inline-block' },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#fff', margin: '4px 0' },
  cardMeta: { display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  statusBadge: { fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 },
  chipRow: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  chip: { fontSize: 11, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', borderRadius: 20, padding: '3px 10px', cursor: 'pointer' },
  chipActive: { background: 'rgba(26,105,148,0.3)', color: '#fff', border: '1px solid #1A6994' },
  budgetRow: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, fontSize: 12 },
  budgetItem: { color: 'rgba(255,255,255,0.55)' },
  cardActions: { display: 'flex', gap: 8, marginTop: 12 },
  editBtn: { flex: 1, background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  deleteBtn: { background: 'rgba(255,70,70,0.1)', color: '#ff8a8a', border: '1px solid rgba(255,70,70,0.2)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' },
  primaryBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  reportBtn: { background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer' },
  backBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer' },
  formHeader: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 },
  formTitle: { flex: 1, fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 },
  formFooter: { display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.08)' },
  message: { marginBottom: 14, fontSize: 13, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  section: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 22, marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#60b4e8', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 0, marginBottom: 18, textAlign: 'center' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 },
  fieldLabel: { fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  input: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' },
  textarea: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: 12, fontSize: 13, minHeight: 80, outline: 'none', resize: 'vertical', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  select: { background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', cursor: 'pointer', width: '100%' },
  hint: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 10 },
  extArtistCard: { background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: 16, marginBottom: 12 },
  teamRow: { display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' },
  addBtn: { background: 'rgba(26,105,148,0.15)', color: '#60b4e8', border: '1px dashed rgba(26,105,148,0.4)', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' },
  removeBtn: { background: 'rgba(255,70,70,0.1)', color: '#ff8a8a', border: '1px solid rgba(255,70,70,0.2)', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' },
  removeBtnInline: { background: 'transparent', color: 'rgba(255,255,255,0.3)', border: 'none', fontSize: 16, cursor: 'pointer', flexShrink: 0 },
  profitBox: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 16, marginBottom: 12 },
  profitRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  toggleRow: { marginBottom: 14 },
  toggleLabel: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#fff', cursor: 'pointer' },
  swotGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 },
  analysisBox: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 14, marginBottom: 10 },
  empty: { textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)' },
}