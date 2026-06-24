import {
  buildConfrontations,
  detectSleepSelfReportMismatch,
  detectEnergyVsRecoveryStreak,
  detectSilentWithdrawal,
  detectMentorContactGap,
  detectHabitStreakAbandoned,
  detectCommitmentsDrift,
  adaptFalseComplianceIntervention,
  adaptHighAttentionIntervention,
  isInHoneymoon,
  isInCompromisedEmotionalState,
  topForMentor,
  type ConfrontationBundle,
  type ConfrontationConsents,
  type ConfrontationItem,
} from '@/lib/confrontationLogic';

const NOW = new Date('2026-06-18T12:00:00Z').getTime();
const DAY = 86_400_000;

function isoDaysAgo(d: number): string {
  return new Date(NOW - d * DAY).toISOString();
}
function dateDaysAgo(d: number): string {
  return new Date(NOW - d * DAY).toISOString().slice(0, 10);
}

const fullConsents: ConfrontationConsents = {
  ml_consent: true,
  confrontation_with_data: true,
  biometric_confrontation: true,
};

function makeBundle(over: Partial<ConfrontationBundle> = {}): ConfrontationBundle {
  return {
    userId: 'u1',
    consents: fullConsents,
    tier: 'premium_plus',
    profile: null,
    activityBundle: {
      habits: [], habitLogs: [], fasting: [], body: [], nutrition: null,
      supplements: [], journal: [], wellness: [], posts: [],
      reactionsGiven: 0, dmsSent: 0, dmLastActivity: null,
    },
    bio: null,
    bioBaselineRecovery30d: null,
    tasks: [],
    interventions: [],
    scores: null,
    recentCheckIns: [],
    lastMentorMsgAt: null,
    lastMentorshipSessionAt: null,
    lastDmAt: null,
    lastAppOpenAt: null,
    lastLessonCompletedAt: null,
    activeModuleTitle: null,
    activeModuleProgress: 0,
    onboardingCompletedAt: isoDaysAgo(60),
    pauseState: { active: false },
    dismissals: [],
    ...over,
  };
}

// ─── Guard global ────────────────────────────────────────────────────────────
describe('buildConfrontations — guards globales', () => {
  it('sin ml_consent → items vacíos con skip reason', () => {
    const r = buildConfrontations(makeBundle({ consents: { ...fullConsents, ml_consent: false } }), NOW);
    expect(r.items).toEqual([]);
    expect(r.skipped[0].reason).toBe('no_ml_consent');
  });

  it('sin confrontation_with_data → vacío', () => {
    const r = buildConfrontations(makeBundle({ consents: { ...fullConsents, confrontation_with_data: false } }), NOW);
    expect(r.items).toEqual([]);
    expect(r.skipped[0].reason).toBe('no_confrontation_consent');
  });

  it('pause_state.active → vacío', () => {
    const r = buildConfrontations(makeBundle({ pauseState: { active: true } }), NOW);
    expect(r.items).toEqual([]);
    expect(r.skipped[0].reason).toBe('pause_state_active');
  });

  it('recurring_blockers contiene "crisis" → vacío', () => {
    const r = buildConfrontations(makeBundle({
      profile: { recurring_blockers: ['crisis económica'] } as any,
    }), NOW);
    expect(r.items).toEqual([]);
    expect(r.skipped[0].reason).toBe('crisis_or_grief_blocker');
  });
});

