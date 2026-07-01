/**
 * Admin — Dashboard de Memoria (cross-client).
 *
 * Vista operativa: qué clientes tienen más loops abiertos, follow-up estancado, o
 * riesgo de churn — para priorizar a quién atender. Datos agregados de
 * memory_summaries + user_intelligence (visibles por RLS admin). Tap → detalle.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { fetchMemoryDashboard, type MemoryDashboardRow } from '@/lib/admin/queries';

const RISK_RANK: Record<string, number> = { critical: 3, high: 2, medium: 1, low: 0 };

function Row({ row, metric, metricA11y, onPress }: { row: MemoryDashboardRow; metric: string; metricA11y: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`${row.name}, ${metricA11y}. Ver perfil`}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowName}>{row.name}</Text>
        {row.topThemes.length > 0 && (
          <Text style={s.rowThemes} numberOfLines={1}>{row.topThemes.join(' · ')}</Text>
        )}
      </View>
      <Text style={s.rowMetric}>{metric}</Text>
      <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
    </Pressable>
  );
}

export default function AdminMemoriaScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<MemoryDashboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setRows(await fetchMemoryDashboard());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const go = (id: string) => router.push(`/admin/usuarios/${id}` as never);

  const byLoops = [...rows].filter((r) => r.openLoops > 0).sort((a, b) => b.openLoops - a.openLoops).slice(0, 10);
  const byStale = [...rows].filter((r) => (r.staleDays ?? 0) >= 7).sort((a, b) => (b.staleDays ?? 0) - (a.staleDays ?? 0)).slice(0, 10);
  const byRisk = [...rows]
    .filter((r) => r.churnLabel && (RISK_RANK[r.churnLabel] ?? 0) >= 2)
    .sort((a, b) => (RISK_RANK[b.churnLabel ?? 'low'] ?? 0) - (RISK_RANK[a.churnLabel ?? 'low'] ?? 0))
    .slice(0, 10);

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}>

      <View style={s.topRow}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver"  hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>MEMORIA</Text>
        <View style={{ width: 36 }} />
      </View>
      <Text style={s.intro}>Prioriza a quién atender: loops abiertos, follow-up estancado y riesgo.</Text>

      {loading ? (
        <ActivityIndicator color={palette.goldText} style={{ marginTop: spacing.xxxl }} />
      ) : rows.length === 0 ? (
        <PremiumCard style={s.card}>
          <Text style={s.empty}>Aún no hay memoria registrada. Aparecerá a medida que los clientes conversen y tengan mentorías.</Text>
        </PremiumCard>
      ) : (
        <>
          <GoldDivider label="MÁS LOOPS ABIERTOS" />
          <PremiumCard style={s.card}>
            {byLoops.length === 0 ? <Text style={s.empty}>Ninguno.</Text> :
              byLoops.map((r) => <Row key={r.user_id} row={r} metric={`${r.openLoops}`} metricA11y={`${r.openLoops} loops abiertos`} onPress={() => go(r.user_id)} />)}
          </PremiumCard>

          <GoldDivider label="FOLLOW-UP ESTANCADO" />
          <PremiumCard style={s.card}>
            {byStale.length === 0 ? <Text style={s.empty}>Todos al día.</Text> :
              byStale.map((r) => <Row key={r.user_id} row={r} metric={`${r.staleDays}d`} metricA11y={`${r.staleDays} días de follow-up estancado`} onPress={() => go(r.user_id)} />)}
          </PremiumCard>

          <GoldDivider label="RIESGO DE CHURN" />
          <PremiumCard style={s.card}>
            {byRisk.length === 0 ? <Text style={s.empty}>Sin clientes en riesgo alto.</Text> :
              byRisk.map((r) => <Row key={r.user_id} row={r} metric={(r.churnLabel ?? '').toUpperCase()} metricA11y={`riesgo de churn ${(r.churnLabel ?? '').toLowerCase()}`} onPress={() => go(r.user_id)} />)}
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
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.line,
  },
  rowName: { ...typography.section, color: palette.ivory, fontSize: 13, letterSpacing: 0.5 },
  rowThemes: { ...typography.caption, color: palette.smoke, fontSize: 11 },
  rowMetric: { ...typography.label, color: palette.goldText, fontSize: 13, marginRight: 2, borderRadius: radii.sm },
});
