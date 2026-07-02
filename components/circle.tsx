/**
 * El Círculo — tarjetas y piezas de UI de la red social interna.
 * Tokens de tema SIEMPRE (goldText para texto dorado, gold solo en fills);
 * a11y completa en cada Pressable. Barrel de feature (patrón components/memory.tsx).
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  eventCapacityState,
  formatEventDate,
  type CircleEvent,
  type RsvpStatus,
  type Space,
} from '@/lib/circleLogic';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';

// ─── SpaceCard ────────────────────────────────────────────────────────────────

export function SpaceCard({ space, isMember, onPress }: {
  space: Space;
  isMember: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.spaceCard, pressed && { opacity: 0.75 }]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Espacio ${space.name}, ${space.members_count} miembros${isMember ? ', eres miembro' : ''}`}>
      <Text style={s.spaceEmoji}>{space.emoji ?? '◆'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.spaceName} numberOfLines={1}>{space.name}</Text>
        {!!space.description && <Text style={s.spaceDesc} numberOfLines={2}>{space.description}</Text>}
        <Text style={s.spaceMeta}>
          {space.members_count} {space.members_count === 1 ? 'miembro' : 'miembros'}
          {isMember ? ' · TU ESPACIO' : ''}
        </Text>
      </View>
      {onPress && <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />}
    </Pressable>
  );
}

// ─── EventCard ────────────────────────────────────────────────────────────────

const RSVP_LABEL: Record<RsvpStatus, string> = { going: 'ASISTIRÉ', maybe: 'TAL VEZ', declined: 'NO VOY' };

export function EventCard({ event, myRsvp, onPress }: {
  event: CircleEvent;
  myRsvp?: RsvpStatus | null;
  onPress?: () => void;
}) {
  const cancelled = event.status === 'cancelled';
  const cap = eventCapacityState(event);
  const when = formatEventDate(event.starts_at, event.timezone);
  return (
    <Pressable
      style={({ pressed }) => [s.eventCard, pressed && { opacity: 0.75 }, cancelled && { opacity: 0.55 }]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Evento ${event.title}, ${when}, ${event.going_count} asistirán${cancelled ? ', cancelado' : ''}${myRsvp ? `, tu respuesta: ${RSVP_LABEL[myRsvp].toLowerCase()}` : ''}`}>
      <View style={s.eventDateBadge}>
        <MaterialIcons
          name={event.location_type === 'virtual' ? 'videocam' : 'place'}
          size={16}
          color={palette.goldText}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.eventTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={s.eventWhen} numberOfLines={1}>{when}</Text>
        <Text style={s.eventMeta} numberOfLines={1}>
          {cancelled
            ? 'CANCELADO'
            : `${event.going_count} asistirá${event.going_count === 1 ? '' : 'n'}${cap === 'full' ? ' · CUPO LLENO' : event.capacity != null ? ` · cupo ${event.capacity}` : ''}`}
        </Text>
      </View>
      {myRsvp && !cancelled && (
        <View style={[s.rsvpPill, myRsvp === 'going' && s.rsvpPillGoing]}>
          <Text style={[s.rsvpPillText, myRsvp === 'going' && { color: palette.ink }]}>{RSVP_LABEL[myRsvp]}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Sección vacía (estado honesto con CTA opcional) ─────────────────────────

export function CircleEmpty({ icon, text, ctaLabel, onCta }: {
  icon: keyof typeof MaterialIcons.glyphMap;
  text: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <View style={s.empty}>
      <MaterialIcons name={icon} size={22} color={palette.smoke} />
      <Text style={s.emptyText}>{text}</Text>
      {ctaLabel && onCta && (
        <Pressable
          style={s.emptyCta}
          onPress={onCta}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}>
          <Text style={s.emptyCtaText}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Guard de flag (deep-link con El Círculo apagado → estado honesto) ───────

export function CircleDisabled() {
  return (
    <View style={s.disabledWrap}>
      <MaterialIcons name="workspaces" size={36} color={palette.goldText} />
      <Text style={s.disabledTitle}>EL CÍRCULO</Text>
      <Text style={s.emptyText}>Esta sección aún no está activa para tu cuenta.</Text>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  spaceCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: palette.graphite, borderColor: palette.line, borderWidth: 1,
    borderRadius: radii.md, padding: spacing.md,
  },
  spaceEmoji: { fontSize: 22, width: 32, textAlign: 'center' },
  spaceName: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 14, color: palette.ivory, letterSpacing: 0.3 },
  spaceDesc: { ...typography.caption, color: palette.ash, fontSize: 11, marginTop: 1 },
  spaceMeta: { ...typography.label, color: palette.goldText, fontSize: 9, marginTop: 3, letterSpacing: 0.8 },

  eventCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: palette.graphite, borderColor: palette.line, borderWidth: 1,
    borderRadius: radii.md, padding: spacing.md,
  },
  eventDateBadge: {
    width: 36, height: 36, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.goldLight, borderWidth: 1, borderColor: palette.lineGold,
  },
  eventTitle: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 14, color: palette.ivory, letterSpacing: 0.3 },
  eventWhen: { ...typography.mono, color: palette.goldText, fontSize: 11, marginTop: 2 },
  eventMeta: { ...typography.caption, color: palette.smoke, fontSize: 10, marginTop: 2 },
  rsvpPill: {
    paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.pill,
    borderWidth: 1, borderColor: palette.line,
  },
  rsvpPillGoing: { backgroundColor: palette.gold, borderColor: palette.gold },
  rsvpPillText: { ...typography.label, color: palette.ash, fontSize: 8, letterSpacing: 0.8 },

  disabledWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.xl },
  disabledTitle: { ...typography.title, color: palette.ivory, fontSize: 18, letterSpacing: 2 },

  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  emptyText: { ...typography.caption, color: palette.smoke, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  emptyCta: {
    borderWidth: 1, borderColor: palette.gold, borderRadius: radii.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minHeight: 38, justifyContent: 'center',
  },
  emptyCtaText: { ...typography.label, color: palette.goldText, fontSize: 10, letterSpacing: 1 },
});
