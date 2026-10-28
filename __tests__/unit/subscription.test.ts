import { purchasesAvailable, resolveEntitlement } from '@/lib/subscription';

describe('purchasesAvailable', () => {
  it('web → nunca, con o sin flag', () => {
    expect(purchasesAvailable('web', { iosPurchasesEnabled: false })).toBe(false);
    expect(purchasesAvailable('web', { iosPurchasesEnabled: true })).toBe(false);
  });
  it('ios → solo con el flag activo (regla 3.1.1)', () => {
    expect(purchasesAvailable('ios', { iosPurchasesEnabled: false })).toBe(false);
    expect(purchasesAvailable('ios', { iosPurchasesEnabled: true })).toBe(true);
  });
  it('android → como siempre, el flag de iOS no lo toca', () => {
    expect(purchasesAvailable('android', { iosPurchasesEnabled: false })).toBe(true);
  });
});

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
