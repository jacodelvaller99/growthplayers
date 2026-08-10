/**
 * sync-wearables — Supabase Edge Function
 *
 * Syncs biometric data from Oura Ring API v2 and WHOOP API v2
 * into wearable_daily and wearable_timeseries tables.
 *
 * POST body:
 *   { user_id: string, provider?: 'oura' | 'whoop' }
 *   { batch: 'all' }  — processes all active connections
 *
 * After sync: triggers calculate-intelligence for the user.
 */

// deno-lint-ignore-file no-explicit-any
import { adminSupabase, json, corsHeaders } from '../_shared/supabase.ts';

// ─── Environment ──────────────────────────────────────────────────────────────
const OURA_CLIENT_ID     = Deno.env.get('OURA_CLIENT_ID')!;
const OURA_CLIENT_SECRET = Deno.env.get('OURA_CLIENT_SECRET')!;
const WHOOP_CLIENT_ID    = Deno.env.get('WHOOP_CLIENT_ID')!;
const WHOOP_CLIENT_SECRET = Deno.env.get('WHOOP_CLIENT_SECRET')!;
const POLAR_CLIENT_ID    = Deno.env.get('POLAR_CLIENT_ID')!;
const POLAR_CLIENT_SECRET = Deno.env.get('POLAR_CLIENT_SECRET')!;
const STRAVA_CLIENT_ID    = Deno.env.get('STRAVA_CLIENT_ID')!;
const STRAVA_CLIENT_SECRET = Deno.env.get('STRAVA_CLIENT_SECRET')!;
const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── Types ────────────────────────────────────────────────────────────────────
interface WearableConnection {
  id: string;
  user_id: string;
  provider: 'oura' | 'whoop' | 'polar' | 'strava';
  access_token: string;
  refresh_token: string;
  token_expires_at: string | null;
  scope: string[] | null;
}

interface DailyRecord {
  user_id: string;
  provider: string;
  date: string;
  sleep_score?: number;
  sleep_duration_min?: number;
  sleep_efficiency?: number;
  rem_min?: number;
  deep_min?: number;
  light_min?: number;
  awake_min?: number;
  recovery_score?: number;
  hrv_ms?: number;
  resting_hr?: number;
  body_temp_delta?: number;
  spo2_avg?: number;
  activity_score?: number;
  strain_score?: number;
  calories_active?: number;
  steps?: number;
  active_min?: number;
  stress_score?: number;
  raw_payload?: any;
}

interface TimeseriesPoint {
  user_id: string;
  provider: string;
  metric: string;
  recorded_at: string;
  value: number;
}

// ─── Escritura de días ────────────────────────────────────────────────────────
/**
 * Escribe días vía `merge_wearable_daily` en vez de un upsert plano.
 *
 * El upsert plano tenía una pérdida de datos real: mandamos VARIOS días en un
 * solo array y PostgREST usa la UNIÓN de las claves de todas las filas,
 * rellenando con NULL las que faltan en cada una. Si `fetchOura` fallaba en un
 * endpoint (devuelve null, no lanza) o un día no traía una métrica, ese día
 * llegaba con NULL y BORRABA lo que ya estaba sincronizado. La RPC hace
 * COALESCE por columna bajo row-lock, así que un fallo transitorio ya no puede
 * vaciar datos buenos.
 *
 * Degrada al upsert previo si la RPC todavía no está en la base: así el deploy
 * de la función no depende del orden en que se aplique la migración.
 */
async function mergeDaily(rows: DailyRecord[]): Promise<void> {
  if (rows.length === 0) return;

  const { error } = await adminSupabase.rpc('merge_wearable_daily', { p_rows: rows });
  if (!error) return;

  console.warn('[sync-wearables] merge_wearable_daily no disponible, upsert plano:', error.message);
  await adminSupabase
    .from('wearable_daily')
    .upsert(rows, { onConflict: 'user_id,provider,date' });
}

