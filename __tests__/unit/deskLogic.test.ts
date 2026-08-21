// ─── lib/admin/deskLogic.ts — armado puro del Focus Desk ───────────────────────

import {
  buildDesk,
  type DeskAssignmentEntry,
  type DeskMentor,
  type DeskRosterEntry,
  type DeskSourceRow,
} from '@/lib/admin/deskLogic';

function row(p: Partial<DeskSourceRow> & { user_id: string; name: string }): DeskSourceRow {
  return {
    attention: 0, momentum: 'stable', openTasks: 0, overdue: 0, topReason: null, severity: null,
    ...p,
  };
}

const mentorA: DeskMentor = { id: 'm1', name: 'Mentor A' };
const mentorB: DeskMentor = { id: 'm2', name: 'Mentor B' };

describe('buildDesk', () => {
  it('un usuario del roster sin fila de ejecución entra con defaults en 0', () => {
    const desk = buildDesk({
      rows: [],
      roster: [{ user_id: 'u1', name: 'Ana', is_admin: false }],
      assignments: [],
      mentors: [],
      myId: 'admin1',
    });
    expect(desk.clients).toEqual([
      {
        user_id: 'u1', name: 'Ana', attention: 0, momentum: 'stable',
        openTasks: 0, overdue: 0, topReason: null, severity: null, mentorId: null,
      },
    ]);
  });

  it('ordena por atención desc y empata por nombre (es)', () => {
    const roster: DeskRosterEntry[] = [
      { user_id: 'u1', name: 'Zoe', is_admin: false },
      { user_id: 'u2', name: 'Ana', is_admin: false },
      { user_id: 'u3', name: 'Bea', is_admin: false },
    ];
    const desk = buildDesk({
      rows: [
        row({ user_id: 'u1', name: 'Zoe', attention: 50 }),
        row({ user_id: 'u2', name: 'Ana', attention: 50 }),
        row({ user_id: 'u3', name: 'Bea', attention: 90 }),
      ],
      roster, assignments: [], mentors: [], myId: 'admin1',
    });
    expect(desk.clients.map((c) => c.user_id)).toEqual(['u3', 'u2', 'u1']);
  });

  it('sin asignar cuenta filas sin mentor y mentorId inválido (mentor ya no es admin)', () => {
    const desk = buildDesk({
      rows: [],
      roster: [
        { user_id: 'u1', name: 'Ana', is_admin: false },
        { user_id: 'u2', name: 'Bea', is_admin: false },
      ],
      assignments: [{ user_id: 'u2', mentor_id: 'ex-admin' } as DeskAssignmentEntry],
      mentors: [mentorA],
      myId: 'admin1',
    });
    expect(desk.unassigned).toBe(2);
    expect(desk.clients.find((c) => c.user_id === 'u2')?.mentorId).toBeNull();
  });

  it('mine filtra por myId', () => {
    const desk = buildDesk({
      rows: [],
      roster: [
        { user_id: 'u1', name: 'Ana', is_admin: false },
        { user_id: 'u2', name: 'Bea', is_admin: false },
      ],
      assignments: [
        { user_id: 'u1', mentor_id: 'm1' },
        { user_id: 'u2', mentor_id: 'm2' },
      ],
      mentors: [mentorA, mentorB],
      myId: 'm1',
    });
    expect(desk.mine.map((c) => c.user_id)).toEqual(['u1']);
  });

  it('byMentor incluye mentores con 0 clientes y respeta su orden; sin mentores → []', () => {
    const desk = buildDesk({
      rows: [],
      roster: [{ user_id: 'u1', name: 'Ana', is_admin: false }],
      assignments: [{ user_id: 'u1', mentor_id: 'm1' }],
      mentors: [mentorA, mentorB],
      myId: 'admin1',
    });
    expect(desk.byMentor).toEqual([
      { mentor: mentorA, clients: 1, inAttention: 0 },
      { mentor: mentorB, clients: 0, inAttention: 0 },
    ]);

    const empty = buildDesk({ rows: [], roster: [], assignments: [], mentors: [], myId: 'admin1' });
    expect(empty.byMentor).toEqual([]);
  });

  it('excluye admins del universo cliente; incluye usuarios con fila pero fuera del roster', () => {
    const desk = buildDesk({
      rows: [row({ user_id: 'ghost', name: 'Fantasma', attention: 10 })],
      roster: [
        { user_id: 'admin1', name: 'Coach', is_admin: true },
        { user_id: 'u1', name: 'Ana', is_admin: false },
      ],
      assignments: [], mentors: [], myId: 'admin1',
    });
    const ids = desk.clients.map((c) => c.user_id);
    expect(ids).toContain('u1');
    expect(ids).toContain('ghost');
    expect(ids).not.toContain('admin1');
  });

  it('excluye mentores dedicados (is_admin=false, listados en mentors) del universo cliente', () => {
    const desk = buildDesk({
      rows: [],
      roster: [
        { user_id: 'mentorX', name: 'Mentor X', is_admin: false },
        { user_id: 'u1', name: 'Ana', is_admin: false },
      ],
      assignments: [],
      mentors: [{ id: 'mentorX', name: 'Mentor X' }],
      myId: 'admin1',
    });
    const ids = desk.clients.map((c) => c.user_id);
    expect(ids).not.toContain('mentorX');
    expect(ids).toContain('u1');
  });

  it('topUrgent es null sin urgencia, y apunta al cliente correcto cuando hay atención u overdue', () => {
    const none = buildDesk({
      rows: [row({ user_id: 'u1', name: 'Ana', attention: 0, overdue: 0 })],
      roster: [{ user_id: 'u1', name: 'Ana', is_admin: false }],
      assignments: [], mentors: [], myId: 'admin1',
    });
    expect(none.topUrgent).toBeNull();

    const urgent = buildDesk({
      rows: [row({ user_id: 'u1', name: 'Ana', attention: 0, overdue: 2 })],
      roster: [{ user_id: 'u1', name: 'Ana', is_admin: false }],
      assignments: [], mentors: [], myId: 'admin1',
    });
    expect(urgent.topUrgent?.user_id).toBe('u1');
  });

  it('sin clientes en absoluto, topUrgent es null', () => {
    const desk = buildDesk({ rows: [], roster: [], assignments: [], mentors: [], myId: 'admin1' });
    expect(desk.topUrgent).toBeNull();
  });

  it('suma overdueTotal y cuenta momentumRisk (fragile/declining/critical)', () => {
    const desk = buildDesk({
      rows: [
        row({ user_id: 'u1', name: 'Ana', overdue: 2, momentum: 'fragile' }),
        row({ user_id: 'u2', name: 'Bea', overdue: 3, momentum: 'critical' }),
        row({ user_id: 'u3', name: 'Cal', overdue: 0, momentum: 'rising' }),
      ],
      roster: [
        { user_id: 'u1', name: 'Ana', is_admin: false },
        { user_id: 'u2', name: 'Bea', is_admin: false },
        { user_id: 'u3', name: 'Cal', is_admin: false },
      ],
      assignments: [], mentors: [], myId: 'admin1',
    });
    expect(desk.overdueTotal).toBe(5);
    expect(desk.momentumRisk).toBe(2);
  });

  it('needsIntervention cuenta severity high/critical', () => {
    const desk = buildDesk({
      rows: [
        row({ user_id: 'u1', name: 'Ana', severity: 'high' }),
        row({ user_id: 'u2', name: 'Bea', severity: 'critical' }),
        row({ user_id: 'u3', name: 'Cal', severity: 'low' }),
      ],
      roster: [
        { user_id: 'u1', name: 'Ana', is_admin: false },
        { user_id: 'u2', name: 'Bea', is_admin: false },
        { user_id: 'u3', name: 'Cal', is_admin: false },
      ],
      assignments: [], mentors: [], myId: 'admin1',
    });
    expect(desk.needsIntervention).toBe(2);
  });
});
