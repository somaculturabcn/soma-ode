// src/components/DocumentGenerator.tsx
// SOMA ODÉ — Gerador de Documentos v2 (Claude · 2026-04-26)
// Idiomas: PT · ES · EN · FR
// Documentos: Carta-Convite · Acuerdo Carta Invitación · Contrato Booking · Carta Apresentação

import { useState, useMemo } from 'react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type DocType = 'carta_convite' | 'acuerdo_carta' | 'contrato_booking' | 'carta_apresentacao'
type Lang = 'PT' | 'ES' | 'EN' | 'FR'

interface ArtistMin {
  id: string
  name: string
  legalName?: string
  email?: string
  projects?: { name: string; format?: string; duration?: string; summary?: string }[]
}

interface FormState {
  projectName: string; artistAlias: string; passport: string
  period: string; eventDate: string; location: string; city: string
  teamTotal: string; teamDesc: string; recipient: string
  grantName: string; grantEntity: string
  presentationFormat: string; showFormat: string; venue: string
  capacity: string; ticketPrice: string; economicModel: string
  supportAmount: string; countries: string; additionalText: string
  venueName: string; venueAddress: string; venueNIF: string; venueRep: string
  fee: string; plusIVA: string; somaPercent: string; paymentTerms: string
  coverTravel: string; coverAccommodation: string; coverMeals: string
  duration: string; technicalNotes: string; additionalClauses: string; lawCountry: string
  artistBio: string; projectDescription: string; targetAudience: string
}

// ─── SOMA (fixo) ──────────────────────────────────────────────────────────────

const SOMA = {
  name: 'SOMA CULTURA ASOCIACIÓN CULTURAL',
  nif: 'G09679614',
  address: 'Monlau 60, 1º1ª, 08027 – Barcelona – España',
  email: 'somaculturabcn@gmail.com',
  tel: '+34 611 555 505',
  web: 'https://www.somacultura.com',
  rep: 'Tâmara Alves da Silva',
  repDNI: '43598819L',
}

// ─── Textos por idioma ────────────────────────────────────────────────────────

const T = {
  PT: {
    dateLabel: 'Barcelona,',
    subject: 'Assunto:',
    regards: 'Prezados/as,',
    projectData: 'DADOS DO PROJETO',
    presentation: 'PROPOSTA DE APRESENTAÇÃO',
    institutional: 'APOIO INSTITUCIONAL',
    formatLabel: 'Formato:',
    capacityLabel: 'Capacidade estimada:',
    ticketLabel: 'Preço estimado do bilhete:',
    economicLabel: 'Modelo económico:',
    teamLabel: 'Equipa:',
    periodLabel: 'Período previsto:',
    locationLabel: 'Local:',
    artistLabel: 'Artista:',
    passportLabel: 'Passaporte:',
    projectLabel: 'Nome do projeto:',
    closing: 'Sem mais, colocamo-nos à disposição para quaisquer esclarecimentos adicionais.\n\nAtenciosamente,',
    repTitle: 'Representante Legal',
    signedBy: 'Assinado digitalmente',
    contractTitle: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS ARTÍSTICOS',
    parties: 'PARTES',
    clauses: 'CLÁUSULAS',
    object: 'Primeira – Objeto',
    dateVenue: 'Segunda – Data, Local e Formato',
    payment: 'Terceira – Remuneração',
    logistics: 'Quarta – Condições Técnicas e Logísticas',
    obligationsVenue: 'Quinta – Obrigações do Contratante',
    obligationsArtist: 'Sexta – Obrigações da Artista',
    cancellation: 'Sétima – Cancelamento',
    law: 'Oitava – Legislação Aplicável',
    additional: 'Nona – Condições Adicionais',
    totalFee: 'Cachê total:',
    somaFee: 'Fee SOMA CULTURA',
    artistNet: 'Valor líquido para A ARTISTA:',
    paymentTermsLabel: 'Forma de pagamento:',
    travelLabel: 'O CONTRATANTE cobre as despesas de viagem da equipa artística',
    noTravelLabel: 'As despesas de viagem são da responsabilidade de A ARTISTA',
    accomLabel: 'O CONTRATANTE cobre o alojamento da equipa',
    mealsLabel: 'O CONTRATANTE cobre as refeições durante a estadia',
    confirmation: 'E, em prova de conformidade, as partes assinam o presente contrato:',
    contratante: 'O CONTRATANTE',
    artista: 'A ARTISTA',
    intermediario: 'INTERMEDIÁRIO',
    invitationAgreementTitle: 'ACORDO DE EMISSÃO DE CARTA-CONVITE',
    noFinancialCommitment: '(Sem compromisso económico)',
    parties2: 'PARTES',
    expose: 'CONSIDERANDOS',
    agree: 'ACORDAM',
    objective: 'Primeiro – Objeto',
    nature: 'Segundo – Natureza do documento',
    noCommitment: 'Terceiro – Ausência de compromisso económico',
    noObligation: 'Quarto – Não obrigação de realização',
    use: 'Quinto – Utilização do documento',
    lawClause: 'Sexto – Legislação aplicável',
    coverLetter: 'CARTA DE APRESENTAÇÃO ARTÍSTICA',
  },
  ES: {
    dateLabel: 'Barcelona,',
    subject: 'Asunto:',
    regards: 'Estimados/as,',
    projectData: 'DATOS DEL PROYECTO',
    presentation: 'PROPUESTA DE PRESENTACIÓN',
    institutional: 'APOYO INSTITUCIONAL',
    formatLabel: 'Formato:',
    capacityLabel: 'Aforo estimado:',
    ticketLabel: 'Precio estimado de la entrada:',
    economicLabel: 'Modelo económico:',
    teamLabel: 'Equipo:',
    periodLabel: 'Período previsto:',
    locationLabel: 'Lugar:',
    artistLabel: 'Artista:',
    passportLabel: 'Pasaporte:',
    projectLabel: 'Nombre del proyecto:',
    closing: 'Sin más, quedamos a su disposición para cualquier aclaración adicional.\n\nAtentamente,',
    repTitle: 'Representante Legal',
    signedBy: 'Firmado digitalmente',
    contractTitle: 'CONTRATO DE PRESTACIÓN DE SERVICIOS ARTÍSTICOS',
    parties: 'PARTES',
    clauses: 'CLÁUSULAS',
    object: 'Primera – Objeto',
    dateVenue: 'Segunda – Fecha, Lugar y Formato',
    payment: 'Tercera – Remuneración',
    logistics: 'Cuarta – Condiciones Técnicas y Logísticas',
    obligationsVenue: 'Quinta – Obligaciones del Contratante',
    obligationsArtist: 'Sexta – Obligaciones de La Artista',
    cancellation: 'Séptima – Cancelación',
    law: 'Octava – Legislación Aplicable',
    additional: 'Novena – Condiciones Adicionales',
    totalFee: 'Caché total:',
    somaFee: 'Fee SOMA CULTURA',
    artistNet: 'Importe neto para LA ARTISTA:',
    paymentTermsLabel: 'Forma de pago:',
    travelLabel: 'EL CONTRATANTE cubre los gastos de viaje del equipo artístico',
    noTravelLabel: 'Los gastos de viaje son responsabilidad de LA ARTISTA',
    accomLabel: 'EL CONTRATANTE cubre el alojamiento del equipo',
    mealsLabel: 'EL CONTRATANTE cubre las comidas durante la estancia',
    confirmation: 'Y en prueba de conformidad, las partes firman el presente contrato:',
    contratante: 'EL CONTRATANTE',
    artista: 'LA ARTISTA',
    intermediario: 'INTERMEDIARIO',
    invitationAgreementTitle: 'ACUERDO DE EMISIÓN DE CARTA DE INVITACIÓN',
    noFinancialCommitment: '(Sin compromiso económico)',
    parties2: 'REUNIDOS',
    expose: 'EXPONEN',
    agree: 'ACUERDAN',
    objective: 'Primero – Objeto',
    nature: 'Segundo – Naturaleza del documento',
    noCommitment: 'Tercero – Ausencia de compromiso económico',
    noObligation: 'Cuarto – No obligación de realización',
    use: 'Quinto – Uso del documento',
    lawClause: 'Sexto – Legislación aplicable',
    coverLetter: 'CARTA DE PRESENTACIÓN ARTÍSTICA',
  },
  EN: {
    dateLabel: 'Barcelona,',
    subject: 'Subject:',
    regards: 'Dear Sir/Madam,',
    projectData: 'PROJECT DETAILS',
    presentation: 'PRESENTATION PROPOSAL',
    institutional: 'INSTITUTIONAL SUPPORT',
    formatLabel: 'Format:',
    capacityLabel: 'Estimated capacity:',
    ticketLabel: 'Estimated ticket price:',
    economicLabel: 'Economic model:',
    teamLabel: 'Team:',
    periodLabel: 'Planned period:',
    locationLabel: 'Venue:',
    artistLabel: 'Artist:',
    passportLabel: 'Passport:',
    projectLabel: 'Project name:',
    closing: 'We remain at your disposal for any further information.\n\nYours sincerely,',
    repTitle: 'Legal Representative',
    signedBy: 'Digitally signed',
    contractTitle: 'ARTISTIC SERVICES AGREEMENT',
    parties: 'PARTIES',
    clauses: 'CLAUSES',
    object: 'First – Purpose',
    dateVenue: 'Second – Date, Venue and Format',
    payment: 'Third – Remuneration',
    logistics: 'Fourth – Technical and Logistical Conditions',
    obligationsVenue: 'Fifth – Obligations of the Contractor',
    obligationsArtist: 'Sixth – Obligations of the Artist',
    cancellation: 'Seventh – Cancellation',
    law: 'Eighth – Applicable Law',
    additional: 'Ninth – Additional Terms',
    totalFee: 'Total fee:',
    somaFee: 'SOMA CULTURA management fee',
    artistNet: 'Net amount to THE ARTIST:',
    paymentTermsLabel: 'Payment terms:',
    travelLabel: 'THE CONTRACTOR covers travel expenses for the artistic team',
    noTravelLabel: 'Travel expenses are the responsibility of THE ARTIST',
    accomLabel: 'THE CONTRACTOR covers accommodation for the team',
    mealsLabel: 'THE CONTRACTOR covers meals during the stay',
    confirmation: 'In witness whereof, the parties have signed this agreement:',
    contratante: 'THE CONTRACTOR',
    artista: 'THE ARTIST',
    intermediario: 'MANAGEMENT / BOOKING AGENT',
    invitationAgreementTitle: 'LETTER OF INVITATION AGREEMENT',
    noFinancialCommitment: '(No financial commitment)',
    parties2: 'PARTIES',
    expose: 'WHEREAS',
    agree: 'NOW, THEREFORE',
    objective: 'First – Purpose',
    nature: 'Second – Nature of the document',
    noCommitment: 'Third – No financial commitment',
    noObligation: 'Fourth – No obligation to programme',
    use: 'Fifth – Use of the document',
    lawClause: 'Sixth – Applicable law',
    coverLetter: 'ARTISTIC PRESENTATION LETTER',
  },
  FR: {
    dateLabel: 'Barcelone,',
    subject: 'Objet :',
    regards: 'Mesdames, Messieurs,',
    projectData: 'DONNÉES DU PROJET',
    presentation: 'PROPOSITION DE PRÉSENTATION',
    institutional: 'SOUTIEN INSTITUTIONNEL',
    formatLabel: 'Format :',
    capacityLabel: 'Capacité estimée :',
    ticketLabel: 'Prix estimé du billet :',
    economicLabel: 'Modèle économique :',
    teamLabel: 'Équipe :',
    periodLabel: 'Période prévue :',
    locationLabel: 'Lieu :',
    artistLabel: 'Artiste :',
    passportLabel: 'Passeport :',
    projectLabel: 'Nom du projet :',
    closing: 'Dans l\'attente de votre réponse, veuillez agréer nos salutations distinguées.\n\nCordialement,',
    repTitle: 'Représentant Légal',
    signedBy: 'Signé numériquement',
    contractTitle: 'CONTRAT DE PRESTATIONS DE SERVICES ARTISTIQUES',
    parties: 'PARTIES',
    clauses: 'CLAUSES',
    object: 'Article 1 – Objet',
    dateVenue: 'Article 2 – Date, Lieu et Format',
    payment: 'Article 3 – Rémunération',
    logistics: 'Article 4 – Conditions Techniques et Logistiques',
    obligationsVenue: 'Article 5 – Obligations du Contractant',
    obligationsArtist: 'Article 6 – Obligations de l\'Artiste',
    cancellation: 'Article 7 – Annulation',
    law: 'Article 8 – Droit Applicable',
    additional: 'Article 9 – Conditions Supplémentaires',
    totalFee: 'Cachet total :',
    somaFee: 'Commission SOMA CULTURA',
    artistNet: 'Montant net pour L\'ARTISTE :',
    paymentTermsLabel: 'Modalités de paiement :',
    travelLabel: 'LE CONTRACTANT prend en charge les frais de déplacement de l\'équipe artistique',
    noTravelLabel: 'Les frais de déplacement sont à la charge de L\'ARTISTE',
    accomLabel: 'LE CONTRACTANT prend en charge l\'hébergement de l\'équipe',
    mealsLabel: 'LE CONTRACTANT prend en charge les repas pendant le séjour',
    confirmation: 'En foi de quoi, les parties ont signé le présent contrat :',
    contratante: 'LE CONTRACTANT',
    artista: 'L\'ARTISTE',
    intermediario: 'INTERMÉDIAIRE',
    invitationAgreementTitle: 'ACCORD D\'ÉMISSION DE LETTRE D\'INVITATION',
    noFinancialCommitment: '(Sans engagement financier)',
    parties2: 'PARTIES',
    expose: 'EXPOSÉ',
    agree: 'IL EST CONVENU',
    objective: 'Article 1 – Objet',
    nature: 'Article 2 – Nature du document',
    noCommitment: 'Article 3 – Absence d\'engagement financier',
    noObligation: 'Article 4 – Absence d\'obligation de réalisation',
    use: 'Article 5 – Utilisation du document',
    lawClause: 'Article 6 – Droit applicable',
    coverLetter: 'LETTRE DE PRÉSENTATION ARTISTIQUE',
  },
}

