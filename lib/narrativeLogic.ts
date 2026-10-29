/**
 * narrativeLogic — la voz del arco. Lógica pura, sin IO ni Date.now().
 *
 * POR QUÉ EXISTE: esta voz ya estaba escrita, pero vivía inline dentro de
 * `app/(tabs)/progreso.tsx` — enterrada en la cuarta posición de una pestaña
 * secundaria, invisible desde el home. Al extraerla, el mismo guion puede
 * hablar en Comando, Progreso y Check-in sin duplicar strings, y se edita en
 * un solo sitio.
 *
 * EL MODELO (tres tiempos, dos escalas anidadas):
 *   SETUP   → ¿dónde estoy?           → `arcForDay` (día N · acto)
 *   TENSIÓN → ¿qué está en juego?     → la capa de CTA, fuera de aquí
 *   PAYOFF  → ¿qué cambió porque actué? → `consequenceOf`
 *
 * El bucle que hoy no engancha es el que no tiene payoff: el usuario registra
 * un check-in y no recibe nada que no supiera antes de registrarlo. Eso es lo
 * que cierra `consequenceOf`.
 */

import { arquetipoConArticulo } from '@/data/modules';

/** Actividad reciente = una lectura en los últimos N días. */
export const RECENT_DAYS = 3;
const isRecent = (d: number | null) => d !== null && d <= RECENT_DAYS;

/** El registro del regreso (Biblia §3): sin culpa, sin ponerse al día. */
export const RETURN_LINE =
  'Llevas un tiempo fuera del sistema. El protocolo sigue aquí — se retoma donde estás, no donde deberías estar.';

/**
 * Glosario en el punto de uso — UNA línea cada uno, la misma en todas las
 * pantallas (Biblia §2). Sin glosarios largos: quien toca, entiende.
 */
export const GLOSS = {
  score: 'Suma de tus lecturas, lecciones y tareas (0–1000). No baja; lo de esta semana lo marca el cambio.',
  arc: 'Tus 90 días son tres actos de 30: I Base, II Profundidad, III Identidad.',
  archetypes: 'Arquetipos: las capas de identidad que integra el protocolo. Cada una se abre al completar su módulo.',
} as const;

export type ArcAct ='inicio' | 'filtro' | 'grabado' | 'automatico' | 'profundidad' | 'identidad';

export interface Arc {
  /** Identificador estable del acto — para estilos/tests, no para mostrar. */
  act: ArcAct;
  /** Número romano del acto, 1-3. El usuario piensa en tres actos, no en seis escalones. */
  actNumber: 1 | 2 | 3;
  /** Etiqueta corta en mayúsculas para el eyebrow. Ej: "ACTO II · PROFUNDIDAD". */
  actLabel: string;
  /**
   * Dónde va en los 90 días. Vive en el eyebrow y no dentro de `line` porque
   * el móvil perdió esta información entera al pasar a `compact`: el dato de
   * posición no puede depender de si la frase narrativa cabe o no.
   */
  dayLabel: string;
  /** La línea narrativa principal. UNA sola frase, en segunda persona. */
  line: string;
  /**
   * `true` cuando `line` cita palabras del usuario.
   *
   * Lo consume `ArcHeader` para pintarla en oro: el oro marca lo que es suyo,
   * igual que en el Umbral y en el mapa corporal. Sin esta bandera el
   * componente no puede distinguir una cita de una frase de la app, y acabaría
   * dándoles el mismo color — que es lo que hace que la continuidad no se note.
   */
  quoted: boolean;
}

/**
 * Los tres actos: 30 días cada uno. Antes el Acto I duraba 7 días y el II
 * 53 — no coincidía con el glosario ni con la barra de escritorio (Base <30,
 * Profundidad <60, Final). Ahora una sola regla, la que el usuario puede
 * recordar: un mes por acto.
 */
export const ACTS = [
  { n: 1, name: 'Base', from: 1, to: 30 },
  { n: 2, name: 'Profundidad', from: 31, to: 60 },
  { n: 3, name: 'Identidad', from: 61, to: 90 },
] as const;

const ROMAN = ['I', 'II', 'III'] as const;

