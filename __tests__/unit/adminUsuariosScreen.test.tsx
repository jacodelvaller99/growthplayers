/**
 * Render smoke test de Admin Usuarios (loop de pulido, iteración 45).
 * Roster + búsqueda + filtros + lista con badges (tier/rol) + modal crear perfil.
 * Monta con lista poblada sin throw (libs admin mockeadas).
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({ useLifeFlow: () => ({ userId: 'admin-1' }) }));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { GoldDivider: () => R.createElement(RN.View), useScreen: () => ({ root: {}, content: {} }) };
});
jest.mock('@/components/admin-decision', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { NoteBadge: () => R.createElement(RN.View) };
});
jest.mock('@/constants/subscriptions', () => ({
  TIER_ORDER: ['free', 'premium', 'premium_plus'],
  getTierColor: (t: string) => (t === 'premium' ? '#FFC804' : '#888888'),
  getTierLabel: (t: string) => t ?? 'free',
}));
jest.mock('@/lib/admin/actions', () => ({ createUserProfile: jest.fn().mockResolvedValue({ success: true, userId: 'x' }) }));
jest.mock('@/lib/admin/queries', () => ({
  fetchUsers: jest.fn().mockResolvedValue([
    { id: 'u1', email: 'a@a.com', name: 'Ana Pérez', subscription_tier: 'premium', sovereign_score: 500, streak: 3, is_admin: false, is_superadmin: false, created_at: '2026-06-01', role: 'CEO' },
    { id: 'u2', email: 'b@b.com', name: 'Beto Admin', subscription_tier: 'free', sovereign_score: 0, streak: 0, is_admin: true, is_superadmin: false, created_at: '2026-06-02' },
  ]),
}));
jest.mock('@/lib/memory', () => ({ fetchNotesByUsers: jest.fn().mockResolvedValue({}) }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const UsuariosScreen = require('@/app/admin/usuarios/index').default;

describe('UsuariosScreen (admin) — render smoke', () => {
  it('roster + lista + badges + modal renderiza sin throw', () => {
    expect(() => render(<UsuariosScreen />)).not.toThrow();
  });
});
