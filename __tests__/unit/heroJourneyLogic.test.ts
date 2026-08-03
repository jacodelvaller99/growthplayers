/**
 * heroJourneyLogic — tests de la lógica pura del Motor de Momentos
 * (Fase 2 — eco de Norman / gratitud; Fase 3 — eco de logros viejos).
 */
import {
  defaultHeroMomentState,
  markMomentShown,
  selectMoment,
  type HeroMomentState,
} from '@/lib/heroJourneyLogic';

describe('selectMoment', () => {
  it('ya se mostró un momento hoy → null', () => {
    const state: HeroMomentState = {
      lastShownDate: '2026-08-03', lastEchoedSummaryId: null, echoedWinKeys: [],
    };
    const moment = selectMoment({
      today: '2026-08-03', name: 'Ana', latestSummary: null, recentWins: [], state,
    });
    expect(moment).toBeNull();
  });

  it('hay un resumen nuevo (nunca ecoado) → ai_echo con la primera frase citada, por delante de logros viejos', () => {
    const moment = selectMoment({
      today: '2026-08-03',
      name: 'Ana',
      latestSummary: { id: 's1', summary: 'Quiero delegar finanzas. Me da miedo soltar control.' },
      recentWins: ['Corrió su primer 5k'],
      state: defaultHeroMomentState,
    });
    expect(moment?.kind).toBe('ai_echo');
    expect(moment?.message).toContain('Bienvenido de nuevo, Ana.');
    expect(moment?.message).toContain('"Quiero delegar finanzas."');
    if (moment?.kind === 'ai_echo') expect(moment.summaryId).toBe('s1');
  });

  it('sin resumen nuevo pero con un logro viejo sin ecoar → memory_echo, el más antiguo primero', () => {
    const moment = selectMoment({
      today: '2026-08-03',
      name: 'Ana',
      latestSummary: null,
      recentWins: ['Logro más nuevo', 'Logro más viejo'], // recentWins[0] = el más nuevo
      state: defaultHeroMomentState,
    });
    expect(moment?.kind).toBe('memory_echo');
    if (moment?.kind === 'memory_echo') expect(moment.win).toBe('Logro más viejo');
    expect(moment?.message).toContain('"Logro más viejo"');
  });

  it('todos los logros ya fueron ecoados → gratitud, no repite', () => {
    const state: HeroMomentState = {
      lastShownDate: null, lastEchoedSummaryId: null, echoedWinKeys: ['logro a', 'logro b'],
    };
    const moment = selectMoment({
      today: '2026-08-03', name: 'Ana', latestSummary: null,
      recentWins: ['Logro A', 'Logro B'], // mismo contenido, distinto casing — dedup case-insensitive
      state,
    });
    expect(moment?.kind).toBe('gratitude');
  });

  it('sin resumen ni logros → gratitud', () => {
    const moment = selectMoment({
      today: '2026-08-03', name: 'Ana', latestSummary: null, recentWins: [], state: defaultHeroMomentState,
    });
    expect(moment?.kind).toBe('gratitude');
    expect(moment?.message).toContain('gracias por volver a aparecer hoy');
  });

  it('el resumen ya fue ecoado antes → cae a logros, no repite el mismo eco de IA', () => {
    const state: HeroMomentState = {
      lastShownDate: '2026-08-01', lastEchoedSummaryId: 's1', echoedWinKeys: [],
    };
    const moment = selectMoment({
      today: '2026-08-03',
      name: 'Ana',
      latestSummary: { id: 's1', summary: 'Ya ecoado antes.' },
      recentWins: [],
      state,
    });
    expect(moment?.kind).toBe('gratitude');
  });

  it('resumen vacío/solo-espacios → cae a logros/gratitud, no revienta con comillas vacías', () => {
    const moment = selectMoment({
      today: '2026-08-03', name: 'Ana', latestSummary: { id: 's2', summary: '   ' },
      recentWins: [], state: defaultHeroMomentState,
    });
    expect(moment?.kind).toBe('gratitude');
  });

  it('logro vacío/solo-espacios en la lista → se salta, no se ecoa basura', () => {
    const moment = selectMoment({
      today: '2026-08-03', name: 'Ana', latestSummary: null,
      recentWins: ['   ', 'Logro real'], state: defaultHeroMomentState,
    });
    expect(moment?.kind).toBe('memory_echo');
    if (moment?.kind === 'memory_echo') expect(moment.win).toBe('Logro real');
  });

  it('sin nombre → saludo sin coma colgando', () => {
    const moment = selectMoment({
      today: '2026-08-03', name: '   ', latestSummary: null, recentWins: [], state: defaultHeroMomentState,
    });
    expect(moment?.message.startsWith('Bienvenido de nuevo.')).toBe(true);
  });
});

describe('markMomentShown', () => {
  it('ai_echo: guarda la fecha Y el id ecoado, no toca logros', () => {
    const next = markMomentShown(defaultHeroMomentState, '2026-08-03', {
      kind: 'ai_echo', summaryId: 's1', message: 'x',
    });
    expect(next).toEqual({ lastShownDate: '2026-08-03', lastEchoedSummaryId: 's1', echoedWinKeys: [] });
  });

  it('memory_echo: guarda la fecha Y agrega el logro (en minúsculas) a los ya ecoados', () => {
    const next = markMomentShown(defaultHeroMomentState, '2026-08-03', {
      kind: 'memory_echo', win: 'Corrió su Primer 5k', message: 'x',
    });
    expect(next).toEqual({
      lastShownDate: '2026-08-03', lastEchoedSummaryId: null, echoedWinKeys: ['corrió su primer 5k'],
    });
  });

  it('gratitude: guarda la fecha, conserva eco de IA y logros ecoados sin tocarlos', () => {
    const prior: HeroMomentState = {
      lastShownDate: '2026-08-01', lastEchoedSummaryId: 's1', echoedWinKeys: ['logro viejo'],
    };
    const next = markMomentShown(prior, '2026-08-03', { kind: 'gratitude', message: 'x' });
    expect(next).toEqual({
      lastShownDate: '2026-08-03', lastEchoedSummaryId: 's1', echoedWinKeys: ['logro viejo'],
    });
  });
});
