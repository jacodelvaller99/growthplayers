/**
 * lib/wearablesNative.ts
 *
 * Lectura on-device de wearables desde los agregadores oficiales del SO:
 *   - iOS  → Apple HealthKit       (react-native-health)
 *   - And  → Android Health Connect (react-native-health-connect)
 *
 * Estos agregadores reciben datos de Apple Watch + Garmin/Polar/Coros/Suunto/
 * Withings/Fitbit/Samsung Galaxy Watch/Wear OS/Whoop/Oura (cualquiera que
 * escriba a HealthKit/HC), así que con UNA integración por SO cubrimos
 * "todos los relojes inteligentes" sin OAuth ni tokens server-side.
 *
 * Diseño:
 *  - Provider canónico `'apple_health'` o `'health_connect'`.
 *  - Upsert directo a `wearable_daily` con el cliente Supabase del usuario
 *    (RLS owner ya cubre — cero secretos nuevos, cero edge function).
 *  - Web fallback explícito: { ok: false, reason: 'web_unsupported' }.
 *  - Imports nativos vía `require()` gated por Platform.OS para no romper el
 *    export web (las dos libs no tienen entrypoint web).
 *
 * Lo que NO leemos:
 *  - sleep_score y recovery_score (HealthKit/HC no los exponen como score
 *    sintético). `biometricLogic.computeInsight` ya deriva el estado clínico
 *    de HRV+RHR vs baseline, así que el motor downstream sigue funcionando.
 */

import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { WearableDaily, WearableProvider } from '@/lib/wearables';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supa: any = supabase;

export type NativeProvider = Extract<WearableProvider, 'apple_health' | 'health_connect'>;

export type NativeResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; reason: 'web_unsupported' | 'permission_denied' | 'no_user' | 'error'; message?: string };

/** Provider canónico para la plataforma actual, o null en web. */
export function nativeProviderForPlatform(): NativeProvider | null {
  if (Platform.OS === 'ios') return 'apple_health';
  if (Platform.OS === 'android') return 'health_connect';
  return null;
}

// ─── Permission request ──────────────────────────────────────────────────────
export async function requestNativePermissions(): Promise<NativeResult<NativeProvider>> {
  if (Platform.OS === 'web') return { ok: false, reason: 'web_unsupported' };

  try {
    if (Platform.OS === 'ios') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AppleHealthKit = require('react-native-health');
      const perms = {
        permissions: {
          read: [
            'SleepAnalysis',
            'HeartRate',
            'HeartRateVariability',
            'RestingHeartRate',
            'StepCount',
            'ActiveEnergyBurned',
            'OxygenSaturation',
            'RespiratoryRate',
            'BodyTemperature',
          ],
          write: [],
        },
      };
      return await new Promise<NativeResult<NativeProvider>>((resolve) => {
        AppleHealthKit.initHealthKit(perms, (err: string | null) => {
          if (err) resolve({ ok: false, reason: 'permission_denied', message: err });
          else resolve({ ok: true, value: 'apple_health' });
        });
      });
    }

    // Android
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const HC = require('react-native-health-connect');
    const available = await HC.initialize();
    if (!available) return { ok: false, reason: 'permission_denied', message: 'Health Connect no disponible' };
    const granted = await HC.requestPermission([
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
      { accessType: 'read', recordType: 'RestingHeartRate' },
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      { accessType: 'read', recordType: 'OxygenSaturation' },
      { accessType: 'read', recordType: 'RespiratoryRate' },
    ]);
    if (!Array.isArray(granted) || granted.length === 0) {
      return { ok: false, reason: 'permission_denied', message: 'Permisos no concedidos' };
    }
    return { ok: true, value: 'health_connect' };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown';
    return { ok: false, reason: 'error', message };
  }
}

// ─── Read one day → campos canónicos ─────────────────────────────────────────
export async function readDay(date: Date): Promise<Partial<WearableDaily>> {
  if (Platform.OS === 'web') return {};
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd   = new Date(date); dayEnd.setHours(23, 59, 59, 999);

  try {
    if (Platform.OS === 'ios') {
      return await readDayHealthKit(dayStart, dayEnd);
    }
    if (Platform.OS === 'android') {
      return await readDayHealthConnect(dayStart, dayEnd);
    }
  } catch {
    // Silent degrade — devolver vacío deja al motor biométrico operar con null.
    return {};
  }
  return {};
}

