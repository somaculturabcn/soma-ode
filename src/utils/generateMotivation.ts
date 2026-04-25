// src/utils/generateMotivation.ts

import type { Artist } from '../types/artist'
import type { Opportunity } from '../types/opportunity'

export function generateMotivation(artist: Artist, op: Opportunity): string {
  return `
Dear ${op.organization},

My name is ${artist.name}, and I am an artist working in ${artist.disciplines.join(', ')}.

My practice engages with ${artist.keywords?.join(', ') ?? 'contemporary artistic research'}, 
focusing on themes such as ${artist.cartografia?.campo?.temas?.join(', ') ?? 'identity and context'}.

I am particularly interested in ${op.title} because it aligns with my artistic direction and research interests.

My current project explores ${artist.projects[0]?.summary ?? 'expanded artistic language and performance'}.

I believe this opportunity would allow me to deepen my work and connect with new contexts.

Thank you for your consideration.

Best regards,
${artist.name}
`
}