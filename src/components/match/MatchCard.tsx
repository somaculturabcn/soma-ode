// src/components/match/MatchCard.tsx
// SOMA ODÉ — Card individual de oportunidade
// Extraído de renderCard() em MatchView.tsx (modularização)

import ProposeOpportunityButton from '../ProposeOpportunityButton'
import {
  safeArr,
  TYPE_COLORS,
  TYPE_ICONS,
  RECURRENCE_OPTIONS,
  type Opportunity,
  type SavedSearch,
} from '../../types/matchTypes'
import { daysLeft, deadlineLabel } from '../../utils/matchHelpers'
import { st } from './matchStyles'

interface MatchCardProps {
  op: Opportunity
  isWeb?: boolean
  activeScout: SavedSearch | null
  isQuickEdit: boolean
  canEdit: boolean
  canDelete: boolean
  isAdmin: boolean
  isProducer: boolean
  loadingAnalysis: boolean
  onToggleQuickEdit: () => void
  onQuickUpdate: (field: keyof Opportunity, value: any) => void
  onAnalysis: () => void
  onAssign: () => void
  onShare: () => void
  onSaveWeb: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export default function MatchCard({
  op, isWeb = false, activeScout, isQuickEdit,
  canEdit, canDelete, isAdmin, isProducer, loadingAnalysis,
  onToggleQuickEdit, onQuickUpdate, onAnalysis, onAssign,
  onShare, onSaveWeb, onDuplicate, onDelete,
}: MatchCardProps) {
  const dl = deadlineLabel(op.deadline)
  const hasScore = !isWeb && activeScout && op._matchScore !== undefined
  const scoreColor = (op._matchScore || 0) >= 60 ? '#6ef3a5' : (op._matchScore || 0) >= 35 ? '#ffcf5c' : 'rgba(255,255,255,0.4)'
  const typeKey = (op.type || '').toLowerCase()
  const typeColor = TYPE_COLORS[typeKey] || 'rgba(255,255,255,0.5)'
  const typeIcon = TYPE_ICONS[typeKey] || '📌'
  const urgent = dl && (daysLeft(op.deadline) || 999) <= 7 && (daysLeft(op.deadline) || -1) >= 0
  const recInfo = RECURRENCE_OPTIONS.find(r => r.value === op.recurrence)
  const isShared = (op.sharedWith || []).length > 0

  return (
    <article style={{
      ...st.card,
      borderColor: isWeb ? 'rgba(96,180,232,0.4)'
        : urgent ? 'rgba(255,138,138,0.5)'
          : hasScore && (op._matchScore || 0) >= 60 ? 'rgba(110,243,165,0.3)'
            : op.isPrivate ? 'rgba(255,138,138,0.35)'
              : 'rgba(255,255,255,0.08)',
      background: isWeb ? 'rgba(26,105,148,0.05)' : '#111',
    }}>
      <div style={st.cardTop}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ ...st.typeTag, color: typeColor, borderColor: `${typeColor}50`, background: `${typeColor}15` }}>
            {isWeb ? '🌐 ' : `${typeIcon} `}{op.type || 'edital'}
          </span>

