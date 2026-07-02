/**
 * EL CÍRCULO — Detalle de evento: RSVP (asistiré / tal vez / no voy) optimista,
 * lista de asistentes (filtrada por bloqueos), cupo con progressbar, cancelar
 * (creador o admin) y reportar evento (App Store 1.2).
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ENV } from '@/app/config/env';
import { Avatar } from '@/components/Avatar';
import { CircleDisabled, CircleEmpty } from '@/components/circle';
import { GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { REPORT_REASONS } from '@/data/moderation';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import {
  cancelEvent,
  fetchAttendees,
  fetchBlockedIds,
  fetchEvent,
  fetchMyRsvps,
  reportTarget,
  setRsvp,
  type Attendee,
} from '@/lib/circle';
import {
  canManageEvent,
  eventCapacityState,
  formatEventDate,
  type CircleEvent,
  type RsvpStatus,
} from '@/lib/circleLogic';

const RSVP_OPTIONS: { value: RsvpStatus; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: 'going', label: 'ASISTIRÉ', icon: 'check-circle' },
  { value: 'maybe', label: 'TAL VEZ', icon: 'help-outline' },
  { value: 'declined', label: 'NO VOY', icon: 'cancel' },
];

export default function EventoDetalleScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const eventId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [event, setEvent] = useState<CircleEvent | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [myRsvp, setMyRsvp] = useState<RsvpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rsvpBusy, setRsvpBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId) return;
    const [ev, atts, rsvps, blocked] = await Promise.all([
      fetchEvent(eventId),
      fetchAttendees(eventId),
      fetchMyRsvps(userId ?? null),
      fetchBlockedIds(userId ?? null),
    ]);
    setEvent(ev);
    setAttendees(atts.filter((a) => !blocked.has(a.user_id)));
    setMyRsvp(rsvps.find((r) => r.event_id === eventId)?.status ?? null);
    setLoading(false);
    setRefreshing(false);
  }, [eventId, userId]);

  useEffect(() => { load(); }, [load]);

  if (!ENV.socialSpacesEnabled) {
    return <View style={[sc.root, { paddingTop: insets.top }]}><CircleDisabled /></View>;
  }

  const handleRsvp = async (status: RsvpStatus) => {
    if (!userId || !eventId || rsvpBusy || !event) return;
    const cap = eventCapacityState(event);
    if (status === 'going' && cap === 'full' && myRsvp !== 'going') {
      setNotice('El cupo de este evento ya está lleno.');
      return;
    }
    setRsvpBusy(true);
    const prev = myRsvp;
    setMyRsvp(status);
    // Optimista sobre going_count local
    setEvent((e) => e ? {
      ...e,
      going_count: Math.max(0, e.going_count + (status === 'going' ? 1 : 0) - (prev === 'going' ? 1 : 0)),
    } : e);
    const res = await setRsvp(userId, eventId, status);
    if (!res.success) { setMyRsvp(prev); await load(); }
    else await load();
    setRsvpBusy(false);
  };

  const handleCancel = () => {
    if (!eventId) return;
    Alert.alert('Cancelar evento', 'Los asistentes verán el evento como cancelado. ¿Continuar?', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Cancelar evento', style: 'destructive',
        onPress: async () => { await cancelEvent(eventId); await load(); },
      },
    ]);
  };

  const submitReport = async (reason: string) => {
    if (!userId || !eventId) return;
    setReportBusy(true);
    const res = await reportTarget(userId, 'event', eventId, reason);
    setNotice(res.success
      ? 'Gracias. Tu reporte fue enviado al equipo de moderación.'
      : 'No pudimos enviar el reporte. Inténtalo de nuevo.');
    setReportBusy(false);
    setReportOpen(false);
  };

  const going = attendees.filter((a) => a.status === 'going');
  const maybe = attendees.filter((a) => a.status === 'maybe');
  const canManage = !!event && canManageEvent(userId ?? null, event, false);
  const cancelled = event?.status === 'cancelled';

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
        <Text style={s.title}>EVENTO</Text>
        <Pressable
          onPress={() => setReportOpen(true)}
          style={s.overflowBtn}
          accessibilityRole="button"
          accessibilityLabel="Reportar este evento">
          <MaterialIcons name="flag" size={18} color={palette.smoke} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={palette.goldText} style={{ marginTop: spacing.xxxl }} />
      ) : !event ? (
        <CircleEmpty icon="search-off" text="Este evento ya no existe." />
      ) : (
        <>
          <PremiumCard style={s.card}>
            <Text style={s.eventTitle}>{event.title}</Text>
            {cancelled && <Text style={s.cancelledBadge}>CANCELADO</Text>}
            <View style={s.metaRow}>
              <MaterialIcons name="schedule" size={16} color={palette.goldText} />
              <Text style={s.metaText}>{formatEventDate(event.starts_at, event.timezone)} · {event.duration_minutes} min</Text>
            </View>
            <View style={s.metaRow}>
              <MaterialIcons name={event.location_type === 'virtual' ? 'videocam' : 'place'} size={16} color={palette.goldText} />
              {event.location_type === 'virtual' && event.location_text ? (
                <Pressable
                  onPress={() => { Linking.openURL(event.location_text!).catch(() => {}); }}
                  accessibilityRole="link"
                  accessibilityLabel="Abrir link de la llamada">
                  <Text style={[s.metaText, s.link]} numberOfLines={1}>{event.location_text}</Text>
                </Pressable>
              ) : (
                <Text style={s.metaText} numberOfLines={2}>{event.location_text ?? '—'}</Text>
              )}
            </View>
            {!!event.description && <Text style={s.desc}>{event.description}</Text>}

            {/* Cupo */}
            {event.capacity != null && (
              <View style={s.capacityWrap}>
                <View
                  style={s.capacityTrack}
                  accessibilityRole="progressbar"
                  accessibilityLabel="Cupo del evento"
                  accessibilityValue={{ min: 0, max: event.capacity, now: Math.min(event.going_count, event.capacity) }}>
                  <View style={[s.capacityFill, { width: `${Math.min(100, (event.going_count / event.capacity) * 100)}%` }]} />
                </View>
                <Text style={s.capacityText}>
                  {event.going_count}/{event.capacity} cupos
                  {eventCapacityState(event) === 'full' ? ' · LLENO' : ''}
                </Text>
              </View>
            )}

            {/* RSVP */}
            {!cancelled && (
              <View style={s.rsvpRow}>
                {RSVP_OPTIONS.map((o) => {
                  const active = myRsvp === o.value;
                  return (
                    <Pressable
                      key={o.value}
                      style={[s.rsvpBtn, active && s.rsvpBtnActive, rsvpBusy && { opacity: 0.6 }]}
                      onPress={() => handleRsvp(o.value)}
                      disabled={rsvpBusy}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active, disabled: rsvpBusy }}
                      accessibilityLabel={`${o.label}${active ? ', seleccionado' : ''}`}>
                      <MaterialIcons name={o.icon} size={16} color={active ? palette.ink : palette.ash} />
                      <Text style={[s.rsvpText, active && { color: palette.ink }]}>{o.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {canManage && !cancelled && (
              <Pressable
                style={s.cancelBtn}
                onPress={handleCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancelar este evento (permanente)">
                <MaterialIcons name="event-busy" size={16} color={palette.danger} />
                <Text style={s.cancelBtnText}>CANCELAR EVENTO</Text>
              </Pressable>
            )}
          </PremiumCard>

          {/* Asistentes */}
          <GoldDivider label={`ASISTIRÁN (${going.length})`} />
          <View style={s.section}>
            {going.length === 0 ? (
              <CircleEmpty icon="group" text="Nadie ha confirmado todavía. Sé el primero." />
            ) : (
              going.map((a) => (
                <View key={a.user_id} style={s.attendeeRow}>
                  <Avatar id={a.user_id} name={a.name} uri={a.avatar ?? undefined} size={30} />
                  <Text style={s.attendeeName}>{a.name}</Text>
                </View>
              ))
            )}
            {maybe.length > 0 && (
              <Text style={s.maybeLine}>{maybe.length} más en {'"'}tal vez{'"'}</Text>
            )}
          </View>
        </>
      )}

      {notice && (
        <Text style={s.notice} accessibilityLiveRegion="polite" role="alert">{notice}</Text>
      )}

      {/* Reporte */}
      <Modal visible={reportOpen} transparent animationType="fade" onRequestClose={() => setReportOpen(false)}>
        <Pressable style={s.sheetOverlay} onPress={() => setReportOpen(false)} accessibilityRole="button" accessibilityLabel="Cerrar">
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>¿Por qué reportas este evento?</Text>
            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r.value}
                style={[s.sheetRow, reportBusy && { opacity: 0.5 }]}
                disabled={reportBusy}
                onPress={() => submitReport(r.value)}
                accessibilityRole="button"
                accessibilityState={{ disabled: reportBusy }}
                accessibilityLabel={`Reportar por: ${r.label}`}>
                <Text style={s.sheetText}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { ...typography.title, color: palette.ivory, flex: 1 },
  overflowBtn: { padding: spacing.xs, minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },

  card: { marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, gap: spacing.sm },
  eventTitle: { ...typography.title, color: palette.ivory, fontSize: 18 },
  cancelledBadge: { ...typography.label, color: palette.danger, fontSize: 10, letterSpacing: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { ...typography.body, color: palette.ash, fontSize: 13, flexShrink: 1 },
  link: { color: palette.goldText, textDecorationLine: 'underline' },
  desc: { ...typography.body, color: palette.ivory, fontSize: 13.5, lineHeight: 20, marginTop: spacing.xs },

  capacityWrap: { gap: 4, marginTop: spacing.xs },
  capacityTrack: { height: 6, backgroundColor: palette.charcoal, borderRadius: 3, overflow: 'hidden' },
  capacityFill: { height: 6, borderRadius: 3, backgroundColor: palette.gold },
  capacityText: { ...typography.mono, color: palette.smoke, fontSize: 10 },

  rsvpRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  rsvpBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: palette.line, borderRadius: radii.sm, paddingVertical: spacing.sm, minHeight: 44 },
  rsvpBtnActive: { backgroundColor: palette.gold, borderColor: palette.gold },
  rsvpText: { ...typography.label, color: palette.ash, fontSize: 9, letterSpacing: 0.6 },

  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: palette.danger, borderRadius: radii.sm, paddingVertical: spacing.sm, marginTop: spacing.sm, minHeight: 44 },
  cancelBtnText: { ...typography.label, color: palette.danger, fontSize: 9, letterSpacing: 1 },

  section: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs, minHeight: 44 },
  attendeeName: { ...typography.body, color: palette.ivory, fontSize: 13.5 },
  maybeLine: { ...typography.caption, color: palette.smoke, fontSize: 11, fontStyle: 'italic', marginTop: spacing.xs },

  notice: { ...typography.caption, color: palette.goldText, textAlign: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.sm, fontSize: 12 },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: palette.blackDeep, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, paddingBottom: spacing.xxxl, gap: 4 },
  sheetTitle: { ...typography.section, color: palette.ivory, marginBottom: spacing.sm, fontSize: 12 },
  sheetRow: { paddingVertical: spacing.md, minHeight: 48, justifyContent: 'center' },
  sheetText: { ...typography.body, color: palette.ivory, fontSize: 14 },
});
