/**
 * mentorExecutionLogic — tests de la lógica pura del Mentor Execution OS.
 * Scores explicables, derivación de status, intervención, mentor-prep, vista cliente.
 */
import {
  assembleMentorPrep,
  buildInterventions,
  clientProgress,
  clientSafeTasks,
  computeClientScores,
  pendingAccountability,
  deriveStatus,
  momentumState,
  scoreAdherence,
  scoreExecutionQuality,
  scoreFollowThrough,
  scoreFriction,
  scoreMentorAttention,
  tierDepth,
  type MentorTask,
} from '@/lib/mentorExecutionLogic';

const NOW = Date.parse('2026-06-16T12:00:00Z');
const past = '2026-06-10T12:00:00Z';
const future = '2026-06-20T12:00:00Z';

function task(p: Partial<MentorTask>): MentorTask {
  return { title: p.title ?? 'T', ...p };
}

describe('deriveStatus — overdue es derivado del tiempo', () => {
  it('not_started con due pasado → overdue', () => {
    expect(deriveStatus(task({ status: 'not_started', due_date: past }), NOW)).toBe('overdue');
  });
  it('completed se preserva aunque el due haya pasado', () => {
    expect(deriveStatus(task({ status: 'completed', due_date: past }), NOW)).toBe('completed');
  });
  it('blocked/avoided no se sobreescriben a overdue', () => {
    expect(deriveStatus(task({ status: 'blocked', due_date: past }), NOW)).toBe('blocked');
    expect(deriveStatus(task({ status: 'avoided', due_date: past }), NOW)).toBe('avoided');
  });
  it('due futuro → conserva status', () => {
    expect(deriveStatus(task({ status: 'in_progress', due_date: future }), NOW)).toBe('in_progress');
  });
});

describe('scoreAdherence', () => {
  it('sin tareas con fecha → 100 (no se puede penalizar)', () => {
    expect(scoreAdherence([task({ status: 'in_progress' })], NOW)).toBe(100);
  });
  it('completada a tiempo = 100, vencida = 0', () => {
    const tasks = [
      task({ status: 'completed', due_date: future, completed_at: past }),
      task({ status: 'not_started', due_date: past }),
    ];
    expect(scoreAdherence(tasks, NOW)).toBe(50);
  });
  it('completada tarde cuenta parcial (0.6)', () => {
    const tasks = [task({ status: 'completed', due_date: past, completed_at: future })];
    expect(scoreAdherence(tasks, NOW)).toBe(60);
  });
});

describe('scoreExecutionQuality', () => {
  it('sin revisión → neutral 70', () => {
    expect(scoreExecutionQuality([task({ status: 'completed' })])).toBe(70);
  });
  it('usa mentor_score si está', () => {
    expect(scoreExecutionQuality([task({ mentor_score: 90 }), task({ mentor_score: 50 })])).toBe(70);
  });
  it('mapea execution_quality', () => {
    expect(scoreExecutionQuality([task({ execution_quality: 'high' })])).toBe(90);
    expect(scoreExecutionQuality([task({ execution_quality: 'low' })])).toBe(35);
  });
});

describe('scoreFollowThrough', () => {
  it('sin compromisos → 100', () => expect(scoreFollowThrough(0, 0)).toBe(100));
  it('3 de 4 → 75', () => expect(scoreFollowThrough(4, 3)).toBe(75));
  it('cumplidos no exceden hechos', () => expect(scoreFollowThrough(2, 5)).toBe(100));
});

describe('scoreFriction — mayor = peor', () => {
  it('sin tareas activas → 0', () => expect(scoreFriction([], NOW)).toBe(0));
  it('evitación pesa más que bloqueo', () => {
    // Con tareas de relleno completadas para no topar el clamp (100).
    const filler = task({ status: 'completed' });
    const a = scoreFriction([task({ status: 'avoided' }), filler, filler], NOW);
    const b = scoreFriction([task({ status: 'blocked' }), filler, filler], NOW);
    expect(a).toBeGreaterThan(b);
  });
  it('vencidas suben la fricción', () => {
    expect(scoreFriction([task({ status: 'not_started', due_date: past })], NOW)).toBeGreaterThan(0);
  });
});

describe('scoreMentorAttention — mayor = intervenir antes', () => {
  it('fricción alta + adherencia baja → elevado', () => {
    // 0.4*80 + 0.25*(100-20) = 52 (sin churn). Con churn sube.
    expect(scoreMentorAttention({ friction: 80, adherence: 20 })).toBeGreaterThan(50);
    expect(scoreMentorAttention({ friction: 80, adherence: 20, churnRisk: 0.8 })).toBeGreaterThan(60);
  });
  it('críticas vencidas suman', () => {
    const base = scoreMentorAttention({ friction: 30, adherence: 60 });
    const withCrit = scoreMentorAttention({ friction: 30, adherence: 60, criticalOverdue: 2 });
    expect(withCrit).toBeGreaterThan(base);
  });
});

describe('momentumState', () => {
  it('alta adherencia + baja fricción → rising', () => expect(momentumState(80, 10)).toBe('rising'));
  it('media → stable/fragile', () => {
    expect(momentumState(60, 30)).toBe('stable');
    expect(momentumState(45, 50)).toBe('fragile');
  });
  it('muy baja → critical', () => expect(momentumState(10, 90)).toBe('critical'));
});

