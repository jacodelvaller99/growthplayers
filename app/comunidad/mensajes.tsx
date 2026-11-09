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
import { CircleEmpty } from '@/components/circle';
import { usePresence } from '@/lib/presence';
import { supabase } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { palette, spacing, Fonts } from '@/constants/theme';

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
  // «Nuevo mensaje» abre el buscador de miembros de la comunidad (app/comunidad/nuevo).
  const nuevo = () => router.push('/comunidad/nuevo' as never);

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
        <Text style={styles.meta}>MENSAJES</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.column}>
      <Text accessibilityRole="header" style={styles.headline}>Tus conversaciones.</Text>
      {/* Señal de pertenencia derivada de datos reales; sin conversaciones se
          omite — el estado vacío ya da el encuadre honesto. */}
      {!loading && convos.length > 0 && (
        <Text style={styles.belongText}>
          {convos.length === 1 ? '1 persona en tu red.' : `${convos.length} personas en tu red.`}
        </Text>
      )}
      {/* Dentro de la columna, bajo el titular: arriba a la derecha quedaba a ~1.000 px de las filas. */}
      <Pressable
        onPress={nuevo}
        style={styles.newBtn}
        accessibilityRole="button"
        accessibilityLabel="Nuevo mensaje: elige a un miembro">
        <Text style={styles.newBtnText}>Nuevo mensaje</Text>
      </Pressable>

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
            <CircleEmpty
              icon="forum"
              text={'Sin conversaciones.\nToca «Nuevo mensaje» para elegir a alguien y escribirle.'}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
              accessibilityRole="button"
              accessibilityLabel={`Conversación con ${item.peerName}.${item.unread ? ' Mensaje sin leer.' : ''} ${item.lastBody}. Hace ${timeAgo(item.lastAt)}`}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: palette.black },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn:     { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  meta:        { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.ash },
  // Columna legible en escritorio: la fila a 1.500 px dejaba la hora a ~1.000 px del nombre.
  column:      { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  headline:    { fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 34, lineHeight: 36, color: palette.ivory, letterSpacing: -0.3, marginHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.sm },

  newBtn:      { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: 8, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginHorizontal: spacing.md, marginBottom: spacing.sm },
  newBtnText:  { fontFamily: Fonts.sans, fontWeight: '700', fontSize: 14, color: palette.ink },
  belongText:  { fontFamily: Fonts.sans, fontSize: 13, color: palette.smoke, lineHeight: 18, marginHorizontal: spacing.md, marginBottom: spacing.sm },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap:   { flexGrow: 1, justifyContent: 'center' },

  row:         { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.md, paddingVertical: spacing.md, minHeight: 64, borderBottomWidth: 1, borderBottomColor: palette.line },
  rowMain:     { flex: 1, gap: 3 },
  rowName:     { fontFamily: Fonts.sans, fontSize: 15, color: palette.ivory, fontWeight: '600', letterSpacing: 0.2 },
  rowNameUnread: { fontWeight: '700' },
  rowPreview:  { fontFamily: Fonts.sans, fontSize: 13, color: palette.smoke, lineHeight: 18 },
  rowPreviewUnread: { color: palette.ivory },
  rowMeta:     { alignItems: 'flex-end', gap: 6 },
  rowTime:     { fontFamily: Fonts.sans, fontSize: 13, color: palette.smoke },
  unreadDot:   { width: 9, height: 9, borderRadius: 5, backgroundColor: palette.gold },
});