// ─── Templates ────────────────────────────────────────────────────────────────

function todayFormatted(lang: Lang) {
  const d = new Date()
  if (lang === 'EN') return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  if (lang === 'FR') return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  if (lang === 'ES') return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })
}

function tplCartaConvite(f: FormState, artist: ArtistMin, lang: Lang): string {
  const t = T[lang]
  const alias = f.artistAlias ? ` (${f.artistAlias})` : ''
  const artistName = `${artist.legalName || artist.name}${alias}`
  const projectTitle = `"${f.projectName}"`

  const subjectMap: Record<Lang, string> = {
    PT: `Carta-Convite – Projeto ${projectTitle}`,
    ES: `Carta-Convite – Proyecto ${projectTitle}`,
    EN: `Letter of Invitation – Project ${projectTitle}`,
    FR: `Lettre d'invitation – Projet ${projectTitle}`,
  }
  const openingMap: Record<Lang, string> = {
    PT: `Por meio da presente, a ${SOMA.name}, com sede em Barcelona (Espanha), representada por ${SOMA.rep}, DNI ${SOMA.repDNI}, manifesta o seu interesse em acolher o projeto artístico ${projectTitle}, da artista ${artistName}.`,
    ES: `Por medio de la presente, ${SOMA.name}, con sede en Barcelona (España), representada por ${SOMA.rep}, DNI ${SOMA.repDNI}, manifiesta su interés en acoger el proyecto artístico ${projectTitle}, de la artista ${artistName}.`,
    EN: `By means of this letter, ${SOMA.name}, based in Barcelona (Spain), represented by ${SOMA.rep}, ID ${SOMA.repDNI}, hereby expresses its interest in hosting the artistic project ${projectTitle} by artist ${artistName}.`,
    FR: `Par la présente, ${SOMA.name}, dont le siège est à Barcelone (Espagne), représentée par ${SOMA.rep}, DNI ${SOMA.repDNI}, manifeste son intérêt pour accueillir le projet artistique ${projectTitle} de l'artiste ${artistName}.`,
  }
  const supportMap: Record<Lang, string> = {
    PT: `A ${SOMA.name} ${f.supportAmount ? `prevê um apoio ao projeto no valor estimado de ${f.supportAmount}€, no âmbito de` : 'compromete-se a apoiar a realização do projeto, assegurando'}:`,
    ES: `${SOMA.name} ${f.supportAmount ? `prevé un apoyo al proyecto por valor estimado de ${f.supportAmount}€, en el marco de` : 'se compromete a apoyar la realización del proyecto, garantizando'}:`,
    EN: `${SOMA.name} ${f.supportAmount ? `foresees a support for the project estimated at ${f.supportAmount}€, covering` : 'commits to supporting the realization of the project, ensuring'}:`,
    FR: `${SOMA.name} ${f.supportAmount ? `prévoit un soutien au projet d'une valeur estimée de ${f.supportAmount}€, dans le cadre de` : 's\'engage à soutenir la réalisation du projet, en assurant'}:`,
  }
  const bulletItems: Record<Lang, string[]> = {
    PT: ['Apoio à produção e coordenação local', 'Condições técnicas adequadas para a apresentação', 'Integração do projeto na programação cultural da entidade', 'Ações de comunicação e divulgação'],
    ES: ['Apoyo a la producción y coordinación local', 'Condiciones técnicas adecuadas para la presentación', 'Integración del proyecto en la programación cultural de la entidad', 'Acciones de comunicación y difusión'],
    EN: ['Production support and local coordination', 'Adequate technical conditions for the performance', 'Integration of the project in the cultural programme', 'Communication and outreach actions'],
    FR: ['Soutien à la production et coordination locale', 'Conditions techniques adéquates pour la présentation', 'Intégration du projet dans la programmation culturelle', 'Actions de communication et de diffusion'],
  }
  const closingPara: Record<Lang, string> = {
    PT: `Esta colaboração tem como objetivo fortalecer o intercâmbio cultural internacional e promover a circulação de artistas${f.countries ? ` entre ${f.countries}` : ' a nível internacional'}.`,
    ES: `Esta colaboración tiene como objetivo fortalecer el intercambio cultural internacional y promover la circulación de artistas${f.countries ? ` entre ${f.countries}` : ' a nivel internacional'}.`,
    EN: `This collaboration aims to strengthen international cultural exchange and promote the circulation of artists${f.countries ? ` between ${f.countries}` : ' internationally'}.`,
    FR: `Cette collaboration vise à renforcer les échanges culturels internationaux et à promouvoir la circulation des artistes${f.countries ? ` entre ${f.countries}` : ' à l\'échelle internationale'}.`,
  }

  return `${SOMA.name}
${SOMA.address}
NIF/CIF: ${SOMA.nif}
E-mail: ${SOMA.email}
Tel.: ${SOMA.tel}
Web: ${SOMA.web}

${t.subject} ${subjectMap[lang]}

${f.recipient ? (lang === 'EN' ? `Dear ${f.recipient},` : lang === 'FR' ? `Cher/Chère ${f.recipient},` : `${t.regards.replace('Prezados/as,', `Prezado/a ${f.recipient},`)}`) : t.regards}

${openingMap[lang]}


${t.projectData}

• ${t.projectLabel} ${f.projectName}
• ${t.artistLabel} ${artistName}
${f.passport ? `• ${t.passportLabel} ${f.passport}` : ''}
• ${t.teamLabel} ${f.teamTotal} ${lang === 'EN' ? 'people' : lang === 'FR' ? 'personnes' : 'pessoas'}
${f.teamDesc ? f.teamDesc.split('\n').map(l => `  ${l}`).join('\n') : ''}
• ${t.periodLabel} ${f.period}
• ${t.locationLabel} ${f.location}


${t.presentation}

${lang === 'PT' ? `No âmbito desta colaboração, contempla-se a possibilidade de realização de ${f.presentationFormat || 'uma apresentação'} ${f.venue ? `no ${f.venue}` : 'num espaço cultural'} de ${f.city || 'Barcelona'}, em regime de ${f.economicModel || 'programação a definir'}.`
: lang === 'ES' ? `En el marco de esta colaboración, se contempla la posibilidad de realizar ${f.presentationFormat || 'una presentación'} ${f.venue ? `en ${f.venue}` : 'en un espacio cultural'} de ${f.city || 'Barcelona'}, en régimen de ${f.economicModel || 'programación a definir'}.`
: lang === 'EN' ? `Within this collaboration, we envision the possibility of hosting ${f.presentationFormat || 'a performance'} ${f.venue ? `at ${f.venue}` : 'at a cultural venue'} in ${f.city || 'Barcelona'}, under a ${f.economicModel || 'model to be defined'} arrangement.`
: `Dans le cadre de cette collaboration, nous envisageons la possibilité d'organiser ${f.presentationFormat || 'une présentation'} ${f.venue ? `à ${f.venue}` : 'dans un espace culturel'} de ${f.city || 'Barcelone'}, selon un modèle de ${f.economicModel || 'programmation à définir'}.`
}

${f.capacity ? `${t.formatLabel} ${f.showFormat || (lang === 'EN' ? 'concert' : lang === 'FR' ? 'concert' : 'concerto em sala')}
${t.capacityLabel} ${f.capacity} ${lang === 'EN' ? 'people' : lang === 'FR' ? 'personnes' : 'pessoas'}
${f.ticketPrice ? `${t.ticketLabel} ${f.ticketPrice}` : ''}
${t.economicLabel} ${f.economicModel}` : ''}


${t.institutional}

${supportMap[lang]}

${bulletItems[lang].map(b => `• ${b}`).join('\n')}

${f.additionalText ? `\n${f.additionalText}\n` : ''}
${closingPara[lang]}

${t.closing}

${t.dateLabel} ${todayFormatted(lang)}


${SOMA.rep}
DNI ${SOMA.repDNI}
${t.repTitle}
${SOMA.name}`
}

function tplAcuerdoCarta(f: FormState, artist: ArtistMin, lang: Lang): string {
  const t = T[lang]
  const alias = f.artistAlias ? ` (${f.artistAlias})` : ''
  const artistName = `${artist.legalName || artist.name}${alias}`
  const grantName = f.grantName || (lang === 'EN' ? 'the relevant grant body' : lang === 'FR' ? "l'organisme de financement concerné" : lang === 'ES' ? 'la convocatoria correspondiente' : 'o fundo correspondente')

  const titles: Record<Lang, string> = {
    PT: t.invitationAgreementTitle,
    ES: t.invitationAgreementTitle,
    EN: t.invitationAgreementTitle,
    FR: t.invitationAgreementTitle,
  }

  const partyA: Record<Lang, string> = {
    PT: `De uma parte,\n${SOMA.name}, com NIF/CIF ${SOMA.nif}, com domicílio em ${SOMA.address}, representada por ${SOMA.rep}, com DNI ${SOMA.repDNI}, na qualidade de representante legal (doravante, "SOMA CULTURA").`,
    ES: `De una parte,\n${SOMA.name}, con NIF/CIF ${SOMA.nif}, con domicilio en ${SOMA.address}, representada por ${SOMA.rep}, con DNI ${SOMA.repDNI}, en calidad de representante legal (en adelante, "SOMA CULTURA").`,
    EN: `On one side,\n${SOMA.name}, Tax ID ${SOMA.nif}, with registered address at ${SOMA.address}, represented by ${SOMA.rep}, ID ${SOMA.repDNI}, as legal representative (hereinafter "SOMA CULTURA").`,
    FR: `D'une part,\n${SOMA.name}, NIF/CIF ${SOMA.nif}, dont le siège est au ${SOMA.address}, représentée par ${SOMA.rep}, DNI ${SOMA.repDNI}, en qualité de représentant légal (ci-après « SOMA CULTURA »).`,
  }
  const partyB: Record<Lang, string> = {
    PT: `E da outra parte,\n${artistName}, titular do passaporte nº ${f.passport || '___________'} (doravante, "A ARTISTA").`,
    ES: `Y de otra parte,\n${artistName}, titular del pasaporte nº ${f.passport || '___________'} (en adelante, "LA ARTISTA").`,
    EN: `On the other side,\n${artistName}, holder of passport no. ${f.passport || '___________'} (hereinafter "THE ARTIST").`,
    FR: `D'autre part,\n${artistName}, titulaire du passeport n° ${f.passport || '___________'} (ci-après « L\'ARTISTE »).`,
  }
  const expose: Record<Lang, string> = {
    PT: `1. Que A ARTISTA está a preparar uma candidatura no âmbito do ${grantName}.\n2. Que, para efeitos da referida candidatura, é necessária a apresentação de uma carta-convite por parte de uma entidade cultural europeia.\n3. Que a SOMA CULTURA manifestou o seu interesse em apoiar a candidatura mediante a emissão da referida carta.`,
    ES: `1. Que LA ARTISTA está preparando una solicitud en el marco de la convocatoria de ${grantName}.\n2. Que, a efectos de dicha solicitud, se requiere la presentación de una carta de invitación por parte de una entidad cultural europea.\n3. Que SOMA CULTURA ha manifestado su interés en apoyar la candidatura mediante la emisión de dicha carta.`,
    EN: `1. THE ARTIST is preparing an application under the ${grantName} grant call.\n2. For the purposes of said application, a letter of invitation from a European cultural organisation is required.\n3. SOMA CULTURA has expressed its interest in supporting the application by issuing such a letter.`,
    FR: `1. L'ARTISTE prépare une candidature dans le cadre de l'appel à projets ${grantName}.\n2. Dans ce cadre, une lettre d'invitation d'une organisation culturelle européenne est requise.\n3. SOMA CULTURA a manifesté son intérêt à soutenir la candidature en émettant ladite lettre.`,
  }
  const noCommitItems: Record<Lang, string[]> = {
    PT: ['pagamento de cachê', 'transporte', 'alojamento', 'alimentação', 'gastos técnicos'],
    ES: ['pago de caché', 'transporte', 'alojamiento', 'dietas', 'gastos técnicos'],
    EN: ['payment of fees', 'transport', 'accommodation', 'per diems', 'technical costs'],
    FR: ['paiement du cachet', 'transport', 'hébergement', 'per diem', 'frais techniques'],
  }

  return `${titles[lang]}
${t.noFinancialCommitment}


${t.parties2}

${partyA[lang]}

${partyB[lang]}


${t.expose}

${expose[lang]}


${t.agree}

${t.objective}
${lang === 'PT' ? `O presente acordo tem por objeto formalizar a emissão de uma carta-convite pela SOMA CULTURA em favor do projeto "${f.projectName}", de A ARTISTA, exclusivamente para utilização no processo de candidatura ao ${grantName}.`
: lang === 'ES' ? `El presente acuerdo tiene por objeto formalizar la emisión de una carta de invitación por parte de SOMA CULTURA en favor del proyecto "${f.projectName}", de LA ARTISTA, exclusivamente para su uso en el proceso de solicitud ante ${grantName}.`
: lang === 'EN' ? `This agreement formalises the issuance of a letter of invitation by SOMA CULTURA in support of the project "${f.projectName}" by THE ARTIST, solely for use in the application process for ${grantName}.`
: `Le présent accord a pour objet de formaliser l'émission d'une lettre d'invitation par SOMA CULTURA en faveur du projet « ${f.projectName} » de L'ARTISTE, exclusivement pour son utilisation dans le cadre de la candidature à ${grantName}.`
}

${t.nature}
${lang === 'PT' ? `As partes acordam expressamente que a carta-convite:\n• Tem carácter informativo e institucional;\n• É emitida exclusivamente para facilitar a candidatura do projeto;\n• Não constitui contrato de prestação de serviços nem acordo de programação definitivo.`
: lang === 'ES' ? `Las partes acuerdan expresamente que la carta de invitación:\n• Tiene carácter informativo e institucional;\n• Se emite únicamente para facilitar la candidatura del proyecto;\n• No constituye contrato de prestación de servicios ni acuerdo de programación definitivo.`
: lang === 'EN' ? `The parties expressly agree that the letter of invitation:\n• Is informational and institutional in nature;\n• Is issued solely to support the project application;\n• Does not constitute a service agreement or a definitive programming commitment.`
: `Les parties conviennent expressément que la lettre d'invitation :\n• A un caractère informatif et institutionnel ;\n• Est émise uniquement pour faciliter la candidature au projet ;\n• Ne constitue pas un contrat de services ni un accord de programmation définitif.`
}

