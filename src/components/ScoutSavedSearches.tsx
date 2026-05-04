// src/components/ScoutSavedSearches.tsx
// SOMA ODÉ — Scout Proativo v6
// Busca por TIPO + LINGUAGEM + PAÍSES + RECORRÊNCIA
// Inclui: artes, teatro, cinema, audiovisual, associações, projetos sociais, prémios, becas, venues, festas e clubes

import { useState } from 'react'
import type { CSSProperties } from 'react'

type OpportunityType =
  | 'todos'
  | 'residencia'
  | 'open_call'
  | 'festival'
  | 'showcase'
  | 'premio'
  | 'beca'
  | 'mobilidade'
  | 'financiamento'
  | 'subvencao'
  | 'associacao'
  | 'projeto_social'
  | 'educacao'
  | 'mediacao'
  | 'venue'
  | 'festa'
  | 'clube'

type Discipline =
  | 'performance'
  | 'teatro'
  | 'artes_visuais'
  | 'cinema'
  | 'audiovisual'
  | 'documentario'
  | 'danca'
  | 'instalacao'
  | 'investigacao'
  | 'musica'
  | 'dj'
  | 'arte_sonora'
  | 'literatura'
  | 'mediacao_cultural'
  | 'educacao_artistica'
  | 'projeto_social'
  | 'multidisciplinar'

type ApplicantProfile =
  | 'artista_individual'
  | 'coletivo'
  | 'associacao_cultural'
  | 'projeto_social'
  | 'projeto_educativo'
  | 'produtora'
  | 'todos'

type RecurrenceMode = 'ativas_agora' | 'recorrentes' | 'ambas'

export interface SavedSearch {
  id: string
  name: string
  query: string
  countries: string
  disciplines: string
  languages: string
  maxResults: number
  opportunityType: OpportunityType
  selectedCountries: string[]
  selectedDisciplines: Discipline[]
  applicantProfile: ApplicantProfile
  recurrenceMode: RecurrenceMode
  searchQueries: string[]
  usualOpeningMonth?: number
  usualDeadlineMonth?: number
  recurrenceNotes?: string
  createdAt: string
  lastRunAt?: string
}

interface Props {
  onSave?: (search: SavedSearch) => void
}

const STORAGE_KEY = 'soma-scout-v6'

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
]

