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
import { supabase, intel, mem } from '@/lib/supabase';
import {
  fetchAdminBriefing,
  fetchAdminNotes,
  fetchLatestSummaries,
  fetchMemoryProfile,
  type AdminBriefing,
  type AdminNote,
  type MemoryProfile,
  type MemorySummaryRow,
} from '@/lib/memory';
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

// ─── Memory OS — dossier por usuario (admin) ─────────────────────────────────────
export interface UserMemoryBundle {
  profile: MemoryProfile | null;
  summaries: MemorySummaryRow[];
  briefing: AdminBriefing | null;
  notes: AdminNote[];
}

/** Agrega el dossier de memoria de un usuario (perfil + resúmenes + briefing + notas). */
export async function fetchUserMemory(userId: string): Promise<UserMemoryBundle> {
  const [profile, summaries, briefing, notes] = await Promise.all([
    fetchMemoryProfile(userId),
    fetchLatestSummaries(userId, 8),
    fetchAdminBriefing(userId),
    fetchAdminNotes(userId),
  ]);
  return { profile, summaries, briefing, notes };
}

export interface MemoryDashboardRow {
  user_id: string;
  name: string;
  openLoops: number;
  summaryCount: number;
  lastSummaryAt: string | null;
  staleDays: number | null;
  churnLabel: string | null;
  topThemes: string[];
}

/**
 * Dashboard cross-client del Memory OS (admin): agrega los resúmenes recientes de
 * TODOS los usuarios (visible por RLS admin) y calcula loops abiertos, antigüedad
 * del último resumen (follow-up estancado) y temas recurrentes. Degrada a [].
 */
export async function fetchMemoryDashboard(): Promise<MemoryDashboardRow[]> {
  try {
    const { data: sums } = await mem.summaries()
      .select('user_id,unresolved_questions,key_topics,created_at')
      .order('created_at', { ascending: false })
      .limit(600);
    const rows = (sums ?? []) as Array<{
      user_id: string; unresolved_questions?: string[]; key_topics?: string[]; created_at?: string;
    }>;
    if (rows.length === 0) return [];

    const agg = new Map<string, { openLoops: number; count: number; last: string | null; themes: Map<string, number> }>();
    for (const r of rows) {
      const a = agg.get(r.user_id) ?? { openLoops: 0, count: 0, last: null, themes: new Map<string, number>() };
      a.openLoops += r.unresolved_questions?.length ?? 0;
      a.count += 1;
      if (!a.last || (r.created_at && r.created_at > a.last)) a.last = r.created_at ?? a.last;
      for (const t of r.key_topics ?? []) {
        const k = t.trim();
        if (k) a.themes.set(k, (a.themes.get(k) ?? 0) + 1);
      }
      agg.set(r.user_id, a);
    }

    const ids = [...agg.keys()];
    const nameMap: Record<string, string> = {};
    try {
      const { data: prog } = await supa.from('user_progress').select('user_id,name').in('user_id', ids);
      for (const p of (prog ?? []) as Array<{ user_id: string; name: string }>) nameMap[p.user_id] = p.name;
    } catch { /* noop */ }
    const churnMap: Record<string, string> = {};
    try {
      const { data: ints } = await intel.intelligence().select('user_id,churn_risk_label').in('user_id', ids);
      for (const r of (ints ?? []) as Array<{ user_id: string; churn_risk_label: string }>) churnMap[r.user_id] = r.churn_risk_label;
    } catch { /* noop */ }

    const now = Date.now();
    return ids.map((id) => {
      const a = agg.get(id)!;
      const staleDays = a.last ? Math.floor((now - new Date(a.last).getTime()) / 86_400_000) : null;
      const topThemes = [...a.themes.entries()].sort((x, y) => y[1] - x[1]).map(([t]) => t).slice(0, 5);
      return {
        user_id: id,
        name: nameMap[id] ?? 'Usuario',
        openLoops: a.openLoops,
        summaryCount: a.count,
        lastSummaryAt: a.last,
        staleDays,
        churnLabel: churnMap[id] ?? null,
        topThemes,
      };
    });
  } catch {
    return [];
  }
}

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

