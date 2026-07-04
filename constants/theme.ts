import { Platform } from 'react-native';
import { cv } from './themeColors';

// ─── Brand Identity ──────────────────────────────────────────────────────────────
export const BRAND = {
  name:        'Polaris Growth Institute',
  shortName:   'Polaris',
  tagline:     'Persigue el estado. No el resultado.',
  mentor:      'Norman',
  accentColor: '#EDBA01',
} as const;

// ─── Polaris Brand Colors (Manual de Marca, Orgánico Studio 2024) ──────────────
// Philippine Yellow  #FFC804  PANTONE 7548 C  — primary accent
// Smoky Black        #0F0F0F  PANTONE Black 6 C — background
// Dark Silver        #6D6D6D  PANTONE 424 C — secondary text
export const palette = {
  // ── Base backgrounds — themeable (var on web · hex on native) ────────────────
  black:          cv('--c-bg',         '#090909'),   // base canvas
  blackDeep:      cv('--c-bg-deep',    '#050505'),   // absolute dark (player fullscreens)
  graphite:       cv('--c-surface',    '#111111'),   // card/panel background
  graphiteLight:  cv('--c-surface-2',  '#181818'),   // elevated surface (modals, drawers)
  charcoal:       cv('--c-surface-3',  '#222222'),   // hover state, subtle separators
  overlay:        cv('--c-overlay',    '#1C1C1C'),   // overlays

  // ── Ink — CONSTANT dark, never themed. For text/icons that sit on gold or
  //    light surfaces (e.g. button labels on gold). Using palette.black here
  //    would flip to cream in light mode and vanish.
  ink:            '#0A0A0A',

  // ── Brand accent (Philippine Yellow — constant across themes) ─────────────────
  gold:           '#FFC804',   // CTA buttons, active states, key metrics ONLY (FILLS)
  goldLight:      'rgba(255, 200, 4, 0.12)',   // tinted backgrounds
  goldMuted:      'rgba(255, 200, 4, 0.60)',   // secondary gold usage
  goldDim:        '#EDBA01',   // slightly darker variant
  goldGlow:       'rgba(255, 200, 4, 0.08)',   // glow effects
  // gold AS TEXT/icon on a surface — themeable. Bright gold on cream fails
  // contrast, so light mode swaps to deep amber. Use for eyebrows/labels/
  // timestamps/gold icons (color:), NOT for fills (keep palette.gold there).
  goldText:       cv('--c-gold-text', '#FFC804'),

  // ── Text hierarchy — themeable ───────────────────────────────────────────────
  ivory:          cv('--c-text',       '#EBEBEB'),   // primary text
  ivoryWarm:      cv('--c-text-warm',  '#F0EBE0'),   // warm off-white for special headings
  ivoryDim:       cv('--c-text-dim',   'rgba(235, 235, 235, 0.55)'), // dimmed text
  ash:            cv('--c-text-2',     '#AAAAAA'),   // secondary text
  smoke:          cv('--c-text-3',     '#888888'),   // tertiary/placeholder text — 5.5:1 sobre graphite (WCAG AA en texto normal). Antes #666666 fallaba (3.3:1).
  muted:          cv('--c-text-faint', '#444444'),   // disabled, locked states

  // ── Borders — themeable ──────────────────────────────────────────────────────
  line:           cv('--c-border',       'rgba(255, 255, 255, 0.07)'),  // DEFAULT card border
  lineSoft:       cv('--c-border-soft',  'rgba(255, 255, 255, 0.05)'),  // extra-subtle separators
  lineHard:       cv('--c-border-hard',  'rgba(255, 255, 255, 0.13)'),  // focus, emphasis borders
  lineFocus:      cv('--c-border-focus', 'rgba(255, 255, 255, 0.20)'),  // input focus rings
  lineGold:       'rgba(255, 200, 4, 0.30)',    // gold borders (use sparingly)
  lineGoldSubtle: 'rgba(255, 200, 4, 0.15)',    // very subtle gold accent

  // ── Semantic ─────────────────────────────────────────────────────────────────
  success:        '#52A878',
  successMuted:   'rgba(82, 168, 120, 0.15)',
  danger:         '#C0392B',
  dangerMuted:    'rgba(192, 57, 43, 0.15)',
  warning:        '#D4A017',
  info:           '#3D8FC0',

  // ── Wellness accent (meditation, sleep, breathing) ────────────────────────
  purple:         '#7C5CBF',
  purpleGlow:     'rgba(124, 92, 191, 0.07)',   // #7c5cbf11 — barely-there tint
  purpleMuted:    'rgba(124, 92, 191, 0.13)',   // #7c5cbf22 — subtle background
  purpleDim:      'rgba(124, 92, 191, 0.27)',   // #7c5cbf44 — active/hover state
};

