// ─── Sleep Sessions — guiones narrados para el Segundo Norman ──────────────────
// Cada pieza de la pantalla de Sueño (app/bienestar/sueno.tsx) tiene aquí su
// guión narrado: segmentos de voz con pausas largas entre ellos. El silencio
// entre `text` lo llena el ambiente sonoro (lluvia, bosque, océano) + binaural.
//
// `pauseAfter` = segundos de silencio/ambiente tras leer el segmento (clave en
// sleep stories: la voz aparece poco, el reposo manda).

export interface SleepSegment {
  text: string;
  /** Segundos de silencio + ambiente después de narrar este segmento. */
  pauseAfter: number;
}

export interface SleepSession {
  id: string;          // coincide con el SleepItem.id de sueno.tsx
  title: string;
  category: 'sos' | 'stories' | 'nidra' | 'relax';
  durationMinutes: number;
  segments: SleepSegment[];
}

import { SOS_SESSIONS } from './sleep/sos';
import { STORY_SESSIONS } from './sleep/stories';
import { NIDRA_SESSIONS } from './sleep/nidra';
import { RELAX_SESSIONS } from './sleep/relax';

export const SLEEP_SESSIONS: SleepSession[] = [
  ...SOS_SESSIONS,
  ...STORY_SESSIONS,
  ...NIDRA_SESSIONS,
  ...RELAX_SESSIONS,
];

/** Lookup helper used by the sleep player. */
export function getSleepScript(id: string): SleepSession | undefined {
  return SLEEP_SESSIONS.find((s) => s.id === id);
}
