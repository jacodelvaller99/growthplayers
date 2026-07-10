/**
 * CMI LifeFlow — Admin Actions
 *
 * All mutations use the authenticated admin supabase client (anon key + RLS).
 * Admin RLS policies are enforced server-side via profiles.is_admin = true.
 *
 * `supa` is cast to `any` to bypass Supabase's generated types for
 * admin tables that don't yet exist in the schema snapshot.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { supabase, intel } from '@/lib/supabase';
import type { AccessCodeType, CourseId, MembershipProduct } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supa: any = supabase;

// ─── Audit helper ─────────────────────────────────────────────────────────────
async function auditLog(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    await supa.from('admin_audit_log').insert({
      admin_id:    adminId,
      action,
      target_type: targetType,
      target_id:   targetId,
      metadata,
    });
  } catch (_) { /* admin_audit_log table not yet migrated */ }
}

// ─── Tier sync helper ─────────────────────────────────────────────────────────
// Updates subscription_tier on BOTH profiles (auth-linked) and user_profiles (app data).
// Normalizes product names (e.g. 'lifeflow_premium') to tier names ('premium')
// so the app's subscriptionTier checks work correctly.
const PRODUCT_TO_TIER: Record<string, string> = {
  lifeflow_free:         'free',
  lifeflow_premium:      'premium',
  lifeflow_premium_plus: 'premium_plus',
  polaris:               'premium_plus',
  growthplayers:         'premium_plus',
};

async function syncTier(
  userId: string,
  tier: string,
  expiresAt?: string | null,
): Promise<{ ok: boolean; errors: string[] }> {
  // Normalize product names to canonical tier values expected by the app
  const normalizedTier = PRODUCT_TO_TIER[tier] ?? tier;

  // El tier vive en dos tablas (profiles + user_profiles). Un UPDATE directo con
  // el cliente anon a OTRO usuario matchea 0 filas (RLS self-only) y el trigger
  // anti-escalada bloquea subscription_tier desde 'authenticated' → el mirror
  // fallaba en silencio (membresía activa, perfil en 'free'). Vía RPC SECURITY
  // DEFINER admin_sync_tier: verifica al admin llamante y espeja a AMBAS tablas.
  const { error } = await supa.rpc('admin_sync_tier', {
    target_user: userId,
    new_tier: normalizedTier,
    set_expires: expiresAt !== undefined,
    new_expires_at: expiresAt ?? null,
  });

  const errors: string[] = [];
  if (error) errors.push(`admin_sync_tier: ${error.message}`);

  if (errors.length > 0) {
    console.warn(`[admin] syncTier falló para ${userId}:`, errors.join(' · '));
  }
  return { ok: errors.length === 0, errors };
}

// ─── Trigger ML recalculation (fire & forget) ────────────────────────────────
function triggerML(userId: string) {
  supabase.functions
    .invoke('calculate-intelligence', { body: { user_id: userId } })
    .catch(() => {});
}

// ─── ACTIVATE / UPGRADE MEMBERSHIP ───────────────────────────────────────────
export async function activateMembership(params: {
  adminId: string;
  userId: string;
  product: MembershipProduct | string;
  expiresAt?: string | null;
  pricePaid?: number;
  currency?: string;
  notes?: string;
  activatedBy?: string;
}): Promise<{ success: boolean; membershipId?: string; error?: string }> {
  const {
    adminId, userId, product,
    expiresAt = null,
    pricePaid = 0,
    currency = 'USD',
    notes = '',
    activatedBy = 'admin',
  } = params;

  try {
    // 1. Supersede previous active membership of the same product
    await supa
      .from('user_memberships')
      .update({ status: 'superseded' })
      .eq('user_id', userId)
      .eq('product', product)
      .eq('status', 'active');

    // 2. Insert new membership
    const { data: membership, error: membershipError } = await supa
      .from('user_memberships')
      .insert({
        user_id:      userId,
        product,
        status:       'active',
        activated_by: activatedBy,
        activated_at: new Date().toISOString(),
        expires_at:   expiresAt ?? null,
        price_paid:   pricePaid,
        currency,
        notes:        notes || null,
        created_by:   adminId,
      })
      .select('id')
      .single();

    if (membershipError) throw new Error(membershipError.message);

    // 3. Sync tier to profiles tables
    await syncTier(userId, product, expiresAt);

    // 4. Audit
    await auditLog(adminId, 'activate_membership', 'user', userId, {
      product, price_paid: pricePaid, expires_at: expiresAt, notes,
    });

    // 5. ML recalculation (background)
    triggerML(userId);

    return { success: true, membershipId: (membership as { id: string }).id };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, error: msg };
  }
}

