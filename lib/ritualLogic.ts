/**
 * ritualLogic — el umbral diario: "apenas abrimos la app debemos respirar".
 *
 * Puro, sin IO/React/relojes — misma convención de `localDateKey` que
 * jornadaLogic (día LOCAL, no UTC). Un solo log local (`ritual:v1`) que
 * guarda si el ritual de HOY ya se hizo y el modo elegido (persiste entre
 * días: quien elige "por tu cuenta" no vuelve a ver el selector).
 */

export const RITUAL_LOG_KEY = 'ritual:v1';

export type RitualMode = 'guiado' | 'libre';

export interface RitualLog {
  /** 'YYYY-MM-DD' local del último ritual completado. */
  date: string;
  mode: RitualMode;
}

/** true ⇔ hoy todavía no se hizo el ritual (día nuevo o primera vez). */
export function needsRitual(today: string, log: RitualLog | null): boolean {
  return log === null || log.date !== today;
}

export function withRitualDone(today: string, mode: RitualMode): RitualLog {
  return { date: today, mode };
}
