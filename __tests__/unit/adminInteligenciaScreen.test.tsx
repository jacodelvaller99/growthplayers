/**
 * Render smoke test de Admin Inteligencia ML (loop de pulido, iteración 51).
 * Engagement KPIs + churn + cohortes + afinidades + biométricos + usuarios en riesgo + recalcular.
 * Monta con overview/at-risk/bio poblados sin throw (libs admin mockeadas).
 */
import { render, screen, waitFor } from '@testing-library/react-native';
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
  const V = ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children);
  return { GoldDivider: () => R.createElement(RN.View), PremiumCard: V, useScreen: () => ({ root: {}, content: {} }) };
});
jest.mock('@/lib/admin/actions', () => ({
  recalculateAllMLAction: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock('@/lib/admin/queries', () => ({
  fetchMlOverview: jest.fn().mockResolvedValue({
    total: 42,
    averages: { engagement_score: 63, churn_risk: 0.3 },
    active_anomalies: 2,
    churn_distribution: { low: 20, medium: 10, high: 8, critical: 4 },
    cohort_distribution: { explorers: 15, committed: 20, at_risk: 7 },
    avg_affinities: { meditation: 0.7, breathing: 0.5, lessons: 0.3 },
  }),
  fetchAtRiskUsers: jest.fn().mockResolvedValue([
    { user_id: 'u1', name: 'Ana', churn_risk_label: 'critical', engagement_score: 20, days_since_last_act: 9, anomaly_detected: true },
  ]),
  fetchBiometricStats: jest.fn().mockResolvedValue({ users_with_wearable: 12, avg_hrv: 55, avg_recovery: 68, users_with_anomaly: 1 }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const InteligenciaScreen = require('@/app/admin/inteligencia/index').default;

describe('InteligenciaScreen (admin) — render smoke', () => {
  it('KPIs + churn + cohortes + afinidades + bio + en-riesgo renderiza sin throw', async () => {
    render(<InteligenciaScreen />);
    // Espera a que salga del loading y renderice las secciones pobladas
    // (CohortBar/AffinityBar/ChurnBlock/AtRiskRow) sin throw.
    await waitFor(() => expect(screen.getByText('INTELIGENCIA ML')).toBeTruthy());
  });
});
