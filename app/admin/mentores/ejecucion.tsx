/**
 * Admin — Mentor Execution OS (dashboard cross-client).
 *
 * Operación del equipo de mentoría: quién necesita intervención, quién está más
 * retrasado, quién está en caída. Computado en vivo desde mentor_tasks (RLS admin).
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
import { palette, spacing, typography } from '@/constants/theme';
import { fetchExecutionDashboard, type ExecutionDashboardRow } from '@/lib/mentorExecution';

const MOMENTUM_LABEL: Record<string, string> = {
  rising: 'ascenso', stable: 'estable', fragile: 'frágil', declining: 'caída', critical: 'crítico',
};
const MOMENTUM_RANK: Record<string, number> = { rising: 0, stable: 1, fragile: 2, declining: 3, critical: 4 };

function Row({ row, metric, metricA11y, metricColor, onPress }: {
  row: ExecutionDashboardRow; metric: string; metricA11y: string; metricColor?: string; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`${row.name}, ${metricA11y}, ${row.openTasks} tareas abiertas, ${row.overdue} vencidas, momentum ${MOMENTUM_LABEL[row.momentum] ?? row.momentum}. Ver perfil`}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowName}>{row.name}</Text>
        <Text style={s.rowSub} numberOfLines={1}>
          {row.openTasks} abiertas · {row.overdue} vencidas · momentum {MOMENTUM_LABEL[row.momentum] ?? row.momentum}
        </Text>
        {!!row.topReason && <Text style={s.rowReason} numberOfLines={1}>{row.topReason}</Text>}
      </View>
      <Text style={[s.rowMetric, metricColor ? { color: metricColor } : null]}>{metric}</Text>
      <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
    </Pressable>
  );
}

/** Hero: distribución de momentum + % equipo en alerta. */
function MomentumHero({ rows }: { rows: ExecutionDashboardRow[] }) {
  const total = rows.length;
  if (total === 0) return null;
  const counts = {
    rising:    rows.filter((r) => r.momentum === 'rising').length,
    stable:    rows.filter((r) => r.momentum === 'stable').length,
    fragile:   rows.filter((r) => r.momentum === 'fragile').length,
    declining: rows.filter((r) => r.momentum === 'declining').length,
    critical:  rows.filter((r) => r.momentum === 'critical').length,
  };
  const inAlert = counts.fragile + counts.declining + counts.critical;
  const alertPct = Math.round((inAlert / total) * 100);
  const segments = [
    { count: counts.critical,  color: palette.danger,   label: 'CRÍTICO' },
    { count: counts.declining, color: palette.warning,  label: 'CAÍDA' },
    { count: counts.fragile,   color: palette.gold,     label: 'FRÁGIL' },
    { count: counts.stable,    color: palette.ash,      label: 'ESTABLE' },
    { count: counts.rising,    color: palette.success,  label: 'ASCENSO' },
  ];
  return (
    <PremiumCard style={s.heroCard}>
      <View
        style={s.heroHead}
        accessible
        accessibilityLabel={`Equipo de ${total}, ${alertPct} por ciento con momentum en riesgo`}>
        <Text style={s.heroTotal}>EQUIPO: {total}</Text>
        <Text style={[s.heroAlert, { color: alertPct >= 30 ? palette.danger : alertPct >= 15 ? palette.warning : palette.success }]}>
          {alertPct}% MOMENTUM EN RIESGO
        </Text>
      </View>
      <View
        style={s.heroBar}
        accessible
        accessibilityLabel={`Distribución de momentum: crítico ${counts.critical}, en caída ${counts.declining}, frágil ${counts.fragile}, estable ${counts.stable}, en ascenso ${counts.rising}`}>
        {segments.map((seg, i) => seg.count > 0 ? (
          <View key={i} style={[s.heroSeg, { flex: seg.count, backgroundColor: seg.color }]} />
        ) : null)}
      </View>
      <View style={s.heroCounts}>
        {segments.map((seg, i) => (
          <View key={i} style={s.heroCount}>
            <View style={[s.heroCountDot, { backgroundColor: seg.color }]} />
            <Text style={s.heroCountTxt}>{seg.label} {seg.count}</Text>
          </View>
        ))}
      </View>
    </PremiumCard>
  );
}

