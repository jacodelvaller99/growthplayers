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

// El feed de Terra no es 100% uniforme entre proveedores: un mismo dato llega a
// veces bajo claves alternas (HRV como `avg_hrv_rmssd` o `hrv_rmssd`, FC reposo
// como `resting_hr_bpm` o `resting_hr`). Estos helpers de "primer no-null gana"
// concentran esa tolerancia en un único lugar, sin sacar el conocimiento del
// formato Terra de `terraToDaily`. DOC-BASED: las alternas vienen de la doc de
// Terra y de variaciones observadas entre marcas; validar contra payloads REALES.
function firstNum(...vals: unknown[]): number | null {
  for (const v of vals) {
    const x = n(v);
    if (x !== null) return x;
  }
  return null;
}

function firstSecToMin(...vals: unknown[]): number | null {
  for (const v of vals) {
    const x = secToMin(v);
    if (x !== null) return x;
  }
  return null;
}

/** HRV (rmssd) tolerando las distintas claves que Terra emite según el proveedor. */
function terraHrv(hr: any): number | null {
  return firstNum(hr?.avg_hrv_rmssd, hr?.hrv_rmssd, hr?.user_hrv_rmssd, hr?.avg_hrv_sdnn, hr?.hrv_sdnn);
}

/** FC en reposo tolerando claves alternas. */
function terraRestingHr(hr: any): number | null {
  return firstNum(hr?.resting_hr_bpm, hr?.resting_hr, hr?.hr_resting, hr?.min_hr_bpm);
}

