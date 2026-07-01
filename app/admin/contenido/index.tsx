/**
 * Admin CMI — Contenido
 *
 * Diarios (journal_entries), conversaciones con mentor, respuestas de lecciones.
 * NOTA DE PRIVACIDAD: contenido sensible — solo visible para administradores.
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

import { GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { fetchJournalEntries, fetchMentorConversations } from '@/lib/admin/queries';
import type { JournalEntry, MentorConversation } from '@/lib/admin/types';

type Tab = 'diarios' | 'conversaciones';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  if (mins < 1440) return `hace ${Math.floor(mins / 60)}h`;
  return `hace ${Math.floor(mins / 1440)}d`;
}

function JournalCard({ entry, onUserPress }: { entry: JournalEntry; onUserPress: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <PremiumCard style={jc.card}>
      <View style={jc.header}>
        <Pressable onPress={onUserPress} accessibilityRole="button" accessibilityLabel={`Ver perfil de ${entry.user_name ?? 'usuario'}`}>
          <Text style={jc.userId}>👤 {entry.user_name ?? entry.user_id.substring(0, 8)}</Text>
        </Pressable>
        <Text style={jc.time}>{timeAgo(entry.created_at)}</Text>
      </View>
      {entry.entry_type && <Text style={jc.type}>{entry.entry_type.toUpperCase()}</Text>}
      {entry.mood !== null && entry.mood !== undefined && (
        <Text style={jc.mood}>Mood: {entry.mood}/10</Text>
      )}
      <Pressable
        onPress={() => setExpanded(e => !e)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? 'Contraer entrada de diario' : 'Ver entrada de diario completa'}>
        <Text style={jc.content} numberOfLines={expanded ? undefined : 3}>
          {entry.content}
        </Text>
        {!expanded && entry.content.length > 150 && (
          <Text style={jc.expand}>VER COMPLETO ↓</Text>
        )}
      </Pressable>
    </PremiumCard>
  );
}

function ConvThread({ convs, userId, onUserPress }: {
  convs: MentorConversation[];
  userId: string;
  onUserPress: () => void;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const sample = convs[0];
  if (!sample) return null;
  return (
    <PremiumCard style={cv.card}>
      <View style={cv.header}>
        <Pressable onPress={onUserPress} accessibilityRole="button" accessibilityLabel={`Ver perfil de ${sample.user_name ?? 'usuario'}`}>
          <Text style={cv.userId}>👤 {sample.user_name ?? userId.substring(0, 8)}</Text>
        </Pressable>
        <Text style={cv.count}>{convs.length} mensajes</Text>
        <Pressable
          onPress={() => setCollapsed(c => !c)}
          accessibilityRole="button"
          accessibilityState={{ expanded: !collapsed }}
          accessibilityLabel={collapsed ? `Expandir conversación (${convs.length} mensajes)` : 'Contraer conversación'}>
          <MaterialIcons name={collapsed ? 'expand-more' : 'expand-less'} size={18} color={palette.ash} />
        </Pressable>
      </View>
      {!collapsed && (
        <View style={cv.thread}>
          {convs.map(c => (
            <View key={c.id} style={[cv.bubble, c.role === 'assistant' ? cv.bubbleLeft : cv.bubbleRight]}>
              <Text style={cv.role}>{c.role === 'assistant' ? 'MENTOR' : 'USUARIO'}</Text>
              <Text style={cv.text}>{c.content}</Text>
              <Text style={cv.time}>{timeAgo(c.created_at)}</Text>
            </View>
          ))}
        </View>
      )}
    </PremiumCard>
  );
}

export default function ContenidoScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>('diarios');
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [convs, setConvs] = useState<MentorConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [j, c] = await Promise.all([
      fetchJournalEntries(undefined, 30),
      fetchMentorConversations(undefined, 60),
    ]);
    setJournals(j);
    setConvs(c);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group conversations by user
  const convsByUser: Record<string, MentorConversation[]> = {};
  convs.forEach(c => {
    if (!convsByUser[c.user_id]) convsByUser[c.user_id] = [];
    convsByUser[c.user_id].push(c);
  });

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={palette.gold} />}>

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver"  hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>CONTENIDO</Text>
      </View>

      {/* Privacy banner */}
      <View
        style={s.privacyBanner}
        accessible
        accessibilityLabel="Contenido privado de cada usuario. Solo visible para administradores del programa.">
        <MaterialIcons name="lock" size={14} color={palette.warning} />
        <Text style={s.privacyText}>
          Contenido privado de cada usuario. Solo visible para administradores del programa.
        </Text>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {(['diarios', 'conversaciones'] as Tab[]).map(t => (
          <Pressable
            key={t}
            style={[s.tabBtn, tab === t && s.tabBtnActive]}
            onPress={() => setTab(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
            accessibilityLabel={t === 'diarios' ? `Diarios, ${journals.length} entradas` : `Conversaciones, ${Object.keys(convsByUser).length} usuarios`}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t.toUpperCase()}
              {t === 'diarios' ? ` (${journals.length})` : ` (${Object.keys(convsByUser).length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={palette.goldText} style={{ marginTop: spacing.xl }} />
      ) : tab === 'diarios' ? (
        <>
          <GoldDivider label={`ÚLTIMAS ${journals.length} ENTRADAS`} />
          {journals.length === 0 ? (
            <Text style={s.emptyText}>Sin entradas de diario</Text>
          ) : (
            journals.map(j => (
              <JournalCard
                key={j.id}
                entry={j}
                onUserPress={() => router.push(`/admin/usuarios/${j.user_id}` as never)}
              />
            ))
          )}
        </>
      ) : (
        <>
          <GoldDivider label={`${Object.keys(convsByUser).length} USUARIOS CON CONVERSACIONES`} />
          {Object.entries(convsByUser).length === 0 ? (
            <Text style={s.emptyText}>Sin conversaciones</Text>
          ) : (
            Object.entries(convsByUser).map(([userId, userConvs]) => (
              <ConvThread
                key={userId}
                convs={userConvs}
                userId={userId}
                onUserPress={() => router.push(`/admin/usuarios/${userId}` as never)}
              />
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  backBtn: { padding: spacing.xs },
  title: { ...typography.title, color: palette.ivory },
  privacyBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: 'rgba(212,160,23,0.12)', borderRadius: radii.sm, padding: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: palette.warning },
  privacyText: { ...typography.caption, color: palette.warning, flex: 1, fontSize: 11 },
  tabRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  tabBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radii.sm, borderWidth: 1, borderColor: palette.line },
  tabBtnActive: { backgroundColor: palette.goldLight, borderColor: palette.gold },
  tabText: { ...typography.section, color: palette.ash, fontSize: 10 },
  tabTextActive: { color: palette.goldText },
  emptyText: { ...typography.caption, color: palette.smoke, textAlign: 'center', padding: spacing.xl },
});

const jc = StyleSheet.create({
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  userId: { fontFamily: Fonts.sans, fontSize: 13, color: palette.goldText },
  time: { ...typography.mono, color: palette.smoke, fontSize: 10 },
  type: { ...typography.label, color: palette.ash, marginBottom: spacing.xs, fontSize: 8 },
  mood: { ...typography.mono, color: palette.goldText, fontSize: 11, marginBottom: spacing.xs },
  content: { ...typography.body, color: palette.ivory, lineHeight: 20, fontSize: 13 },
  expand: { ...typography.label, color: palette.goldText, marginTop: spacing.xs, fontSize: 9 },
});

const cv = StyleSheet.create({
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, padding: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  userId: { fontFamily: Fonts.sans, fontSize: 13, color: palette.goldText, flex: 1 },
  count: { ...typography.mono, color: palette.smoke, fontSize: 10 },
  thread: { gap: spacing.sm, marginTop: spacing.sm },
  bubble: { borderRadius: radii.sm, padding: spacing.sm, maxWidth: '90%' },
  bubbleLeft: { backgroundColor: palette.overlay, alignSelf: 'flex-start' },
  bubbleRight: { backgroundColor: palette.goldLight, borderColor: palette.lineGold, borderWidth: 1, alignSelf: 'flex-end' },
  role: { ...typography.label, color: palette.smoke, fontSize: 8, marginBottom: 2 },
  text: { ...typography.caption, color: palette.ivory, fontSize: 12 },
  time: { ...typography.mono, color: palette.smoke, fontSize: 9, marginTop: 2 },
});
