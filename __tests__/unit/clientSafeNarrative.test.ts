/**
 * Contrato de NO-FUGA de la vista cliente.
 *
 * `clientSafeNarrative` es lo único de la inteligencia de coaching que ve el
 * propio usuario. El riesgo real no es que se rompa el render: es que alguien
 * "simplifique" la función a un passthrough de `next_action.why_now` y con eso
 * mande al cliente texto escrito para el coach — en tercera persona y, en la
 * rama biométrica, incrustando `coach_safe_summary`.
 *
 * Estos tests existen para que ese cambio no pueda pasar en verde.
 */
import type { CoachBundle } from '@/lib/coachIntelligenceLogic';
import { clientSafeNarrative, computeCoachIntelligence } from '@/lib/coachIntelligenceLogic';

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

/** Frases marcadas que SOLO deben existir del lado del coach. */
const SECRETO_DEL_COACH = 'RECUPERACION CRITICA — HRV 22 POR DEBAJO DE BASELINE';

const bundleConBiometriaUrgente = (): CoachBundle => ({
  ...emptyBundle(),
  // Usuario ACTIVO a propósito: en `selectNextAction` la rama de silencio
  // (reconnect) se evalúa antes que la biométrica, así que sin turnos
  // recientes el motor devolvería 'reconnect' y nunca llegaríamos a probar
  // la rama de descanso. Esa prioridad es del motor y está bien: a alguien
  // desaparecido primero se le busca.
  user_turns_7d: 6,
  user_turns_prev: 5,
  biometric: {
    intervention_level: 'urgent',
    recovery_state: 'critical',
    coach_safe_summary: SECRETO_DEL_COACH,
    client_safe_summary: 'Tu cuerpo pide descanso hoy.',
  } as CoachBundle['biometric'],
});

describe('clientSafeNarrative — no filtra material del coach', () => {
  it('NO reenvía el coach_safe_summary aunque el motor lo meta en why_now', () => {
    const ci = computeCoachIntelligence(bundleConBiometriaUrgente());

    // Primero: confirmamos que el secreto SÍ está del lado coach. Si esto
    // dejara de ser cierto, el test de abajo pasaría por vacuidad.
    expect(JSON.stringify(ci)).toContain(SECRETO_DEL_COACH);

    const vista = clientSafeNarrative(ci);
    expect(JSON.stringify(vista)).not.toContain(SECRETO_DEL_COACH);
  });

  it('NO expone churn, composite, drivers, narrative ni el guion del coach', () => {
    const ci = computeCoachIntelligence(bundleConBiometriaUrgente());
    const vista = clientSafeNarrative(ci) as Record<string, unknown>;

    // Whitelist dura: exactamente estas tres claves, ni una más.
    expect(Object.keys(vista).sort()).toEqual(['headline', 'momentum', 'why']);

    const texto = JSON.stringify(vista);
    expect(texto).not.toContain(ci.next_action.what_to_say);
    expect(texto).not.toContain(ci.narrative);
    expect(texto).not.toContain(String(ci.churn_risk));
    expect(texto).not.toContain(String(ci.composite_score));
  });

  it('habla en SEGUNDA persona, nunca sobre el usuario en tercera', () => {
    // El texto del coach dice "Lleva N días sin escribir" / "Pregúntale...".
    // Si alguien lo reenviara, estas marcas aparecerían.
    const casos = [
      bundleConBiometriaUrgente(),
      { ...emptyBundle(), days_since_last_message: 21 },
      { ...emptyBundle(), overdue_count: 9, open_tasks_count: 12 },
      emptyBundle(),
    ];
    for (const b of casos) {
      const v = clientSafeNarrative(computeCoachIntelligence(b));
      const texto = `${v.headline} ${v.why}`;
      expect(texto).not.toMatch(/Pregúntale|Reconoce el avance|Mándale|pídele|Tiene \d/i);
      expect(texto.length).toBeGreaterThan(0);
    }
  });

  it('el descanso del cuerpo manda sobre celebrar el ascenso', () => {
    // Alguien en ascenso pero con biometría urgente no debe recibir un
    // "vas hacia arriba" que le empuje justo cuando necesita frenar.
    const v = clientSafeNarrative(
      computeCoachIntelligence({ ...bundleConBiometriaUrgente(), completed_tasks_7d: 12, completed_tasks_prev: 2 }),
    );
    expect(v.headline).toContain('bajar carga');
  });

  it('siempre devuelve titular y porqué, sea cual sea la entrada', () => {
    const v = clientSafeNarrative(computeCoachIntelligence(emptyBundle()));
    expect(v.headline.length).toBeGreaterThan(0);
    expect(v.why.length).toBeGreaterThan(0);
  });
});
