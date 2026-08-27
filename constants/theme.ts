import { Platform } from 'react-native';
import { alpha, cv } from './themeColors';

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
  // ── Paper — CONSTANT blanco. La contrapartida de `ink`: texto/iconos que van
  //    SOBRE un relleno de color oscuro (danger, purple) y deben seguir siendo
  //    blancos en los dos temas. `palette.ivory` NO sirve ahí: en claro vale
  //    #0F0F0F y pinta texto negro sobre rojo.
  paper:          '#FFFFFF',

  // ── Brand accent (Philippine Yellow) — themeable por el EJE SEÑAL ────────────
  // Dejó de ser constante: el eje `data-signal` permite cambiarlo a ámbar
  // (#EDBA01, el segundo oro del manual) sin tocar una sola pantalla. En nativo
  // cv() devuelve el hex real, así que nativo se queda en Philippine Yellow.
  //
  // ⚠ Para opacidades NO concatenes (`palette.gold + '44'`): en web el token es
  //   `var(--c-gold)` y `var(--c-gold)44` no es CSS válido — el color se pierde
  //   en silencio. Usa `alpha(palette.gold, '44')` de themeColors.ts.
  gold:           cv('--c-gold',             '#FFC804'),   // FILLS: CTA, estados activos, métricas clave
  goldLight:      cv('--c-gold-light',       'rgba(255, 200, 4, 0.12)'),   // fondos tintados
  goldMuted:      cv('--c-gold-muted',       'rgba(255, 200, 4, 0.60)'),   // oro secundario
  goldDim:        '#EDBA01',   // variante fija (no participa del eje)
  // Oro CONSTANTE en hex. Existe SOLO para los interpoladores de Reanimated:
  // no saben leer `var()`, y pasarles el token tematizable colapsa el rango de
  // salida y mata la pantalla entera en web (ver __tests__/unit/themeVarInAnimation).
  // Consecuencia asumida: una animación con este token no sigue el eje de señal.
  goldStatic:     '#FFC804',
  goldGlow:       cv('--c-gold-glow',        'rgba(255, 200, 4, 0.08)'),   // resplandores
  // gold AS TEXT/icon sobre una superficie — el oro brillante sobre crema falla
  // contraste, así que el fondo claro lo cambia a ámbar profundo. Para color:,
  // NUNCA para rellenos (ahí va palette.gold).
  goldText:       cv('--c-gold-text', '#FFC804'),

  // ── Text hierarchy — themeable ───────────────────────────────────────────────
  ivory:          cv('--c-text',       '#EBEBEB'),   // primary text
  ivoryWarm:      cv('--c-text-warm',  '#F0EBE0'),   // warm off-white for special headings
  ivoryDim:       cv('--c-text-dim',   'rgba(235, 235, 235, 0.55)'), // dimmed text
  // Mapa corporal: la silueta y el borde de sus zonas tactiles. Son tokens y
  // no hex porque en tema claro la silueta se oscurece y el borde se invierte
  // -- con los valores del tema oscuro, en claro no se veia ninguno de los dos.
  silhouette:     cv('--c-silhouette',  '#5F5F5F'),
  zoneBorder:     cv('--c-zone-border', 'rgba(255,255,255,0.38)'),
  ash:            cv('--c-text-2',     '#AAAAAA'),   // secondary text
  smoke:          cv('--c-text-3',     '#898989'),   // tertiary/placeholder text — AA sobre TODA la rampa, incluida charcoal (antes 4.49:1 ahí).
  muted:          cv('--c-text-faint', '#444444'),   // disabled, locked states

  // ── Borders — themeable ──────────────────────────────────────────────────────
  line:           cv('--c-border',       'rgba(255, 255, 255, 0.07)'),  // DEFAULT card border
  lineSoft:       cv('--c-border-soft',  'rgba(255, 255, 255, 0.05)'),  // extra-subtle separators
  lineHard:       cv('--c-border-hard',  'rgba(255, 255, 255, 0.13)'),  // focus, emphasis borders
  lineFocus:      cv('--c-border-focus', 'rgba(255, 255, 255, 0.20)'),  // input focus rings
  lineGold:       cv('--c-line-gold',        'rgba(255, 200, 4, 0.30)'),   // bordes dorados (con moderación)
  lineGoldSubtle: cv('--c-line-gold-subtle', 'rgba(255, 200, 4, 0.15)'),   // acento dorado muy sutil

  // ── Semantic — themeable por el EJE SEÑAL ────────────────────────────────────
  // `semaforo` los desatura para que convivan con el oro (modelo WHOOP: cada
  // matiz significa algo). Las opacidades van por alpha(), no por concatenación.
  //
  // Los `*Muted` se DERIVAN del token, no se escriben aparte: eran rgba fijos y
  // por tanto no seguían el eje. Con `semaforo` el borde y el texto de un chip
  // cambiaban de verde pero su relleno se quedaba en el verde anterior.
  success:        cv('--c-success', '#52A878'),
  successMuted:   alpha(cv('--c-success', '#52A878'), '26'),   // 0x26 ≈ 15%
  danger:         cv('--c-danger',  '#D54F42'),
  dangerMuted:    alpha(cv('--c-danger', '#D54F42'), '26'),
  // Acento de RECUPERACIÓN. En casi todas las señales es el mismo oro; en
  // `calma` pasa a azul sereno para separar el lenguaje de empuje del de
  // restaurar (modelo Calm). Úsalo en bienestar/biometría, no en CTAs.
  calm:           cv('--c-calm',    '#FFC804'),
  // danger AS TEXT — themeable, mismo patrón que goldText. El rojo de acento es
  // demasiado oscuro para llevar copy sobre superficie oscura, de ahí este token
  // aparte. Cada fondo define el suyo; themeContrast.test.ts fija que TODOS
  // llegan a AA sobre las cinco superficies, no solo sobre la tarjeta base.
  dangerText:     cv('--c-danger-text', '#E65C51'),
  warning:        cv('--c-warning', '#D4A017'),
  // El cuarto semántico. Era hex constante y por eso era IMPOSIBLE que pasara
  // AA en los dos temas: sobre #111111 hace falta luminancia >= 0.201 y sobre
  // blanco <= 0.183. Ningún color cumple ambas — de ahí que sea un token.
  info:           cv('--c-info', '#5B9FD4'),

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

