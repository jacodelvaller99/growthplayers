/**
 * El Círculo — tarjetas y piezas de UI de la red social interna.
 * Tokens de tema SIEMPRE (goldText para texto dorado, gold solo en fills);
 * a11y completa en cada Pressable. Barrel de feature (patrón components/memory.tsx).
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Avatar } from '@/components/Avatar';
import { containsBannedContent, REPORT_REASONS } from '@/data/moderation';
import { addComment, deleteComment, fetchBlockedIds, fetchComments, reportTarget } from '@/lib/circle';
import {
  eventCapacityState,
  formatEventDate,
  POST_REACTION_EMOJIS,
  type CircleEvent,
  type PostComment,
  type ReactionGroup,
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

// ─── EmojiReactionBar ─────────────────────────────────────────────────────────
// Reacciones agrupadas de un post (una por usuario, semántica replace). El
// catálogo aparece al tocar "+"; tocar mi reacción actual la quita.

export function EmojiReactionBar({ groups, onSelect, disabled }: {
  groups: ReactionGroup[];
  onSelect: (type: string | null) => void; // null = quitar mi reacción
  disabled?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const mine = groups.find((g) => g.mine)?.type ?? null;

  const tap = (type: string) => {
    setPickerOpen(false);
    onSelect(mine === type ? null : type);
  };

  return (
    <View style={s.rxWrap}>
      {groups.map((g) => (
        <Pressable
          key={g.type}
          style={[s.rxChip, g.mine && s.rxChipMine, disabled && { opacity: 0.5 }]}
          onPress={() => tap(g.type)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: g.mine, disabled }}
          accessibilityLabel={`${g.type === 'like' ? 'Apoyo' : g.type}: ${g.count}${g.mine ? ', tu reacción' : ''}`}>
          {g.type === 'like'
            ? <MaterialIcons name="favorite" size={13} color={g.mine ? palette.goldText : palette.smoke} />
            : <Text style={s.rxEmoji}>{g.type}</Text>}
          <Text style={[s.rxCount, g.mine && { color: palette.goldText }]}>{g.count}</Text>
        </Pressable>
      ))}
      <Pressable
        style={[s.rxChip, disabled && { opacity: 0.5 }]}
        onPress={() => setPickerOpen((v) => !v)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ expanded: pickerOpen, disabled }}
        accessibilityLabel="Añadir reacción">
        <MaterialIcons name="add-reaction" size={14} color={palette.smoke} />
      </Pressable>
      {pickerOpen && (
        <View style={s.rxPicker}>
          {['like', ...POST_REACTION_EMOJIS].map((e) => (
            <Pressable
              key={e}
              style={s.rxPickerItem}
              onPress={() => tap(e)}
              accessibilityRole="button"
              accessibilityLabel={e === 'like' ? 'Reaccionar con apoyo' : `Reaccionar con ${e}`}>
              {e === 'like'
                ? <MaterialIcons name="favorite" size={18} color={palette.goldText} />
                : <Text style={{ fontSize: 18 }}>{e}</Text>}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── CommentSheet ─────────────────────────────────────────────────────────────
// Hoja de comentarios autónoma (hace su propio IO): lista + composer con filtro
// de moderación + borrar propio + reportar comentario. Reutilizable desde la
// plaza y desde los espacios sin duplicar lógica.

export function CommentSheet({ postId, userId, visible, onClose, onCountChange }: {
  postId: string | null;
  userId: string | null;
  visible: boolean;
  onClose: () => void;
  onCountChange?: (postId: string, delta: number) => void;
}) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportFor, setReportFor] = useState<PostComment | null>(null);

  const load = useCallback(async () => {
    if (!postId) return;
    const [list, blocked] = await Promise.all([fetchComments(postId), fetchBlockedIds(userId)]);
    setComments(list.filter((c) => !blocked.has(c.user_id)));
    setLoading(false);
  }, [postId, userId]);

  useEffect(() => {
    if (visible) { setLoading(true); load(); }
  }, [visible, load]);

  const send = async () => {
    if (!userId || !postId || !text.trim() || sending) return;
    const clean = text.trim();
    if (containsBannedContent(clean)) {
      setError('Tu comentario contiene lenguaje que no respeta las normas de la comunidad.');
      return;
    }
    setError(null);
    setSending(true);
    const res = await addComment(userId, postId, clean);
    if (res.success) {
      setText('');
      onCountChange?.(postId, 1);
      await load();
    } else {
      setError(res.error ?? 'No se pudo publicar.');
    }
    setSending(false);
  };

  const removeOwn = async (c: PostComment) => {
    const res = await deleteComment(c.id);
    if (res.success && postId) {
      setComments((prev) => prev.filter((x) => x.id !== c.id));
      onCountChange?.(postId, -1);
    }
  };

  const report = async (reason: string) => {
    if (!userId || !reportFor) return;
    await reportTarget(userId, 'comment', reportFor.id, reason);
    setReportFor(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.csOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar comentarios" />
        <View style={s.csSheet}>
          <View style={s.csHead}>
            <Text style={s.csTitle}>COMENTARIOS ({comments.length})</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cerrar">
              <MaterialIcons name="close" size={20} color={palette.ash} />
            </Pressable>
          </View>

          <ScrollView style={s.csList} keyboardShouldPersistTaps="handled">
            {loading ? (
              <ActivityIndicator color={palette.goldText} style={{ padding: spacing.lg }} />
            ) : comments.length === 0 ? (
              <Text style={s.csEmpty}>Sé el primero en comentar.</Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={s.csRow}>
                  <Avatar id={c.user_id} name={c.author_name} uri={c.author_avatar ?? undefined} size={28} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.csAuthor}>{c.author_name}</Text>
                    <Text style={s.csContent}>{c.content}</Text>
                  </View>
                  {c.user_id === userId ? (
                    <Pressable onPress={() => removeOwn(c)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Eliminar mi comentario">
                      <MaterialIcons name="delete-outline" size={16} color={palette.smoke} />
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => setReportFor(c)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Reportar comentario de ${c.author_name}`}>
                      <MaterialIcons name="flag" size={15} color={palette.smoke} />
                    </Pressable>
                  )}
                </View>
              ))
            )}
            {reportFor && (
              <View style={s.csReportBox}>
                <Text style={s.csReportTitle}>¿Por qué reportas este comentario?</Text>
                {REPORT_REASONS.map((r) => (
                  <Pressable key={r.value} style={s.csReportRow} onPress={() => report(r.value)} accessibilityRole="button" accessibilityLabel={`Reportar por: ${r.label}`}>
                    <Text style={s.csContent}>{r.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>

          {error && (
            <Text style={s.csError} accessibilityLiveRegion="polite" role="alert">{error}</Text>
          )}
          <View style={s.csComposer}>
            <TextInput
              style={s.csInput}
              placeholder="Escribe un comentario…"
              placeholderTextColor={palette.smoke}
              value={text}
              onChangeText={setText}
              maxLength={300}
              accessibilityLabel="Escribir comentario"
            />
            <Pressable
              style={[s.csSend, (sending || !text.trim()) && { opacity: 0.5 }]}
              onPress={send}
              disabled={sending || !text.trim()}
              accessibilityRole="button"
              accessibilityState={{ disabled: sending || !text.trim() }}
              accessibilityLabel="Publicar comentario">
              <MaterialIcons name="arrow-upward" size={18} color={palette.ink} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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

  rxWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  rxChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: palette.line, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 5, minHeight: 30 },
  rxChipMine: { borderColor: palette.gold, backgroundColor: palette.goldLight },
  rxEmoji: { fontSize: 13 },
  rxCount: { ...typography.mono, color: palette.smoke, fontSize: 11 },
  rxPicker: { flexDirection: 'row', gap: spacing.sm, backgroundColor: palette.graphiteLight, borderWidth: 1, borderColor: palette.lineHard, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  rxPickerItem: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },

  csOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  csSheet: { backgroundColor: palette.blackDeep, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, paddingBottom: spacing.xxxl, maxHeight: '75%' },
  csHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  csTitle: { ...typography.section, color: palette.ivory, fontSize: 12 },
  csList: { maxHeight: 340 },
  csEmpty: { ...typography.caption, color: palette.smoke, fontStyle: 'italic', padding: spacing.md, fontSize: 12 },
  csRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm, alignItems: 'flex-start' },
  csAuthor: { fontFamily: Fonts.sans, fontWeight: '700', fontSize: 12, color: palette.ivory },
  csContent: { ...typography.body, color: palette.ivory, fontSize: 13, lineHeight: 18, marginTop: 1 },
  csReportBox: { backgroundColor: palette.graphite, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.sm, gap: 2 },
  csReportTitle: { ...typography.label, color: palette.smoke, fontSize: 9, marginBottom: spacing.xs },
  csReportRow: { paddingVertical: spacing.sm, minHeight: 40, justifyContent: 'center' },
  csError: { ...typography.caption, color: palette.danger, fontSize: 12, marginTop: spacing.xs },
  csComposer: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'center' },
  csInput: { flex: 1, backgroundColor: palette.graphite, borderColor: palette.line, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory, minHeight: 44 },
  csSend: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },

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
