/**
 * confrontationLogic — motor PURO "DIJO vs HIZO".
 *
 * Cada detector compara una afirmación EXPLÍCITA del cliente (commitment, focus,
 * checkin) con conducta REAL (habits, wellness, biometrics, tasks) y emite un
 * ConfrontationItem con evidencia citable. Norman cita el dato literal — no
 * re-infiere. Si severity >= 'high', Norman puede abrir la sesión confrontando.
 *
 * Reglas no negociables (adversarialmente verificadas):
 *  1. NUNCA confrontar sin consents.confrontation_with_data (+ biometric para STATE).
 *  2. NUNCA confrontar un compromiso que el cliente no acordó (regex de obligación
 *     fuerte o strength='explicit'; el resto se silencia).
 *  3. NUNCA inferir conducta sensible (peso, dieta, comunidad) — esos detectores
 *     se cortaron por riesgo legal/ético.
 *  4. SEGURIDAD/crisis siempre prevalece — el motor respeta pause_state y
 *     recurring_blockers de crisis/duelo.
 *
 * Decisión de release: detectores STATE (cuerpo) están CAPADOS a 'medium' hasta
 * revisión clínica — no entran a inyección automática a Norman, solo a admin.
 *
 * Pure: sin IO, sin React, sin Supabase. La capa IO vive en lib/confrontation.ts.
 */
import type {
  ClientHabit,
  ClientHabitLog,
  UserActivityBundle,
} from '@/lib/admin/queries';
import type { MemoryProfile } from '@/lib/memoryLogic';
import type { BiometricSnapshot } from '@/lib/biometric';
import type { ClientScores, InterventionItem, MentorTask, TaskPriority } from '@/lib/mentorExecutionLogic';
import { deriveStatus } from '@/lib/mentorExecutionLogic';

// ─── Tipos públicos ──────────────────────────────────────────────────────────────
export type ConfrontationDimension = 'state' | 'commitments' | 'behavior' | 'engagement';

export interface CheckInLike {
  date: string;
  energy: number;
  clarity: number;
  stress: number;
  sleep: number;
}

export interface ConfrontationConsents {
  /** Gate global de inteligencia/tracking — flag ml_consent del perfil. */
  ml_consent: boolean;
  /** Gate específico: el cliente firmó "Norman puede confrontarme con datos". */
  confrontation_with_data: boolean;
  /** Gate adicional para detectores STATE (cuerpo/wearable). */
  biometric_confrontation: boolean;
}

export interface ConfrontationEvidence {
  /** Lo que el cliente DIJO — null si la fricción es por ausencia pura. */
  said: { text: string; source: string; source_date?: string } | null;
  /** Lo que el cliente HIZO (o no hizo). */
  did: { value: string; detail: string };
  /** Métrica resumida de la brecha. */
  gap_metric: {
    summary: string;
    mismatch_days?: number;
    days_silent?: number;
    days_gap?: number;
    untracked_count?: number;
    channels_silent?: string[];
    count?: number;
  };
}

export interface ConfrontationItem {
  id: string;
  dimension: ConfrontationDimension;
  severity: TaskPriority;       // 'low' | 'medium' | 'high' | 'critical'
  evidence: ConfrontationEvidence;
  /** Sugerencia LITERAL para Norman (no genérica). */
  confrontation_prompt: string;
  skipped: boolean;
  skip_reason?: string;
}

export interface PauseState {
  active: boolean;
  until?: string;
  reason?: string;
}

export interface ConfrontationDismissal {
  item_id: string;
  dismissed_until: string;
}

export interface ConfrontationBundle {
  userId: string;
  consents: ConfrontationConsents;
  /** Tier de suscripción para diferencial de prompt (hoy: tono uniforme). */
  tier?: string;
  profile: MemoryProfile | null;
  activityBundle: UserActivityBundle | null;
  bio: BiometricSnapshot | null;
  bioBaselineRecovery30d: number | null;
  tasks: MentorTask[];
  interventions: InterventionItem[];
  scores: ClientScores | null;
  recentCheckIns: CheckInLike[];
  lastMentorMsgAt: string | null;
  lastMentorshipSessionAt: string | null;
  lastDmAt: string | null;
  lastAppOpenAt: string | null;
  lastLessonCompletedAt: string | null;
  activeModuleTitle: string | null;
  activeModuleProgress: number;
  onboardingCompletedAt: string | null;
  pauseState: PauseState;
  dismissals: ConfrontationDismissal[];
}

