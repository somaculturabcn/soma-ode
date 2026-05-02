// src/services/matchingEngine.ts
// SOMA ODÉ — Motor de matching entre artistas e oportunidades
// Usa cartografia completa para scoring + IA para análise profunda

import type { Artist } from '../types/artist'
import { callAI } from './aiClient'

// ─── Tipos ─────────────────────────────────────────────

export interface MatchResult {
  artistaId: string
  artistaNome: string
  oportunidadeId: string
  oportunidadeTitulo: string
  score: MatchScore
  pontosFortes: string[]
  pontosFracos: string[]
  acaoRecomendada: 'candidatar_ja' | 'preparar_materiais' | 'aguardar' | 'nao_aconselhavel'
  prazoStatus: 'urgente' | 'atenção' | 'confortavel' | 'expirado'
  mensagemProdutor: string
}

export interface MatchScore {
  total: number
  vocabulario: number
  territorios: number
  disciplinas: number
  corredores: number
  alianzasEticas: number
  gapsSupridos: number
  prazoViavel: number
}

export interface DeepMatchAnalysis {
  analiseQualitativa: string
  sugestoesPersonalizadas: string[]
  pontosDeAlerta: string[]
  templateCandidatura: string
}

// ─── Função principal de matching ──────────────────────

export async function matchArtistToOportunidades(
  artista: Artist,
  oportunidades: any[]
): Promise<MatchResult[]> {
  const resultados = oportunidades.map(op => {
    const scores = calculateDetailedScore(artista, op)
    const total = calculateWeightedTotal(scores)

    const pontosFortes = identifyStrengths(scores)
    const pontosFracos = identifyWeaknesses(scores)
    const acao = determineAction(total, pontosFracos, op.deadline)

    return {
      artistaId: artista.id,
      artistaNome: artista.name || 'Artista sem nome',
      oportunidadeId: op.id || op.titulo || '',
      oportunidadeTitulo: op.titulo || 'Sem título',
      score: { total, ...scores },
      pontosFortes,
      pontosFracos,
      acaoRecomendada: acao,
      prazoStatus: classifyDeadline(op.deadline),
      mensagemProdutor: generateProducerMessage(artista, op, total, pontosFortes, pontosFracos),
    }
  })

  // Ordenar por score total (maior primeiro)
  return resultados.sort((a, b) => b.score.total - a.score.total)
}

// ─── Cálculo de scores individuais ─────────────────────

function calculateDetailedScore(artista: Artist, oportunidade: any): Omit<MatchScore, 'total'> {
  const c = artista.cartografia || {}

  return {
    vocabulario: matchVocabulario(
      c.raiz?.vocabulario || [],
      oportunidade.palavrasChave || []
    ),
    territorios: matchTerritorios(
      artista.targetCountries || [],
      oportunidade.territoriosElegiveis || oportunidade.paisesElegiveis || []
    ),
    disciplinas: matchDisciplinas(
      artista.disciplines || [],
      oportunidade.disciplinas || []
    ),
    corredores: matchCorredores(
      c.rota?.corredores || [],
      oportunidade.territoriosElegiveis || oportunidade.paisesElegiveis || [oportunidade.pais || '']
    ),
    alianzasEticas: matchAlianzasEticas(
      c.teia?.ethicalAlliances || '',
      oportunidade.organizacao || ''
    ),
    gapsSupridos: matchGaps(
      c.rota?.gaps || '',
      oportunidade.oferece || oportunidade.descricao || ''
    ),
    prazoViavel: checkPrazoViavel(
      artista.availability || '',
      oportunidade.deadline || ''
    ),
  }
}

// ─── Funções de matching por dimensão ──────────────────

function matchVocabulario(vocabularioArtista: string[], palavrasOportunidade: string[]): number {
  if (!vocabularioArtista.length || !palavrasOportunidade.length) return 0

  const matches = vocabularioArtista.filter(v =>
    palavrasOportunidade.some(p =>
      p.toLowerCase().includes(v.toLowerCase()) ||
      v.toLowerCase().includes(p.toLowerCase())
    )
  )

  const percentagem = matches.length / Math.max(vocabularioArtista.length, 1)
  return Math.round(percentagem * 25) // Peso 25%
}