${t.noCommitment}
${lang === 'PT' ? `A SOMA CULTURA declara expressamente que:\n• Não assume qualquer compromisso financeiro, incluindo, entre outros:\n${noCommitItems[lang].map(i => `  ○ ${i}`).join('\n')}\n• Qualquer colaboração futura deverá ser objeto de um contrato independente e formalizado por escrito.`
: lang === 'ES' ? `SOMA CULTURA declara expresamente que:\n• No asume ningún compromiso financiero, incluyendo, entre otros:\n${noCommitItems[lang].map(i => `  ○ ${i}`).join('\n')}\n• Cualquier eventual colaboración futura deberá ser objeto de un contrato independiente y formalizado por escrito.`
: lang === 'EN' ? `SOMA CULTURA expressly declares that:\n• It assumes no financial commitment, including but not limited to:\n${noCommitItems[lang].map(i => `  ○ ${i}`).join('\n')}\n• Any future collaboration shall be the subject of a separate written agreement.`
: `SOMA CULTURA déclare expressément qu'elle :\n• N'assume aucun engagement financier, notamment :\n${noCommitItems[lang].map(i => `  ○ ${i}`).join('\n')}\n• Toute collaboration future devra faire l'objet d'un contrat distinct et formalisé par écrit.`
}

${t.noObligation}
${lang === 'PT' ? `A emissão da carta-convite:\n• Não garante a realização do projeto;\n• Não implica obrigação de programação por parte da SOMA CULTURA;\n• Fica sujeita a futuras negociações entre as partes.`
: lang === 'ES' ? `La emisión de la carta de invitación:\n• No garantiza la realización del proyecto;\n• No implica obligación de programación por parte de SOMA CULTURA;\n• Queda supeditada a futuras negociaciones entre las partes.`
: lang === 'EN' ? `The issuance of the letter of invitation:\n• Does not guarantee the realisation of the project;\n• Does not imply any programming obligation on the part of SOMA CULTURA;\n• Is subject to future negotiations between the parties.`
: `L'émission de la lettre d'invitation :\n• Ne garantit pas la réalisation du projet ;\n• N'implique aucune obligation de programmation de la part de SOMA CULTURA ;\n• Est soumise à de futures négociations entre les parties.`
}

