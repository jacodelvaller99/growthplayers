import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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

import { db2, supabase } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { palette, spacing, typography, Fonts, radii } from '@/constants/theme';
import {
  COMMUNITY_EULA,
  COMMUNITY_EULA_STORAGE_KEY,
  COMMUNITY_EULA_VERSION,
  REPORT_REASONS,
  containsBannedContent,
} from '@/data/moderation';
import { readLocal, writeLocal } from '@/storage/local';

// ─────────────────────────────────────────────────────────────────────────────
// COMMUNITY_ENABLED — gate de lanzamiento.
// Reactivado (WS-8): el sistema de moderación requerido por App Store 1.2 ya está
// implementado — EULA de tolerancia cero (gate de primer acceso), filtro de
// contenido al publicar, reporte de publicaciones, bloqueo de usuarios (filtra el
// feed) y cola de moderación en admin. Mensajería interna (DM) en app/comunidad/.
// ─────────────────────────────────────────────────────────────────────────────
const COMMUNITY_ENABLED: boolean = true;

// Cliente sin tipar para las tablas de moderación/DM (no están en los tipos
// generados): community_reports, user_blocks, direct_messages.
const anyDb = supabase as any;

interface Post {
  id:          string;
  user_id:     string;
  content:     string;
  likes_count: number;
  is_pinned:   boolean;
  created_at:  string;
  author_name: string;
  liked:       boolean;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function ComunidadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();

  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Moderación — EULA de tolerancia cero (gate de primer acceso)
  const [eulaState, setEulaState] = useState<'checking' | 'accept' | 'ok'>('checking');

  // Acciones por post (reportar / bloquear)
  const [actionPost, setActionPost] = useState<Post | null>(null);
  const [reportFor, setReportFor]   = useState<Post | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [notice, setNotice]         = useState<string | null>(null);

