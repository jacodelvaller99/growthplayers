import {
  sleepState, recoveryState, coherenceState, fatigueRisk, trendState,
  interventionLevel, reflectionMismatch, computeInsight, computeBaseline,
  type DailyMetrics, type Baseline,
} from '@/lib/biometricLogic';
import { generateSeries, generateDay, SCENARIOS } from '@/lib/biometricSimulator';

const datesFor = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => `2026-06-${String(i + 1).padStart(2, '0')}`);

// ─── sleepState ───────────────────────────────────────────────────────────────
describe('sleepState', () => {
  it('prioriza sleep_score cuando existe', () => {
    expect(sleepState({ sleep_score: 90 })).toBe('excellent');
    expect(sleepState({ sleep_score: 72 })).toBe('good');
    expect(sleepState({ sleep_score: 58 })).toBe('fragile');
    expect(sleepState({ sleep_score: 42 })).toBe('poor');
    expect(sleepState({ sleep_score: 20 })).toBe('critical');
  });
  it('deriva de duración + eficiencia sin score', () => {
    expect(sleepState({ sleep_duration_min: 480, sleep_efficiency: 90 })).toBe('excellent');
    expect(sleepState({ sleep_duration_min: 420, sleep_efficiency: 83 })).toBe('good');
    expect(sleepState({ sleep_duration_min: 300, sleep_efficiency: 70 })).toBe('poor');
    expect(sleepState({ sleep_duration_min: 240 })).toBe('critical');
  });
  it('sin datos → frágil (neutro)', () => {
    expect(sleepState({})).toBe('fragile');
  });
});

// ─── recoveryState ──────────────────────────────────────────────────────────────
describe('recoveryState', () => {
  it('mapea bandas', () => {
    expect(recoveryState({ recovery_score: 80 })).toBe('strong');
    expect(recoveryState({ recovery_score: 60 })).toBe('adequate');
    expect(recoveryState({ recovery_score: 45 })).toBe('compromised');
    expect(recoveryState({ recovery_score: 30 })).toBe('weak');
    expect(recoveryState({ recovery_score: 10 })).toBe('high_risk');
  });
  it('sin dato → comprometido (neutro)', () => {
    expect(recoveryState({})).toBe('compromised');
  });
});

// ─── coherenceState ─────────────────────────────────────────────────────────────
describe('coherenceState', () => {
  const base: Baseline = { hrv: 60, resting_hr: 52 };
  it('estable cuando HRV/RHR ~ baseline', () => {
    expect(coherenceState({ hrv_ms: 60, resting_hr: 52 }, base)).toBe('stable');
  });
  it('se degrada con caída de HRV + subida de RHR', () => {
    expect(coherenceState({ hrv_ms: 40, resting_hr: 62 }, base)).toBe('highly_unstable');
  });
  it('sin HRV → ligeramente perturbado (neutro)', () => {
    expect(coherenceState({ resting_hr: 52 }, base)).toBe('slightly_disturbed');
  });
});

// ─── fatigueRisk ────────────────────────────────────────────────────────────────
describe('fatigueRisk', () => {
  const base: Baseline = { hrv: 60, resting_hr: 52 };
  it('bajo con buenas señales', () => {
    expect(fatigueRisk({ recovery_score: 75, sleep_duration_min: 470, hrv_ms: 60, resting_hr: 52 }, base)).toBe('low');
  });
  it('alto con recuperación + sueño + HRV/RHR malos', () => {
    expect(fatigueRisk({ recovery_score: 30, sleep_duration_min: 300, hrv_ms: 40, resting_hr: 60 }, base)).toBe('high');
  });
});

// ─── trendState ─────────────────────────────────────────────────────────────────
describe('trendState', () => {
  const mk = (vals: number[]): DailyMetrics[] => vals.map((v) => ({ recovery_score: v }));
  it('mejora con pendiente ascendente suave', () => {
    expect(trendState(mk([40, 48, 56, 64, 72]))).toBe('improving');
  });
  it('empeora con pendiente descendente suave', () => {
    expect(trendState(mk([72, 64, 56, 48, 40]))).toBe('worsening');
  });
  it('volátil con saltos grandes', () => {
    expect(trendState(mk([70, 30, 75, 28, 72]))).toBe('volatile');
  });
  it('estable y < 3 días', () => {
    expect(trendState(mk([60, 61, 59, 60]))).toBe('stable');
    expect(trendState(mk([60, 40]))).toBe('stable');
  });
});

// ─── interventionLevel ──────────────────────────────────────────────────────────
describe('interventionLevel', () => {
  it('urgente con riesgo alto de recuperación', () => {
    expect(interventionLevel('high_risk', 'stable', 'moderate', 'stable')).toBe('urgent');
  });
  it('urgente con coherencia muy inestable', () => {
    expect(interventionLevel('adequate', 'highly_unstable', 'low', 'stable')).toBe('urgent');
  });
  it('alto con recuperación débil', () => {
    expect(interventionLevel('weak', 'slightly_disturbed', 'moderate', 'stable')).toBe('high');
  });
  it('bajo cuando todo está bien', () => {
    expect(interventionLevel('strong', 'stable', 'low', 'stable')).toBe('low');
  });
});