// ─── Token refresh ────────────────────────────────────────────────────────────
async function refreshOuraToken(conn: WearableConnection): Promise<string> {
  const res = await fetch('https://api.ouraring.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     OURA_CLIENT_ID,
      client_secret: OURA_CLIENT_SECRET,
      refresh_token: conn.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`Oura token refresh failed: ${res.status}`);
  const data = await res.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  await adminSupabase.from('wearable_connections').update({
    access_token:     data.access_token,
    refresh_token:    data.refresh_token ?? conn.refresh_token,
    token_expires_at: expiresAt,
  }).eq('id', conn.id);
  return data.access_token;
}

async function refreshWhoopToken(conn: WearableConnection): Promise<string> {
  const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     WHOOP_CLIENT_ID,
      client_secret: WHOOP_CLIENT_SECRET,
      refresh_token: conn.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`WHOOP token refresh failed: ${res.status}`);
  const data = await res.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  await adminSupabase.from('wearable_connections').update({
    access_token:     data.access_token,
    refresh_token:    data.refresh_token ?? conn.refresh_token,
    token_expires_at: expiresAt,
  }).eq('id', conn.id);
  return data.access_token;
}

async function refreshPolarToken(conn: WearableConnection): Promise<string> {
  const basicAuth = btoa(`${POLAR_CLIENT_ID}:${POLAR_CLIENT_SECRET}`);
  const res = await fetch('https://polarremote.com/v2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      Authorization:   `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: conn.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`Polar token refresh failed: ${res.status}`);
  const data = await res.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  await adminSupabase.from('wearable_connections').update({
    access_token:     data.access_token,
    refresh_token:    data.refresh_token ?? conn.refresh_token,
    token_expires_at: expiresAt,
  }).eq('id', conn.id);
  return data.access_token;
}

async function refreshStravaToken(conn: WearableConnection): Promise<string> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: conn.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`);
  const data = await res.json();
  // Strava siempre rota el refresh_token — a diferencia de Oura/WHOOP donde a
  // veces viene null y hay que conservar el anterior, aquí SIEMPRE hay uno nuevo.
  const expiresAt = new Date(data.expires_at * 1000).toISOString();
  await adminSupabase.from('wearable_connections').update({
    access_token:     data.access_token,
    refresh_token:    data.refresh_token,
    token_expires_at: expiresAt,
  }).eq('id', conn.id);
  return data.access_token;
}

async function getValidToken(conn: WearableConnection): Promise<string> {
  if (conn.token_expires_at) {
    const expiresAt = new Date(conn.token_expires_at).getTime();
    const oneHourMs = 60 * 60 * 1000;
    if (expiresAt < Date.now() + oneHourMs) {
      // Dispatch explícito. Antes era un ternario `oura ? … : whoop`, así que
      // CUALQUIER proveedor que no fuera Oura iba al refresh de WHOOP — con
      // sus credenciales y su endpoint. Silencioso mientras solo hubiera dos
      // proveedores; una bomba en cuanto se añadiera un tercero.
      switch (conn.provider) {
        case 'oura':   return refreshOuraToken(conn);
        case 'whoop':  return refreshWhoopToken(conn);
        case 'polar':  return refreshPolarToken(conn);
        case 'strava': return refreshStravaToken(conn);
        default:
          throw new Error(`getValidToken: proveedor sin refresh registrado: ${conn.provider}`);
      }
    }
  }
  return conn.access_token;
}

// ─── Oura API helpers ─────────────────────────────────────────────────────────
async function fetchOura(path: string, token: string, params?: Record<string, string>) {
  const url = new URL(`https://api.ouraring.com/v2/usercollection/${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error(`Oura API ${path} failed: ${res.status}`);
    return null;
  }
  return res.json();
}

