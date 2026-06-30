import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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

import { Avatar } from '@/components/Avatar';
import { usePresence } from '@/lib/presence';
import { supabase } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { palette, spacing, typography, Fonts } from '@/constants/theme';

// direct_messages / user_blocks no están en los tipos generados → cliente anyClient.
const anyDb = supabase as any;

interface Conversation {
  peerId:      string;
  peerName:    string;
  peerAvatar:  string | null;
  lastBody:    string;
  lastAt:      string;
  unread:      boolean;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'ahora';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function MensajesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();
  const onlineSet = usePresence(userId ?? undefined);

  const [convos, setConvos]       = useState<Conversation[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) { setConvos([]); setLoading(false); setRefreshing(false); return; }
    try {
      // Mensajes donde participo (envío o recibo), más recientes primero.
      const { data, error } = await anyDb
        .from('direct_messages')
        .select('id, sender_id, recipient_id, body, read_at, created_at')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(300);

      if (error || !data) { setConvos([]); return; }

      // Bloqueos: ocultar conversaciones con usuarios bloqueados.
      let blocked = new Set<string>();
      try {
        const { data: blocks } = await anyDb
          .from('user_blocks')
          .select('blocked_id')
          .eq('blocker_id', userId);
        blocked = new Set<string>((blocks ?? []).map((b: any) => b.blocked_id as string));
      } catch { /* sin bloqueos */ }

      // Agrupar por el otro participante; el primero visto = el más reciente.
      const byPeer = new Map<string, Conversation>();
      for (const m of data as any[]) {
        const peerId = m.sender_id === userId ? m.recipient_id : m.sender_id;
        if (!peerId || blocked.has(peerId)) continue;
        if (!byPeer.has(peerId)) {
          byPeer.set(peerId, {
            peerId,
            peerName:   'Miembro',
            peerAvatar: null,
            lastBody:   m.body ?? '',
            lastAt:     m.created_at,
            // No leído: soy el destinatario del último mensaje y aún no lo abrí.
            unread:     m.recipient_id === userId && !m.read_at,
          });
        }
      }

      // Resolver nombres.
      const peerIds = [...byPeer.keys()];
      if (peerIds.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('user_id, name, avatar_url')
            .in('user_id', peerIds);
          (profiles ?? []).forEach((p: any) => {
            const c = byPeer.get(p.user_id);
            if (!c) return;
            if (p.name) c.peerName = p.name;
            c.peerAvatar = p.avatar_url ?? null;
          });
        } catch { /* nombres por defecto */ }
      }

      setConvos([...byPeer.values()]);
    } catch {
      setConvos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Recargar al volver del hilo (para reflejar nuevos mensajes / leídos).
  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  // Realtime: mensaje entrante (soy el destinatario) → recargar la bandeja, con
  // un pequeño debounce para no recargar en ráfaga si llegan varios seguidos.
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = anyDb
      .channel(`dm-inbox:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `recipient_id=eq.${userId}` },
        () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => loadRef.current(), 400);
        },
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      anyDb.removeChannel(channel);
    };
  }, [userId]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
          <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
        </Pressable>
        <Text style={styles.title}>MENSAJES</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Señal de pertenencia: derivada de datos reales (tu red de hermanos en
          la comunidad). Si no hay conversaciones aún, se omite — no inventamos
          números: el estado vacío ya da el encuadre honesto. */}
      {!loading && convos.length > 0 && (
        <View style={styles.belong}>
          <MaterialIcons name="groups" size={16} color={palette.goldText} />
          <Text style={styles.belongText}>
            {convos.length === 1
              ? '1 hermano en tu red. No caminas el protocolo solo.'
              : `${convos.length} hermanos en tu red. No caminas el protocolo solo.`}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={palette.goldText} />
        </View>
      ) : (
        <FlatList
          data={convos}
          keyExtractor={(c) => c.peerId}
          contentContainerStyle={convos.length === 0 ? styles.emptyWrap : { paddingVertical: spacing.sm }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={palette.gold} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialIcons name="forum" size={52} color={palette.line} />
              <Text style={styles.emptyTitle}>Sin conversaciones</Text>
              <Text style={styles.emptySub}>
                Abre el perfil de un miembro desde la comunidad para iniciar un mensaje directo.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel={`Conversación con ${item.peerName}`}
              onPress={() => router.push({ pathname: '/comunidad/chat/[id]', params: { id: item.peerId, name: item.peerName } } as never)}>
              <Avatar
                id={item.peerId}
                name={item.peerName}
                uri={item.peerAvatar}
                online={onlineSet.has(item.peerId)}
                size={44}
              />
              <View style={styles.rowMain}>
                <Text style={[styles.rowName, item.unread && styles.rowNameUnread]} numberOfLines={1}>{item.peerName}</Text>
                <Text style={[styles.rowPreview, item.unread && styles.rowPreviewUnread]} numberOfLines={1}>
                  {item.lastBody}
                </Text>
              </View>
              <View style={styles.rowMeta}>
                <Text style={styles.rowTime}>{timeAgo(item.lastAt)}</Text>
                {item.unread && <View style={styles.unreadDot} />}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: palette.black },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn:     { padding: 8, minWidth: 38, alignItems: 'center' },
  title:       { fontFamily: Fonts.display, fontSize: 16, color: palette.ivory, letterSpacing: 3 },

  belong:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: spacing.md, marginBottom: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: palette.goldLight, borderWidth: 1, borderColor: palette.lineGold, borderRadius: 10 },
  belongText:  { flex: 1, fontFamily: Fonts.sans, fontSize: 12.5, color: palette.ivory, lineHeight: 17 },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap:   { flexGrow: 1, justifyContent: 'center' },
  empty:       { alignItems: 'center', gap: 12, paddingHorizontal: spacing.xl },
  emptyTitle:  { fontFamily: Fonts.display, fontSize: 16, color: palette.ash, letterSpacing: 1 },
  emptySub:    { ...typography.caption, color: palette.smoke, textAlign: 'center', maxWidth: 300, lineHeight: 18 },

  row:         { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, minHeight: 64 },
  rowMain:     { flex: 1, gap: 3 },
  rowName:     { fontFamily: Fonts.sans, fontSize: 15, color: palette.ivory, fontWeight: '600', letterSpacing: 0.2 },
  rowNameUnread: { fontWeight: '700' },
  rowPreview:  { fontFamily: Fonts.sans, fontSize: 13, color: palette.smoke, lineHeight: 18 },
  rowPreviewUnread: { color: palette.ivory },
  rowMeta:     { alignItems: 'flex-end', gap: 6 },
  rowTime:     { ...typography.mono, color: palette.smoke, fontSize: 10 },
  unreadDot:   { width: 9, height: 9, borderRadius: 5, backgroundColor: palette.gold },
});