function matchTerritorios(targetCountries: string[], paisesElegiveis: string[]): number {
  if (!targetCountries.length || !paisesElegiveis.length) return 0

  const matches = targetCountries.filter(c =>
    paisesElegiveis.some(p => p.toUpperCase() === c.toUpperCase())
  )

  const percentagem = matches.length / Math.max(targetCountries.length, 1)
  return Math.round(percentagem * 20) // Peso 20%
}

function matchDisciplinas(disciplinasArtista: string[], disciplinasOportunidade: string[]): number {
  if (!disciplinasArtista.length || !disciplinasOportunidade.length) return 0

  const matches = disciplinasArtista.filter(d =>
    disciplinasOportunidade.some(o =>
      o.toLowerCase().includes(d.toLowerCase()) ||
      d.toLowerCase().includes(o.toLowerCase())
    )
  )

  const percentagem = matches.length / Math.max(disciplinasArtista.length, 1)
  return Math.round(percentagem * 15) // Peso 15%
}

function matchCorredores(corredores: string[], paises: string[]): number {
  if (!corredores.length || !paises.length) return 0

  // Corredores podem ser cidades ou países — verificar ambos
  const matches = corredores.filter(c =>
    paises.some(p =>
      p.toLowerCase().includes(c.toLowerCase()) ||
      c.toLowerCase().includes(p.toLowerCase())
    )
  )

  const percentagem = matches.length / Math.max(corredores.length, 1)
  return Math.round(percentagem * 15) // Peso 15%
}

function matchAlianzasEticas(alianzasEticas: string, organizacao: string): number {
  if (!alianzasEticas || !organizacao) return 0

  // Verifica se a organização foi mencionada como aliada ética
  const mencionada = alianzasEticas.toLowerCase().includes(organizacao.toLowerCase())

  // Também verifica menções parciais (ex: "festivais na Alemanha" + "Berlim Festival")
  const palavrasOrganizacao = organizacao.toLowerCase().split(/\s+/)
  const algumaPalavraMatch = palavrasOrganizacao.some(p =>
    p.length > 3 && alianzasEticas.toLowerCase().includes(p)
  )

  const score = mencionada ? 10 : algumaPalavraMatch ? 5 : 0
  return score // Peso 10% (já é o valor máximo)
}

function matchGaps(gaps: string, oferece: string): number {
  if (!gaps || !oferece) return 0

  // Extrair palavras-chave dos gaps
  const palavrasGaps = gaps.toLowerCase()
    .split(/[\s,.;]+/)
    .filter(w => w.length > 3)

  const textoOferece = oferece.toLowerCase()

  // Verificar quantos gaps são potencialmente resolvidos
  const gapsResolvidos = palavrasGaps.filter(g =>
    textoOferece.includes(g)
  )

  const percentagem = gapsResolvidos.length / Math.max(palavrasGaps.length, 1)
  return Math.round(percentagem * 10) // Peso 10%
}