export interface BuildResult {
  items: ConfrontationItem[];
  skipped: { id: string; reason: string }[];
}

// ─── Helpers internos ────────────────────────────────────────────────────────────
const DAY_MS = 86_400_000;
const SEVERITY_RANK: Record<TaskPriority, number> = { critical: 3, high: 2, medium: 1, low: 0 };
const DIM_RANK: Record<ConfrontationDimension, number> = {
  state: 3, commitments: 2, behavior: 1, engagement: 0,
};

const STRONG_OBLIGATION_RE =
  /\b(no negociable|me comprometo|me obligo|debo todos? los? d[ií]as?|s[ií] o s[ií]|imprescindible|innegociable|prometo|me juro|cada (?:d[ií]a|ma[ñn]ana|noche))\b/i;
const ACTION_VERB_RE =
  /\b(medit|respir|correr|caminar|escrib|leer|estudi|entren|levant|dorm|ayun|comer|tomar|llamar|hablar|grabar|publicar|escuchar|practicar|hacer)/i;

function daysSince(iso: string | null, nowMs: number): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((nowMs - t) / DAY_MS));
}

function maxIsoMs(...isos: (string | null | undefined)[]): number {
  let m = 0;
  for (const x of isos) {
    if (!x) continue;
    const t = new Date(x).getTime();
    if (!Number.isNaN(t) && t > m) m = t;
  }
  return m;
}

function isExplicitCommitment(text: string, strength?: string): boolean {
  if (strength === 'explicit') return true;
  if (!text || text.length < 8) return false;
  return STRONG_OBLIGATION_RE.test(text) && ACTION_VERB_RE.test(text);
}

function commitmentKeywordsMatchActivity(
  commitmentText: string,
  activity: UserActivityBundle | null,
  nowMs: number,
): boolean {
  if (!activity) return false;
  const text = commitmentText.toLowerCase();
  const lookbackMs = nowMs - 14 * DAY_MS;
  const k = (s: string) => text.includes(s);

  if ((k('medit') || k('mindful')) && activity.wellness.some((w) => /medit/i.test(w.type ?? '') && new Date(w.completed_at).getTime() > lookbackMs)) return true;
  if ((k('respir') || k('breath')) && activity.wellness.some((w) => /breath|respir/i.test(w.type ?? '') && new Date(w.completed_at).getTime() > lookbackMs)) return true;
  if (k('dorm') && activity.wellness.some((w) => /sleep/i.test(w.type ?? '') && new Date(w.completed_at).getTime() > lookbackMs)) return true;
  if (k('ayun') && activity.fasting.some((f) => new Date(f.started_at).getTime() > lookbackMs)) return true;
  if (k('escrib') && activity.journal.some((j) => new Date(j.created_at).getTime() > lookbackMs)) return true;

  // Match por nombre de hábito que tenga logs recientes.
  const recentlyLoggedHabitIds = new Set(
    activity.habitLogs.filter((l) => l.completed && new Date(l.date).getTime() > lookbackMs).map((l) => l.habit_id),
  );
  for (const h of activity.habits) {
    if (!recentlyLoggedHabitIds.has(h.id)) continue;
    const hname = (h.name ?? '').toLowerCase();
    const overlap = hname.split(/\W+/).filter((w) => w.length >= 4 && text.includes(w));
    if (overlap.length >= 1) return true;
  }
  return false;
}

function globalGuards(b: ConfrontationBundle): string | null {
  if (!b.consents.ml_consent) return 'no_ml_consent';
  if (!b.consents.confrontation_with_data) return 'no_confrontation_consent';
  if (b.pauseState?.active) return 'pause_state_active';
  const blockers = (b.profile?.recurring_blockers ?? []) as unknown as string[];
  if (Array.isArray(blockers) && blockers.some((s) => /crisis|duelo/i.test(String(s)))) {
    return 'crisis_or_grief_blocker';
  }
  return null;
}

function isOnboardingTooNew(b: ConfrontationBundle, nowMs: number, minDays: number): boolean {
  return daysSince(b.onboardingCompletedAt, nowMs) < minDays;
}

// ─── Presence Protocol — suspender confrontación cuando el operador es vulnerable ─
/**
 * Honeymoon: los primeros días tras onboarding son para construir vínculo, no
 * confrontar. true si lleva < honeymoonDays desde onboardingCompletedAt.
 */
