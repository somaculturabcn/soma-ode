// src/services/documentReader.ts
// SOMA ODÉ — Leitor inteligente de PDFs, editais e documentos
// Usa IA para extrair dados estruturados de documentos não estruturados

interface ExtractedEdital {
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
    confiancaExtracao: number // 0-1
  }
  
  interface DocumentAnalysisResult {
    editais: ExtractedEdital[]
    palavrasChave: string[]
    territoriosMencionados: string[]
    resumo: string
    confianca: number
  }
  
  // Simulação do motor de IA — na prática, chamaria OpenAI / Claude API
  export async function analyzeDocument(
    fileUrl: string,
    fileType: 'pdf' | 'link' | 'texto'
  ): Promise<DocumentAnalysisResult> {
    // 1. Extrair texto do documento
    const textoBruto = await extractText(fileUrl, fileType)
    
    // 2. Prompt para a IA analisar
    const prompt = `
      Analisa o seguinte edital/oportunidade cultural e extrai em JSON:
      
      DOCUMENTO:
      ${textoBruto.substring(0, 15000)}
      
      Extrai:
      - Título da oportunidade
      - Organização/instituição
      - País e cidade
      - Data limite (deadline)
      - Valores de cachê/bolsa (mínimo e máximo se houver)
      - Disciplinas artísticas aceites
      - Requisitos obrigatórios
      - Categorias
      - Territórios elegíveis
      - Palavras-chave temáticas
      - Resumo em 3 frases
      
      Responde APENAS com JSON válido.
    `
    
    // 3. Chamar IA (OpenAI / Claude)
    const response = await callAI(prompt)
    
    // 4. Parse e validar
    try {
      const parsed = JSON.parse(response)
      return {
        editais: [{
          titulo: parsed.titulo || '',
          organizacao: parsed.organizacao || '',
          pais: parsed.pais || '',
          cidade: parsed.cidade || '',
          deadline: parsed.deadline || '',
          cacheMin: parsed.cacheMin,
          cacheMax: parsed.cacheMax,
          disciplinas: parsed.disciplinas || [],
          requisitos: parsed.requisitos || [],
          categorias: parsed.categorias || [],
          descricao: parsed.resumo || '',
          link: fileUrl,
          fonteDocumento: fileUrl,
          dataExtracao: new Date().toISOString(),
          confiancaExtracao: 0.85
        }],
        palavrasChave: parsed.palavrasChave || [],
        territoriosMencionados: parsed.territorios || [],
        resumo: parsed.resumo || '',
        confianca: 0.85
      }
    } catch (error) {
      console.error('Erro ao parsear resposta da IA:', error)
      throw new Error('Falha na extração do documento')
    }
  }
  
  async function extractText(url: string, type: string): Promise<string> {
    // Integração com:
    // - PDF.js para PDFs
    // - Cheerio/Puppeteer para links
    // - API do Google Drive para Docs
    return '' // placeholder
  }
  
  async function callAI(prompt: string): Promise<string> {
    // Chamada à API OpenAI / Claude
    return '' // placeholder
  }