${t.use}
${lang === 'PT' ? `A ARTISTA compromete-se a utilizar a carta:\n• Exclusivamente para fins relacionados com a candidatura ao ${grantName};\n• Sem atribuir à SOMA CULTURA compromissos que não estejam expressamente previstos neste acordo.`
: lang === 'ES' ? `LA ARTISTA se compromete a utilizar la carta:\n• Exclusivamente para fines relacionados con la convocatoria de ${grantName};\n• Sin atribuir a SOMA CULTURA compromisos que no estén expresamente recogidos en este acuerdo.`
: lang === 'EN' ? `THE ARTIST undertakes to use the letter:\n• Solely for purposes related to the ${grantName} application;\n• Without attributing to SOMA CULTURA any commitments not expressly set out in this agreement.`
: `L'ARTISTE s'engage à utiliser la lettre :\n• Exclusivement aux fins liées à la candidature à ${grantName} ;\n• Sans attribuer à SOMA CULTURA des engagements non expressément prévus dans le présent accord.`
}

${t.lawClause}
${lang === 'PT' ? 'O presente acordo rege-se pela legislação vigente em Espanha.'
: lang === 'ES' ? 'El presente acuerdo se regirá por la legislación vigente en España.'
: lang === 'EN' ? 'This agreement shall be governed by the laws of Spain.'
: 'Le présent accord est régi par la législation en vigueur en Espagne.'
}

${lang === 'PT' ? 'E, em prova de conformidade, as partes assinam o presente documento:'
: lang === 'ES' ? 'Y en prueba de conformidad, las partes firman el presente documento:'
: lang === 'EN' ? 'In witness whereof, the parties have signed this document:'
: 'En foi de quoi, les parties ont signé le présent document :'}

${t.dateLabel} ${todayFormatted(lang)}


