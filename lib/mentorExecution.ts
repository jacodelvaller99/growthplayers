/**
 * mentorExecution — capa IO del Mentor Execution OS.
 *
 * - Normaliza las fuentes existentes (mentorship_tasks, action plans, compromisos de
 *   Norman/Memory OS) hacia el objeto unificado `mentor_tasks` (insert-if-missing).
 * - Computa y persiste los scores del cliente + regenera la cola de intervención.
 * - Genera el mentor-prep y el dashboard cross-client.
 *
 * Todo degrada en silencio (try/catch → vacío). La evaluación autoritativa del mentor
 * vive en `mentor_task_reviews` (admin-only). Los scores/cola son admin-only por RLS.
 */
import { intel, mex } from '@/lib/supabase';
import { fetchMemoryProfile } from '@/lib/memory';
import { logSilentError } from '@/lib/observability';
import {
  assembleMentorPrep,
  buildInterventions,
  computeClientScores,
  deriveStatus,
  type ClientScores,
  type InterventionItem,
  type MentorPrep,
  type MentorTask,
} from '@/lib/mentorExecutionLogic';

export type {
  MentorTask, ClientScores, InterventionItem, MentorPrep,
  TaskStatus, TaskPriority, ExecutionQuality, ReviewStatus, MomentumState, TierDepth,
} from '@/lib/mentorExecutionLogic';

export interface TaskReview {
  id?: string;
  task_id: string;
  user_id: string;
  reviewer_id?: string | null;
  review_status?: string;
  quality?: string;
  evidence_confidence?: string;
  failure_type?: string;
  mentor_action?: string;
  notes?: string;
  created_at?: string;
}

export interface ExecutionBundle {
  tasks: MentorTask[];
  scores: ClientScores | null;
  reviews: TaskReview[];
  prep: MentorPrep | null;
}

const TASK_COLS =
  'id,user_id,title,description,category,source_type,source_id,assigned_by,assigned_at,due_date,' +
  'priority,status,evidence_required,evidence_type,evidence_payload,self_report_score,mentor_score,' +
  'execution_quality,friction_reason,mentor_review_status,completed_at,reviewed_at,created_at,updated_at';

function stableId(prefix: string, text: string): string {
  // id determinista (sin crypto): para dedup de compromisos/acciones por texto.
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return `${prefix}_${Math.abs(h)}`;
}

// ─── Tareas (CRUD) ────────────────────────────────────────────────────────────────
export async function fetchTasks(userId: string): Promise<MentorTask[]> {
  if (!userId) return [];
  try {
    const { data, error } = await mex.tasks().select(TASK_COLS).eq('user_id', userId).order('due_date', { ascending: true, nullsFirst: false });
    if (error || !data) return [];
    return data as MentorTask[];
  } catch {
    return [];
  }
}

export async function insertTask(task: MentorTask & { user_id: string }): Promise<boolean> {
  try {
    const { error } = await mex.tasks().insert(task);
    return !error;
  } catch {
    return false;
  }
}