          {recInfo && !isWeb && <span style={{ fontSize: 10, color: recInfo.color, opacity: 0.8 }}>{recInfo.label}</span>}
          {hasScore && <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor }}>{op._matchScore}%</span>}
          {isShared && !isWeb && <span style={{ fontSize: 10, color: '#60b4e8' }}>🔗 partilhada</span>}
          {op.isPrivate && !isWeb && <span style={{ fontSize: 10, color: '#ff8a8a' }}>🔒 privada</span>}
        </div>

        {dl && <span style={{ fontSize: 11, fontWeight: 700, color: dl.color }}>{dl.text}</span>}
      </div>

      <h3 style={st.cardTitle}>{op.title}</h3>

      <p style={st.cardMeta}>
        {[op.organization, op.city, op.countryName || op.country].filter(Boolean).join(' · ') || 'Sem entidade'}
      </p>

      {op.assignedArtistName && <div style={st.artistTag}>🎤 {op.assignedArtistName}</div>}

      {hasScore && op._matchReasons && op._matchReasons.length > 0 && (
        <div style={st.reasons}>{op._matchReasons.map((r, i) => <span key={i}>✓ {r}</span>)}</div>
      )}

      <p style={st.summary}>{op.summary || op.description || 'Sem resumo ainda.'}</p>

      <div style={st.tags}>
        {safeArr(op.disciplines).slice(0, 3).map(d => <span key={d} style={st.tag}>{d}</span>)}
        {op.coversCosts && <span style={st.costTag}>custos cobertos</span>}
        {!activeScout && !isWeb && <span style={st.sourceTag}>{op.source || 'manual'}</span>}
      </div>

      {op.notes && !isQuickEdit && <div style={st.notesBox}>📝 {op.notes}</div>}

      {isQuickEdit && !isWeb && canEdit && (
        <div style={st.quickEditBox}>
          <div style={st.quickEditGrid}>
            <div>
              <span style={st.qLabel}>Deadline candidatura</span>
              <input style={st.qInput} type="date" defaultValue={op.deadline || ''}
                onBlur={e => onQuickUpdate('deadline', e.target.value)} />
            </div>

            <div>
              <span style={st.qLabel}>Data de abertura</span>
              <input style={st.qInput} type="date" defaultValue={op.openingDate || ''}
                onBlur={e => onQuickUpdate('openingDate', e.target.value)} />
            </div>

            <div>
              <span style={st.qLabel}>Recorrência</span>
              <select style={st.qInput} defaultValue={op.recurrence || 'anual'}
                onChange={e => onQuickUpdate('recurrence', e.target.value)}>
                {RECURRENCE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div>
              <span style={st.qLabel}>Link oficial</span>
              <input style={st.qInput} defaultValue={op.link || ''} placeholder="https://..."
                onBlur={e => onQuickUpdate('link', e.target.value)} />
            </div>
          </div>

          {isAdmin && (
            <label style={{ ...st.check, color: '#ff8a8a', marginBottom: 10 }}>
              <input type="checkbox" defaultChecked={Boolean(op.isPrivate)}
                onChange={e => onQuickUpdate('isPrivate', e.target.checked)} />
              🔒 Privada — só admins vêem
            </label>
          )}

          <span style={st.qLabel}>Notas internas</span>
          <textarea style={st.qTextarea} defaultValue={op.notes || ''}
            placeholder="Estratégia, histórico, contactos, como apresentar..."
            onBlur={e => onQuickUpdate('notes', e.target.value)} />

          <button style={st.qDoneBtn} onClick={onToggleQuickEdit}>✓ Fechar edição</button>
        </div>
      )}

      <div style={st.cardActions}>
        {op.link && <a href={op.link} target="_blank" rel="noopener noreferrer" style={st.link}>ver →</a>}

        {!isWeb && canEdit && (
          <button style={st.editQuickBtn} onClick={onToggleQuickEdit}>
            {isQuickEdit ? '✓ Fechar' : '✏️ Editar'}
          </button>
        )}

        <button style={st.analysisBtn} onClick={onAnalysis} disabled={loadingAnalysis}>🔬 Análise</button>

        {!isProducer && !isWeb && <ProposeOpportunityButton opportunity={op} />}

        {canEdit && (
          <button style={st.secondaryBtn} onClick={onAssign}>
            Associar
          </button>
        )}

        {isAdmin && !isWeb && (
          <button style={st.shareBtn} onClick={onShare}>🔗 Partilhar</button>
        )}

        {isWeb ? (
          <button style={st.primaryBtn} onClick={onSaveWeb}>💾 Guardar</button>
        ) : (
          <button style={st.secondaryBtn} onClick={onDuplicate}>
            {canEdit ? 'Editar mais' : 'Duplicar'}
          </button>
        )}

        {canDelete && !isWeb && (
          <button style={st.dangerBtn} onClick={onDelete}>✕</button>
        )}
      </div>
    </article>
  )
}