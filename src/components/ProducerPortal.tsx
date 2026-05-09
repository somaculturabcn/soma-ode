// src/components/ProducerPortal.tsx
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import {
  loadOrganizationById,
  saveOrganization,
  type ProducerOrganization,
} from '../data/organizationsStore'

type Section = 'identity' | 'location' | 'profile' | 'finance' | 'materials' | 'cartografia'

const sections: { id: Section; label: string }[] = [
  { id: 'identity', label: '01 Identidade' },
  { id: 'location', label: '02 Localização' },
  { id: 'profile', label: '03 Perfil' },
  { id: 'finance', label: '04 Financeiro' },
  { id: 'materials', label: '05 Materiais' },
  { id: 'cartografia', label: '06 Cartografia' },
]

export default function ProducerPortal() {
  const { user } = useAuth()
  const [org, setOrg] = useState<ProducerOrganization | null>(null)
  const [section, setSection] = useState<Section>('identity')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      if (!user?.organizationId) return

      setLoading(true)
      const data = await loadOrganizationById(user.organizationId)

      setOrg(
        data || {
          id: user.organizationId,
          name: '',
          owner_id: user.id,
          plan: 'free',
          disciplines: [],
          target_countries: [],
          currency: 'EUR',
          cartografia: {},
        }
      )

      setLoading(false)
    }

    load()
  }, [user?.organizationId])

  function update<K extends keyof ProducerOrganization>(key: K, value: ProducerOrganization[K]) {
    if (!org) return
    setOrg({ ...org, [key]: value })
  }

  function updateCartografia(key: string, value: any) {
    if (!org) return
    setOrg({
      ...org,
      cartografia: {
        ...(org.cartografia || {}),
        [key]: value,
      },
    })
  }

  function updateList(key: keyof ProducerOrganization, value: string) {
    const arr = value
      .split(',')
      .map(v => v.trim())
      .filter(Boolean)

    update(key as any, arr as any)
  }

  async function handleSave() {
    if (!org) return

    setSaving(true)
    setMessage('')

    try {
      await saveOrganization(org)
      setMessage('Perfil guardado com sucesso.')
    } catch (err) {
      console.error(err)
      setMessage('Erro ao guardar perfil.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={s.center}>A carregar perfil da produtora...</div>
  }

  if (!org) {
    return <div style={s.center}>Não foi possível carregar a organização.</div>
  }

  return (
    <div style={s.wrap}>
      <div style={s.hero}>
        <div>
          <p style={s.eyebrow}>Perfil da produtora</p>
          <h1 style={s.title}>{org.name || 'Minha produtora'}</h1>
          <p style={s.subtitle}>
            Este é o espaço da produtora: dados fiscais, território de atuação, materiais e Cartografia SOMA.
          </p>
        </div>

        <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'A guardar...' : '💾 Guardar'}
        </button>
      </div>

      {message && <div style={s.message}>{message}</div>}

      <div style={s.layout}>
        <aside style={s.sidebar}>
          {sections.map(item => (
            <button
              key={item.id}
              style={{
                ...s.sectionBtn,
                ...(section === item.id ? s.sectionBtnActive : {}),
              }}
              onClick={() => setSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </aside>

        <main style={s.card}>
          {section === 'identity' && (
            <>
              <h2 style={s.h2}>01 Identidade</h2>
              <Field label="Nome da produtora / organização" value={org.name || ''} onChange={v => update('name', v)} />
              <Field label="Nome legal" value={org.legal_name || ''} onChange={v => update('legal_name', v)} />
              <Field label="NIF / NIPC" value={org.nif || ''} onChange={v => update('nif', v)} />
              <Field label="Telefone / WhatsApp" value={org.phone || ''} onChange={v => update('phone', v)} />
              <Field label="Instagram" value={org.instagram || ''} onChange={v => update('instagram', v)} />
              <Field label="Website" value={org.website || ''} onChange={v => update('website', v)} />
            </>
          )}

          {section === 'location' && (
            <>
              <h2 style={s.h2}>02 Localização</h2>
              <Field label="Morada" value={org.address || ''} onChange={v => update('address', v)} />
              <Field label="Código postal" value={org.zip_code || ''} onChange={v => update('zip_code', v)} />
              <Field label="Cidade" value={org.city || ''} onChange={v => update('city', v)} />
              <Field label="País" value={org.country || ''} onChange={v => update('country', v)} />
            </>
          )}

          {section === 'profile' && (
            <>
              <h2 style={s.h2}>03 Perfil</h2>
              <TextArea label="Descrição da produtora" value={org.bio || ''} onChange={v => update('bio', v)} />
              <Field
                label="Disciplinas que trabalha"
                helper="Separar por vírgulas. Ex: performance, música, artes visuais, cinema"
                value={(org.disciplines || []).join(', ')}
                onChange={v => updateList('disciplines', v)}
              />
              <Field
                label="Países onde opera ou quer operar"
                helper="Separar por vírgulas. Ex: Espanha, Portugal, Brasil, França"
                value={(org.target_countries || []).join(', ')}
                onChange={v => updateList('target_countries', v)}
              />
            </>
          )}

          {section === 'finance' && (
            <>
              <h2 style={s.h2}>04 Financeiro</h2>
              <Field label="IBAN" value={org.iban || ''} onChange={v => update('iban', v)} />
              <Field label="Banco" value={org.bank_name || ''} onChange={v => update('bank_name', v)} />
              <Field label="Método de pagamento preferido" value={org.payment_method || ''} onChange={v => update('payment_method', v)} />
              <Field label="Moeda" value={org.currency || 'EUR'} onChange={v => update('currency', v)} />
            </>
          )}

          {section === 'materials' && (
            <>
              <h2 style={s.h2}>05 Materiais</h2>
              <Field label="Link portfolio" value={org.portfolio_link || ''} onChange={v => update('portfolio_link', v)} />
              <Field label="Link press kit / dossier" value={org.presskit_link || ''} onChange={v => update('presskit_link', v)} />
            </>
          )}

          {section === 'cartografia' && (
            <>
              <h2 style={s.h2}>06 Cartografia SOMA da produtora</h2>

              <TextArea
                label="🌱 RAIZ — De onde vem esta produtora?"
                helper="Valores, origem, missão, práticas culturais e políticas que sustentam o trabalho."
                value={org.cartografia?.raiz || ''}
                onChange={v => updateCartografia('raiz', v)}
              />

              <TextArea
                label="🎯 CAMPO — Com quem e para quem trabalha?"
                helper="Tipos de artistas, públicos, comunidades, territórios e contextos."
                value={org.cartografia?.campo || ''}
                onChange={v => updateCartografia('campo', v)}
              />

              <TextArea
                label="🕸️ TEIA — Que redes e legitimadores tem?"
                helper="Venues, festivais, curadores, parceiros, colectivos, instituições e alianças."
                value={org.cartografia?.teia || ''}
                onChange={v => updateCartografia('teia', v)}
              />

              <TextArea
                label="🧭 ROTA — Para onde quer ir?"
                helper="Objectivos a 12-24 meses, países prioritários, crescimento e necessidades."
                value={org.cartografia?.rota || ''}
                onChange={v => updateCartografia('rota', v)}
              />

              <Field
                label="Valores-chave"
                helper="Separar por vírgulas"
                value={(org.cartografia?.values || []).join(', ')}
                onChange={v => updateCartografia('values', toArray(v))}
              />

              <Field
                label="Perfis de artistas que acompanha"
                helper="Separar por vírgulas"
                value={(org.cartografia?.artistProfiles || []).join(', ')}
                onChange={v => updateCartografia('artistProfiles', toArray(v))}
              />

              <Field
                label="Territórios estratégicos"
                helper="Separar por vírgulas"
                value={(org.cartografia?.territories || []).join(', ')}
                onChange={v => updateCartografia('territories', toArray(v))}
              />

              <Field
                label="Parceiros / redes"
                helper="Separar por vírgulas"
                value={(org.cartografia?.partners || []).join(', ')}
                onChange={v => updateCartografia('partners', toArray(v))}
              />

              <Field
                label="Objectivos"
                helper="Separar por vírgulas"
                value={(org.cartografia?.goals || []).join(', ')}
                onChange={v => updateCartografia('goals', toArray(v))}
              />
            </>
          )}
        </main>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  helper,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  helper?: string
}) {
  return (
    <label style={s.field}>
      <span style={s.label}>{label}</span>
      {helper && <span style={s.helper}>{helper}</span>}
      <input style={s.input} value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
  helper,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  helper?: string
}) {
  return (
    <label style={s.field}>
      <span style={s.label}>{label}</span>
      {helper && <span style={s.helper}>{helper}</span>}
      <textarea style={s.textarea} value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

function toArray(value: string) {
  return value
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    padding: 28,
    maxWidth: 1180,
    margin: '0 auto',
  },
  center: {
    color: '#fff',
    padding: 40,
  },
  hero: {
    background: '#111',
    border: '1px solid #333',
    borderRadius: 18,
    padding: 24,
    marginBottom: 18,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 20,
    alignItems: 'flex-start',
  },
  eyebrow: {
    color: '#F2C94C',
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    fontSize: 12,
    margin: 0,
  },
  title: {
    fontSize: 32,
    margin: '8px 0',
  },
  subtitle: {
    color: '#aaa',
    margin: 0,
    maxWidth: 720,
  },
  saveBtn: {
    background: '#F2C94C',
    color: '#000',
    border: 0,
    borderRadius: 10,
    padding: '12px 18px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  message: {
    background: '#102b18',
    border: '1px solid #2c8a48',
    color: '#b7f5c8',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '240px 1fr',
    gap: 18,
  },
  sidebar: {
    background: '#111',
    border: '1px solid #333',
    borderRadius: 16,
    padding: 12,
    alignSelf: 'start',
  },
  sectionBtn: {
    width: '100%',
    textAlign: 'left',
    background: 'transparent',
    color: '#ddd',
    border: '1px solid transparent',
    borderRadius: 10,
    padding: '12px 14px',
    cursor: 'pointer',
    fontWeight: 700,
    marginBottom: 6,
  },
  sectionBtnActive: {
    background: '#1A6994',
    color: '#fff',
    borderColor: '#2d8bbe',
  },
  card: {
    background: '#111',
    border: '1px solid #333',
    borderRadius: 16,
    padding: 22,
  },
  h2: {
    marginTop: 0,
    marginBottom: 20,
  },
  field: {
    display: 'block',
    marginBottom: 18,
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 800,
    marginBottom: 6,
    color: '#fff',
  },
  helper: {
    display: 'block',
    fontSize: 12,
    color: '#999',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    background: '#000',
    border: '1px solid #444',
    borderRadius: 10,
    color: '#fff',
    padding: '12px 13px',
    fontSize: 14,
  },
  textarea: {
    width: '100%',
    minHeight: 120,
    boxSizing: 'border-box',
    background: '#000',
    border: '1px solid #444',
    borderRadius: 10,
    color: '#fff',
    padding: '12px 13px',
    fontSize: 14,
    resize: 'vertical',
  },
}