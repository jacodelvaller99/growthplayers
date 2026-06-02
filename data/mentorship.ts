/**
 * mentorship.ts — La estructura del journey de mentoría (semana a semana).
 *
 * Mapea el programa Polaris a un recorrido de sesiones semanales con el
 * Navegador: qué trabajar cada semana, qué ver y qué tareas quedan.
 * El estado dinámico (notas de sesión, plan de acción IA) vive en
 * hooks/use-mentorship.tsx.
 */
import { POLARIS_MODULES } from './modules';

export interface MentorshipWeek {
  week: number;        // 1..N
  moduleId: string;    // enlaza con POLARIS_MODULES
  phase: string;       // título del módulo
  focus: string;       // foco de la mentoría esa semana
  tasks: string[];     // tareas de la semana
}

// Foco + tareas curadas por módulo (la voz del método, en términos Polaris).
const WEEK_META: Record<string, { focus: string; tasks: string[] }> = {
  onboarding: {
    focus: 'Conoce el método, configura tu sistema y declara tu Norte.',
    tasks: [
      'Completa tu perfil y declara tu Norte',
      'Mira los 7 videos de Onboarding',
      'Haz tu primer check-in diario',
    ],
  },
  'modulo-1': {
    focus: 'Detecta las creencias que te frenan y reescribe tu identidad.',
    tasks: [
      'Mira las lecciones de Guerrero · Mentalidad',
      'Detecta 3 creencias limitantes en tu operación',
      'Escribe tu nueva identidad declarada',
    ],
  },
  'modulo-2': {
    focus: 'Domina tu mundo interno: nombra y regula tus emociones.',
    tasks: [
      'Mira las lecciones de Emociones · Autoconocimiento',
      'Haz una sesión de escritura terapéutica',
      'Ubícate en la Escala de Consciencia esta semana',
    ],
  },
  'modulo-3': {
    focus: 'Profundiza en tu propósito y las leyes que gobiernan tu avance.',
    tasks: [
      'Mira las lecciones de Maduración del Guerrero',
      'Redacta tu sentido y propósito de vida',
      'Aplica HISAR–PERAS a una situación real',
    ],
  },
  'modulo-4': {
    focus: 'Opera desde tu máximo potencial: instala el estado de Flow.',
    tasks: [
      'Mira las lecciones de Pontífice · Estado de Flow',
      'Ejecuta un bloque profundo de 90 min sin mensajería',
      'Registra qué disparó tu mejor estado de la semana',
    ],
  },
  'modulo-5': {
    focus: 'Sube al 4º nivel de consciencia: cooperación y energía como moneda.',
    tasks: [
      'Mira la Intro al 4to Nivel de Consciencia',
      'Identifica una relación para operar en cooperación',
      'Observa dónde gastas energía sin retorno',
    ],
  },
  'modulo-6': {
    focus: 'Gestiona el tiempo como un mercader: una batalla, no diez.',
    tasks: [
      'Mira las lecciones de Mercader · Gestión del Tiempo',
      'Define la batalla única de cada día de la semana',
      'Delega, agenda o elimina 3 tareas de ruido',
    ],
  },
  'modulo-7': {
    focus: 'Construye relaciones que potencian tu Norte.',
    tasks: [
      'Mira las lecciones de Mercader · Relaciones',
      'Mapea tu Dream 10 de relaciones estratégicas',
      'Ten una conversación pendiente que evitabas',
    ],
  },
  'modulo-8': {
    focus: 'Instala la No Negociación: tus límites como sistema.',
    tasks: [
      'Mira las lecciones de La No Negociación',
      'Define tus 3 no negociables y blíndalos',
      'Di que no a una solicitud que rompía tu sistema',
    ],
  },
  'modulo-9': {
    focus: 'Integra todo: la logrología de tu vida soberana.',
    tasks: [
      'Mira las lecciones de Logrología',
      'Revisa tu Norte y ajústalo con lo aprendido',
      'Define tu siguiente cumbre de 90 días',
    ],
  },
};

/** El programa completo, derivado de los módulos reales. */
export const MENTORSHIP_PROGRAM: MentorshipWeek[] = POLARIS_MODULES.map((m, i) => ({
  week: i + 1,
  moduleId: m.id,
  phase: m.title,
  focus: WEEK_META[m.id]?.focus ?? m.subtitle,
  tasks: WEEK_META[m.id]?.tasks ?? [],
}));

export const TOTAL_WEEKS = MENTORSHIP_PROGRAM.length;

/** Semana actual (1..TOTAL_WEEKS) a partir del día de protocolo. */
export function currentWeekNumber(protocolDay: number): number {
  return Math.min(Math.max(Math.ceil(protocolDay / 7), 1), TOTAL_WEEKS);
}

/** La semana del programa correspondiente al día de protocolo. */
export function currentWeek(protocolDay: number): MentorshipWeek {
  return MENTORSHIP_PROGRAM[currentWeekNumber(protocolDay) - 1];
}

/** Estado de una semana según el progreso. */
export type WeekStatus = 'completada' | 'actual' | 'proxima';
export function weekStatus(week: number, protocolDay: number): WeekStatus {
  const cur = currentWeekNumber(protocolDay);
  if (week < cur) return 'completada';
  if (week === cur) return 'actual';
  return 'proxima';
}
