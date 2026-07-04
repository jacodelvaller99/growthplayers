/**
 * Render smoke test del Dashboard/Comando (loop de pulido, iteración 4).
 * Monta mobile + desktop y verifica render sin throw. Es la home: mucho
 * hook + animaciones + SVG → todo mockeado a stubs. La red de seguridad
 * que faltaba cuando un re-render en vivo tumbó el chat.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

let mockIsDesktop = false;

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-svg', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  return { __esModule: true, default: RN.View, Svg: RN.View, Circle: RN.View };
});
jest.mock('@/components/AnimatedNumber', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { AnimatedNumber: ({ value }: { value: number }) => R.createElement(RN.Text, null, String(value)) };
});
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const Wrap = ({ children }: { children?: React.ReactNode }) => R.createElement(RN.View, null, children);
  const Btn = ({ label, onPress }: { label?: string; onPress?: () => void }) =>
    R.createElement(RN.Text, { onPress }, label);
  return {
    AppHeader: Wrap,
    EditorialPanel: Wrap,
    GoldDivider: () => R.createElement(RN.View),
    HoverCard: ({ children, onPress }: { children?: React.ReactNode; onPress?: () => void }) =>
      R.createElement(RN.View, { onPress }, children),
    MetricCard: Wrap,
    PremiumCard: Wrap,
    PrimaryButton: Btn,
    ProgressCard: Wrap,
    SovereignDeltaTag: () => R.createElement(RN.View),
    StateMeter: () => R.createElement(RN.View),
    StatusPill: () => R.createElement(RN.View),
    screen: { sectionTitle: {} },
    useScreen: () => ({ root: {}, content: {} }),
  };
});
jest.mock('@/hooks/use-breakpoint', () => ({
  useBreakpoint: () => ({ isDesktop: mockIsDesktop, isMobile: !mockIsDesktop, isTablet: false }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({
    protocolDay: 12,
    todayCheckIn: null,
    latestCheckIn: null,
    userId: 'u-test',
    state: {
      profile: { name: 'Juan Jacobo' },
      northStar: { purpose: '', identity: '', dailyReminder: '' },
      checkIns: [],
      wellnessSessions: [],
      completedLessons: [],
      completedTasks: {},
      mentorMessages: [],
    },
  }),
}));
jest.mock('@/hooks/useUserIntelligence', () => ({
  useUserIntelligence: () => ({
    engagementTier: 'good',
    intelligence: {
      anomaly_detected: false,
      anomaly_type: null,
      churn_risk_label: 'low',
      next_action: null,
      next_action_urgency: 'low',
      next_action_reason: null,
      engagement_score: 0,
    },
  }),
}));
jest.mock('@/store/wellnessStore', () => ({
  useWellnessStore: () => ({ user: { totalWellnessMinutes: 0, weeklyActivity: [] } }),
}));
jest.mock('@/lib/wearables', () => ({
  useWearableConnections: () => ({ isConnected: () => false }),
}));
jest.mock('@/lib/weekly-session-generator', () => ({
  generateWeeklySessionIfNeeded: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/lib/supabase', () => ({
  db2: { communityPosts: () => ({ select: () => ({ order: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }) }) },
  supabase: { from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: [] }), in: () => Promise.resolve({ data: [] }) }) }) },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DashboardScreen = require('@/app/(tabs)/comando').default;

describe('DashboardScreen — render smoke', () => {
  it('móvil renderiza sin throw', () => {
    mockIsDesktop = false;
    expect(() => render(<DashboardScreen />)).not.toThrow();
  });
  it('desktop renderiza sin throw', () => {
    mockIsDesktop = true;
    expect(() => render(<DashboardScreen />)).not.toThrow();
  });
});