// ─── Mentorship (sessions + tasks) ──────────────────────────────────────────────
// Tables mentorship_sessions / mentorship_tasks (migration 20260604000000) are not
// in the generated types → use the untyped `supa` client. Returns empty on missing
// tables so the admin detail degrades gracefully before the migration is applied.

export interface AdminMentorshipSession {
  id: string;
  week: number | null;
  session_date: string | null;
  notes: string | null;
  action_plan: unknown[];
  created_at: string;
}

export interface AdminMentorshipTask {
  id: string;
  week: number | null;
  title: string;
  completed: boolean;
  completed_at: string | null;
}

export interface AdminMentorshipData {
  sessions: AdminMentorshipSession[];
  tasks: AdminMentorshipTask[];
}

export async function fetchUserMentorship(userId: string): Promise<AdminMentorshipData> {
  const empty: AdminMentorshipData = { sessions: [], tasks: [] };
  try {
    const [sessRes, taskRes] = await Promise.all([
      supa
        .from('mentorship_sessions')
        .select('id, week, session_date, notes, action_plan, created_at')
        .eq('user_id', userId)
        .order('session_date', { ascending: false, nullsFirst: false })
        .limit(20),
      supa
        .from('mentorship_tasks')
        .select('id, week, title, completed, completed_at')
        .eq('user_id', userId)
        .order('week', { ascending: false })
        .limit(50),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessions = ((sessRes.data ?? []) as any[]).map((s: any) => ({
      id: s.id,
      week: s.week ?? null,
      session_date: s.session_date ?? null,
      notes: s.notes ?? null,
      action_plan: Array.isArray(s.action_plan) ? s.action_plan : [],
      created_at: s.created_at,
    })) as AdminMentorshipSession[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tasks = ((taskRes.data ?? []) as any[]).map((t: any) => ({
      id: t.id,
      week: t.week ?? null,
      title: t.title ?? '',
      completed: !!t.completed,
      completed_at: t.completed_at ?? null,
    })) as AdminMentorshipTask[];
    return { sessions, tasks };
  } catch (_) {
    return empty; // tables not yet migrated
  }
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

// ─── ML Dashboard (direct DB — no Edge Function dependency) ─────────────────

export async function fetchMlOverview(): Promise<MlOverview | null> {
  try {
    const { data } = await intel.intelligence().select(
      'engagement_score, churn_risk, churn_risk_label, cohort_id, cohort_label, ' +
      'anomaly_detected, affinity_binaural, affinity_breathing, ' +
      'affinity_meditation, affinity_journaling, affinity_lessons, affinity_mentor',
    );
    if (!data || data.length === 0) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = data as any[];

    const avg = (key: string) => {
      const vals = rows.map((r: any) => r[key]).filter((v: any) => v != null) as number[];
      return vals.length > 0 ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : 0;
    };

    // Cohort distribution
    const cohortDist: Record<string, number> = {};
    for (const r of rows) {
      const key = (r.cohort_label ?? r.cohort_id ?? 'desconocido') as string;
      cohortDist[key] = (cohortDist[key] ?? 0) + 1;
    }

    // Churn distribution
    const churnDist: Record<string, number> = {};
    for (const r of rows) {
      const key = (r.churn_risk_label ?? 'unknown') as string;
      churnDist[key] = (churnDist[key] ?? 0) + 1;
    }

    return {
      total: rows.length,
      averages: {
        engagement_score: avg('engagement_score'),
        churn_risk:       avg('churn_risk'),
      },
      cohort_distribution: cohortDist,
      churn_distribution:  churnDist,
      active_anomalies: rows.filter((r: any) => r.anomaly_detected).length,
      avg_affinities: {
        binaural:   avg('affinity_binaural'),
        breathing:  avg('affinity_breathing'),
        meditation: avg('affinity_meditation'),
        journaling: avg('affinity_journaling'),
        lessons:    avg('affinity_lessons'),
        mentor:     avg('affinity_mentor'),
      },
    };
  } catch (_) {
    return null; // user_intelligence table not yet migrated
  }
}

export async function fetchAtRiskUsers() {
  try {
    const { data } = await intel.intelligence()
      .select('user_id, churn_risk, churn_risk_label, days_since_last_act, engagement_score, anomaly_detected')
      .in('churn_risk_label', ['high', 'critical'])
      .order('churn_risk', { ascending: false })
      .limit(50);

    if (!data) return [];

    // Enrich with user names from user_progress
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = data as any[];
    const userIds = rows.map((r: any) => r.user_id).filter(Boolean);
    if (userIds.length === 0) return rows;

    const { data: progressData } = await supabase
      .from('user_progress')
      .select('user_id, name')
      .in('user_id', userIds);

    const nameMap: Record<string, string> = {};
    for (const p of (progressData ?? []) as Array<{ user_id: string; name: string }>) {
      nameMap[p.user_id] = p.name;
    }

    return rows.map((r: any) => ({ ...r, name: nameMap[r.user_id] ?? 'Usuario' }));
  } catch (_) {
    return []; // user_intelligence table not yet migrated
  }
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

// ─── ACTIVIDAD COMPLETA DEL CLIENTE (cierre de gap: el coach veía solo lo que dice) ──
// El audit de 2026-06-17 reveló que el dossier admin no leía las tablas de bienestar
// (hábitos, ayuno, cuerpo, nutrición, suplementos, journal, prácticas de wellness ni
// comunidad). Aquí están las queries — todas degradan a vacío si la tabla falta o
// la RLS bloquea (la RLS de bienestar es dueño+admin via is_admin → admin pasa).

export interface UserActivityBundle {
  habits:        ClientHabit[];
  habitLogs:     ClientHabitLog[];
  fasting:       ClientFasting[];
  body:          ClientBodyMeasurement[];
  nutrition:     ClientNutritionProfile | null;
  supplements:   ClientSupplementStack[];
  journal:       ClientJournalEntry[];
  wellness:      ClientWellnessSession[];
  posts:         ClientCommunityPost[];
  reactionsGiven:number;
  dmsSent:       number;
  dmLastActivity:string | null;
}

export interface ClientHabit {
  id: string; name: string; category: string | null; streak: number;
  best_streak: number; is_active: boolean; created_at: string;
}
export interface ClientHabitLog {
  habit_id: string; date: string; completed: boolean; notes: string | null;
}
export interface ClientFasting {
  id: string; type: string; target_hours: number; started_at: string;
  ended_at: string | null; completed: boolean; actual_hours: number | null; notes: string | null;
}
export interface ClientBodyMeasurement {
  id: string; weight_kg: number; height_cm: number | null; bmi: number | null;
  measured_at: string; notes: string | null;
}
export interface ClientNutritionProfile {
  diet_type: string; restrictions: string[] | null; allergies: string[] | null;
  goals: string[] | null; daily_cal_goal: number | null; updated_at: string;
}
export interface ClientSupplementStack {
  id: string; name: string; goal: string | null;
  supplements: Record<string, unknown>[] | null; is_active: boolean; created_at: string;
}
export interface ClientJournalEntry {
  id: string; content: string; entry_type: string | null;
  mood_score: number | null; created_at: string;
}
export interface ClientWellnessSession {
  id: string; type: string; session_name: string | null;
  duration_seconds: number; completed_at: string;
}
export interface ClientCommunityPost {
  id: string; content: string; type: string | null;
  likes_count: number; is_pinned: boolean; created_at: string;
}

async function safeSelect<T>(
  table: string, cols: string, build: (q: ReturnType<typeof supa.from>) => unknown, fallback: T,
): Promise<T> {
  try {
    const q = supa.from(table).select(cols);
    const built = build(q) as { then: (cb: (r: { data: T | null }) => void) => void };
    const res = (await (built as unknown as Promise<{ data: T | null }>));
    return (res.data ?? fallback) as T;
  } catch { return fallback; }
}

export async function fetchUserActivityBundle(userId: string): Promise<UserActivityBundle> {
  if (!userId) return emptyBundle();
  const [
    habits, habitLogs, fasting, body, nutrition, supplements,
    journal, wellness, posts, reactionsGiven, dmsSent, dmLast,
  ] = await Promise.all([
    safeSelect<ClientHabit[]>('habits',
      'id,name,category,streak,best_streak,is_active,created_at',
      (q) => q.eq('user_id', userId).order('is_active', { ascending: false }).order('created_at', { ascending: false }),
      [] as ClientHabit[]),
    safeSelect<ClientHabitLog[]>('habit_logs',
      'habit_id,date,completed,notes',
      (q) => q.eq('user_id', userId).order('date', { ascending: false }).limit(120),
      [] as ClientHabitLog[]),
    safeSelect<ClientFasting[]>('fasting_sessions',
      'id,type,target_hours,started_at,ended_at,completed,actual_hours,notes',
      (q) => q.eq('user_id', userId).order('started_at', { ascending: false }).limit(20),
      [] as ClientFasting[]),
    safeSelect<ClientBodyMeasurement[]>('body_measurements',
      'id,weight_kg,height_cm,bmi,measured_at,notes',
      (q) => q.eq('user_id', userId).order('measured_at', { ascending: false }).limit(30),
      [] as ClientBodyMeasurement[]),
    (async () => {
      try {
        const { data } = await supa.from('nutrition_profiles')
          .select('diet_type,restrictions,allergies,goals,daily_cal_goal,updated_at')
          .eq('user_id', userId).maybeSingle();
        return (data ?? null) as ClientNutritionProfile | null;
      } catch { return null; }
    })(),
    safeSelect<ClientSupplementStack[]>('supplement_stacks',
      'id,name,goal,supplements,is_active,created_at',
      (q) => q.eq('user_id', userId).order('is_active', { ascending: false }).order('created_at', { ascending: false }),
      [] as ClientSupplementStack[]),
    safeSelect<ClientJournalEntry[]>('journal_entries',
      'id,content,entry_type,mood_score,created_at',
      (q) => q.eq('user_id', userId).order('created_at', { ascending: false }).limit(25),
      [] as ClientJournalEntry[]),
    safeSelect<ClientWellnessSession[]>('wellness_sessions',
      'id,type,session_name,duration_seconds,completed_at',
      (q) => q.eq('user_id', userId).order('completed_at', { ascending: false }).limit(30),
      [] as ClientWellnessSession[]),
    safeSelect<ClientCommunityPost[]>('community_posts',
      'id,content,type,likes_count,is_pinned,created_at',
      (q) => q.eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      [] as ClientCommunityPost[]),
    // count de reacciones que el cliente DIO (engagement con peers)
    (async () => {
      try {
        const { count } = await supa.from('community_reactions')
          .select('id', { count: 'exact', head: true }).eq('user_id', userId);
        return (count ?? 0) as number;
      } catch { return 0; }
    })(),
    // DMs ENVIADOS (sin exponer contenido — solo señal de actividad)
    (async () => {
      try {
        const { count } = await supa.from('direct_messages')
          .select('id', { count: 'exact', head: true }).eq('sender_id', userId);
        return (count ?? 0) as number;
      } catch { return 0; }
    })(),
    // última actividad de DM (envío o recepción) — fecha solamente
    (async () => {
      try {
        const { data } = await supa.from('direct_messages')
          .select('created_at').or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        return ((data as { created_at?: string } | null)?.created_at ?? null) as string | null;
      } catch { return null; }
    })(),
  ]);

  return {
    habits, habitLogs, fasting, body, nutrition, supplements,
    journal, wellness, posts, reactionsGiven, dmsSent, dmLastActivity: dmLast,
  };
}

function emptyBundle(): UserActivityBundle {
  return {
    habits: [], habitLogs: [], fasting: [], body: [], nutrition: null, supplements: [],
    journal: [], wellness: [], posts: [], reactionsGiven: 0, dmsSent: 0, dmLastActivity: null,
  };
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
