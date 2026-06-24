// ─── Catálogo semilla de hábitos — Protocolo Soberano ────────────────────────
// Contenido dictado en el walkthrough de producto (2026-06-04, WS-4).
// Rutina MATUTINA y NOCTURNA en SECUENCIA (sequence_order), tipo "ruta paso a
// paso". Cada hábito suma `points` al completarse, lleva su `importance` (por qué
// importa), opcionalmente una guía/video corto y `options` (variantes/recetas).
//
// Estos campos viven en las columnas nuevas de `habits`
// (migración 20260604000000_meeting_features.sql). Como esas columnas NO están en
// los tipos generados, el cliente accede a la tabla SIN TIPAR (db2 / anyClient).

import type MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';

/** Nombre de ícono válido de MaterialIcons (mismo patrón que components/polaris.tsx). */
type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export type TimeOfDay = 'morning' | 'evening' | 'anytime';

/** Una opción/variante de un hábito (ej. receta del café, bebida matutina). */
export interface HabitOption {
  label: string;
  detail?: string;
}

/** Plantilla de hábito del catálogo semilla. */
export interface HabitTemplate {
  /** clave estable — se persiste en habits.category para evitar duplicados */
  category:    string;
  icon:        MaterialIconName;
  name:        string;
  timeOfDay:   TimeOfDay;
  /** orden dentro de su rutina (1 = primero del día / de la noche) */
  sequence:    number;
  /** puntos que suma al completarse */
  points:      number;
  /** por qué importa — explicación breve mostrada en el detalle */
  importance:  string;
  /** ciencia/resumen corto para la fila (compat con el diseño actual) */
  science:     string;
  /** ruta interna de la práctica relacionada (deep-link de la notificación) */
  route?:      string;
  /** URL de video corto explicativo (opcional) */
  videoUrl?:   string;
  /** URL de guía/lectura (opcional) */
  guideUrl?:   string;
  /** hora sugerida para el recordatorio (0–23). Habilita WS-7. */
  reminderHour?:   number;
  reminderMinute?: number;
  /** variantes/recetas (ej. café bulletproof, bebida matutina) */
  options?:    HabitOption[];
  /** nota/advertencia destacada (ej. "rompe la autofagia") */
  warning?:    string;
}

// ─── MATUTINOS (en secuencia, al despertar) ──────────────────────────────────
export const MORNING_HABITS: HabitTemplate[] = [
  {
    category:   'agua',
    icon:       'water-drop',
    name:       'Beber agua al despertar',
    timeOfDay:  'morning',
    sequence:   1,
    points:     10,
    importance: 'Tras 7–8 horas sin líquidos, el cuerpo despierta algo deshidratado. Rehidratar al levantarte apoya la concentración, la energía y la función renal —el órgano que realmente filtra los desechos.',
    science:    'Rehidrata tras el ayuno nocturno. Apoya energía y función renal.',
    reminderHour: 6,
    reminderMinute: 0,
  },
  {
    category:   'meditacion',
    icon:       'self-improvement',
    name:       'Meditación matutina',
    timeOfDay:  'morning',
    sequence:   2,
    points:     20,
    importance: 'Antes de reaccionar al mundo, te enraízas. Agradeces lo que ya tienes y creas el día con intención: defines cómo quieres sentirte y qué quieres lograr.',
    science:    'Agradecimiento + creación del día. Reduce cortisol, activa la corteza prefrontal.',
    route:      '/bienestar/meditacion',
    reminderHour: 6,
    reminderMinute: 30,
    options: [
      { label: 'Agradecimiento', detail: 'Enumera 3 cosas por las que estás agradecido hoy.' },
      { label: 'Creación del día', detail: 'Visualiza el día ya logrado: cómo te sientes y qué conseguiste.' },
    ],
  },
  {
    category:   'bebida_matutina',
    icon:       'local-cafe',
    name:       'Bebida matutina en ayunas',
    timeOfDay:  'morning',
    sequence:   3,
    points:     15,
    importance: 'Una bebida alcalinizante en ayunas prepara el sistema digestivo, apoya la producción de ácido estomacal y equilibra los electrolitos antes de la primera comida.',
    science:    'Alcaliniza, hidrata y apoya la digestión antes de la primera comida.',
    reminderHour: 6,
    reminderMinute: 15,
    options: [
      { label: 'Agua tibia',                   detail: 'Base de la bebida — no fría, para no estresar la digestión.' },
      { label: 'Jugo de limón',                detail: 'Vitamina C y efecto alcalinizante.' },
      { label: 'Sal del Himalaya (pizca)',     detail: 'Minerales y electrolitos.' },
      { label: 'Vinagre de manzana (1 cda)',   detail: 'Apoya la digestión y la glucosa en ayunas.' },
    ],
  },
  {
    category:   'grounding',
    icon:       'wb-sunny',
    name:       'Grounding / Sol 10–15 min',
    timeOfDay:  'morning',
    sequence:   4,
    points:     15,
    importance: 'La luz solar matutina en los ojos y la piel regula el ritmo circadiano y dispara la síntesis de vitamina D. El contacto con la tierra (grounding) reduce la inflamación y calma el sistema nervioso.',
    science:    'Regula el ritmo circadiano. Reduce inflamación. Sintetiza vitamina D.',
    reminderHour: 7,
    reminderMinute: 0,
  },
  {
    category:   'movimiento',
    icon:       'fitness-center',
    name:       'Movimiento 30 min',
    timeOfDay:  'morning',
    sequence:   5,
    points:     25,
    importance: 'Mover el cuerpo en la mañana libera BDNF, mejora el ánimo y deja la mente clara para el resto del día. Incluye tapping para descargar tensión emocional.',
    science:    'Libera BDNF. Mejora el ánimo y la claridad mental.',
    route:      '/bienestar/tapping',
    reminderHour: 7,
    reminderMinute: 30,
    options: [
      { label: 'Tapping', detail: 'Golpeteo en puntos de meridianos para descargar tensión.' },
    ],
  },
  {
    category:   'frio',
    icon:       'ac-unit',
    name:       'Ducha fría',
    timeOfDay:  'morning',
    sequence:   6,
    points:     20,
    importance: 'La exposición al frío dispara norepinefrina, mejora el foco, la resistencia al estrés y la recuperación. Termina la rutina matutina activando el sistema.',
    science:    'Activa norepinefrina. Mejora foco y resistencia al frío.',
    reminderHour: 8,
    reminderMinute: 0,
  },
  {
    category:   'cafe_bulletproof',
    icon:       'coffee',
    name:       'Café bulletproof',
    timeOfDay:  'morning',
    sequence:   7,
    points:     10,
    importance: 'Café con grasas saludables para energía sostenida y enfoque sin picos de glucosa. Opcional dentro de la rutina.',
    science:    'Energía sostenida y enfoque. Grasas saludables como combustible.',
    warning:    'Rompe la autofagia — evítalo si estás en ayuno prolongado.',
    options: [
      { label: 'Café',               detail: 'Base — recién hecho.' },
      { label: 'Mantequilla ghee',   detail: 'Grasa limpia, sin lactosa.' },
      { label: 'Aceite de coco',     detail: 'Triglicéridos de cadena media (MCT) para energía rápida.' },
    ],
  },
];

