/**
 * Render smoke test de Nutrición (loop de pulido, iteración 22).
 * Wizard de 5 pasos (dieta/restricciones/alergias/objetivo/calorías) +
 * sección de plan del nutriólogo. Monta el paso 1 sin throw.
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
    nutritionProfiles: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
      upsert: () => Promise.resolve({}),
    }),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NutricionScreen = require('@/app/bienestar/nutricion').default;

describe('NutricionScreen — render smoke', () => {
  it('paso 1 (dieta + plan) renderiza sin throw', () => {
    expect(() => render(<NutricionScreen />)).not.toThrow();
  });
});
