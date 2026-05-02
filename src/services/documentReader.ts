// src/services/documentReader.ts
// SOMA ODÉ — Leitor inteligente de PDFs, editais e documentos
// Usa Gemini (via aiClient) para extrair dados estruturados

import { callAI } from './aiClient'

// ─── Tipos ────────────────────────────────────────────────

export interface ExtractedEdital {
  titulo: string
  organizacao: string
  pais: string
  cidade?: string
  deadline: string
  cacheMin?: number
  cacheMax?: number
  disciplinas: string[]
  requisitos: string[]
  categorias: string[]
  descricao: string
  link: string
  fonteDocumento: string
  dataExtracao: string
  confiancaExtracao: number
}

export interface DocumentAnalysisResult {
  editais: ExtractedEdital[]
  palavrasChave: string[]
  territoriosMencionados: string[]
  resumo: string
  confianca: number
}

// ─── System prompt para extracção ────────────────────────

const EXTRACTION_SYSTEM = `És um analista de oportunidades culturais da SOMA Cultura (Barcelona), produtora especializada em artistas negros, migrantes e LGBTQIA+ em circulação internacional.

Extrais dados de editais, residências, festivais e open calls de forma estruturada e precisa.

Quando encontras valores de cachê/bolsa, converte sempre para euros.
Quando encontras datas, converte para formato YYYY-MM-DD.
Quando o documento não especifica um campo, usa null ou array vazio.`

// ─── Função principal ─────────────────────────────────────

/**
 * Analisa um documento (link, texto ou PDF) e extrai editais.
 * Usa Gemini Flash via aiClient.ts.
 */
export async function analyzeDocument(
  input: string,
  fileType: 'pdf' | 'link' | 'texto'
): Promise<DocumentAnalysisResult> {
  // 1. Extrair texto conforme o tipo
  const textoBruto = await extractText(input, fileType)

  if (!textoBruto || textoBruto.length < 50) {
    throw new Error('Não foi possível extrair texto suficiente do documento.')
  }

  // 2. Limitar tokens (Gemini Flash: 1M context, mas 15K é suficiente)
  const textoLimitado = textoBruto.substring(0, 15000)

  // 3. Chamar Gemini para extrair
  const userPrompt = `Analisa o seguinte documento e extrai TODAS as oportunidades culturais encontradas.

DOCUMENTO:
${textoLimitado}

Para cada oportunidade, extrai:
- titulo: nome da oportunidade
- organizacao: quem oferece
- pais: país principal
- cidade: cidade (se mencionada)
- deadline: data limite em formato YYYY-MM-DD (null se não mencionada)
- cacheMin: valor mínimo em euros (null se não mencionado)
- cacheMax: valor máximo em euros (null se não mencionado)
- disciplinas: array de disciplinas artísticas aceites
- requisitos: array de requisitos obrigatórios
- categorias: array de categorias (ex: residência, festival, prémio)
- descricao: resumo em 3 frases
- palavrasChave: 5-8 palavras-chave temáticas

Responde APENAS com um array JSON. Se só encontrares uma oportunidade, usa igualmente um array com um elemento.
Exemplo de formato:
[{"titulo": "...", "organizacao": "...", "pais": "...", ...}]`

  const response = await callAI(EXTRACTION_SYSTEM, userPrompt, {
    temperature: 0.2,  // Baixa temperatura para extracção factual
    maxTokens: 4000,
  })

  // 4. Parse do JSON
  try {
    const clean = response.text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()

    const jsonMatch = clean.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Sem JSON na resposta')

    let parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) parsed = [parsed]

    const editais: ExtractedEdital[] = parsed.map((item: any) => ({
      titulo: item.titulo || 'Sem título',
      organizacao: item.organizacao || '',
      pais: item.pais || '',
      cidade: item.cidade || undefined,
      deadline: normalizeDeadline(item.deadline),
      cacheMin: item.cacheMin || undefined,
      cacheMax: item.cacheMax || undefined,
      disciplinas: item.disciplinas || [],
      requisitos: item.requisitos || [],
      categorias: item.categorias || [],
      descricao: item.descricao || '',
      link: fileType === 'link' ? input : '',
      fonteDocumento: input,
      dataExtracao: new Date().toISOString(),
      confiancaExtracao: 0.85,
    }))

    const todasPalavrasChave = [...new Set(
      parsed.flatMap((e: any) => e.palavrasChave || [])
    )]
    const todosTerritorios = [...new Set(
      editais.flatMap(e => [e.pais, e.cidade].filter(Boolean))
    )]

    return {
      editais,
      palavrasChave: todasPalavrasChave,
      territoriosMencionados: todosTerritorios,
      resumo: editais.map(e => `• ${e.titulo} (${e.organizacao})`).join('\n'),
      confianca: 0.85,
    }

  } catch (err) {
    console.error('[documentReader] Erro ao parsear resposta da IA:', err)
    console.error('[documentReader] Resposta bruta:', response.text.substring(0, 500))
    throw new Error('Falha na extracção do documento. Verifica o formato.')
  }
}

// ─── Extractores de texto ─────────────────────────────────

async function extractText(input: string, type: string): Promise<string> {
  switch (type) {
    case 'link':
      return extractFromLink(input)
    case 'texto':
      return input
    case 'pdf':
      // PDF requer pdf.js ou serviço externo
      // Por agora, trata como link se for URL
      if (input.startsWith('http')) return extractFromLink(input)
      console.warn('[documentReader] Extracção de PDF local não implementada ainda.')
      return ''
    default:
      return input
  }
}

async function extractFromLink(url: string): Promise<string> {
  try {
    const response = await fetch(url)
    const html = await response.text()

    // Extracção básica de texto (remove HTML)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return text.substring(0, 15000)
  } catch (err) {
    console.error('[documentReader] Erro ao extrair link:', err)
    return ''
  }
}

// ─── Utilitários ──────────────────────────────────────────

function normalizeDeadline(deadline: string | null): string {
  if (!deadline || deadline === 'null') return ''

  // Já está em formato correcto
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return deadline

  // Tentar parsear
  const date = new Date(deadline)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  // Tentar formatos comuns em PT/ES: DD/MM/YYYY ou DD-MM-YYYY
  const match = deadline.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (match) {
    const [, dia, mes, ano] = match
    const anoCompleto = ano.length === 2 ? `20${ano}` : ano
    return `${anoCompleto}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  }

  return deadline
}

/**
 * Analisa múltiplos documentos e remove duplicados
 */
export async function analyzeMultipleDocuments(
  documents: { input: string; type: 'pdf' | 'link' | 'texto' }[]
): Promise<ExtractedEdital[]> {
  const resultados = await Promise.all(
    documents.map(doc =>
      analyzeDocument(doc.input, doc.type)
        .then(r => r.editais)
        .catch(err => {
          console.error(`[documentReader] Erro em ${doc.input}:`, err)
          return [] as ExtractedEdital[]
        })
    )
  )

  const todos = resultados.flat()

  // Remover duplicados por título + organização
  const seen = new Set<string>()
  return todos.filter(e => {
    const key = `${e.titulo}|${e.organizacao}`.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}