export default function AdminEjecucionScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<ExecutionDashboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setRows(await fetchExecutionDashboard());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const go = (id: string) => router.push(`/admin/usuarios/${id}` as never);

  const byAttention = [...rows].filter((r) => r.attention >= 50).sort((a, b) => b.attention - a.attention).slice(0, 12);
  const byOverdue = [...rows].filter((r) => r.overdue > 0).sort((a, b) => b.overdue - a.overdue).slice(0, 12);
  const byMomentum = [...rows]
    .filter((r) => (MOMENTUM_RANK[r.momentum] ?? 0) >= 3)
    .sort((a, b) => (MOMENTUM_RANK[b.momentum] ?? 0) - (MOMENTUM_RANK[a.momentum] ?? 0))
    .slice(0, 12);

  const attColor = (n: number) => (n >= 80 ? palette.danger : n >= 60 ? palette.warning : palette.goldText);

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}>

      <View style={s.topRow}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver"  hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>EJECUCIÓN</Text>
        <View style={{ width: 36 }} />
      </View>
      <Text style={s.intro}>Operación del equipo: a quién intervenir, quién está retrasado, quién en caída.</Text>

      {loading ? (
        <ActivityIndicator color={palette.goldText} style={{ marginTop: spacing.xxxl }} />
      ) : rows.length === 0 ? (
        <PremiumCard style={s.card}>
          <Text style={s.empty}>Aún no hay tareas operativas. Aparecerán al confirmar mentorías y al detectar compromisos en los chats.</Text>
        </PremiumCard>
      ) : (
        <>
          <MomentumHero rows={rows} />

          <GoldDivider label="NECESITAN INTERVENCIÓN" />
          <PremiumCard style={s.card}>
            {byAttention.length === 0 ? <Text style={s.empty}>Nadie en alerta.</Text> :
              byAttention.map((r) => <Row key={r.user_id} row={r} metric={`${r.attention}`} metricA11y={`atención ${r.attention} de 100`} metricColor={attColor(r.attention)} onPress={() => go(r.user_id)} />)}
          </PremiumCard>

          <GoldDivider label="MÁS RETRASADOS" />
          <PremiumCard style={s.card}>
            {byOverdue.length === 0 ? <Text style={s.empty}>Sin tareas vencidas.</Text> :
              byOverdue.map((r) => <Row key={r.user_id} row={r} metric={`${r.overdue}`} metricA11y={`${r.overdue} tareas vencidas`} metricColor={palette.warning} onPress={() => go(r.user_id)} />)}
          </PremiumCard>

          <GoldDivider label="MOMENTUM EN RIESGO" />
          <PremiumCard style={s.card}>
            {byMomentum.length === 0 ? <Text style={s.empty}>Momentum saludable en todos.</Text> :
              byMomentum.map((r) => <Row key={r.user_id} row={r} metric={(MOMENTUM_LABEL[r.momentum] ?? '').toUpperCase()} metricA11y={`momentum en ${MOMENTUM_LABEL[r.momentum] ?? r.momentum}`} metricColor={palette.danger} onPress={() => go(r.user_id)} />)}
          </PremiumCard>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: palette.ivory, fontSize: 18 },
  intro: { ...typography.body, color: palette.ash, marginBottom: spacing.lg },
  card: { gap: 2, marginBottom: spacing.md },
  empty: { ...typography.caption, color: palette.smoke, fontSize: 12, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.line },
  rowName: { ...typography.section, color: palette.ivory, fontSize: 13, letterSpacing: 0.5 },
  rowSub: { ...typography.caption, color: palette.smoke, fontSize: 11 },
  rowReason: { ...typography.caption, color: palette.ash, fontSize: 11, marginTop: 1 },
  rowMetric: { ...typography.label, color: palette.goldText, fontSize: 13, marginRight: 2 },

  // Momentum distribution hero
  heroCard: { gap: spacing.sm, marginBottom: spacing.md, paddingVertical: spacing.md },
  heroHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  heroTotal: { ...typography.label, color: palette.smoke, fontSize: 10, letterSpacing: 1.2 },
  heroAlert: { ...typography.label, fontSize: 12, letterSpacing: 1 },
  heroBar: { flexDirection: 'row', height: 10, borderRadius: 4, overflow: 'hidden', backgroundColor: palette.charcoal },
  heroSeg: { height: 10 },
  heroCounts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: 4 },
  heroCount: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroCountDot: { width: 8, height: 8, borderRadius: 4 },
  heroCountTxt: { ...typography.label, color: palette.ash, fontSize: 10, letterSpacing: 0.8 },
});
