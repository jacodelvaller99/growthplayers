// ─── lib/mentorDeskLogic.ts — Espacio del Mentor: semana activa + autosave ─────

import { deskClientId, deskWeek, splitWeekSessions } from '@/lib/mentorDeskLogic';
import { TOTAL_WEEKS } from '@/data/mentorship';

describe('deskClientId', () => {
  it('formato estable', () => {
    expect(deskClientId(3)).toBe('desk:w3');
  });
  it('semanas distintas → ids distintos', () => {
    expect(deskClientId(1)).not.toBe(deskClientId(2));
  });
  it('trunca decimales y evita cero/negativos', () => {
    expect(deskClientId(2.9)).toBe('desk:w2');
    expect(deskClientId(0)).toBe('desk:w1');
    expect(deskClientId(-5)).toBe('desk:w1');
  });
});

describe('deskWeek', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-12T12:00:00'));
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  it('día 1-7 de protocolo → semana 1', () => {
    const start = new Date(Date.now() - 3 * 86_400_000).toISOString();
    expect(deskWeek(start, [])).toBe(1);
  });

  it('día 8 de protocolo → semana 2', () => {
    const start = new Date(Date.now() - 7 * 86_400_000).toISOString();
    expect(deskWeek(start, [])).toBe(2);
  });

  it('clamp a TOTAL_WEEKS aunque el protocolo lleve mucho más', () => {
    const start = new Date(Date.now() - 200 * 86_400_000).toISOString();
    expect(deskWeek(start, [])).toBe(TOTAL_WEEKS);
  });

  it('sin fecha de inicio → cae a la semana más alta con sesión', () => {
    expect(deskWeek(null, [{ week: 2 }, { week: 5 }, { week: 1 }])).toBe(5);
  });

  it('fecha inválida → cae al fallback de sesiones igual que sin fecha', () => {
    expect(deskWeek('no-es-una-fecha', [{ week: 3 }])).toBe(3);
  });

  it('sin fecha y sin sesiones → 1', () => {
    expect(deskWeek(undefined, [])).toBe(1);
  });
});

describe('splitWeekSessions', () => {
  it('encuentra el draft por client_id y separa el resto de la semana como previous', () => {
    const sessions = [
      { id: 'a', week: 3, client_id: 'desk:w3' },
      { id: 'b', week: 3, client_id: null },
      { id: 'c', week: 2, client_id: null },
    ];
    const { draft, previous } = splitWeekSessions(sessions, 3);
    expect(draft?.id).toBe('a');
    expect(previous.map((s) => s.id)).toEqual(['b']);
  });

  it('sin draft para la semana → null, previous vacío si no hay legacy', () => {
    const sessions = [{ id: 'a', week: 4, client_id: null }];
    const { draft, previous } = splitWeekSessions(sessions, 3);
    expect(draft).toBeNull();
    expect(previous).toEqual([]);
  });
});
