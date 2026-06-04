import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
}

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
  const listRef = useRef<FlatList<DM>>(null);

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
        .select('id, sender_id, recipient_id, body, created_at')
        .or(
          `and(sender_id.eq.${userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${userId})`,
        )
        .order('created_at', { ascending: true })
        .limit(300);
      if (!error && data) {
        setMessages((data as any[]).map((m) => ({
          id: m.id, sender_id: m.sender_id, body: m.body, created_at: m.created_at,
        })));
      }
    } catch { /* silencioso */ }
    finally { setLoading(false); }
    markRead();
  }, [userId, peerId, markRead]);

  useEffect(() => { checkBlocks(); load(); }, [checkBlocks, load]);

  // ── Realtime: mensajes entrantes de este peer ────────────────────────────────
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
              : [...prev, { id: m.id, sender_id: m.sender_id, body: m.body, created_at: m.created_at }]);
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

  const send = async () => {
    const body = draft.trim();
    if (!userId || !peerId || !body || sending) return;
    if (blockState !== 'none') return;
    setSending(true);
    // Optimista
    const optimistic: DM = { id: `tmp-${Date.now()}`, sender_id: userId, body, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    try {
      const { data, error } = await anyDb
        .from('direct_messages')
        .insert({ sender_id: userId, recipient_id: peerId, body })
        .select('id, sender_id, body, created_at')
        .single();
      if (!error && data) {
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? { id: data.id, sender_id: data.sender_id, body: data.body, created_at: data.created_at } : m)));
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
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
          </Pressable>
          <View style={styles.headerCenter}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{peerName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.headerName} numberOfLines={1}>{peerName}</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.gold} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={messages.length === 0 ? styles.emptyWrap : { padding: spacing.md, gap: spacing.sm }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialIcons name="chat-bubble-outline" size={48} color={palette.line} />
                <Text style={styles.emptyText}>Inicia la conversación con {peerName}.</Text>
              </View>
            }
            renderItem={({ item }) => {
              const mine = item.sender_id === userId;
              return (
                <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.body}</Text>
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
              style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}>
              <MaterialIcons name="send" size={20} color={!draft.trim() || sending ? palette.ash : palette.black} />
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
  headerAvatar:{ width: 30, height: 30, borderRadius: 15, backgroundColor: palette.goldLight, borderWidth: 1, borderColor: palette.lineGold, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontFamily: Fonts.display, fontSize: 13, color: palette.gold },
  headerName:  { fontFamily: Fonts.display, fontSize: 14, color: palette.ivory, letterSpacing: 1, maxWidth: 200 },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap:   { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  empty:       { alignItems: 'center', gap: 12, paddingHorizontal: spacing.xl },
  emptyText:   { ...typography.caption, color: palette.smoke, textAlign: 'center', maxWidth: 280, lineHeight: 18 },

  bubbleRow:     { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs:{ justifyContent: 'flex-start' },
  bubble:        { maxWidth: '80%', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.md },
  bubbleMine:    { backgroundColor: palette.gold, borderBottomRightRadius: radii.xs },
  bubbleTheirs:  { backgroundColor: palette.graphite, borderWidth: 1, borderColor: palette.line, borderBottomLeftRadius: radii.xs },
  bubbleText:    { fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: palette.ivory },
  bubbleTextMine:{ color: palette.ink },

  composer:    { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: palette.lineSoft, backgroundColor: palette.black },
  input:       { flex: 1, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, maxHeight: 110, minHeight: 40, backgroundColor: palette.graphite, borderRadius: radii.md, borderWidth: 1, borderColor: palette.line, paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 10 },
  sendBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: palette.graphite, borderWidth: 1, borderColor: palette.line },

  blockedBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderTopColor: palette.lineSoft },
  blockedText: { fontFamily: Fonts.sans, fontSize: 13, color: palette.smoke, textAlign: 'center' },
});
