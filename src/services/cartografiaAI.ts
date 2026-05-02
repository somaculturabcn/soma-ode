// src/services/cartografiaAI.ts
// SOMA ODÉ — Análise de Cartografia com IA real (Gemini)
// Substitui o mock setTimeout por chamada real ao Gemini

import { callAI } from './aiClient'
import type { Artist } from '../types/artist'

// ─── Tipo de saída ────────────────────────────────────────

export type AnaliseCartografia = {
  posicionamento: string
  territorioFoco: { local: string; justificativa: string }
  matchesPrioritarios: { tipo: string; justificativa: string; prioridade: 'alta' | 'media' | 'baixa' }[]
  rotaEstrategica: { passo: string; acao: string; motivo: string }[]
  alertas: { contexto: string; motivo: string }[]
  palavrasChaveParaMatching: string[]
}

// ─── Função principal ─────────────────────────────────────

/**
 * Gera análise qualitativa da cartografia de um artista usando Gemini.
 * Usa os 4 blocos (RAIZ, CAMPO, TEIA, ROTA) + perfil completo.
 */
export async function gerarAnaliseCartografia(artist: Artist): Promise<AnaliseCartografia> {
  const c = artist.cartografia || {}

  const systemPrompt = `És um curador especializado em arte contemporânea da diáspora afro-lusófona.

Trabalhas para a SOMA Cultura (Barcelona), uma produtora que representa artistas negros, migrantes e LGBTQIA+ em circulação internacional.

Usas a metodologia CARTOGRAFIA SOMA, baseada em Angela Davis (legado de resistência, alianças éticas), Paul Gilroy (rotas atlânticas, diáspora), Pierre Bourdieu (capital simbólico, campo cultural) e bell hooks (margem como abertura radical).

A tua análise é sempre concreta, honesta e estratégica — nunca vaga ou genérica.`

  const userPrompt = `Analisa a cartografia deste artista e gera um diagnóstico estratégico.

═══════════════════════════
ARTISTA: ${artist.name || 'Sem nome'}
═══════════════════════════
Disciplinas: ${(artist.disciplines || []).join(', ') || 'não definidas'}
Especialidades: ${(artist.specialties || []).join(', ') || 'não definidas'}
Idiomas: ${(artist.languages || []).join(', ') || 'não definidos'}
Bio: ${artist.bio || 'não preenchida'}
Cidade base: ${artist.base || 'não definida'}
País de origem: ${artist.origin || 'não definido'}
Países alvo: ${(artist.targetCountries || []).slice(0, 10).join(', ') || 'não definidos'}
Cachê mínimo: ${artist.minFee ? `€${artist.minFee}` : 'não definido'}
Keywords: ${(artist.keywords || []).join(', ') || 'não definidas'}
Temas: ${(artist.themes || []).join(', ') || 'não definidos'}
Géneros: ${(artist.genres || []).join(', ') || 'não definidos'}

CARTOGRAFIA — RAIZ:
- Origens: ${c.raiz?.origins || 'não preenchido'}
- Tensões: ${c.raiz?.tensions || 'não preenchido'}
- Vocabulário: ${(c.raiz?.vocabulario || []).join(', ') || 'não preenchido'}
- Legado de resistência: ${(c.raiz as any)?.legacyOfResistance || 'não preenchido'}
- Práticas de cuidado: ${(c.raiz as any)?.carePractices || 'não preenchido'}

CARTOGRAFIA — CAMPO:
- Perfis de audiência: ${c.campo?.audienceProfiles || 'não preenchido'}
- Motivação de adesão: ${c.campo?.motivation || 'não preenchido'}
- Territórios da audiência: ${(c.campo?.audienceTerritories || []).join(', ') || 'não preenchido'}

CARTOGRAFIA — TEIA:
- Pares: ${c.teia?.pares || 'não preenchido'}
- Quem legitima: ${c.teia?.legitimacy || 'não preenchido'}
- Redes de influência: ${c.teia?.influenceNetworks || 'não preenchido'}
- Alianças éticas: ${(c.teia as any)?.ethicalAlliances || 'não preenchido'}

CARTOGRAFIA — ROTA:
- Gaps: ${c.rota?.gaps || 'não preenchido'}
- Corredores: ${(c.rota?.corredores || []).join(', ') || 'não preenchido'}
- Plano de expansão: ${c.rota?.expansionPlan || 'não preenchido'}

Posicionamento SOMA: ${c.somaPositioning || 'não preenchido'}

MATERIAIS DISPONÍVEIS:
Bio PT: ${artist.materials?.bioPT ? 'SIM' : 'NÃO'} | Bio EN: ${artist.materials?.bioEN ? 'SIM' : 'NÃO'} | Foto: ${artist.materials?.pressPhoto ? 'SIM' : 'NÃO'} | Vídeo: ${artist.materials?.videoPresentation ? 'SIM' : 'NÃO'} | Rider: ${artist.materials?.technicalRider ? 'SIM' : 'NÃO'} | Press kit: ${artist.materials?.pressKit ? 'SIM' : 'NÃO'}

═══════════════════════════
TAREFA
═══════════════════════════
Gera um diagnóstico estratégico concreto. Considera:
- O que faz este artista único no campo cultural actual
- Que território faz mais sentido como próximo passo (baseado em corredores + audiência)
- Que tipo de oportunidades têm maior retorno estratégico (não só financeiro)
- Que alertas a SOMA deve ter em conta

Responde APENAS com este JSON (sem markdown, sem comentários):
{
  "posicionamento": "2-3 frases descrevendo onde este artista se situa no campo cultural e para onde vai estrategicamente",
  "territorioFoco": {
    "local": "cidade ou país específico",
    "justificativa": "porquê este território faz sentido agora"
  },
  "matchesPrioritarios": [
    { "tipo": "tipo de oportunidade (ex: Residências artísticas)", "justificativa": "porquê é prioritário para este artista agora", "prioridade": "alta" },
    { "tipo": "segundo tipo", "justificativa": "justificativa", "prioridade": "alta" },
    { "tipo": "terceiro tipo", "justificativa": "justificativa", "prioridade": "media" }
  ],
  "rotaEstrategica": [
    { "passo": "Passo 1", "acao": "ação concreta e específica", "motivo": "porquê este passo agora" },
    { "passo": "Passo 2", "acao": "ação concreta", "motivo": "motivo" },
    { "passo": "Passo 3", "acao": "ação concreta", "motivo": "motivo" }
  ],
  "alertas": [
    { "contexto": "situação específica a evitar", "motivo": "porquê é um risco" },
    { "contexto": "segundo alerta", "motivo": "porquê" }
  ],
  "palavrasChaveParaMatching": ["palavra1", "palavra2", "palavra3", "palavra4", "palavra5"]
}`

  try {
    const response = await callAI(systemPrompt, userPrompt, {
      temperature: 0.5,
      maxTokens: 2500,
    })

    // Extrair JSON mesmo que venha com texto à volta
    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta sem JSON válido')

    const parsed = JSON.parse(jsonMatch[0])

    return {
      posicionamento: parsed.posicionamento || 'Análise não disponível.',
      territorioFoco: parsed.territorioFoco || {
        local: artist.base || 'A definir',
        justificativa: 'Dados insuficientes para análise.',
      },
      matchesPrioritarios: parsed.matchesPrioritarios || [],
      rotaEstrategica: parsed.rotaEstrategica || [],
      alertas: parsed.alertas || [],
      palavrasChaveParaMatching: parsed.palavrasChaveParaMatching || [
        ...(artist.keywords || []),
        ...(artist.disciplines || []),
      ],
    }

  } catch (err) {
    console.error('[cartografiaAI] Erro na análise:', err)

    // Fallback: análise básica sem IA quando API falha
    const nome = artist.name || 'Este artista'
    const base = artist.base || artist.residenceCountry || 'o território actual'
    const disciplinas = (artist.disciplines || []).join(', ') || 'prática multidisciplinar'

    return {
      posicionamento: `${nome} situa-se num campo de ${disciplinas}, com potencial de circulação a partir de ${base}. A próxima etapa deve consolidar materiais, rede curatorial e territórios prioritários antes de aplicar para oportunidades maiores.`,
      territorioFoco: {
        local: base,
        justificativa: 'Ponto de partida mais coerente com os dados actuais do perfil.',
      },
      matchesPrioritarios: [
        { tipo: 'Residências artísticas', justificativa: 'Permitem desenvolver obra, rede e documentação.', prioridade: 'alta' },
        { tipo: 'Festivais curatoriais', justificativa: 'Ajudam a posicionar no circuito de legitimação cultural.', prioridade: 'alta' },
        { tipo: 'Programas de mobilidade', justificativa: 'Coerentes com a lógica de circulação territorial da SOMA.', prioridade: 'media' },
      ],
      rotaEstrategica: [
        { passo: 'Passo 1', acao: 'Completar bio, materiais essenciais e links de documentação.', motivo: 'Sem materiais fortes, a candidatura perde força.' },
        { passo: 'Passo 2', acao: 'Escolher 2 territórios prioritários e mapear 5 espaços em cada.', motivo: 'A rota precisa ser concreta, não apenas uma intenção geral.' },
        { passo: 'Passo 3', acao: 'Activar contactos de curadores e pares próximos.', motivo: 'A legitimação vem por rede, não só por candidatura aberta.' },
      ],
      alertas: [
        { contexto: 'Open calls muito genéricas', motivo: 'Podem consumir tempo sem criar posicionamento real.' },
        { contexto: 'Festivais sem alinhamento curatorial', motivo: 'Podem gerar circulação, mas não avanço estratégico.' },
      ],
      palavrasChaveParaMatching: [
        ...(artist.keywords || []),
        ...(artist.disciplines || []),
        ...(artist.cartografia?.raiz?.vocabulario || []),
      ].filter(Boolean),
    }
  }
}