// ─── reflectionMismatch ─────────────────────────────────────────────────────────
describe('reflectionMismatch', () => {
  it('detecta energía alta con cuerpo comprometido', () => {
    expect(reflectionMismatch({ energy: 'high' }, 'high_risk')).toBe(true);
    expect(reflectionMismatch({ mood: 9 }, 'weak')).toBe(true);
  });
  it('detecta energía baja con cuerpo fuerte', () => {
    expect(reflectionMismatch({ energy: 'low' }, 'strong')).toBe(true);
  });
  it('sin mismatch cuando concuerdan', () => {
    expect(reflectionMismatch({ energy: 'high' }, 'strong')).toBe(false);
    expect(reflectionMismatch({ energy: 'low' }, 'weak')).toBe(false);
  });
});

// ─── computeInsight ─────────────────────────────────────────────────────────────
describe('computeInsight', () => {
  const base: Baseline = { hrv: 60, resting_hr: 52, recovery: 65 };
  it('día sólido → intervención baja + resumen cliente positivo', () => {
    const today: DailyMetrics = {
      date: '2026-06-10', sleep_score: 88, sleep_duration_min: 470, sleep_efficiency: 92,
      recovery_score: 78, hrv_ms: 62, resting_hr: 51,
    };
    const recent = [60, 64, 70, 74, 78].map((v) => ({ recovery_score: v }));
    const out = computeInsight(today, base, recent);
    expect(out.intervention_level).toBe('low');
    expect(out.sleep_state).toBe('excellent');
    expect(out.recovery_state).toBe('strong');
    expect(out.client_safe_summary).toMatch(/respondiendo bien/i);
  });
  it('día crítico → drivers presentes + cliente en tono de cuidado', () => {
    const today: DailyMetrics = {
      date: '2026-06-11', sleep_duration_min: 300, sleep_efficiency: 70,
      recovery_score: 22, hrv_ms: 38, resting_hr: 64, respiratory_rate: 19,
    };
    const recent = [60, 50, 40, 30, 22].map((v) => ({ recovery_score: v }));
    const out = computeInsight(today, base, recent);
    expect(['high', 'urgent']).toContain(out.intervention_level);
    expect(out.drivers.length).toBeGreaterThan(0);
    expect(out.drivers.some((d) => /HRV/.test(d))).toBe(true);
    expect(out.client_safe_summary).toMatch(/descanso/i);
    // El resumen del coach es operativo (incluye drivers + nivel).
    expect(out.coach_safe_summary).toMatch(/Intervención/);
  });
});

// ─── computeBaseline ────────────────────────────────────────────────────────────
describe('computeBaseline', () => {
  it('promedia las series presentes e ignora nulos', () => {
    const days: DailyMetrics[] = [
      { hrv_ms: 60, resting_hr: 50, recovery_score: 70 },
      { hrv_ms: 50, resting_hr: 54, recovery_score: 60 },
      { hrv_ms: null, resting_hr: 52, recovery_score: null },
    ];
    const b = computeBaseline(days);
    expect(b.hrv).toBe(55);
    expect(b.resting_hr).toBe(52);
    expect(b.recovery).toBe(65);
  });
  it('serie vacía → nulos', () => {
    expect(computeBaseline([])).toEqual({ hrv: null, resting_hr: null, recovery: null });
  });
});

// ─── simulador determinista ─────────────────────────────────────────────────────
describe('biometricSimulator', () => {
  it('misma semilla → serie idéntica (determinismo)', () => {
    const a = generateSeries({ scenario: 'burnout_week', dates: datesFor(7), seed: 42 });
    const b = generateSeries({ scenario: 'burnout_week', dates: datesFor(7), seed: 42 });
    expect(a).toEqual(b);
  });
  it('semillas distintas → series distintas', () => {
    const a = generateSeries({ scenario: 'good_week', dates: datesFor(7), seed: 1 });
    const b = generateSeries({ scenario: 'good_week', dates: datesFor(7), seed: 2 });
    expect(a).not.toEqual(b);
  });
  it('marca provider synthetic y respeta rangos plausibles', () => {
    const series = generateSeries({ scenario: 'good_week', dates: datesFor(7), seed: 7, userId: 'u1' });
    for (const d of series) {
      expect(d.provider).toBe('synthetic');
      expect(d.user_id).toBe('u1');
      expect(d.recovery_score).toBeGreaterThanOrEqual(5);
      expect(d.recovery_score).toBeLessThanOrEqual(99);
      expect(d.hrv_ms as number).toBeGreaterThan(0);
      expect(d.sleep_duration_min as number).toBeGreaterThan(0);
    }
  });
  it('burnout decae y recovery_week mejora (la narrativa se sostiene en los scores)', () => {
    const burn = generateSeries({ scenario: 'burnout_week', dates: datesFor(7), seed: 3 });
    const rec = generateSeries({ scenario: 'recovery_week', dates: datesFor(7), seed: 3 });
    expect((burn[0].recovery_score as number)).toBeGreaterThan(burn[6].recovery_score as number);
    expect((rec[6].recovery_score as number)).toBeGreaterThan(rec[0].recovery_score as number);
    // La lógica interpreta esa narrativa.
    expect(trendState(burn)).toBe('worsening');
    expect(trendState(rec)).toBe('improving');
  });
  it('todos los escenarios generan series completas sin huecos', () => {
    for (const sc of SCENARIOS) {
      const series = generateSeries({ scenario: sc, dates: datesFor(7), seed: 5 });
      expect(series).toHaveLength(7);
      expect(series.every((d) => typeof d.recovery_score === 'number')).toBe(true);
    }
  });
  it('generateDay es estable para un índice dado', () => {
    const d1 = generateDay('post_travel', 0, 7, '2026-06-01', 9);
    const d2 = generateDay('post_travel', 0, 7, '2026-06-01', 9);
    expect(d1).toEqual(d2);
  });
});
