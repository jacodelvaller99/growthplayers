/**
 * Render smoke test de Admin Memoria (dashboard cross-client) (loop de pulido, iteración 52).
 * 3 rankings: más loops abiertos · follow-up estancado · riesgo de churn. Tap → dossier.
 * Monta con filas pobladas sin throw (fetchMemoryDashboard mockeado).
 */
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
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
  fetchMemoryDashboard: jest.fn().mockResolvedValue([
    { user_id: 'u1', name: 'Ana', topThemes: ['sueño', 'estrés'], openLoops: 5, staleDays: 12, churnLabel: 'critical' },
    { user_id: 'u2', name: 'Beto', topThemes: [], openLoops: 2, staleDays: 3, churnLabel: 'high' },
    { user_id: 'u3', name: 'Caro', topThemes: ['foco'], openLoops: 0, staleDays: 0, churnLabel: 'low' },
  ]),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AdminMemoriaScreen = require('@/app/admin/memoria').default;

describe('AdminMemoriaScreen (admin) — render smoke', () => {
  it('3 rankings (loops · estancado · riesgo) renderiza sin throw', async () => {
    render(<AdminMemoriaScreen />);
    // Espera a que salga del loading y renderice las filas pobladas sin throw.
    // 'CRITICAL' (metric de churn) solo aparece en la sección de riesgo ya cargada.
    await waitFor(() => expect(screen.getByText('CRITICAL')).toBeTruthy());
  });
});
