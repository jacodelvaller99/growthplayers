/**
 * mentorExecutionLogic — lógica PURA del Mentor Execution OS (sin IO/React/Supabase).
 *
 * Scores explicables (0-100), derivación de status, diferencial por tier, generación
 * de la cola de intervención y ensamblado del mentor-prep. Las fórmulas son simples y
 * documentadas a propósito: "simple y explicable" > "preciso y opaco".
 *
 * Convención de scores:
 *   adherence/quality/follow_through → mayor = mejor.
 *   friction/mentor_attention        → mayor = PEOR / más urgente.
 */

// ─── Tipos ──────────────────────────────────────────────────────────────────────
export type TaskStatus =
  | 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'avoided' | 'overdue' | 'canceled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type ExecutionQuality = 'low' | 'medium' | 'high';
export type ReviewStatus = 'pending' | 'ai_suggested' | 'reviewed' | 'approved' | 'rejected' | 'partial';
export type MomentumState = 'rising' | 'stable' | 'fragile' | 'declining' | 'critical';
export type TierDepth = 'basic' | 'full' | 'deep';

export interface MentorTask {
  id?: string;
  user_id?: string;
  title: string;
  description?: string | null;
  category?: string | null;
  source_type?: string;
  source_id?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string | null;
  evidence_required?: boolean;
  evidence_type?: string | null;
  evidence_payload?: Record<string, unknown> | null;
  self_report_score?: number | null;
  mentor_score?: number | null;
  execution_quality?: ExecutionQuality | null;
  friction_reason?: string | null;
  mentor_review_status?: ReviewStatus;
  completed_at?: string | null;
  reviewed_at?: string | null;
  assigned_at?: string | null;
  created_at?: string | null;
}

export interface ClientScores {
  adherence_score: number;
  execution_quality_score: number;
  follow_through_score: number;
  friction_score: number;
  mentor_attention_score: number;
  weekly_momentum_state: MomentumState;
  drivers: Record<string, number>;
}

export interface InterventionItem {
  queue_reason: string;
  severity: TaskPriority;
  summary: string;
  recommended_action: string;
}

export interface MentorPrep {
  execution_state: string;
  said_would_do: string[];
  actually_did: string[];
  highest_friction_area: string | null;
  challenge: string | null;
  simplify: string | null;
  celebrate: string | null;
  top_questions: string[];
  tasks_to_review: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────────
const clamp = (n: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, n));
const avg = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const QUALITY_VALUE: Record<ExecutionQuality, number> = { low: 35, medium: 65, high: 90 };

/** Normaliza el status: `overdue` es derivado del tiempo (no se persiste fijo). */
export function deriveStatus(task: MentorTask, nowMs = Date.now()): TaskStatus {
  const s = task.status ?? 'not_started';
  if (s === 'completed' || s === 'canceled' || s === 'blocked' || s === 'avoided') return s;
  if (task.due_date) {
    const due = Date.parse(task.due_date);
    if (!Number.isNaN(due) && due < nowMs) return 'overdue';
  }
  return s;
}

// ─── Scores individuales ────────────────────────────────────────────────────────
/** A. Adherencia: % de tareas con fecha cumplidas (a destiempo cuenta parcial). */
export function scoreAdherence(tasks: MentorTask[], nowMs = Date.now()): number {
  const relevant = tasks.filter((t) => t.status !== 'canceled' && t.due_date);
  if (relevant.length === 0) return 100;
  let pts = 0;
  for (const t of relevant) {
    if ((t.status ?? '') === 'completed') {
      const onTime = t.completed_at && t.due_date
        ? Date.parse(t.completed_at) <= Date.parse(t.due_date)
        : true;
      pts += onTime ? 1 : 0.6;
    }
  }
  return clamp(Math.round((100 * pts) / relevant.length));
}

/** B. Calidad de ejecución: promedio de calidad revisada (neutral 70 si sin revisar). */
export function scoreExecutionQuality(tasks: MentorTask[]): number {
  const vals: number[] = [];
  for (const t of tasks) {
    if (typeof t.mentor_score === 'number') vals.push(clamp(t.mentor_score));
    else if (t.execution_quality) vals.push(QUALITY_VALUE[t.execution_quality]);
  }
  if (vals.length === 0) return 70;
  return clamp(Math.round(avg(vals)));
}

