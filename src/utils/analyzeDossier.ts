// src/utils/analyzeDossier.ts

import type { Artist } from '../types/artist'

export function analyzeDossier(text: string): Partial<Artist> {
  const lower = text.toLowerCase()

  return {
    bio: text.slice(0, 500),

    disciplines: [
      lower.includes('dj') || lower.includes('music') ? 'musica' : '',
      lower.includes('performance') ? 'performance' : '',
      lower.includes('dance') ? 'danca' : '',
    ].filter(Boolean) as string[],

    languages: [
      lower.includes('english') ? 'EN' : '',
      lower.includes('spanish') ? 'ES' : '',
      lower.includes('portuguese') ? 'PT' : '',
    ].filter(Boolean),

    keywords: [
      lower.includes('diaspora') ? 'diáspora' : '',
      lower.includes('body') ? 'corpo' : '',
      lower.includes('ritual') ? 'ritual' : '',
    ].filter(Boolean),
  }
}