async function syncOura(userId: string, conn: WearableConnection): Promise<void> {
  const token  = await getValidToken(conn);
  const today  = new Date().toISOString().substring(0, 10);
  const d7ago  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const d1ago  = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25h ago for timeseries

  const params = { start_date: d7ago, end_date: today };

  const [readinessData, sleepData, activityData, hrData] = await Promise.all([
    fetchOura('daily_readiness', token, params),
    fetchOura('daily_sleep', token, params),
    fetchOura('daily_activity', token, params),
    fetchOura('heartrate', token, {
      start_datetime: d1ago,
      end_datetime:   new Date().toISOString(),
    }),
  ]);

  // Build daily records map keyed by date
  const byDate: Record<string, DailyRecord> = {};

  // Readiness
  if (readinessData?.data) {
    for (const r of readinessData.data) {
      const d = r.day ?? r.date;
      if (!d) continue;
      byDate[d] = {
        ...byDate[d],
        user_id:        userId,
        provider:       'oura',
        date:           d,
        recovery_score: r.score,
        hrv_ms:         r.contributors?.hrv_balance,
        resting_hr:     r.contributors?.resting_heart_rate,
        body_temp_delta: r.temperature_deviation,
        spo2_avg:       r.contributors?.breathing_regularity,
      };
    }
  }

  // Sleep
  if (sleepData?.data) {
    for (const s of sleepData.data) {
      const d = s.day ?? s.date;
      if (!d) continue;
      byDate[d] = {
        ...byDate[d],
        user_id:           userId,
        provider:          'oura',
        date:              d,
        sleep_score:       s.score,
        sleep_duration_min: s.contributors?.total_sleep
          ? Math.round(s.contributors.total_sleep / 60) : undefined,
        rem_min:   s.contributors?.rem_sleep
          ? Math.round(s.contributors.rem_sleep / 60) : undefined,
        deep_min:  s.contributors?.deep_sleep
          ? Math.round(s.contributors.deep_sleep / 60) : undefined,
        awake_min: s.contributors?.restfulness ? undefined : undefined,
      };
    }
  }

  // Activity
  if (activityData?.data) {
    for (const a of activityData.data) {
      const d = a.day ?? a.date;
      if (!d) continue;
      byDate[d] = {
        ...byDate[d],
        user_id:         userId,
        provider:        'oura',
        date:            d,
        activity_score:  a.score,
        calories_active: a.active_calories,
        steps:           a.steps,
        active_min:      a.high_activity_time
          ? Math.round(a.high_activity_time / 60) : undefined,
      };
    }
  }

  // Attach raw payloads
  for (const d of Object.keys(byDate)) {
    byDate[d].raw_payload = {
      readiness: readinessData?.data?.find((r: any) => (r.day ?? r.date) === d),
      sleep:     sleepData?.data?.find((s: any) => (s.day ?? s.date) === d),
      activity:  activityData?.data?.find((a: any) => (a.day ?? a.date) === d),
    };
  }

  // Merge daily records — ver mergeDaily().
  const dailyRecords = Object.values(byDate);
  await mergeDaily(dailyRecords);

  // Timeseries (heart rate)
  if (hrData?.data && hrData.data.length > 0) {
    const tsPoints: TimeseriesPoint[] = hrData.data
      .filter((p: any) => p.timestamp && p.bpm)
      .map((p: any) => ({
        user_id:     userId,
        provider:    'oura',
        metric:      'heart_rate',
        recorded_at: p.timestamp,
        value:       p.bpm,
      }));

    if (tsPoints.length > 0) {
      // Batch insert in chunks of 500
      for (let i = 0; i < tsPoints.length; i += 500) {
        await adminSupabase
          .from('wearable_timeseries')
          .upsert(tsPoints.slice(i, i + 500), {
            onConflict: 'user_id,provider,metric,recorded_at',
          });
      }
    }
  }

  // Update last_synced_at
  await adminSupabase
    .from('wearable_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', conn.id);

  console.log(`[sync-wearables] Oura synced for ${userId}: ${dailyRecords.length} days`);
}