// ─── CANCEL / DOWNGRADE ───────────────────────────────────────────────────────
export async function cancelMembership(params: {
  membershipId: string;
  userId: string;
  downgradeTo?: string;
  adminId: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { membershipId, userId, downgradeTo = 'free', adminId, reason = '' } = params;

  try {
    await supa
      .from('user_memberships')
      .update({ status: 'cancelled', notes: reason || null })
      .eq('id', membershipId);

    await syncTier(userId, downgradeTo, null);

    await auditLog(adminId, 'cancel_membership', 'user', userId, {
      membership_id: membershipId, downgraded_to: downgradeTo, reason,
    });

    triggerML(userId);
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, error: msg };
  }
}

// ─── CHANGE TIER DIRECTLY (upgrade / downgrade) ───────────────────────────────
export async function changeTier(params: {
  userId: string;
  newTier: string;
  adminId: string;
  reason?: string;
}): Promise<{ success: boolean; membershipId?: string; error?: string }> {
  return activateMembership({
    adminId:      params.adminId,
    userId:       params.userId,
    product:      params.newTier,
    notes:        params.reason ?? '',
    activatedBy:  'admin_direct',
    pricePaid:    0,
  });
}

// ─── CREATE USER PROFILE (el admin provisiona un usuario auth real) ───────────
// Crear un auth user necesita service-role → va por la edge function `create-user`
// (que verifica is_admin del caller). El tier inicial reusa activateMembership.
/** ¿El error de invoke significa que la edge function NO está desplegada? */
function isFunctionUndeployed(err: unknown): boolean {
  const e = err as { name?: string; message?: string; status?: number } | null;
  const msg = (e?.message ?? String(err ?? '')).toLowerCase();
  return (
    e?.name === 'FunctionsFetchError' ||
    e?.status === 404 ||
    msg.includes('failed to fetch') ||
    msg.includes('not found') ||
    msg.includes('404') ||
    msg.includes('functionsfetcherror')
  );
}

/**
 * Fallback client-side: crea el usuario auth vía `signUp` en un cliente AISLADO
 * (`persistSession: false` + storageKey propio) para NO tocar la sesión del admin.
 * Se usa cuando la edge function `create-user` aún no está desplegada.
 * Diferencia con la edge function: no puede auto-confirmar el email (eso requiere
 * service-role) → si el proyecto exige confirmación, el usuario recibe un correo.
 */
async function createUserViaSignUp(params: {
  email: string; name: string; password: string;
}): Promise<{ userId?: string; needsConfirm: boolean; error?: string }> {
  const url  = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !anon) return { needsConfirm: false, error: 'Configuración de Supabase ausente.' };

  const { createClient } = await import('@supabase/supabase-js');
  const tmp = createClient(url, anon, {
    auth: {
      persistSession: false,        // NO escribe en storage → sesión del admin intacta
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'sb-admin-create-temp',
    },
  });

  const { data, error } = await tmp.auth.signUp({
    email: params.email,
    password: params.password,
    options: { data: { name: params.name } },   // → user_metadata, leído por handle_new_user
  });
  if (error) return { needsConfirm: false, error: error.message };
  const userId = data.user?.id;
  if (!userId) return { needsConfirm: false, error: 'No se pudo crear el usuario.' };

  // Refuerza el name en user_profiles (el trigger lo crea desde el metadata; esto
  // cubre entornos donde el trigger no copia el name). Best-effort.
  try { await supa.from('user_profiles').update({ name: params.name }).eq('user_id', userId); }
  catch { /* el trigger ya lo puso, o RLS no deja — no es crítico */ }

  // Sin `session` inmediata = el proyecto exige confirmación de email.
  return { userId, needsConfirm: !data.session };
}

