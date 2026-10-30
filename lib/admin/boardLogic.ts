/**
 * boardLogic — el tablero de mentorías (patrón LifeFlow), puro y testeable.
 *
 * Cada cliente cae en UNA etapa, por prioridad: lo que espera al mentor
 * primero, luego lo nuevo, luego quien dejó de registrarse, y al final quien
 * va al día. La lista sale en ese mismo orden: el mentor empieza arriba y baja.
 */

export type BoardStage = 'review' | 'new' | 'silent' | 'onPlan';

export interface BoardSourceClient {
  user_id: string;
  name: string | null;
  mentor_id: string | null;
  joined_at: string | null;
  assigned_at: string | null;
  last_checkin_date: string | null;
  sessions_count: number;
  last_session_date: string | null;
}

export interface BoardSignals {
  attention: number;
  overdue: number;
  topReason: string | null;
}

export interface BoardClient extends BoardSourceClient {
  name: string;
  stage: BoardStage;
  reason: string;
  /** Días desde el último check-in; null si nunca hizo uno. */
  daysSilent: number | null;
}

export const STAGE_ORDER: BoardStage[] = ['review', 'new', 'silent', 'onPlan'];

export const STAGE_COPY: Record<BoardStage, { title: string; hint: string }> = {
  review: { title: 'Por revisar', hint: 'Te esperan a ti' },
  new:    { title: 'Nuevos', hint: 'Aún sin primera sesión' },
  silent: { title: 'Sin check-in', hint: '3 días o más sin registrarse' },
  onPlan: { title: 'En plan', hint: 'Siguen su plan' },
};

const DAY = 24 * 60 * 60 * 1000;
const NEW_WINDOW_DAYS = 14;
const SILENT_DAYS = 3;

function daysBetween(fromIso: string, now: number): number {
  return Math.floor((now - new Date(fromIso).getTime()) / DAY);
}

export function classifyClient(
  c: BoardSourceClient,
  signals: BoardSignals | undefined,
  now: number,
): BoardClient {
  const name = c.name?.trim() || 'Cliente';
  const daysSilent = c.last_checkin_date ? daysBetween(c.last_checkin_date, now) : null;
  const since = c.assigned_at ?? c.joined_at;
  const isNew = c.sessions_count === 0 && (!since || daysBetween(since, now) <= NEW_WINDOW_DAYS);

  if (signals && (signals.attention > 0 || signals.overdue > 0)) {
    const reason = signals.topReason
      ?? (signals.overdue > 0
        ? `${signals.overdue} tarea${signals.overdue === 1 ? '' : 's'} vencida${signals.overdue === 1 ? '' : 's'}`
        : 'Tiene algo pendiente de tu revisión');
    return { ...c, name, stage: 'review', reason, daysSilent };
  }
  if (isNew) {
    return { ...c, name, stage: 'new', reason: 'Agenda su primera sesión', daysSilent };
  }
  if (daysSilent === null || daysSilent >= SILENT_DAYS) {
    const reason = daysSilent === null ? 'Nunca ha hecho check-in' : `${daysSilent} días sin check-in · recuérdale`;
    return { ...c, name, stage: 'silent', reason, daysSilent };
  }
  const reason = c.last_session_date
    ? `Última sesión ${new Date(c.last_session_date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`
    : 'Al día con su check-in';
  return { ...c, name, stage: 'onPlan', reason, daysSilent };
}

export interface Board {
  clients: BoardClient[];
  counts: Record<BoardStage, number>;
}

export function buildBoard(
  source: BoardSourceClient[],
  signalsByUser: Map<string, BoardSignals>,
  now: number = Date.now(),
): Board {
  const clients = source.map((c) => classifyClient(c, signalsByUser.get(c.user_id), now));
  const rank = (s: BoardStage) => STAGE_ORDER.indexOf(s);
  clients.sort((a, b) =>
    rank(a.stage) - rank(b.stage)
    // Dentro de "sin check-in", el más callado primero.
    || (b.daysSilent ?? 9999) - (a.daysSilent ?? 9999)
    || a.name.localeCompare(b.name, 'es'));
  const counts: Record<BoardStage, number> = { review: 0, new: 0, silent: 0, onPlan: 0 };
  for (const c of clients) counts[c.stage] += 1;
  return { clients, counts };
}
