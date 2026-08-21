// ─── data/mentorship.ts — journey semanal con fechas reales ───────────────────

import {
  weekDateRange,
  currentWeekNumber,
  weekStatus,
  formatWeekRange,
  effectiveWeekNumber,
  effectiveWeekStatus,
  effectiveWeekDateRange,
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

describe('effectiveWeekNumber — si no se termina, se corre', () => {
  it('con todas las semanas al día, coincide con el calendario', () => {
    // día 15 → calendario semana 3; 1 y 2 completadas
    expect(effectiveWeekNumber(15, new Set([1, 2]))).toBe(3);
  });

  it('semana atrasada sin sesión detiene la ruta ahí, aunque el calendario siga', () => {
    // día 22 → calendario semana 4, pero la 2 nunca tuvo sesión
    expect(effectiveWeekNumber(22, new Set([1]))).toBe(2);
  });

  it('sin ninguna sesión, la ruta nunca avanza de la semana 1', () => {
    expect(effectiveWeekNumber(50, new Set())).toBe(1);
  });

  it('clampa a TOTAL_WEEKS', () => {
    const allDone = new Set(Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1));
    expect(effectiveWeekNumber(10_000, allDone)).toBe(TOTAL_WEEKS);
  });
});

describe('effectiveWeekStatus', () => {
  it('completada exige sesión registrada, no solo calendario pasado', () => {
    // día 22 → calendario semana 4; semana 2 nunca tuvo sesión
    expect(effectiveWeekStatus(1, 22, new Set([1]))).toBe('completada');
    expect(effectiveWeekStatus(2, 22, new Set([1]))).toBe('actual');   // no completada aún
    expect(effectiveWeekStatus(3, 22, new Set([1]))).toBe('proxima');  // calendario dice "pasada" pero no lo es
  });
});

describe('effectiveWeekDateRange — el resto de la ruta se corre', () => {
  it('sin atrasos, coincide con weekDateRange normal', () => {
    const eff = effectiveWeekDateRange(3, '2026-01-05T00:00:00', 15, new Set([1, 2]));
    const base = weekDateRange(3, '2026-01-05T00:00:00');
    expect(eff.start.getTime()).toBe(base.start.getTime());
  });

  it('una semana atrasada corre TODAS las siguientes un bloque de 7 días', () => {
    // semana 1 nunca tuvo sesión; hoy es día 15 (calendario semana 3)
    const eff = effectiveWeekDateRange(2, '2026-01-05T00:00:00', 15, new Set());
    const shifted = weekDateRange(3, '2026-01-05T00:00:00'); // 2 + 1 atraso = 3
    expect(eff.start.getTime()).toBe(shifted.start.getTime());
  });

  it('dos semanas atrasadas corren dos bloques', () => {
    const eff = effectiveWeekDateRange(3, '2026-01-05T00:00:00', 22, new Set());
    const shifted = weekDateRange(5, '2026-01-05T00:00:00'); // 3 + 2 atrasos = 5
    expect(eff.start.getTime()).toBe(shifted.start.getTime());
  });
});
