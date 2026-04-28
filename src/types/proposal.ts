// src/types/proposal.ts
// SOMA ODÉ — Propostas curatoriais (SOMA → Artistas)

export type ProposalStatus =
  | 'sugerida'              // Acabou de ser proposta pelo produtor
  | 'aceite'                // Artista aceitou
  | 'recusada'              // Artista recusou
  | 'preparando'            // SOMA está a preparar candidatura
  | 'enviada'               // Candidatura enviada
  | 'resposta_recebida'     // Recebemos resposta do edital
  | 'aprovada'              // 🎉 Aprovada!
  | 'recusada_externamente' // Não passou no edital

export type Proposal = {
  id: string

  // Quem propõe e a quem
  artistId: string
  artistName?: string
  producerId?: string
  producerName?: string

  // Oportunidade
  opportunityId?: string
  opportunityTitle: string
  opportunityOrganization?: string
  opportunityCountry?: string
  opportunityDeadline?: string
  opportunityLink?: string

  // Conteúdo
  status: ProposalStatus
  producerNotes?: string
  artistResponse?: string
  artistRespondedAt?: string

  createdAt?: string
  updatedAt?: string
}

export const PROPOSAL_STATUSES: { id: ProposalStatus; label: string; color: string }[] = [
  { id: 'sugerida',              label: 'Sugerida',              color: '#60b4e8' },
  { id: 'aceite',                label: 'Aceite pela artista',   color: '#6ef3a5' },
  { id: 'recusada',              label: 'Recusada pela artista', color: '#f87171' },
  { id: 'preparando',            label: 'Preparando',            color: '#c084fc' },
  { id: 'enviada',               label: 'Candidatura enviada',   color: '#ffcf5c' },
  { id: 'resposta_recebida',     label: 'Resposta recebida',     color: '#fb923c' },
  { id: 'aprovada',              label: '🎉 Aprovada',           color: '#22c55e' },
  { id: 'recusada_externamente', label: 'Não passou',            color: '#6b7280' },
]