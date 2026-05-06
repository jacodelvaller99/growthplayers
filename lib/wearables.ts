/**
 * lib/wearables.ts
 *
 * Wearables integration helpers:
 * - OAuth URL builders for Oura + WHOOP
 * - Token exchange (server action via Supabase Edge Function)
 * - React hooks for wearable data
 * - Data normalization utilities
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ENV } from '@/app/config/env';

// Cast to any: wearable tables are new (post-migration) and not yet in the
// Supabase-generated TypeScript schema snapshot.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supa: any = supabase;

// ─── Constants ────────────────────────────────────────────────────────────────
export type WearableProvider = 'oura' | 'whoop';

const REDIRECT_BASE = ENV.isDev
  ? 'exp://localhost:8081'
  : 'https://growthplayers.vercel.app';

export const OAUTH_URLS: Record<WearableProvider, (state: string) => string> = {
  oura: (state) => {
    const params = new URLSearchParams({
      client_id:     process.env.EXPO_PUBLIC_OURA_CLIENT_ID ?? '',
      redirect_uri:  `${REDIRECT_BASE}/oauth/oura/callback`,
      response_type: 'code',
      scope:         'email personal daily heartrate workout tag session',
      state,
    });
    return `https://cloud.ouraring.com/oauth/authorize?${params}`;
  },
  whoop: (state) => {
    const params = new URLSearchParams({
      client_id:     process.env.EXPO_PUBLIC_WHOOP_CLIENT_ID ?? '',
      redirect_uri:  `${REDIRECT_BASE}/oauth/whoop/callback`,
      response_type: 'code',
      scope:         'read:recovery read:cycles read:sleep read:workout read:profile',
      state,
    });
    return `https://api.prod.whoop.com/oauth/oauth2/auth?${params}`;
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface WearableConnection {
  id: string;
  user_id: string;
  provider: WearableProvider;
  is_active: boolean;
  connected_at: string;
  last_synced_at: string | null;
  scope: string[] | null;
}

export interface WearableDaily {
  id: string;
  user_id: string;
  provider: WearableProvider;
  date: string;
  // Sleep
  sleep_score: number | null;
  sleep_duration_min: number | null;
  sleep_efficiency: number | null;
  rem_min: number | null;
  deep_min: number | null;
  light_min: number | null;
  awake_min: number | null;
  // Recovery
  recovery_score: number | null;
  hrv_ms: number | null;
  resting_hr: number | null;
  body_temp_delta: number | null;
  spo2_avg: number | null;
  // Activity
  activity_score: number | null;
  strain_score: number | null;
  calories_active: number | null;
  steps: number | null;
  active_min: number | null;
  stress_score: number | null;
  synced_at: string;
}

export interface WearableTimeseries {
  id: string;
  provider: WearableProvider;
  metric: string;
  recorded_at: string;
  value: number;
}

// ─── Token exchange (calls edge function via server action) ───────────────────
export async function exchangeWearableCode(
  provider: WearableProvider,
  code: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('sync-wearables', {
      body: { action: 'connect', provider, code },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, ...data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Manual sync trigger ──────────────────────────────────────────────────────
export async function triggerWearableSync(
  userId: string,
  provider?: WearableProvider,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.functions.invoke('sync-wearables', {
      body: { user_id: userId, provider },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Hook: wearable connections ───────────────────────────────────────────────
export function useWearableConnections() {
  const [connections, setConnections] = useState<WearableConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supa
      .from('wearable_connections')
      .select('id, user_id, provider, is_active, connected_at, last_synced_at, scope')
      .eq('is_active', true)
      .order('connected_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setConnections((data ?? []) as WearableConnection[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const isConnected = (provider: WearableProvider) =>
    connections.some(c => c.provider === provider && c.is_active);

  const getConnection = (provider: WearableProvider) =>
    connections.find(c => c.provider === provider);

  return { connections, loading, error, isConnected, getConnection, reload: load };
}

// ─── Hook: wearable daily data ────────────────────────────────────────────────
export function useWearableDaily(days = 7) {
  const [data, setData] = useState<WearableDaily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .substring(0, 10);

    supa
      .from('wearable_daily')
      .select('*')
      .gte('date', startDate)
      .order('date', { ascending: false })
      .then(({ data: rows, error: err }: any) => {
        if (err) setError(err.message);
        else setData((rows ?? []) as WearableDaily[]);
        setLoading(false);
      });
  }, [days]);

  // Today's data (most recent)
  const today = data[0] ?? null;

  // 7-day averages
  const averages = data.length > 0 ? {
    recovery:  avg(data.map(d => d.recovery_score)),
    sleep:     avg(data.map(d => d.sleep_score)),
    hrv:       avg(data.map(d => d.hrv_ms)),
    restingHr: avg(data.map(d => d.resting_hr)),
    activity:  avg(data.map(d => d.activity_score)),
  } : null;

  return { data, today, averages, loading, error };
}

// ─── Hook: wearable timeseries ────────────────────────────────────────────────
export function useWearableTimeseries(metric: string, hours = 24) {
  const [data, setData] = useState<WearableTimeseries[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    supa
      .from('wearable_timeseries')
      .select('id, provider, metric, recorded_at, value')
      .eq('metric', metric)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true })
      .then(({ data: rows }: any) => {
        setData((rows ?? []) as WearableTimeseries[]);
        setLoading(false);
      });
  }, [metric, hours]);

  return { data, loading };
}

// ─── Normalization helpers ────────────────────────────────────────────────────
export function normalizeOuraData(raw: any, userId: string): Partial<WearableDaily> {
  const readiness = raw?.readiness ?? {};
  const sleep     = raw?.sleep ?? {};
  const activity  = raw?.activity ?? {};
  const date      = readiness.day ?? sleep.day ?? activity.day ?? '';

  return {
    user_id:           userId,
    provider:          'oura',
    date,
    recovery_score:    readiness.score ?? null,
    hrv_ms:            readiness.contributors?.hrv_balance ?? null,
    resting_hr:        readiness.contributors?.resting_heart_rate ?? null,
    body_temp_delta:   readiness.temperature_deviation ?? null,
    spo2_avg:          readiness.contributors?.breathing_regularity ?? null,
    sleep_score:       sleep.score ?? null,
    sleep_duration_min: sleep.contributors?.total_sleep
      ? Math.round(sleep.contributors.total_sleep / 60) : null,
    rem_min:           sleep.contributors?.rem_sleep
      ? Math.round(sleep.contributors.rem_sleep / 60) : null,
    deep_min:          sleep.contributors?.deep_sleep
      ? Math.round(sleep.contributors.deep_sleep / 60) : null,
    activity_score:    activity.score ?? null,
    calories_active:   activity.active_calories ?? null,
    steps:             activity.steps ?? null,
    active_min:        activity.high_activity_time
      ? Math.round(activity.high_activity_time / 60) : null,
  };
}

export function normalizeWhoopData(raw: any, userId: string): Partial<WearableDaily> {
  const recovery = raw?.recovery ?? {};
  const sleep    = raw?.sleep ?? {};
  const cycle    = raw?.cycle ?? {};
  const date     = (recovery.created_at ?? sleep.start ?? cycle.start ?? '').substring(0, 10);
  const stages   = sleep.score?.stage_summary ?? {};

  return {
    user_id:           userId,
    provider:          'whoop',
    date,
    recovery_score:    recovery.score?.recovery_score ?? null,
    hrv_ms:            recovery.score?.hrv_rmssd_milli ?? null,
    resting_hr:        recovery.score?.resting_heart_rate ?? null,
    spo2_avg:          recovery.score?.spo2_percentage ?? null,
    body_temp_delta:   recovery.score?.skin_temp_celsius ?? null,
    sleep_score:       sleep.score?.sleep_performance_percentage ?? null,
    sleep_duration_min: sleep.score?.total_in_bed_time_milli
      ? Math.round(sleep.score.total_in_bed_time_milli / 60000) : null,
    sleep_efficiency:  sleep.score?.sleep_efficiency_percentage ?? null,
    rem_min:           stages.total_rem_sleep_time_milli
      ? Math.round(stages.total_rem_sleep_time_milli / 60000) : null,
    deep_min:          stages.total_slow_wave_sleep_time_milli
      ? Math.round(stages.total_slow_wave_sleep_time_milli / 60000) : null,
    light_min:         stages.total_light_sleep_time_milli
      ? Math.round(stages.total_light_sleep_time_milli / 60000) : null,
    awake_min:         stages.total_awake_time_milli
      ? Math.round(stages.total_awake_time_milli / 60000) : null,
    strain_score:      cycle.score?.strain ?? null,
    calories_active:   cycle.score?.kilojoule
      ? Math.round(cycle.score.kilojoule / 4.184) : null,
  };
}

// ─── Biometric readiness calculation ─────────────────────────────────────────
/**
 * Calculate biometric readiness 0-100 from last N days of wearable data.
 * Uses recovery_score as primary signal.
 */
