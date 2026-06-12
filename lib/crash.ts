// ─── Captura global de errores no-render ─────────────────────────────────────
// El ErrorBoundary cubre crashes DE RENDER; esto cubre lo demás: handlers de
// eventos, promesas sin catch y errores fatales del runtime nativo. Reporta el
// mismo evento 'app_crash' que el ErrorBoundary (components/ErrorBoundary.tsx)
// vía analytics (respeta ml_consent y nunca lanza).

import { Platform } from 'react-native';

import { analytics } from '@/lib/analytics';

type CrashSource = 'global' | 'promise' | 'fatal';

let installed = false;

function report(source: CrashSource, error: unknown) {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? (error.stack ?? '') : '';
    console.error(`[crash:${source}]`, message);
    analytics.track('app_crash', {
      message: message.slice(0, 500),
      stack: stack.slice(0, 1000),
      source,
      platform: Platform.OS,
    });
  } catch {
    /* el reporte de crashes jamás debe crashear */
  }
}

/** Instala los handlers globales una sola vez. Idempotente, nunca lanza. */
export function initCrashCapture(): void {
  if (installed) return;
  installed = true;

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        report('global', event.error ?? event.message);
      });
      window.addEventListener('unhandledrejection', (event) => {
        report('promise', event.reason);
      });
      return;
    }

    // Nativo: ErrorUtils es el hook global de RN. Encadenamos el handler previo
    // para no romper el redbox de desarrollo ni otros interceptores.
    const errorUtils = (globalThis as {
      ErrorUtils?: {
        getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void;
        setGlobalHandler: (fn: (error: unknown, isFatal?: boolean) => void) => void;
      };
    }).ErrorUtils;
    if (!errorUtils) return;

    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
      report(isFatal ? 'fatal' : 'global', error);
      previous?.(error, isFatal);
    });
  } catch {
    /* noop — instalar la captura nunca debe afectar el arranque */
  }
}
