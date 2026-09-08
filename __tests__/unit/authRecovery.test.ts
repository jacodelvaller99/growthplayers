import {
  RECOVERY_COOLDOWN_SEC,
  describeRecoveryError,
  maskEmail,
  parseRecoveryTokens,
  recoverySentMessage,
} from '@/lib/authRecovery';

describe('describeRecoveryError', () => {
  it('respeta la espera exacta que dicta el servidor', () => {
    const r = describeRecoveryError({
      message: 'For security purposes, you can only request this after 51 seconds.',
      status: 429,
    });
    expect(r.cooldownSec).toBe(51);
    expect(r.message).toContain('51 segundos');
  });

  it('trata el tope de correos del proyecto como espera larga con salida humana', () => {
    const r = describeRecoveryError({ message: 'email rate limit exceeded', status: 429 });
    expect(r.cooldownSec).toBe(300);
    expect(r.message).toContain('hola@polarisgrowthinstitute.com');
  });

  it('un 429 sin texto reconocible sigue siendo espera larga', () => {
    expect(describeRecoveryError({ message: 'nope', status: 429 }).cooldownSec).toBe(300);
  });

  it('email mal formado es reintentable de inmediato', () => {
    const r = describeRecoveryError({ message: 'Unable to validate email address: invalid format' });
    expect(r.cooldownSec).toBe(0);
    expect(r.message).toContain('formato');
  });

  it('error desconocido conserva el mensaje original y no bloquea', () => {
    const r = describeRecoveryError({ message: 'Service unavailable' });
    expect(r).toEqual({ message: 'Service unavailable', cooldownSec: 0 });
  });

  it('error nulo o vacío degrada a mensaje genérico', () => {
    expect(describeRecoveryError(null).cooldownSec).toBe(0);
    expect(describeRecoveryError({ message: '   ' }).message).toContain('No pudimos enviar');
  });
});

describe('maskEmail', () => {
  it('conserva dominio, última letra y largo del usuario', () => {
    expect(maskEmail('nicolas@polaris.com')).toBe('ni••••s@polaris.com');
  });

  it('no revela usuarios muy cortos', () => {
    expect(maskEmail('an@x.com')).toBe('a•@x.com');
    expect(maskEmail('ana@x.com')).toBe('a•a@x.com');
  });

  it('recorta espacios y tolera texto sin arroba', () => {
    expect(maskEmail('  nicolas@polaris.com ')).toBe('ni••••s@polaris.com');
    expect(maskEmail('sin-arroba')).toBe('sin-arroba');
  });
});

describe('recoverySentMessage', () => {
  it('es condicional: nunca afirma que la cuenta existe', () => {
    const msg = recoverySentMessage('nicolas@polaris.com');
    expect(msg.startsWith('Si ')).toBe(true);
    expect(msg).toContain('spam');
    expect(msg).not.toContain('nicolas@');
  });
});

describe('parseRecoveryTokens', () => {
  it('lee los tokens del fragmento del deep link nativo', () => {
    expect(
      parseRecoveryTokens('polaris://reset-password#access_token=abc&refresh_token=def&type=recovery'),
    ).toEqual({ access_token: 'abc', refresh_token: 'def' });
  });

  it('también los lee desde el query string', () => {
    expect(
      parseRecoveryTokens('polaris://reset-password?access_token=abc&refresh_token=def'),
    ).toEqual({ access_token: 'abc', refresh_token: 'def' });
  });

  it('devuelve null si falta cualquiera de los dos tokens', () => {
    expect(parseRecoveryTokens('polaris://reset-password#access_token=abc')).toBeNull();
    expect(parseRecoveryTokens('polaris://reset-password#error=expired')).toBeNull();
  });

  it('devuelve null sin url', () => {
    expect(parseRecoveryTokens(null)).toBeNull();
    expect(parseRecoveryTokens(undefined)).toBeNull();
    expect(parseRecoveryTokens('')).toBeNull();
  });
});

describe('RECOVERY_COOLDOWN_SEC', () => {
  it('es una espera real, no cero', () => {
    expect(RECOVERY_COOLDOWN_SEC).toBeGreaterThan(0);
  });
});
