/**
 * Admin CMI — Moderación de Comunidad
 *
 * Cola de reportes (community_reports). Lista los reportes por estado y permite
 * marcarlos revisado / accionado / descartado. Requisito App Store 1.2 (UGC).
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showAlert } from '@/lib/confirm';

import { GoldDivider, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { REPORT_REASONS } from '@/data/moderation';

// community_reports / community_posts no están en los tipos generados → anyClient.
const anyDb = supabase as any;

const STATUS_FILTERS = ['open', 'reviewed', 'actioned', 'dismissed'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

const STATUS_LABEL: Record<StatusFilter, string> = {
  open:      'ABIERTOS',
  reviewed:  'REVISADOS',
  actioned:  'ACCIONADOS',
  dismissed: 'DESCARTADOS',
};

const REASON_LABEL: Record<string, string> = Object.fromEntries(
  REPORT_REASONS.map((r) => [r.value, r.label]),
);

type ReportTargetType = 'post' | 'comment' | 'event' | 'space';

const TARGET_LABEL: Record<ReportTargetType, string> = {
  post: 'POST', comment: 'COMENTARIO', event: 'EVENTO', space: 'ESPACIO',
};

const TARGET_ACTION_LABEL: Record<ReportTargetType, string> = {
  post: 'ELIMINAR POST',
  comment: 'ELIMINAR COMENTARIO',
  event: 'CANCELAR EVENTO',
  space: 'ARCHIVAR ESPACIO',
};

interface ReportItem {
  id:          string;
  reporter_id: string;
  post_id:     string | null;
  targetType:  ReportTargetType;
  targetId:    string | null;
  reason:      string | null;
  status:      string;
  created_at:  string;
  reporterName: string;
  targetContent: string | null;   // contenido resuelto del post/comentario/evento/espacio
  postAuthorId: string | null;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'ahora';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function AdminComunidadScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [filter, setFilter]   = useState<StatusFilter>('open');
  const [items, setItems]     = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // Columnas polimórficas con FALLBACK: si la migración 20260702 no está
      // aplicada (sin target_type/target_id), reintenta con el select clásico.
      let res = await anyDb
        .from('community_reports')
        .select('id, reporter_id, post_id, reason, status, created_at, target_type, target_id')
        .eq('status', filter)
        .order('created_at', { ascending: false })
        .limit(100);
      if (res.error) {
        res = await anyDb
          .from('community_reports')
          .select('id, reporter_id, post_id, reason, status, created_at')
          .eq('status', filter)
          .order('created_at', { ascending: false })
          .limit(100);
      }
      const { data, error } = res;

      if (error || !data) { setItems([]); return; }
      const rows = (data as any[]).map((r) => ({
        ...r,
        target_type: (r.target_type ?? 'post') as ReportTargetType,
        target_id: r.target_id ?? r.post_id ?? null,
      }));

      // Resolver contenido por tipo (tolerante a "ya borrado").
      const idsOf = (t: ReportTargetType) =>
        [...new Set(rows.filter((r) => r.target_type === t).map((r) => r.target_id).filter(Boolean))];

      const postMap: Record<string, { content: string; user_id: string }> = {};
      const contentMap: Record<string, string> = {};

      const postIds = idsOf('post');
      if (postIds.length > 0) {
        try {
          const { data: posts } = await anyDb.from('community_posts').select('id, content, user_id').in('id', postIds);
          (posts ?? []).forEach((p: any) => { postMap[p.id] = { content: p.content, user_id: p.user_id }; });
        } catch { /* posts pueden no existir */ }
      }
      const commentIds = idsOf('comment');
      if (commentIds.length > 0) {
        try {
          const { data: cs } = await anyDb.from('post_comments').select('id, content').in('id', commentIds);
          (cs ?? []).forEach((c: any) => { contentMap[c.id] = c.content; });
        } catch { /* degradable */ }
      }
      const eventIds = idsOf('event');
      if (eventIds.length > 0) {
        try {
          const { data: evs } = await anyDb.from('community_events').select('id, title, description').in('id', eventIds);
          (evs ?? []).forEach((e: any) => { contentMap[e.id] = [e.title, e.description].filter(Boolean).join(' — '); });
        } catch { /* degradable */ }
      }
      const spaceIds = idsOf('space');
      if (spaceIds.length > 0) {
        try {
          const { data: sps } = await anyDb.from('community_spaces').select('id, name, description').in('id', spaceIds);
          (sps ?? []).forEach((sp: any) => { contentMap[sp.id] = [sp.name, sp.description].filter(Boolean).join(' — '); });
        } catch { /* degradable */ }
      }

      // Resolver nombres (reporters + autores de posts).
      const userIds = [...new Set<string>([
        ...rows.map((r) => r.reporter_id),
        ...Object.values(postMap).map((p) => p.user_id),
      ].filter(Boolean))];
      const nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('user_id, name')
            .in('user_id', userIds);
          (profiles ?? []).forEach((p: any) => { if (p.name) nameMap[p.user_id] = p.name; });
        } catch { /* nombres por defecto */ }
      }

      setItems(rows.map((r) => {
        const post = r.target_type === 'post' && r.target_id ? postMap[r.target_id] : undefined;
        const content = r.target_type === 'post'
          ? (post?.content ?? null)
          : (r.target_id ? contentMap[r.target_id] ?? null : null);
        return {
          id:           r.id,
          reporter_id:  r.reporter_id,
          post_id:      r.post_id,
          targetType:   r.target_type,
          targetId:     r.target_id,
          reason:       r.reason,
          status:       r.status,
          created_at:   r.created_at,
          reporterName: nameMap[r.reporter_id] ?? 'Miembro',
          targetContent: content,
          postAuthorId: post?.user_id ?? null,
        };
      }));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const setStatus = async (item: ReportItem, status: StatusFilter) => {
    setBusyId(item.id);
    // Optimista: si deja de coincidir con el filtro actual, lo quitamos de la lista.
    setItems((prev) => prev.filter((r) => r.id !== item.id));
    try {
      await anyDb.from('community_reports').update({ status }).eq('id', item.id);
    } catch {
      load(); // revertir si falla
    }
    setBusyId(null);
  };

  // Acción dura por tipo de contenido (post/comentario → eliminar; evento →
  // cancelar+eliminar visibilidad; espacio → archivar, NO borrar: sus posts
  // quedan para auditoría). Destructiva → confirmación obligatoria.
  const deleteTarget = (item: ReportItem) => {
    if (!item.targetId) return;
    const messages: Record<ReportTargetType, string> = {
      post: 'La publicación reportada se eliminará permanentemente.',
      comment: 'El comentario reportado se eliminará permanentemente.',
      event: 'El evento reportado quedará cancelado para todos los asistentes.',
      space: 'El espacio reportado se archivará (deja de ser visible; su contenido queda para auditoría).',
    };
    showAlert(
      TARGET_ACTION_LABEL[item.targetType],
      `${messages[item.targetType]} El reporte quedará como accionado. ¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar', style: 'destructive',
          onPress: async () => {
            setBusyId(item.id);
            try {
              if (item.targetType === 'post') {
                await anyDb.from('community_posts').delete().eq('id', item.targetId);
              } else if (item.targetType === 'comment') {
                await anyDb.from('post_comments').delete().eq('id', item.targetId);
              } else if (item.targetType === 'event') {
                await anyDb.from('community_events').update({ status: 'cancelled' }).eq('id', item.targetId);
              } else if (item.targetType === 'space') {
                await anyDb.from('community_spaces').update({ is_archived: true }).eq('id', item.targetId);
              }
              await anyDb.from('community_reports').update({ status: 'actioned' }).eq('id', item.id);
              setItems((prev) => prev.filter((r) => r.id !== item.id));
            } catch {
              load();
            }
            setBusyId(null);
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[sc.root, s.center]}>
        <ActivityIndicator color={palette.goldText} size="large" />
        <Text style={s.loadingText}>Cargando reportes…</Text>
      </View>
    );
  }

  return (
    <View style={[sc.root, { paddingTop: insets.top + spacing.lg }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver"  hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>MODERACIÓN</Text>
        <Text style={s.badge}>{items.length}</Text>
      </View>

      {/* Filtros de estado */}
      <View style={s.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === f }}
            accessibilityLabel={`Reportes ${STATUS_LABEL[f].toLowerCase()}`}>
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>{STATUS_LABEL[f]}</Text>
          </Pressable>
        ))}
      </View>

      <GoldDivider />

      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xxxl, gap: spacing.md }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={palette.goldText} />
        }
        ListEmptyComponent={
          <Text style={s.emptyText}>
            {filter === 'open' ? 'Sin reportes pendientes. La comunidad está limpia.' : 'Sin reportes en este estado.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardTop}>
              <View style={[s.reasonPill]}>
                <MaterialIcons name="flag" size={12} color={palette.goldText} />
                <Text style={s.reasonText}>{REASON_LABEL[item.reason ?? ''] ?? (item.reason ?? 'Sin razón').toUpperCase()}</Text>
              </View>
              <View style={s.typePill}>
                <Text style={s.typePillText}>{TARGET_LABEL[item.targetType]}</Text>
              </View>
              <Text style={s.time}>{timeAgo(item.created_at)}</Text>
            </View>

            {item.targetContent ? (
              <Text style={s.postContent} numberOfLines={6}>“{item.targetContent}”</Text>
            ) : (
              <Text style={s.postMissing}>El contenido ya no existe (eliminado).</Text>
            )}

            <Text style={s.meta}>Reportado por {item.reporterName}</Text>

            {/* Acciones de moderación */}
            {filter !== 'actioned' && filter !== 'dismissed' ? (
              <View style={s.actions}>
                {item.targetId && (
                  <Pressable
                    style={[s.actionBtn, s.actionDanger, busyId === item.id && { opacity: 0.5 }]}
                    disabled={busyId === item.id}
                    onPress={() => deleteTarget(item)}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: busyId === item.id }}
                    accessibilityLabel={`${TARGET_ACTION_LABEL[item.targetType]} (permanente)`}>
                    <MaterialIcons name="delete" size={15} color={palette.danger} />
                    <Text style={[s.actionText, { color: palette.danger }]}>{TARGET_ACTION_LABEL[item.targetType]}</Text>
                  </Pressable>
                )}
                {filter === 'open' && (
                  <Pressable
                    style={[s.actionBtn, busyId === item.id && { opacity: 0.5 }]}
                    disabled={busyId === item.id}
                    onPress={() => setStatus(item, 'reviewed')}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: busyId === item.id }}
                    accessibilityLabel="Marcar reporte como revisado">
                    <MaterialIcons name="visibility" size={15} color={palette.goldText} />
                    <Text style={s.actionText}>REVISADO</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[s.actionBtn, busyId === item.id && { opacity: 0.5 }]}
                  disabled={busyId === item.id}
                  onPress={() => setStatus(item, 'dismissed')}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busyId === item.id }}
                  accessibilityLabel="Descartar reporte">
                  <MaterialIcons name="close" size={15} color={palette.ash} />
                  <Text style={[s.actionText, { color: palette.ash }]}>DESCARTAR</Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.actions}>
                <Pressable
                  style={[s.actionBtn, busyId === item.id && { opacity: 0.5 }]}
                  disabled={busyId === item.id}
                  onPress={() => setStatus(item, 'open')}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busyId === item.id }}
                  accessibilityLabel="Reabrir reporte">
                  <MaterialIcons name="undo" size={15} color={palette.goldText} />
                  <Text style={s.actionText}>REABRIR</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { ...typography.caption, color: palette.ash },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  backBtn: { padding: spacing.xs },
  title: { ...typography.title, color: palette.ivory, flex: 1 },
  badge: {
    ...typography.mono,
    color: palette.goldText,
    backgroundColor: palette.goldLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    fontSize: 12,
  },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: palette.line,
  },
  filterChipActive: { backgroundColor: palette.goldLight, borderColor: palette.gold },
  filterText: { ...typography.label, color: palette.ash },
  filterTextActive: { color: palette.goldText },

  emptyText: { ...typography.caption, color: palette.smoke, textAlign: 'center', padding: spacing.xl, lineHeight: 18 },

  card: {
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reasonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: palette.goldLight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  reasonText: { ...typography.label, color: palette.goldText, fontSize: 9 },
  typePill: { borderWidth: 1, borderColor: palette.line, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  typePillText: { ...typography.label, color: palette.ash, fontSize: 8, letterSpacing: 0.8 },
  time: { ...typography.mono, color: palette.smoke, fontSize: 10, marginLeft: 'auto' },

  postContent: { fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory, lineHeight: 21, fontStyle: 'italic' },
  postMissing: { fontFamily: Fonts.sans, fontSize: 13, color: palette.smoke, fontStyle: 'italic' },
  meta: { ...typography.mono, color: palette.ash, fontSize: 11 },

  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 38,
  },
  actionDanger: { borderColor: palette.danger + '55' },
  actionText: { ...typography.label, color: palette.goldText, fontSize: 9 },
});
