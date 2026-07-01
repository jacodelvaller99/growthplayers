/**
 * Render smoke test de Admin Cursos (loop de pulido, iteración 48).
 * Selector de curso + dar acceso (búsqueda usuario) + lista con acceso + revocar.
 * Monta con acceso poblado sin throw (libs admin mockeadas).
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
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
jest.mock('@/lib/admin/actions', () => ({
  grantCourseAccess: jest.fn().mockResolvedValue({ success: true }),
  revokeCourseAccess: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock('@/lib/admin/queries', () => ({
  fetchCourseAccess: jest.fn().mockResolvedValue([
    { id: 'ca1', user_id: 'user-1234-abcd', course_id: 'polaris', granted_at: '2026-06-01', expires_at: null },
  ]),
  searchUsers: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/lib/admin/types', () => ({
  COURSE_LABELS: { polaris: 'Polaris', growthplayers: 'Growth Players', lifeflow_bienestar: 'Bienestar' },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CursosScreen = require('@/app/admin/cursos/index').default;

describe('CursosScreen (admin) — render smoke', () => {
  it('cursos + dar acceso + lista + revocar renderiza sin throw', () => {
    expect(() => render(<CursosScreen />)).not.toThrow();
  });
});
