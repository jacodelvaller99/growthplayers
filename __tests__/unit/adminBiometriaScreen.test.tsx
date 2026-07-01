/**
 * Render smoke test de Admin Biométricos (dashboard cross-client) (Operación WOW, iteración 53).
 * Hero de distribución (equipo + % en alerta + barra) + 3 secciones por severidad
 * (necesitan atención · observar · sólidos). Tap → dossier.
 * Monta con filas pobladas sin throw (fetchBiometricDashboard mockeado).
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
jest.mock('@/lib/biometric', () => ({
  fetchBiometricDashboard: jest.fn().mockResolvedValue([
    { user_id: 'u1', name: 'Ana', intervention_level: 'urgent', recovery_state: 'high_risk', trend_state: 'worsening', summary: 'HRV 28% bajo baseline, 3 noches <6h.' },
    { user_id: 'u2', name: 'Beto', intervention_level: 'medium', recovery_state: 'compromised', trend_state: 'volatile', summary: null },
    { user_id: 'u3', name: 'Caro', intervention_level: 'low', recovery_state: 'strong', trend_state: 'improving', summary: 'Semana sólida.' },
  ]),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AdminBiometriaScreen = require('@/app/admin/biometria').default;

describe('AdminBiometriaScreen (admin) — render smoke', () => {
  it('hero de distribución + 3 secciones por severidad renderiza sin throw', async () => {
    render(<AdminBiometriaScreen />);
    // 'URGENTE' (pill de nivel) solo aparece con la sección "necesitan atención" ya cargada.
    await waitFor(() => expect(screen.getByText('URGENTE')).toBeTruthy());
  });
});