describe('computeClientScores — bundle', () => {
  it('arma los 6 scores + drivers', () => {
    const tasks = [
      task({ status: 'completed', due_date: future, completed_at: past }),
      task({ status: 'avoided', priority: 'critical', due_date: past }),
    ];
    const s = computeClientScores({ tasks, nowMs: NOW, commitmentsMade: 2, commitmentsFulfilled: 1, churnRisk: 0.5 });
    expect(s.adherence_score).toBeGreaterThanOrEqual(0);
    expect(s.follow_through_score).toBe(50);
    expect(s.friction_score).toBeGreaterThan(0);
    expect(['rising', 'stable', 'fragile', 'declining', 'critical']).toContain(s.weekly_momentum_state);
    expect(s.drivers.avoided).toBe(1);
  });
});

describe('tierDepth', () => {
  it('mapea tiers a profundidad', () => {
    expect(tierDepth('free')).toBe('basic');
    expect(tierDepth(undefined)).toBe('basic');
    expect(tierDepth('premium')).toBe('full');
    expect(tierDepth('premium_plus')).toBe('deep');
    expect(tierDepth('growthplayers')).toBe('deep');
  });
});

describe('buildInterventions', () => {
  it('genera item crítico por tarea crítica vencida', () => {
    const tasks = [task({ status: 'not_started', priority: 'critical', due_date: past })];
    const scores = computeClientScores({ tasks, nowMs: NOW });
    const iv = buildInterventions(scores, tasks, NOW);
    expect(iv.some((i) => i.queue_reason === 'critical_overdue' && i.severity === 'critical')).toBe(true);
  });
  it('detecta falso cumplimiento (hecha sin evidencia requerida)', () => {
    const tasks = [task({ status: 'completed', evidence_required: true, evidence_payload: {} })];
    const scores = computeClientScores({ tasks, nowMs: NOW });
    const iv = buildInterventions(scores, tasks, NOW);
    expect(iv.some((i) => i.queue_reason === 'false_compliance')).toBe(true);
  });
  it('cliente sano → sin intervenciones', () => {
    const tasks = [task({ status: 'completed', due_date: future, completed_at: past })];
    const scores = computeClientScores({ tasks, nowMs: NOW, commitmentsMade: 1, commitmentsFulfilled: 1 });
    expect(buildInterventions(scores, tasks, NOW)).toHaveLength(0);
  });
});

describe('assembleMentorPrep', () => {
  it('arma estado, dijo-vs-hizo, fricción, preguntas y tareas a revisar', () => {
    const tasks = [
      task({ title: 'Llamar inversor', status: 'completed' }),
      task({ title: 'Definir métrica', status: 'avoided', category: 'negocio', priority: 'high' }),
    ];
    const scores = computeClientScores({ tasks, nowMs: NOW });
    const prep = assembleMentorPrep({
      tasks, scores, nowMs: NOW,
      commitmentsOpen: ['Contratar COO'], recentWins: ['Lanzó MVP'],
      recurringBlockers: ['Evita decidir'], openLoops: ['¿Cuál es la métrica?'],
      mentorshipFocus: 'Ejecución',
    });
    expect(prep.actually_did).toContain('Llamar inversor');
    expect(prep.said_would_do).toContain('Contratar COO');
    expect(prep.highest_friction_area).toBe('negocio');
    expect(prep.challenge).toBe('Evita decidir');
    expect(prep.top_questions.length).toBeGreaterThan(0);
    expect(prep.tasks_to_review).toContain('Definir métrica');
  });
});

describe('vista cliente — de apoyo', () => {
  it('clientSafeTasks deriva status y omite campos internos', () => {
    const view = clientSafeTasks([task({ title: 'X', status: 'not_started', due_date: past, mentor_score: 10 })], NOW);
    expect(view[0].status).toBe('overdue');
    expect((view[0] as Record<string, unknown>).mentor_score).toBeUndefined();
  });
  it('clientProgress cuenta completadas', () => {
    const p = clientProgress([task({ status: 'completed' }), task({ status: 'in_progress' })]);
    expect(p).toEqual({ done: 1, total: 2, pct: 50 });
  });
});

describe('pendingAccountability — loop de 24h', () => {
  const dayAgo = '2026-06-15T11:00:00Z';   // > 24h antes de NOW
  const recent = '2026-06-16T06:00:00Z';   // < 24h antes de NOW
  it('incluye abiertas asignadas hace ≥24h', () => {
    const view = clientSafeTasks([
      task({ id: 'a', title: 'Vieja', status: 'not_started', assigned_at: dayAgo }),
    ], NOW);
    const pend = pendingAccountability(view, NOW);
    expect(pend.map((t) => t.id)).toEqual(['a']);
  });
  it('excluye completadas, recientes y sin fecha', () => {
    const view = clientSafeTasks([
      task({ id: 'done', title: 'Hecha', status: 'completed', assigned_at: dayAgo }),
      task({ id: 'new', title: 'Reciente', status: 'not_started', assigned_at: recent }),
      task({ id: 'nodate', title: 'Sin fecha', status: 'not_started' }),
    ], NOW);
    expect(pendingAccountability(view, NOW)).toEqual([]);
  });
  it('ordena de la más antigua a la más reciente', () => {
    const older = '2026-06-14T11:00:00Z';
    const view = clientSafeTasks([
      task({ id: 'b', title: 'B', status: 'not_started', assigned_at: dayAgo }),
      task({ id: 'a', title: 'A', status: 'not_started', assigned_at: older }),
    ], NOW);
    expect(pendingAccountability(view, NOW).map((t) => t.id)).toEqual(['a', 'b']);
  });
});
