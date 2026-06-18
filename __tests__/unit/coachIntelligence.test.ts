import {
  type CoachBundle,
  type ConfrontationItem,
  type MemoryProfile,
} from '@/lib/coachIntelligenceLogic';
import {
  composeNarrative,
  computeCoachIntelligence,
  computeDrivers,
  computeMomentum,
  computeRelationalDepth,
  churnLabel,
  selectNextAction,
  weightedChurnScore,
} from '@/lib/coachIntelligenceLogic';

// El tipo ConfrontationItem se reexporta porque el módulo no lo expone directamente.
type _CI = typeof import('@/lib/coachIntelligenceLogic');
type LocalConfrontationItem = ReturnType<_CI['computeDrivers']> extends infer _ ? never : never;

// Bundle vacío reusable.
function emptyBundle(): CoachBundle {
  return {
    intelligence: null,
    memory: null,
    execution: null,
    topConfrontation: null,
    confrontation_high_count: 0,
    biometric: null,
    checkin_energy_7d: null,
    checkin_energy_prev: null,
    checkin_count_7d: 0,
    checkin_count_prev: 0,
    current_streak_days: 0,
    user_turns_7d: 0,
    user_turns_prev: 0,
    days_since_last_message: 0,
    overdue_count: 0,
    open_tasks_count: 0,
    completed_tasks_7d: 0,
    completed_tasks_prev: 0,
  };
}

describe('coachIntelligenceLogic — drivers', () => {
  it('vacío → sin drivers (no inventa señales)', () => {
    const drivers = computeDrivers(emptyBundle());
    expect(drivers).toEqual([]);
  });

  it('compromisos abiertos ≥3 → driver commitments_drift con evidencia citable', () => {
    const memory: MemoryProfile = {
      commitments_open: [
        { id: '1', text: 'entrenar 5x por semana' },
        { id: '2', text: 'cerrar pendientes' },
        { id: '3', text: 'dormir 7h' },
      ],
    };
    const drivers = computeDrivers({ ...emptyBundle(), memory });
    const found = drivers.find((d) => d.kind === 'commitments_drift');
    expect(found).toBeDefined();
    expect(found!.weight).toBeGreaterThan(0);
    expect(found!.evidence).toContain('3 compromisos abiertos');
    expect(found!.evidence).toContain('entrenar 5x'); // cita el primero
  });

  it('silencio ≥5 días → driver mentor_silence escala con los días', () => {
    const a = computeDrivers({ ...emptyBundle(), days_since_last_message: 5 });
    const b = computeDrivers({ ...emptyBundle(), days_since_last_message: 14 });
    const wa = a.find((d) => d.kind === 'mentor_silence')?.weight ?? 0;
    const wb = b.find((d) => d.kind === 'mentor_silence')?.weight ?? 0;
    expect(wb).toBeGreaterThan(wa);
  });

  it('streak ≥7 días → driver protector con peso negativo', () => {
    const drivers = computeDrivers({ ...emptyBundle(), current_streak_days: 10 });
    const proto = drivers.find((d) => d.kind === 'protective_streak');
    expect(proto).toBeDefined();
    expect(proto!.weight).toBeLessThan(0);
  });

  it('drivers se ordenan por peso ABSOLUTO descendente', () => {
    const drivers = computeDrivers({
      ...emptyBundle(),
      days_since_last_message: 20,
      memory: { commitments_open: [
        { id: '1', text: 'x' }, { id: '2', text: 'y' }, { id: '3', text: 'z' },
        { id: '4', text: 'w' }, { id: '5', text: 'v' },
      ] },
      current_streak_days: 30, // protector grande
    });
    const weights = drivers.map((d) => Math.abs(d.weight));
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i - 1]).toBeGreaterThanOrEqual(weights[i]);
    }
  });
});