// Identity swatches for member avatars — CONSTANT across themes (an identity hue
// must not shift with light/dark). Lives with the design tokens instead of being
// hardcoded in the component. Curated muted tones that read on the dark canvas.
export const avatarSwatches: { bg: string; fg: string }[] = [
  { bg: 'rgba(255, 200, 4, 0.14)',  fg: '#E9B71E' }, // gold
  { bg: 'rgba(82, 168, 120, 0.16)', fg: '#6FBF93' }, // green
  { bg: 'rgba(61, 143, 192, 0.16)', fg: '#5BA6D0' }, // blue
  { bg: 'rgba(124, 92, 191, 0.18)', fg: '#9B7FD0' }, // purple
  { bg: 'rgba(212, 160, 23, 0.16)', fg: '#D9B24A' }, // amber
  { bg: 'rgba(255, 255, 255, 0.07)', fg: '#C8C8C8' }, // slate
];

export const Colors = {
  light: {
    text: palette.black,
    background: palette.ivoryWarm,
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
    borderFocus: palette.lineFocus,
    muted: palette.ash,
  },
};

// ─── Polaris Typography ───────────────────────────────────────────────────────
// Display/Headings: GrandisExtended (Manual de Marca Polaris — Orgánico Studio 2024)
// Body:             Inter
// Mono/Data:        Space Mono
// Fallback chain:   GrandisExtended → Poppins → Arial (Manual de Marca, p.escala)
export const Fonts = {
  sans:            Platform.select({ web: "'Inter', sans-serif",                             default: 'Inter_400Regular'             }),
  sansBold:        Platform.select({ web: "'Inter', sans-serif",                             default: 'Inter_700Bold'                }),
  display:         Platform.select({ web: "'GrandisExtended', 'Poppins', sans-serif",        default: 'GrandisExtended-Bold'         }),
  displayMedium:   Platform.select({ web: "'GrandisExtended', 'Poppins', sans-serif",        default: 'GrandisExtended-Medium'       }),
  displayRegular:  Platform.select({ web: "'GrandisExtended', 'Poppins', sans-serif",        default: 'GrandisExtended-Regular'      }),
  displayLight:    Platform.select({ web: "'GrandisExtended', 'Poppins', sans-serif",        default: 'GrandisExtended-Light'        }),
  displayBlack:    Platform.select({ web: "'GrandisExtended', 'Poppins', sans-serif",        default: 'GrandisExtended-Black'        }),
  displayFallback: Platform.select({ web: "'Poppins', 'Arial', sans-serif",                  default: 'Inter_700Bold'                }),
  mono:            Platform.select({ web: "'Space Mono', monospace",                         default: 'SpaceMono_400Regular'         }),
};