// ─── WHOOP API helpers ────────────────────────────────────────────────────────
// v2 — la v1 fue dada de baja el 1-oct-2025 y sus webhooks eliminados. Cualquier
// llamada a /developer/v1/ hoy está muerta, así que WHOOP no habría funcionado ni
// con las credenciales bien puestas. Verificado contra la doc: el endpoint de
// token, los scopes y el sobre de respuesta {records, next_token} NO cambian —
// solo el segmento de versión. Los ids de Sleep pasaron de long a UUID, pero no
// los usamos como clave (indexamos por fecha).
async function fetchWhoop(path: string, token: string, params?: Record<string, string>) {
  const url = new URL(`https://api.prod.whoop.com/developer/v2/${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error(`WHOOP API ${path} failed: ${res.status}`);
    return null;
  }
  return res.json();
}

async function syncWhoop(userId: string, conn: WearableConnection): Promise<void> {
  const token  = await getValidToken(conn);
  const startTs = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const endTs   = new Date().toISOString();
  const params  = { start: startTs, end: endTs, limit: '25' };

  const [recoveryData, sleepData, cycleData] = await Promise.all([
    fetchWhoop('recovery', token, params),
    fetchWhoop('activity/sleep', token, params),
    fetchWhoop('cycle', token, params),
  ]);

  const byDate: Record<string, DailyRecord> = {};

  // Recovery
  if (recoveryData?.records) {
    for (const r of recoveryData.records) {
      const d = r.created_at?.substring(0, 10);
      if (!d) continue;
      byDate[d] = {
        ...byDate[d],
        user_id:        userId,
        provider:       'whoop',
        date:           d,
        recovery_score: r.score?.recovery_score,
        hrv_ms:         r.score?.hrv_rmssd_milli,
        resting_hr:     r.score?.resting_heart_rate,
        spo2_avg:       r.score?.spo2_percentage,
        body_temp_delta: r.score?.skin_temp_celsius,
      };
    }
  }

  // Sleep
  if (sleepData?.records) {
    for (const s of sleepData.records) {
      const d = s.start?.substring(0, 10);
      if (!d) continue;
      const stages = s.score?.stage_summary ?? {};
      byDate[d] = {
        ...byDate[d],
        user_id:           userId,
        provider:          'whoop',
        date:              d,
        sleep_score:       s.score?.sleep_performance_percentage,
        // BUG PREEXISTENTE (no venía de v1→v2): `total_in_bed_time_milli` vive
        // bajo `score.stage_summary`, no bajo `score`. Se leía del sitio
        // equivocado, así que sleep_duration_min SIEMPRE salía undefined y la
        // duración del sueño de WHOOP nunca se guardó. Las demás métricas de
        // etapas ya usaban `stages` — solo esta se había quedado fuera.
        sleep_duration_min: stages.total_in_bed_time_milli
          ? Math.round(stages.total_in_bed_time_milli / 60000) : undefined,
        sleep_efficiency:  s.score?.sleep_efficiency_percentage,
        // La columna existe en wearable_daily y la RPC ya la soporta; WHOOP la
        // entrega en cada registro de sueño y no la estábamos capturando.
        respiratory_rate:  s.score?.respiratory_rate,
        rem_min:           stages.total_rem_sleep_time_milli
          ? Math.round(stages.total_rem_sleep_time_milli / 60000) : undefined,
        deep_min:          stages.total_slow_wave_sleep_time_milli
          ? Math.round(stages.total_slow_wave_sleep_time_milli / 60000) : undefined,
        light_min:         stages.total_light_sleep_time_milli
          ? Math.round(stages.total_light_sleep_time_milli / 60000) : undefined,
        awake_min:         stages.total_awake_time_milli
          ? Math.round(stages.total_awake_time_milli / 60000) : undefined,
      };
    }
  }

  // Cycle (strain)
  if (cycleData?.records) {
    for (const c of cycleData.records) {
      const d = c.start?.substring(0, 10);
      if (!d) continue;
      byDate[d] = {
        ...byDate[d],
        user_id:         userId,
        provider:        'whoop',
        date:            d,
        strain_score:    c.score?.strain,
        calories_active: c.score?.kilojoule
          ? Math.round(c.score.kilojoule / 4.184) : undefined,
        // `active_min` se quitó: era `average_heart_rate ? undefined : undefined`,
        // es decir, siempre undefined. WHOOP no expone minutos activos en el
        // ciclo; fingir que sí solo confundía a quien leyera esto.
      };
    }
  }

  // Attach raw payloads
  for (const d of Object.keys(byDate)) {
    byDate[d].raw_payload = {
      recovery: recoveryData?.records?.find((r: any) => r.created_at?.startsWith(d)),
      sleep:    sleepData?.records?.find((s: any) => s.start?.startsWith(d)),
      cycle:    cycleData?.records?.find((c: any) => c.start?.startsWith(d)),
    };
  }

  const dailyRecords = Object.values(byDate);
  await mergeDaily(dailyRecords);

  // Timeseries from recovery (HRV points not natively available in free tier,
  // but recovery score acts as daily HRV proxy)
  const tsPoints: TimeseriesPoint[] = Object.values(byDate)
    .filter(d => d.hrv_ms != null)
    .map(d => ({
      user_id:     userId,
      provider:    'whoop',
      metric:      'hrv',
      recorded_at: `${d.date}T06:00:00Z`,
      value:       d.hrv_ms!,
    }));

  if (tsPoints.length > 0) {
    await adminSupabase
      .from('wearable_timeseries')
      .upsert(tsPoints, { onConflict: 'user_id,provider,metric,recorded_at' });
  }

  await adminSupabase
    .from('wearable_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', conn.id);

  console.log(`[sync-wearables] WHOOP synced for ${userId}: ${dailyRecords.length} days`);
}

// ─── Polar AccessLink helpers ─────────────────────────────────────────────────
// Basado en la documentación pública de AccessLink (no validado aún contra un
// payload real — mismo riesgo que Terra en WEARABLES_ACTIVATION.md). Duraciones
// vienen en formato ISO 8601 ("PT7H32M"); se parsean a minutos.
function parseIsoDurationMin(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return undefined;
  const h = Number(m[1] ?? 0), min = Number(m[2] ?? 0), s = Number(m[3] ?? 0);
  return Math.round(h * 60 + min + s / 60);
}

async function fetchPolar(path: string, token: string) {
  const res = await fetch(`https://www.polaraccesslink.com/v3/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error(`Polar API ${path} failed: ${res.status}`);
    return null;
  }
  return res.json();
}

