/**
 * Coach Intelligence v2 — UI cards explicables.
 *
 * No inventan diseño: reusan PremiumCard, palette, typography del design system
 * Polaris. Cada card responde una pregunta operativa que el coach hace en vivo:
 *   - ChurnDriversCard:     ¿por qué este score? (drivers con peso y evidencia)
 *   - WeeklyMomentumCard:   ¿va subiendo o bajando? (deltas vs semana previa)
 *   - RelationalDepthCard:  ¿cómo va su relación con Norman? (silenciosa/profunda)
 *   - CoachNextActionCard:  ¿qué le digo esta semana? (acción concreta + por qué)
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { PremiumCard } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import type {
  ChurnDriver,
  CoachIntelligence,
  CoachNextAction,
  RelationalDepth,
  WeeklyMomentum,
} from '@/lib/coachIntelligenceLogic';

// ─── Helpers de color/severidad ────────────────────────────────────────────────

function riskColor(label: 'low' | 'medium' | 'high' | 'critical'): string {
  if (label === 'critical') return palette.danger;
  if (label === 'high') return palette.warning;
  if (label === 'medium') return palette.goldText;
  return palette.success;
}

function urgencyColor(u: CoachNextAction['urgency']): string {
  if (u === 'urgent') return palette.danger;
  if (u === 'high') return palette.warning;
  if (u === 'normal') return palette.goldText;
  return palette.ash;
}

function momentumColor(state: WeeklyMomentum['state']): string {
  if (state === 'rising') return palette.success;
  if (state === 'stable') return palette.ash;
  if (state === 'fragile') return palette.goldText;
  if (state === 'declining') return palette.warning;
  return palette.danger; // critical
}

function depthColor(state: RelationalDepth['state']): string {
  if (state === 'deep') return palette.success;
  if (state === 'open') return palette.goldText;
  if (state === 'transactional') return palette.warning;
  return palette.danger; // silent
}

const MOMENTUM_LABEL: Record<WeeklyMomentum['state'], string> = {
  rising: 'ASCENSO',
  stable: 'ESTABLE',
  fragile: 'FRÁGIL',
  declining: 'CAÍDA',
  critical: 'CRÍTICO',
};

const ACTION_ICON: Record<CoachNextAction['kind'], string> = {
  confront: 'gavel',
  support: 'support-agent',
  celebrate: 'celebration',
  investigate: 'search',
  rest_signal: 'bedtime',
  reconnect: 'forum',
};

// ─── ChurnDriversCard ─────────────────────────────────────────────────────────

export function ChurnDriversCard({ ci }: { ci: CoachIntelligence }) {
  const positives = ci.drivers.filter((d) => d.weight > 0);
  const protectors = ci.drivers.filter((d) => d.weight < 0);
  const color = riskColor(ci.churn_risk_label);

  return (
    <PremiumCard style={s.card}>
      <View style={s.head}>
        <View>
          <Text style={s.eyebrow}>RIESGO DE CHURN · DRIVERS EXPLICABLES</Text>
          <Text style={s.narrative}>{ci.narrative}</Text>
        </View>
        <View style={[s.riskPill, { borderColor: color }]}>
          <Text style={[s.riskPillText, { color }]}>{Math.round(ci.churn_risk * 100)}%</Text>
        </View>
      </View>

      {positives.length === 0 && protectors.length === 0 ? (
        <Text style={s.empty}>Sin señales relevantes esta semana — sigue de cerca el próximo check-in.</Text>
      ) : (
        <View style={s.driversList}>
          {positives.map((d, i) => <DriverRow key={`p-${i}`} driver={d} />)}
          {protectors.length > 0 && (
            <>
              <View style={s.divider} />
              <Text style={s.subhead}>QUÉ PROTEGE</Text>
              {protectors.map((d, i) => <DriverRow key={`g-${i}`} driver={d} protector />)}
            </>
          )}
        </View>
      )}
    </PremiumCard>
  );
}

function DriverRow({ driver, protector }: { driver: ChurnDriver; protector?: boolean }) {
  const w = Math.abs(driver.weight);
  const pct = Math.round(w * 100);
  const fill = protector ? palette.success : (w >= 0.18 ? palette.warning : palette.goldText);
  return (
    <View style={s.driverRow}>
      <View style={s.driverHead}>
        <Text style={s.driverLabel}>{driver.label}</Text>
        <Text style={[s.driverWeight, { color: fill }]}>
          {protector ? '−' : ''}{pct}%
        </Text>
      </View>
      <Text style={s.driverEvidence}>{driver.evidence}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${Math.min(100, pct * 3)}%`, backgroundColor: fill }]} />
      </View>
    </View>
  );
}

// ─── WeeklyMomentumCard ───────────────────────────────────────────────────────

export function WeeklyMomentumCard({ momentum }: { momentum: WeeklyMomentum }) {
  const color = momentumColor(momentum.state);
  return (
    <PremiumCard style={s.card}>
      <View style={s.head}>
        <Text style={s.eyebrow}>MOMENTUM SEMANAL</Text>
        <View style={[s.statePill, { borderColor: color }]}>
          <Text style={[s.statePillText, { color }]}>{MOMENTUM_LABEL[momentum.state]}</Text>
        </View>
      </View>
      <Text style={s.momentumLabel}>{momentum.label}</Text>
      <View style={s.deltaRow}>
        <DeltaTile label="ENERGÍA" value={momentum.delta_checkin} unit="pts" />
        <DeltaTile label="CHATS NORMAN" value={momentum.delta_chat} unit="" />
        <DeltaTile label="TAREAS CERRADAS" value={momentum.delta_tasks} unit="" />
      </View>
    </PremiumCard>
  );
}

function DeltaTile({ label, value, unit }: { label: string; value: number; unit: string }) {
  const v = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  const isUp = v > 0;
  const isDown = v < 0;
  const color = isUp ? palette.success : isDown ? palette.warning : palette.ash;
  const sign = isUp ? '+' : '';
  const shown = Math.abs(v) < 0.05 ? '0' : (Math.round(v * 10) / 10).toString();
  return (
    <View style={s.deltaTile}>
      <Text style={s.deltaTileLabel}>{label}</Text>
      <Text style={[s.deltaTileValue, { color }]}>
        {sign}{shown}{unit ? ` ${unit}` : ''}
      </Text>
    </View>
  );
}

// ─── RelationalDepthCard ──────────────────────────────────────────────────────

export function RelationalDepthCard({ depth }: { depth: RelationalDepth }) {
  const color = depthColor(depth.state);
  return (
    <PremiumCard style={s.card}>
      <View style={s.head}>
        <View>
          <Text style={s.eyebrow}>RELACIÓN CON NORMAN</Text>
          <Text style={[s.depthLabel, { color }]}>{depth.label}</Text>
        </View>
        <View style={s.depthScore}>
          <Text style={[s.depthScoreNum, { color }]}>{depth.score}</Text>
          <Text style={s.depthScoreMax}>/100</Text>
        </View>
      </View>
      <View style={s.depthMetrics}>
        <Text style={s.depthMetric}>
          <Text style={s.depthMetricVal}>{depth.turns_7d}</Text> turnos esta semana
        </Text>
        <Text style={s.depthMetric}>
          ·{' '}
          <Text style={s.depthMetricVal}>
            {Number.isFinite(depth.days_silent) ? depth.days_silent : '∞'}
          </Text>{' '}
          días desde su último mensaje
        </Text>
        <Text style={s.depthMetric}>
          · <Text style={s.depthMetricVal}>{depth.open_commitments}</Text> compromisos abiertos
        </Text>
      </View>
    </PremiumCard>
  );
}

// ─── CoachNextActionCard ──────────────────────────────────────────────────────

export function CoachNextActionCard({ action }: { action: CoachNextAction }) {
  const color = urgencyColor(action.urgency);
  return (
    <PremiumCard style={[s.card, { borderColor: color, borderWidth: 1 }]}>
      <View style={s.head}>
        <View style={s.actionEyebrowRow}>
          <MaterialIcons name={ACTION_ICON[action.kind] as never} size={16} color={color} />
          <Text style={[s.eyebrow, { color }]}>QUÉ DECIRLE ESTA SEMANA</Text>
        </View>
        <View style={[s.urgencyPill, { borderColor: color }]}>
          <Text style={[s.urgencyPillText, { color }]}>{action.urgency.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={s.actionWhat}>{action.what_to_say}</Text>
      <View style={s.actionWhy}>
        <MaterialIcons name="info-outline" size={13} color={palette.smoke} />
        <Text style={s.actionWhyText}>Por qué ahora: {action.why_now}</Text>
      </View>
    </PremiumCard>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  eyebrow: { ...typography.label, color: palette.smoke, fontSize: 10, letterSpacing: 1.2 },
  narrative: { ...typography.body, color: palette.ivory, fontSize: 13, marginTop: 4, lineHeight: 19, maxWidth: 320 },
  empty: { ...typography.caption, color: palette.smoke, fontSize: 12, fontStyle: 'italic' },

  // Risk pill
  riskPill: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  riskPillText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },

  // Drivers list
  driversList: { gap: spacing.sm, marginTop: spacing.xs },
  divider: { height: 1, backgroundColor: palette.line, marginVertical: spacing.xs },
  subhead: { ...typography.label, color: palette.smoke, fontSize: 9, letterSpacing: 1 },
  driverRow: { gap: 4 },
  driverHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  driverLabel: { ...typography.section, color: palette.ivory, fontSize: 12.5, letterSpacing: 0.4 },
  driverWeight: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 12 },
  driverEvidence: { ...typography.caption, color: palette.ash, fontSize: 11.5, lineHeight: 17 },
  barTrack: { height: 4, backgroundColor: palette.charcoal, borderRadius: 2, overflow: 'hidden', marginTop: 2 },
  barFill: { height: 4, borderRadius: 2 },

  // Momentum
  statePill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  statePillText: { ...typography.label, fontSize: 9, letterSpacing: 1 },
  momentumLabel: { ...typography.body, color: palette.ivory, fontSize: 13, lineHeight: 19 },
  deltaRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  deltaTile: {
    flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs,
    backgroundColor: palette.charcoal, borderRadius: radii.sm, gap: 2,
  },
  deltaTileLabel: { ...typography.label, color: palette.smoke, fontSize: 9, letterSpacing: 0.8 },
  deltaTileValue: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 15 },

  // Depth
  depthLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 14, marginTop: 4 },
  depthScore: { flexDirection: 'row', alignItems: 'baseline' },
  depthScoreNum: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 28 },
  depthScoreMax: { ...typography.label, color: palette.smoke, fontSize: 11 },
  depthMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: spacing.xs },
  depthMetric: { ...typography.caption, color: palette.ash, fontSize: 11.5 },
  depthMetricVal: { color: palette.ivory, fontFamily: Fonts.display, fontWeight: '700' },

  // Action
  actionEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  urgencyPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  urgencyPillText: { ...typography.label, fontSize: 9, letterSpacing: 1 },
  actionWhat: { ...typography.body, color: palette.ivory, fontSize: 13.5, lineHeight: 20, marginTop: 4 },
  actionWhy: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: spacing.xs },
  actionWhyText: { ...typography.caption, color: palette.smoke, fontSize: 11, lineHeight: 16, flex: 1, fontStyle: 'italic' },
});
