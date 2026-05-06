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
// product values in user_memberships are the raw tier IDs (free/premium/premium_plus/polaris/growthplayers).
async function syncTier(userId: string, tier: string, expiresAt?: string | null) {
  const payload: Record<string, unknown> = {
    subscription_tier: tier,
    updated_at: new Date().toISOString(),
  };
  if (expiresAt !== undefined) payload.subscription_expires_at = expiresAt ?? null;

  await Promise.allSettled([
    // profiles: id = auth.uid()
    intel.profiles().update(payload).eq('id', userId),
    // user_profiles: user_id = auth.uid()
    supa.from('user_profiles').update(payload).eq('user_id', userId),
  ]);
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

  const { data, error } = await supa.rpc('admin_create_access_code', {
    p_admin_id:   params.adminId,
    p_code:       code,
    p_type:       params.type,
    p_max_uses:   params.maxUses ?? 1,
    p_expires_at: params.expiresAt ?? null,
    p_notes:      params.notes ?? null,
    p_label:      params.label ?? null,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, code, codeId: data as string };
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
  const { data, error } = await supa.rpc('redeem_access_code', {
    p_code: params.code,
  });

  if (error) return { status: 'invalid', error: error.message };
  const status = data as string;

  if (status !== 'ok') return { status: status as 'invalid' | 'exhausted' | 'expired' | 'inactive' };

  const { data: codeData } = await supa
    .from('access_codes')
    .select('id, type')
    .eq('code', params.code.toUpperCase())
    .single();

  if (!codeData) return { status: 'ok' };

  const { CODE_TYPE_PRODUCT } = await import('./types');
  const codeType = (codeData as { id: string; type: AccessCodeType }).type;
  const product = CODE_TYPE_PRODUCT[codeType] ?? 'lifeflow_free';

  if (params.userId) {
    try {
      await supa.from('access_code_uses').insert({
        code_id: (codeData as { id: string }).id,
        user_id: params.userId,
      });
    } catch (_) { /* table not yet migrated */ }

    try {
      await supa.from('user_memberships').insert({
        user_id:      params.userId,
        product,
        status:       'active',
        activated_by: 'access_code',
      });
    } catch (_) { /* table not yet migrated */ }
  }

  return { status: 'ok', product };
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
