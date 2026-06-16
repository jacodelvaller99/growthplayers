/**
 * biometricLogic — evaluación PURA de señales biométricas (sin IO/React/Supabase).
 *
 * Coaching intelligence, NO diagnóstico clínico. Fórmulas simples y explicables;
 * cada insight expone sus `drivers`. Provider-agnóstico (Oura/WHOOP/synthetic) — opera
 * sobre el modelo canónico `wearable_daily`.
 */

// ─── Modelo de entrada (subconjunto canónico de wearable_daily) ───────────────────
export interface DailyMetrics {
  date?: string | null;
  provider?: string | null;
  sleep_score?: number | null;
  sleep_duration_min?: number | null;
  sleep_efficiency?: number | null;
  rem_min?: number | null;
  deep_min?: number | null;
  light_min?: number | null;
  awake_min?: number | null;
  recovery_score?: number | null;
  hrv_ms?: number | null;
  resting_hr?: number | null;
  respiratory_rate?: number | null;
  spo2_avg?: number | null;
  body_temp_delta?: number | null;
  strain_score?: number | null;
  signal_confidence?: number | null;
}

export interface Baseline {
  hrv?: number | null;
  resting_hr?: number | null;
  recovery?: number | null;
}

export type SleepState = 'excellent' | 'good' | 'fragile' | 'poor' | 'critical';
export type RecoveryState = 'strong' | 'adequate' | 'compromised' | 'weak' | 'high_risk';
export type CoherenceState = 'stable' | 'slightly_disturbed' | 'unstable' | 'highly_unstable';
export type FatigueRisk = 'low' | 'moderate' | 'elevated' | 'high';
export type TrendState = 'improving' | 'stable' | 'volatile' | 'worsening';
export type InterventionLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface BiometricInsight {
  metric_date: string | null;
  sleep_state: SleepState;
  recovery_state: RecoveryState;
  coherence_state: CoherenceState;
  fatigue_risk: FatigueRisk;
  trend_state: TrendState;
  intervention_level: InterventionLevel;
  summary: string;
  drivers: string[];
  coach_safe_summary: string;
  client_safe_summary: string;
}

const num = (v: unknown): number | null => (typeof v === 'number' && !Number.isNaN(v) ? v : null);

// ─── Estados individuales ─────────────────────────────────────────────────────────
export function sleepState(d: DailyMetrics): SleepState {
  const score = num(d.sleep_score);
  if (score !== null) {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 55) return 'fragile';
    if (score >= 40) return 'poor';
    return 'critical';
  }
  const hours = num(d.sleep_duration_min) !== null ? (d.sleep_duration_min as number) / 60 : null;
  const eff = num(d.sleep_efficiency);
  if (hours === null) return 'fragile'; // sin datos → neutro
  if (hours >= 7.5 && (eff ?? 100) >= 88) return 'excellent';
  if (hours >= 7 && (eff ?? 100) >= 82) return 'good';
  if (hours >= 6 && (eff ?? 100) >= 75) return 'fragile';
  if (hours >= 5) return 'poor';
  return 'critical';
}

export function recoveryState(d: DailyMetrics): RecoveryState {
  const r = num(d.recovery_score);
  if (r === null) return 'compromised';
  if (r >= 70) return 'strong';
  if (r >= 55) return 'adequate';
  if (r >= 40) return 'compromised';
  if (r >= 25) return 'weak';
  return 'high_risk';
}

/** Fracción de caída de HRV vs baseline (0 = igual o mejor). */
function hrvDrop(d: DailyMetrics, b: Baseline): number {
  const hrv = num(d.hrv_ms);
  const base = num(b.hrv);
  if (hrv === null || base === null || base <= 0) return 0;
  return Math.max(0, (base - hrv) / base);
}
/** Fracción de subida de RHR vs baseline (0 = igual o mejor). */
function rhrRise(d: DailyMetrics, b: Baseline): number {
  const rhr = num(d.resting_hr);
  const base = num(b.resting_hr);
  if (rhr === null || base === null || base <= 0) return 0;
  return Math.max(0, (rhr - base) / base);
}

export function coherenceState(d: DailyMetrics, b: Baseline): CoherenceState {
  if (num(d.hrv_ms) === null) return 'slightly_disturbed';
  const disturbance = hrvDrop(d, b) * 1.0 + rhrRise(d, b) * 1.5;
  if (disturbance < 0.1) return 'stable';
  if (disturbance < 0.25) return 'slightly_disturbed';
  if (disturbance < 0.45) return 'unstable';
  return 'highly_unstable';
}

export function fatigueRisk(d: DailyMetrics, b: Baseline): FatigueRisk {
  let s = 0;
  const r = num(d.recovery_score);
  if (r !== null && r < 45) s += 0.35;
  const hours = num(d.sleep_duration_min) !== null ? (d.sleep_duration_min as number) / 60 : null;
  if (hours !== null && hours < 6) s += 0.3;
  if (hrvDrop(d, b) > 0.2) s += 0.2;
  if (rhrRise(d, b) > 0.08) s += 0.15;
  if (s < 0.25) return 'low';
  if (s < 0.5) return 'moderate';
  if (s < 0.75) return 'elevated';
  return 'high';
}

/** Tendencia a partir de la serie de recovery_score (orden cronológico). */
export function trendState(recent: DailyMetrics[]): TrendState {
  const series = recent.map((x) => num(x.recovery_score)).filter((v): v is number => v !== null);
  if (series.length < 3) return 'stable';
  const slope = (series[series.length - 1] - series[0]) / (series.length - 1);
  const deltas: number[] = [];
  for (let i = 1; i < series.length; i++) deltas.push(Math.abs(series[i] - series[i - 1]));
  const volatility = deltas.reduce((a, c) => a + c, 0) / deltas.length;
  if (volatility > 12) return 'volatile';
  if (slope > 3) return 'improving';
  if (slope < -3) return 'worsening';
  return 'stable';
}

