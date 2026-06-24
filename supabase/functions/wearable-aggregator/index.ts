/**
 * wearable-aggregator — Supabase Edge Function (Cluster D).
 *
 * Recibe datos de un AGREGADOR UNIVERSAL (Terra por defecto) que conecta CUALQUIER
 * reloj (Garmin, Polar, Coros, Suunto, Fitbit, Samsung, Withings, Apple, Google
 * Fit, WHOOP, Oura, …) y los normaliza a `wearable_daily` (provider='aggregator').
 * Funciona en web/PWA — no exige build nativo.
 *
 * Dos modos:
 *   1. WEBHOOK (Terra → nosotros): POST con header `terra-signature`. Verifica
 *      firma HMAC, deduplica, normaliza y hace upsert. Maneja eventos `auth`
 *      (vincula aggregator_user_id ↔ nuestro user_id vía reference_id) y de datos.
 *   2. CONNECT (app → nosotros): POST con JWT + { action:'connect' }. Genera una
 *      widget session de Terra (requiere API key server-side) y devuelve la URL.
 *
 * Variables de entorno (handoff del dueño):
 *   TERRA_DEV_ID, TERRA_API_KEY, TERRA_SIGNING_SECRET
 *
 * El normalizador refleja `lib/wearableAggregatorLogic.ts` (testeado). Se inlinea
 * en Deno por el mismo patrón que sync-wearables (no compartimos módulos cliente).
 */

// deno-lint-ignore-file no-explicit-any
import { adminSupabase, json, corsHeaders } from '../_shared/supabase.ts';

const TERRA_DEV_ID         = Deno.env.get('TERRA_DEV_ID') ?? '';
const TERRA_API_KEY        = Deno.env.get('TERRA_API_KEY') ?? '';
const TERRA_SIGNING_SECRET = Deno.env.get('TERRA_SIGNING_SECRET') ?? '';
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL              = Deno.env.get('EXPO_PUBLIC_APP_URL') ?? 'https://growthplayers.vercel.app';

// Vendor del agregador. Default 'terra'. Para self-host OSS: 'open_wearables'.
const AGGREGATOR_VENDOR    = (Deno.env.get('AGGREGATOR_VENDOR') ?? 'terra').toLowerCase();
// Open Wearables (OSS self-host) — instancia propia del dueño.
const OW_BASE_URL          = (Deno.env.get('OPEN_WEARABLES_BASE_URL') ?? '').replace(/\/+$/, '');
const OW_API_KEY           = Deno.env.get('OPEN_WEARABLES_API_KEY') ?? '';
const OW_WEBHOOK_SECRET    = Deno.env.get('OPEN_WEARABLES_WEBHOOK_SECRET') ?? '';

// ─── Firma del webhook (Terra: HMAC-SHA256 de `${t}.${body}`) ─────────────────
async function verifyTerraSignature(rawBody: string, header: string | null): Promise<boolean> {
  if (!TERRA_SIGNING_SECRET) {
    // Sin secret configurado: rechazamos en prod (fail-closed). Sin secret no hay
    // forma de confiar en el origen.
    console.error('[wearable-aggregator] TERRA_SIGNING_SECRET no configurado — rechazando.');
    return false;
  }
  if (!header) return false;
  // header: "t=1700000000,v1=abcdef..."
  const parts = Object.fromEntries(
    header.split(',').map((kv) => {
      const [k, v] = kv.split('=');
      return [k?.trim(), v?.trim()];
    }),
  );
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(TERRA_SIGNING_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${rawBody}`));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  // comparación en tiempo constante
  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

// ─── Firma del webhook de Open Wearables (Svix) ───────────────────────────────
// Svix firma HMAC-SHA256 base64 sobre `${svix-id}.${svix-timestamp}.${body}`. El
// secret viene como `whsec_<base64>`; se decodifica la parte base64 como clave.
// Headers: svix-id, svix-timestamp (epoch s, tolerancia 5 min), svix-signature
// ("v1,<base64> v1,<base64> …"). Fail-closed sin secret.
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
// Comparación en tiempo constante (evita timing-oracle sobre un MAC).
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function verifyOpenWearablesSignature(
  rawBody: string, id: string | null, ts: string | null, sigHeader: string | null,
): Promise<boolean> {
  if (!OW_WEBHOOK_SECRET) {
    console.error('[wearable-aggregator] OPEN_WEARABLES_WEBHOOK_SECRET no configurado — rechazando.');
    return false;
  }
  if (!id || !ts || !sigHeader) return false;
  const tsNum = Number(ts);
  // anti-replay 5 min; rechaza también un timestamp no numérico (fail-closed).
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) return false;

  const secretB64 = OW_WEBHOOK_SECRET.replace(/^whsec_/, '');
  const key = await crypto.subtle.importKey(
    'raw', base64ToBytes(secretB64), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${rawBody}`));
  const expected = bytesToBase64(new Uint8Array(sigBuf));
  // svix-signature: lista separada por espacios de "v1,<base64>".
  const provided = sigHeader.split(' ').map((p) => p.split(',')[1]).filter(Boolean);
  return provided.some((p) => timingSafeEqual(p, expected));
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Normalizador inline (refleja lib/wearableAggregatorLogic.ts) ─────────────
const num = (v: any): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const round = (v: number | null): number | null => (v === null ? null : Math.round(v));
const secToMin = (v: any): number | null => { const s = num(v); return s === null ? null : Math.round(s / 60); };
const isoToDate = (v: any): string | null => {
  if (typeof v !== 'string') return null;
  const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
};

