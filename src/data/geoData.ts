// src/data/geoData.ts
// SOMA SCOUT — Geografia completa para matching cultural
// Todos os países onde se faz cultura, organizados por região

export type GeoRegion = {
  id: string
  label: string
  emoji: string
  countries: Country[]
}

export type Country = {
  code: string   // ISO 3166-1 alpha-2
  name: string   // nome em português
  nameEn: string // nome em inglês (para matching)
  eu: boolean    // membro da UE (relevante para vistos)
  schengen: boolean
}

export const GEO_REGIONS: GeoRegion[] = [
  {
    id: 'europa_ocidental',
    label: 'Europa Ocidental',
    emoji: '🇪🇺',
    countries: [
      { code: 'ES', name: 'Espanha',          nameEn: 'Spain',           eu: true,  schengen: true  },
      { code: 'PT', name: 'Portugal',          nameEn: 'Portugal',        eu: true,  schengen: true  },
      { code: 'FR', name: 'França',            nameEn: 'France',          eu: true,  schengen: true  },
      { code: 'DE', name: 'Alemanha',          nameEn: 'Germany',         eu: true,  schengen: true  },
      { code: 'IT', name: 'Itália',            nameEn: 'Italy',           eu: true,  schengen: true  },
      { code: 'NL', name: 'Países Baixos',     nameEn: 'Netherlands',     eu: true,  schengen: true  },
      { code: 'BE', name: 'Bélgica',           nameEn: 'Belgium',         eu: true,  schengen: true  },
      { code: 'CH', name: 'Suíça',             nameEn: 'Switzerland',     eu: false, schengen: true  },
      { code: 'AT', name: 'Áustria',           nameEn: 'Austria',         eu: true,  schengen: true  },
      { code: 'GB', name: 'Reino Unido',       nameEn: 'United Kingdom',  eu: false, schengen: false },
      { code: 'IE', name: 'Irlanda',           nameEn: 'Ireland',         eu: true,  schengen: false },
      { code: 'SE', name: 'Suécia',            nameEn: 'Sweden',          eu: true,  schengen: true  },
      { code: 'NO', name: 'Noruega',           nameEn: 'Norway',          eu: false, schengen: true  },
      { code: 'DK', name: 'Dinamarca',         nameEn: 'Denmark',         eu: true,  schengen: true  },
      { code: 'FI', name: 'Finlândia',         nameEn: 'Finland',         eu: true,  schengen: true  },
      { code: 'IS', name: 'Islândia',          nameEn: 'Iceland',         eu: false, schengen: true  },
      { code: 'LU', name: 'Luxemburgo',        nameEn: 'Luxembourg',      eu: true,  schengen: true  },
      { code: 'GR', name: 'Grécia',            nameEn: 'Greece',          eu: true,  schengen: true  },
      { code: 'CY', name: 'Chipre',            nameEn: 'Cyprus',          eu: true,  schengen: false },
      { code: 'MT', name: 'Malta',             nameEn: 'Malta',           eu: true,  schengen: true  },
    ],
  },
  {
    id: 'europa_do_leste',
    label: 'Europa do Leste e Central',
    emoji: '🏰',
    countries: [
      { code: 'PL', name: 'Polónia',           nameEn: 'Poland',          eu: true,  schengen: true  },
      { code: 'CZ', name: 'República Checa',   nameEn: 'Czech Republic',  eu: true,  schengen: true  },
      { code: 'HU', name: 'Hungria',           nameEn: 'Hungary',         eu: true,  schengen: true  },
      { code: 'RO', name: 'Roménia',           nameEn: 'Romania',         eu: true,  schengen: true  },
      { code: 'BG', name: 'Bulgária',          nameEn: 'Bulgaria',        eu: true,  schengen: true  },
      { code: 'SK', name: 'Eslováquia',        nameEn: 'Slovakia',        eu: true,  schengen: true  },
      { code: 'SI', name: 'Eslovénia',         nameEn: 'Slovenia',        eu: true,  schengen: true  },
      { code: 'HR', name: 'Croácia',           nameEn: 'Croatia',         eu: true,  schengen: true  },
      { code: 'RS', name: 'Sérvia',            nameEn: 'Serbia',          eu: false, schengen: false },
      { code: 'BA', name: 'Bósnia-Herzegovina',nameEn: 'Bosnia',          eu: false, schengen: false },
      { code: 'MK', name: 'Macedónia do Norte',nameEn: 'North Macedonia', eu: false, schengen: false },
      { code: 'AL', name: 'Albânia',           nameEn: 'Albania',         eu: false, schengen: false },
      { code: 'ME', name: 'Montenegro',        nameEn: 'Montenegro',      eu: false, schengen: false },
      { code: 'XK', name: 'Kosovo',            nameEn: 'Kosovo',          eu: false, schengen: false },
      { code: 'UA', name: 'Ucrânia',           nameEn: 'Ukraine',         eu: false, schengen: false },
      { code: 'MD', name: 'Moldávia',          nameEn: 'Moldova',         eu: false, schengen: false },
      { code: 'BY', name: 'Bielorrússia',      nameEn: 'Belarus',         eu: false, schengen: false },
      { code: 'LT', name: 'Lituânia',          nameEn: 'Lithuania',       eu: true,  schengen: true  },
      { code: 'LV', name: 'Letónia',           nameEn: 'Latvia',          eu: true,  schengen: true  },
      { code: 'EE', name: 'Estónia',           nameEn: 'Estonia',         eu: true,  schengen: true  },
    ],
  },
  {
    id: 'russia_asia_central',
    label: 'Rússia e Ásia Central',
    emoji: '🏔️',
    countries: [
      { code: 'RU', name: 'Rússia',            nameEn: 'Russia',          eu: false, schengen: false },
      { code: 'GE', name: 'Geórgia',           nameEn: 'Georgia',         eu: false, schengen: false },
      { code: 'AM', name: 'Arménia',           nameEn: 'Armenia',         eu: false, schengen: false },
      { code: 'AZ', name: 'Azerbaijão',        nameEn: 'Azerbaijan',      eu: false, schengen: false },
      { code: 'KZ', name: 'Cazaquistão',       nameEn: 'Kazakhstan',      eu: false, schengen: false },
      { code: 'UZ', name: 'Uzbequistão',       nameEn: 'Uzbekistan',      eu: false, schengen: false },
      { code: 'KG', name: 'Quirguistão',       nameEn: 'Kyrgyzstan',      eu: false, schengen: false },
      { code: 'TJ', name: 'Tajiquistão',       nameEn: 'Tajikistan',      eu: false, schengen: false },
      { code: 'TM', name: 'Turquemenistão',    nameEn: 'Turkmenistan',    eu: false, schengen: false },
    ],
  },
  {
    id: 'america_norte_central',
    label: 'América do Norte e Central',
    emoji: '🌎',
    countries: [
      { code: 'US', name: 'Estados Unidos',    nameEn: 'United States',   eu: false, schengen: false },
      { code: 'CA', name: 'Canadá',            nameEn: 'Canada',          eu: false, schengen: false },
      { code: 'MX', name: 'México',            nameEn: 'Mexico',          eu: false, schengen: false },
      { code: 'GT', name: 'Guatemala',         nameEn: 'Guatemala',       eu: false, schengen: false },
      { code: 'BZ', name: 'Belize',            nameEn: 'Belize',          eu: false, schengen: false },
      { code: 'HN', name: 'Honduras',          nameEn: 'Honduras',        eu: false, schengen: false },
      { code: 'SV', name: 'El Salvador',       nameEn: 'El Salvador',     eu: false, schengen: false },
      { code: 'NI', name: 'Nicarágua',         nameEn: 'Nicaragua',       eu: false, schengen: false },
      { code: 'CR', name: 'Costa Rica',        nameEn: 'Costa Rica',      eu: false, schengen: false },
      { code: 'PA', name: 'Panamá',            nameEn: 'Panama',          eu: false, schengen: false },
      { code: 'CU', name: 'Cuba',              nameEn: 'Cuba',            eu: false, schengen: false },
      { code: 'JM', name: 'Jamaica',           nameEn: 'Jamaica',         eu: false, schengen: false },
      { code: 'HT', name: 'Haiti',             nameEn: 'Haiti',           eu: false, schengen: false },
      { code: 'DO', name: 'República Dominicana', nameEn: 'Dominican Republic', eu: false, schengen: false },
      { code: 'PR', name: 'Porto Rico',        nameEn: 'Puerto Rico',     eu: false, schengen: false },
      { code: 'TT', name: 'Trinidad e Tobago', nameEn: 'Trinidad and Tobago', eu: false, schengen: false },
    ],
  },
  {
    id: 'america_sul',
    label: 'América do Sul',
    emoji: '🌿',
    countries: [
      { code: 'BR', name: 'Brasil',            nameEn: 'Brazil',          eu: false, schengen: false },
      { code: 'AR', name: 'Argentina',         nameEn: 'Argentina',       eu: false, schengen: false },
      { code: 'CL', name: 'Chile',             nameEn: 'Chile',           eu: false, schengen: false },
      { code: 'CO', name: 'Colômbia',          nameEn: 'Colombia',        eu: false, schengen: false },
      { code: 'PE', name: 'Peru',              nameEn: 'Peru',            eu: false, schengen: false },
      { code: 'VE', name: 'Venezuela',         nameEn: 'Venezuela',       eu: false, schengen: false },
      { code: 'EC', name: 'Equador',           nameEn: 'Ecuador',         eu: false, schengen: false },
      { code: 'BO', name: 'Bolívia',           nameEn: 'Bolivia',         eu: false, schengen: false },
      { code: 'PY', name: 'Paraguai',          nameEn: 'Paraguay',        eu: false, schengen: false },
      { code: 'UY', name: 'Uruguai',           nameEn: 'Uruguay',         eu: false, schengen: false },
      { code: 'GY', name: 'Guiana',            nameEn: 'Guyana',          eu: false, schengen: false },
      { code: 'SR', name: 'Suriname',          nameEn: 'Suriname',        eu: false, schengen: false },
      { code: 'GF', name: 'Guiana Francesa',   nameEn: 'French Guiana',   eu: true,  schengen: false },
    ],
  },
  {
    id: 'africa_ocidental',
    label: 'África Ocidental',
    emoji: '🌍',
    countries: [
      { code: 'SN', name: 'Senegal',           nameEn: 'Senegal',         eu: false, schengen: false },
      { code: 'NG', name: 'Nigéria',           nameEn: 'Nigeria',         eu: false, schengen: false },
      { code: 'GH', name: 'Gana',              nameEn: 'Ghana',           eu: false, schengen: false },
      { code: 'CI', name: 'Costa do Marfim',   nameEn: 'Ivory Coast',     eu: false, schengen: false },
      { code: 'ML', name: 'Mali',              nameEn: 'Mali',            eu: false, schengen: false },
      { code: 'BF', name: 'Burkina Faso',      nameEn: 'Burkina Faso',    eu: false, schengen: false },
      { code: 'GN', name: 'Guiné',             nameEn: 'Guinea',          eu: false, schengen: false },
      { code: 'GW', name: 'Guiné-Bissau',      nameEn: 'Guinea-Bissau',   eu: false, schengen: false },
      { code: 'CV', name: 'Cabo Verde',        nameEn: 'Cape Verde',      eu: false, schengen: false },
      { code: 'GM', name: 'Gâmbia',            nameEn: 'Gambia',          eu: false, schengen: false },
      { code: 'SL', name: 'Serra Leoa',        nameEn: 'Sierra Leone',    eu: false, schengen: false },
      { code: 'LR', name: 'Libéria',           nameEn: 'Liberia',         eu: false, schengen: false },
      { code: 'TG', name: 'Togo',              nameEn: 'Togo',            eu: false, schengen: false },
      { code: 'BJ', name: 'Benim',             nameEn: 'Benin',           eu: false, schengen: false },
      { code: 'NE', name: 'Níger',             nameEn: 'Niger',           eu: false, schengen: false },
      { code: 'MR', name: 'Mauritânia',        nameEn: 'Mauritania',      eu: false, schengen: false },
    ],
  },
  {
    id: 'africa_oriental_austral',
    label: 'África Oriental e Austral',
    emoji: '🦁',
    countries: [
      { code: 'ZA', name: 'África do Sul',     nameEn: 'South Africa',    eu: false, schengen: false },
      { code: 'KE', name: 'Quénia',            nameEn: 'Kenya',           eu: false, schengen: false },
      { code: 'TZ', name: 'Tanzânia',          nameEn: 'Tanzania',        eu: false, schengen: false },
      { code: 'UG', name: 'Uganda',            nameEn: 'Uganda',          eu: false, schengen: false },
      { code: 'ET', name: 'Etiópia',           nameEn: 'Ethiopia',        eu: false, schengen: false },
      { code: 'RW', name: 'Ruanda',            nameEn: 'Rwanda',          eu: false, schengen: false },
      { code: 'MZ', name: 'Moçambique',        nameEn: 'Mozambique',      eu: false, schengen: false },
      { code: 'AO', name: 'Angola',            nameEn: 'Angola',          eu: false, schengen: false },
      { code: 'ZW', name: 'Zimbabué',          nameEn: 'Zimbabwe',        eu: false, schengen: false },
      { code: 'ZM', name: 'Zâmbia',            nameEn: 'Zambia',          eu: false, schengen: false },
      { code: 'MW', name: 'Maláui',            nameEn: 'Malawi',          eu: false, schengen: false },
      { code: 'MG', name: 'Madagáscar',        nameEn: 'Madagascar',      eu: false, schengen: false },
      { code: 'NA', name: 'Namíbia',           nameEn: 'Namibia',         eu: false, schengen: false },
      { code: 'BW', name: 'Botsuana',          nameEn: 'Botswana',        eu: false, schengen: false },
      { code: 'LS', name: 'Lesoto',            nameEn: 'Lesotho',         eu: false, schengen: false },
      { code: 'SZ', name: 'Suazilândia',       nameEn: 'Eswatini',        eu: false, schengen: false },
      { code: 'DJ', name: 'Djibouti',          nameEn: 'Djibouti',        eu: false, schengen: false },
      { code: 'SO', name: 'Somália',           nameEn: 'Somalia',         eu: false, schengen: false },
      { code: 'SD', name: 'Sudão',             nameEn: 'Sudan',           eu: false, schengen: false },
      { code: 'SS', name: 'Sudão do Sul',      nameEn: 'South Sudan',     eu: false, schengen: false },
    ],
  },
  {
    id: 'africa_norte',
    label: 'África do Norte',
    emoji: '🏜️',
    countries: [
      { code: 'MA', name: 'Marrocos',          nameEn: 'Morocco',         eu: false, schengen: false },
      { code: 'DZ', name: 'Argélia',           nameEn: 'Algeria',         eu: false, schengen: false },
      { code: 'TN', name: 'Tunísia',           nameEn: 'Tunisia',         eu: false, schengen: false },
      { code: 'LY', name: 'Líbia',             nameEn: 'Libya',           eu: false, schengen: false },
      { code: 'EG', name: 'Egito',             nameEn: 'Egypt',           eu: false, schengen: false },
    ],
  },
  {
    id: 'medio_oriente',
    label: 'Médio Oriente',
    emoji: '🌙',
    countries: [
      { code: 'TR', name: 'Turquia',           nameEn: 'Turkey',          eu: false, schengen: false },
      { code: 'LB', name: 'Líbano',            nameEn: 'Lebanon',         eu: false, schengen: false },
      { code: 'PS', name: 'Palestina',         nameEn: 'Palestine',       eu: false, schengen: false },
      { code: 'IL', name: 'Israel',            nameEn: 'Israel',          eu: false, schengen: false },
      { code: 'JO', name: 'Jordânia',          nameEn: 'Jordan',          eu: false, schengen: false },
      { code: 'IQ', name: 'Iraque',            nameEn: 'Iraq',            eu: false, schengen: false },
      { code: 'IR', name: 'Irão',              nameEn: 'Iran',            eu: false, schengen: false },
      { code: 'SY', name: 'Síria',             nameEn: 'Syria',           eu: false, schengen: false },
      { code: 'SA', name: 'Arábia Saudita',    nameEn: 'Saudi Arabia',    eu: false, schengen: false },
      { code: 'AE', name: 'Emirados Árabes',   nameEn: 'UAE',             eu: false, schengen: false },
      { code: 'QA', name: 'Qatar',             nameEn: 'Qatar',           eu: false, schengen: false },
      { code: 'KW', name: 'Kuwait',            nameEn: 'Kuwait',          eu: false, schengen: false },
      { code: 'YE', name: 'Iémen',             nameEn: 'Yemen',           eu: false, schengen: false },
      { code: 'OM', name: 'Omã',               nameEn: 'Oman',            eu: false, schengen: false },
    ],
  },
  {
    id: 'asia_oriental',
    label: 'Ásia Oriental',
    emoji: '🏯',
    countries: [
      { code: 'CN', name: 'China',             nameEn: 'China',           eu: false, schengen: false },
      { code: 'JP', name: 'Japão',             nameEn: 'Japan',           eu: false, schengen: false },
      { code: 'KR', name: 'Coreia do Sul',     nameEn: 'South Korea',     eu: false, schengen: false },
      { code: 'KP', name: 'Coreia do Norte',   nameEn: 'North Korea',     eu: false, schengen: false },
      { code: 'TW', name: 'Taiwan',            nameEn: 'Taiwan',          eu: false, schengen: false },
      { code: 'HK', name: 'Hong Kong',         nameEn: 'Hong Kong',       eu: false, schengen: false },
      { code: 'MN', name: 'Mongólia',          nameEn: 'Mongolia',        eu: false, schengen: false },
    ],
  },
  {
    id: 'asia_meridional',
    label: 'Ásia Meridional',
    emoji: '🪷',
    countries: [
      { code: 'IN', name: 'Índia',             nameEn: 'India',           eu: false, schengen: false },
      { code: 'PK', name: 'Paquistão',         nameEn: 'Pakistan',        eu: false, schengen: false },
      { code: 'BD', name: 'Bangladesh',        nameEn: 'Bangladesh',      eu: false, schengen: false },
      { code: 'LK', name: 'Sri Lanka',         nameEn: 'Sri Lanka',       eu: false, schengen: false },
      { code: 'NP', name: 'Nepal',             nameEn: 'Nepal',           eu: false, schengen: false },
      { code: 'BT', name: 'Butão',             nameEn: 'Bhutan',          eu: false, schengen: false },
      { code: 'MV', name: 'Maldivas',          nameEn: 'Maldives',        eu: false, schengen: false },
      { code: 'AF', name: 'Afeganistão',       nameEn: 'Afghanistan',     eu: false, schengen: false },
    ],
  },
  {
    id: 'asia_sudeste',
    label: 'Ásia do Sudeste',
    emoji: '🌺',
    countries: [
      { code: 'SG', name: 'Singapura',         nameEn: 'Singapore',       eu: false, schengen: false },
      { code: 'TH', name: 'Tailândia',         nameEn: 'Thailand',        eu: false, schengen: false },
      { code: 'ID', name: 'Indonésia',         nameEn: 'Indonesia',       eu: false, schengen: false },
      { code: 'MY', name: 'Malásia',           nameEn: 'Malaysia',        eu: false, schengen: false },
      { code: 'PH', name: 'Filipinas',         nameEn: 'Philippines',     eu: false, schengen: false },
      { code: 'VN', name: 'Vietname',          nameEn: 'Vietnam',         eu: false, schengen: false },
      { code: 'MM', name: 'Mianmar',           nameEn: 'Myanmar',         eu: false, schengen: false },
      { code: 'KH', name: 'Camboja',           nameEn: 'Cambodia',        eu: false, schengen: false },
      { code: 'LA', name: 'Laos',              nameEn: 'Laos',            eu: false, schengen: false },
      { code: 'TL', name: 'Timor-Leste',       nameEn: 'Timor-Leste',     eu: false, schengen: false },
      { code: 'BN', name: 'Brunei',            nameEn: 'Brunei',          eu: false, schengen: false },
    ],
  },
  {
    id: 'oceania',
    label: 'Oceânia',
    emoji: '🌊',
    countries: [
      { code: 'AU', name: 'Austrália',         nameEn: 'Australia',       eu: false, schengen: false },
      { code: 'NZ', name: 'Nova Zelândia',     nameEn: 'New Zealand',     eu: false, schengen: false },
      { code: 'PG', name: 'Papua Nova Guiné',  nameEn: 'Papua New Guinea',eu: false, schengen: false },
      { code: 'FJ', name: 'Fiji',              nameEn: 'Fiji',            eu: false, schengen: false },
      { code: 'WS', name: 'Samoa',             nameEn: 'Samoa',           eu: false, schengen: false },
      { code: 'TO', name: 'Tonga',             nameEn: 'Tonga',           eu: false, schengen: false },
    ],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Todos os países numa lista plana
export const ALL_COUNTRIES: Country[] = GEO_REGIONS.flatMap((r) => r.countries)

// Encontrar a região de um país
export function getRegionForCountry(code: string): GeoRegion | undefined {
  return GEO_REGIONS.find((r) => r.countries.some((c) => c.code === code))
}

// Encontrar um país pelo código
export function getCountry(code: string): Country | undefined {
  return ALL_COUNTRIES.find((c) => c.code === code)
}

// Nomes dos países seleccionados (para display)
export function countryNames(codes: string[]): string {
  return codes
    .map((code) => getCountry(code)?.name ?? code)
    .join(', ')
}