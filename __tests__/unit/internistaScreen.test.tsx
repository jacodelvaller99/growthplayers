/**
 * Render smoke test del Internista educativo (loop de pulido, iteración 18).
 * Pantalla sensible: consent gate + disclaimer + chat. Monta el estado de
 * carga inicial sin throw. Guardrails (derivación red-flag, disclaimer,
 * consent) viven en lib/internist.ts + el flujo — este test solo verifica UI.
 */
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import React from 'react';

// El efecto de consent lee storage: en 'web' usa window.localStorage y evita
// el import() dinámico de expo-secure-store (no soportado en jest).
(Platform as { OS: string }).OS = 'web';
const g = globalThis as { window?: { localStorage?: object } };
g.window = g.window ?? {};
g.window.localStorage = { getItem: () => null, setItem: () => {} };

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({ useLifeFlow: () => ({ userId: 'u-test' }) }));
jest.mock('@/lib/internist', () => ({
  fetchInternistHistory: jest.fn().mockResolvedValue([]),
  fetchPatientContext: jest.fn().mockResolvedValue({}),
  persistInternistTurn: jest.fn(),
  streamInternistResponse: jest.fn().mockResolvedValue({ text: '', redFlags: [] }),
}));
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
    useScreen: () => ({ root: {}, content: {} }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const InternistaScreen = require('@/app/bienestar/internista').default;

describe('InternistaScreen — render smoke', () => {
  it('renderiza (loading/consent gate) sin throw', () => {
    expect(() => render(<InternistaScreen />)).not.toThrow();
  });
});
