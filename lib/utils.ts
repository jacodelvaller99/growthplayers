// ─── Pure helpers — extracted for testability ────────────────────────────────

/** Raw day counter (1-based, uncapped). Used internally and for other calculations. */
export function diffDays(fromIso: string): number {
  const ms = new Date().getTime() - new Date(fromIso).getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

/**
 * Protocol day (1–90 hard cap).
 *
 * The Protocolo Soberano is a 90-day program. Once completed, the counter
 * stays at 90 rather than incrementing beyond the program boundary.
 * Use this everywhere protocolDay is displayed to the user.
 */
export function calcProtocolDay(fromIso: string): number {
  return Math.min(diffDays(fromIso), 90);
}

// ─── Sovereign Score v2 ───────────────────────────────────────────────────────

export interface SovereignScoreInput {
  energy: number;
  clarity: number;
  stress: number;
  sleep: number;
  streak: number;
  completedLessons: number;
  completedTasks: number;
}

/**
 * Sovereign Score v2 (0–1000).
 *
 * checkinScore  = avg(energy, clarity, (10-stress), sleep) / 10 × 200  — max 200
 * lessonScore   = min(completedLessons × 15, 400)                       — max 400
 * taskScore     = min(completedTasks × 25, 200)                         — max 200
 * streakBonus   = 150 if streak ≥ 30 | 50 if streak ≥ 7 | 0            — max 150
 * result        = min(round(sum), 1000)
 */
export function calcSovereignScore(opts: SovereignScoreInput): number {
  const checkinScore =
    ((opts.energy + opts.clarity + (10 - opts.stress) + opts.sleep) / 4) * 20;
  const lessonScore = Math.min(opts.completedLessons * 15, 400);
  const taskScore   = Math.min(opts.completedTasks * 25, 200);
  const streakBonus = opts.streak >= 30 ? 150 : opts.streak >= 7 ? 50 : 0;
  return Math.min(Math.round(checkinScore + lessonScore + taskScore + streakBonus), 1000);
}

export type SovereignTier = 'ELITE' | 'AVANZADO' | 'EN ASCENSO' | 'INICIANDO';

/**
 * Tier from score: ELITE (≥800) · AVANZADO (≥600) · EN ASCENSO (≥400) · INICIANDO (<400)
 */
export function calcSovereignTier(score: number): SovereignTier {
  if (score >= 800) return 'ELITE';
  if (score >= 600) return 'AVANZADO';
  if (score >= 400) return 'EN ASCENSO';
  return 'INICIANDO';
}