// ─── Detector: sleep_self_report_vs_wearable ─────────────────────────────────
describe('detectSleepSelfReportMismatch', () => {
  const seriesMismatch = [4, 3, 2, 1, 0].map((d) => ({
    date: dateDaysAgo(d), provider: 'oura', sleep_score: 45, sleep_duration_min: 320, signal_confidence: 0.7,
  }));
  const baseBundle = (): ConfrontationBundle => makeBundle({
    recentCheckIns: [4, 3, 2, 1, 0].map((d) => ({ date: dateDaysAgo(d), energy: 6, clarity: 6, stress: 5, sleep: 8 })),
    bio: { series: seriesMismatch as any, latestInsight: null, connections: [{ provider: 'oura', is_active: true, last_synced_at: isoDaysAgo(0) } as any] },
  });

  it('dispara con 5 días de mismatch y signal_confidence>=0.5', () => {
    const it = detectSleepSelfReportMismatch(baseBundle(), NOW);
    expect(it).not.toBeNull();
    expect(it!.dimension).toBe('state');
    expect(it!.severity).toBe('medium');           // capeado a medium hasta clinical review
    expect(it!.evidence.gap_metric.mismatch_days).toBe(5);
  });

  it('skip si biometric_confrontation=false', () => {
    const b = baseBundle();
    b.consents = { ...fullConsents, biometric_confrontation: false };
    expect(detectSleepSelfReportMismatch(b, NOW)).toBeNull();
  });

  it('skip si signal_confidence=null en todos los días', () => {
    const b = baseBundle();
    b.bio = { ...b.bio!, series: seriesMismatch.map((s) => ({ ...s, signal_confidence: null })) as any };
    expect(detectSleepSelfReportMismatch(b, NOW)).toBeNull();
  });

  it('skip si provider synthetic activo', () => {
    const b = baseBundle();
    b.bio = { ...b.bio!, connections: [{ provider: 'synthetic', is_active: true } as any] };
    expect(detectSleepSelfReportMismatch(b, NOW)).toBeNull();
  });

  it('skip si solo 1 día de mismatch (no patrón)', () => {
    const b = baseBundle();
    b.bio = { ...b.bio!, series: [{ ...seriesMismatch[0] }, ...seriesMismatch.slice(1).map((s) => ({ ...s, sleep_score: 80, sleep_duration_min: 450 }))] as any };
    expect(detectSleepSelfReportMismatch(b, NOW)).toBeNull();
  });

  it('skip si onboarding < 14 días', () => {
    const b = baseBundle();
    b.onboardingCompletedAt = isoDaysAgo(5);
    expect(detectSleepSelfReportMismatch(b, NOW)).toBeNull();
  });
});

// ─── Detector: energy_vs_recovery_streak ─────────────────────────────────────
describe('detectEnergyVsRecoveryStreak', () => {
  const baseBundle = (): ConfrontationBundle => makeBundle({
    recentCheckIns: [2, 1, 0].map((d) => ({ date: dateDaysAgo(d), energy: 9, clarity: 7, stress: 4, sleep: 7 })),
    bioBaselineRecovery30d: 65,
    bio: {
      series: [2, 1, 0].map((d) => ({ date: dateDaysAgo(d), recovery_score: 35, signal_confidence: 0.7 })) as any,
      latestInsight: { coherence_state: 'unstable' } as any,
      connections: [{ provider: 'whoop', is_active: true } as any],
    },
  });

  it('dispara cuando energía alta + recovery < 80% baseline + coherence inestable', () => {
    const it = detectEnergyVsRecoveryStreak(baseBundle(), NOW);
    expect(it).not.toBeNull();
    expect(it!.dimension).toBe('state');
    expect(it!.severity).toBe('medium');
  });

  it('skip si recovery >= 80% baseline (su normal)', () => {
    const b = baseBundle();
    b.bio = { ...b.bio!, series: b.bio!.series!.map((s) => ({ ...s, recovery_score: 58 })) as any };
    expect(detectEnergyVsRecoveryStreak(b, NOW)).toBeNull();
  });

  it('skip si coherence_state stable (cuerpo no luchando)', () => {
    const b = baseBundle();
    b.bio!.latestInsight = { coherence_state: 'stable' } as any;
    expect(detectEnergyVsRecoveryStreak(b, NOW)).toBeNull();
  });

  it('skip si baseline < 30 datos', () => {
    const b = baseBundle();
    b.bioBaselineRecovery30d = 20;
    expect(detectEnergyVsRecoveryStreak(b, NOW)).toBeNull();
  });

  it('skip si energía promedio < 8', () => {
    const b = baseBundle();
    b.recentCheckIns = b.recentCheckIns.map((c) => ({ ...c, energy: 6 }));
    expect(detectEnergyVsRecoveryStreak(b, NOW)).toBeNull();
  });
});

