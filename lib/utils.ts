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

// ─── Sovereign Score ──────────────────────────────────────────────────────────

export interface SovereignScoreInput {
  energy: number;
  clarity: number;
  stress: number;
  checkIns: number;
  streak: number;
}

/**
 * Calculates the Sovereign Score (0–1000).
 * Formula:
 *   base        = ((energy + clarity + (10 - stress)) / 3) × 80
 *   consistency = min(checkIns × 8, 200)
 *   momentum    = min(streak × 12, 300)
 *   result      = min(round(base + consistency + momentum), 1000)
 */
export function calcSovereignScore(opts: SovereignScoreInput): number {
  const base = ((opts.energy + opts.clarity + (10 - opts.stress)) / 3) * 80;
  const consistency = Math.min(opts.checkIns * 8, 200);
  const momentum = Math.min(opts.streak * 12, 300);
  const raw = Math.round(base + consistency + momentum);
  return Math.min(raw, 1000);
}

export type SovereignTier = 'ELITE' | 'AVANZADO' | 'EN ASCENSO' | 'INICIANDO';

/**
 * Returns the tier label for a given Sovereign Score.
 * Tiers:  ELITE (≥800) · AVANZADO (≥600) · EN ASCENSO (≥400) · INICIANDO (<400)
 */
export function calcSovereignTier(score: number): SovereignTier {
  if (score >= 800) return 'ELITE';
  if (score >= 600) return 'AVANZADO';
  if (score >= 400) return 'EN ASCENSO';
  return 'INICIANDO';
}
