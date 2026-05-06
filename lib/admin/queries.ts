/**
 * CMI LifeFlow — Admin Supabase Queries
 *
 * `supa` is cast to `any` to bypass Supabase's generated types for
 * admin tables (access_codes extensions, user_memberships, user_course_access,
 * admin_audit_log, access_code_uses) that are not in the schema snapshot.
 *
 * Real user table: `user_progress` (not user_profiles or profiles).
 * Intelligence tables (user_events, user_intelligence, mentor_conversations):
 * gracefully return [] when not yet migrated.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { supabase, intel } from '@/lib/supabase';
import type {
  AccessCode,
  AccessCodeUse,
  AdminUser,
  AdminUserDetail,
  AuditLogEntry,
  BiometricStats,
  DashboardKPIs,
  JournalEntry,
  LiveEvent,
  MentorConversation,
  MlOverview,
  UserCourseAccess,
  UserMembership,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supa: any = supabase;

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

export async function fetchDashboardKPIs(): Promise<DashboardKPIs> {
  const today = new Date().toISOString().split('T')[0];

  // Core counts from tables that exist in prod
  const [totalRes, activeCodesRes, membRes] = await Promise.all([
    supa.from('user_progress').select('user_id', { count: 'exact', head: true }),
    supa.from('access_codes').select('id', { count: 'exact', head: true }).eq('is_active', true),
    // user_memberships may not exist yet — wrapped below
    supa.from('user_memberships').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  // Active today — use user_progress.last_checkin_date
  const { count: activeToday } = await supa
    .from('user_progress')
    .select('user_id', { count: 'exact', head: true })
    .eq('last_checkin_date', today);

  // Active last 7 days — use streak > 0 as proxy
  const { count: active7d } = await supa
    .from('user_progress')
    .select('user_id', { count: 'exact', head: true })
    .gt('streak', 0);

  // Avg engagement from user_progress.sovereign_score
  const { data: scoreData } = await supa
    .from('user_progress')
    .select('sovereign_score');
  const scores = ((scoreData ?? []) as Array<{ sovereign_score: number }>);
  const avg_eng = scores.length > 0
    ? Math.round(scores.reduce((s, r) => s + (r.sovereign_score ?? 0), 0) / scores.length)
    : 0;

  // Intelligence data (may not exist yet)
  let critical = 0;
  try {
    const intelligenceRes = await intel.intelligence()
      .select('churn_risk_label');
    const intel_data = (intelligenceRes.data ?? []) as Array<{ churn_risk_label: string }>;
    critical = intel_data.filter(r => r.churn_risk_label === 'critical').length;
  } catch (_) { /* table not yet migrated */ }

  return {
    total_users:       (totalRes.count ?? 0),
    active_today:      (activeToday ?? 0),
    active_7d:         (active7d ?? 0),
    avg_engagement:    avg_eng,
    critical_churn:    critical,
    total_memberships: (membRes.count ?? 0),
    active_codes:      (activeCodesRes.count ?? 0),
  };
}

// ─── Live Events Feed ─────────────────────────────────────────────────────────

