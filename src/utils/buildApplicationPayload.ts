// src/utils/buildApplicationPayload.ts

import type { Artist } from '../types/artist'

export function buildApplicationPayload(artist: Artist) {
  return {
    name: artist.name,
    email: artist.email,
    bio: artist.bio,
    disciplines: artist.disciplines,
    website: artist.website,
    instagram: artist.instagram,
    portfolio: artist.driveLink,
    projects: artist.projects.map(p => ({
      name: p.name,
      description: p.summary,
    })),
  }
}