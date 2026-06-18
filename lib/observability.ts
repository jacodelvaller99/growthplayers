// ─── Observabilidad — rastro de degradación silenciosa ───────────────────────
// Las capas IO (memory/biometric/execution/confrontation) degradan a vacío con
// try/catch para no romper la app si falta una tabla o la red falla. El problema
// histórico: ese catch era CIEGO — nadie sabía cuándo el sistema degradaba.
//
// `logSilentError` reemplaza el `catch {}` ciego: deja un rastro consistente sin
// re-lanzar (el caller sigue degradando a vacío). En dev → console.error con
// contexto; en prod → console.warn (visible en logs del dispositivo / captura de
// crashes). Punto único para enganchar Sentry/observabilidad post-launch.

import { ENV } from '@/app/config/env';

export function logSilentError(
  context: string,
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  const message = (error as Error)?.message ?? String(error);
  if (ENV.isDev) {
    console.error(`[silent:${context}]`, message, extra ?? '');
  } else {
    // Prod: rastro mínimo no-bloqueante (engancha Sentry aquí cuando se integre).
    console.warn(`[silent:${context}]`, message);
  }
}
