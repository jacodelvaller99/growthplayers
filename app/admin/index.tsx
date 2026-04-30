/**
 * Admin Analytics Dashboard
 *
 * Protected by `is_admin = true` profile flag.
 * Calls the ml-dashboard edge function for aggregated ML metrics.
 *
 * Accessible via:  router.push('/admin')  (deep-link only — not in tab bar)
 * Access guard:    redirects to /(tabs) if not admin
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppHeader,
  GoldDivider,
  PremiumCard,
  SecondaryButton,
  screen,
  StatusPill,
} from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { supabase, intel } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewData {
  total: number;
  averages: { engagement_score: number; churn_risk: number };
  cohort_distribution: Record<string, number>;
  churn_distribution: Record<string, number>;
  active_anomalies: number;
  avg_affinities: Record<string, number>;
}

interface AtRiskUser {
  user_id:             string;
  name?:               string;
  email?:              string;
  churn_risk:          number;
  churn_risk_label:    string;
  days_since_last_act: number;
  engagement_score:    number;
  anomaly_detected:    boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function callMlDashboard<T>(action: string, extra?: Record<string, unknown>): Promise<T | null> {
  const { data, error } = await supabase.functions.invoke('ml-dashboard', {
    body: { action, ...extra },
  });
  if (error) {
    console.error('[Admin] ml-dashboard error:', error);
    return null;
  }
  return data as T;
}

function CohortBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={aStyles.cohortRow}>
      <Text style={aStyles.cohortLabel}>{label.replace(/_/g, ' ').toUpperCase()}</Text>
      <View style={aStyles.cohortTrack}>
        <View style={[aStyles.cohortFill, { width: `${pct}%` as unknown as number }]} />
      </View>
      <Text style={aStyles.cohortCount}>{count}</Text>
    </View>
  );
}

function ChurnPill({ label, count }: { label: string; count: number }) {
  const colorMap: Record<string, string> = {
    low:      '#4caf50',
    medium:   '#ff9800',
    high:     '#f44336',
    critical: '#b71c1c',
  };
  return (
    <View style={[aStyles.churnPill, { borderColor: colorMap[label] ?? palette.line }]}>
      <Text style={[aStyles.churnPillCount, { color: colorMap[label] ?? palette.ash }]}>{count}</Text>
      <Text style={aStyles.churnPillLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state, userId } = useLifeFlow();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [atRisk, setAtRisk] = useState<AtRiskUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!userId) { setIsAdmin(false); return; }
      const { data } = await intel.profiles()
        .select('is_admin')
        .eq('id', userId)
        .single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setIsAdmin((data as any)?.is_admin === true);
    };
    checkAdmin();
  }, [userId]);

  const loadData = useCallback(async () => {
    const [ovResult, arResult] = await Promise.all([
      callMlDashboard<OverviewData>('overview'),
      callMlDashboard<{ users: AtRiskUser[] }>('at_risk_users', { limit: 20 }),
    ]);
    if (ovResult) setOverview(ovResult);
    if (arResult?.users) setAtRisk(arResult.users);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (isAdmin === true) {
      loadData();
    } else if (isAdmin === false) {
      router.replace('/(tabs)/comando' as never);
    }
  }, [isAdmin, loadData, router]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (isAdmin === null || loading) {
    return (
      <View style={[screen.root, aStyles.center]}>
        <ActivityIndicator color={palette.gold} size="large" />
        <Text style={aStyles.loadingText}>Cargando dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={screen.root}
      contentContainerStyle={[screen.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={palette.gold}
        />
      }>
      <AppHeader
        title="ADMIN INTELLIGENCE"
        right={
          <StatusPill label="ADMIN" tone="gold" dot />
        }
      />

      {/* ── Overview Metrics ── */}
      <GoldDivider label="RESUMEN GLOBAL" />
      {overview && (
        <View style={aStyles.overviewGrid}>
          <PremiumCard style={aStyles.metricCard}>
            <Text style={aStyles.metricValue}>{overview.total}</Text>
            <Text style={aStyles.metricLabel}>USUARIOS TOTALES</Text>
          </PremiumCard>
          <PremiumCard style={aStyles.metricCard}>
            <Text style={aStyles.metricValue}>{overview.averages.engagement_score}</Text>
            <Text style={aStyles.metricLabel}>AVG ENGAGEMENT</Text>
          </PremiumCard>
          <PremiumCard style={aStyles.metricCard}>
            <Text style={aStyles.metricValue}>{overview.active_anomalies}</Text>
            <Text style={aStyles.metricLabel}>ANOMALÍAS ACTIVAS</Text>
          </PremiumCard>
          <PremiumCard style={aStyles.metricCard}>
            <Text style={aStyles.metricValue}>
              {Math.round(overview.averages.churn_risk * 100)}%
            </Text>
            <Text style={aStyles.metricLabel}>RIESGO PROMEDIO</Text>
          </PremiumCard>
        </View>
      )}

      {/* ── Churn Distribution ── */}
      {overview?.churn_distribution && (
        <>
          <GoldDivider label="DISTRIBUCIÓN DE CHURN" />
          <PremiumCard style={aStyles.card}>
            <View style={aStyles.churnRow}>
              {Object.entries(overview.churn_distribution).map(([label, count]) => (
                <ChurnPill key={label} label={label} count={count} />
              ))}
            </View>
          </PremiumCard>
        </>
      )}

      {/* ── Cohort Distribution ── */}
      {overview?.cohort_distribution && (
        <>
          <GoldDivider label="DISTRIBUCIÓN DE COHORTES" />
          <PremiumCard style={aStyles.card}>
            {Object.entries(overview.cohort_distribution)
              .sort(([, a], [, b]) => b - a)
              .map(([label, count]) => (
                <CohortBar
                  key={label}
                  label={label}
                  count={count}
                  total={overview.total}
                />
              ))}
          </PremiumCard>
        </>
      )}

      {/* ── Average Affinities ── */}
      {overview?.avg_affinities && (
        <>
          <GoldDivider label="AFINIDADES PROMEDIO" />
          <PremiumCard style={aStyles.card}>
            {Object.entries(overview.avg_affinities)
              .sort(([, a], [, b]) => b - a)
              .map(([module, avg]) => (
                <View key={module} style={aStyles.affinityRow}>
                  <Text style={aStyles.affinityLabel}>{module.toUpperCase()}</Text>
                  <View style={aStyles.affinityTrack}>
                    <View style={[aStyles.affinityFill, { width: `${Math.round(avg * 100)}%` as unknown as number }]} />
                  </View>
                  <Text style={aStyles.affinityPct}>{Math.round(avg * 100)}%</Text>
                </View>
              ))}
          </PremiumCard>
        </>
      )}

      {/* ── At-Risk Users ── */}
      {atRisk.length > 0 && (
        <>
          <GoldDivider label={`USUARIOS EN RIESGO (${atRisk.length})`} />
          {atRisk.map((u) => (
            <PremiumCard key={u.user_id} style={aStyles.userCard}>
              <View style={aStyles.userRow}>
                <View style={aStyles.userInfo}>
                  <Text style={aStyles.userName}>{u.name ?? 'Anónimo'}</Text>
                  {u.email && <Text style={aStyles.userEmail}>{u.email}</Text>}
                </View>
                <View style={[
                  aStyles.riskBadge,
                  {
                    backgroundColor:
                      u.churn_risk_label === 'critical' ? '#b71c1c33'
                      : u.churn_risk_label === 'high' ? '#f4433622'
                      : '#ff980022',
                  },
                ]}>
                  <Text style={[
                    aStyles.riskBadgeText,
                    {
                      color:
                        u.churn_risk_label === 'critical' ? '#ff4444'
                        : u.churn_risk_label === 'high' ? '#f44336'
                        : '#ff9800',
                    },
                  ]}>
                    {u.churn_risk_label.toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={aStyles.userMetrics}>
                <Text style={aStyles.userMetric}>
                  {Math.round(u.churn_risk * 100)}% riesgo
                </Text>
                <Text style={aStyles.userMetricSep}>·</Text>
                <Text style={aStyles.userMetric}>
                  {u.days_since_last_act}d inactivo
                </Text>
                <Text style={aStyles.userMetricSep}>·</Text>
                <Text style={aStyles.userMetric}>
                  ENG {u.engagement_score}/100
                </Text>
                {u.anomaly_detected && (
                  <>
                    <Text style={aStyles.userMetricSep}>·</Text>
                    <MaterialIcons name="warning-amber" size={12} color={palette.gold} />
                  </>
                )}
              </View>
            </PremiumCard>
          ))}
        </>
      )}

      <SecondaryButton
        label="VOLVER"
        icon="arrow-back"
        onPress={() => router.back()}
      />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const aStyles = StyleSheet.create({
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: palette.ash,
  },

  // Overview grid
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  metricCard: {
    alignItems: 'center',
    flex: 1,
    minWidth: '40%',
    paddingVertical: spacing.lg,
  },
  metricValue: {
    color: palette.gold,
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
    lineHeight: 32,
  },
  metricLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 7,
    letterSpacing: 1.5,
    marginTop: 4,
    textAlign: 'center',
  },

  // Cards
  card: {
    gap: spacing.md,
  },

  // Churn
  churnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-around',
  },
  churnPill: {
    alignItems: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    minWidth: 60,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  churnPillCount: {
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  churnPillLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 7,
    letterSpacing: 1.5,
    marginTop: 2,
  },

  // Cohort
  cohortRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cohortLabel: {
    ...typography.label,
    color: palette.ash,
    fontSize: 8,
    letterSpacing: 1,
    width: 110,
  },
  cohortTrack: {
    backgroundColor: palette.charcoal,
    borderRadius: 2,
    flex: 1,
    height: 6,
    overflow: 'hidden',
  },
  cohortFill: {
    backgroundColor: palette.gold,
    borderRadius: 2,
    height: 6,
    opacity: 0.7,
  },
  cohortCount: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 10,
    textAlign: 'right',
    width: 28,
  },

  // Affinities
  affinityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  affinityLabel: {
    ...typography.label,
    color: palette.ash,
    fontSize: 8,
    letterSpacing: 1,
    width: 90,
  },
  affinityTrack: {
    backgroundColor: palette.charcoal,
    borderRadius: 2,
    flex: 1,
    height: 4,
    overflow: 'hidden',
  },
  affinityFill: {
    backgroundColor: palette.gold,
    borderRadius: 2,
    height: 4,
    opacity: 0.8,
  },
  affinityPct: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 9,
    textAlign: 'right',
    width: 32,
  },

  // At-risk users
  userCard: {
    gap: spacing.sm,
  },
  userRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    ...typography.section,
    color: palette.ivory,
    fontSize: 12,
  },
  userEmail: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 10,
  },
  riskBadge: {
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  riskBadgeText: {
    fontFamily: Fonts.display,
    fontSize: 8,
    letterSpacing: 1,
  },
  userMetrics: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  userMetric: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 10,
  },
  userMetricSep: {
    color: palette.line,
    fontSize: 10,
  },
});
