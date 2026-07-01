/**
 * Render smoke test de Cuerpo (loop de pulido, iteración 23).
 * Medidas + IMC en vivo + historial. Monta con estado vacío sin throw.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({ useLifeFlow: () => ({ userId: 'u-test' }) }));
jest.mock('@/lib/supabase', () => ({
  db2: {
    bodyMeasurements: () => ({
      select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }) }) }),
      insert: () => Promise.resolve({}),
    }),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CuerpoScreen = require('@/app/bienestar/cuerpo').default;

describe('CuerpoScreen — render smoke', () => {
  it('renderiza (IMC + formulario + estado vacío) sin throw', () => {
    expect(() => render(<CuerpoScreen />)).not.toThrow();
  });
});
