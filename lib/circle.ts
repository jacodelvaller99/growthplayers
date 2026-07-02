/**
 * El Círculo — capa IO (degradable).
 *
 * Todas las lecturas degradan a vacío si la migración 20260702 no está aplicada
 * o si el feature flag está apagado (doble gate: la UI no linkea las superficies
 * y esta capa corta antes de cualquier query). Errores → logSilentError.
 *
 * Privacidad: las conexiones solo las ven sus participantes (RLS); el perfil
 * público expone únicamente name/avatar/tier/streak; los bloqueos del usuario
 * filtran TODAS las superficies (feeds, asistentes, comentarios, solicitudes).
 */

import { ENV } from '@/app/config/env';
import { analytics } from '@/lib/analytics';
import {
  type CircleEvent,
  type Connection,
  type EventInput,
  type PostComment,
  type PostReaction,
  type PublicProfile,
  type ReportTarget,
  type Rsvp,
  type RsvpStatus,
  type Space,
  type SpaceMembership,
} from '@/lib/circleLogic';
import { logSilentError } from '@/lib/observability';
import { supabase } from '@/lib/supabase';

// Tablas nuevas no están en los tipos generados → cliente sin tipar (patrón del feed).
 
const anyDb = supabase as any;

const off = () => !ENV.socialSpacesEnabled;

export interface ActionResult {
  success: boolean;
  error?: string;
  id?: string;
}

// ─── Helpers compartidos ──────────────────────────────────────────────────────

/** IDs bloqueados por el usuario (para filtrar cualquier superficie). */
export async function fetchBlockedIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  try {
    const { data } = await anyDb.from('user_blocks').select('blocked_id').eq('blocker_id', userId);
     
    return new Set<string>((data ?? []).map((b: any) => b.blocked_id as string));
  } catch (e) {
    logSilentError('circle.fetchBlockedIds', e);
    return new Set();
  }
}

/** Resuelve name/avatar de un lote de usuarios (user_profiles). */
export async function fetchNamesFor(ids: string[]): Promise<Record<string, { name: string; avatar: string | null }>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return {};
  try {
    const { data } = await anyDb
      .from('user_profiles')
      .select('user_id, name, avatar_url')
      .in('user_id', unique);
    const map: Record<string, { name: string; avatar: string | null }> = {};
     
    (data ?? []).forEach((p: any) => {
      map[p.user_id] = { name: p.name ?? 'Miembro', avatar: p.avatar_url ?? null };
    });
    return map;
  } catch (e) {
    logSilentError('circle.fetchNamesFor', e);
    return {};
  }
}

// ─── Espacios ─────────────────────────────────────────────────────────────────

