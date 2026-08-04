/**
 * bodyMapLogic — dónde se siente, no solo cuánto.
 *
 * El check-in pregunta números (energía, claridad, tensión, sueño). Los números
 * dicen la magnitud y ocultan el lugar: "tensión 8" no distingue una mandíbula
 * apretada de un estómago cerrado, y son cosas distintas que se regulan
 * distinto. Este módulo modela la PARTE DEL CUERPO donde el usuario ubica la
 * sensación, para que la recomendación deje de ser genérica.
 *
 * Es lógica pura: sin React, sin IO, sin SVG. La silueta y el tacto viven en
 * `components/body-map.tsx`; aquí solo vive el significado.
 *
 * LÍNEA ROJA — esto NO es diagnóstico. Polaris es coaching, no clínica
 * (`app/legal/salud.tsx`). Las lecturas hablan de sensación y regulación, nunca
 * de patología, y jamás nombran una enfermedad. La misma regla que ya gobierna
 * `lib/biometricLogic.ts` y el internista educativo.
 */

/** Las 7 zonas de la silueta. Deliberadamente pocas: más zonas dan falsa
 *  precisión y convierten un gesto de 2 segundos en un formulario. */
export type BodyZone =
  | 'cabeza'
  | 'mandibula'
  | 'garganta'
  | 'pecho'
  | 'estomago'
  | 'espalda'
  | 'manos';

export const BODY_ZONES: BodyZone[] = [
  'cabeza', 'mandibula', 'garganta', 'pecho', 'estomago', 'espalda', 'manos',
];

export const ZONE_LABEL: Record<BodyZone, string> = {
  cabeza:    'La cabeza',
  mandibula: 'La mandíbula',
  garganta:  'La garganta',
  pecho:     'El pecho',
  estomago:  'El estómago',
  espalda:   'La espalda',
  manos:     'Las manos',
};

export interface BodyReading {
  /** Lo que el usuario ubicó. Vacío = no quiso decirlo, y está bien. */
  zones: BodyZone[];
  /** Tensión declarada en el check-in, 0-10. */
  stress: number;
}

export interface BodyInsight {
  /** Frase en segunda persona que le devuelve lo que acaba de señalar. */
  reading: string;
  /** Qué práctica le sirve a ESA zona, con su ruta real. */
  practice: { label: string; route: string; why: string } | null;
}

/**
 * Cada zona tiene una salida distinta porque el cuerpo se regula distinto: la
 * mandíbula y las manos piden soltar músculo, la garganta y el pecho piden
 * alargar la exhalación, el estómago pide bajar el ritmo. No es medicina —
 * es la misma lógica de "elige la práctica según la señal" que ya usa el
 * check-in (`app/checkin.tsx:327-360`), pero mirando el lugar y no solo el número.
 */
const ZONE_PRACTICE: Record<BodyZone, { label: string; route: string; why: string }> = {
  cabeza: {
    label: 'Binaural theta',
    route: '/bienestar/binaurales',
    why: 'Cuando la carga está arriba, bajar la frecuencia ayuda más que pensar más.',
  },
  mandibula: {
    label: 'Liberación con tapping',
    route: '/bienestar/tapping',
    why: 'La mandíbula aprieta lo que no se dijo. Soltarla es físico, no mental.',
  },
  garganta: {
    label: 'Respiración con exhalación larga',
    route: '/bienestar/respiracion',
    why: 'Alargar la exhalación abre la garganta más rápido que intentar relajarla.',
  },
  pecho: {
    label: 'Suspiro fisiológico',
    route: '/bienestar/respiracion',
    why: 'Dos inhalaciones y una exhalación larga descomprimen el pecho en un minuto.',
  },
  estomago: {
    label: 'Respiración en caja',
    route: '/bienestar/respiracion',
    why: 'El estómago se cierra con el ritmo alto. La caja baja el ritmo sin esfuerzo.',
  },
  espalda: {
    label: 'Flow de recuperación',
    route: '/bienestar/movimiento',
    why: 'La espalda carga la postura del día. Pide movimiento, no quietud.',
  },
  manos: {
    label: 'Meditación guiada',
    route: '/bienestar/meditacion',
    why: 'Las manos delatan la activación. Un ancla de atención las suelta.',
  },
};

/** Une las zonas en lenguaje natural: "el pecho", "el pecho y la garganta",
 *  "el pecho, la garganta y las manos". Sin comas colgando ni "y" de más. */
export function joinZones(zones: BodyZone[]): string {
  const names = zones
    .filter((z) => BODY_ZONES.includes(z))
    .map((z) => ZONE_LABEL[z].replace(/^(La|El|Las|Los) /, (m) => m.toLowerCase()));
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/**
 * Devuelve la lectura y la práctica. Prioriza la PRIMERA zona señalada — el
 * orden en que el usuario toca es información: lo primero que señala es lo que
 * más pesa. No promediamos zonas ni inventamos un "estado corporal global":
 * eso sería fabricar una conclusión que el usuario no dio.
 */
export function readBody(input: BodyReading): BodyInsight {
  const zones = input.zones.filter((z) => BODY_ZONES.includes(z));
  const stress = Number.isFinite(input.stress) ? input.stress : 0;

  if (zones.length === 0) {
    return {
      reading: 'No señalaste dónde. Está bien — a veces el cuerpo no habla claro todavía.',
      practice: null,
    };
  }

  const donde = joinZones(zones);
  const primary = zones[0];

  // El adjetivo sale de la tensión declarada, no de la zona: la zona dice DÓNDE,
  // el número dice CUÁNTO. Mezclarlos sería inventar intensidad por ubicación.
  const intensidad =
    stress >= 8 ? 'Lo estás sosteniendo fuerte'
    : stress >= 5 ? 'Ahí se está acumulando'
    : 'Ahí lo estás notando';

  return {
    reading: `${intensidad}: ${donde}.`,
    practice: ZONE_PRACTICE[primary],
  };
}
