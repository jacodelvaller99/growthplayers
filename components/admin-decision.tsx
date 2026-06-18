/**
 * Admin Decision — UI de la inteligencia de decisión del admin (Cluster A).
 *
 * Reusa PremiumCard + tokens del design system Polaris. Componentes:
 *   - WellbeingAlarmCard: semáforo de "cómo se va sintiendo" el cliente (sección G).
 *   - WellbeingDot:       punto de color por check-in según su % de bienestar.
 *   - NoteBadge:          badge de notas privadas para impregnar en filas de usuario.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

import { PremiumCard } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import {
  TREND_LABEL,
  WELLBEING_STATE_LABEL,
  wellbeingState,
  type AlarmLevel,
  type WellbeingAlarm,
  type WellbeingState,
} from '@/lib/wellbeingLogic';

// ─── Colores ────────────────────────────────────────────────────────────────────

function alarmColor(level: AlarmLevel): string {
  if (level === 'critical') return palette.danger;
  if (level === 'high') return palette.warning;
  if (level === 'watch') return palette.goldText;
  return palette.success;
}

function stateColor(state: WellbeingState | null): string {
  if (state === 'critical') return palette.danger;
  if (state === 'low') return palette.warning;
  if (state === 'fair') return palette.goldText;
  if (state === 'good') return palette.success;
  return palette.smoke;
}

const ALARM_LABEL: Record<AlarmLevel, string> = {
  critical: 'ALARMA CRÍTICA',
  high: 'ATENDER',
  watch: 'OBSERVAR',
  none: 'ESTABLE',
};

const ALARM_ICON: Record<AlarmLevel, string> = {
  critical: 'error',
  high: 'warning',
  watch: 'visibility',
  none: 'check-circle',
};

// ─── WellbeingAlarmCard ─────────────────────────────────────────────────────────

export function WellbeingAlarmCard({ alarm }: { alarm: WellbeingAlarm }) {
  const color = alarmColor(alarm.level);
  const pct = alarm.current;
  const pctColor = stateColor(wellbeingState(pct));

  return (
    <PremiumCard style={[s.alarmCard, { borderColor: color, borderWidth: 1 }]}>
      <View style={s.alarmHead}>
        <View style={s.alarmEyebrowRow}>
          <MaterialIcons name={ALARM_ICON[alarm.level] as never} size={16} color={color} />
          <Text style={[s.alarmEyebrow, { color }]}>{ALARM_LABEL[alarm.level]}</Text>
        </View>
        <View style={s.pctWrap}>
          <Text style={[s.pctNum, { color: pctColor }]}>{pct ?? '—'}</Text>
          <Text style={s.pctSign}>{pct !== null ? '%' : ''}</Text>
        </View>
      </View>
      <Text style={s.alarmReason}>{alarm.reason}</Text>
      <Text style={s.alarmTrend}>Tendencia: {TREND_LABEL[alarm.trend]}</Text>
    </PremiumCard>
  );
}

// ─── WellbeingDot (por fila de check-in) ────────────────────────────────────────

export function WellbeingDot({ score }: { score: number | null }) {
  const color = stateColor(wellbeingState(score));
  return <View style={[s.dot, { backgroundColor: color }]} accessibilityLabel={score !== null ? `Bienestar ${score}%` : 'Sin datos'} />;
}

// ─── NoteBadge (notas privadas cross-space) ─────────────────────────────────────

export function NoteBadge({ count, preview }: { count: number; preview?: string | null }) {
  if (!count) return null;
  return (
    <View style={s.noteBadge} accessibilityLabel={`${count} nota${count === 1 ? '' : 's'} privada${count === 1 ? '' : 's'}${preview ? `: ${preview}` : ''}`}>
      <MaterialIcons name="sticky-note-2" size={11} color={palette.goldText} />
      <Text style={s.noteBadgeNum}>{count}</Text>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  alarmCard: { gap: spacing.xs, marginBottom: spacing.sm },
  alarmHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  alarmEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  alarmEyebrow: { ...typography.label, fontSize: 10, letterSpacing: 1 },
  pctWrap: { flexDirection: 'row', alignItems: 'baseline' },
  pctNum: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 30 },
  pctSign: { ...typography.label, color: palette.smoke, fontSize: 12 },
  alarmReason: { ...typography.body, color: palette.ivory, fontSize: 13, lineHeight: 19 },
  alarmTrend: { ...typography.caption, color: palette.ash, fontSize: 11, fontStyle: 'italic' },

  dot: { width: 8, height: 8, borderRadius: 4 },

  noteBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: palette.goldLight, borderRadius: radii.pill,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  noteBadgeNum: { ...typography.label, color: palette.goldText, fontSize: 10 },
});
