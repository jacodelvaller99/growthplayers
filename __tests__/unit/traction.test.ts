import { buildTraction } from '@/lib/admin/traction';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const now = new Date(2026, 10, 5, 15, 0, 0); // 5 nov 2026
const at = (daysAgo: number) => { const d = new Date(now); d.setDate(d.getDate() - daysAgo); return d.toISOString(); };
const day = (daysAgo: number) => at(daysAgo).slice(0, 10);

test('activos, pegajosidad y activación', () => {
  const t = buildTraction({
    now,
    totalUsers: 4,
    signups: [{ user_id: 'a', at: at(3) }, { user_id: 'b', at: at(2) }, { user_id: 'z', at: at(90) }],
    checkins: [{ user_id: 'a', at: day(0) }, { user_id: 'a', at: day(1) }, { user_id: 'c', at: day(10) }],
    normanMsgs: [{ user_id: 'b', at: at(0) }, { user_id: 'd', at: at(40) }],
    lessons: [{ user_id: 'c', at: at(5) }],
    practices: [],
    tiers: ['free', 'premium', 'polaris', ''],
  });
  expect(t.dau).toBe(2);          // a (check-in) + b (Norman) hoy
  expect(t.wau).toBe(3);          // a, b, c (lección hace 5 días)
  expect(t.mau).toBe(3);          // d quedó fuera de los 30 días
  expect(t.stickiness).toBe(67);
  expect(t.signups30).toBe(2);
  expect(t.activation).toBe(50);  // a hizo check-in, b no
  expect(t.checkins30).toBe(3);
  expect(t.normanMsgs30).toBe(1);
  expect(t.daily).toHaveLength(30);
  expect(t.daily[29]!.active).toBe(2);
  expect(t.paying).toBe(2);
});

test('sin datos no inventa porcentajes', () => {
  const t = buildTraction({ now, totalUsers: 0, signups: [], checkins: [], normanMsgs: [], lessons: [], practices: [], tiers: [] });
  expect(t.stickiness).toBeNull();
  expect(t.activation).toBeNull();
});
