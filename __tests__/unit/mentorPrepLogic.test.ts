import { dedupeActions, isSameAction, parseDay, prepCommitments, prepSignals } from '@/lib/mentorPrepLogic';
import { mergeAutoPlan } from '@/lib/mentorDeskLogic';
import { buildInterventions, computeClientScores, deriveStatus, scoreAdherence } from '@/lib/mentorExecutionLogic';
import { computeDrivers, weightedChurnScore, churnLabel } from '@/lib/coachIntelligenceLogic';

const NOW = Date.parse('2026-11-03T15:00:00Z');
const DAY = 86_400_000;

describe('isSameAction — el mismo compromiso dicho dos veces', () => {
  it('detecta paráfrasis del mentor vs la IA', () => {
    expect(isSameAction(
      'Revisar el módulo de onboarding en la plataforma School esta semana',
      'Completa el módulo de onboarding en la plataforma School antes del próximo lunes',
    )).toBe(true);
    expect(isSameAction(
      'Conectarse al entrenamiento LifeFlow al día siguiente a las 7:15',
      'Asiste a los entrenamientos LifeFlow martes y jueves',
    )).toBe(true);
  });
  it('no junta acciones distintas', () => {
    expect(isSameAction('Ver los videos de Norman', 'Revisar el módulo de onboarding')).toBe(false);
  });
  it('dedupeActions conserva el primero', () => {
    const out = dedupeActions([{ text: 'Revisar módulo onboarding School' }, { text: 'Completar módulo onboarding School' }, { text: 'Ver videos de Norman' }]);
    expect(out.map((o) => o.text)).toEqual(['Revisar módulo onboarding School', 'Ver videos de Norman']);
  });
});

describe('mergeAutoPlan — la IA no repite lo que el mentor ya escribió', () => {
  it('descarta el auto que parafrasea uno manual', () => {
    const plan = mergeAutoPlan(
      [{ text: 'Completa el módulo de onboarding en la plataforma School', source: 'manual' }],
      ['Revisar el módulo de onboarding en la plataforma School', 'Ver los videos de Norman'],
      1,
    );
    expect(plan.map((p) => p.text)).toEqual(['Completa el módulo de onboarding en la plataforma School', 'Ver los videos de Norman']);
  });
});

describe('parseDay', () => {
  it('fecha de solo-día = mediodía local (no el día anterior)', () => {
    expect(parseDay('2026-08-31')!.getDate()).toBe(31);
  });
  it('inválida → null', () => {
    expect(parseDay(undefined)).toBeNull();
    expect(parseDay('nope')).toBeNull();
  });
});

const sess = (o: Partial<{ id: string; week: number; session_date: string; action_plan: unknown[] }>) => ({
  id: o.id ?? 's1', week: o.week ?? 1, session_date: o.session_date ?? '2026-08-31', created_at: '2026-08-31T00:00:00Z',
  action_plan: o.action_plan ?? [],
});

describe('prepCommitments', () => {
  it('vence a los 7 días de la sesión, sin repetidos, toma la sesión más reciente', () => {
    const out = prepCommitments([
      sess({ id: 'old', week: 1, action_plan: ['Algo viejo'] }),
      sess({ id: 'new', week: 2, session_date: '2026-10-30', action_plan: [
        { text: 'Revisar módulo onboarding School', source: 'manual' },
        { text: 'Completar módulo onboarding School', source: 'auto' },
        { text: 'Ver videos de Norman', done: true },
      ] }),
    ], NOW);
    expect(out.map((c) => [c.text, c.state])).toEqual([
      ['Revisar módulo onboarding School', 'abierto'],
      ['Ver videos de Norman', 'cumplido'],
    ]);
    expect(out[1].index).toBe(2);
  });
  it('compromisos de hace dos meses salen vencidos', () => {
    const [c] = prepCommitments([sess({ action_plan: ['Revisar onboarding'] })], NOW);
    expect(c.state).toBe('vencido');
    expect(c.overdueDays).toBeGreaterThan(50);
  });
  it('sin plan → vacío', () => expect(prepCommitments([sess({})], NOW)).toEqual([]));
});

