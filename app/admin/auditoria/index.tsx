/**
 * Admin CMI — Auditoría
 *
 * Log completo de todas las acciones admin.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

import { GoldDivider, PremiumCard, screen } from '@/components/polaris';
import { Fonts, palette, spacing, typography } from '@/constants/theme';
import { fetchAuditLog } from '@/lib/admin/queries';
import type { AuditLogEntry } from '@/lib/admin/types';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  if (mins < 1440) return `hace ${Math.floor(mins / 60)}h`;
  return `hace ${Math.floor(mins / 1440)}d`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ACTION_ICONS: Record<string, string> = {
  activate_membership:   '💳',
  deactivate_membership: '🚫',
  grant_course_access:   '🎓',
  revoke_course_access:  '🚫',
  create_access_code:    '🔑',
  deactivate_access_code:'🔒',
  send_message_as_norman:'💬',
  recalculate_ml:        '🧠',
  recalculate_all_ml:    '🧠',
};

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const icon = ACTION_ICONS[entry.action] ?? '⚡';
  const hasMetadata = entry.metadata && Object.keys(entry.metadata).length > 0;

  return (
    <Pressable style={s.row} onPress={() => setExpanded(e => !e)}>
      <Text style={s.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.action}>{entry.action.replace(/_/g, ' ')}</Text>
        {entry.target_type && entry.target_id && (
          <Text style={s.target}>{entry.target_type} · {entry.target_id.substring(0, 16)}</Text>
        )}
        {expanded && hasMetadata && (
          <View style={s.metaBlock}>
            {Object.entries(entry.metadata!).map(([k, v]) => (
              <Text key={k} style={s.metaLine}>
                {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </Text>
            ))}
          </View>
        )}
      </View>
      <Text style={s.time}>{timeAgo(entry.created_at)}</Text>
    </Pressable>
  );
}

export default function AuditoriaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [log, setLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchAuditLog(100);
    setLog(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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
        <Text style={s.title}>AUDITORÍA</Text>
        <Text style={s.badge}>{log.length}</Text>
      </View>

      <GoldDivider label="TODAS LAS ACCIONES ADMIN" />

      <PremiumCard style={s.card}>
        {loading ? (
          <ActivityIndicator color={palette.gold} style={{ padding: spacing.xl }} />
        ) : log.length === 0 ? (
          <Text style={s.emptyText}>Sin acciones registradas</Text>
        ) : (
          log.map(entry => <AuditRow key={entry.id} entry={entry} />)
        )}
      </PremiumCard>

      {/* Legend */}
      <PremiumCard style={[s.card, { marginTop: spacing.md }]}>
        <Text style={s.legendTitle}>LEYENDA</Text>
        {Object.entries(ACTION_ICONS).map(([action, icon]) => (
          <View key={action} style={s.legendRow}>
            <Text style={s.legendIcon}>{icon}</Text>
            <Text style={s.legendAction}>{action.replace(/_/g, ' ')}</Text>
          </View>
        ))}
      </PremiumCard>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { ...typography.title, color: palette.ivory, flex: 1 },
  badge: { ...typography.mono, color: palette.gold, backgroundColor: palette.goldLight, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 999, fontSize: 12 },
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  icon: { fontSize: 16, width: 24, textAlign: 'center' },
  action: { fontFamily: Fonts.sans, fontSize: 13, color: palette.ivory, textTransform: 'capitalize' },
  target: { ...typography.mono, color: palette.smoke, fontSize: 10, marginTop: 1 },
  time: { ...typography.mono, color: palette.smoke, fontSize: 10 },
  metaBlock: { backgroundColor: palette.overlay, borderRadius: 4, padding: spacing.sm, marginTop: spacing.xs },
  metaLine: { ...typography.mono, color: palette.ash, fontSize: 10 },
  emptyText: { ...typography.caption, color: palette.smoke, textAlign: 'center', padding: spacing.xl },
  legendTitle: { ...typography.section, color: palette.smoke, marginBottom: spacing.sm, fontSize: 9 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 },
  legendIcon: { fontSize: 14, width: 24, textAlign: 'center' },
  legendAction: { ...typography.caption, color: palette.ash, textTransform: 'capitalize' },
});