// ─── NOCTURNOS (en secuencia, para cerrar el día) ────────────────────────────
export const EVENING_HABITS: HabitTemplate[] = [
  {
    category:   'luz_roja',
    icon:       'nightlight',
    name:       'Apagar luz blanca/azul · luz roja',
    timeOfDay:  'evening',
    sequence:   1,
    points:     15,
    importance: 'La luz azul/blanca de la noche suprime la melatonina y retrasa el sueño. Cambiar a luz roja le indica al cuerpo que es hora de descansar y protege tu descanso profundo.',
    science:    'Protege la melatonina. Prepara el cuerpo para el sueño profundo.',
    reminderHour: 20,
    reminderMinute: 0,
  },
  {
    category:   'ultima_comida',
    icon:       'restaurant',
    name:       'Última comida antes del atardecer',
    timeOfDay:  'evening',
    sequence:   2,
    points:     20,
    importance: 'Cenar temprano (~7pm) deja que la digestión termine antes de dormir, mejora la calidad del sueño y alarga la ventana de ayuno nocturno.',
    science:    'Mejora la calidad del sueño. Alarga el ayuno nocturno.',
    reminderHour: 18,
    reminderMinute: 45,
  },
  {
    category:   'frio_noche',
    icon:       'ac-unit',
    name:       'Ducha fría / refrescante',
    timeOfDay:  'evening',
    sequence:   3,
    points:     15,
    importance: 'Una ducha refrescante baja la temperatura corporal central, lo que facilita conciliar el sueño y descargar la tensión del día.',
    science:    'Baja la temperatura central. Facilita conciliar el sueño.',
    reminderHour: 21,
    reminderMinute: 0,
  },
  {
    category:   'journaling',
    icon:       'edit-note',
    name:       'Journaling',
    timeOfDay:  'evening',
    sequence:   4,
    points:     20,
    importance: 'Escribir antes de dormir cierra los ciclos mentales abiertos, procesa las emociones del día y libera la mente para descansar.',
    science:    'Cierra ciclos mentales. Procesa emociones del día.',
    route:      '/bienestar/diario',
    reminderHour: 21,
    reminderMinute: 30,
  },
  {
    category:   'lectura',
    icon:       'menu-book',
    name:       'Lectura 30 min',
    timeOfDay:  'evening',
    sequence:   5,
    points:     15,
    importance: 'Leer (en papel o luz cálida) relaja el sistema nervioso, reduce el cortisol y reemplaza las pantallas como última actividad del día.',
    science:    'Relaja el sistema nervioso. Mejor que las pantallas antes de dormir.',
    reminderHour: 22,
    reminderMinute: 0,
  },
];

export const HABIT_CATALOG: HabitTemplate[] = [...MORNING_HABITS, ...EVENING_HABITS];

/** Busca la plantilla por category (clave estable). */
export function findTemplate(category: string): HabitTemplate | undefined {
  return HABIT_CATALOG.find((t) => t.category === category);
}

export const TIME_OF_DAY_LABEL: Record<TimeOfDay, string> = {
  morning: 'RUTINA MATUTINA',
  evening: 'RUTINA NOCTURNA',
  anytime: 'OTROS HÁBITOS',
};
