/**
 * wellbeingLogic — lógica PURA del estado de bienestar (sin IO, sin React).
 *
 * Convierte los check-ins diarios (energy / clarity / stress / sleep, escala ~1-10)
 * en un % de bienestar interpretable + un sistema de ALARMAS por umbral, para que el
 * admin vea de un vistazo "cómo se va sintiendo" cada cliente en la sección
 * G. CHECK-INS del dossier.
 *
 * Filosofía Polaris: nada de scores opacos. Cada alarma lleva una `reason` citable
 * (ej. "−18% en 5 días", "2 check-ins críticos seguidos"). Determinista y testeable:
 * sin Date.now implícito (se inyecta donde haga falta), sin Math.random.
 *
 * NO es diagnóstico clínico — es una lectura de tendencia subjetiva auto-reportada.
 */

// ─── Tipos ──────────────────────────────────────────────────────────────────────

/** Un check-in tal como lo expone el dossier admin (campos nullable, escala 1-10). */
export interface WellbeingCheckIn {
  date: string;
  energy?: number | null;
  clarity?: number | null;
  stress?: number | null;   // INVERSO: más estrés = peor bienestar
  sleep?: number | null;
}

export type WellbeingState = 'critical' | 'low' | 'fair' | 'good';
export type WellbeingTrend = 'improving' | 'stable' | 'declining' | 'unknown';
export type AlarmLevel = 'none' | 'watch' | 'high' | 'critical';

export interface WellbeingReading {
  date: string;
  /** 0-100, o null si el check-in no tiene ninguna métrica usable. */
  score: number | null;
  state: WellbeingState | null;
}

export interface WellbeingAlarm {
  level: AlarmLevel;
  /** Frase citable y específica (no genérica). */
  reason: string;
  /** % actual (promedio de los últimos válidos), null si no hay datos. */
  current: number | null;
  trend: WellbeingTrend;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const SCALE_MAX = 10;
const isNum = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v);
const clamp = (n: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, n));

