// src/services/cartografiaAI.ts

export type AnaliseCartografia = {
  posicionamento: string
  territorioFoco: { local: string; justificativa: string }
  matchesPrioritarios: { tipo: string; justificativa: string; prioridade: 'alta' | 'media' | 'baixa' }[]
  rotaEstrategica: { passo: string; acao: string; motivo: string }[]
  alertas: { contexto: string; motivo: string }[]
  palavrasChaveParaMatching: string[]
}

export async function gerarAnaliseCartografia(artist: any): Promise<AnaliseCartografia> {
  await new Promise(resolve => setTimeout(resolve, 800))

  const nome = artist.name || 'Este artista'
  const base = artist.base || artist.residenceCountry || 'o território atual'
  const disciplinas = (artist.disciplines || []).join(', ') || 'prática multidisciplinar'
  const keywords = artist.keywords || []

  return {
    posicionamento: `${nome} situa-se num campo de ${disciplinas}, com potencial de circulação a partir de ${base}. A próxima etapa deve consolidar materiais, rede curatorial e territórios prioritários antes de aplicar para oportunidades maiores.`,
    territorioFoco: {
      local: base,
      justificativa: 'É o ponto de partida mais coerente com os dados atuais do perfil e permite fortalecer presença antes de expandir.',
    },
    matchesPrioritarios: [
      {
        tipo: 'Residências artísticas',
        justificativa: 'Permitem desenvolver obra, rede e documentação sem depender apenas de circuito comercial.',
        prioridade: 'alta',
      },
      {
        tipo: 'Festivais curatoriais',
        justificativa: 'Ajudam a posicionar o artista em circuitos de legitimação cultural.',
        prioridade: 'alta',
      },
      {
        tipo: 'Programas de mobilidade internacional',
        justificativa: 'São coerentes com a lógica de circulação territorial da SOMA ODÉ.',
        prioridade: 'media',
      },
    ],
    rotaEstrategica: [
      {
        passo: 'Passo 1',
        acao: 'Completar bio, materiais essenciais e links de documentação.',
        motivo: 'Sem materiais fortes, o matching pode indicar oportunidades mas a candidatura perde força.',
      },
      {
        passo: 'Passo 2',
        acao: 'Escolher 2 territórios prioritários e mapear 5 espaços ou festivais em cada um.',
        motivo: 'A rota precisa ser concreta, não apenas uma intenção geral.',
      },
      {
        passo: 'Passo 3',
        acao: 'Ativar contactos de curadores, pares e instituições já próximos.',
        motivo: 'A legitimação vem por rede, não só por candidatura aberta.',
      },
    ],
    alertas: [
      {
        contexto: 'Open calls muito genéricas',
        motivo: 'Podem consumir tempo sem criar posicionamento real.',
      },
      {
        contexto: 'Festivais sem alinhamento curatorial',
        motivo: 'Podem gerar circulação, mas não necessariamente avanço estratégico.',
      },
    ],
    palavrasChaveParaMatching: [...keywords, disciplinas, base].filter(Boolean),
  }
}