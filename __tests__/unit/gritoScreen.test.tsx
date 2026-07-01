/**
 * Render smoke test del Grito de Liberación (loop de pulido, iteración 27).
 * Herramienta somática de 5 fases (prep → activación timer → ejecución → integración → done)
 * con SafetyWarning tone=danger. Monta la fase 0 (prep + SafetyWarning) sin throw.
 * Fuerza Platform=web para saltar expo-haptics nativo.
 */
import { render } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

// Fuerza web para saltar el path nativo de expo-haptics (antes del require de la pantalla).
(Platform as { OS: string }).OS = 'web';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Success: 'success' },
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({ saveWellnessSession: jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock('@/components/polaris', () => ({
  useScreen: () => ({ root: {}, content: {} }),
}));
jest.mock('@/components/SafetyWarning', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { __esModule: true, default: () => R.createElement(RN.View) };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const GritoScreen = require('@/app/bienestar/grito').default;

describe('GritoScreen — render smoke', () => {
  it('fase 0 (prep + SafetyWarning) renderiza sin throw', () => {
    expect(() => render(<GritoScreen />)).not.toThrow();
  });
});
