// src/data/liveOpportunities.ts

import type { Opportunity } from '../types/opportunity'

export async function fetchLiveOpportunities(): Promise<Opportunity[]> {
  try {
    const res = await fetch('http://localhost:3001/opportunities')
    const data = await res.json()

    return data
  } catch (err) {
    console.error('Error fetching live opportunities', err)
    return []
  }
}