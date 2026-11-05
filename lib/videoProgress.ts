/**
 * Progreso de video con la API del reproductor de Vimeo (postMessage).
 * `nextProgress` es puro: acumula lo visto sin contar saltos hacia adelante.
 * Guarda en `video_progress` (migración 20261105010000) cada 15 s y al pausar
 * o terminar; si la tabla no existe, no rompe nada.
 */
import { supabase } from '@/lib/supabase';
import { logSilentError } from '@/lib/observability';

export type VideoProgress = {
  duration: number;
  maxPercent: number; // 0–1
  watched: number;    // segundos realmente reproducidos
  lastSecond: number;
  completed: boolean;
};

export const EMPTY_PROGRESS: VideoProgress = { duration: 0, maxPercent: 0, watched: 0, lastSecond: 0, completed: false };
const COMPLETE_AT = 0.9;
const MAX_TICK = 5; // un salto mayor a 5 s entre muestras es un seek, no reproducción

export function nextProgress(p: VideoProgress, s: { seconds: number; percent: number; duration: number }): VideoProgress {
  const delta = s.seconds - p.lastSecond;
  const watched = delta > 0 && delta <= MAX_TICK ? p.watched + delta : p.watched;
  const maxPercent = Math.max(p.maxPercent, Math.min(1, s.percent));
  return {
    duration: s.duration || p.duration,
    maxPercent,
    watched,
    lastSecond: s.seconds,
    completed: p.completed || maxPercent >= COMPLETE_AT,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supa = supabase as any;

export async function saveVideoProgress(videoId: string, lessonId: string | undefined, p: VideoProgress, wasCompleted: boolean) {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    const now = new Date().toISOString();
    const { data: prev } = await supa.from('video_progress')
      .select('max_percent, watched_s, completed').eq('user_id', uid).eq('video_id', videoId).maybeSingle();
    const row = {
      user_id: uid,
      video_id: videoId,
      lesson_id: lessonId ?? null,
      duration_s: p.duration || null,
      // Nunca retrocede: volver a ver desde el inicio no borra lo ya visto.
      max_percent: Math.max(prev?.max_percent ?? 0, p.maxPercent),
      watched_s: Math.max(prev?.watched_s ?? 0, p.watched),
      completed: !!prev?.completed || p.completed,
      ...(p.completed && !prev?.completed && !wasCompleted ? { completed_at: now } : {}),
      updated_at: now,
    };
    const { error } = await supa.from('video_progress').upsert(row, { onConflict: 'user_id,video_id' });
    if (error) throw error;
  } catch (e) {
    logSilentError('saveVideoProgress', e);
  }
}
