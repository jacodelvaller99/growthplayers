// ─── lib/utils.ts — helpers puros del protocolo y Sovereign Score ─────────────

import {
  diffDays,
  calcProtocolDay,
  calcSovereignScore,
  calcSovereignTier,
  calcSovereignBaseline,
  calcSovereignDelta,
  type SovereignCheckIn,
} from '@/lib/utils';

const DAY_MS = 86_400_000;

describe('diffDays / calcProtocolDay', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-12T12:00:00'));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('cuenta 1-based: el mismo día es día 1', () => {
    expect(diffDays(new Date(Date.now() - 1000).toISOString())).toBe(1);
  });

  it('suma días completos transcurridos', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * DAY_MS).toISOString();
    expect(diffDays(tenDaysAgo)).toBe(11);
  });

  it('nunca devuelve menos de 1 (fechas futuras)', () => {
    const tomorrow = new Date(Date.now() + DAY_MS).toISOString();
    expect(diffDays(tomorrow)).toBe(1);
  });

  it('calcProtocolDay aplica el tope duro de 90', () => {
    const longAgo = new Date(Date.now() - 200 * DAY_MS).toISOString();
    expect(calcProtocolDay(longAgo)).toBe(90);
  });

  it('calcProtocolDay bajo el tope coincide con diffDays', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * DAY_MS).toISOString();
    expect(calcProtocolDay(fiveDaysAgo)).toBe(6);
  });
});

describe('calcSovereignScore', () => {
  const base = {
    energy: 0, clarity: 0, stress: 0, sleep: 0,
    streak: 0, completedLessons: 0, completedTasks: 0,
  };

  it('estado neutro: solo aporta el componente (10-stress)', () => {
    // (0+0+10+0)/4 × 20 = 50
    expect(calcSovereignScore(base)).toBe(50);
  });

  it('caps por componente: lecciones 400 · tareas 200 · check-in 200', () => {
    expect(calcSovereignScore({ ...base, completedLessons: 27 })).toBe(50 + 400); // 27×15=405 → 400
    expect(calcSovereignScore({ ...base, completedTasks: 9 })).toBe(50 + 200);    // 9×25=225 → 200
    expect(calcSovereignScore({ ...base, energy: 10, clarity: 10, sleep: 10 })).toBe(200);
  });

  it('bonus de racha: 0 (<7) · 50 (7-29) · 150 (≥30)', () => {
    expect(calcSovereignScore({ ...base, streak: 6 })).toBe(50);
    expect(calcSovereignScore({ ...base, streak: 7 })).toBe(100);
    expect(calcSovereignScore({ ...base, streak: 29 })).toBe(100);
    expect(calcSovereignScore({ ...base, streak: 30 })).toBe(200);
  });

  it('bonus de wellness con tope 100', () => {
    expect(calcSovereignScore({ ...base, wellnessMeditation: 4 })).toBe(70);   // 4×5=20
    expect(calcSovereignScore({ ...base, wellnessMeditation: 50 })).toBe(150); // 250 → cap 100
  });

  it('resultado total con tope 1000', () => {
    const perfect = calcSovereignScore({
      energy: 10, clarity: 10, stress: 0, sleep: 10,
      streak: 30, completedLessons: 100, completedTasks: 100,
      wellnessMeditation: 100,
    });
    expect(perfect).toBe(1000);
  });
});

describe('calcSovereignTier', () => {
  it.each([
    [800, 'ELITE'],
    [799, 'AVANZADO'],
    [600, 'AVANZADO'],
    [599, 'EN ASCENSO'],
    [400, 'EN ASCENSO'],
    [399, 'INICIANDO'],
    [0, 'INICIANDO'],
  ] as const)('score %i → %s', (score, tier) => {
    expect(calcSovereignTier(score)).toBe(tier);
  });
});

// ─── Sovereign delta-driven (línea base + progreso) ───────────────────────────

const D = 86_400_000;
/** Fecha ISO a `n` días del epoch + 'YYYY-...' estable (mediodía UTC para evitar bordes). */
const dayIso = (n: number) => new Date(n * D + 12 * 3_600_000).toISOString();
/** Helper para construir un check-in. */
const ci = (
  day: number,
  energy: number,
  clarity: number,
  stress: number,
  sleep: number,
): SovereignCheckIn => ({ date: dayIso(day), energy, clarity, stress, sleep });

