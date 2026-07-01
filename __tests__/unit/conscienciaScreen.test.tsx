/**
 * Render smoke test de la Escala de Consciencia / Hawkins (loop de pulido, iteración 29).
 * Grid de 17 niveles + panel de detalle + check semanal (calibración local).
 * Monta sin throw. Platform=web para saltar haptics nativo.
 */
import { render } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

// Fuerza web para saltar el path nativo de expo-haptics (antes del require de la pantalla).
(Platform as { OS: string }).OS = 'web';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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
jest.mock('@/storage/local', () => ({
  readLocal: jest.fn().mockResolvedValue(null),
  writeLocal: jest.fn().mockResolvedValue(undefined),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ConscienciaScreen = require('@/app/bienestar/consciencia').default;

describe('ConscienciaScreen — render smoke', () => {
  it('grid + detalle (Valentía 200 por defecto) + check semanal renderiza sin throw', () => {
    expect(() => render(<ConscienciaScreen />)).not.toThrow();
  });
});
