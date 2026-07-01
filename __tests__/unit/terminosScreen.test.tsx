/**
 * Render smoke test de los Términos de Uso (loop de pulido, iteración 41).
 * Documento legal de 18 secciones. Monta sin throw.
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
const TerminosScreen = require('@/app/legal/terminos').default;

describe('TerminosScreen — render smoke', () => {
  it('documento de términos renderiza sin throw', () => {
    expect(() => render(<TerminosScreen />)).not.toThrow();
  });
});
