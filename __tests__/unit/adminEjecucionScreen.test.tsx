/**
 * Render smoke test de Admin Ejecución (Mentor Execution OS, dashboard cross-client)
 * (loop de pulido, iteración 54). Hero de momentum + 3 rankings (intervención ·
 * retrasados · momentum en riesgo). Tap → dossier.
 * Monta con filas pobladas sin throw (fetchExecutionDashboard mockeado).
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
jest.mock('@/lib/mentorExecution', () => ({
  fetchExecutionDashboard: jest.fn().mockResolvedValue([
    { user_id: 'u1', name: 'Ana', attention: 85, openTasks: 6, overdue: 3, momentum: 'critical', topReason: '3 tareas vencidas hace >7 días' },
    { user_id: 'u2', name: 'Beto', attention: 55, openTasks: 4, overdue: 1, momentum: 'fragile', topReason: null },
    { user_id: 'u3', name: 'Caro', attention: 20, openTasks: 2, overdue: 0, momentum: 'rising', topReason: null },
  ]),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AdminEjecucionScreen = require('@/app/admin/mentores/ejecucion').default;

describe('AdminEjecucionScreen (admin) — render smoke', () => {
  it('hero de momentum + 3 rankings renderiza sin throw', async () => {
    render(<AdminEjecucionScreen />);
    // 'CRÍTICO' (metric del ranking de momentum) solo aparece con datos cargados.
    await waitFor(() => expect(screen.getByText('CRÍTICO')).toBeTruthy());
  });
});
