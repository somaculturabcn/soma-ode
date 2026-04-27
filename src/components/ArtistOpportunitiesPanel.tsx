// src/components/ArtistOpportunitiesPanel.tsx
// SOMA ODÉ — Matches e candidaturas dentro da ficha do artista

import { useMemo, useState } from 'react'
import type { Artist } from '../types/artist'
import { mockOpportunities } from '../data/mockOpportunities'
import { realOpportunities } from '../data/realOpportunities'
import { addApplication, type ApplicationItem } from '../data/applicationsStore'

type Opportunity = {
  id: string
  title: string
  organization?: string
  type?: string
  country?: string
  countryName?: string
  countryCode?: string
  city?: string
  disciplines?: string[]
  languages?: string[]
  deadline?: string
  summary?: string
  description?: string
  link?: string
  keywords?: string[]
  themes?: string[]
  requirements?: string[]
  coversCosts?: boolean
  source?: string
}

type MatchItem = {
  opportunity: Opportunity
  score: number
  reasons: string[]
  missing: string[]
  warnings: string[]
}

const MANUAL_OPPORTUNITIES_KEY = 'soma-manual-opportunities-v1'
const PIPELINE_KEY = 'soma-pipeline-v1'
const DOCUMENTS_KEY = 'soma-documents-v1'

