/**
 * Render smoke test de Admin Moderación de Comunidad (loop de pulido, iteración 55).
 * Cola de reportes UGC (App Store 1.2): filtros por estado + tarjeta de reporte
 * (razón + contenido + reportero) + acciones (eliminar post con confirmación /
 * revisado / descartar / reabrir).
 * Monta con un reporte abierto poblado sin throw (supabase mockeado por tabla).
 */
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/components/polaris', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const R = require('react');
  return { GoldDivider: () => R.createElement(RN.View), useScreen: () => ({ root: {}, content: {} }) };
});
jest.mock('@/data/moderation', () => ({
  REPORT_REASONS: [{ value: 'spam', label: 'Spam' }],
}));
jest.mock('@/lib/supabase', () => {
  const tables: Record<string, unknown[]> = {
    community_reports: [
      { id: 'r1', reporter_id: 'u1', post_id: 'p1', reason: 'spam', status: 'open', created_at: '2026-06-30T10:00:00Z' },
    ],
    community_posts: [{ id: 'p1', content: 'contenido reportado por la comunidad', user_id: 'u2' }],
    user_profiles: [
      { user_id: 'u1', full_name: 'Ana' },
      { user_id: 'u2', full_name: 'Beto' },
    ],
  };
  const makeChain = (table: string) => {
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order', 'limit', 'in', 'update', 'delete']) c[m] = () => c;
    c.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: tables[table] ?? [], error: null }).then(resolve);
    return c;
  };
  return { supabase: { from: (t: string) => makeChain(t) } };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AdminComunidadScreen = require('@/app/admin/comunidad/index').default;

describe('AdminComunidadScreen (admin) — render smoke', () => {
  it('cola de reportes con tarjeta poblada renderiza sin throw', async () => {
    render(<AdminComunidadScreen />);
    // El meta "Reportado por Ana" solo aparece con el reporte cargado y nombres resueltos.
    await waitFor(() => expect(screen.getByText('Reportado por Ana')).toBeTruthy());
  });
});
