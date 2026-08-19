/**
 * jornada — la misión del día en pantalla.
 *
 * `JornadaTracker` es la evolución del bloque EL TURNO de Comando: los cuatro
 * pasos del día (LÉETE → EJECUTA → REGULA → CIERRA) con el actual en oro y
 * los hechos con check, y debajo el turno de siempre — titular, dato, porqué
 * y UN solo verbo. Sobrio a propósito: checks monocromos, cero confeti, cero
 * puntos. El oro solo marca el paso que toca AHORA, que es la gramática de
 * marca ("el oro se gana").
 *
 * `JornadaCierre` es el fin de jornada: se monta en el diario al guardar la
 * nota del día — la pantalla que antes era el sumidero del loop (tres caminos
 * entraban, ninguno salía) ahora devuelve un cierre con lo hecho, el delta
 * del día y la frase del arco, y un solo botón de vuelta al Comando.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { MilestoneToast } from '@/components/narrative';
import { GoldAccentCard, PremiumCard, PrimaryButton, SecondaryButton } from '@/components/polaris';
import { Fonts, palette, spacing, typography } from '@/constants/theme';
import { JORNADA_LABEL, JORNADA_STEPS, type Jornada } from '@/lib/jornadaLogic';
import type { Milestone } from '@/lib/narrativeLogic';
import type { Turno } from '@/lib/turnoLogic';

// ── La fila de pasos ──────────────────────────────────────────────────────────

function StepsRow({ jornada }: { jornada: Jornada }) {
  return (
    <View style={s.stepsRow} accessibilityRole="none">
      {jornada.steps.map(({ step, state }, i) => {
        const isCurrent = state === 'current';
        const isDone = state === 'done';
        return (
          <View key={step} style={s.stepCol}>
            <View style={s.stepTop}>
              {i > 0 && <View style={[s.connector, isDone && s.connectorDone]} />}
              <View
                style={[s.stepDot, isCurrent && s.stepDotCurrent, isDone && s.stepDotDone]}
                accessible
                accessibilityLabel={`${JORNADA_LABEL[step]}: ${
                  isDone ? 'hecho' : isCurrent ? 'paso actual' : 'pendiente'
                }`}>
                {isDone ? (
                  <MaterialIcons name="check" size={13} color={palette.ivory} />
                ) : (
                  <Text style={[s.stepNum, isCurrent && s.stepNumCurrent]}>{i + 1}</Text>
                )}
              </View>
            </View>
            <Text style={[s.stepLabel, isCurrent && s.stepLabelCurrent, isDone && s.stepLabelDone]}>
              {JORNADA_LABEL[step]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── El tracker (Comando) ──────────────────────────────────────────────────────

export interface JornadaTrackerProps {
  /** Sin marco propio: para usarlo dentro del panel del héroe. */
  flat?: boolean;
  /** `null` mientras el log local carga — se renderiza el turno clásico. */
  jornada: Jornada | null;
  turno: Turno;
  onPressCta: () => void;
  /** La frase del arco para el estado "jornada completa". */
  arcPhrase?: string;
}

export function JornadaTracker({ jornada, turno, onPressCta, arcPhrase, flat }: JornadaTrackerProps) {
  // `flat`: el tracker vive DENTRO del panel del héroe, que ya pone el marco.
  // Sin esto queda una tarjeta dentro de otra, que no agrupa — subdivide.
  const chrome = flat ? { backgroundColor: 'transparent', borderWidth: 0, padding: 0 } : undefined;
  if (jornada?.complete) {
    // El día está hecho. Sin fanfarria: los cuatro checks, la frase del arco
    // (que ya habla en segunda persona) y una salida serena a progreso.
    return (
      <GoldAccentCard style={chrome} accessibilityLabel="Jornada completa">
        <Text style={s.mandoLabel}>TU JORNADA</Text>
        <StepsRow jornada={jornada} />
        <Text style={s.mandoText}>{turno.headline}</Text>
        {arcPhrase ? <Text style={s.mandoCaption}>{arcPhrase}</Text> : (
          <Text style={s.mandoCaption}>{turno.why}</Text>
        )}
        <SecondaryButton label={turno.verb} icon="insights" onPress={onPressCta} />
      </GoldAccentCard>
    );
  }

  return (
    <GoldAccentCard style={chrome}
      onPress={onPressCta}
      accessibilityRole="button"
      accessibilityLabel={`${turno.headline}. ${turno.why}`}>
      <Text style={s.mandoLabel}>TU JORNADA</Text>
      {jornada && <StepsRow jornada={jornada} />}
      <Text style={s.mandoText}>{turno.headline}</Text>
      {/* El delta primero: es lo único que el usuario no podía saber solo. */}
      {turno.delta && <Text style={s.mandoDelta}>{turno.delta}</Text>}
      <Text style={s.mandoCaption}>{turno.why}</Text>
      <View style={s.mandoCta}>
        <Text style={s.mandoCtaText}>{turno.verb}</Text>
        <MaterialIcons name="arrow-forward" size={16} color={palette.goldText} />
      </View>
    </GoldAccentCard>
  );
}

