import { Platform } from 'react-native';

export const palette = {
  black: '#0F0F0F',
  blackDeep: '#080808',
  charcoal: '#2A2A2A',
  graphite: '#171717',
  graphiteLight: '#202020',
  gold: '#EDBA01',
  goldLight: 'rgba(237, 186, 1, 0.15)',
  goldMuted: '#A98200',
  ivory: '#F5F0E6',
  ivoryDim: 'rgba(245, 240, 230, 0.6)',
  ash: '#A7A7A7',
  smoke: '#6F6F6F',
  line: 'rgba(237, 186, 1, 0.22)',
  lineSoft: 'rgba(245, 240, 230, 0.1)',
  lineHard: 'rgba(237, 186, 1, 0.45)',
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

export const Fonts = {
  sans: Platform.select({ web: "'Inter', sans-serif", default: 'Inter_400Regular' }),
  sansBold: Platform.select({ web: "'Inter', sans-serif", default: 'Inter_700Bold' }),
  display: Platform.select({ web: "'Space Grotesk', sans-serif", default: 'SpaceGrotesk_700Bold' }),
  mono: Platform.select({ web: "'Space Mono', monospace", default: 'SpaceMono_400Regular' }),
};

export const typography = {
  // Editorial hero — splash screens, covers
  hero: {
    fontFamily: Fonts.display,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  // Major screen title
  title: {
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  // Card and section headings
  section: {
    fontFamily: Fonts.display,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800' as const,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  // Labels, tags, pills
  label: {
    fontFamily: Fonts.display,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '800' as const,
    letterSpacing: 1.8,
    textTransform: 'uppercase' as const,
  },
  // Body copy — readable 16px minimum
  body: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 23,
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
    fontWeight: '800' as const,
    letterSpacing: -1,
  },
  // Mid-size metric
  metric: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800' as const,
    letterSpacing: 0,
  },
};

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

export const radii = {
  none: 0,
  sm: 2,
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
};
