/**
 * Render smoke test de Sueño (loop de pulido, iteración 15).
 * Monta el catálogo (free → lock + CTA premium; premium → todo desbloqueado)
 * sin throw. SafetyWarning (insomnio/apnea) preservado.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

let mockTier = 'free';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/store/wellnessStore', () => ({
  useWellnessStore: () => ({ user: { subscriptionTier: mockTier }, startSession: jest.fn() }),
}));
jest.mock('@/components/SafetyWarning', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { __esModule: true, default: () => R.createElement(RN.View) };
});
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const Wrap = ({ children, style }: { children?: React.ReactNode; style?: object }) =>
    R.createElement(RN.View, { style }, children);
  return {
    GoldDivider: () => R.createElement(RN.View),
    PremiumCard: Wrap,
    screen: {},
    useScreen: () => ({ root: {}, content: {} }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SuenoScreen = require('@/app/bienestar/sueno').default;

describe('SuenoScreen — render smoke', () => {
  it('free (con lock + CTA premium) renderiza sin throw', () => {
    mockTier = 'free';
    expect(() => render(<SuenoScreen />)).not.toThrow();
  });
  it('premium (todo desbloqueado) renderiza sin throw', () => {
    mockTier = 'premium';
    expect(() => render(<SuenoScreen />)).not.toThrow();
  });
});
