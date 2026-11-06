/**
 * Reloj de práctica (meditación, respiración, movimiento, grito).
 *
 * El tiempo se DERIVA de la hora real, no se cuenta por tics: el navegador
 * frena setInterval con la pantalla bloqueada o la pestaña en segundo plano, y
 * un contador por tics se atrasa mientras el audio sigue. Las pausas no cuentan.
 * Puro y testeado; el hook `usePracticeClock` solo lo refresca.
 */
export type ClockState = { activeMs: number; resumedAt: number | null };

export const CLOCK_IDLE: ClockState = { activeMs: 0, resumedAt: null };

export const clockStart = (now: number): ClockState => ({ activeMs: 0, resumedAt: now });
export const clockPause = (c: ClockState, now: number): ClockState =>
  c.resumedAt == null ? c : { activeMs: c.activeMs + (now - c.resumedAt), resumedAt: null };
export const clockResume = (c: ClockState, now: number): ClockState =>
  c.resumedAt != null ? c : { ...c, resumedAt: now };

/** Segundos activos (sin pausas), con decimales. */
export const clockSeconds = (c: ClockState, now: number): number =>
  (c.activeMs + (c.resumedAt != null ? now - c.resumedAt : 0)) / 1000;

/**
 * Fase en curso para una lista de duraciones (s). `loop`: vuelve a empezar
 * (respiración, fases de meditación); si no, se queda en la última.
 * `left` en segundos enteros hacia arriba (lo que se muestra), `round` = vuelta.
 */
export function phaseAt(durations: number[], elapsed: number, loop = false) {
  const total = durations.reduce((a, d) => a + d, 0);
  if (!durations.length || total <= 0) return { index: 0, left: 0, round: 0, done: true };
  const round = Math.floor(elapsed / total);
  if (!loop && elapsed >= total) return { index: durations.length - 1, left: 0, round: 0, done: true };
  let t = loop ? elapsed - round * total : elapsed;
  for (let i = 0; i < durations.length; i++) {
    if (t < durations[i]) return { index: i, left: Math.ceil(durations[i] - t), round, done: false };
    t -= durations[i];
  }
  return { index: durations.length - 1, left: 0, round, done: !loop };
}

/** 125 → «02:05». */
export const mmss = (secs: number) => {
  const s = Math.max(0, Math.ceil(secs));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
