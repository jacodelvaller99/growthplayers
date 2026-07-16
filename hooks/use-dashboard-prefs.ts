/**
 * useDashboardPrefs — qué métricas muestra el usuario en su tablero de Comando.
 *
 * El usuario elige sus 4 valores más importantes (de un catálogo de ~10).
 * Persistencia local por dispositivo (storage/local.ts, clave 'dashboard-metrics').
 * Sin selección guardada → los 4 defaults históricos (racha, check-ins, módulo, capacidad).
 */
import { useCallback, useEffect, useState } from 'react';
import { readLocal, writeLocal } from '@/storage/local';

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

export function useDashboardPrefs() {
  const [selected, setSelected] = useState<string[]>([...DASHBOARD_DEFAULTS]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    readLocal<string[]>(KEY).then((saved) => {
      if (Array.isArray(saved) && saved.length >= 2) setSelected(saved);
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = nextSelection(prev, id);
      if (next !== prev) void writeLocal(KEY, next);
      return next;
    });
  }, []);

  return { selected, editing, setEditing, toggle };
}
