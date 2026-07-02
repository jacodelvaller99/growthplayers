/**
 * EL CÍRCULO — hub de la red social interna.
 *
 * Próximos eventos (RSVP), mis espacios, solicitudes de conexión y accesos a la
 * plaza general y mensajes. Detrás de ENV.socialSpacesEnabled (default off):
 * apagado muestra un estado honesto con CTA a mensajes. El EULA de tolerancia
 * cero se acepta en la plaza (mismo storage key/consent — aquí solo se verifica).
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
import { CircleEmpty, EventCard, SpaceCard } from '@/components/circle';
import { GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { COMMUNITY_EULA_STORAGE_KEY, COMMUNITY_EULA_VERSION } from '@/data/moderation';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import {
  fetchBlockedIds,
  fetchEvents,
  fetchMyConnections,
  fetchMyMemberships,
  fetchMyRsvps,
  fetchSpaces,
} from '@/lib/circle';
import {
  connectionStateFor,
  filterBlockedAuthors,
  isUpcoming,
  sortUpcomingEvents,
  type CircleEvent,
  type Connection,
  type RsvpStatus,
  type Space,
} from '@/lib/circleLogic';
import { readLocal } from '@/storage/local';

export default function CirculoHubScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eulaOk, setEulaOk] = useState<boolean | null>(null);
  const [events, setEvents] = useState<CircleEvent[]>([]);
  const [myRsvps, setMyRsvps] = useState<Record<string, RsvpStatus>>({});
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [mySpaceIds, setMySpaceIds] = useState<Set<string>>(new Set());
  const [pendingReceived, setPendingReceived] = useState(0);
  const [connectionCount, setConnectionCount] = useState(0);

  // EULA: mismo gate que la plaza (solo verificación local — la aceptación vive allá).
  useEffect(() => {
    let cancelled = false;
    readLocal<number>(COMMUNITY_EULA_STORAGE_KEY)
      .then((v) => { if (!cancelled) setEulaOk((v ?? 0) >= COMMUNITY_EULA_VERSION); })
      .catch(() => { if (!cancelled) setEulaOk(false); });
    return () => { cancelled = true; };
  }, []);

  const load = useCallback(async () => {
    if (!ENV.socialSpacesEnabled) { setLoading(false); setRefreshing(false); return; }
    const [evts, rsvps, allSpaces, memberships, conns, blocked] = await Promise.all([
      fetchEvents(),
      fetchMyRsvps(userId ?? null),
      fetchSpaces(),
      fetchMyMemberships(userId ?? null),
      fetchMyConnections(userId ?? null),
      fetchBlockedIds(userId ?? null),
    ]);
    const now = new Date();
    const visibleEvents = filterBlockedAuthors(
      evts.map((e) => ({ ...e, user_id: e.created_by })),
      blocked,
    );
    setEvents(sortUpcomingEvents(visibleEvents, now).filter((e) => isUpcoming(e, now)).slice(0, 3));
    setMyRsvps(Object.fromEntries(rsvps.map((r) => [r.event_id, r.status])));
    setSpaces(allSpaces);
    setMySpaceIds(new Set(memberships.map((m) => m.space_id)));
    const pending = conns.filter((c: Connection) => connectionStateFor(userId ?? '', c) === 'pending_received').length;
    setPendingReceived(pending);
    setConnectionCount(conns.filter((c: Connection) => c.status === 'accepted').length);
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // ── Flag apagado: estado honesto ──────────────────────────────────────────────
  if (!ENV.socialSpacesEnabled) {
    return (
      <View style={[sc.root, s.center, { paddingTop: insets.top }]}>
        <MaterialIcons name="workspaces" size={40} color={palette.goldText} />
        <Text style={s.soonTitle}>EL CÍRCULO</Text>
        <Text style={s.soonText}>
          Eventos entre miembros, espacios por tema y conexiones. Se está forjando —
          llega pronto a tu hermandad.
        </Text>
        <Pressable
          style={s.soonCta}
          onPress={() => router.push('/comunidad/mensajes' as never)}
          accessibilityRole="button"
          accessibilityLabel="Ir a mensajes">
          <Text style={s.soonCtaText}>IR A MENSAJES</Text>
        </Pressable>
      </View>
    );
  }

  const mySpaces = spaces.filter((sp) => mySpaceIds.has(sp.id));

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={palette.goldText} />}>

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>EL CÍRCULO</Text>
          <Text style={s.subtitle}>Tu hermandad, en movimiento</Text>
        </View>
        <Pressable
          style={s.dmBtn}
          onPress={() => router.push('/comunidad/mensajes' as never)}
          accessibilityRole="button"
          accessibilityLabel="Mensajes directos">
          <MaterialIcons name="forum" size={18} color={palette.goldText} />
        </Pressable>
      </View>

      {/* EULA pendiente → se acepta en la plaza */}
      {eulaOk === false && (
        <PremiumCard style={s.card}>
          <Text style={s.eulaText}>
            Antes de entrar a El Círculo, acepta el Código de la Hermandad en la plaza general.
          </Text>
          <Pressable
            style={s.eulaCta}
            onPress={() => router.push('/bienestar/comunidad' as never)}
            accessibilityRole="button"
            accessibilityLabel="Ir a la plaza para aceptar el código">
            <Text style={s.eulaCtaText}>LEER Y ACEPTAR</Text>
          </Pressable>
        </PremiumCard>
      )}

      {loading ? (
        <ActivityIndicator color={palette.goldText} style={{ marginTop: spacing.xxxl }} />
      ) : (
        <>
          {/* Próximos eventos */}
          <GoldDivider label="PRÓXIMOS EVENTOS" />
          <View style={s.section}>
            {events.length === 0 ? (
              <CircleEmpty
                icon="event"
                text={'Nadie ha creado un evento aún.\nSé el primero en convocar a la hermandad.'}
                ctaLabel="CREAR EVENTO"
                onCta={() => router.push('/comunidad/eventos/crear' as never)}
              />
            ) : (
              events.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  myRsvp={myRsvps[e.id] ?? null}
                  onPress={() => router.push(`/comunidad/eventos/${e.id}` as never)}
                />
              ))
            )}
            {events.length > 0 && (
              <Pressable
                style={s.seeAll}
                onPress={() => router.push('/comunidad/eventos' as never)}
                accessibilityRole="button"
                accessibilityLabel="Ver todos los eventos">
                <Text style={s.seeAllText}>VER TODOS →</Text>
              </Pressable>
            )}
          </View>

          {/* Mis espacios */}
          <GoldDivider label={`MIS ESPACIOS (${mySpaces.length})`} />
          <View style={s.section}>
            {mySpaces.length === 0 ? (
              <CircleEmpty
                icon="workspaces"
                text={'Todavía no perteneces a ningún espacio.\nDescubre círculos por tema o crea el tuyo.'}
                ctaLabel="DESCUBRIR ESPACIOS"
                onCta={() => router.push('/comunidad/espacios' as never)}
              />
            ) : (
              <>
                {mySpaces.slice(0, 4).map((sp) => (
                  <SpaceCard
                    key={sp.id}
                    space={sp}
                    isMember
                    onPress={() => router.push(`/comunidad/espacios/${sp.id}` as never)}
                  />
                ))}
                <Pressable
                  style={s.seeAll}
                  onPress={() => router.push('/comunidad/espacios' as never)}
                  accessibilityRole="button"
                  accessibilityLabel="Descubrir más espacios">
                  <Text style={s.seeAllText}>DESCUBRIR MÁS →</Text>
                </Pressable>
              </>
            )}
          </View>

          {/* Conexiones */}
          <GoldDivider label="CONEXIONES" />
          <View style={s.section}>
            <Pressable
              style={s.rowLink}
              onPress={() => router.push('/comunidad/conexiones' as never)}
              accessibilityRole="button"
              accessibilityLabel={`Conexiones: ${connectionCount} activas${pendingReceived > 0 ? `, ${pendingReceived} solicitudes pendientes` : ''}`}>
              <MaterialIcons name="group" size={20} color={palette.goldText} />
              <View style={{ flex: 1 }}>
                <Text style={s.rowLinkTitle}>Mi red</Text>
                <Text style={s.rowLinkSub}>
                  {connectionCount} {connectionCount === 1 ? 'conexión' : 'conexiones'}
                </Text>
              </View>
              {pendingReceived > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{pendingReceived}</Text>
                </View>
              )}
              <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
            </Pressable>
          </View>

          {/* Accesos */}
          <GoldDivider label="TAMBIÉN EN TU COMUNIDAD" />
          <View style={s.section}>
            <Pressable
              style={s.rowLink}
              onPress={() => router.push('/bienestar/comunidad' as never)}
              accessibilityRole="button"
              accessibilityLabel="Ir a la plaza general">
              <MaterialIcons name="campaign" size={20} color={palette.goldText} />
              <View style={{ flex: 1 }}>
                <Text style={s.rowLinkTitle}>La plaza</Text>
                <Text style={s.rowLinkSub}>El feed abierto de toda la hermandad</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
            </Pressable>
            <Pressable
              style={s.rowLink}
              onPress={() => router.push('/comunidad/mensajes' as never)}
              accessibilityRole="button"
              accessibilityLabel="Ir a mensajes directos">
              <MaterialIcons name="forum" size={20} color={palette.goldText} />
              <View style={{ flex: 1 }}>
                <Text style={s.rowLinkTitle}>Mensajes</Text>
                <Text style={s.rowLinkSub}>Conversaciones 1 a 1</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  soonTitle: { ...typography.title, color: palette.ivory, fontSize: 20, letterSpacing: 2 },
  soonText: { ...typography.body, color: palette.ash, textAlign: 'center', lineHeight: 20 },
  soonCta: { borderWidth: 1, borderColor: palette.gold, borderRadius: radii.sm, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, minHeight: 44, justifyContent: 'center', marginTop: spacing.sm },
  soonCtaText: { ...typography.label, color: palette.goldText, letterSpacing: 1 },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { ...typography.title, color: palette.ivory },
  subtitle: { ...typography.caption, color: palette.smoke, fontSize: 11, marginTop: 1 },
  dmBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.goldLight, borderWidth: 1, borderColor: palette.lineGold },

  card: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, gap: spacing.md },
  eulaText: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 19 },
  eulaCta: { backgroundColor: palette.gold, borderRadius: radii.sm, paddingVertical: spacing.md, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  eulaCtaText: { ...typography.label, color: palette.ink, letterSpacing: 1 },

  section: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  seeAll: { alignSelf: 'flex-end', paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, minHeight: 38, justifyContent: 'center' },
  seeAllText: { ...typography.label, color: palette.goldText, fontSize: 10, letterSpacing: 1 },

  rowLink: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: palette.graphite, borderColor: palette.line, borderWidth: 1,
    borderRadius: radii.md, padding: spacing.md, minHeight: 56,
  },
  rowLinkTitle: { ...typography.body, color: palette.ivory, fontSize: 14, fontWeight: '600' },
  rowLinkSub: { ...typography.caption, color: palette.smoke, fontSize: 11, marginTop: 1 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { ...typography.label, color: palette.ink, fontSize: 10 },
});