export async function createUserProfile(params: {
  adminId: string;
  email: string;
  name: string;
  password: string;
  tier?: string;            // tier de suscripción inicial; '' o 'free' = ninguno
}): Promise<{ success: boolean; userId?: string; error?: string; needsConfirm?: boolean; viaFallback?: boolean }> {
  const { adminId, name, password, tier } = params;
  const email = params.email.trim().toLowerCase();

  let userId: string | undefined;
  let viaFallback = false;
  let needsConfirm = false;

  // ── 1. Primario: edge function `create-user` (service-role, usuario ya confirmado) ──
  try {
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { email, name, password },
    });
    if (error) {
      // Si la función NO está desplegada → caemos al fallback. Otro error real
      // (email duplicado, password corto) se propaga tal cual.
      if (!isFunctionUndeployed(error)) return { success: false, error: error.message };
    } else {
      const res = data as { userId?: string; ok?: boolean; error?: string } | null;
      if (res?.userId) userId = res.userId;
      else if (res?.error) return { success: false, error: res.error };
    }
  } catch (err: unknown) {
    if (!isFunctionUndeployed(err)) {
      return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' };
    }
  }

  // ── 2. Fallback: signUp aislado si la edge function no respondió ──
  if (!userId) {
    const fb = await createUserViaSignUp({ email, name, password });
    if (fb.error) return { success: false, error: fb.error };
    userId = fb.userId;
    needsConfirm = fb.needsConfirm;
    viaFallback = true;
  }

  if (!userId) return { success: false, error: 'No se pudo crear el usuario.' };

  // ── 3. Tier de suscripción inicial opcional (reusa el flujo de membresía) ──
  if (tier && tier !== 'free') {
    try { await activateMembership({ adminId, userId, product: tier, activatedBy: 'admin_create' }); }
    catch { /* el usuario quedó creado; el tier se puede fijar luego en Membresías */ }
  }

  await auditLog(adminId, 'create_user', 'user', userId, { email, name, tier: tier ?? null, viaFallback });
  return { success: true, userId, needsConfirm, viaFallback };
}

// ─── EDIT USER PROFILE FIELDS (nombre + etiqueta/badge mostrada como "rol") ────
// El tier de suscripción se cambia con changeTier/activateMembership (ya existente).
export async function updateUserProfile(params: {
  adminId: string;
  userId: string;
  name?: string;
  label?: string;           // user_profiles.tier — el badge que el admin ve como "rol"
}): Promise<{ success: boolean; error?: string }> {
  const { adminId, userId, name, label } = params;
  const newName = typeof name === 'string' ? name.trim() : null;
  const newTier = typeof label === 'string' ? label.trim() : null;
  if (!newName && !newTier) return { success: true };
  try {
    // Vía RPC SECURITY DEFINER (admin_update_user_profile): un UPDATE directo con
    // el cliente anon matchea 0 filas para OTRO usuario (RLS self-only) y no da
    // error → guardado silencioso. La RPC verifica al admin llamante en servidor.
    const { error } = await supa.rpc('admin_update_user_profile', {
      target_user: userId,
      new_name: newName,
      new_tier: newTier,
    });
    if (error) return { success: false, error: error.message };
    await auditLog(adminId, 'update_user_profile', 'user', userId, { name: newName, tier: newTier });
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return { success: false, error: msg };
  }
}

