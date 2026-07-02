/**
 * Render smoke tests de Conexiones + Perfil público (El Círculo F6).
 * Flag ON mockeado; IO de lib/circle mockeado con solicitud + conexión pobladas.
 */
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'u2' }),
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
jest.mock('@/lib/supabase', () => {
  const makeChain = () => {
    const c: Record<string, unknown> = {};
    for (const m of ['from', 'select', 'eq', 'insert', 'maybeSingle']) c[m] = () => c;
    c.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(resolve);
    return c;
  };
  return { supabase: makeChain() };
});
jest.mock('@/lib/circle', () => ({
  fetchMyConnections: jest.fn().mockResolvedValue([
    { id: 'c1', requester_id: 'u3', addressee_id: 'me', status: 'pending', created_at: '2026-07-01T00:00:00Z', responded_at: null },
    { id: 'c2', requester_id: 'me', addressee_id: 'u4', status: 'accepted', created_at: '2026-06-20T00:00:00Z', responded_at: '2026-06-21T00:00:00Z' },
  ]),
  fetchBlockedIds: jest.fn().mockResolvedValue(new Set()),
  fetchNamesFor: jest.fn().mockResolvedValue({
    u3: { name: 'Caro', avatar: null },
    u4: { name: 'Dani', avatar: null },
  }),
  acceptConnection: jest.fn().mockResolvedValue({ success: true }),
  removeConnection: jest.fn().mockResolvedValue({ success: true }),
  requestConnection: jest.fn().mockResolvedValue({ success: true }),
  fetchPublicProfile: jest.fn().mockResolvedValue({
    user_id: 'u2', name: 'Beto', avatar_url: null, tier: 'Operador', streak: 12,
  }),
  fetchConnectionWith: jest.fn().mockResolvedValue(null),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ConexionesScreen = require('@/app/comunidad/conexiones').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PerfilPublicoScreen = require('@/app/comunidad/perfil/[id]').default;

describe('Conexiones + Perfil público (El Círculo) — render smoke', () => {
  it('conexiones: solicitud recibida + red renderiza sin throw', async () => {
    render(<ConexionesScreen />);
    await waitFor(() => expect(screen.getByText('Caro')).toBeTruthy());
    expect(screen.getByText('quiere conectar contigo')).toBeTruthy();
    expect(screen.getByText('Dani')).toBeTruthy();
  });

  it('perfil público: name + tier + racha + acciones renderiza sin throw', async () => {
    render(<PerfilPublicoScreen />);
    await waitFor(() => expect(screen.getByText('Beto')).toBeTruthy());
    expect(screen.getByText('OPERADOR')).toBeTruthy();
    expect(screen.getByText('12 DÍAS')).toBeTruthy();
    // Sin conexión previa → CTA de conectar
    expect(screen.getByText('CONECTAR')).toBeTruthy();
  });
});
