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

  const payload: Record<string, unknown> = {
    subscription_tier: normalizedTier,
    updated_at: new Date().toISOString(),
  };
  if (expiresAt !== undefined) payload.subscription_expires_at = expiresAt ?? null;

  // El tier vive en dos tablas (profiles + user_profiles). Si una se actualiza y
  // la otra no, el app muestra un tier inconsistente. allSettled tolera la red,
  // pero NO debemos tragarnos un fallo parcial en silencio: lo inspeccionamos y
  // lo reportamos para que el admin sepa que quedó a medias.
  const results = await Promise.allSettled([
    intel.profiles().update(payload).eq('id', userId),          // profiles: id = auth.uid()
    supa.from('user_profiles').update(payload).eq('user_id', userId), // user_profiles
  ]);

  const errors: string[] = [];
  results.forEach((r, i) => {
    const table = i === 0 ? 'profiles' : 'user_profiles';
    if (r.status === 'rejected') {
      errors.push(`${table}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
    } else {
      // fulfilled todavía puede traer un error de Supabase en el cuerpo.
      const err = (r.value as { error?: { message?: string } } | null)?.error;
      if (err) errors.push(`${table}: ${err.message ?? 'update failed'}`);
    }
  });

  if (errors.length > 0) {
    console.warn(`[admin] syncTier parcial para ${userId}:`, errors.join(' · '));
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

    // Sync expiry date to profiles
    await Promise.allSettled([
      intel.profiles().update({ subscription_expires_at: newExpiresAt }).eq('id', userId),
      supa.from('user_profiles').update({ subscription_expires_at: newExpiresAt }).eq('user_id', userId),
    ]);

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
