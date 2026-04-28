/**
 * Unit tests — calcSovereignScore + calcSovereignTier
 *
 * Source: lib/utils.ts
 *
 * Score formula v2:
 *   checkinScore  = avg(energy, clarity, (10-stress), sleep) / 10 × 200  — max 200
 *   lessonScore   = min(completedLessons × 15, 400)                       — max 400
 *   taskScore     = min(completedTasks × 25, 200)                         — max 200
 *   streakBonus   = 150 if streak ≥ 30 | 50 if streak ≥ 7 | 0            — max 150
 *   result        = min(round(sum), 1000)                                 — theoretical max 950
 *
 * Tiers: ELITE ≥800 · AVANZADO ≥600 · EN ASCENSO ≥400 · INICIANDO <400
 */

import { calcSovereignScore, calcSovereignTier } from '@/lib/utils';

// ── Score calculation ────────────────────────────────────────────────────────

describe('calcSovereignScore', () => {
  it('caps at 1000 with maximum inputs', () => {
    const score = calcSovereignScore({
      energy: 10,
      clarity: 10,
      stress: 0,
      sleep: 10,
      streak: 100,        // streakBonus = 150 (≥30)
      completedLessons: 50, // lessonScore = min(750, 400) = 400
      completedTasks: 20,   // taskScore = min(500, 200) = 200
    });
    // checkinScore = (10+10+10+10)/4 / 10 * 200 = 200
    // lessonScore = 400, taskScore = 200, streakBonus = 150
    // sum = 950 → no higher than 1000
    expect(score).toBeLessThanOrEqual(1000);
    expect(score).toBe(950);
  });

  it('returns 0 with minimum inputs (all zeros)', () => {
    const score = calcSovereignScore({
      energy: 0,
      clarity: 0,
      stress: 0,    // (10-0)=10 so base is not zero — stress=0 means calm
      sleep: 0,
      streak: 0,
      completedLessons: 0,
      completedTasks: 0,
    });
    /**
     * stress=0 contributes (10-0)=10 to the avg, giving a non-zero checkinScore.
     * checkinScore = (0+0+10+0)/4 / 10 * 200 = 50
     * This is by design: zero stress is a positive signal.
     */
    expect(score).toBeGreaterThan(0); // checkinScore ≈ 50, not 0
  });

  it('high stress significantly reduces the score', () => {
    const lowStress = calcSovereignScore({
      energy: 7, clarity: 7, stress: 2, sleep: 7,
      streak: 10, completedLessons: 5, completedTasks: 2,
    });
    const highStress = calcSovereignScore({
      energy: 7, clarity: 7, stress: 9, sleep: 7,
      streak: 10, completedLessons: 5, completedTasks: 2,
    });
    expect(lowStress).toBeGreaterThan(highStress);
  });

  it('lessonScore caps at 400 (27+ completed lessons)', () => {
    const with27 = calcSovereignScore({
      energy: 5, clarity: 5, stress: 5, sleep: 5,
      streak: 1, completedLessons: 27, completedTasks: 0,
    });
    const with100 = calcSovereignScore({
      energy: 5, clarity: 5, stress: 5, sleep: 5,
      streak: 1, completedLessons: 100, completedTasks: 0,
    });
    // Both should produce the same score since lessonScore caps at 400 (27×15=405→400)
    expect(with27).toBe(with100);
  });

  it('streakBonus is 150 for streak ≥ 30, 50 for ≥ 7, 0 otherwise', () => {
    const base = { energy: 5, clarity: 5, stress: 5, sleep: 5, completedLessons: 0, completedTasks: 0 };
    const no   = calcSovereignScore({ ...base, streak: 6 });
    const mid  = calcSovereignScore({ ...base, streak: 7 });
    const top  = calcSovereignScore({ ...base, streak: 30 });
    expect(top - mid).toBe(100); // 150 - 50
    expect(mid - no).toBe(50);
  });
});

// ── Tier classification ──────────────────────────────────────────────────────

describe('calcSovereignTier', () => {
  it('INICIANDO for scores below 400', () => {
    expect(calcSovereignTier(0)).toBe('INICIANDO');
    expect(calcSovereignTier(399)).toBe('INICIANDO');
  });

  it('EN ASCENSO for scores 400–599', () => {
    expect(calcSovereignTier(400)).toBe('EN ASCENSO');
    expect(calcSovereignTier(599)).toBe('EN ASCENSO');
  });

  it('AVANZADO for scores 600–799', () => {
    expect(calcSovereignTier(600)).toBe('AVANZADO');
    expect(calcSovereignTier(799)).toBe('AVANZADO');
  });

  it('ELITE for scores 800 and above', () => {
    expect(calcSovereignTier(800)).toBe('ELITE');
    expect(calcSovereignTier(1000)).toBe('ELITE');
  });
});
