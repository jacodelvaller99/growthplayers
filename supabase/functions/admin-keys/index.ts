/**
 * admin-keys — ver, cambiar y probar las claves del servidor desde el admin.
 *
 * Solo is_admin. Las claves nuevas se guardan cifradas en Vault (`app:NOMBRE`)
 * y tienen prioridad sobre los secrets de Supabase (ver _shared/appKeys.ts);
 * las funciones las toman en ≤30 s. NUNCA devuelve una clave completa: solo
 * los últimos 4 caracteres.
 *
 * POST { action: 'list' }                      → { keys: KeyRow[] }
 * POST { action: 'set',  name, value }         → { ok: true }
 * POST { action: 'test', name }                → { ok: boolean, detail }
 */
import { adminSupabase, json, corsHeaders } from '../_shared/supabase.ts';

// Catálogo: solo claves que alguna función lee de verdad.
const CATALOG: { name: string; label: string; group: string; usedBy: string }[] = [
  { name: 'ANTHROPIC_API_KEY',   label: 'Anthropic (Claude)',      group: 'Inteligencia artificial', usedBy: 'Norman, copiloto e internista' },
  { name: 'OPENAI_API_KEY',      label: 'OpenAI',                  group: 'Inteligencia artificial', usedBy: 'Transcripción de voz y memoria de Norman' },
  { name: 'RESEND_API_KEY',      label: 'Resend',                  group: 'Correo',                  usedBy: 'Avisos de Las 7 Llaves' },
  { name: 'WHOOP_CLIENT_ID',     label: 'WHOOP · Client ID',       group: 'Relojes',                 usedBy: 'Conexión con WHOOP' },
  { name: 'WHOOP_CLIENT_SECRET', label: 'WHOOP · Client Secret',   group: 'Relojes',                 usedBy: 'Conexión con WHOOP' },
  { name: 'OURA_CLIENT_ID',      label: 'Oura · Client ID',        group: 'Relojes',                 usedBy: 'Conexión con Oura' },
  { name: 'OURA_CLIENT_SECRET',  label: 'Oura · Client Secret',    group: 'Relojes',                 usedBy: 'Conexión con Oura' },
  { name: 'POLAR_CLIENT_ID',     label: 'Polar · Client ID',       group: 'Relojes',                 usedBy: 'Conexión con Polar' },
  { name: 'POLAR_CLIENT_SECRET', label: 'Polar · Client Secret',   group: 'Relojes',                 usedBy: 'Conexión con Polar' },
  { name: 'STRAVA_CLIENT_ID',    label: 'Strava · Client ID',      group: 'Relojes',                 usedBy: 'Conexión con Strava' },
  { name: 'STRAVA_CLIENT_SECRET',label: 'Strava · Client Secret',  group: 'Relojes',                 usedBy: 'Conexión con Strava' },
];
const NAMES = CATALOG.map((k) => k.name);

const tail = (v: string) => (v.length > 8 ? `…${v.slice(-4)}` : '••••');

async function panelValues(): Promise<Map<string, { value: string; updated_at: string }>> {
  const { data, error } = await adminSupabase.rpc('app_keys_read', { p_names: NAMES });
  if (error) throw new Error(`Vault: ${error.message}`);
  return new Map((data ?? []).map((r: { name: string; value: string; updated_at: string }) => [r.name, r]));
}

/** Llamada mínima de solo lectura al proveedor para saber si la clave sirve. */
async function testKey(name: string, key: string): Promise<{ ok: boolean; detail: string }> {
  const probe: Record<string, () => Promise<Response>> = {
    ANTHROPIC_API_KEY: () => fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    }),
    OPENAI_API_KEY: () => fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${key}` } }),
    RESEND_API_KEY: () => fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${key}` } }),
  };
  const run = probe[name];
  if (!run) return { ok: true, detail: 'Esta clave no se puede probar sola; se valida al conectar el reloj.' };
  try {
    const res = await run();
    if (res.ok) return { ok: true, detail: 'Funciona.' };
    if (res.status === 401 || res.status === 403) return { ok: false, detail: 'El proveedor rechazó la clave (no es válida o no tiene permisos).' };
    return { ok: false, detail: `El proveedor respondió ${res.status}.` };
  } catch (e) {
    return { ok: false, detail: `No se pudo contactar al proveedor: ${e instanceof Error ? e.message : e}` };
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') ?? undefined;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);

  // ── Solo admin ────────────────────────────────────────────────────────────
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Unauthorized' }, 401, origin);
  const { data: caller, error: authError } = await adminSupabase.auth.getUser(token);
  if (authError || !caller.user) return json({ error: 'Unauthorized' }, 401, origin);
  const { data: profile } = await adminSupabase.from('profiles').select('is_admin').eq('id', caller.user.id).single();
  if (profile?.is_admin !== true) return json({ error: 'Forbidden — admin only' }, 403, origin);

  let body: { action?: string; name?: string; value?: string };
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400, origin); }

  try {
    if (body.action === 'list') {
      const panel = await panelValues();
      const keys = CATALOG.map((k) => {
        const p = panel.get(k.name);
        const env = Deno.env.get(k.name) ?? '';
        const source = p?.value ? 'panel' : env ? 'supabase' : 'none';
        return {
          ...k,
          source,
          last4: p?.value ? tail(p.value) : env ? tail(env) : null,
          updatedAt: p?.updated_at ?? null,
        };
      });
      return json({ keys }, 200, origin);
    }

    const name = body.name ?? '';
    if (!NAMES.includes(name)) return json({ error: 'Clave desconocida' }, 400, origin);

    if (body.action === 'set') {
      const value = (body.value ?? '').trim();
      if (value.length < 8 || value.length > 1000 || /\s/.test(value)) {
        return json({ error: 'La clave debe tener entre 8 y 1000 caracteres y sin espacios.' }, 400, origin);
      }
      const { error } = await adminSupabase.rpc('app_keys_write', { p_name: name, p_value: value });
      if (error) throw new Error(`Vault: ${error.message}`);
      console.log(`[admin-keys] ${caller.user.id} actualizó ${name}`);
      return json({ ok: true }, 200, origin);
    }

    if (body.action === 'test') {
      const panel = await panelValues();
      const key = panel.get(name)?.value || Deno.env.get(name) || '';
      if (!key) return json({ ok: false, detail: 'No hay clave guardada.' }, 200, origin);
      return json(await testKey(name, key), 200, origin);
    }

    return json({ error: 'Acción desconocida' }, 400, origin);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin-keys]', msg);
    return json({ error: msg }, 500, origin);
  }
});
