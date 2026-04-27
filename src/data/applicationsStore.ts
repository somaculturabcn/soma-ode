// src/data/applicationsStore.ts
// SOMA ODÉ — Store de candidaturas

export type ApplicationStatus =
  | 'rascunho'
  | 'preparar'
  | 'enviada'
  | 'follow_up'
  | 'negociacao'
  | 'confirmada'
  | 'perdida'

export type ApplicationItem = {
  id: string
  artistId: string
  artistName: string
  opportunityId: string
  opportunityTitle: string
  opportunityLink?: string
  organization?: string
  projectName?: string
  status: ApplicationStatus
  score?: number
  checklist: string[]
  missing: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

const APPLICATIONS_KEY = 'soma-applications-v1'

export function getApplications(): ApplicationItem[] {
  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveApplications(items: ApplicationItem[]) {
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(items))
}

export function addApplication(item: ApplicationItem) {
  const current = getApplications()
  saveApplications([item, ...current])
}