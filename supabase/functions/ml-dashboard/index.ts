/**
 * ml-dashboard — admin analytics endpoint.
 *
 * ACCESS: service_role or is_admin = true only.
 * Returns aggregated ML metrics across all users for the admin dashboard.
 *
 * Routes (all POST):
 *   { action: 'overview' }        — cohort distribution, avg scores, churn breakdown
 *   { action: 'user_detail', user_id } — single user's full intelligence record
 *   { action: 'at_risk_users' }   — users with churn_risk >= 0.6, sorted desc
 *   { action: 'engagement_trends', days? } — daily avg engagement over N days
 *   { action: 'top_affinities' }  — per-module affinity averages across all users
 *   { action: 'anomaly_report' }  — active anomalies by type
 */

import { corsHeaders, adminSupabase, json } from '../_shared/supabase.ts';

// ─── Auth Guard ───────────────────────────────────────────────────────────────

async function isAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader) return false;

  // Allow service_role key (header will equal the key itself — not Bearer)
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (authHeader === serviceRoleKey || authHeader === `Bearer ${serviceRoleKey}`) {
    return true;
  }

  // Otherwise validate JWT and check is_admin flag
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await adminSupabase.auth.getUser(token);

  if (error || !user) return false;

  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return profile?.is_admin === true;
}

// ─── Action Handlers ──────────────────────────────────────────────────────────

async function getOverview() {
  const { data: intel, error } = await adminSupabase
    .from('user_intelligence')
    .select(`
      engagement_score,
      churn_risk,
      churn_risk_label,
      cohort_label,
      anomaly_detected,
      affinity_binaural,
      affinity_breathing,
      affinity_meditation,
      affinity_journaling,
      affinity_lessons,
      affinity_mentor
    `);

  if (error || !intel) return { error: error?.message };

  const total = intel.length;
  if (total === 0) return { total: 0 };

  // Cohort distribution
  const cohortCounts: Record<string, number> = {};
  // Churn distribution
  const churnCounts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  // Averages
  let sumEngagement = 0, sumChurn = 0;
  let anomalyCount  = 0;
  const affinityTotals = {
    binaural: 0, breathing: 0, meditation: 0,
    journaling: 0, lessons: 0, mentor: 0,
  };

  for (const row of intel) {
    sumEngagement += row.engagement_score ?? 0;
    sumChurn      += row.churn_risk ?? 0;
    if (row.anomaly_detected) anomalyCount++;

    const cohort = row.cohort_label ?? 'unknown';
    cohortCounts[cohort] = (cohortCounts[cohort] ?? 0) + 1;

    const churnLabel = row.churn_risk_label ?? 'low';
    churnCounts[churnLabel] = (churnCounts[churnLabel] ?? 0) + 1;

    affinityTotals.binaural    += row.affinity_binaural    ?? 0;
    affinityTotals.breathing   += row.affinity_breathing   ?? 0;
    affinityTotals.meditation  += row.affinity_meditation  ?? 0;
    affinityTotals.journaling  += row.affinity_journaling  ?? 0;
    affinityTotals.lessons     += row.affinity_lessons     ?? 0;
    affinityTotals.mentor      += row.affinity_mentor      ?? 0;
  }

  return {
    total,
    averages: {
      engagement_score: Math.round(sumEngagement / total),
      churn_risk:       Math.round((sumChurn / total) * 1000) / 1000,
    },
    cohort_distribution: cohortCounts,
    churn_distribution:  churnCounts,
    active_anomalies:    anomalyCount,
    avg_affinities: {
      binaural:   Math.round((affinityTotals.binaural   / total) * 100) / 100,
      breathing:  Math.round((affinityTotals.breathing  / total) * 100) / 100,
      meditation: Math.round((affinityTotals.meditation / total) * 100) / 100,
      journaling: Math.round((affinityTotals.journaling / total) * 100) / 100,
      lessons:    Math.round((affinityTotals.lessons    / total) * 100) / 100,
      mentor:     Math.round((affinityTotals.mentor     / total) * 100) / 100,
    },
  };
}