async function syncPolar(userId: string, conn: WearableConnection): Promise<void> {
  const token = await getValidToken(conn);

  const [sleepData, rechargeData] = await Promise.all([
    fetchPolar('users/sleep', token),
    fetchPolar('users/nightly-recharge', token),
  ]);

  const byDate: Record<string, DailyRecord> = {};

  // Sueño
  if (sleepData?.nights) {
    for (const n of sleepData.nights) {
      const d = n.date;
      if (!d) continue;
      byDate[d] = {
        ...byDate[d],
        user_id:            userId,
        provider:           'polar',
        date:               d,
        sleep_score:        n.sleep_score,
        sleep_duration_min: parseIsoDurationMin(n.total_sleep),
        rem_min:            parseIsoDurationMin(n.rem_sleep),
        deep_min:           parseIsoDurationMin(n.deep_sleep),
        light_min:          parseIsoDurationMin(n.light_sleep),
      };
    }
  }

  // Recuperación nocturna (Nightly Recharge) — recovery_score se deja fuera a
  // propósito: ans_charge no es una escala 0-100 comparable a Oura/WHOOP y
  // fabricar esa conversión sería un dato inventado (ver principio de
  // honestidad del proyecto). hrv/FC reposo sí son directamente comparables.
  if (rechargeData?.recharges) {
    for (const r of rechargeData.recharges) {
      const d = r.date;
      if (!d) continue;
      byDate[d] = {
        ...byDate[d],
        user_id:    userId,
        provider:   'polar',
        date:       d,
        hrv_ms:     r.hrv_avg,
        resting_hr: r.heart_rate_avg,
      };
    }
  }

  for (const d of Object.keys(byDate)) {
    byDate[d].raw_payload = {
      sleep:    sleepData?.nights?.find((n: any) => n.date === d),
      recharge: rechargeData?.recharges?.find((r: any) => r.date === d),
    };
  }

  const dailyRecords = Object.values(byDate);
  await mergeDaily(dailyRecords);

  await adminSupabase
    .from('wearable_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', conn.id);

  console.log(`[sync-wearables] Polar synced for ${userId}: ${dailyRecords.length} days`);
}

