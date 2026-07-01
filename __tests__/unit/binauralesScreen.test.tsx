/**
 * Render smoke test de Binaurales (loop de pulido, iteración 12).
 * Monta la pantalla principal (lista de frecuencias + SafetyWarning + toggle
 * de modo). Verifica render sin throw. El SafetyWarning se preserva.
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
  useLifeFlow: () => ({ saveWellnessSession: jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock('@/store/wellnessStore', () => ({
  useWellnessStore: () => ({
    startSession: jest.fn(), stopSession: jest.fn(), pauseSession: jest.fn(),
    resumeSession: jest.fn(), setElapsed: jest.fn(),
  }),
}));
jest.mock('@/lib/binaural', () => ({ createBinauralAudio: () => null }));
jest.mock('@/lib/analytics', () => ({
  analytics: { binauralStart: jest.fn(), binauralComplete: jest.fn() },
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
const BinauralesScreen = require('@/app/bienestar/binaurales').default;

describe('BinauralesScreen — render smoke', () => {
  it('lista principal renderiza sin throw', () => {
    expect(() => render(<BinauralesScreen />)).not.toThrow();
  });
});
