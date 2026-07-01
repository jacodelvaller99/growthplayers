/**
 * Render smoke test del hilo de chat 1-a-1 (loop de pulido, iteración 32).
 * Burbujas + reacciones long-press + recibos + estados de bloqueo + realtime.
 * Monta la rama loading/vacío sin throw (Supabase + channel mockeados).
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'peer-1', name: 'Ana' }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({ useLifeFlow: () => ({ userId: 'u-test' }) }));
jest.mock('@/components/Avatar', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { Avatar: () => R.createElement(RN.View) };
});
jest.mock('@/lib/supabase', () => {
  const chain = () => {
    const c: Record<string, unknown> = {};
    ['select', 'or', 'eq', 'is', 'in', 'order', 'delete', 'update', 'insert'].forEach((m) => { c[m] = () => c; });
    c.limit = () => Promise.resolve({ data: [], error: null });
    c.single = () => Promise.resolve({ data: null, error: null });
    c.upsert = () => Promise.resolve({ error: null });
    return c;
  };
  const channelObj = { on: () => channelObj, subscribe: () => channelObj };
  return {
    supabase: {
      from: () => chain(),
      channel: () => channelObj,
      removeChannel: jest.fn(),
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ChatThreadScreen = require('@/app/comunidad/chat/[id]').default;

describe('ChatThreadScreen (DM 1-a-1) — render smoke', () => {
  it('renderiza (loading / vacío) sin throw', () => {
    expect(() => render(<ChatThreadScreen />)).not.toThrow();
  });
});
