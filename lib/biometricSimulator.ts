/**
 * biometricSimulator — generador DETERMINISTA de días biométricos sintéticos.
 *
 * Para demo/seed/QA: produce series `wearable_daily` realistas (provider='synthetic')
 * con trayectorias narrativas (buena semana, burnout, recuperación, etc.). PRNG sembrado
 * (mulberry32) → misma semilla = misma serie (testeable). Sin IO, sin Date, sin Math.random.
 */
import type { DailyMetrics } from './biometricLogic';

export type Scenario =
  | 'good_week'
  | 'burnout_week'
  | 'recovery_week'
  | 'unstable_sleep'
  | 'post_travel'
  | 'high_strain'
  | 'low_recovery';

export const SCENARIOS: Scenario[] = [
  'good_week', 'burnout_week', 'recovery_week', 'unstable_sleep', 'post_travel', 'high_strain', 'low_recovery',
];

export const SCENARIO_LABEL: Record<Scenario, string> = {
  good_week: 'Semana sólida',
  burnout_week: 'Semana de desgaste',
  recovery_week: 'Semana de recuperación',
  unstable_sleep: 'Sueño inestable',
  post_travel: 'Post-viaje (jet lag)',
  high_strain: 'Carga alta',
  low_recovery: 'Recuperación baja crónica',
};

// ─── PRNG sembrado (mulberry32) — determinista ────────────────────────────────────
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const r1 = (v: number) => Math.round(v * 10) / 10;

interface Central {
  recovery: number; sleepH: number; eff: number; hrv: number; rhr: number;
  strain: number; resp: number; tempDelta: number;
}

/** Trayectoria central del escenario en el progreso t∈[0,1] (índice `i` para patrones de paridad). */
function central(sc: Scenario, t: number, i: number): Central {
  switch (sc) {
    case 'good_week':
      return { recovery: 78, sleepH: 7.8, eff: 91, hrv: 64, rhr: 52, strain: 12, resp: 14.5, tempDelta: 0.1 };
    case 'burnout_week':
      return {
        recovery: lerp(68, 24, t), sleepH: lerp(7.2, 5.2, t), eff: lerp(86, 72, t),
        hrv: lerp(58, 34, t), rhr: lerp(54, 66, t), strain: lerp(14, 19, t), resp: lerp(14, 17.5, t),
        tempDelta: lerp(0.1, 0.5, t),
      };
    case 'recovery_week':
      return {
        recovery: lerp(34, 74, t), sleepH: lerp(6.0, 8.0, t), eff: lerp(74, 90, t),
        hrv: lerp(38, 62, t), rhr: lerp(64, 53, t), strain: lerp(8, 13, t), resp: lerp(16.5, 14, t),
        tempDelta: lerp(0.4, 0.1, t),
      };
    case 'unstable_sleep': {
      const good = i % 2 === 0;
      return {
        recovery: good ? 68 : 40, sleepH: good ? 7.8 : 5.3, eff: good ? 90 : 73,
        hrv: good ? 60 : 42, rhr: good ? 54 : 62, strain: 14, resp: good ? 14.5 : 16.5,
        tempDelta: good ? 0.1 : 0.3,
      };
    }
    case 'post_travel': {
      const penalty = Math.max(0, (0.35 - t) / 0.35) * 45; // golpe inicial que decae
      return {
        recovery: 72 - penalty, sleepH: 7.6 - penalty / 15, eff: 90 - penalty / 3,
        hrv: 60 - penalty / 2, rhr: 53 + penalty / 4, strain: 13, resp: 14.5 + penalty / 20,
        tempDelta: penalty > 20 ? 0.6 : 0.1,
      };
    }
    case 'high_strain':
      return {
        recovery: lerp(60, 38, t), sleepH: 6.8, eff: lerp(84, 78, t),
        hrv: lerp(56, 42, t), rhr: lerp(55, 61, t), strain: 19, resp: 15.5, tempDelta: 0.2,
      };
    case 'low_recovery':
      return { recovery: 32, sleepH: 5.8, eff: 75, hrv: 40, rhr: 63, strain: 11, resp: 16.5, tempDelta: 0.3 };
  }
}

export interface GenerateOptions {
  scenario: Scenario;
  dates: string[];           // fechas ISO (YYYY-MM-DD) en orden cronológico — la longitud define la serie
  seed?: number;             // determinismo (default 1)
  userId?: string | null;    // si se provee, se incluye en cada fila
}

/** Genera un día sintético determinista. */
export function generateDay(
  sc: Scenario, i: number, total: number, date: string, seed: number, userId?: string | null,
): DailyMetrics & { user_id?: string | null } {
  const rng = mulberry32((seed + i * 0x9e3779b1) >>> 0);
  const t = total <= 1 ? 0 : i / (total - 1);
  const c = central(sc, t, i);
  const noise = (amp: number) => (rng() - 0.5) * 2 * amp;

  const recovery = clamp(c.recovery + noise(5), 5, 99);
  const sleepH = clamp(c.sleepH + noise(0.3), 3.5, 9.5);
  const eff = clamp(c.eff + noise(3), 55, 98);
  const hrv = clamp(c.hrv + noise(4), 18, 110);
  const rhr = clamp(c.rhr + noise(2), 40, 85);
  const strain = clamp(c.strain + noise(1.5), 3, 21);
  const resp = clamp(c.resp + noise(0.6), 11, 22);

  const sleepMin = Math.round(sleepH * 60);
  const deep = Math.round(sleepMin * 0.18);
  const rem = Math.round(sleepMin * 0.22);
  const awake = Math.round(sleepMin * ((100 - eff) / Math.max(eff, 1)));
  const light = Math.max(0, sleepMin - deep - rem);
  const sleepScore = clamp(Math.round((sleepH / 8) * 55 + ((eff - 60) / 40) * 45), 10, 100);

  return {
    user_id: userId ?? undefined,
    provider: 'synthetic',
    date,
    sleep_score: sleepScore,
    sleep_duration_min: sleepMin,
    sleep_efficiency: Math.round(eff),
    rem_min: rem,
    deep_min: deep,
    light_min: light,
    awake_min: awake,
    recovery_score: Math.round(recovery),
    hrv_ms: r1(hrv),
    resting_hr: Math.round(rhr),
    respiratory_rate: r1(resp),
    spo2_avg: r1(clamp(97 + noise(0.8), 94, 99)),
    body_temp_delta: r1(c.tempDelta + noise(0.15)),
    strain_score: r1(strain),
    signal_confidence: 0.9,
  };
}

/** Serie completa determinista para un escenario. */
export function generateSeries(opts: GenerateOptions): (DailyMetrics & { user_id?: string | null })[] {
  const { scenario, dates, seed = 1, userId } = opts;
  return dates.map((date, i) => generateDay(scenario, i, dates.length, date, seed, userId));
}
