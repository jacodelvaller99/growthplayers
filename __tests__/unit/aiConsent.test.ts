import {
  AI_CONSENT_VERSION,
  AiConsentRequiredError,
  aiConsentEntry,
  assertAiConsent,
  hasAiConsent,
  isAiConsentGranted,
  resetAiConsent,
  setAiConsentGranted,
  subscribeAiConsent,
} from '@/lib/aiConsent';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/storage/local', () => ({ readLocal: jest.fn(), writeLocal: jest.fn() }));

describe('hasAiConsent', () => {
  it('exige accepted true y versión vigente', () => {
    expect(hasAiConsent({ ai_third_party: { accepted: true, version: AI_CONSENT_VERSION } })).toBe(true);
    expect(hasAiConsent({ ai_third_party: { accepted: true } })).toBe(true);
  });

  it('cualquier otra forma es que no', () => {
    expect(hasAiConsent(null)).toBe(false);
    expect(hasAiConsent(undefined)).toBe(false);
    expect(hasAiConsent({})).toBe(false);
    expect(hasAiConsent({ ai_third_party: { accepted: false } })).toBe(false);
    expect(hasAiConsent({ ai_third_party: { accepted: 'true' } })).toBe(false);
    expect(hasAiConsent({ ai_third_party: { accepted: true, version: 0 } })).toBe(false);
  });

  it('la entrada que se guarda pasa su propio chequeo y nombra a los proveedores', () => {
    const entry = aiConsentEntry('2026-09-18T00:00:00.000Z');
    expect(hasAiConsent({ ai_third_party: entry })).toBe(true);
    expect(entry.providers).toContain('Anthropic');
  });
});

describe('cerrojo', () => {
  beforeEach(() => resetAiConsent());

  it('parte cerrado: sin permiso no sale ningún dato', () => {
    expect(isAiConsentGranted()).toBe(false);
    expect(() => assertAiConsent()).toThrow(AiConsentRequiredError);
  });

  it('se abre con el permiso y vuelve a cerrar al cerrar sesión', () => {
    setAiConsentGranted(true);
    expect(() => assertAiConsent()).not.toThrow();
    resetAiConsent();
    expect(() => assertAiConsent()).toThrow(AiConsentRequiredError);
  });

  it('avisa a los suscriptores solo cuando el valor cambia', () => {
    const seen: boolean[] = [];
    const off = subscribeAiConsent((g) => seen.push(g));
    setAiConsentGranted(true);
    setAiConsentGranted(true);
    setAiConsentGranted(false);
    off();
    setAiConsentGranted(true);
    expect(seen).toEqual([true, false]);
  });
});
