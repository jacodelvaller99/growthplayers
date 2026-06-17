/**
 * Admin — Biometric Intelligence (dashboard cross-client).
 *
 * Quién necesita descanso, quién está en caída fisiológica, quién está sólido.
 * Lee el último insight por usuario (RLS admin) y ordena por severidad de intervención.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
import { palette, spacing, typography } from '@/constants/theme';
import { fetchBiometricDashboard, type BiometricDashboardRow } from '@/lib/biometric';
import type { InterventionLevel, RecoveryState, TrendState } from '@/lib/biometricLogic';

const LEVEL_META: Record<InterventionLevel, { label: string; color: string }> = {
  urgent: { label: 'URGENTE', color: palette.danger },
  high:   { label: 'ATENDER', color: palette.danger },
  medium: { label: 'OBSERVAR', color: palette.warning },
  low:    { label: 'SÓLIDO', color: palette.success },
};
const RECOVERY_LABEL: Record<RecoveryState, string> = {
  strong: 'recuperación fuerte', adequate: 'recuperación adecuada', compromised: 'recuperación comprometida',
  weak: 'recuperación débil', high_risk: 'recuperación de alto riesgo',
};
const TREND_LABEL: Record<TrendState, string> = {
  improving: 'mejorando', stable: 'estable', volatile: 'inestable', worsening: 'a la baja',
};

function Row({ row, onPress }: { row: BiometricDashboardRow; onPress: () => void }) {
  const lvl = LEVEL_META[row.intervention_level] ?? LEVEL_META.low;
  return (
    <Pressable onPress={onPress} hitSlop={4} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.rowName}>{row.name ?? 'Usuario'}</Text>
        <Text style={s.rowSub} numberOfLines={1}>
          {RECOVERY_LABEL[row.recovery_state as RecoveryState] ?? row.recovery_state} · tendencia {TREND_LABEL[row.trend_state as TrendState] ?? row.trend_state}
        </Text>
        {row.summary ? (
          <Text style={s.rowDriver} numberOfLines={2}>{row.summary}</Text>
        ) : null}
      </View>
      <View style={[s.lvlPill, { borderColor: lvl.color }]}>
        <Text style={[s.lvlText, { color: lvl.color }]}>{lvl.label}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
    </Pressable>
  );
}

/** Distribution hero: visibility instantánea del estado del equipo. */
function DistributionHero({ rows }: { rows: BiometricDashboardRow[] }) {
  const total = rows.length;
  if (total === 0) return null;
  const counts = {
    urgent: rows.filter((r) => r.intervention_level === 'urgent').length,
    high:   rows.filter((r) => r.intervention_level === 'high').length,
    medium: rows.filter((r) => r.intervention_level === 'medium').length,
    low:    rows.filter((r) => r.intervention_level === 'low').length,
  };
  const alertPct = Math.round(((counts.urgent + counts.high) / total) * 100);
  const segments = [
    { count: counts.urgent, color: palette.danger,  label: 'URG' },
    { count: counts.high,   color: palette.warning, label: 'ATD' },
    { count: counts.medium, color: palette.goldText, label: 'OBS' },
    { count: counts.low,    color: palette.success, label: 'OK' },
  ];
  return (
    <PremiumCard style={s.heroCard}>
      <View style={s.heroHead}>
        <Text style={s.heroTotal}>EQUIPO: {total}</Text>
        <Text style={[s.heroAlert, { color: alertPct >= 25 ? palette.danger : alertPct >= 10 ? palette.warning : palette.success }]}>
          {alertPct}% EN ALERTA
        </Text>
      </View>
      <View style={s.heroBar}>
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

export default function AdminBiometriaScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<BiometricDashboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setRows(await fetchBiometricDashboard());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const go = (id: string) => router.push(`/admin/usuarios/${id}` as never);

  const rank: Record<InterventionLevel, number> = { urgent: 3, high: 2, medium: 1, low: 0 };
  const needAttention = rows.filter((r) => (rank[r.intervention_level] ?? 0) >= 2);
  const observe = rows.filter((r) => r.intervention_level === 'medium');
  const solid = rows.filter((r) => r.intervention_level === 'low');

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}>

      <View style={s.topRow}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>BIOMÉTRICOS</Text>
        <View style={{ width: 36 }} />
      </View>
      <Text style={s.intro}>Estado fisiológico del equipo: a quién darle descanso, quién está en caída, quién está sólido.</Text>

      {loading ? (
        <ActivityIndicator color={palette.gold} style={{ marginTop: spacing.xxxl }} />
      ) : rows.length === 0 ? (
        <PremiumCard style={s.card}>
          <Text style={s.empty}>
            Aún no hay lecturas biométricas. Aparecerán cuando los clientes conecten un wearable o cuando generes datos demo desde el perfil de un usuario.
          </Text>
        </PremiumCard>
      ) : (
        <>
          <DistributionHero rows={rows} />

          <GoldDivider label={`NECESITAN ATENCIÓN (${needAttention.length})`} />
          <PremiumCard style={s.card}>
            {needAttention.length === 0 ? <Text style={s.empty}>Nadie en alerta fisiológica.</Text> :
              needAttention.map((r) => <Row key={r.user_id} row={r} onPress={() => go(r.user_id)} />)}
          </PremiumCard>

          <GoldDivider label={`OBSERVAR (${observe.length})`} />
          <PremiumCard style={s.card}>
            {observe.length === 0 ? <Text style={s.empty}>Sin casos en observación.</Text> :
              observe.map((r) => <Row key={r.user_id} row={r} onPress={() => go(r.user_id)} />)}
          </PremiumCard>

          <GoldDivider label={`SÓLIDOS (${solid.length})`} />
          <PremiumCard style={s.card}>
            {solid.length === 0 ? <Text style={s.empty}>Nadie con lectura sólida hoy.</Text> :
              solid.map((r) => <Row key={r.user_id} row={r} onPress={() => go(r.user_id)} />)}
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
  rowDriver: { ...typography.caption, color: palette.ash, fontSize: 11, fontStyle: 'italic' },
  lvlPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  lvlText: { ...typography.label, fontSize: 9, letterSpacing: 0.8 },

  // Distribution hero — instantánea del estado del equipo
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
