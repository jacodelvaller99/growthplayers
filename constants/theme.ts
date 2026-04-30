import { Platform } from 'react-native';

// ─── Polaris Brand Colors (Manual de Marca, Orgánico Studio 2024) ──────────────
// Philippine Yellow  #FFC804  PANTONE 7548 C  — primary accent
// Smoky Black        #0F0F0F  PANTONE Black 6 C — background
// Dark Silver        #6D6D6D  PANTONE 424 C — secondary text
export const palette = {
  // ── Base backgrounds (depth layers, darkest → lightest) ──────────────────────
  black:          '#090909',   // base canvas — deepest black
  blackDeep:      '#050505',   // absolute dark (player fullscreens)
  graphite:       '#111111',   // card/panel background (was #171717)
  graphiteLight:  '#181818',   // elevated surface (modals, drawers)
  charcoal:       '#222222',   // hover state, subtle separators
  overlay:        '#1C1C1C',   // overlays

  // ── Brand accent (Philippine Yellow — used sparingly, intentionally) ─────────
  gold:           '#FFC804',   // CTA buttons, active states, key metrics ONLY
  goldLight:      'rgba(255, 200, 4, 0.12)',   // tinted backgrounds
  goldMuted:      'rgba(255, 200, 4, 0.60)',   // secondary gold usage
  goldDim:        '#EDBA01',   // slightly darker variant
  goldGlow:       'rgba(255, 200, 4, 0.08)',   // glow effects

  // ── Text hierarchy (NEVER pure white — reduces halo effect) ─────────────────
  ivory:          '#EBEBEB',   // primary text (was #F5F0E6 — now neutral off-white)
  ivoryWarm:      '#F0EBE0',   // warm off-white for special headings
  ivoryDim:       'rgba(235, 235, 235, 0.55)', // dimmed text
  ash:            '#AAAAAA',   // secondary text (was #C9C9C9 — now more muted)
  smoke:          '#666666',   // tertiary/placeholder text (was #6D6D6D)
  muted:          '#444444',   // disabled, locked states

  // ── Borders (almost invisible — luxury is in what you DON'T see) ──────────────
  line:           'rgba(255, 255, 255, 0.07)',  // DEFAULT card border (was yellow-tinted!)
  lineSoft:       'rgba(255, 255, 255, 0.05)',  // extra-subtle separators
  lineHard:       'rgba(255, 255, 255, 0.13)',  // focus, emphasis borders
  lineFocus:      'rgba(255, 255, 255, 0.20)',  // input focus rings
  lineGold:       'rgba(255, 200, 4, 0.30)',    // gold borders (use sparingly)
  lineGoldSubtle: 'rgba(255, 200, 4, 0.15)',    // very subtle gold accent

  // ── Semantic ─────────────────────────────────────────────────────────────────
  success:        '#52A878',
  successMuted:   'rgba(82, 168, 120, 0.15)',
  danger:         '#C0392B',
  dangerMuted:    'rgba(192, 57, 43, 0.15)',
  warning:        '#D4A017',
  info:           '#3D8FC0',
};

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
// Display/Headings: Michroma (Google Fonts — brand approved)
// Body:             Inter
// Mono/Data:        Space Mono
export const Fonts = {
  sans:         Platform.select({ web: "'Inter', sans-serif",        default: 'Inter_400Regular'    }),
  sansBold:     Platform.select({ web: "'Inter', sans-serif",        default: 'Inter_700Bold'       }),
  display:      Platform.select({ web: "'Michroma', sans-serif",     default: 'Michroma_400Regular' }),
  displayFallback: Platform.select({ web: "'Inter', sans-serif",     default: 'Inter_700Bold'       }),
  mono:         Platform.select({ web: "'Space Mono', monospace",    default: 'SpaceMono_400Regular'}),
};

// ─── Typography scale ─────────────────────────────────────────────────────────
// Michroma is a single-weight display typeface — hierarchy via size + spacing.
// Brand rule: UPPERCASE for all Michroma headings/labels.
export const typography = {
  // Editorial hero — splash screens, player full screens
  hero: {
    fontFamily: Fonts.display,
    fontSize:   34,
    lineHeight: 40,
    fontWeight: '400' as const,
    letterSpacing: 2.5,
    textTransform: 'uppercase' as const,
  },
  // Major screen title (header bars)
  title: {
    fontFamily: Fonts.display,
    fontSize:   20,
    lineHeight: 26,
    fontWeight: '400' as const,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  // Card headings, section titles
  section: {
    fontFamily: Fonts.display,
    fontSize:   11,
    lineHeight: 16,
    fontWeight: '400' as const,
    letterSpacing: 2.5,
    textTransform: 'uppercase' as const,
  },
  // Micro labels, pills, tags
  label: {
    fontFamily: Fonts.display,
    fontSize:   9,
    lineHeight: 13,
    fontWeight: '400' as const,
    letterSpacing: 2,
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
  // Accent card — thin left gold border (brand identity element)
  accentCard: {
    backgroundColor:    palette.graphite,
    borderLeftColor:    palette.gold,
    borderLeftWidth:    2,
    borderTopColor:     'transparent',
    borderRightColor:   'transparent',
    borderBottomColor:  'transparent',
    borderWidth: 0,
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
