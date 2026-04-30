// src/components/CountryPicker.tsx
// SOMA ODÉ — CountryPicker à prova de undefined
import React, { useState, useMemo } from 'react'

interface CountryPickerProps {
  selectedCountries: string[]
  onChange: (countries: string[]) => void
}

const REGIONS: { label: string; countries: { code: string; name: string }[] }[] = [
  { label: 'Europa Ocidental', countries: [{ code: 'ES', name: 'Espanha' }, { code: 'PT', name: 'Portugal' }, { code: 'FR', name: 'França' }, { code: 'IT', name: 'Itália' }, { code: 'DE', name: 'Alemanha' }, { code: 'NL', name: 'Países Baixos' }, { code: 'BE', name: 'Bélgica' }, { code: 'CH', name: 'Suíça' }, { code: 'AT', name: 'Áustria' }, { code: 'IE', name: 'Irlanda' }, { code: 'GB', name: 'Reino Unido' }, { code: 'LU', name: 'Luxemburgo' }] },
  { label: 'Europa do Sul/Leste', countries: [{ code: 'GR', name: 'Grécia' }, { code: 'PL', name: 'Polónia' }, { code: 'CZ', name: 'Chéquia' }, { code: 'HU', name: 'Hungria' }, { code: 'RO', name: 'Roménia' }, { code: 'BG', name: 'Bulgária' }, { code: 'HR', name: 'Croácia' }, { code: 'SI', name: 'Eslovénia' }] },
  { label: 'Países Nórdicos', countries: [{ code: 'SE', name: 'Suécia' }, { code: 'NO', name: 'Noruega' }, { code: 'DK', name: 'Dinamarca' }, { code: 'FI', name: 'Finlândia' }, { code: 'IS', name: 'Islândia' }] },
  { label: 'América do Sul', countries: [{ code: 'BR', name: 'Brasil' }, { code: 'AR', name: 'Argentina' }, { code: 'CL', name: 'Chile' }, { code: 'UY', name: 'Uruguai' }, { code: 'CO', name: 'Colômbia' }, { code: 'PE', name: 'Peru' }, { code: 'EC', name: 'Equador' }, { code: 'BO', name: 'Bolívia' }, { code: 'PY', name: 'Paraguai' }, { code: 'VE', name: 'Venezuela' }] },
  { label: 'América do Norte', countries: [{ code: 'US', name: 'EUA' }, { code: 'CA', name: 'Canadá' }, { code: 'MX', name: 'México' }] },
  { label: 'África', countries: [{ code: 'AO', name: 'Angola' }, { code: 'MZ', name: 'Moçambique' }, { code: 'CV', name: 'Cabo Verde' }, { code: 'GW', name: 'Guiné-Bissau' }, { code: 'ST', name: 'São Tomé e Príncipe' }, { code: 'SN', name: 'Senegal' }, { code: 'NG', name: 'Nigéria' }, { code: 'GH', name: 'Gana' }, { code: 'ZA', name: 'África do Sul' }, { code: 'MA', name: 'Marrocos' }, { code: 'EG', name: 'Egito' }] },
  { label: 'Ásia', countries: [{ code: 'JP', name: 'Japão' }, { code: 'KR', name: 'Coreia do Sul' }, { code: 'CN', name: 'China' }, { code: 'IN', name: 'Índia' }, { code: 'TH', name: 'Tailândia' }, { code: 'ID', name: 'Indonésia' }, { code: 'SG', name: 'Singapura' }, { code: 'AE', name: 'Emirados' }] },
  { label: 'Oceânia', countries: [{ code: 'AU', name: 'Austrália' }, { code: 'NZ', name: 'Nova Zelândia' }] },
]

const CountryPicker: React.FC<CountryPickerProps> = ({ selectedCountries = [], onChange }) => {
  const [search, setSearch] = useState('')

  // Garantir que selectedCountries é sempre um array
  const safeSelection = Array.isArray(selectedCountries) ? selectedCountries : []

  function toggle(code: string) {
    if (safeSelection.includes(code)) {
      onChange(safeSelection.filter(c => c !== code))
    } else {
      onChange([...safeSelection, code])
    }
  }

  function selectAll() {
    const all = REGIONS.flatMap(r => r.countries.map(c => c.code))
    if (safeSelection.length === all.length) {
      onChange([])
    } else {
      onChange(all)
    }
  }

  function selectRegion(codes: string[]) {
    const allSelected = codes.every(c => safeSelection.includes(c))
    if (allSelected) {
      onChange(safeSelection.filter(c => !codes.includes(c)))
    } else {
      onChange([...new Set([...safeSelection, ...codes])])
    }
  }

  const filtered = search
    ? REGIONS.flatMap(r => r.countries).filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : null

  return (
    <div style={styles.container}>
      <input
        type="text"
        placeholder="🔍 Pesquisar país..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={styles.search}
      />

      <div style={styles.toolbar}>
        <button style={styles.btn} onClick={selectAll}>
          {safeSelection.length > 50 ? '✕ Limpar todos' : '🌍 Seleccionar todos'}
        </button>
        <button style={styles.btnDanger} onClick={() => onChange([])}>
          ✕ Limpar
        </button>
        <span style={styles.counter}>{safeSelection.length} países</span>
      </div>

      {filtered ? (
        <div style={styles.grid}>
          {filtered.map(c => (
            <button
              key={c.code}
              onClick={() => toggle(c.code)}
              style={{
                ...styles.country,
                ...(safeSelection.includes(c.code) ? styles.countryActive : {}),
              }}
            >
              {c.code} · {c.name}
            </button>
          ))}
        </div>
      ) : (
        REGIONS.map(region => {
          const codes = region.countries.map(c => c.code)
          const allSelected = codes.every(c => safeSelection.includes(c))
          return (
            <div key={region.label} style={styles.region}>
              <div style={styles.regionHeader}>
                <span style={styles.regionTitle}>{region.label}</span>
                <button style={styles.regionBtn} onClick={() => selectRegion(codes)}>
                  {allSelected ? '− todos' : '+ todos'}
                </button>
              </div>
              <div style={styles.grid}>
                {region.countries.map(c => (
                  <button
                    key={c.code}
                    onClick={() => toggle(c.code)}
                    style={{
                      ...styles.country,
                      ...(safeSelection.includes(c.code) ? styles.countryActive : {}),
                    }}
                  >
                    {c.code} · {c.name}
                  </button>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { background: '#0a0a0a', borderRadius: '10px', padding: '16px', color: '#fff' },
  search: { width: '100%', padding: '10px 12px', background: '#111', color: '#fff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '8px', fontSize: '13px', marginBottom: '12px', boxSizing: 'border-box', outline: 'none' },
  toolbar: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' },
  btn: { padding: '8px 14px', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  btnDanger: { padding: '8px 14px', background: 'rgba(255,70,70,0.12)', color: '#ff8a8a', border: '1px solid rgba(255,70,70,0.25)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' },
  counter: { color: 'rgba(255,255,255,0.55)', fontSize: '12px' },
  region: { marginBottom: '14px' },
  regionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  regionTitle: { fontSize: '14px', fontWeight: '600', color: '#1A6994' },
  regionBtn: { padding: '4px 10px', background: 'transparent', color: '#60b4e8', border: 'none', fontSize: '11px', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px' },
  country: { padding: '6px 10px', background: 'transparent', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', textAlign: 'left' },
  countryActive: { background: 'rgba(26,105,148,0.3)', color: '#fff', border: '1px solid #1A6994' },
}

export default CountryPicker