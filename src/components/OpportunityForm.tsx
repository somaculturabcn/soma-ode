// src/components/OpportunityForm.tsx
// SOMA ODÉ — Formulário completo de oportunidade + ligação com contacto

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Opportunity, OpportunityType, RequirementKey } from '../types/opportunity'
import { addManualOpportunity } from '../data/manualOpportunitiesStore'
import { contactsSOMA } from '../data/contactsSOMA'
import { getManualContacts, type Contact } from '../data/manualContactsStore'

interface Props {
  onClose: () => void
}

type ContactOption = Contact & {
  sourceLabel: 'MIL' | 'Manual'
}

const TYPE_OPTIONS: { value: OpportunityType; label: string }[] = [
  { value: 'open_call', label: 'Edital' },
  { value: 'festival', label: 'Festival' },
  { value: 'residency', label: 'Residência' },
  { value: 'showcase', label: 'Showcase' },
  { value: 'commission', label: 'Comissão' },
  { value: 'grant', label: 'Financiamento' },
  { value: 'venue', label: 'Venue / sala' },
  { value: 'party', label: 'Festa / ciclo' },
  { value: 'network', label: 'Rede / mercado' },
  { value: 'other', label: 'Outro' },
]

const REQUIREMENT_OPTIONS: { value: RequirementKey; label: string }[] = [
  { value: 'bio', label: 'Bio' },
  { value: 'pressPhoto', label: 'Foto de imprensa' },
  { value: 'videoPresentation', label: 'Vídeo' },
  { value: 'technicalRider', label: 'Rider técnico' },
  { value: 'pressKit', label: 'Press kit' },
  { value: 'pressClippings', label: 'Clipping / imprensa' },
  { value: 'motivationLetter', label: 'Carta de motivação' },
  { value: 'projectDescription', label: 'Descrição do projeto' },
]

