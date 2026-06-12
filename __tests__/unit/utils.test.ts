// ─── lib/utils.ts — helpers puros del protocolo y Sovereign Score ─────────────

import {
  diffDays,
  calcProtocolDay,
  calcSovereignScore,
  calcSovereignTier,
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
