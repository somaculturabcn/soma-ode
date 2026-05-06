// src/services/pdfExtractor.ts
// SOMA ODÉ — Extractor de dossiers PDF
// 1. Faz upload para Supabase Storage (preserva o ficheiro original)
// 2. Extrai texto e dados estruturados via Gemini API
// Tudo num só serviço — chamado com um único botão na UI

import { supabase } from '../lib/supabase'

const GEMINI_MODEL = 'gemini-2.5-flash'

// ─── Tipos ────────────────────────────────────────────────

export interface ExtractedDossier {
  // Armazenamento
  dossierUrl: string           // URL do ficheiro no Supabase Storage
  dossierFileName: string      // nome original: "PICUMÃ_ES.pdf"
  dossierUploadedAt: string    // ISO timestamp
  dossierWordCount: number     // palavras extraídas

  // Texto completo (para match contextual)
  dossierText: string

  // Dados estruturados (enriquecem o perfil)
  format: string               // "performance", "instalação", etc.
  disciplines: string[]
  keywords: string[]
  summary: string
  methodology: string
  references: string[]
  communities: string[]
  languages: string[]
  duration: string
  technicalNeeds: string
  highlights: string
}

// ─── Função principal ─────────────────────────────────────

export async function extractAndStorePdf(
  file: File,
  artistId: string,
  projectId: string,
): Promise<ExtractedDossier> {
  if (file.type !== 'application/pdf') throw new Error('Ficheiro deve ser PDF')
  if (file.size > 20 * 1024 * 1024) throw new Error('PDF demasiado grande (máx 20MB)')

  // Corre em paralelo: upload + extracção de texto
  const [uploadResult, extractionResult] = await Promise.allSettled([
    uploadToStorage(file, artistId, projectId),
    extractTextWithGemini(file),
  ])

  // Upload é obrigatório
  if (uploadResult.status === 'rejected') {
    throw new Error(`Erro no upload: ${uploadResult.reason?.message || 'falha no Supabase Storage'}`)
  }

  // Extracção: se falhar, guardamos o ficheiro sem texto (pode tentar de novo)
  const extracted = extractionResult.status === 'fulfilled'
    ? extractionResult.value
    : null

  const now = new Date().toISOString()
  const text = extracted?.text || ''

  return {
    dossierUrl: uploadResult.value,
    dossierFileName: file.name,
    dossierUploadedAt: now,
    dossierWordCount: text.split(/\s+/).filter(Boolean).length,
    dossierText: text,
    format: extracted?.format || '',
    disciplines: extracted?.disciplines || [],
    keywords: extracted?.keywords || [],
    summary: extracted?.summary || '',
    methodology: extracted?.methodology || '',
    references: extracted?.references || [],
    communities: extracted?.communities || [],
    languages: extracted?.languages || [],
    duration: extracted?.duration || '',
    technicalNeeds: extracted?.technicalNeeds || '',
    highlights: extracted?.highlights || '',
  }
}

// ─── Upload para Supabase Storage ─────────────────────────

async function uploadToStorage(
  file: File,
  artistId: string,
  projectId: string,
): Promise<string> {
  // Caminho: dossiers/artist-id/project-id/filename
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${artistId}/${projectId}/${safeName}`

  const { error } = await supabase.storage
    .from('dossiers')
    .upload(path, file, { upsert: true })

  if (error) throw new Error(error.message)

  // URL de download com token temporário (mais seguro que URL público)
  const { data } = await supabase.storage
    .from('dossiers')
    .createSignedUrl(path, 60 * 60 * 24 * 365) // válido 1 ano

  if (!data?.signedUrl) throw new Error('Não foi possível gerar URL do ficheiro')

  return data.signedUrl
}

// Gera URL de download actualizado (para quando o token expirar)
export async function refreshDossierUrl(
  artistId: string,
  projectId: string,
  fileName: string,
): Promise<string> {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${artistId}/${projectId}/${safeName}`

  const { data } = await supabase.storage
    .from('dossiers')
    .createSignedUrl(path, 60 * 60 * 24 * 365)

  return data?.signedUrl || ''
}

// ─── Extracção de texto via Gemini ────────────────────────

async function extractTextWithGemini(file: File) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada')

  const base64 = await fileToBase64(file)

  const prompt = `És um especialista em curadoria cultural e produção artística contemporânea.
Analisa este dossier de projecto artístico.

Extrai toda a informação relevante para candidaturas a residências artísticas e editais na Europa.
Sê específico — preserva a linguagem e os conceitos do projecto.

Responde APENAS com JSON válido:
{
  "text": "texto completo do documento (preserva todos os detalhes)",
  "format": "performance / instalação / investigação artística / audiovisual / música / multidisciplinar / etc",
  "disciplines": ["práticas artísticas"],
  "keywords": ["palavras-chave temáticas — conceitos específicos do projecto"],
  "summary": "resumo em 3-4 frases específicas",
  "methodology": "como o projecto funciona — processo, fases, metodologia",
  "references": ["referências artísticas — artistas, movimentos, obras"],
  "communities": ["comunidades envolvidas — ballroom, drag, trans, afrodiaspórica, queer, etc"],
  "languages": ["idiomas de apresentação"],
  "duration": "duração / formato temporal",
  "technicalNeeds": "necessidades técnicas — espaço, equipamento",
  "highlights": "2-3 aspectos únicos para candidaturas europeias"
}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'application/pdf', data: base64 } },
            { text: prompt },
          ],
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`Gemini ${res.status}: ${err?.error?.message || 'erro'}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim()
  const jsonMatch = clean.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Resposta sem JSON')

  return JSON.parse(jsonMatch[0])
}

// ─── Helper ───────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const b64 = (reader.result as string).split(',')[1]
      if (!b64) reject(new Error('Falha ao converter para base64'))
      else resolve(b64)
    }
    reader.onerror = () => reject(new Error('Erro ao ler o ficheiro'))
    reader.readAsDataURL(file)
  })
}