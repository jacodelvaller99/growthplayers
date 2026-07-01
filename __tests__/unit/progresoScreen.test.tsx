/**
 * Render smoke test de Progreso (loop de pulido, iteración 9).
 * Pantalla grande (score, sparklines SVG, heatmap, ADN, GDPR, ajustes).
 * Monta mobile + desktop sin throw. Muchos hooks/servicios mockeados.
 */
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import React from 'react';

// El efecto de montaje hace un import('expo-notifications') dinámico solo en
// no-web (jest no soporta dynamic import de módulos nativos). En 'web' hace
// short-circuit; el layout lo controla el mock de useScreen, no Platform.
(Platform as { OS: string }).OS = 'web';

let mockIsDesktop = false;

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.0' } } }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('react-native-svg', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  return { __esModule: true, default: RN.View, Svg: RN.View, Circle: RN.View, Path: RN.View, Polyline: RN.View };
});
jest.mock('@/services/notifications', () => ({
  requestNotificationPermissions: jest.fn().mockResolvedValue(true),
  scheduleCheckinReminder: jest.fn(),
  cancelReminders: jest.fn(),
}));
jest.mock('@/hooks/useIsAdmin', () => ({ useIsAdmin: () => false }));
jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({
    tier: 'free',
    tierInfo: { color: '#C9A000', name: 'Free', description: 'Plan gratuito' },
    isExpiringSoon: false,
    expiresAt: null,
  }),
}));
jest.mock('@/hooks/useUserIntelligence', () => ({
  useUserIntelligence: () => ({
    intelligence: {
      engagement_score: 0, churn_risk: 0, churn_risk_label: 'low', cohort_label: null,
      affinity_binaural: 0, affinity_meditation: 0, affinity_breathing: 0,
      affinity_lessons: 0, affinity_mentor: 0, affinity_journaling: 0,
    },
    topAffinity: null,
    engagementTier: 'good',
  }),
}));
jest.mock('@/store/wellnessStore', () => ({
  useWellnessStore: (sel: (s: { user: { subscriptionTier: string } }) => unknown) =>
    sel({ user: { subscriptionTier: 'free' } }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({
    state: {
      profile: { name: 'Juan Jacobo', role: 'Fundador', mlConsent: true },
      northStar: { purpose: '', identity: '', dailyReminder: '' },
      checkIns: [],
      wellnessSessions: [],
      completedLessons: [],
      completedTasks: {},
    },
    protocolDay: 12,
    averages: { energy: 7, clarity: 7, stress: 4, sleep: 7 },
    updateProfile: jest.fn().mockResolvedValue(undefined),
    updateNorthStar: jest.fn().mockResolvedValue(undefined),
    resetOnboarding: jest.fn(),
    clearData: jest.fn(),
    signOut: jest.fn(),
    deleteAccount: jest.fn().mockResolvedValue(undefined),
    exportData: jest.fn().mockResolvedValue('{}'),
    userId: 'u-test',
  }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const Wrap = ({ children, style }: { children?: React.ReactNode; style?: object }) =>
    R.createElement(RN.View, { style }, children);
  const Btn = ({ label, onPress }: { label?: string; onPress?: () => void }) =>
    R.createElement(RN.Text, { onPress }, label);
  return {
    AchievementBadge: () => R.createElement(RN.View),
    AppHeader: Wrap,
    DangerButton: Btn,
    GoldDivider: () => R.createElement(RN.View),
    MetricCard: Wrap,
    PremiumCard: Wrap,
    PremiumInput: (p: object) => R.createElement(RN.TextInput, p),
    PrimaryButton: Btn,
    ProgressCard: () => R.createElement(RN.View),
    SecondaryButton: Btn,
    SovereignDeltaTag: () => R.createElement(RN.View),
    SovereignScore: () => R.createElement(RN.View),
    WeeklySparkline: () => R.createElement(RN.View),
    screen: {},
    useScreen: () => ({ root: {}, content: {}, isDesktop: mockIsDesktop, isTablet: false }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ProgresoScreen = require('@/app/(tabs)/progreso').default;

describe('ProgresoScreen — render smoke', () => {
  it('móvil renderiza sin throw', () => {
    mockIsDesktop = false;
    expect(() => render(<ProgresoScreen />)).not.toThrow();
  });
  it('desktop renderiza sin throw', () => {
    mockIsDesktop = true;
    expect(() => render(<ProgresoScreen />)).not.toThrow();
  });
});