/** Promedio de números válidos; null si no hay ninguno. */
function avg(xs: (number | null)[]): number | null {
  const valid = xs.filter((x): x is number => x !== null && !Number.isNaN(x));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// ─── Score por check-in ───────────────────────────────────────────────────────

/**
 * % de bienestar 0-100 desde un check-in. Promedia las dimensiones disponibles
 * (no penaliza por campos faltantes), invirtiendo el estrés (10 - stress).
 * Devuelve null si el check-in no tiene ninguna métrica usable.
 */
export function wellbeingScore(ci: WellbeingCheckIn): number | null {
  const parts: number[] = [];
  if (isNum(ci.energy))  parts.push(ci.energy);
  if (isNum(ci.clarity)) parts.push(ci.clarity);
  if (isNum(ci.stress))  parts.push(SCALE_MAX - ci.stress); // inverso
  if (isNum(ci.sleep))   parts.push(ci.sleep);
  if (parts.length === 0) return null;
  const mean = parts.reduce((a, b) => a + b, 0) / parts.length; // 0-10
  return clamp(Math.round((mean / SCALE_MAX) * 100));
}

/** Estado interpretable desde el % de bienestar. */
export function wellbeingState(score: number | null): WellbeingState | null {
  if (score === null) return null;
  if (score < 35) return 'critical';
  if (score < 55) return 'low';
  if (score < 72) return 'fair';
  return 'good';
}

/** Mapea una serie de check-ins (newest-first o cualquier orden) a readings ordenados
 *  por fecha ascendente (viejo → nuevo) para el cálculo de tendencia. */
export function toReadings(series: WellbeingCheckIn[]): WellbeingReading[] {
  return [...series]
    .map((ci) => {
      const score = wellbeingScore(ci);
      return { date: ci.date, score, state: wellbeingState(score) };
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// ─── Tendencia ────────────────────────────────────────────────────────────────

/**
 * Tendencia sobre los readings recientes: compara el promedio de la mitad reciente
 * vs la mitad previa (ventana de hasta 7). `unknown` si faltan datos.
 */
export function wellbeingTrend(readings: WellbeingReading[]): WellbeingTrend {
  const scored = readings.filter((r) => r.score !== null).slice(-7);
  if (scored.length < 4) return 'unknown';
  const mid = Math.floor(scored.length / 2);
  const prev = avg(scored.slice(0, mid).map((r) => r.score));
  const recent = avg(scored.slice(mid).map((r) => r.score));
  if (prev === null || recent === null) return 'unknown';
  const delta = recent - prev;
  if (delta >= 6) return 'improving';
  if (delta <= -6) return 'declining';
  return 'stable';
}

// ─── Alarma ───────────────────────────────────────────────────────────────────

/**
 * Sistema de alarmas por umbral. Dispara según el % de cómo se va sintiendo:
 *   - critical: promedio reciente < 35, o ≥2 check-ins críticos consecutivos.
 *   - high:     promedio reciente < 50, o caída fuerte (≥15 pts) en la ventana.
 *   - watch:    promedio reciente < 62, o tendencia declinante.
 *   - none:     todo bien.
 * La `reason` cita el dato concreto.
 */
export function wellbeingAlarm(series: WellbeingCheckIn[]): WellbeingAlarm {
  const readings = toReadings(series);
  const scored = readings.filter((r) => r.score !== null);
  const trend = wellbeingTrend(readings);

  if (scored.length === 0) {
    return { level: 'none', reason: 'Sin check-ins con datos aún.', current: null, trend: 'unknown' };
  }

  // Promedio de los últimos 3 válidos = "estado actual".
  const recent3 = scored.slice(-3).map((r) => r.score);
  const current = avg(recent3);
  const currentRounded = current === null ? null : Math.round(current);

  // Caída en la ventana reciente (primer vs último de los últimos ~5).
  const window = scored.slice(-5);
  const first = window[0]?.score ?? null;
  const last = window[window.length - 1]?.score ?? null;
  const drop = first !== null && last !== null ? first - last : 0;

  // Críticos consecutivos al final.
  let consecCritical = 0;
  for (let i = scored.length - 1; i >= 0; i--) {
    if ((scored[i].score ?? 100) < 35) consecCritical++;
    else break;
  }

  // ── Reglas (de más severa a menos) ──
  if (consecCritical >= 2) {
    return { level: 'critical', reason: `${consecCritical} check-ins críticos seguidos (<35%).`, current: currentRounded, trend };
  }
  if (current !== null && current < 35) {
    return { level: 'critical', reason: `Bienestar promedio ${Math.round(current)}% — zona crítica.`, current: currentRounded, trend };
  }
  if (current !== null && current < 50) {
    return { level: 'high', reason: `Bienestar promedio ${Math.round(current)}% — bajo sostenido.`, current: currentRounded, trend };
  }
  if (drop >= 15) {
    return { level: 'high', reason: `Caída de ${Math.round(drop)} puntos en los últimos check-ins.`, current: currentRounded, trend };
  }
  if ((current !== null && current < 62) || trend === 'declining') {
    const why = trend === 'declining' ? 'tendencia a la baja' : `promedio ${Math.round(current ?? 0)}%`;
    return { level: 'watch', reason: `Observar — ${why}.`, current: currentRounded, trend };
  }

  return { level: 'none', reason: `Bienestar estable (${Math.round(current ?? 0)}%).`, current: currentRounded, trend };
}

// ─── Presentación (helpers para la UI, puros) ──────────────────────────────────

export const WELLBEING_STATE_LABEL: Record<WellbeingState, string> = {
  critical: 'Crítico',
  low: 'Bajo',
  fair: 'Aceptable',
  good: 'Sólido',
};

export const TREND_LABEL: Record<WellbeingTrend, string> = {
  improving: 'mejorando',
  stable: 'estable',
  declining: 'a la baja',
  unknown: 'sin datos',
};
