/**
 * create-user — Supabase Edge Function
 *
 * Crea un usuario real (auth) DESDE el admin. A diferencia de la mayoría de las
 * acciones admin (anon key + RLS), crear un usuario auth requiere service-role,
 * así que vive en una edge function.
 *
 * SEGURIDAD: el caller DEBE ser admin. Verificamos su JWT y `profiles.is_admin`
 * antes de crear nada — si no, 403. (Sin este gate, cualquier usuario autenticado
 * podría crear cuentas.)
 *
 * Body: { email, password, name? }  ·  Devuelve: { ok, userId } | { error }
 * El trigger `handle_new_user()` crea la fila `user_profiles`; reforzamos el name.
 */
import { adminSupabase, json, corsHeaders } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  // ── Auth: el caller debe tener un JWT válido ─────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const { data: caller, error: authError } = await adminSupabase.auth.getUser(token);
  if (authError || !caller.user) return json({ error: 'Unauthorized' }, 401);

  // ── Gate de admin: solo is_admin puede crear usuarios ────────────────────────
  const { data: profile, error: profileErr } = await adminSupabase
    .from('profiles')
    .select('is_admin')
    .eq('id', caller.user.id)
    .single();
  if (profileErr || profile?.is_admin !== true) {
    return json({ error: 'Forbidden — admin only' }, 403);
  }

  // ── Body ─────────────────────────────────────────────────────────────────────
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const name = (body.name ?? '').trim();
  if (!email || !password) return json({ error: 'email y password son requeridos' }, 400);
  if (password.length < 8) return json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400);

  try {
    const { data: created, error: createErr } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,            // el admin provisiona → sin paso de verificación por email
      user_metadata: { name },
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? 'No se pudo crear el usuario' }, 400);
    }

    const newId = created.user.id;
    // El trigger handle_new_user ya creó user_profiles desde el metadata; reforzamos
    // el name por si el trigger no estuviera presente en algún entorno.
    if (name) {
      await adminSupabase.from('user_profiles').update({ name }).eq('user_id', newId);
    }

    console.log(`[create-user] admin ${caller.user.id} creó ${newId}`);
    return json({ ok: true, userId: newId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[create-user]', msg);
    return json({ error: msg }, 500);
  }
});
