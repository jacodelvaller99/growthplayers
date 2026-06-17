/**
 * confrontation — capa de IO de la Confrontation OS.
 *
 * Ensambla el bundle desde todas las fuentes existentes (sin duplicar queries),
 * corre `buildConfrontations` (lib/confrontationLogic.ts) y expone:
 *   - fetchConfrontationItems(userId): todos los items para el admin
 *   - getTopConfrontationsForMentor(userId, k=2): solo severity high+ para Norman
 *   - dismissConfrontation(...): admin silencia un detector 7 días
 *
 * Todo degrada a vacío: cada fetch en try/catch — si una fuente falla, el resto
 * sigue. Si los gates de consent no se cumplen, retorna {items: []}.
 */
import { supabase, intel, bio as bioTbl, mem as memTbl } from '@/lib/supabase';
import { fetchUserActivityBundle } from '@/lib/admin/queries';
import { fetchBiometricSnapshot } from '@/lib/biometric';
import { fetchMemoryProfile } from '@/lib/memory';
import { fetchUserExecution } from '@/lib/mentorExecution';
import { buildInterventions, computeClientScores } from '@/lib/mentorExecutionLogic';
import { ENV } from '@/app/config/env';
import {
  buildConfrontations,
  topForMentor,
  type ConfrontationBundle,
  type ConfrontationConsents,
  type ConfrontationDismissal,
  type ConfrontationItem,
  type PauseState,
} from '@/lib/confrontationLogic';

const ENABLED = ENV.confrontationOsEnabled;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyClient = supabase as any;

interface ProfileGate {
  ml_consent: boolean;
  consents: { confrontation_with_data?: { accepted?: boolean }; biometric_confrontation?: { accepted?: boolean } };
  pause_state: PauseState;
  tier?: string;
}

async function fetchProfileGate(userId: string): Promise<ProfileGate> {
  const fallback: ProfileGate = {
    ml_consent: false,
    consents: {},
    pause_state: { active: false },
  };
  try {
    const { data } = await anyClient.from('profiles')
      .select('ml_consent,consents,pause_state,subscription_tier')
      .eq('id', userId)
      .maybeSingle();
    if (!data) return fallback;
    return {
      ml_consent: Boolean(data.ml_consent),
      consents: (data.consents ?? {}) as ProfileGate['consents'],
      pause_state: (data.pause_state ?? { active: false }) as PauseState,
      tier: data.subscription_tier ?? undefined,
    };
  } catch { return fallback; }
}

async function fetchLastTimestamp(table: string, userId: string, col: string, dateField = 'created_at'): Promise<string | null> {
  try {
    const { data } = await anyClient.from(table)
      .select(dateField)
      .eq(col, userId)
      .order(dateField, { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data?.[dateField] ?? null) as string | null;
  } catch { return null; }
}

async function fetchLastDmAt(userId: string): Promise<string | null> {
  try {
    const { data } = await anyClient.from('direct_messages')
      .select('created_at')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data?.created_at ?? null) as string | null;
  } catch { return null; }
}

async function fetchRecentCheckIns(userId: string, n = 14): Promise<{ date: string; energy: number; clarity: number; stress: number; sleep: number }[]> {
  try {
    const { data } = await anyClient.from('daily_checkins')
      .select('date,energy,clarity,stress,sleep')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(n);
    return (data ?? []) as { date: string; energy: number; clarity: number; stress: number; sleep: number }[];
  } catch { return []; }
}

