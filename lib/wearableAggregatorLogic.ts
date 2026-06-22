/**
 * wearableAggregatorLogic — normalización PURA del agregador universal (Cluster D).
 *
 * Un agregador (Terra / Vital / Rook / Spike) conecta CUALQUIER reloj y empuja
 * datos por webhook. Esta capa es la única que conoce el formato del vendor;
 * el resto de Polaris consume `wearable_daily` provider-agnóstico, sin enterarse.
 *
 * Diseño en dos capas para resistir un cambio de vendor:
 *   1. `AggregatorDaily` — nuestro MODELO INTERMEDIO neutro (campos ya en unidades
 *      finales: minutos, ms, bpm, 0-100).
 *   2. Adapters por vendor (`terraToDaily`, …) → `AggregatorDaily`.
 *   3. `toWearableDailyRows(AggregatorDaily, userId)` → filas de `wearable_daily`.
 *
 * Si mañana cambiamos de Terra a Vital, solo se reescribe el adapter (1 función),
 * no el mapeo a la tabla ni el motor downstream. Sin IO, sin Date(), testeable.
 */

// ─── Modelo intermedio neutro ──────────────────────────────────────────────────

export interface AggregatorDaily {
  /** Fecha YYYY-MM-DD (día calendario del registro). */
  date: string;
  /** Reloj real bajo el agregador, en mayúsculas: 'GARMIN' | 'COROS' | … */
  sourceDevice: string | null;
  // Sueño
  sleepScore?: number | null;
  sleepDurationMin?: number | null;
  sleepEfficiency?: number | null;
  remMin?: number | null;
  deepMin?: number | null;
  lightMin?: number | null;
  awakeMin?: number | null;
  // Recuperación
  recoveryScore?: number | null;
  hrvMs?: number | null;
  restingHr?: number | null;
  respiratoryRate?: number | null;
  spo2Avg?: number | null;
  bodyTempDelta?: number | null;
  // Actividad
  activityScore?: number | null;
  strainScore?: number | null;
  caloriesActive?: number | null;
  steps?: number | null;
  activeMin?: number | null;
  stressScore?: number | null;
}

/** Fila lista para upsert en wearable_daily (subconjunto con las columnas usadas). */
export interface WearableDailyRow {
  user_id: string;
  provider: 'aggregator';
  source_device: string | null;
  date: string;
  sleep_score: number | null;
  sleep_duration_min: number | null;
  sleep_efficiency: number | null;
  rem_min: number | null;
  deep_min: number | null;
  light_min: number | null;
  awake_min: number | null;
  recovery_score: number | null;
  hrv_ms: number | null;
  resting_hr: number | null;
  respiratory_rate: number | null;
  spo2_avg: number | null;
  body_temp_delta: number | null;
  activity_score: number | null;
  strain_score: number | null;
  calories_active: number | null;
  steps: number | null;
  active_min: number | null;
  stress_score: number | null;
}

const n = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const round = (v: number | null): number | null => (v === null ? null : Math.round(v));

/** seconds → minutes redondeado. */
function secToMin(v: unknown): number | null {
  const s = n(v);
  return s === null ? null : Math.round(s / 60);
}

/** Extrae YYYY-MM-DD de un ISO timestamp o pasa una fecha ya formateada. */
export function isoToDate(v: unknown): string | null {
  if (typeof v !== 'string' || !v) return null;
  // YYYY-MM-DD o YYYY-MM-DDTHH:.. — tomamos los primeros 10 chars si son fecha.
  const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1]! : null;
}

// ─── Capa 3: intermedio → fila de wearable_daily ──────────────────────────────

export function toWearableDailyRow(d: AggregatorDaily, userId: string): WearableDailyRow {
  return {
    user_id: userId,
    provider: 'aggregator',
    source_device: d.sourceDevice ?? null,
    date: d.date,
    sleep_score: round(n(d.sleepScore)),
    sleep_duration_min: round(n(d.sleepDurationMin)),
    sleep_efficiency: round(n(d.sleepEfficiency)),
    rem_min: round(n(d.remMin)),
    deep_min: round(n(d.deepMin)),
    light_min: round(n(d.lightMin)),
    awake_min: round(n(d.awakeMin)),
    recovery_score: round(n(d.recoveryScore)),
    hrv_ms: round(n(d.hrvMs)),
    resting_hr: round(n(d.restingHr)),
    respiratory_rate: n(d.respiratoryRate),
    spo2_avg: round(n(d.spo2Avg)),
    body_temp_delta: n(d.bodyTempDelta),
    activity_score: round(n(d.activityScore)),
    strain_score: n(d.strainScore),
    calories_active: round(n(d.caloriesActive)),
    steps: round(n(d.steps)),
    active_min: round(n(d.activeMin)),
    stress_score: round(n(d.stressScore)),
  };
}

/**
 * Fusiona varios `AggregatorDaily` del mismo día (el agregador manda sueño,
 * daily y actividad como payloads SEPARADOS). Last-non-null gana por campo, así
 * un payload de "daily" no borra el sleep_score que llegó en el de "sleep".
 */