// ─── Strava helpers ───────────────────────────────────────────────────────────
// Strava es actividad/ejercicio, no sueño/recuperación — no rellena
// recovery_score/hrv_ms/sleep_score (fabricar esos sería el mismo problema de
// honestidad que en Polar). Solo alimenta las columnas de actividad reales.
async function fetchStrava(path: string, token: string, params?: Record<string, string>) {
  const url = new URL(`https://www.strava.com/api/v3/${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error(`Strava API ${path} failed: ${res.status}`);
    return null;
  }
  return res.json();
}

async function syncStrava(userId: string, conn: WearableConnection): Promise<void> {
  const token = await getValidToken(conn);
  const after = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);

  const activities = await fetchStrava('athlete/activities', token, {
    after:    String(after),
    per_page: '100',
  });

  const byDate: Record<string, DailyRecord> = {};
  if (Array.isArray(activities)) {
    for (const a of activities) {
      const d = (a.start_date_local ?? a.start_date ?? '').substring(0, 10);
      if (!d) continue;
      const prev = byDate[d];
      byDate[d] = {
        user_id:         userId,
        provider:        'strava',
        date:            d,
        calories_active: (prev?.calories_active ?? 0) + Math.round(a.kilojoules ? a.kilojoules * 0.239 : 0),
        active_min:      (prev?.active_min ?? 0) + Math.round((a.moving_time ?? 0) / 60),
        raw_payload:      { activities: [...(prev?.raw_payload?.activities ?? []), a] },
      };
    }
  }

  const dailyRecords = Object.values(byDate);
  await mergeDaily(dailyRecords);

  await adminSupabase
    .from('wearable_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', conn.id);

  console.log(`[sync-wearables] Strava synced for ${userId}: ${dailyRecords.length} days`);
}

// ─── Trigger ML recalculation ─────────────────────────────────────────────────
async function triggerIntelligence(userId: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/calculate-intelligence`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId }),
    });
  } catch (e) {
    console.error('[sync-wearables] Failed to trigger intelligence:', e);
  }
}

