/**
 * Render smoke test del Paywall (loop de pulido, iteración 39).
 * Hero + features + prueba social + garantía + descope web (lead capture) + legal.
 * Fuerza web (descope RevenueCat + captura de lead). Monta sin throw.
 */
import { render } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

(Platform as { OS: string }).OS = 'web';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(), notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'l', Medium: 'm' }, NotificationFeedbackType: { Success: 's', Error: 'e' },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const V = ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children);
  const Btn = ({ label, onPress }: { label?: string; onPress?: () => void }) =>
    R.createElement(RN.Text, { onPress }, label);
  return {
    AppHeader: () => R.createElement(RN.View),
    PremiumCard: V, PrimaryButton: Btn, SecondaryButton: Btn,
    screen: {}, useScreen: () => ({ root: {}, content: {} }),
  };
});
jest.mock('@/data/testimonials', () => ({
  TESTIMONIALS: [
    { id: 't1', name: '[Pendiente]', role: 'Fundador', verified: false, quote: 'Cambió mi ritmo.', metric: { before: '5h', after: '7h', context: 'sueño' } },
    { id: 't2', name: 'Ana', role: 'CEO', verified: true, quote: 'Norman me sostuvo.' },
  ],
}));
jest.mock('@/lib/webLeads', () => ({
  captureWebLead: jest.fn().mockResolvedValue(true),
  isValidEmail: (e: string) => e.includes('@'),
}));
jest.mock('@/services/revenuecat', () => ({
  checkSubscription: jest.fn(), getOfferings: jest.fn().mockResolvedValue({ current: { availablePackages: [] } }),
  purchasePackage: jest.fn(), restorePurchases: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PaywallScreen = require('@/app/paywall').default;

describe('PaywallScreen — render smoke', () => {
  it('web (descope + lead) + features + prueba social + legal renderiza sin throw', () => {
    expect(() => render(<PaywallScreen />)).not.toThrow();
  });
});
