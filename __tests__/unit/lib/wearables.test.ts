/**
 * Unit tests — lib/wearables.ts
 *
 * Tests:
 *  1. normalizeOuraData  → produces correct WearableDaily schema
 *  2. normalizeWhoopData → produces correct WearableDaily schema
 *  3. calculateBiometricReadiness → 0-100, handles edge cases
 *  4. biometricNBADecision → returns correct action by recovery level
 */

import {
  normalizeOuraData,
  normalizeWhoopData,
  calculateBiometricReadiness,
  biometricNBADecision,
  recoveryLabel,
  hrvToNormanLanguage,
  type WearableDaily,
} from '@/lib/wearables';

// ── Supabase mock (wearables.ts imports supabase for hooks, not pure fns) ────
jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('@/app/config/env', () => ({
  ENV: { isDev: true },
}));

// ─── 1. normalizeOuraData ────────────────────────────────────────────────────

describe('normalizeOuraData', () => {
  const userId = 'test-user-123';

  const ouraRaw = {
    readiness: {
      day: '2026-05-06',
      score: 82,
      temperature_deviation: 0.3,
      contributors: {
        hrv_balance: 55,
        resting_heart_rate: 58,
        breathing_regularity: 97.5,
      },
    },
    sleep: {
      day: '2026-05-06',
      score: 76,
      contributors: {
        total_sleep: 27000,     // 450 min = 7.5h in seconds
        rem_sleep: 6000,        // 100 min in seconds
        deep_sleep: 4200,       // 70 min in seconds
      },
    },
    activity: {
      day: '2026-05-06',
      score: 68,
      active_calories: 420,
      steps: 8500,
      high_activity_time: 2400, // 40 min in seconds
    },
  };

  it('maps recovery fields correctly', () => {
    const result = normalizeOuraData(ouraRaw, userId);
    expect(result.user_id).toBe(userId);
    expect(result.provider).toBe('oura');
    expect(result.date).toBe('2026-05-06');
    expect(result.recovery_score).toBe(82);
    expect(result.hrv_ms).toBe(55);
    expect(result.resting_hr).toBe(58);
    expect(result.body_temp_delta).toBeCloseTo(0.3);
    expect(result.spo2_avg).toBeCloseTo(97.5);
  });

  it('maps sleep fields correctly', () => {
    const result = normalizeOuraData(ouraRaw, userId);
    expect(result.sleep_score).toBe(76);
    expect(result.sleep_duration_min).toBe(450);
    expect(result.rem_min).toBe(100);
    expect(result.deep_min).toBe(70);
  });

  it('maps activity fields correctly', () => {
    const result = normalizeOuraData(ouraRaw, userId);
    expect(result.activity_score).toBe(68);
    expect(result.calories_active).toBe(420);
    expect(result.steps).toBe(8500);
    expect(result.active_min).toBe(40);
  });

  it('handles missing fields gracefully', () => {
    const result = normalizeOuraData({}, userId);
    expect(result.provider).toBe('oura');
    expect(result.recovery_score).toBeNull();
    expect(result.sleep_score).toBeNull();
    expect(result.steps).toBeNull();
  });
});

// ─── 2. normalizeWhoopData ───────────────────────────────────────────────────

describe('normalizeWhoopData', () => {
  const userId = 'test-user-456';

  const whoopRaw = {
    recovery: {
      created_at: '2026-05-06T08:00:00Z',
      score: {
        recovery_score: 74,
        hrv_rmssd_milli: 62.5,
        resting_heart_rate: 55,
        spo2_percentage: 98.1,
        skin_temp_celsius: 36.8,
      },
    },
    sleep: {
      start: '2026-05-05T23:30:00Z',
      score: {
        sleep_performance_percentage: 81,
        total_in_bed_time_milli: 27900000,  // ~465 min
        sleep_efficiency_percentage: 90.5,
        stage_summary: {
          total_rem_sleep_time_milli: 5400000,   // 90 min
          total_slow_wave_sleep_time_milli: 4200000, // 70 min
          total_light_sleep_time_milli: 9000000, // 150 min
          total_awake_time_milli: 900000,        // 15 min
        },
      },
    },
    cycle: {
      start: '2026-05-06T00:00:00Z',
      score: {
        strain: 14.5,
        kilojoule: 2200,
      },
    },
  };

  it('maps recovery fields correctly', () => {
    const result = normalizeWhoopData(whoopRaw, userId);
    expect(result.user_id).toBe(userId);
    expect(result.provider).toBe('whoop');
    expect(result.date).toBe('2026-05-06');
    expect(result.recovery_score).toBe(74);
    expect(result.hrv_ms).toBeCloseTo(62.5);
    expect(result.resting_hr).toBe(55);
    expect(result.spo2_avg).toBeCloseTo(98.1);
  });

  it('maps sleep fields correctly', () => {
    const result = normalizeWhoopData(whoopRaw, userId);
    expect(result.sleep_score).toBe(81);
    expect(result.sleep_duration_min).toBe(465);
    expect(result.rem_min).toBe(90);
    expect(result.deep_min).toBe(70);
    expect(result.light_min).toBe(150);
    expect(result.awake_min).toBe(15);
    expect(result.sleep_efficiency).toBeCloseTo(90.5);
  });

  it('maps activity/strain correctly', () => {
    const result = normalizeWhoopData(whoopRaw, userId);
    expect(result.strain_score).toBeCloseTo(14.5);
    // kilojoule to kcal: 2200 / 4.184 ≈ 525.8 → rounded
    expect(result.calories_active).toBeCloseTo(526, 0);
  });

  it('handles missing fields gracefully', () => {
    const result = normalizeWhoopData({}, userId);
    expect(result.provider).toBe('whoop');
    expect(result.recovery_score).toBeNull();
    expect(result.hrv_ms).toBeNull();
  });
});