function actOf(day: number): Pick<Arc, 'actNumber' | 'actLabel'> {
  const a = ACTS.find((x) => day <= x.to) ?? ACTS[2];
  return { actNumber: a.n, actLabel: `ACTO ${ROMAN[a.n - 1]} · ${a.name.toUpperCase()}` };
}

export interface Journey {
  day: number;
  /** 1..13 */
  week: number;
  actNumber: 1 | 2 | 3;
  /** 0..1 dentro de cada acto: [I, II, III]. Lo hecho = 1, lo futuro = 0. */
  fill: [number, number, number];
  /** Días que faltan para el siguiente acto (null en el III). */
  daysToNextAct: number | null;
  nextActName: string | null;
}

/** «Estás aquí» en los 90 días — pura, la consume `ArcHeader`. */
export function journeyOf(protocolDay: number): Journey {
  const day = Math.min(90, Math.max(1, Math.floor(protocolDay || 1)));
  const { actNumber } = actOf(day);
  const fill = ACTS.map((a) =>
    day >= a.to ? 1 : day < a.from ? 0 : (day - a.from + 1) / (a.to - a.from + 1),
  ) as [number, number, number];
  const current = ACTS[actNumber - 1];
  return {
    day,
    week: Math.min(13, Math.ceil(day / 7)),
    actNumber,
    fill,
    daysToNextAct: actNumber === 3 ? null : current.to - day + 1,
    nextActName: ACTS.find((a) => a.n === actNumber + 1)?.name ?? null,
  };
}

/**
 * El arco del protocolo según el día. Escalonado en 6 tramos que se agrupan
 * en 3 actos — los mismos cortes que ya usaba `progreso.tsx`, preservados
 * deliberadamente para no cambiar la voz al mover el código.
 *
 * `protocolDay` se clampa a >= 1: un día 0 o negativo viene de un perfil sin
 * fecha de inicio, y es mejor mostrar el acto de arranque que una frase rota.
 */
