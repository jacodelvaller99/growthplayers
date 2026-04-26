/**
 * LIFEFLOW DESIGN SYSTEM
 * Centralizado para consistencia 100%
 * Token-based, no valores hardcodeados en pantallas
 */

export const Colors = {
  // Core
  bg: '#01191D',
  surface: '#0D2B30',
  surfaceHover: '#112E34',
  surfaceBorder: 'rgba(174,254,240,0.08)',

  // Mint (Primary)
  mint: '#AEFEF0',
  mintHover: '#C8FFF6',
  mintFaint: 'rgba(174,254,240,0.06)',
  mintSubtle: 'rgba(174,254,240,0.12)',
  mintMuted: 'rgba(174,254,240,0.40)',
  mintDim: 'rgba(174,254,240,0.25)',

  // Accent
  amber: '#FFB547',
  amberFaint: 'rgba(255,181,71,0.12)',

  // Semantic
  error: '#FF6B6B',
  errorFaint: 'rgba(255,107,107,0.10)',
  success: '#10B981',
  successFaint: 'rgba(16,185,129,0.10)',

  // Text
  white90: 'rgba(255,255,255,0.90)',
  white70: 'rgba(255,255,255,0.70)',
  white40: 'rgba(255,255,255,0.40)',
} as const;

export const Typography = {
  tag: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase' as const,
    color: Colors.mintMuted,
    fontWeight: '600' as const,
  },
  label: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: Colors.mintMuted,
    fontWeight: '600' as const,
  },
  body: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: Colors.white90,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: Colors.white90,
    fontWeight: '400' as const,
  },
  bodyMuted: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: Colors.mintMuted,
    fontWeight: '400' as const,
  },
  heading: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    color: Colors.mint,
    fontWeight: '600' as const,
  },
  subheading: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: Colors.mint,
    fontWeight: '600' as const,
  },
  metric: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 36,
    lineHeight: 40,
    color: Colors.mint,
    fontWeight: '700' as const,
  },
  caption: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    color: Colors.mintMuted,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
  buttonLarge: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 13,
    letterSpacing: 1.5,
    fontWeight: '600' as const,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export const Shadow = {
  mint: {
    shadowColor: '#AEFEF0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;

export const Duration = {
  instant: 0,
  fast: 150,
  base: 300,
  slow: 500,
} as const;

/**
 * Component Presets — para uso en pantallas
 */
export const ComponentPresets = {
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.lg,
    padding: Spacing.base,
  },
  cardAccent: (accentColor: string) => ({
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderTopWidth: 2,
    borderTopColor: accentColor,
    borderRadius: Radius.lg,
    padding: Spacing.base,
  }),
  inputField: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.white90,
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
  },
  buttonPrimary: {
    backgroundColor: Colors.mint,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 52,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.mintSubtle,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 52,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
} as const;

export const PolarisTokens = {
  philippineYellow: '#EDBA01',
  yellowBright:     '#FFC804',
  smokyBlack:       '#0F0F0F',
  darkSilver:       '#6D6D6D',
  lightGray:        '#C9C9C9',
  bg:               '#0F0F0F',
  surface:          '#1A1A1A',
  surface2:         '#222222',
  accent:           '#EDBA01',
  accentMuted:      'rgba(237,186,1,0.12)',
  accentBorder:     'rgba(237,186,1,0.20)',
  accentGlow:       'rgba(237,186,1,0.06)',
  text:             '#FFFFFF',
  textMuted:        '#C9C9C9',
  textFaint:        '#6D6D6D',
  border:           'rgba(255,255,255,0.08)',
  divider:          'rgba(237,186,1,0.10)',
  shadowGold:       '0 0 20px rgba(237,186,1,0.15)',
} as const

export const GrowthPlayersTokens = {
  richBlack:     '#01191D',
  midnightGreen: '#064853',
  pearlAqua:     '#86C6B3',
  mint:          '#AEFEF0',
  bg:            '#01191D',
  surface:       '#0D2B30',
  surface2:      '#0F3640',
  accent:        '#AEFEF0',
  accentMid:     '#86C6B3',
  accentMuted:   'rgba(174,254,240,0.12)',
  accentBorder:  'rgba(174,254,240,0.20)',
  text:          '#FFFFFF',
  textMuted:     '#86C6B3',
  textFaint:     'rgba(174,254,240,0.40)',
  border:        'rgba(174,254,240,0.12)',
  divider:       'rgba(174,254,240,0.08)',
} as const

/**
 * EDITORIAL DESIGN TOKENS — Unified across all screens
 * Smoky black foundation · Philippine gold accents · Quiet luxury
 */
export const Editorial = {
  // Backgrounds
  bg:           '#0A0A0A',
  surface:      '#111111',
  surface2:     '#181818',
  surfaceRaise: '#1E1E1E',

  // Gold (brand color)
  gold:        '#EDBA01',
  goldMid:     'rgba(237,186,1,0.14)',
  goldBorder:  'rgba(237,186,1,0.22)',
  goldDim:     'rgba(237,186,1,0.45)',
  goldFaint:   'rgba(237,186,1,0.07)',

  // Text
  text:        '#FFFFFF',
  textMid:     '#888888',
  textDim:     '#555555',

  // System
  divider:     'rgba(255,255,255,0.07)',
  error:       '#EF4444',
  success:     '#22C55E',
} as const

export type ProgramType = 'polaris' | 'growth_players'

export const getProgramTokens = (p: ProgramType) =>
  p === 'polaris' ? PolarisTokens : GrowthPlayersTokens

export type PolarisSymbol =
  'body' | 'spirit' | 'growth' | 'balance' | 'detox' |
  'light' | 'peace' | 'alignment' | 'awaken' | 'harmony'

export const POLARIS_SYMBOL_ICONS: Record<PolarisSymbol, string> = {
  body:      'body-outline',
  spirit:    'sparkles-outline',
  growth:    'trending-up-outline',
  balance:   'scale-outline',
  detox:     'leaf-outline',
  light:     'sunny-outline',
  peace:     'water-outline',
  alignment: 'compass-outline',
  awaken:    'eye-outline',
  harmony:   'infinite-outline',
}
