/**
 * Render smoke test de Welcome (loop de pulido, iteración 1).
 * Monta ambos layouts (móvil + desktop) y verifica render sin throw.
 * La lógica de reduced-motion corre en un .then async — no debe romper el render.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

let mockIsDesktop = false;

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-breakpoint', () => ({
  useBreakpoint: () => ({ isDesktop: mockIsDesktop, isMobile: !mockIsDesktop, isTablet: false }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return {
    PolarisMark: () => R.createElement(RN.View),
    PrimaryButton: ({ label, onPress }: { label?: string; onPress?: () => void }) =>
      R.createElement(RN.Text, { onPress }, label),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const WelcomeScreen = require('@/app/(auth)/welcome').default;

describe('WelcomeScreen — render smoke', () => {
  it('móvil renderiza sin throw', () => {
    mockIsDesktop = false;
    expect(() => render(<WelcomeScreen />)).not.toThrow();
  });
  it('desktop renderiza sin throw', () => {
    mockIsDesktop = true;
    expect(() => render(<WelcomeScreen />)).not.toThrow();
  });
});
