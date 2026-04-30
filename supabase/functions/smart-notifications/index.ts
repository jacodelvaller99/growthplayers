/**
 * smart-notifications — personalized push notification engine.
 *
 * Called by:
 *   1. pg_cron every hour (body: { scheduled: true })
 *   2. calculate-intelligence when churn > 0.7 or anomaly detected
 *      (body: { user_id, trigger: 'churn' | 'anomaly' })
 *
 * Priority hierarchy (highest wins per user per day):
 *   churn_critical > anomaly > streak_rescue > next_best_action > milestone
 *
 * Deduplication: one notification per user per type per day.
 * Delivery: Expo Push API (no-op if expo_push_token not set).
 */

import { corsHeaders, adminSupabase, json } from '../_shared/supabase.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserIntelligenceRow {
  user_id:              string;
  engagement_score:     number;
  churn_risk:           number;
  churn_risk_label:     string;
  days_since_last_act:  number;
  streak?:              number;
  anomaly_detected:     boolean;
  anomaly_type:         string | null;
  next_action:          string | null;
  next_action_urgency:  string;
  dominant_module:      string | null;
  preferred_time:       string | null;
}

interface ProfileRow {
  id:                   string;
  name:                 string;
  notification_hour:    number | null;
  ml_consent:           boolean;
  expo_push_token?:     string | null;
  timezone?:            string | null;
}

interface NotificationPayload {
  user_id:              string;
  type:                 string;
  title:                string;
  body:                 string;
  data?:                Record<string, unknown>;
  scheduled_for?:       string;
}

// ─── Notification Templates ───────────────────────────────────────────────────

function buildChurnCriticalNotification(name: string, daysMissed: number): { title: string; body: string } {
  const templates = [
    {
      title: `${name}, el Método Polaris te está esperando`,
      body:  `Llevas ${daysMissed} días sin practicar. Un Mercader Soberano no abandona su misión. 5 minutos hoy marcan la diferencia.`,
    },
    {
      title: `Tu progreso en riesgo, ${name}`,
      body:  `${daysMissed} días sin actividad. Los hábitos se construyen con consistencia — regresa hoy y retoma tu camino.`,
    },
    {
      title: `Norman te tiene un mensaje, ${name}`,
      body:  `Tu mentor nota tu ausencia. Abre la app y cuéntale cómo estás — él está listo para escucharte.`,
    },
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function buildAnomalyNotification(name: string, anomalyType: string | null): { title: string; body: string } {
  if (anomalyType === 'mood_drop') {
    return {
      title: `${name}, ¿cómo te sientes hoy?`,
      body:  'Tu energía ha bajado estos días. Norman quiere saber cómo estás — un check-in toma 30 segundos.',
    };
  }
  if (anomalyType === 'streak_break') {
    return {
      title: `Rescata tu racha, ${name}`,
      body:  'Tu consistencia es tu superpoder. Abre la app ahora y mantén vivo tu momentum.',
    };
  }
  if (anomalyType === 'isolation') {
    return {
      title: `Tu mentor te extraña, ${name}`,
      body:  'Hace tiempo que no hablas con Norman. Cuéntale cómo va tu semana.',
    };
  }
  return {
    title: `${name}, revisemos tu progreso juntos`,
    body:  'Hay algo interesante en tu actividad reciente. Abre la app y hablemos.',
  };
}

function buildStreakRescueNotification(name: string, streak: number): { title: string; body: string } {
  return {
    title: `¡${streak} días de racha en juego, ${name}!`,
    body:  `No rompas ahora. Haz tu check-in de hoy y mantén tu racha activa.`,
  };
}

function buildNextActionNotification(name: string, nextAction: string | null): { title: string; body: string } {
  if (nextAction === 'complete_checkin') {
    return {
      title: `Buen momento para tu check-in, ${name}`,
      body:  '¿Cómo va tu energía hoy? 30 segundos es todo lo que necesitas.',
    };
  }
  if (nextAction === 'continue_lesson') {
    return {
      title: `Continúa tu lección, ${name}`,
      body:  'Tienes una lección pendiente en el Método Polaris. ¡Sigue el camino!',
    };
  }
  if (nextAction === 'try_binaural') {
    return {
      title: `Boost mental en 10 minutos, ${name}`,
      body:  'Prueba una sesión de audio binaural. Foco, relajación o energía — tú eliges.',
    };
  }
  if (nextAction === 'journal') {
    return {
      title: `Reflexiona y crece, ${name}`,
      body:  'Escribe en tu diario hoy. La claridad llega cuando pones tus pensamientos en palabras.',
    };
  }
  return {
    title: `Tu siguiente paso, ${name}`,
    body:  'Abre LifeFlow y continúa construyendo tu mejor versión.',
  };
}

function buildMilestoneNotification(name: string, engagementScore: number): { title: string; body: string } {
  if (engagementScore >= 90) {
    return {
      title: `¡Eres imparable, ${name}! 🏆`,
      body:  'Tu nivel de engagement es excepcional. Comparte tu progreso con tu comunidad Polaris.',
    };
  }
  if (engagementScore >= 75) {
    return {
      title: `¡Excelente semana, ${name}!`,
      body:  'Tu consistencia está dando resultados. Sigue así — estás construyendo algo poderoso.',
    };
  }
  return {
    title: `Buen progreso, ${name}`,
    body:  'Cada día cuenta. Sigue practicando el Método Polaris.',
  };
}

// ─── Expo Push API ────────────────────────────────────────────────────────────

async function sendExpoPushNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<boolean> {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept':       'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to:    token,
        title,
        body,
        data,
        sound: 'default',
        priority: 'high',
      }),
    });

    if (!response.ok) {
      console.error('[smart-notifications] Expo push failed:', response.status);
      return false;
    }

    const result = await response.json();
    const status = result?.data?.status;
    return status === 'ok';
  } catch (err) {
    console.error('[smart-notifications] Expo push error:', err);
    return false;
  }
}

