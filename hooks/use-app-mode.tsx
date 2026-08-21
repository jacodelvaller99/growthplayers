/**
 * use-app-mode.tsx — el TERCER eje de preferencia: la densidad de composición.
 *
 * Los otros dos ejes (fondo, señal) deciden CÓMO se pinta la app; este decide
 * QUÉ se monta y en qué orden. Mismo patrón de persistencia que
 * `use-app-theme.tsx` (async, `storage/local.ts` — funciona igual en web y
 * nativo, a diferencia de los otros dos ejes que son web-only).
 *
 * Default 'especifico': es la composición que ya existe hoy — cero regresión
 * para quien nunca toca el selector.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { readLocal, writeLocal } from '@/storage/local';

export type AppMode = 'especifico' | 'esencial' | 'operador' | 'calma' | 'guiado';

export const APP_MODES: { id: AppMode; label: string; description: string }[] = [
  { id: 'especifico', label: 'Específico', description: 'Todo el detalle: fichas, lista y pestañas' },
  { id: 'esencial', label: 'Esencial', description: 'Una frase, una acción — nada más' },
  { id: 'operador', label: 'Operador', description: 'Cockpit denso, todo a la vista' },
  { id: 'calma', label: 'Calma', description: 'La recuperación primero, protocolo atenuado' },
  { id: 'guiado', label: 'Guiado', description: 'Un paso a la vez' },
];

const STORAGE_KEY = 'polaris:appMode';

function isAppMode(v: unknown): v is AppMode {
  return typeof v === 'string' && APP_MODES.some((m) => m.id === v);
}

interface AppModeValue {
  mode: AppMode;
  setMode: (m: AppMode) => void;
  /** false hasta que termine de leer lo persistido — evita un parpadeo especifico→otro. */
  loaded: boolean;
}

const AppModeContext = createContext<AppModeValue>({
  mode: 'especifico',
  setMode: () => {},
  loaded: false,
});

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>('especifico');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    readLocal<string>(STORAGE_KEY).then((stored) => {
      if (!alive) return;
      if (isAppMode(stored)) setModeState(stored);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  const setMode = useCallback((m: AppMode) => {
    setModeState(m);
    writeLocal(STORAGE_KEY, m).catch(() => { /* modo privado / sin storage — el estado en memoria ya cambió */ });
  }, []);

  return (
    <AppModeContext.Provider value={{ mode, setMode, loaded }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode(): AppModeValue {
  return useContext(AppModeContext);
}