export async function updateTask(id: string, patch: Partial<MentorTask>): Promise<boolean> {
  if (!id) return false;
  try {
    const { error } = await mex.tasks().update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ─── Reviews (admin-only) ───────────────────────────────────────────────────────
export async function fetchReviews(userId: string): Promise<TaskReview[]> {
  if (!userId) return [];
  try {
    const { data, error } = await mex.reviews().select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as TaskReview[];
  } catch {
    return [];
  }
}

/** Inserta el review y refleja el veredicto en la tarea (mentor_score/quality/status). */
export async function submitReview(review: TaskReview): Promise<boolean> {
  if (!review.task_id || !review.user_id) return false;
  try {
    const { error } = await mex.reviews().insert(review);
    if (error) return false;
    const qualityToScore: Record<string, number> = { low: 35, acceptable: 65, strong: 85, exceptional: 97 };
    const execQuality: Record<string, 'low' | 'medium' | 'high'> = {
      low: 'low', acceptable: 'medium', strong: 'high', exceptional: 'high',
    };
    await updateTask(review.task_id, {
      mentor_review_status: review.review_status === 'completed' ? 'approved' : 'reviewed',
      mentor_score: review.quality ? qualityToScore[review.quality] ?? null : null,
      execution_quality: review.quality ? execQuality[review.quality] ?? null : null,
      friction_reason: review.failure_type ?? null,
      reviewed_at: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Normalización de fuentes → mentor_tasks (insert-if-missing) ─────────────────
export async function normalizeSources(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const existing = await fetchTasks(userId);
    const seen = new Set(existing.map((t) => `${t.source_type}:${t.source_id ?? ''}`));
    const inserts: (MentorTask & { user_id: string })[] = [];

    // 1) mentorship_tasks → tareas de mentoría (RLS: dueño+admin)
    const { supabase } = await import('@/lib/supabase');
    const sb = supabase as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      const { data: mts } = await sb.from('mentorship_tasks').select('id,title,week,completed,completed_at').eq('user_id', userId);
      for (const mt of (mts ?? []) as Array<{ id: string; title: string; week?: number; completed?: boolean; completed_at?: string }>) {
        const key = `mentorship:${mt.id}`;
        if (seen.has(key) || !mt.title) continue;
        seen.add(key);
        inserts.push({
          user_id: userId,
          title: mt.title,
          category: 'mentoría',
          source_type: 'mentorship',
          source_id: mt.id,
          priority: 'medium',
          status: mt.completed ? 'completed' : 'in_progress',
          completed_at: mt.completed_at ?? null,
          mentor_review_status: 'pending',
        });
      }
    } catch { /* noop */ }

    // 2) Compromisos abiertos del Memory OS → tareas ai_suggested (Norman)
    const profile = await fetchMemoryProfile(userId);
    for (const c of profile?.commitments_open ?? []) {
      const text = c.text?.trim();
      if (!text) continue;
      const sid = c.id || stableId('cmt', text);
      const key = `norman:${sid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      inserts.push({
        user_id: userId,
        title: text,
        category: 'accountability',
        source_type: 'norman',
        source_id: sid,
        priority: 'medium',
        status: 'not_started',
        mentor_review_status: 'ai_suggested',
      });
    }

    for (const t of inserts) await insertTask(t);
  } catch {
    /* degrade */
  }
}

/** Crea tareas desde el plan de acción de una mentoría confirmada (automatización). */
export async function createTasksFromActionPlan(
  userId: string,
  actions: string[],
  week?: number,
): Promise<void> {
  if (!userId) return;
  try {
    const existing = await fetchTasks(userId);
    const seen = new Set(existing.map((t) => `${t.source_type}:${t.source_id ?? ''}`));
    for (const raw of actions) {
      const text = raw.trim();
      if (!text) continue;
      const sid = stableId(`ap${week ?? ''}`, text);
      if (seen.has(`mentorship:${sid}`)) continue;
      seen.add(`mentorship:${sid}`);
      await insertTask({
        user_id: userId,
        title: text,
        category: 'mentoría',
        source_type: 'mentorship',
        source_id: sid,
        priority: 'high',
        status: 'not_started',
        mentor_review_status: 'pending',
      });
    }
  } catch { /* degrade */ }
}

/** Crea tareas AI-suggested desde compromisos detectados por Norman en chat. */
export async function suggestTasksFromCommitments(userId: string, commitments: string[]): Promise<void> {
  if (!userId || commitments.length === 0) return;
  try {
    const existing = await fetchTasks(userId);
    const seen = new Set(existing.map((t) => `${t.source_type}:${t.source_id ?? ''}`));
    for (const raw of commitments) {
      const text = raw.trim();
      if (!text) continue;
      const sid = stableId('cmt', text);
      if (seen.has(`norman:${sid}`)) continue;
      seen.add(`norman:${sid}`);
      await insertTask({
        user_id: userId,
        title: text,
        category: 'accountability',
        source_type: 'norman',
        source_id: sid,
        priority: 'medium',
        status: 'not_started',
        mentor_review_status: 'ai_suggested',
      });
    }
  } catch { /* degrade */ }
}

// ─── Scores + cola de intervención ────────────────────────────────────────────────
async function fetchChurnRisk(userId: string): Promise<number> {
  try {
    const { data } = await intel.intelligence().select('churn_risk').eq('user_id', userId).maybeSingle();
    const v = (data as { churn_risk?: number } | null)?.churn_risk;
    return typeof v === 'number' ? v : 0;
  } catch {
    return 0;
  }
}

function daysSince(iso?: string | null): number {
  if (!iso) return 999;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 999;
  return Math.floor((Date.now() - t) / 86_400_000);
}

/** Computa los scores, los persiste y regenera la cola de intervención del usuario. */
export async function computeAndPersistScores(userId: string, tasks?: MentorTask[]): Promise<ClientScores | null> {
  if (!userId) return null;
  try {
    const t = tasks ?? (await fetchTasks(userId));
    const profile = await fetchMemoryProfile(userId);
    const made = (profile?.commitments_open?.length ?? 0) + (profile?.commitments_completed?.length ?? 0);
    const fulfilled = profile?.commitments_completed?.length ?? 0;
    const churnRisk = await fetchChurnRisk(userId);
    const lastReview = t.map((x) => x.reviewed_at).filter(Boolean).sort().pop();

    const scores = computeClientScores({
      tasks: t, commitmentsMade: made, commitmentsFulfilled: fulfilled,
      churnRisk, daysSinceReview: daysSince(lastReview),
    });

    try {
      await mex.scores().upsert(
        { user_id: userId, ...scores, drivers: scores.drivers, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
    } catch { /* noop */ }

    // Regenerar cola: cerrar las abiertas y reinsertar las vigentes.
    const interventions = buildInterventions(scores, t);
    try {
      await mex.interventions().delete().eq('user_id', userId).is('resolved_at', null);
      if (interventions.length) {
        await mex.interventions().insert(interventions.map((i) => ({ user_id: userId, ...i })));
      }
    } catch { /* noop */ }

    return scores;
  } catch {
    return null;
  }
}

/** Mentor-prep determinista desde tareas + scores + Memory OS. */
export async function generateMentorPrep(userId: string, tasks?: MentorTask[], scores?: ClientScores | null): Promise<MentorPrep | null> {
  if (!userId) return null;
  try {
    const t = tasks ?? (await fetchTasks(userId));
    const s = scores ?? (await computeAndPersistScores(userId, t));
    if (!s) return null;
    const profile = await fetchMemoryProfile(userId);
    const { fetchLatestSummaries } = await import('@/lib/memory');
    const summaries = await fetchLatestSummaries(userId, 3);
    const openLoops = summaries.flatMap((x) => x.unresolved_questions ?? []);
    return assembleMentorPrep({
      tasks: t, scores: s,
      commitmentsOpen: (profile?.commitments_open ?? []).map((c) => c.text),
      recentWins: profile?.recent_wins ?? [],
      recurringBlockers: profile?.recurring_blockers ?? [],
      openLoops,
      mentorshipFocus: profile?.mentorship_focus ?? null,
    });
  } catch {
    return null;
  }
}

/** Bundle completo para el detalle de usuario admin (normaliza → computa → ensambla). */
export async function fetchUserExecution(userId: string): Promise<ExecutionBundle> {
  const empty: ExecutionBundle = { tasks: [], scores: null, reviews: [], prep: null };
  if (!userId) return empty;
  try {
    await normalizeSources(userId);
    const [tasks, reviews] = await Promise.all([fetchTasks(userId), fetchReviews(userId)]);
    const scores = await computeAndPersistScores(userId, tasks);
    const prep = await generateMentorPrep(userId, tasks, scores);
    return { tasks, scores, reviews, prep };
  } catch {
    return empty;
  }
}

// ─── Dashboard cross-client (admin, live) ──────────────────────────────────────────
export interface ExecutionDashboardRow {
  user_id: string;
  name: string;
  attention: number;
  momentum: string;
  openTasks: number;
  overdue: number;
  topReason: string | null;
  severity: string | null;
}

export async function fetchExecutionDashboard(): Promise<ExecutionDashboardRow[]> {
  try {
    const { data: tasksData } = await mex.tasks().select(TASK_COLS).limit(2000);
    const rows = (tasksData ?? []) as MentorTask[];
    if (rows.length === 0) return [];

    const byUser = new Map<string, MentorTask[]>();
    for (const t of rows) {
      const uid = t.user_id ?? '';
      if (!uid) continue;
      (byUser.get(uid) ?? byUser.set(uid, []).get(uid)!).push(t);
    }

    const ids = [...byUser.keys()];
    const nameMap: Record<string, string> = {};
    try {
      const { supabase } = await import('@/lib/supabase');
      const sb = supabase as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
      const { data: prog } = await sb.from('user_progress').select('user_id,name').in('user_id', ids);
      for (const p of (prog ?? []) as Array<{ user_id: string; name: string }>) nameMap[p.user_id] = p.name;
    } catch { /* noop */ }

    const now = Date.now();
    const out: ExecutionDashboardRow[] = [];
    for (const [uid, tks] of byUser) {
      const scores = computeClientScores({ tasks: tks, nowMs: now });
      const interventions = buildInterventions(scores, tks, now);
      const top = interventions.sort((a, b) => sevRank(b.severity) - sevRank(a.severity))[0];
      out.push({
        user_id: uid,
        name: nameMap[uid] ?? 'Usuario',
        attention: scores.mentor_attention_score,
        momentum: scores.weekly_momentum_state,
        openTasks: tks.filter((t) => { const st = deriveStatus(t, now); return st !== 'completed' && st !== 'canceled'; }).length,
        overdue: tks.filter((t) => deriveStatus(t, now) === 'overdue').length,
        topReason: top?.summary ?? null,
        severity: top?.severity ?? null,
      });
    }
    return out.sort((a, b) => b.attention - a.attention);
  } catch (e) {
    logSilentError('mentorExecution.fetchDashboard', e);
    return [];
  }
}

function sevRank(s: string): number {
  return { low: 0, medium: 1, high: 2, critical: 3 }[s] ?? 0;
}