// ─── Detector: silent_withdrawal_5d ──────────────────────────────────────────
describe('detectSilentWithdrawal', () => {
  it('dispara con 6 días de silencio en TODOS los canales', () => {
    const it = detectSilentWithdrawal(makeBundle({
      recentCheckIns: [{ date: dateDaysAgo(7), energy: 5, clarity: 5, stress: 5, sleep: 5 }],
      lastMentorMsgAt: isoDaysAgo(8),
      lastAppOpenAt: isoDaysAgo(6),
    }), NOW);
    expect(it).not.toBeNull();
    expect(it!.severity).toBe('high');
    expect(it!.evidence.gap_metric.days_silent).toBeGreaterThanOrEqual(5);
  });

  it('critical si >=8 días', () => {
    const it = detectSilentWithdrawal(makeBundle({
      lastMentorMsgAt: isoDaysAgo(10),
      lastAppOpenAt: isoDaysAgo(9),
    }), NOW);
    expect(it!.severity).toBe('critical');
  });

  it('skip si app abierta hace 1 día (uso pasivo)', () => {
    expect(detectSilentWithdrawal(makeBundle({
      lastMentorMsgAt: isoDaysAgo(10),
      lastAppOpenAt: isoDaysAgo(1),
    }), NOW)).toBeNull();
  });

  it('skip si mood reciente bajo en journal (cliente vulnerable)', () => {
    const b = makeBundle({
      lastMentorMsgAt: isoDaysAgo(10),
      lastAppOpenAt: isoDaysAgo(9),
    });
    b.activityBundle!.journal = [{ id: 'j1', content: 'mal', entry_type: 'reflection', mood_score: 3, created_at: isoDaysAgo(2) }];
    expect(detectSilentWithdrawal(b, NOW)).toBeNull();
  });

  it('skip si onboarding < 14 días', () => {
    expect(detectSilentWithdrawal(makeBundle({
      lastMentorMsgAt: isoDaysAgo(10),
      onboardingCompletedAt: isoDaysAgo(7),
    }), NOW)).toBeNull();
  });
});

// ─── Detector: mentor_contact_gap_vs_focus ───────────────────────────────────
describe('detectMentorContactGap', () => {
  const explicitFocus = 'Quiero soporte cercano y conversaciones frecuentes con Norman';

  it('dispara con focus explícito + gap >= 10d', () => {
    const it = detectMentorContactGap(makeBundle({
      profile: { mentorship_focus: explicitFocus } as any,
      lastMentorMsgAt: isoDaysAgo(12),
    }), NOW);
    expect(it).not.toBeNull();
    expect(it!.severity).toBe('high');
  });

  it('critical si gap >= 15', () => {
    const it = detectMentorContactGap(makeBundle({
      profile: { mentorship_focus: explicitFocus } as any,
      lastMentorMsgAt: isoDaysAgo(18),
    }), NOW);
    expect(it!.severity).toBe('critical');
  });

  it('skip si focus menciona autonomía (cliente lo prefiere así)', () => {
    expect(detectMentorContactGap(makeBundle({
      profile: { mentorship_focus: 'trabajar mi autonomía sin guía' } as any,
      lastMentorMsgAt: isoDaysAgo(20),
    }), NOW)).toBeNull();
  });

  it('skip si focus no menciona soporte cercano explícito', () => {
    expect(detectMentorContactGap(makeBundle({
      profile: { mentorship_focus: 'enfocarse en el módulo' } as any,
      lastMentorMsgAt: isoDaysAgo(20),
    }), NOW)).toBeNull();
  });

  it('skip si sesión presencial reciente (<=7d)', () => {
    expect(detectMentorContactGap(makeBundle({
      profile: { mentorship_focus: explicitFocus } as any,
      lastMentorMsgAt: isoDaysAgo(15),
      lastMentorshipSessionAt: isoDaysAgo(3),
    }), NOW)).toBeNull();
  });
});