// ─── Sync single user ─────────────────────────────────────────────────────────
async function syncUser(userId: string, providerFilter?: string): Promise<void> {
  const query = adminSupabase
    .from('wearable_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (providerFilter) query.eq('provider', providerFilter);

  const { data: connections, error } = await query;
  if (error || !connections?.length) {
    console.log(`[sync-wearables] No active connections for ${userId}`);
    return;
  }

  for (const conn of connections as WearableConnection[]) {
    try {
      if (conn.provider === 'oura') {
        await syncOura(userId, conn);
      } else if (conn.provider === 'whoop') {
        await syncWhoop(userId, conn);
      } else if (conn.provider === 'polar') {
        await syncPolar(userId, conn);
      } else if (conn.provider === 'strava') {
        await syncStrava(userId, conn);
      }
    } catch (e) {
      console.error(`[sync-wearables] Error syncing ${conn.provider} for ${userId}:`, e);
    }
  }

  await triggerIntelligence(userId);
}

// ─── OAuth Code Exchange ──────────────────────────────────────────────────────
async function connectOura(userId: string, code: string): Promise<void> {
  const redirectUri = `${Deno.env.get('EXPO_PUBLIC_APP_URL') ?? 'https://growthplayers.vercel.app'}/oauth/oura/callback`;
  const res = await fetch('https://api.ouraring.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     OURA_CLIENT_ID,
      client_secret: OURA_CLIENT_SECRET,
      code,
      redirect_uri:  redirectUri,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Oura token exchange failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;

  // Antes era el shorthand `user_id,` — pero el parámetro se llama `userId` y
  // no existe ningún `user_id` en este ámbito, así que esto lanzaba
  // ReferenceError SIEMPRE: el connect de Oura nunca llegó a guardar nada.
  await adminSupabase.from('wearable_connections').upsert({
    user_id:          userId,
    provider:         'oura',
    access_token:     data.access_token,
    refresh_token:    data.refresh_token ?? '',
    token_expires_at: expiresAt,
    is_active:        true,
    connected_at:     new Date().toISOString(),
    scope:            data.scope ? data.scope.split(' ') : null,
  }, { onConflict: 'user_id,provider' });
}

async function connectWhoop(userId: string, code: string): Promise<void> {
  const redirectUri = `${Deno.env.get('EXPO_PUBLIC_APP_URL') ?? 'https://growthplayers.vercel.app'}/oauth/whoop/callback`;
  const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     WHOOP_CLIENT_ID,
      client_secret: WHOOP_CLIENT_SECRET,
      code,
      redirect_uri:  redirectUri,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`WHOOP token exchange failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;

  // Mismo bug que en connectOura: `user_id` no existía en este ámbito.
  await adminSupabase.from('wearable_connections').upsert({
    user_id:          userId,
    provider:         'whoop',
    access_token:     data.access_token,
    refresh_token:    data.refresh_token ?? '',
    token_expires_at: expiresAt,
    is_active:        true,
    connected_at:     new Date().toISOString(),
    scope:            data.scope ? data.scope.split(' ') : null,
  }, { onConflict: 'user_id,provider' });
}

async function connectPolar(userId: string, code: string): Promise<void> {
  const redirectUri = `${Deno.env.get('EXPO_PUBLIC_APP_URL') ?? 'https://growthplayers.vercel.app'}/oauth/polar/callback`;
  const basicAuth = btoa(`${POLAR_CLIENT_ID}:${POLAR_CLIENT_SECRET}`);
  const res = await fetch('https://polarremote.com/v2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:  `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Polar token exchange failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null;

  await adminSupabase.from('wearable_connections').upsert({
    user_id:          userId,
    provider:         'polar',
    access_token:     data.access_token,
    refresh_token:    data.refresh_token ?? '',
    token_expires_at: expiresAt,
    is_active:        true,
    connected_at:     new Date().toISOString(),
    scope:            data.scope ? data.scope.split(' ') : null,
  }, { onConflict: 'user_id,provider' });

  // Paso extra de Polar (no existe en Oura/WHOOP/Strava): el token no sirve
  // para leer datos hasta registrar el usuario en AccessLink. 409 = ya
  // registrado en una conexión previa — no es un error real.
  const regRes = await fetch('https://www.polaraccesslink.com/v3/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${data.access_token}`,
    },
    body: JSON.stringify({ 'member-id': userId }),
  });
  if (!regRes.ok && regRes.status !== 409) {
    const err = await regRes.text();
    console.error(`[sync-wearables] Polar user registration failed: ${regRes.status} ${err}`);
  }
}

