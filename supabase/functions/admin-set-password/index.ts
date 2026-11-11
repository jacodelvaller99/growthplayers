/**
 * admin-set-password — el admin le pone una contraseña nueva a un cliente y
 * puede volver a verla mientras el cliente no ponga la suya.
 *
 * Las contraseñas que elige el cliente NO se pueden ver (Supabase solo guarda
 * su hash). La que pone el admin se guarda cifrada en Vault (`tmp_pw:<id>`)
 * y se borra cuando el cliente cambia su contraseña. Solo is_admin; la de otro
 * admin solo la toca un superadmin.
 *
 * POST { userId, password }          → { ok }
 * POST { action: 'get', userId }     → { password: string|null, setAt: string|null }
 */
import { adminSupabase, json, corsHeaders } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') ?? undefined;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Unauthorized' }, 401, origin);
  const { data: caller, error: authError } = await adminSupabase.auth.getUser(token);
  if (authError || !caller.user) return json({ error: 'Unauthorized' }, 401, origin);

  const { data: me } = await adminSupabase
    .from('profiles').select('is_admin, is_superadmin').eq('id', caller.user.id).single();
  if (me?.is_admin !== true) return json({ error: 'Solo un administrador puede hacer esto.' }, 403, origin);

  let body: { action?: string; userId?: string; password?: string };
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400, origin); }
  const userId = body.userId ?? '';
  if (!userId) return json({ error: 'Falta el cliente.' }, 400, origin);

  const { data: target } = await adminSupabase
    .from('profiles').select('is_admin, is_superadmin').eq('id', userId).single();
  if ((target?.is_admin || target?.is_superadmin) && me?.is_superadmin !== true && userId !== caller.user.id) {
    return json({ error: 'La contraseña de otro administrador solo la maneja un superadmin.' }, 403, origin);
  }

  if (body.action === 'get') {
    const { data, error } = await adminSupabase.rpc('temp_pw_get', { p_user: userId });
    if (error) return json({ error: error.message }, 500, origin);
    const row = (data as { value: string; set_at: string }[] | null)?.[0];
    return json({ password: row?.value ?? null, setAt: row?.set_at ?? null }, 200, origin);
  }

  const password = body.password ?? '';
  if (password.length < 8 || password.length > 72) {
    return json({ error: 'La contraseña debe tener entre 8 y 72 caracteres.' }, 400, origin);
  }

  const { error } = await adminSupabase.auth.admin.updateUserById(userId, { password });
  if (error) return json({ error: error.message }, 400, origin);

  const { error: vaultErr } = await adminSupabase.rpc('temp_pw_set', { p_user: userId, p_value: password });
  if (vaultErr) console.error('[admin-set-password] no se pudo guardar para mostrarla:', vaultErr.message);

  console.log(`[admin-set-password] ${caller.user.id} cambió la contraseña de ${userId}`);
  return json({ ok: true }, 200, origin);
});
