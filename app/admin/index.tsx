/**
 * Admin CMI — Mission Control
 *
 * Real-time overview: KPIs, alerts, live event feed, section shortcuts.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, screen, StatusPill, useScreen } from '@/components/polaris';
import { getTierColor, getTierLabel } from '@/constants/subscriptions';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { fetchAtRiskUsers, fetchDashboardKPIs, fetchLiveEvents, fetchTierCounts } from '@/lib/admin/queries';
import type { AtRiskUser, DashboardKPIs, LiveEvent } from '@/lib/admin/types';
import { recalculateAllMLAction } from '@/lib/admin/actions';
import { intel } from '@/lib/supabase';

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({ value, label, accent }: { value: string | number; label: string; accent?: string }) {
  return (
    <PremiumCard style={s.kpiCard}>
      <Text style={[s.kpiValue, accent ? { color: accent } : {}]}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </PremiumCard>
  );
}

function AlertCard({
  icon, title, body, tone,
}: {
  icon: string; title: string; body: string; tone: 'danger' | 'warning' | 'success';
}) {
  const bg = tone === 'danger' ? palette.dangerMuted
    : tone === 'warning' ? 'rgba(212,160,23,0.12)'
    : palette.successMuted;
  const col = tone === 'danger' ? palette.danger
    : tone === 'warning' ? palette.warning
    : palette.success;
  return (
    <View style={[s.alertCard, { backgroundColor: bg, borderColor: col }]}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[s.alertTitle, { color: col }]}>{title}</Text>
        <Text style={s.alertBody}>{body}</Text>
      </View>
    </View>
  );
}

function EventRow({ event }: { event: LiveEvent }) {
  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return `${Math.round(diff / 1000)}s`;
    if (diff < 3600000) return `${Math.round(diff / 60000)}m`;
    return `${Math.round(diff / 3600000)}h`;
  };

  const iconMap: Record<string, string> = {
    screen_view:      '👁',
    lesson_start:     '📖',
    lesson_complete:  '✅',
    checkin_submit:   '🎯',
    binaural_complete:'🎵',
    breathing_complete:'💨',
    meditation_complete:'🧘',
  };

  return (
    <View style={s.eventRow}>
      <Text style={s.eventIcon}>{iconMap[event.event_type] ?? '⚡'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.eventType}>{event.event_type.replace(/_/g, ' ').toUpperCase()}</Text>
        {event.screen ? <Text style={s.eventScreen}>{event.screen}</Text> : null}
      </View>
      <Text style={s.eventTime}>{timeAgo(event.created_at)}</Text>
    </View>
  );
}

interface SectionCard {
  route: string;
  label: string;
  icon: string;
  desc: string;
}

const SECTIONS: SectionCard[] = [
  { route: '/admin/usuarios',     label: 'Usuarios',        icon: '👤', desc: 'Gestionar perfiles' },
  { route: '/admin/membresias',   label: 'Membresías',      icon: '💳', desc: 'Activar accesos' },
  { route: '/admin/cursos',       label: 'Cursos',          icon: '🎓', desc: 'Control de acceso' },
  { route: '/admin/codigos',      label: 'Códigos',         icon: '🔑', desc: 'Crear y gestionar' },
  { route: '/admin/inteligencia', label: 'ML',              icon: '🧠', desc: 'Dashboard completo' },
  { route: '/admin/contenido',    label: 'Contenido',       icon: '📝', desc: 'Diarios y chats' },
  { route: '/admin/comunidad',    label: 'Moderación',      icon: '🚩', desc: 'Cola de reportes' },
  { route: '/admin/auditoria',    label: 'Auditoría',       icon: '📋', desc: 'Log de acciones' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MissionControl() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();

  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [tierCounts, setTierCounts] = useState<Record<string, number>>({});
  const [atRiskUsers, setAtRiskUsers] = useState<AtRiskUser[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mlRecalculating, setMlRecalculating] = useState(false);
  const [now, setNow] = useState(new Date());
  const channelRef = useRef<ReturnType<typeof intel.events> | null>(null);

  const loadData = useCallback(async () => {
    // allSettled: una query que falle NO debe dejar el dashboard en spinner infinito.
    // Cada panel se actualiza con lo que llegó; lo que falló conserva su último valor.
    try {
      const [kpiRes, evtRes, tierRes, riskRes] = await Promise.allSettled([
        fetchDashboardKPIs(),
        fetchLiveEvents(10),
        fetchTierCounts(),
        fetchAtRiskUsers(),
      ]);
      if (kpiRes.status === 'fulfilled') setKpis(kpiRes.value);
      if (evtRes.status === 'fulfilled') setEvents(evtRes.value);
      if (tierRes.status === 'fulfilled') setTierCounts(tierRes.value);
      if (riskRes.status === 'fulfilled') setAtRiskUsers(riskRes.value);
      setLastSyncAt(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleRecalculateML = async () => {
    if (mlRecalculating || !userId) return;
    setMlRecalculating(true);
    await recalculateAllMLAction(userId);
    setMlRecalculating(false);
  };

  // Colombia time (UTC-5)
  const colombiaTime = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);

  if (loading) {
    return (
      <View style={[sc.root, s.center]}>
        <ActivityIndicator color={palette.goldText} size="large" />
        <Text style={s.loadingText}>Cargando CMI...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + spacing.lg }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.gold} />
      }>
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerEyebrow}>POLARIS GROWTH INSTITUTE</Text>
          <Text style={s.headerTitle}>CUADRO DE MANDO</Text>
          <Text style={s.headerSub}>
            Colombia {colombiaTime} · actualizado hace {lastSyncAt ? Math.max(0, Math.floor((now.getTime() - lastSyncAt.getTime()) / 1000)) : 0}s
          </Text>
        </View>
        <StatusPill label="ADMIN" tone="gold" dot />
      </View>

      {/* ── HERO: KPIs críticos arriba (semantic colors: red=urgent, gold=warning, green=ok) ── */}
      {kpis && (
        <View style={s.heroRow}>
          <View style={[s.heroStat, { borderColor: kpis.critical_churn > 0 ? palette.danger : palette.line }]}>
            <Text style={[s.heroValue, { color: kpis.critical_churn > 0 ? palette.danger : palette.ivory }]}>
              {kpis.critical_churn}
            </Text>
            <Text style={s.heroLabel}>RIESGO CRÍTICO</Text>
          </View>
          <View style={[s.heroStat, { borderColor: atRiskUsers.length > 0 ? palette.warning : palette.line }]}>
            <Text style={[s.heroValue, { color: atRiskUsers.length > 0 ? palette.warning : palette.ivory }]}>
              {atRiskUsers.length}
            </Text>
            <Text style={s.heroLabel}>EN RIESGO ALTO</Text>
          </View>
          <View style={[s.heroStat, { borderColor: palette.line }]}>
            <Text style={[s.heroValue, { color: palette.ivory }]}>{kpis.active_today}</Text>
            <Text style={s.heroLabel}>ACTIVOS HOY</Text>
          </View>
        </View>
      )}

      {/* ── KPIs operativos ── */}
      <GoldDivider label="KPIs OPERATIVOS" />
      {kpis && (
        <View style={s.kpiGrid}>
          <KpiCard value={kpis.total_users}    label="USUARIOS TOTALES" />
          <KpiCard value={kpis.active_7d}      label="ACTIVOS 7D" />
          <KpiCard value={kpis.avg_engagement} label="AVG ENGAGEMENT" />
        </View>
      )}

      {/* ── Membresías por tier ── */}
      <GoldDivider label="MEMBRESÍAS POR TIER" />
      <View style={s.kpiGrid}>
        {(['free', 'premium', 'premium_plus', 'polaris', 'growthplayers'] as const).map((tier) => (
          <Pressable
            key={tier}
            style={[s.tierCountCard, { borderColor: getTierColor(tier) + '55' }]}
            onPress={() => router.push('/admin/membresias' as never)}>
            <View style={[s.tierDot, { backgroundColor: getTierColor(tier) }]} />
            <Text style={[s.tierCountValue, { color: getTierColor(tier) }]}>
              {tierCounts[tier] ?? 0}
            </Text>
            <Text style={s.tierCountLabel}>{getTierLabel(tier).toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      {/* ── Alerts ── */}
      <GoldDivider label="ALERTAS ACTIVAS" />
      <View style={s.alertsSection}>
        {kpis && kpis.critical_churn > 0 && (
          <AlertCard
            icon="🔴"
            title={`${kpis.critical_churn} usuarios en riesgo CRÍTICO`}
            body="Requieren intervención inmediata. Ver Inteligencia ML."
            tone="danger"
          />
        )}
        {kpis && kpis.critical_churn === 0 && (
          <AlertCard
            icon="🟢"
            title="Sin alertas críticas"
            body="Todos los indicadores dentro del rango normal."
            tone="success"
          />
        )}
      </View>

      {/* ── Usuarios en Riesgo (Top 5) — accionable: tap navega al dossier ── */}
      <GoldDivider label={`USUARIOS EN RIESGO (${atRiskUsers.length})`} />
      <PremiumCard style={s.feedCard}>
        {atRiskUsers.length === 0 ? (
          <Text style={s.emptyText}>Ningún usuario en riesgo alto/crítico</Text>
        ) : (
          atRiskUsers.slice(0, 5).map((u) => (
            <Pressable
              key={u.user_id}
              onPress={() => router.push(`/admin/usuarios/${u.user_id}` as never)}
              hitSlop={6}
              style={({ pressed }) => [s.riskRow, pressed && { opacity: 0.7 }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.riskName}>{u.name ?? 'Usuario'}</Text>
                <Text style={s.riskMeta}>
                  {u.churn_risk_label.toUpperCase()} · {u.days_since_last_act}d sin actividad
                  {u.anomaly_detected ? ' · ⚠ anomalía' : ''}
                </Text>
              </View>
              <Text style={[s.riskScore, { color: u.churn_risk_label === 'critical' ? palette.danger : palette.warning }]}>
                {Math.round(u.churn_risk * 100)}%
              </Text>
              <MaterialIcons name="chevron-right" size={16} color={palette.smoke} />
            </Pressable>
          ))
        )}
      </PremiumCard>

      {/* ── Quick Actions ── */}
      <GoldDivider label="ACCIONES RÁPIDAS" />
      <View style={s.actionsRow}>
        <Pressable
          style={[s.actionBtn, mlRecalculating && { opacity: 0.5 }]}
          onPress={handleRecalculateML}
          disabled={mlRecalculating}>
          <MaterialIcons name="psychology" size={18} color={palette.goldText} />
          <Text style={s.actionBtnText}>
            {mlRecalculating ? 'CALCULANDO...' : 'RECALCULAR ML'}
          </Text>
        </Pressable>
        <Pressable
          style={s.actionBtn}
          onPress={() => router.push('/admin/inteligencia' as never)}>
          <MaterialIcons name="bar-chart" size={18} color={palette.goldText} />
          <Text style={s.actionBtnText}>VER ML</Text>
        </Pressable>
        <Pressable
          style={s.actionBtn}
          onPress={() => router.push('/admin/auditoria' as never)}>
          <MaterialIcons name="history" size={18} color={palette.goldText} />
          <Text style={s.actionBtnText}>AUDITORÍA</Text>
        </Pressable>
      </View>

      {/* ── Live Feed ── */}
      <GoldDivider label="ACTIVIDAD EN TIEMPO REAL" />
      <PremiumCard style={s.feedCard}>
        {events.length === 0 ? (
          <Text style={s.emptyText}>Sin actividad reciente</Text>
        ) : (
          events.map(evt => <EventRow key={evt.id} event={evt} />)
        )}
      </PremiumCard>

      {/* ── Section shortcuts ── */}
      <GoldDivider label="MÓDULOS DEL CMI" />
      <View style={s.sectionGrid}>
        {SECTIONS.map(sec => (
          <Pressable
            key={sec.route}
            style={s.sectionCard}
            onPress={() => router.push(sec.route as never)}>
            <Text style={s.sectionIcon}>{sec.icon}</Text>
            <Text style={s.sectionLabel}>{sec.label}</Text>
            <Text style={s.sectionDesc}>{sec.desc}</Text>
            <MaterialIcons name="arrow-forward" size={14} color={palette.goldText} style={{ marginTop: spacing.xs }} />
          </Pressable>
        ))}
      </View>

      <View style={{ height: insets.bottom + spacing.xxxl }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { ...typography.caption, color: palette.ash },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  headerEyebrow: { ...typography.label, color: palette.smoke, marginBottom: 2 },
  headerTitle: { ...typography.title, color: palette.ivory },
  headerSub: { ...typography.mono, color: palette.ash, marginTop: 4 },

  // Hero bar — 3 KPIs críticos arriba (kpi-dashboard-design: 5-7 hero max, semantic color)
  heroRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: palette.graphite,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    minHeight: 76,
    justifyContent: 'center',
  },
  heroValue: {
    fontFamily: Fonts.display,
    fontSize: 30,
    letterSpacing: 1,
    lineHeight: 34,
  },
  heroLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 9,
    letterSpacing: 0.8,
    marginTop: 4,
    textAlign: 'center',
  },

  // At-risk users — accionable, va al dossier
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.lineSoft,
  },
  riskName: { ...typography.section, color: palette.ivory, fontSize: 13, letterSpacing: 0.5 },
  riskMeta: { ...typography.caption, color: palette.smoke, fontSize: 11, marginTop: 1 },
  riskScore: { ...typography.label, fontSize: 13, marginRight: 2 },

  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiCard: {
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  kpiValue: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: palette.ivory,
    letterSpacing: 1,
  },
  kpiLabel: {
    ...typography.label,
    color: palette.smoke,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  alertsSection: { gap: spacing.sm, marginBottom: spacing.md },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  alertTitle: { fontFamily: Fonts.sans, fontWeight: '700', fontSize: 13 },
  alertBody: { ...typography.caption, color: palette.ash, marginTop: 2 },

  feedCard: { padding: spacing.md, gap: spacing.sm },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: palette.lineSoft,
  },
  eventIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  eventType: { ...typography.label, color: palette.ivory, fontSize: 10 },
  eventScreen: { ...typography.mono, color: palette.smoke, fontSize: 10 },
  eventTime: { ...typography.mono, color: palette.smoke, fontSize: 10 },
  emptyText: { ...typography.caption, color: palette.smoke, textAlign: 'center', paddingVertical: spacing.md },

  tierCountCard: {
    alignItems: 'center',
    backgroundColor: palette.graphite,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minWidth: 80,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  tierDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  tierCountValue: {
    fontFamily: Fonts.display,
    fontSize: 24,
    letterSpacing: 1,
  },
  tierCountLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 8,
    textAlign: 'center',
  },

  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  actionBtnText: {
    ...typography.label,
    color: palette.goldText,
    fontSize: 9,
  },

  sectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionCard: {
    flex: 1,
    minWidth: 130,
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  sectionIcon: { fontSize: 24, marginBottom: spacing.xs },
  sectionLabel: { ...typography.section, color: palette.ivory, fontSize: 10, textAlign: 'center' },
  sectionDesc: { ...typography.caption, color: palette.smoke, fontSize: 11, textAlign: 'center' },
});
