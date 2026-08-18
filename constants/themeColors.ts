/**
 * themeColors.ts — Temas por variables CSS (web), en DOS EJES independientes.
 *
 * Cómo funciona:
 *   Los tokens de theme.ts resuelven a `var(--c-*)` en web. Este módulo inyecta
 *   un <style> con los valores de cada eje, y el eje activo se elige con dos
 *   atributos en <html>:
 *
 *     data-theme="dark|light|carbon|aura"   ← EJE 1 · FONDO   (la tinta)
 *     data-signal="oro|ambar|semaforo|calma" ← EJE 2 · SEÑAL   (qué comunica el color)
 *
 *   Son atributos SEPARADOS a propósito: las custom properties se fusionan por
 *   cascada, así que 4 fondos × 4 señales = 16 combinaciones sin escribir 16
 *   bloques. Cada pantalla re-tematiza sola porque ya referencia palette.*.
 *
 *   Nativo (iOS/Android) conserva los hex reales (StyleSheet estático), así que
 *   nativo se queda en oscuro/oro: los dos ejes son una función de web/escritorio.
 *
 * Por qué el oro AHORA sí es variable:
 *   Antes era constante porque el código concatena opacidad (`palette.gold + '44'`)
 *   y `var(--c-gold)44` no es CSS válido. Eso lo resuelve `alpha()` (abajo) con
 *   `color-mix`, que sí funciona sobre var(). Sin ese helper, volver el oro
 *   variable rompe en silencio ~18 sitios.
 */
import { Platform } from 'react-native';

export type BackdropId = 'dark' | 'light' | 'carbon' | 'aura';
export type SignalId = 'oro' | 'ambar' | 'semaforo' | 'calma';

// ─── EJE 1 · FONDO — neutros, texto y bordes ──────────────────────────────────
// `dark` y `light` conservan exactamente los valores que ya estaban en producción:
// esta ampliación NO cambia el aspecto por defecto de la app.
export const THEME_VARS: Record<BackdropId, Record<string, string>> = {
  dark: {
    '--c-bg':           '#090909',
    '--c-bg-deep':      '#050505',
    '--c-surface':      '#111111',
    '--c-surface-2':    '#181818',
    '--c-surface-3':    '#222222',
    '--c-overlay':      '#1C1C1C',
    '--c-text':         '#EBEBEB',
    '--c-text-warm':    '#F0EBE0',
    '--c-text-dim':     'rgba(235,235,235,0.55)',
    '--c-text-2':       '#AAAAAA',
    '--c-text-3':       '#888888',
    '--c-text-faint':   '#444444',
    '--c-border':       'rgba(255,255,255,0.07)',
    '--c-border-soft':  'rgba(255,255,255,0.05)',
    '--c-border-hard':  'rgba(255,255,255,0.13)',
    '--c-border-focus': 'rgba(255,255,255,0.20)',
    // rojo de error AS TEXT sobre superficie oscura. El #C0392B de palette.danger
    // solo da 3.47:1 sobre #111111 — falla AA (4.5:1) en cada mensaje de error.
    // Este tono aclarado da 5.18:1 sobre #111111 y 4.87:1 sobre #181818 (elevado).
    '--c-danger-text':  '#E5564A',
    // La silueta del mapa corporal y el borde de sus zonas. Son tokens y no hex
    // porque en tema claro la silueta gris quedaba sobre superficie blanca y el
    // borde blanco al 38% desaparecía.
    '--c-silhouette':   '#5F5F5F',
    '--c-zone-border':  'rgba(255,255,255,0.38)',
  },
  light: {
    '--c-bg':           '#F5F3EE',
    '--c-bg-deep':      '#ECE8DF',
    '--c-surface':      '#FFFFFF',
    '--c-surface-2':    '#FBF9F4',
    '--c-surface-3':    '#F0ECE3',
    '--c-overlay':      '#E8E3D9',
    '--c-text':         '#0D0D0D',
    '--c-text-warm':    '#1A1A1A',
    '--c-text-dim':     'rgba(13,13,13,0.55)',
    '--c-text-2':       '#4A4A4A',
    '--c-text-3':       '#6B6B6B',
    '--c-text-faint':   '#9A9A9A',
    '--c-border':       'rgba(13,13,13,0.10)',
    '--c-border-soft':  'rgba(13,13,13,0.06)',
    '--c-border-hard':  'rgba(13,13,13,0.15)',
    '--c-border-focus': 'rgba(13,13,13,0.22)',
    // En claro el rojo original SÍ pasa (4.90:1 sobre #F5F3EE, 5.44:1 sobre #FFFFFF).
    '--c-danger-text':  '#C0392B',
    '--c-silhouette':   '#B4B0A6',
    '--c-zone-border':  'rgba(13,13,13,0.42)',
  },
  // CARBÓN — la misma familia oscura, sesgada al oro. El neutro deja de ser gris
  // puro (que se lee como "sin decidir") y toma el matiz de la marca: menos
  // quirófano, más cuero. Derivado, no del manual: el manual entrega SEIS colores
  // y ninguna rampa de superficies.
  carbon: {
    '--c-bg':           '#100F0C',
    '--c-bg-deep':      '#0B0A08',
    '--c-surface':      '#191712',
    '--c-surface-2':    '#221F18',
    '--c-surface-3':    '#2B2720',
    '--c-overlay':      '#241F17',
    '--c-text':         '#EBE7DE',
    '--c-text-warm':    '#F2EDE1',
    '--c-text-dim':     'rgba(235,231,222,0.55)',
    '--c-text-2':       '#C9C3B4',
    '--c-text-3':       '#948E7E',
    '--c-text-faint':   '#4A463D',
    '--c-border':       'rgba(230,220,190,0.10)',
    '--c-border-soft':  'rgba(230,220,190,0.06)',
    '--c-border-hard':  'rgba(230,220,190,0.18)',
    '--c-border-focus': 'rgba(230,220,190,0.26)',
    '--c-danger-text':  '#E5564A',
    '--c-silhouette':   '#655F52',
    '--c-zone-border':  'rgba(235,231,222,0.38)',
  },
  // AURA — negro más profundo para que el resplandor radial (ver buildThemeCSS)
  // tenga rango donde vivir. Es el vocabulario de las apps de bienestar
  // (atmósfera) sin salir de la paleta ni añadir un matiz nuevo.
  aura: {
    '--c-bg':           '#0A0A0A',
    '--c-bg-deep':      '#050505',
    '--c-surface':      '#131313',
    '--c-surface-2':    '#1B1B1B',
    '--c-surface-3':    '#232323',
    '--c-overlay':      '#1E1E1E',
    '--c-text':         '#E6E6E6',
    '--c-text-warm':    '#F0EBE0',
    '--c-text-dim':     'rgba(230,230,230,0.55)',
    '--c-text-2':       '#C9C9C9',
    '--c-text-3':       '#949494',
    '--c-text-faint':   '#4A4A4A',
    '--c-border':       'rgba(230,230,230,0.08)',
    '--c-border-soft':  'rgba(230,230,230,0.05)',
    '--c-border-hard':  'rgba(230,230,230,0.16)',
    '--c-border-focus': 'rgba(230,230,230,0.24)',
    '--c-danger-text':  '#E5564A',
    '--c-silhouette':   '#5F5F5F',
    '--c-zone-border':  'rgba(255,255,255,0.38)',
  },
};

