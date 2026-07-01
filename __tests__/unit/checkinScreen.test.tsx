/**
 * Render smoke test del Check-in (loop de pulido, iteración 5).
 * Monta mobile + desktop y verifica render sin throw. Incluye el
 * micro-ritual (Animated + timers) y el guard anti-doble-tap.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

let mockIsDesktop = false;

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('@/context/ToastContext', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('@/lib/analytics', () => ({ analytics: { checkinSubmit: jest.fn() } }));
jest.mock('@/hooks/use-breakpoint', () => ({
  useBreakpoint: () => ({ isDesktop: mockIsDesktop, isMobile: !mockIsDesktop, isTablet: false }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({
    todayCheckIn: null,
    saveCheckIn: jest.fn().mockResolvedValue('ok'),
    saveWellnessSession: jest.fn().mockResolvedValue(undefined),
    state: { checkIns: [] },
  }),
}));
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
    GoldAccentCard: Wrap,
    GoldDivider: () => R.createElement(RN.View),
    PremiumCard: Wrap,
    PremiumInput: (p: object) => R.createElement(RN.TextInput, p),
    PrimaryButton: Btn,
    ScaleSelector: () => R.createElement(RN.View),
    SecondaryButton: Btn,
    screen: {},
    useScreen: () => ({ root: {}, content: {} }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CheckInScreen = require('@/app/checkin').default;

describe('CheckInScreen — render smoke', () => {
  it('móvil renderiza sin throw', () => {
    mockIsDesktop = false;
    expect(() => render(<CheckInScreen />)).not.toThrow();
  });
  it('desktop renderiza sin throw', () => {
    mockIsDesktop = true;
    expect(() => render(<CheckInScreen />)).not.toThrow();
  });
});