function getManualOpportunities(): Opportunity[] {
  try {
    const raw = localStorage.getItem(MANUAL_OPPORTUNITIES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function normalize(value?: string) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

function normalizeList(list?: string[]) {
  return Array.isArray(list) ? list.map(normalize).filter(Boolean) : []
}

function overlap(a?: string[], b?: string[]) {
  const A = normalizeList(a)
  const B = normalizeList(b)
  return A.filter(x => B.includes(x))
}

function daysLeft(deadline?: string) {
  if (!deadline) return null
  const d = new Date(deadline)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function deadlineLabel(deadline?: string) {
  const days = daysLeft(deadline)
  if (days === null) return 'sem deadline'
  if (days < 0) return 'prazo passou'
  if (days === 0) return 'hoje'
  if (days <= 7) return `${days} dias`
  if (days <= 30) return `${days} dias`
  return deadline
}

function getAllOpportunities(): Opportunity[] {
  const manual = getManualOpportunities()
  const real = Array.isArray(realOpportunities) ? realOpportunities : []
  const mock = Array.isArray(mockOpportunities) ? mockOpportunities : []

  const all = [...manual, ...real, ...mock].map((op: any) => ({
    ...op,
    id: op.id || crypto.randomUUID(),
    title: op.title || op.name || 'Oportunidade sem título',
    organization: op.organization || op.org || '',
    type: op.type || 'Edital',
    country: op.country || op.countryCode || '',
    countryName: op.countryName || op.country || '',
    disciplines: op.disciplines || [],
    languages: op.languages || [],
    keywords: op.keywords || op.themes || [],
    requirements: op.requirements || [],
    source: op.source || 'base',
  }))

  const seen = new Set<string>()

  return all.filter(op => {
    const key = normalize(`${op.title}-${op.organization}-${op.deadline}`)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function calculateMatch(artist: Artist, opportunity: Opportunity): MatchItem {
  let score = 0
  const reasons: string[] = []
  const missing: string[] = []
  const warnings: string[] = []

  const disciplineOverlap = overlap(artist.disciplines, opportunity.disciplines)

  if (disciplineOverlap.length > 0) {
    score += 30
    reasons.push(`Disciplina alinhada: ${disciplineOverlap.slice(0, 3).join(', ')}`)
  } else {
    warnings.push('Sem disciplina claramente alinhada')
  }

  const languageOverlap = overlap(artist.languages, opportunity.languages)

  if (!opportunity.languages?.length || languageOverlap.length > 0) {
    score += 15
    if (languageOverlap.length > 0) {
      reasons.push(`Idioma compatível: ${languageOverlap.join(', ')}`)
    }
  } else {
    warnings.push('Idioma pode não estar alinhado')
  }

  const artistCountries = normalizeList(artist.targetCountries)
  const opCountry = normalize(opportunity.countryCode || opportunity.country || opportunity.countryName)

  if (opCountry && artistCountries.includes(opCountry)) {
    score += 15
    reasons.push('País dentro dos alvos do artista')
  } else if (!opCountry) {
    score += 5
  }

  const artistKeywords = normalizeList([
    ...(artist.keywords || []),
    ...(artist.themes || []),
    ...(artist.genres || []),
    ...(artist.specialties || []),
  ])

  const opKeywords = normalizeList([
    ...(opportunity.keywords || []),
    ...(opportunity.themes || []),
  ])

  const keywordOverlap = artistKeywords.filter(k => opKeywords.includes(k))

  if (keywordOverlap.length > 0) {
    score += 20
    reasons.push(`Afinidade curatorial: ${keywordOverlap.slice(0, 4).join(', ')}`)
  }

  if (opportunity.coversCosts) {
    score += 10
    reasons.push('Cobre custos')
  }

  const days = daysLeft(opportunity.deadline)

  if (days !== null) {
    if (days < 0) {
      score = Math.max(0, score - 30)
      warnings.push('Prazo já passou')
    } else if (days <= 7) {
      warnings.push(`Prazo muito próximo: ${days} dias`)
    } else if (days <= 30) {
      reasons.push(`Prazo próximo: ${days} dias`)
    }
  }

  const reqs = opportunity.requirements || []
  const materials = artist.materials || {}

  for (const req of reqs) {
    if (req === 'bio' && !(materials.bioPT || materials.bioEN || materials.bioES || artist.bio)) missing.push('Bio')
    if (req === 'pressPhoto' && !materials.pressPhoto) missing.push('Foto de imprensa')
    if (req === 'videoPresentation' && !materials.videoPresentation && !artist.videoLink) missing.push('Vídeo')
    if (req === 'technicalRider' && !materials.technicalRider) missing.push('Rider técnico')
    if (req === 'pressKit' && !materials.pressKit) missing.push('Press kit / dossier')
    if (req === 'pressClippings' && !materials.pressClippings) missing.push('Press clipping')
    if (req === 'motivationLetter') missing.push('Carta de motivação')
    if (req === 'projectDescription' && !artist.projects?.some(p => p.summary)) missing.push('Descrição de projeto')
  }

  if (missing.length === 0) {
    score += 10
  } else {
    warnings.push(`Faltam materiais: ${missing.join(', ')}`)
  }

  return {
    opportunity,
    score: Math.min(100, Math.max(0, score)),
    reasons,
    missing,
    warnings,
  }
}

function buildChecklist(artist: Artist, match: MatchItem, projectName?: string) {
  const checklist = [
    'Confirmar deadline e regulamento oficial',
    'Rever requisitos de elegibilidade',
    'Selecionar projeto artístico correto',
    'Preparar bio atualizada',
    'Preparar fotos de imprensa',
    'Preparar links de vídeo / portfólio',
    'Preparar dossier ou press kit',
    'Rever orçamento, custos e cachê',
    'Preparar email/carta de candidatura',
  ]

  if (projectName) checklist.push(`Usar projeto: ${projectName}`)
  if (artist.drive?.folderUrl) checklist.push('Revisar pasta Google Drive do artista')
  if (match.missing.length > 0) checklist.push(`Resolver pendências: ${match.missing.join(', ')}`)

  return checklist
}

function createDocumentForApplication(artist: Artist, match: MatchItem, projectName?: string) {
  const artistName = artist.artisticName || artist.name
  const op = match.opportunity

  const content = `CANDIDATURA — ${artistName}

Oportunidade:
${op.title}

Organização:
${op.organization || ''}

Artista:
${artistName}

Projeto:
${projectName || artist.projects?.[0]?.name || ''}

Resumo do artista:
${artist.bio || ''}

Resumo da oportunidade:
${op.summary || op.description || ''}

Por que faz sentido:
${match.reasons.map(r => `- ${r}`).join('\n')}

Pendências:
${match.missing.length ? match.missing.map(m => `- ${m}`).join('\n') : '- Sem pendências principais identificadas'}

Links:
${artist.website || ''}
${artist.instagram || ''}
${artist.videoLink || ''}
${artist.drive?.folderUrl || ''}
${op.link || ''}

Próxima ação:
Preparar candidatura completa, revisar materiais e enviar antes do deadline.
`

  const doc = {
    id: crypto.randomUUID(),
    type: 'proposta',
    title: `Candidatura — ${artistName} → ${op.title}`,
    artistName,
    recipient: op.organization || '',
    projectName: projectName || artist.projects?.[0]?.name || '',
    language: 'PT',
    status: 'rascunho',
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  try {
    const raw = localStorage.getItem(DOCUMENTS_KEY)
    const current = raw ? JSON.parse(raw) : []
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify([doc, ...current]))
  } catch {}

  return doc
}

function addToPipeline(application: ApplicationItem) {
  try {
    const raw = localStorage.getItem(PIPELINE_KEY)
    const current = raw ? JSON.parse(raw) : []

    const pipelineItem = {
      id: crypto.randomUUID(),
      title: `${application.artistName} → ${application.opportunityTitle}`,
      status: 'preparar',
      origin: 'candidatura',
      artistId: application.artistId,
      artistName: application.artistName,
      opportunityId: application.opportunityId,
      opportunityTitle: application.opportunityTitle,
      organization: application.organization || '',
      link: application.opportunityLink || '',
      priority: application.missing.length > 0 ? 'alta' : 'media',
      notes: application.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    localStorage.setItem(PIPELINE_KEY, JSON.stringify([pipelineItem, ...current]))
  } catch {}
}

export default function ArtistOpportunitiesPanel({ artist }: { artist: Artist }) {
  const [open, setOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null)
  const [projectName, setProjectName] = useState('')
  const [notes, setNotes] = useState('')
  const [limit, setLimit] = useState(6)

  const matches = useMemo(() => {
    return getAllOpportunities()
      .map(op => calculateMatch(artist, op))
      .filter(match => match.score >= 25)
      .sort((a, b) => b.score - a.score)
  }, [artist])

  function applyToOpportunity() {
    if (!selectedMatch) return

    const artistName = artist.artisticName || artist.name
    const op = selectedMatch.opportunity

    const application: ApplicationItem = {
      id: crypto.randomUUID(),
      artistId: artist.id,
      artistName,
      opportunityId: op.id,
      opportunityTitle: op.title,
      opportunityLink: op.link,
      organization: op.organization,
      projectName: projectName || artist.projects?.[0]?.name || '',
      status: 'rascunho',
      score: selectedMatch.score,
      checklist: buildChecklist(artist, selectedMatch, projectName),
      missing: selectedMatch.missing,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    addApplication(application)
    addToPipeline(application)
    createDocumentForApplication(artist, selectedMatch, projectName)

    alert('Candidatura criada. Foi adicionada ao Pipeline e aos Documentos.')
    setSelectedMatch(null)
    setProjectName('')
    setNotes('')
  }

  if (!artist?.id) return null

  return (
    <section style={styles.box}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>Matches de oportunidades</h3>
          <p style={styles.subtitle}>
            Recomendações geradas a partir da ficha completa do artista.
          </p>
        </div>

        <button style={styles.secondaryBtn} onClick={() => setOpen(!open)}>
          {open ? 'Fechar' : 'Ver matches'}
        </button>
      </div>

      {open && (
        <>
          {matches.length === 0 && (
            <div style={styles.empty}>
              Nenhuma oportunidade forte encontrada ainda. Verifica disciplinas, idiomas, países alvo e keywords.
            </div>
          )}

          {matches.slice(0, limit).map(match => {
            const op = match.opportunity
            const urgent = (() => {
              const d = daysLeft(op.deadline)
              return d !== null && d >= 0 && d <= 30
            })()

            return (
              <article
                key={op.id}
                style={{
                  ...styles.card,
                  borderColor: urgent ? 'rgba(255,207,92,0.35)' : 'rgba(255,255,255,0.1)',
                }}
              >
                <div style={styles.cardTop}>
                  <div>
                    <h4 style={styles.cardTitle}>{op.title}</h4>
                    <p style={styles.meta}>
                      {[op.organization, op.city, op.countryName || op.country].filter(Boolean).join(' · ') || 'Sem entidade/local'}
                    </p>
                  </div>

                  <div style={styles.score}>{match.score}%</div>
                </div>

                <p style={styles.summary}>{op.summary || op.description || 'Sem resumo.'}</p>

                <div style={styles.tags}>
                  <span style={styles.deadline}>{deadlineLabel(op.deadline)}</span>
                  <span style={styles.typeTag}>{op.type || 'Edital'}</span>
                  {op.coversCosts && <span style={styles.costTag}>custos cobertos</span>}
                </div>

                {match.reasons.length > 0 && (
                  <div style={styles.reasonBox}>
                    <strong>A favor</strong>
                    {match.reasons.slice(0, 4).map((r, i) => (
                      <span key={i}>✓ {r}</span>
                    ))}
                  </div>
                )}

                {match.warnings.length > 0 && (
                  <div style={styles.warningBox}>
                    <strong>Atenção</strong>
                    {match.warnings.slice(0, 4).map((w, i) => (
                      <span key={i}>⚠ {w}</span>
                    ))}
                  </div>
                )}

                <div style={styles.actions}>
                  {op.link && (
                    <a href={op.link} target="_blank" rel="noopener noreferrer" style={styles.link}>
                      ver edital →
                    </a>
                  )}

                  <button style={styles.primaryBtn} onClick={() => setSelectedMatch(match)}>
                    Aplicar candidatura
                  </button>
                </div>
              </article>
            )
          })}

          {matches.length > limit && (
            <button style={styles.secondaryBtn} onClick={() => setLimit(limit + 6)}>
              Ver mais oportunidades
            </button>
          )}
        </>
      )}

      {selectedMatch && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Aplicar candidatura</h3>
                <p style={styles.modalSubtitle}>
                  {artist.artisticName || artist.name} → {selectedMatch.opportunity.title}
                </p>
              </div>

              <button style={styles.secondaryBtn} onClick={() => setSelectedMatch(null)}>
                Fechar
              </button>
            </div>

            <label style={styles.label}>
              Projeto do artista
              <select
                style={styles.input}
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
              >
                <option value="">Selecionar projeto</option>
                {(artist.projects || []).map(project => (
                  <option key={project.id || project.name} value={project.name}>
                    {project.name || 'Projeto sem nome'}
                  </option>
                ))}
              </select>
            </label>

            <div style={styles.checklist}>
              <strong>Checklist inicial</strong>
              {buildChecklist(artist, selectedMatch, projectName).map((item, index) => (
                <span key={index}>□ {item}</span>
              ))}
            </div>

            {selectedMatch.missing.length > 0 && (
              <div style={styles.warningBox}>
                <strong>Materiais em falta</strong>
                {selectedMatch.missing.map((item, index) => (
                  <span key={index}>⚠ {item}</span>
                ))}
              </div>
            )}

            <label style={styles.label}>
              Notas internas
              <textarea
                style={styles.textarea}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: prioridade alta, rever idioma, pedir vídeo atualizado..."
              />
            </label>

            <div style={styles.modalFooter}>
              <button style={styles.secondaryBtn} onClick={() => setSelectedMatch(null)}>
                Cancelar
              </button>

              <button style={styles.primaryBtn} onClick={applyToOpportunity}>
                Criar candidatura
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  box: {
    background: '#070707',
    border: '1px solid rgba(26,105,148,0.35)',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  title: {
    margin: 0,
    color: '#60b4e8',
    fontSize: 16,
  },
  subtitle: {
    margin: '4px 0 0',
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  empty: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.45)',
    border: '1px dashed rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    fontSize: 12,
  },
  card: {
    background: '#111',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    margin: 0,
    fontSize: 15,
  },
  meta: {
    margin: '5px 0 0',
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  score: {
    color: '#60b4e8',
    fontSize: 20,
    fontWeight: 900,
  },
  summary: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 13,
    lineHeight: 1.45,
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  deadline: {
    fontSize: 11,
    background: 'rgba(255,207,92,0.12)',
    color: '#ffcf5c',
    padding: '2px 8px',
    borderRadius: 20,
  },
  typeTag: {
    fontSize: 11,
    background: 'rgba(26,105,148,0.20)',
    color: '#60b4e8',
    padding: '2px 8px',
    borderRadius: 20,
  },
  costTag: {
    fontSize: 11,
    background: 'rgba(110,243,165,0.12)',
    color: '#6ef3a5',
    padding: '2px 8px',
    borderRadius: 20,
  },
  reasonBox: {
    marginTop: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    color: '#6ef3a5',
    fontSize: 12,
  },
  warningBox: {
    marginTop: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    color: '#ffcf5c',
    fontSize: 12,
    background: 'rgba(255,207,92,0.08)',
    border: '1px solid rgba(255,207,92,0.18)',
    borderRadius: 8,
    padding: 10,
  },
  checklist: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    background: '#090909',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  link: {
    color: '#60b4e8',
    fontSize: 13,
    textDecoration: 'none',
    alignSelf: 'center',
  },
  primaryBtn: {
    background: '#1A6994',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  secondaryBtn: {
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: '8px 11px',
    fontSize: 12,
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.82)',
    zIndex: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: 'min(760px, 100%)',
    maxHeight: '90vh',
    overflowY: 'auto',
    background: '#000',
    border: '1px solid #1A6994',
    borderRadius: 16,
    padding: 22,
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  modalTitle: {
    margin: 0,
    color: '#60b4e8',
    fontSize: 24,
  },
  modalSubtitle: {
    margin: '4px 0 0',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginBottom: 12,
  },
  input: {
    width: '100%',
    background: '#0a0a0a',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    boxSizing: 'border-box',
    outline: 'none',
  },
  textarea: {
    width: '100%',
    minHeight: 100,
    background: '#0a0a0a',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    boxSizing: 'border-box',
    outline: 'none',
    resize: 'vertical',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
}