/** Adapter: un payload Terra (`daily`|`sleep`|`activity`|`body`) → AggregatorDaily[]. */
export function terraToDaily(raw: any): AggregatorDaily[] {
  const type = terraPayloadType(raw);
  const device = terraSourceDevice(raw);
  const records: any[] = Array.isArray(raw?.data) ? raw.data : [];
  const out: AggregatorDaily[] = [];

  for (const rec of records) {
    if (!rec || typeof rec !== 'object') continue;
    const date = isoToDate(
      rec?.metadata?.start_time ??
        rec?.metadata?.end_time ??
        rec?.metadata?.date ??
        rec?.metadata?.upload_type ?? // algunos payloads ponen la fecha sólo arriba
        rec?.day ??
        rec?.date ??
        rec?.summary_date,
    );
    if (!date) continue;

    const base: AggregatorDaily = { date, sourceDevice: device };

    if (type === 'sleep') {
      const sd = rec?.sleep_durations_data ?? {};
      const asleep = sd?.asleep ?? {};
      const hr = rec?.heart_rate_data?.summary ?? {};
      // La eficiencia puede venir como fracción (0–1) o ya en porcentaje (0–100).
      const effRaw = firstNum(sd?.sleep_efficiency, rec?.sleep_efficiency);
      const sleepEfficiency = effRaw === null ? null : effRaw <= 1 ? effRaw * 100 : effRaw;
      out.push({
        ...base,
        sleepDurationMin: firstSecToMin(
          asleep?.duration_asleep_state_seconds,
          sd?.duration_asleep_state_seconds,
          rec?.duration_asleep_state_seconds,
        ),
        remMin: firstSecToMin(asleep?.duration_REM_sleep_state_seconds, sd?.duration_REM_sleep_state_seconds),
        deepMin: firstSecToMin(asleep?.duration_deep_sleep_state_seconds, sd?.duration_deep_sleep_state_seconds),
        lightMin: firstSecToMin(asleep?.duration_light_sleep_state_seconds, sd?.duration_light_sleep_state_seconds),
        awakeMin: firstSecToMin(sd?.awake?.duration_awake_state_seconds, sd?.duration_awake_state_seconds),
        sleepEfficiency,
        hrvMs: terraHrv(hr),
        restingHr: terraRestingHr(hr),
        respiratoryRate: firstNum(
          rec?.respiration_data?.breaths_data?.avg_breaths_per_min,
          rec?.respiration_data?.breaths_data?.avg_breaths_per_minute,
        ),
        spo2Avg: firstNum(
          rec?.respiration_data?.oxygen_saturation_data?.avg_saturation_percentage,
          rec?.oxygen_data?.avg_saturation_percentage,
        ),
        bodyTempDelta: firstNum(rec?.temperature_data?.delta, rec?.temperature_data?.temperature_delta),
        recoveryScore: firstNum(rec?.readiness_data?.readiness, rec?.scores?.readiness, rec?.scores?.recovery),
        sleepScore: firstNum(rec?.sleep_score, rec?.scores?.sleep),
      });
    } else if (type === 'daily') {
      const hr = rec?.heart_rate_data?.summary ?? {};
      out.push({
        ...base,
        recoveryScore: firstNum(rec?.scores?.recovery, rec?.scores?.readiness, rec?.readiness_data?.readiness),
        activityScore: firstNum(rec?.scores?.activity, rec?.activity_score),
        restingHr: terraRestingHr(hr),
        hrvMs: terraHrv(hr),
        spo2Avg: firstNum(
          rec?.oxygen_data?.avg_saturation_percentage,
          rec?.oxygen_data?.avg_saturation,
        ),
        steps: firstNum(rec?.distance_data?.steps, rec?.distance_data?.summary?.steps, rec?.steps),
        caloriesActive: firstNum(
          rec?.calories_data?.net_activity_calories,
          rec?.calories_data?.total_burned_calories,
          rec?.calories_data?.net_intake_calories,
        ),
        activeMin: firstSecToMin(
          rec?.active_durations_data?.activity_seconds,
          rec?.active_durations_data?.active_seconds,
        ),
        stressScore: firstNum(rec?.stress_data?.avg_stress_level, rec?.stress_data?.avg_stress),
      });
    } else if (type === 'activity') {
      out.push({
        ...base,
        strainScore: firstNum(rec?.strain_data?.strain_level, rec?.strain_data?.strain, rec?.scores?.strain),
        caloriesActive: firstNum(
          rec?.calories_data?.net_activity_calories,
          rec?.calories_data?.total_burned_calories,
        ),
        activeMin: firstSecToMin(
          rec?.active_durations_data?.activity_seconds,
          rec?.active_durations_data?.active_seconds,
        ),
        steps: firstNum(rec?.distance_data?.steps, rec?.distance_data?.summary?.steps),
      });
    } else if (type === 'body') {
      const hr = rec?.heart_rate_data?.summary ?? {};
      out.push({
        ...base,
        hrvMs: terraHrv(hr),
        restingHr: terraRestingHr(hr),
        spo2Avg: firstNum(rec?.oxygen_data?.avg_saturation_percentage, rec?.oxygen_data?.avg_saturation),
        bodyTempDelta: firstNum(rec?.temperature_data?.delta, rec?.temperature_data?.temperature_delta),
      });
    }
  }
  return out;
}

// ─── Capa 2-bis: adapter de Open Wearables (OSS self-host) ────────────────────
// https://openwearables.io/docs — modelo unificado "first iteration".
// Webhook envelope: { type: "resource.action", data: {...} }.
//   · Sesión:    'sleep.created', 'activity.created', 'workout.created' → campos
//                directos (sleep_total_duration_minutes, steps_count, …).
//   · Timeseries:'heart_rate_variability.created', 'spo2.created',
//                'respiratory_rate.created', 'steps.created', 'calories.created'
//                → { provider, series_type, start_time, samples:[{value}] }.
//   · Conexión:  'connection.created'/'connection.revoked' → los maneja la edge
//                function (vinculación), no este adapter de datos.
// DOC-BASED: el modelo es "first iteration" del proyecto; validar contra un
// payload REAL (paso del runbook). Defensivo: optional chaining + null-safe.
// A diferencia de Terra (un payload con data[] de varios tipos), Open Wearables
// manda CADA evento en su propio webhook → el upsert downstream debe MERGEAR
// (coalesce non-null), no reemplazar (lo hace la edge function).

