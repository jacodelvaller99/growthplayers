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
const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── Types ────────────────────────────────────────────────────────────────────
interface WearableConnection {
  id: string;
  user_id: string;
  provider: 'oura' | 'whoop';
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

async function getValidToken(conn: WearableConnection): Promise<string> {
  if (conn.token_expires_at) {
    const expiresAt = new Date(conn.token_expires_at).getTime();
    const oneHourMs = 60 * 60 * 1000;
    if (expiresAt < Date.now() + oneHourMs) {
      return conn.provider === 'oura'
        ? refreshOuraToken(conn)
        : refreshWhoopToken(conn);
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

  // Upsert daily records
  const dailyRecords = Object.values(byDate);
  if (dailyRecords.length > 0) {
    await adminSupabase
      .from('wearable_daily')
      .upsert(dailyRecords, { onConflict: 'user_id,provider,date' });
  }

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
async function fetchWhoop(path: string, token: string, params?: Record<string, string>) {
  const url = new URL(`https://api.prod.whoop.com/developer/v1/${path}`);
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
        sleep_duration_min: s.score?.total_in_bed_time_milli
          ? Math.round(s.score.total_in_bed_time_milli / 60000) : undefined,
        sleep_efficiency:  s.score?.sleep_efficiency_percentage,
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
        active_min:      c.score?.average_heart_rate ? undefined : undefined,
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
  if (dailyRecords.length > 0) {
    await adminSupabase
      .from('wearable_daily')
      .upsert(dailyRecords, { onConflict: 'user_id,provider,date' });
  }

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

  await adminSupabase.from('wearable_connections').upsert({
    user_id,
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

  await adminSupabase.from('wearable_connections').upsert({
    user_id,
    provider:         'whoop',
    access_token:     data.access_token,
    refresh_token:    data.refresh_token ?? '',
    token_expires_at: expiresAt,
    is_active:        true,
    connected_at:     new Date().toISOString(),
    scope:            data.scope ? data.scope.split(' ') : null,
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
