/**
 * Render smoke test del feed de Comunidad (loop de pulido, iteración 30).
 * EULA gate + compose + feed + moderación (reportar/bloquear). Cubre la rama
 * "checking" inicial (render síncrono) sin throw. Supabase/DB mockeados con
 * cadenas seguras para que los efectos async no rompan.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({ useLifeFlow: () => ({ userId: 'u-test' }) }));
jest.mock('@/storage/local', () => ({
  readLocal: jest.fn().mockResolvedValue(null),
  writeLocal: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/components/Avatar', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { Avatar: () => R.createElement(RN.View) };
});

// Cadena segura: métodos encadenables + terminales que resuelven vacío.
const chain = () => {
  const c: Record<string, unknown> = {};
  ['select', 'eq', 'in', 'order', 'delete'].forEach((m) => { c[m] = () => c; });
  c.limit = () => Promise.resolve({ data: [], error: null });
  c.single = () => Promise.resolve({ data: null, error: null });
  c.insert = () => Promise.resolve({ error: null });
  c.upsert = () => Promise.resolve({ error: null });
  c.update = () => Promise.resolve({ error: null });
  return c;
};
jest.mock('@/lib/supabase', () => ({
  supabase: { from: () => chain() },
  db2: {
    communityPosts: () => chain(),
    communityReactions: () => chain(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ComunidadScreen = require('@/app/bienestar/comunidad').default;

describe('ComunidadScreen (feed) — render smoke', () => {
  it('rama inicial (checking EULA) renderiza sin throw', () => {
    expect(() => render(<ComunidadScreen />)).not.toThrow();
  });
});
