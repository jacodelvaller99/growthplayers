/**
 * turnoLogic — QUÉ TOCA AHORA. Una sola opinión, para toda la app.
 *
 * POR QUÉ EXISTE: hasta hoy había SEIS piezas decidiendo esto por su cuenta y
 * cinco estaban rotas o muertas:
 *   · `nextActionConfig` (comando.tsx) — siempre null: el productor
 *     (calculate-intelligence) escribe frases en español y el consumidor
 *     indexaba por slugs. Ninguna frase coincide con una llave: la tarjeta de
 *     "próxima acción" no se renderizó nunca.
 *   · `mandoDeHoy` (comando.tsx) — caía a una constante por lo mismo.
 *   · `todayPicks` (bienestar/index.tsx) — reloj de pared, cero señal del usuario.
 *   · `DAILY_MESSAGES` (services/notifications.ts) — índice rotativo.
 *   · `buildNextActionNotification` (edge fn) — ramas muertas, mismo desajuste.
 *   · `recommendation` (checkin.tsx) — el ÚNICO correcto, y encerrado en la
 *     pantalla que menos se abre.
 *
 * La app no conducía porque no tenía una opinión: tenía seis y se contradecían.
 * Aquí vive la única. La home, el hub, la notificación y Norman la LEEN.
 *
 * ESCALERA DE 3 PELDAÑOS, de más informado a siempre-disponible. El último no
 * depende de nada, así que SIEMPRE hay respuesta: cero spinners, cero tarjeta
 * vacía, cero dependencia del pipeline de ML. El ML afina, no habilita — que
 * además es lo único que el consentimiento RGPD permite.
 *
 * Puro: sin IO, sin React, sin relojes. La fecha y las lecturas entran por
 * parámetro para que el resultado sea testeable y reproducible.
 */

import { coherenceOf } from './narrativeLogic';
import type { Jornada } from './jornadaLogic';

/** Los 6 `kind` de `CoachNextAction` (lib/coachIntelligenceLogic.ts). */
export type TurnoKind =
  | 'confront' | 'support' | 'celebrate' | 'investigate' | 'rest_signal' | 'reconnect';

/** Lo ya redactado y filtrado por `clientSafeNarrative`. NUNCA llega aquí
 *  `what_to_say` ni `why_now`: son de tercera persona y para el coach. */
export interface TurnoNarrative {
  headline: string;
  why: string;
}

export interface TurnoCheckIn {
  energy: number;
  clarity: number;
  stress: number;
  sleep: number;
}

export interface TurnoInput {
  /** Salida de `clientSafeNarrative(ci)`, o null si no hay red/ML/consentimiento. */
  narrative: TurnoNarrative | null;
  /** `ci.next_action.kind`. Decide el destino cuando hay narrativa. */
  kind: TurnoKind | null;
  /** La lectura de HOY, si ya la hizo. */
  todayCheckIn: TurnoCheckIn | null;
  /** Días desde la última lectura. null = nunca ha hecho una. */
  daysSinceLastCheckIn: number | null;
  /**
   * La jornada del día (lib/jornadaLogic.ts), si el consumidor la conoce.
   * OPCIONAL a propósito: sin ella el turno se comporta byte a byte como
   * antes (bienestar/index.tsx no la pasa y no cambia). Con ella, las dos
   * ramas del día sano que decían "ABRIR EL PROTOCOLO" para siempre avanzan
   * de paso en paso — que era exactamente el estado congelado a matar.
   */
  jornada?: Jornada | null;
  /** Ruta profunda a la próxima lección, si el consumidor la conoce. El paso
   *  'ejecuta' lleva AHÍ en vez de soltar al usuario en el catálogo. */
  nextLessonRoute?: string | null;
}

export interface Turno {
  /** De dónde salió la decisión. La UI no lo muestra; sirve para telemetría
   *  y para que nadie afirme "esto lo dijo la IA" cuando lo dijo una regla. */
  source: 'narrative' | 'checkin' | 'fallback';
  /** El dato duro que justifica el turno — lo único que el usuario no podía
   *  saber por su cuenta. Puede faltar; la UI debe tolerar null. */
  delta: string | null;
  headline: string;
  why: string;
  /** Verbo del botón. Imperativo, en mayúsculas, como el resto del sistema. */
  verb: string;
  route: string;
}

// La fórmula vive en narrativeLogic (`coherenceOf`) — estaba copiada a mano
// aquí y en checkin.tsx; tres copias de un número que alimenta a Norman y al
// score es cómo se divergen en silencio.
const COHERENCE = coherenceOf;

