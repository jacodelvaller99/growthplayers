/**
 * coachIntelligence — IO degradable de Coach Intelligence v2.
 *
 * Ensambla en paralelo TODO lo que el dossier admin ya consulta (sin nuevas
 * queries duplicadas) y pasa el bundle a la lógica pura (`coachIntelligenceLogic`).
 * Cada fuente cae a vacío de forma silenciosa-pero-trazable (logSilentError).
 *
 * No hay tablas nuevas. No hay edge functions nuevas. No hay handoffs nuevos.
 * Esto es 100% cómputo cliente sobre datos que ya existen.
 */

import { logSilentError } from '@/lib/observability';
import { intel, supabase } from '@/lib/supabase';
import { fetchMemoryProfile } from '@/lib/memory';
import { fetchUserExecution } from '@/lib/mentorExecution';
import { fetchBiometricSnapshot } from '@/lib/biometric';
import {
  fetchConfrontationItems,
  getTopConfrontationsForMentor,
} from '@/lib/confrontation';
import {
  computeCoachIntelligence,
  type CoachBundle,
  type CoachIntelligence,
} from '@/lib/coachIntelligenceLogic';
import type { UserIntelligence } from '@/hooks/useUserIntelligence';

// Cliente sin tipar para tablas de schema dinámico (mensajes/checkins) — la
// estricta solo nos estorbaría aquí (lecturas read-only y agregaciones).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyClient = supabase as any;

// ─── Helpers de tiempo ─────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isoDaysAgo(days: number, nowMs: number): string {
  return new Date(nowMs - days * MS_PER_DAY).toISOString();
}

function dateDaysAgo(days: number, nowMs: number): string {
  return new Date(nowMs - days * MS_PER_DAY).toISOString().slice(0, 10);
}

// ─── Sub-fetchers (degradables, devuelven defaults si fallan) ─────────────────

async function fetchIntelligenceCache(userId: string): Promise<UserIntelligence | null> {
  try {
    const { data, error } = await intel.intelligence().select('*').eq('user_id', userId).maybeSingle();
    if (error) { logSilentError('coach.intelligence', error); return null; }
    return (data ?? null) as UserIntelligence | null;
  } catch (e) {
    logSilentError('coach.intelligence', e);
    return null;
  }
}

interface MessageStats {
  user_turns_7d: number;
  user_turns_prev: number;
  days_since_last_message: number;
}

async function fetchMessageStats(userId: string, nowMs: number): Promise<MessageStats> {
  const empty: MessageStats = { user_turns_7d: 0, user_turns_prev: 0, days_since_last_message: Infinity };
  try {
    const since14 = isoDaysAgo(14, nowMs);
    const { data, error } = await anyClient
      .from('mentor_messages')
      .select('role, created_at')
      .eq('user_id', userId)
      .eq('role', 'user')
      .gte('created_at', since14)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) { logSilentError('coach.messageStats', error); return empty; }

    const rows = (data ?? []) as Array<{ created_at: string }>;
    const since7Ms = nowMs - 7 * MS_PER_DAY;
    const since14Ms = nowMs - 14 * MS_PER_DAY;
    let turns7 = 0;
    let turnsPrev = 0;
    let lastMs = -Infinity;
    for (const r of rows) {
      const t = Date.parse(r.created_at);
      if (Number.isNaN(t)) continue;
      if (t > lastMs) lastMs = t;
      if (t >= since7Ms) turns7 += 1;
      else if (t >= since14Ms) turnsPrev += 1;
    }
    const daysSince = lastMs > 0 ? Math.floor((nowMs - lastMs) / MS_PER_DAY) : Infinity;
    return { user_turns_7d: turns7, user_turns_prev: turnsPrev, days_since_last_message: daysSince };
  } catch (e) {
    logSilentError('coach.messageStats', e);
    return empty;
  }
}

interface CheckinStats {
  checkin_energy_7d: number | null;
  checkin_energy_prev: number | null;
  checkin_count_7d: number;
  checkin_count_prev: number;
  current_streak_days: number;
}

async function fetchCheckinStats(userId: string, nowMs: number): Promise<CheckinStats> {
  const empty: CheckinStats = {
    checkin_energy_7d: null, checkin_energy_prev: null,
    checkin_count_7d: 0, checkin_count_prev: 0, current_streak_days: 0,
  };
  try {
    const since14 = dateDaysAgo(14, nowMs);
    const { data, error } = await anyClient
      .from('daily_checkins')
      .select('date, energy')
      .eq('user_id', userId)
      .gte('date', since14)
      .order('date', { ascending: false })
      .limit(60);
    if (error) { logSilentError('coach.checkinStats', error); return empty; }

    const rows = (data ?? []) as Array<{ date: string; energy: number | null }>;
    const today = dateDaysAgo(0, nowMs);
    const since7 = dateDaysAgo(7, nowMs);

    let e7sum = 0, e7cnt = 0, ePrevSum = 0, ePrevCnt = 0;
    let c7 = 0, cPrev = 0;
    const dateSet = new Set<string>();
    for (const r of rows) {
      dateSet.add(r.date);
      const en = typeof r.energy === 'number' ? r.energy : null;
      if (r.date >= since7 && r.date <= today) {
        c7 += 1;
        if (en != null) { e7sum += en; e7cnt += 1; }
      } else if (r.date >= since14 && r.date < since7) {
        cPrev += 1;
        if (en != null) { ePrevSum += en; ePrevCnt += 1; }
      }
    }

    // Streak: días consecutivos terminados HOY o AYER con check-in.
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = dateDaysAgo(i, nowMs);
      if (dateSet.has(d)) streak += 1;
      else if (i === 0) continue; // permite que hoy aún no tenga check-in
      else break;
    }

    return {
      checkin_energy_7d: e7cnt > 0 ? e7sum / e7cnt : null,
      checkin_energy_prev: ePrevCnt > 0 ? ePrevSum / ePrevCnt : null,
      checkin_count_7d: c7,
      checkin_count_prev: cPrev,
      current_streak_days: streak,
    };
  } catch (e) {
    logSilentError('coach.checkinStats', e);
    return empty;
  }
}

