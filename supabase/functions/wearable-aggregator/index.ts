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

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });

  // ── Modo CONNECT (app autenticada pide la widget URL) ───────────────────────
  // Lo distinguimos por header de auth JWT + ausencia de firma Terra.
  const terraSig = req.headers.get('terra-signature');
  if (!terraSig) {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error } = await adminSupabase.auth.getUser(token);
    if (error || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    if (body.action === 'connect') {
      const result = await generateWidgetSession(user.id);
      return 'error' in result ? json(result, 502) : json({ ok: true, url: result.url });
    }
    return json({ error: 'Missing action' }, 400);
  }

  // ── Modo WEBHOOK (Terra empuja datos) ───────────────────────────────────────
  const rawBody = await req.text();
  const valid = await verifyTerraSignature(rawBody, terraSig);
  if (!valid) {
    console.error('[wearable-aggregator] firma inválida — rechazado.');
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
      await adminSupabase.from('wearable_daily').upsert(rows, { onConflict: 'user_id,provider,date' });
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