/** C. Follow-through: % compromisos cumplidos vs hechos. */
export function scoreFollowThrough(made: number, fulfilled: number): number {
  if (made <= 0) return 100;
  return clamp(Math.round((100 * Math.min(fulfilled, made)) / made));
}

/** D. Fricción (mayor = peor): bloqueos + evitación + vencidas sobre el total activo. */
export function scoreFriction(tasks: MentorTask[], nowMs = Date.now()): number {
  const active = tasks.filter((t) => t.status !== 'canceled');
  if (active.length === 0) return 0;
  let f = 0;
  for (const t of active) {
    const st = deriveStatus(t, nowMs);
    if (st === 'blocked') f += 1;
    else if (st === 'avoided') f += 1.2;
    else if (st === 'overdue') f += 0.8;
  }
  return clamp(Math.round((100 * f) / active.length));
}

/** E. Atención del mentor (mayor = intervenir antes). */
export function scoreMentorAttention(p: {
  friction: number;
  adherence: number;
  churnRisk?: number;
  criticalOverdue?: number;
  daysSinceReview?: number;
}): number {
  const churn = clamp((p.churnRisk ?? 0) * 100);
  let s = 0.4 * p.friction + 0.25 * (100 - p.adherence) + 0.15 * churn;
  s += Math.min(20, (p.criticalOverdue ?? 0) * 10);          // cada crítica vencida +10 (tope 20)
  s += Math.min(15, Math.max(0, (p.daysSinceReview ?? 0) - 7)); // >7 días sin review suma
  return clamp(Math.round(s));
}

/** F. Momentum semanal a partir de adherencia + fricción. */
export function momentumState(adherence: number, friction: number): MomentumState {
  if (adherence >= 75 && friction <= 20) return 'rising';
  if (adherence >= 55 && friction <= 40) return 'stable';
  if (adherence >= 40) return 'fragile';
  if (adherence >= 25) return 'declining';
  return 'critical';
}

// ─── Bundle de scores ─────────────────────────────────────────────────────────────
export function computeClientScores(input: {
  tasks: MentorTask[];
  nowMs?: number;
  commitmentsMade?: number;
  commitmentsFulfilled?: number;
  churnRisk?: number;
  daysSinceReview?: number;
}): ClientScores {
  const now = input.nowMs ?? Date.now();
  const tasks = input.tasks ?? [];
  const adherence = scoreAdherence(tasks, now);
  const quality = scoreExecutionQuality(tasks);
  const followThrough = scoreFollowThrough(input.commitmentsMade ?? 0, input.commitmentsFulfilled ?? 0);
  const friction = scoreFriction(tasks, now);

  const counts = { overdue: 0, blocked: 0, avoided: 0, completed: 0, criticalOverdue: 0 };
  for (const t of tasks) {
    const st = deriveStatus(t, now);
    if (st === 'overdue') counts.overdue++;
    if (st === 'blocked') counts.blocked++;
    if (st === 'avoided') counts.avoided++;
    if (st === 'completed') counts.completed++;
    if (st === 'overdue' && t.priority === 'critical') counts.criticalOverdue++;
  }

  const attention = scoreMentorAttention({
    friction,
    adherence,
    churnRisk: input.churnRisk,
    criticalOverdue: counts.criticalOverdue,
    daysSinceReview: input.daysSinceReview,
  });

  return {
    adherence_score: adherence,
    execution_quality_score: quality,
    follow_through_score: followThrough,
    friction_score: friction,
    mentor_attention_score: attention,
    weekly_momentum_state: momentumState(adherence, friction),
    drivers: { ...counts, churnRisk: Math.round((input.churnRisk ?? 0) * 100) },
  };
}

// ─── Diferencial por tier ───────────────────────────────────────────────────────
export function tierDepth(tier?: string | null): TierDepth {
  if (!tier || tier === 'free') return 'basic';
  if (tier === 'premium') return 'full';
  return 'deep'; // premium_plus | polaris | growthplayers
}