export function calculateBiometricReadiness(days: WearableDaily[]): number {
  if (!days.length) return 50; // neutral default

  const recent = days.slice(0, 3); // last 3 days
  const scores = recent
    .map(d => d.recovery_score)
    .filter((s): s is number => s !== null);

  if (!scores.length) return 50;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * NBA decision based on biometric readiness.
 */
export function biometricNBADecision(readiness: number, hrv?: number | null): {
  action: string;
  reason: string;
  urgency: 'low' | 'normal' | 'high';
} {
  if (readiness < 40) {
    return {
      action:  'Tu cuerpo pide descanso hoy — sesión binaural delta (20 min)',
      reason:  'Recuperación baja detectada por tu wearable.',
      urgency: 'high',
    };
  }
  if (readiness < 60) {
    if (hrv && hrv < 30) {
      return {
        action:  'Hoy mejor escuchar que estudiar — binaural theta para aprender',
        reason:  'Sistema nervioso en recuperación activa.',
        urgency: 'normal',
      };
    }
    return {
      action:  'Día moderado — breathing box 4x4 antes de tu lección',
      reason:  'Recuperación moderada. Prepara tu sistema nervioso.',
      urgency: 'normal',
    };
  }
  // readiness >= 60
  return {
    action:  'Tu cuerpo está en peak — momento ideal para la lección más densa',
    reason:  'Recuperación óptima. Aprovecha este estado.',
    urgency: 'low',
  };
}

// ─── Util ─────────────────────────────────────────────────────────────────────
function avg(values: (number | null | undefined)[]): number | null {
  const valid = values.filter((v): v is number => v != null);
  if (!valid.length) return null;
  return parseFloat((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1));
}

/** Human-readable label for HRV */
export function hrvLabel(hrv: number, baseline: number | null): string {
  if (!baseline) return `${Math.round(hrv)}ms`;
  const diff = hrv - baseline;
  const pct  = Math.round((diff / baseline) * 100);
  const sign = pct >= 0 ? '+' : '';
  return `${Math.round(hrv)}ms (${sign}${pct}%)`;
}

/** Translate recovery score to human label */
export function recoveryLabel(score: number): string {
  if (score >= 70) return 'Óptimo';
  if (score >= 50) return 'Bueno';
  if (score >= 30) return 'Moderado';
  return 'Bajo';
}

/** Translate score to human language for Norman */
export function hrvToNormanLanguage(hrv: number, baseline: number | null): string {
  if (!baseline) return 'tu sistema nervioso está operando con normalidad';
  const ratio = hrv / baseline;
  if (ratio >= 1.15) return 'tienes energía nerviosa óptima ahora';
  if (ratio >= 0.90) return 'tu sistema nervioso está equilibrado hoy';
  if (ratio >= 0.75) return 'tu sistema nervioso necesita algo de calma';
  return 'tu sistema nervioso necesita calma hoy';
}
