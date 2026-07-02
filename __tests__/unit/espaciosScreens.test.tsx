/**
 * Render smoke tests de Espacios (El Círculo F3): descubrir + detalle con feed.
 * Flag ON mockeado; IO de lib/circle y supabase mockeados con datos poblados.
 */
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ id: 's1' }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/use-lifeflow', () => ({ useLifeFlow: () => ({ userId: 'me' }) }));
jest.mock('@/app/config/env', () => ({ ENV: { socialSpacesEnabled: true } }));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  const V = ({ children }: { children?: unknown }) => R.createElement(RN.View, null, children);
  return { GoldDivider: () => R.createElement(RN.View), PremiumCard: V, useScreen: () => ({ root: {}, content: {} }) };
});
jest.mock('@/components/Avatar', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { Avatar: () => R.createElement(RN.View) };
});
jest.mock('@/lib/circle', () => ({
  fetchSpaces: jest.fn().mockResolvedValue([
    { id: 's1', created_by: 'u2', name: 'Fuerza 5AM', description: 'Entrenamiento', emoji: '🔥', members_count: 8, is_archived: false, created_at: '2026-06-01T00:00:00Z' },
    { id: 's2', created_by: 'u3', name: 'Fundadores BOG', description: null, emoji: '💼', members_count: 3, is_archived: false, created_at: '2026-06-10T00:00:00Z' },
  ]),
  fetchSpace: jest.fn().mockResolvedValue(
    { id: 's1', created_by: 'u2', name: 'Fuerza 5AM', description: 'Entrenamiento matutino', emoji: '🔥', members_count: 8, is_archived: false, created_at: '2026-06-01T00:00:00Z' },
  ),
  fetchMyMemberships: jest.fn().mockResolvedValue([{ space_id: 's1', user_id: 'me', role: 'member', joined_at: '2026-06-02T00:00:00Z' }]),
  fetchEvents: jest.fn().mockResolvedValue([]),
  fetchBlockedIds: jest.fn().mockResolvedValue(new Set()),
  fetchNamesFor: jest.fn().mockResolvedValue({ u2: { name: 'Beto', avatar: null } }),
  joinSpace: jest.fn().mockResolvedValue({ success: true }),
  leaveSpace: jest.fn().mockResolvedValue({ success: true }),
  setPostReaction: jest.fn().mockResolvedValue({ success: true }),
  removePostReaction: jest.fn().mockResolvedValue({ success: true }),
  reportTarget: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock('@/lib/supabase', () => {
  const tables: Record<string, unknown[]> = {
    community_posts: [
      { id: 'p1', user_id: 'u2', content: 'Hoy entrenamos a las 5 en punto.', likes_count: 2, created_at: '2026-06-30T10:00:00Z' },
    ],
    community_reactions: [],
    user_blocks: [],
  };
  const makeChain = (table: string) => {
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'in', 'is', 'order', 'limit', 'insert', 'upsert', 'delete', 'maybeSingle']) c[m] = () => c;
    c.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: tables[table] ?? [], error: null }).then(resolve);
    return c;
  };
  return { supabase: { from: (t: string) => makeChain(t) } };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const EspaciosScreen = require('@/app/comunidad/espacios/index').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const EspacioDetalleScreen = require('@/app/comunidad/espacios/[id]').default;

describe('Espacios (El Círculo) — render smoke', () => {
  it('descubrir: lista con unirse renderiza sin throw', async () => {
    render(<EspaciosScreen />);
    await waitFor(() => expect(screen.getByText('Fundadores BOG')).toBeTruthy());
    // s2 no es mío → botón UNIRME visible
    expect(screen.getByText('UNIRME')).toBeTruthy();
  });

  it('detalle: identidad + muro con post poblado renderiza sin throw', async () => {
    render(<EspacioDetalleScreen />);
    await waitFor(() => expect(screen.getByText('Hoy entrenamos a las 5 en punto.')).toBeTruthy());
    expect(screen.getByText('Beto')).toBeTruthy();
    // soy miembro → puedo salir
    expect(screen.getByText('SALIR DEL ESPACIO')).toBeTruthy();
  });
});
