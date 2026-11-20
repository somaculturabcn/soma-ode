// src/components/ProducerDashboard.tsx
// SOMA ODÉ — Dashboard interno do produtor
// Visão proativa: alertas, matches, prazos, recomendações

import { useEffect, useState } from 'react'
import { colors, shadows, radius } from '../theme'

interface DashboardData {
  alertasUrgentes: AlertaCard[]
  matchesRecentes: MatchCard[]
  artistasSemMateriais: ArtistaPendencia[]
  oportunidadesPorVencer: OportunidadePrazo[]
  recomendacoesIA: string[]
}

interface AlertaCard {
  artista: string
  oportunidade: string
  deadline: string
  diasRestantes: number
  score: number
  urgencia: 'critico' | 'alto' | 'medio'
}

interface MatchCard {
  artista: string
  oportunidade: string
  score: number
  compatibilidade: string[]
}

interface ArtistaPendencia {
  artista: string
  materiaisFaltantes: string[]
  impacto: string
}

interface OportunidadePrazo {
  titulo: string
  deadline: string
  diasRestantes: number
  artistasCompativeis: number
}

export default function ProducerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDashboard()
  }, [])

  async function carregarDashboard() {
    // Chamar API que agrega todos os dados
    setLoading(false)
  }

  if (loading) return <div style={s.loading}>Carregando dashboard...</div>

  return (
    <div style={s.wrap}>
      {/* CABEÇALHO */}
      <header style={s.header}>
        <div>
          <h1 style={s.title}>🎯 Dashboard SOMA</h1>
          <p style={s.subtitle}>
            Scout automático · {new Date().toLocaleDateString('pt-PT')}
          </p>
        </div>
        <div style={s.stats}>
          <StatCard label="Alertas Hoje" value="5" color="#ff4444" />
          <StatCard label="Matches > 70%" value="12" color={colors.primary} />
          <StatCard label="Prazos esta Semana" value="3" color={colors.admin} />
          <StatCard label="Artistas Ativos" value="24" color="#6ef3a5" />
        </div>
      </header>

      {/* GRID PRINCIPAL */}
      <div style={s.grid}>
        {/* COLUNA 1: ALERTAS URGENTES */}
        <section style={s.panel}>
          <h2 style={s.panelTitle}>🚨 Alertas Urgentes</h2>
          <div style={s.alertList}>
            {[1, 2, 3].map(i => (
              <div key={i} style={s.alertCard}>
                <div style={s.alertHeader}>
                  <span style={s.alertArtist}>Kiara</span>
                  <span style={s.alertScore}>Score 85</span>
                </div>
                <p style={s.alertOportunidade}>Residência Artística — Berlim</p>
                <div style={s.alertFooter}>
                  <span style={s.alertDeadline}>⚠️ 3 dias restantes</span>
                  <button style={s.alertAction}>Ver detalhes →</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* COLUNA 2: MATCHES RECENTES */}
        <section style={s.panel}>
          <h2 style={s.panelTitle}>✨ Melhores Matches</h2>
          <div style={s.matchList}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={s.matchCard}>
                <div style={s.matchHeader}>
                  <span>Artista X</span>
                  <span style={{
                    ...s.matchBadge,
                    background: i === 1 ? '#6ef3a5' : colors.admin
                  }}>
                    {95 - i * 5}%
                  </span>
                </div>
                <p style={s.matchOportunidade}>Festival Y — País Z</p>
                <div style={s.matchTags}>
                  <span style={s.matchTag}>✅ Vocabulário</span>
                  <span style={s.matchTag}>✅ Território</span>
                  <span style={s.matchTag}>✅ Disciplina</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* COLUNA 3: MATERIAIS PENDENTES */}
        <section style={s.panel}>
          <h2 style={s.panelTitle}>📋 Pendências de Materiais</h2>
          <div style={s.pendenciaList}>
            {[
              { artista: 'Artista A', faltam: ['Rider técnico', 'Bio EN'], impacto: 'Perdendo oportunidades na Europa' },
              { artista: 'Artista B', faltam: ['Vídeo apresentação'], impacto: '3 editais não puderam ser aplicados' },
            ].map((p, i) => (
              <div key={i} style={s.pendenciaCard}>
                <strong>{p.artista}</strong>
                <p style={s.pendenciaFaltam}>Falta: {p.faltam.join(', ')}</p>
                <p style={s.pendenciaImpacto}>Impacto: {p.impacto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* COLUNA 4: RECOMENDAÇÕES IA */}
        <section style={s.panel}>
          <h2 style={s.panelTitle}>🤖 Recomendações IA</h2>
          <div style={s.recomendacaoList}>
            {[
              '3 artistas com vocabulário "diáspora" têm alta afinidade com editais na Alemanha este mês',
              'Preparar riders técnicos padronizados aumentaria taxa de aplicação em 40%',
              'Oportunidades para performance + instalação estão em alta no Norte da Europa',
              'Artista X e Y poderiam fazer tour conjunta: corredores complementares',
            ].map((rec, i) => (
              <div key={i} style={s.recomendacaoCard}>
                <span style={s.recomendacaoIcon}>💡</span>
                <p style={s.recomendacaoText}>{rec}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

// Componentes auxiliares
function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ ...s.statCard, borderColor: color }}>
      <span style={s.statValue}>{value}</span>
      <span style={s.statLabel}>{label}</span>
    </div>
  )
}

// Estilos
const s: Record<string, React.CSSProperties> = {
  wrap: { padding: 24, maxWidth: 1400, margin: '0 auto', color: colors.text },
  loading: { padding: 60, textAlign: 'center', color: colors.text },
  header: { marginBottom: 24 },
  title: { fontSize: 28, margin: 0, color: colors.text },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  stats: { display: 'flex', gap: 16, marginTop: 16 },
  statCard: {
    background: colors.bg, border: `1px solid ${colors.border}`,
    borderRadius: 12, padding: '16px 24px', textAlign: 'center',
    borderLeft: '3px solid',
  },
  statValue: { fontSize: 28, fontWeight: 700, display: 'block' },
  statLabel: { fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.1em' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 },
  panel: {
    background: colors.bg, border: `1px solid ${colors.border}`,
    borderRadius: 12, padding: 20,
  },
  panelTitle: { color: colors.primary, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 0, marginBottom: 16 },
  alertList: { display: 'flex', flexDirection: 'column', gap: 10 },
  alertCard: {
    background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)',
    borderRadius: 8, padding: 12,
  },
  alertHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  alertArtist: { fontWeight: 600, color: colors.text },
  alertScore: { background: '#ff4444', color: colors.text, padding: '2px 8px', borderRadius: 10, fontSize: 11 },
  alertOportunidade: { color: colors.text, fontSize: 13, margin: '4px 0' },
  alertFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  alertDeadline: { color: '#ff8a8a', fontSize: 12, fontWeight: 600 },
  alertAction: { background: 'transparent', color: colors.primary, border: 'none', cursor: 'pointer', fontSize: 12 },
  matchList: { display: 'flex', flexDirection: 'column', gap: 10 },
  matchCard: {
    background: colors.primaryBg, border: '1px solid rgba(96,180,232,0.15)',
    borderRadius: 8, padding: 12,
  },
  matchHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  matchBadge: { padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#000' },
  matchOportunidade: { color: colors.textSecondary, fontSize: 13, margin: '4px 0' },
  matchTags: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 },
  matchTag: { fontSize: 11, color: colors.success },
  pendenciaList: { display: 'flex', flexDirection: 'column', gap: 10 },
  pendenciaCard: {
    background: 'rgba(255,207,92,0.06)', border: '1px solid rgba(255,207,92,0.15)',
    borderRadius: 8, padding: 12,
  },
  pendenciaFaltam: { color: colors.admin, fontSize: 12, margin: '4px 0' },
  pendenciaImpacto: { color: colors.textSecondary, fontSize: 11, fontStyle: 'italic' },
  recomendacaoList: { display: 'flex', flexDirection: 'column', gap: 10 },
  recomendacaoCard: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    background: colors.bgInput, borderRadius: 8, padding: 12,
  },
  recomendacaoIcon: { fontSize: 16 },
  recomendacaoText: { color: colors.text, fontSize: 13, lineHeight: 1.5, margin: 0 },
}