interface DailyRow {
  user_id: string; provider: 'aggregator'; source_device: string | null; date: string;
  sleep_score: number | null; sleep_duration_min: number | null; sleep_efficiency: number | null;
  rem_min: number | null; deep_min: number | null; light_min: number | null; awake_min: number | null;
  recovery_score: number | null; hrv_ms: number | null; resting_hr: number | null;
  respiratory_rate: number | null; spo2_avg: number | null; body_temp_delta: number | null;
  activity_score: number | null; strain_score: number | null; calories_active: number | null;
  steps: number | null; active_min: number | null; stress_score: number | null;
}

function emptyRow(userId: string, device: string | null, date: string): DailyRow {
  return {
    user_id: userId, provider: 'aggregator', source_device: device, date,
    sleep_score: null, sleep_duration_min: null, sleep_efficiency: null,
    rem_min: null, deep_min: null, light_min: null, awake_min: null,
    recovery_score: null, hrv_ms: null, resting_hr: null,
    respiratory_rate: null, spo2_avg: null, body_temp_delta: null,
    activity_score: null, strain_score: null, calories_active: null,
    steps: null, active_min: null, stress_score: null,
  };
}

function normalizeTerra(payload: any, userId: string): DailyRow[] {
  const type = String(payload?.type ?? '').toLowerCase();
  const device = payload?.user?.provider ? String(payload.user.provider).toUpperCase() : null;
  const records: any[] = Array.isArray(payload?.data) ? payload.data : [];
  const byDate: Record<string, DailyRow> = {};

  const set = (date: string, patch: Partial<DailyRow>) => {
    const row = byDate[date] ?? emptyRow(userId, device, date);
    for (const [k, v] of Object.entries(patch)) {
      if (v !== null && v !== undefined) (row as any)[k] = v;
    }
    byDate[date] = row;
  };

  for (const rec of records) {
    const date = isoToDate(rec?.metadata?.start_time ?? rec?.metadata?.end_time ?? rec?.metadata?.date);
    if (!date) continue;
    if (type === 'sleep') {
      const sd = rec?.sleep_durations_data ?? {};
      const asleep = sd?.asleep ?? {};
      const hr = rec?.heart_rate_data?.summary ?? {};
      set(date, {
        sleep_duration_min: secToMin(asleep?.duration_asleep_state_seconds),
        rem_min: secToMin(asleep?.duration_REM_sleep_state_seconds),
        deep_min: secToMin(asleep?.duration_deep_sleep_state_seconds),
        light_min: secToMin(asleep?.duration_light_sleep_state_seconds),
        awake_min: secToMin(sd?.awake?.duration_awake_state_seconds),
        sleep_efficiency: num(sd?.sleep_efficiency) !== null ? round((sd.sleep_efficiency as number) * 100) : null,
        hrv_ms: round(num(hr?.avg_hrv_rmssd)),
        resting_hr: round(num(hr?.resting_hr_bpm)),
        respiratory_rate: num(rec?.respiration_data?.breaths_data?.avg_breaths_per_min),
        spo2_avg: round(num(rec?.respiration_data?.oxygen_saturation_data?.avg_saturation_percentage)),
        body_temp_delta: num(rec?.temperature_data?.delta),
        recovery_score: round(num(rec?.readiness_data?.readiness)),
        sleep_score: round(num(rec?.sleep_score) ?? num(rec?.scores?.sleep)),
      });
    } else if (type === 'daily') {
      const hr = rec?.heart_rate_data?.summary ?? {};
      set(date, {
        recovery_score: round(num(rec?.scores?.recovery)),
        activity_score: round(num(rec?.scores?.activity)),
        resting_hr: round(num(hr?.resting_hr_bpm)),
        hrv_ms: round(num(hr?.avg_hrv_rmssd)),
        spo2_avg: round(num(rec?.oxygen_data?.avg_saturation_percentage)),
        steps: round(num(rec?.distance_data?.steps) ?? num(rec?.distance_data?.summary?.steps)),
        calories_active: round(num(rec?.calories_data?.net_activity_calories) ?? num(rec?.calories_data?.total_burned_calories)),
        active_min: secToMin(rec?.active_durations_data?.activity_seconds),
        stress_score: round(num(rec?.stress_data?.avg_stress_level)),
      });
    } else if (type === 'activity') {
      set(date, {
        strain_score: num(rec?.strain_data?.strain_level),
        calories_active: round(num(rec?.calories_data?.net_activity_calories) ?? num(rec?.calories_data?.total_burned_calories)),
        active_min: secToMin(rec?.active_durations_data?.activity_seconds),
        steps: round(num(rec?.distance_data?.steps)),
      });
    } else if (type === 'body') {
      const hr = rec?.heart_rate_data?.summary ?? {};
      set(date, {
        hrv_ms: round(num(hr?.avg_hrv_rmssd)),
        resting_hr: round(num(hr?.resting_hr_bpm)),
        spo2_avg: round(num(rec?.oxygen_data?.avg_saturation_percentage)),
        body_temp_delta: num(rec?.temperature_data?.delta),
      });
    }
  }
  return Object.values(byDate);
}

