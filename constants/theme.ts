import { Platform } from 'react-native';

export const palette = {
  black: '#0F0F0F',
  blackDeep: '#080808',
  charcoal: '#2A2A2A',
  graphite: '#171717',
  graphiteLight: '#202020',
  gold: '#EDBA01',
  goldMuted: '#A98200',
  ivory: '#F5F0E6',
  ash: '#A7A7A7',
  smoke: '#6F6F6F',
  line: 'rgba(237, 186, 1, 0.22)',
  lineSoft: 'rgba(245, 240, 230, 0.1)',
  success: '#76D49B',
  danger: '#D65B5B',
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
  hero: {
    fontFamily: Fonts.display,
    fontSize: 30,
    lineHeight: 35,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '800' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  section: {
    fontFamily: Fonts.display,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  label: {
    fontFamily: Fonts.display,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '800' as const,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  body: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 21,
  },
  mono: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 17,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
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
