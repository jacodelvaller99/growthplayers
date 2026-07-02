/**
 * El Círculo — tests de la lógica pura (lib/circleLogic.ts).
 * Estado de conexión par-ordenado, orden de eventos con `now` inyectado, cupo,
 * agregación de RSVP/reacciones, permisos, filtrado de bloqueados y validación.
 */
import {
  canManageEvent,
  canManageSpace,
  connectionPeerId,
  connectionStateFor,
  eventCapacityState,
  filterBlockedAuthors,
  formatEventDate,
  groupReactions,
  isUpcoming,
  rsvpSummary,
  sortUpcomingEvents,
  validateEventInput,
  validateSpaceInput,
  type CircleEvent,
  type Connection,
  type EventInput,
} from '@/lib/circleLogic';

const NOW = new Date('2026-07-02T12:00:00Z');

function makeEvent(over: Partial<CircleEvent> = {}): CircleEvent {
  return {
    id: 'e1', space_id: null, created_by: 'u1',
    title: 'Fuerza 5AM', description: null,
    starts_at: '2026-07-03T11:00:00Z', duration_minutes: 60, timezone: 'America/Bogota',
    location_type: 'virtual', location_text: 'https://zoom.us/j/x',
    capacity: null, status: 'scheduled', going_count: 0,
    created_at: '2026-07-01T00:00:00Z',
    ...over,
  };
}

function makeConn(over: Partial<Connection> = {}): Connection {
  return {
    id: 'c1', requester_id: 'me', addressee_id: 'other',
    status: 'pending', created_at: '2026-07-01T00:00:00Z', responded_at: null,
    ...over,
  };
}

describe('connectionStateFor', () => {
  it('null → none', () => {
    expect(connectionStateFor('me', null)).toBe('none');
    expect(connectionStateFor('me', undefined)).toBe('none');
  });
  it('pending que YO envié → pending_sent', () => {
    expect(connectionStateFor('me', makeConn())).toBe('pending_sent');
  });
  it('pending que me enviaron → pending_received', () => {
    expect(connectionStateFor('other', makeConn())).toBe('pending_received');
  });
  it('accepted → accepted para ambos lados', () => {
    const c = makeConn({ status: 'accepted' });
    expect(connectionStateFor('me', c)).toBe('accepted');
    expect(connectionStateFor('other', c)).toBe('accepted');
  });
  it('connectionPeerId devuelve el otro participante', () => {
    const c = makeConn();
    expect(connectionPeerId('me', c)).toBe('other');
    expect(connectionPeerId('other', c)).toBe('me');
  });
});

describe('eventos — isUpcoming / sortUpcomingEvents', () => {
  it('programado en el futuro es vigente', () => {
    expect(isUpcoming(makeEvent(), NOW)).toBe(true);
  });
  it('en curso (empezó pero no terminó) sigue vigente', () => {
    const e = makeEvent({ starts_at: '2026-07-02T11:30:00Z', duration_minutes: 60 });
    expect(isUpcoming(e, NOW)).toBe(true);
  });
  it('terminado NO es vigente', () => {
    const e = makeEvent({ starts_at: '2026-07-02T10:00:00Z', duration_minutes: 60 });
    expect(isUpcoming(e, NOW)).toBe(false);
  });
  it('cancelado NO es vigente aunque sea futuro', () => {
    expect(isUpcoming(makeEvent({ status: 'cancelled' }), NOW)).toBe(false);
  });
  it('orden: vigentes por cercanía asc, luego pasados por reciente desc', () => {
    const a = makeEvent({ id: 'a', starts_at: '2026-07-05T11:00:00Z' });        // vigente lejano
    const b = makeEvent({ id: 'b', starts_at: '2026-07-03T11:00:00Z' });        // vigente próximo
    const c = makeEvent({ id: 'c', starts_at: '2026-06-20T11:00:00Z' });        // pasado viejo
    const d = makeEvent({ id: 'd', starts_at: '2026-07-01T11:00:00Z' });        // pasado reciente
    expect(sortUpcomingEvents([a, c, b, d], NOW).map((e) => e.id)).toEqual(['b', 'a', 'd', 'c']);
  });
});

describe('eventCapacityState / rsvpSummary', () => {
  it('sin cupo → unlimited', () => {
    expect(eventCapacityState(makeEvent({ capacity: null }))).toBe('unlimited');
  });
  it('con cupo libre → open', () => {
    expect(eventCapacityState(makeEvent({ capacity: 10, going_count: 9 }))).toBe('open');
  });
  it('cupo alcanzado → full', () => {
    expect(eventCapacityState(makeEvent({ capacity: 10, going_count: 10 }))).toBe('full');
  });
  it('rsvpSummary cuenta going y maybe, ignora declined', () => {
    expect(rsvpSummary([
      { event_id: 'e', user_id: 'a', status: 'going' },
      { event_id: 'e', user_id: 'b', status: 'going' },
      { event_id: 'e', user_id: 'c', status: 'maybe' },
      { event_id: 'e', user_id: 'd', status: 'declined' },
    ])).toEqual({ going: 2, maybe: 1 });
  });
});

