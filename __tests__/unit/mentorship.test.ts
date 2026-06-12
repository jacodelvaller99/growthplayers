// ─── data/mentorship.ts — journey semanal con fechas reales ───────────────────

import {
  weekDateRange,
  currentWeekNumber,
  weekStatus,
  formatWeekRange,
  TOTAL_WEEKS,
} from '@/data/mentorship';

const DAY_MS = 86_400_000;

describe('weekDateRange', () => {
  it('semana 1 arranca el día de inicio (medianoche local) y dura 7 días inclusive', () => {
    const { start, end } = weekDateRange(1, '2026-01-05T00:00:00');
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(5);
    expect(start.getHours()).toBe(0);
    expect(end.getTime() - start.getTime()).toBe(6 * DAY_MS);
  });

  it('normaliza horas: un inicio a las 23:45 no arrastra el día', () => {
    const { start } = weekDateRange(1, '2026-01-05T23:45:00');
    expect(start.getDate()).toBe(5);
    expect(start.getHours()).toBe(0);
  });

  it('la semana N empieza (N-1)×7 días después', () => {
    const w1 = weekDateRange(1, '2026-01-05T00:00:00');
    const w3 = weekDateRange(3, '2026-01-05T00:00:00');
    expect(w3.start.getTime() - w1.start.getTime()).toBe(14 * DAY_MS);
  });

  it('clamp: week < 1 se trata como semana 1', () => {
    const w0 = weekDateRange(0, '2026-01-05T00:00:00');
    const w1 = weekDateRange(1, '2026-01-05T00:00:00');
    expect(w0.start.getTime()).toBe(w1.start.getTime());
  });

  it('acepta Date además de ISO string', () => {
    const { start } = weekDateRange(1, new Date(2026, 0, 5, 12, 0));
    expect(start.getDate()).toBe(5);
    expect(start.getHours()).toBe(0);
  });
});

describe('currentWeekNumber', () => {
  it('días 1-7 → semana 1; día 8 → semana 2', () => {
    expect(currentWeekNumber(1)).toBe(1);
    expect(currentWeekNumber(7)).toBe(1);
    expect(currentWeekNumber(8)).toBe(2);
  });

  it('clamps a [1, TOTAL_WEEKS]', () => {
    expect(currentWeekNumber(0)).toBe(1);
    expect(currentWeekNumber(-5)).toBe(1);
    expect(currentWeekNumber(10_000)).toBe(TOTAL_WEEKS);
  });
});

describe('weekStatus', () => {
  it('marca completada / actual / proxima respecto al día de protocolo', () => {
    // día 15 → semana 3
    expect(weekStatus(2, 15)).toBe('completada');
    expect(weekStatus(3, 15)).toBe('actual');
    expect(weekStatus(4, 15)).toBe('proxima');
  });
});

describe('formatWeekRange', () => {
  it('devuelve un rango legible no vacío con separador', () => {
    const text = formatWeekRange(weekDateRange(1, '2026-01-05T00:00:00'));
    expect(text).toContain('–');
    expect(text.length).toBeGreaterThan(5);
  });
});
