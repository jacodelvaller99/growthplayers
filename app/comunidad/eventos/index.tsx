/**
 * EL CÍRCULO — Eventos: lista global (próximos / pasados) + crear.
 * Incluye eventos globales y de espacios; filtrados por bloqueos del usuario.
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

import { ENV } from '@/app/config/env';
import { CircleDisabled, CircleEmpty, EventCard } from '@/components/circle';
import { GoldDivider, useScreen } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { fetchBlockedIds, fetchEvents, fetchMyRsvps } from '@/lib/circle';
import { isUpcoming, sortUpcomingEvents, type CircleEvent, type RsvpStatus } from '@/lib/circleLogic';

type Tab = 'proximos' | 'pasados';

export default function EventosScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();

  const [tab, setTab] = useState<Tab>('proximos');
  const [events, setEvents] = useState<CircleEvent[]>([]);
  const [myRsvps, setMyRsvps] = useState<Record<string, RsvpStatus>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [evts, rsvps, blocked] = await Promise.all([
      fetchEvents(),
      fetchMyRsvps(userId ?? null),
      fetchBlockedIds(userId ?? null),
    ]);
    setEvents(sortUpcomingEvents(evts.filter((e) => !blocked.has(e.created_by)), new Date()));
    setMyRsvps(Object.fromEntries(rsvps.map((r) => [r.event_id, r.status])));
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  if (!ENV.socialSpacesEnabled) {
    return <View style={[sc.root, { paddingTop: insets.top }]}><CircleDisabled /></View>;
  }

  const now = new Date();
  const shown = events.filter((e) => (tab === 'proximos' ? isUpcoming(e, now) : !isUpcoming(e, now)));

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={palette.goldText} />}>

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>EVENTOS</Text>
        <Pressable
          style={s.createBtn}
          onPress={() => router.push('/comunidad/eventos/crear' as never)}
          accessibilityRole="button"
          accessibilityLabel="Convocar un evento nuevo">
          <MaterialIcons name="add" size={16} color={palette.ink} />
          <Text style={s.createBtnText}>CONVOCAR</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['proximos', 'pasados'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[s.tabBtn, tab === t && s.tabBtnActive]}
            onPress={() => setTab(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            accessibilityLabel={t === 'proximos' ? 'Eventos próximos' : 'Eventos pasados'}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'proximos' ? 'PRÓXIMOS' : 'PASADOS'}
            </Text>
          </Pressable>
        ))}
      </View>

      <GoldDivider label={`${shown.length} ${tab === 'proximos' ? 'POR VENIR' : 'REALIZADOS'}`} />

      {loading ? (
        <ActivityIndicator color={palette.goldText} style={{ marginTop: spacing.xxxl }} />
      ) : shown.length === 0 ? (
        tab === 'proximos' ? (
          <CircleEmpty
            icon="event"
            text={'No hay eventos por venir.\nConvoca a la hermandad — un café, una caminata, una llamada.'}
            ctaLabel="CONVOCAR EVENTO"
            onCta={() => router.push('/comunidad/eventos/crear' as never)}
          />
        ) : (
          <CircleEmpty icon="history" text="Aún no hay eventos pasados." />
        )
      ) : (
        <View style={s.list}>
          {shown.map((e) => (
            <EventCard
              key={e.id}
              event={e}
              myRsvp={myRsvps[e.id] ?? null}
              onPress={() => router.push(`/comunidad/eventos/${e.id}` as never)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { ...typography.title, color: palette.ivory, flex: 1 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette.gold, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: 8, minHeight: 36 },
  createBtnText: { ...typography.label, color: palette.ink, fontSize: 9, letterSpacing: 1 },
  tabRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  tabBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radii.sm, borderWidth: 1, borderColor: palette.line, minHeight: 40, justifyContent: 'center' },
  tabBtnActive: { backgroundColor: palette.goldLight, borderColor: palette.gold },
  tabText: { ...typography.section, color: palette.ash, fontSize: 10 },
  tabTextActive: { color: palette.goldText },
  list: { paddingHorizontal: spacing.lg, gap: spacing.sm },
});
