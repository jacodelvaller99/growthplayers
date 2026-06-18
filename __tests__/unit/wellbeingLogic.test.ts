import {
  toReadings,
  wellbeingAlarm,
  wellbeingScore,
  wellbeingState,
  wellbeingTrend,
  type WellbeingCheckIn,
} from '@/lib/wellbeingLogic';

const ci = (date: string, energy?: number, clarity?: number, stress?: number, sleep?: number): WellbeingCheckIn =>
  ({ date, energy, clarity, stress, sleep });

describe('wellbeingScore', () => {
  it('promedia dimensiones invirtiendo estrés', () => {
    // energy 8, clarity 8, stress 2 → 8, sleep 8 → mean 8/10 = 80
    expect(wellbeingScore(ci('2026-01-01', 8, 8, 2, 8))).toBe(80);
  });

  it('estrés alto baja el score', () => {
    // energy 8, clarity 8, stress 9 → 1, sleep 8 → mean (8+8+1+8)/4 = 6.25 → 63
    expect(wellbeingScore(ci('2026-01-01', 8, 8, 9, 8))).toBe(63);
  });

  it('ignora campos faltantes (no penaliza)', () => {
    // solo energy 6 → 60
    expect(wellbeingScore(ci('2026-01-01', 6))).toBe(60);
  });

  it('null si no hay ninguna métrica', () => {
    expect(wellbeingScore(ci('2026-01-01'))).toBeNull();
  });

  it('clampa a 0-100', () => {
    expect(wellbeingScore(ci('2026-01-01', 10, 10, 0, 10))).toBe(100);
    expect(wellbeingScore(ci('2026-01-01', 0, 0, 10, 0))).toBe(0);
  });
});

describe('wellbeingState', () => {
  it('mapea umbrales', () => {
    expect(wellbeingState(20)).toBe('critical');
    expect(wellbeingState(45)).toBe('low');
    expect(wellbeingState(65)).toBe('fair');
    expect(wellbeingState(85)).toBe('good');
    expect(wellbeingState(null)).toBeNull();
  });
});

describe('toReadings', () => {
  it('ordena por fecha ascendente y calcula score+state', () => {
    const r = toReadings([
      ci('2026-01-03', 8, 8, 2, 8),
      ci('2026-01-01', 3, 3, 8, 3),
    ]);
    expect(r.map((x) => x.date)).toEqual(['2026-01-01', '2026-01-03']);
    expect(r[0].state).toBe('critical'); // 3,3,(10-8)=2,3 → mean 2.75 → 28
    expect(r[1].state).toBe('good');
  });
});

describe('wellbeingTrend', () => {
  it('unknown con pocos datos', () => {
    expect(wellbeingTrend(toReadings([ci('2026-01-01', 5, 5, 5, 5)]))).toBe('unknown');
  });

  it('declining cuando cae', () => {
    const series = [
      ci('2026-01-01', 9, 9, 1, 9),
      ci('2026-01-02', 8, 8, 2, 8),
      ci('2026-01-03', 4, 4, 7, 4),
      ci('2026-01-04', 3, 3, 8, 3),
    ];
    expect(wellbeingTrend(toReadings(series))).toBe('declining');
  });

  it('improving cuando sube', () => {
    const series = [
      ci('2026-01-01', 3, 3, 8, 3),
      ci('2026-01-02', 4, 4, 7, 4),
      ci('2026-01-03', 8, 8, 2, 8),
      ci('2026-01-04', 9, 9, 1, 9),
    ];
    expect(wellbeingTrend(toReadings(series))).toBe('improving');
  });
});

describe('wellbeingAlarm', () => {
  it('sin datos → none', () => {
    const a = wellbeingAlarm([ci('2026-01-01')]);
    expect(a.level).toBe('none');
    expect(a.current).toBeNull();
  });

  it('2 críticos seguidos → critical con razón citable', () => {
    const a = wellbeingAlarm([
      ci('2026-01-01', 8, 8, 2, 8),
      ci('2026-01-02', 2, 2, 9, 2),
      ci('2026-01-03', 2, 2, 9, 2),
    ]);
    expect(a.level).toBe('critical');
    expect(a.reason).toContain('críticos seguidos');
  });

  it('promedio bajo sostenido → high', () => {
    const a = wellbeingAlarm([
      ci('2026-01-01', 4, 4, 6, 4),
      ci('2026-01-02', 5, 4, 6, 4),
      ci('2026-01-03', 4, 5, 6, 4),
    ]);
    expect(a.level).toBe('high');
    expect(a.current).toBeLessThan(50);
  });

  it('caída fuerte → high con puntos', () => {
    const a = wellbeingAlarm([
      ci('2026-01-01', 9, 9, 1, 9), // ~93
      ci('2026-01-02', 8, 8, 2, 8), // 80
      ci('2026-01-03', 7, 7, 3, 7), // 70
      ci('2026-01-04', 6, 6, 5, 6), // ~58
      ci('2026-01-05', 6, 5, 6, 5), // ~50
    ]);
    expect(['high', 'watch']).toContain(a.level);
    expect(a.reason).toMatch(/Caída|bajo|Observar/);
  });

  it('todo bien → none', () => {
    const a = wellbeingAlarm([
      ci('2026-01-01', 8, 8, 2, 8),
      ci('2026-01-02', 9, 8, 2, 8),
      ci('2026-01-03', 8, 9, 1, 9),
    ]);
    expect(a.level).toBe('none');
    expect(a.current).toBeGreaterThanOrEqual(72);
  });
});