// ─── Detector: habit_streak_abandoned ────────────────────────────────────────
describe('detectHabitStreakAbandoned', () => {
  function bundleWithHabit(over: { best_streak?: number; ageDays?: number; lastCompletedDaysAgo?: number; failedRecent?: number } = {}): ConfrontationBundle {
    const habit = {
      id: 'h1', name: 'Meditación matutina', category: 'morning',
      streak: 0, best_streak: over.best_streak ?? 34,
      is_active: true, created_at: isoDaysAgo(over.ageDays ?? 90),
    };
    const logs: any[] = [];
    if (over.lastCompletedDaysAgo !== undefined) {
      logs.push({ habit_id: 'h1', date: dateDaysAgo(over.lastCompletedDaysAgo), completed: true, notes: null });
    }
    for (let i = 0; i < (over.failedRecent ?? 0); i++) {
      logs.push({ habit_id: 'h1', date: dateDaysAgo(i + 1), completed: false, notes: null });
    }
    // Otro hábito con logs recientes para no caer en "desconexión global".
    logs.push({ habit_id: 'h_other', date: dateDaysAgo(1), completed: true, notes: null });
    const b = makeBundle();
    b.activityBundle!.habits = [habit, { id: 'h_other', name: 'Caminar', category: 'afternoon', streak: 0, best_streak: 30, is_active: true, created_at: isoDaysAgo(90) }];
    b.activityBundle!.habitLogs = logs;
    return b;
  }

  it('dispara con best_streak>=14 + 11 días sin completar', () => {
    const items = detectHabitStreakAbandoned(bundleWithHabit({ lastCompletedDaysAgo: 11 }), NOW);
    expect(items).toHaveLength(1);
    expect(items[0].dimension).toBe('behavior');
    expect(items[0].severity).toBe('high');
  });

  it('critical si >= 14 días', () => {
    const items = detectHabitStreakAbandoned(bundleWithHabit({ lastCompletedDaysAgo: 16 }), NOW);
    expect(items[0].severity).toBe('critical');
  });

  it('skip si best_streak < 14 (no es identidad)', () => {
    expect(detectHabitStreakAbandoned(bundleWithHabit({ best_streak: 8, lastCompletedDaysAgo: 11 }), NOW)).toEqual([]);
  });

  it('skip si hábito creado hace <21 días', () => {
    expect(detectHabitStreakAbandoned(bundleWithHabit({ ageDays: 10, lastCompletedDaysAgo: 11 }), NOW)).toEqual([]);
  });

  it('skip si cliente está peleando (logs failed recientes >=2)', () => {
    expect(detectHabitStreakAbandoned(bundleWithHabit({ lastCompletedDaysAgo: 8, failedRecent: 2 }), NOW)).toEqual([]);
  });
});

