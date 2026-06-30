/**
 * Render smoke test de Biblioteca (Ola 2: sección LECTURAS con libros reales).
 * Monta la pantalla y verifica que renderiza sin throw.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
// polaris.tsx importa @shopify/react-native-skia (falla en jest) → stub.
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactLib = require('react');
  return {
    GoldDivider: ({ label }: { label?: string }) => ReactLib.createElement(RN.Text, null, label),
    screen: {},
    useScreen: () => ({ root: {}, content: {} }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BibliotecaScreen = require('@/app/bienestar/biblioteca').default;

describe('BibliotecaScreen — render smoke', () => {
  it('renderiza sin throw (con LECTURAS)', () => {
    expect(() => render(<BibliotecaScreen />)).not.toThrow();
  });
});
