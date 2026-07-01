/**
 * Render smoke test de Mi Norte (loop de pulido, iteración 6).
 * Monta mobile + desktop (incluye estado vacío y con datos) sin throw.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

let mockIsDesktop = false;
let mockEmpty = true;

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-breakpoint', () => ({
  useBreakpoint: () => ({ isDesktop: mockIsDesktop, isMobile: !mockIsDesktop, isTablet: false }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({
    updateNorthStar: jest.fn().mockResolvedValue(undefined),
    state: {
      northStar: mockEmpty
        ? { purpose: '', identity: '', dailyReminder: '', nonNegotiables: [] }
        : { purpose: 'Servir', identity: 'Soy operador', dailyReminder: 'Hoy elijo', nonNegotiables: ['Salud primero'] },
    },
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
    StatusPill: () => R.createElement(RN.View),
    screen: {},
    useScreen: () => ({ root: {}, content: {} }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NorteScreen = require('@/app/(tabs)/norte').default;

describe('NorteScreen — render smoke', () => {
  it('móvil vacío renderiza sin throw', () => {
    mockIsDesktop = false; mockEmpty = true;
    expect(() => render(<NorteScreen />)).not.toThrow();
  });
  it('desktop con datos renderiza sin throw', () => {
    mockIsDesktop = true; mockEmpty = false;
    expect(() => render(<NorteScreen />)).not.toThrow();
  });
});
