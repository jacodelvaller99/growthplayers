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
 * No existe ningún trigger `handle_new_user()` en esta base (verificado en
 * producción: 0 filas en pg_trigger) — la fila `user_profiles` se inserta aquí
 * directamente, no se asume que algo más la cree.
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

    let newId = created?.user?.id ?? null;
    let existed = false;
    if (createErr || !newId) {
      // El correo ya tiene cuenta (p. ej. un alta anterior que quedó a medias, sin
      // perfil): en vez de fallar, se completa esa cuenta con la contraseña nueva.
      if (!/already|registered|exists/i.test(createErr?.message ?? '')) {
        return json({ error: createErr?.message ?? 'No se pudo crear el usuario' }, 400);
      }
      for (let page = 1; page <= 20 && !newId; page++) {
        const { data: list, error: listErr } = await adminSupabase.auth.admin.listUsers({ page, perPage: 1000 });
        if (listErr) return json({ error: listErr.message }, 500);
        newId = list.users.find((u) => (u.email ?? '').toLowerCase() === email)?.id ?? null;
        if (list.users.length < 1000) break;
      }
      if (!newId) return json({ error: 'Ese correo ya tiene cuenta pero no se encontró.' }, 400);
      const { data: prof } = await adminSupabase.from('profiles').select('is_admin').eq('id', newId).maybeSingle();
      if (prof?.is_admin) return json({ error: 'Ese correo es de un administrador: no se modifica desde aquí.' }, 403);
      const { error: updErr } = await adminSupabase.auth.admin.updateUserById(newId, {
        password, email_confirm: true, user_metadata: { name },
      });
      if (updErr) return json({ error: updErr.message }, 400);
      existed = true;
    }

    const { error: profileErr2 } = await adminSupabase
      .from('user_profiles')
      .upsert({ user_id: newId, name: name || null, email }, { onConflict: 'user_id' });
    if (profileErr2) {
      console.error('[create-user] user_profiles insert falló', profileErr2.message);
      return json({ error: `Usuario creado pero falló el perfil: ${profileErr2.message}` }, 500);
    }

    // La contraseña que puso el admin queda visible en la ficha hasta que el cliente ponga la suya.
    await adminSupabase.rpc('temp_pw_set', { p_user: newId, p_value: password }).then(() => {}, () => {});

    console.log(`[create-user] admin ${caller.user.id} ${existed ? 'completó' : 'creó'} ${newId}`);
    return json({ ok: true, userId: newId, existed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[create-user]', msg);
    return json({ error: msg }, 500);
  }
});
