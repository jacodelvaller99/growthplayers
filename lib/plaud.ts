/**
 * lib/plaud.ts — cliente de la importación automática de Plaud (IO, admin-only).
 *
 * Todas las funciones degradan a vacío/false con `logSilentError` (patrón de
 * las capas IO): si la tabla o la función no existen todavía, la pantalla de
 * admin muestra estado vacío en vez de romper.
 */
import { supabase } from '@/lib/supabase';
import { logSilentError } from '@/lib/observability';

const supa: any = supabase;

export interface PlaudImportRow {
  id: string;
  plaud_file_id: string;
  recording_name: string | null;
  recorded_at: string | null;
  duration_sec: number | null;
  plaud_summary: string | null;
  matched_user_id: string | null;
  status: 'pending_review' | 'processing' | 'imported' | 'ignored' | 'error';
  error: string | null;
  session_id: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface PlaudSyncResult {
  ok: boolean;
  fetched?: number;
  imported?: number;
  queued?: number;
  error?: string;
}

/** Dispara el batch a demanda (botón "Sincronizar ahora" en admin). */
export async function triggerPlaudSync(): Promise<PlaudSyncResult> {
  try {
    const { data, error } = await supabase.functions.invoke('plaud-sync', {
      body: { action: 'sync' },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, ...data };
  } catch (e) {
    logSilentError('plaud.triggerSync', e);
    return { ok: false, error: e instanceof Error ? e.message : 'Error de conexión' };
  }
}

/** Cola de revisión + últimos imports (RLS admin-only hace el gate). */
export async function fetchPlaudImports(limit = 40): Promise<PlaudImportRow[]> {
  try {
    const { data, error } = await supa
      .from('plaud_imports')
      .select(
        'id, plaud_file_id, recording_name, recorded_at, duration_sec, plaud_summary, matched_user_id, status, error, session_id, created_at, processed_at',
      )
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as PlaudImportRow[];
  } catch (e) {
    logSilentError('plaud.fetchImports', e);
    return [];
  }
}

/** Asigna un import de la cola a un cliente y lo procesa. */
export async function assignPlaudImport(importId: string, userId: string): Promise<PlaudSyncResult> {
  try {
    const { data, error } = await supabase.functions.invoke('plaud-sync', {
      body: { action: 'assign', import_id: importId, user_id: userId },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, ...data };
  } catch (e) {
    logSilentError('plaud.assign', e);
    return { ok: false, error: e instanceof Error ? e.message : 'Error de conexión' };
  }
}

/** Descarta un import (no era una sesión de cliente). */
export async function ignorePlaudImport(importId: string): Promise<PlaudSyncResult> {
  try {
    const { data, error } = await supabase.functions.invoke('plaud-sync', {
      body: { action: 'ignore', import_id: importId },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, ...data };
  } catch (e) {
    logSilentError('plaud.ignore', e);
    return { ok: false, error: e instanceof Error ? e.message : 'Error de conexión' };
  }
}