// ─── Detector: commitments_drift ────────────────────────────────────────────
describe('detectCommitmentsDrift', () => {
  const explicitCommitment = (text: string, daysAgo: number) => ({
    id: text.toLowerCase().slice(0, 80), text, created_at: isoDaysAgo(daysAgo), strength: 'explicit',
  });

  it('dispara con 1 commitment explícito 20d viejo sin task ni actividad', () => {
    const it = detectCommitmentsDrift(makeBundle({
      profile: { commitments_open: [explicitCommitment('Voy a meditar 20 min cada mañana, no negociable', 20)] } as any,
    }), NOW);
    expect(it).not.toBeNull();
    expect(it!.severity).toBe('medium');
    expect(it!.evidence.gap_metric.untracked_count).toBe(1);
  });

  it('high con 2 commitments untracked', () => {
    const it = detectCommitmentsDrift(makeBundle({
      profile: { commitments_open: [
        explicitCommitment('Voy a meditar 20 min cada mañana, no negociable', 20),
        explicitCommitment('Me comprometo a correr 5km los lunes y jueves', 25),
      ] } as any,
    }), NOW);
    expect(it!.severity).toBe('high');
  });

  it('skip commitments sin obligación fuerte (palabras blandas)', () => {
    expect(detectCommitmentsDrift(makeBundle({
      profile: { commitments_open: [{ id: 'x', text: 'tal vez intente respirar más', created_at: isoDaysAgo(30) }] } as any,
    }), NOW)).toBeNull();
  });

  it('skip commitments con <14d (gracia)', () => {
    expect(detectCommitmentsDrift(makeBundle({
      profile: { commitments_open: [explicitCommitment('Voy a meditar 20 min cada mañana, no negociable', 5)] } as any,
    }), NOW)).toBeNull();
  });

  it('skip commitments con >60d (probable reemplazo)', () => {
    expect(detectCommitmentsDrift(makeBundle({
      profile: { commitments_open: [explicitCommitment('Voy a meditar 20 min cada mañana, no negociable', 90)] } as any,
    }), NOW)).toBeNull();
  });

  it('skip si actividad reciente matchea keyword (cliente lo hace fuera del tracker)', () => {
    const b = makeBundle({
      profile: { commitments_open: [explicitCommitment('Voy a meditar 20 min cada mañana, no negociable', 20)] } as any,
    });
    b.activityBundle!.wellness = [{
      id: 'w1', type: 'meditation', session_name: 'AM', duration_seconds: 1200, completed_at: isoDaysAgo(3),
    }];
    expect(detectCommitmentsDrift(b, NOW)).toBeNull();
  });

  it('skip si hay task con source_id matching', () => {
    const c = explicitCommitment('Voy a meditar 20 min cada mañana, no negociable', 20);
    expect(detectCommitmentsDrift(makeBundle({
      profile: { commitments_open: [c] } as any,
      tasks: [{ title: 'Meditar AM', source_id: c.id }] as any,
    }), NOW)).toBeNull();
  });
});

// ─── Adapter: false_compliance ───────────────────────────────────────────────
describe('adaptFalseComplianceIntervention', () => {
  it('dispara solo si queue_reason=false_compliance + tasks offending', () => {
    const taskOld = {
      title: 'X', status: 'completed', evidence_required: true, evidence_payload: null,
      completed_at: isoDaysAgo(5),
    } as any;
    const otherTaskWithEvidence = {
      title: 'Y', status: 'completed', evidence_required: true, evidence_payload: { proof: 'x' },
    } as any;
    const r = adaptFalseComplianceIntervention(
      { queue_reason: 'false_compliance', severity: 'high', summary: '3 tasks vacías', recommended_action: 'review' },
      [taskOld, otherTaskWithEvidence],
      NOW,
    );
    expect(r).not.toBeNull();
    expect(r!.dimension).toBe('commitments');
    expect(r!.severity).toBe('high');
  });

  it('skip si ninguna task histórica usó evidence_payload (feature no usada)', () => {
    const r = adaptFalseComplianceIntervention(
      { queue_reason: 'false_compliance', severity: 'high', summary: '', recommended_action: '' },
      [{ title: 'X', status: 'completed', evidence_required: true, evidence_payload: null } as any],
      NOW,
    );
    expect(r).toBeNull();
  });

  it('skip si todas las offending están en ventana de gracia <3d', () => {
    const recentOffender = {
      title: 'X', status: 'completed', evidence_required: true, evidence_payload: null,
      completed_at: isoDaysAgo(1),
    } as any;
    const otherWithEvidence = { title: 'Y', status: 'completed', evidence_required: true, evidence_payload: { p: 1 } } as any;
    const r = adaptFalseComplianceIntervention(
      { queue_reason: 'false_compliance', severity: 'high', summary: '', recommended_action: '' },
      [recentOffender, otherWithEvidence],
      NOW,
    );
    expect(r).toBeNull();
  });
});

