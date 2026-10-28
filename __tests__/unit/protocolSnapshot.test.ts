import { protocolSnapshot } from '@/lib/protocolSnapshot';
import { calcSovereignScore } from '@/lib/utils';

const NOW = new Date('2026-10-27T15:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const ci = (n: number, v = 7) => ({ date: daysAgo(n), energy: v, clarity: v, stress: 3, sleep: v });
const base = { completedLessons: 0, completedTasks: 0, now: NOW };

describe('protocolSnapshot — una sola fuente para día, racha, score y línea base', () => {
  it('sin lecturas: score null, línea base null, racha 0 — nada lleno inventado', () => {
    const s = protocolSnapshot({ ...base, protocolStartDate: daysAgo(30), checkIns: [] });
    expect(s.protocolDay).toBe(31);
    expect(s.score).toBeNull();
    expect(s.tier).toBeNull();
    expect(s.baselineDay).toBeNull();
    expect(s.streak).toBe(0);
    expect(s.daysSinceLastReading).toBeNull();
    expect(s.streakLabel).toBe('empieza con tu primera lectura');
  });

  it('clampa el día a 1..90 y tolera fechas inválidas', () => {
    expect(protocolSnapshot({ ...base, protocolStartDate: daysAgo(200), checkIns: [] }).protocolDay).toBe(90);
    expect(protocolSnapshot({ ...base, protocolStartDate: 'basura', checkIns: [] }).protocolDay).toBe(1);
  });

  it('el score usa promedios redondeados (los de useLifeFlow): Comando y Perfil dan el mismo número', () => {
    const checkIns = [
      { date: daysAgo(0), energy: 7, clarity: 6, stress: 4, sleep: 8 },
      { date: daysAgo(1), energy: 8, clarity: 7, stress: 5, sleep: 6 },
    ];
    const s = protocolSnapshot({ ...base, protocolStartDate: daysAgo(5), checkIns, completedLessons: 3 });
    const esperado = calcSovereignScore({
      energy: Math.round(7.5), clarity: Math.round(6.5), stress: Math.round(4.5), sleep: Math.round(7),
      streak: 2, completedLessons: 3, completedTasks: 0,
    });
    expect(s.score).toBe(esperado);
  });

  it('la línea base no dice «día 7 de 7» cuando la ventana pasó sin completarse', () => {
    // Dos lecturas hace 40 días: la primera semana nunca juntó 3.
    const s = protocolSnapshot({ ...base, protocolStartDate: daysAgo(40), checkIns: [ci(40), ci(39)] });
    expect(s.baselineDay).toBeNull();
  });

  it('dentro de la ventana, el día de línea base es real', () => {
    const s = protocolSnapshot({ ...base, protocolStartDate: daysAgo(3), checkIns: [ci(2)] });
    expect(s.baselineDay).toBe(3);
  });

  it('primera semana floja: la línea base vuelve a abrirse con lecturas nuevas y se completa', () => {
    // Dos lecturas hace 30 días (nunca juntaron 3) + una hace 2 días → ventana abierta, día 3.
    const abierta = protocolSnapshot({ ...base, protocolStartDate: daysAgo(30), checkIns: [ci(2), ci(29), ci(30)] });
    expect(abierta.baselineDay).toBe(3);
    // Con 3 lecturas en esta semana la línea base queda formada.
    const lista = protocolSnapshot({ ...base, protocolStartDate: daysAgo(30), checkIns: [ci(0), ci(1), ci(2), ci(29), ci(30)] });
    expect(lista.baselineDay).toBe(7);
  });

  it('57 días sin lectura: inactivo, racha 0, sin elogio posible', () => {
    const s = protocolSnapshot({ ...base, protocolStartDate: daysAgo(89), checkIns: [ci(57), ci(58)] });
    expect(s.protocolDay).toBe(90);
    expect(s.daysSinceLastReading).toBe(57);
    expect(s.recentlyActive).toBe(false);
    expect(s.streak).toBe(0);
    expect(s.streakLabel).toBe('se retoma con una lectura');
  });

  it('lectura hoy: racha y etiqueta coinciden', () => {
    const s = protocolSnapshot({ ...base, protocolStartDate: daysAgo(10), checkIns: [ci(0), ci(1), ci(2)] });
    expect(s.readingToday).toBe(true);
    expect(s.streak).toBe(3);
    expect(s.streakLabel).toBe('3 días seguidos');
    expect(s.recentlyActive).toBe(true);
  });

  it('leyó ayer: la racha sigue si lee hoy', () => {
    const s = protocolSnapshot({ ...base, protocolStartDate: daysAgo(10), checkIns: [ci(1)] });
    expect(s.streakLabel).toBe('sigue si lees hoy');
  });
});