const OPPORTUNITY_TYPES: { value: OpportunityType; label: string; icon: string; terms: Record<string, string[]> }[] = [
  {
    value: 'todos',
    label: 'Todos os tipos',
    icon: '🔍',
    terms: {
      en: ['cultural opportunity', 'open call'],
      pt: ['oportunidade cultural', 'chamada aberta'],
      es: ['convocatoria cultural', 'convocatoria artística'],
      fr: ['appel à projets culturels', 'appel à candidatures'],
      de: ['kulturausschreibung', 'open call'],
      nl: ['open call kunst', 'culturele oproep'],
      ca: ['convocatòria cultural', 'ajuts cultura'],
    },
  },
  {
    value: 'residencia',
    label: 'Residência',
    icon: '🏠',
    terms: {
      en: ['artist residency'],
      pt: ['residência artística'],
      es: ['residencia artística'],
      fr: ['résidence artistique'],
      de: ['Künstlerresidenz'],
      nl: ['kunstenaarsresidentie'],
      ca: ['residència artística'],
    },
  },
  {
    value: 'open_call',
    label: 'Open Call / Edital',
    icon: '📋',
    terms: {
      en: ['open call', 'call for artists'],
      pt: ['edital', 'chamada aberta'],
      es: ['convocatoria artística', 'convocatoria abierta'],
      fr: ['appel à candidatures', 'appel à projets'],
      de: ['Ausschreibung Künstler', 'Open Call Künstler'],
      nl: ['open call kunstenaars', 'oproep kunstenaars'],
      ca: ['convocatòria artística', 'convocatòria oberta'],
    },
  },
  {
    value: 'festival',
    label: 'Festival',
    icon: '🎪',
    terms: {
      en: ['arts festival open call'],
      pt: ['festival chamada artística'],
      es: ['festival convocatoria artistas'],
      fr: ['festival appel à candidatures artistes'],
      de: ['Festival Ausschreibung Künstler'],
      nl: ['festival open call kunstenaars'],
      ca: ['festival convocatòria artistes'],
    },
  },
  {
    value: 'showcase',
    label: 'Showcase',
    icon: '🎤',
    terms: {
      en: ['showcase application artists'],
      pt: ['showcase artistas inscrição'],
      es: ['showcase artistas convocatoria'],
      fr: ['showcase artistes appel'],
      de: ['Showcase Künstler Bewerbung'],
      nl: ['showcase artiesten aanmelding'],
      ca: ['showcase artistes convocatòria'],
    },
  },
  {
    value: 'premio',
    label: 'Prémio',
    icon: '🏆',
    terms: {
      en: ['art prize'],
      pt: ['prémio artístico'],
      es: ['premio artístico'],
      fr: ['prix artistique'],
      de: ['Kunstpreis'],
      nl: ['kunstprijs'],
      ca: ['premi artístic'],
    },
  },
  {
    value: 'beca',
    label: 'Beca / Bolsa',
    icon: '🎓',
    terms: {
      en: ['artist grant', 'creation grant'],
      pt: ['bolsa de criação', 'apoio à criação'],
      es: ['beca de creación', 'ayuda a la creación'],
      fr: ['bourse de création', 'aide à la création'],
      de: ['Künstlerstipendium', 'Förderung Kunst'],
      nl: ['kunstbeurs', 'subsidie kunstenaars'],
      ca: ['beca de creació', 'ajut a la creació'],
    },
  },
  {
    value: 'mobilidade',
    label: 'Mobilidade',
    icon: '✈️',
    terms: {
      en: ['artist mobility grant'],
      pt: ['mobilidade artística'],
      es: ['movilidad artística'],
      fr: ['mobilité artistique'],
      de: ['Künstler Mobilität Förderung'],
      nl: ['artistieke mobiliteit subsidie'],
      ca: ['mobilitat artística'],
    },
  },
  {
    value: 'financiamento',
    label: 'Financiamento',
    icon: '💰',
    terms: {
      en: ['cultural funding'],
      pt: ['financiamento cultural'],
      es: ['financiación cultural'],
      fr: ['financement culturel'],
      de: ['Kulturförderung'],
      nl: ['cultuurfinanciering'],
      ca: ['finançament cultural'],
    },
  },
  {
    value: 'subvencao',
    label: 'Subvenção pública',
    icon: '🏛️',
    terms: {
      en: ['public cultural grant'],
      pt: ['subvenção cultural'],
      es: ['subvenciones culturales'],
      fr: ['subventions culturelles'],
      de: ['Kulturförderung öffentliche Mittel'],
      nl: ['cultuursubsidie'],
      ca: ['subvencions culturals'],
    },
  },
  {
    value: 'associacao',
    label: 'Edital para associação',
    icon: '🤝',
    terms: {
      en: ['grant cultural associations'],
      pt: ['edital associações culturais'],
      es: ['subvenciones asociaciones culturales'],
      fr: ['subventions associations culturelles'],
      de: ['Förderung Kulturvereine'],
      nl: ['subsidie culturele verenigingen'],
      ca: ['subvencions associacions culturals'],
    },
  },
  {
    value: 'projeto_social',
    label: 'Projeto social',
    icon: '🌱',
    terms: {
      en: ['social cultural project grant'],
      pt: ['projeto social cultural edital'],
      es: ['convocatoria proyectos sociales culturales'],
      fr: ['appel projets sociaux culturels'],
      de: ['soziales Kulturprojekt Förderung'],
      nl: ['sociaal cultureel project subsidie'],
      ca: ['convocatòria projectes socials culturals'],
    },
  },
  {
    value: 'educacao',
    label: 'Educação artística',
    icon: '📚',
    terms: {
      en: ['arts education grant'],
      pt: ['educação artística edital'],
      es: ['educación artística convocatoria'],
      fr: ['éducation artistique appel à projets'],
      de: ['kulturelle Bildung Förderung'],
      nl: ['kunsteducatie subsidie'],
      ca: ['educació artística convocatòria'],
    },
  },
  {
    value: 'mediacao',
    label: 'Mediação cultural',
    icon: '🧭',
    terms: {
      en: ['cultural mediation grant'],
      pt: ['mediação cultural edital'],
      es: ['mediación cultural convocatoria'],
      fr: ['médiation culturelle appel à projets'],
      de: ['Kulturvermittlung Förderung'],
      nl: ['culturele bemiddeling subsidie'],
      ca: ['mediació cultural convocatòria'],
    },
  },
  {
    value: 'venue',
    label: 'Venue / Espaço cultural',
    icon: '🏛',
    terms: {
      en: ['venue booking artists', 'cultural venue programming'],
      pt: ['espaço cultural programação artistas'],
      es: ['espacio cultural programación artistas'],
      fr: ['lieu culturel programmation artistes'],
      de: ['Kulturraum Programm Künstler'],
      nl: ['culturele locatie programmering artiesten'],
      ca: ['espai cultural programació artistes'],
    },
  },
  {
    value: 'festa',
    label: 'Festa / Noite / Ciclo',
    icon: '🎉',
    terms: {
      en: ['club night booking DJ artists'],
      pt: ['festa programação DJ artistas'],
      es: ['fiesta programación DJ artistas'],
      fr: ['soirée club programmation DJ artistes'],
      de: ['Clubnacht Booking DJ Künstler'],
      nl: ['clubnacht booking DJ artiesten'],
      ca: ['festa programació DJ artistes'],
    },
  },
  {
    value: 'clube',
    label: 'Clube / DJ booth',
    icon: '🎧',
    terms: {
      en: ['club booking DJ open decks'],
      pt: ['clube booking DJ open decks'],
      es: ['club booking DJ open decks'],
      fr: ['club booking DJ open decks'],
      de: ['Club Booking DJ Open Decks'],
      nl: ['club booking DJ open decks'],
      ca: ['club booking DJ open decks'],
    },
  },
]