  // ── EULA: ¿ya aceptó? (profiles.consents.community con fallback local) ───────
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      // 1) Fallback local (offline / sin sesión)
      const local = await readLocal<number>(COMMUNITY_EULA_STORAGE_KEY).catch(() => null);
      if (local && local >= COMMUNITY_EULA_VERSION) {
        if (!cancelled) setEulaState('ok');
        return;
      }
      // 2) Servidor: profiles.consents.community
      if (userId) {
        try {
          const { data } = await anyDb
            .from('profiles')
            .select('consents')
            .eq('id', userId)
            .single();
          const v = data?.consents?.community?.version ?? 0;
          if (v >= COMMUNITY_EULA_VERSION) {
            await writeLocal(COMMUNITY_EULA_STORAGE_KEY, COMMUNITY_EULA_VERSION).catch(() => {});
            if (!cancelled) setEulaState('ok');
            return;
          }
        } catch { /* tabla/columna podría no existir → pedir aceptación */ }
      }
      if (!cancelled) setEulaState('accept');
    };
    check();
    return () => { cancelled = true; };
  }, [userId]);

  const acceptEula = async () => {
    setEulaState('ok');
    await writeLocal(COMMUNITY_EULA_STORAGE_KEY, COMMUNITY_EULA_VERSION).catch(() => {});
    if (userId) {
      try {
        // Merge no-destructivo: lee consents actuales y agrega community.
        const { data } = await anyDb.from('profiles').select('consents').eq('id', userId).single();
        const consents = { ...(data?.consents ?? {}) };
        consents.community = { version: COMMUNITY_EULA_VERSION, accepted_at: new Date().toISOString() };
        await anyDb.from('profiles').update({ consents }).eq('id', userId);
      } catch { /* persistencia local ya cubre el gate */ }
    }
  };

  // ── Bloqueos del usuario actual (para filtrar el feed) ───────────────────────
  const loadBlocks = useCallback(async (): Promise<Set<string>> => {
    if (!userId) return new Set();
    try {
      const { data } = await anyDb
        .from('user_blocks')
        .select('blocked_id')
        .eq('blocker_id', userId);
      const set = new Set<string>((data ?? []).map((b: any) => b.blocked_id as string));
      return set;
    } catch {
      return new Set();
    }
  }, [userId]);

  const loadPosts = useCallback(async () => {
    try {
      const blocks = await loadBlocks();

      // Cargar posts (sin join — evita problema de FK en PostgREST)
      const { data, error } = await db2.communityPosts()
        .select('id, user_id, content, likes_count, is_pinned, created_at')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(80);

      if (error || !data) { setPosts([]); return; }

      // Filtrar posts de usuarios bloqueados
      const visible = (data as any[]).filter((p) => !blocks.has(p.user_id as string));

      // Resolver nombres de autor
      const userIds: string[] = [...new Set<string>(visible.map((p: any) => p.user_id as string).filter((id: string): id is string => !!id))];
      const nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('user_id, full_name')
            .in('user_id', userIds);
          if (profiles) {
            profiles.forEach((p: any) => {
              if (p.user_id && p.full_name) nameMap[p.user_id] = p.full_name;
            });
          }
        } catch { /* silencioso */ }
      }

      // Cargar likes del usuario actual
      let userLikes: Set<string> = new Set();
      if (userId) {
        try {
          const { data: reactions } = await db2.communityReactions()
            .select('post_id')
            .eq('user_id', userId)
            .eq('type', 'like');
          if (reactions) userLikes = new Set(reactions.map((r: any) => r.post_id));
        } catch { /* silencioso */ }
      }

      const mapped: Post[] = visible.map((p: any) => ({
        id:          p.id,
        user_id:     p.user_id,
        content:     p.content,
        likes_count: p.likes_count ?? 0,
        is_pinned:   p.is_pinned ?? false,
        created_at:  p.created_at,
        author_name: nameMap[p.user_id] ?? 'Miembro',
        liked:       userLikes.has(p.id),
      }));

      setPosts(mapped);
    } catch { setPosts([]); }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, loadBlocks]);

  useEffect(() => {
    if (COMMUNITY_ENABLED && eulaState === 'ok') loadPosts();
  }, [eulaState, loadPosts]);

  const handleRefresh = () => { setRefreshing(true); loadPosts(); };

  const toggleLike = async (post: Post) => {
    if (!userId) return;
    const optimistic = posts.map(p =>
      p.id === post.id
        ? { ...p, liked: !p.liked, likes_count: p.liked ? p.likes_count - 1 : p.likes_count + 1 }
        : p
    );
    setPosts(optimistic);

    try {
      if (post.liked) {
        await db2.communityReactions()
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', userId)
          .eq('type', 'like');
      } else {
        await db2.communityReactions().upsert({
          post_id: post.id, user_id: userId, type: 'like',
        }, { onConflict: 'post_id,user_id,type' });
      }
    } catch { /* revertir si falla */ loadPosts(); }
  };

  const submitPost = async () => {
    if (!userId || !newPost.trim()) return;
    const text = newPost.trim();

    // Filtro de contenido (App Store 1.2) — rechazo determinista antes de enviar.
    if (containsBannedContent(text)) {
      setPostError('Tu mensaje contiene lenguaje que no respeta las normas de la comunidad. Edítalo para continuar.');
      return;
    }
    setPostError(null);
    setSubmitting(true);
    try {
      await db2.communityPosts().insert({
        user_id:   userId,
        content:   text,
        is_pinned: false,
      });
      setNewPost('');
      inputRef.current?.blur();
      loadPosts();
    } catch { /* silencioso */ }
    setSubmitting(false);
  };

  // ── Reportar publicación ─────────────────────────────────────────────────────
  const submitReport = async (post: Post, reason: string) => {
    if (!userId) return;
    setReportBusy(true);
    try {
      await anyDb.from('community_reports').insert({
        reporter_id: userId,
        post_id:     post.id,
        reason,
      });
      setNotice('Gracias. Tu reporte fue enviado al equipo de moderación.');
    } catch {
      setNotice('No pudimos enviar el reporte. Inténtalo de nuevo.');
    }
    setReportBusy(false);
    setReportFor(null);
    setActionPost(null);
  };

  // ── Bloquear usuario (filtra su contenido del feed) ──────────────────────────
  const blockUser = async (post: Post) => {
    if (!userId || post.user_id === userId) { setActionPost(null); return; }
    // Optimista: quitar sus posts y registrar el bloqueo
    setPosts(prev => prev.filter(p => p.user_id !== post.user_id));
    setActionPost(null);
    try {
      await anyDb.from('user_blocks').insert({
        blocker_id: userId,
        blocked_id: post.user_id,
      });
      setNotice(`Bloqueaste a ${post.author_name}. No verás más su contenido.`);
    } catch {
      setNotice(`Bloqueaste a ${post.author_name}.`);
    }
  };

  // ── EULA gate ────────────────────────────────────────────────────────────────
  const Header = (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
      </Pressable>
      <Text style={styles.title}>COMUNIDAD</Text>
      {COMMUNITY_ENABLED && eulaState === 'ok' ? (
        <Pressable
          onPress={() => router.push('/comunidad/mensajes' as never)}
          style={styles.backBtn}
          accessibilityLabel="Mensajes directos">
          <MaterialIcons name="forum" size={20} color={palette.gold} />
        </Pressable>
      ) : (
        <View style={{ width: 38 }} />
      )}
    </View>
  );

  // ── Gate de lanzamiento: comunidad deshabilitada ─────────────────────────────
  if (!COMMUNITY_ENABLED) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {Header}
        <View style={styles.soonWrap}>
          <View style={styles.soonIcon}>
            <MaterialIcons name="group" size={48} color={palette.gold} />
          </View>
          <Text style={styles.soonTitle}>PRÓXIMAMENTE</Text>
          <Text style={styles.soonBody}>
            Estamos construyendo un espacio de comunidad seguro, con moderación y
            herramientas de cuidado para la tribu. Muy pronto vas a poder compartir
            tu proceso aquí.
          </Text>
        </View>
      </View>
    );
  }

  // ── EULA: checking / accept ──────────────────────────────────────────────────
  if (eulaState !== 'ok') {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {Header}
        {eulaState === 'checking' ? (
          <View style={styles.soonWrap}>
            <ActivityIndicator color={palette.gold} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.eulaWrap} showsVerticalScrollIndicator={false}>
            <View style={styles.soonIcon}>
              <MaterialIcons name="shield" size={42} color={palette.gold} />
            </View>
            <Text style={styles.eulaTitle}>{COMMUNITY_EULA.title}</Text>
            <Text style={styles.eulaIntro}>{COMMUNITY_EULA.intro}</Text>
            <View style={styles.eulaRules}>
              {COMMUNITY_EULA.rules.map((rule, i) => (
                <View key={i} style={styles.eulaRuleRow}>
                  <MaterialIcons name="check-circle" size={16} color={palette.gold} style={{ marginTop: 2 }} />
                  <Text style={styles.eulaRuleText}>{rule}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.eulaAgreement}>{COMMUNITY_EULA.agreement}</Text>
            <Pressable onPress={acceptEula} style={styles.eulaAcceptBtn}>
              <Text style={styles.eulaAcceptText}>ACEPTO Y ENTRO</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.eulaDeclineBtn}>
              <Text style={styles.eulaDeclineText}>Ahora no</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.bottom}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {Header}

        {/* Notice (reporte/bloqueo) */}
        {notice && (
          <Pressable onPress={() => setNotice(null)} style={styles.notice}>
            <MaterialIcons name="info" size={16} color={palette.gold} />
            <Text style={styles.noticeText}>{notice}</Text>
            <MaterialIcons name="close" size={16} color={palette.smoke} />
          </Pressable>
        )}

        {/* Input nuevo post */}
        <View style={styles.composeBox}>
          <TextInput
            ref={inputRef}
            style={styles.composeInput}
            value={newPost}
            onChangeText={(t) => { setNewPost(t); if (postError) setPostError(null); }}
            placeholder="Comparte algo con la tribu..."
            placeholderTextColor={palette.smoke}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={submitPost}
            disabled={submitting || !newPost.trim()}
            style={[styles.sendBtn, (!newPost.trim() || submitting) && styles.sendBtnDisabled]}
          >
            <MaterialIcons
              name="send"
              size={20}
              color={!newPost.trim() || submitting ? palette.ash : palette.black}
            />
          </Pressable>
        </View>
        {postError && (
          <Text style={styles.postError}>{postError}</Text>
        )}

        {/* Feed */}
        <ScrollView
          contentContainerStyle={styles.feed}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={palette.gold}
              colors={[palette.gold]}
            />
          }
        >
          {loading && (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>Cargando posts…</Text>
            </View>
          )}

          {!loading && posts.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="group" size={56} color={palette.line} />
              <Text style={styles.emptyTitle}>La tribu aún está en silencio</Text>
              <Text style={styles.emptySubtext}>Sé el primero en compartir algo.</Text>
            </View>
          )}

          {posts.map(post => (
            <View key={post.id} style={[styles.postCard, post.is_pinned && styles.postCardPinned]}>
              {post.is_pinned && (
                <View style={styles.pinnedBadge}>
                  <MaterialIcons name="push-pin" size={11} color={palette.gold} />
                  <Text style={styles.pinnedText}>FIJADO</Text>
                </View>
              )}
              <View style={styles.postHeader}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {post.author_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.postMeta}>
                  <Text style={styles.postAuthor}>{post.author_name}</Text>
                  <Text style={styles.postTime}>{timeAgo(post.created_at)}</Text>
                </View>
                {/* Menú de moderación / DM por post (no en tus propios posts) */}
                {post.user_id !== userId && (
                  <Pressable
                    onPress={() => setActionPost(post)}
                    style={styles.moreBtn}
                    accessibilityLabel="Opciones de la publicación">
                    <MaterialIcons name="more-horiz" size={20} color={palette.smoke} />
                  </Pressable>
                )}
              </View>
              <Text style={styles.postContent}>{post.content}</Text>
              <View style={styles.postActions}>
                <Pressable onPress={() => toggleLike(post)} style={styles.likeBtn}>
                  <MaterialIcons
                    name={post.liked ? 'favorite' : 'favorite-border'}
                    size={18}
                    color={post.liked ? '#E74C3C' : palette.ash}
                  />
                  <Text style={[styles.likeCount, post.liked && { color: '#E74C3C' }]}>
                    {post.likes_count > 0 ? post.likes_count : ''}
                  </Text>
                </Pressable>
                {post.user_id !== userId && (
                  <Pressable
                    onPress={() => router.push({ pathname: '/comunidad/chat/[id]', params: { id: post.user_id, name: post.author_name } } as never)}
                    style={styles.likeBtn}
                    accessibilityLabel={`Enviar mensaje a ${post.author_name}`}>
                    <MaterialIcons name="chat-bubble-outline" size={16} color={palette.ash} />
                  </Pressable>
                )}
              </View>
            </View>
          ))}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* ── Action sheet por post (reportar / bloquear / mensaje) ── */}
        <Modal
          visible={!!actionPost && !reportFor}
          transparent
          animationType="fade"
          onRequestClose={() => setActionPost(null)}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setActionPost(null)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{actionPost?.author_name}</Text>
              <Pressable
                style={styles.sheetRow}
                onPress={() => {
                  const p = actionPost;
                  setActionPost(null);
                  if (p) router.push({ pathname: '/comunidad/chat/[id]', params: { id: p.user_id, name: p.author_name } } as never);
                }}>
                <MaterialIcons name="chat-bubble-outline" size={20} color={palette.ivory} />
                <Text style={styles.sheetRowText}>Enviar mensaje</Text>
              </Pressable>
              <Pressable
                style={styles.sheetRow}
                onPress={() => { if (actionPost) setReportFor(actionPost); }}>
                <MaterialIcons name="flag" size={20} color={palette.gold} />
                <Text style={styles.sheetRowText}>Reportar publicación</Text>
              </Pressable>
              <Pressable
                style={styles.sheetRow}
                onPress={() => { if (actionPost) blockUser(actionPost); }}>
                <MaterialIcons name="block" size={20} color={palette.danger} />
                <Text style={[styles.sheetRowText, { color: palette.danger }]}>Bloquear a este usuario</Text>
              </Pressable>
              <Pressable style={styles.sheetCancel} onPress={() => setActionPost(null)}>
                <Text style={styles.sheetCancelText}>Cancelar</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── Selección de razón de reporte ── */}
        <Modal
          visible={!!reportFor}
          transparent
          animationType="fade"
          onRequestClose={() => { setReportFor(null); setActionPost(null); }}>
          <Pressable style={styles.sheetBackdrop} onPress={() => { setReportFor(null); setActionPost(null); }}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Reportar publicación</Text>
              <Text style={styles.sheetSub}>¿Por qué reportas este contenido?</Text>
              {REPORT_REASONS.map((r) => (
                <Pressable
                  key={r.value}
                  style={styles.sheetRow}
                  disabled={reportBusy}
                  onPress={() => reportFor && submitReport(reportFor, r.value)}>
                  <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
                  <Text style={styles.sheetRowText}>{r.label}</Text>
                </Pressable>
              ))}
              <Pressable style={styles.sheetCancel} onPress={() => { setReportFor(null); setActionPost(null); }}>
                <Text style={styles.sheetCancelText}>Cancelar</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: palette.black },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn:         { padding: 8, minWidth: 38, alignItems: 'center' },
  title:           { fontFamily: Fonts.display, fontSize: 16, color: palette.ivory, letterSpacing: 3 },

  composeBox:      { flexDirection: 'row', alignItems: 'flex-end', marginHorizontal: spacing.md, marginBottom: spacing.sm, backgroundColor: palette.graphite, borderRadius: radii.sm, padding: spacing.sm, gap: 8, borderWidth: 1, borderColor: palette.line },
  composeInput:    { flex: 1, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 14, maxHeight: 100, lineHeight: 20 },
  sendBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: palette.graphite, borderWidth: 1, borderColor: palette.line },
  postError:       { color: palette.danger, fontFamily: Fonts.sans, fontSize: 12, lineHeight: 17, marginHorizontal: spacing.md, marginBottom: spacing.sm },

  notice:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: spacing.md, marginBottom: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: palette.goldLight, borderWidth: 1, borderColor: palette.lineGold, borderRadius: radii.sm },
  noticeText:      { flex: 1, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 12.5, lineHeight: 17 },

  feed:            { paddingHorizontal: spacing.md },

  soonWrap:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.md },
  soonIcon:        { width: 96, height: 96, borderRadius: 48, backgroundColor: palette.goldLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.lineGold, marginBottom: spacing.sm },
  soonTitle:       { fontFamily: Fonts.display, fontSize: 18, color: palette.ivory, letterSpacing: 3 },
  soonBody:        { fontFamily: Fonts.sans, fontSize: 14, color: palette.ash, lineHeight: 22, textAlign: 'center', maxWidth: 320 },

  // EULA
  eulaWrap:        { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },
  eulaTitle:       { fontFamily: Fonts.display, fontSize: 18, color: palette.ivory, letterSpacing: 2, textAlign: 'center' },
  eulaIntro:       { fontFamily: Fonts.sans, fontSize: 14, color: palette.ash, lineHeight: 22, textAlign: 'center', maxWidth: 360 },
  eulaRules:       { alignSelf: 'stretch', gap: spacing.sm, marginVertical: spacing.sm },
  eulaRuleRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  eulaRuleText:    { flex: 1, fontFamily: Fonts.sans, fontSize: 13.5, color: palette.ivory, lineHeight: 20 },
  eulaAgreement:   { fontFamily: Fonts.sans, fontSize: 13, color: palette.ash, lineHeight: 20, fontStyle: 'italic', textAlign: 'center', maxWidth: 360, marginTop: spacing.sm },
  eulaAcceptBtn:   { alignSelf: 'stretch', height: 52, borderRadius: radii.sm, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  eulaAcceptText:  { fontFamily: Fonts.display, fontSize: 13, color: palette.ink, letterSpacing: 1.5 },
  eulaDeclineBtn:  { height: 44, alignItems: 'center', justifyContent: 'center' },
  eulaDeclineText: { fontFamily: Fonts.sans, fontSize: 13, color: palette.smoke },

  loadingState:    { paddingVertical: 40, alignItems: 'center' },
  loadingText:     { ...typography.caption, color: palette.ash },

  emptyState:      { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyTitle:      { fontFamily: Fonts.display, fontSize: 16, color: palette.ash, letterSpacing: 1 },
  emptySubtext:    { ...typography.caption, color: palette.smoke },

  postCard:        { backgroundColor: palette.graphite, borderRadius: radii.sm, padding: spacing.md, marginBottom: 10, borderWidth: 1, borderColor: 'transparent' },
  postCardPinned:  { borderColor: palette.lineGold, borderWidth: 1 },

  pinnedBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  pinnedText:      { fontFamily: Fonts.display, fontSize: 10, color: palette.gold, letterSpacing: 1 },

  postHeader:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatarCircle:    { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.goldLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.lineGold },
  avatarInitial:   { fontFamily: Fonts.display, fontSize: 16, color: palette.gold },
  postMeta:        { flex: 1 },
  postAuthor:      { fontFamily: Fonts.sans, fontSize: 13, color: palette.ivory, fontWeight: '600' },
  postTime:        { fontSize: 11, color: palette.smoke },
  moreBtn:         { padding: 6, minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },

  postContent:     { fontFamily: Fonts.sans, fontSize: 14, color: palette.ash, lineHeight: 22, marginBottom: 12 },

  postActions:     { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  likeBtn:         { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32 },
  likeCount:       { fontSize: 13, color: palette.ash, fontFamily: Fonts.mono },

  // Action sheet
  sheetBackdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: palette.graphiteLight, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl, gap: 2, borderWidth: 1, borderColor: palette.line },
  sheetHandle:     { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: palette.line, marginBottom: spacing.md },
  sheetTitle:      { fontFamily: Fonts.display, fontSize: 14, color: palette.ivory, letterSpacing: 1, marginBottom: spacing.xs, paddingHorizontal: spacing.xs },
  sheetSub:        { fontFamily: Fonts.sans, fontSize: 13, color: palette.ash, marginBottom: spacing.sm, paddingHorizontal: spacing.xs },
  sheetRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: 48 },
  sheetRowText:    { fontFamily: Fonts.sans, fontSize: 15, color: palette.ivory, flex: 1 },
  sheetCancel:     { marginTop: spacing.sm, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm, backgroundColor: palette.graphite },
  sheetCancelText: { fontFamily: Fonts.sans, fontSize: 14, color: palette.ash },
});
