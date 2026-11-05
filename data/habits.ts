// ─── Catálogo semilla de hábitos — Protocolo Soberano ────────────────────────
// Contenido dictado en el walkthrough de producto (2026-06-04, WS-4).
// Rutina MATUTINA y NOCTURNA en SECUENCIA (sequence_order), tipo "ruta paso a
// paso". `points` queda en datos por compatibilidad: la UI ya no muestra puntos.
// Cada hábito lleva su `importance` (una frase llana, sin mecanismos), opcionalmente una guía/video corto y `options` (variantes/recetas).
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
  /** variantes/recetas (ej. bebida matutina) */
  options?:    HabitOption[];
  /** nota/advertencia destacada */
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
    importance: 'Pasaste la noche sin beber. Un vaso de agua al levantarte es una forma fácil de empezar el día.',
    science:    'Empieza el día con un vaso de agua.',
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
    importance: 'Unos minutos en calma antes de mirar el teléfono: agradeces algo y eliges cómo quieres vivir el día.',
    science:    'Unos minutos en calma antes de empezar.',
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
    importance: 'Una bebida tibia antes de desayunar. Es un ritual para empezar despacio, no un remedio.',
    science:    'Una bebida tibia antes de desayunar.',
    reminderHour: 6,
    reminderMinute: 15,
    options: [
      { label: 'Agua tibia',                   detail: 'Base de la bebida — no fría, para no estresar la digestión.' },
      { label: 'Jugo de limón',                detail: 'Un chorrito, al gusto.' },
      { label: 'Sal del Himalaya (pizca)',     detail: 'Solo una pizca. Evítala si te indicaron reducir la sal.' },
      { label: 'Vinagre de manzana (1 cda)',   detail: 'Diluido en el agua. Opcional.' },
    ],
  },
  {
    category:   'grounding',
    icon:       'wb-sunny',
    name:       'Luz del sol 10–15 min',
    timeOfDay:  'morning',
    sequence:   4,
    points:     15,
    importance: 'Salir a la luz de la mañana ayuda a que el cuerpo sepa que empezó el día y, de noche, a que te dé sueño a tu hora.',
    science:    'Sal a la luz de la mañana unos minutos.',
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
    importance: 'Moverte media hora en la mañana suele mejorar el ánimo y la energía del resto del día.',
    science:    'Media hora de moverte, a tu ritmo.',
    route:      '/bienestar/tapping',
    reminderHour: 7,
    reminderMinute: 30,
    options: [
      { label: 'Tapping', detail: 'Golpecitos suaves para soltar tensión. Opcional.' },
    ],
  },
  {
    category:   'frio',
    icon:       'ac-unit',
    name:       'Ducha fría',
    timeOfDay:  'morning',
    sequence:   6,
    points:     20,
    importance: 'Terminar la ducha con agua fría despierta. Empieza con pocos segundos. Evítala si tienes problemas del corazón o presión alta.',
    science:    'Termina la ducha con unos segundos de agua fría.',
    reminderHour: 8,
    reminderMinute: 0,
  },
];

// ─── NOCTURNOS (en secuencia, para cerrar el día) ────────────────────────────
export const EVENING_HABITS: HabitTemplate[] = [
  {
    category:   'luz_roja',
    icon:       'nightlight',
    name:       'Luces bajas',
    timeOfDay:  'evening',
    sequence:   1,
    points:     15,
    importance: 'La luz fuerte de noche retrasa el sueño. Bajar las luces y las pantallas le avisa al cuerpo que ya es hora de descansar.',
    science:    'Baja las luces y las pantallas.',
    reminderHour: 20,
    reminderMinute: 0,
  },
  {
    category:   'ultima_comida',
    icon:       'restaurant',
    name:       'Cenar temprano',
    timeOfDay:  'evening',
    sequence:   2,
    points:     20,
    importance: 'Cenar unas horas antes de acostarte te deja dormir sin estar lleno.',
    science:    'Cena unas horas antes de dormir.',
    reminderHour: 18,
    reminderMinute: 45,
  },
  {
    category:   'frio_noche',
    icon:       'ac-unit',
    name:       'Ducha antes de dormir',
    timeOfDay:  'evening',
    sequence:   3,
    points:     15,
    importance: 'Una ducha tibia o fresca antes de dormir ayuda a soltar el día.',
    science:    'Una ducha para soltar el día.',
    reminderHour: 21,
    reminderMinute: 0,
  },
  {
    category:   'journaling',
    icon:       'edit-note',
    name:       'Escribir en el diario',
    timeOfDay:  'evening',
    sequence:   4,
    points:     20,
    importance: 'Escribir lo que te quedó dando vueltas ayuda a soltarlo antes de dormir.',
    science:    'Escribe lo que te quedó del día.',
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
    importance: 'Leer en papel es una buena forma de dejar las pantallas antes de dormir.',
    science:    'Lee en papel antes de dormir.',
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
