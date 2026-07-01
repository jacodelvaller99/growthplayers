/**
 * Render smoke test de Respiración (loop de pulido, iteración 13).
 * Monta la pantalla (orbe animado + chips de técnica + SafetyWarning) sin throw.
 * El SafetyWarning (embarazo/epilepsia/mareo) se preserva.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({ saveWellnessSession: jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock('@/store/wellnessStore', () => ({
  useWellnessStore: () => ({ startSession: jest.fn(), stopSession: jest.fn(), setElapsed: jest.fn() }),
}));
jest.mock('@/lib/analytics', () => ({ analytics: { breathingComplete: jest.fn() } }));
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
jest.mock('@/components/polaris', () => ({ useScreen: () => ({ root: {} }) }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RespiracionScreen = require('@/app/bienestar/respiracion').default;

describe('RespiracionScreen — render smoke', () => {
  it('renderiza sin throw', () => {
    expect(() => render(<RespiracionScreen />)).not.toThrow();
  });
});
