// src/components/match/MatchModals.tsx
// SOMA ODÉ — Modais do módulo de Oportunidades
// AssignArtistModal · ShareProducerModal · OpportunityEditModal
// Extraído de MatchView.tsx (modularização)

import {
  RECURRENCE_OPTIONS,
  type Opportunity,
  type ArtistLite,
  type Recurrence,
} from '../../types/matchTypes'
import { joinTags, splitTags } from '../../utils/matchHelpers'
import { st } from './matchStyles'

// ─── Associar artista ────────────────────────────────────────────────────────

interface AssignArtistModalProps {
  assigning: Opportunity
  artists: ArtistLite[]
  selectedArtistId: string
  onSelect: (id: string) => void
  onCancel: () => void
  onConfirm: () => void
}

export function AssignArtistModal({ assigning, artists, selectedArtistId, onSelect, onCancel, onConfirm }: AssignArtistModalProps) {
  return (
    <div style={st.overlay}>
      <div style={st.smallModal}>
        <h2 style={st.modalTitle}>Associar artista</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 14 }}>{assigning.title}</p>

        <label style={st.label}>Artista
          <select style={st.input} value={selectedArtistId} onChange={e => onSelect(e.target.value)}>
            <option value="">— Seleccionar —</option>
            {artists.map(a => <option key={a.id} value={a.id}>{a.artisticName || a.name || 'Artista'}</option>)}
          </select>
        </label>

        <div style={st.modalFooter}>
          <button style={st.secondaryBtn} onClick={onCancel}>Cancelar</button>
          <button style={st.primaryBtn} onClick={onConfirm}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Partilhar com produtor ──────────────────────────────────────────────────

interface ShareProducerModalProps {
  shareOp: Opportunity
  producerOrgs: { id: string; name: string }[]
  shareTargetOrgId: string
  sharing: boolean
  onSelect: (id: string) => void
  onCancel: () => void
  onConfirm: () => void
}