// ─── SET USER ROLE (panel de 4 niveles: superadmin/admin/premium/inicial) ─────
// Vía la RPC SECURITY DEFINER admin_set_user_role, que verifica los privilegios
// del LLAMANTE en el servidor (solo SuperAdmin asigna admin/superadmin). El cambio
// de privilegio no puede hacerse con un UPDATE directo (el trigger anti-escalada
// lo bloquea desde el cliente) — la RPC corre como rol dueño y el trigger la permite.
export type AppRole = 'superadmin' | 'admin' | 'premium' | 'inicial';

export const APP_ROLE_LABEL: Record<AppRole, string> = {
  superadmin: 'SuperAdmin',
  admin:      'Admin',
  premium:    'Cliente Premium',
  inicial:    'Cliente Inicial',
};

export async function setUserRole(params: {
  adminId: string;
  userId: string;
  role: AppRole;
}): Promise<{ success: boolean; error?: string }> {
  const { adminId, userId, role } = params;
  try {
    const { error } = await supa.rpc('admin_set_user_role', {
      target_user: userId,
      new_role: role,
    });
    if (error) return { success: false, error: error.message };
    await auditLog(adminId, 'set_user_role', 'user', userId, { role });
    triggerML(userId);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return { success: false, error: msg };
  }
}