export type AggregatorVendor = 'terra' | 'open_wearables';

export function openWearablesEventType(raw: any): string {
  return String(raw?.type ?? '').toLowerCase();
}

export function openWearablesSourceDevice(raw: any): string | null {
  const p = raw?.data?.provider ?? raw?.provider;
  return p ? String(p).toUpperCase() : null;
}

/** Promedio de las muestras de un timeseries (tolera [{value}] o [number]). */
function owAvg(samples: any[]): number | null {
  const vals = samples.map((s) => n(s?.value ?? s)).filter((v): v is number => v !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
/** Suma de las muestras de un timeseries (steps/calorías diarias). */
function owSum(samples: any[]): number | null {
  const vals = samples.map((s) => n(s?.value ?? s)).filter((v): v is number => v !== null);
  return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
}
const owDate = (d: any): string | null =>
  isoToDate(d?.calendar_date ?? d?.date ?? d?.start_time ?? d?.end_time);

/** Adapter: un payload de webhook de Open Wearables → AggregatorDaily[]. */
export function openWearablesToDaily(raw: any): AggregatorDaily[] {
  const type = openWearablesEventType(raw);
  const device = openWearablesSourceDevice(raw);
  const d = raw?.data ?? {};
  const date = owDate(d);
  if (!date) return [];
  const base: AggregatorDaily = { date, sourceDevice: device };

  // ── Eventos de sesión ──
  if (type === 'sleep.created') {
    if (d?.is_nap === true) return []; // la siesta no pisa la noche principal
    return [{
      ...base,
      sleepDurationMin: n(d?.sleep_total_duration_minutes),
      sleepEfficiency: n(d?.sleep_efficiency_score),
      deepMin: n(d?.sleep_deep_minutes),
      remMin: n(d?.sleep_rem_minutes),
      lightMin: n(d?.sleep_light_minutes),
      awakeMin: n(d?.sleep_awake_minutes),
    }];
  }
  if (type === 'activity.created' || type === 'workout.created') {
    return [{
      ...base,
      steps: n(d?.steps_count),
      caloriesActive: n(d?.energy_burned),
      activeMin: secToMin(d?.moving_time_seconds),
    }];
  }

  // ── Eventos de timeseries (samples[]) ──
  const samples: any[] = Array.isArray(d?.samples) ? d.samples : [];
  if (type === 'heart_rate_variability.created') return [{ ...base, hrvMs: owAvg(samples) }];
  if (type === 'spo2.created')                   return [{ ...base, spo2Avg: owAvg(samples) }];
  if (type === 'respiratory_rate.created')       return [{ ...base, respiratoryRate: owAvg(samples) }];
  if (type === 'steps.created')                  return [{ ...base, steps: owSum(samples) }];
  if (type === 'calories.created')               return [{ ...base, caloriesActive: owSum(samples) }];

  return [];
}

/**
 * Pipeline completo: payload Terra → filas de wearable_daily (mergeadas por día).
 * El webhook llama a esto y hace upsert del resultado.
 */
export function normalizeAggregatorPayload(raw: any, userId: string): WearableDailyRow[] {
  const dailies = mergeDailies(terraToDaily(raw));
  return dailies.map((d) => toWearableDailyRow(d, userId));
}

/** Adapter por vendor → AggregatorDaily[] (único punto de cambio de proveedor). */
export function aggregatorToDaily(vendor: AggregatorVendor, raw: any): AggregatorDaily[] {
  return vendor === 'open_wearables' ? openWearablesToDaily(raw) : terraToDaily(raw);
}

/** Pipeline por vendor: payload → filas de wearable_daily (mergeadas por día). */
export function normalizeAggregatorPayloadFor(
  vendor: AggregatorVendor, raw: any, userId: string,
): WearableDailyRow[] {
  const dailies = mergeDailies(aggregatorToDaily(vendor, raw));
  return dailies.map((d) => toWearableDailyRow(d, userId));
}

/* eslint-enable @typescript-eslint/no-explicit-any */