// ─── Adapter: high_attention → program_drift ─────────────────────────────────
describe('adaptHighAttentionIntervention', () => {
  it('dispara con módulo activo + 12d sin lección + <3 tareas completadas en 14d', () => {
    const r = adaptHighAttentionIntervention(
      { queue_reason: 'high_attention', severity: 'high', summary: '', recommended_action: '' },
      {
        activeModuleTitle: 'Guerrero',
        lastLessonCompletedAt: isoDaysAgo(12),
        tasks: [],
        scores: null,
        activeModuleProgress: 30,
        profile: null,
      },
      NOW,
    );
    expect(r).not.toBeNull();
    expect(r!.severity).toBe('high');
  });

  it('skip si >=3 tareas completadas en 14d (integrando)', () => {
    const completedTasks = [1, 5, 9].map((d) => ({ title: 't', status: 'completed', completed_at: isoDaysAgo(d) } as any));
    const r = adaptHighAttentionIntervention(
      { queue_reason: 'high_attention', severity: 'high', summary: '', recommended_action: '' },
      {
        activeModuleTitle: 'Guerrero', lastLessonCompletedAt: isoDaysAgo(12),
        tasks: completedTasks, scores: null, activeModuleProgress: 30, profile: null,
      },
      NOW,
    );
    expect(r).toBeNull();
  });

  it('skip si progreso del módulo >= 95', () => {
    expect(adaptHighAttentionIntervention(
      { queue_reason: 'high_attention', severity: 'high', summary: '', recommended_action: '' },
      { activeModuleTitle: 'X', lastLessonCompletedAt: isoDaysAgo(12), tasks: [], scores: null, activeModuleProgress: 97, profile: null },
      NOW,
    )).toBeNull();
  });
});

// ─── Integración + sort + dedup + dismissals ────────────────────────────────
// ─── Presence Protocol — honeymoon + estado emocional comprometido ───────────
describe('Presence Protocol — isInHoneymoon / isInCompromisedEmotionalState', () => {
  // Bundle que normalmente dispara silent_withdrawal_5d (engagement).
  const withdrawalBundle = (over: Partial<ConfrontationBundle> = {}) =>
    makeBundle({
      onboardingCompletedAt: isoDaysAgo(30),
      lastMentorMsgAt: isoDaysAgo(10),
      lastAppOpenAt: isoDaysAgo(9),
      recentCheckIns: [{ date: dateDaysAgo(9), energy: 7, clarity: 7, stress: 4, sleep: 7 }],
      ...over,
    });

  it('honeymoon (< 7 días desde onboarding) bloquea toda confrontación', () => {
    const r = buildConfrontations(withdrawalBundle({ onboardingCompletedAt: isoDaysAgo(3) }), NOW);
    expect(r.items).toEqual([]);
    expect(r.skipped[0].reason).toBe('honeymoon_period');
  });

  it('energía promedio <= 3 bloquea con reason low_energy_or_high_stress', () => {
    const r = buildConfrontations(withdrawalBundle({
      recentCheckIns: [
        { date: dateDaysAgo(0), energy: 3, clarity: 5, stress: 4, sleep: 6 },
        { date: dateDaysAgo(1), energy: 2, clarity: 5, stress: 4, sleep: 6 },
        { date: dateDaysAgo(2), energy: 3, clarity: 5, stress: 4, sleep: 6 },
      ],
    }), NOW);
    expect(r.items).toEqual([]);
    expect(r.skipped[0].reason).toBe('low_energy_or_high_stress');
  });

  it('estrés del check-in más reciente >= 8 bloquea', () => {
    const r = buildConfrontations(withdrawalBundle({
      recentCheckIns: [
        { date: dateDaysAgo(0), energy: 7, clarity: 6, stress: 9, sleep: 6 },
        { date: dateDaysAgo(1), energy: 7, clarity: 6, stress: 4, sleep: 6 },
        { date: dateDaysAgo(2), energy: 7, clarity: 6, stress: 4, sleep: 6 },
      ],
    }), NOW);
    expect(r.items).toEqual([]);
    expect(r.skipped[0].reason).toBe('low_energy_or_high_stress');
  });

  it('usuario sano (energía alta, estrés bajo, > 7 días) NO bloquea — confronta', () => {
    const r = buildConfrontations(withdrawalBundle(), NOW);
    expect(r.items.find((i) => i.id === 'silent_withdrawal_5d')).toBeDefined();
  });

  it('isInHoneymoon: límite exacto en 7 días no es honeymoon', () => {
    expect(isInHoneymoon(makeBundle({ onboardingCompletedAt: isoDaysAgo(7) }), NOW)).toBe(false);
    expect(isInHoneymoon(makeBundle({ onboardingCompletedAt: isoDaysAgo(6) }), NOW)).toBe(true);
  });

  it('isInCompromisedEmotionalState: sin check-ins → false', () => {
    expect(isInCompromisedEmotionalState(makeBundle({ recentCheckIns: [] }))).toBe(false);
  });
});

