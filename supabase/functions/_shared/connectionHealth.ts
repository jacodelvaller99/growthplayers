/**
 * connectionHealth — clasificación pura de fallos de sync de wearables.
 *
 * Vive en _shared para que la edge function (Deno) la importe y jest la pueda
 * testear (cero APIs de Deno aquí — mantenerlo puro).
 *
 * Regla del circuit breaker:
 *  · invalid_grant / refresh 400/401 → token revocado upstream: la conexión
 *    muere DE INMEDIATO (ningún reintento arregla un token revocado).
 *  · cualquier otro fallo → transitorio: contador; a las FAILURE_THRESHOLD
 *    seguidas la conexión se desactiva. Un sync exitoso resetea a 0.
 * Sin esto, el cron de 2h reintentaba conexiones muertas para siempre.
 */

export const FAILURE_THRESHOLD = 5;

export type SyncFailureKind = 'dead_token' | 'transient';

export function classifySyncFailure(message: string): SyncFailureKind {
  if (/invalid_grant/i.test(message)) return 'dead_token';
  if (/token refresh failed:\s*(400|401)\b/i.test(message)) return 'dead_token';
  return 'transient';
}

/** Estado siguiente de la conexión tras un fallo. */
export function nextBreakerState(
  consecutiveFailures: number,
  kind: SyncFailureKind,
): { is_active: boolean; consecutive_failures: number } {
  const n = (consecutiveFailures ?? 0) + 1;
  if (kind === 'dead_token') return { is_active: false, consecutive_failures: n };
  return { is_active: n < FAILURE_THRESHOLD, consecutive_failures: n };
}
