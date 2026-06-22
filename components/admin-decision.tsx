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
  wellbeingState,
  type AlarmLevel,
  type WellbeingAlarm,
  type WellbeingState,
} from '@/lib/wellbeingLogic';
import type { PracticeSignal, ProtocolFunnel, RetentionStat } from '@/lib/admin/types';

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

// ─── Cuadro de Mando Integral — tarjetas estratégicas ──────────────────────────

function rateColor(rate: number | null): string {
  if (rate === null) return palette.smoke;
  if (rate >= 70) return palette.success;
  if (rate >= 50) return palette.goldText;
  if (rate >= 30) return palette.warning;
  return palette.danger;
}

/** PolarStarCard — Estrella Polar: retención (hero). */
export function PolarStarCard({ stat }: { stat: RetentionStat }) {
  const color = stat.insufficient ? palette.smoke : rateColor(stat.rate);
  return (
    <PremiumCard style={[s.polarCard, { borderColor: color, borderWidth: 1 }]}>
      <View style={s.polarEyebrowRow}>
        <MaterialIcons name="star" size={15} color={palette.goldText} />
        <Text style={s.polarEyebrow}>ESTRELLA POLAR · RETENCIÓN</Text>
      </View>
      <View style={s.polarNumRow}>
        <Text style={[s.polarNum, { color }]}>{stat.insufficient || stat.rate === null ? '—' : stat.rate}</Text>
        {!stat.insufficient && stat.rate !== null && <Text style={s.polarSign}>%</Text>}
      </View>
      <Text style={s.polarSub}>
        {stat.insufficient
          ? `Datos insuficientes (N=${stat.cohort})`
          : `${stat.active} de ${stat.cohort} clientes activos en ${stat.windowDays} días`}
      </Text>
      <Text style={s.polarExplain}>
        Proxy de retención: % de clientes con actividad reciente. La curva real a 90 días
        necesita más histórico — esto mide la retención operativa de hoy.
      </Text>
    </PremiumCard>
  );
}

/** ProtocolFunnelCard — embudo del Protocolo + punto de fuga. */
export function ProtocolFunnelCard({ funnel }: { funnel: ProtocolFunnel }) {
  const rows = funnel.modules.filter((m) => m.totalLessons > 0);
  const maxStarted = Math.max(1, ...rows.map((m) => m.started));
  const hasData = rows.some((m) => m.started > 0);

  return (
    <PremiumCard style={s.stratCard}>
      <Text style={s.stratTitle}>EMBUDO DEL PROTOCOLO</Text>
      <Text style={s.stratHint}>Dónde avanzan y dónde se caen los clientes</Text>
      {!hasData ? (
        <Text style={s.stratEmpty}>Aún no hay lecciones completadas registradas.</Text>
      ) : (
        <>
          {rows.slice(0, 8).map((m) => (
            <View key={m.moduleId} style={s.funnelRow}>
              <Text style={s.funnelName} numberOfLines={1}>{m.title}</Text>
              <View style={s.funnelBarTrack}>
                <View style={[s.funnelBarFill, { width: `${(m.started / maxStarted) * 100}%` }]} />
              </View>
              <Text style={s.funnelCount}>{m.started}</Text>
              <Text style={s.funnelDone}>✓{m.completed}</Text>
            </View>
          ))}
          {funnel.dropOff && (
            <View style={s.dropOff}>
              <MaterialIcons name="trending-down" size={14} color={palette.warning} />
              <Text style={s.dropOffText}>
                Mayor fuga: <Text style={s.dropOffName}>{funnel.dropOff.title}</Text> — se cae
                el {funnel.dropOff.lostPct}% ({funnel.dropOff.from}→{funnel.dropOff.to})
              </Text>
            </View>
          )}
        </>
      )}
    </PremiumCard>
  );
}

/** PracticeSignalCard — prácticas que más usan (qué retiene). */
export function PracticeSignalCard({ signal }: { signal: PracticeSignal }) {
  const max = Math.max(1, ...signal.practices.map((p) => p.count));
  return (
    <PremiumCard style={s.stratCard}>
      <Text style={s.stratTitle}>PRÁCTICAS QUE RETIENEN</Text>
      <Text style={s.stratHint}>Qué usan más los clientes (últimos 30 días)</Text>
      {signal.practices.length === 0 ? (
        <Text style={s.stratEmpty}>Sin sesiones de bienestar registradas aún.</Text>
      ) : (
        signal.practices.map((p) => (
          <View key={p.type} style={s.funnelRow}>
            <Text style={s.funnelName} numberOfLines={1}>{p.label}</Text>
            <View style={s.funnelBarTrack}>
              <View style={[s.funnelBarFill, { width: `${(p.count / max) * 100}%`, backgroundColor: palette.goldText }]} />
            </View>
            <Text style={s.funnelCount}>{p.count}</Text>
          </View>
        ))
      )}
    </PremiumCard>
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

  // ── CMI: Estrella Polar ──
  polarCard: { gap: spacing.xs, marginBottom: spacing.md },
  polarEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  polarEyebrow: { ...typography.label, color: palette.goldText, fontSize: 10, letterSpacing: 1.5 },
  polarNumRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 2 },
  polarNum: { fontFamily: Fonts.display, fontWeight: '800', fontSize: 52, lineHeight: 56 },
  polarSign: { ...typography.title, color: palette.smoke, fontSize: 22, marginLeft: 2 },
  polarSub: { ...typography.body, color: palette.ivory, fontSize: 13 },
  polarExplain: { ...typography.caption, color: palette.smoke, fontSize: 11, lineHeight: 17, marginTop: 2 },

  // ── CMI: tarjetas estratégicas (embudo / prácticas) ──
  stratCard: { gap: spacing.xs, marginBottom: spacing.md },
  stratTitle: { ...typography.section, color: palette.ivory, fontSize: 12, letterSpacing: 0.6 },
  stratHint: { ...typography.caption, color: palette.smoke, fontSize: 11, marginBottom: spacing.xs },
  stratEmpty: { ...typography.caption, color: palette.smoke, fontSize: 12, fontStyle: 'italic', paddingVertical: spacing.sm },

  funnelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  funnelName: { ...typography.caption, color: palette.ash, fontSize: 11.5, width: 110 },
  funnelBarTrack: { flex: 1, height: 6, backgroundColor: palette.charcoal, borderRadius: 3, overflow: 'hidden' },
  funnelBarFill: { height: 6, borderRadius: 3, backgroundColor: palette.success },
  funnelCount: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 13, color: palette.ivory, width: 26, textAlign: 'right' },
  funnelDone: { ...typography.label, color: palette.success, fontSize: 10, width: 30, textAlign: 'right' },

  dropOff: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: palette.line },
  dropOffText: { ...typography.caption, color: palette.ash, fontSize: 11.5, flex: 1, lineHeight: 16 },
  dropOffName: { color: palette.warning, fontFamily: Fonts.sansBold },
});
