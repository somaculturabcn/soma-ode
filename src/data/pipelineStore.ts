// src/data/pipelineStore.ts
// SOMA ODÉ — Pipeline CRM em localStorage

import type { PipelineItem, PipelineStatus } from '../types/pipeline'

const STORAGE_KEY = 'soma_pipeline_v1'

export function getPipeline(): PipelineItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function savePipeline(items: PipelineItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function addPipelineItem(item: Omit<PipelineItem, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = new Date().toISOString()

  const newItem: PipelineItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }

  const current = getPipeline()
  savePipeline([newItem, ...current])

  return newItem
}

export function updatePipelineItem(updated: PipelineItem) {
  const now = new Date().toISOString()

  const current = getPipeline()
  const next = current.map(item =>
    item.id === updated.id
      ? { ...updated, updatedAt: now }
      : item
  )

  savePipeline(next)
}

export function updatePipelineStatus(id: string, status: PipelineStatus) {
  const now = new Date().toISOString()

  const current = getPipeline()
  const next = current.map(item =>
    item.id === id
      ? { ...item, status, updatedAt: now }
      : item
  )

  savePipeline(next)
}

export function deletePipelineItem(id: string) {
  const current = getPipeline()
  const next = current.filter(item => item.id !== id)
  savePipeline(next)
}

export function clearPipeline() {
  savePipeline([])
}