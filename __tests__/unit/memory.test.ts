/**
 * memoryLogic — tests de la lógica pura del Memory OS (sin IO).
 * Cubre: síntesis del perfil vivo, parseo tolerante de resúmenes, vista cliente,
 * y ensamblado del contexto de Norman (que NUNCA debe filtrar capa admin).
 */
import {
  assembleMentorMemory,
  clientSafeProfile,
  mergeMemoryProfile,
  parseSummaryBlocks,
  type MemoryProfile,
} from '@/lib/memoryLogic';

describe('mergeMemoryProfile — síntesis acumulativa pero acotada', () => {
  it('la actualización pisa texto solo si trae contenido', () => {
    const existing: MemoryProfile = { identity_summary: 'Fundador disciplinado', current_goal: 'Cerrar ronda' };
    const merged = mergeMemoryProfile(existing, { current_goal: 'Escalar a 1M ARR' });
    expect(merged.identity_summary).toBe('Fundador disciplinado'); // conserva
    expect(merged.current_goal).toBe('Escalar a 1M ARR');          // pisa
  });

  it('texto vacío en la actualización NO borra el existente', () => {
    const merged = mergeMemoryProfile({ current_goal: 'Cerrar ronda' }, { current_goal: '   ' });
    expect(merged.current_goal).toBe('Cerrar ronda');
  });

  it('listas: unión deduplicada (case-insensitive), lo nuevo primero', () => {
    const existing: MemoryProfile = { recurring_blockers: ['Procrastinación', 'Perfeccionismo'] };
    const merged = mergeMemoryProfile(existing, { recurring_blockers: ['procrastinación', 'Delegar'] });
    expect(merged.recurring_blockers).toEqual(['procrastinación', 'Delegar', 'Perfeccionismo']);
  });

  it('capea recent_wins a 8 (anti-bloat)', () => {
    const incoming = { recent_wins: Array.from({ length: 12 }, (_, i) => `win-${i}`) };
    const merged = mergeMemoryProfile({}, incoming);
    expect(merged.recent_wins).toHaveLength(8);
  });

  it('mueve compromisos open→completed cuando llegan como completados', () => {
    const existing: MemoryProfile = {
      commitments_open: [
        { id: 'c1', text: 'Delegar finanzas' },
        { id: 'c2', text: 'Dormir 7h' },
      ],
    };
    const merged = mergeMemoryProfile(existing, {
      commitments_completed: [{ id: 'c1', text: 'Delegar finanzas', completed_at: '2026-06-15' }],
    });
    expect(merged.commitments_open?.map((c) => c.id)).toEqual(['c2']);
    expect(merged.commitments_completed?.map((c) => c.id)).toContain('c1');
  });

  it('acepta compromisos como strings y los normaliza a objetos {id,text}', () => {
    const merged = mergeMemoryProfile({}, { commitments_open: ['Hacer cardio'] as never });
    expect(merged.commitments_open?.[0].text).toBe('Hacer cardio');
    expect(merged.commitments_open?.[0].id).toBeTruthy();
  });

  it('no rompe con entradas null/undefined', () => {
    expect(() => mergeMemoryProfile(null, null)).not.toThrow();
    const merged = mergeMemoryProfile(null, null);
    expect(merged.commitments_open).toEqual([]);
    expect(merged.recent_wins).toEqual([]);
  });
});

describe('parseSummaryBlocks — parser tolerante', () => {
  const structured = [
    '===RESUMEN===',
    'Sesión enfocada en delegación y miedo a soltar control.',
    '===TEMAS===',
    '- Delegación',
    '- Control',
    '===COMPROMISOS===',
    '- Contratar un COO en 30 días',
    '===PREGUNTAS===',
    '- ¿Qué tareas son indelegables de verdad?',
    '===TONO===',
    'Determinado pero ansioso',
    '===FOCO===',
    'Diseñar el primer organigrama',
  ].join('\n');

  it('extrae todas las secciones etiquetadas', () => {
    const p = parseSummaryBlocks(structured);
    expect(p.summary).toContain('delegación');
    expect(p.key_topics).toEqual(['Delegación', 'Control']);
    expect(p.commitments).toEqual(['Contratar un COO en 30 días']);
    expect(p.unresolved_questions[0]).toContain('indelegables');
    expect(p.emotional_tone).toBe('Determinado pero ansioso');
    expect(p.suggested_next_focus).toBe('Diseñar el primer organigrama');
  });

  it('degrada: sin marcadores, todo el texto es el resumen', () => {
    const p = parseSummaryBlocks('Solo una nota suelta sin estructura.');
    expect(p.summary).toBe('Solo una nota suelta sin estructura.');
    expect(p.key_topics).toEqual([]);
  });

  it('tolera secciones faltantes', () => {
    const p = parseSummaryBlocks('===RESUMEN===\nBreve.\n===FOCO===\nSeguir');
    expect(p.summary).toBe('Breve.');
    expect(p.suggested_next_focus).toBe('Seguir');
    expect(p.commitments).toEqual([]);
  });

  it('parte listas en una sola línea separadas por comas', () => {
    const p = parseSummaryBlocks('===TEMAS===\nFoco, Energía, Decisión\n===RESUMEN===\nx');
    expect(p.key_topics).toEqual(['Foco', 'Energía', 'Decisión']);
  });

  it('string vacío → estructura vacía sin throw', () => {
    expect(() => parseSummaryBlocks('')).not.toThrow();
    expect(parseSummaryBlocks('').summary).toBe('');
  });
});

