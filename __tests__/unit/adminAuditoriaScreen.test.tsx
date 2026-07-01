/**
 * Render smoke test de Admin Auditoría (loop de pulido, iteración 56).
 * Log de acciones admin (badge conteo + filas expandibles con metadata + fecha
 * exacta + leyenda de iconos).
 * Monta con entradas pobladas sin throw (fetchAuditLog mockeado).
 */
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const V = ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children);
  return { GoldDivider: () => R.createElement(RN.View), PremiumCard: V, useScreen: () => ({ root: {}, content: {} }) };
});
jest.mock('@/lib/admin/queries', () => ({
  fetchAuditLog: jest.fn().mockResolvedValue([
    { id: 'a1', admin_id: 'adm1', action: 'activate_membership', target_type: 'user', target_id: 'user-1234-abcd-5678', metadata: { tier: 'premium' }, created_at: '2026-06-30T10:00:00Z' },
    { id: 'a2', admin_id: 'adm1', action: 'create_access_code', target_type: 'code', target_id: 'code-9876', metadata: {}, created_at: '2026-06-29T08:00:00Z' },
  ]),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AuditoriaScreen = require('@/app/admin/auditoria/index').default;

describe('AuditoriaScreen (admin) — render smoke', () => {
  it('log con filas + leyenda renderiza sin throw', async () => {
    render(<AuditoriaScreen />);
    // El target de la fila solo aparece con el log cargado (la leyenda repite la acción).
    await waitFor(() => expect(screen.getByText('user · user-1234-abcd-5')).toBeTruthy());
  });
});
