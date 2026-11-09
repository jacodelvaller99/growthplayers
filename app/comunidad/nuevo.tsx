/**
 * Nuevo mensaje: elegir a cualquier miembro de la comunidad y escribirle.
 * Miembros = quienes han publicado o comentado (no se lista a toda la base de
 * clientes: solo a quien ya se mostró en la comunidad). Sin bloqueados.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Fonts, palette, spacing } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { usePresence } from '@/lib/presence';
import { supabase } from '@/lib/supabase';

const anyDb = supabase as any;
type Member = { id: string; name: string; avatar: string | null };

export default function NuevoMensajeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();
  const online = usePresence(userId ?? undefined);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      try {
        const [posts, comments, blocks] = await Promise.all([
          anyDb.from('community_posts').select('user_id').order('created_at', { ascending: false }).limit(500),
          anyDb.from('post_comments').select('user_id').order('created_at', { ascending: false }).limit(500),
          anyDb.from('user_blocks').select('blocked_id').eq('blocker_id', userId),
        ]);
        const blocked = new Set<string>((blocks.data ?? []).map((b: any) => b.blocked_id));
        const ids = [...new Set<string>([...(posts.data ?? []), ...(comments.data ?? [])].map((r: any) => r.user_id))]
          .filter((id) => id && id !== userId && !blocked.has(id));
        let list: Member[] = [];
        if (ids.length) {
          const { data } = await anyDb.from('user_profiles').select('user_id, name, avatar_url').in('user_id', ids);
          list = (data ?? []).map((p: any) => ({ id: p.user_id, name: p.name || 'Miembro', avatar: p.avatar_url ?? null }));
          list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        }
        if (alive) setMembers(list);
      } catch {
        if (alive) setMembers([]);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = members ?? [];
    return t ? list.filter((m) => m.name.toLowerCase().includes(t)) : list;
  }, [members, q]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back} accessibilityRole="button" accessibilityLabel="Volver">
          <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
        </Pressable>
        <Text style={s.meta}>NUEVO MENSAJE</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={s.column}>
        <Text style={s.title}>¿A quién le escribes?</Text>
        <View style={s.search}>
          <MaterialIcons name="search" size={20} color={palette.smoke} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar por nombre"
            placeholderTextColor={palette.smoke}
            style={s.searchInput}
            autoFocus
            accessibilityLabel="Buscar miembro por nombre"
          />
        </View>
        {!members ? (
          <ActivityIndicator color={palette.goldText} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(m) => m.id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={s.empty}>
                {q ? 'Nadie con ese nombre.' : 'Aún no hay miembros activos en la comunidad.'}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => router.replace({ pathname: '/comunidad/chat/[id]', params: { id: item.id, name: item.name } } as never)}
                style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={`Escribirle a ${item.name}`}>
                <Avatar id={item.id} name={item.name} uri={item.avatar} size={48} online={online.has(item.id)} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{item.name}</Text>
                  {online.has(item.id) && <Text style={s.online}>En línea</Text>}
                </View>
                <MaterialIcons name="chat-bubble-outline" size={20} color={palette.goldText} />
              </Pressable>
            )}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.black },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  meta: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.goldText },
  column: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: spacing.md },
  title: { fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 34, lineHeight: 38, letterSpacing: -0.5, color: palette.ivory, marginTop: spacing.md, marginBottom: spacing.lg },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.md, borderRadius: 999, borderWidth: 1, borderColor: palette.line, marginBottom: spacing.md },
  searchInput: { flex: 1, fontFamily: Fonts.sans, fontSize: 17, color: palette.ivory, minHeight: 44 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 68, borderBottomWidth: 1, borderBottomColor: palette.line },
  name: { fontFamily: Fonts.sans, fontSize: 17, color: palette.ivory },
  online: { fontFamily: Fonts.sans, fontSize: 13, color: palette.goldText, marginTop: 2 },
  empty: { fontFamily: Fonts.sans, fontSize: 16, color: palette.smoke, textAlign: 'center', marginTop: 40 },
});
