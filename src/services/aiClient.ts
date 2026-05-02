// src/services/aiClient.ts
// SOMA ODÉ — Cliente unificado de IA
// Suporte: OpenAI (GPT-4) + Anthropic (Claude)

interface AIClientConfig {
    provider: 'openai' | 'claude'
    model?: string
    temperature?: number
    maxTokens?: number
  }
  
  interface AIResponse {
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
    provider: 'claude',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.3,
    maxTokens: 4000,
  }
  
  /**
   * Chamada principal à IA
   * Todos os outros serviços usam esta função
   */
  export async function callAI(
    systemPrompt: string,
    userPrompt: string,
    config: Partial<AIClientConfig> = {}
  ): Promise<AIResponse> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config }
  
    if (finalConfig.provider === 'claude') {
      return callClaude(systemPrompt, userPrompt, finalConfig)
    }
    
    return callOpenAI(systemPrompt, userPrompt, finalConfig)
  }
  
  async function callClaude(
    systemPrompt: string,
    userPrompt: string,
    config: AIClientConfig
  ): Promise<AIResponse> {
    const apiKey = import.meta.env.VITE_CLAUDE_API_KEY
    
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY não configurada')
    }
  
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model || 'claude-sonnet-4-20250514',
        max_tokens: config.maxTokens || 4000,
        temperature: config.temperature || 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })
  
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Claude API error: ${JSON.stringify(error)}`)
    }
  
    const data = await response.json()
    
    return {
      text: data.content[0].text,
      usage: data.usage,
      model: data.model,
      provider: 'claude',
    }
  }
  
  async function callOpenAI(
    systemPrompt: string,
    userPrompt: string,
    config: AIClientConfig
  ): Promise<AIResponse> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não configurada')
    }
  
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4-turbo',
        max_tokens: config.maxTokens || 4000,
        temperature: config.temperature || 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    })
  
    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`)
    }
  
    const data = await response.json()
    
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
  
  /**
   * Helper: analisa texto e retorna JSON estruturado
   */
  export async function analyzeWithAI<T>(
    systemPrompt: string,
    content: string,
    validator?: (data: any) => T
  ): Promise<T> {
    const response = await callAI(
      systemPrompt + '\n\nResponde APENAS com JSON válido, sem comentários.',
      content
    )
  
    try {
      // Tentar extrair JSON da resposta (caso venha com markdown)
      const jsonMatch = response.text.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[0] : response.text
      const parsed = JSON.parse(jsonStr)
      
      return validator ? validator(parsed) : parsed as T
    } catch (error) {
      console.error('Erro ao parsear JSON da IA:', error)
      console.error('Resposta bruta:', response.text)
      throw new Error('Falha ao processar resposta da IA')
    }
  }
  
  /**
   * Helper: embeddings para busca semântica
   */
  export async function generateEmbedding(text: string): Promise<number[]> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY
    
    // Usa OpenAI para embeddings (mais barato e rápido)
    const response = await fetch('https://api.openai.com/v1/embeddings', {
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
  
    const data = await response.json()
    return data.data[0].embedding
  }