import { resolveEntitlement } from '@/lib/subscription';

const NOW = Date.parse('2026-06-17T12:00:00.000Z');
const future = '2026-12-31T00:00:00.000Z';
const past = '2026-01-01T00:00:00.000Z';

describe('resolveEntitlement', () => {
  it('free sin recibo → no premium', () => {
    expect(resolveEntitlement({ dbTier: 'free', nowMs: NOW }).isPremium).toBe(false);
  });

  it('tier de pago activo (expiry futura) → premium', () => {
    const e = resolveEntitlement({ dbTier: 'premium', expiresAt: future, nowMs: NOW });
    expect(e.isPremium).toBe(true);
    expect(e.expired).toBe(false);
  });

  it('tier de pago VENCIDO sin recibo → NO premium (el fix #19)', () => {
    const e = resolveEntitlement({ dbTier: 'premium', expiresAt: past, nowMs: NOW });
    expect(e.isPremium).toBe(false);
    expect(e.expired).toBe(true);
  });

  it('tier de pago vencido PERO recibo RC activo → premium (lag de webhook)', () => {
    const e = resolveEntitlement({ dbTier: 'premium', expiresAt: past, rcActive: true, nowMs: NOW });
    expect(e.isPremium).toBe(true);
    expect(e.expired).toBe(false);
  });

  it('tier de pago sin expiración (vitalicio) → premium', () => {
    expect(resolveEntitlement({ dbTier: 'polaris', expiresAt: null, nowMs: NOW }).isPremium).toBe(true);
  });

  it('DB free pero recibo RC activo → premium (pago aún no sincronizado)', () => {
    expect(resolveEntitlement({ dbTier: 'free', rcActive: true, nowMs: NOW }).isPremium).toBe(true);
  });

  it('tier desconocido → tratado como free', () => {
    const e = resolveEntitlement({ dbTier: 'bogus_tier', expiresAt: future, nowMs: NOW });
    expect(e.tier).toBe('free');
    expect(e.isPremium).toBe(false);
  });
});