export async function fetchSpaces(): Promise<Space[]> {
  if (off()) return [];
  try {
    const { data, error } = await anyDb
      .from('community_spaces')
      .select('*')
      .eq('is_archived', false)
      .order('members_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) throw error;
    return (data ?? []) as Space[];
  } catch (e) {
    logSilentError('circle.fetchSpaces', e);
    return [];
  }
}

export async function fetchSpace(spaceId: string): Promise<Space | null> {
  if (off()) return null;
  try {
    const { data } = await anyDb.from('community_spaces').select('*').eq('id', spaceId).maybeSingle();
    return (data as Space) ?? null;
  } catch (e) {
    logSilentError('circle.fetchSpace', e);
    return null;
  }
}

export async function fetchMyMemberships(userId: string | null): Promise<SpaceMembership[]> {
  if (off() || !userId) return [];
  try {
    const { data } = await anyDb.from('space_members').select('space_id, user_id, role, joined_at').eq('user_id', userId);
    return (data ?? []) as SpaceMembership[];
  } catch (e) {
    logSilentError('circle.fetchMyMemberships', e);
    return [];
  }
}

export async function createSpace(
  userId: string,
  name: string,
  description: string,
  emoji: string | null,
): Promise<ActionResult> {
  if (off()) return { success: false, error: 'El Círculo no está activo.' };
  try {
    const { data, error } = await anyDb
      .from('community_spaces')
      .insert({ created_by: userId, name: name.trim(), description: description.trim() || null, emoji })
      .select('id')
      .single();
    if (error) throw error;
    const spaceId = data.id as string;
    // El creador entra como owner. Si este insert falla, el espacio existe igual
    // (RLS UPDATE/DELETE usa created_by, no la membresía).
    await anyDb.from('space_members').insert({ space_id: spaceId, user_id: userId, role: 'owner' });
    analytics.track('space_created', { space_id: spaceId });
    return { success: true, id: spaceId };
  } catch (e) {
    logSilentError('circle.createSpace', e);
    return { success: false, error: 'No se pudo crear el espacio. Intenta de nuevo.' };
  }
}

export async function joinSpace(userId: string, spaceId: string): Promise<ActionResult> {
  if (off()) return { success: false };
  try {
    const { error } = await anyDb
      .from('space_members')
      .upsert({ space_id: spaceId, user_id: userId, role: 'member' }, { onConflict: 'space_id,user_id', ignoreDuplicates: true });
    if (error) throw error;
    analytics.track('space_joined', { space_id: spaceId });
    return { success: true };
  } catch (e) {
    logSilentError('circle.joinSpace', e);
    return { success: false, error: 'No se pudo unir al espacio.' };
  }
}

export async function leaveSpace(userId: string, spaceId: string): Promise<ActionResult> {
  if (off()) return { success: false };
  try {
    const { error } = await anyDb.from('space_members').delete().eq('space_id', spaceId).eq('user_id', userId);
    if (error) throw error;
    analytics.track('space_left', { space_id: spaceId });
    return { success: true };
  } catch (e) {
    logSilentError('circle.leaveSpace', e);
    return { success: false, error: 'No se pudo salir del espacio.' };
  }
}

// ─── Eventos + RSVP ───────────────────────────────────────────────────────────

export async function fetchEvents(spaceId?: string): Promise<CircleEvent[]> {
  if (off()) return [];
  try {
    let q = anyDb.from('community_events').select('*').order('starts_at', { ascending: true }).limit(100);
    if (spaceId) q = q.eq('space_id', spaceId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as CircleEvent[];
  } catch (e) {
    logSilentError('circle.fetchEvents', e);
    return [];
  }
}

export async function fetchEvent(eventId: string): Promise<CircleEvent | null> {
  if (off()) return null;
  try {
    const { data } = await anyDb.from('community_events').select('*').eq('id', eventId).maybeSingle();
    return (data as CircleEvent) ?? null;
  } catch (e) {
    logSilentError('circle.fetchEvent', e);
    return null;
  }
}

export async function createEvent(
  userId: string,
  input: EventInput,
  spaceId: string | null,
): Promise<ActionResult> {
  if (off()) return { success: false, error: 'El Círculo no está activo.' };
  try {
    const { data, error } = await anyDb
      .from('community_events')
      .insert({
        created_by: userId,
        space_id: spaceId,
        title: input.title.trim(),
        description: input.description.trim() || null,
        starts_at: input.startsAt!.toISOString(),
        duration_minutes: input.durationMinutes,
        location_type: input.locationType,
        location_text: input.locationText.trim(),
        capacity: input.capacity,
      })
      .select('id')
      .single();
    if (error) throw error;
    analytics.track('event_created', { event_id: data.id, space_id: spaceId ?? undefined });
    return { success: true, id: data.id as string };
  } catch (e) {
    logSilentError('circle.createEvent', e);
    return { success: false, error: 'No se pudo crear el evento. Intenta de nuevo.' };
  }
}

/** RSVP con semántica replace (UNIQUE event_id+user_id en BD). */
export async function setRsvp(userId: string, eventId: string, status: RsvpStatus): Promise<ActionResult> {
  if (off()) return { success: false };
  try {
    const { error } = await anyDb
      .from('event_rsvps')
      .upsert({ event_id: eventId, user_id: userId, status }, { onConflict: 'event_id,user_id' });
    if (error) throw error;
    analytics.track('event_rsvp', { event_id: eventId, status });
    return { success: true };
  } catch (e) {
    logSilentError('circle.setRsvp', e);
    return { success: false, error: 'No se pudo guardar tu asistencia.' };
  }
}

export async function fetchMyRsvps(userId: string | null): Promise<Rsvp[]> {
  if (off() || !userId) return [];
  try {
    const { data } = await anyDb.from('event_rsvps').select('event_id, user_id, status').eq('user_id', userId);
    return (data ?? []) as Rsvp[];
  } catch (e) {
    logSilentError('circle.fetchMyRsvps', e);
    return [];
  }
}

export interface Attendee {
  user_id: string;
  status: RsvpStatus;
  name: string;
  avatar: string | null;
}

export async function fetchAttendees(eventId: string): Promise<Attendee[]> {
  if (off()) return [];
  try {
    const { data } = await anyDb.from('event_rsvps').select('user_id, status').eq('event_id', eventId);
    const rows = (data ?? []) as { user_id: string; status: RsvpStatus }[];
    const names = await fetchNamesFor(rows.map((r) => r.user_id));
    return rows.map((r) => ({
      user_id: r.user_id,
      status: r.status,
      name: names[r.user_id]?.name ?? 'Miembro',
      avatar: names[r.user_id]?.avatar ?? null,
    }));
  } catch (e) {
    logSilentError('circle.fetchAttendees', e);
    return [];
  }
}

export async function cancelEvent(eventId: string): Promise<ActionResult> {
  if (off()) return { success: false };
  try {
    const { error } = await anyDb.from('community_events').update({ status: 'cancelled' }).eq('id', eventId);
    if (error) throw error;
    return { success: true };
  } catch (e) {
    logSilentError('circle.cancelEvent', e);
    return { success: false, error: 'No se pudo cancelar el evento.' };
  }
}

// ─── Conexiones ───────────────────────────────────────────────────────────────

export async function fetchMyConnections(userId: string | null): Promise<Connection[]> {
  if (off() || !userId) return [];
  try {
    const { data } = await anyDb
      .from('user_connections')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    return (data ?? []) as Connection[];
  } catch (e) {
    logSilentError('circle.fetchMyConnections', e);
    return [];
  }
}

export async function fetchConnectionWith(userId: string, otherId: string): Promise<Connection | null> {
  if (off()) return null;
  try {
    const { data } = await anyDb
      .from('user_connections')
      .select('*')
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${userId})`,
      )
      .maybeSingle();
    return (data as Connection) ?? null;
  } catch (e) {
    logSilentError('circle.fetchConnectionWith', e);
    return null;
  }
}

export async function requestConnection(userId: string, targetId: string): Promise<ActionResult> {
  if (off()) return { success: false };
  if (userId === targetId) return { success: false, error: 'No puedes conectar contigo mismo.' };
  try {
    const { error } = await anyDb
      .from('user_connections')
      .insert({ requester_id: userId, addressee_id: targetId, status: 'pending' });
    if (error) throw error;
    analytics.track('connection_requested', {});
    return { success: true };
  } catch (e) {
    logSilentError('circle.requestConnection', e);
    // El índice único par-ordenado rechaza duplicados A→B / B→A.
    return { success: false, error: 'Ya existe una solicitud o conexión con este miembro.' };
  }
}

export async function acceptConnection(connectionId: string): Promise<ActionResult> {
  if (off()) return { success: false };
  try {
    const { error } = await anyDb
      .from('user_connections')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', connectionId);
    if (error) throw error;
    analytics.track('connection_accepted', {});
    return { success: true };
  } catch (e) {
    logSilentError('circle.acceptConnection', e);
    return { success: false, error: 'No se pudo aceptar la solicitud.' };
  }
}

/** Rechazar solicitud o deshacer conexión (DELETE — permite re-solicitar). */
export async function removeConnection(connectionId: string): Promise<ActionResult> {
  if (off()) return { success: false };
  try {
    const { error } = await anyDb.from('user_connections').delete().eq('id', connectionId);
    if (error) throw error;
    return { success: true };
  } catch (e) {
    logSilentError('circle.removeConnection', e);
    return { success: false, error: 'No se pudo eliminar la conexión.' };
  }
}

// ─── Comentarios ──────────────────────────────────────────────────────────────

export async function fetchComments(postId: string): Promise<PostComment[]> {
  if (off()) return [];
  try {
    const { data } = await anyDb
      .from('post_comments')
      .select('id, post_id, user_id, content, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(100);
    const rows = (data ?? []) as Omit<PostComment, 'author_name' | 'author_avatar'>[];
    const names = await fetchNamesFor(rows.map((r) => r.user_id));
    return rows.map((r) => ({
      ...r,
      author_name: names[r.user_id]?.name ?? 'Miembro',
      author_avatar: names[r.user_id]?.avatar ?? null,
    }));
  } catch (e) {
    logSilentError('circle.fetchComments', e);
    return [];
  }
}

export async function addComment(userId: string, postId: string, content: string): Promise<ActionResult> {
  if (off()) return { success: false };
  try {
    const { data, error } = await anyDb
      .from('post_comments')
      .insert({ post_id: postId, user_id: userId, content: content.trim() })
      .select('id')
      .single();
    if (error) throw error;
    analytics.track('comment_created', { post_id: postId });
    return { success: true, id: data.id as string };
  } catch (e) {
    logSilentError('circle.addComment', e);
    return { success: false, error: 'No se pudo publicar el comentario.' };
  }
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  if (off()) return { success: false };
  try {
    const { error } = await anyDb.from('post_comments').delete().eq('id', commentId);
    if (error) throw error;
    return { success: true };
  } catch (e) {
    logSilentError('circle.deleteComment', e);
    return { success: false, error: 'No se pudo eliminar el comentario.' };
  }
}

// ─── Reacciones de posts (una por usuario, replace) ───────────────────────────

export async function fetchReactionsFor(postIds: string[]): Promise<PostReaction[]> {
  if (off() || postIds.length === 0) return [];
  try {
    const { data } = await anyDb
      .from('community_reactions')
      .select('post_id, user_id, type')
      .in('post_id', postIds);
    return (data ?? []) as PostReaction[];
  } catch (e) {
    logSilentError('circle.fetchReactionsFor', e);
    return [];
  }
}

/** Pone/reemplaza mi reacción ('like' o emoji del catálogo). */
export async function setPostReaction(userId: string, postId: string, type: string): Promise<ActionResult> {
  if (off()) return { success: false };
  try {
    const { error } = await anyDb
      .from('community_reactions')
      .upsert({ post_id: postId, user_id: userId, type }, { onConflict: 'post_id,user_id' });
    if (error) throw error;
    analytics.track('post_reaction', { post_id: postId, type });
    return { success: true };
  } catch (e) {
    logSilentError('circle.setPostReaction', e);
    return { success: false };
  }
}

export async function removePostReaction(userId: string, postId: string): Promise<ActionResult> {
  if (off()) return { success: false };
  try {
    const { error } = await anyDb.from('community_reactions').delete().eq('post_id', postId).eq('user_id', userId);
    if (error) throw error;
    return { success: true };
  } catch (e) {
    logSilentError('circle.removePostReaction', e);
    return { success: false };
  }
}

// ─── Perfil público mínimo ────────────────────────────────────────────────────

export async function fetchPublicProfile(userId: string): Promise<PublicProfile | null> {
  if (off()) return null;
  try {
    const { data } = await anyDb
      .from('user_profiles')
      .select('user_id, name, avatar_url, tier, streak')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) return null;
    return {
      user_id: data.user_id,
      name: data.name ?? 'Miembro',
      avatar_url: data.avatar_url ?? null,
      tier: data.tier ?? null,
      streak: data.streak ?? null,
    };
  } catch (e) {
    logSilentError('circle.fetchPublicProfile', e);
    return null;
  }
}

// ─── Reportes polimórficos (App Store 1.2) ────────────────────────────────────

export async function reportTarget(
  reporterId: string,
  targetType: ReportTarget,
  targetId: string,
  reason: string,
): Promise<ActionResult> {
  // Reportar NO se gatea por flag: si algo llegó a verse, debe poder reportarse.
  try {
    const { error } = await anyDb.from('community_reports').insert({
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      post_id: targetType === 'post' ? targetId : null,
      reason,
    });
    if (error) throw error;
    return { success: true };
  } catch (e) {
    logSilentError('circle.reportTarget', e);
    return { success: false, error: 'No se pudo enviar el reporte.' };
  }
}