describe('prepSignals — lo que de verdad pasa', () => {
  it('cliente callado: alerta y titular honesto', () => {
    const commitments = prepCommitments([sess({ action_plan: ['Revisar onboarding', 'Ver videos de Norman'] })], NOW);
    const s = prepSignals({ activityDates: [new Date(NOW - 63 * DAY).toISOString()], checkInDates: [], commitments, nowMs: NOW });
    expect(s.tone).toBe('alert');
    expect(s.headline).toBe('63 días sin actividad · nunca ha hecho check-in · 0 de 2 compromisos cumplidos');
  });
  it('cliente activo y al día: ok', () => {
    const s = prepSignals({ activityDates: [new Date(NOW).toISOString()], checkInDates: ['2026-11-02'], commitments: [], nowMs: NOW });
    expect(s.tone).toBe('ok');
    expect(s.checkIns7d).toBe(1);
  });
  it('sin ninguna actividad', () => {
    expect(prepSignals({ activityDates: [null], checkInDates: [], commitments: [], nowMs: NOW }).daysSinceActivity).toBeNull();
  });
});

describe('adherencia honesta con tareas sin fecha', () => {
  const created = new Date(NOW - 60 * DAY).toISOString();
  it('tarea IA sin fecha y sin hacer en 60 días → vencida y adherencia 0', () => {
    const t = { title: 'x', status: 'not_started' as const, created_at: created };
    expect(deriveStatus(t, NOW)).toBe('overdue');
    expect(scoreAdherence([t], NOW)).toBe(0);
  });
  it('tarea recién creada aún no cuenta', () => {
    const t = { title: 'x', status: 'not_started' as const, created_at: new Date(NOW - DAY).toISOString() };
    expect(scoreAdherence([t], NOW)).toBe(100);
  });
});

describe('ausencia del cliente: Ejecución y riesgo dicen lo mismo que PREPARAR', () => {
  it('sin tareas pero nunca usó la app → no "en ascenso", alerta de inactividad', () => {
    const sc = computeClientScores({ tasks: [], nowMs: NOW, daysSinceActivity: null });
    expect(sc.weekly_momentum_state).toBe('declining');
    expect(sc.drivers.daysInactive).toBe(-1);
    expect(sc.mentor_attention_score).toBeGreaterThanOrEqual(40);
    expect(buildInterventions(sc, [], NOW).some((i) => i.queue_reason === 'inactive')).toBe(true);
  });
  it('cliente activo no se toca; dato desconocido tampoco', () => {
    expect(computeClientScores({ tasks: [], nowMs: NOW, daysSinceActivity: 1 }).weekly_momentum_state).toBe('rising');
    expect(computeClientScores({ tasks: [], nowMs: NOW }).drivers.daysInactive).toBeUndefined();
  });
  it('coach: "nunca usó la app" sube el riesgo por encima de bajo', () => {
    const execution = computeClientScores({ tasks: [], nowMs: NOW, daysSinceActivity: null });
    const drivers = computeDrivers({
      intelligence: null, memory: null, execution, topConfrontation: null, confrontation_high_count: 0,
      biometric: null, checkin_energy_7d: null, checkin_energy_prev: null, checkin_count_7d: 0,
      checkin_count_prev: 0, current_streak_days: 0, user_turns_7d: 0, user_turns_prev: 0,
      days_since_last_message: Infinity, ever_wrote: false, overdue_count: 0, open_tasks_count: 0,
      completed_tasks_7d: 0, completed_tasks_prev: 0,
    });
    expect(drivers[0].label).toBe('Nunca ha usado la app');
    expect(churnLabel(weightedChurnScore(drivers))).not.toBe('low');
  });
});