SOMA CULTURA ASOCIACIÓN CULTURAL           ${lang === 'PT' ? 'A ARTISTA' : lang === 'ES' ? 'LA ARTISTA' : lang === 'EN' ? 'THE ARTIST' : "L'ARTISTE"}
${SOMA.rep}                                ${artistName}
DNI ${SOMA.repDNI}`
}

function tplContratoBooking(f: FormState, artist: ArtistMin, lang: Lang): string {
  const t = T[lang]
  const alias = f.artistAlias ? ` (${f.artistAlias})` : ''
  const artistName = `${artist.legalName || artist.name}${alias}`
  const fee = f.fee ? Number(f.fee) : 0
  const somaFee = Math.round(fee * (Number(f.somaPercent || 20) / 100))
  const artistFee = fee - somaFee
  const fmtFee = (n: number) => `${n.toLocaleString('pt-PT')}€`

  return `${t.contractTitle}
(Booking / ${lang === 'EN' ? 'Performance' : lang === 'FR' ? 'Représentation' : 'Actuação'})


${t.parties}

${lang === 'PT' ? 'CONTRATANTE' : lang === 'EN' ? 'CONTRACTOR' : lang === 'FR' ? 'CONTRACTANT' : 'CONTRATANTE'}:
${f.venueName || '___________'}
${f.venueAddress || '___________'}
${f.venueNIF ? `NIF: ${f.venueNIF}` : ''}
${lang === 'PT' ? 'Representada por' : lang === 'EN' ? 'Represented by' : lang === 'FR' ? 'Représenté par' : 'Representada por'}: ${f.venueRep || '___________'}
(${t.contratante})

${t.intermediario}:
${SOMA.name}
${SOMA.address}
NIF/CIF: ${SOMA.nif}
${lang === 'PT' ? 'Representada por' : lang === 'EN' ? 'Represented by' : lang === 'FR' ? 'Représentée par' : 'Representada por'}: ${SOMA.rep}, DNI ${SOMA.repDNI}

${t.artista}:
${artistName}
${f.passport ? `${t.passportLabel} ${f.passport}` : ''}
${artist.email ? `Email: ${artist.email}` : ''}


${t.clauses}

${t.object}
${lang === 'PT' ? `O CONTRATANTE contrata A ARTISTA, através da SOMA CULTURA, para a realização do espetáculo "${f.projectName}" nas condições abaixo especificadas.`
: lang === 'ES' ? `EL CONTRATANTE contrata a LA ARTISTA, a través de SOMA CULTURA, para la realización del espectáculo "${f.projectName}" en las condiciones especificadas a continuación.`
: lang === 'EN' ? `THE CONTRACTOR engages THE ARTIST, through SOMA CULTURA, to perform "${f.projectName}" under the conditions specified below.`
: `LE CONTRACTANT engage L'ARTISTE, par l'intermédiaire de SOMA CULTURA, pour la réalisation du spectacle « ${f.projectName} » dans les conditions spécifiées ci-dessous.`}

${t.dateVenue}
• ${lang === 'PT' ? 'Data' : lang === 'EN' ? 'Date' : lang === 'FR' ? 'Date' : 'Fecha'}: ${f.eventDate || '___________'}
• ${lang === 'PT' ? 'Local' : lang === 'EN' ? 'Venue' : lang === 'FR' ? 'Lieu' : 'Lugar'}: ${f.venueName || '___________'}, ${f.city || '___________'}
• ${t.formatLabel} ${f.showFormat || '___________'}
• ${lang === 'PT' ? 'Duração' : lang === 'EN' ? 'Duration' : lang === 'FR' ? 'Durée' : 'Duración'}: ${f.duration || '___________'}
• ${t.teamLabel} ${f.teamTotal || '___'} ${lang === 'EN' ? 'people' : lang === 'FR' ? 'personnes' : 'pessoas'}
${f.teamDesc ? f.teamDesc.split('\n').map(l => `  ${l}`).join('\n') : ''}

${t.payment}
• ${t.totalFee} ${fee ? `${fmtFee(fee)}${f.plusIVA === 'true' ? (lang === 'EN' ? ' + VAT' : lang === 'FR' ? ' + TVA' : ' + IVA') : (lang === 'EN' ? ' (VAT included)' : lang === 'FR' ? ' (TVA incluse)' : ' (IVA incluído)')}` : '___________€'}
• ${t.somaFee} (${f.somaPercent || 20}%): ${fmtFee(somaFee)}
• ${t.artistNet} ${fmtFee(artistFee)}
• ${t.paymentTermsLabel} ${f.paymentTerms || '___________'}

${t.logistics}
• ${f.coverTravel === 'true' ? t.travelLabel : t.noTravelLabel}
${f.coverAccommodation === 'true' ? `• ${t.accomLabel}` : ''}
${f.coverMeals === 'true' ? `• ${t.mealsLabel}` : ''}
${f.technicalNotes ? `• ${lang === 'EN' ? 'Technical notes' : lang === 'FR' ? 'Notes techniques' : 'Notas técnicas'}: ${f.technicalNotes}` : ''}
• ${lang === 'PT' ? 'Rider técnico: conforme documento em anexo' : lang === 'ES' ? 'Rider técnico: según documento adjunto' : lang === 'EN' ? 'Technical rider: as per attached document' : 'Fiche technique : selon document joint'}

${t.obligationsVenue}
${lang === 'PT' ? '• Disponibilizar o espaço e equipamento técnico conforme rider;\n• Assegurar as condições de segurança adequadas;\n• Realizar a promoção e comunicação do evento;\n• Efetuar o pagamento nos prazos acordados.'
: lang === 'ES' ? '• Proporcionar el espacio y el equipo técnico según el rider;\n• Garantizar las condiciones de seguridad adecuadas;\n• Realizar la promoción y comunicación del evento;\n• Efectuar el pago en los plazos acordados.'
: lang === 'EN' ? '• Provide the venue and technical equipment as per the rider;\n• Ensure adequate safety conditions;\n• Promote and communicate the event;\n• Make payment within the agreed deadlines.'
: '• Mettre à disposition l\'espace et l\'équipement technique selon la fiche technique ;\n• Assurer les conditions de sécurité adéquates ;\n• Réaliser la promotion et la communication de l\'événement ;\n• Effectuer le paiement dans les délais convenus.'}

${t.obligationsArtist}
${lang === 'PT' ? '• Apresentar-se no local e data acordados;\n• Cumprir o programa artístico previsto;\n• Respeitar os horários de soundcheck e atuação.'
: lang === 'ES' ? '• Presentarse en el lugar y fecha acordados;\n• Cumplir el programa artístico previsto;\n• Respetar los horarios de soundcheck y actuación.'
: lang === 'EN' ? '• Attend the venue on the agreed date;\n• Deliver the planned artistic programme;\n• Observe the agreed soundcheck and performance schedule.'
: '• Se présenter au lieu et à la date convenus ;\n• Réaliser le programme artistique prévu ;\n• Respecter les horaires de soundcheck et de représentation.'}

${t.cancellation}
${lang === 'PT' ? '• Cancelamento pelo CONTRATANTE com menos de 30 dias: pagamento de 50% do cachê;\n• Cancelamento pelo CONTRATANTE com menos de 15 dias: pagamento de 100% do cachê;\n• Cancelamento por A ARTISTA por motivo de força maior: devolução dos valores recebidos.'
: lang === 'ES' ? '• Cancelación por EL CONTRATANTE con menos de 30 días: pago del 50% del caché;\n• Cancelación por EL CONTRATANTE con menos de 15 días: pago del 100% del caché;\n• Cancelación por LA ARTISTA por fuerza mayor: devolución de los importes recibidos.'
: lang === 'EN' ? '• Cancellation by THE CONTRACTOR with less than 30 days notice: 50% of the fee;\n• Cancellation by THE CONTRACTOR with less than 15 days notice: 100% of the fee;\n• Cancellation by THE ARTIST due to force majeure: return of amounts received.'
: '• Annulation par LE CONTRACTANT avec moins de 30 jours : paiement de 50% du cachet ;\n• Annulation par LE CONTRACTANT avec moins de 15 jours : paiement de 100% du cachet ;\n• Annulation par L\'ARTISTE pour cause de force majeure : remboursement des sommes perçues.'}

${t.law}
${lang === 'PT' ? `O presente contrato rege-se pela legislação vigente em ${f.lawCountry || 'Espanha'}.`
: lang === 'ES' ? `El presente contrato se regirá por la legislación vigente en ${f.lawCountry || 'España'}.`
: lang === 'EN' ? `This agreement shall be governed by the laws of ${f.lawCountry || 'Spain'}.`
: `Le présent contrat est régi par la législation en vigueur en ${f.lawCountry || 'Espagne'}.`}

