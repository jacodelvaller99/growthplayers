/**
 * mentorDeskLogic — lógica pura del Espacio del Mentor (autosave por semana).
 */
import { calcProtocolDay } from '@/lib/utils';
import { currentWeekNumber, TOTAL_WEEKS } from '@/data/mentorship';

/**
 * Identificador estable de la fila "de escritorio" de una semana. Hace el
 * autosave idempotente: mismo (user_id, client_id) → mismo upsert siempre.
 */
export function deskClientId(week: number): string {
  const w = Math.max(1, Math.trunc(week) || 1);
  return `desk:w${w}`;
}

/**
 * Semana activa del Espacio del Mentor: derivada del protocolo si hay fecha
 * de inicio; si no (o la fecha es inválida), la semana más alta con sesión
 * registrada; si tampoco hay eso, 1.
 */
export function deskWeek(
  protocolStartDate: string | null | undefined,
  sessions: { week: number | null }[],
): number {
  if (protocolStartDate) {
    const day = calcProtocolDay(protocolStartDate);
    if (!Number.isNaN(day)) return currentWeekNumber(day);
  }
  const maxWeek = sessions.reduce((max, s) => (s.week && s.week > max ? s.week : max), 0);
  return maxWeek > 0 ? Math.min(maxWeek, TOTAL_WEEKS) : 1;
}

export interface DeskWeekSplit<T> {
  /** La fila del escritorio de esta semana (client_id estable), o null si aún no se ha escrito. */
  draft: T | null;
  /** Resto de sesiones de la misma semana (notas legacy anteriores al autosave), mismo orden de entrada. */
  previous: T[];
}

/** Separa las sesiones de una semana entre el draft del escritorio y las notas anteriores. */
export function splitWeekSessions<T extends { week: number | null; client_id?: string | null }>(
  sessions: T[],
  week: number,
): DeskWeekSplit<T> {
  const id = deskClientId(week);
  const ofWeek = sessions.filter((s) => s.week === week);
  const draft = ofWeek.find((s) => s.client_id === id) ?? null;
  const previous = ofWeek.filter((s) => s !== draft);
  return { draft, previous };
}
