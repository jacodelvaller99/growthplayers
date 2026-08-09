/**
 * ritualLogic — el umbral diario (primera apertura del día).
 */
import { needsRitual, withRitualDone } from '@/lib/ritualLogic';

const HOY = '2026-08-08';

describe('needsRitual', () => {
  it('sin log previo: hace falta el ritual', () => {
    expect(needsRitual(HOY, null)).toBe(true);
  });

  it('log de otro día: hace falta de nuevo (reset por fecha)', () => {
    expect(needsRitual(HOY, { date: '2026-08-07', mode: 'guiado' })).toBe(true);
  });

  it('log de hoy: ya no hace falta', () => {
    expect(needsRitual(HOY, { date: HOY, mode: 'libre' })).toBe(false);
  });
});

describe('withRitualDone', () => {
  it('produce el log del día con el modo elegido', () => {
    expect(withRitualDone(HOY, 'guiado')).toEqual({ date: HOY, mode: 'guiado' });
  });
});