${f.additionalClauses ? `${t.additional}\n${f.additionalClauses}\n` : ''}

${t.confirmation}

${t.dateLabel} ${todayFormatted(lang)}


${t.contratante}                           SOMA CULTURA
${f.venueRep || '___________'}            ${SOMA.rep}
                                           DNI ${SOMA.repDNI}


${t.artista}
${artistName}`
}

function tplCartaApresentacao(f: FormState, artist: ArtistMin, lang: Lang): string {
  const t = T[lang]
  const alias = f.artistAlias ? ` (${f.artistAlias})` : ''
  const artistName = `${artist.legalName || artist.name}${alias}`

  const intro: Record<Lang, string> = {
    PT: `É com grande prazer que apresentamos ${artistName}, ${lang === 'PT' && f.artistBio ? '' : 'artista representada pela SOMA CULTURA ASOCIACIÓN CULTURAL'}.`,
    ES: `Es con gran placer que presentamos a ${artistName}, artista representada por SOMA CULTURA ASOCIACIÓN CULTURAL.`,
    EN: `It is with great pleasure that we present ${artistName}, an artist represented by SOMA CULTURA ASOCIACIÓN CULTURAL.`,
    FR: `C'est avec grand plaisir que nous présentons ${artistName}, artiste représentée par SOMA CULTURA ASOCIACIÓN CULTURAL.`,
  }
  const projectIntro: Record<Lang, string> = {
    PT: `O projeto "${f.projectName}" é`,
    ES: `El proyecto "${f.projectName}" es`,
    EN: `The project "${f.projectName}" is`,
    FR: `Le projet « ${f.projectName} » est`,
  }
  const whyLabel: Record<Lang, string> = {
    PT: 'PORQUE APOIAMOS ESTE PROJETO',
    ES: 'POR QUÉ APOYAMOS ESTE PROYECTO',
    EN: 'WHY WE SUPPORT THIS PROJECT',
    FR: 'POURQUOI NOUS SOUTENONS CE PROJET',
  }
  const contactLabel: Record<Lang, string> = {
    PT: 'Para mais informações ou para agendar uma reunião:',
    ES: 'Para más información o para concertar una reunión:',
    EN: 'For further information or to arrange a meeting:',
    FR: 'Pour plus d\'informations ou pour convenir d\'une réunion :',
  }

  return `${SOMA.name}
${SOMA.address}
NIF/CIF: ${SOMA.nif}
E-mail: ${SOMA.email}
Tel.: ${SOMA.tel}
Web: ${SOMA.web}

${t.coverLetter}

${f.recipient ? (lang === 'EN' ? `Dear ${f.recipient},` : lang === 'FR' ? `Cher/Chère ${f.recipient},` : `${t.regards.replace('Prezados/as,', `Prezado/a ${f.recipient},`)}`) : t.regards}

${intro[lang]}

${f.artistBio ? `${f.artistBio}\n` : ''}

${f.projectName ? `${projectIntro[lang]} ${f.projectDescription || ''}` : ''}

${f.targetAudience ? `${lang === 'PT' ? 'Público-alvo' : lang === 'ES' ? 'Público objetivo' : lang === 'EN' ? 'Target audience' : 'Public cible'}: ${f.targetAudience}` : ''}

${f.additionalText ? `\n${whyLabel[lang]}\n\n${f.additionalText}\n` : ''}

${contactLabel[lang]}
${SOMA.email}
${SOMA.tel}
${SOMA.web}

${t.closing}

${t.dateLabel} ${todayFormatted(lang)}


${SOMA.rep}
DNI ${SOMA.repDNI}
${t.repTitle}
${SOMA.name}`
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

function emptyForm(): FormState {
  return {
    projectName: '', artistAlias: '', passport: '', period: '',
    eventDate: '', location: 'Barcelona – España', city: 'Barcelona',
    teamTotal: '', teamDesc: '', recipient: '', grantName: '', grantEntity: '',
    presentationFormat: '', showFormat: '', venue: '', capacity: '',
    ticketPrice: '10€ – 15€', economicModel: '',
    supportAmount: '', countries: 'Portugal, España y otros contextos europeos',
    additionalText: '', venueName: '', venueAddress: '', venueNIF: '',
    venueRep: '', fee: '', plusIVA: 'false', somaPercent: '20',
    paymentTerms: '50% on signing, 50% on the day of the performance',
    coverTravel: 'false', coverAccommodation: 'false', coverMeals: 'false',
    duration: '', technicalNotes: '', additionalClauses: '', lawCountry: 'España',
    artistBio: '', projectDescription: '', targetAudience: '',
  }
}

