/**
 * Circuit breaker de conexiones wearable — lógica pura compartida por la edge
 * function sync-wearables (supabase/functions/_shared/connectionHealth.ts).
 *
 * Invariantes que fija esta suite:
 *  · token revocado (invalid_grant / refresh 400/401) → muerte INMEDIATA
 *  · fallo transitorio → contador; muere exactamente en FAILURE_THRESHOLD
 *  · el mensaje de un fallo de DATOS (no de refresh) nunca mata de inmediato
 */
import {
  FAILURE_THRESHOLD,
  classifySyncFailure,
  nextBreakerState,
} from '../../supabase/functions/_shared/connectionHealth';

describe('classifySyncFailure', () => {
  it('invalid_grant en cualquier parte del mensaje → dead_token', () => {
    expect(classifySyncFailure('OAuth error: invalid_grant')).toBe('dead_token');
    expect(classifySyncFailure('{"error":"INVALID_GRANT"}')).toBe('dead_token');
  });

  it('refresh 400/401 → dead_token (formato real de los refreshers)', () => {
    expect(classifySyncFailure('Oura token refresh failed: 401')).toBe('dead_token');
    expect(classifySyncFailure('WHOOP token refresh failed: 400')).toBe('dead_token');
    expect(classifySyncFailure('Polar token refresh failed: 401')).toBe('dead_token');
    expect(classifySyncFailure('Strava token refresh failed: 400')).toBe('dead_token');
  });

  it('refresh con 5xx (proveedor caído) → transient, no muerte', () => {
    expect(classifySyncFailure('Oura token refresh failed: 500')).toBe('transient');
    expect(classifySyncFailure('WHOOP token refresh failed: 503')).toBe('transient');
  });

  it('errores genéricos (red, timeout, datos) → transient', () => {
    expect(classifySyncFailure('fetch failed')).toBe('transient');
    expect(classifySyncFailure('TypeError: network request failed')).toBe('transient');
    // Un 401 de un endpoint de DATOS no llega aquí como excepción (los fetch
    // de datos devuelven null), pero si llegara con otro texto, no debe matar.
    expect(classifySyncFailure('Oura API sleep failed: 401')).toBe('transient');
  });
});

describe('nextBreakerState', () => {
  it('dead_token desactiva de inmediato, sin importar el contador', () => {
    expect(nextBreakerState(0, 'dead_token')).toEqual({ is_active: false, consecutive_failures: 1 });
    expect(nextBreakerState(3, 'dead_token')).toEqual({ is_active: false, consecutive_failures: 4 });
  });

  it('transient acumula y muere exactamente en FAILURE_THRESHOLD', () => {
    // fallos 1..4 → sigue activa
    for (let prev = 0; prev < FAILURE_THRESHOLD - 1; prev++) {
      expect(nextBreakerState(prev, 'transient').is_active).toBe(true);
    }
    // fallo número 5 → muere
    const dead = nextBreakerState(FAILURE_THRESHOLD - 1, 'transient');
    expect(dead).toEqual({ is_active: false, consecutive_failures: FAILURE_THRESHOLD });
  });

  it('tolera contador null/undefined heredado (fila pre-migración)', () => {
    expect(nextBreakerState(undefined as unknown as number, 'transient'))
      .toEqual({ is_active: true, consecutive_failures: 1 });
  });
});
