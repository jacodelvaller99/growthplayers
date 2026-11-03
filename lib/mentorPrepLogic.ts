/**
 * mentorPrepLogic — lógica pura de "Preparar sesión" (dossier del cliente).
 *
 * El dossier mostraba scores que se contradecían con la realidad (adherencia
 * 100 a un cliente con 63 días sin entrar), compromisos de hace dos meses como
 * "abiertos" y el mismo compromiso dos veces (el del mentor y el de la IA).
 * Aquí se calcula lo que el mentor necesita ver ANTES de la sesión, solo con
 * datos reales y explicables.
 */

const DAY = 86_400_000;
/** Un compromiso de una sesión se espera cumplido antes de la siguiente. */
export const COMMITMENT_WINDOW_DAYS = 7;

/** Fecha de solo-día ("2026-08-31") como mediodía LOCAL: `new Date('2026-08-31')`
 * es medianoche UTC, que en Colombia se pinta como el día anterior. */
export function parseDay(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDay(value: string | null | undefined, withYear = true): string {
  const d = parseDay(value);
  if (!d) return '—';
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) });
}

// ─── Duplicados ──────────────────────────────────────────────────────────────
const STOP = new Set(['para', 'antes', 'esta', 'este', 'semana', 'sesion', 'sesión', 'durante', 'todos', 'todas', 'cada', 'desde', 'sobre', 'hasta', 'mañana']);

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !STOP.has(w))
      .map((w) => (w.length > 5 ? w.replace(/s$/, '') : w)), // ponytail: plural ingenuo, sin stemmer
  );
}

/** Dos acciones dicen lo mismo con otras palabras ("Revisar el módulo de
 * onboarding…" vs "Completa el módulo de onboarding…"). Heurística: la mitad
 * de las palabras con contenido de la más corta están en la otra. */
export function isSameAction(a: string, b: string): boolean {
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return a.trim().toLowerCase() === b.trim().toLowerCase();
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / Math.min(wa.size, wb.size) >= 0.5;
}

/** Quita los repetidos conservando el primero (el del mentor va antes que el de la IA). */
export function dedupeActions<T extends { text: string }>(items: T[]): T[] {
  const out: T[] = [];
  for (const it of items) if (!out.some((o) => isSameAction(o.text, it.text))) out.push(it);
  return out;
}

// ─── Compromisos con estado ──────────────────────────────────────────────────
export type CommitmentState = 'vencido' | 'abierto' | 'cumplido';

export interface PrepSession {
  id: string;
  week: number | null;
  session_date: string | null;
  created_at: string;
  action_plan: unknown[];
}

export interface PrepCommitment {
  sessionId: string;
  /** Índice en el action_plan original — para marcarlo hecho sin reescribir el resto. */
  index: number;
  text: string;
  state: CommitmentState;
  week: number | null;
  /** Días desde que venció (solo si vencido). */
  overdueDays: number;
  fromAI: boolean;
}

function planText(it: unknown): string {
  if (typeof it === 'string') return it;
  const o = it as { title?: string; task?: string; text?: string } | null;
  return (o?.title ?? o?.task ?? o?.text ?? '').trim();
}

/** Compromisos de la sesión más reciente con plan, sin repetidos y con su estado. */
export function prepCommitments(sessions: PrepSession[], nowMs = Date.now()): PrepCommitment[] {
  const withPlan = sessions.filter((s) => s.action_plan.some((it) => planText(it)));
  if (withPlan.length === 0) return [];
  const sessDay = (s: PrepSession) => parseDay(s.session_date)?.getTime() ?? parseDay(s.created_at)?.getTime() ?? 0;
  const latest = [...withPlan].sort((a, b) => (b.week ?? 0) - (a.week ?? 0) || sessDay(b) - sessDay(a))[0];
  const dueMs = sessDay(latest) + COMMITMENT_WINDOW_DAYS * DAY;
  const items = latest.action_plan
    .map((it, index) => {
      const o = (typeof it === 'object' && it ? it : {}) as { done?: boolean; source?: string };
      return { it, index, text: planText(it), done: Boolean(o.done), fromAI: o.source === 'auto' || o.source === 'ia' };
    })
    .filter((x) => x.text);
  return dedupeActions(items).map((x) => {
    const overdue = !x.done && nowMs > dueMs;
    return {
      sessionId: latest.id,
      index: x.index,
      text: x.text,
      state: x.done ? 'cumplido' : overdue ? 'vencido' : 'abierto',
      week: latest.week,
      overdueDays: overdue ? Math.floor((nowMs - dueMs) / DAY) : 0,
      fromAI: x.fromAI,
    };
  });
}

// ─── Señales reales ──────────────────────────────────────────────────────────
export type SignalTone = 'ok' | 'watch' | 'alert';

export interface PrepSignals {
  daysSinceActivity: number | null;
  checkIns7d: number;
  everCheckedIn: boolean;
  done: number;
  total: number;
  overdue: number;
  tone: SignalTone;
  /** Una línea, en palabras del mentor. */
  headline: string;
}

export function prepSignals(input: {
  activityDates: (string | null | undefined)[];
  checkInDates: string[];
  commitments: PrepCommitment[];
  nowMs?: number;
}): PrepSignals {
  const now = input.nowMs ?? Date.now();
  const times = input.activityDates.map((d) => parseDay(d)?.getTime()).filter((t): t is number => t != null && t <= now);
  const last = times.length ? Math.max(...times) : null;
  const daysSinceActivity = last == null ? null : Math.floor((now - last) / DAY);
  const checkIns7d = input.checkInDates.filter((d) => {
    const t = parseDay(d)?.getTime();
    return t != null && now - t <= 7 * DAY;
  }).length;
  const done = input.commitments.filter((c) => c.state === 'cumplido').length;
  const overdue = input.commitments.filter((c) => c.state === 'vencido').length;
  const total = input.commitments.length;

  const parts: string[] = [];
  if (daysSinceActivity == null) parts.push('Sin actividad registrada en la app');
  else if (daysSinceActivity === 0) parts.push('Activo hoy');
  else parts.push(`${daysSinceActivity} ${daysSinceActivity === 1 ? 'día' : 'días'} sin actividad`);
  if (input.checkInDates.length === 0) parts.push('nunca ha hecho check-in');
  else parts.push(`${checkIns7d} check-in${checkIns7d === 1 ? '' : 's'} esta semana`);
  if (total > 0) parts.push(`${done} de ${total} compromisos cumplidos`);

  const silent = daysSinceActivity == null || daysSinceActivity >= 14;
  const tone: SignalTone =
    silent || (total > 0 && overdue >= Math.ceil(total / 2)) ? 'alert'
    : (daysSinceActivity ?? 0) >= 5 || overdue > 0 || checkIns7d === 0 ? 'watch'
    : 'ok';

  return {
    daysSinceActivity,
    checkIns7d,
    everCheckedIn: input.checkInDates.length > 0,
    done,
    total,
    overdue,
    tone,
    headline: parts.join(' · '),
  };
}