export function ShareProducerModal({ shareOp, producerOrgs, shareTargetOrgId, sharing, onSelect, onCancel, onConfirm }: ShareProducerModalProps) {
  return (
    <div style={st.overlay}>
      <div style={st.smallModal}>
        <h2 style={st.modalTitle}>🔗 Partilhar com produtor</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 14 }}>{shareOp.title}</p>

        {producerOrgs.length === 0 ? (
          <p style={{ color: '#ffcf5c', fontSize: 13 }}>Ainda não há produtores registados no sistema.</p>
        ) : (
          <label style={st.label}>Produtor
            <select style={st.input} value={shareTargetOrgId} onChange={e => onSelect(e.target.value)}>
              <option value="">— Seleccionar produtor —</option>
              {producerOrgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
        )}

        <div style={st.modalFooter}>
          <button style={st.secondaryBtn} onClick={onCancel}>Cancelar</button>
          <button style={{ ...st.primaryBtn, opacity: (!shareTargetOrgId || sharing) ? 0.5 : 1 }}
            disabled={!shareTargetOrgId || sharing}
            onClick={onConfirm}>
            {sharing ? '⟳ A partilhar...' : '🔗 Partilhar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Editar / Nova oportunidade ──────────────────────────────────────────────

interface OpportunityEditModalProps {
  editing: Opportunity
  isExisting: boolean
  isAdmin: boolean
  onChange: (op: Opportunity) => void
  onSave: () => void
  onDelete: () => void
  onClose: () => void
}

export function OpportunityEditModal({ editing, isExisting, isAdmin, onChange, onSave, onDelete, onClose }: OpportunityEditModalProps) {
  return (
    <div style={st.overlay}>
      <div style={st.modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={st.modalTitle}>
            {isExisting ? 'Editar' : 'Nova'} oportunidade
          </h2>
          <button style={st.secondaryBtn} onClick={onClose}>Fechar</button>
        </div>

        <div style={st.formGrid}>
          <label style={st.label}>Título *
            <input style={st.input} value={editing.title} onChange={e => onChange({ ...editing, title: e.target.value })} />
          </label>

          <label style={st.label}>Organização / Venue
            <input style={st.input} value={editing.organization || ''} onChange={e => onChange({ ...editing, organization: e.target.value })} />
          </label>

          <label style={st.label}>Tipo
            <select style={st.input} value={editing.type || 'open_call'} onChange={e => onChange({ ...editing, type: e.target.value })}>
              <option value="residencia">🏠 Residência</option>
              <option value="open_call">📋 Open Call / Edital</option>
              <option value="festival">🎪 Festival</option>
              <option value="showcase">🎤 Showcase</option>
              <option value="grant">🏆 Prémio / Bolsa</option>
              <option value="mobilidade">✈️ Mobilidade</option>
              <option value="financiamento">💰 Financiamento</option>
              <option value="venue">🏛 Venue / Espaço cultural</option>
              <option value="festa">🎉 Festa / Noite / Ciclo</option>
              <option value="clube">🎧 Clube nocturno</option>
            </select>
          </label>

          <label style={st.label}>Recorrência
            <select style={st.input} value={editing.recurrence || 'anual'} onChange={e => onChange({ ...editing, recurrence: e.target.value as Recurrence })}>
              {RECURRENCE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>

          <label style={st.label}>País
            <input style={st.input} value={editing.countryName || editing.country || ''} onChange={e => onChange({ ...editing, countryName: e.target.value, country: e.target.value })} />
          </label>

          <label style={st.label}>Cidade
            <input style={st.input} value={editing.city || ''} onChange={e => onChange({ ...editing, city: e.target.value })} />
          </label>

          <label style={st.label}>📅 Deadline
            <input style={st.input} type="date" value={editing.deadline || ''} onChange={e => onChange({ ...editing, deadline: e.target.value })} />
          </label>

          <label style={st.label}>🔓 Data de abertura
            <input style={st.input} type="date" value={editing.openingDate || ''} onChange={e => onChange({ ...editing, openingDate: e.target.value })} />
          </label>

          <label style={st.label}>Link oficial
            <input style={st.input} value={editing.link || ''} onChange={e => onChange({ ...editing, link: e.target.value })} />
          </label>

          <label style={st.label}>Disciplinas
            <input style={st.input} value={joinTags(editing.disciplines)}
              onChange={e => onChange({ ...editing, disciplines: splitTags(e.target.value) })}
              placeholder="performance, música, dj, artes visuais..." />
          </label>
        </div>

        <label style={st.check}>
          <input type="checkbox" checked={Boolean(editing.coversCosts)}
            onChange={e => onChange({ ...editing, coversCosts: e.target.checked })} />
          Cobre custos
        </label>

        {isAdmin && (
          <label style={{ ...st.check, color: '#ff8a8a', marginTop: 10 }}>
            <input type="checkbox" checked={Boolean(editing.isPrivate)}
              onChange={e => onChange({ ...editing, isPrivate: e.target.checked })} />
            🔒 Privada — só admins vêem
          </label>
        )}

        <label style={{ ...st.label, marginTop: 12 }}>Resumo / Descrição
          <textarea style={st.textarea} value={editing.summary || ''}
            onChange={e => onChange({ ...editing, summary: e.target.value, description: e.target.value })} />
        </label>

        <label style={st.label}>Notas internas
          <textarea style={st.textarea} value={editing.notes || ''}
            onChange={e => onChange({ ...editing, notes: e.target.value })}
            placeholder="Estratégia, histórico, contactos, como apresentar..." />
        </label>

        <div style={st.modalFooter}>
          <button style={st.secondaryBtn} onClick={onClose}>Cancelar</button>

          {isExisting && (
            <button style={st.dangerBtn} onClick={onDelete}>Apagar</button>
          )}

          <button style={st.primaryBtn} onClick={onSave}>💾 Guardar</button>
        </div>
      </div>
    </div>
  )
}