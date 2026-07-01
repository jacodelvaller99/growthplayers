/**
 * Render smoke test del inbox de DM (loop de pulido, iteración 31).
 * Bandeja de conversaciones agrupadas por peer, con presence + realtime + bloqueos.
 * Monta la rama loading/vacío sin throw (Supabase mockeado con cadenas seguras).
 */
import { render } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  // No-op: evita disparar el load() async durante el render del test (deja la
  // pantalla en su estado inicial de loading — render válido, sin updates async).
  useFocusEffect: () => {},
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({ useLifeFlow: () => ({ userId: 'u-test' }) }));
jest.mock('@/lib/presence', () => ({ usePresence: () => new Set<string>() }));
jest.mock('@/components/Avatar', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { Avatar: () => R.createElement(RN.View) };
});

// Cadena segura para direct_messages / user_blocks / user_profiles + realtime.
jest.mock('@/lib/supabase', () => {
  const channelObj = { on: () => channelObj, subscribe: () => channelObj };
  return {
    supabase: {
      from: () => {
        const c: Record<string, unknown> = {};
        ['select', 'or', 'eq', 'in'].forEach((m) => { c[m] = () => c; });
        c.order = () => ({ limit: () => Promise.resolve({ data: [], error: null }) });
        return c;
      },
      channel: () => channelObj,
      removeChannel: jest.fn(),
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MensajesScreen = require('@/app/comunidad/mensajes').default;

describe('MensajesScreen (inbox DM) — render smoke', () => {
  it('renderiza (loading / estado vacío) sin throw', () => {
    expect(() => render(<MensajesScreen />)).not.toThrow();
  });
});
