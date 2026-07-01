/**
 * Render smoke test de Auth/login (loop de pulido, iteración 2).
 * Monta login y register; verifica render sin throw.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

let mockMode: string | undefined;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ mode: mockMode }),
  useRouter: () => ({ replace: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const Btn = ({ label, onPress }: { label?: string; onPress?: () => void }) =>
    R.createElement(RN.Text, { onPress }, label);
  return {
    GoldDivider: () => R.createElement(RN.View),
    PolarisMark: () => R.createElement(RN.View),
    PremiumInput: (p: object) => R.createElement(RN.TextInput, p),
    PrimaryButton: Btn,
    SecondaryButton: Btn,
    screen: {},
    useScreen: () => ({ root: {}, content: {} }),
  };
});
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }) } },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AuthScreen = require('@/app/(auth)/index').default;

describe('AuthScreen — render smoke', () => {
  it('login renderiza sin throw', () => {
    mockMode = undefined;
    expect(() => render(<AuthScreen />)).not.toThrow();
  });
  it('register renderiza sin throw', () => {
    mockMode = 'register';
    expect(() => render(<AuthScreen />)).not.toThrow();
  });
});
