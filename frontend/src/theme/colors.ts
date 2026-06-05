// Unified Design System Colors — BattleCore Esports Platform
// Dark Mode Gaming Esports Theme

// Core palette
export const themeColors = {
  // Primary actions
  primary: '#f47b25',         // Orange - CTAs, active states
  primaryHover: '#fb923c',    // Lighter orange for hover
  primaryPressed: '#ea580c',  // Darker orange for pressed
  primaryDisabled: 'rgba(244,123,37,0.4)',

  // Backgrounds
  backgroundDark: '#020617',  // Deep obsidian - Main background
  surface: '#0F172A',         // Slate 900 - Elevated surfaces
  surfaceHover: '#1E293B',    // Slate 800 - Hover state
  accentBlue: '#1E293B',      // Slate 800 - Cards, surfaces

  // Text
  textLight: '#F8FAFC',       // Slate 50 - Primary text
  textSecondary: '#94A3B8',   // Slate 400 - Secondary text
  textMuted: '#64748B',       // Slate 500 - Muted text
  textInverse: '#020617',     // Dark text on light backgrounds

  // Semantic
  success: '#22c55e',         // Green - Success, online, completed
  successBg: 'rgba(34,197,94,0.1)',
  warning: '#eab308',         // Yellow - Warning, pending
  warningBg: 'rgba(234,179,8,0.1)',
  error: '#ef4444',           // Red - Error, blocked, failed
  errorBg: 'rgba(239,68,68,0.1)',
  info: '#3b82f6',            // Blue - Info, ongoing
  infoBg: 'rgba(59,130,246,0.1)',

  // Borders
  border: '#1E293B',          // Slate 800 - Borders
  surfaceBorderHover: '#334155',

  // Game specific
  cs: '#3b82f6',              // Clash Squad badge
  br: '#22c55e',              // Battle Royale badge
  live: '#ef4444',            // LIVE badge (pulsing)
  draft: '#64748B',
  open: '#22c55e',
  ongoing: '#3b82f6',
  completed: '#a855f7',
  cancelled: '#ef4444',

  // Elite Pass tiers
  elitePro: '#94a3b8',        // Silver
  eliteElite: '#f47b25',      // Orange
  eliteSupreme: '#fbbf24',    // Gold

  // Gradients
  gradientPrimary: ['#f47b25', '#ea580c'] as const,
  gradientDark: ['#0F172A', '#020617'] as const,
  gradientCard: ['rgba(15,23,42,0.9)', 'rgba(2,6,23,0.95)'] as const,
  gradientLive: ['#ef4444', '#dc2626'] as const,
  gradientGold: ['#fbbf24', '#f59e0b'] as const,

  // Shadows
  shadowOrange: 'rgba(244,123,37,0.3)',
  shadowDark: 'rgba(0,0,0,0.5)',

  // Secondary actions
  secondary: '#3b82f6',
  secondaryHover: '#60a5fa',
  secondaryPressed: '#2563eb',
};

// Backwards-compatible COLORS export
export const COLORS = {
  primary: themeColors.primary,
  primaryHover: themeColors.primaryHover,
  primaryPressed: themeColors.primaryPressed,
  primaryDisabled: themeColors.primaryDisabled,
  backgroundDark: themeColors.backgroundDark,
  accentBlue: themeColors.accentBlue,
  textLight: themeColors.textLight,
  textSecondary: themeColors.textSecondary,
  textMuted: themeColors.textMuted,
  textInverse: themeColors.textInverse,
  success: themeColors.success,
  successBg: themeColors.successBg,
  warning: themeColors.warning,
  warningBg: themeColors.warningBg,
  error: themeColors.error,
  errorBg: themeColors.errorBg,
  info: themeColors.info,
  infoBg: themeColors.infoBg,
  surface: themeColors.surface,
  surfaceHover: themeColors.surfaceHover,
  border: themeColors.border,
  surfaceBorderHover: themeColors.surfaceBorderHover,
  cs: themeColors.cs,
  br: themeColors.br,
  live: themeColors.live,
  draft: themeColors.draft,
  open: themeColors.open,
  ongoing: themeColors.ongoing,
  completed: themeColors.completed,
  cancelled: themeColors.cancelled,
  elitePro: themeColors.elitePro,
  eliteElite: themeColors.eliteElite,
  eliteSupreme: themeColors.eliteSupreme,
  gradientPrimary: themeColors.gradientPrimary,
  gradientDark: themeColors.gradientDark,
  gradientCard: themeColors.gradientCard,
  gradientLive: themeColors.gradientLive,
  gradientGold: themeColors.gradientGold,
  shadowOrange: themeColors.shadowOrange,
  shadowDark: themeColors.shadowDark,
  secondary: themeColors.secondary,
  secondaryHover: themeColors.secondaryHover,
  secondaryPressed: themeColors.secondaryPressed,
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  inputBg: 'rgba(0, 0, 0, 0.3)',
};

// Spacing tokens
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
  SCREEN_PADDING: 16,
  CARD_PADDING: 16,
  SECTION_GAP: 24,
};

// Border radius tokens
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

// Typography tokens
export const TYPOGRAPHY = {
  fonts: {
    display: 'RussoOne_400Regular',
    body: 'ChakraPetch_700Bold',
    code: 'FiraCode_400Regular',
    description: 'FiraSans_400Regular',
  },
  sizes: {
    displayXL: 48,
    displayL: 36,
    displayM: 28,
    h1: 24,
    h2: 20,
    h3: 18,
    bodyL: 16,
    bodyM: 14,
    bodyS: 12,
    labelL: 14,
    labelM: 12,
    labelS: 10,
    tabLabel: 9,
    code: 12,
    numberXL: 40,
    numberL: 32,
    numberM: 24,
    numberS: 18,
  },
};

// Shadow presets
export const SHADOWS = {
  sm: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  lg: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 16, elevation: 8 },
  xl: { shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 32, elevation: 16 },
  orange: { shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 },
};

// Animation durations (ms)
export const ANIMATIONS = {
  fast: 100,
  normal: 300,
  slow: 500,
};

// Z-index layers
export const Z_INDEX = {
  behind: -1,
  normal: 0,
  elevated: 10,
  overlay: 100,
  modal: 200,
  toast: 300,
};
