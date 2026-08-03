/**
 * heroJourneyLogic — tests de la lógica pura del Motor de Momentos (Fase 2).
 */
import {
  defaultHeroMomentState,
  markMomentShown,
  selectMoment,
  type HeroMomentState,
} from '@/lib/heroJourneyLogic';

describe('selectMoment', () => {
  it('ya se mostró un momento hoy → null', () => {
    const state: HeroMomentState = { lastShownDate: '2026-08-03', lastEchoedSummaryId: null };
    const moment = selectMoment({ today: '2026-08-03', name: 'Ana', latestSummary: null, state });
    expect(moment).toBeNull();
  });

  it('hay un resumen nuevo (nunca ecoado) → ai_echo con la primera frase citada', () => {
    const moment = selectMoment({
      today: '2026-08-03',
      name: 'Ana',
      latestSummary: { id: 's1', summary: 'Quiero delegar finanzas. Me da miedo soltar control.' },
      state: defaultHeroMomentState,
    });
    expect(moment?.kind).toBe('ai_echo');
    expect(moment?.message).toContain('Bienvenido de nuevo, Ana.');
    expect(moment?.message).toContain('"Quiero delegar finanzas."');
    if (moment?.kind === 'ai_echo') expect(moment.summaryId).toBe('s1');
  });

  it('sin resumen → gratitud', () => {
    const moment = selectMoment({
      today: '2026-08-03', name: 'Ana', latestSummary: null, state: defaultHeroMomentState,
    });
    expect(moment?.kind).toBe('gratitude');
    expect(moment?.message).toContain('gracias por volver a aparecer hoy');
  });

  it('el resumen ya fue ecoado antes → gratitud, no repite el mismo eco', () => {
    const state: HeroMomentState = { lastShownDate: '2026-08-01', lastEchoedSummaryId: 's1' };
    const moment = selectMoment({
      today: '2026-08-03',
      name: 'Ana',
      latestSummary: { id: 's1', summary: 'Ya ecoado antes.' },
      state,
    });
    expect(moment?.kind).toBe('gratitude');
  });

  it('resumen vacío/solo-espacios → gratitud, no revienta con comillas vacías', () => {
    const moment = selectMoment({
      today: '2026-08-03', name: 'Ana', latestSummary: { id: 's2', summary: '   ' }, state: defaultHeroMomentState,
    });
    expect(moment?.kind).toBe('gratitude');
  });

  it('sin nombre → saludo sin coma colgando', () => {
    const moment = selectMoment({
      today: '2026-08-03', name: '   ', latestSummary: null, state: defaultHeroMomentState,
    });
    expect(moment?.message.startsWith('Bienvenido de nuevo.')).toBe(true);
  });
});

describe('markMomentShown', () => {
  it('ai_echo: guarda la fecha Y el id ecoado', () => {
    const next = markMomentShown(defaultHeroMomentState, '2026-08-03', {
      kind: 'ai_echo', summaryId: 's1', message: 'x',
    });
    expect(next).toEqual({ lastShownDate: '2026-08-03', lastEchoedSummaryId: 's1' });
  });

  it('gratitude: guarda la fecha, conserva el último id ecoado sin tocarlo', () => {
    const prior: HeroMomentState = { lastShownDate: '2026-08-01', lastEchoedSummaryId: 's1' };
    const next = markMomentShown(prior, '2026-08-03', { kind: 'gratitude', message: 'x' });
    expect(next).toEqual({ lastShownDate: '2026-08-03', lastEchoedSummaryId: 's1' });
  });
});
