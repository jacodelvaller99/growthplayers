import { isLifeFlowOnlyAccount, type AccountSignals } from '@/lib/accountScopeLogic';

const blank: AccountSignals = {
  hasPolarisProfile: false, isAdmin: false, isMentor: false, isSuperadmin: false,
  clickupTaskId: null, subscriptionTier: 'free',
  lfOnboardedAt: null, lfTermsAcceptedAt: null, role: 'member', hasLifeFlowData: false,
};

describe('isLifeFlowOnlyAccount', () => {
  it('registro nuevo de Polaris (sin nada) → entra (falla abierto)', () => {
    expect(isLifeFlowOnlyAccount(blank)).toBe(false);
    expect(isLifeFlowOnlyAccount({ ...blank, role: null, subscriptionTier: null })).toBe(false);
  });

  it('cuenta solo de LifeFlow → bloqueada, por cualquier señal de LifeFlow', () => {
    expect(isLifeFlowOnlyAccount({ ...blank, lfOnboardedAt: '2026-11-03' })).toBe(true);
    expect(isLifeFlowOnlyAccount({ ...blank, lfTermsAcceptedAt: '2026-11-03' })).toBe(true);
    expect(isLifeFlowOnlyAccount({ ...blank, role: 'trainer' })).toBe(true);
    expect(isLifeFlowOnlyAccount({ ...blank, role: 'admin' })).toBe(true);
    expect(isLifeFlowOnlyAccount({ ...blank, hasLifeFlowData: true })).toBe(true);
    expect(isLifeFlowOnlyAccount({ ...blank, createdByLifeFlow: true })).toBe(true);
  });

  it('cliente de Polaris que también usa LifeFlow → entra', () => {
    const lf = { ...blank, lfOnboardedAt: '2026-11-03', role: 'admin', hasLifeFlowData: true };
    expect(isLifeFlowOnlyAccount({ ...lf, hasPolarisProfile: true })).toBe(false);
    expect(isLifeFlowOnlyAccount({ ...lf, isAdmin: true })).toBe(false);
    expect(isLifeFlowOnlyAccount({ ...lf, isMentor: true })).toBe(false);
    expect(isLifeFlowOnlyAccount({ ...lf, isSuperadmin: true })).toBe(false);
    expect(isLifeFlowOnlyAccount({ ...lf, clickupTaskId: 'abc' })).toBe(false);
    expect(isLifeFlowOnlyAccount({ ...lf, subscriptionTier: 'premium' })).toBe(false);
    expect(isLifeFlowOnlyAccount({ ...lf, createdByLifeFlow: true, hasPolarisProfile: true })).toBe(false);
  });
});