// ─── 3. calculateBiometricReadiness ─────────────────────────────────────────

describe('calculateBiometricReadiness', () => {
  const makeDay = (recovery_score: number | null): WearableDaily => ({
    id: 'x',
    user_id: 'u',
    provider: 'oura',
    date: '2026-05-06',
    recovery_score,
    sleep_score: null, sleep_duration_min: null, sleep_efficiency: null,
    rem_min: null, deep_min: null, light_min: null, awake_min: null,
    hrv_ms: null, resting_hr: null, body_temp_delta: null, spo2_avg: null,
    activity_score: null, strain_score: null, calories_active: null,
    steps: null, active_min: null, stress_score: null,
    synced_at: new Date().toISOString(),
  });

  it('returns 50 when no data', () => {
    expect(calculateBiometricReadiness([])).toBe(50);
  });

  it('returns avg of last 3 days recovery scores', () => {
    const days = [makeDay(80), makeDay(70), makeDay(60), makeDay(50)];
    // Takes first 3: [80, 70, 60] → avg = 70
    expect(calculateBiometricReadiness(days)).toBe(70);
  });

  it('returns 50 when all recovery scores are null', () => {
    expect(calculateBiometricReadiness([makeDay(null), makeDay(null)])).toBe(50);
  });

  it('handles single day', () => {
    expect(calculateBiometricReadiness([makeDay(90)])).toBe(90);
  });

  it('returns value in 0-100 range', () => {
    const result = calculateBiometricReadiness([makeDay(100), makeDay(85), makeDay(95)]);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});

// ─── 4. biometricNBADecision ─────────────────────────────────────────────────

describe('biometricNBADecision', () => {
  it('returns high urgency and rest action when readiness < 40', () => {
    const result = biometricNBADecision(30);
    expect(result.urgency).toBe('high');
    expect(result.action.toLowerCase()).toMatch(/descanso|recuper|delta/);
  });

  it('returns theta recommendation when readiness < 60 and low HRV', () => {
    const result = biometricNBADecision(50, 25);
    expect(result.urgency).toBe('normal');
    expect(result.action.toLowerCase()).toMatch(/theta|escuchar/);
  });

  it('returns breathing recommendation when readiness 40-60 with normal HRV', () => {
    const result = biometricNBADecision(55, 45);
    expect(result.urgency).toBe('normal');
    expect(result.action.toLowerCase()).toMatch(/breathing|breathing|moderado|4/);
  });

  it('returns peak action when readiness >= 60', () => {
    const result = biometricNBADecision(75);
    expect(result.urgency).toBe('low');
    expect(result.action.toLowerCase()).toMatch(/peak|óptim|ideal/);
  });
});

// ─── 5. Helper functions ──────────────────────────────────────────────────────

describe('recoveryLabel', () => {
  it('returns Óptimo for score >= 70', () => expect(recoveryLabel(75)).toBe('Óptimo'));
  it('returns Bueno for score 50-69', () => expect(recoveryLabel(60)).toBe('Bueno'));
  it('returns Moderado for score 30-49', () => expect(recoveryLabel(40)).toBe('Moderado'));
  it('returns Bajo for score < 30', () => expect(recoveryLabel(20)).toBe('Bajo'));
});

describe('hrvToNormanLanguage', () => {
  it('returns no-baseline message when baseline is null', () => {
    const result = hrvToNormanLanguage(50, null);
    expect(result).toContain('normalidad');
  });

  it('returns optimal message when HRV >= 115% of baseline', () => {
    const result = hrvToNormanLanguage(60, 50); // ratio = 1.2
    expect(result).toContain('óptima');
  });

  it('returns equilibrado when HRV is 90-115% of baseline', () => {
    const result = hrvToNormanLanguage(50, 50); // ratio = 1.0
    expect(result).toContain('equilibrado');
  });

  it('returns calma message when HRV < 75% of baseline', () => {
    const result = hrvToNormanLanguage(35, 50); // ratio = 0.7
    expect(result).toContain('calma');
  });
});