// ─── EJE 2 · SEÑAL — acento de marca + qué significa cada estado ───────────────
// `oro` reproduce EXACTAMENTE los valores que la app ya usaba: cambiar de eje
// nunca es una regresión respecto al punto de partida.
export const SIGNAL_VARS: Record<SignalId, Record<string, string>> = {
  oro: {
    '--c-gold':             '#FFC804',   // Philippine Yellow · PANTONE 7548 C
    '--c-gold-light':       'rgba(255,200,4,0.12)',
    '--c-gold-muted':       'rgba(255,200,4,0.60)',
    '--c-gold-glow':        'rgba(255,200,4,0.08)',
    '--c-line-gold':        'rgba(255,200,4,0.30)',
    '--c-line-gold-subtle': 'rgba(255,200,4,0.15)',
    '--c-gold-text':        '#FFC804',
    '--c-success':          '#52A878',
    '--c-warning':          '#D4A017',
    '--c-danger':           '#C0392B',
    '--c-calm':             '#FFC804',   // sin voz aparte: recuperar también es oro
  },
  // ÁMBAR — el segundo oro del manual (#EDBA01) toma el mando. Menos neón, más
  // metal. Mismo matiz de marca, un paso más profundo.
  ambar: {
    '--c-gold':             '#EDBA01',
    '--c-gold-light':       'rgba(237,186,1,0.12)',
    '--c-gold-muted':       'rgba(237,186,1,0.60)',
    '--c-gold-glow':        'rgba(237,186,1,0.09)',
    '--c-line-gold':        'rgba(237,186,1,0.30)',
    '--c-line-gold-subtle': 'rgba(237,186,1,0.15)',
    '--c-gold-text':        '#EDBA01',
    '--c-success':          '#52A878',
    '--c-warning':          '#D4A017',
    '--c-danger':           '#C0392B',
    '--c-calm':             '#EDBA01',
  },
  // SEMÁFORO — modelo WHOOP: cada matiz significa algo (recuperado / medio /
  // riesgo). Desaturados A PROPÓSITO: a plena saturación pelean con el oro y la
  // pantalla se vuelve un semáforo de feria.
  semaforo: {
    '--c-gold':             '#FFC804',
    '--c-gold-light':       'rgba(255,200,4,0.12)',
    '--c-gold-muted':       'rgba(255,200,4,0.60)',
    '--c-gold-glow':        'rgba(255,200,4,0.08)',
    '--c-line-gold':        'rgba(255,200,4,0.30)',
    '--c-line-gold-subtle': 'rgba(255,200,4,0.15)',
    '--c-gold-text':        '#FFC804',
    '--c-success':          '#7FA87F',
    '--c-warning':          '#D9A441',
    '--c-danger':           '#C46B52',
    '--c-calm':             '#7FA87F',
  },
  // CALMA — dos voces: el oro exige, el azul sereno restaura. Separa el lenguaje
  // de empuje del de recuperación (modelo Calm/Headspace). El oro NO se toca.
  calma: {
    '--c-gold':             '#FFC804',
    '--c-gold-light':       'rgba(255,200,4,0.12)',
    '--c-gold-muted':       'rgba(255,200,4,0.60)',
    '--c-gold-glow':        'rgba(255,200,4,0.08)',
    '--c-line-gold':        'rgba(255,200,4,0.30)',
    '--c-line-gold-subtle': 'rgba(255,200,4,0.15)',
    '--c-gold-text':        '#FFC804',
    '--c-success':          '#52A878',
    '--c-warning':          '#D4A017',
    '--c-danger':           '#C0392B',
    '--c-calm':             '#6B8CA8',   // la voz de Recuperación
  },
};