export function isInHoneymoon(b: ConfrontationBundle, nowMs: number, honeymoonDays = 7): boolean {
  return daysSince(b.onboardingCompletedAt, nowMs) < honeymoonDays;
}

/**
 * Estado emocional comprometido: toma los 3 check-ins más recientes; vulnerable
 * si la energía promedio <= 3 O el estrés del más reciente >= 8. Sin check-ins → false.
 */
export function isInCompromisedEmotionalState(b: ConfrontationBundle): boolean {
  if (b.recentCheckIns.length === 0) return false;
  const last3 = [...b.recentCheckIns]
    .sort((a, c) => new Date(c.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);
  const latest = last3[0];
  const avgEnergy = last3.reduce((s, c) => s + c.energy, 0) / last3.length;
  return avgEnergy <= 3 || latest.stress >= 8;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && !Number.isNaN(v) ? v : null;
}

// ─── Detector 1 — sleep_self_report_vs_wearable (STATE, capeado a medium) ────────
export function detectSleepSelfReportMismatch(b: ConfrontationBundle, nowMs: number): ConfrontationItem | null {
  if (!b.consents.biometric_confrontation) return null;
  if (isOnboardingTooNew(b, nowMs, 14)) return null;
  if (b.recentCheckIns.length < 3) return null;
  if (!b.bio?.series || b.bio.series.length < 3) return null;
  if (b.bio.connections.some((c) => c.provider === 'synthetic' && c.is_active)) return null;
  if (b.bio.connections.some((c) => c.last_synced_at && daysSince(c.last_synced_at, nowMs) > 0 && (nowMs - new Date(c.last_synced_at).getTime()) > 18 * 3600 * 1000)) {
    return null;
  }

  // Últimos 5 días de checkins (newest-first).
  const last5 = [...b.recentCheckIns]
    .sort((a, c) => new Date(c.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  let matchDays = 0;
  let sumScore = 0;
  let sumDuration = 0;
  let lastEvidenceDate = '';
  for (const ci of last5) {
    if (ci.sleep < 7) continue;
    const d = b.bio.series.find((s) => s.date === ci.date);
    if (!d) continue;
    const conf = num(d.signal_confidence);
    if (conf === null || conf < 0.5) continue;
    const score = num(d.sleep_score);
    const dur = num(d.sleep_duration_min);
    const mismatch = (score !== null && score < 55) || (dur !== null && dur < 360);
    if (!mismatch) continue;
    matchDays++;
    if (score !== null) sumScore += score;
    if (dur !== null) sumDuration += dur;
    if (!lastEvidenceDate || ci.date > lastEvidenceDate) lastEvidenceDate = ci.date;
  }
  if (matchDays < 3) return null;

  const avgScore = Math.round(sumScore / matchDays);
  const avgHours = (sumDuration / matchDays) / 60;
  // STATE capeado a 'medium' hasta revisión clínica (decisión del owner).
  const severity: TaskPriority = 'medium';

  return {
    id: 'sleep_self_report_vs_wearable',
    dimension: 'state',
    severity,
    evidence: {
      said: { text: `Reportaste sueño 7+/10 en ${matchDays} de los últimos 5 días`, source: 'checkin', source_date: lastEvidenceDate },
      did: { value: `sleep_score ~${avgScore}/100`, detail: `duración promedio ${avgHours.toFixed(1)}h` },
      gap_metric: { summary: `${matchDays} días de mismatch`, mismatch_days: matchDays },
    },
    confrontation_prompt: `En ${matchDays} de los últimos 5 días reportaste tu sueño 7+/10. Tu wearable midió un promedio de ${avgHours.toFixed(1)}h con calidad ${avgScore}/100. No discuto lo que sentís — te pregunto: ¿qué hace que necesites contarte que dormiste bien?`,
    skipped: false,
  };
}

// ─── Detector 2 — energy_vs_recovery_streak (STATE, capeado a medium) ────────────
export function detectEnergyVsRecoveryStreak(b: ConfrontationBundle, nowMs: number): ConfrontationItem | null {
  if (!b.consents.biometric_confrontation) return null;
  if (isOnboardingTooNew(b, nowMs, 14)) return null;
  if (b.recentCheckIns.length < 3) return null;
  if (!b.bio?.series || !b.bio?.latestInsight) return null;
  if (b.bioBaselineRecovery30d === null || b.bioBaselineRecovery30d < 30) return null;
  if (b.bio.connections.some((c) => c.provider === 'synthetic' && c.is_active)) return null;
  if (b.bio.latestInsight.coherence_state === 'stable') return null;

  const last3 = [...b.recentCheckIns]
    .sort((a, c) => new Date(c.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);
  if (last3.length < 3) return null;
  const avgEnergy = last3.reduce((s, c) => s + c.energy, 0) / 3;
  if (avgEnergy < 8) return null;

  // Recovery promedio 3d con signal_confidence aceptable.
  const dates = new Set(last3.map((c) => c.date));
  const matchedSeries = b.bio.series.filter((s) => s.date && dates.has(s.date));
  if (matchedSeries.length < 3) return null;
  if (matchedSeries.some((s) => num(s.signal_confidence) === null || (num(s.signal_confidence) as number) < 0.5)) return null;
  const recoveryVals = matchedSeries.map((s) => num(s.recovery_score)).filter((v): v is number => v !== null);
  if (recoveryVals.length < 3) return null;
  const avgRecovery = recoveryVals.reduce((a, c) => a + c, 0) / recoveryVals.length;

  if (avgRecovery >= b.bioBaselineRecovery30d * 0.8) return null; // su normal

  const severity: TaskPriority = 'medium';

  return {
    id: 'energy_vs_recovery_streak',
    dimension: 'state',
    severity,
    evidence: {
      said: { text: `energía promedio ${avgEnergy.toFixed(1)}/10 (últimos 3 días)`, source: 'checkin', source_date: last3[0].date },
      did: { value: `recovery promedio ${Math.round(avgRecovery)}`, detail: `tu baseline 30d ~${Math.round(b.bioBaselineRecovery30d)}` },
      gap_metric: { summary: `${Math.round(((b.bioBaselineRecovery30d - avgRecovery) / b.bioBaselineRecovery30d) * 100)}% bajo tu baseline` },
    },
    confrontation_prompt: `Llevás 3 días reportando energía 8+. Tu cuerpo está en otro lugar: recuperación promedio ${Math.round(avgRecovery)}, lejos de tu propia línea base de ${Math.round(b.bioBaselineRecovery30d)}. Algo se está sosteniendo desde el empuje. ¿Qué estás cargando esta semana que no se puede sostener?`,
    skipped: false,
  };
}

// ─── Detector 3 — silent_withdrawal_5d (ENGAGEMENT) ──────────────────────────────
export function detectSilentWithdrawal(b: ConfrontationBundle, nowMs: number): ConfrontationItem | null {
  if (isOnboardingTooNew(b, nowMs, 14)) return null;

  const lastCheckin = b.recentCheckIns[0] ? maxIsoMs(b.recentCheckIns[0].date) : 0;
  const lastWellness = b.activityBundle?.wellness[0]?.completed_at
    ? new Date(b.activityBundle.wellness[0].completed_at).getTime()
    : 0;
  const newest = Math.max(
    lastCheckin,
    b.lastMentorMsgAt ? new Date(b.lastMentorMsgAt).getTime() : 0,
    b.lastDmAt ? new Date(b.lastDmAt).getTime() : 0,
    lastWellness,
    b.lastAppOpenAt ? new Date(b.lastAppOpenAt).getTime() : 0,
  );
  if (newest === 0) return null;
  const daysSilent = Math.floor((nowMs - newest) / DAY_MS);
  if (daysSilent < 5) return null;

  // Mood reciente bajo → vulnerable, no confrontar.
  const recentJournal = (b.activityBundle?.journal ?? []).filter(
    (j) => (nowMs - new Date(j.created_at).getTime()) < 14 * DAY_MS,
  );
  if (recentJournal.some((j) => num(j.mood_score) !== null && (j.mood_score as number) < 5)) return null;

  const severity: TaskPriority = daysSilent >= 8 ? 'critical' : 'high';
  const channels: string[] = [];
  if (lastCheckin && (nowMs - lastCheckin) > 5 * DAY_MS) channels.push('check-in');
  if (b.lastMentorMsgAt && (nowMs - new Date(b.lastMentorMsgAt).getTime()) > 5 * DAY_MS) channels.push('mentor');
  if (lastWellness && (nowMs - lastWellness) > 5 * DAY_MS) channels.push('prácticas');

  return {
    id: 'silent_withdrawal_5d',
    dimension: 'engagement',
    severity,
    evidence: {
      said: null,
      did: { value: 'NO_ACTIVITY', detail: `${daysSilent} días sin contacto en ningún canal` },
      gap_metric: { summary: `${daysSilent}d silencio`, days_silent: daysSilent, channels_silent: channels },
    },
    confrontation_prompt: `${daysSilent} días sin un solo check-in, sin abrir nada conmigo. No te pierdo de vista por control — te pierdo de vista y eso importa. ¿Qué pasó esta semana?`,
    skipped: false,
  };
}

// ─── Detector 4 — mentor_contact_gap_vs_focus (ENGAGEMENT) ───────────────────────
const SOPORTE_CERCANO_RE = /soporte cercano|acompa[ñn]amiento frecuente|contacto frecuente|conversaciones frecuentes|soporte intensivo/i;
const AUTONOMIA_RE = /autonom[ií]a|sin gu[ií]a|por mi cuenta|s[óo]lo/i;

export function detectMentorContactGap(b: ConfrontationBundle, nowMs: number): ConfrontationItem | null {
  const focus = b.profile?.mentorship_focus ?? '';
  if (!focus || !SOPORTE_CERCANO_RE.test(focus)) return null;
  if (AUTONOMIA_RE.test(focus)) return null;

  // Si tuvo sesión presencial reciente (≤7d), no contar como gap.
  if (b.lastMentorshipSessionAt && daysSince(b.lastMentorshipSessionAt, nowMs) <= 7) return null;

  const daysGap = daysSince(b.lastMentorMsgAt, nowMs);
  if (daysGap < 10) return null;

  const severity: TaskPriority = daysGap >= 15 ? 'critical' : 'high';
  return {
    id: 'mentor_contact_gap_vs_focus',
    dimension: 'engagement',
    severity,
    evidence: {
      said: { text: focus, source: 'memory_profile' },
      did: { value: 'NO_MENTOR_CONTACT', detail: `${daysGap} días sin escribirte` },
      gap_metric: { summary: `${daysGap}d sin contacto`, days_gap: daysGap },
    },
    confrontation_prompt: `Dijiste que querías ${focus.toLowerCase().includes('frecuente') ? 'conversaciones frecuentes' : 'soporte cercano'}. Llevás ${daysGap} días sin escribirme. O cambió tu necesidad, o cambió tu disposición a usar lo que pediste. ¿Cuál de las dos?`,
    skipped: false,
  };
}

// ─── Detector 5 — habit_streak_abandoned (BEHAVIOR) — emite 1+ items ─────────────
export function detectHabitStreakAbandoned(b: ConfrontationBundle, nowMs: number): ConfrontationItem[] {
  const activity = b.activityBundle;
  if (!activity || activity.habits.length === 0) return [];

  // Si TODOS los hábitos tienen 0 logs recientes (5d), es desconexión global → silent_withdrawal_5d.
  const globalSilenceCutoff = nowMs - 5 * DAY_MS;
  const someRecentLog = activity.habitLogs.some((l) => l.completed && new Date(l.date).getTime() >= globalSilenceCutoff);
  if (!someRecentLog && activity.habits.filter((h) => h.is_active).length >= 2) return [];

  // Score general de ejecución alto → no es deserción, solo un hábito que cayó.
  const adherenceOk = (b.scores?.adherence_score ?? 0) >= 80;

  const out: ConfrontationItem[] = [];
  for (const h of activity.habits) {
    if (!h.is_active) continue;
    if (h.best_streak < 14) continue;
    const created = new Date(h.created_at).getTime();
    if ((nowMs - created) < 21 * DAY_MS) continue;

    const logsThisHabit = activity.habitLogs.filter((l) => l.habit_id === h.id);
    const recent7 = logsThisHabit.filter((l) => (nowMs - new Date(l.date).getTime()) < 7 * DAY_MS);
    const recentCompleted = recent7.filter((l) => l.completed).length;
    const recentFailed = recent7.filter((l) => !l.completed).length;
    if (recentCompleted > 0) continue;       // sigue activo
    if (recentFailed >= 2) continue;          // está peleando, no abandonado

    // Pivot detection: otro hábito creado en últimos 21d con keyword overlap.
    const hKeywords = (h.name ?? '').toLowerCase().split(/\W+/).filter((w) => w.length >= 4);
    const pivoted = activity.habits.some((other) => {
      if (other.id === h.id) return false;
      if ((nowMs - new Date(other.created_at).getTime()) > 21 * DAY_MS) return false;
      const oKeywords = (other.name ?? '').toLowerCase().split(/\W+/);
      return hKeywords.some((k) => oKeywords.includes(k));
    });
    if (pivoted) continue;

    const lastCompleted = logsThisHabit.filter((l) => l.completed)
      .sort((a, c) => new Date(c.date).getTime() - new Date(a.date).getTime())[0];
    const daysSilent = lastCompleted ? daysSince(lastCompleted.date, nowMs) : 99;

    if (adherenceOk && daysSilent < 14) continue; // el resto fluye, no urgente

    const severity: TaskPriority =
      daysSilent >= 14 ? 'critical' :
      daysSilent >= 10 ? 'high' :
      'medium';

    out.push({
      id: `habit_streak_abandoned:${h.id}`,
      dimension: 'behavior',
      severity,
      evidence: {
        said: { text: h.name, source: 'habit', source_date: h.created_at },
        did: { value: `${daysSilent}d sin tocar`, detail: `mejor racha histórica: ${h.best_streak} días` },
        gap_metric: { summary: `hábito de identidad consolidada abandonado`, days_silent: daysSilent },
      },
      confrontation_prompt: `Tu hábito "${h.name}" tenía un mejor de ${h.best_streak} días. ${daysSilent} días sin tocarlo. No es olvido — es algo. ¿Qué reemplazó ese espacio esta semana?`,
      skipped: false,
    });
  }
  return out;
}

// ─── Detector 6 — commitments_drift (COMMITMENTS) ────────────────────────────────
export function detectCommitmentsDrift(b: ConfrontationBundle, nowMs: number): ConfrontationItem | null {
  const open = (b.profile?.commitments_open ?? []) as { id?: string; text: string; created_at?: string; completed_at?: string; strength?: string }[];
  if (open.length === 0) return null;

  const untracked: { text: string; created_at?: string }[] = [];
  for (const c of open) {
    const text = (c.text ?? '').trim();
    if (!text || text.length < 8) continue;
    if (c.completed_at) continue;
    if (!isExplicitCommitment(text, c.strength)) continue;

    const ageDays = c.created_at ? daysSince(c.created_at, nowMs) : null;
    if (ageDays === null) continue;
    if (ageDays < 14) continue;    // ventana de gracia
    if (ageDays > 60) continue;    // muy viejo, probable reemplazo

    // ¿Existe task con source_id matching?
    const taskMatch = b.tasks.some((t) => t.source_id && c.id && t.source_id === c.id);
    if (taskMatch) continue;

    // ¿Hay actividad reciente con keyword overlap?
    if (commitmentKeywordsMatchActivity(text, b.activityBundle, nowMs)) continue;

    untracked.push({ text, created_at: c.created_at });
  }

  if (untracked.length === 0) return null;

  // Política de cuidado: capear severity si churn alto (no bumpear).
  let severity: TaskPriority =
    untracked.length >= 3 ? 'critical' :
    untracked.length === 2 ? 'high' : 'medium';

  const oldestAgeDays = Math.max(...untracked.map((c) => c.created_at ? daysSince(c.created_at, nowMs) : 0));
  const first = untracked[0];
  const second = untracked[1];
  const promptParts: string[] = [];
  if (first.created_at) {
    promptParts.push(`El ${new Date(first.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long' })} dijiste "${first.text}".`);
  } else {
    promptParts.push(`Dijiste "${first.text}".`);
  }
  if (second) {
    if (second.created_at) {
      promptParts.push(`El ${new Date(second.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long' })} agregaste "${second.text}".`);
    } else {
      promptParts.push(`Después agregaste "${second.text}".`);
    }
  }
  // Tono uniforme (decisión del owner: suave hasta validar zero-FP).
  promptParts.push('Ninguno tiene huella en el sistema. ¿Lo estás haciendo fuera del tracker, o cayó del radar?');

  return {
    id: 'commitments_drift',
    dimension: 'commitments',
    severity,
    evidence: {
      said: { text: first.text, source: 'memory_profile', source_date: first.created_at },
      did: { value: 'NO_TRACE', detail: `${untracked.length} compromiso(s) sin actividad ni task asociada` },
      gap_metric: { summary: `${untracked.length} compromiso(s) sin huella; el más viejo lleva ${oldestAgeDays}d`, untracked_count: untracked.length },
    },
    confrontation_prompt: promptParts.join(' '),
    skipped: false,
  };
}

// ─── Adapter 1 — false_compliance (reusa buildInterventions) ─────────────────────
export function adaptFalseComplianceIntervention(
  intervention: InterventionItem,
  tasks: MentorTask[],
  nowMs: number,
): ConfrontationItem | null {
  if (intervention.queue_reason !== 'false_compliance') return null;

  // Si ninguna task histórica ha tenido evidence_payload, la feature no está en uso → skip.
  const everUsed = tasks.some((t) => t.evidence_payload && Object.keys(t.evidence_payload).length > 0);
  if (!everUsed) return null;

  const offenders = tasks.filter((t) => {
    if (deriveStatus(t, nowMs) !== 'completed') return false;
    if (!t.evidence_required) return false;
    const payload = t.evidence_payload;
    if (payload && Object.keys(payload).length > 0) return false;
    if (t.evidence_type === 'self_report' && num(t.self_report_score) !== null) return false;
    return true;
  });

  if (offenders.length === 0) return null;
  // Ventana de gracia: todas completadas hace <3d → revisión humana aún en curso.
  const allRecent = offenders.every((t) => {
    const ts = t.completed_at ? new Date(t.completed_at).getTime() : 0;
    return ts > 0 && (nowMs - ts) < 3 * DAY_MS;
  });
  if (allRecent) return null;

  return {
    id: 'false_compliance',
    dimension: 'commitments',
    severity: 'high',
    evidence: {
      said: { text: `${offenders.length} tarea(s) marcadas como completadas`, source: 'mentor_task' },
      did: { value: 'COMPLETED_NO_EVIDENCE', detail: intervention.summary },
      gap_metric: { summary: 'completadas sin evidencia', count: offenders.length },
    },
    confrontation_prompt: `Marcaste ${offenders.length} tareas como hechas, sin una sola evidencia. Si las hiciste, mostrame algo. Si no, decímelo y reescribimos.`,
    skipped: false,
  };
}

// ─── Adapter 2 — high_attention → program_drift (reusa buildInterventions) ──────
export interface HighAttentionAdapterCtx {
  activeModuleTitle: string | null;
  lastLessonCompletedAt: string | null;
  tasks: MentorTask[];
  scores: ClientScores | null;
  activeModuleProgress: number;
  profile: MemoryProfile | null;
}

export function adaptHighAttentionIntervention(
  intervention: InterventionItem,
  ctx: HighAttentionAdapterCtx,
  nowMs: number,
): ConfrontationItem | null {
  if (intervention.queue_reason !== 'high_attention') return null;
  if (!ctx.activeModuleTitle) return null;
  if (ctx.activeModuleProgress >= 95) return null;
  const integrationBlocker = (ctx.profile?.recurring_blockers ?? []) as unknown as string[];
  if (Array.isArray(integrationBlocker) && integrationBlocker.some((s) => /integraci[oó]n profunda/i.test(String(s)))) return null;

  const daysSinceLastLesson = daysSince(ctx.lastLessonCompletedAt, nowMs);
  if (daysSinceLastLesson < 10) return null;

  const completedTasksLast14d = ctx.tasks.filter((t) => {
    if (deriveStatus(t, nowMs) !== 'completed') return false;
    const ts = t.completed_at ? new Date(t.completed_at).getTime() : 0;
    return ts > 0 && (nowMs - ts) < 14 * DAY_MS;
  }).length;
  if (completedTasksLast14d >= 3) return null;        // integrando, no abandonando

  const severity: TaskPriority = daysSinceLastLesson >= 15 ? 'critical' : 'high';

  return {
    id: 'program_drift',
    dimension: 'engagement',
    severity,
    evidence: {
      said: { text: `Módulo activo: ${ctx.activeModuleTitle}`, source: 'active_module' },
      did: { value: 'NO_LESSONS_AND_TASK_STALL', detail: `${daysSinceLastLesson}d sin abrir lección, ${completedTasksLast14d} tareas en 14d` },
      gap_metric: { summary: `drift de programa`, days_silent: daysSinceLastLesson },
    },
    confrontation_prompt: `Entraste a "${ctx.activeModuleTitle}" hace ${daysSinceLastLesson} días sin abrir una lección. Tu lista tiene tareas abiertas. ¿La pregunta es claridad, carga o miedo?`,
    skipped: false,
  };
}

// ─── Ensamblado: buildConfrontations ─────────────────────────────────────────────
function dedupItems(items: ConfrontationItem[]): ConfrontationItem[] {
  // Dedup por id; conserva el de mayor severity.
  const by = new Map<string, ConfrontationItem>();
  for (const it of items) {
    const existing = by.get(it.id);
    if (!existing || SEVERITY_RANK[it.severity] > SEVERITY_RANK[existing.severity]) {
      by.set(it.id, it);
    }
  }
  return [...by.values()];
}

function isDismissed(itemId: string, dismissals: ConfrontationDismissal[], nowMs: number): boolean {
  return dismissals.some((d) => {
    if (d.item_id !== itemId) return false;
    const until = new Date(d.dismissed_until).getTime();
    return !Number.isNaN(until) && until > nowMs;
  });
}

export function buildConfrontations(b: ConfrontationBundle, nowMs: number): BuildResult {
  const reason = globalGuards(b);
  if (reason) return { items: [], skipped: [{ id: 'all', reason }] };

  // Presence Protocol: si el operador es vulnerable, contener antes que confrontar.
  if (isInHoneymoon(b, nowMs)) return { items: [], skipped: [{ id: 'all', reason: 'honeymoon_period' }] };
  if (isInCompromisedEmotionalState(b)) return { items: [], skipped: [{ id: 'all', reason: 'low_energy_or_high_stress' }] };

  const raw: ConfrontationItem[] = [];
  const skipped: { id: string; reason: string }[] = [];

  const tryAdd = (id: string, item: ConfrontationItem | null) => {
    if (!item) { skipped.push({ id, reason: 'detector_returned_null' }); return; }
    if (isDismissed(item.id, b.dismissals, nowMs)) { skipped.push({ id, reason: 'dismissed' }); return; }
    raw.push(item);
  };

  tryAdd('sleep_self_report_vs_wearable', detectSleepSelfReportMismatch(b, nowMs));
  tryAdd('energy_vs_recovery_streak', detectEnergyVsRecoveryStreak(b, nowMs));
  tryAdd('silent_withdrawal_5d', detectSilentWithdrawal(b, nowMs));
  tryAdd('mentor_contact_gap_vs_focus', detectMentorContactGap(b, nowMs));
  tryAdd('commitments_drift', detectCommitmentsDrift(b, nowMs));

  for (const habitItem of detectHabitStreakAbandoned(b, nowMs)) {
    if (isDismissed(habitItem.id, b.dismissals, nowMs)) { skipped.push({ id: habitItem.id, reason: 'dismissed' }); continue; }
    raw.push(habitItem);
  }

  // Adapters de buildInterventions existente.
  for (const iv of b.interventions) {
    const fc = adaptFalseComplianceIntervention(iv, b.tasks, nowMs);
    if (fc && !isDismissed(fc.id, b.dismissals, nowMs)) raw.push(fc);

    const pd = adaptHighAttentionIntervention(iv, {
      activeModuleTitle: b.activeModuleTitle,
      lastLessonCompletedAt: b.lastLessonCompletedAt,
      tasks: b.tasks,
      scores: b.scores,
      activeModuleProgress: b.activeModuleProgress,
      profile: b.profile,
    }, nowMs);
    if (pd && !isDismissed(pd.id, b.dismissals, nowMs)) raw.push(pd);
  }

  // Dedup + sort por severity tier (con tiebreak por dimensión state>commitments>behavior>engagement).
  const items = dedupItems(raw).sort((a, c) => {
    const dr = SEVERITY_RANK[c.severity] - SEVERITY_RANK[a.severity];
    if (dr !== 0) return dr;
    return DIM_RANK[c.dimension] - DIM_RANK[a.dimension];
  });

  return { items, skipped };
}

/** Top-K para inyección a Norman: solo severity high+ (umbral del owner). */
export function topForMentor(items: ConfrontationItem[], k = 2): ConfrontationItem[] {
  return items.filter((it) => SEVERITY_RANK[it.severity] >= SEVERITY_RANK.high).slice(0, k);
}
