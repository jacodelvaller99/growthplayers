/**
 * El Círculo — lógica PURA (sin IO, sin Date.now: `now` siempre inyectado).
 *
 * Shapes + reglas de la red social interna: estado de conexión par-ordenado,
 * orden de eventos, cupo, agregación de RSVP y reacciones, permisos,
 * filtrado de autores bloqueados y validación de inputs (reusa el filtro
 * de moderación existente). Testeado en __tests__/unit/circleLogic.test.ts.
 */

import { containsBannedContent } from '@/data/moderation';

// ─── Shapes ───────────────────────────────────────────────────────────────────

export interface Space {
  id: string;
  created_by: string;
  name: string;
  description: string | null;
  emoji: string | null;
  members_count: number;
  is_archived: boolean;
  created_at: string;
}

export type SpaceRole = 'owner' | 'member';

export interface SpaceMembership {
  space_id: string;
  user_id: string;
  role: SpaceRole;
  joined_at: string;
}

export type EventStatus = 'scheduled' | 'cancelled';
export type LocationType = 'virtual' | 'in_person';

export interface CircleEvent {
  id: string;
  space_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_minutes: number;
  timezone: string;
  location_type: LocationType;
  location_text: string | null;
  capacity: number | null;
  status: EventStatus;
  going_count: number;
  created_at: string;
}

export type RsvpStatus = 'going' | 'maybe' | 'declined';

export interface Rsvp {
  event_id: string;
  user_id: string;
  status: RsvpStatus;
}

export type ConnectionStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

export interface Connection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  responded_at: string | null;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
}

/** Reacción de post: UNA por usuario por post (UNIQUE en BD, semántica replace). */
export interface PostReaction {
  post_id: string;
  user_id: string;
  type: string; // 'like' | emoji
}

export const POST_REACTION_EMOJIS = ['🔥', '💪', '🙏', '👏', '❤️'] as const;

/** ÚNICO shape expuesto entre usuarios — nada sensible sale de aquí. */
export interface PublicProfile {
  user_id: string;
  name: string;
  avatar_url: string | null;
  tier: string | null;
  streak: number | null;
}

export type ReportTarget = 'post' | 'comment' | 'event' | 'space';

// ─── Conexiones ───────────────────────────────────────────────────────────────

/** Estado de la relación desde el punto de vista de `myId`. */
export function connectionStateFor(myId: string, conn: Connection | null | undefined): ConnectionStatus {
  if (!conn) return 'none';
  if (conn.status === 'accepted') return 'accepted';
  return conn.requester_id === myId ? 'pending_sent' : 'pending_received';
}

/** El otro participante de una conexión. */
export function connectionPeerId(myId: string, conn: Connection): string {
  return conn.requester_id === myId ? conn.addressee_id : conn.requester_id;
}

// ─── Eventos ──────────────────────────────────────────────────────────────────

/** Fin del evento (inicio + duración) en ms epoch. */
function eventEndMs(e: CircleEvent): number {
  return new Date(e.starts_at).getTime() + e.duration_minutes * 60_000;
}

/** ¿Sigue vigente (programado y aún no terminó) respecto a `now`? */
export function isUpcoming(e: CircleEvent, now: Date): boolean {
  return e.status === 'scheduled' && eventEndMs(e) >= now.getTime();
}

/**
 * Orden para listas: vigentes primero (más próximo arriba), luego pasados/
 * cancelados (más reciente arriba).
 */
export function sortUpcomingEvents(events: CircleEvent[], now: Date): CircleEvent[] {
  const up = events.filter((e) => isUpcoming(e, now))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const past = events.filter((e) => !isUpcoming(e, now))
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  return [...up, ...past];
}

export type CapacityState = 'unlimited' | 'open' | 'full';

export function eventCapacityState(e: CircleEvent): CapacityState {
  if (e.capacity == null) return 'unlimited';
  return e.going_count >= e.capacity ? 'full' : 'open';
}

export function rsvpSummary(rsvps: Rsvp[]): { going: number; maybe: number } {
  let going = 0;
  let maybe = 0;
  for (const r of rsvps) {
    if (r.status === 'going') going += 1;
    else if (r.status === 'maybe') maybe += 1;
  }
  return { going, maybe };
}

/**
 * Fecha corta es-CO para tarjetas: "mié, 8 jul, 7:00 p. m." (usa el timezone
 * del evento; determinístico — no toca el reloj del dispositivo).
 */