const DISCIPLINES: { value: Discipline; label: string; icon: string; terms: Record<string, string[]> }[] = [
  { value: 'performance', label: 'Performance', icon: '🔥', terms: { en: ['performance', 'performing arts'], pt: ['performance', 'artes performativas'], es: ['performance', 'artes performativas'], fr: ['performance', 'arts performatifs'], de: ['Performancekunst'], nl: ['performancekunst'], ca: ['performance', 'arts performatives'] } },
  { value: 'teatro', label: 'Teatro', icon: '🎭', terms: { en: ['theatre'], pt: ['teatro'], es: ['teatro'], fr: ['théâtre'], de: ['Theater'], nl: ['theater'], ca: ['teatre'] } },
  { value: 'artes_visuais', label: 'Artes Visuais', icon: '🎨', terms: { en: ['visual arts', 'contemporary art'], pt: ['artes visuais', 'arte contemporânea'], es: ['artes visuales', 'arte contemporáneo'], fr: ['arts visuels', 'art contemporain'], de: ['bildende Kunst', 'zeitgenössische Kunst'], nl: ['beeldende kunst', 'hedendaagse kunst'], ca: ['arts visuals', 'art contemporani'] } },
  { value: 'cinema', label: 'Cinema', icon: '🎬', terms: { en: ['film', 'cinema'], pt: ['cinema'], es: ['cine'], fr: ['cinéma'], de: ['Film'], nl: ['film'], ca: ['cinema'] } },
  { value: 'audiovisual', label: 'Audiovisual', icon: '📹', terms: { en: ['audiovisual', 'video art'], pt: ['audiovisual', 'videoarte'], es: ['audiovisual', 'videoarte'], fr: ['audiovisuel', 'art vidéo'], de: ['audiovisuell', 'Videokunst'], nl: ['audiovisueel', 'videokunst'], ca: ['audiovisual', 'videoart'] } },
  { value: 'documentario', label: 'Documentário', icon: '🎞️', terms: { en: ['documentary'], pt: ['documentário'], es: ['documental'], fr: ['documentaire'], de: ['Dokumentarfilm'], nl: ['documentaire'], ca: ['documental'] } },
  { value: 'danca', label: 'Dança', icon: '💃', terms: { en: ['dance', 'choreography'], pt: ['dança', 'coreografia'], es: ['danza', 'coreografía'], fr: ['danse', 'chorégraphie'], de: ['Tanz', 'Choreografie'], nl: ['dans', 'choreografie'], ca: ['dansa', 'coreografia'] } },
  { value: 'instalacao', label: 'Instalação', icon: '💡', terms: { en: ['installation', 'site-specific'], pt: ['instalação'], es: ['instalación'], fr: ['installation'], de: ['Installation'], nl: ['installatie'], ca: ['instal·lació'] } },
  { value: 'investigacao', label: 'Investigação artística', icon: '📚', terms: { en: ['artistic research'], pt: ['investigação artística'], es: ['investigación artística'], fr: ['recherche artistique'], de: ['künstlerische Forschung'], nl: ['artistiek onderzoek'], ca: ['recerca artística'] } },
  { value: 'musica', label: 'Música', icon: '🎵', terms: { en: ['music'], pt: ['música'], es: ['música'], fr: ['musique'], de: ['Musik'], nl: ['muziek'], ca: ['música'] } },
  { value: 'dj', label: 'DJ / Club culture', icon: '🎧', terms: { en: ['DJ', 'club culture', 'electronic music'], pt: ['DJ', 'cultura club', 'música eletrônica'], es: ['DJ', 'cultura club', 'música electrónica'], fr: ['DJ', 'culture club', 'musique électronique'], de: ['DJ', 'Clubkultur', 'elektronische Musik'], nl: ['DJ', 'clubcultuur', 'elektronische muziek'], ca: ['DJ', 'cultura club', 'música electrònica'] } },
  { value: 'arte_sonora', label: 'Arte sonora', icon: '🔊', terms: { en: ['sound art'], pt: ['arte sonora'], es: ['arte sonora'], fr: ['art sonore'], de: ['Klangkunst'], nl: ['geluidskunst'], ca: ['art sonor'] } },
  { value: 'literatura', label: 'Literatura / escrita', icon: '✍️', terms: { en: ['literature', 'writing'], pt: ['literatura', 'escrita'], es: ['literatura', 'escritura'], fr: ['littérature', 'écriture'], de: ['Literatur', 'Schreiben'], nl: ['literatuur', 'schrijven'], ca: ['literatura', 'escriptura'] } },
  { value: 'mediacao_cultural', label: 'Mediação cultural', icon: '🧭', terms: { en: ['cultural mediation'], pt: ['mediação cultural'], es: ['mediación cultural'], fr: ['médiation culturelle'], de: ['Kulturvermittlung'], nl: ['culturele bemiddeling'], ca: ['mediació cultural'] } },
  { value: 'educacao_artistica', label: 'Educação artística', icon: '🏫', terms: { en: ['arts education'], pt: ['educação artística'], es: ['educación artística'], fr: ['éducation artistique'], de: ['kulturelle Bildung'], nl: ['kunsteducatie'], ca: ['educació artística'] } },
  { value: 'projeto_social', label: 'Projeto social', icon: '🌱', terms: { en: ['social project', 'community project'], pt: ['projeto social', 'projeto comunitário'], es: ['proyecto social', 'proyecto comunitario'], fr: ['projet social', 'projet communautaire'], de: ['soziales Projekt', 'Community Projekt'], nl: ['sociaal project', 'gemeenschapsproject'], ca: ['projecte social', 'projecte comunitari'] } },
  { value: 'multidisciplinar', label: 'Multidisciplinar', icon: '✨', terms: { en: ['interdisciplinary arts', 'multidisciplinary'], pt: ['multidisciplinar', 'interdisciplinar'], es: ['multidisciplinar', 'interdisciplinar'], fr: ['pluridisciplinaire', 'interdisciplinaire'], de: ['interdisziplinär', 'multidisziplinär'], nl: ['interdisciplinair', 'multidisciplinair'], ca: ['multidisciplinari', 'interdisciplinari'] } },
]

const APPLICANT_PROFILES: { value: ApplicantProfile; label: string; icon: string }[] = [
  { value: 'todos', label: 'Todos', icon: '🔍' },
  { value: 'artista_individual', label: 'Artista individual', icon: '🎤' },
  { value: 'coletivo', label: 'Coletivo', icon: '👥' },
  { value: 'associacao_cultural', label: 'Associação cultural', icon: '🤝' },
  { value: 'projeto_social', label: 'Projeto social', icon: '🌱' },
  { value: 'projeto_educativo', label: 'Projeto educativo', icon: '🏫' },
  { value: 'produtora', label: 'Produtora / agência', icon: '🗂️' },
]

