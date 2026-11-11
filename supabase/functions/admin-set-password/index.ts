/**
 * admin-set-password — el admin le pone una contraseña nueva a un cliente.
 *
 * Las contraseñas no se pueden VER (Supabase solo guarda su hash): esto es lo
 * que sí se puede hacer cuando un cliente no puede entrar. Solo is_admin; la
 * contraseña de otro admin solo la puede cambiar un superadmin.
 *
 * Body: { userId, password }  ·  Devuelve: { ok } | { error }
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

  let body: { userId?: string; password?: string };
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400, origin); }
  const userId = body.userId ?? '';
  const password = body.password ?? '';
  if (!userId) return json({ error: 'Falta el cliente.' }, 400, origin);
  if (password.length < 8 || password.length > 72) {
    return json({ error: 'La contraseña debe tener entre 8 y 72 caracteres.' }, 400, origin);
  }

  const { data: target } = await adminSupabase
    .from('profiles').select('is_admin, is_superadmin').eq('id', userId).single();
  if ((target?.is_admin || target?.is_superadmin) && me?.is_superadmin !== true && userId !== caller.user.id) {
    return json({ error: 'La contraseña de otro administrador solo la cambia un superadmin.' }, 403, origin);
  }

  const { error } = await adminSupabase.auth.admin.updateUserById(userId, { password });
  if (error) return json({ error: error.message }, 400, origin);

  console.log(`[admin-set-password] ${caller.user.id} cambió la contraseña de ${userId}`);
  return json({ ok: true }, 200, origin);
});