async function connectStrava(userId: string, code: string): Promise<void> {
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Strava token exchange failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  const expiresAt = data.expires_at
    ? new Date(data.expires_at * 1000).toISOString()
    : null;

  await adminSupabase.from('wearable_connections').upsert({
    user_id:          userId,
    provider:         'strava',
    access_token:     data.access_token,
    refresh_token:    data.refresh_token ?? '',
    token_expires_at: expiresAt,
    is_active:        true,
    connected_at:     new Date().toISOString(),
    scope:            null, // Strava no devuelve el scope concedido en el token exchange.
  }, { onConflict: 'user_id,provider' });
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { user_id: bodyUserId, provider, batch, action, code } = body;

    // ── AUTH (SEC-P0) ──────────────────────────────────────────────────────────
    // Resolvemos la identidad UNA vez y la reutilizamos en cada modo:
    //  • service_role (cron / Edge) → puede targetear cualquier user_id y el batch.
    //  • JWT de usuario → forzado a su propio id; nunca puede sincronizar a otro.
    //  • sin auth → 401.
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const isServiceRole = token.length > 0 && token === SERVICE_ROLE_KEY;

    let authedUserId: string | null = null;
    if (token && !isServiceRole) {
      const { data: { user }, error: authErr } = await adminSupabase.auth.getUser(token);
      if (!authErr && user) authedUserId = user.id;
    }

    // ── OAuth connect action ───────────────────────────────────────────────────
    if (action === 'connect') {
      if (!provider || !code) return json({ error: 'Missing provider or code' }, 400);
      if (!authedUserId) return json({ error: 'Unauthorized' }, 401);

      if (provider === 'oura') {
        await connectOura(authedUserId, code);
      } else if (provider === 'whoop') {
        await connectWhoop(authedUserId, code);
      } else if (provider === 'polar') {
        await connectPolar(authedUserId, code);
      } else if (provider === 'strava') {
        await connectStrava(authedUserId, code);
      } else {
        return json({ error: 'Unknown provider' }, 400);
      }

      // Kick off initial sync
      await syncUser(authedUserId, provider);
      return json({ ok: true, provider });
    }

    // Batch mode: sync all active connections — SOLO service_role (cron diario).
    if (batch === 'all') {
      if (!isServiceRole) return json({ error: 'Unauthorized' }, 401);
      const { data: connections } = await adminSupabase
        .from('wearable_connections')
        .select('user_id, provider')
        .eq('is_active', true);

      if (!connections?.length) {
        return json({ ok: true, processed: 0 });
      }

      // Group by user
      const userMap: Record<string, string[]> = {};
      for (const c of connections as any[]) {
        if (!userMap[c.user_id]) userMap[c.user_id] = [];
        userMap[c.user_id].push(c.provider);
      }

      const userIds = Object.keys(userMap);
      // Process in batches of 5 concurrent users
      for (let i = 0; i < userIds.length; i += 5) {
        const chunk = userIds.slice(i, i + 5);
        await Promise.all(chunk.map(uid => syncUser(uid)));
      }

      return json({ ok: true, processed: userIds.length });
    }

    // Single user mode.
    //  • service_role puede targetear el user_id del body (uso servidor-a-servidor).
    //  • un JWT de usuario queda forzado a su propio id; se ignora cualquier body.user_id.
    if (isServiceRole && bodyUserId) {
      await syncUser(bodyUserId, provider);
      return json({ ok: true, user_id: bodyUserId, provider: provider ?? 'all' });
    }
    if (authedUserId) {
      await syncUser(authedUserId, provider);
      return json({ ok: true, user_id: authedUserId, provider: provider ?? 'all' });
    }
    // Se pidió sincronizar pero sin auth válida que respalde la identidad.
    if (bodyUserId) return json({ error: 'Unauthorized' }, 401);

    return json({ error: 'Missing user_id or batch' }, 400);

  } catch (err: any) {
    console.error('[sync-wearables]', err);
    return json({ error: err.message }, 500);
  }
});