function checkPrazoViavel(disponibilidade: string, deadline: string): number {
  if (!deadline) return 3 // Sem deadline definida = neutro

  const diasAteDeadline = Math.ceil(
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  if (diasAteDeadline < 0) return 0  // Já expirou
  if (diasAteDeadline <= 3) return 2 // Muito urgente
  if (diasAteDeadline <= 7) return 3 // Urgente
  if (diasAteDeadline <= 14) return 4 // Atenção
  if (diasAteDeadline <= 30) return 5 // Confortável
  return 5 // Mais de 30 dias = ideal
}

// ─── Cálculo do score total ────────────────────────────

function calculateWeightedTotal(scores: Omit<MatchScore, 'total'>): number {
  return Object.values(scores).reduce((sum, val) => sum + val, 0)
  // Todos os scores já estão ponderados, máximo = 100
}

// ─── Identificação de forças e fraquezas ───────────────

function identifyStrengths(scores: Omit<MatchScore, 'total'>): string[] {
  const limites: Record<keyof Omit<MatchScore, 'total'>, { max: number; label: string }> = {
    vocabulario: { max: 25, label: 'Vocabulário tem forte sinergia com o edital' },
    territorios: { max: 20, label: 'Territórios alvo coincidem com a oportunidade' },
    disciplinas: { max: 15, label: 'Disciplinas artísticas correspondem' },
    corredores: { max: 15, label: 'Corredor estratégico ativado' },
    alianzasEticas: { max: 10, label: 'Organização alinhada eticamente' },
    gapsSupridos: { max: 10, label: 'Oportunidade resolve gaps identificados na cartografia' },
    prazoViavel: { max: 5, label: 'Prazo confortável para preparação' },
  }

  return (Object.entries(limites) as [keyof typeof limites, typeof limites[keyof typeof limites]][])
    .filter(([key, { max }]) => {
      const scoreValue = scores[key]
      return scoreValue >= max * 0.7 // Acima de 70% do máximo da categoria
    })
    .map(([, { label }]) => label)
}

function identifyWeaknesses(scores: Omit<MatchScore, 'total'>): string[] {
  const limites: Record<keyof Omit<MatchScore, 'total'>, { max: number; label: string }> = {
    vocabulario: { max: 25, label: 'Vocabulário com pouca sinergia' },
    territorios: { max: 20, label: 'Territórios não são prioritários para o artista' },
    disciplinas: { max: 15, label: 'Disciplinas não coincidem totalmente' },
    corredores: { max: 15, label: 'Fora dos corredores estratégicos atuais' },
    alianzasEticas: { max: 10, label: 'Organização não validada nas alianças éticas' },
    gapsSupridos: { max: 10, label: 'Não resolve gaps atuais da cartografia' },
    prazoViavel: { max: 5, label: 'Prazo muito apertado ou já expirado' },
  }

  return (Object.entries(limites) as [keyof typeof limites, typeof limites[keyof typeof limites]][])
    .filter(([key, { max }]) => {
      const scoreValue = scores[key]
      return scoreValue < max * 0.3 // Abaixo de 30% do máximo da categoria
    })
    .map(([, { label }]) => label)
}

// ─── Determinação de ação recomendada ──────────────────

function determineAction(
  total: number,
  fraquezas: string[],
  deadline: string
): 'candidatar_ja' | 'preparar_materiais' | 'aguardar' | 'nao_aconselhavel' {
  // Verificar deadline primeiro
  if (deadline) {
    const dias = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (dias < 0) return 'nao_aconselhavel'
  }

  // Decisão baseada no score
  if (total < 30) return 'nao_aconselhavel'
  if (total >= 80 && fraquezas.length === 0) return 'candidatar_ja'
  if (total >= 70 && fraquezas.length <= 1) return 'candidatar_ja'
  if (total >= 50) return 'preparar_materiais'
  return 'aguardar'
}

function classifyDeadline(deadline: string): 'urgente' | 'atenção' | 'confortavel' | 'expirado' {
  if (!deadline) return 'confortavel'

  const dias = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  if (dias < 0) return 'expirado'
  if (dias <= 5) return 'urgente'
  if (dias <= 14) return 'atenção'
  return 'confortavel'
}

// ─── Geração de mensagem para o produtor ───────────────

function generateProducerMessage(
  artista: Artist,
  op: any,
  total: number,
  fortes: string[],
  fracos: string[]
): string {
  const nome = artista.name || 'Artista'
  const emoji = total >= 80 ? '🔥' : total >= 70 ? '✨' : total >= 50 ? '📋' : 'ℹ️'
  const acao = total >= 80 ? 'PRIORIDADE MÁXIMA' : total >= 70 ? 'ALTA AFINIDADE' : total >= 50 ? 'A COMPLETAR' : 'INFORMATIVO'

  const prazo = op.deadline
    ? `\n📅 Prazo: ${new Date(op.deadline).toLocaleDateString('pt-PT')}`
    : '\n📅 Prazo: Não definido'

  const pontosFortesStr = fortes.length > 0
    ? `\n✅ ${fortes.join('\n✅ ')}`
    : ''

  const pontosFracosStr = fracos.length > 0
    ? `\n⚠️ ${fracos.join('\n⚠️ ')}`
    : ''

  const recomendacao = total >= 70
    ? '\n🎯 Recomendação: Candidatar'
    : total >= 50
      ? '\n🎯 Recomendação: Preparar materiais em falta'
      : '\n🎯 Recomendação: Monitorar'

  return `${emoji} ${acao}: ${nome} → ${op.titulo || 'Oportunidade'}
📊 Score: ${total}/100${prazo}${pontosFortesStr}${pontosFracosStr}${recomendacao}`
}

// ─── Análise profunda com IA ───────────────────────────

/**
 * Análise qualitativa usando IA para matches promissores
 * Usa quando score > 60% para ter uma avaliação mais humana
 */
export async function deepMatchAnalysis(
  artista: Artist,
  oportunidade: any,
  score: MatchScore
): Promise<DeepMatchAnalysis> {
  const prompt = `Analisa a compatibilidade entre este artista e esta oportunidade cultural.

ARTISTA:
- Nome: ${artista.name || 'Não definido'}
- Disciplinas: ${(artista.disciplines || []).join(', ') || 'Não definidas'}
- Vocabulário cartográfico: ${(artista.cartografia?.raiz?.vocabulario || []).join(', ') || 'Não definido'}
- Tensões fundamentais: ${artista.cartografia?.raiz?.tensions || 'Não definidas'}
- Origens: ${artista.cartografia?.raiz?.origins || 'Não definidas'}
- Legado de resistência: ${artista.cartografia?.raiz?.legacyOfResistance || 'Não definido'}
- Corredores estratégicos: ${(artista.cartografia?.rota?.corredores || []).join(', ') || 'Não definidos'}
- Gaps identificados: ${artista.cartografia?.rota?.gaps || 'Não definidos'}
- Territórios alvo: ${(artista.targetCountries || []).join(', ') || 'Não definidos'}
- Bio: ${artista.bio || 'Não definida'}

OPORTUNIDADE:
- Título: ${oportunidade.titulo || 'Não definido'}
- Organização: ${oportunidade.organizacao || 'Não definida'}
- País: ${oportunidade.pais || 'Não definido'}
- Cidade: ${oportunidade.cidade || 'Não definida'}
- Deadline: ${oportunidade.deadline || 'Não definida'}
- Disciplinas aceites: ${(oportunidade.disciplinas || []).join(', ') || 'Não definidas'}
- Palavras-chave: ${(oportunidade.palavrasChave || []).join(', ') || 'Não definidas'}
- Descrição: ${oportunidade.descricao || 'Não definida'}
- Requisitos: ${(oportunidade.requisitos || []).join(', ') || 'Não definidos'}

SCORE TÉCNICO: ${score.total}/100
- Vocabulário: ${score.vocabulario}/25
- Territórios: ${score.territorios}/20
- Disciplinas: ${score.disciplinas}/15
- Corredores: ${score.corredores}/15
- Alianças éticas: ${score.alianzasEticas}/10
- Gaps supridos: ${score.gapsSupridos}/10
- Prazo viável: ${score.prazoViavel}/5

Com base nestes dados, gera um JSON com:
1. "analiseQualitativa": 3-4 frases sobre a sinergia real entre artista e oportunidade, usando linguagem curatorial (menciona Angela Davis, diáspora, território se relevante)
2. "sugestoesPersonalizadas": array com 3-5 sugestões concretas para a candidatura (ex: "Destacar o legado de resistência no parágrafo de motivação")
3. "pontosDeAlerta": array com 2-3 possíveis fragilidades ou concorrência esperada
4. "templateCandidatura": mini-template de 4-5 frases para o email/parágrafo de motivação

Responde APENAS com JSON válido.`

  try {
    const response = await callAI(
      'És um curador especializado em arte contemporânea, diáspora afro-lusófona e políticas culturais. Trabalhas na SOMA ODÉ, uma produtora que conecta artistas da diáspora a oportunidades na Europa, Brasil e África. Usas referenciais de Angela Davis, Paul Gilroy e bell hooks.',
      prompt,
      { temperature: 0.7, maxTokens: 2500 }
    )

    // Extrair JSON da resposta
    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Resposta da IA não contém JSON válido')
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      analiseQualitativa: parsed.analiseQualitativa || 'Análise não disponível.',
      sugestoesPersonalizadas: parsed.sugestoesPersonalizadas || [],
      pontosDeAlerta: parsed.pontosDeAlerta || [],
      templateCandidatura: parsed.templateCandidatura || '',
    }
  } catch (error) {
    console.error('Erro na deep match analysis:', error)
    return {
      analiseQualitativa: 'Não foi possível gerar análise profunda neste momento.',
      sugestoesPersonalizadas: [
        'Rever os materiais do artista antes de candidatar',
        'Verificar se há outros artistas no roster com perfil complementar',
        'Contactar a organização para mais informações',
      ],
      pontosDeAlerta: [
        'Verificar prazo com atenção',
        'Confirmar requisitos de visto/mobilidade',
      ],
      templateCandidatura: '',
    }
  }
}