export function mergeDailies(items: AggregatorDaily[]): AggregatorDaily[] {
  const byDate = new Map<string, AggregatorDaily>();
  for (const it of items) {
    if (!it.date) continue;
    const prev = byDate.get(it.date);
    if (!prev) {
      byDate.set(it.date, { ...it });
      continue;
    }
    const merged: AggregatorDaily = { ...prev };
    for (const k of Object.keys(it) as (keyof AggregatorDaily)[]) {
      const val = it[k];
      if (val !== null && val !== undefined && val !== '') {
        // @ts-expect-error índice homogéneo controlado
        merged[k] = val;
      }
    }
    byDate.set(it.date, merged);
  }
  return Array.from(byDate.values());
}

// ─── Capa 2: adapter de Terra (vendor por defecto) ────────────────────────────
// https://docs.tryterra.co — payloads normalizados. Si se cambia de vendor, este
// es el ÚNICO bloque que se reescribe. Defensivo: optional chaining en todo.

/* eslint-disable @typescript-eslint/no-explicit-any */

export type AggregatorPayloadType = 'daily' | 'sleep' | 'activity' | 'body' | 'other';

export function terraPayloadType(raw: any): AggregatorPayloadType {
  const t = String(raw?.type ?? '').toLowerCase();
  if (t === 'daily' || t === 'sleep' || t === 'activity' || t === 'body') return t;
  return 'other';
}

export function terraSourceDevice(raw: any): string | null {
  const p = raw?.user?.provider ?? raw?.provider;
  return p ? String(p).toUpperCase() : null;
}

/** Adapter: un payload Terra (`daily`|`sleep`|`activity`|`body`) → AggregatorDaily[]. */
export function terraToDaily(raw: any): AggregatorDaily[] {
  const type = terraPayloadType(raw);
  const device = terraSourceDevice(raw);
  const records: any[] = Array.isArray(raw?.data) ? raw.data : [];
  const out: AggregatorDaily[] = [];

  for (const rec of records) {
    const date = isoToDate(rec?.metadata?.start_time ?? rec?.metadata?.end_time ?? rec?.metadata?.date);
    if (!date) continue;

    const base: AggregatorDaily = { date, sourceDevice: device };

    if (type === 'sleep') {
      const sd = rec?.sleep_durations_data ?? {};
      const asleep = sd?.asleep ?? {};
      const hr = rec?.heart_rate_data?.summary ?? {};
      out.push({
        ...base,
        sleepDurationMin: secToMin(asleep?.duration_asleep_state_seconds),
        remMin: secToMin(asleep?.duration_REM_sleep_state_seconds),
        deepMin: secToMin(asleep?.duration_deep_sleep_state_seconds),
        lightMin: secToMin(asleep?.duration_light_sleep_state_seconds),
        awakeMin: secToMin(sd?.awake?.duration_awake_state_seconds),
        sleepEfficiency: n(sd?.sleep_efficiency) !== null ? (sd.sleep_efficiency as number) * 100 : null,
        hrvMs: n(hr?.avg_hrv_rmssd),
        restingHr: n(hr?.resting_hr_bpm),
        respiratoryRate: n(rec?.respiration_data?.breaths_data?.avg_breaths_per_min),
        spo2Avg: n(rec?.respiration_data?.oxygen_saturation_data?.avg_saturation_percentage),
        bodyTempDelta: n(rec?.temperature_data?.delta),
        recoveryScore: n(rec?.readiness_data?.readiness),
        sleepScore: n(rec?.sleep_score) ?? n(rec?.scores?.sleep),
      });
    } else if (type === 'daily') {
      const hr = rec?.heart_rate_data?.summary ?? {};
      out.push({
        ...base,
        recoveryScore: n(rec?.scores?.recovery),
        activityScore: n(rec?.scores?.activity),
        restingHr: n(hr?.resting_hr_bpm),
        hrvMs: n(hr?.avg_hrv_rmssd),
        spo2Avg: n(rec?.oxygen_data?.avg_saturation_percentage),
        steps: n(rec?.distance_data?.steps) ?? n(rec?.distance_data?.summary?.steps),
        caloriesActive: n(rec?.calories_data?.net_activity_calories) ?? n(rec?.calories_data?.total_burned_calories),
        activeMin: secToMin(rec?.active_durations_data?.activity_seconds),
        stressScore: n(rec?.stress_data?.avg_stress_level),
      });
    } else if (type === 'activity') {
      out.push({
        ...base,
        strainScore: n(rec?.strain_data?.strain_level),
        caloriesActive: n(rec?.calories_data?.net_activity_calories) ?? n(rec?.calories_data?.total_burned_calories),
        activeMin: secToMin(rec?.active_durations_data?.activity_seconds),
        steps: n(rec?.distance_data?.steps),
      });
    } else if (type === 'body') {
      out.push({
        ...base,
        hrvMs: n(rec?.heart_rate_data?.summary?.avg_hrv_rmssd),
        restingHr: n(rec?.heart_rate_data?.summary?.resting_hr_bpm),
        spo2Avg: n(rec?.oxygen_data?.avg_saturation_percentage),
        bodyTempDelta: n(rec?.temperature_data?.delta),
      });
    }
  }
  return out;
}

/**
 * Pipeline completo: payload Terra → filas de wearable_daily (mergeadas por día).
 * El webhook llama a esto y hace upsert del resultado.
 */
export function normalizeAggregatorPayload(raw: any, userId: string): WearableDailyRow[] {
  const dailies = mergeDailies(terraToDaily(raw));
  return dailies.map((d) => toWearableDailyRow(d, userId));
}

/* eslint-enable @typescript-eslint/no-explicit-any */
