/**
 * Render smoke test de Admin Membresías (loop de pulido, iteración 47).
 * Lista + filtros + búsqueda + acciones por fila + modales activar/acción.
 * Monta con membresías pobladas sin throw (libs admin mockeadas).
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({ useLifeFlow: () => ({ userId: 'admin-1' }) }));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const V = ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children);
  return { GoldDivider: () => R.createElement(RN.View), PremiumCard: V, useScreen: () => ({ root: {}, content: {} }) };
});
jest.mock('@/constants/subscriptions', () => ({
  SUBSCRIPTION_TIERS: { premium: { description: 'Acceso completo' }, premium_plus: { description: 'Deep' } },
  TIER_ORDER: ['free', 'premium', 'premium_plus'],
  getTierColor: (t: string) => (t === 'premium' ? '#FFC804' : '#888888'),
  getTierLabel: (t: string) => t,
  getTiersAbove: () => ['premium_plus'],
  getTiersBelow: () => ['free'],
}));
jest.mock('@/lib/admin/actions', () => ({
  activateMembership: jest.fn().mockResolvedValue({ success: true }),
  cancelMembership: jest.fn().mockResolvedValue({ success: true }),
  changeTier: jest.fn().mockResolvedValue({ success: true }),
  extendMembership: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock('@/lib/admin/queries', () => ({
  fetchAllMemberships: jest.fn().mockResolvedValue([
    { id: 'm1', user_id: 'u1', user_name: 'Ana', user_email: 'a@a.com', product: 'premium', status: 'active', activated_at: '2026-06-01', expires_at: null, price_paid: 100, currency: 'USD', activated_by: 'admin' },
  ]),
  searchUsers: jest.fn().mockResolvedValue([]),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MembresiasScreen = require('@/app/admin/membresias/index').default;

describe('MembresiasScreen (admin) — render smoke', () => {
  it('lista + filtros + acciones renderiza sin throw', () => {
    expect(() => render(<MembresiasScreen />)).not.toThrow();
  });
});
