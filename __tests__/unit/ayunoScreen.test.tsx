/**
 * Render smoke test de Ayuno (loop de pulido, iteración 21).
 * Timer + protocolos + etapas + guía + modales (disclaimer médico / refeeding).
 * Monta sin throw. El disclaimer médico no-omitible se preserva.
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
    fasting: () => ({
      insert: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'f1' } }) }) }),
      update: () => ({ eq: () => Promise.resolve({}) }),
    }),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AyunoScreen = require('@/app/bienestar/ayuno').default;

describe('AyunoScreen — render smoke', () => {
  it('renderiza (timer idle + protocolos + etapas + guía) sin throw', () => {
    expect(() => render(<AyunoScreen />)).not.toThrow();
  });
});
