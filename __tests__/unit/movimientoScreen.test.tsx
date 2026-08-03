/**
 * Render smoke test de Movimiento.
 * Monta el catálogo de flows/circuitos (SafetyWarning + BodyContextCard) sin
 * throw. No entra al reproductor activo (createNarrationPlayer/expo-av) —
 * igual que el smoke test de Meditación, que tampoco lo hace.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({
    saveWellnessSession: jest.fn().mockResolvedValue(undefined),
    state: { wellnessSessions: [] },
  }),
}));
jest.mock('@/store/wellnessStore', () => ({
  useWellnessStore: () => ({
    startSession: jest.fn(), stopSession: jest.fn(), pauseSession: jest.fn(),
    resumeSession: jest.fn(), setElapsed: jest.fn(),
  }),
}));
jest.mock('@/lib/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('@/components/SafetyWarning', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { __esModule: true, default: () => R.createElement(RN.View) };
});
jest.mock('@/app/bienestar/body-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return {
    BodyContextCard: () => R.createElement(RN.View),
    PracticeClose: () => R.createElement(RN.View),
  };
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
    StatusPill: () => R.createElement(RN.View),
    screen: {},
    useScreen: () => ({ root: {}, content: {} }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MovimientoScreen = require('@/app/bienestar/movimiento').default;

describe('MovimientoScreen — render smoke', () => {
  it('catálogo de flows y circuitos renderiza sin throw', () => {
    expect(() => render(<MovimientoScreen />)).not.toThrow();
  });
});
