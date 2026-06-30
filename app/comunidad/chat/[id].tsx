import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { supabase } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { palette, spacing, typography, Fonts, radii } from '@/constants/theme';

// direct_messages / user_blocks no están en los tipos generados → cliente anyClient.
const anyDb = supabase as any;

interface DM {
  id:         string;
  sender_id:  string;
  body:       string;
  created_at: string;
  read_at?:   string | null;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Reacciones acotadas, en el tono de la hermandad (alto rendimiento / apoyo).
const REACTION_EMOJIS = ['🔥', '💪', '🙏', '👏', '❤️'] as const;

interface Reaction { uid: string; emoji: string }

function clock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const m = d.getMinutes();
  return `${d.getHours()}:${m < 10 ? `0${m}` : m}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

type Row =
  | { kind: 'divider'; id: string; label: string }
  | { kind: 'msg'; id: string; m: DM; mine: boolean; showReceipt: boolean };

export default function ChatThreadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const peerId = params.id;
  const peerName = (typeof params.name === 'string' && params.name) || 'Miembro';

  const [messages, setMessages] = useState<DM[]>([]);
  const [loading, setLoading]   = useState(true);
  const [draft, setDraft]       = useState('');
  const [sending, setSending]   = useState(false);
  // 'none' | 'i-blocked' | 'they-blocked'
  const [blockState, setBlockState] = useState<'none' | 'i-blocked' | 'they-blocked'>('none');
  const listRef = useRef<FlatList<Row>>(null);
  // Reacciones por mensaje (degrada a vacío si la tabla no existe aún).
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [reactingId, setReactingId] = useState<string | null>(null);

  // ── Estado de bloqueo (en cualquier dirección) ───────────────────────────────
  const checkBlocks = useCallback(async () => {
    if (!userId || !peerId) return;
    try {
      const { data } = await anyDb
        .from('user_blocks')
        .select('blocker_id, blocked_id')
        .or(
          `and(blocker_id.eq.${userId},blocked_id.eq.${peerId}),and(blocker_id.eq.${peerId},blocked_id.eq.${userId})`,
        );
      const rows = (data ?? []) as any[];
      if (rows.some((r) => r.blocker_id === userId)) setBlockState('i-blocked');
      else if (rows.some((r) => r.blocker_id === peerId)) setBlockState('they-blocked');
      else setBlockState('none');
    } catch { /* asumir sin bloqueo */ }
  }, [userId, peerId]);

  const markRead = useCallback(async () => {
    if (!userId || !peerId) return;
    try {
      await anyDb
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', userId)
        .eq('sender_id', peerId)
        .is('read_at', null);
    } catch { /* no crítico */ }
  }, [userId, peerId]);

  const load = useCallback(async () => {
    if (!userId || !peerId) { setLoading(false); return; }
    try {
      const { data, error } = await anyDb
        .from('direct_messages')
        .select('id, sender_id, recipient_id, body, read_at, created_at')
        .or(
          `and(sender_id.eq.${userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${userId})`,
        )
        .order('created_at', { ascending: true })
        .limit(300);
      if (!error && data) {
        setMessages((data as any[]).map((m) => ({
          id: m.id, sender_id: m.sender_id, body: m.body, created_at: m.created_at, read_at: m.read_at,
        })));
      }
    } catch { /* silencioso */ }
    finally { setLoading(false); }
    markRead();
  }, [userId, peerId, markRead]);

  useEffect(() => { checkBlocks(); load(); }, [checkBlocks, load]);

  // ── Reacciones (tabla direct_message_reactions; degrada si no existe) ─────────
  const realIdsKey = useMemo(
    () => messages.map((m) => m.id).filter((id) => !id.startsWith('tmp-')).join(','),
    [messages],
  );
  const loadReactions = useCallback(async () => {
    const ids = realIdsKey ? realIdsKey.split(',') : [];
    if (ids.length === 0) { setReactions({}); return; }
    try {
      const { data, error } = await anyDb
        .from('direct_message_reactions')
        .select('message_id, user_id, emoji')
        .in('message_id', ids);
      if (error || !data) return;
      const map: Record<string, Reaction[]> = {};
      (data as any[]).forEach((r) => { (map[r.message_id] ??= []).push({ uid: r.user_id, emoji: r.emoji }); });
      setReactions(map);
    } catch { /* tabla ausente → sin reacciones */ }
  }, [realIdsKey]);

  useEffect(() => { loadReactions(); }, [loadReactions]);

  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!userId || messageId.startsWith('tmp-')) return;
    setReactingId(null);
    const existing = (reactions[messageId] ?? []).find((r) => r.uid === userId);
    const removing = existing?.emoji === emoji;
    setReactions((prev) => {
      const others = (prev[messageId] ?? []).filter((r) => r.uid !== userId);
      return { ...prev, [messageId]: removing ? others : [...others, { uid: userId, emoji }] };
    });
    try {
      if (removing) {
        await anyDb.from('direct_message_reactions').delete().eq('message_id', messageId).eq('user_id', userId);
      } else {
        await anyDb.from('direct_message_reactions')
          .upsert({ message_id: messageId, user_id: userId, emoji }, { onConflict: 'message_id,user_id' });
      }
    } catch { loadReactions(); /* revertir desde el servidor */ }
  }, [userId, reactions, loadReactions]);

  // ── Realtime: mensajes entrantes de este peer (patrón original, probado) ──────
  useEffect(() => {
    if (!userId || !peerId) return;
    const channel = anyDb
      .channel(`dm:${userId}:${peerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `sender_id=eq.${peerId}` },
        (payload: any) => {
          const m = payload.new;
          if (m && m.recipient_id === userId) {
            setMessages((prev) => prev.some((x) => x.id === m.id)
              ? prev
              : [...prev, { id: m.id, sender_id: m.sender_id, body: m.body, created_at: m.created_at, read_at: m.read_at }]);
            markRead();
          }
        },
      )
      .subscribe();
    return () => { anyDb.removeChannel(channel); };
  }, [userId, peerId, markRead]);

  // Auto-scroll al final cuando llegan mensajes.
  useEffect(() => {
    if (messages.length > 0) {
      const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      return () => clearTimeout(t);
    }
  }, [messages.length]);

  // ── Filas: separadores de fecha + recibo en mi último mensaje ────────────────
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastMineIdx = -1;
    messages.forEach((m, i) => { if (m.sender_id === userId) lastMineIdx = i; });
    let lastDay = '';
    messages.forEach((m, i) => {
      const day = dayLabel(m.created_at);
      if (day && day !== lastDay) { out.push({ kind: 'divider', id: `div-${m.id}`, label: day }); lastDay = day; }
      out.push({ kind: 'msg', id: m.id, m, mine: m.sender_id === userId, showReceipt: i === lastMineIdx });
    });
    return out;
  }, [messages, userId]);

  const send = async () => {
    const body = draft.trim();
    if (!userId || !peerId || !body || sending) return;
    if (blockState !== 'none') return;
    setSending(true);
    // Optimista
    const optimistic: DM = { id: `tmp-${Date.now()}`, sender_id: userId, body, created_at: new Date().toISOString(), read_at: null };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    try {
      const { data, error } = await anyDb
        .from('direct_messages')
        .insert({ sender_id: userId, recipient_id: peerId, body })
        .select('id, sender_id, body, read_at, created_at')
        .single();
      if (!error && data) {
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? { id: data.id, sender_id: data.sender_id, body: data.body, created_at: data.created_at, read_at: data.read_at } : m)));
      }
    } catch {
      // Revertir el optimista en error
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(body);
    }
    setSending(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.black }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.bottom}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
            <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Avatar id={peerId ?? ''} name={peerName} size={32} />
            <Text style={styles.headerName} numberOfLines={1}>{peerName}</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.goldText} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(r) => r.id}
            contentContainerStyle={rows.length === 0 ? styles.emptyWrap : { padding: spacing.md, gap: spacing.xs }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialIcons name="chat-bubble-outline" size={48} color={palette.line} />
                <Text style={styles.emptyText}>Inicia la conversación con {peerName}.</Text>
              </View>
            }
            renderItem={({ item }) => {
              if (item.kind === 'divider') {
                return (
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{item.label}</Text>
                    <View style={styles.dividerLine} />
                  </View>
                );
              }
              const { m, mine, showReceipt } = item;
              const reacts = reactions[m.id] ?? [];
              const isReacting = reactingId === m.id;
              return (
                <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                  <View style={[styles.bubbleCol, mine ? styles.alignEnd : styles.alignStart]}>
                    {isReacting && (
                      <View style={styles.reactionBar}>
                        {REACTION_EMOJIS.map((e) => (
                          <Pressable
                            key={e}
                            onPress={() => toggleReaction(m.id, e)}
                            hitSlop={6}
                            accessibilityRole="button"
                            accessibilityLabel={`Reaccionar ${e}`}
                            style={styles.reactionPick}>
                            <Text style={styles.reactionPickText}>{e}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                    <Pressable
                      onLongPress={() => { if (!m.id.startsWith('tmp-')) setReactingId(isReacting ? null : m.id); }}
                      delayLongPress={250}
                      style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                      <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{m.body}</Text>
                    </Pressable>
                    {reacts.length > 0 && (
                      <View style={[styles.reactionChips, mine ? styles.alignEnd : styles.alignStart]}>
                        {reacts.map((r) => (
                          <Pressable
                            key={r.uid}
                            onPress={() => { if (r.uid === userId) toggleReaction(m.id, r.emoji); }}
                            style={[styles.reactionChip, r.uid === userId && styles.reactionChipMine]}>
                            <Text style={styles.reactionChipText}>{r.emoji}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                    <View style={styles.metaRow}>
                      <Text style={styles.metaTime}>{clock(m.created_at)}</Text>
                      {showReceipt && mine && (
                        <Text style={styles.metaReceipt}>
                          {m.read_at ? '· Visto' : '· Enviado'}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Composer / aviso de bloqueo */}
        {blockState === 'they-blocked' ? (
          <View style={styles.blockedBar}>
            <MaterialIcons name="block" size={16} color={palette.smoke} />
            <Text style={styles.blockedText}>No puedes enviar mensajes a este usuario.</Text>
          </View>
        ) : blockState === 'i-blocked' ? (
          <View style={styles.blockedBar}>
            <MaterialIcons name="block" size={16} color={palette.smoke} />
            <Text style={styles.blockedText}>Bloqueaste a este usuario. Desbloquéalo para escribirle.</Text>
          </View>
        ) : (
          <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={`Mensaje a ${peerName}...`}
              placeholderTextColor={palette.smoke}
              multiline
              maxLength={1000}
            />
            <Pressable
              onPress={send}
              disabled={sending || !draft.trim()}
              accessibilityRole="button"
              accessibilityLabel="Enviar mensaje"
              style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}>
              <MaterialIcons name="send" size={20} color={!draft.trim() || sending ? palette.ash : palette.ink} />
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: palette.black },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.lineSoft },
  backBtn:     { padding: 8, minWidth: 38, alignItems: 'center' },
  headerCenter:{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  headerName:  { fontFamily: Fonts.display, fontSize: 14, color: palette.ivory, letterSpacing: 1, maxWidth: 200 },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap:   { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  empty:       { alignItems: 'center', gap: 12, paddingHorizontal: spacing.xl },
  emptyText:   { ...typography.caption, color: palette.smoke, textAlign: 'center', maxWidth: 280, lineHeight: 18 },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: palette.lineSoft },
  dividerText: { ...typography.mono, color: palette.smoke, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },

  bubbleRow:     { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs:{ justifyContent: 'flex-start' },
  bubbleCol:     { maxWidth: '80%' },
  alignEnd:      { alignItems: 'flex-end' },
  alignStart:    { alignItems: 'flex-start' },
  bubble:        { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.md },
  bubbleMine:    { backgroundColor: palette.gold, borderBottomRightRadius: radii.xs },
  bubbleTheirs:  { backgroundColor: palette.graphite, borderWidth: 1, borderColor: palette.line, borderBottomLeftRadius: radii.xs },
  bubbleText:    { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: palette.ivory },
  bubbleTextMine:{ color: palette.ink },
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3, paddingHorizontal: 2 },
  metaTime:      { ...typography.mono, color: palette.smoke, fontSize: 9.5 },
  metaReceipt:   { ...typography.mono, color: palette.goldText, fontSize: 9.5 },

  reactionBar:   { flexDirection: 'row', gap: spacing.xs, backgroundColor: palette.graphiteLight, borderWidth: 1, borderColor: palette.line, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 5, marginBottom: 5 },
  reactionPick:  { paddingHorizontal: 3, minWidth: 28, alignItems: 'center' },
  reactionPickText: { fontSize: 19 },
  reactionChips: { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  reactionChip:  { backgroundColor: palette.graphite, borderWidth: 1, borderColor: palette.line, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  reactionChipMine: { borderColor: palette.lineGold, backgroundColor: palette.goldLight },
  reactionChipText: { fontSize: 12 },

  composer:    { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: palette.lineSoft, backgroundColor: palette.black },
  input:       { flex: 1, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, maxHeight: 110, minHeight: 40, backgroundColor: palette.graphite, borderRadius: radii.md, borderWidth: 1, borderColor: palette.line, paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 10 },
  sendBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: palette.graphite, borderWidth: 1, borderColor: palette.line },

  blockedBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderTopColor: palette.lineSoft },
  blockedText: { fontFamily: Fonts.sans, fontSize: 13, color: palette.smoke, textAlign: 'center' },
});
