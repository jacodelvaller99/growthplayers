// ─── lib/admin/boardLogic.ts — etapas del tablero de mentorías ───────────────

import { buildBoard, classifyClient, type BoardSourceClient } from '@/lib/admin/boardLogic';

const NOW = new Date('2026-10-30T12:00:00Z').getTime();
const daysAgo = (n: number) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

function client(p: Partial<BoardSourceClient> & { user_id: string }): BoardSourceClient {
  return {
    name: p.user_id,
    mentor_id: null,
    joined_at: daysAgo(60),
    assigned_at: null,
    last_checkin_date: daysAgo(1),
    sessions_count: 2,
    last_session_date: daysAgo(5),
    ...p,
  };
}

describe('classifyClient', () => {
  it('lo que espera al mentor gana sobre todo lo demás', () => {
    const c = classifyClient(client({ user_id: 'a', sessions_count: 0, last_checkin_date: null }), { attention: 0, overdue: 2, topReason: null }, NOW);
    expect(c.stage).toBe('review');
    expect(c.reason).toBe('2 tareas vencidas');
  });

  it('nuevo = sin sesiones y llegó hace poco', () => {
    expect(classifyClient(client({ user_id: 'b', sessions_count: 0, joined_at: daysAgo(3) }), undefined, NOW).stage).toBe('new');
    // Sin sesiones pero hace meses: ya no es "nuevo", es alguien a recuperar.
    expect(classifyClient(client({ user_id: 'c', sessions_count: 0, joined_at: daysAgo(90), last_checkin_date: null }), undefined, NOW).stage).toBe('silent');
  });

  it('sin check-in desde 3 días, o nunca', () => {
    expect(classifyClient(client({ user_id: 'd', last_checkin_date: daysAgo(4) }), undefined, NOW).reason).toBe('4 días sin check-in · recuérdale');
    expect(classifyClient(client({ user_id: 'e', last_checkin_date: null }), undefined, NOW).reason).toBe('Nunca ha hecho check-in');
    expect(classifyClient(client({ user_id: 'f', last_checkin_date: daysAgo(1) }), undefined, NOW).stage).toBe('onPlan');
  });
});

describe('buildBoard', () => {
  it('ordena por etapa y cuenta cada columna', () => {
    const board = buildBoard(
      [
        client({ user_id: 'plan' }),
        client({ user_id: 'callado', last_checkin_date: daysAgo(10) }),
        client({ user_id: 'revisar' }),
      ],
      new Map([['revisar', { attention: 5, overdue: 0, topReason: 'Dijo que entrenaría' }]]),
      NOW,
    );
    expect(board.clients.map((c) => c.user_id)).toEqual(['revisar', 'callado', 'plan']);
    expect(board.counts).toEqual({ review: 1, new: 0, silent: 1, onPlan: 1 });
  });
});
