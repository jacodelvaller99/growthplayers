/**
 * Render smoke test del hub EL CÍRCULO (app/comunidad/index.tsx) — Círculo F2.
 * Flag ON: próximos eventos + mis espacios + conexiones con badge + accesos.
 * (El flag OFF se cubre implícitamente: ENV real default false — aquí se mockea ON
 * para ejercitar el hub completo.)
 */
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
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
jest.mock('@/storage/local', () => ({
  readLocal: jest.fn().mockResolvedValue(1), // EULA aceptado
  writeLocal: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/circle', () => ({
  fetchEvents: jest.fn().mockResolvedValue([
    {
      id: 'e1', space_id: null, created_by: 'u2', title: 'Caminata de fundadores',
      description: null, starts_at: '2099-07-05T13:00:00Z', duration_minutes: 90,
      timezone: 'America/Bogota', location_type: 'in_person', location_text: 'Parque El Virrey',
      capacity: 12, status: 'scheduled', going_count: 4, created_at: '2026-07-01T00:00:00Z',
    },
  ]),
  fetchMyRsvps: jest.fn().mockResolvedValue([{ event_id: 'e1', user_id: 'me', status: 'going' }]),
  fetchSpaces: jest.fn().mockResolvedValue([
    { id: 's1', created_by: 'u2', name: 'Fuerza 5AM', description: 'Entrenamiento matutino', emoji: '🔥', members_count: 8, is_archived: false, created_at: '2026-06-01T00:00:00Z' },
  ]),
  fetchMyMemberships: jest.fn().mockResolvedValue([{ space_id: 's1', user_id: 'me', role: 'member', joined_at: '2026-06-02T00:00:00Z' }]),
  fetchMyConnections: jest.fn().mockResolvedValue([
    { id: 'c1', requester_id: 'u3', addressee_id: 'me', status: 'pending', created_at: '2026-07-01T00:00:00Z', responded_at: null },
    { id: 'c2', requester_id: 'me', addressee_id: 'u4', status: 'accepted', created_at: '2026-06-20T00:00:00Z', responded_at: '2026-06-21T00:00:00Z' },
  ]),
  fetchBlockedIds: jest.fn().mockResolvedValue(new Set()),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CirculoHubScreen = require('@/app/comunidad/index').default;

describe('CirculoHubScreen — render smoke (flag ON)', () => {
  it('hub con eventos + espacios + badge de solicitudes renderiza sin throw', async () => {
    render(<CirculoHubScreen />);
    // Contenido que solo existe post-carga:
    await waitFor(() => expect(screen.getByText('Caminata de fundadores')).toBeTruthy());
    expect(screen.getByText('Fuerza 5AM')).toBeTruthy();
    // Badge de 1 solicitud pendiente:
    expect(screen.getByText('1')).toBeTruthy();
  });
});
