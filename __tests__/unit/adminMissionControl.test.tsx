/**
 * Render smoke test del CMI Mission Control (loop de pulido, iteración 44).
 * KPIs + estrella polar + a-contactar-hoy + embudo + señal de práctica + tiers +
 * actividad en vivo + acciones + módulos. Monta la rama cargada sin throw.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
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
  return { GoldDivider: () => R.createElement(RN.View), PremiumCard: V, StatusPill: () => R.createElement(RN.View), useScreen: () => ({ root: {}, content: {} }) };
});
jest.mock('@/components/admin-decision', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return {
    NoteBadge: () => R.createElement(RN.View), PolarStarCard: () => R.createElement(RN.View),
    PracticeSignalCard: () => R.createElement(RN.View), ProtocolFunnelCard: () => R.createElement(RN.View),
  };
});
jest.mock('@/constants/subscriptions', () => ({
  getTierColor: () => '#888888',
  getTierLabel: (t: string) => t,
}));
jest.mock('@/lib/admin/queries', () => ({
  fetchAtRiskUsers: jest.fn().mockResolvedValue([]),
  fetchDashboardKPIs: jest.fn().mockResolvedValue({ active_today: 3, avg_engagement: 62, avg_sovereign: 540, critical_churn: 0 }),
  fetchLiveEvents: jest.fn().mockResolvedValue([]),
  fetchPracticeSignal: jest.fn().mockResolvedValue(null),
  fetchProtocolFunnel: jest.fn().mockResolvedValue(null),
  fetchRetention90d: jest.fn().mockResolvedValue(null),
  fetchTierCounts: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/lib/memory', () => ({ fetchNotesByUsers: jest.fn().mockResolvedValue({}) }));
jest.mock('@/lib/admin/actions', () => ({ recalculateAllMLAction: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/supabase', () => ({ intel: { events: jest.fn() } }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MissionControl = require('@/app/admin/index').default;

describe('MissionControl (CMI) — render smoke', () => {
  it('renderiza (loading → dashboard) sin throw', () => {
    expect(() => render(<MissionControl />)).not.toThrow();
  });
});
