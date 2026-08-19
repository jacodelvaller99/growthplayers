/**
 * themeColors.ts — Temas por variables CSS (web), en DOS EJES independientes.
 *
 * Cómo funciona:
 *   Los tokens de theme.ts resuelven a `var(--c-*)` en web. Este módulo inyecta
 *   un <style> con los valores de cada eje, y el eje activo se elige con dos
 *   atributos en <html>:
 *
 *     data-theme="dark|carbon|aura|tinta|pizarra|light"  ← EJE 1 · FONDO (la tinta)
 *     data-signal="oro|ambar|semaforo|calma|nitido"      ← EJE 2 · SEÑAL (qué comunica)
 *
 *   Son atributos SEPARADOS a propósito: las custom properties se fusionan por
 *   cascada, así que 6 fondos × 5 señales = 30 combinaciones a partir de 11
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

export type BackdropId = 'dark' | 'light' | 'carbon' | 'aura' | 'tinta' | 'pizarra' | 'bruma' | 'arena';
export type SignalId = 'oro' | 'ambar' | 'semaforo' | 'calma' | 'nitido' | 'sereno' | 'vital';

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
    '--c-text-3':       '#898989',
    '--c-text-faint':   '#444444',
    '--c-border':       'rgba(255,255,255,0.07)',
    '--c-border-soft':  'rgba(255,255,255,0.05)',
    '--c-border-hard':  'rgba(255,255,255,0.13)',
    '--c-border-focus': 'rgba(255,255,255,0.20)',
    // rojo de error AS TEXT sobre superficie oscura. El rojo de acento
    // (palette.danger) es demasiado oscuro para llevar copy — de ahí este token
    // aparte. Se aclaró un punto respecto a #E5564A: aquel medía 4.37:1 sobre
    // surface-3 (#222222), o sea que el mensaje de error dentro de una tarjeta
    // elevada era el único texto de la app por debajo de AA.
    '--c-danger-text':  '#E65C51',
    // La silueta del mapa corporal y el borde de sus zonas. Son tokens y no hex
    // porque en tema claro la silueta gris quedaba sobre superficie blanca y el
    // borde blanco al 38% desaparecía.
    '--c-silhouette':   '#5F5F5F',
    '--c-zone-border':  'rgba(255,255,255,0.38)',
  },
  // LUZ — reconstruido. Dos defectos medidos en la versión anterior:
  //
  //   1. La elevación estaba ROTA. `bg` (#F5F3EE, lum 0.897) caía ENTRE
  //      `surface-2` (0.948) y `surface-3` (0.841): una tarjeta surface-3 se
  //      leía como agujero y una surface-2 como elevación, en la misma pantalla.
  //      Ahora `bg` es el más oscuro de la familia y las superficies suben
  //      monótonamente (0.815 → 0.863 → 0.930 → 1.000), igual que en oscuro.
  //   2. `text-3` / `gold-text` / `warning` medían 4.17:1 sobre `overlay` —
  //      por debajo de AA. Ahora el mínimo de la rampa es 4.77:1.
  //
  // El matiz también cambió: el crema anterior era inventado. El manual entrega
  // neutros PUROS (#0F0F0F Smoky Black · #6D6D6D Dark Silver · #C9C9C9 ·
  // #E6E6E6), y son los que se usan aquí. El calor de la marca lo pone el oro,
  // no el papel. Lo fija __tests__/unit/themeContrast.test.ts.
  light: {
    '--c-bg':           '#E9E9E9',
    '--c-bg-deep':      '#DCDCDC',
    '--c-surface':      '#FFFFFF',
    '--c-surface-2':    '#F7F7F7',
    '--c-surface-3':    '#EFEFEF',
    '--c-overlay':      '#DEDEDE',
    '--c-text':         '#0F0F0F',
    '--c-text-warm':    '#1C1C1C',
    '--c-text-dim':     'rgba(15,15,15,0.58)',
    '--c-text-2':       '#3D3D3D',
    '--c-text-3':       '#5C5C5C',
    '--c-text-faint':   '#767676',
    '--c-border':       'rgba(15,15,15,0.12)',
    '--c-border-soft':  'rgba(15,15,15,0.07)',
    '--c-border-hard':  'rgba(15,15,15,0.18)',
    '--c-border-focus': 'rgba(15,15,15,0.26)',
    '--c-danger-text':  '#96341F',
    '--c-silhouette':   '#ADADAD',
    '--c-zone-border':  'rgba(15,15,15,0.42)',
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
    '--c-danger-text':  '#E7655A',
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
    '--c-danger-text':  '#E65C51',
    '--c-silhouette':   '#5F5F5F',
    '--c-zone-border':  'rgba(255,255,255,0.38)',
  },
  // TINTA — negro real (#000000). En pantallas OLED el píxel se apaga: negro
  // absoluto, batería más baja y un contraste que ninguna otra rampa alcanza.
  // Los bordes suben de opacidad a propósito: sin luz ambiente que rebote,
  // una línea al 7% sobre negro puro simplemente no existe.
  tinta: {
    '--c-bg':           '#000000',
    '--c-bg-deep':      '#000000',
    '--c-surface':      '#0C0C0C',
    '--c-surface-2':    '#161616',
    '--c-surface-3':    '#202020',
    '--c-overlay':      '#1A1A1A',
    '--c-text':         '#F4F4F4',
    '--c-text-warm':    '#F6F1E6',
    '--c-text-dim':     'rgba(244,244,244,0.58)',
    '--c-text-2':       '#BDBDBD',
    '--c-text-3':       '#949494',
    '--c-text-faint':   '#4E4E4E',
    '--c-border':       'rgba(255,255,255,0.11)',
    '--c-border-soft':  'rgba(255,255,255,0.07)',
    '--c-border-hard':  'rgba(255,255,255,0.20)',
    '--c-border-focus': 'rgba(255,255,255,0.30)',
    '--c-danger-text':  '#E5584C',
    '--c-silhouette':   '#666666',
    '--c-zone-border':  'rgba(255,255,255,0.42)',
  },
  // PIZARRA — el contrapunto frío de Carbón. Si Carbón sesga el neutro hacia el
  // oro, Pizarra lo sesga hacia el azul: baja la temperatura de la pantalla y el
  // oro resalta más por contraste de matiz. Es la misma derivación, en la otra
  // dirección — el manual no entrega rampa de superficies para ninguna de las dos.
  pizarra: {
    '--c-bg':           '#0B0E12',
    '--c-bg-deep':      '#07090C',
    '--c-surface':      '#12161C',
    '--c-surface-2':    '#1A1F27',
    '--c-surface-3':    '#232A34',
    '--c-overlay':      '#1D232C',
    '--c-text':         '#E6EAF0',
    '--c-text-warm':    '#F0EBE0',
    '--c-text-dim':     'rgba(230,234,240,0.58)',
    '--c-text-2':       '#AFB9C6',
    '--c-text-3':       '#86919E',
    '--c-text-faint':   '#454E5A',
    '--c-border':       'rgba(200,220,245,0.10)',
    '--c-border-soft':  'rgba(200,220,245,0.06)',
    '--c-border-hard':  'rgba(200,220,245,0.19)',
    '--c-border-focus': 'rgba(200,220,245,0.28)',
    '--c-danger-text':  '#F0685A',
    '--c-silhouette':   '#5A616D',
    '--c-zone-border':  'rgba(230,234,240,0.38)',
  },
  // BRUMA — negros levantados. El contraste extremo cansa en sesiones largas y
  // de noche; aquí el fondo sube y el texto baja, así que la pantalla deja de
  // ser un foco. Es el fondo de una app de bienestar usada a las once.
  bruma: {
    '--c-bg':           '#16181A',
    '--c-bg-deep':      '#101214',
    '--c-surface':      '#1E2124',
    '--c-surface-2':    '#262A2E',
    '--c-surface-3':    '#2F3438',
    '--c-overlay':      '#292D31',
    '--c-text':         '#E2E5E8',
    '--c-text-warm':    '#EDE9E0',
    '--c-text-dim':     'rgba(226,229,232,0.58)',
    '--c-text-2':       '#AFB5BA',
    '--c-text-3':       '#969CA2',
    '--c-text-faint':   '#4E545A',
    '--c-border':       'rgba(226,229,232,0.10)',
    '--c-border-soft':  'rgba(226,229,232,0.06)',
    '--c-border-hard':  'rgba(226,229,232,0.18)',
    '--c-border-focus': 'rgba(226,229,232,0.26)',
    '--c-danger-text':  '#F4796B',
    '--c-silhouette':   '#5E656B',
    '--c-zone-border':  'rgba(226,229,232,0.38)',
  },
  // ARENA — la contraparte cálida de Luz. El neutro puro es correcto pero frío;
  // este sesga el papel hacia el pergamino sin volver al crema inventado: el
  // matiz sale del oro de marca, rebajado hasta ser casi imperceptible.
  arena: {
    '--c-bg':           '#EAE7E1',
    '--c-bg-deep':      '#DEDAD2',
    '--c-surface':      '#FFFDF9',
    '--c-surface-2':    '#F7F4EE',
    '--c-surface-3':    '#F0EDE6',
    '--c-overlay':      '#DFDBD3',
    '--c-text':         '#14120E',
    '--c-text-warm':    '#221F19',
    '--c-text-dim':     'rgba(20,18,14,0.58)',
    '--c-text-2':       '#403D36',
    '--c-text-3':       '#5F5B52',
    '--c-text-faint':   '#79746A',
    '--c-border':       'rgba(20,18,14,0.12)',
    '--c-border-soft':  'rgba(20,18,14,0.07)',
    '--c-border-hard':  'rgba(20,18,14,0.18)',
    '--c-border-focus': 'rgba(20,18,14,0.26)',
    '--c-danger-text':  '#8E3A22',
    '--c-silhouette':   '#ADA79B',
    '--c-zone-border':  'rgba(20,18,14,0.42)',
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
    '--c-danger':           '#D54F42',
    '--c-calm':             '#FFC804',   // sin voz aparte: recuperar también es oro
    '--c-info':             '#5B9FD4',
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
    '--c-danger':           '#D54F42',
    '--c-calm':             '#EDBA01',
    '--c-info':             '#5B9FD4',
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
    '--c-info':             '#6B9BC4',
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
    '--c-danger':           '#D54F42',
    '--c-calm':             '#6B8CA8',   // la voz de Recuperación
    '--c-info':             '#6B8CA8',
  },
  // NÍTIDO — accesibilidad. Todo el acento sube de luminancia para despegarse
  // del fondo: el mínimo de la rampa pasa de ~4.5:1 a ~7:1 (AAA). Para vista
  // cansada, pantalla al sol o cualquiera que sienta el oro "apagado". No es una
  // paleta más bonita, es la misma paleta legible en peores condiciones.
  nitido: {
    '--c-gold':             '#FFD11A',
    '--c-gold-light':       'rgba(255,209,26,0.18)',
    '--c-gold-muted':       'rgba(255,209,26,0.75)',
    '--c-gold-glow':        'rgba(255,209,26,0.12)',
    '--c-line-gold':        'rgba(255,209,26,0.45)',
    '--c-line-gold-subtle': 'rgba(255,209,26,0.24)',
    '--c-gold-text':        '#FFD84D',
    '--c-success':          '#63D69B',
    '--c-warning':          '#FFC24D',
    '--c-danger':           '#FF8071',
    '--c-calm':             '#7FC4E8',
    '--c-info':             '#7FC4E8',
  },
  // SERENO — el acento baja de volumen. Todo desaturado, sin brillo: para quien
  // usa la app para bajar revoluciones y no quiere que la pantalla le grite.
  // Es el extremo opuesto de Nítido, y ambos son legítimos.
  sereno: {
    '--c-gold':             '#C9A63C',
    '--c-gold-light':       'rgba(201,166,60,0.10)',
    '--c-gold-muted':       'rgba(201,166,60,0.55)',
    '--c-gold-glow':        'rgba(201,166,60,0.06)',
    '--c-line-gold':        'rgba(201,166,60,0.24)',
    '--c-line-gold-subtle': 'rgba(201,166,60,0.12)',
    '--c-gold-text':        '#D6B457',
    '--c-success':          '#7FA890',
    '--c-warning':          '#C4A76B',
    '--c-danger':           '#C08578',
    '--c-calm':             '#8FA6B5',
    '--c-info':             '#7E9AAF',
  },
  // VITAL — el acento sube de energía sin perder el matiz de marca. Verde y
  // rojo más vivos para quien lee la app como un tablero de rendimiento.
  vital: {
    '--c-gold':             '#FFC804',
    '--c-gold-light':       'rgba(255,200,4,0.14)',
    '--c-gold-muted':       'rgba(255,200,4,0.65)',
    '--c-gold-glow':        'rgba(255,200,4,0.10)',
    '--c-line-gold':        'rgba(255,200,4,0.34)',
    '--c-line-gold-subtle': 'rgba(255,200,4,0.17)',
    '--c-gold-text':        '#FFC804',
    '--c-success':          '#3FBF7F',
    '--c-warning':          '#F0A93C',
    '--c-danger':           '#F0574A',
    '--c-calm':             '#4FB0D8',
    '--c-info':             '#4FA3D8',
  },
};

// ─── Contraste sobre fondo CLARO ──────────────────────────────────────────────
// El oro como TEXTO sobre claro es ilegible (#FFC804 mide 1.8:1 sobre crema).
// Cada señal necesita su propia versión oscurecida del MISMO matiz. Selector de
// dos atributos (0,2,0) para que gane sobre el bloque de señal (0,1,0).
//
// Además del texto, aquí se corrigen los tokens de oro CON ALFA, y ese era el
// motivo real de que Luz se viera plano: están calibrados para tapar un fondo
// oscuro. Sobre blanco, `rgba(255,200,4,0.12)` compone #FFF8E1 — indistinguible
// del papel — y el borde `rgba(255,200,4,0.30)` compone #FFEFB4, que a efectos
// prácticos no dibuja línea. Sobre claro hay que ir hacia ABAJO en luminancia,
// no hacia arriba: mismo matiz de marca, base oscurecida y alfa mayor.
export const LIGHT_SIGNAL_OVERRIDES: Record<SignalId, Record<string, string>> = {
  // Los semánticos se oscurecen en TODAS las señales, no solo en Semáforo. Ese
  // era un agujero real del tema claro anterior: con la señal `oro`, el verde
  // #52A878 medía 2.39:1 y el ámbar #D4A017 1.96:1 sobre el fondo claro —
  // ilegibles incluso como icono. Solo Semáforo estaba corregido porque fue la
  // única señal que se diseñó mirando el fondo claro.
  oro: {
    '--c-info': '#215C87', '--c-gold-text': '#7A5600', '--c-calm': '#7A5600',
    '--c-success': '#2F6647', '--c-warning': '#7D5810', '--c-danger': '#96341F',
    '--c-gold-light': 'rgba(122,86,0,0.10)', '--c-gold-glow': 'rgba(122,86,0,0.06)',
    '--c-gold-muted': 'rgba(122,86,0,0.72)',
    '--c-line-gold': 'rgba(122,86,0,0.38)', '--c-line-gold-subtle': 'rgba(122,86,0,0.18)',
  },
  ambar: {
    '--c-info': '#215C87', '--c-gold-text': '#6E4E00', '--c-calm': '#6E4E00',
    '--c-success': '#2F6647', '--c-warning': '#7D5810', '--c-danger': '#96341F',
    '--c-gold-light': 'rgba(110,78,0,0.10)', '--c-gold-glow': 'rgba(110,78,0,0.06)',
    '--c-gold-muted': 'rgba(110,78,0,0.72)',
    '--c-line-gold': 'rgba(110,78,0,0.38)', '--c-line-gold-subtle': 'rgba(110,78,0,0.18)',
  },
  semaforo: {
    '--c-info': '#215C87', '--c-gold-text': '#7A5600', '--c-success': '#2F6647', '--c-warning': '#7D5810',
    '--c-danger': '#96341F', '--c-calm': '#2F6647',
    '--c-gold-light': 'rgba(122,86,0,0.10)', '--c-gold-glow': 'rgba(122,86,0,0.06)',
    '--c-gold-muted': 'rgba(122,86,0,0.72)',
    '--c-line-gold': 'rgba(122,86,0,0.38)', '--c-line-gold-subtle': 'rgba(122,86,0,0.18)',
  },
  calma: {
    '--c-info': '#215C87', '--c-gold-text': '#7A5600', '--c-calm': '#33556F',
    '--c-success': '#2F6647', '--c-warning': '#7D5810', '--c-danger': '#96341F',
    '--c-gold-light': 'rgba(122,86,0,0.10)', '--c-gold-glow': 'rgba(122,86,0,0.06)',
    '--c-gold-muted': 'rgba(122,86,0,0.72)',
    '--c-line-gold': 'rgba(122,86,0,0.38)', '--c-line-gold-subtle': 'rgba(122,86,0,0.18)',
  },
  // Nítido sobre claro va al revés que sobre oscuro: para ganar contraste hay
  // que OSCURECER, no iluminar. Objetivo AAA (7:1) sobre las superficies claras.
  nitido: {
    '--c-info': '#17456A', '--c-gold-text': '#6B4E00', '--c-success': '#1F5335', '--c-warning': '#664700',
    '--c-danger': '#7E2412', '--c-calm': '#26485F',
    '--c-gold-light': 'rgba(107,78,0,0.14)', '--c-gold-glow': 'rgba(107,78,0,0.08)',
    '--c-gold-muted': 'rgba(107,78,0,0.80)',
    '--c-line-gold': 'rgba(107,78,0,0.50)', '--c-line-gold-subtle': 'rgba(107,78,0,0.26)',
  },
  sereno: {
    '--c-info': '#2C5468', '--c-gold-text': '#6E5410', '--c-calm': '#3B5666',
    '--c-success': '#33604A', '--c-warning': '#6E571F', '--c-danger': '#8A4436',
    '--c-gold-light': 'rgba(110,84,16,0.09)', '--c-gold-glow': 'rgba(110,84,16,0.05)',
    '--c-gold-muted': 'rgba(110,84,16,0.68)',
    '--c-line-gold': 'rgba(110,84,16,0.32)', '--c-line-gold-subtle': 'rgba(110,84,16,0.16)',
  },
  vital: {
    '--c-info': '#1C5C82', '--c-gold-text': '#7A5600', '--c-calm': '#1C5C82',
    '--c-success': '#1E6B45', '--c-warning': '#7E5410', '--c-danger': '#96301F',
    '--c-gold-light': 'rgba(122,86,0,0.12)', '--c-gold-glow': 'rgba(122,86,0,0.07)',
    '--c-gold-muted': 'rgba(122,86,0,0.75)',
    '--c-line-gold': 'rgba(122,86,0,0.42)', '--c-line-gold-subtle': 'rgba(122,86,0,0.21)',
  },
};

/** Fondos de rampa CLARA: heredan las correcciones de contraste sobre papel. */
export const LIGHT_BACKDROPS: BackdropId[] = ['light', 'arena'];

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

  // Los fondos CLAROS son dos (light y arena) y ambos necesitan la corrección:
  // heredar el oro brillante sobre papel lo vuelve ilegible. Se declara aquí y
  // no en cada bloque para que añadir un tercer fondo claro sea una línea.
  const lightFixes = LIGHT_BACKDROPS.flatMap((bd) =>
    (Object.keys(LIGHT_SIGNAL_OVERRIDES) as SignalId[]).map((id) =>
      block(`[data-theme="${bd}"][data-signal="${id}"]`, LIGHT_SIGNAL_OVERRIDES[id]),
    ),
  ).join('');

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
