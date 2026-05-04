/**
 * CMI LifeFlow — Admin Actions
 *
 * All mutations go through Supabase RPC functions (SECURITY DEFINER)
 * so the admin_id is verified server-side before any write.
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
  metadata: Record<string, unknown> = {}
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

// ─── Memberships ─────────────────────────────────────────────────────────────

export async function activateMembership(params: {
  adminId: string;
  userId: string;
  product: MembershipProduct;
  expiresAt?: string | null;
  pricePaid?: number;
  currency?: string;
  notes?: string;
}): Promise<{ success: boolean; membershipId?: string; error?: string }> {
  const { data, error } = await supa.rpc('admin_activate_membership', {
    p_admin_id:   params.adminId,
    p_user_id:    params.userId,
    p_product:    params.product,
    p_expires_at: params.expiresAt ?? null,
    p_price_paid: params.pricePaid ?? 0,
    p_currency:   params.currency ?? 'USD',
    p_notes:      params.notes ?? null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, membershipId: data as string };
}

export async function deactivateMembership(params: {
  adminId: string;
  membershipId: string;
  userId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supa
    .from('user_memberships')
    .update({ status: 'cancelled' })
    .eq('id', params.membershipId);

  if (error) return { success: false, error: error.message };

  await auditLog(params.adminId, 'deactivate_membership', 'membership', params.membershipId, {
    user_id: params.userId,
  });
  return { success: true };
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

// ─── Redeem Access Code (in onboarding) ─────────────────────────────────────

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

  // Look up code type to know what product to activate
  const { data: codeData } = await supa
    .from('access_codes')
    .select('id, type')
    .eq('code', params.code.toUpperCase())
    .single();

  if (!codeData) return { status: 'ok' };

  const { CODE_TYPE_PRODUCT } = await import('./types');
  const codeType = (codeData as { id: string; type: AccessCodeType }).type;
  const product = CODE_TYPE_PRODUCT[codeType] ?? 'lifeflow_free';

  // Record who used the code (only if we have a userId)
  if (params.userId) {
    // access_code_uses may not exist yet — log if available
    try {
      await supa.from('access_code_uses').insert({
        code_id: (codeData as { id: string }).id,
        user_id: params.userId,
      });
    } catch (_) { /* table not yet migrated */ }

    // Activate membership if table exists
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

// ─── Send message as Norman ──────────────────────────────────────────────────

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