function loadArtists(): ArtistMin[] {
  try {
    const raw = localStorage.getItem('soma-artists-v2')
    if (!raw) return []
    return JSON.parse(raw).map((a: any) => ({
      id: a.id, name: a.name || '—',
      legalName: a.legalName || a.name || '',
      email: a.email || '',
      projects: a.projects || [],
    }))
  } catch { return [] }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DocumentGenerator() {
  const artists = useMemo(() => loadArtists(), [])
  const [selectedId, setSelectedId] = useState('')
  const [docType, setDocType] = useState<DocType>('carta_convite')
  const [lang, setLang] = useState<Lang>('PT')
  const [form, setForm] = useState<FormState>(emptyForm())
  const [preview, setPreview] = useState('')
  const [copied, setCopied] = useState(false)

  const artist = artists.find(a => a.id === selectedId)

  function up(field: keyof FormState, v: string) {
    setForm(f => ({ ...f, [field]: v }))
  }

  function selectArtist(id: string) {
    setSelectedId(id)
    const a = artists.find(x => x.id === id)
    if (a) {
      const proj = a.projects?.[0]
      setForm(f => ({
        ...f,
        projectName: proj?.name || f.projectName,
        showFormat: proj?.format || f.showFormat,
        duration: proj?.duration || f.duration,
        artistBio: (a as any).bio || f.artistBio,
      }))
    }
    setPreview('')
  }

  function generate() {
    if (!artist) { alert(lang === 'EN' ? 'Select an artist first.' : lang === 'FR' ? 'Sélectionnez un artiste.' : 'Selecciona un artista primero.'); return }
    let text = ''
    if (docType === 'carta_convite') text = tplCartaConvite(form, artist, lang)
    else if (docType === 'acuerdo_carta') text = tplAcuerdoCarta(form, artist, lang)
    else if (docType === 'contrato_booking') text = tplContratoBooking(form, artist, lang)
    else text = tplCartaApresentacao(form, artist, lang)
    setPreview(text)
  }

  function copyText() {
    navigator.clipboard.writeText(preview).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  function downloadTxt() {
    const blob = new Blob([preview], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const names: Record<DocType, string> = {
      carta_convite: 'Carta_Convite',
      acuerdo_carta: 'Acuerdo_Carta',
      contrato_booking: 'Contrato_Booking',
      carta_apresentacao: 'Carta_Apresentacao',
    }
    a.href = url
    a.download = `SOMA_${names[docType]}_${lang}_${artist?.name?.replace(/\s+/g, '_') || 'Artista'}_${new Date().toISOString().slice(0, 10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const docTypes: { id: DocType; label: string; desc: Record<Lang, string> }[] = [
    { id: 'carta_convite', label: '📄', desc: { PT: 'Carta-Convite', ES: 'Carta-Convite', EN: 'Letter of Invitation', FR: 'Lettre d\'invitation' } },
    { id: 'acuerdo_carta', label: '📋', desc: { PT: 'Acuerdo Carta Invitação', ES: 'Acuerdo Carta Invitación', EN: 'Letter of Invitation Agreement', FR: 'Accord Lettre d\'invitation' } },
    { id: 'contrato_booking', label: '🤝', desc: { PT: 'Contrato de Booking', ES: 'Contrato de Booking', EN: 'Booking Contract', FR: 'Contrat de Booking' } },
    { id: 'carta_apresentacao', label: '✉', desc: { PT: 'Carta de Apresentação', ES: 'Carta de Presentación', EN: 'Presentation Letter', FR: 'Lettre de Présentation' } },
  ]

  const showBookingFields = docType === 'contrato_booking'
  const showGrantFields = docType === 'carta_convite' || docType === 'acuerdo_carta'
  const showBioFields = docType === 'carta_apresentacao'

  return (
    <div style={s.wrap}>
      <header style={s.header}>
        <div>
          <h2 style={s.title}>Documentos <span style={s.badge}>v2</span></h2>
          <p style={s.sub}>Contratos e cartas em PT · ES · EN · FR</p>
        </div>
      </header>

      <div style={s.layout}>
        <div style={s.left}>

          {/* Artista */}
          <Block title="1. Artista">
            {artists.length === 0
              ? <p style={s.warn}>Sem artistas cadastrados. Vai a Artistas.</p>
              : <select style={s.sel} value={selectedId} onChange={e => selectArtist(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            }
            {artist && (
              <div style={s.artistBox}>
                <strong>{artist.legalName || artist.name}</strong>
                {artist.email && <span style={s.grey}>{artist.email}</span>}
                {artist.projects?.length ? <span style={s.grey}>{artist.projects.map(p => p.name).join(', ')}</span> : null}
              </div>
            )}
          </Block>

          {/* Idioma */}
          <Block title="2. Idioma do documento">
            <div style={{ display: 'flex', gap: 8 }}>
              {(['PT', 'ES', 'EN', 'FR'] as Lang[]).map(l => (
                <button key={l} style={{ ...s.langBtn, ...(lang === l ? s.langBtnActive : {}) }}
                  onClick={() => { setLang(l); setPreview('') }}>
                  {l === 'PT' ? '🇵🇹 PT' : l === 'ES' ? '🇪🇸 ES' : l === 'EN' ? '🇬🇧 EN' : '🇫🇷 FR'}
                </button>
              ))}
            </div>
          </Block>

          {/* Tipo */}
          <Block title="3. Tipo de documento">
            {docTypes.map(d => (
              <button key={d.id} style={{ ...s.docBtn, ...(docType === d.id ? s.docBtnActive : {}) }}
                onClick={() => { setDocType(d.id); setPreview('') }}>
                <span style={{ fontSize: 18, marginRight: 10 }}>{d.label}</span>
                <span>
                  <strong style={{ display: 'block', fontSize: 13 }}>{d.desc[lang]}</strong>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                    {d.id === 'carta_convite' && 'Para candidaturas a fundos e editais'}
                    {d.id === 'acuerdo_carta' && 'Contrato interno SOMA ↔ artista'}
                    {d.id === 'contrato_booking' && 'Com cachê, fee SOMA e logística'}
                    {d.id === 'carta_apresentacao' && 'Para apresentar artista a programadores'}
                  </span>
                </span>
              </button>
            ))}
          </Block>

          {/* Projecto */}
          <Block title="4. Projecto e equipa">
            <F label="Nome do projecto" v={form.projectName} on={v => up('projectName', v)} ph="HOJE À NOITE" />
            <F label="Nome artístico / alias" v={form.artistAlias} on={v => up('artistAlias', v)} ph="Jesuton" />
            <F label="Nº passaporte" v={form.passport} on={v => up('passport', v)} />
            <F label={lang === 'EN' ? 'Recipient' : lang === 'FR' ? 'Destinataire' : 'Destinatário'} v={form.recipient} on={v => up('recipient', v)} ph="Comissão de Avaliação / Jury" />
            <Row2>
              <F label={lang === 'EN' ? 'Team (total)' : lang === 'FR' ? 'Équipe (total)' : 'Equipa (total)'} v={form.teamTotal} on={v => up('teamTotal', v)} type="number" />
              <F label={lang === 'EN' ? 'Duration' : lang === 'FR' ? 'Durée' : 'Duração'} v={form.duration} on={v => up('duration', v)} ph="60 min" />
            </Row2>
            <FA label={lang === 'EN' ? 'Team composition' : lang === 'FR' ? 'Composition de l\'équipe' : 'Composição da equipa'} v={form.teamDesc} on={v => up('teamDesc', v)}
              ph={'5 músicos (incluindo a artista)\n1 produção\n1 técnico de som'} />
          </Block>

          {/* Candidatura / fundo */}
          {showGrantFields && (
            <Block title={lang === 'EN' ? '5. Grant details' : lang === 'FR' ? '5. Détails du financement' : '5. Candidatura e fundo'}>
              <F label={lang === 'EN' ? 'Grant / Fund name' : lang === 'FR' ? 'Nom du fonds' : 'Fundo / Edital'} v={form.grantName} on={v => up('grantName', v)} ph="DGArtes · Ibermúsicas · GDA · Creative Europe" />
              <F label={lang === 'EN' ? 'Period / Dates' : lang === 'FR' ? 'Période prévue' : 'Período previsto'} v={form.period} on={v => up('period', v)} ph="Outubro 2027" />
              <Row2>
                <F label={lang === 'EN' ? 'Location' : lang === 'FR' ? 'Lieu' : 'Local'} v={form.location} on={v => up('location', v)} />
                <F label={lang === 'EN' ? 'City' : lang === 'FR' ? 'Ville' : 'Cidade'} v={form.city} on={v => up('city', v)} />
              </Row2>
              {docType === 'carta_convite' && (
                <>
                  <F label="Venue / espaço" v={form.venue} on={v => up('venue', v)} />
                  <Row2>
                    <F label={lang === 'EN' ? 'Capacity' : lang === 'FR' ? 'Capacité' : 'Capacidade'} v={form.capacity} on={v => up('capacity', v)} type="number" />
                    <F label={lang === 'EN' ? 'Ticket price' : lang === 'FR' ? 'Prix billet' : 'Preço bilhete'} v={form.ticketPrice} on={v => up('ticketPrice', v)} />
                  </Row2>
                  <F label={lang === 'EN' ? 'Economic model' : lang === 'FR' ? 'Modèle économique' : 'Modelo económico'} v={form.economicModel} on={v => up('economicModel', v)} ph="bilheteira partilhada / box office split" />
                  <F label={lang === 'EN' ? 'SOMA support (€)' : lang === 'FR' ? 'Soutien SOMA (€)' : 'Apoio SOMA (€)'} v={form.supportAmount} on={v => up('supportAmount', v)} type="number" />
                  <F label={lang === 'EN' ? 'Countries of circulation' : lang === 'FR' ? 'Pays de circulation' : 'Países de circulação'} v={form.countries} on={v => up('countries', v)} />
                </>
              )}
              <FA label={lang === 'EN' ? 'Additional text' : lang === 'FR' ? 'Texte additionnel' : 'Texto adicional'} v={form.additionalText} on={v => up('additionalText', v)} />
            </Block>
          )}

          {/* Carta de apresentação */}
          {showBioFields && (
            <Block title="5. Bio e projecto">
              <FA label={lang === 'EN' ? 'Artist bio' : lang === 'FR' ? 'Bio de l\'artiste' : 'Bio do/a artista'} v={form.artistBio} on={v => up('artistBio', v)} />
              <FA label={lang === 'EN' ? 'Project description' : lang === 'FR' ? 'Description du projet' : 'Descrição do projecto'} v={form.projectDescription} on={v => up('projectDescription', v)} />
              <F label={lang === 'EN' ? 'Target audience' : lang === 'FR' ? 'Public cible' : 'Público-alvo'} v={form.targetAudience} on={v => up('targetAudience', v)} />
              <FA label={lang === 'EN' ? 'Why we support (additional)' : 'Por que apoiamos (adicional)'} v={form.additionalText} on={v => up('additionalText', v)} />
            </Block>
          )}

          {/* Booking */}
          {showBookingFields && (
            <Block title="5. Booking e financeiro">
              <F label={lang === 'EN' ? 'Venue name' : 'Nome do venue'} v={form.venueName} on={v => up('venueName', v)} />
              <F label={lang === 'EN' ? 'Venue address' : 'Morada do venue'} v={form.venueAddress} on={v => up('venueAddress', v)} />
              <Row2>
                <F label="NIF / Tax ID" v={form.venueNIF} on={v => up('venueNIF', v)} />
                <F label={lang === 'EN' ? 'Representative' : 'Representante'} v={form.venueRep} on={v => up('venueRep', v)} />
              </Row2>
              <Row2>
                <F label={lang === 'EN' ? 'Event date' : 'Data do evento'} v={form.eventDate} on={v => up('eventDate', v)} type="date" />
                <F label={lang === 'EN' ? 'Show format' : 'Formato'} v={form.showFormat} on={v => up('showFormat', v)} ph="concerto em sala" />
              </Row2>
              <Row2>
                <F label={lang === 'EN' ? 'Location' : 'Local'} v={form.location} on={v => up('location', v)} />
                <F label={lang === 'EN' ? 'City' : 'Cidade'} v={form.city} on={v => up('city', v)} />
              </Row2>
              <Row2>
                <F label={lang === 'EN' ? 'Total fee (€)' : 'Cachê total (€)'} v={form.fee} on={v => up('fee', v)} type="number" />
                <F label="% SOMA" v={form.somaPercent} on={v => up('somaPercent', v)} type="number" />
              </Row2>
              {form.fee && Number(form.fee) > 0 && (
                <div style={{ background: 'rgba(110,243,165,0.06)', border: '0.5px solid rgba(110,243,165,0.2)', borderRadius: 8, padding: 10, fontSize: 12, marginBottom: 8 }}>
                  <div style={{ color: '#6ef3a5' }}>SOMA: €{Math.round(Number(form.fee) * Number(form.somaPercent || 20) / 100)}</div>
                  <div style={{ color: '#aaa' }}>Artista: €{Number(form.fee) - Math.round(Number(form.fee) * Number(form.somaPercent || 20) / 100)}</div>
                </div>
              )}
              <Row2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={s.lbl}>IVA</label>
                  <select style={s.sel} value={form.plusIVA} onChange={e => up('plusIVA', e.target.value)}>
                    <option value="false">{lang === 'EN' ? 'VAT included' : lang === 'FR' ? 'TVA incluse' : 'IVA incluído'}</option>
                    <option value="true">+ IVA / VAT / TVA</option>
                  </select>
                </div>
                <F label={lang === 'EN' ? 'Governing law' : 'Legislação'} v={form.lawCountry} on={v => up('lawCountry', v)} ph="España / Portugal" />
              </Row2>
              <F label={lang === 'EN' ? 'Payment terms' : 'Condições de pagamento'} v={form.paymentTerms} on={v => up('paymentTerms', v)} />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '8px 0' }}>
                {[['coverTravel', lang === 'EN' ? 'Travel covered' : 'Viagem coberta'], ['coverAccommodation', lang === 'EN' ? 'Accommodation covered' : 'Alojamento coberto'], ['coverMeals', lang === 'EN' ? 'Meals covered' : 'Refeições cobertas']].map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 12, color: '#ccc', cursor: 'pointer' }}>
                    <input type="checkbox" checked={(form as any)[key] === 'true'} onChange={e => up(key as keyof FormState, e.target.checked ? 'true' : 'false')} style={{ accentColor: '#1A6994' }} />
                    {label}
                  </label>
                ))}
              </div>
              <FA label={lang === 'EN' ? 'Technical notes' : 'Notas técnicas'} v={form.technicalNotes} on={v => up('technicalNotes', v)} />
              <FA label={lang === 'EN' ? 'Additional clauses' : 'Cláusulas adicionais'} v={form.additionalClauses} on={v => up('additionalClauses', v)} />
            </Block>
          )}

          <button style={s.btnGen} onClick={generate}>✨ Gerar documento</button>
        </div>

        {/* Preview */}
        <div style={s.right}>
          {preview ? (
            <>
              <div style={s.previewTop}>
                <span style={{ fontSize: 12, color: '#6ef3a5' }}>✓ {lang === 'EN' ? 'Document generated' : lang === 'FR' ? 'Document généré' : 'Documento gerado'}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={s.btnCopy} onClick={copyText}>{copied ? '✓' : '📋'} {lang === 'EN' ? 'Copy' : 'Copiar'}</button>
                  <button style={s.btnDown} onClick={downloadTxt}>⬇ .txt</button>
                </div>
              </div>
              <div style={s.previewNote}>
                💡 {lang === 'EN' ? 'Copy to Word / Google Docs to add logo and formatting.'
                  : lang === 'FR' ? 'Copiez dans Word / Google Docs pour ajouter le logo et la mise en page.'
                  : 'Copia para Word / Google Docs para adicionar o logótipo e formatação.'}
              </div>
              <pre style={s.pre}>{preview}</pre>
            </>
          ) : (
            <div style={s.empty}>
              <p style={{ fontSize: 32 }}>📄</p>
              <p>{lang === 'EN' ? 'Fill in the fields and click' : lang === 'FR' ? 'Remplissez les champs et cliquez sur' : 'Preenche os campos e clica em'}<br /><strong>✨ Gerar documento</strong></p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={s.block}><div style={s.blockTitle}>{title}</div>{children}</div>
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>{children}</div>
}

function F({ label, v, on, type = 'text', ph }: { label: string; v: string; on: (x: string) => void; type?: string; ph?: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={s.lbl}>{label}</label>
      <input style={s.inp} type={type} value={v} placeholder={ph || label} onChange={e => on(e.target.value)} />
    </div>
  )
}

function FA({ label, v, on, ph }: { label: string; v: string; on: (x: string) => void; ph?: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={s.lbl}>{label}</label>
      <textarea style={s.ta} value={v} placeholder={ph || label} onChange={e => on(e.target.value)} />
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 1400, margin: '0 auto', padding: '24px 20px', color: '#fff' },
  header: { marginBottom: 24 },
  title: { margin: 0, fontSize: 24, color: '#fff' },
  badge: { fontSize: 11, color: '#6ef3a5', background: 'rgba(110,243,165,0.12)', padding: '2px 8px', borderRadius: 10, marginLeft: 8, fontWeight: 400 },
  sub: { margin: '4px 0 0', color: '#bbb', fontSize: 13 },
  layout: { display: 'grid', gridTemplateColumns: '420px 1fr', gap: 20, alignItems: 'start' },
  left: { display: 'flex', flexDirection: 'column', gap: 0 },
  right: { background: '#0a0a0a', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, minHeight: 600, position: 'sticky', top: 80 },
  block: { background: '#0a0a0a', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 16px', marginBottom: 10 },
  blockTitle: { fontSize: 11, fontWeight: 700, color: '#60b4e8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 },
  lbl: { fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 4 },
  inp: { width: '100%', background: '#111', color: '#fff', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '8px 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box' },
  ta: { width: '100%', background: '#111', color: '#fff', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '8px 10px', fontSize: 12, outline: 'none', minHeight: 70, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' },
  sel: { width: '100%', background: '#111', color: '#fff', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '8px 10px', fontSize: 12, outline: 'none' },
  langBtn: { flex: 1, padding: '8px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)', fontSize: 13, cursor: 'pointer', borderRadius: 7 },
  langBtnActive: { background: 'rgba(26,105,148,0.25)', border: '0.5px solid #1A6994', color: '#fff', fontWeight: 700 },
  docBtn: { width: '100%', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 12px', marginBottom: 6, cursor: 'pointer', color: 'rgba(255,255,255,0.65)', textAlign: 'left' },
  docBtnActive: { background: 'rgba(26,105,148,0.2)', border: '0.5px solid #1A6994', color: '#fff' },
  artistBox: { marginTop: 8, padding: 10, background: 'rgba(110,243,165,0.05)', border: '0.5px solid rgba(110,243,165,0.15)', borderRadius: 7, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  grey: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  warn: { color: '#ffcf5c', fontSize: 12 },
  btnGen: { width: '100%', background: '#1A6994', color: '#fff', border: 'none', borderRadius: 9, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
  previewTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' },
  previewNote: { padding: '8px 16px', background: 'rgba(255,207,92,0.06)', fontSize: 11, color: '#ffcf5c', borderBottom: '0.5px solid rgba(255,207,92,0.1)' },
  pre: { padding: '16px 20px', fontSize: 12, lineHeight: 1.8, color: '#ddd', whiteSpace: 'pre-wrap', fontFamily: '"Courier New", monospace', margin: 0, maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 500, color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: 14, lineHeight: 1.7 },
  btnCopy: { background: 'rgba(110,243,165,0.1)', color: '#6ef3a5', border: '0.5px solid rgba(110,243,165,0.3)', borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  btnDown: { background: 'rgba(26,105,148,0.2)', color: '#60b4e8', border: '0.5px solid rgba(26,105,148,0.4)', borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
}