describe('formatEventDate', () => {
  it('formatea es-CO en el timezone del evento', () => {
    const out = formatEventDate('2026-07-03T11:00:00Z', 'America/Bogota'); // 6:00 a.m. COT
    expect(out).toMatch(/vie/i);
    expect(out).toMatch(/jul/i);
    expect(out).toMatch(/6/);
  });
  it('timezone inválido no crashea (fallback)', () => {
    expect(() => formatEventDate('2026-07-03T11:00:00Z', 'No/Existe')).not.toThrow();
  });
});

describe('permisos', () => {
  it('canManageSpace: owner o admin', () => {
    expect(canManageSpace('owner', false)).toBe(true);
    expect(canManageSpace('member', false)).toBe(false);
    expect(canManageSpace(null, true)).toBe(true);
    expect(canManageSpace(undefined, false)).toBe(false);
  });
  it('canManageEvent: creador o admin', () => {
    const e = makeEvent({ created_by: 'u1' });
    expect(canManageEvent('u1', e, false)).toBe(true);
    expect(canManageEvent('u2', e, false)).toBe(false);
    expect(canManageEvent('u2', e, true)).toBe(true);
    expect(canManageEvent(null, e, false)).toBe(false);
  });
});

describe('groupReactions', () => {
  it('agrupa por tipo, marca las mías y ordena like→catálogo', () => {
    const groups = groupReactions([
      { post_id: 'p', user_id: 'a', type: '🔥' },
      { post_id: 'p', user_id: 'me', type: '🔥' },
      { post_id: 'p', user_id: 'b', type: 'like' },
      { post_id: 'p', user_id: 'c', type: '❤️' },
    ], 'me');
    expect(groups.map((g) => g.type)).toEqual(['like', '🔥', '❤️']);
    expect(groups[1]).toEqual({ type: '🔥', count: 2, mine: true });
    expect(groups[0].mine).toBe(false);
  });
  it('vacío → vacío; myId null no marca nada', () => {
    expect(groupReactions([], 'me')).toEqual([]);
    const g = groupReactions([{ post_id: 'p', user_id: 'me', type: 'like' }], null);
    expect(g[0].mine).toBe(false);
  });
});

describe('filterBlockedAuthors', () => {
  const items = [{ user_id: 'a', x: 1 }, { user_id: 'b', x: 2 }, { user_id: 'c', x: 3 }];
  it('filtra los bloqueados', () => {
    expect(filterBlockedAuthors(items, new Set(['b']))).toEqual([{ user_id: 'a', x: 1 }, { user_id: 'c', x: 3 }]);
  });
  it('set vacío devuelve la misma lista', () => {
    expect(filterBlockedAuthors(items, new Set())).toHaveLength(3);
  });
});

describe('validateSpaceInput', () => {
  it('acepta nombre válido', () => {
    expect(validateSpaceInput('Fuerza 5AM', 'Círculo de entrenamiento matutino').ok).toBe(true);
  });
  it('rechaza nombre corto o largo', () => {
    expect(validateSpaceInput('ab', '').ok).toBe(false);
    expect(validateSpaceInput('x'.repeat(61), '').ok).toBe(false);
  });
  it('rechaza descripción >280', () => {
    expect(validateSpaceInput('Nombre OK', 'y'.repeat(281)).ok).toBe(false);
  });
});

describe('validateEventInput', () => {
  const base: EventInput = {
    title: 'Caminata de fundadores',
    description: 'Nos vemos en el parque.',
    startsAt: new Date('2026-07-05T13:00:00Z'),
    durationMinutes: 90,
    locationType: 'in_person',
    locationText: 'Parque El Virrey, Bogotá',
    capacity: 12,
  };
  it('acepta input válido', () => {
    expect(validateEventInput(base, NOW).ok).toBe(true);
  });
  it('rechaza fecha en el pasado o nula', () => {
    expect(validateEventInput({ ...base, startsAt: new Date('2026-07-01T00:00:00Z') }, NOW).ok).toBe(false);
    expect(validateEventInput({ ...base, startsAt: null }, NOW).ok).toBe(false);
  });
  it('rechaza duración fuera de rango', () => {
    expect(validateEventInput({ ...base, durationMinutes: 10 }, NOW).ok).toBe(false);
    expect(validateEventInput({ ...base, durationMinutes: 481 }, NOW).ok).toBe(false);
  });
  it('exige lugar/link con mensaje según tipo', () => {
    const virtual = validateEventInput({ ...base, locationType: 'virtual', locationText: '' }, NOW);
    expect(virtual.ok).toBe(false);
    expect(virtual.error).toMatch(/link/i);
    const fisico = validateEventInput({ ...base, locationType: 'in_person', locationText: '' }, NOW);
    expect(fisico.ok).toBe(false);
    expect(fisico.error).toMatch(/lugar/i);
  });
  it('rechaza cupo fuera de rango; null es válido (sin cupo)', () => {
    expect(validateEventInput({ ...base, capacity: 1 }, NOW).ok).toBe(false);
    expect(validateEventInput({ ...base, capacity: 501 }, NOW).ok).toBe(false);
    expect(validateEventInput({ ...base, capacity: null }, NOW).ok).toBe(true);
  });
  it('rechaza título fuera de 3–80', () => {
    expect(validateEventInput({ ...base, title: 'ab' }, NOW).ok).toBe(false);
    expect(validateEventInput({ ...base, title: 'x'.repeat(81) }, NOW).ok).toBe(false);
  });
});