async function getUserDetail(userId: string) {
  const [intelRes, profileRes, memoriesRes, notificationsRes] = await Promise.all([
    adminSupabase
      .from('user_intelligence')
      .select('*')
      .eq('user_id', userId)
      .single(),
    adminSupabase
      .from('profiles')
      .select('id, name, email, created_at, timezone, ml_consent, is_admin')
      .eq('id', userId)
      .single(),
    adminSupabase
      .from('mentor_memories')
      .select('id, content, memory_type, importance, created_at')
      .eq('user_id', userId)
      .order('importance', { ascending: false })
      .limit(5),
    adminSupabase
      .from('smart_notifications')
      .select('type, title, created_at, delivered')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  return {
    profile:          profileRes.data,
    intelligence:     intelRes.data,
    top_memories:     memoriesRes.data ?? [],
    recent_notifications: notificationsRes.data ?? [],
  };
}

async function getAtRiskUsers(limit = 50) {
  const { data, error } = await adminSupabase
    .from('user_intelligence')
    .select(`
      user_id,
      churn_risk,
      churn_risk_label,
      days_since_last_act,
      engagement_score,
      anomaly_detected,
      anomaly_type,
      last_calculated_at
    `)
    .gte('churn_risk', 0.6)
    .order('churn_risk', { ascending: false })
    .limit(limit);

  if (error) return { error: error.message };

  // Join with profiles for names
  const userIds = (data ?? []).map((u) => u.user_id);
  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('id, name, email')
    .in('id', userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return {
    count: data?.length ?? 0,
    users: (data ?? []).map((u) => ({
      ...u,
      name:  profileMap.get(u.user_id)?.name ?? null,
      email: profileMap.get(u.user_id)?.email ?? null,
    })),
  };
}

async function getEngagementTrends(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await adminSupabase
    .from('user_events')
    .select('created_at, user_id')
    .eq('event_type', 'app_open')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true });

  if (error || !data) return { error: error?.message, trends: [] };

  // Aggregate by day: DAU
  const dauMap: Record<string, Set<string>> = {};
  for (const event of data) {
    const day = event.created_at.slice(0, 10); // YYYY-MM-DD
    if (!dauMap[day]) dauMap[day] = new Set();
    dauMap[day].add(event.user_id);
  }

  const trends = Object.entries(dauMap)
    .map(([date, users]) => ({ date, dau: users.size }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { trends, days };
}

async function getTopAffinities() {
  const { data, error } = await adminSupabase
    .from('user_intelligence')
    .select(
      'affinity_binaural, affinity_breathing, affinity_meditation, ' +
      'affinity_journaling, affinity_lessons, affinity_mentor',
    );

  if (error || !data || data.length === 0) return { error: error?.message };

  const totals = { binaural: 0, breathing: 0, meditation: 0, journaling: 0, lessons: 0, mentor: 0 };
  const n = data.length;

  for (const row of data) {
    totals.binaural   += row.affinity_binaural    ?? 0;
    totals.breathing  += row.affinity_breathing   ?? 0;
    totals.meditation += row.affinity_meditation  ?? 0;
    totals.journaling += row.affinity_journaling  ?? 0;
    totals.lessons    += row.affinity_lessons     ?? 0;
    totals.mentor     += row.affinity_mentor      ?? 0;
  }

  const averages = Object.fromEntries(
    Object.entries(totals).map(([k, v]) => [k, Math.round((v / n) * 100) / 100]),
  );

  // Rank by popularity
  const ranked = Object.entries(averages)
    .sort(([, a], [, b]) => b - a)
    .map(([module, avg], i) => ({ rank: i + 1, module, avg_affinity: avg }));

  return { total_users: n, ranked };
}

async function getAnomalyReport() {
  const { data, error } = await adminSupabase
    .from('user_intelligence')
    .select('user_id, anomaly_type, anomaly_detected_at, engagement_score, churn_risk')
    .eq('anomaly_detected', true)
    .order('anomaly_detected_at', { ascending: false });

  if (error) return { error: error.message };

  const byType: Record<string, number> = {};
  for (const row of (data ?? [])) {
    const t = row.anomaly_type ?? 'unknown';
    byType[t] = (byType[t] ?? 0) + 1;
  }

  return {
    total_anomalies: data?.length ?? 0,
    by_type: byType,
    recent: (data ?? []).slice(0, 20),
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') ?? undefined;

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin);
  }

  // Auth guard
  const authHeader = req.headers.get('authorization');
  const authorized = await isAdmin(authHeader);
  if (!authorized) {
    return json({ error: 'Unauthorized — admin access required' }, 403, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, origin);
  }

  const { action, user_id, days, limit } = body as {
    action:   string;
    user_id?: string;
    days?:    number;
    limit?:   number;
  };

  switch (action) {
    case 'overview':
      return json(await getOverview(), 200, origin);

    case 'user_detail':
      if (!user_id) return json({ error: 'user_id required' }, 400, origin);
      return json(await getUserDetail(user_id), 200, origin);

    case 'at_risk_users':
      return json(await getAtRiskUsers(limit), 200, origin);

    case 'engagement_trends':
      return json(await getEngagementTrends(days), 200, origin);

    case 'top_affinities':
      return json(await getTopAffinities(), 200, origin);

    case 'anomaly_report':
      return json(await getAnomalyReport(), 200, origin);

    default:
      return json(
        {
          error: 'Unknown action',
          available: ['overview', 'user_detail', 'at_risk_users', 'engagement_trends', 'top_affinities', 'anomaly_report'],
        },
        400,
        origin,
      );
  }
});
