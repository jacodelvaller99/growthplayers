/**
 * Render smoke test de Admin Códigos de acceso (loop de pulido, iteración 49).
 * Form crear código (tipo + usos máx + custom + etiqueta + notas) + lista activos + desactivados.
 * Monta con un código activo y uno desactivado sin throw (libs admin mockeadas).
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
  createAccessCode: jest.fn().mockResolvedValue({ success: true, code: 'ABC123' }),
  deactivateAccessCode: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock('@/lib/admin/queries', () => ({
  fetchAccessCodes: jest.fn().mockResolvedValue([
    { id: 'c1', code: 'BETA1', type: 'beta', max_uses: 10, uses_count: 3, is_active: true, expires_at: null, label: 'Juan', notes: null },
    { id: 'c2', code: 'OLD9', type: 'premium', max_uses: -1, uses_count: 40, is_active: false, expires_at: '2026-05-01', label: null, notes: null },
  ]),
}));
jest.mock('@/lib/admin/types', () => ({
  CODE_TYPE_LABELS: {
    beta: 'Beta', premium: 'Premium', premium_plus: 'Premium+',
    polaris: 'Polaris', growthplayers: 'Growth Players', full_access: 'Full',
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CodigosScreen = require('@/app/admin/codigos/index').default;

describe('CodigosScreen (admin) — render smoke', () => {
  it('form crear + activos + desactivados renderiza sin throw', () => {
    expect(() => render(<CodigosScreen />)).not.toThrow();
  });
});
