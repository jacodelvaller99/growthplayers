/**
 * Render smoke test de la Política de Privacidad (loop de pulido, iteración 40).
 * Documento legal de 14 secciones. Monta sin throw.
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
const PrivacidadScreen = require('@/app/legal/privacidad').default;

describe('PrivacidadScreen — render smoke', () => {
  it('documento de privacidad renderiza sin throw', () => {
    expect(() => render(<PrivacidadScreen />)).not.toThrow();
  });
});
