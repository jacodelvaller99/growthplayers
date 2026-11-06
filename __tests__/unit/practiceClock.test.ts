import { clockPause, clockResume, clockSeconds, clockStart, mmss, phaseAt } from '@/lib/practiceClock';

describe('practiceClock', () => {
  it('las pausas no cuentan', () => {
    let c = clockStart(0);
    c = clockPause(c, 10_000);
    expect(clockSeconds(c, 60_000)).toBe(10);
    c = clockResume(c, 60_000);
    expect(clockSeconds(c, 65_000)).toBe(15);
  });

  it('pausar o reanudar dos veces no cambia nada', () => {
    const c = clockPause(clockPause(clockStart(0), 5000), 9000);
    expect(clockSeconds(c, 20_000)).toBe(5);
    const r = clockResume(clockResume(c, 10_000), 12_000);
    expect(clockSeconds(r, 11_000)).toBe(6);
  });

  it('un salto de reloj (pestaña dormida) se recupera entero', () => {
    expect(clockSeconds(clockStart(0), 300_000)).toBe(300);
  });

  it('phaseAt sin loop recorre y termina', () => {
    expect(phaseAt([4, 7, 8], 0)).toMatchObject({ index: 0, left: 4, done: false });
    expect(phaseAt([4, 7, 8], 4.2)).toMatchObject({ index: 1, left: 7 });
    expect(phaseAt([4, 7, 8], 18.5)).toMatchObject({ index: 2, left: 1 });
    expect(phaseAt([4, 7, 8], 19)).toMatchObject({ done: true });
  });

  it('phaseAt con loop cuenta vueltas', () => {
    expect(phaseAt([4, 4], 9, true)).toMatchObject({ index: 0, left: 3, round: 1, done: false });
    expect(phaseAt([4, 4], 16, true)).toMatchObject({ index: 0, round: 2 });
  });

  it('mmss', () => {
    expect(mmss(125)).toBe('02:05');
    expect(mmss(0.2)).toBe('00:01');
    expect(mmss(-3)).toBe('00:00');
  });
});
