import { buildTracking } from '@/lib/admin/trackingLogic';

const ck = (date: string, energy = 8, stress = 4) => ({ date, energy, clarity: 6, stress, sleep: 6 });

test('mes con lunes al inicio, KPIs en escala 1–5 y trofeo a los 7 días seguidos', () => {
  const checkins = ['01', '02', '03', '04', '05', '06', '07'].map((d) => ck(`2026-10-${d}`));
  const { days, kpis } = buildTracking({
    year: 2026, month: 9, today: new Date(2026, 9, 10, 12),
    checkins,
    lessons: [{ at: '2026-10-02T15:00:00' }],
    practices: [{ at: '2026-10-03T08:00:00', seconds: 600 }, { at: '2026-10-04T08:00:00', seconds: 1200 }],
    norman: [{ at: '2026-10-05T20:00:00' }, { at: '2026-10-05T20:05:00' }],
    sessions: [],
  });
  // Octubre 2026 empieza en jueves: la grilla arranca el lunes 28 sep.
  expect(days[0]!.key).toBe('2026-09-28');
  expect(days[0]!.inMonth).toBe(false);
  expect(days.length % 7).toBe(0);
  const d = (k: string) => days.find((x) => x.key === k)!;
  expect(d('2026-10-01').energy).toBe(4);
  expect(d('2026-10-02').lessons).toBe(1);
  expect(d('2026-10-05').norman).toBe(2);
  expect(d('2026-10-07').trophy).toBe(true);
  expect(d('2026-10-06').trophy).toBe(false);
  expect(d('2026-10-10').isToday).toBe(true);
  expect(kpis.energy).toBe(4);
  expect(kpis.stress).toBe(2);
  expect(kpis.daysTracked).toBe(7);
  expect(kpis.practiceMin).toBe(15);
  expect(kpis.trackingPct).toBe(70); // 7 de 10 días transcurridos
});

test('mes sin datos no inventa medias', () => {
  const { kpis } = buildTracking({
    year: 2026, month: 10, today: new Date(2026, 9, 10), checkins: [], lessons: [], practices: [], norman: [], sessions: [],
  });
  expect(kpis.energy).toBeNull();
  expect(kpis.trackingPct).toBeNull(); // noviembre aún no empieza
});