// ─── Bundle assembly ──────────────────────────────────────────────────────────

export async function assembleCoachBundle(
  userId: string,
  nowMs: number = Date.now(),
): Promise<CoachBundle> {
  if (!userId) {
    return {
      intelligence: null, memory: null, execution: null,
      topConfrontation: null, confrontation_high_count: 0, biometric: null,
      checkin_energy_7d: null, checkin_energy_prev: null,
      checkin_count_7d: 0, checkin_count_prev: 0, current_streak_days: 0,
      user_turns_7d: 0, user_turns_prev: 0, days_since_last_message: Infinity,
      overdue_count: 0, open_tasks_count: 0,
      completed_tasks_7d: 0, completed_tasks_prev: 0,
    };
  }

  const [
    intelligence,
    memory,
    execution,
    biometric,
    topItems,
    allItems,
    messageStats,
    checkinStats,
  ] = await Promise.all([
    fetchIntelligenceCache(userId),
    fetchMemoryProfile(userId).catch((e) => { logSilentError('coach.memory', e); return null; }),
    fetchUserExecution(userId).catch((e) => {
      logSilentError('coach.execution', e);
      return { tasks: [], scores: null, reviews: [], prep: null };
    }),
    fetchBiometricSnapshot(userId).catch((e) => {
      logSilentError('coach.biometric', e);
      return { series: [], latestInsight: null, connections: [] };
    }),
    getTopConfrontationsForMentor(userId, 1).catch((e) => { logSilentError('coach.confTop', e); return []; }),
    fetchConfrontationItems(userId).catch((e) => { logSilentError('coach.confAll', e); return []; }),
    fetchMessageStats(userId, nowMs),
    fetchCheckinStats(userId, nowMs),
  ]);

  // Derivadas de execution (puro conteo).
  const tasks = execution.tasks ?? [];
  const since7Ms = nowMs - 7 * MS_PER_DAY;
  const since14Ms = nowMs - 14 * MS_PER_DAY;
  let overdue = 0, openTasks = 0, comp7 = 0, compPrev = 0;
  for (const t of tasks) {
    const st = t.status ?? 'not_started';
    if (st === 'completed') {
      const cMs = t.completed_at ? Date.parse(t.completed_at) : NaN;
      if (!Number.isNaN(cMs)) {
        if (cMs >= since7Ms) comp7 += 1;
        else if (cMs >= since14Ms) compPrev += 1;
      }
    } else if (st !== 'canceled' && st !== 'blocked' && st !== 'avoided') {
      openTasks += 1;
      if (t.due_date) {
        const due = Date.parse(t.due_date);
        if (!Number.isNaN(due) && due < nowMs) overdue += 1;
      }
    }
  }

  const highCount = allItems.filter((i) => i.severity === 'high' || i.severity === 'critical').length;

  return {
    intelligence,
    memory,
    execution: execution.scores ?? null,
    topConfrontation: topItems[0] ?? null,
    confrontation_high_count: highCount,
    biometric: biometric.latestInsight ?? null,
    checkin_energy_7d: checkinStats.checkin_energy_7d,
    checkin_energy_prev: checkinStats.checkin_energy_prev,
    checkin_count_7d: checkinStats.checkin_count_7d,
    checkin_count_prev: checkinStats.checkin_count_prev,
    current_streak_days: checkinStats.current_streak_days,
    user_turns_7d: messageStats.user_turns_7d,
    user_turns_prev: messageStats.user_turns_prev,
    days_since_last_message: messageStats.days_since_last_message,
    overdue_count: overdue,
    open_tasks_count: openTasks,
    completed_tasks_7d: comp7,
    completed_tasks_prev: compPrev,
  };
}

/** Composición end-to-end para una pantalla admin (IO + lógica pura). */
export async function fetchCoachIntelligence(
  userId: string,
  nowMs: number = Date.now(),
): Promise<{ bundle: CoachBundle; ci: CoachIntelligence }> {
  const bundle = await assembleCoachBundle(userId, nowMs);
  const ci = computeCoachIntelligence(bundle);
  return { bundle, ci };
}
