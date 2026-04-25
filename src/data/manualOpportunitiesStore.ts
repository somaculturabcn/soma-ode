// src/data/manualOpportunitiesStore.ts
// SOMA ODÉ — armazenamento local de oportunidades manuais / CSV

import type { Opportunity } from '../types/opportunity'

const STORAGE_KEY = 'soma_manual_opportunities_v1'

export function getManualOpportunities(): Opportunity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveManualOpportunities(items: Opportunity[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function addManualOpportunity(item: Opportunity) {
  const current = getManualOpportunities()
  saveManualOpportunities([item, ...current])
}

export function updateManualOpportunity(updated: Opportunity) {
  const current = getManualOpportunities()
  saveManualOpportunities(current.map(item => item.id === updated.id ? updated : item))
}

export function deleteManualOpportunity(id: string) {
  const current = getManualOpportunities()
  saveManualOpportunities(current.filter(item => item.id !== id))
}

export function clearCsvOpportunities() {
  const current = getManualOpportunities()
  saveManualOpportunities(current.filter(item => item.source !== 'csv-opportunities'))
}