// ── El cierre (diario) ────────────────────────────────────────────────────────

export interface JornadaCierreProps {
  jornada: Jornada;
  /** `deltaSince` de hoy contra el registro anterior, si existe. */
  delta: string | null;
  /** `arcForDay(...).line` — la frase del arco de 90 días. */
  arcPhrase: string;
  milestone?: Milestone | null;
  onVolver: () => void;
}

export function JornadaCierre({ jornada, delta, arcPhrase, milestone, onVolver }: JornadaCierreProps) {
  return (
    <View style={s.cierreRoot}>
      <MilestoneToast milestone={milestone ?? null} />
      <PremiumCard style={s.cierreCard}>
        <Text style={s.mandoLabel}>JORNADA CERRADA</Text>
        <StepsRow jornada={jornada} />
        {delta ? <Text style={s.cierreDelta}>{delta}</Text> : null}
        <Text style={s.cierreArc}>{arcPhrase}</Text>
        <PrimaryButton label="VOLVER AL COMANDO" icon="dashboard" onPress={onVolver} />
      </PremiumCard>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const DOT = 26;

const s = StyleSheet.create({
  // Los mando* replican los del bloque EL TURNO que este componente absorbe
  // (comando.tsx) — misma voz visual, ahora en un solo sitio.
  mandoLabel: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.goldText,
    fontSize: 11,
    letterSpacing: 2,
  },
  mandoText: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 31,
    marginTop: spacing.sm,
  },
  mandoDelta: {
    ...typography.mono,
    color: palette.goldText,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  mandoCaption: {
    ...typography.body,
    color: palette.ash,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  mandoCta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  mandoCtaText: {
    color: palette.goldText,
    fontFamily: Fonts.display,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  stepsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  stepCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  stepTop: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  // La línea que une un paso con el anterior — se pinta a la izquierda de
  // cada punto (salvo el primero) para que la fila lea como un camino.
  connector: {
    backgroundColor: palette.line,
    height: 1,
    left: 0,
    position: 'absolute',
    right: '50%',
    marginRight: DOT / 2,
  },
  connectorDone: {
    backgroundColor: palette.goldText,
    opacity: 0.5,
  },
  stepDot: {
    alignItems: 'center',
    borderColor: palette.line,
    borderRadius: DOT / 2,
    borderWidth: 1,
    height: DOT,
    justifyContent: 'center',
    width: DOT,
  },
  stepDotCurrent: {
    borderColor: palette.gold,
    borderWidth: 2,
  },
  stepDotDone: {
    backgroundColor: palette.graphite,
    borderColor: palette.smoke,
  },
  stepNum: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 11,
  },
  stepNumCurrent: {
    color: palette.goldText,
    fontWeight: '700',
  },
  stepLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  stepLabelCurrent: {
    color: palette.goldText,
  },
  stepLabelDone: {
    color: palette.ash,
  },

  cierreRoot: {
    gap: spacing.md,
  },
  cierreCard: {
    gap: spacing.md,
  },
  cierreDelta: {
    ...typography.mono,
    color: palette.goldText,
    fontSize: 12,
  },
  cierreArc: {
    ...typography.statement,
    color: palette.ivory,
  },
});