export async function fetchLiveEvents(limit = 10): Promise<LiveEvent[]> {
  try {
    const { data } = await intel.events()
      .select('id, user_id, event_type, screen, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    return ((data ?? []) as LiveEvent[]);
  } catch (_) {
    return []; // user_events table not yet migrated
  }
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function fetchUsers(search?: string): Promise<AdminUser[]> {
  // user_progress is the real user table with names, scores, etc.
  const { data } = await supa
    .from('user_progress')
    .select('user_id, name, tier, sovereign_score, streak, last_checkin_date, total_days')
    .order('sovereign_score', { ascending: false });
  if (!data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let users = (data as any[]).map((p: any) => ({
    id: p.user_id as string,
    email: '',
    name: (p.name as string) ?? 'Usuario',
    role: p.tier as string | undefined,
    sovereign_score: p.sovereign_score as number | undefined,
    streak: p.streak as number | undefined,
    is_admin: false,
    created_at: p.last_checkin_date as string ?? '',
  }));

  if (search) {
    const s = search.toLowerCase();
    users = users.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
  }

  return users;
}

export async function fetchUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const [progressRes, membRes, courseRes] = await Promise.all([
    supa.from('user_progress').select('*').eq('user_id', userId).single(),
    supa.from('user_memberships').select('*').eq('user_id', userId).eq('status', 'active'),
    supa.from('user_course_access').select('*').eq('user_id', userId).eq('is_active', true),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = progressRes.data as any;
  if (!profile) return null;

  // Intelligence data (optional, may not exist)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let int: any = null;
  try {
    const intelligenceRes = await intel.intelligence()
      .select('*').eq('user_id', userId).single();
    int = intelligenceRes.data;
  } catch (_) { /* table not yet migrated */ }

  return {
    id: userId,
    email: '',
    name: profile.name ?? 'Usuario',
    role: profile.tier,
    is_admin: profile.is_admin ?? false,
    created_at: profile.protocol_start_date ?? '',
    sovereign_score: profile.sovereign_score,
    engagement_score: int?.engagement_score,
    churn_risk: int?.churn_risk,
    churn_risk_label: int?.churn_risk_label,
    anomaly_detected: int?.anomaly_detected,
    anomaly_type: int?.anomaly_type,
    next_action: int?.next_action,
    cohort_id: int?.cohort_id,
    cohort_label: int?.cohort_label,
    affinity_binaural: int?.affinity_binaural,
    affinity_breathing: int?.affinity_breathing,
    affinity_meditation: int?.affinity_meditation,
    affinity_journaling: int?.affinity_journaling,
    affinity_lessons: int?.affinity_lessons,
    affinity_mentor: int?.affinity_mentor,
    days_since_last_act:  int?.days_since_last_act,
    biometric_readiness:  int?.biometric_readiness  ?? null,
    biometric_provider:   int?.biometric_provider   ?? null,
    biometric_hrv_ms:     int?.biometric_hrv_ms     ?? null,
    biometric_resting_hr: int?.biometric_resting_hr ?? null,
    biometric_anomaly:    int?.biometric_anomaly     ?? null,
    memberships: ((membRes.data ?? []) as UserMembership[]),
    course_access: ((courseRes.data ?? []) as UserCourseAccess[]),
  };
}

export async function fetchUserEvents(userId: string, limit = 30): Promise<LiveEvent[]> {
  try {
    const { data } = await intel.events()
      .select('id, user_id, event_type, screen, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as LiveEvent[];
  } catch (_) {
    return [];
  }
}

export async function fetchUserCheckIns(userId: string) {
  const { data } = await supabase
    .from('daily_checkins')
    .select('id, date, energy, clarity, stress, sleep')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(30);
  return data ?? [];
}

// ─── Memberships ─────────────────────────────────────────────────────────────

export async function fetchAllMemberships(statusFilter?: string): Promise<UserMembership[]> {
  try {
    const q = supa
      .from('user_memberships')
      .select('*')
      .order('activated_at', { ascending: false });
    const filtered = statusFilter ? q.eq('status', statusFilter) : q;
    const { data } = await filtered;
    const memberships = (data ?? []) as UserMembership[];

    // Enrich with user names from user_progress
    if (memberships.length > 0) {
      const userIds = [...new Set(memberships.map((m: UserMembership) => m.user_id))];
      const { data: progressData } = await supa
        .from('user_progress')
        .select('user_id, name')
        .in('user_id', userIds);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nameMap: Record<string, string> = {};
      for (const p of (progressData ?? []) as Array<{ user_id: string; name: string }>) {
        nameMap[p.user_id] = p.name;
      }
      return memberships.map((m: UserMembership) => ({
        ...m,
        user_name: nameMap[m.user_id] ?? 'Usuario',
      }));
    }
    return memberships;
  } catch (_) {
    return [];
  }
}

export async function fetchTierCounts(): Promise<Record<string, number>> {
  try {
    // Count active memberships per product/tier
    const { data } = await supa
      .from('user_memberships')
      .select('product')
      .eq('status', 'active');
    const counts: Record<string, number> = { free: 0, premium: 0, premium_plus: 0, polaris: 0, growthplayers: 0 };
    for (const row of (data ?? []) as Array<{ product: string }>) {
      const key = row.product.replace('lifeflow_', '');
      counts[key] = (counts[key] ?? 0) + 1;
    }
    // free = total users - (all who have any active paid membership)
    const { count: totalUsers } = await supa
      .from('user_progress')
      .select('user_id', { count: 'exact', head: true });
    const paidTotal = Object.entries(counts)
      .filter(([k]) => k !== 'free')
      .reduce((s, [, v]) => s + v, 0);
    counts.free = Math.max(0, (totalUsers ?? 0) - paidTotal);
    return counts;
  } catch (_) {
    return { free: 0, premium: 0, premium_plus: 0, polaris: 0, growthplayers: 0 };
  }
}

export async function fetchUserMemberships(userId: string): Promise<UserMembership[]> {
  try {
    const { data } = await supa
      .from('user_memberships')
      .select('*')
      .eq('user_id', userId)
      .order('activated_at', { ascending: false });
    return (data ?? []) as UserMembership[];
  } catch (_) {
    return [];
  }
}

// ─── Course Access ────────────────────────────────────────────────────────────

export async function fetchCourseAccess(courseId?: string): Promise<UserCourseAccess[]> {
  try {
    const q = supa.from('user_course_access').select('*').eq('is_active', true);
    const filtered = courseId ? q.eq('course_id', courseId) : q;
    const { data } = await filtered;
    return (data ?? []) as UserCourseAccess[];
  } catch (_) {
    return [];
  }
}

// ─── Access Codes ─────────────────────────────────────────────────────────────

export async function fetchAccessCodes(): Promise<AccessCode[]> {
  const { data } = await supa
    .from('access_codes')
    .select('*')
    .order('created_at', { ascending: false });
  return (data ?? []) as AccessCode[];
}

export async function fetchCodeUses(codeId?: string): Promise<AccessCodeUse[]> {
  try {
    const q = supa
      .from('access_code_uses')
      .select('*')
      .order('used_at', { ascending: false })
      .limit(50);
    const filtered = codeId ? q.eq('code_id', codeId) : q;
    const { data } = await filtered;
    return (data ?? []) as AccessCodeUse[];
  } catch (_) {
    return [];
  }
}

// ─── Content ─────────────────────────────────────────────────────────────────

export async function fetchJournalEntries(userId?: string, limit = 30): Promise<JournalEntry[]> {
  try {
    const q = supa
      .from('journal_entries')
      .select('id, user_id, content, mood_score, entry_type, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    const filtered = userId ? q.eq('user_id', userId) : q;
    const { data } = await filtered;
    // Normalise: expose mood_score as mood for display components
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[]).map((e: any) => ({ ...e, mood: e.mood_score })) as JournalEntry[];
  } catch (_) {
    return [];
  }
}

export async function fetchMentorConversations(userId?: string, limit = 50): Promise<MentorConversation[]> {
  try {
    const q = intel.conversations()
      .select('id, user_id, role, content, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    const filtered = userId ? q.eq('user_id', userId) : q;
    const { data } = await filtered;
    return (data ?? []) as MentorConversation[];
  } catch (_) {
    // Fall back to mentor_messages table (original schema)
    try {
      const q = supa
        .from('mentor_messages')
        .select('id, user_id, role, content, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      const filtered = userId ? q.eq('user_id', userId) : q;
      const { data } = await filtered;
      return (data ?? []) as MentorConversation[];
    } catch (_) {
      return [];
    }
  }
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export async function fetchAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  try {
    const { data } = await supa
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data ?? []) as AuditLogEntry[];
  } catch (_) {
    return [];
  }
}

export async function fetchUserAuditLog(userId: string): Promise<AuditLogEntry[]> {
  try {
    const { data } = await supa
      .from('admin_audit_log')
      .select('*')
      .eq('target_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    return (data ?? []) as AuditLogEntry[];
  } catch (_) {
    return [];
  }
}

// ─── ML Dashboard (via Edge Function) ───────────────────────────────────────

export async function fetchMlOverview(): Promise<MlOverview | null> {
  const { data, error } = await supabase.functions.invoke('ml-dashboard', {
    body: { action: 'overview' },
  });
  if (error) return null;
  return data as MlOverview;
}

export async function fetchAtRiskUsers() {
  const { data, error } = await supabase.functions.invoke('ml-dashboard', {
    body: { action: 'at_risk_users', limit: 50 },
  });
  if (error) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any)?.users ?? [];
}

export async function fetchBiometricStats(): Promise<BiometricStats> {
  const empty: BiometricStats = { users_with_wearable: 0, avg_hrv: null, avg_recovery: null, users_with_anomaly: 0 };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (intel.intelligence() as any)
      .select('biometric_provider, biometric_hrv_ms, biometric_readiness, biometric_anomaly')
      .not('biometric_provider', 'is', null);
    if (!data || data.length === 0) return empty;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = data as any[];
    const hrvVals = rows.map((r: any) => r.biometric_hrv_ms).filter((v: any) => v != null) as number[];
    const recVals = rows.map((r: any) => r.biometric_readiness).filter((v: any) => v != null) as number[];

    return {
      users_with_wearable: rows.length,
      avg_hrv:      hrvVals.length > 0 ? parseFloat((hrvVals.reduce((a, b) => a + b, 0) / hrvVals.length).toFixed(1)) : null,
      avg_recovery: recVals.length > 0 ? Math.round(recVals.reduce((a, b) => a + b, 0) / recVals.length) : null,
      users_with_anomaly: rows.filter((r: any) => r.biometric_anomaly != null).length,
    };
  } catch (_) { return empty; }
}

export async function recalculateUserML(userId: string) {
  return supabase.functions.invoke('calculate-intelligence', {
    body: { user_id: userId },
  });
}

export async function recalculateAllML() {
  return supabase.functions.invoke('calculate-intelligence', {
    body: { batch: 'all' },
  });
}

// ─── Search users ─────────────────────────────────────────────────────────────

export async function searchUsers(query: string): Promise<AdminUser[]> {
  const { data } = await supa
    .from('user_progress')
    .select('user_id, name, tier, sovereign_score')
    .ilike('name', `%${query}%`)
    .limit(20);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((p: any) => ({
    id: p.user_id,
    email: '',
    name: p.name ?? 'Usuario',
    role: p.tier,
    sovereign_score: p.sovereign_score,
    is_admin: false,
    created_at: '',
  }));
}
