/**
 * Render smoke test de Pricing / Planes (loop de pulido, iteración 38).
 * Hero + tarjetas de plan (free/premium/premium_plus) + canje de código de acceso.
 * Usa SUBSCRIPTION_TIERS real. Monta sin throw.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({ state: { subscriptionTier: 'free' }, userId: 'u-test', refreshTier: jest.fn() }),
}));
jest.mock('@/lib/admin/actions', () => ({ redeemAccessCode: jest.fn().mockResolvedValue({ status: 'ok' }) }));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const V = ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children);
  const Btn = ({ label, onPress }: { label?: string; onPress?: () => void }) =>
    R.createElement(RN.Text, { onPress }, label);
  return {
    GoldDivider: () => R.createElement(RN.View),
    PremiumCard: V, PrimaryButton: Btn, SecondaryButton: Btn,
    screen: {}, useScreen: () => ({ root: {}, content: {} }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PricingScreen = require('@/app/pricing').default;

describe('PricingScreen — render smoke', () => {
  it('hero + planes + canje de código renderiza sin throw', () => {
    expect(() => render(<PricingScreen />)).not.toThrow();
  });
});