// ─── HealthKit (iOS) ─────────────────────────────────────────────────────────
async function readDayHealthKit(start: Date, end: Date): Promise<Partial<WearableDaily>> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AppleHealthKit = require('react-native-health').default;
  const opts = { startDate: start.toISOString(), endDate: end.toISOString() };
  const dateStr = isoDate(start);

  const sleep        = await hkSamples<HKSleepSample>(AppleHealthKit.getSleepSamples, opts);
  const hrv          = await hkSamples<HKValueSample>(AppleHealthKit.getHeartRateVariabilitySamples, opts);
  const restingHr    = await hkSamples<HKValueSample>(AppleHealthKit.getRestingHeartRateSamples, opts);
  const steps        = await hkValue(AppleHealthKit.getDailyStepCountSamples, opts);
  const energy       = await hkValue(AppleHealthKit.getActiveEnergyBurned, opts);
  const spo2         = await hkSamples<HKValueSample>(AppleHealthKit.getOxygenSaturationSamples, opts);
  const respRate     = await hkSamples<HKValueSample>(AppleHealthKit.getRespiratoryRateSamples, opts);

  const stages = aggregateSleepStages(sleep);

  return {
    provider: 'apple_health',
    date: dateStr,
    sleep_duration_min: stages.totalMin || null,
    sleep_efficiency:   stages.efficiency,
    rem_min:            stages.remMin,
    deep_min:           stages.deepMin,
    light_min:          stages.lightMin,
    awake_min:          stages.awakeMin,
    hrv_ms:             avgValue(hrv),
    resting_hr:         avgValue(restingHr),
    spo2_avg:           avgValue(spo2) ? avgValue(spo2)! * 100 : null,
    respiratory_rate:   avgValue(respRate),
    steps:              steps,
    calories_active:    energy,
    sleep_score:        null,
    recovery_score:     null,
  };
}

interface HKSleepSample { startDate: string; endDate: string; value: string; }
interface HKValueSample { value: number; startDate?: string; endDate?: string; }

function hkSamples<T>(fn: any, opts: any): Promise<T[]> {
  return new Promise((resolve) => {
    if (typeof fn !== 'function') return resolve([]);
    fn(opts, (_err: unknown, res: T[]) => resolve(Array.isArray(res) ? res : []));
  });
}
function hkValue(fn: any, opts: any): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof fn !== 'function') return resolve(null);
    fn(opts, (_err: unknown, res: HKValueSample[] | HKValueSample) => {
      if (Array.isArray(res)) resolve(res.reduce((a, b) => a + (b.value || 0), 0) || null);
      else resolve(res && typeof res.value === 'number' ? res.value : null);
    });
  });
}
function avgValue(samples: HKValueSample[]): number | null {
  const vals = samples.map((s) => s.value).filter((v): v is number => typeof v === 'number');
  if (!vals.length) return null;
  return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
}

interface SleepAgg { totalMin: number; remMin: number | null; deepMin: number | null; lightMin: number | null; awakeMin: number | null; efficiency: number | null; }
function aggregateSleepStages(samples: HKSleepSample[]): SleepAgg {
  if (!samples.length) return { totalMin: 0, remMin: null, deepMin: null, lightMin: null, awakeMin: null, efficiency: null };
  let rem = 0, deep = 0, light = 0, awake = 0, inBed = 0;
  for (const s of samples) {
    const min = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
    if (!Number.isFinite(min) || min <= 0) continue;
    const v = String(s.value).toUpperCase();
    if (v.includes('REM'))         rem   += min;
    else if (v.includes('DEEP'))   deep  += min;
    else if (v.includes('CORE') || v.includes('LIGHT')) light += min;
    else if (v.includes('AWAKE'))  awake += min;
    if (v.includes('INBED'))       inBed += min;
  }
  const asleep = rem + deep + light;
  const total  = Math.round(asleep);
  const eff    = inBed > 0 ? parseFloat(((asleep / inBed) * 100).toFixed(1)) : null;
  return {
    totalMin: total,
    remMin:   rem   ? Math.round(rem)   : null,
    deepMin:  deep  ? Math.round(deep)  : null,
    lightMin: light ? Math.round(light) : null,
    awakeMin: awake ? Math.round(awake) : null,
    efficiency: eff,
  };
}

// ─── Health Connect (Android) ────────────────────────────────────────────────
async function readDayHealthConnect(start: Date, end: Date): Promise<Partial<WearableDaily>> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const HC = require('react-native-health-connect');
  const timeRangeFilter = { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() };

  const [sleep, hrv, rhr, steps, energy, spo2, resp] = await Promise.all([
    safeHC(() => HC.readRecords('SleepSession',                 { timeRangeFilter })),
    safeHC(() => HC.readRecords('HeartRateVariabilityRmssd',    { timeRangeFilter })),
    safeHC(() => HC.readRecords('RestingHeartRate',             { timeRangeFilter })),
    safeHC(() => HC.aggregateRecord({ recordType: 'Steps',                 timeRangeFilter })),
    safeHC(() => HC.aggregateRecord({ recordType: 'ActiveCaloriesBurned',  timeRangeFilter })),
    safeHC(() => HC.readRecords('OxygenSaturation',             { timeRangeFilter })),
    safeHC(() => HC.readRecords('RespiratoryRate',              { timeRangeFilter })),
  ]);

  const stages = aggregateHCSleep(sleep?.records ?? []);
  const hrvAvg = avgFromHCRecords(hrv?.records, 'heartRateVariabilityMillis');
  const rhrAvg = avgFromHCRecords(rhr?.records, 'beatsPerMinute');
  const spo2Avg= avgFromHCRecords(spo2?.records, 'percentage');
  const respAvg= avgFromHCRecords(resp?.records, 'rate');

  return {
    provider: 'health_connect',
    date: isoDate(start),
    sleep_duration_min: stages.totalMin || null,
    rem_min:            stages.remMin,
    deep_min:           stages.deepMin,
    light_min:          stages.lightMin,
    awake_min:          stages.awakeMin,
    sleep_efficiency:   stages.efficiency,
    hrv_ms:             hrvAvg,
    resting_hr:         rhrAvg,
    spo2_avg:           spo2Avg,
    respiratory_rate:   respAvg,
    steps:              hcCount(steps, 'COUNT_TOTAL'),
    calories_active:    hcEnergy(energy, 'ACTIVE_CALORIES_TOTAL'),
    sleep_score:        null,
    recovery_score:     null,
  };
}

