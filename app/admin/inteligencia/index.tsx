/**
 * Admin CMI — Inteligencia ML
 *
 * Dashboard completo: engagement, churn, cohorts, affinities,
 * anomalías, notificaciones, next best actions.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, screen, StatusPill } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { recalculateAllMLAction } from '@/lib/admin/actions';
import { fetchAtRiskUsers, fetchMlOverview } from '@/lib/admin/queries';
import type { AtRiskUser, MlOverview } from '@/lib/admin/types';

function CohortBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={s.barRow}>
      <Text style={s.barLabel}>{label.replace(/_/g, ' ').toUpperCase()}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%` as unknown as number }]} />
      </View>
      <Text style={s.barCount}>{count}</Text>
    </View>
  );
}

function AffinityBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <View style={s.barRow}>
      <Text style={s.barLabel}>{label.toUpperCase()}</Text>
      <View style={s.barTrack}>
        <View style={[s.barFill, { width: `${pct}%` as unknown as number, backgroundColor: palette.goldMuted }]} />
      </View>
      <Text style={s.barCount}>{pct}%</Text>
    </View>
  );
}

function ChurnBlock({ distribution }: { distribution: Record<string, number> }) {
  const colorMap: Record<string, string> = { low: palette.success, medium: palette.warning, high: '#FF6B35', critical: palette.danger };
  return (
    <View style={s.churnRow}>
      {['low', 'medium', 'high', 'critical'].map(key => {
        const count = distribution[key] ?? 0;
        return (
          <View key={key} style={[s.churnBlock, { borderColor: colorMap[key] }]}>
            <Text style={[s.churnCount, { color: colorMap[key] }]}>{count}</Text>
            <Text style={s.churnLabel}>{key.toUpperCase()}</Text>
          </View>
        );
      })}
    </View>
  );
}

function AtRiskRow({ user, onPress }: { user: AtRiskUser; onPress: () => void }) {
  const col = user.churn_risk_label === 'critical' ? palette.danger
    : user.churn_risk_label === 'high' ? '#FF6B35' : palette.warning;
  return (
    <Pressable style={s.riskRow} onPress={onPress}>
      <View style={[s.riskDot, { backgroundColor: col }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.riskName}>{user.name ?? user.user_id.substring(0, 8)}</Text>
        <Text style={s.riskMeta}>
          {user.churn_risk_label.toUpperCase()} · Eng {user.engagement_score}
          {user.days_since_last_act > 0 ? ` · Inactivo ${user.days_since_last_act}d` : ''}
          {user.anomaly_detected ? ' · ⚠ ANOMALÍA' : ''}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={16} color={palette.smoke} />
    </Pressable>
  );
}

export default function InteligenciaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId: adminId } = useLifeFlow();

  const [overview, setOverview] = useState<MlOverview | null>(null);
  const [atRisk, setAtRisk] = useState<AtRiskUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);

  const load = useCallback(async () => {
    const [ov, ar] = await Promise.all([fetchMlOverview(), fetchAtRiskUsers()]);
    if (ov) setOverview(ov);
    setAtRisk(ar as AtRiskUser[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRecalcAll = async () => {
    if (!adminId) return;
    setRecalcLoading(true);
    const result = await recalculateAllMLAction(adminId);
    setRecalcLoading(false);
    if (result.success) {
      Alert.alert('✅ Recalculando', 'El motor ML está actualizando todos los usuarios (~30s)');
      setTimeout(load, 5000);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  if (loading) {
    return (
      <View style={[screen.root, s.center]}>
        <ActivityIndicator color={palette.gold} size="large" />
      </View>
    );
  }

  const total = overview?.total ?? 0;

  return (
    <ScrollView
      style={screen.root}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={palette.gold} />}>

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>INTELIGENCIA ML</Text>
        <Pressable
          style={[s.recalcBtn, recalcLoading && { opacity: 0.5 }]}
          onPress={handleRecalcAll}
          disabled={recalcLoading}>
          {recalcLoading ? (
            <ActivityIndicator color={palette.black} size="small" />
          ) : (
            <Text style={s.recalcText}>RECALCULAR TODO</Text>
          )}
        </Pressable>
      </View>

      {/* A. Engagement overview */}
      {overview && (
        <>
          <GoldDivider label="A. ENGAGEMENT" />
          <PremiumCard style={s.card}>
            <View style={s.kpiRow}>
              <View style={s.kpiBlock}>
                <Text style={s.kpiValue}>{total}</Text>
                <Text style={s.kpiLabel}>TOTAL USUARIOS</Text>
              </View>
              <View style={s.kpiBlock}>
                <Text style={s.kpiValue}>{overview.averages.engagement_score}</Text>
                <Text style={s.kpiLabel}>AVG ENGAGEMENT</Text>
              </View>
              <View style={s.kpiBlock}>
                <Text style={[s.kpiValue, { color: overview.active_anomalies > 0 ? palette.danger : palette.success }]}>
                  {overview.active_anomalies}
                </Text>
                <Text style={s.kpiLabel}>ANOMALÍAS</Text>
              </View>
            </View>
          </PremiumCard>

          {/* B. Churn distribution */}
          <GoldDivider label="B. DISTRIBUCIÓN DE CHURN" />
          <PremiumCard style={s.card}>
            <ChurnBlock distribution={overview.churn_distribution} />
          </PremiumCard>

          {/* C. Cohort map */}
          <GoldDivider label="C. MAPA DE COHORTES" />
          <PremiumCard style={s.card}>
            {Object.entries(overview.cohort_distribution)
              .sort(([, a], [, b]) => b - a)
              .map(([label, count]) => (
                <CohortBar key={label} label={label} count={count} total={total} />
              ))}
          </PremiumCard>

          {/* D. Content affinities */}
          <GoldDivider label="D. AFINIDADES DE CONTENIDO" />
          <PremiumCard style={s.card}>
            {Object.entries(overview.avg_affinities)
              .sort(([, a], [, b]) => b - a)
              .map(([mod, avg]) => (
                <AffinityBar key={mod} label={mod} value={avg} />
              ))}
          </PremiumCard>
        </>
      )}

      {/* E. At-risk users */}
      <GoldDivider label={`E. USUARIOS EN RIESGO (${atRisk.length})`} />
      <PremiumCard style={s.card}>
        {atRisk.length === 0 ? (
          <Text style={s.emptyText}>Sin usuarios en riesgo detectados 🟢</Text>
        ) : (
          atRisk.map(u => (
            <AtRiskRow
              key={u.user_id}
              user={u}
              onPress={() => router.push(`/admin/usuarios/${u.user_id}` as never)}
            />
          ))
        )}
      </PremiumCard>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { ...typography.title, color: palette.ivory, flex: 1 },
  recalcBtn: { backgroundColor: palette.gold, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  recalcText: { ...typography.label, color: palette.black, fontSize: 9 },
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.md },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-around' },
  kpiBlock: { alignItems: 'center' },
  kpiValue: { fontFamily: Fonts.display, fontSize: 28, color: palette.ivory },
  kpiLabel: { ...typography.label, color: palette.smoke, textAlign: 'center', fontSize: 8 },
  churnRow: { flexDirection: 'row', justifyContent: 'space-around' },
  churnBlock: { alignItems: 'center', borderWidth: 1, borderRadius: radii.sm, padding: spacing.md, flex: 1, margin: 2 },
  churnCount: { fontFamily: Fonts.display, fontSize: 24 },
  churnLabel: { ...typography.label, color: palette.smoke, fontSize: 8, marginTop: 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: 3 },
  barLabel: { ...typography.mono, color: palette.ash, fontSize: 9, width: 90 },
  barTrack: { flex: 1, height: 5, backgroundColor: palette.charcoal, borderRadius: 3 },
  barFill: { height: 5, borderRadius: 3, backgroundColor: palette.gold },
  barCount: { ...typography.mono, color: palette.smoke, fontSize: 10, width: 32, textAlign: 'right' },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  riskDot: { width: 8, height: 8, borderRadius: 4 },
  riskName: { fontFamily: Fonts.sans, fontSize: 13, color: palette.ivory },
  riskMeta: { ...typography.caption, color: palette.smoke, fontSize: 10, marginTop: 2 },
  emptyText: { ...typography.caption, color: palette.success, textAlign: 'center', padding: spacing.md },
});
