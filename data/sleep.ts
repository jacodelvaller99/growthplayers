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

import { estimateVoiceSeconds, normanVoiceUrl } from './wellness';
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

// `estimateVoiceSeconds` vive en ./wellness y se re-exporta aquí por
// comodidad de los consumidores de Sueño. Una sola definición para Sueño y
// Meditación: si divergieran, el reparto de pausas de cada práctica se
// calcularía con constantes distintas y sonarían a ritmos distintos.
export { estimateVoiceSeconds } from './wellness';

/**
 * Convierte los segmentos de un guión de sueño en fases listas para
 * `createNarrationPlayer`: duración, pausa y URL del mp3 de voz.
 *
 * La duración es voz estimada + su pausa, así el reloj de la fase nunca vence
 * antes de que Norman termine de hablar. La URL se deriva posicionalmente
 * (`<session_id>/<session_id>-<índice>.mp3`) porque los segmentos de sueño no
 * declaran id — reusa `normanVoiceUrl` para que el generador de voz y la app
 * construyan exactamente la misma ruta.
 */
export function sleepSegmentsToPhases(session: SleepSession) {
  return session.segments.map((seg, i) => ({
    duration: estimateVoiceSeconds(seg.text) + seg.pauseAfter,
    pauseAfter: seg.pauseAfter,
    url: normanVoiceUrl(session.id, {}, i),
  }));
}
