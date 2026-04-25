// src/utils/generateDossier.ts

import type { Artist } from '../types/artist'

export function generateDossier(artist: Artist) {
  return `
=== DOSSIER SOMA ODÉ ===

Artista: ${artist.name}

Bio:
${artist.bio ?? '—'}

Disciplinas:
${artist.disciplines.join(', ')}

Keywords:
${(artist.keywords ?? []).join(', ')}

Proyectos:
${artist.projects.map(p => `- ${p.name}: ${p.summary}`).join('\n')}

Contacto:
${artist.email}
${artist.website ?? ''}

`
}