// ─── Typography scale ─────────────────────────────────────────────────────────
// GrandisExtended has multiple weights — use them for hierarchy.
// Brand rule: UPPERCASE for all GrandisExtended display headings/labels.
// Weight scale: Black(900) > Bold(700) > Medium(500) > Regular(400) > Light(300)
export const typography = {
  // Editorial hero — splash screens, player full screens
  hero: {
    fontFamily: Fonts.displayBlack,
    fontSize:   34,
    lineHeight: 40,
    fontWeight: '900' as const,
    letterSpacing: 2.0,
    textTransform: 'uppercase' as const,
  },
  // Major screen title (header bars)
  title: {
    fontFamily: Fonts.display,
    fontSize:   20,
    lineHeight: 26,
    fontWeight: '700' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  // Card headings, section titles
  section: {
    fontFamily: Fonts.displayMedium,
    fontSize:   11,
    lineHeight: 16,
    fontWeight: '500' as const,
    letterSpacing: 2.0,
    textTransform: 'uppercase' as const,
  },
  // Micro labels, pills, tags
  label: {
    fontFamily: Fonts.displayRegular,
    fontSize:   9,
    lineHeight: 13,
    fontWeight: '400' as const,
    letterSpacing: 1.8,
    textTransform: 'uppercase' as const,
  },
  // Body copy — comfortable reading
  body: {
    fontFamily: Fonts.sans,
    fontSize:   14,
    lineHeight: 22,   // 1.57 ratio
  },
  caption: {
    fontFamily: Fonts.sans,
    fontSize:   12,
    lineHeight: 18,
  },
  // Data, metrics, timestamps
  mono: {
    fontFamily: Fonts.mono,
    fontSize:   11,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  // Giant KPI display numbers
  display: {
    fontFamily: Fonts.display,
    fontSize:   52,
    lineHeight: 58,
    fontWeight: '400' as const,
    letterSpacing: 2,
  },
  // Mid-size metric numbers
  metric: {
    fontFamily: Fonts.display,
    fontSize:   32,
    lineHeight: 38,
    fontWeight: '400' as const,
    letterSpacing: 1,
  },
};

// ─── Spacing system (8pt grid — consistent with Material + Apple HIG) ─────────
export const spacing = {
  xs:      4,
  sm:      8,
  md:      12,
  lg:      16,
  xl:      24,
  xxl:     32,
  xxxl:    48,
  section: 40,
};

// ─── Border radius (quiet luxury — soft but not bubbly) ───────────────────────
// Upgraded from near-zero (2-3px) to premium rounded (8-12px).
// Sharp corners = military tactical. Soft-sharp = premium, calm.
export const radii = {
  none: 0,
  xs:   4,    // small chips, tiny pills
  sm:   8,    // buttons, small cards
  md:   12,   // standard cards, panels (was 3px!)
  lg:   16,   // large cards, modals
  xl:   20,   // hero sections
  pill: 9999,
};

// ─── Surface presets ──────────────────────────────────────────────────────────
export const surfaces = {
  card: {
    backgroundColor: palette.graphite,         // #111111
    borderColor:     palette.line,              // rgba(255,255,255,0.07) — neutral
    borderWidth: 1,
    borderRadius: radii.md,                     // 12px
  },
  premiumCard: {
    backgroundColor: palette.graphite,
    borderColor:     palette.line,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  // Elevated surface (modals, sheets)
  elevated: {
    backgroundColor: palette.graphiteLight,
    borderColor:     palette.lineSoft,
    borderWidth: 1,
    borderRadius: radii.lg,
  },
};

// ─── Semantic token map (structured, spec-aligned) ──────────────────────────
// Use these in new components. Existing code uses `palette.*` directly — both are valid.
export const theme = {
  colors: {
    bg: {
      base:    '#080808',                        // absolute canvas
      elevated:'#141414',                        // cards, modals  (≈ graphite)
      subtle:  '#1C1C1C',                        // inputs, hover  (≈ overlay)
      overlay: 'rgba(0,0,0,0.70)',
    },
    text: {
      primary:   '#EBEBEB',                      // ≈ palette.ivory
      secondary: '#888888',                      // mid-hierarchy
      muted:     '#555555',                      // ≈ palette.smoke
      inverse:   '#080808',
    },
    accent: {
      gold:    '#FFC804',
      goldGlow:'rgba(255,200,4,0.12)',
      goldDim: 'rgba(255,200,4,0.40)',
    },
    border: {
      default: 'rgba(255,255,255,0.06)',         // ≈ palette.line
      subtle:  'rgba(255,255,255,0.03)',         // ≈ palette.lineSoft
      gold:    'rgba(255,200,4,0.30)',           // ≈ palette.lineGold
    },
    status: {
      success: '#52A878',                        // ≈ palette.success
      warning: '#D4A017',                        // ≈ palette.warning
      error:   '#C0392B',                        // ≈ palette.danger
      high:    '#E8703A',                        // churn high
      critical:'#C0392B',                        // churn critical
      info:    '#3D8FC0',                        // ≈ palette.info
    },
  },
  spacing: {
    xs:  4, sm:  8, md: 12, lg: 16,
    xl: 24, '2xl': 32, '3xl': 48, '4xl': 64,
  },
  radius: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 24, full: 999,
  },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.40,
      shadowRadius: 8,
      elevation: 4,
    },
    cardElevated: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.60,
      shadowRadius: 24,
      elevation: 12,
    },
    gold: {
      shadowColor: '#FFC804',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 0,
    },
  },
} as const;

// ─── Animation tokens (Reanimated spring configs) ─────────────────────────────
export const animation = {
  spring: {
    press:  { damping: 15, stiffness: 300, mass: 0.8 },
    entry:  { damping: 20, stiffness: 200, mass: 1.0 },
    bounce: { damping: 10, stiffness: 150, mass: 1.0 },
  },
  duration: {
    instant:  80,
    fast:     150,
    normal:   250,
    slow:     400,
  },
  stagger: {
    list: 50,
    grid: 60,
  },
};