const COUNTRY_REGIONS = [
  {
    region: 'Europa Ocidental',
    countries: [
      { code: 'DE', name: 'Alemanha', searchName: 'Germany Deutschland Alemanha', flag: '🇩🇪', langs: ['en', 'de'] },
      { code: 'PT', name: 'Portugal', searchName: 'Portugal', flag: '🇵🇹', langs: ['pt', 'en'] },
      { code: 'FR', name: 'França', searchName: 'France França', flag: '🇫🇷', langs: ['fr', 'en'] },
      { code: 'NL', name: 'Países Baixos', searchName: 'Netherlands Nederland Países Baixos', flag: '🇳🇱', langs: ['en', 'nl'] },
      { code: 'BE', name: 'Bélgica', searchName: 'Belgium Belgique België Bélgica', flag: '🇧🇪', langs: ['fr', 'nl', 'en'] },
      { code: 'ES', name: 'Espanha', searchName: 'Spain España Catalunya Barcelona', flag: '🇪🇸', langs: ['es', 'ca', 'en'] },
      { code: 'CH', name: 'Suíça', searchName: 'Switzerland Suisse Schweiz Suíça', flag: '🇨🇭', langs: ['fr', 'de', 'en'] },
      { code: 'AT', name: 'Áustria', searchName: 'Austria Österreich Áustria', flag: '🇦🇹', langs: ['de', 'en'] },
      { code: 'GB', name: 'Reino Unido', searchName: 'United Kingdom UK England London', flag: '🇬🇧', langs: ['en'] },
      { code: 'IT', name: 'Itália', searchName: 'Italy Italia Itália', flag: '🇮🇹', langs: ['en'] },
    ],
  },
  {
    region: 'Europa do Norte',
    countries: [
      { code: 'SE', name: 'Suécia', searchName: 'Sweden Sverige Suécia', flag: '🇸🇪', langs: ['en'] },
      { code: 'NO', name: 'Noruega', searchName: 'Norway Norge Noruega', flag: '🇳🇴', langs: ['en'] },
      { code: 'DK', name: 'Dinamarca', searchName: 'Denmark Danmark Dinamarca', flag: '🇩🇰', langs: ['en'] },
      { code: 'FI', name: 'Finlândia', searchName: 'Finland Suomi Finlândia', flag: '🇫🇮', langs: ['en'] },
    ],
  },
  {
    region: 'América do Sul',
    countries: [
      { code: 'BR', name: 'Brasil', searchName: 'Brasil Brazil', flag: '🇧🇷', langs: ['pt', 'en'] },
      { code: 'AR', name: 'Argentina', searchName: 'Argentina', flag: '🇦🇷', langs: ['es', 'en'] },
      { code: 'CL', name: 'Chile', searchName: 'Chile', flag: '🇨🇱', langs: ['es', 'en'] },
      { code: 'CO', name: 'Colômbia', searchName: 'Colombia Colômbia', flag: '🇨🇴', langs: ['es', 'en'] },
    ],
  },
  {
    region: 'América do Norte',
    countries: [
      { code: 'US', name: 'EUA', searchName: 'United States USA New York Los Angeles', flag: '🇺🇸', langs: ['en'] },
      { code: 'CA', name: 'Canadá', searchName: 'Canada Québec Toronto Montréal', flag: '🇨🇦', langs: ['en', 'fr'] },
      { code: 'MX', name: 'México', searchName: 'Mexico México', flag: '🇲🇽', langs: ['es', 'en'] },
    ],
  },
  {
    region: 'África',
    countries: [
      { code: 'SN', name: 'Senegal', searchName: 'Senegal Sénégal Dakar', flag: '🇸🇳', langs: ['fr', 'en'] },
      { code: 'NG', name: 'Nigéria', searchName: 'Nigeria Lagos', flag: '🇳🇬', langs: ['en'] },
      { code: 'ZA', name: 'África do Sul', searchName: 'South Africa Johannesburg Cape Town', flag: '🇿🇦', langs: ['en'] },
      { code: 'AO', name: 'Angola', searchName: 'Angola Luanda', flag: '🇦🇴', langs: ['pt', 'en'] },
    ],
  },
]

const ALL_COUNTRIES = COUNTRY_REGIONS.flatMap(r => r.countries)