describe('coachIntelligenceLogic — churn score', () => {
  it('vacío → riesgo 0', () => {
    expect(weightedChurnScore([])).toBe(0);
  });

  it('protectores bajan el riesgo', () => {
    const withoutProto = weightedChurnScore([
      { kind: 'mentor_silence', weight: 0.3, label: '', evidence: '' },
    ]);
    const withProto = weightedChurnScore([
      { kind: 'mentor_silence', weight: 0.3, label: '', evidence: '' },
      { kind: 'protective_streak', weight: -0.2, label: '', evidence: '' },
    ]);
    expect(withProto).toBeLessThan(withoutProto);
  });

  it('riesgo se capa en 1 con sumas grandes', () => {
    const v = weightedChurnScore([
      { kind: 'mentor_silence', weight: 0.9, label: '', evidence: '' },
      { kind: 'tasks_overdue', weight: 0.5, label: '', evidence: '' },
    ]);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('label refleja umbrales', () => {
    expect(churnLabel(0.10)).toBe('low');
    expect(churnLabel(0.35)).toBe('medium');
    expect(churnLabel(0.55)).toBe('high');
    expect(churnLabel(0.80)).toBe('critical');
  });
});

describe('coachIntelligenceLogic — momentum', () => {
  it('infiere rising sin execution scores si check-in y tareas suben', () => {
    const m = computeMomentum({
      ...emptyBundle(),
      checkin_energy_7d: 8, checkin_energy_prev: 6,
      completed_tasks_7d: 5, completed_tasks_prev: 2,
    });
    expect(m.state).toBe('rising');
    expect(m.delta_checkin).toBeCloseTo(2);
    expect(m.delta_tasks).toBe(3);
  });

  it('infiere declining si energía y tareas caen', () => {
    const m = computeMomentum({
      ...emptyBundle(),
      checkin_energy_7d: 4, checkin_energy_prev: 7,
      completed_tasks_7d: 0, completed_tasks_prev: 4,
    });
    expect(m.state).toBe('declining');
  });

  it('respeta el momentum del Mentor Execution OS si existe', () => {
    const m = computeMomentum({
      ...emptyBundle(),
      checkin_energy_7d: 8, checkin_energy_prev: 6,
      execution: {
        adherence_score: 0, execution_quality_score: 0, follow_through_score: 0,
        friction_score: 0, mentor_attention_score: 0,
        weekly_momentum_state: 'critical', drivers: {},
      },
    });
    expect(m.state).toBe('critical');
  });
});

describe('coachIntelligenceLogic — relational depth', () => {
  it('silent state si nunca habló', () => {
    const d = computeRelationalDepth({ ...emptyBundle(), days_since_last_message: 30 });
    expect(d.state).toBe('silent');
    expect(d.score).toBeLessThan(20);
  });

  it('deep state con turnos altos + compromisos + recencia', () => {
    const d = computeRelationalDepth({
      ...emptyBundle(),
      user_turns_7d: 12,
      days_since_last_message: 1,
      memory: { commitments_open: [
        { id: '1', text: 'x' }, { id: '2', text: 'y' }, { id: '3', text: 'z' },
      ] },
    });
    expect(d.state).toBe('deep');
    expect(d.score).toBeGreaterThanOrEqual(70);
  });
});

describe('coachIntelligenceLogic — next best action', () => {
  it('confrontación severa pendiente gana SIEMPRE — usa el prompt literal', () => {
    const confItem = {
      id: 'c1',
      dimension: 'commitments',
      severity: 'critical',
      evidence: { said: null, did: { value: '', detail: '' }, gap_metric: { summary: '3d sin contacto' } },
      confrontation_prompt: '"Dijiste que entrenarías ayer. ¿Qué pasó?"',
      skipped: false,
    } as unknown as ConfrontationItem;
    const bundle: CoachBundle = {
      ...emptyBundle(), topConfrontation: confItem, confrontation_high_count: 1,
    };
    const drivers = computeDrivers(bundle);
    const momentum = computeMomentum(bundle);
    const rel = computeRelationalDepth(bundle);
    const action = selectNextAction(drivers, bundle, momentum, rel);
    expect(action.kind).toBe('confront');
    expect(action.what_to_say).toBe('"Dijiste que entrenarías ayer. ¿Qué pasó?"');
    expect(action.urgency).toBe('urgent');
  });

  it('silencio >7d sin confrontación → reconnect', () => {
    const bundle: CoachBundle = { ...emptyBundle(), days_since_last_message: 10 };
    const action = selectNextAction(
      computeDrivers(bundle), bundle, computeMomentum(bundle), computeRelationalDepth(bundle),
    );
    expect(action.kind).toBe('reconnect');
    expect(action.what_to_say).toContain('10 días');
  });

  it('compromiso abierto + drift → confronta con el texto exacto', () => {
    const bundle: CoachBundle = {
      ...emptyBundle(),
      memory: { commitments_open: [
        { id: '1', text: 'entrenar 5x por semana' },
        { id: '2', text: 'b' }, { id: '3', text: 'c' }, { id: '4', text: 'd' },
      ] },
      days_since_last_message: 2,
      user_turns_7d: 5,
    };
    const action = selectNextAction(
      computeDrivers(bundle), bundle, computeMomentum(bundle), computeRelationalDepth(bundle),
    );
    expect(action.kind).toBe('confront');
    expect(action.what_to_say).toContain('entrenar 5x por semana');
  });
});

describe('coachIntelligenceLogic — end to end', () => {
  it('cliente saludable: bajo churn + momentum positivo', () => {
    const ci = computeCoachIntelligence({
      ...emptyBundle(),
      checkin_energy_7d: 8, checkin_energy_prev: 7,
      checkin_count_7d: 7, checkin_count_prev: 6,
      current_streak_days: 14,
      user_turns_7d: 8, user_turns_prev: 6,
      days_since_last_message: 1,
      completed_tasks_7d: 4, completed_tasks_prev: 2,
    });
    expect(ci.churn_risk).toBeLessThan(0.3);
    expect(ci.churn_risk_label).toBe('low');
    expect(ci.composite_score).toBeGreaterThan(50);
    expect(ci.narrative.toLowerCase()).toContain('bajo riesgo');
  });

  it('cliente en riesgo: silencio + compromisos + tareas vencidas', () => {
    const ci = computeCoachIntelligence({
      ...emptyBundle(),
      days_since_last_message: 12,
      overdue_count: 3,
      memory: { commitments_open: [
        { id: '1', text: 'a' }, { id: '2', text: 'b' }, { id: '3', text: 'c' },
        { id: '4', text: 'd' }, { id: '5', text: 'e' },
      ] },
      checkin_count_7d: 1, checkin_count_prev: 5,
      user_turns_7d: 0, user_turns_prev: 4,
    });
    expect(ci.churn_risk).toBeGreaterThan(0.4);
    expect(ci.drivers.length).toBeGreaterThan(2);
    // NBA debe ser específica, no template genérico.
    expect(ci.next_action.why_now.length).toBeGreaterThan(0);
  });

  it('narrative se compone con drivers reales', () => {
    const n = composeNarrative(
      [{ kind: 'mentor_silence', weight: 0.2, label: 'Silencio', evidence: '10 días sin escribir' }],
      computeMomentum(emptyBundle()),
      computeRelationalDepth(emptyBundle()),
    );
    expect(n).toContain('10 días sin escribir');
  });
});
