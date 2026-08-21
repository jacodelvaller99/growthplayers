/**
 * Render smoke test del Focus Desk (nuevo home del admin).
 * Héroe "ESCRITORIO DEL MENTOR" + 3 números + 3 lentes (MIS CLIENTES ·
 * ASIGNACIÓN · EQUIPO). Monta con datos poblados sin throw (IO mockeado;
 * deskLogic real — el armado del escritorio se ejercita de verdad).
 */
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({ userId: 'admin1' }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return {
    StatusPill: () => R.createElement(RN.View),
    useScreen: () => ({ root: {}, content: {}, isDesktop: false, isTablet: false }),
  };
});
jest.mock('@/lib/mentorExecution', () => ({
  fetchExecutionDashboard: jest.fn().mockResolvedValue([
    { user_id: 'u1', name: 'Ana', attention: 85, openTasks: 3, overdue: 2, momentum: 'critical', topReason: '2 tareas vencidas', severity: 'critical' },
  ]),
}));
jest.mock('@/lib/admin/queries', () => ({
  fetchMentorAssignments: jest.fn().mockResolvedValue([
    { user_id: 'u1', mentor_id: 'admin1', assigned_by: 'admin1', assigned_at: '2026-08-01T00:00:00Z' },
  ]),
  fetchMentorsList: jest.fn().mockResolvedValue([{ id: 'admin1', name: 'Coach' }]),
  fetchUsers: jest.fn().mockResolvedValue([
    { id: 'u1', email: '', name: 'Ana', is_admin: false, created_at: '' },
    { id: 'admin1', email: '', name: 'Coach', is_admin: true, created_at: '' },
  ]),
}));
jest.mock('@/lib/admin/actions', () => ({
  assignMentor: jest.fn().mockResolvedValue({ success: true }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FocusDeskScreen = require('@/app/admin/index').default;

describe('FocusDeskScreen (admin) — render smoke', () => {
  it('héroe + lente MIS CLIENTES renderizan con el cliente asignado, sin throw', async () => {
    render(<FocusDeskScreen />);
    await waitFor(() => expect(screen.getByText('ESCRITORIO DEL MENTOR')).toBeTruthy());
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0);
  });
});