/**
 * Registra GrandisExtended en web. Idempotente; no-op en nativo (allí las carga
 * `useFonts` desde assets/fonts/).
 *
 * POR QUE EN TIEMPO DE EJECUCION Y NO EN `app/+html.tsx`: el @font-face vivía
 * allí y NUNCA llegó a producción — `expo export --platform web` genera la
 * plantilla por defecto de Expo (1.2 KB, `lang="en"`, sin <style>), así que toda
 * la PWA se renderizaba con la fuente de sustitución. Se verificó midiendo
 * `document.fonts` en el navegador: solo contenía `material`. Encima las URLs
 * apuntaban a `/assets/fonts/…`, que da 404 — el servidor las publica bajo
 * `/assets/assets/fonts/…`.
 *
 * Los .ttf se sirven desde `public/fonts/`, que Expo copia VERBATIM a `dist/`:
 * la misma ruta resuelve en el servidor de desarrollo y en el build. Es el mismo
 * mecanismo que `injectThemeVars()`, que ya demostró funcionar.
 */
export function injectBrandFont(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('polaris-brand-font')) return;

  const faces: [string, number][] = [
    ['Light', 300], ['Regular', 400], ['Medium', 500], ['Bold', 700], ['Black', 900],
  ];
  const style = document.createElement('style');
  style.id = 'polaris-brand-font';
  style.textContent = faces
    .map(
      ([name, weight]) =>
        `@font-face{font-family:'GrandisExtended';` +
        `src:url('/fonts/GrandisExtended-${name}.ttf') format('truetype');` +
        // swap, no block: antes de que cargue se ve Poppins/Arial, no un hueco.
        `font-weight:${weight};font-style:normal;font-display:swap}`,
    )
    .join('');
  document.head.appendChild(style);
}

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
  // La frase que le pertenece al usuario — su lectura, su acto, su compromiso.
  //
  // POR QUÉ EXISTE: la jerarquía estaba invertida. Las etiquetas administrativas
  // ("¿DÓNDE LO SIENTES?", "LECTURA DEL SISTEMA") gritaban en versalitas
  // rastreadas, y la frase que la app le devuelve sobre su propio cuerpo se
  // susurraba en `body` a 14px — el mismo tamaño que un pie de tarjeta. Lo
  // administrativo mandaba sobre lo íntimo.
  //
  // NO es uppercase, a diferencia del resto de la escala display: es una frase,
  // no un rótulo. Versalitas a este tamaño se leen como un grito y GrandisExtended
  // ya es una tipografía ancha. Light (300) por lo mismo — el peso lo da el
  // tamaño, no la tinta.
  //
  // 26px es el techo real dentro de una tarjeta a 375px. Medido en el navegador
  // con esta misma cara y tracking: 11.3px por carácter → 26 caracteres por
  // línea dentro de la tarjeta, 28 a ancho de pantalla. A los 44px que pedía la
  // primera propuesta caen a 15 por línea, y ahí una frase de dos oraciones se
  // parte en cuatro renglones rotos.
  statement: {
    fontFamily: Fonts.displayLight,
    fontSize:   26,
    lineHeight: 34,
    fontWeight: '300' as const,
    letterSpacing: -0.2,
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
/**
 * Tamaño de un titular display que CABE en el ancho disponible.
 *
 * POR QUE EXISTE: GrandisExtended es una tipografía *extended* — mide ~21% más
 * que Arial al mismo cuerpo (medido: 711px vs 588px). Los titulares se
 * dimensionaron con números fijos mientras la fuente de marca no cargaba en web
 * (ver `injectBrandFont`), así que encajaban con el sustituto y NO con la real.
 * Al arreglar la fuente, el hero de bienvenida partía palabras en móvil:
 * "SISTEM / A / INTERN / O.".
 *
 * Un titular no debe partir una palabra nunca. En vez de bajar el cuerpo a ojo
 * hasta que "se vea bien" en un teléfono concreto, se deriva del ancho real.
 *
 * @param available  ancho útil en px (viewport menos padding horizontal)
 * @param longestWord  nº de caracteres de la palabra más larga del titular
 * @param max  cuerpo de diseño; nunca se sube por encima
 */
export function fitDisplaySize(available: number, longestWord: number, max: number): number {
  // 0.78 em/carácter medido sobre GrandisExtended Bold en mayúsculas, con un
  // margen sobre el 0.74 real para acomodar letras anchas (M, W) y el redondeo.
  const perChar = 0.78;
  return Math.max(20, Math.min(max, Math.floor(available / (longestWord * perChar))));
}

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
/**
 * Caja tactil de 44 sin mover el dibujo de sitio.
 *
 * POR QUE NO `hitSlop`: react-native-web NO LO IMPLEMENTA. Verificado en
 * `node_modules/react-native-web` -- la propiedad no aparece por ningun lado.
 * Cada `hitSlop` del repositorio es correcto en iOS y Android y un no-op en la
 * PWA, que es una de las tres plataformas que se publican. Una mitigacion de
 * accesibilidad que no se aplica en un tercio de los usuarios no es una
 * mitigacion, es una nota al pie.
 *
 * COMO FUNCIONA: el elemento tocable crece a 44 y el margen negativo devuelve
 * los pixeles al layout, asi que el dibujo queda donde estaba. `padding` no
 * sirve: RNW usa `box-sizing: border-box` y con `width` fijo el relleno come
 * hacia dentro en vez de crecer hacia fuera.
 *
 * USO: va en el Pressable; el circulo o icono pasa a ser un hijo.
 *
 *     <Pressable style={hitBox(28)}>
 *       <View style={styles.circulo} />
 *     </Pressable>
 */
export function hitBox(visual: number) {
  const sobra = Math.max(0, 44 - visual) / 2;
  return {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    margin: -sobra,
  };
}

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

// ─── Easing "de la casa" ────────────────────────────────────────────────────
// Ya se usaba repetido e igual, sin estar centralizado (comando.tsx dial,
// polaris.tsx sparkline, focus-deck.tsx): ease-out fuerte, no el
// `Easing.ease` plano de fábrica — arranca movido desde el primer frame, que
// es el instante que el ojo mira. Nunca ease-in en UI.
//
// Puntos de control crudos, NO un Easing ya construido: theme.ts es un
// archivo foundational que importan módulos que nunca tocan animación (lógica
// pura, pantallas admin). Importar 'react-native-reanimated' aquí arrastra su
// rama web (createAnimatedComponent) y revienta "document is not defined" en
// cualquier test que fuerce Platform.OS='web' sin mock local de reanimated —
// pasó en 5 suites reales. Igual que `animation.spring.*` más abajo: theme.ts
// da datos, cada consumidor arma su propio Easing.bezier(...EASING_HOUSE) con
// el Reanimated que YA importa para sus withTiming/useAnimatedStyle.
export const EASING_HOUSE = [0.23, 1, 0.32, 1] as const;

// Duraciones nombradas para usar junto a EASING_HOUSE. `sweep` reproduce el
// número real que ya comparten el dial de comando.tsx y el sparkline de
// polaris.tsx ("firma de barrido de la casa": 700ms) — no un redondeo nuevo.
export const DURATION_HOUSE = {
  selection: 200,  // toggle de chip/selección
  sweep: 700,      // barrido de contador/sparkline/dial
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