// ─── EXTEND MEMBERSHIP ────────────────────────────────────────────────────────
export async function extendMembership(params: {
  membershipId: string;
  userId: string;
  newExpiresAt: string;
  adminId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { membershipId, userId, newExpiresAt, adminId } = params;

  try {
    const { error } = await supa
      .from('user_memberships')
      .update({ expires_at: newExpiresAt })
      .eq('id', membershipId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    // Sync expiry date to profiles — vía RPC SECURITY DEFINER (el UPDATE directo
    // anon a otro usuario fallaba en silencio, ver admin_sync_tier). new_tier NULL
    // = solo actualizar la expiración, sin tocar el tier.
    await supa.rpc('admin_sync_tier', {
      target_user: userId,
      new_tier: null,
      set_expires: true,
      new_expires_at: newExpiresAt,
    });

    await auditLog(adminId, 'extend_membership', 'user', userId, {
      membership_id: membershipId, new_expires_at: newExpiresAt,
    });

    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, error: msg };
  }
}

// ─── DEACTIVATE (legacy alias) ────────────────────────────────────────────────
export async function deactivateMembership(params: {
  adminId: string;
  membershipId: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  return cancelMembership({
    membershipId: params.membershipId,
    userId:       params.userId,
    adminId:      params.adminId,
    downgradeTo:  'free',
  });
}

// ─── Course Access ────────────────────────────────────────────────────────────

export async function grantCourseAccess(params: {
  adminId: string;
  userId: string;
  courseId: CourseId;
  moduleIds?: string[] | null;
  expiresAt?: string | null;
  notes?: string;
}): Promise<{ success: boolean; accessId?: string; error?: string }> {
  const { data, error } = await supa
    .from('user_course_access')
    .insert({
      user_id:    params.userId,
      course_id:  params.courseId,
      module_ids: params.moduleIds ?? null,
      granted_by: params.adminId,
      expires_at: params.expiresAt ?? null,
      is_active:  true,
      notes:      params.notes ?? null,
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };

  const accessId = (data as { id: string }).id;
  await auditLog(params.adminId, 'grant_course_access', 'course', accessId, {
    user_id: params.userId, course_id: params.courseId,
  });
  return { success: true, accessId };
}

export async function revokeCourseAccess(params: {
  adminId: string;
  accessId: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supa
    .from('user_course_access')
    .update({ is_active: false })
    .eq('id', params.accessId);

  if (error) return { success: false, error: error.message };

  await auditLog(params.adminId, 'revoke_course_access', 'course', params.accessId, {
    user_id: params.userId,
  });
  return { success: true };
}

// ─── Access Codes ─────────────────────────────────────────────────────────────

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3) code += '-';
  }
  return code;
}

export async function createAccessCode(params: {
  adminId: string;
  type: AccessCodeType;
  maxUses?: number;
  expiresAt?: string | null;
  notes?: string;
  label?: string;
  customCode?: string;
}): Promise<{ success: boolean; code?: string; codeId?: string; error?: string }> {
  const code = params.customCode ? params.customCode.toUpperCase() : generateCode();

  try {
    // Direct INSERT — no RPC needed for code creation
    const { data, error } = await supa
      .from('access_codes')
      .insert({
        code,
        type:       params.type,
        max_uses:   params.maxUses ?? 1,
        uses_count: 0,
        is_active:  true,
        expires_at: params.expiresAt ?? null,
        notes:      params.notes ?? null,
        label:      params.label ?? null,
        created_by: params.adminId,
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };
    const codeId = (data as { id: string }).id;

    await auditLog(params.adminId, 'create_access_code', 'access_code', codeId, {
      code, type: params.type, max_uses: params.maxUses ?? 1,
    });

    return { success: true, code, codeId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return { success: false, error: msg };
  }
}

export async function deactivateAccessCode(params: {
  adminId: string;
  codeId: string;
  code: string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supa
    .from('access_codes')
    .update({ is_active: false })
    .eq('id', params.codeId);

  if (error) return { success: false, error: error.message };

  await auditLog(params.adminId, 'deactivate_access_code', 'access_code', params.codeId, {
    code: params.code,
  });
  return { success: true };
}

// ─── Redeem Access Code ───────────────────────────────────────────────────────

export async function redeemAccessCode(params: {
  code: string;
  userId: string;
}): Promise<{
  status: 'ok' | 'invalid' | 'exhausted' | 'expired' | 'inactive';
  product?: MembershipProduct;
  error?: string;
}> {
  try {
    // 1. Fetch code record
    const { data: codeData, error: fetchError } = await supa
      .from('access_codes')
      .select('id, type, is_active, max_uses, uses_count, expires_at')
      .eq('code', params.code.trim().toUpperCase())
      .single();

    if (fetchError || !codeData) return { status: 'invalid' };

    const row = codeData as {
      id: string; type: AccessCodeType; is_active: boolean;
      max_uses: number; uses_count: number; expires_at: string | null;
    };

    // 2. Validate state
    if (!row.is_active)                           return { status: 'inactive' };
    if (row.expires_at && new Date(row.expires_at) < new Date()) return { status: 'expired' };
    if (row.uses_count >= row.max_uses)            return { status: 'exhausted' };

    // 3. Atomic increment — optimistic concurrency: only update if count unchanged
    // Note: use .select('id') without head:true — head:true on PATCH returns null count
    const { data: updatedRows, error: updateError } = await supa
      .from('access_codes')
      .update({ uses_count: row.uses_count + 1 })
      .eq('id', row.id)
      .eq('uses_count', row.uses_count)   // guard: prevent double-spend
      .select('id');

    if (updateError || !updatedRows || updatedRows.length === 0) return { status: 'exhausted' };

    // 4. Map code type → membership product
    const { CODE_TYPE_PRODUCT } = await import('./types');
    const product = CODE_TYPE_PRODUCT[row.type] ?? 'lifeflow_free';

    // 5. Record usage
    if (params.userId) {
      try {
        await supa.from('access_code_uses').insert({
          code_id: row.id,
          user_id: params.userId,
        });
      } catch (_) { /* access_code_uses not yet migrated — safe to skip */ }

      // 6. Activate membership
      try {
        await supa.from('user_memberships').insert({
          user_id:      params.userId,
          product,
          status:       'active',
          activated_by: 'access_code',
          activated_at: new Date().toISOString(),
        });
        // Sync tier to profiles tables
        await syncTier(params.userId, product, null);
      } catch (_) { /* user_memberships not yet migrated */ }
    }

    return { status: 'ok', product };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    return { status: 'invalid', error: msg };
  }
}

// ─── Send message as Norman ───────────────────────────────────────────────────

export async function sendMessageAsNorman(params: {
  adminId: string;
  userId: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await intel.conversations().insert({
    user_id:    params.userId,
    role:       'assistant',
    content:    params.message,
    created_at: new Date().toISOString(),
  });

  if (error) return { success: false, error: error.message };

  await auditLog(params.adminId, 'send_message_as_norman', 'user', params.userId, {
    preview: params.message.substring(0, 100),
  });
  return { success: true };
}

// ─── Mentoría por el cliente (el mentor opera; el usuario usa lo mínimo) ──────
// Requiere la migración 20260710000000_admin_mentorship_write.sql (WITH CHECK
// admin en ms_own/mt_own); sin ella el INSERT/UPDATE matchea 0 filas por RLS.

export async function adminAddMentorshipNote(params: {
  adminId: string;
  userId: string;
  week: number;
  text: string;
}): Promise<{ success: boolean; error?: string }> {
  const text = params.text.trim();
  if (!text) return { success: false, error: 'Nota vacía' };
  const { error } = await supa.from('mentorship_sessions').insert({
    user_id:      params.userId,
    week:         params.week,
    session_date: new Date().toISOString().split('T')[0],
    notes:        text,
    action_plan:  [],
  });
  if (error) return { success: false, error: error.message };
  await auditLog(params.adminId, 'mentorship_note_added', 'user', params.userId, {
    week: params.week,
    preview: text.substring(0, 100),
  });
  return { success: true };
}

export async function adminUpdateActionPlan(params: {
  adminId: string;
  userId: string;
  sessionId: string;
  actionPlan: { text: string; week?: number | null; source?: string; done?: boolean }[];
}): Promise<{ success: boolean; error?: string }> {
  const { error, count } = await supa
    .from('mentorship_sessions')
    .update({ action_plan: params.actionPlan }, { count: 'exact' })
    .eq('id', params.sessionId)
    .eq('user_id', params.userId);
  if (error) return { success: false, error: error.message };
  if (count === 0) return { success: false, error: 'RLS bloqueó el update (¿migración admin_mentorship_write aplicada?)' };
  await auditLog(params.adminId, 'mentorship_plan_updated', 'user', params.userId, {
    session_id: params.sessionId,
    items: params.actionPlan.length,
  });
  return { success: true };
}

export async function adminToggleMentorshipTask(params: {
  adminId: string;
  userId: string;
  taskId: string;
  completed: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const { error, count } = await supa
    .from('mentorship_tasks')
    .update(
      { completed: params.completed, completed_at: params.completed ? new Date().toISOString() : null },
      { count: 'exact' },
    )
    .eq('id', params.taskId)
    .eq('user_id', params.userId);
  if (error) return { success: false, error: error.message };
  if (count === 0) return { success: false, error: 'RLS bloqueó el update (¿migración admin_mentorship_write aplicada?)' };
  await auditLog(params.adminId, 'mentorship_task_toggled', 'user', params.userId, {
    task_id: params.taskId,
    completed: params.completed,
  });
  return { success: true };
}

export async function adminDeleteMentorshipSession(params: {
  adminId: string;
  userId: string;
  sessionId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supa
    .from('mentorship_sessions')
    .delete()
    .eq('id', params.sessionId)
    .eq('user_id', params.userId);
  if (error) return { success: false, error: error.message };
  await auditLog(params.adminId, 'mentorship_session_deleted', 'user', params.userId, {
    session_id: params.sessionId,
  });
  return { success: true };
}

// ─── ML Recalculation ─────────────────────────────────────────────────────────

export async function recalculateUserMLAction(params: {
  adminId: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.functions.invoke('calculate-intelligence', {
    body: { user_id: params.userId },
  });
  if (error) return { success: false, error: error.message };
  await auditLog(params.adminId, 'recalculate_ml', 'user', params.userId, {});
  return { success: true };
}

export async function recalculateAllMLAction(adminId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.functions.invoke('calculate-intelligence', {
    body: { batch: 'all' },
  });
  if (error) return { success: false, error: error.message };
  await auditLog(adminId, 'recalculate_all_ml', 'user', 'all', {});
  return { success: true };
}
