// src/services/searchStrategyAI.ts
// SOMA ODÉ — Motor de pesquisa multilingue e precisa.
// A partir da Cartografia da artista, gera uma busca que cruza
// disciplina + tipo de oportunidade + país, no idioma local.

import { callAI } from './aiClient';

export interface BuscaEstruturada {
  disciplina: string;
  tipoOportunidade: string; // ex: 'residência', 'edital', 'festival'
  paises: string[];
  queryOriginal: string;    // a frase do scout
}

export interface QueryLocalizada {
  pais: string;
  idioma: string;
  query: string;
  termosChave: string[];
}

const IDIOMA_POR_PAIS: Record<string, string> = {
  'Alemanha': 'de', 'Áustria': 'de', 'Suíça': 'de',
  'França': 'fr', 'Bélgica': 'fr', 'Luxemburgo': 'fr',
  'Espanha': 'es', 'México': 'es', 'Argentina': 'es',
  'Itália': 'it',
  'Reino Unido': 'en', 'EUA': 'en', 'Canadá': 'en',
  'Brasil': 'pt', 'Portugal': 'pt', 'Angola': 'pt',
};

/**
 * Constrói o prompt que será enviado ao Gemini
 * para transformar uma intenção em buscas locais.
 */
function criarPrompt(busca: BuscaEstruturada, pais: string, idioma: string): string {
  const tipo = busca.tipoOportunidade || 'residência artística, edital, festival';
  return `Tu és um especialista em oportunidades culturais.
A artista trabalha com ${busca.disciplina}.
A sua intenção de busca original (em português) é: "${busca.queryOriginal}".
Ela procura por ${tipo} em ${pais}.

Traduz e otimiza a busca para ${idioma}, usando os termos técnicos que um edital ou residência usaria nesse país.
Devolve APENAS um JSON com este formato:
{
  "pais": "${pais}",
  "idioma": "${idioma}",
  "query": "a string otimizada para busca na web",
  "termosChave": ["termo1", "termo2", "termo3"]
}`;
}

/**
 * Gera as queries localizadas para cada país alvo.
 * Se a IA falhar, usa um fallback manual.
 */
export async function gerarEstrategiaBuscaMultilingue(
  busca: BuscaEstruturada
): Promise<QueryLocalizada[]> {
  const { paises } = busca;
  if (!paises.length) return [];

  // Para cada país, pedimos ao Gemini que crie a query
  const promessas = paises.map(async (pais) => {
    const idioma = IDIOMA_POR_PAIS[pais] || 'en';
    const prompt = criarPrompt(busca, pais, idioma);
    try {
      const resposta = await callAI(prompt, 'gemini');
      // Gemini às vezes devolve markdown, tentamos extrair JSON
      const jsonLimpo = resposta.replace(/```json|```/g, '').trim();
      const obj = JSON.parse(jsonLimpo);
      return { ...obj, idioma, pais };
    } catch (erro) {
      console.warn(`Fallback para ${pais}`, erro);
      // Fallback: query no idioma local, combinando os termos originais
      return {
        pais,
        idioma,
        query: `${busca.disciplina} ${busca.queryOriginal} ${pais}`,
        termosChave: busca.queryOriginal.split(',').map(s => s.trim()),
      };
    }
  });

  return Promise.all(promessas);
}