// ─── Funções auxiliares de análise ─────────────────────

/**
 * Encontra os melhores matches entre todos os artistas e uma oportunidade
 */
export async function findBestMatchesForOportunidade(
  artistas: Artist[],
  oportunidade: any
): Promise<MatchResult[]> {
  const todosMatches = await Promise.all(
    artistas.map(artista => matchArtistToOportunidades(artista, [oportunidade]))
  )

  return todosMatches
    .flat()
    .filter(m => m.score.total >= 30)
    .sort((a, b) => b.score.total - a.score.total)
}

/**
 * Gera um relatório resumido de matching para o produtor
 */
export function generateMatchingSummary(matches: MatchResult[]): string {
  const total = matches.length
  const altaAfinidade = matches.filter(m => m.score.total >= 70).length
  const urgencia = matches.filter(m => m.prazoStatus === 'urgente').length
  const candidatarJa = matches.filter(m => m.acaoRecomendada === 'candidatar_ja').length

  return `
📊 RESUMO DE MATCHING
━━━━━━━━━━━━━━━━━━━━
Total de matches analisados: ${total}
🔥 Alta afinidade (>70%): ${altaAfinidade}
⚠️ Prazos urgentes: ${urgencia}
✅ Recomendados candidatar: ${candidatarJa}

Top 3 matches:
${matches.slice(0, 3).map((m, i) =>
    `${i + 1}. ${m.artistaNome} → ${m.oportunidadeTitulo} (${m.score.total}/100) ${m.prazoStatus === 'urgente' ? '⚠️ URGENTE' : ''}`
  ).join('\n')}
  `.trim()
}
// ═══ MATCHING POR PROJETO ═══

