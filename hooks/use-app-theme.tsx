/**
 * use-app-theme.tsx — proveedor de tema en DOS EJES (web-driven).
 *
 * Inyecta las variables CSS en el primer pintado, lee lo persistido y refleja el
 * estado en <html> con dos atributos independientes:
 *
 *   data-theme  → FONDO   (dark · light · carbon · aura)
 *   data-signal → SEÑAL   (oro · ambar · semaforo · calma)
 *
 * Las pantallas re-tematizan solas porque sus tokens palette.* resuelven a
 * var(--c-*) en web (ver themeColors.ts).
 *
 * Nativo conserva los hex oscuros (StyleSheet estático); ahí ambos ejes son un
 * no-op visual, por eso `canToggle` es false y la UI del selector se oculta.
 *
 * Compatibilidad: `mode`/`toggle` siguen existiendo con la misma firma (dark ↔
 * light) para no romper el interruptor claro/oscuro que ya usaba el perfil.
 */
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { injectBrandFont } from '@/constants/theme';
import {
  SIGNAL_VARS,
  THEME_VARS,
  injectThemeVars,
  type BackdropId,
  type SignalId,
} from '@/constants/themeColors';

/** Alias histórico: el "modo" claro/oscuro es un subconjunto del eje de fondo. */
export type ThemeMode = BackdropId;

const STORAGE_KEY = 'polaris:theme';
const SIGNAL_KEY = 'polaris:signal';

interface AppThemeValue {
  /** Eje 1 — la tinta. */
  mode: BackdropId;
  setMode: (m: BackdropId) => void;
  /** Alterna solo entre dark ↔ light (el interruptor de siempre). */
  toggle: () => void;
  /** Eje 2 — qué comunica el color. */
  signal: SignalId;
  setSignal: (s: SignalId) => void;
  /** True en web, donde los ejes realmente re-tematizan la UI. */
  canToggle: boolean;
}

const AppThemeContext = createContext<AppThemeValue>({
  mode: 'dark',
  setMode: () => {},
  toggle: () => {},
  signal: 'oro',
  setSignal: () => {},
  canToggle: false,
});

const isWeb = Platform.OS === 'web';

function isBackdrop(v: string | null): v is BackdropId {
  return v !== null && Object.prototype.hasOwnProperty.call(THEME_VARS, v);
}
function isSignal(v: string | null): v is SignalId {
  return v !== null && Object.prototype.hasOwnProperty.call(SIGNAL_VARS, v);
}

function readStored<T extends string>(key: string, guard: (v: string | null) => v is T, fallback: T): T {
  if (isWeb && typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(key);
    if (guard(stored)) return stored;
  }
  return fallback;
}

function applyAttr(attr: 'theme' | 'signal', key: string, value: string) {
  if (!isWeb || typeof document === 'undefined') return;
  document.documentElement.dataset[attr] = value;
  try { localStorage.setItem(key, value); } catch { /* modo privado */ }
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  // El inicializador perezoso corre antes del primer render de los hijos → sin
  // parpadeo de tema equivocado.
  const [mode, setModeState] = useState<BackdropId>(() => {
    injectThemeVars();
    // Misma ventana que las variables de color: antes del primer render de los
    // hijos. La marca es la tipografía tanto como el oro.
    injectBrandFont();
    const initial = readStored(STORAGE_KEY, isBackdrop, 'dark');
    if (isWeb && typeof document !== 'undefined') {
      document.documentElement.dataset.theme = initial;
    }
    return initial;
  });

  const [signal, setSignalState] = useState<SignalId>(() => {
    const initial = readStored(SIGNAL_KEY, isSignal, 'oro');
    if (isWeb && typeof document !== 'undefined') {
      document.documentElement.dataset.signal = initial;
    }
    return initial;
  });

  const setMode = useCallback((m: BackdropId) => {
    setModeState(m);
    applyAttr('theme', STORAGE_KEY, m);
  }, []);

  const setSignal = useCallback((s: SignalId) => {
    setSignalState(s);
    applyAttr('signal', SIGNAL_KEY, s);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      // Solo alterna la pareja histórica: desde carbon/aura, "alternar" lleva a
      // claro, que es la contraparte que el usuario espera del interruptor.
      const next: BackdropId = prev === 'light' ? 'dark' : 'light';
      applyAttr('theme', STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <AppThemeContext.Provider
      value={{ mode, setMode, toggle, signal, setSignal, canToggle: isWeb }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme(): AppThemeValue {
  return useContext(AppThemeContext);
}