/**
 * El turno según el paso ACTUAL de la jornada — el refinamiento del día sano.
 * Solo se llama desde las dos ramas de `desdeCheckIn` que antes devolvían
 * "ABRIR EL PROTOCOLO" a secas: las alarmas (tensión/sueño/energía) y el
 * peldaño narrativo siguen ganando por encima de esto, porque mandan a
 * regulación — que ES un paso de la jornada, así que la misión se marca sola.
 */
function desdeJornada(j: Jornada, nextLessonRoute: string | null | undefined): Turno {
  const paso = `Paso ${Math.min(j.doneCount + 1, 4)} de 4 de tu jornada.`;

  switch (j.current) {
    case 'ejecuta':
      return {
        source: 'checkin', delta: paso,
        headline: 'La lectura está. Ahora el protocolo.',
        why: 'Una lección hoy — no el módulo entero. El avance pequeño y diario es lo que a 90 días se vuelve estructural.',
        verb: 'EJECUTAR LA LECCIÓN',
        route: nextLessonRoute ?? '/(tabs)/programas',
      };
    case 'regula':
      return {
        source: 'checkin', delta: paso,
        headline: 'Ejecutaste. Ahora regula el sistema.',
        why: 'Unos minutos de respiración consolidan lo que hiciste: bajar de revoluciones a propósito, no por agotamiento.',
        verb: 'REGULAR EL SISTEMA', route: '/bienestar/respiracion',
      };
    case 'cierra':
      return {
        source: 'checkin', delta: paso,
        headline: 'Último paso: cierra la jornada.',
        why: 'Dos líneas en el diario y el día queda nombrado. Lo que se nombra se puede repetir.',
        verb: 'CERRAR LA JORNADA', route: '/bienestar/diario',
      };
    default:
      // Completa (current null) — el único estado que queda aquí.
      return {
        source: 'checkin', delta: '4 de 4 pasos hechos hoy.',
        headline: 'Jornada completa.',
        why: 'Los cuatro pasos del día están hechos. Mira el patrón que estás construyendo — o descansa, que también es parte.',
        verb: 'VER TU PROGRESO', route: '/(tabs)/progreso',
      };
  }
}

/**
 * Destino por `kind`. `investigate` NO tiene ruta a propósito: significa que el
 * motor no tiene una lectura clara, así que cae al peldaño 2 en vez de inventar
 * un destino.
 *
 * `celebrate` va al diario y no al check-in porque su propio copy pide nombrar
 * lo que cambió ("lo que se nombra se puede repetir") — eso es escribir, no
 * volver a medirse.
 */
const RUTA_POR_KIND: Record<Exclude<TurnoKind, 'investigate'>, { route: string; verb: string }> = {
  confront:    { route: '/(tabs)/mentor',           verb: 'HABLAR CON NORMAN' },
  reconnect:   { route: '/checkin',                 verb: 'RETOMAR HOY' },
  rest_signal: { route: '/bienestar/respiracion',   verb: 'BAJAR REVOLUCIONES' },
  support:     { route: '/(tabs)/norte',            verb: 'VOLVER A TU NORTE' },
  celebrate:   { route: '/bienestar/diario',        verb: 'NOMBRAR LO QUE CAMBIÓ' },
};

/** Peldaño 2 — las mismas reglas deterministas que ya vivían en el check-in,
 *  priorizando el sistema más comprometido. Se mueven aquí para que dejen de
 *  ser exclusivas de esa pantalla.
 *
 *  TOTAL a propósito: con lectura de hoy SIEMPRE devuelve turno. Devolvía
 *  `null` en el día normal y la escalera caía al peldaño 3, que pide la
 *  lectura que acaba de hacerse. */