describe('clientSafeProfile — vista de apoyo, sin lo clínico/privado', () => {
  const full: MemoryProfile = {
    identity_summary: 'Fundador',
    current_goal: 'Escalar',
    recent_wins: ['Cerró cliente grande'],
    commitments_open: [{ id: 'c1', text: 'Delegar' }],
    current_risks: ['Burnout inminente'],
    recurring_blockers: ['Evita decisiones'],
    emotional_patterns: ['Ansiedad bajo presión'],
    decision_style: 'Impulsivo',
    health_energy_context: { sleep: 'malo' },
    relationship_context: { socio: 'tenso' },
  };

  it('conserva los campos de apoyo', () => {
    const safe = clientSafeProfile(full);
    expect(safe.identity_summary).toBe('Fundador');
    expect(safe.current_goal).toBe('Escalar');
    expect(safe.recent_wins).toEqual(['Cerró cliente grande']);
    expect(safe.commitments_open?.[0].text).toBe('Delegar');
  });

  it('OMITE riesgos crudos, patrones, estilo, y contexto salud/relaciones', () => {
    const safe = clientSafeProfile(full) as Record<string, unknown>;
    expect(safe.current_risks).toBeUndefined();
    expect(safe.recurring_blockers).toBeUndefined();
    expect(safe.emotional_patterns).toBeUndefined();
    expect(safe.decision_style).toBeUndefined();
    expect(safe.health_energy_context).toBeUndefined();
    expect(safe.relationship_context).toBeUndefined();
  });
});

describe('assembleMentorMemory — contexto para Norman (sin capa admin)', () => {
  const profile: MemoryProfile = {
    identity_summary: 'Fundador analítico',
    current_goal: 'Levantar serie A',
    decision_style: 'Sobre-analiza',
    commitments_open: [
      { id: 'c1', text: 'Llamar a 5 inversores' },
      { id: 'c2', text: 'Definir métrica norte' },
    ],
    recent_wins: ['Lanzó MVP'],
    recurring_blockers: ['Parálisis por análisis'],
    mentorship_focus: 'Ejecución sin sobre-pensar',
  };
  const summaries = [
    {
      summary: 's', key_topics: [], commitments: [],
      unresolved_questions: ['¿Cuál es la métrica que importa?'],
      emotional_tone: 'tenso', suggested_next_focus: 'Elegir 1 métrica y ejecutar',
    },
  ];

  it('compone synopsis, compromisos abiertos, wins, loops y next focus', () => {
    const a = assembleMentorMemory(profile, summaries, [{ content: 'recuerdo X' }]);
    expect(a.synopsis).toContain('Fundador analítico');
    expect(a.synopsis).toContain('Levantar serie A');
    expect(a.openCommitments).toEqual(['Llamar a 5 inversores', 'Definir métrica norte']);
    expect(a.recentWins).toEqual(['Lanzó MVP']);
    expect(a.openLoops).toEqual(['¿Cuál es la métrica que importa?']);
    expect(a.nextFocus).toBe('Elegir 1 métrica y ejecutar');
    expect(a.relevantMemories).toHaveLength(1);
  });

  it('next focus cae al mentorship_focus del perfil si no hay resúmenes', () => {
    const a = assembleMentorMemory(profile, [], []);
    expect(a.nextFocus).toBe('Ejecución sin sobre-pensar');
  });

  it('no rompe con perfil/resúmenes vacíos', () => {
    expect(() => assembleMentorMemory(null, null, null)).not.toThrow();
    const a = assembleMentorMemory(null, null, null);
    expect(a.openCommitments).toEqual([]);
    expect(a.relevantMemories).toEqual([]);
  });
});