// ─── Cola de intervención ─────────────────────────────────────────────────────────
export function buildInterventions(
  scores: ClientScores,
  tasks: MentorTask[],
  nowMs = Date.now(),
): InterventionItem[] {
  const out: InterventionItem[] = [];
  const d = scores.drivers;

  if (scores.mentor_attention_score >= 70) {
    out.push({
      queue_reason: 'high_attention',
      severity: scores.mentor_attention_score >= 85 ? 'critical' : 'high',
      summary: `Atención del mentor en ${scores.mentor_attention_score}/100 (momentum ${scores.weekly_momentum_state}).`,
      recommended_action: 'Agendar intervención esta semana.',
    });
  }
  if ((d.criticalOverdue ?? 0) > 0) {
    out.push({
      queue_reason: 'critical_overdue',
      severity: 'critical',
      summary: `${d.criticalOverdue} tarea(s) crítica(s) vencida(s).`,
      recommended_action: 'Confrontar y re-priorizar de inmediato.',
    });
  }
  if (scores.friction_score >= 60) {
    out.push({
      queue_reason: 'high_friction',
      severity: 'high',
      summary: `Fricción ${scores.friction_score}/100 (${d.blocked} bloqueadas, ${d.avoided} evitadas, ${d.overdue} vencidas).`,
      recommended_action: 'Diagnosticar el bloqueo real; simplificar.',
    });
  }
  if (scores.adherence_score < 40) {
    out.push({
      queue_reason: 'low_adherence',
      severity: scores.adherence_score < 25 ? 'high' : 'medium',
      summary: `Adherencia ${scores.adherence_score}/100.`,
      recommended_action: 'Revisar carga y claridad de las tareas.',
    });
  }
  if ((d.avoided ?? 0) >= 2) {
    out.push({
      queue_reason: 'repeated_avoidance',
      severity: 'high',
      summary: `${d.avoided} tareas evitadas — patrón de evitación.`,
      recommended_action: 'Nombrar la evitación; buscar el miedo debajo.',
    });
  }
  // Falso cumplimiento: completada, requería evidencia, sin payload.
  const falseCompliance = tasks.filter((t) => {
    const st = deriveStatus(t, nowMs);
    const noEvidence = !t.evidence_payload || Object.keys(t.evidence_payload).length === 0;
    return st === 'completed' && t.evidence_required && noEvidence;
  }).length;
  if (falseCompliance > 0) {
    out.push({
      queue_reason: 'false_compliance',
      severity: 'medium',
      summary: `${falseCompliance} tarea(s) marcada(s) hecha(s) sin evidencia.`,
      recommended_action: 'Pedir evidencia concreta antes de aprobar.',
    });
  }
  return out;
}

// ─── Mentor prep (ensamblado determinista) ────────────────────────────────────────
const CATEGORY_LABEL: Record<string, string> = {
  protocolo: 'protocolo', bienestar: 'bienestar', mentoría: 'mentoría', identidad: 'identidad',
  negocio: 'negocio', relaciones: 'relaciones', salud: 'salud', energía: 'energía',
  accountability: 'accountability', hábitos: 'hábitos', decisiones: 'decisiones',
};

/** Categoría con más fricción (bloqueadas+evitadas+vencidas). */
export function highestFrictionCategory(tasks: MentorTask[], nowMs = Date.now()): string | null {
  const tally = new Map<string, number>();
  for (const t of tasks) {
    const st = deriveStatus(t, nowMs);
    if (st === 'blocked' || st === 'avoided' || st === 'overdue') {
      const cat = t.category || 'general';
      tally.set(cat, (tally.get(cat) ?? 0) + 1);
    }
  }
  if (tally.size === 0) return null;
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return CATEGORY_LABEL[top] ?? top;
}