async function safeHC<T = any>(fn: () => Promise<T>): Promise<any> {
  try { return await fn(); } catch { return null; }
}
function avgFromHCRecords(records: any[] | undefined, field: string): number | null {
  if (!records?.length) return null;
  const vals: number[] = [];
  for (const r of records) {
    const v = r?.[field] ?? r?.samples?.map?.((s: any) => s?.[field]).filter?.((x: any) => typeof x === 'number');
    if (typeof v === 'number') vals.push(v);
    else if (Array.isArray(v)) vals.push(...v);
  }
  if (!vals.length) return null;
  return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
}
function hcCount(agg: any, key: string): number | null {
  const v = agg?.[key];
  return typeof v === 'number' ? Math.round(v) : null;
}
function hcEnergy(agg: any, key: string): number | null {
  const v = agg?.[key]?.inKilocalories ?? agg?.[key];
  return typeof v === 'number' ? Math.round(v) : null;
}

interface HCSleepRecord { startTime: string; endTime: string; stages?: { stage: number | string; startTime: string; endTime: string }[]; }
const HC_STAGE: Record<string, 'rem' | 'deep' | 'light' | 'awake'> = {
  '1': 'awake', '2': 'awake', '3': 'light', '4': 'deep', '5': 'rem', '6': 'awake', '7': 'light',
  AWAKE: 'awake', AWAKE_IN_BED: 'awake', LIGHT: 'light', DEEP: 'deep', REM: 'rem', SLEEPING: 'light', OUT_OF_BED: 'awake',
};
function aggregateHCSleep(records: HCSleepRecord[]): SleepAgg {
  if (!records?.length) return { totalMin: 0, remMin: null, deepMin: null, lightMin: null, awakeMin: null, efficiency: null };
  let rem = 0, deep = 0, light = 0, awake = 0, inBed = 0;
  for (const r of records) {
    const sessionMin = (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000;
    if (Number.isFinite(sessionMin) && sessionMin > 0) inBed += sessionMin;
    if (!r.stages?.length) continue;
    for (const st of r.stages) {
      const min = (new Date(st.endTime).getTime() - new Date(st.startTime).getTime()) / 60000;
      if (!Number.isFinite(min) || min <= 0) continue;
      const kind = HC_STAGE[String(st.stage).toUpperCase()] ?? 'light';
      if (kind === 'rem') rem += min;
      else if (kind === 'deep') deep += min;
      else if (kind === 'light') light += min;
      else awake += min;
    }
  }
  const asleep = rem + deep + light;
  const eff = inBed > 0 ? parseFloat(((asleep / inBed) * 100).toFixed(1)) : null;
  return {
    totalMin: Math.round(asleep),
    remMin:   rem   ? Math.round(rem)   : null,
    deepMin:  deep  ? Math.round(deep)  : null,
    lightMin: light ? Math.round(light) : null,
    awakeMin: awake ? Math.round(awake) : null,
    efficiency: eff,
  };
}

// ─── Sync N days → wearable_daily + wearable_connections ─────────────────────
export async function syncRange(days = 7): Promise<NativeResult<{ provider: NativeProvider; daysWritten: number }>> {
  if (Platform.OS === 'web') return { ok: false, reason: 'web_unsupported' };
  const provider = nativeProviderForPlatform();
  if (!provider) return { ok: false, reason: 'web_unsupported' };

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return { ok: false, reason: 'no_user' };

  const rows: Partial<WearableDaily>[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const day = await readDay(d);
    if (day && Object.keys(day).length > 2) rows.push({ ...day, user_id: userId });
  }

  if (rows.length > 0) {
    await supa.from('wearable_daily').upsert(rows, { onConflict: 'user_id,provider,date' });
  }

  // Marca conexión activa + last_synced_at (upsert por user+provider).
  await supa.from('wearable_connections').upsert(
    { user_id: userId, provider, is_active: true, connected_at: new Date().toISOString(), last_synced_at: new Date().toISOString() },
    { onConflict: 'user_id,provider' },
  );

  return { ok: true, value: { provider, daysWritten: rows.length } };
}

// ─── Util ────────────────────────────────────────────────────────────────────
function isoDate(d: Date): string {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Export internals for tests.
export const __test = { aggregateSleepStages, aggregateHCSleep, avgValue, isoDate };
