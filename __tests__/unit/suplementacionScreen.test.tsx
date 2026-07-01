/**
 * Render smoke test de Suplementación (loop de pulido, iteración 25).
 * 3 tabs (energía/sueño/cognitivo) con catálogo evidenciado + edición de dosis/timing
 * + guardar stack estructurado. Monta con estado vacío sin throw.
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
    supplements: () => ({
      select: () => ({ eq: () => Promise.resolve({ data: [] }) }),
      upsert: () => Promise.resolve({}),
    }),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SuplementacionScreen = require('@/app/bienestar/suplementacion').default;

describe('SuplementacionScreen — render smoke', () => {
  it('renderiza (tabs + catálogo + guardar) sin throw', () => {
    expect(() => render(<SuplementacionScreen />)).not.toThrow();
  });
});
