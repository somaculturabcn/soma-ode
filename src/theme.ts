// src/theme.ts — SOMA ODÉ Design System
// Baseado no Manual da Marca SOMA Cultura
// Cor primária: #1A6994 | Fundo branco | Tipografia escura

export const colors = {
  // ── Primária (Manual da Marca) ──────────────────────────
  primary:      '#1A6994',   // HEX oficial do manual
  primaryDark:  '#145578',   // hover / pressed
  primaryLight: '#2080AD',   // links ativos
  primaryBg:    'rgba(26, 105, 148, 0.06)',  // fundos suaves
  primaryBorder:'rgba(26, 105, 148, 0.15)',  // bordas com cor

  // ── Accent (complementar) ───────────────────────────────
  accent:       '#60b4e8',   // azul claro para destaques
  accentBg:     'rgba(96, 180, 232, 0.08)',

  // ── Fundos ──────────────────────────────────────────────
  bg:           '#FFFFFF',   // fundo principal (manual: branco)
  bgPage:       '#F7F8FA',   // fundo da página / body
  bgCard:       '#FFFFFF',   // cards
  bgCardHover:  '#F0F4F8',   // card hover
  bgSidebar:    '#FFFFFF',   // sidebar / header
  bgInput:      '#F5F7FA',   // inputs
  bgOverlay:    'rgba(0, 0, 0, 0.5)',  // modais

  // ── Texto ───────────────────────────────────────────────
  text:         '#1A1A2E',   // texto principal
  textSecondary:'#5A6474',   // texto secundário
  textMuted:    '#9CA3AF',   // texto apagado
  textOnPrimary:'#FFFFFF',   // texto sobre fundo primário
  textLink:     '#1A6994',   // links

  // ── Bordas ──────────────────────────────────────────────
  border:       '#E5E7EB',   // borda padrão
  borderLight:  '#F0F1F3',   // borda suave
  borderFocus:  '#1A6994',   // borda focus

  // ── Status ──────────────────────────────────────────────
  success:      '#059669',
  successBg:    'rgba(5, 150, 105, 0.08)',
  warning:      '#D97706',
  warningBg:    'rgba(217, 119, 6, 0.08)',
  danger:       '#DC2626',
  dangerBg:     'rgba(220, 38, 38, 0.06)',

  // ── Admin ───────────────────────────────────────────────
  admin:        '#D97706',
  adminBg:      'rgba(217, 119, 6, 0.08)',

  // ── Roles ───────────────────────────────────────────────
  artista:      '#1A6994',
  artistaBg:    'rgba(26, 105, 148, 0.08)',
  produtor:     '#7C3AED',
  produtorBg:   'rgba(124, 58, 237, 0.08)',
} as const

export const shadows = {
  sm:   '0 1px 2px rgba(0, 0, 0, 0.04)',
  md:   '0 2px 8px rgba(0, 0, 0, 0.06)',
  lg:   '0 4px 16px rgba(0, 0, 0, 0.08)',
  card: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
} as const

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const

// ── Estilos base reutilizáveis ────────────────────────────
export const baseStyles = {
  page: {
    minHeight: '100vh',
    background: colors.bgPage,
    fontFamily: "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif",
    color: colors.text,
  } as React.CSSProperties,

  card: {
    background: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.lg,
    padding: 20,
    boxShadow: shadows.card,
  } as React.CSSProperties,

  header: {
    background: colors.bgSidebar,
    borderBottom: `1px solid ${colors.border}`,
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as React.CSSProperties,

  button: {
    background: colors.primary,
    color: colors.textOnPrimary,
    border: 'none',
    borderRadius: radius.sm,
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.15s',
  } as React.CSSProperties,

  buttonSecondary: {
    background: colors.bgInput,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    padding: '10px 20px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: radius.sm,
    border: `1px solid ${colors.border}`,
    background: colors.bgInput,
    color: colors.text,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  } as React.CSSProperties,

  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.03em',
  } as React.CSSProperties,

  badge: {
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: radius.full,
    display: 'inline-block',
  } as React.CSSProperties,

  tabBar: {
    display: 'flex',
    gap: 2,
    background: colors.bgSidebar,
    borderTop: `1px solid ${colors.border}`,
    padding: '8px 12px',
    justifyContent: 'space-around',
  } as React.CSSProperties,

  tabItem: (active: boolean) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 2,
    padding: '6px 10px',
    borderRadius: radius.sm,
    background: active ? colors.primaryBg : 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 10,
    fontWeight: active ? 700 : 500,
    color: active ? colors.primary : colors.textMuted,
    transition: 'all 0.15s',
    minWidth: 52,
  }),
} as const
