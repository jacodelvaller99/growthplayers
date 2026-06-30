/**
 * Render smoke test for the 1-to-1 chat thread.
 *
 * The ErrorBoundary only catches RENDER-phase errors (not async callbacks), so a
 * mount-and-let-effects-settle test reproduces the class of crash that shipped to
 * prod (the chat rewrite passed tsc/jest/export but threw on render with live data,
 * because nothing rendered the screen). This guards that regression in the gate.
 */
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

// ── Mocks (factories are hoisted; keep them self-contained) ──────────────────
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'peer-1', name: 'Claudia Cuadros' }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

jest.mock('@/hooks/use-lifeflow', () => ({
  useLifeFlow: () => ({ userId: 'me-1' }),
}));

jest.mock('@/lib/supabase', () => {
  const SAMPLE = [
    { id: 'm1', sender_id: 'peer-1', recipient_id: 'me-1', body: 'Holaaaa', created_at: '2026-06-29T10:00:00.000Z', read_at: '2026-06-29T10:01:00.000Z' },
    { id: 'm2', sender_id: 'me-1', recipient_id: 'peer-1', body: 'Listo, vamos', created_at: '2026-06-30T09:30:00.000Z', read_at: null },
  ];
  // Chainable, thenable query-builder: every method returns itself; awaiting it
  // resolves to the configured result.
  const builder = (result: any) => {
    const o: any = {};
    ['select', 'or', 'order', 'limit', 'update', 'eq', 'is', 'in', 'insert', 'single', 'upsert', 'delete'].forEach(
      (m) => { o[m] = () => o; },
    );
    o.then = (res: any, rej: any) => Promise.resolve(result).then(res, rej);
    return o;
  };
  const channel: any = {
    on: () => channel,
    subscribe: (cb?: (s: string) => void) => { if (cb) cb('SUBSCRIBED'); return channel; },
    track: () => Promise.resolve(),
    send: () => Promise.resolve(),
    presenceState: () => ({}),
  };
  return {
    supabase: {
      from: (table: string) =>
        builder(table === 'direct_messages' ? { data: SAMPLE, error: null } : { data: [], error: null }),
      channel: () => channel,
      removeChannel: () => {},
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ChatThreadScreen = require('@/app/comunidad/chat/[id]').default;

describe('ChatThreadScreen — render smoke', () => {
  it('renders without throwing (messages + memory UI)', async () => {
    const tree = render(<ChatThreadScreen />);
    // Deja que load() (async) resuelva y re-renderice los mensajes + memoria.
    await waitFor(() => {
      expect(tree.toJSON()).toBeTruthy();
    });
  });
});
