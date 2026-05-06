/**
 * calculate-intelligence — Supabase Edge Function
 *
 * Recalculates user_intelligence for one user or all users.
 * Called after event batches, and by pg_cron every 6 hours.
 *
 * Body: { user_id?: string, batch?: "all" }
 */

// deno-lint-ignore-file no-explicit-any
import { adminSupabase, json, corsHeaders } from '../_shared/supabase.ts';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS    =  7 * 24 * 60 * 60 * 1000;

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function getTimeSlot(hour: number): string {
  if (hour >= 5  && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// ─── Core calculation ─────────────────────────────────────────────────────────

async function calculateForUser(userId: string): Promise<void> {
  const now      = new Date();
  const d14ago   = new Date(now.getTime() - FOURTEEN_DAYS_MS).toISOString();
  const d7ago    = new Date(now.getTime() - SEVEN_DAYS_MS).toISOString();
  const prevWeek = new Date(now.getTime() - 2 * SEVEN_DAYS_MS).toISOString();

  // ── Fetch all needed data in parallel ────────────────────────────────────────
  const d3ago = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

  const [
    eventsResult,
    checkinsResult,
    wellnessResult,
    prevCheckinsResult,
    profileResult,
    biometricResult,
    biometricBaselineResult,
  ] = await Promise.all([
    adminSupabase
      .from('user_events')
      .select('event_type, screen, metadata, session_id, created_at')
      .eq('user_id', userId)
      .gte('created_at', d14ago)
      .order('created_at', { ascending: false }),

    adminSupabase
      .from('daily_checkins')
      .select('energy, clarity, stress, sleep, created_at')
      .eq('user_id', userId)
      .gte('created_at', d7ago),

    adminSupabase
      .from('wellness_sessions')
      .select('type, duration_seconds, completed_at')
      .eq('user_id', userId)
      .gte('completed_at', d7ago),

    adminSupabase
      .from('daily_checkins')
      .select('energy, clarity, stress')
      .eq('user_id', userId)
      .gte('created_at', prevWeek)
      .lt('created_at', d7ago),

    adminSupabase
      .from('profiles')
      .select('timezone, ml_consent')
      .eq('id', userId)
      .single(),

    // Last 3 days of wearable data
    adminSupabase
      .from('wearable_daily')
      .select('date, provider, recovery_score, hrv_ms, resting_hr, sleep_score')
      .eq('user_id', userId)
      .gte('date', d3ago)
      .order('date', { ascending: false }),

    // 7-day baseline for HRV anomaly detection
    adminSupabase
      .from('wearable_daily')
      .select('hrv_ms, resting_hr, recovery_score')
      .eq('user_id', userId)
      .gte('date', new Date(now.getTime() - SEVEN_DAYS_MS).toISOString().substring(0, 10))
      .order('date', { ascending: false }),
  ]);

  const events         = eventsResult.data ?? [];
  const checkins7d     = checkinsResult.data ?? [];
  const wellness7d     = wellnessResult.data ?? [];
  const prevCheckins   = prevCheckinsResult.data ?? [];
  const profile        = profileResult.data;
  const biometrics3d   = (biometricResult.data ?? []) as any[];
  const biometrics7d   = (biometricBaselineResult.data ?? []) as any[];

  if (!profile?.ml_consent) return; // Respect consent

  // ── Feature extraction ────────────────────────────────────────────────────────

  // Days active (unique days with at least 1 event) in last 14 days
  const uniqueDays14 = new Set(
    events.map((e: any) => e.created_at.substring(0, 10))
  ).size;

  const uniqueDays7 = new Set(
    events
      .filter((e: any) => new Date(e.created_at).getTime() > now.getTime() - SEVEN_DAYS_MS)
      .map((e: any) => e.created_at.substring(0, 10))
  ).size;

  // Last app open
  const appOpenEvents = events.filter((e: any) => e.event_type === 'app_open');
  const lastOpen      = appOpenEvents[0]?.created_at
    ? new Date(appOpenEvents[0].created_at)
    : null;
  const daysSinceOpen = lastOpen
    ? Math.floor((now.getTime() - lastOpen.getTime()) / 86400000)
    : 999;

  // Lessons
  const lessonCompletes = events.filter((e: any) => e.event_type === 'lesson_complete').length;
  const lessonStarts    = events.filter((e: any) => e.event_type === 'lesson_start').length;
  const lessonAbandons  = events.filter((e: any) => e.event_type === 'lesson_abandon').length;
  const abandonRate     = lessonStarts > 0 ? lessonAbandons / lessonStarts : 0;

  // Mentor messages
  const mentorMsgs7d = events.filter(
    (e: any) => e.event_type === 'chat_sent' &&
    new Date(e.created_at).getTime() > now.getTime() - SEVEN_DAYS_MS
  ).length;

  // Session duration (avg from app_background events)
  const sessionDurations = events
    .filter((e: any) => e.event_type === 'app_background' && e.metadata?.session_duration_ms)
    .map((e: any) => Number(e.metadata.session_duration_ms));
  const avgSessionMs = sessionDurations.length > 0
    ? sessionDurations.reduce((a: number, b: number) => a + b, 0) / sessionDurations.length
    : 0;

  // Wellness breakdown
  const wellnessBreakdown = {
    binaural:    wellness7d.filter((w: any) => w.type === 'binaural').length,
    breathing:   wellness7d.filter((w: any) => w.type === 'breathing').length,
    meditation:  wellness7d.filter((w: any) => w.type === 'meditation').length,
  };
  const totalWellness7d = wellness7d.length;

  // ── BIOMETRIC READINESS ───────────────────────────────────────────────────────
  const hasWearable = biometrics3d.length > 0;
  let biometricReadiness   = 50; // neutral default
  let biometricProvider: string | null = null;
  let biometricHrv: number | null = null;
  let biometricRestingHr: number | null = null;
  let biometricAnomalyType: string | null = null;

  if (hasWearable) {
    const recScores = biometrics3d
      .map((d: any) => d.recovery_score)
      .filter((s: any): s is number => s != null);
    biometricReadiness = recScores.length > 0
      ? Math.round(recScores.reduce((a: number, b: number) => a + b, 0) / recScores.length)
      : 50;
    biometricProvider  = biometrics3d[0]?.provider   ?? null;
    biometricHrv       = biometrics3d[0]?.hrv_ms     ?? null;
    biometricRestingHr = biometrics3d[0]?.resting_hr ?? null;

    // HRV anomaly: drop > 20% vs 7-day baseline
    const baselineHrvVals = biometrics7d
      .map((d: any) => d.hrv_ms)
      .filter((v: any): v is number => v != null);
    if (baselineHrvVals.length > 2 && biometricHrv != null) {
      const avgBaseHrv = baselineHrvVals.reduce((a: number, b: number) => a + b, 0) / baselineHrvVals.length;
      if (biometricHrv < avgBaseHrv * 0.80) biometricAnomalyType = 'biometric_stress';
    }

    // Resting HR anomaly: elevated > 10 bpm above baseline
    const baselineHrVals = biometrics7d
      .map((d: any) => d.resting_hr)
      .filter((v: any): v is number => v != null);
    if (!biometricAnomalyType && baselineHrVals.length > 2 && biometricRestingHr != null) {
      const avgBaseHr = baselineHrVals.reduce((a: number, b: number) => a + b, 0) / baselineHrVals.length;
      if (biometricRestingHr > avgBaseHr + 10) biometricAnomalyType = 'elevated_resting_hr';
    }
  }

  // ── 1. ENGAGEMENT SCORE (0–100) ───────────────────────────────────────────────
  let engagement =
    (uniqueDays14 / 14)          * 30 +   // 30% weight: daily active days
    (Math.min(lessonCompletes, 5) / 5) * 25 +   // 25%: lessons
    (Math.min(totalWellness7d, 7) / 7) * 20 +   // 20%: wellness
    (Math.min(checkins7d.length, 7) / 7) * 15 + // 15%: check-ins
    (Math.min(mentorMsgs7d, 10) / 10)    * 10;  // 10%: mentor

  engagement *= 100; // scale 0–100

  // Penalties
  if (daysSinceOpen >= 7)  engagement -= 30;
  else if (daysSinceOpen >= 3) engagement -= 15;

  engagement = clamp(Math.round(engagement), 0, 100);

  // Biometric engagement modifier (20% bonus/penalty when wearable connected)
  if (hasWearable && biometricReadiness >= 70) engagement = clamp(Math.round(engagement * 1.10), 0, 100);
  if (hasWearable && biometricReadiness <  30) engagement = clamp(Math.round(engagement * 0.95), 0, 100);

  // ── 2. CHURN RISK (0–1) ───────────────────────────────────────────────────────
  let churnLogit = 0;

  if      (daysSinceOpen >= 14) churnLogit += 0.80;
  else if (daysSinceOpen >= 7)  churnLogit += 0.45;
  else if (daysSinceOpen >= 3)  churnLogit += 0.20;

  // Engagement trend: compare this week vs previous
  const prevAvgEnergy    = prevCheckins.length > 0
    ? prevCheckins.reduce((s: number, c: any) => s + c.energy, 0) / prevCheckins.length : 5;
  const currAvgEnergy    = checkins7d.length > 0
    ? checkins7d.reduce((s: number, c: any) => s + c.energy, 0) / checkins7d.length : prevAvgEnergy;
  const energyDelta      = currAvgEnergy - prevAvgEnergy;

  if (energyDelta < -2) churnLogit += 0.25;

  if (abandonRate > 0.5)      churnLogit += 0.20;
  if (checkins7d.length === 0) churnLogit += 0.15;
  if (mentorMsgs7d === 0 && uniqueDays7 > 2) churnLogit += 0.10;
  if (uniqueDays7 === 0)      churnLogit += 0.20;

  // Biometric churn modifier: low readiness signals burnout / disengagement
  if (hasWearable && biometricReadiness < 30) churnLogit += 0.20;

  const churnRisk = clamp(parseFloat(sigmoid(churnLogit - 1.5).toFixed(3)), 0, 1);
  let churnLabel: string;
  if      (churnRisk >= 0.7) churnLabel = 'critical';
  else if (churnRisk >= 0.5) churnLabel = 'high';
  else if (churnRisk >= 0.3) churnLabel = 'medium';
  else                       churnLabel = 'low';

  const predictedChurnDate = churnRisk >= 0.5
    ? new Date(now.getTime() + (1 - churnRisk) * 7 * 86400000).toISOString().substring(0, 10)
    : null;

  // ── 3. CONTENT AFFINITY ────────────────────────────────────────────────────────
  const totalEvents7d = events.filter(
    (e: any) => new Date(e.created_at).getTime() > now.getTime() - SEVEN_DAYS_MS
  ).length;

  const affinity_binaural    = totalWellness7d > 0 ? wellnessBreakdown.binaural  / totalWellness7d : 0;
  const affinity_breathing   = totalWellness7d > 0 ? wellnessBreakdown.breathing / totalWellness7d : 0;
  const affinity_meditation  = totalWellness7d > 0 ? wellnessBreakdown.meditation / totalWellness7d : 0;
  const affinity_lessons     = lessonStarts > 0 ? Math.min(lessonCompletes / Math.max(lessonStarts, 1), 1) : 0;
  const affinity_mentor      = totalEvents7d > 0 ? Math.min(mentorMsgs7d / (uniqueDays7 * 2 + 1), 1) : 0;
  const affinity_journaling  = totalEvents7d > 0
    ? events.filter((e: any) => e.event_type === 'journal_write').length / Math.max(totalEvents7d, 1)
    : 0;

  // ── 4. OPTIMAL TIMING ─────────────────────────────────────────────────────────
  const hourCounts: Record<number, number> = {};
  for (const e of appOpenEvents) {
    const hr = new Date(e.created_at).getHours();
    hourCounts[hr] = (hourCounts[hr] ?? 0) + 1;
  }
  const topHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];
  const preferred_time = topHour ? getTimeSlot(Number(topHour[0])) : null;

  // Dominant module/tool
  const moduleCounts: Record<string, number> = {};
  const toolCounts: Record<string, number>   = {};
  for (const e of events) {
    if (e.metadata?.module_id) moduleCounts[e.metadata.module_id as string] = (moduleCounts[e.metadata.module_id as string] ?? 0) + 1;
    if (e.event_type === 'binaural_start') toolCounts['binaural'] = (toolCounts['binaural'] ?? 0) + 1;
    if (e.event_type === 'breathing_complete') toolCounts['breathing'] = (toolCounts['breathing'] ?? 0) + 1;
    if (e.event_type === 'meditation_complete') toolCounts['meditation'] = (toolCounts['meditation'] ?? 0) + 1;
    if (e.event_type === 'chat_sent') toolCounts['mentor'] = (toolCounts['mentor'] ?? 0) + 1;
  }
  const dominant_module = Object.entries(moduleCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  const dominant_tool   = Object.entries(toolCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  const preferred_duration = avgSessionMs > 0 ? Math.round(avgSessionMs / 60000) : null;

  // ── 5. NEXT BEST ACTION ───────────────────────────────────────────────────────
  let next_action: string;
  let next_action_reason: string;
  let next_action_urgency: string;

  const daysSinceCheckin = checkins7d.length > 0
    ? Math.floor((now.getTime() - new Date(checkins7d[0].created_at).getTime()) / 86400000)
    : 999;

  if (churnRisk >= 0.7) {
    next_action         = 'Vuelve — tu protocolo te necesita';
    next_action_reason  = `Llevas ${daysSinceOpen} días sin actividad. Norman tiene algo para ti.`;
    next_action_urgency = 'urgent';
  } else if (daysSinceCheckin >= 2) {
    next_action         = 'Haz tu check-in de hoy';
    next_action_reason  = 'Sin lectura del sistema Norman opera a ciegas.';
    next_action_urgency = 'high';
  } else if (hasWearable && biometricReadiness < 40) {
    next_action         = 'Tu cuerpo pide recuperación — binaural delta (20 min)';
    next_action_reason  = 'Recuperación baja detectada por tu wearable.';
    next_action_urgency = 'high';
  } else if (hasWearable && biometricReadiness < 60 && biometricHrv != null && biometricHrv < 30) {
    next_action         = 'Hoy mejor escuchar que estudiar — binaural theta';
    next_action_reason  = 'Sistema nervioso en recuperación activa.';
    next_action_urgency = 'normal';
  } else if (hasWearable && biometricReadiness < 60) {
    next_action         = 'Día moderado — breathing box 4×4 antes de tu lección';
    next_action_reason  = 'Recuperación moderada. Prepara tu sistema nervioso.';
    next_action_urgency = 'normal';
  } else if (hasWearable && biometricReadiness >= 70 && lessonCompletes > 0) {
    next_action         = 'Peak biométrico — momento ideal para la lección más densa';
    next_action_reason  = 'Recuperación óptima. Aprovecha este estado.';
    next_action_urgency = 'low';
  } else if (wellnessBreakdown.binaural === 0 && uniqueDays7 >= 3) {
    next_action         = 'Prueba 10 min de Alpha para tu foco';
    next_action_reason  = 'Las ondas Alpha mejoran claridad mental y creatividad.';
    next_action_urgency = 'normal';
  } else if (mentorMsgs7d === 0 && engagement < 60) {
    next_action         = 'Norman tiene algo para ti';
    next_action_reason  = 'Llevas una semana sin hablar con tu mentor.';
    next_action_urgency = engagement < 40 ? 'high' : 'normal';
  } else if (lessonCompletes > 0) {
    next_action         = 'Continúa tu módulo activo';
    next_action_reason  = 'Mantén el momentum — la consistencia es todo.';
    next_action_urgency = 'normal';
  } else {
    next_action         = 'Inicia tu primera lección';
    next_action_reason  = 'El conocimiento sin acción no transforma.';
    next_action_urgency = 'normal';
  }

  if (churnRisk >= 0.5 && next_action_urgency === 'normal') next_action_urgency = 'high';
  if (daysSinceOpen >= 5) next_action_urgency = 'high';

  // ── 6. ANOMALY DETECTION ──────────────────────────────────────────────────────
  let anomaly_detected = false;
  let anomaly_type: string | null = null;

  // mood_drop: energy dropped >3 points vs previous week
  if (energyDelta < -3 && checkins7d.length >= 2) {
    anomaly_detected = true;
    anomaly_type     = 'mood_drop';
  }

  // isolation: active user not messaging mentor for 7+ days
  if (!anomaly_detected && mentorMsgs7d === 0 && uniqueDays14 >= 5) {
    anomaly_detected = true;
    anomaly_type     = 'isolation';
  }

  // streak_break: had 5+ day streak, now 2+ days inactive
  const recentUnique = new Set(
    events.slice(0, 20).map((e: any) => e.created_at.substring(0, 10))
  );
  if (!anomaly_detected && recentUnique.size >= 5 && daysSinceOpen >= 2) {
    anomaly_detected = true;
    anomaly_type     = 'streak_break';
  }

  // biometric_stress / elevated_resting_hr (from wearable baseline comparison)
  if (!anomaly_detected && biometricAnomalyType) {
    anomaly_detected = true;
    anomaly_type     = biometricAnomalyType;
  }

  // ── 7. COHORT CLUSTERING ──────────────────────────────────────────────────────
  let cohort_label: string;
  let cohort_id: number;

  if (hasWearable && engagement > 60 && uniqueDays7 >= 5) {
    cohort_label = 'biohacker';      cohort_id = 7;
  } else if (engagement >= 75 && lessonCompletes >= 10) {
    cohort_label = 'high_performer'; cohort_id = 1;
  } else if (engagement >= 60 && uniqueDays7 >= 5) {
    cohort_label = 'achiever';       cohort_id = 2;
  } else if (affinity_binaural > 0.4 || affinity_breathing > 0.4) {
    cohort_label = 'wellness_seeker'; cohort_id = 3;
  } else if (lessonStarts >= 5 && abandonRate > 0.5) {
    cohort_label = 'passive_learner'; cohort_id = 4;
  } else if (churnRisk >= 0.5 || engagement < 30) {
    cohort_label = 'at_risk';        cohort_id = 6;
  } else {
    cohort_label = 'explorer';       cohort_id = 5;
  }

  // ── Upsert to user_intelligence ───────────────────────────────────────────────
  const featureCache = {
    days_active_14d:  uniqueDays14,
    days_active_7d:   uniqueDays7,
    lessons_7d:       lessonCompletes,
    wellness_7d:      totalWellness7d,
    checkins_7d:      checkins7d.length,
    abandon_rate:     parseFloat(abandonRate.toFixed(3)),
    avg_session_min:  preferred_duration,
    mentor_msgs_7d:   mentorMsgs7d,
    energy_delta:     parseFloat(energyDelta.toFixed(2)),
    days_since_open:  daysSinceOpen,
  };

  await adminSupabase.from('user_intelligence').upsert(
    {
      user_id: userId,
      engagement_score:     engagement,
      churn_risk:           churnRisk,
      churn_risk_label:     churnLabel,
      days_since_last_act:  daysSinceOpen,
      predicted_churn_date: predictedChurnDate,
      preferred_time,
      preferred_duration,
      dominant_module,
      dominant_tool,
      affinity_binaural:    parseFloat(affinity_binaural.toFixed(3)),
      affinity_breathing:   parseFloat(affinity_breathing.toFixed(3)),
      affinity_meditation:  parseFloat(affinity_meditation.toFixed(3)),
      affinity_journaling:  parseFloat(affinity_journaling.toFixed(3)),
      affinity_lessons:     parseFloat(affinity_lessons.toFixed(3)),
      affinity_mentor:      parseFloat(affinity_mentor.toFixed(3)),
      next_action,
      next_action_reason,
      next_action_urgency,
      anomaly_detected,
      anomaly_type:         anomaly_detected ? anomaly_type : null,
      anomaly_detected_at:  anomaly_detected ? now.toISOString() : null,
      cohort_id,
      cohort_label,
      biometric_readiness:  hasWearable ? biometricReadiness : null,
      biometric_provider:   biometricProvider,
      biometric_hrv_ms:     biometricHrv,
      biometric_resting_hr: biometricRestingHr,
      biometric_anomaly:    biometricAnomalyType,
      feature_cache:        featureCache,
      last_calculated_at:   now.toISOString(),
    },
    { onConflict: 'user_id' },
  );

  // Trigger smart notifications if anomaly or high churn
  if (anomaly_detected || churnRisk >= 0.7) {
    await adminSupabase.functions.invoke('smart-notifications', {
      body: { user_id: userId, trigger: 'anomaly_or_churn' },
    }).catch(() => {});
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { user_id, batch, all_users } = body;

    if (batch === 'all' || all_users === true) {
      // Process all users with ml_consent = true
      const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('ml_consent', true);

      if (profiles && profiles.length > 0) {
        // Process in parallel batches of 10
        const chunks: string[][] = [];
        for (let i = 0; i < profiles.length; i += 10) {
          chunks.push(profiles.slice(i, i + 10).map((p: any) => p.id));
        }
        for (const chunk of chunks) {
          await Promise.all(chunk.map(calculateForUser));
        }
      }

      return json({ ok: true, processed: profiles?.length ?? 0 });
    }

    if (user_id) {
      await calculateForUser(user_id);
      return json({ ok: true, user_id });
    }

    return json({ error: 'Missing user_id or batch' }, 400);
  } catch (err: any) {
    console.error('[calculate-intelligence]', err);
    return json({ error: err.message }, 500);
  }
});