// ─── Normalizador inline de Open Wearables (refleja openWearablesToDaily) ──────
// Envelope { type:'resource.action', data:{...} }. Un evento por webhook → 0..1 fila.
function normalizeOpenWearables(payload: any, userId: string): DailyRow[] {
  const type = String(payload?.type ?? '').toLowerCase();
  const d = payload?.data ?? {};
  const device = d?.provider ? String(d.provider).toUpperCase() : null;
  const date = isoToDate(d?.calendar_date ?? d?.date ?? d?.start_time ?? d?.end_time);
  if (!date) return [];
  const samples: any[] = Array.isArray(d?.samples) ? d.samples : [];
  const avg = (xs: any[]): number | null => {
    const v = xs.map((s) => num(s?.value ?? s)).filter((x: any): x is number => x !== null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const sum = (xs: any[]): number | null => {
    const v = xs.map((s) => num(s?.value ?? s)).filter((x: any): x is number => x !== null);
    return v.length ? v.reduce((a, b) => a + b, 0) : null;
  };

  const row = emptyRow(userId, device, date);
  if (type === 'sleep.created') {
    if (d?.is_nap === true) return [];
    row.sleep_duration_min = round(num(d?.sleep_total_duration_minutes));
    row.sleep_efficiency   = round(num(d?.sleep_efficiency_score));
    row.deep_min  = round(num(d?.sleep_deep_minutes));
    row.rem_min   = round(num(d?.sleep_rem_minutes));
    row.light_min = round(num(d?.sleep_light_minutes));
    row.awake_min = round(num(d?.sleep_awake_minutes));
  } else if (type === 'activity.created' || type === 'workout.created') {
    row.steps           = round(num(d?.steps_count));
    row.calories_active = round(num(d?.energy_burned));
    row.active_min      = secToMin(d?.moving_time_seconds);
  } else if (type === 'heart_rate_variability.created') {
    row.hrv_ms = round(avg(samples));
  } else if (type === 'spo2.created') {
    row.spo2_avg = round(avg(samples));
  } else if (type === 'respiratory_rate.created') {
    row.respiratory_rate = avg(samples);
  } else if (type === 'steps.created') {
    row.steps = round(sum(samples));
  } else if (type === 'calories.created') {
    row.calories_active = round(sum(samples));
  } else {
    return [];
  }
  return [row];
}

// ─── Resuelve nuestro user_id desde el aggregator_user_id ─────────────────────
async function resolveUserId(aggregatorUserId: string | null): Promise<string | null> {
  if (!aggregatorUserId) return null;
  const { data } = await adminSupabase
    .from('wearable_connections')
    .select('user_id')
    .eq('aggregator_user_id', aggregatorUserId)
    .eq('is_active', true)
    .maybeSingle();
  return (data as { user_id?: string } | null)?.user_id ?? null;
}

async function triggerIntelligence(userId: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/calculate-intelligence`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
  } catch (e) { console.error('[wearable-aggregator] intelligence trigger:', e); }
}

// ─── Upsert por-columna race-free (RPC merge_wearable_daily) ───────────────────
// El agregador manda cada métrica en su propio webhook; un upsert que reemplaza la
// fila borraría los campos de eventos anteriores del mismo día, y un read-modify-
// write en JS tendría una race con eventos concurrentes. El merge atómico en DB
// (migración 20260625000000: INSERT … ON CONFLICT DO UPDATE con COALESCE bajo
// row-lock) conserva los non-null sin race. Lo usan ambos vendors.
async function mergeDailyRows(rows: DailyRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await adminSupabase.rpc('merge_wearable_daily', { p_rows: rows });
  if (error) throw new Error(error.message ?? 'merge_wearable_daily failed');
}

// ─── CONNECT: genera widget session de Terra ──────────────────────────────────
async function generateWidgetSession(userId: string): Promise<{ url: string } | { error: string }> {
  if (!TERRA_DEV_ID || !TERRA_API_KEY) {
    return { error: 'Agregador no configurado (faltan TERRA_DEV_ID / TERRA_API_KEY).' };
  }
  try {
    const res = await fetch('https://api.tryterra.co/v2/auth/generateWidgetSession', {
      method: 'POST',
      headers: { 'dev-id': TERRA_DEV_ID, 'x-api-key': TERRA_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference_id: userId,           // Terra nos lo devuelve en el evento auth
        providers: 'GARMIN,FITBIT,OURA,WHOOP,COROS,POLAR,SUUNTO,WITHINGS,SAMSUNG,GOOGLE,PELOTON',
        language: 'es',
        auth_success_redirect_url: `${APP_URL}/perfil/wearables?connected=aggregator`,
        auth_failure_redirect_url: `${APP_URL}/perfil/wearables?error=aggregator_failed`,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('[wearable-aggregator] widget session failed:', res.status, txt);
      return { error: 'No se pudo iniciar la conexión con el agregador.' };
    }
    const data = await res.json();
    return { url: data.url as string };
  } catch (e) {
    console.error('[wearable-aggregator] widget session error:', e);
    return { error: 'Error de red al conectar el agregador.' };
  }
}

// ─── CONNECT: URL de autorización de Open Wearables (OAuth por proveedor) ──────
// Open Wearables no tiene widget multi-proveedor hosteado (roadmap); el connect es
// OAuth por marca: GET /api/v1/oauth/{provider}/authorize?user_id=<nuestro userId>.
// El user_id que pasamos vuelve en los webhooks (data.user_id) → correlación directa.
async function generateOpenWearablesAuthUrl(
  userId: string, provider: string | null,
): Promise<{ url: string } | { error: string }> {
  if (!OW_BASE_URL || !OW_API_KEY) {
    return { error: 'Agregador self-host sin configurar (faltan OPEN_WEARABLES_BASE_URL / OPEN_WEARABLES_API_KEY).' };
  }
  if (!provider) {
    return { error: 'Elige una marca para conectar (provider requerido en modo self-host).' };
  }
  try {
    const res = await fetch(
      `${OW_BASE_URL}/api/v1/oauth/${encodeURIComponent(provider)}/authorize?user_id=${encodeURIComponent(userId)}`,
      { method: 'GET', headers: { 'X-Open-Wearables-API-Key': OW_API_KEY, 'Content-Type': 'application/json' } },
    );
    if (!res.ok) {
      const txt = await res.text();
      console.error('[wearable-aggregator] OW authorize failed:', res.status, txt);
      return { error: 'No se pudo iniciar la conexión con el agregador self-host.' };
    }
    const data = await res.json();
    const url = data?.authorization_url ?? data?.url ?? data?.redirect_url;
    if (!url) return { error: 'El agregador self-host no devolvió URL de autorización.' };
    return { url: String(url) };
  } catch (e) {
    console.error('[wearable-aggregator] OW authorize error:', e);
    return { error: 'Error de red al conectar el agregador self-host.' };
  }
}

// ─── WEBHOOK Open Wearables: verifica firma Svix, normaliza, upsert mergeado ───
async function handleOpenWearablesWebhook(req: Request): Promise<Response> {
  // Guard: un webhook Svix solo tiene sentido si el deploy está en modo Open Wearables.
  // Fallar fuerte ante una mala configuración en vez de procesar en silencio.
  if (AGGREGATOR_VENDOR !== 'open_wearables') {
    console.error('[wearable-aggregator] webhook Svix recibido pero AGGREGATOR_VENDOR != open_wearables.');
    return json({ error: 'vendor mismatch' }, 400);
  }
  const svixId  = req.headers.get('svix-id');
  const svixTs  = req.headers.get('svix-timestamp');
  const svixSig = req.headers.get('svix-signature');
  const rawBody = await req.text();

  const valid = await verifyOpenWearablesSignature(rawBody, svixId, svixTs, svixSig);
  if (!valid) {
    console.error('[wearable-aggregator] firma Svix inválida — rechazado.');
    return json({ error: 'Invalid signature' }, 401);
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch { return json({ error: 'Bad JSON' }, 400); }

  const type = String(payload?.type ?? '').toLowerCase();
  const d = payload?.data ?? {};
  const owUserId = d?.user_id ?? null; // = nuestro user_id (lo pasamos en authorize)
  const device = d?.provider ? String(d.provider).toUpperCase() : null;
  const eventId = svixId ?? await sha256Hex(rawBody);

  // Conexión: vincula / desvincula.
  if (type === 'connection.created') {
    if (owUserId) {
      await adminSupabase.from('wearable_connections').upsert({
        user_id: owUserId, provider: 'aggregator', aggregator_user_id: owUserId,
        source_device: device, is_active: true, connected_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' });
    }
    await adminSupabase.from('wearable_webhook_events').upsert(
      { event_id: eventId, event_type: type, aggregator_user_id: owUserId, user_id: owUserId, payload, processed: true },
      { onConflict: 'event_id', ignoreDuplicates: true },
    );
    return json({ ok: true, linked: !!owUserId });
  }
  if (type === 'connection.revoked') {
    if (owUserId) {
      await adminSupabase.from('wearable_connections').update({ is_active: false })
        .eq('user_id', owUserId).eq('provider', 'aggregator');
    }
    return json({ ok: true });
  }

  // Validación de identidad: resolvemos NUESTRO user vía la conexión activa creada
  // en connection.created (a partir del id que pasamos en authorize). NO confiamos
  // en data.user_id crudo para escribir biométricos — evita cruce entre usuarios.
  const userId = await resolveUserId(owUserId);

  // Dedup por svix-id.
  const { data: inserted } = await adminSupabase.from('wearable_webhook_events').upsert(
    { event_id: eventId, event_type: type, aggregator_user_id: owUserId, user_id: userId, payload, processed: false },
    { onConflict: 'event_id', ignoreDuplicates: true },
  ).select('id');
  if (!inserted || (Array.isArray(inserted) && inserted.length === 0)) {
    return json({ ok: true, deduped: true });
  }
  if (!userId) {
    await adminSupabase.from('wearable_webhook_events')
      .update({ process_error: 'user_not_resolved' }).eq('event_id', eventId);
    return json({ ok: true, skipped: 'user_not_resolved' });
  }

  try {
    const rows = normalizeOpenWearables(payload, userId);
    if (rows.length > 0) {
      await mergeDailyRows(rows);
      await adminSupabase.from('wearable_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('user_id', userId).eq('provider', 'aggregator');
      await triggerIntelligence(userId);
    }
    await adminSupabase.from('wearable_webhook_events')
      .update({ processed: true }).eq('event_id', eventId);
    return json({ ok: true, rows: rows.length });
  } catch (e) {
    console.error('[wearable-aggregator] OW process error:', e);
    await adminSupabase.from('wearable_webhook_events')
      .update({ process_error: String((e as Error)?.message ?? e) }).eq('event_id', eventId);
    return json({ error: 'process_failed' }, 500);
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });

  const terraSig = req.headers.get('terra-signature');
  const svixSig  = req.headers.get('svix-signature'); // Open Wearables (Svix)

  // ── Modo CONNECT (app autenticada pide la URL de conexión) ──────────────────
  // Sin firma de webhook (ni Terra ni Svix) → es la app pidiendo conectar.
  if (!terraSig && !svixSig) {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error } = await adminSupabase.auth.getUser(token);
    if (error || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    if (body.action === 'connect') {
      const result = AGGREGATOR_VENDOR === 'open_wearables'
        ? await generateOpenWearablesAuthUrl(user.id, body.provider ?? null)
        : await generateWidgetSession(user.id);
      return 'error' in result ? json(result, 502) : json({ ok: true, url: result.url });
    }
    return json({ error: 'Missing action' }, 400);
  }

  // ── Modo WEBHOOK Open Wearables (Svix) ──────────────────────────────────────
  if (svixSig) return await handleOpenWearablesWebhook(req);

  // ── Modo WEBHOOK Terra ──────────────────────────────────────────────────────
  const rawBody = await req.text();
  const valid = await verifyTerraSignature(rawBody, terraSig);
  if (!valid) {
    console.error('[wearable-aggregator] firma Terra inválida — rechazado.');
    return json({ error: 'Invalid signature' }, 401);
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch { return json({ error: 'Bad JSON' }, 400); }

  const type = String(payload?.type ?? '').toLowerCase();
  const aggregatorUserId = payload?.user?.user_id ?? null;
  const referenceId = payload?.user?.reference_id ?? null;

  // Idempotencia: event_id = hash del body. Reentrega idéntica = no-op.
  const eventId = await sha256Hex(rawBody);

  // ── Evento auth: vincula aggregator_user_id ↔ nuestro user (reference_id) ────
  if (type === 'auth') {
    if (referenceId && aggregatorUserId) {
      await adminSupabase.from('wearable_connections').upsert({
        user_id: referenceId,
        provider: 'aggregator',
        aggregator_user_id: aggregatorUserId,
        source_device: payload?.user?.provider ? String(payload.user.provider).toUpperCase() : null,
        is_active: true,
        connected_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' });
    }
    await adminSupabase.from('wearable_webhook_events').upsert(
      { event_id: eventId, event_type: 'auth', aggregator_user_id: aggregatorUserId, user_id: referenceId, payload, processed: true },
      { onConflict: 'event_id', ignoreDuplicates: true },
    );
    return json({ ok: true, linked: !!referenceId });
  }

  if (type === 'deauth') {
    if (aggregatorUserId) {
      await adminSupabase.from('wearable_connections')
        .update({ is_active: false })
        .eq('aggregator_user_id', aggregatorUserId);
    }
    return json({ ok: true });
  }

  // ── Eventos de datos ────────────────────────────────────────────────────────
  // reference_id puede venir en el payload; si no, lo resolvemos por la conexión.
  const userId = referenceId ?? (await resolveUserId(aggregatorUserId));

  // Registrar el evento (dedup). Si ya existe → ignoreDuplicates corta el reproceso.
  const { data: inserted } = await adminSupabase.from('wearable_webhook_events').upsert(
    { event_id: eventId, event_type: type, aggregator_user_id: aggregatorUserId, user_id: userId, payload, processed: false },
    { onConflict: 'event_id', ignoreDuplicates: true },
  ).select('id');

  // Reentrega ya vista (no insertó nada) → no reprocesar.
  if (!inserted || (Array.isArray(inserted) && inserted.length === 0)) {
    return json({ ok: true, deduped: true });
  }

  if (!userId) {
    await adminSupabase.from('wearable_webhook_events')
      .update({ process_error: 'user_not_resolved' }).eq('event_id', eventId);
    return json({ ok: true, skipped: 'user_not_resolved' });
  }

  try {
    const rows = normalizeTerra(payload, userId);
    if (rows.length > 0) {
      await mergeDailyRows(rows);
      await adminSupabase.from('wearable_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('aggregator_user_id', aggregatorUserId);
      await triggerIntelligence(userId);
    }
    await adminSupabase.from('wearable_webhook_events')
      .update({ processed: true }).eq('event_id', eventId);
    return json({ ok: true, rows: rows.length });
  } catch (e) {
    console.error('[wearable-aggregator] process error:', e);
    await adminSupabase.from('wearable_webhook_events')
      .update({ process_error: String((e as Error)?.message ?? e) }).eq('event_id', eventId);
    return json({ error: 'process_failed' }, 500);
  }
});