describe('buildConfrontations — integración', () => {
  it('ordena por severity (high > medium) con tiebreak por dimensión state>commitments>behavior>engagement', () => {
    // Escenario: commitments_drift (high, dim=commitments) + sleep_mismatch (medium, dim=state).
    // High > medium asegura commitments_drift PRIMERO aunque sleep tenga dim=state.
    const bundle = makeBundle({
      profile: {
        commitments_open: [
          { id: 'c1', text: 'Voy a meditar 20 min cada mañana, no negociable', created_at: isoDaysAgo(20), strength: 'explicit' },
          { id: 'c2', text: 'Me comprometo a correr 5km los lunes y jueves', created_at: isoDaysAgo(25), strength: 'explicit' },
        ],
      } as any,
      recentCheckIns: [4, 3, 2, 1, 0].map((d) => ({ date: dateDaysAgo(d), energy: 6, clarity: 6, stress: 5, sleep: 8 })),
      bio: {
        series: [4, 3, 2, 1, 0].map((d) => ({ date: dateDaysAgo(d), sleep_score: 40, sleep_duration_min: 300, signal_confidence: 0.7 })) as any,
        latestInsight: null,
        connections: [{ provider: 'oura', is_active: true } as any],
      },
    });
    const r = buildConfrontations(bundle, NOW);
    const idxDrift = r.items.findIndex((i) => i.id === 'commitments_drift');
    const idxSleep = r.items.findIndex((i) => i.id === 'sleep_self_report_vs_wearable');
    expect(idxDrift).toBeGreaterThanOrEqual(0);
    expect(idxSleep).toBeGreaterThanOrEqual(0);
    expect(idxDrift).toBeLessThan(idxSleep);     // high antes que medium
  });

  it('dismissal activo filtra el item', () => {
    const b = makeBundle({
      lastMentorMsgAt: isoDaysAgo(10),
      lastAppOpenAt: isoDaysAgo(9),
      dismissals: [{ item_id: 'silent_withdrawal_5d', dismissed_until: new Date(NOW + 3 * DAY).toISOString() }],
    });
    const r = buildConfrontations(b, NOW);
    expect(r.items.find((i) => i.id === 'silent_withdrawal_5d')).toBeUndefined();
  });

  it('topForMentor solo devuelve severity high+', () => {
    const items: ConfrontationItem[] = [
      { id: 'a', dimension: 'state', severity: 'medium', evidence: { said: null, did: { value: '', detail: '' }, gap_metric: { summary: '' } }, confrontation_prompt: '', skipped: false },
      { id: 'b', dimension: 'engagement', severity: 'high', evidence: { said: null, did: { value: '', detail: '' }, gap_metric: { summary: '' } }, confrontation_prompt: '', skipped: false },
      { id: 'c', dimension: 'commitments', severity: 'critical', evidence: { said: null, did: { value: '', detail: '' }, gap_metric: { summary: '' } }, confrontation_prompt: '', skipped: false },
    ];
    const top = topForMentor(items, 2);
    expect(top.map((i) => i.id)).toEqual(['b', 'c']);
  });
});