describe('calcSovereignBaseline', () => {
  it('<3 check-ins → ready:false', () => {
    const base = calcSovereignBaseline([ci(0, 5, 5, 5, 5), ci(1, 6, 6, 4, 6)]);
    expect(base.ready).toBe(false);
  });

  it('array vacío → ready:false (sin crash)', () => {
    expect(calcSovereignBaseline([]).ready).toBe(false);
  });

  it('<3 check-ins DENTRO de los primeros 7 días → ready:false aunque haya más después', () => {
    // 2 en la ventana [0,7) + 2 fuera (día 8,9). La ventana solo cuenta los primeros 7 días.
    const base = calcSovereignBaseline([
      ci(0, 5, 5, 5, 5),
      ci(2, 5, 5, 5, 5),
      ci(8, 9, 9, 1, 9),
      ci(9, 9, 9, 1, 9),
    ]);
    expect(base.ready).toBe(false);
  });

  it('baseline correcto promediando los primeros 7 días calendario', () => {
    // 3 check-ins en [0,7): energy 4/6/8 → 6; clarity 6; stress 4/4/4 → coherence 6; sleep 5/6/7 → 6.
    // El check-in del día 10 queda FUERA de la ventana → no afecta.
    const base = calcSovereignBaseline([
      ci(0, 4, 5, 4, 5),
      ci(3, 6, 6, 4, 6),
      ci(6, 8, 7, 4, 7),
      ci(10, 1, 1, 9, 1),
    ]);
    expect(base.ready).toBe(true);
    expect(base.energy).toBeCloseTo(6);
    expect(base.clarity).toBeCloseTo(6);
    expect(base.coherence).toBeCloseTo(6); // 10 - 4
    expect(base.sleep).toBeCloseTo(6);
  });
});

describe('calcSovereignDelta', () => {
  it('sin línea base lista (días 1-7, <3 check-ins) → hasBaseline:false + label de construcción', () => {
    const delta = calcSovereignDelta([ci(0, 5, 5, 5, 5), ci(1, 6, 6, 4, 6)]);
    expect(delta.hasBaseline).toBe(false);
    expect(delta.state).toBe('stable');
    expect(delta.deltaPct).toBe(0);
    expect(delta.label.toLowerCase()).toContain('línea base');
  });

  it('array vacío → hasBaseline:false (sin crash)', () => {
    expect(calcSovereignDelta([]).hasBaseline).toBe(false);
  });

  it('delta positivo cuando el cliente mejora vs su línea base', () => {
    const checkIns = [
      // Baseline: primeros 7 días, compuesto bajo.
      ci(0, 4, 4, 6, 4),
      ci(2, 4, 4, 6, 4),
      ci(5, 4, 4, 6, 4),
      // Últimos 7 días (día 20-26): mejor en todo.
      ci(20, 8, 8, 2, 8),
      ci(23, 8, 8, 2, 8),
      ci(26, 8, 8, 2, 8),
    ];
    const delta = calcSovereignDelta(checkIns);
    expect(delta.hasBaseline).toBe(true);
    expect(delta.state).toBe('gaining');
    expect(delta.deltaPct).toBeGreaterThan(0);
    expect(delta.subDeltas.energy).toBeCloseTo(4); // 8 - 4
    expect(delta.subDeltas.coherence).toBeCloseTo(4); // (10-2) - (10-6)
    expect(delta.label.toLowerCase()).toContain('ascenso');
  });

  it('delta declinante cuando el cliente empeora vs su línea base', () => {
    const checkIns = [
      ci(0, 8, 8, 2, 8),
      ci(2, 8, 8, 2, 8),
      ci(5, 8, 8, 2, 8),
      ci(20, 4, 4, 6, 4),
      ci(23, 4, 4, 6, 4),
      ci(26, 4, 4, 6, 4),
    ];
    const delta = calcSovereignDelta(checkIns);
    expect(delta.hasBaseline).toBe(true);
    expect(delta.state).toBe('declining');
    expect(delta.deltaPct).toBeLessThan(0);
    expect(delta.label.toLowerCase()).toContain('descenso');
  });

  it('estable cuando el cambio es pequeño (<5%)', () => {
    const checkIns = [
      ci(0, 6, 6, 4, 6),
      ci(2, 6, 6, 4, 6),
      ci(5, 6, 6, 4, 6),
      ci(20, 6, 6, 4, 6),
      ci(23, 6, 6, 4, 6),
      ci(26, 6, 6, 4, 6),
    ];
    const delta = calcSovereignDelta(checkIns);
    expect(delta.hasBaseline).toBe(true);
    expect(delta.state).toBe('stable');
    expect(delta.deltaPct).toBeCloseTo(0);
  });
});
