/**
 * Render smoke test del Descargo de Salud (loop de pulido, iteración 42).
 * Documento legal de 8 secciones + callout de emergencia. Monta sin throw.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { GoldDivider: () => R.createElement(RN.View), useScreen: () => ({ root: {}, content: {} }) };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SaludScreen = require('@/app/legal/salud').default;

describe('SaludScreen — render smoke', () => {
  it('descargo de salud + callout de emergencia renderiza sin throw', () => {
    expect(() => render(<SaludScreen />)).not.toThrow();
  });
});