// ─── Nivel de intervención (mezcla) ───────────────────────────────────────────────
export const INTERVENTION_RANK: Record<InterventionLevel, number> = { urgent: 3, high: 2, medium: 1, low: 0 };
const RECOVERY_BAD: RecoveryState[] = ['weak', 'high_risk'];
export function interventionLevel(
  recovery: RecoveryState,
  coherence: CoherenceState,
  fatigue: FatigueRisk,
  trend: TrendState,
): InterventionLevel {
  if (recovery === 'high_risk' || coherence === 'highly_unstable' || (fatigue === 'high' && trend === 'worsening')) {
    return 'urgent';
  }
  if (RECOVERY_BAD.includes(recovery) || coherence === 'unstable' || fatigue === 'elevated' || trend === 'worsening') {
    return 'high';
  }
  if (recovery === 'compromised' || fatigue === 'moderate' || coherence === 'slightly_disturbed' || trend === 'volatile') {
    return 'medium';
  }
  return 'low';
}

// ─── Mismatch reflexión-subjetiva vs señal objetiva ───────────────────────────────
/** true si el operador reporta energía alta pero el cuerpo está comprometido (o viceversa). */
export function reflectionMismatch(
  subjective: { energy?: 'low' | 'medium' | 'high' | null; mood?: number | null },
  recovery: RecoveryState,
): boolean {
  const bodyLow = recovery === 'weak' || recovery === 'high_risk';
  const bodyStrong = recovery === 'strong';
  if (subjective.energy === 'high' && bodyLow) return true;
  if (subjective.energy === 'low' && bodyStrong) return true;
  if (typeof subjective.mood === 'number' && subjective.mood >= 8 && bodyLow) return true;
  return false;
}

// ─── Insight completo + resúmenes coach/cliente ──────────────────────────────────
const SLEEP_ES: Record<SleepState, string> = {
  excellent: 'sueño excelente', good: 'buen sueño', fragile: 'sueño frágil', poor: 'sueño pobre', critical: 'sueño crítico',
};
const RECOVERY_ES: Record<RecoveryState, string> = {
  strong: 'recuperación fuerte', adequate: 'recuperación adecuada', compromised: 'recuperación comprometida',
  weak: 'recuperación débil', high_risk: 'recuperación de alto riesgo',
};

export function computeInsight(
  today: DailyMetrics,
  baseline: Baseline,
  recent: DailyMetrics[],
): BiometricInsight {
  const sleep = sleepState(today);
  const recovery = recoveryState(today);
  const coherence = coherenceState(today, baseline);
  const fatigue = fatigueRisk(today, baseline);
  const trend = trendState(recent);
  const level = interventionLevel(recovery, coherence, fatigue, trend);

  const drivers: string[] = [];
  const hours = num(today.sleep_duration_min) !== null ? (today.sleep_duration_min as number) / 60 : null;
  if (hours !== null && hours < 6) drivers.push(`Sueño corto (${hours.toFixed(1)}h)`);
  if (num(today.sleep_efficiency) !== null && (today.sleep_efficiency as number) < 80) drivers.push(`Eficiencia de sueño baja (${Math.round(today.sleep_efficiency as number)}%)`);
  const drop = hrvDrop(today, baseline);
  if (drop > 0.15) drivers.push(`HRV −${Math.round(drop * 100)}% vs base`);
  const rise = rhrRise(today, baseline);
  if (rise > 0.06) drivers.push(`FC de reposo +${Math.round(rise * 100)}% vs base`);
  if (recovery === 'weak' || recovery === 'high_risk') drivers.push('Recuperación baja');
  if (trend === 'worsening') drivers.push('Tendencia a la baja');
  if (trend === 'volatile') drivers.push('Patrón inestable');
  if (num(today.respiratory_rate) !== null && (today.respiratory_rate as number) > 18) drivers.push(`Respiración elevada (${Math.round(today.respiratory_rate as number)}/min)`);

  const summary = `${SLEEP_ES[sleep]}, ${RECOVERY_ES[recovery]}, coherencia ${coherence}, fatiga ${fatigue}, tendencia ${trend}.`;
  const coach = `${summary}${drivers.length ? ` Drivers: ${drivers.join(' · ')}.` : ''} Intervención: ${level}.`;

  const client =
    level === 'urgent' || level === 'high'
      ? 'Tu cuerpo viene cargando. Hoy prioriza descanso y una práctica de calma — un día más suave te devuelve energía.'
      : level === 'medium'
        ? 'Estás en un punto medio. Cuida el sueño esta noche y elige una sesión equilibrada hoy.'
        : 'Tu cuerpo está respondiendo bien. Buen momento para empujar con foco.';

  return {
    metric_date: today.date ?? null,
    sleep_state: sleep,
    recovery_state: recovery,
    coherence_state: coherence,
    fatigue_risk: fatigue,
    trend_state: trend,
    intervention_level: level,
    summary,
    drivers,
    coach_safe_summary: coach,
    client_safe_summary: client,
  };
}

// ─── Baseline (promedio de la ventana, excluye hoy si se desea) ──────────────────
export function computeBaseline(days: DailyMetrics[]): Baseline {
  const avg = (key: keyof DailyMetrics): number | null => {
    const vals = days.map((d) => num(d[key] as number)).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, c) => a + c, 0) / vals.length : null;
  };
  return { hrv: avg('hrv_ms'), resting_hr: avg('resting_hr'), recovery: avg('recovery_score') };
}