function desdeCheckIn(
  c: TurnoCheckIn,
  jornada?: Jornada | null,
  nextLessonRoute?: string | null,
): Turno {
  // El refinamiento de jornada solo aplica al día SANO (las dos ramas de
  // abajo que mandaban al catálogo). `current === 'leete'` sería un input
  // inconsistente — aquí ya HAY lectura de hoy — así que se ignora y la
  // rama clásica responde.
  const jornadaActiva = jornada && jornada.current !== 'leete' ? jornada : null;

  if (c.stress >= 7) {
    return {
      source: 'checkin', delta: `Tensión ${c.stress}/10 en tu última lectura.`,
      headline: 'Baja la carga antes de ejecutar.',
      why: 'Con el sistema en tensión, abrir frentes nuevos cuesta el doble y rinde la mitad. Primero descomprimir, después un solo foco.',
      verb: 'BAJAR REVOLUCIONES', route: '/bienestar/respiracion',
    };
  }
  if (c.sleep <= 4) {
    return {
      source: 'checkin', delta: `Dormiste ${c.sleep}/10 — por debajo de tu base.`,
      headline: 'Hoy toca recuperar, no empujar.',
      why: 'La recuperación es parte del protocolo, no su pausa. Opera en mínimo viable y protege el cierre temprano.',
      verb: 'IR A MEDITACIÓN', route: '/bienestar/meditacion',
    };
  }
  if (c.energy <= 4) {
    return {
      source: 'checkin', delta: `Energía ${c.energy}/10.`,
      headline: 'Una sola acción, y sin culpa.',
      why: 'Con la energía baja, proteger la que queda es ganar capacidad mañana. Elige lo único que mueve la aguja y apaga el resto.',
      verb: 'ENFOCAR CON BINAURALES', route: '/bienestar/binaurales',
    };
  }
  if (COHERENCE(c) >= 8) {
    // Con jornada, la ventana alta no repite "abre el catálogo" todo el día:
    // avanza al paso que toca. Sin jornada, comportamiento clásico intacto.
    if (jornadaActiva) return desdeJornada(jornadaActiva, nextLessonRoute);
    return {
      source: 'checkin', delta: `Coherencia ${COHERENCE(c)}/10 — tu ventana alta.`,
      headline: 'Estás en ventana de alto rendimiento.',
      why: 'La claridad de hoy no se gasta en lo trivial. Bloquea ahora lo más difícil que tengas pendiente.',
      verb: 'ABRIR EL PROTOCOLO', route: '/(tabs)/programas',
    };
  }
  // El día normal. No engancha ninguna alarma y tampoco es la ventana alta:
  // ni corregir ni celebrar — avanzar. Esta rama faltaba, y es el estado MÁS
  // frecuente de todos: un usuario sano que ya se leyó.
  if (jornadaActiva) return desdeJornada(jornadaActiva, nextLessonRoute);
  return {
    source: 'checkin', delta: `Coherencia ${COHERENCE(c)}/10 — banda operativa.`,
    headline: 'Ya te leíste hoy. Ahora ejecuta.',
    why: 'Un día en banda no pide corrección, pide avance. La lectura ya está hecha: lo que queda es mover el protocolo un peldaño mientras el sistema aguanta.',
    verb: 'ABRIR EL PROTOCOLO', route: '/(tabs)/programas',
  };
}

/** Peldaño 3 — no necesita nada. Por eso siempre hay turno. */
function fallback(dias: number | null): Turno {
  const delta =
    dias === null ? null
    : dias === 0  ? null
    : dias === 1  ? 'Tu última lectura fue ayer.'
    : `Tu última lectura fue hace ${dias} días.`;

  return {
    source: 'fallback', delta,
    headline: 'Empieza por la lectura de hoy.',
    // El PORQUÉ, no el "solo toma 30 segundos": lo que se gana, no lo que cuesta.
    why: 'Treinta segundos y el sistema vuelve a ver lo que a ti se te escapa. Sin lectura, Norman opera a ciegas y el resto del día se decide sin datos.',
    verb: 'HACER MI CHECK-IN', route: '/checkin',
  };
}

export function selectTurno(input: TurnoInput): Turno {
  const { narrative, kind, todayCheckIn, daysSinceLastCheckIn, jornada, nextLessonRoute } = input;

  // Peldaño 1 — lo más informado, cuando hay red + ML + consentimiento.
  //
  // El `!(todayCheckIn && ...)` es el mismo invariante que el peldaño 2 y no
  // una excepción: NINGÚN peldaño puede mandar a hacer la lectura que ya está
  // hecha. La ronda anterior lo arregló abajo y lo dejó abierto aquí — que es
  // el camino POR DEFECTO en cuanto el ML está vivo. Sin esto, `reconnect`
  // (la rama que dispara el silencio) manda al check-in a quien acaba de
  // hacerlo, y la pantalla se vuelve a contradecir con la tarjeta de al lado.
  if (narrative && kind && kind !== 'investigate') {
    const destino = RUTA_POR_KIND[kind];
    if (destino && !(todayCheckIn && destino.route === '/checkin')) {
      return {
        source: 'narrative',
        // La narrativa ya trae su porqué redactado; el delta queda para el
        // peldaño que sí tiene un número que citar.
        delta: null,
        headline: narrative.headline,
        why: narrative.why,
        ...destino,
      };
    }
  }

  // Peldaño 2 — con la lectura de hoy basta para tener una opinión propia.
  // Sin `if (porCheckIn)`: `desdeCheckIn` ya no puede devolver null, y ese
  // hueco era justo por donde el día normal se escapaba al peldaño 3.
  if (todayCheckIn) return desdeCheckIn(todayCheckIn, jornada, nextLessonRoute);

  // Peldaño 3.
  return fallback(daysSinceLastCheckIn);
}
