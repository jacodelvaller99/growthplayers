/**
 * delete-account — Supabase Edge Function
 *
 * Permanently deletes all data for the authenticated user, then removes
 * the auth.users entry. Called from the GDPR "Eliminar cuenta" flow in
 * the mobile app.
 *
 * Auth: requires a valid user JWT in Authorization header.
 * No body params needed — user is identified by their own JWT.
 */
import { adminSupabase, json, corsHeaders } from '../_shared/supabase.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  // ── Auth: must be a valid user JWT ────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const { data: userData, error: authError } = await adminSupabase.auth.getUser(token);
  if (authError || !userData.user) return json({ error: 'Unauthorized' }, 401);

  const userId = userData.user.id;

  try {
    // ── Step 1: Delete all user data in parallel ─────────────────────────────
    // Borrado EXPLÍCITO de toda tabla con datos del usuario (derecho de supresión /
    // GDPR Art. 17). Aunque casi todas tienen ON DELETE CASCADE sobre auth.users,
    // las borramos a mano como defensa en profundidad: si en prod hubiera drift de
    // schema (un FK sin CASCADE), igual no queda PII. allSettled tolera no-ops.
    await Promise.allSettled([
      // Core loop + lecciones
      adminSupabase.from('mentor_messages').delete().eq('user_id', userId),
      adminSupabase.from('mentor_conversations').delete().eq('user_id', userId),
      adminSupabase.from('mentor_threads').delete().eq('user_id', userId),
      adminSupabase.from('mentor_memories').delete().eq('user_id', userId),
      adminSupabase.from('daily_checkins').delete().eq('user_id', userId),
      adminSupabase.from('check_ins').delete().eq('user_id', userId),
      adminSupabase.from('north_stars').delete().eq('user_id', userId),
      adminSupabase.from('completed_lessons').delete().eq('user_id', userId),
      adminSupabase.from('lesson_tasks').delete().eq('user_id', userId),
      adminSupabase.from('weekly_sessions').delete().eq('user_id', userId),
      // Bienestar + journaling
      adminSupabase.from('wellness_sessions').delete().eq('user_id', userId),
      adminSupabase.from('journal_entries').delete().eq('user_id', userId),
      // Hábitos / salud / nutrición
      adminSupabase.from('habits').delete().eq('user_id', userId),
      adminSupabase.from('habit_logs').delete().eq('user_id', userId),
      adminSupabase.from('fasting_sessions').delete().eq('user_id', userId),
      adminSupabase.from('nutrition_profiles').delete().eq('user_id', userId),
      adminSupabase.from('supplement_stacks').delete().eq('user_id', userId),
      adminSupabase.from('body_measurements').delete().eq('user_id', userId),
      // Wearables / biometría
      adminSupabase.from('wearable_connections').delete().eq('user_id', userId),
      adminSupabase.from('wearable_daily').delete().eq('user_id', userId),
      adminSupabase.from('wearable_timeseries').delete().eq('user_id', userId),
      // Comunidad (UGC)
      adminSupabase.from('community_posts').delete().eq('user_id', userId),
      adminSupabase.from('community_reactions').delete().eq('user_id', userId),
      // Inteligencia / analytics / notificaciones
      adminSupabase.from('user_intelligence').delete().eq('user_id', userId),
      adminSupabase.from('user_events').delete().eq('user_id', userId),
      adminSupabase.from('smart_notifications').delete().eq('user_id', userId),
      // Acceso / membresías
      adminSupabase.from('user_course_access').delete().eq('user_id', userId),
      adminSupabase.from('user_memberships').delete().eq('user_id', userId),
      adminSupabase.from('access_code_uses').delete().eq('user_id', userId),
      adminSupabase.from('org_members').delete().eq('user_id', userId),
      // Perfiles (al final: otras tablas referencian profiles(id))
      adminSupabase.from('user_profiles').delete().eq('user_id', userId),
      // profiles table uses id = auth.uid()
      adminSupabase.from('profiles').delete().eq('id', userId),
    ]);

    // ── Step 2: Delete auth.users entry ──────────────────────────────────────
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(deleteError.message);

    console.log(`[delete-account] Deleted user ${userId}`);
    return json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[delete-account]', msg);
    return json({ error: msg }, 500);
  }
});