function loadSearches(): SavedSearch[] {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem('soma-scout-v5') ||
      localStorage.getItem('soma-scout-v4') ||
      '[]'
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveSearches(searches: SavedSearch[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(searches))
}

function termsForOpportunity(type: OpportunityType, lang: string): string[] {
  const found = OPPORTUNITY_TYPES.find(t => t.value === type)
  return found?.terms[lang] || found?.terms.en || ['open call']
}

function termsForDiscipline(d: Discipline, lang: string): string[] {
  const found = DISCIPLINES.find(x => x.value === d)
  return found?.terms[lang] || found?.terms.en || []
}

function applicantTerms(profile: ApplicantProfile, lang: string): string[] {
  const map: Record<ApplicantProfile, Record<string, string[]>> = {
    todos: { en: ['artists', 'cultural projects'] },
    artista_individual: { en: ['artists'], pt: ['artistas'], es: ['artistas'], fr: ['artistes'], de: ['Künstler'], nl: ['kunstenaars'], ca: ['artistes'] },
    coletivo: { en: ['collectives'], pt: ['coletivos'], es: ['colectivos'], fr: ['collectifs'], de: ['Kollektive'], nl: ['collectieven'], ca: ['col·lectius'] },
    associacao_cultural: { en: ['cultural associations'], pt: ['associações culturais'], es: ['asociaciones culturales'], fr: ['associations culturelles'], de: ['Kulturvereine'], nl: ['culturele verenigingen'], ca: ['associacions culturals'] },
    projeto_social: { en: ['social projects'], pt: ['projetos sociais'], es: ['proyectos sociales'], fr: ['projets sociaux'], de: ['soziale Projekte'], nl: ['sociale projecten'], ca: ['projectes socials'] },
    projeto_educativo: { en: ['educational projects'], pt: ['projetos educativos'], es: ['proyectos educativos'], fr: ['projets éducatifs'], de: ['Bildungsprojekte'], nl: ['educatieve projecten'], ca: ['projectes educatius'] },
    produtora: { en: ['cultural producers'], pt: ['produtoras culturais'], es: ['productoras culturales'], fr: ['producteurs culturels'], de: ['Kulturproduzenten'], nl: ['culturele producenten'], ca: ['productores culturals'] },
  }

  return map[profile]?.[lang] || map[profile]?.en || []
}

function recurrenceTerms(mode: RecurrenceMode, lang: string): string[] {
  if (mode === 'ativas_agora') {
    const map: Record<string, string[]> = {
      en: ['open call', 'deadline', 'applications open'],
      pt: ['inscrições abertas', 'prazo', 'candidaturas abertas'],
      es: ['convocatoria abierta', 'plazo', 'inscripciones abiertas'],
      fr: ['appel ouvert', 'date limite', 'candidatures ouvertes'],
      de: ['Bewerbungsfrist', 'Ausschreibung offen'],
      nl: ['deadline', 'aanmelden open'],
      ca: ['convocatòria oberta', 'termini', 'inscripcions obertes'],
    }
    return map[lang] || map.en
  }

  if (mode === 'recorrentes') {
    const map: Record<string, string[]> = {
      en: ['annual open call', 'recurring call', 'opens every year'],
      pt: ['edital anual', 'chamada recorrente', 'abre todos os anos'],
      es: ['convocatoria anual', 'convocatoria recurrente', 'abre cada año'],
      fr: ['appel annuel', 'appel récurrent', 'ouvre chaque année'],
      de: ['jährliche Ausschreibung', 'wiederkehrende Ausschreibung'],
      nl: ['jaarlijkse open call', 'terugkerende oproep'],
      ca: ['convocatòria anual', 'convocatòria recurrent'],
    }
    return map[lang] || map.en
  }

  const map: Record<string, string[]> = {
    en: ['open call', 'deadline', 'annual call'],
    pt: ['edital', 'prazo', 'chamada anual'],
    es: ['convocatoria', 'plazo', 'convocatoria anual'],
    fr: ['appel à candidatures', 'date limite', 'appel annuel'],
    de: ['Ausschreibung', 'Bewerbungsfrist', 'jährlich'],
    nl: ['open call', 'deadline', 'jaarlijks'],
    ca: ['convocatòria', 'termini', 'convocatòria anual'],
  }
  return map[lang] || map.en
}

function buildSearchQueries(
  disciplines: Discipline[],
  type: OpportunityType,
  countryCodes: string[],
  applicantProfile: ApplicantProfile,
  recurrenceMode: RecurrenceMode,
): string[] {
  const countries = countryCodes
    .map(code => ALL_COUNTRIES.find(c => c.code === code))
    .filter(Boolean) as typeof ALL_COUNTRIES

  const queries: string[] = []

  for (const country of countries) {
    const langs = country.langs.slice(0, 3)

    for (const lang of langs) {
      const typeTerm = termsForOpportunity(type, lang)[0]
      const discTerms = disciplines
        .map(d => termsForDiscipline(d, lang)[0])
        .filter(Boolean)
        .slice(0, 4)

      const applicant = applicantTerms(applicantProfile, lang)[0]
      const recTerm = recurrenceTerms(recurrenceMode, lang)[0]

      const query = [
        typeTerm,
        ...discTerms,
        applicant,
        recTerm,
        country.searchName,
      ]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()

      if (query && !queries.includes(query)) queries.push(query)
    }
  }

  return queries.slice(0, 18)
}

function buildMainQuery(
  disciplines: Discipline[],
  type: OpportunityType,
  countries: string[],
  applicantProfile: ApplicantProfile,
  recurrenceMode: RecurrenceMode,
): string {
  return buildSearchQueries(disciplines, type, countries, applicantProfile, recurrenceMode)[0] || ''
}

function joinDisciplineTerms(disciplines: Discipline[]): string {
  return disciplines
    .flatMap(d => {
      const item = DISCIPLINES.find(x => x.value === d)
      return item ? [item.label, ...(item.terms.en || []).slice(0, 2)] : []
    })
    .filter(Boolean)
    .join(', ')
}

export default function ScoutSavedSearches({ onSave }: Props) {
  const [searches, setSearches] = useState<SavedSearch[]>(loadSearches())
  const [showModal, setShowModal] = useState(false)

  const [selectedDisciplines, setSelectedDisciplines] = useState<Discipline[]>([])
  const [opportunityType, setOpportunityType] = useState<OpportunityType>('todos')
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [applicantProfile, setApplicantProfile] = useState<ApplicantProfile>('todos')
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('ambas')
  const [usualOpeningMonth, setUsualOpeningMonth] = useState<number | ''>('')
  const [usualDeadlineMonth, setUsualDeadlineMonth] = useState<number | ''>('')
  const [recurrenceNotes, setRecurrenceNotes] = useState('')
  const [searchName, setSearchName] = useState('')
  const [maxResults, setMaxResults] = useState(10)

  function toggleDiscipline(d: Discipline) {
    setSelectedDisciplines(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d],
    )
  }

  function toggleCountry(code: string) {
    setSelectedCountries(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code],
    )
  }

  function toggleRegion(codes: string[]) {
    const allSel = codes.every(c => selectedCountries.includes(c))
    setSelectedCountries(prev =>
      allSel ? prev.filter(c => !codes.includes(c)) : Array.from(new Set([...prev, ...codes])),
    )
  }

  function resetForm() {
    setSelectedDisciplines([])
    setOpportunityType('todos')
    setSelectedCountries([])
    setApplicantProfile('todos')
    setRecurrenceMode('ambas')
    setUsualOpeningMonth('')
    setUsualDeadlineMonth('')
    setRecurrenceNotes('')
    setSearchName('')
    setMaxResults(10)
  }

  function handleSave() {
    if (selectedDisciplines.length === 0) {
      alert('Selecciona pelo menos uma linguagem/prática.')
      return
    }
    if (selectedCountries.length === 0) {
      alert('Selecciona pelo menos um país.')
      return
    }

    const typeLabel = OPPORTUNITY_TYPES.find(t => t.value === opportunityType)?.label || 'Busca'
    const disciplineLabel = selectedDisciplines
      .map(d => DISCIPLINES.find(x => x.value === d)?.label)
      .filter(Boolean)
      .join(' + ')

    const name = searchName.trim() || `${typeLabel} · ${disciplineLabel}`
    const searchQueries = buildSearchQueries(
      selectedDisciplines,
      opportunityType,
      selectedCountries,
      applicantProfile,
      recurrenceMode,
    )

    const newSearch: SavedSearch = {
      id: crypto.randomUUID(),
      name,
      query: searchQueries[0] || '',
      countries: selectedCountries.join(', '),
      disciplines: joinDisciplineTerms(selectedDisciplines),
      languages: 'Multilíngue por país',
      maxResults,
      opportunityType,
      selectedCountries,
      selectedDisciplines,
      applicantProfile,
      recurrenceMode,
      searchQueries,
      usualOpeningMonth: usualOpeningMonth === '' ? undefined : Number(usualOpeningMonth),
      usualDeadlineMonth: usualDeadlineMonth === '' ? undefined : Number(usualDeadlineMonth),
      recurrenceNotes: recurrenceNotes.trim(),
      createdAt: new Date().toISOString(),
    }

    const updated = [newSearch, ...searches]
    setSearches(updated)
    saveSearches(updated)
    onSave?.(newSearch)
    setShowModal(false)
    resetForm()
  }

  function handleRun(search: SavedSearch) {
    const updated = searches.map(s =>
      s.id === search.id ? { ...s, lastRunAt: new Date().toISOString() } : s,
    )
    setSearches(updated)
    saveSearches(updated)
    onSave?.(search)
  }

  function handleDelete(id: string) {
    if (!confirm('Apagar esta busca?')) return
    const updated = searches.filter(s => s.id !== id)
    setSearches(updated)
    saveSearches(updated)
  }

  const previewQueries = selectedDisciplines.length > 0 && selectedCountries.length > 0
    ? buildSearchQueries(selectedDisciplines, opportunityType, selectedCountries, applicantProfile, recurrenceMode)
    : []

  return (
    <div style={sc.wrap}>
      <div style={sc.header}>
        <div>
          <h3 style={sc.title}>🔍 Scout Proativo</h3>
          <p style={sc.subtitle}>
            {searches.length} busca{searches.length !== 1 ? 's' : ''} guardada{searches.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button style={sc.primaryBtn} onClick={() => { resetForm(); setShowModal(true) }}>
          + Nova busca
        </button>
      </div>

      {searches.length > 0 && (
        <div style={sc.list}>
          {searches.map(search => {
            const typeInfo = OPPORTUNITY_TYPES.find(t => t.value === search.opportunityType)
            const profileInfo = APPLICANT_PROFILES.find(p => p.value === search.applicantProfile)
            const discInfos = (search.selectedDisciplines || [])
              .map(d => DISCIPLINES.find(x => x.value === d))
              .filter(Boolean)

            return (
              <div key={search.id} style={sc.card}>
                <div style={sc.cardTop}>
                  <div style={{ flex: 1 }}>
                    <div style={sc.cardName}>{search.name}</div>
                    <div style={sc.cardTags}>
                      {typeInfo && <span style={sc.tagType}>{typeInfo.icon} {typeInfo.label}</span>}
                      {profileInfo && profileInfo.value !== 'todos' && (
                        <span style={sc.tagProfile}>{profileInfo.icon} {profileInfo.label}</span>
                      )}
                      <span style={sc.tagRecurrence}>
                        {search.recurrenceMode === 'recorrentes' ? '🔄 Recorrentes' : search.recurrenceMode === 'ativas_agora' ? '⚡ Abertas agora' : '🔎 Ambas'}
                      </span>
                      {discInfos.slice(0, 5).map(d => d && (
                        <span key={d.value} style={sc.tagDisc}>{d.icon} {d.label}</span>
                      ))}
                    </div>

                    <div style={sc.cardCountries}>
                      {(search.selectedCountries || []).slice(0, 12).map(c => {
                        const found = ALL_COUNTRIES.find(x => x.code === c)
                        return <span key={c} style={sc.countryChip}>{found?.flag} {c}</span>
                      })}
                    </div>

                    {(search.usualOpeningMonth || search.usualDeadlineMonth) && (
                      <div style={sc.recurrenceLine}>
                        {search.usualOpeningMonth && <>abre: {MONTHS.find(m => m.value === search.usualOpeningMonth)?.label}</>}
                        {search.usualOpeningMonth && search.usualDeadlineMonth && ' · '}
                        {search.usualDeadlineMonth && <>deadline: {MONTHS.find(m => m.value === search.usualDeadlineMonth)?.label}</>}
                      </div>
                    )}
                  </div>

                  <div style={sc.cardActions}>
                    <button style={sc.runBtn} onClick={() => handleRun(search)}>▶ Executar</button>
                    <button style={sc.deleteBtn} onClick={() => handleDelete(search.id)}>✕</button>
                  </div>
                </div>

                {search.lastRunAt && (
                  <div style={sc.lastRun}>
                    Última execução: {new Date(search.lastRunAt).toLocaleDateString('pt-PT')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div style={sc.overlay}>
          <div style={sc.modal}>
            <div style={sc.modalHeader}>
              <div>
                <h2 style={sc.modalTitle}>Nova busca Scout</h2>
                <p style={sc.modalSubtitle}>
                  Linguagem + tipo + perfil + países + recorrência → busca multilíngue.
                </p>
              </div>
              <button style={sc.closeBtn} onClick={() => setShowModal(false)}>Fechar</button>
            </div>

            <div style={sc.step}>
              <div style={sc.stepLabel}>
                <span style={sc.stepNum}>1</span>
                Linguagem / prática
              </div>
              <div style={sc.discGrid}>
                {DISCIPLINES.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDiscipline(d.value)}
                    style={{ ...sc.discBtn, ...(selectedDisciplines.includes(d.value) ? sc.discBtnActive : {}) }}
                  >
                    <span style={{ fontSize: 21 }}>{d.icon}</span>
                    <span style={sc.discLabel}>{d.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={sc.step}>
              <div style={sc.stepLabel}>
                <span style={sc.stepNum}>2</span>
                Tipo de oportunidade
              </div>
              <div style={sc.typeGrid}>
                {OPPORTUNITY_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setOpportunityType(t.value)}
                    style={{ ...sc.typeBtn, ...(opportunityType === t.value ? sc.typeBtnActive : {}) }}
                  >
                    <span style={{ fontSize: 18 }}>{t.icon}</span>
                    <span style={sc.typeLabel}>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={sc.step}>
              <div style={sc.stepLabel}>
                <span style={sc.stepNum}>3</span>
                Perfil da candidatura
              </div>
              <div style={sc.typeGrid}>
                {APPLICANT_PROFILES.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setApplicantProfile(p.value)}
                    style={{ ...sc.typeBtn, ...(applicantProfile === p.value ? sc.typeBtnActive : {}) }}
                  >
                    <span style={{ fontSize: 18 }}>{p.icon}</span>
                    <span style={sc.typeLabel}>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={sc.step}>
              <div style={sc.stepLabel}>
                <span style={sc.stepNum}>4</span>
                Países
                <span style={sc.stepHint}>{selectedCountries.length} seleccionados</span>
              </div>

              <div style={sc.quickRow}>
                <button style={sc.quickBtn} onClick={() => {
                  const europa = COUNTRY_REGIONS.slice(0, 2).flatMap(r => r.countries.map(c => c.code))
                  setSelectedCountries(Array.from(new Set([...selectedCountries, ...europa])))
                }}>🌍 Europa</button>
                <button style={sc.quickBtn} onClick={() => {
                  const iberia = ['ES', 'PT', 'FR']
                  setSelectedCountries(Array.from(new Set([...selectedCountries, ...iberia])))
                }}>🇪🇸 Ibéria + França</button>
                <button style={sc.quickBtn} onClick={() => {
                  const latam = COUNTRY_REGIONS.find(r => r.region === 'América do Sul')?.countries.map(c => c.code) || []
                  setSelectedCountries(Array.from(new Set([...selectedCountries, ...latam])))
                }}>🌎 América do Sul</button>
                <button style={sc.quickBtn} onClick={() => setSelectedCountries([])}>× Limpar</button>
              </div>

              {COUNTRY_REGIONS.map(region => {
                const codes = region.countries.map(c => c.code)
                const allSel = codes.every(c => selectedCountries.includes(c))

                return (
                  <div key={region.region} style={{ marginBottom: 12 }}>
                    <div style={sc.regionHeader}>
                      <span style={sc.regionLabel}>{region.region}</span>
                      <button style={sc.regionToggle} onClick={() => toggleRegion(codes)}>
                        {allSel ? '− remover' : '+ todos'}
                      </button>
                    </div>
                    <div style={sc.countryGrid}>
                      {region.countries.map(c => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => toggleCountry(c.code)}
                          style={{ ...sc.countryBtn, ...(selectedCountries.includes(c.code) ? sc.countryBtnActive : {}) }}
                        >
                          {c.flag} {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={sc.step}>
              <div style={sc.stepLabel}>
                <span style={sc.stepNum}>5</span>
                Inteligência de recorrência
              </div>

              <div style={sc.typeGrid}>
                {[
                  { value: 'ambas', label: 'Abertas + recorrentes', icon: '🔎' },
                  { value: 'ativas_agora', label: 'Abertas agora', icon: '⚡' },
                  { value: 'recorrentes', label: 'Recorrentes / anuais', icon: '🔄' },
                ].map(item => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setRecurrenceMode(item.value as RecurrenceMode)}
                    style={{ ...sc.typeBtn, ...(recurrenceMode === item.value ? sc.typeBtnActive : {}) }}
                  >
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span style={sc.typeLabel}>{item.label}</span>
                  </button>
                ))}
              </div>

              <div style={sc.row2}>
                <select
                  style={sc.input}
                  value={usualOpeningMonth}
                  onChange={e => setUsualOpeningMonth(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Mês habitual de abertura</option>
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>

                <select
                  style={sc.input}
                  value={usualDeadlineMonth}
                  onChange={e => setUsualDeadlineMonth(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Mês habitual de deadline</option>
                  {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <textarea
                style={sc.textarea}
                value={recurrenceNotes}
                onChange={e => setRecurrenceNotes(e.target.value)}
                placeholder="Notas: abre todos os anos em março; preparar materiais em janeiro; edital municipal de Barcelona..."
              />
            </div>

            <div style={sc.step}>
              <div style={sc.stepLabel}>
                <span style={sc.stepNum}>6</span>
                Confirmar
              </div>

              <div style={sc.row2}>
                <input
                  style={sc.input}
                  value={searchName}
                  onChange={e => setSearchName(e.target.value)}
                  placeholder="Nome da busca opcional"
                />
                <input
                  style={sc.input}
                  type="number"
                  min={3}
                  max={20}
                  value={maxResults}
                  onChange={e => setMaxResults(Number(e.target.value))}
                />
              </div>

              {previewQueries.length > 0 && (
                <div style={sc.preview}>
                  <div style={sc.previewTitle}>Queries multilíngues que serão enviadas:</div>
                  {previewQueries.slice(0, 8).map((q, i) => (
                    <div key={i} style={sc.previewQuery}>{i + 1}. {q}</div>
                  ))}
                  {previewQueries.length > 8 && (
                    <div style={sc.previewMore}>+ {previewQueries.length - 8} queries adicionais</div>
                  )}
                </div>
              )}
            </div>

            <div style={sc.footer}>
              <button style={sc.cancelBtn} onClick={() => setShowModal(false)}>Cancelar</button>
              <button
                style={sc.primaryBtn}
                onClick={handleSave}
                disabled={selectedDisciplines.length === 0 || selectedCountries.length === 0}
              >
                💾 Guardar busca
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const sc: Record<string, CSSProperties> = {
  wrap: { marginBottom: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { margin: 0, fontSize: 16, color: '#60b4e8' },
  subtitle: { margin: '4px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  list: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 },
  card: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 14 },
  cardTop: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  cardName: { fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 },
  cardTags: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  tagType: { fontSize: 11, color: '#6ef3a5', background: 'rgba(110,243,165,0.1)', border: '1px solid rgba(110,243,165,0.25)', borderRadius: 6, padding: '2px 8px' },
  tagDisc: { fontSize: 11, color: '#60b4e8', background: 'rgba(26,105,148,0.15)', border: '1px solid rgba(26,105,148,0.25)', borderRadius: 6, padding: '2px 8px' },
  tagProfile: { fontSize: 11, color: '#ffcf5c', background: 'rgba(255,207,92,0.1)', border: '1px solid rgba(255,207,92,0.25)', borderRadius: 6, padding: '2px 8px' },
  tagRecurrence: { fontSize: 11, color: '#c084fc', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.25)', borderRadius: 6, padding: '2px 8px' },
  cardCountries: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  countryChip: { fontSize: 10, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', borderRadius: 4, padding: '2px 6px' },
  recurrenceLine: { marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.45)' },
  cardActions: { display: 'flex', gap: 6, flexShrink: 0 },
  runBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  deleteBtn: { background: 'rgba(255,70,70,0.1)', color: '#ff8a8a', border: '1px solid rgba(255,70,70,0.2)', borderRadius: 6, padding: '7px 10px', fontSize: 12, cursor: 'pointer' },
  lastRun: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { width: 'min(920px, 100%)', maxHeight: '94vh', overflowY: 'auto', background: '#000', border: '1px solid #1A6994', borderRadius: 16, padding: 24 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)' },
  modalTitle: { margin: 0, color: '#60b4e8', fontSize: 22 },
  modalSubtitle: { margin: '6px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  closeBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', flexShrink: 0 },
  step: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 18, marginBottom: 12 },
  stepLabel: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14, flexWrap: 'wrap' },
  stepNum: { background: '#1A6994', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 },
  stepHint: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 400 },
  discGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 },
  discBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 76, padding: '10px 8px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, cursor: 'pointer', color: 'rgba(255,255,255,0.6)', gap: 2 },
  discBtnActive: { background: 'rgba(26,105,148,0.25)', border: '2px solid #1A6994', color: '#fff' },
  discLabel: { fontSize: 11, marginTop: 4, textAlign: 'center', lineHeight: 1.2 },
  typeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 },
  typeBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 70, padding: '10px 6px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.6)', gap: 3 },
  typeBtnActive: { background: 'rgba(26,105,148,0.2)', border: '2px solid #1A6994', color: '#fff' },
  typeLabel: { fontSize: 11, marginTop: 3, textAlign: 'center', lineHeight: 1.2 },
  quickRow: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  quickBtn: { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  regionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  regionLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' },
  regionToggle: { background: 'transparent', color: '#60b4e8', border: 'none', fontSize: 11, cursor: 'pointer' },
  countryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6 },
  countryBtn: { padding: '7px 10px', background: 'transparent', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12, cursor: 'pointer', textAlign: 'left' },
  countryBtnActive: { background: 'rgba(26,105,148,0.25)', color: '#fff', border: '1px solid #1A6994' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, marginBottom: 12 },
  input: { width: '100%', background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', minHeight: 70, background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' },
  preview: { padding: 12, background: 'rgba(26,105,148,0.06)', border: '1px solid rgba(26,105,148,0.2)', borderRadius: 8 },
  previewTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' },
  previewQuery: { color: '#60b4e8', fontSize: 12, marginBottom: 5, lineHeight: 1.35 },
  previewMore: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 4 },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' },
  cancelBtn: { background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer' },
  primaryBtn: { background: '#1A6994', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer' },
}