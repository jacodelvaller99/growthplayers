/**
 * auraLogic — el resplandor que respira detrás del contenido.
 *
 * Es la única concesión de color de la marca, y por eso está acotada aquí en
 * lógica pura y testeable en vez de repartida por las pantallas.
 *
 * REGLAS DE MARCA (PRODUCT.md: "quiet-luxury, gold as a rare, deliberate
 * accent"; DESIGN.md: monocromo):
 *  1. El aura vive SOLO en momentos inmersivos — umbral, prácticas, check-in,
 *     momentos del héroe. Comando, Progreso y TODO el admin siguen monocromos:
 *     el cockpit no se decora.
 *  2. La opacidad tiene techo duro (`MAX_OPACITY`). Es atmósfera, no adorno.
 *     El test fija ese invariante para que nadie lo suba "un poquito".
 *  3. La paleta es de croma bajísimo a propósito. Si algún día alguien mete un
 *     color saturado aquí, la app empieza a parecerse a lo que la marca
 *     declara como anti-referencia.
 */

export type AuraState = 'reposo' | 'recuperado' | 'tension' | 'noche' | 'umbral';

/** Techo absoluto de opacidad. Por encima de esto el fondo deja de ser
 *  atmósfera y empieza a competir con el texto — que es justo lo contrario de
 *  lo que el aura existe para lograr. */
export const MAX_OPACITY = 0.14;

/**
 * Croma bajo, pero luminancia SUFICIENTE.
 *
 * La primera versión usaba colores casi negros (#3A2E1C sobre un fondo #090909).
 * Con la opacidad acotada a 0.14, el canal más fuerte se movía de 12.5 a 13.4
 * sobre 255 — por debajo del cuanto del display. Era matemáticamente invisible:
 * un aura que nadie iba a ver nunca, en verde en CI porque los tests solo
 * medían "que no se pase", jamás "que se note".
 *
 * Estos colores son claros para poder ATRAVESAR una opacidad de 0.10-0.14 y
 * seguir siendo croma bajo: siguen siendo tonos apagados, no colores saturados.
 */
const AURA_COLOR: Record<AuraState, string> = {
  reposo:     '#5A5A66',   // neutro con un punto frío — el estado por defecto
  recuperado: '#3E8C74',   // verde profundo desaturado
  tension:    '#9A7430',   // ámbar apagado, nunca rojo (rojo = alarma clínica)
  noche:      '#4A5490',   // índigo nocturno
  umbral:     '#8A7434',   // oro muy rebajado — el único momento con la marca detrás
};

export interface AuraInput {
  state: AuraState;
  /** 0-1 crudo desde la pantalla. Se clampa y se escala contra el techo. */
  weight?: number;
}

export interface AuraStyle {
  color: string;
  /** Opacidad final ya acotada. Nunca supera MAX_OPACITY. */
  opacity: number;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Traduce estado + peso a color y opacidad. El peso NO es la opacidad: es una
 * fracción del techo. Así, subir el peso a 1 sigue dejando el aura por debajo
 * del umbral en el que taparía el texto.
 */
export function auraForState(input: AuraInput): AuraStyle {
  const color = AURA_COLOR[input.state] ?? AURA_COLOR.reposo;
  const weight = clamp01(input.weight ?? 0.6);
  return {
    color,
    // Piso en 0.35 del techo: un aura que se apaga del todo no "respira",
    // parpadea — y eso se lee como bug, no como diseño.
    opacity: MAX_OPACITY * (0.35 + 0.65 * weight),
  };
}

/**
 * Deriva el estado desde la lectura del cuerpo del usuario. Se usa en el
 * check-in y en las prácticas: el fondo refleja lo que la persona acaba de
 * declarar, sin que ella tenga que configurar nada.
 *
 * Prioriza tensión sobre recuperación: si alguien viene cargado, eso manda
 * aunque haya dormido bien. Es la misma jerarquía que ya usa el check-in para
 * recomendar práctica (`app/checkin.tsx`).
 */
export function auraFromCheckIn(input: {
  stress?: number | null;
  energy?: number | null;
  hour?: number;
}): AuraState {
  const hour = Number.isFinite(input.hour) ? (input.hour as number) : 12;
  if (hour >= 21 || hour < 5) return 'noche';

  const stress = Number.isFinite(input.stress ?? NaN) ? (input.stress as number) : null;
  const energy = Number.isFinite(input.energy ?? NaN) ? (input.energy as number) : null;

  if (stress !== null && stress >= 7) return 'tension';
  if (energy !== null && energy >= 7 && (stress === null || stress <= 4)) return 'recuperado';
  return 'reposo';
}
