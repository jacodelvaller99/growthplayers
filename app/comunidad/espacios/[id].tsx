/**
 * EL CÍRCULO — Detalle de espacio: identidad + eventos del espacio + feed propio.
 *
 * El feed replica el contrato de moderación de la plaza (App Store 1.2):
 * filtro de contenido al publicar, reportar post, bloquear autor (filtra),
 * y el espacio mismo es reportable desde el menú. space_id scoping en BD.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ENV } from '@/app/config/env';
import { Avatar } from '@/components/Avatar';
import { CircleDisabled, CircleEmpty, EventCard } from '@/components/circle';
import { GoldDivider, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { REPORT_REASONS, containsBannedContent } from '@/data/moderation';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import {
  fetchBlockedIds,
  fetchEvents,
  fetchMyMemberships,
  fetchNamesFor,
  fetchSpace,
  joinSpace,
  leaveSpace,
  removePostReaction,
  reportTarget,
  setPostReaction,
} from '@/lib/circle';
import { isUpcoming, type CircleEvent, type Space } from '@/lib/circleLogic';
import { supabase } from '@/lib/supabase';

 
const anyDb = supabase as any;

interface SpacePost {
  id: string;
  user_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  liked: boolean;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function EspacioDetalleScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const spaceId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [space, setSpace] = useState<Space | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [events, setEvents] = useState<CircleEvent[]>([]);
  const [posts, setPosts] = useState<SpacePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [newPost, setNewPost] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Acciones (reportar post/espacio, bloquear autor)
  const [actionPost, setActionPost] = useState<SpacePost | null>(null);
  const [reportKind, setReportKind] = useState<'post' | 'space' | null>(null);
  const [reportBusy, setReportBusy] = useState(false);

  const loadPosts = useCallback(async (blocked: Set<string>) => {
    if (!spaceId) return;
    try {
      const { data, error } = await anyDb
        .from('community_posts')
        .select('id, user_id, content, likes_count, created_at')
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false })
        .limit(80);
      if (error || !data) { setPosts([]); return; }
       
      const visible = (data as any[]).filter((p) => !blocked.has(p.user_id as string));
      const names = await fetchNamesFor(visible.map((p) => p.user_id as string));
      let myLikes = new Set<string>();
      if (userId) {
        try {
          const { data: rx } = await anyDb
            .from('community_reactions')
            .select('post_id')
            .eq('user_id', userId)
            .eq('type', 'like')
            .in('post_id', visible.map((p) => p.id));
           
          myLikes = new Set((rx ?? []).map((r: any) => r.post_id as string));
        } catch { /* degradable */ }
      }
      setPosts(visible.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        content: p.content,
        likes_count: p.likes_count ?? 0,
        created_at: p.created_at,
        author_name: names[p.user_id]?.name ?? 'Miembro',
        author_avatar: names[p.user_id]?.avatar ?? null,
        liked: myLikes.has(p.id),
      })));
    } catch { setPosts([]); }
  }, [spaceId, userId]);

  const load = useCallback(async () => {
    if (!spaceId) return;
    const [sp, memberships, evts, blocked] = await Promise.all([
      fetchSpace(spaceId),
      fetchMyMemberships(userId ?? null),
      fetchEvents(spaceId),
      fetchBlockedIds(userId ?? null),
    ]);
    setSpace(sp);
    setIsMember(memberships.some((m) => m.space_id === spaceId));
    const now = new Date();
    setEvents(evts.filter((e) => isUpcoming(e, now) && !blocked.has(e.created_by)).slice(0, 3));
    await loadPosts(blocked);
    setLoading(false);
    setRefreshing(false);
  }, [spaceId, userId, loadPosts]);

  useEffect(() => { load(); }, [load]);

  if (!ENV.socialSpacesEnabled) {
    return <View style={[sc.root, { paddingTop: insets.top }]}><CircleDisabled /></View>;
  }

  const handleJoinLeave = async () => {
    if (!userId || !spaceId || busy) return;
    setBusy(true);
    if (isMember) {
      const res = await leaveSpace(userId, spaceId);
      if (res.success) setIsMember(false);
    } else {
      const res = await joinSpace(userId, spaceId);
      if (res.success) setIsMember(true);
    }
    setBusy(false);
  };

  const submitPost = async () => {
    if (!userId || !spaceId || !newPost.trim() || submitting) return;
    const text = newPost.trim();
    if (containsBannedContent(text)) {
      setPostError('Tu mensaje contiene lenguaje que no respeta las normas de la comunidad. Edítalo para continuar.');
      return;
    }
    setPostError(null);
    setSubmitting(true);
    try {
      await anyDb.from('community_posts').insert({ user_id: userId, content: text, space_id: spaceId, is_pinned: false });
      setNewPost('');
      const blocked = await fetchBlockedIds(userId);
      await loadPosts(blocked);
    } catch { /* degradable */ }
    setSubmitting(false);
  };

  const toggleLike = async (post: SpacePost) => {
    if (!userId) return;
    setPosts((prev) => prev.map((p) => p.id === post.id
      ? { ...p, liked: !p.liked, likes_count: Math.max(0, p.likes_count + (p.liked ? -1 : 1)) }
      : p));
    const res = post.liked
      ? await removePostReaction(userId, post.id)
      : await setPostReaction(userId, post.id, 'like');
    if (!res.success) {
      const blocked = await fetchBlockedIds(userId);
      await loadPosts(blocked);
    }
  };

  const submitReport = async (reason: string) => {
    if (!userId || !reportKind) return;
    setReportBusy(true);
    const targetId = reportKind === 'space' ? spaceId! : actionPost!.id;
    const res = await reportTarget(userId, reportKind, targetId, reason);
    setNotice(res.success
      ? 'Gracias. Tu reporte fue enviado al equipo de moderación.'
      : 'No pudimos enviar el reporte. Inténtalo de nuevo.');
    setReportBusy(false);
    setReportKind(null);
    setActionPost(null);
  };

  const blockAuthor = async (post: SpacePost) => {
    if (!userId || post.user_id === userId) { setActionPost(null); return; }
    setPosts((prev) => prev.filter((p) => p.user_id !== post.user_id));
    setActionPost(null);
    try {
      await anyDb.from('user_blocks').insert({ blocker_id: userId, blocked_id: post.user_id });
      setNotice(`Bloqueaste a ${post.author_name}. No verás más su contenido.`);
    } catch {
      setNotice(`Bloqueaste a ${post.author_name}.`);
    }
  };

  return (
    <KeyboardAvoidingView style={sc.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={palette.goldText} />}>

        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}>
            <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
          </Pressable>
          <Text style={s.title} numberOfLines={1}>{space?.name ?? 'ESPACIO'}</Text>
          <Pressable
            onPress={() => setReportKind('space')}
            style={s.overflowBtn}
            accessibilityRole="button"
            accessibilityLabel="Reportar este espacio">
            <MaterialIcons name="flag" size={18} color={palette.smoke} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={palette.goldText} style={{ marginTop: spacing.xxxl }} />
        ) : !space ? (
          <CircleEmpty icon="search-off" text="Este espacio ya no existe o fue archivado." />
        ) : (
          <>
            {/* Identidad */}
            <View style={s.identity}>
              <Text style={s.identityEmoji}>{space.emoji ?? '◆'}</Text>
              {!!space.description && <Text style={s.identityDesc}>{space.description}</Text>}
              <Text style={s.identityMeta}>
                {space.members_count} {space.members_count === 1 ? 'miembro' : 'miembros'}
              </Text>
              <Pressable
                style={[isMember ? s.leaveBtn : s.joinBtn, busy && { opacity: 0.5 }]}
                onPress={handleJoinLeave}
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                accessibilityLabel={isMember ? 'Salir del espacio' : 'Unirme al espacio'}>
                <Text style={isMember ? s.leaveBtnText : s.joinBtnText}>
                  {isMember ? 'SALIR DEL ESPACIO' : 'UNIRME'}
                </Text>
              </Pressable>
            </View>

            {/* Eventos del espacio */}
            {events.length > 0 && (
              <>
                <GoldDivider label="EVENTOS DE ESTE ESPACIO" />
                <View style={s.section}>
                  {events.map((e) => (
                    <EventCard key={e.id} event={e} onPress={() => router.push(`/comunidad/eventos/${e.id}` as never)} />
                  ))}
                </View>
              </>
            )}

            {/* Composer (solo miembros) */}
            <GoldDivider label="EL MURO" />
            {isMember ? (
              <View style={s.composer}>
                <TextInput
                  style={s.composerInput}
                  placeholder="Comparte con este círculo…"
                  placeholderTextColor={palette.smoke}
                  value={newPost}
                  onChangeText={setNewPost}
                  multiline
                  maxLength={500}
                  accessibilityLabel="Escribir publicación para el espacio"
                />
                {postError && (
                  <Text style={s.postError} accessibilityLiveRegion="polite" role="alert">{postError}</Text>
                )}
                <Pressable
                  style={[s.postBtn, (submitting || !newPost.trim()) && { opacity: 0.5 }]}
                  onPress={submitPost}
                  disabled={submitting || !newPost.trim()}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: submitting || !newPost.trim() }}
                  accessibilityLabel="Publicar en el espacio">
                  {submitting
                    ? <ActivityIndicator color={palette.ink} size="small" />
                    : <Text style={s.postBtnText}>PUBLICAR</Text>}
                </Pressable>
              </View>
            ) : (
              <Text style={s.joinHint}>Únete al espacio para publicar en su muro.</Text>
            )}

            {/* Feed del espacio */}
            <View style={s.section}>
              {posts.length === 0 ? (
                <CircleEmpty icon="forum" text={'Todavía no hay publicaciones.\nAbre la conversación.'} />
              ) : (
                posts.map((p) => (
                  <View key={p.id} style={s.postCard}>
                    <View style={s.postHead}>
                      <Avatar id={p.user_id} name={p.author_name} uri={p.author_avatar ?? undefined} size={32} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.postAuthor}>{p.author_name}</Text>
                        <Text style={s.postTime}>{timeAgo(p.created_at)}</Text>
                      </View>
                      <Pressable
                        onPress={() => setActionPost(p)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Acciones sobre la publicación de ${p.author_name}`}>
                        <MaterialIcons name="more-horiz" size={18} color={palette.smoke} />
                      </Pressable>
                    </View>
                    <Text style={s.postContent}>{p.content}</Text>
                    <Pressable
                      style={s.likeRow}
                      onPress={() => toggleLike(p)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: p.liked }}
                      accessibilityLabel={`${p.liked ? 'Quitar' : 'Dar'} apoyo. ${p.likes_count} apoyos`}>
                      <MaterialIcons
                        name={p.liked ? 'favorite' : 'favorite-border'}
                        size={16}
                        color={p.liked ? palette.goldText : palette.smoke}
                      />
                      <Text style={[s.likeCount, p.liked && { color: palette.goldText }]}>{p.likes_count}</Text>
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {notice && (
          <Text style={s.notice} accessibilityLiveRegion="polite" role="alert">{notice}</Text>
        )}
      </ScrollView>

      {/* Action sheet: publicación */}
      <Modal visible={!!actionPost && !reportKind} transparent animationType="fade" onRequestClose={() => setActionPost(null)}>
        <Pressable style={s.sheetOverlay} onPress={() => setActionPost(null)} accessibilityRole="button" accessibilityLabel="Cerrar">
          <View style={s.sheet}>
            <Pressable style={s.sheetRow} onPress={() => setReportKind('post')} accessibilityRole="button" accessibilityLabel="Reportar publicación">
              <MaterialIcons name="flag" size={18} color={palette.warning} />
              <Text style={s.sheetText}>Reportar publicación</Text>
            </Pressable>
            {actionPost?.user_id !== userId && (
              <Pressable style={s.sheetRow} onPress={() => actionPost && blockAuthor(actionPost)} accessibilityRole="button" accessibilityLabel={`Bloquear a ${actionPost?.author_name}`}>
                <MaterialIcons name="block" size={18} color={palette.danger} />
                <Text style={[s.sheetText, { color: palette.danger }]}>Bloquear a {actionPost?.author_name}</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Selector de razón de reporte (post o espacio) */}
      <Modal visible={!!reportKind} transparent animationType="fade" onRequestClose={() => { setReportKind(null); setActionPost(null); }}>
        <Pressable style={s.sheetOverlay} onPress={() => { setReportKind(null); setActionPost(null); }} accessibilityRole="button" accessibilityLabel="Cerrar">
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>
              {reportKind === 'space' ? '¿Por qué reportas este espacio?' : '¿Por qué reportas esta publicación?'}
            </Text>
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
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.xs },
  backBtn: { padding: spacing.xs },
  title: { ...typography.title, color: palette.ivory, flex: 1 },
  overflowBtn: { padding: spacing.xs, minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },

  identity: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  identityEmoji: { fontSize: 40 },
  identityDesc: { ...typography.body, color: palette.ash, textAlign: 'center', fontSize: 13, lineHeight: 19 },
  identityMeta: { ...typography.label, color: palette.goldText, fontSize: 10, letterSpacing: 1 },
  joinBtn: { backgroundColor: palette.gold, borderRadius: radii.sm, paddingHorizontal: spacing.xl, minHeight: 44, justifyContent: 'center', marginTop: spacing.xs },
  joinBtnText: { ...typography.label, color: palette.ink, letterSpacing: 1 },
  leaveBtn: { borderWidth: 1, borderColor: palette.line, borderRadius: radii.sm, paddingHorizontal: spacing.xl, minHeight: 44, justifyContent: 'center', marginTop: spacing.xs },
  leaveBtnText: { ...typography.label, color: palette.ash, letterSpacing: 1 },

  section: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },

  composer: { paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  composerInput: { backgroundColor: palette.graphite, borderColor: palette.line, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory, minHeight: 60, textAlignVertical: 'top' },
  postError: { ...typography.caption, color: palette.danger, fontSize: 12 },
  postBtn: { alignSelf: 'flex-end', backgroundColor: palette.gold, borderRadius: radii.sm, paddingHorizontal: spacing.lg, minHeight: 40, justifyContent: 'center' },
  postBtnText: { ...typography.label, color: palette.ink, fontSize: 10, letterSpacing: 1 },
  joinHint: { ...typography.caption, color: palette.smoke, paddingHorizontal: spacing.lg, marginBottom: spacing.md, fontSize: 12, fontStyle: 'italic' },

  postCard: { backgroundColor: palette.graphite, borderColor: palette.line, borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  postAuthor: { fontFamily: Fonts.sans, fontWeight: '700', fontSize: 13, color: palette.ivory },
  postTime: { ...typography.mono, color: palette.smoke, fontSize: 10 },
  postContent: { ...typography.body, color: palette.ivory, fontSize: 13.5, lineHeight: 20 },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', minHeight: 38, paddingRight: spacing.md },
  likeCount: { ...typography.mono, color: palette.smoke, fontSize: 11 },

  notice: { ...typography.caption, color: palette.goldText, textAlign: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.sm, fontSize: 12 },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: palette.blackDeep, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: spacing.lg, paddingBottom: spacing.xxxl, gap: 4 },
  sheetTitle: { ...typography.section, color: palette.ivory, marginBottom: spacing.sm, fontSize: 12 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: 48 },
  sheetText: { ...typography.body, color: palette.ivory, fontSize: 14 },
});
