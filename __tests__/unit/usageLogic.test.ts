import { buildUsage, screenLabel } from '@/lib/admin/usageLogic';

const ev = (min: number, event_type: string, screen: string | null, metadata: Record<string, unknown> = {}, session_id = 's1') => ({
  event_type, screen, metadata, session_id,
  created_at: new Date(Date.UTC(2026, 10, 5, 12, min)).toISOString(),
});

test('nombres legibles de pantalla', () => {
  expect(screenLabel('/comando')).toBe('Hoy');
  expect(screenLabel('/bienestar/meditacion')).toBe('Bienestar · meditacion');
  expect(screenLabel('/lesson/m1-5')).toBe('Lección');
});

test('sesiones, tiempo por pantalla y toques', () => {
  const u = buildUsage([
    ev(0, 'app_open', null),
    ev(0, 'screen_view', '/comando'),
    ev(1, 'button_tap', '/comando', { label: 'Hacer check-in' }),
    ev(2, 'screen_leave', '/comando', { dwell_ms: 120_000 }),
    ev(2, 'screen_view', '/checkin'),
    ev(5, 'screen_leave', '/checkin', { dwell_ms: 180_000 }),
    ev(60, 'screen_view', '/mentor', {}, 's2'),
    ev(61, 'button_tap', '/mentor', { label: 'Enviar mensaje' }, 's2'),
  ], new Date(Date.UTC(2026, 10, 5, 14)));
  expect(u.sessions).toHaveLength(2);
  expect(u.sessions[0]!.id).toBe('s2'); // la más reciente primero
  expect(u.sessions[1]!.durationMs).toBe(5 * 60_000);
  expect(u.sessions[1]!.taps).toBe(1);
  expect(u.sessions[1]!.steps.map((s) => s.label)).toEqual(['Hoy', 'Hacer check-in', 'Check-in']);
  expect(u.taps7d).toBe(2);
  expect(u.sessions7d).toBe(2);
  expect(u.topScreens[0]).toEqual({ label: 'Check-in', minutes: 3, visits: 1 });
  expect(u.lastSeen).toBe(new Date(Date.UTC(2026, 10, 5, 13, 1)).toISOString());
});