export function formatEventDate(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: 'numeric', minute: '2-digit', timeZone,
    }).format(new Date(iso));
  } catch {
    // timezone inválido → fallback sin tz (mejor una fecha que un crash)
    return new Intl.DateTimeFormat('es-CO', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: 'numeric', minute: '2-digit',
    }).format(new Date(iso));
  }
}

// ─── Permisos ─────────────────────────────────────────────────────────────────

export function canManageSpace(role: SpaceRole | null | undefined, isAdmin: boolean): boolean {
  return isAdmin || role === 'owner';
}

export function canManageEvent(userId: string | null | undefined, event: CircleEvent, isAdmin: boolean): boolean {
  return isAdmin || (!!userId && event.created_by === userId);
}

// ─── Reacciones ───────────────────────────────────────────────────────────────

export interface ReactionGroup {
  type: string;
  count: number;
  mine: boolean;
}

/** Agrupa reacciones por tipo (orden estable: like, luego catálogo de emojis, luego resto). */
export function groupReactions(reactions: PostReaction[], myId: string | null): ReactionGroup[] {
  const order = ['like', ...POST_REACTION_EMOJIS] as string[];
  const map = new Map<string, ReactionGroup>();
  for (const r of reactions) {
    const g = map.get(r.type) ?? { type: r.type, count: 0, mine: false };
    g.count += 1;
    if (myId && r.user_id === myId) g.mine = true;
    map.set(r.type, g);
  }
  return [...map.values()].sort((a, b) => {
    const ia = order.indexOf(a.type);
    const ib = order.indexOf(b.type);
    return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib);
  });
}

// ─── Bloqueos ─────────────────────────────────────────────────────────────────

/** Filtra cualquier lista de items con autor por el set de bloqueados. */
export function filterBlockedAuthors<T extends { user_id: string }>(items: T[], blockedIds: Set<string>): T[] {
  if (blockedIds.size === 0) return items;
  return items.filter((i) => !blockedIds.has(i.user_id));
}

// ─── Validación de inputs (reusa el filtro de moderación) ────────────────────

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateSpaceInput(name: string, description: string): ValidationResult {
  const n = name.trim();
  if (n.length < 3 || n.length > 60) return { ok: false, error: 'El nombre debe tener entre 3 y 60 caracteres.' };
  if (description.trim().length > 280) return { ok: false, error: 'La descripción no puede superar 280 caracteres.' };
  if (containsBannedContent(n) || containsBannedContent(description)) {
    return { ok: false, error: 'El contenido viola el código de la comunidad.' };
  }
  return { ok: true };
}

export interface EventInput {
  title: string;
  description: string;
  startsAt: Date | null;
  durationMinutes: number;
  locationType: LocationType;
  locationText: string;
  capacity: number | null;
}

export function validateEventInput(input: EventInput, now: Date): ValidationResult {
  const t = input.title.trim();
  if (t.length < 3 || t.length > 80) return { ok: false, error: 'El título debe tener entre 3 y 80 caracteres.' };
  if (input.description.trim().length > 500) return { ok: false, error: 'La descripción no puede superar 500 caracteres.' };
  if (!input.startsAt || Number.isNaN(input.startsAt.getTime())) return { ok: false, error: 'Elige fecha y hora válidas.' };
  if (input.startsAt.getTime() <= now.getTime()) return { ok: false, error: 'El evento debe ser en el futuro.' };
  if (input.durationMinutes < 15 || input.durationMinutes > 480) return { ok: false, error: 'La duración debe estar entre 15 minutos y 8 horas.' };
  if (input.locationText.trim().length === 0) {
    return { ok: false, error: input.locationType === 'virtual' ? 'Añade el link de la llamada.' : 'Añade el lugar del encuentro.' };
  }
  if (input.locationText.trim().length > 200) return { ok: false, error: 'El lugar/link no puede superar 200 caracteres.' };
  if (input.capacity != null && (input.capacity < 2 || input.capacity > 500)) {
    return { ok: false, error: 'El cupo debe estar entre 2 y 500.' };
  }
  if (containsBannedContent(t) || containsBannedContent(input.description) || containsBannedContent(input.locationText)) {
    return { ok: false, error: 'El contenido viola el código de la comunidad.' };
  }
  return { ok: true };
}
