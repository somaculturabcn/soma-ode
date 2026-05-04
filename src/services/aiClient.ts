// src/services/aiClient.ts
// SOMA ODÉ — Cliente unificado de IA
// Gemini (Google) como principal · Claude + OpenAI como fallback
// Gemini Flash: free tier generoso (15 req/min, 1M tokens/dia)

export type AIProvider = 'gemini' | 'claude' | 'openai'

interface AIClientConfig {
  provider?: AIProvider
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface AIResponse {
  text: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  provider: string
}

const DEFAULT_CONFIG: AIClientConfig = {
  provider: 'gemini',
  temperature: 0.4,
  maxTokens: 4000,
}

/**
 * Chamada principal à IA.
 * Todos os outros serviços usam esta função.
 * Mudar provider aqui muda em todo o sistema.
 */
export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  config: Partial<AIClientConfig> = {}
): Promise<AIResponse> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const provider = finalConfig.provider || 'gemini'

  try {
    if (provider === 'gemini') return await callGemini(systemPrompt, userPrompt, finalConfig)
    if (provider === 'claude') return await callClaude(systemPrompt, userPrompt, finalConfig)
    if (provider === 'openai') return await callOpenAI(systemPrompt, userPrompt, finalConfig)
    return await callGemini(systemPrompt, userPrompt, finalConfig)
  } catch (err) {
    console.error(`[aiClient] Erro com ${provider}:`, err)

    // Fallback automático: Gemini → Claude → OpenAI
    if (provider === 'gemini') {
      console.warn('[aiClient] Gemini falhou, tentando Claude...')
      try { return await callClaude(systemPrompt, userPrompt, finalConfig) } catch {}
    }

    console.warn('[aiClient] Fallback final para OpenAI...')
    return await callOpenAI(systemPrompt, userPrompt, finalConfig)
  }
}

/**
 * Helper: chama a IA e faz parse de JSON automaticamente.
 */
export async function analyzeWithAI<T>(
  systemPrompt: string,
  content: string,
  validator?: (data: any) => T,
  config?: Partial<AIClientConfig>
): Promise<T> {
  const response = await callAI(
    systemPrompt + '\n\nResponde APENAS com JSON válido, sem comentários.',
    content,
    config
  )

  try {
    const clean = response.text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()

    const jsonMatch = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    const jsonStr = jsonMatch ? jsonMatch[0] : clean
    const parsed = JSON.parse(jsonStr)

    return validator ? validator(parsed) : parsed as T
  } catch (error) {
    console.error('[aiClient] Erro ao parsear JSON da IA:', error)
    console.error('[aiClient] Resposta bruta:', response.text.substring(0, 500))
    throw new Error('Falha ao processar resposta da IA')
  }
}

// ─── Gemini ───────────────────────────────────────────────

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  config: AIClientConfig
): Promise<AIResponse> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY não configurada no .env')

  const model = config.model || 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const body = {
    contents: [{
      role: 'user',
      parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }],
    }],
    generationConfig: {
      temperature: config.temperature ?? 0.4,
      maxOutputTokens: config.maxTokens ?? 4000,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(`Gemini API error ${res.status}: ${JSON.stringify(error)}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) throw new Error('Gemini não devolveu texto. Verifica a API key e quota.')

  return {
    text,
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount || 0,
      completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      totalTokens: data.usageMetadata?.totalTokenCount || 0,
    },
    model,
    provider: 'gemini',
  }
}

// ─── Claude ───────────────────────────────────────────────

async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  config: AIClientConfig
): Promise<AIResponse> {
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY
  if (!apiKey) throw new Error('VITE_CLAUDE_API_KEY não configurada no .env')

  const model = config.model || 'claude-sonnet-4-20250514'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.4,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(`Claude API error: ${JSON.stringify(error)}`)
  }

  const data = await res.json()

  return {
    text: data.content[0].text,
    usage: {
      promptTokens: data.usage?.input_tokens || 0,
      completionTokens: data.usage?.output_tokens || 0,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
    model: data.model,
    provider: 'claude',
  }
}

// ─── OpenAI ───────────────────────────────────────────────

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  config: AIClientConfig
): Promise<AIResponse> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) throw new Error('VITE_OPENAI_API_KEY não configurada no .env')

  const model = config.model || 'gpt-4-turbo'

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: config.maxTokens || 4000,
      temperature: config.temperature || 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(`OpenAI API error: ${JSON.stringify(error)}`)
  }

  const data = await res.json()

  return {
    text: data.choices[0].message.content,
    usage: {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    },
    model: data.model,
    provider: 'openai',
  }
}

// ─── Embeddings ───────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) throw new Error('VITE_OPENAI_API_KEY não configurada')

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000),
    }),
  })

  const data = await res.json()
  return data.data[0].embedding
}

// ─── Teste de conexão ─────────────────────────────────────

export async function testAIConnection(provider: AIProvider = 'gemini'): Promise<{
  ok: boolean; provider: string; model: string; message: string
}> {
  try {
    const res = await callAI(
      'És um assistente da SOMA ODÉ.',
      'Responde apenas: "SOMA ODÉ conectada."',
      { provider, maxTokens: 20 }
    )
    return { ok: true, provider: res.provider, model: res.model, message: res.text.trim() }
  } catch (err: any) {
    return { ok: false, provider, model: '', message: err.message || 'Erro desconhecido' }
  }
}