export default function OpportunityForm({ onClose }: Props) {
  const contacts = useMemo<ContactOption[]>(() => {
    const mil: ContactOption[] = contactsSOMA.map((c: any) => ({
      id: c.id,
      name: c.name || '',
      organization: c.organization || '',
      role: c.role || '',
      email: c.email || '',
      phone: c.phone || '',
      country: c.country || '',
      city: c.city || '',
      website: c.website || '',
      instagram: c.instagram || '',
      linkedin: c.linkedin || '',
      tiktok: c.tiktok || '',
      disciplines: c.disciplines || [],
      notes: c.notes || '',
      source: 'MIL',
      sourceLabel: 'MIL',
    }))

    const manual: ContactOption[] = getManualContacts().map((c) => ({
      ...c,
      sourceLabel: 'Manual',
    }))

    return [...manual, ...mil].sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  const [form, setForm] = useState<Partial<Opportunity>>({
    title: '',
    organization: '',
    country: '',
    countryName: '',
    city: '',
    url: '',
    type: 'open_call',
    status: 'open',
    disciplines: [],
    languages: [],
    requiredLanguages: [],
    requirements: [],
    coversCosts: false,
    coverage: {},
    feeOffered: undefined,
    feeCurrency: 'EUR',
    peopleSupported: undefined,
    deadline: '',
    openingDate: '',
    materialDeadline: '',
    contactEmail: '',
    notes: '',
    description: '',
    source: 'manual',
  })

  function update(field: keyof Opportunity, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function splitList(value: string): string[] {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  }

  function toggleRequirement(req: RequirementKey) {
    const current = form.requirements || []
    const next = current.includes(req)
      ? current.filter((r) => r !== req)
      : [...current, req]

    update('requirements', next)
  }

  function toggleCoverage(field: keyof NonNullable<Opportunity['coverage']>, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      coverage: {
        ...(prev.coverage || {}),
        [field]: checked,
      },
    }))
  }

  function handleContactSelect(contactId: string) {
    if (!contactId) {
      setForm((prev) => ({
        ...prev,
        contactId: '',
        contactName: '',
      }))
      return
    }

    const contact = contacts.find((c) => c.id === contactId)
    if (!contact) return

    setForm((prev) => ({
      ...prev,
      contactId: contact.id,
      contactName: contact.name,
      contactOrganization: contact.organization || '',
      contactRole: contact.role || '',
      contactEmail: contact.email || prev.contactEmail || '',
      contactPhone: contact.phone || '',
      contactWebsite: contact.website || '',
      contactInstagram: contact.instagram || '',
      contactLinkedin: contact.linkedin || '',
      contactTiktok: contact.tiktok || '',
      organization: prev.organization || contact.organization || '',
      city: prev.city || contact.city || '',
      country: prev.country || contact.country || '',
      countryName: prev.countryName || contact.country || '',
      url: prev.url || contact.website || '',
    }))
  }

  function handleSave() {
    if (!form.title?.trim()) return alert('Título obrigatório')
    if (!form.country?.trim()) return alert('País obrigatório')
    if (!form.deadline?.trim() && form.status !== 'rolling') {
      return alert('Coloca uma deadline ou marca como sempre aberto')
    }

    const newOpp: Opportunity = {
      id: 'manual-' + Date.now(),
      title: form.title || '',
      organization: form.organization || '',
      url: form.url || '',
      type: (form.type || 'open_call') as OpportunityType,
      status: form.status || 'open',

      country: (form.country || '').toUpperCase(),
      countryName: form.countryName || form.country || '',
      city: form.city || '',

      disciplines: form.disciplines || [],
      languages: form.languages || [],
      requiredLanguages: form.requiredLanguages || [],

      coversCosts: Boolean(form.coversCosts),
      coverage: form.coverage || {},
      feeOffered: form.feeOffered ? Number(form.feeOffered) : undefined,
      feeCurrency: form.feeCurrency || 'EUR',
      peopleSupported: form.peopleSupported ? Number(form.peopleSupported) : undefined,

      requirements: form.requirements || [],

      deadline: form.deadline || '',
      openingDate: form.openingDate || '',
      materialDeadline: form.materialDeadline || '',

      contactEmail: form.contactEmail || '',
      contactId: form.contactId || '',
      contactName: form.contactName || '',
      contactOrganization: form.contactOrganization || '',
      contactRole: form.contactRole || '',
      contactPhone: form.contactPhone || '',
      contactWebsite: form.contactWebsite || '',
      contactInstagram: form.contactInstagram || '',
      contactLinkedin: form.contactLinkedin || '',
      contactTiktok: form.contactTiktok || '',

      description: form.description || '',
      notes: form.notes || '',
      source: 'manual',
    }

    addManualOpportunity(newOpp)
    onClose()
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.formBox}>
        <h2 style={styles.formTitle}>Nova oportunidade</h2>

        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>01 · Identificação</h3>

          <div style={styles.grid}>
            <input
              placeholder="Título *"
              style={styles.input}
              value={form.title || ''}
              onChange={(e) => update('title', e.target.value)}
            />

            <input
              placeholder="Organização"
              style={styles.input}
              value={form.organization || ''}
              onChange={(e) => update('organization', e.target.value)}
            />

            <input
              placeholder="País ISO: ES, PT, BR..."
              style={styles.input}
              value={form.country || ''}
              onChange={(e) => {
                update('country', e.target.value.toUpperCase())
                update('countryName', e.target.value.toUpperCase())
              }}
            />

            <input
              placeholder="Cidade"
              style={styles.input}
              value={form.city || ''}
              onChange={(e) => update('city', e.target.value)}
            />

            <input
              placeholder="Website / link do edital"
              style={styles.inputWide}
              value={form.url || ''}
              onChange={(e) => update('url', e.target.value)}
            />

            <select
              style={styles.select}
              value={form.type}
              onChange={(e) => update('type', e.target.value)}
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <select
              style={styles.select}
              value={form.status || 'open'}
              onChange={(e) => update('status', e.target.value)}
            >
              <option value="open">Aberto</option>
              <option value="rolling">Sempre aberto</option>
              <option value="closed">Fechado</option>
              <option value="archived">Arquivado</option>
            </select>
          </div>
        </section>

        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>02 · Datas</h3>

          <div style={styles.grid}>
            <label style={styles.label}>
              Abertura
              <input
                type="date"
                style={styles.input}
                value={form.openingDate || ''}
                onChange={(e) => update('openingDate', e.target.value)}
              />
            </label>

            <label style={styles.label}>
              Deadline candidatura *
              <input
                type="date"
                style={styles.input}
                value={form.deadline || ''}
                onChange={(e) => update('deadline', e.target.value)}
              />
            </label>

            <label style={styles.label}>
              Deadline envio de material
              <input
                type="date"
                style={styles.input}
                value={form.materialDeadline || ''}
                onChange={(e) => update('materialDeadline', e.target.value)}
              />
            </label>
          </div>
        </section>

        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>03 · Área artística e candidatura</h3>

          <div style={styles.grid}>
            <input
              placeholder="Disciplinas: musica, cinema, teatro, danca, performance..."
              style={styles.inputWide}
              onChange={(e) => update('disciplines', splitList(e.target.value))}
            />

            <input
              placeholder="Idiomas aceites: pt, es, en, fr..."
              style={styles.input}
              onChange={(e) => update('languages', splitList(e.target.value))}
            />

            <input
              placeholder="Idiomas obrigatórios para materiais: en, es..."
              style={styles.input}
              onChange={(e) => update('requiredLanguages', splitList(e.target.value))}
            />

            <textarea
              placeholder="Descrição curta: o que é, para quem serve, que tipo de artista procura..."
              style={styles.textareaWide}
              value={form.description || ''}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>
        </section>

        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>04 · Custos, cachê e equipa</h3>

          <div style={styles.grid}>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={Boolean(form.coversCosts)}
                onChange={(e) => update('coversCosts', e.target.checked)}
              />
              Cobre custos
            </label>

            <input
              type="number"
              placeholder="Cachê oferecido"
              style={styles.input}
              onChange={(e) => update('feeOffered', e.target.value ? Number(e.target.value) : undefined)}
            />

            <input
              placeholder="Moeda: EUR, BRL, USD..."
              style={styles.input}
              value={form.feeCurrency || 'EUR'}
              onChange={(e) => update('feeCurrency', e.target.value.toUpperCase())}
            />

            <input
              type="number"
              placeholder="Pessoas suportadas"
              style={styles.input}
              onChange={(e) =>
                update('peopleSupported', e.target.value ? Number(e.target.value) : undefined)
              }
            />
          </div>

          <div style={styles.coverageRow}>
            {[
              ['travel', 'Viagem'],
              ['accommodation', 'Hospedagem'],
              ['meals', 'Alimentação'],
              ['production', 'Produção'],
              ['fee', 'Cachê'],
            ].map(([key, label]) => (
              <label key={key} style={styles.smallCheck}>
                <input
                  type="checkbox"
                  onChange={(e) => toggleCoverage(key as any, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>05 · Documentos solicitados</h3>

          <div style={styles.requirements}>
            {REQUIREMENT_OPTIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                style={{
                  ...styles.reqBtn,
                  ...(form.requirements?.includes(r.value) ? styles.reqBtnActive : {}),
                }}
                onClick={() => toggleRequirement(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>06 · Contacto ligado</h3>

          <select
            style={styles.inputWide}
            value={form.contactId || ''}
            onChange={(e) => handleContactSelect(e.target.value)}
          >
            <option value="">— Sem contacto ligado —</option>
            {contacts.map((c) => (
              <option key={`${c.sourceLabel}-${c.id}`} value={c.id}>
                {c.name}
                {c.organization ? ` · ${c.organization}` : ''}
                {c.role ? ` · ${c.role}` : ''}
                {` · ${c.sourceLabel}`}
              </option>
            ))}
          </select>

          <div style={styles.grid}>
            <input
              placeholder="Nome contacto"
              style={styles.input}
              value={form.contactName || ''}
              onChange={(e) => update('contactName', e.target.value)}
            />

            <input
              placeholder="Email contacto"
              style={styles.input}
              value={form.contactEmail || ''}
              onChange={(e) => update('contactEmail', e.target.value)}
            />

            <input
              placeholder="Telefone"
              style={styles.input}
              value={form.contactPhone || ''}
              onChange={(e) => update('contactPhone', e.target.value)}
            />

            <input
              placeholder="Cargo / função"
              style={styles.input}
              value={form.contactRole || ''}
              onChange={(e) => update('contactRole', e.target.value)}
            />

            <input
              placeholder="Instagram"
              style={styles.input}
              value={form.contactInstagram || ''}
              onChange={(e) => update('contactInstagram', e.target.value)}
            />

            <input
              placeholder="LinkedIn"
              style={styles.input}
              value={form.contactLinkedin || ''}
              onChange={(e) => update('contactLinkedin', e.target.value)}
            />
          </div>
        </section>

        <section style={styles.section}>
          <h3 style={styles.sectionTitle}>07 · Notas internas</h3>

          <textarea
            placeholder="Notas / requisitos / documentos / contexto / histórico / estratégia..."
            style={styles.textareaWide}
            value={form.notes || ''}
            onChange={(e) => update('notes', e.target.value)}
          />
        </section>

        <div style={styles.actions}>
          <button style={styles.cancel} onClick={onClose}>
            Cancelar
          </button>
          <button style={styles.save} onClick={handleSave}>
            Guardar oportunidade
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.86)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: 24,
    overflowY: 'auto',
  },

  formBox: {
    background: '#050505',
    border: '1px solid #1A6994',
    borderRadius: 16,
    padding: 28,
    width: 'min(960px, 94vw)',
    maxHeight: '92vh',
    overflowY: 'auto',
    color: '#fff',
    boxShadow: '0 0 40px rgba(26,105,148,0.35)',
  },

  formTitle: {
    margin: '0 0 24px',
    fontSize: 26,
    fontWeight: 900,
    color: '#fff',
    textAlign: 'center',
  },

  section: {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    paddingTop: 16,
    marginTop: 16,
  },

  sectionTitle: {
    margin: '0 0 12px',
    fontSize: 13,
    color: '#60b4e8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 10,
  },

  input: {
    background: '#101010',
    border: '1px solid #1A6994',
    color: '#fff',
    padding: '11px 12px',
    borderRadius: 8,
    outline: 'none',
    fontSize: 14,
  },

  inputWide: {
    gridColumn: '1 / -1',
    background: '#101010',
    border: '1px solid #1A6994',
    color: '#fff',
    padding: '11px 12px',
    borderRadius: 8,
    outline: 'none',
    fontSize: 14,
  },

  select: {
    background: '#101010',
    border: '1px solid #1A6994',
    color: '#fff',
    padding: '11px 12px',
    borderRadius: 8,
    outline: 'none',
    fontSize: 14,
  },

  textareaWide: {
    gridColumn: '1 / -1',
    background: '#101010',
    border: '1px solid #1A6994',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    minHeight: 100,
    outline: 'none',
    fontSize: 14,
  },

  checkbox: {
    fontSize: 14,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    color: '#fff',
  },

  smallCheck: {
    fontSize: 12,
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    color: '#ddd',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '6px 10px',
    borderRadius: 999,
  },

  coverageRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },

  requirements: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },

  reqBtn: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#bbb',
    borderRadius: 999,
    padding: '7px 12px',
    cursor: 'pointer',
    fontSize: 12,
  },

  reqBtnActive: {
    background: 'rgba(26,105,148,0.35)',
    border: '1px solid #1A6994',
    color: '#fff',
  },

  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    color: '#aaa',
    fontSize: 12,
  },

  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 24,
  },

  cancel: {
    background: 'transparent',
    border: '1px solid #444',
    color: '#aaa',
    padding: '10px 16px',
    borderRadius: 8,
    cursor: 'pointer',
  },

  save: {
    background: '#1A6994',
    color: '#fff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: 8,
    fontWeight: 800,
    cursor: 'pointer',
  },
}