// ─── Deduplication Check ──────────────────────────────────────────────────────

async function hasNotificationTodayByType(userId: string, type: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data } = await adminSupabase
    .from('smart_notifications')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .gte('created_at', todayStart.toISOString())
    .limit(1);

  return (data?.length ?? 0) > 0;
}

// ─── Process Single User ──────────────────────────────────────────────────────

async function processUser(
  intel: UserIntelligenceRow,
  profile: ProfileRow,
): Promise<{ notified: boolean; type?: string }> {

  if (!profile.ml_consent) return { notified: false };

  const name = profile.name?.split(' ')[0] ?? 'amigo';

  // Determine notification type by priority
  let notifType: string | null = null;
  let title = '';
  let body  = '';
  let data: Record<string, unknown> = {};

  if (intel.churn_risk >= 0.7 && intel.days_since_last_act >= 3) {
    notifType = 'churn_critical';
    const tpl = buildChurnCriticalNotification(name, intel.days_since_last_act);
    title = tpl.title;
    body  = tpl.body;
    data  = { screen: 'comando', trigger: 'churn' };

  } else if (intel.anomaly_detected && intel.anomaly_type) {
    notifType = `anomaly_${intel.anomaly_type}`;
    const tpl = buildAnomalyNotification(name, intel.anomaly_type);
    title = tpl.title;
    body  = tpl.body;
    data  = { screen: 'mentor', trigger: 'anomaly', anomaly_type: intel.anomaly_type };

  } else if (intel.days_since_last_act === 0 && (intel.streak ?? 0) >= 3) {
    // Near end of day with active streak — rescue
    const hour = new Date().getUTCHours();
    if (hour >= 20) { // after 8pm UTC
      notifType = 'streak_rescue';
      const tpl = buildStreakRescueNotification(name, intel.streak!);
      title = tpl.title;
      body  = tpl.body;
      data  = { screen: 'comando', trigger: 'streak' };
    }

  } else if (intel.next_action && intel.next_action_urgency === 'high') {
    notifType = `nba_${intel.next_action}`;
    const tpl = buildNextActionNotification(name, intel.next_action);
    title = tpl.title;
    body  = tpl.body;
    data  = { screen: 'comando', trigger: 'nba', action: intel.next_action };

  } else if (intel.engagement_score >= 75) {
    notifType = 'milestone';
    const tpl = buildMilestoneNotification(name, intel.engagement_score);
    title = tpl.title;
    body  = tpl.body;
    data  = { screen: 'perfil', trigger: 'milestone' };
  }

  if (!notifType) return { notified: false };

  // Dedup check
  const alreadySent = await hasNotificationTodayByType(intel.user_id, notifType);
  if (alreadySent) return { notified: false };

  // Log notification to DB (regardless of push delivery)
  const notifRow: NotificationPayload = {
    user_id: intel.user_id,
    type:    notifType,
    title,
    body,
    data,
  };

  const { error: insertErr } = await adminSupabase
    .from('smart_notifications')
    .insert(notifRow);

  if (insertErr) {
    console.error('[smart-notifications] insert error:', insertErr);
  }

  // Send push if token available
  if (profile.expo_push_token) {
    await sendExpoPushNotification(profile.expo_push_token, title, body, data);
  }

  return { notified: true, type: notifType };
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

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch { /* scheduled call may have empty body */ }

  const { scheduled, user_id: singleUserId, trigger } = body as {
    scheduled?:   boolean;
    user_id?:     string;
    trigger?:     string;
  };

  const results: Array<{ user_id: string; notified: boolean; type?: string }> = [];

  if (singleUserId && trigger) {
    // ── Triggered call for a single user (from calculate-intelligence) ────────
    const { data: intel } = await adminSupabase
      .from('user_intelligence')
      .select('*')
      .eq('user_id', singleUserId)
      .single();

    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('id, name, notification_hour, ml_consent, expo_push_token, timezone')
      .eq('id', singleUserId)
      .single();

    if (intel && profile) {
      const result = await processUser(intel as UserIntelligenceRow, profile as ProfileRow);
      results.push({ user_id: singleUserId, ...result });
    }

  } else if (scheduled) {
    // ── Hourly scheduled sweep: process all users ─────────────────────────────
    // Process in pages to avoid memory pressure
    const PAGE_SIZE = 100;
    let offset = 0;

    while (true) {
      const { data: users, error: usersErr } = await adminSupabase
        .from('user_intelligence')
        .select(`
          user_id,
          engagement_score,
          churn_risk,
          churn_risk_label,
          days_since_last_act,
          anomaly_detected,
          anomaly_type,
          next_action,
          next_action_urgency,
          dominant_module,
          preferred_time
        `)
        .range(offset, offset + PAGE_SIZE - 1);

      if (usersErr || !users || users.length === 0) break;

      const userIds = users.map((u) => u.user_id);

      const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('id, name, notification_hour, ml_consent, expo_push_token, timezone')
        .in('id', userIds);

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      // Respect preferred notification hour — only send within 1 hour of preferred time
      const currentHour = new Date().getUTCHours();

      for (const intel of users as UserIntelligenceRow[]) {
        const profile = profileMap.get(intel.user_id) as ProfileRow | undefined;
        if (!profile) continue;

        const prefHour = profile.notification_hour ?? 9; // default 9am
        const hourDiff = Math.abs(currentHour - prefHour);
        // Only send in the preferred window (±1h), or for critical churn anytime
        const isPreferredWindow = hourDiff <= 1 || hourDiff >= 23;
        const isCritical = intel.churn_risk >= 0.8;
        if (!isPreferredWindow && !isCritical) continue;

        try {
          const result = await processUser(intel, profile);
          if (result.notified) {
            results.push({ user_id: intel.user_id, ...result });
          }
        } catch (err) {
          console.error(`[smart-notifications] Error for user ${intel.user_id}:`, err);
        }
      }

      if (users.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  } else {
    return json({ error: 'Provide either { scheduled: true } or { user_id, trigger }' }, 400, origin);
  }

  return json({
    success:    true,
    processed:  results.length,
    notified:   results.filter((r) => r.notified).length,
    results,
  }, 200, origin);
});
