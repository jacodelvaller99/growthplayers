/**
 * use-app-theme.tsx — Light/Dark theme provider (web-driven).
 *
 * Injects the theme CSS variables at first paint, reads the persisted mode,
 * and flips `data-theme` on <html> when toggled. Screens re-theme instantly
 * because their palette.* tokens resolve to var(--c-*) on web (see themeColors.ts).
 *
 * Native keeps the dark hex values (static StyleSheet); the toggle is a no-op
 * there visually, so the toggle UI is only shown on web.
 */
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { injectThemeVars } from '@/constants/themeColors';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'polaris:theme';

interface AppThemeValue {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
  /** True on web, where the toggle actually re-themes the UI. */
  canToggle: boolean;
}

const AppThemeContext = createContext<AppThemeValue>({
  mode: 'dark',
  setMode: () => {},
  toggle: () => {},
  canToggle: false,
});

const isWeb = Platform.OS === 'web';

function readInitialMode(): ThemeMode {
  if (isWeb && typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  }
  return 'dark';
}

function applyMode(mode: ThemeMode) {
  if (!isWeb || typeof document === 'undefined') return;
  document.documentElement.dataset.theme = mode;
  try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* private mode */ }
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  // Lazy initializer runs before first child render → no flash of wrong theme.
  const [mode, setModeState] = useState<ThemeMode>(() => {
    injectThemeVars();
    const initial = readInitialMode();
    if (isWeb && typeof document !== 'undefined') {
      document.documentElement.dataset.theme = initial;
    }
    return initial;
  });

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    applyMode(m);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      applyMode(next);
      return next;
    });
  }, []);

  return (
    <AppThemeContext.Provider value={{ mode, setMode, toggle, canToggle: isWeb }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme(): AppThemeValue {
  return useContext(AppThemeContext);
}
