// api/gemini.js
// Serverless Function no Vercel — proxy para a API do Gemini

export default async function handler(req, res) {
    // Apenas aceita POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido' });
    }
  
    const apiKey = process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave API não configurada no servidor' });
    }
  
    try {
      const { prompt } = req.body;
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
          }),
        }
      );
  
      const data = await response.json();
      
      // Extrai apenas o texto
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      return res.status(200).json({ text, raw: data });
    } catch (error) {
      console.error('Erro no proxy Gemini:', error);
      return res.status(500).json({ error: error.message });
    }
  }