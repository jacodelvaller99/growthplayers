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
      let next: string[];
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev; // mínimo 2 métricas
        next = prev.filter((m) => m !== id);
      } else {
        next = prev.length >= DASHBOARD_MAX ? [...prev.slice(1), id] : [...prev, id];
      }
      void writeLocal(KEY, next);
      return next;
    });
  }, []);

  return { selected, editing, setEditing, toggle };
}
