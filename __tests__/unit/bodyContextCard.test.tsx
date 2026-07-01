/**
 * Render smoke test del contexto biométrico de prácticas (loop de pulido, iteración 24).
 * BodyContextCard (con dato / sin dato / cargando) + PracticeClose. Ninguna rama debe throw.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { PremiumCard: ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children) };
});

let mockDaily: { today: unknown; loading: boolean } = { today: null, loading: false };
jest.mock('@/lib/wearables', () => ({
  useWearableDaily: () => mockDaily,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { BodyContextCard, PracticeClose } = require('@/app/bienestar/body-context');

describe('body-context — render smoke', () => {
  it('sin dato → estado honesto (conectar reloj) sin throw', () => {
    mockDaily = { today: null, loading: false };
    expect(() => render(<BodyContextCard frame="Acompaña tu día." />)).not.toThrow();
  });

  it('con dato del día → métricas + encuadre sin throw', () => {
    mockDaily = {
      today: { hrv_ms: 45, resting_hr: 58, recovery_score: 72 },
      loading: false,
    };
    expect(() => render(<BodyContextCard frame="Recuperación media hoy." />)).not.toThrow();
  });

  it('cargando → no renderiza nada sin throw', () => {
    mockDaily = { today: null, loading: true };
    expect(() => render(<BodyContextCard frame="…" />)).not.toThrow();
  });

  it('PracticeClose renderiza (link a diario) sin throw', () => {
    expect(() => render(<PracticeClose message="Buen trabajo hoy." />)).not.toThrow();
  });
});
