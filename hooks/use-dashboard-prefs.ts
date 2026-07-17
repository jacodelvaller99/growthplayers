/**
 * useDashboardPrefs — qué métricas muestra el usuario en su tablero de Comando.
 *
 * El usuario elige sus 4 valores más importantes (de un catálogo de ~10).
 * Persistencia en dos capas: local por dispositivo (storage/local.ts, respuesta
 * instantánea) + cloud en profiles.dashboard_metrics (sigue al usuario entre
 * dispositivos; migración 20260716000000). Si la columna no existe todavía,
 * degrada a solo-local en silencio.
 * Sin selección guardada → los 4 defaults históricos (racha, check-ins, módulo, capacidad).
 */
import { useCallback, useEffect, useState } from 'react';
import { readLocal, writeLocal } from '@/storage/local';
import { supabase } from '@/lib/supabase';
import { logSilentError } from '@/lib/observability';

// profiles.dashboard_metrics no está en los tipos generados (columna nueva) — mismo patrón anyClient de lib/memory.ts
const anyClient = supabase as unknown as { from: (t: string) => any };

export const DASHBOARD_DEFAULTS = ['racha', 'checkins', 'modulo', 'capacidad'] as const;
export const DASHBOARD_MAX = 4;
const KEY = 'dashboard-metrics';

/**
 * Lógica pura del toggle (testeable): quitar respeta mínimo 2;
 * agregar con el tablero lleno desplaza la métrica más antigua (FIFO).
 */
export function nextSelection(prev: string[], id: string): string[] {
  if (prev.includes(id)) {
    if (prev.length <= 2) return prev;
    return prev.filter((m) => m !== id);
  }
  return prev.length >= DASHBOARD_MAX ? [...prev.slice(1), id] : [...prev, id];
}

function isValidSelection(v: unknown): v is string[] {
  return Array.isArray(v) && v.length >= 2 && v.every((x) => typeof x === 'string');
}

export function useDashboardPrefs(userId?: string | null) {
  const [selected, setSelected] = useState<string[]>([...DASHBOARD_DEFAULTS]);
  const [editing, setEditing] = useState(false);

  // Local primero (instantáneo), cloud después (autoridad cross-device).
  useEffect(() => {
    let alive = true;
    readLocal<string[]>(KEY)
      .then((saved) => {
        if (alive && isValidSelection(saved)) setSelected(saved);
      })
      .catch(() => {});

    if (!userId) return () => { alive = false; };
    anyClient
      .from('profiles')
      .select('dashboard_metrics')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }: { data: { dashboard_metrics?: unknown } | null; error: unknown }) => {
        if (error || !alive) return; // columna ausente / red — local manda
        const cloud = data?.dashboard_metrics;
        if (isValidSelection(cloud)) {
          setSelected(cloud);
          void writeLocal(KEY, cloud);
        }
      });
    return () => { alive = false; };
  }, [userId]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = nextSelection(prev, id);
      if (next !== prev) {
        void writeLocal(KEY, next);
        if (userId) {
          anyClient
            .from('profiles')
            .update({ dashboard_metrics: next })
            .eq('id', userId)
            .then(({ error }: { error: unknown }) => {
              if (error) logSilentError('dashboardPrefs.cloudSync', error);
            });
        }
      }
      return next;
    });
  }, [userId]);

  return { selected, editing, setEditing, toggle };
}
