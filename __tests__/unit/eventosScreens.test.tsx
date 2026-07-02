/**
 * Render smoke tests de Eventos (El Círculo F5): lista con tabs + detalle con
 * RSVP/asistentes/cupo. Flag ON mockeado; IO de lib/circle mockeado.
 */
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'e1' }),
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

const EVENT = {
  id: 'e1', space_id: null, created_by: 'me', title: 'Caminata de fundadores',
  description: 'Nos vemos en el parque.', starts_at: '2099-07-05T13:00:00Z', duration_minutes: 90,
  timezone: 'America/Bogota', location_type: 'in_person', location_text: 'Parque El Virrey',
  capacity: 12, status: 'scheduled', going_count: 2, created_at: '2026-07-01T00:00:00Z',
};

jest.mock('@/lib/circle', () => ({
  fetchEvents: jest.fn().mockResolvedValue([
    { id: 'e1', space_id: null, created_by: 'me', title: 'Caminata de fundadores', description: null, starts_at: '2099-07-05T13:00:00Z', duration_minutes: 90, timezone: 'America/Bogota', location_type: 'in_person', location_text: 'Parque', capacity: 12, status: 'scheduled', going_count: 2, created_at: '2026-07-01T00:00:00Z' },
    { id: 'e2', space_id: null, created_by: 'u2', title: 'Retro trimestral', description: null, starts_at: '2020-01-01T13:00:00Z', duration_minutes: 60, timezone: 'America/Bogota', location_type: 'virtual', location_text: 'https://zoom.us/x', capacity: null, status: 'scheduled', going_count: 5, created_at: '2019-12-01T00:00:00Z' },
  ]),
  fetchEvent: jest.fn().mockResolvedValue(EVENT),
  fetchAttendees: jest.fn().mockResolvedValue([
    { user_id: 'me', status: 'going', name: 'Yo', avatar: null },
    { user_id: 'u2', status: 'going', name: 'Beto', avatar: null },
    { user_id: 'u3', status: 'maybe', name: 'Caro', avatar: null },
  ]),
  fetchMyRsvps: jest.fn().mockResolvedValue([{ event_id: 'e1', user_id: 'me', status: 'going' }]),
  fetchBlockedIds: jest.fn().mockResolvedValue(new Set()),
  fetchMyMemberships: jest.fn().mockResolvedValue([]),
  fetchSpaces: jest.fn().mockResolvedValue([]),
  setRsvp: jest.fn().mockResolvedValue({ success: true }),
  cancelEvent: jest.fn().mockResolvedValue({ success: true }),
  reportTarget: jest.fn().mockResolvedValue({ success: true }),
  createEvent: jest.fn().mockResolvedValue({ success: true, id: 'e9' }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const EventosScreen = require('@/app/comunidad/eventos/index').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const EventoDetalleScreen = require('@/app/comunidad/eventos/[id]').default;

describe('Eventos (El Círculo) — render smoke', () => {
  it('lista: tab próximos con evento futuro renderiza sin throw', async () => {
    render(<EventosScreen />);
    await waitFor(() => expect(screen.getByText('Caminata de fundadores')).toBeTruthy());
    // El pasado no aparece en el tab por defecto (próximos)
    expect(screen.queryByText('Retro trimestral')).toBeNull();
  });

  it('detalle: RSVP + asistentes + cupo renderiza sin throw', async () => {
    render(<EventoDetalleScreen />);
    await waitFor(() => expect(screen.getByText('Caminata de fundadores')).toBeTruthy());
    expect(screen.getByText('Beto')).toBeTruthy();
    expect(screen.getByText('2/12 cupos')).toBeTruthy();
    // Soy el creador → puedo cancelar
    expect(screen.getByText('CANCELAR EVENTO')).toBeTruthy();
    // 1 en "tal vez"
    expect(screen.getByText('1 más en "tal vez"')).toBeTruthy();
  });
});
