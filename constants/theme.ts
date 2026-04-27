import { Platform } from 'react-native';

// ─── Polaris Brand Colors (Manual de Marca, Orgánico Studio 2024) ──────────────
// Philippine Yellow  #FFC804  PANTONE 7548 C  — primary accent
// Smoky Black        #0F0F0F  PANTONE Black 6 C — background
// Dark Silver        #6D6D6D  PANTONE 424 C — secondary text
export const palette = {
  black: '#0F0F0F',       // Smoky Black — brand background
  blackDeep: '#080808',
  charcoal: '#2A2A2A',
  graphite: '#171717',
  graphiteLight: '#202020',
  gold: '#FFC804',        // Philippine Yellow — brand primary (PANTONE 7548 C)
  goldLight: 'rgba(255, 200, 4, 0.15)',
  goldMuted: '#A98200',
  goldDim: '#EDBA01',     // darker variant
  ivory: '#F5F0E6',
  ivoryDim: 'rgba(245, 240, 230, 0.6)',
  ash: '#C9C9C9',         // Light Silver — brand spec #C9C9C9
  smoke: '#6D6D6D',       // Dark Silver — brand spec #6D6D6D PANTONE 424 C
  line: 'rgba(255, 200, 4, 0.22)',      // border using brand yellow
  lineSoft: 'rgba(245, 240, 230, 0.08)',
  lineHard: 'rgba(255, 200, 4, 0.45)',
  success: '#76D49B',
  danger: '#D65B5B',
  dangerMuted: 'rgba(214, 91, 91, 0.15)',
};

export const Colors = {
  light: {
    text: palette.black,
    background: palette.ivory,
    tint: palette.gold,
    icon: palette.charcoal,
    tabIconDefault: palette.smoke,
    tabIconSelected: palette.black,
    surface: '#FFFFFF',
    border: 'rgba(15, 15, 15, 0.14)',
  },
  dark: {
    text: palette.ivory,
    background: palette.black,
    tint: palette.gold,
    icon: palette.ash,
    tabIconDefault: palette.smoke,
    tabIconSelected: palette.gold,
    surface: palette.graphite,
    surfaceElevated: palette.graphiteLight,
    border: palette.line,
    borderSoft: palette.lineSoft,
    muted: palette.ash,
  },
};

// ─── Polaris Typography (Manual de Marca, Orgánico Studio 2024) ──────────────
// Display/Headings: Grandis Extended (paid) → Michroma (Google Fonts replacement #1)
// Body:             Inter (closest to Myriad Pro for body text)
// Mono/Data:        Space Mono
export const Fonts = {
  sans: Platform.select({ web: "'Inter', sans-serif", default: 'Inter_400Regular' }),
  sansBold: Platform.select({ web: "'Inter', sans-serif", default: 'Inter_700Bold' }),
  display: Platform.select({ web: "'Michroma', sans-serif", default: 'Michroma_400Regular' }),
  displayFallback: Platform.select({ web: "'Inter', sans-serif", default: 'Inter_700Bold' }),
  mono: Platform.select({ web: "'Space Mono', monospace", default: 'SpaceMono_400Regular' }),
};

// Typography scale — Michroma is a single-weight extended typeface.
// Hierarchy is achieved through size + letterSpacing (brand rule: uppercase for H1/H2).
export const typography = {
  // Editorial hero — splash screens, covers
  hero: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '400' as const,   // Michroma is single-weight; browser synthesises bold on web
    letterSpacing: 2.5,
    textTransform: 'uppercase' as const,
  },
  // Major screen title
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '400' as const,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  // Card and section headings
  section: {
    fontFamily: Fonts.display,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '400' as const,
    letterSpacing: 2.5,
    textTransform: 'uppercase' as const,
  },
  // Labels, tags, pills
  label: {
    fontFamily: Fonts.display,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '400' as const,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  // Body copy — readable 14px minimum
  body: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 22, // 1.57 ratio for comfortable reading
  },
  caption: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 18,
  },
  // Data, metrics, mono values
  mono: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  // Giant KPI numbers
  display: {
    fontFamily: Fonts.display,
    fontSize: 56,
    lineHeight: 60,
    fontWeight: '400' as const,
    letterSpacing: 2,
  },
  // Mid-size metric
  metric: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '400' as const,
    letterSpacing: 1,
  },
};

// 8pt spacing grid (Material Design / brand precision)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  section: 40,
};

// Sharp corners = tactical / military brand feel (Polaris aesthetic)
export const radii = {
  none: 0,
  sm: 2,   // near-sharp — brand's precise, no-nonsense feel
  md: 3,
  lg: 6,
  pill: 999,
};

export const surfaces = {
  card: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.borderSoft,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  premiumCard: {
    backgroundColor: palette.graphite,
    borderColor: Colors.dark.border,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  // Accent card — thin left gold border (brand identity element)
  accentCard: {
    backgroundColor: palette.graphite,
    borderLeftColor: palette.gold,
    borderLeftWidth: 3,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderWidth: 0,
    borderRadius: radii.none,
  },
};