import type { ProjectForScout, ProjectMatchContext, ScoutRequest } from '../types/opportunity'

/**
 * Extrai do projeto os dados relevantes para o matching,
 * "sobrescrevendo" temporariamente os campos do artista
 */
export function buildProjectContext(
  artist: Artist,
  project: ProjectForScout,
): ProjectMatchContext {
  // Disciplinas: usa as do artista, mas o formato do projeto refina
  const disciplinas = artist.disciplines || []
  
  // Se o projeto tem formato específico, adiciona como disciplina extra
  if (project.projectFormat && !disciplinas.includes(project.projectFormat.toLowerCase())) {
    disciplinas.push(project.projectFormat.toLowerCase())
  }

  // Territórios do projeto
  const territorios = project.projectTerritories
    ? project.projectTerritories
        .split(/[,;/]/)
        .map(t => t.trim())
        .filter(Boolean)
    : []

  // Tamanho do grupo baseado no formato do projeto
  const tamanhoGrupo = inferGroupSize(project.format || project.projectFormat || '')

  // Keywords combinadas: artista + projeto
  const keywords = [
    ...(artist.keywords || []),
    ...(artist.themes || []),
    ...(project.projectKeywords || []),
  ]

  // Cache mínimo: usar o do artista como base
  const cacheMinimo = artist.minFee || undefined

  return {
    disciplinas,
    formato: project.format || project.projectFormat || '',
    territorios,
    keywords,
    publicoAlvo: project.projectTargetAudience || '',
    tamanhoGrupo,
    cacheMinimo,
    idioma: project.language || '',
    necessidadesTecnicas: project.technicalNeeds || '',
  }
}

