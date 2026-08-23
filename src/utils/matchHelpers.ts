// src/utils/matchHelpers.ts
// SOMA ODÉ — Helpers puros do módulo de Oportunidades
// Extraído de MatchView.tsx (modularização)

import {
    safeArr,
    type Opportunity,
    type ArtistLite,
    type SavedSearch,
    type Recurrence,
    STORAGE_KEY,
    ARTISTS_KEY,
  } from '../types/matchTypes'
  
  // ─── Storage local ───────────────────────────────────────────────────────────
  
  export function getManualOpportunities(): Opportunity[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  }
  
  export function saveManualOpportunities(data: Opportunity[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }
  
  export function getArtists(): ArtistLite[] {
    try {
      const p = JSON.parse(localStorage.getItem(ARTISTS_KEY) || '[]')
      return Array.isArray(p) ? p : []
    } catch { return [] }
  }
  
  export function emptyOpportunity(): Opportunity {
    return {
      id: crypto.randomUUID(),
      title: '',
      organization: '',
      type: 'open_call',
      country: '',
      countryName: '',
      city: '',
      disciplines: [],
      languages: [],
      deadline: '',
      openingDate: '',
      recurrence: 'anual',
      summary: '',
      description: '',
      link: '',
      keywords: [],
      coversCosts: false,
      isPrivate: false,
      status: 'open',
      source: 'manual',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
  
  // ─── Texto ───────────────────────────────────────────────────────────────────
  
  export function splitTags(v: string) { return v.split(',').map(x => x.trim()).filter(Boolean) }
  
  export function joinTags(v?: string[] | string) {
    if (Array.isArray(v)) return v.join(', ')
    return typeof v === 'string' ? v : ''
  }
  
  export function cleanText(v?: string) {
    return (v || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  }
  
  export function escapeCsv(v: any) {
    const s = Array.isArray(v) ? v.join(', ') : String(v ?? '')
    return `"${s.replace(/"/g, '""')}"`
  }
  
  // ─── Datas ───────────────────────────────────────────────────────────────────
  
  export function daysLeft(deadline?: string) {
    if (!deadline) return null
    const d = new Date(deadline)
    if (isNaN(d.getTime())) return null
    return Math.ceil((d.getTime() - Date.now()) / 86400000)
  }
  
  export function deadlineLabel(deadline?: string) {
    const d = daysLeft(deadline)
    if (d === null) return null
    if (d < 0) return { text: 'prazo passou', color: 'rgba(255,255,255,0.3)' }
    if (d === 0) return { text: 'hoje!', color: '#ff8a8a' }
    if (d <= 7) return { text: `${d} dias ⚠️`, color: '#ff8a8a' }
    if (d <= 30) return { text: `${d} dias`, color: '#ffcf5c' }
    return { text: `${d} dias`, color: 'rgba(255,255,255,0.5)' }
  }
  
  // ─── Scoring ─────────────────────────────────────────────────────────────────
  
  export function scoreOpportunity(op: Opportunity, search: SavedSearch): { score: number; reasons: string[] } {
    const reasons: string[] = []
    let score = 0
  
    const searchDiscs = safeArr(search.disciplines).map(d => cleanText(d.replace(/^[^\s]+ /, '')))
    const opDiscs = safeArr(op.disciplines).map(d => cleanText(d))
    const opText = cleanText([op.title, op.summary, op.description, op.organization, ...safeArr(op.keywords)].join(' '))
  
    if (searchDiscs.length > 0) {
      const matches = searchDiscs.filter(sd =>
        opDiscs.some(od => od.includes(sd) || sd.includes(od)) || opText.includes(sd)
      )
      if (matches.length > 0) {
        score += Math.min(40, matches.length * 15)
        reasons.push(`Disciplina: ${matches.slice(0, 2).join(', ')}`)
      }
    }
  
    const queryWords = cleanText(search.query).split(/\s+/)
      .filter(w => w.length > 3 && !['para', 'como', 'open', 'call', 'todos', 'tipos'].includes(w))
  
    const kwMatches = queryWords.filter(w => opText.includes(w))
    if (kwMatches.length > 0) {
      score += Math.min(30, kwMatches.length * 8)
      reasons.push(`${kwMatches.length} palavra${kwMatches.length > 1 ? 's' : ''}-chave`)
    }
  
    if (search.countries) {
      const sc = search.countries.split(',').map(c => cleanText(c.trim())).filter(c => c.length > 1)
      const opC = cleanText(op.countryName || op.country || '')
      if (opC && sc.some(c => opC.includes(c) || c.includes(opC))) {
        score += 20
        reasons.push(`País: ${op.countryName || op.country}`)
      }
    }
  
    if (op.coversCosts) {
      score += 10
      reasons.push('Cobre custos')
    }
  
    const dias = daysLeft(op.deadline)
    if (dias !== null && dias < 0) score -= 10
  
    return { score: Math.max(0, Math.min(100, score)), reasons }
  }
  
  // ─── CSV import ──────────────────────────────────────────────────────────────
  
  export function parseCsv(text: string): Opportunity[] {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return []
  
    const headers = lines[0].split(/[;,]/).map(h => cleanText(h).replace(/\s+/g, '_'))
  
    return lines.slice(1).map(line => {
      const values = line.split(/[;,]/).map(v => v.trim())
      const row: Record<string, string> = {}
  
      headers.forEach((h, i) => { row[h] = values[i] || '' })
  
      const get = (...keys: string[]) => {
        for (const k of keys) {
          const n = cleanText(k).replace(/\s+/g, '_')
          if (row[n]) return row[n]
        }
        return ''
      }
  
      return {
        id: crypto.randomUUID(),
        title: get('title', 'titulo') || 'Sem título',
        organization: get('organization', 'organizacao'),
        type: get('type', 'tipo') || 'open_call',
        country: get('country', 'pais'),
        countryName: get('country', 'pais'),
        city: get('city', 'cidade'),
        disciplines: splitTags(get('disciplines', 'disciplinas')),
        deadline: get('deadline', 'prazo'),
        openingDate: get('openingDate', 'abertura'),
        summary: get('summary', 'resumo'),
        link: get('link', 'url'),
        keywords: splitTags(get('keywords', 'tags')),
        notes: get('notes', 'notas'),
        coversCosts: ['sim', 'yes', 'true', '1'].includes(cleanText(get('coversCosts', 'custos'))),
        isPrivate: ['sim', 'yes', 'true', '1'].includes(cleanText(get('isPrivate', 'private', 'privada'))),
        recurrence: 'anual' as Recurrence,
        status: 'open',
        source: 'csv',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    })
  }