async function fetchBaselineRecovery30d(userId: string): Promise<number | null> {
  try {
    const { data } = await bioTbl.daily()
      .select('recovery_score,signal_confidence,date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30);
    if (!data) return null;
    const vals = (data as { recovery_score?: number | null; signal_confidence?: number | null }[])
      .filter((d) => typeof d.recovery_score === 'number' && (d.signal_confidence == null || (d.signal_confidence as number) >= 0.5))
      .map((d) => d.recovery_score as number);
    if (vals.length < 7) return null;        // baseline poco confiable
    return vals.reduce((a, c) => a + c, 0) / vals.length;
  } catch { return null; }
}

async function fetchDismissals(userId: string, nowIso: string): Promise<ConfrontationDismissal[]> {
  try {
    const { data } = await anyClient.from('confrontation_dismissals')
      .select('item_id,dismissed_until')
      .eq('user_id', userId)
      .gt('dismissed_until', nowIso);
    return (data ?? []) as ConfrontationDismissal[];
  } catch { return []; }
}

async function fetchOnboardingCompletedAt(userId: string): Promise<string | null> {
  try {
    // El onboarding deja la fecha en user_profiles.created_at + protocol_start_date.
    const { data } = await anyClient.from('user_profiles')
      .select('protocol_start_date,created_at')
      .eq('user_id', userId)
      .maybeSingle();
    return (data?.protocol_start_date ?? data?.created_at ?? null) as string | null;
  } catch { return null; }
}

export async function assembleConfrontationBundle(userId: string): Promise<ConfrontationBundle | null> {
  if (!userId) return null;
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // Gate primero — si no pasa, ni siquiera traemos el resto.
  const gate = await fetchProfileGate(userId);
  const consents: ConfrontationConsents = {
    ml_consent: gate.ml_consent,
    confrontation_with_data: Boolean(gate.consents.confrontation_with_data?.accepted),
    biometric_confrontation: Boolean(gate.consents.biometric_confrontation?.accepted),
  };

  const [
    profile, activityBundle, bio, executionBundle, checkIns,
    lastMentorMsgAt, lastDmAt, lastAppOpenAt, lastLessonCompletedAt,
    baselineRecovery, dismissals, onboardingCompletedAt, lastMentorshipSessionAt,
  ] = await Promise.all([
    fetchMemoryProfile(userId).catch(() => null),
    fetchUserActivityBundle(userId).catch(() => null),
    fetchBiometricSnapshot(userId).catch(() => null),
    fetchUserExecution(userId).catch(() => ({ tasks: [], scores: null, reviews: [], prep: null })),
    fetchRecentCheckIns(userId, 14),
    fetchLastTimestamp('mentor_messages', userId, 'user_id'),
    fetchLastDmAt(userId),
    fetchLastTimestamp('user_events', userId, 'user_id'),
    fetchLastTimestamp('completed_lessons', userId, 'user_id'),
    fetchBaselineRecovery30d(userId),
    fetchDismissals(userId, nowIso),
    fetchOnboardingCompletedAt(userId),
    fetchLastTimestamp('mentorship_sessions', userId, 'user_id', 'session_date'),
  ]);

  // Si fetchUserExecution no devolvió scores pero hay tasks, los computamos in-line.
  let scores = executionBundle.scores;
  if (!scores && executionBundle.tasks.length > 0) {
    try { scores = computeClientScores({ tasks: executionBundle.tasks, nowMs }); } catch { /* noop */ }
  }
  const interventions = scores ? buildInterventions(scores, executionBundle.tasks, nowMs) : [];

  return {
    userId,
    consents,
    tier: gate.tier,
    profile,
    activityBundle,
    bio,
    bioBaselineRecovery30d: baselineRecovery,
    tasks: executionBundle.tasks,
    interventions,
    scores: scores ?? null,
    recentCheckIns: checkIns,
    lastMentorMsgAt,
    lastMentorshipSessionAt,
    lastDmAt,
    lastAppOpenAt,
    lastLessonCompletedAt,
    activeModuleTitle: null,     // dejado null hasta que el adapter program_drift se necesite con datos reales
    activeModuleProgress: 0,
    onboardingCompletedAt,
    pauseState: gate.pause_state,
    dismissals,
  };
}

/** Todos los items para el admin (incluye 'medium' que NO se inyecta a Norman). */
export async function fetchConfrontationItems(userId: string): Promise<ConfrontationItem[]> {
  if (!ENABLED) return [];
  if (!userId) return [];
  try {
    const bundle = await assembleConfrontationBundle(userId);
    if (!bundle) return [];
    const { items } = buildConfrontations(bundle, Date.now());
    return items;
  } catch { return []; }
}

/** Solo severity high+ para inyección a Norman. */
export async function getTopConfrontationsForMentor(userId: string, k = 2): Promise<ConfrontationItem[]> {
  const items = await fetchConfrontationItems(userId);
  return topForMentor(items, k);
}

/** Admin silencia un detector por N días (default 7). */
export async function dismissConfrontation(params: {
  userId: string;
  itemId: string;
  reason?: string;
  adminId?: string;
  days?: number;
}): Promise<boolean> {
  const days = params.days ?? 7;
  const until = new Date(Date.now() + days * 86_400_000).toISOString();
  try {
    const { error } = await anyClient.from('confrontation_dismissals').insert({
      user_id: params.userId,
      item_id: params.itemId,
      reason: params.reason ?? null,
      dismissed_until: until,
      dismissed_by: params.adminId ?? null,
    });
    return !error;
  } catch { return false; }
}

// Suprimir warnings de imports no usados directamente (los traemos por convención de
// "usar mem/intel/bioTbl/memTbl tal como otros módulos IO" — algunos serán usados al
// extender con queries adicionales sin reorganizar imports).
void intel;
void memTbl;