export function assembleMentorPrep(input: {
  tasks: MentorTask[];
  scores: ClientScores;
  commitmentsOpen?: string[];
  recentWins?: string[];
  recurringBlockers?: string[];
  openLoops?: string[];
  mentorshipFocus?: string | null;
  nowMs?: number;
}): MentorPrep {
  const now = input.nowMs ?? Date.now();
  const tasks = input.tasks ?? [];
  const completed = tasks.filter((t) => (t.status ?? '') === 'completed').map((t) => t.title);
  const openTasks = tasks
    .filter((t) => {
      const st = deriveStatus(t, now);
      return st !== 'completed' && st !== 'canceled';
    })
    .sort((a, b) => PRIORITY_RANK[b.priority ?? 'medium'] - PRIORITY_RANK[a.priority ?? 'medium']);

  const frictionArea = highestFrictionCategory(tasks, now);
  const challenge = input.recurringBlockers?.[0]
    ?? (frictionArea ? `Evita la ejecución en ${frictionArea}.` : null);
  const simplify = openTasks.length > 5
    ? `Demasiadas tareas abiertas (${openTasks.length}) — reduce a 3 esta semana.`
    : null;
  const celebrate = input.recentWins?.[0] ?? (completed[0] ? `Completó: ${completed[0]}` : null);

  const questions: string[] = [];
  if (input.openLoops?.[0]) questions.push(input.openLoops[0]);
  if (frictionArea) questions.push(`¿Qué te detuvo en ${frictionArea}?`);
  if (input.commitmentsOpen?.[0]) questions.push(`Dijiste que harías "${input.commitmentsOpen[0]}". ¿Qué pasó?`);
  if (input.mentorshipFocus) questions.push(`¿Avanzaste en: ${input.mentorshipFocus}?`);

  return {
    execution_state:
      `Momentum ${input.scores.weekly_momentum_state} · adherencia ${input.scores.adherence_score} · ` +
      `fricción ${input.scores.friction_score} · atención ${input.scores.mentor_attention_score}.`,
    said_would_do: (input.commitmentsOpen ?? []).slice(0, 5),
    actually_did: completed.slice(0, 5),
    highest_friction_area: frictionArea,
    challenge,
    simplify,
    celebrate,
    top_questions: questions.slice(0, 3),
    tasks_to_review: openTasks.slice(0, 3).map((t) => t.title),
  };
}

const PRIORITY_RANK: Record<TaskPriority, number> = { low: 0, medium: 1, high: 2, critical: 3 };

// ─── Vista cliente (de apoyo; sin lenguaje duro de scoring) ──────────────────────
export interface ClientTaskView {
  /** id de la fila (para completar reusando updateTask); null si la tarea aún no se persistió. */
  id: string | null;
  title: string;
  category: string | null;
  status: TaskStatus;
  due_date: string | null;
  /** Cuándo se asignó la tarea (assigned_at ?? created_at) — base del loop de 24h. */
  assigned_at: string | null;
  done: boolean;
  /** Propuesta por IA aún no confirmada por el coach (estado, NO score — seguro de mostrar). */
  pendingReview: boolean;
}

/** Tareas seguras para el cliente: sin mentor_score, fricción, ni review interno. */
export function clientSafeTasks(tasks: MentorTask[], nowMs = Date.now()): ClientTaskView[] {
  return tasks
    .filter((t) => t.status !== 'canceled')
    .map((t) => {
      const st = deriveStatus(t, nowMs);
      return {
        id: t.id ?? null,
        title: t.title,
        category: t.category ?? null,
        status: st,
        due_date: t.due_date ?? null,
        assigned_at: t.assigned_at ?? t.created_at ?? null,
        done: st === 'completed',
        // 'ai_suggested' = Norman propuso la tarea y el coach aún no la revisó.
        // Es un estado de flujo (no una métrica) → honesto y no sensible.
        pendingReview: t.mentor_review_status === 'ai_suggested',
      };
    });
}

/**
 * Compromisos del cliente declarados hace ≥24h que siguen ABIERTOS — base del
 * prompt de accountability in-app. Puro (recibe `nowMs`), sin IO. Ordena del más
 * antiguo al más reciente para confrontar primero lo que más lleva pendiente.
 */
export function pendingAccountability(
  tasks: ClientTaskView[],
  nowMs = Date.now(),
  minAgeMs = 86_400_000,
): ClientTaskView[] {
  return tasks
    .filter((t) => {
      if (t.done) return false;
      if (!t.assigned_at) return false;
      const ts = Date.parse(t.assigned_at);
      if (Number.isNaN(ts)) return false;
      return nowMs - ts >= minAgeMs;
    })
    .sort((a, b) => Date.parse(a.assigned_at ?? '') - Date.parse(b.assigned_at ?? ''));
}

/** Progreso de apoyo para el cliente (sin exponer atención/fricción). */
export function clientProgress(tasks: MentorTask[]): { done: number; total: number; pct: number } {
  const active = tasks.filter((t) => t.status !== 'canceled');
  const done = active.filter((t) => (t.status ?? '') === 'completed').length;
  const total = active.length;
  return { done, total, pct: total ? Math.round((100 * done) / total) : 0 };
}