/**
 * Infere o tamanho do grupo a partir do formato do projeto
 */
function inferGroupSize(format: string): number {
  const f = norm(format)
  if (/\bsolo\b/.test(f)) return 1
  if (/\bduo\b/.test(f)) return 2
  if (/\btrio\b/.test(f)) return 3
  if (/\bquart[eé]to\b/.test(f)) return 4
  if (/\bbanda\b/.test(f)) return 4
  if (/\bcoletivo\b/.test(f)) return 5
  if (/\bgrande\s+formato\b/.test(f)) return 8
  // DJ set, performance solo
  if (/\bdj\b/.test(f)) return 1
  if (/\bperformance\b/.test(f) && /\bsolo\b/.test(f)) return 1
  return 2 // default: duo
}

/**
 * Cria um "artist virtual" temporário para o matching,
 * combinando dados do artista real + contexto do projeto
 */
export function createProjectArtist(
  artist: Artist,
  ctx: ProjectMatchContext,
): Artist {
  return {
    ...artist,
    // Sobrescreve com dados do projeto
    disciplines: ctx.disciplinas,
    keywords: ctx.keywords,
    targetCountries: ctx.territorios.length > 0 
      ? ctx.territorios 
      : artist.targetCountries,
    minFee: ctx.cacheMinimo ?? artist.minFee,
    // Adiciona keywords do projeto ao vocabulário cartográfico
    cartografia: {
      ...(artist.cartografia || {}),
      raiz: {
        ...(artist.cartografia?.raiz || {}),
        vocabulario: [
          ...(artist.cartografia?.raiz?.vocabulario || []),
          ...ctx.keywords,
        ],
      },
    },
  } as Artist
}

/**
 * Versão do runMatch que aceita ScoutRequest (artista ou projeto)
 */
export function runMatchWithTarget(
  artist: Artist | null,
  projects: ProjectForScout[],
  opportunities: Opportunity[],
  request: ScoutRequest,
  options?: { hideBlocked?: boolean },
): ScoredOpportunity[] {
  if (!artist) return []

  let targetArtist: Artist

  if (request.target.type === 'artist') {
    // Matching tradicional (artista completo)
    targetArtist = artist
  } else {
    // Matching por projeto específico
    const project = projects.find(p => p.id === request.target.projectId)
    if (!project) {
      console.warn(`Projeto ${request.target.projectId} não encontrado`)
      return []
    }
    const ctx = buildProjectContext(artist, project)
    targetArtist = createProjectArtist(artist, ctx)
  }

  // Aplicar filtros adicionais do ScoutRequest
  let filtered = opportunities

  if (request.filtros?.paises?.length) {
    const paises = request.filtros.paises.map(p => p.toUpperCase())
    filtered = filtered.filter(o => 
      paises.includes(norm(o.country).toUpperCase())
    )
  }

  if (request.filtros?.disciplinas?.length) {
    const disciplinas = request.filtros.disciplinas.map(norm)
    filtered = filtered.filter(o =>
      o.disciplines?.some(d => disciplinas.includes(norm(d)))
    )
  }

  if (request.filtros?.cacheMin) {
    filtered = filtered.filter(o =>
      (o.feeOffered || 0) >= (request.filtros?.cacheMin || 0)
    )
  }

  if (request.filtros?.prazoMaximo) {
    const prazoMax = new Date(request.filtros.prazoMaximo)
    filtered = filtered.filter(o => {
      if (!o.deadline) return true
      return new Date(o.deadline) <= prazoMax
    })
  }

  // Rodar matching com o artista (real ou virtual)
  const scored = runMatch(targetArtist, filtered, options)

  // Filtrar por score mínimo
  if (request.scoreMinimo) {
    return scored.filter(s => s.match.percentage >= request.scoreMinimo)
  }

  return scored
}