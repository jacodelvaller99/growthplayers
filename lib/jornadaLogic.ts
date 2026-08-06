/**
 * jornadaLogic — el día como misión guiada de cuatro pasos.
 *
 * El dueño lo pidió así: "que la app vaya llevando a la persona, literalmente
 * como un videojuego". El motor de decisión ya existía (`selectTurno` en
 * lib/turnoLogic.ts) pero se congelaba tras el check-in: una vez leída la
 * persona, el turno decía "ABRIR EL PROTOCOLO" el resto del día porque nadie
 * registraba QUÉ ya se había completado hoy. Este módulo modela eso — la
 * JORNADA: LÉETE → EJECUTA → REGULA → CIERRA — para que el turno pueda avanzar
 * de paso en paso a medida que se completan.
 *
 * LA JORNADA GUÍA, NO BLOQUEA: si la persona hace los pasos fuera de orden,
 * los checks se marcan igual (regular antes de leer cuenta como regulado). Y
 * nada se cierra con candado — el catálogo de módulos quedó abierto a
 * propósito (commit 8b7e9af) y esta capa no lo revierte. Nada de puntos,
 * badges ni confeti: "videojuego" aquí es guía encadenada y progresión
 * visible, no juguetes (PRODUCT.md).
 *
 * Puro: sin IO, sin React, sin relojes. La fecha entra por parámetro
 * (`today`), igual que en turnoLogic, para que todo sea reproducible en tests.
 *
 * FUENTES DE VERDAD — una sola por paso, para no duplicar estado:
 *   · leete   — derivado de `todayCheckIn` (ya existe en use-lifeflow).
 *   · ejecuta — log local (`completedLessons` no tiene timestamps, así que
 *               no se puede derivar "de hoy"; se escribe al completar la
 *               lección en app/lesson/[id].tsx).
 *   · regula  — derivado de `wellnessSessions` (sí tienen `completedAt`).
 *   · cierra  — log local (el diario inserta a Supabase sin estado local;
 *               se escribe SOLO al guardar con éxito).
 */

export type JornadaStep = 'leete' | 'ejecuta' | 'regula' | 'cierra';

/** Orden canónico. También es el orden en que se elige el paso ACTUAL. */
export const JORNADA_STEPS: readonly JornadaStep[] = ['leete', 'ejecuta', 'regula', 'cierra'];

export const JORNADA_LABEL: Record<JornadaStep, string> = {
  leete:   'LÉETE',
  ejecuta: 'EJECUTA',
  regula:  'REGULA',
  cierra:  'CIERRA',
};

/** Lo persistido en la clave local `jornada:v1`. Solo guarda lo NO derivable
 *  (`ejecuta`, `cierra`); guardar derivados duplicaría la fuente de verdad. */
export const JORNADA_LOG_KEY = 'jornada:v1';

export interface JornadaLog {
  /** 'YYYY-MM-DD' LOCAL — misma convención que `isSameDay` en use-lifeflow. */
  date: string;
  done: JornadaStep[];
}

export type JornadaStepState = 'done' | 'current' | 'pending';

export interface Jornada {
  steps: { step: JornadaStep; state: JornadaStepState }[];
  /** null ⇔ jornada completa. */
  current: JornadaStep | null;
  complete: boolean;
  /** Cuántos pasos van hechos, para el "Paso N de 4" del turno. */
  doneCount: number;
}

export interface JornadaInput {
  /** 'YYYY-MM-DD' local — ver `localDateKey`. */
  today: string;
  /** readLocal(JORNADA_LOG_KEY), o null si nunca se escribió. */
  log: JornadaLog | null;
  /** Derivado de `todayCheckIn` — fuente de verdad de 'leete'. */
  hasCheckInToday: boolean;
  /** Derivado de `wellnessSessions` de hoy — fuente de verdad de 'regula'. */
  wellnessToday: boolean;
}

/**
 * La MISMA convención de día que `isSameDay` (hooks/use-lifeflow.tsx:234):
 * año/mes/día LOCALES, no UTC. Un desalineamiento aquí marcaría pasos del día
 * equivocado pasada la medianoche UTC (19:00 en Colombia).
 */
export function localDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * El estado de la jornada de HOY. Un log de otro día se ignora por completo —
 * así el cambio de fecha resetea solo, sin job de medianoche ni limpieza.
 */
export function deriveJornada(input: JornadaInput): Jornada {
  const logged = input.log && input.log.date === input.today ? input.log.done : [];
  const done = new Set<JornadaStep>(logged.filter((s) => JORNADA_STEPS.includes(s)));
  if (input.hasCheckInToday) done.add('leete');
  if (input.wellnessToday) done.add('regula');

  const current = JORNADA_STEPS.find((s) => !done.has(s)) ?? null;

  return {
    steps: JORNADA_STEPS.map((step) => ({
      step,
      state: done.has(step) ? 'done' : step === current ? 'current' : 'pending',
    })),
    current,
    complete: current === null,
    doneCount: done.size,
  };
}

/**
 * Marca un paso en el log. Idempotente (marcar dos veces no duplica) y con
 * reset por fecha: un log de otro día se descarta y se arranca uno nuevo —
 * la única política de expiración que necesita un registro diario.
 */
export function markStep(log: JornadaLog | null, today: string, step: JornadaStep): JornadaLog {
  const base = log && log.date === today ? log.done : [];
  return {
    date: today,
    done: base.includes(step) ? [...base] : [...base, step],
  };
}

/**
 * El paso que sigue DESPUÉS de completar `justDone` — para que la pantalla
 * que acaba de completar un paso ofrezca el siguiente sin recargar nada.
 * Recalcula como si `justDone` ya estuviera hecho (la jornada que recibe
 * puede ser la de ANTES de completar).
 */
export function nextStepAfter(j: Jornada, justDone: JornadaStep): JornadaStep | null {
  const done = new Set(j.steps.filter((s) => s.state === 'done').map((s) => s.step));
  done.add(justDone);
  return JORNADA_STEPS.find((s) => !done.has(s)) ?? null;
}

/**
 * La jornada CON un paso recién completado — para la pantalla que acaba de
 * completarlo y quiere pintar el estado nuevo sin esperar a que el log local
 * se relea (el hook solo relee al enfocar). Pura: no toca el log.
 */
export function withStepDone(j: Jornada, step: JornadaStep): Jornada {
  const done = new Set(j.steps.filter((s) => s.state === 'done').map((s) => s.step));
  done.add(step);
  const current = JORNADA_STEPS.find((s) => !done.has(s)) ?? null;
  return {
    steps: JORNADA_STEPS.map((st) => ({
      step: st,
      state: done.has(st) ? 'done' : st === current ? 'current' : 'pending',
    })),
    current,
    complete: current === null,
    doneCount: done.size,
  };
}
