/**
 * CMI LifeFlow — Admin Supabase Queries
 *
 * `supa` is cast to `any` to bypass Supabase's generated types for
 * admin tables (access_codes extensions, user_memberships, user_course_access,
 * admin_audit_log, access_code_uses) that are not in the schema snapshot.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { supabase, intel } from '@/lib/supabase';
import type {
  AccessCode,
  AccessCodeUse,
  AdminUser,
  AdminUserDetail,
  AuditLogEntry,
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
  const week = new Date(Date.now() - 7 * 864e5).toISOString();

  const [totalRes, todayRes, weekRes, intelligenceRes, codesRes, membRes] = await Promise.all([
    intel.profiles().select('id', { count: 'exact', head: true }),
    intel.events().select('user_id', { count: 'exact', head: true }).gte('created_at', today),
    intel.events().select('user_id', { count: 'exact', head: true }).gte('created_at', week),
    intel.intelligence().select('engagement_score, churn_risk_label'),
    supa.from('access_codes').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supa.from('user_memberships').select('id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  const intel_data = (intelligenceRes.data ?? []) as Array<{ engagement_score: number; churn_risk_label: string }>;
  const avg_eng = intel_data.length > 0
    ? Math.round(intel_data.reduce((s: number, r: { engagement_score: number }) => s + (r.engagement_score ?? 0), 0) / intel_data.length)
    : 0;
  const critical = intel_data.filter((r: { churn_risk_label: string }) => r.churn_risk_label === 'critical').length;

  return {
    total_users:       (totalRes.count ?? 0),
    active_today:      (todayRes.count ?? 0),
    active_7d:         (weekRes.count ?? 0),
    avg_engagement:    avg_eng,
    critical_churn:    critical,
    total_memberships: (membRes.count ?? 0),
    active_codes:      (codesRes.count ?? 0),
  };
}

// ─── Live Events Feed ─────────────────────────────────────────────────────────

export async function fetchLiveEvents(limit = 10): Promise<LiveEvent[]> {
  const { data } = await intel.events()
    .select('id, user_id, event_type, screen, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return ((data ?? []) as LiveEvent[]);
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function fetchUsers(search?: string): Promise<AdminUser[]> {
  const q = intel.profiles().select('id, name, role, is_admin, created_at');
  const { data: profiles } = await q;
  if (!profiles) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let users = (profiles as any[]).map((p: any) => ({
    id: p.id as string,
    email: '',
    name: (p.name as string) ?? 'Usuario',
    role: p.role as string | undefined,
    is_admin: p.is_admin as boolean | undefined,
    created_at: p.created_at as string,
  }));

  if (search) {
    const s = search.toLowerCase();
    users = users.filter(u => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
  }

  return users;
}

export async function fetchUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const [profileRes, intelligenceRes, membRes, courseRes] = await Promise.all([
    intel.profiles().select('*').eq('id', userId).single(),
    intel.intelligence().select('*').eq('user_id', userId).single(),
    supa.from('user_memberships').select('*').eq('user_id', userId).eq('status', 'active'),
    supa.from('user_course_access').select('*').eq('user_id', userId).eq('is_active', true),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = profileRes.data as any;
  if (!profile) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const int = intelligenceRes.data as any;

  return {
    id: userId,
    email: '',
    name: profile.name ?? 'Usuario',
    role: profile.role,
    is_admin: profile.is_admin,
    created_at: profile.created_at,
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
    days_since_last_act: int?.days_since_last_act,
    memberships: ((membRes.data ?? []) as UserMembership[]),
    course_access: ((courseRes.data ?? []) as UserCourseAccess[]),
  };
}

export async function fetchUserEvents(userId: string, limit = 30): Promise<LiveEvent[]> {
  const { data } = await intel.events()
    .select('id, user_id, event_type, screen, metadata, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as LiveEvent[];
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
  const q = supa.from('user_memberships').select('*').order('activated_at', { ascending: false });
  const filtered = statusFilter ? q.eq('status', statusFilter) : q;
  const { data } = await filtered;
  return (data ?? []) as UserMembership[];
}

export async function fetchUserMemberships(userId: string): Promise<UserMembership[]> {
  const { data } = await supa
    .from('user_memberships')
    .select('*')
    .eq('user_id', userId)
    .order('activated_at', { ascending: false });
  return (data ?? []) as UserMembership[];
}

// ─── Course Access ────────────────────────────────────────────────────────────

export async function fetchCourseAccess(courseId?: string): Promise<UserCourseAccess[]> {
  const q = supa.from('user_course_access').select('*').eq('is_active', true);
  const filtered = courseId ? q.eq('course_id', courseId) : q;
  const { data } = await filtered;
  return (data ?? []) as UserCourseAccess[];
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
  const q = supa
    .from('access_code_uses')
    .select('*')
    .order('used_at', { ascending: false })
    .limit(50);
  const filtered = codeId ? q.eq('code_id', codeId) : q;
  const { data } = await filtered;
  return (data ?? []) as AccessCodeUse[];
}

// ─── Content ─────────────────────────────────────────────────────────────────

export async function fetchJournalEntries(userId?: string, limit = 30): Promise<JournalEntry[]> {
  const q = supa
    .from('journal_entries')
    .select('id, user_id, content, mood, entry_type, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  const filtered = userId ? q.eq('user_id', userId) : q;
  const { data } = await filtered;
  return (data ?? []) as JournalEntry[];
}

export async function fetchMentorConversations(userId?: string, limit = 50): Promise<MentorConversation[]> {
  const q = intel.conversations()
    .select('id, user_id, role, content, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  const filtered = userId ? q.eq('user_id', userId) : q;
  const { data } = await filtered;
  return (data ?? []) as MentorConversation[];
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export async function fetchAuditLog(limit = 50): Promise<AuditLogEntry[]> {
  const { data } = await supa
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as AuditLogEntry[];
}

export async function fetchUserAuditLog(userId: string): Promise<AuditLogEntry[]> {
  const { data } = await supa
    .from('admin_audit_log')
    .select('*')
    .eq('target_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  return (data ?? []) as AuditLogEntry[];
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
  const { data } = await intel.profiles()
    .select('id, name, role, is_admin, created_at')
    .ilike('name', `%${query}%`)
    .limit(20);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((p: any) => ({
    id: p.id,
    email: '',
    name: p.name ?? 'Usuario',
    role: p.role,
    is_admin: p.is_admin,
    created_at: p.created_at,
  }));
}
