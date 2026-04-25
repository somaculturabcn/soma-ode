// src/components/CountryPicker.tsx
// SOMA ODÉ — Selector de países com pesquisa e grupos por região
// 180+ países · regiões colapsáveis · selecção múltipla · badge UE · seleccionar todos

import { useState, useMemo } from 'react'
import { GEO_REGIONS, ALL_COUNTRIES, getCountry } from '../data/geoData'

type Props = {
  selected: string[]
  onChange: (codes: string[]) => void
  label?: string
}

export default function CountryPicker({ selected, onChange, label }: Props) {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const ALL_CODES = useMemo(() => ALL_COUNTRIES.map(c => c.code), [])
  const allSelected = ALL_CODES.length > 0 && ALL_CODES.every(c => selected.includes(c))

  const toggle = (code: string) => {
    onChange(selected.includes(code)
      ? selected.filter(c => c !== code)
      : [...selected, code]
    )
  }

  const toggleRegionAll = (codes: string[], e: React.MouseEvent) => {
    e.stopPropagation()
    const allSel = codes.every(c => selected.includes(c))
    onChange(allSel
      ? selected.filter(c => !codes.includes(c))
      : [...selected, ...codes.filter(c => !selected.includes(c))]
    )
  }

  const selectAllGlobal = () => {
    onChange(allSelected ? [] : [...ALL_CODES])
  }

  const filteredRegions = useMemo(() => {
    if (!search.trim()) return GEO_REGIONS
    const q = search.toLowerCase()
    return GEO_REGIONS
      .map(r => ({
        ...r,
        countries: r.countries.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.nameEn.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q)
        ),
      }))
      .filter(r => r.countries.length > 0)
  }, [search])

  const btnBase: React.CSSProperties = {
    padding: '5px 12px', borderRadius: 5, fontSize: 12,
    cursor: 'pointer', border: '0.5px solid', fontWeight: 600,
  }

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{label}</div>
      )}

      {/* Botões globais */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' as const }}>
        <button
          onClick={selectAllGlobal}
          style={{
            ...btnBase,
            background: allSelected ? 'rgba(26,105,148,0.25)' : 'rgba(26,105,148,0.08)',
            borderColor: allSelected ? '#1A6994' : 'rgba(26,105,148,0.3)',
            color: allSelected ? '#60b4e8' : 'rgba(255,255,255,0.5)',
          }}
        >
          {allSelected ? '✓ Todos os países seleccionados' : '+ Seleccionar todos os países (180+)'}
        </button>

        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            style={{
              ...btnBase,
              background: 'transparent',
              borderColor: 'rgba(220,60,60,0.3)',
              color: 'rgba(220,80,80,0.7)',
              fontWeight: 400,
            }}
          >
            × Limpar tudo ({selected.length})
          </button>
        )}
      </div>

      {/* Tags dos países seleccionados (só se não estiver tudo seleccionado) */}
      {selected.length > 0 && !allSelected && (
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5, marginBottom: 10 }}>
          {selected.map(code => {
            const c = getCountry(code)
            return (
              <span key={code} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 20, fontSize: 11,
                background: 'rgba(26,105,148,0.2)',
                border: '0.5px solid rgba(26,105,148,0.4)',
                color: '#60b4e8',
              }}>
                {c?.eu && <span style={{ fontSize: 10 }}>🇪🇺</span>}
                {c?.name ?? code}
                <span
                  style={{ cursor: 'pointer', opacity: 0.5, fontSize: 13, lineHeight: 1 }}
                  onClick={() => toggle(code)}
                >×</span>
              </span>
            )
          })}
        </div>
      )}

      {/* Campo de pesquisa */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Pesquisar país (PT, EN ou código ISO: ES, BR, FR…)"
        style={{
          width: '100%', padding: '9px 12px', marginBottom: 10,
          background: '#0a0a0a', color: '#fff',
          border: '0.5px solid rgba(255,255,255,0.12)',
          borderRadius: 6, fontSize: 13, outline: 'none',
          boxSizing: 'border-box' as const,
        }}
      />

      {/* Lista por região */}
      <div style={{ maxHeight: 340, overflowY: 'auto' as const, paddingRight: 2 }}>
        {filteredRegions.map(region => {
          const codes = region.countries.map(c => c.code)
          const nSel = codes.filter(c => selected.includes(c)).length
          const isOpen = search.trim() ? true : !collapsed[region.id]

          return (
            <div key={region.id} style={{ marginBottom: 4 }}>
              <div
                onClick={() => setCollapsed(p => ({ ...p, [region.id]: !p[region.id] }))}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 12px', borderRadius: 6, cursor: 'pointer',
                  background: nSel > 0 ? 'rgba(26,105,148,0.12)' : 'rgba(255,255,255,0.03)',
                  border: `0.5px solid ${nSel > 0 ? 'rgba(26,105,148,0.3)' : 'rgba(255,255,255,0.07)'}`,
                  marginBottom: isOpen ? 4 : 0,
                  userSelect: 'none' as const,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: nSel > 0 ? '#60b4e8' : 'rgba(255,255,255,0.5)' }}>
                  {region.emoji} {region.label}
                  {nSel > 0 && (
                    <span style={{ marginLeft: 7, fontWeight: 400, color: '#1A6994' }}>
                      · {nSel}/{codes.length}
                    </span>
                  )}
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={e => toggleRegionAll(codes, e)}
                    style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                      background: 'transparent', border: '0.5px solid rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {codes.every(c => selected.includes(c)) ? '− todos' : '+ todos'}
                  </button>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
                    {isOpen ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {isOpen && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 3, paddingBottom: 6,
                }}>
                  {region.countries.map(country => {
                    const sel = selected.includes(country.code)
                    return (
                      <button
                        key={country.code}
                        onClick={() => toggle(country.code)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 8px', borderRadius: 5, fontSize: 12,
                          textAlign: 'left' as const, cursor: 'pointer',
                          background: sel ? 'rgba(26,105,148,0.2)' : 'transparent',
                          border: `0.5px solid ${sel ? 'rgba(26,105,148,0.5)' : 'rgba(255,255,255,0.07)'}`,
                          color: sel ? '#60b4e8' : 'rgba(255,255,255,0.45)',
                          transition: 'all 0.1s',
                        }}
                      >
                        {sel && <span style={{ color: '#1A6994', fontSize: 10 }}>✓</span>}
                        {country.eu && <span title="UE" style={{ fontSize: 10 }}>🇪🇺</span>}
                        <span>{country.name}</span>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' }}>{country.code}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selected.length > 0 && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
          {allSelected
            ? '🌍 Todos os países seleccionados'
            : `${selected.length} país${selected.length !== 1 ? 'es' : ''} seleccionado${selected.length !== 1 ? 's' : ''}`
          }
        </div>
      )}
    </div>
  )
}