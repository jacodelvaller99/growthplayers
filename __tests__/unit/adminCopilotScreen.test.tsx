/**
 * Render smoke test de Admin Copiloto (IA solo-admin) (loop de pulido, iteración 58).
 * Chat operativo cross-client: intro + quick-prompts + input + enviar/detener.
 * Monta y ensambla el contexto (at-risk + ranking + notas) sin throw (IO mockeado).
 */
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({ state: { profile: { name: 'Capu' } } }),
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
  fetchAtRiskUsers: jest.fn().mockResolvedValue([
    { user_id: 'u1', name: 'Ana', churn_risk_label: 'critical', days_since_last_act: 9 },
  ]),
}));
jest.mock('@/lib/memory', () => ({
  fetchNotesByUsers: jest.fn().mockResolvedValue({ u1: { last: 'Semana difícil, viajó.' } }),
}));
jest.mock('@/lib/userRanking', () => ({
  fetchUserRanking: jest.fn().mockResolvedValue([
    { id: 'u1', rank: 1, name: 'Ana', score: 82, percentile: 95, topDriver: { dimension: 'wellbeing', label: 'Bienestar' } },
  ]),
}));
jest.mock('@/lib/adminCopilot', () => ({
  streamAdminCopilot: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fetchNotesByUsers } = require('@/lib/memory');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AdminCopilotScreen = require('@/app/admin/copilot').default;

describe('AdminCopilotScreen (admin) — render smoke', () => {
  it('intro + quick-prompts + input renderiza y ensambla contexto sin throw', async () => {
    render(<AdminCopilotScreen />);
    expect(screen.getByText('¿A quién contacto hoy?')).toBeTruthy();
    // Deja terminar el ensamblado async del contexto (at-risk → notas → setCtx).
    await waitFor(() => expect(fetchNotesByUsers).toHaveBeenCalledWith(['u1']));
  });
});