export function arcForDay(
  protocolDay: number,
  /**
   * Lo que el usuario declaro al cruzar el Umbral. Mismo contrato que
   * `milestoneCrossed`: si no escribio nada, el arco se dice igual y NO se
   * inventa una frase suya.
   *
   * POR QUE: estas seis ramas son la unica voz que narra los 90 dias, y eran
   * identicas para todo el mundo. El dia 0 la app le lee sus palabras con una
   * puesta en escena entera; el dia 12 le habla como a nadie. La continuidad
   * no es una funcion nueva — es este argumento.
   */
  suyas?: { painPoint?: string; purpose?: string; identity?: string },
  /**
   * Días desde la última lectura (`protocolSnapshot.daysSinceLastReading`).
   * `undefined` = el llamante no lo sabe → se conserva la voz de siempre.
   * `null` (nunca leyó) o más de `RECENT_DAYS` → desde el día 8 el arco NO
   * elogia constancia («Superaste…», «Apareces»): dice el regreso, sin culpa.
   * Un elogio que contradice el dato es lo que más rápido le quita voz a la app.
   */
  daysSinceLastCheckIn?: number | null,
): Arc {
  const day = Math.max(1, Math.floor(protocolDay || 1));
  if (day > 7 && daysSinceLastCheckIn !== undefined && !isRecent(daysSinceLastCheckIn)) {
    return {
      act: day <= 14 ? 'grabado' : day <= 30 ? 'automatico' : day <= 60 ? 'profundidad' : 'identidad',
      ...actOf(day),
      dayLabel: `DÍA ${day} · 90`,
      quoted: false,
      line: RETURN_LINE,
    };
  }
  const plural = day === 1 ? '' : 's';
  const cita = (t?: string) => {
    const limpio = (t ?? '').trim().replace(/[.!?…\s]+$/, '');
    return limpio.length > 60 ? `${limpio.slice(0, 60).trimEnd()}…` : limpio;
  };
  const obstaculo = cita(suyas?.painPoint);
  const norte = cita(suyas?.purpose);
  const quien = cita(suyas?.identity);

  if (day <= 3) {
    return {
      act: 'inicio',
      ...actOf(day),
      dayLabel: `DÍA ${day} · 90`,
      quoted: !!obstaculo,
      line: obstaculo
        ? `Dijiste que lo que se interpone es «${obstaculo}». Sigue ahí, y tú también.`
        : `Llevas ${day} día${plural} aquí. Lo único que pide hoy es una lectura honesta de cómo entras.`,
    };
  }
  if (day <= 7) {
    return {
      act: 'filtro',
      ...actOf(day),
      dayLabel: `DÍA ${day} · 90`,
      quoted: !!quien,
      line: quien
        ? `Dijiste que decides ser «${quien}». Cada check-in es esa declaración.`
        : 'Cada check-in es una declaración de quién eres, no de lo que sientes.',
    };
  }
  if (day <= 14) {
    return {
      act: 'grabado',
      ...actOf(day),
      dayLabel: `DÍA ${day} · 90`,
      quoted: !!obstaculo,
      line: obstaculo
        ? `${day} días desde que dijiste «${obstaculo}».`
        : 'Superaste el punto donde la mayoría desaparece.',
    };
  }
  if (day <= 30) {
    return {
      act: 'automatico',
      ...actOf(day),
      dayLabel: `DÍA ${day} · 90`,
      quoted: !!norte,
      line: norte
        ? `${day} días hacia «${norte}».`
        : 'Ya no decides cada día si aparecer. Apareces.',
    };
  }
  if (day <= 60) {
    return {
      act: 'profundidad',
      ...actOf(day),
      dayLabel: `DÍA ${day} · 90`,
      quoted: !!norte,
      line: norte
        ? `«${norte}» ya no es algo que dijiste: son ${day} días haciéndolo.`
        : 'Los cambios dejan de ser visibles y empiezan a ser estructurales.',
    };
  }
  return {
    act: 'identidad',
    ...actOf(day),
    dayLabel: `DÍA ${day} · 90`,
    quoted: !!quien,
    line: quien
      ? `Dijiste que decides ser «${quien}». Ya no lo decides: lo eres.`
      : 'Eso no es disciplina. Es quién eres ahora.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYOFF — la consecuencia de haber actuado
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckInReading {
  energy: number;
  clarity: number;
  stress: number;
  sleep: number;
}

/**
 * Coherencia 0-10 a partir de las cuatro lecturas. La carga (`stress`) se
 * invierte porque más carga = peor estado, al contrario que las otras tres.
 *
 * ⚠️ Fórmula IDÉNTICA a la de `app/checkin.tsx` a propósito. Si divergen,
 * el usuario ve dos números distintos para lo mismo en la misma pantalla.
 * El objetivo es que checkin.tsx acabe consumiendo esta y quede una sola.
 */
export function coherenceOf(r: CheckInReading): number {
  return Math.round((r.energy + r.clarity + r.sleep + (11 - r.stress)) / 4);
}

/**
 * El delta contra el registro anterior — la ÚNICA información que el usuario
 * no puede tener antes de guardar.
 *
 * Este es el núcleo del arreglo. Hoy `checkin.tsx` muestra la coherencia en
 * vivo mientras mueves los sliders (`:284`), así que pulsar "guardar" no
 * revela nada nuevo y la acción se siente vacía — el "¿pero para qué?".
 * La comparación con el pasado solo existe DESPUÉS de guardar, y por eso es
 * lo que convierte el guardado en un acto con recompensa.
 *
 * La recomendación accionable NO se recalcula aquí: ya existe y está bien
 * resuelta en `app/checkin.tsx` (con icono, ruta y CTA). Duplicarla
 * sería crear una segunda voz que se desincroniza con la primera.
 *
 * Devuelve `null` sin comparación previa: en el primer check-in no hay contra
 * qué comparar, y una comparación inventada es peor que ninguna.
 */
export function deltaSince(current: CheckInReading, previous: CheckInReading | null): string | null {
  if (!previous) return null;
  const delta = coherenceOf(current) - coherenceOf(previous);
  if (delta > 0) {
    return `Tu coherencia subió ${delta} punto${delta === 1 ? '' : 's'} desde tu último registro.`;
  }
  if (delta < 0) {
    const abs = Math.abs(delta);
    return `Tu coherencia bajó ${abs} punto${abs === 1 ? '' : 's'} desde tu último registro. Es dato, no fracaso.`;
  }
  return 'Tu coherencia está igual que en tu último registro. Estable.';
}

// ─────────────────────────────────────────────────────────────────────────────
// HITOS — lo que hoy pasa en silencio
// ─────────────────────────────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  title: string;
  line: string;
}

/**
 * Detecta si el estado que ACABA de alcanzarse es un hito que merece decirse.
 * Hoy racha de 7, primer mes y umbrales de score pasan sin que nadie lo diga.
 *
 * Compara contra el valor previo para disparar solo en el cruce, no en cada
 * render — de lo contrario el hito se convierte en ruido diario.
 */
export function milestoneCrossed(
  prev: { streak: number; protocolDay: number } | null,
  next: { streak: number; protocolDay: number },
  /**
   * Lo que el usuario declaró al cruzar el Umbral, en sus palabras.
   *
   * El Umbral le lee sus frases el día 0 y después la app no volvía a citarlo
   * NUNCA: los hitos hablaban en genérico ("Completaste el acto de base") con
   * `painPoint` a una interpolación de distancia. Contar su historia un día y
   * rellenar campos los otros ochenta y nueve es peor que no contarla.
   *
   * Opcional: si no escribió nada, el hito se dice igual, sin cita. Nunca se
   * inventa una frase suya.
   */
  suyas?: { painPoint?: string; purpose?: string },
): Milestone | null {
  if (!prev) return null;
  const cita = (t?: string) => {
    const limpio = (t ?? '').trim().replace(/[.!?…\s]+$/, '');
    return limpio.length > 70 ? `${limpio.slice(0, 70).trimEnd()}…` : limpio;
  };

  if (prev.streak < 7 && next.streak >= 7) {
    const obstaculo = cita(suyas?.painPoint);
    return {
      id: 'streak-7',
      title: '7 DÍAS SEGUIDOS',
      line: obstaculo
        ? `Hace una semana dijiste que lo que se interponía era «${obstaculo}». Llevas siete días apareciendo de todos modos.`
        : 'Siete días seguidos leyendo tu estado. A partir de aquí el sistema empieza a sostenerte a ti.',
    };
  }
  if (prev.streak < 30 && next.streak >= 30) {
    return {
      id: 'streak-30',
      title: '30 DÍAS SEGUIDOS',
      line: 'Un mes sin fallar. Esto ya no es motivación — es estructura.',
    };
  }
  // Los hitos de CALENDARIO cruzan a medianoche, haya actividad o no. Sin
  // lectura hoy (racha 0) no se felicita lo que el dato no respalda: se nombra
  // el día sin elogio ni culpa (racha 0 también es quien leyó ayer).
  const sinLecturaHoy = next.streak === 0;
  const SIN_ELOGIO = 'El calendario avanza solo; lo que cuenta es cómo entras hoy.';
  if (prev.protocolDay < 30 && next.protocolDay >= 30 && sinLecturaHoy) {
    return { id: 'day-30', title: 'DÍA 30 DE 90', line: `Día 30 de 90. ${SIN_ELOGIO}` };
  }
  if (prev.protocolDay < 90 && next.protocolDay >= 90 && sinLecturaHoy) {
    return { id: 'day-90', title: 'DÍA 90 DE 90', line: `Día 90 de 90. ${SIN_ELOGIO}` };
  }
  if (prev.protocolDay < 30 && next.protocolDay >= 30) {
    const norte = cita(suyas?.purpose);
    return {
      id: 'day-30',
      title: 'PRIMER TERCIO',
      line: norte
        ? `Día 30 de 90. Escribiste que tu norte era «${norte}». Un tercio del camino hecho hacia eso.`
        : 'Día 30 de 90. Completaste el acto de base. Lo que viene ya no construye el hábito: lo profundiza.',
    };
  }
  if (prev.protocolDay < 90 && next.protocolDay >= 90) {
    const obstaculo = cita(suyas?.painPoint);
    return {
      id: 'day-90',
      title: 'PROTOCOLO COMPLETO',
      line: obstaculo
        ? `90 días. El día 0 dijiste «${obstaculo}». Vuelve a leerlo hoy.`
        : '90 días. Terminaste lo que la mayoría no empieza.',
    };
  }
  return null;
}

// ─── La historia completa ─────────────────────────────────────────────────────

export interface HistoriaInput {
  protocolDay: number;
  painPoint?: string;
  purpose?: string;
  identity?: string;
  completedLessonCount: number;
  taskCount: number;
  checkInsCount: number;
  /** Promedio de energía 1..10 (0 si no hay lecturas). */
  avgEnergy: number;
  /** Nombres de arquetipos ya conquistados (módulo completo). */
  archetypesEarned: string[];
  /** Pasa al arco: ver `arcForDay`. Omitido = voz de siempre. */
  daysSinceLastCheckIn?: number | null;
}

export interface HistoriaChapter {
  /** Rótulo en versalitas del capítulo. */
  label: string;
  text: string;
}

/**
 * La historia completa del cliente, en capítulos — la MISMA voz para
 * Progreso, Perfil propio y el perfil de cliente. Antes vivía incrustada en
 * progreso.tsx (3 líneas sin rótulo); extraerla es la regla de gobernanza
 * "un solo módulo por mensaje": si dos pantallas cuentan la historia, la
 * cuentan desde aquí.
 *
 * Cada capítulo solo aparece si su dato existe — la historia no se infla
 * con relleno: un usuario del día 2 tiene una historia corta, y eso es
 * verdad, no un defecto.
 */
export function buildHistoria(input: HistoriaInput): HistoriaChapter[] {
  const chapters: HistoriaChapter[] = [];
  const cap = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);

  if (input.painPoint?.trim()) {
    chapters.push({
      label: 'EL UMBRAL',
      text: `Llegaste diciendo: «${cap(input.painPoint.trim(), 120)}». Ese fue el punto de partida — todo lo demás se mide contra eso.`,
    });
  }

  if (input.identity?.trim() && input.protocolDay >= 7) {
    chapters.push({
      label: 'LA DECLARACIÓN',
      text: `Tu identidad declarada: «${cap(input.identity.trim(), 100)}». Cada acción que tomaste en el protocolo es evidencia de que eso ya es real.`,
    });
  }

  const arc = arcForDay(input.protocolDay, {
    painPoint: input.painPoint,
    purpose: input.purpose,
    identity: input.identity,
  }, input.daysSinceLastCheckIn);
  chapters.push({ label: 'EL ARCO', text: arc.line });

  const evidencia: string[] = [];
  if (input.completedLessonCount > 0) {
    // "lección" pierde la tilde en plural: lecciones, no "lecciónes".
    evidencia.push(`${input.completedLessonCount} ${input.completedLessonCount === 1 ? 'lección' : 'lecciones'}`);
  }
  if (input.taskCount > 0) {
    evidencia.push(`${input.taskCount} tarea${input.taskCount === 1 ? '' : 's'} de reflexión escrita${input.taskCount === 1 ? '' : 's'}`);
  }
  if (input.checkInsCount > 0) {
    evidencia.push(`${input.checkInsCount} lectura${input.checkInsCount === 1 ? '' : 's'} de estado`);
  }
  if (input.archetypesEarned.length > 0) {
    // «del GUERRERO, de la COMPRENSIÓN»: el artículo lo decide data/modules.
    const conDe = input.archetypesEarned.map((n) => {
      const a = arquetipoConArticulo(n);
      return a.startsWith('el ') ? `del ${a.slice(3)}` : `de ${a}`;
    });
    evidencia.push(`el arquetipo ${conDe.join(', ')} conquistado`);
  }
  if (evidencia.length > 0) {
    chapters.push({
      label: 'LA EVIDENCIA',
      text: `Lo que queda registrado: ${evidencia.join(' · ')}. Nada de esto es opinión — es lo que hiciste.`,
    });
  }

  const inactivo = input.daysSinceLastCheckIn !== undefined && !isRecent(input.daysSinceLastCheckIn);
  if (input.avgEnergy >= 7 && input.checkInsCount >= 5 && !inactivo) {
    chapters.push({
      label: 'HOY',
      text: `Tu energía promedio es ${Math.round(input.avgEnergy)}/10. El sistema está funcionando.`,
    });
  }

  return chapters;
}
