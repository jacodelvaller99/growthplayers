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

import { GoldDivider, PremiumCard, screen, StatusPill } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { fetchDashboardKPIs, fetchLiveEvents } from '@/lib/admin/queries';
import type { DashboardKPIs, LiveEvent } from '@/lib/admin/types';
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
  { route: '/admin/auditoria',    label: 'Auditoría',       icon: '📋', desc: 'Log de acciones' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MissionControl() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();

  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());
  const channelRef = useRef<ReturnType<typeof intel.events> | null>(null);

  const loadData = useCallback(async () => {
    const [kpiData, evtData] = await Promise.all([
      fetchDashboardKPIs(),
      fetchLiveEvents(10),
    ]);
    setKpis(kpiData);
    setEvents(evtData);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  // Colombia time (UTC-5)
  const colombiaTime = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);

  if (loading) {
    return (
      <View style={[screen.root, s.center]}>
        <ActivityIndicator color={palette.gold} size="large" />
        <Text style={s.loadingText}>Cargando CMI...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={screen.root}
      contentContainerStyle={[screen.content, { paddingTop: insets.top + spacing.lg }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.gold} />
      }>
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerEyebrow}>POLARIS GROWTH INSTITUTE</Text>
          <Text style={s.headerTitle}>CUADRO DE MANDO</Text>
          <Text style={s.headerSub}>Colombia {colombiaTime} · actualizado hace 0s</Text>
        </View>
        <StatusPill label="ADMIN" tone="gold" dot />
      </View>

      {/* ── KPIs ── */}
      <GoldDivider label="KPIs EN TIEMPO REAL" />
      {kpis && (
        <View style={s.kpiGrid}>
          <KpiCard value={kpis.total_users}    label="USUARIOS TOTALES" />
          <KpiCard value={kpis.active_today}   label="ACTIVOS HOY" />
          <KpiCard value={kpis.active_7d}      label="ACTIVOS 7D" />
          <KpiCard value={kpis.avg_engagement} label="AVG ENGAGEMENT" />
          <KpiCard
            value={kpis.critical_churn}
            label="RIESGO CRÍTICO"
            accent={kpis.critical_churn > 0 ? palette.danger : palette.success}
          />
        </View>
      )}

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
            <MaterialIcons name="arrow-forward" size={14} color={palette.gold} style={{ marginTop: spacing.xs }} />
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
