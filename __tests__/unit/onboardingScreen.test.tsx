/**
 * Render smoke test del Onboarding (loop de pulido, iteración 3).
 * Monta el consent gate (step 0) y verifica render sin throw — la pantalla
 * más sensible del flujo (compliance). No debe romperse por a11y ni por el
 * guard anti-doble-tap del finish.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({
    completeOnboarding: jest.fn().mockResolvedValue(undefined),
    userId: 'u-test',
    state: {
      profile: { name: '', role: '' },
      northStar: { purpose: '', identity: '', dailyReminder: '' },
    },
  }),
}));
jest.mock('@/lib/analytics', () => ({ analytics: { setConsent: jest.fn() } }));
jest.mock('@/lib/supabase', () => ({
  intel: { profiles: () => ({ update: () => ({ eq: jest.fn().mockResolvedValue({}) }) }) },
}));
jest.mock('@/lib/admin/actions', () => ({ redeemAccessCode: jest.fn() }));
jest.mock('@/lib/admin/types', () => ({ PRODUCT_LABELS: {} }));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const Btn = ({ label, onPress }: { label?: string; onPress?: () => void }) =>
    R.createElement(RN.Text, { onPress }, label);
  const Wrap = ({ children }: { children?: React.ReactNode }) => R.createElement(RN.View, null, children);
  return {
    GoldDivider: () => R.createElement(RN.View),
    PolarisMark: () => R.createElement(RN.View),
    PremiumCard: Wrap,
    PremiumInput: (p: object) => R.createElement(RN.TextInput, p),
    PrimaryButton: Btn,
    SecondaryButton: Btn,
    StatusPill: () => R.createElement(RN.View),
    screen: {},
    useScreen: () => ({ root: {}, content: {} }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const OnboardingScreen = require('@/app/(onboarding)/index').default;

describe('OnboardingScreen — render smoke', () => {
  it('consent gate (step 0) renderiza sin throw', () => {
    expect(() => render(<OnboardingScreen />)).not.toThrow();
  });
});
