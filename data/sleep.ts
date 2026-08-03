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

/**
 * Duración real del guión narrado, en segundos: suma de `duration` +
 * `pauseAfter` de cada fase — el mismo criterio que usa el timer de respaldo
 * de `createNarrationPlayer` fase a fase.
 *
 * `sueno.tsx` usaba `parseDurationSecs(item.duration)` (la etiqueta de
 * marketing de la tarjeta, ej. "20 min" → 1200) como `targetSeconds` del
 * engine. Esa cifra no tiene relación con el guión real: cuando el guión dura
 * más que la etiqueta, el timer del engine paraba la sesión — y con ella la
 * voz de Norman — a mitad de frase. El label de la tarjeta no cambia; solo el
 * timer interno debe derivarse de esto cuando hay guión.
 */
export function sleepScriptSeconds(session: SleepSession): number {
  return sleepSegmentsToPhases(session)
    .reduce((total, phase) => total + phase.duration + phase.pauseAfter, 0);
}