// ─── Contraste sobre fondo CLARO ──────────────────────────────────────────────
// El oro como TEXTO sobre claro es ilegible (#FFC804 mide 1.8:1 sobre crema).
// Cada señal necesita su propia versión oscurecida del MISMO matiz. Selector de
// dos atributos (0,2,0) para que gane sobre el bloque de señal (0,1,0).
export const LIGHT_SIGNAL_OVERRIDES: Record<SignalId, Record<string, string>> = {
  oro:      { '--c-gold-text': '#8A6500', '--c-calm': '#8A6500' },
  ambar:    { '--c-gold-text': '#7A5A00', '--c-calm': '#7A5A00' },
  semaforo: { '--c-gold-text': '#8A6500', '--c-success': '#3F6B4F', '--c-warning': '#8A6212', '--c-danger': '#9B4430', '--c-calm': '#3F6B4F' },
  calma:    { '--c-gold-text': '#8A6500', '--c-calm': '#3D5F7D' },
};

/** web helper: el token resuelve a variable CSS en web, hex real en nativo. */
export const cv = (varName: string, nativeHex: string): string =>
  Platform.OS === 'web' ? `var(${varName})` : nativeHex;

/**
 * Opacidad sobre un token de color.
 *
 * Reemplaza el patrón `palette.gold + '44'`, que se rompe en cuanto el token es
 * una variable CSS (`var(--c-gold)44` no es válido y el color desaparece sin
 * error). En web usa `color-mix`, que SÍ opera sobre var(); en nativo concatena
 * el hex como siempre.
 *
 * @param color  token de color (hex en nativo, `var(--x)` en web)
 * @param hexAlpha  dos dígitos hex, igual que la concatenación que reemplaza
 */
export function alpha(color: string, hexAlpha: string): string {
  if (Platform.OS !== 'web') return color + hexAlpha;
  const pct = Math.round((parseInt(hexAlpha, 16) / 255) * 100);
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

function block(selector: string, vars: Record<string, string>): string {
  const body = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
  return `${selector}{${body}}`;
}

/**
 * CSS completo de ambos ejes.
 *   :root = fondo oscuro + señal oro (el punto de partida actual, intacto)
 *   [data-theme=...]  = los otros fondos
 *   [data-signal=...] = las otras señales
 *   [data-theme="light"][data-signal=...] = arreglos de contraste sobre claro
 *   [data-theme="aura"] body = el resplandor radial (no es una variable: es una
 *     capa de fondo, y vive aquí para no tocar ninguna pantalla)
 */
export function buildThemeCSS(): string {
  const backdrops = (Object.keys(THEME_VARS) as BackdropId[])
    .map((id) =>
      block(id === 'dark' ? ':root,[data-theme="dark"]' : `[data-theme="${id}"]`, THEME_VARS[id]),
    )
    .join('');

  const signals = (Object.keys(SIGNAL_VARS) as SignalId[])
    .map((id) =>
      block(id === 'oro' ? ':root,[data-signal="oro"]' : `[data-signal="${id}"]`, SIGNAL_VARS[id]),
    )
    .join('');

  const lightFixes = (Object.keys(LIGHT_SIGNAL_OVERRIDES) as SignalId[])
    .map((id) => block(`[data-theme="light"][data-signal="${id}"]`, LIGHT_SIGNAL_OVERRIDES[id]))
    .join('');

  const auraLayer =
    '[data-theme="aura"] body{' +
    'background-image:' +
    'radial-gradient(ellipse 1100px 620px at 22% -8%, var(--c-gold-glow), transparent 58%),' +
    'radial-gradient(ellipse 800px 500px at 88% 12%, rgba(255,255,255,0.035), transparent 60%);' +
    'background-attachment:fixed;background-repeat:no-repeat}';

  return backdrops + signals + lightFixes + auraLayer;
}

/** Inyecta las variables en <head> una vez (solo web). Idempotente. */
export function injectThemeVars(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('polaris-theme-vars')) return;
  const style = document.createElement('style');
  style.id = 'polaris-theme-vars';
  style.textContent = buildThemeCSS();
  document.head.appendChild(style);
}
