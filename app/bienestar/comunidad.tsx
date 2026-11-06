import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { CommentSheet } from '@/components/circle';
import { db2, supabase } from '@/lib/supabase';
import { pickPhoto, uploadPhoto, type PickedPhoto } from '@/lib/communityMedia';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useBreakpoint } from '@/hooks/use-breakpoint';
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
  id:            string;
  user_id:       string;
  content:       string;
  likes_count:   number;
  is_pinned:     boolean;
  created_at:    string;
  author_name:   string;
  author_avatar: string | null;
  liked:         boolean;
  image_url:     string | null;
  comments_count: number;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)   return 'ahora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

/** Foto de la publicación a su proporción real (sin recortar caras ni textos). */
function PostPhoto({ uri }: { uri: string }) {
  const [ratio, setRatio] = useState(4 / 3);
  return (
    <Image
      source={{ uri }}
      onLoad={(e: any) => {
        const w = e?.nativeEvent?.source?.width; const h = e?.nativeEvent?.source?.height;
        if (w && h) setRatio(Math.max(0.6, Math.min(2, w / h)));
      }}
      style={[styles.postPhoto, { aspectRatio: ratio }]}
      resizeMode="cover"
      accessibilityLabel="Foto de la publicación"
    />
  );
}

export default function ComunidadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, state } = useLifeFlow();
  const myName = state.profile.name || '';
  const { isDesktop } = useBreakpoint();

  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Moderación — EULA de tolerancia cero (gate de primer acceso)
  const [eulaState, setEulaState] = useState<'checking' | 'accept' | 'ok'>('checking');

  // Acciones por post (reportar / bloquear)
  const [actionPost, setActionPost] = useState<Post | null>(null);
  const [reportFor, setReportFor]   = useState<Post | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [notice, setNotice]         = useState<string | null>(null);

  // El Círculo (flag-gated): hoja de comentarios sobre los posts de la plaza.
  const [commentsFor, setCommentsFor] = useState<string | null>(null);

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

      // Cargar posts (sin join — evita problema de FK en PostgREST).
      // La plaza general = posts SIN espacio (space_id IS NULL, El Círculo).
      // Fallback degradable: si la columna space_id aún no existe (migración
      // 20260702 pendiente), reintenta sin el filtro — el feed clásico no cambia.
      // Del esquema más nuevo al más viejo: si falta una columna (migración
      // pendiente), se cae al siguiente sin romper el feed.
      const variants: [string, boolean][] = [
        ['id, user_id, content, likes_count, is_pinned, created_at, image_url, comments_count', true],
        ['id, user_id, content, likes_count, is_pinned, created_at, comments_count', true],
        ['id, user_id, content, likes_count, is_pinned, created_at', false],
      ];
      let res: any = { data: null, error: true };
      for (const [cols, plaza] of variants) {
        let q = (db2.communityPosts() as any).select(cols);
        if (plaza) q = q.is('space_id', null);
        res = await q.order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(80);
        if (!res.error) break;
      }
      const { data, error } = res;

      if (error || !data) { setPosts([]); return; }

      // Filtrar posts de usuarios bloqueados
      const visible = (data as any[]).filter((p) => !blocks.has(p.user_id as string));

      // Resolver nombres de autor
      const userIds: string[] = [...new Set<string>(visible.map((p: any) => p.user_id as string).filter((id: string): id is string => !!id))];
      const nameMap: Record<string, string> = {};
      const avatarMap: Record<string, string | null> = {};
      if (userIds.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('user_id, name, avatar_url')
            .in('user_id', userIds);
          if (profiles) {
            profiles.forEach((p: any) => {
              if (!p.user_id) return;
              if (p.name) nameMap[p.user_id] = p.name;
              avatarMap[p.user_id] = p.avatar_url ?? null;
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
        id:            p.id,
        user_id:       p.user_id,
        content:       p.content,
        likes_count:   p.likes_count ?? 0,
        is_pinned:     p.is_pinned ?? false,
        created_at:    p.created_at,
        author_name:   nameMap[p.user_id] ?? 'Miembro',
        author_avatar: avatarMap[p.user_id] ?? null,
        liked:         userLikes.has(p.id),
        image_url:     p.image_url ?? null,
        comments_count: p.comments_count ?? 0,
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

  // Miembros que participan (el más reciente primero) — fila tipo «historias».
  const members = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; avatar: string | null; today: boolean }>();
    for (const p of posts) {
      if (seen.has(p.user_id)) continue;
      seen.set(p.user_id, { id: p.user_id, name: p.author_name, avatar: p.author_avatar, today: Date.now() - new Date(p.created_at).getTime() < 86_400_000 });
    }
    return [...seen.values()].slice(0, 20);
  }, [posts]);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const weekPosts = posts.filter((p) => new Date(p.created_at).getTime() >= weekAgo).length;
  const weekPhotos = posts.filter((p) => p.image_url && new Date(p.created_at).getTime() >= weekAgo).length;

  const openProfile = (id: string) => {
    if (id === userId) return;
    router.push({ pathname: '/comunidad/perfil/[id]', params: { id } } as never);
  };

  const lastTapRef = useRef<{ id: string; at: number } | null>(null);
  const onPhotoTap = (post: Post) => {
    const now = Date.now();
    if (lastTapRef.current?.id === post.id && now - lastTapRef.current.at < 350) {
      if (!post.liked) toggleLike(post);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = { id: post.id, at: now };
    }
  };

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

  const choosePhoto = async () => {
    try {
      const picked = await pickPhoto();
      if (picked) { setPhoto(picked); setPostError(null); }
    } catch {
      setPostError('No pudimos abrir tus fotos. Inténtalo de nuevo.');
    }
  };

  const submitPost = async () => {
    const text = newPost.trim();
    if (!userId || (!text && !photo)) return;

    // Filtro de contenido (App Store 1.2) — rechazo determinista antes de enviar.
    if (text && containsBannedContent(text)) {
      setPostError('Tu mensaje contiene lenguaje que no respeta las normas de la comunidad. Edítalo para continuar.');
      return;
    }
    setPostError(null);
    setSubmitting(true);
    try {
      const image_url = photo ? await uploadPhoto(userId, photo.blob) : null;
      const { error } = await (db2.communityPosts() as any).insert({
        user_id:   userId,
        content:   text,
        is_pinned: false,
        ...(image_url ? { image_url } : {}),
      });
      if (error) throw error;
      setNewPost('');
      setPhoto(null);
      inputRef.current?.blur();
      loadPosts();
    } catch {
      setPostError(photo
        ? 'No se pudo publicar la foto. Usa JPG o PNG de menos de 5 MB e inténtalo de nuevo.'
        : 'No se pudo publicar. Inténtalo de nuevo.');
    }
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
      <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
        <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
      </Pressable>
      <Text style={styles.meta}>COMUNIDAD</Text>
      {COMMUNITY_ENABLED && eulaState === 'ok' ? (
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {ENV.socialSpacesEnabled && (
            <Pressable
              onPress={() => router.push('/comunidad' as never)}
              style={styles.headerLink}
              accessibilityRole="button"
              accessibilityLabel="Ir a El Círculo: eventos, espacios y conexiones">
              <Text style={styles.headerLinkText}>Círculo</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => router.push('/comunidad/mensajes' as never)}
            style={styles.headerLink}
            accessibilityRole="button"
            accessibilityLabel="Mensajes directos">
            <Text style={styles.headerLinkText}>Mensajes</Text>
          </Pressable>
        </View>
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
            <MaterialIcons name="group" size={48} color={palette.goldText} />
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
            <ActivityIndicator color={palette.goldText} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.eulaWrap} showsVerticalScrollIndicator={false}>
            <View style={styles.soonIcon}>
              <MaterialIcons name="shield" size={42} color={palette.goldText} />
            </View>
            <Text style={styles.eulaTitle}>{COMMUNITY_EULA.title}</Text>
            <Text style={styles.eulaIntro}>{COMMUNITY_EULA.intro}</Text>
            <View style={styles.eulaRules}>
              {COMMUNITY_EULA.rules.map((rule, i) => (
                <View key={i} style={styles.eulaRuleRow}>
                  <MaterialIcons name="check-circle" size={16} color={palette.goldText} style={{ marginTop: 2 }} />
                  <Text style={styles.eulaRuleText}>{rule}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.eulaAgreement}>{COMMUNITY_EULA.agreement}</Text>
            <Pressable onPress={acceptEula} style={styles.eulaAcceptBtn} accessibilityRole="button" accessibilityLabel="Acepto las normas y entro a la comunidad">
              <Text style={styles.eulaAcceptText}>ACEPTO Y ENTRO</Text>
            </Pressable>
            <Pressable onPress={() => router.back()} style={styles.eulaDeclineBtn} accessibilityRole="button" accessibilityLabel="Ahora no">
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
          <Pressable
            onPress={() => setNotice(null)}
            style={styles.notice}
            accessibilityRole="button"
            accessibilityLabel={`${notice}. Toca para descartar`}
            accessibilityLiveRegion="polite">
            <MaterialIcons name="info" size={16} color={palette.goldText} />
            <Text style={styles.noticeText}>{notice}</Text>
            <MaterialIcons name="close" size={16} color={palette.smoke} />
          </Pressable>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.gold} colors={[palette.gold]} />
          }>
          <View style={[styles.layout, isDesktop && styles.layoutDesk]}>
            <View style={styles.feedCol}>
              <Text accessibilityRole="header" style={[styles.headline, isDesktop && styles.headlineDesk]}>Comunidad</Text>
              <Text style={styles.whoReads}>
                {members.length > 0 ? `${members.length} ${members.length === 1 ? 'miembro activo' : 'miembros activos'} · ` : ''}Solo la ven los miembros de Polaris.
              </Text>

              {/* Quién está participando — como las historias de una red social */}
              {members.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersRow}>
                  {members.map((m) => (
                    <Pressable
                      key={m.id}
                      onPress={() => openProfile(m.id)}
                      style={styles.member}
                      accessibilityRole="link"
                      accessibilityLabel={`Ver el perfil de ${m.name}${m.today ? ', publicó hoy' : ''}`}>
                      <View style={[styles.memberRing, m.today && styles.memberRingOn]}>
                        <Avatar id={m.id} name={m.name} uri={m.avatar} size={56} />
                      </View>
                      <Text style={styles.memberName} numberOfLines={1}>{m.name.split(' ')[0]}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              {/* Nueva publicación: texto + foto */}
              <View style={styles.composeCard}>
                <View style={styles.composeTop}>
                  <Avatar id={userId ?? 'me'} name={myName} uri={null} size={44} />
                  <TextInput
                    ref={inputRef}
                    style={styles.composeInput}
                    value={newPost}
                    onChangeText={(t) => { setNewPost(t); if (postError) setPostError(null); }}
                    placeholder={`¿Qué quieres compartir hoy, ${myName.split(' ')[0] || 'tú'}?`}
                    placeholderTextColor={palette.smoke}
                    multiline
                    maxLength={500}
                    accessibilityLabel="Escribe tu publicación"
                  />
                </View>
                {photo && (
                  <View style={styles.previewWrap}>
                    <Image source={{ uri: photo.previewUrl }} style={styles.preview} resizeMode="cover" accessibilityLabel="Foto elegida" />
                    <Pressable onPress={() => setPhoto(null)} style={styles.previewRemove} accessibilityRole="button" accessibilityLabel="Quitar la foto">
                      <MaterialIcons name="close" size={18} color={palette.ink} />
                    </Pressable>
                  </View>
                )}
                <View style={styles.composeBar}>
                  <Pressable onPress={choosePhoto} style={styles.photoBtn} accessibilityRole="button" accessibilityLabel="Agregar una foto">
                    <MaterialIcons name="add-photo-alternate" size={22} color={palette.goldText} />
                    <Text style={styles.photoBtnText}>Foto</Text>
                  </Pressable>
                  <Pressable
                    onPress={submitPost}
                    disabled={submitting || (!newPost.trim() && !photo)}
                    style={[styles.publishBtn, (submitting || (!newPost.trim() && !photo)) && styles.publishBtnOff]}
                    accessibilityRole="button"
                    accessibilityLabel="Publicar"
                    accessibilityState={{ disabled: submitting || (!newPost.trim() && !photo) }}>
                    {submitting
                      ? <ActivityIndicator color={palette.ink} />
                      : <Text style={styles.publishText}>PUBLICAR</Text>}
                  </Pressable>
                </View>
              </View>
              {postError && <Text style={styles.postError}>{postError}</Text>}

              {loading && (
                <View style={styles.loadingState}>
                  <ActivityIndicator color={palette.goldText} />
                </View>
              )}

              {!loading && posts.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Todavía nadie ha publicado.</Text>
                  <Text style={styles.emptySubtext}>Comparte la primera foto o la primera idea.</Text>
                </View>
              )}

              {posts.map((post) => (
                <View key={post.id} style={styles.card}>
                  {post.is_pinned && (
                    <View style={styles.pinnedBadge}>
                      <MaterialIcons name="push-pin" size={14} color={palette.goldText} />
                      <Text style={styles.pinnedText}>Fijado</Text>
                    </View>
                  )}
                  <View style={styles.postHeader}>
                    {/* Sin insignia de equipo: decidirla por el nombre dejaba que cualquiera
                        llamado "Norman" publicara como "Equipo Polaris" (suplantación).
                        Vuelve cuando el select traiga un rol del servidor. */}
                    <Pressable
                      onPress={() => openProfile(post.user_id)}
                      style={styles.authorLink}
                      accessibilityRole="link"
                      accessibilityLabel={`Ver el perfil de ${post.author_name}`}>
                      <Avatar id={post.user_id} name={post.author_name} uri={post.author_avatar} size={44} />
                      <View style={styles.postMeta}>
                        <Text style={styles.postAuthor} numberOfLines={1}>{post.author_name}</Text>
                        <Text style={styles.postTime}>{timeAgo(post.created_at)}</Text>
                      </View>
                    </Pressable>
                    {post.user_id !== userId && (
                      <Pressable
                        onPress={() => setActionPost(post)}
                        style={styles.moreBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Opciones de la publicación">
                        <MaterialIcons name="more-horiz" size={22} color={palette.smoke} />
                      </Pressable>
                    )}
                  </View>
                  {!!post.content.trim() && <Text style={styles.postContent}>{post.content}</Text>}
                  {!!post.image_url && (
                    // Doble toque en la foto = me gusta (como en cualquier red social).
                    <Pressable onPress={() => onPhotoTap(post)} accessibilityRole="image" accessibilityLabel="Foto de la publicación. Doble toque para dar me gusta">
                      <PostPhoto uri={post.image_url} />
                    </Pressable>
                  )}
                  <View style={styles.postActions}>
                    <Pressable
                      onPress={() => toggleLike(post)}
                      style={styles.likeBtn}
                      accessibilityRole="button"
                      accessibilityState={{ selected: post.liked }}
                      accessibilityLabel={post.liked ? `Quitar me gusta, ${post.likes_count} me gusta` : `Me gusta, ${post.likes_count} me gusta`}>
                      <MaterialIcons name={post.liked ? 'favorite' : 'favorite-border'} size={24} color={post.liked ? palette.goldText : palette.ivory} />
                      <Text style={[styles.likeCount, post.liked && { color: palette.goldText }]}>{post.likes_count > 0 ? post.likes_count : ''}</Text>
                    </Pressable>
                    {ENV.socialSpacesEnabled && (
                      <Pressable
                        onPress={() => setCommentsFor(post.id)}
                        style={styles.likeBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Comentarios, ${post.comments_count}`}>
                        <MaterialIcons name="chat-bubble-outline" size={22} color={palette.ivory} />
                        <Text style={styles.likeCount}>{post.comments_count > 0 ? post.comments_count : ''}</Text>
                      </Pressable>
                    )}
                    {post.user_id !== userId && (
                      <Pressable
                        onPress={() => router.push({ pathname: '/comunidad/chat/[id]', params: { id: post.user_id, name: post.author_name } } as never)}
                        style={styles.likeBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Escribir un mensaje privado a ${post.author_name}`}>
                        <MaterialIcons name="send" size={21} color={palette.ivory} />
                      </Pressable>
                    )}
                  </View>
                  {ENV.socialSpacesEnabled && (
                    <Pressable onPress={() => setCommentsFor(post.id)} accessibilityRole="button" style={styles.commentsLink}>
                      <Text style={styles.commentsLinkText}>
                        {post.comments_count > 0
                          ? `Ver ${post.comments_count === 1 ? 'el comentario' : `los ${post.comments_count} comentarios`}`
                          : 'Escribe el primer comentario'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>

            {isDesktop && (
              <View style={styles.side}>
                <View style={styles.sideCard}>
                  <Text style={styles.sideMeta}>ESTA SEMANA</Text>
                  <View style={styles.sideStats}>
                    <View><Text style={styles.sideNum}>{weekPosts}</Text><Text style={styles.sideLabel}>publicaciones</Text></View>
                    <View><Text style={styles.sideNum}>{weekPhotos}</Text><Text style={styles.sideLabel}>fotos</Text></View>
                    <View><Text style={styles.sideNum}>{members.length}</Text><Text style={styles.sideLabel}>miembros</Text></View>
                  </View>
                </View>
                <Pressable onPress={() => router.push('/comunidad/mensajes' as never)} style={styles.sideRow} accessibilityRole="link">
                  <MaterialIcons name="chat-bubble-outline" size={20} color={palette.goldText} />
                  <Text style={styles.sideRowText}>Mensajes</Text>
                  <MaterialIcons name="arrow-forward" size={18} color={palette.smoke} />
                </Pressable>
                {ENV.socialSpacesEnabled && (
                  <Pressable onPress={() => router.push('/comunidad' as never)} style={styles.sideRow} accessibilityRole="link">
                    <MaterialIcons name="event" size={20} color={palette.goldText} />
                    <Text style={styles.sideRowText}>Eventos y espacios</Text>
                    <MaterialIcons name="arrow-forward" size={18} color={palette.smoke} />
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* ── El Círculo: comentarios (solo con flag activo) ── */}
        {ENV.socialSpacesEnabled && (
          <CommentSheet
            postId={commentsFor}
            userId={userId ?? null}
            visible={!!commentsFor}
            onClose={() => setCommentsFor(null)}
            onCountChange={(id, delta) => setPosts((prev) => prev.map((x) => (x.id === id ? { ...x, comments_count: Math.max(0, x.comments_count + delta) } : x)))}
          />
        )}

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
                accessibilityRole="button"
                accessibilityLabel="Enviar mensaje"
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
                accessibilityRole="button"
                accessibilityLabel="Reportar publicación"
                onPress={() => { if (actionPost) setReportFor(actionPost); }}>
                <MaterialIcons name="flag" size={20} color={palette.goldText} />
                <Text style={styles.sheetRowText}>Reportar publicación</Text>
              </Pressable>
              <Pressable
                style={styles.sheetRow}
                accessibilityRole="button"
                accessibilityLabel="Bloquear a este usuario"
                onPress={() => { if (actionPost) blockUser(actionPost); }}>
                <MaterialIcons name="block" size={20} color={palette.danger} />
                <Text style={[styles.sheetRowText, { color: palette.danger }]}>Bloquear a este usuario</Text>
              </Pressable>
              <Pressable style={styles.sheetCancel} onPress={() => setActionPost(null)} accessibilityRole="button" accessibilityLabel="Cancelar">
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
                  accessibilityRole="button"
                  accessibilityLabel={r.label}
                  accessibilityState={{ disabled: reportBusy }}
                  onPress={() => reportFor && submitReport(reportFor, r.value)}>
                  <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
                  <Text style={styles.sheetRowText}>{r.label}</Text>
                </Pressable>
              ))}
              <Pressable style={styles.sheetCancel} onPress={() => { setReportFor(null); setActionPost(null); }} accessibilityRole="button" accessibilityLabel="Cancelar">
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
  backBtn:         { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  meta:            { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.ash },
  page:            { paddingBottom: 96 },
  layout:          { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: spacing.md },
  layoutDesk:      { maxWidth: 1040, flexDirection: 'row', gap: 40, alignItems: 'flex-start', paddingHorizontal: spacing.lg },
  feedCol:         { flex: 1, minWidth: 0 },
  headline:        { fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 44, lineHeight: 48, color: palette.ivory, letterSpacing: -1, marginTop: spacing.md },
  headlineDesk:    { fontSize: 64, lineHeight: 68 },
  membersRow:      { gap: 14, paddingVertical: spacing.md },
  member:          { width: 68, alignItems: 'center', gap: 6 },
  memberRing:      { padding: 3, borderRadius: 40, borderWidth: 2, borderColor: palette.line },
  memberRingOn:    { borderColor: palette.gold },
  memberName:      { fontFamily: Fonts.sans, fontSize: 13, color: palette.ash, maxWidth: 68 },
  composeTop:      { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  card:            { backgroundColor: palette.graphite, borderRadius: 12, borderWidth: 1, borderColor: palette.line, padding: spacing.md, marginBottom: spacing.md, overflow: 'hidden' },
  authorLink:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  commentsLink:    { minHeight: 32, justifyContent: 'center' },
  commentsLinkText:{ fontFamily: Fonts.sans, fontSize: 14, color: palette.smoke },
  side:            { width: 300, gap: spacing.sm, marginTop: 120 },
  sideCard:        { backgroundColor: palette.gold, borderRadius: 12, padding: spacing.lg, gap: spacing.md, marginBottom: spacing.sm },
  sideMeta:        { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.ink },
  sideStats:       { flexDirection: 'row', justifyContent: 'space-between' },
  sideNum:         { fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 40, lineHeight: 44, color: palette.ink, fontVariant: ['tabular-nums'] },
  sideLabel:       { fontFamily: Fonts.sans, fontSize: 13, color: palette.ink },
  sideRow:         { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.md, borderRadius: 12, borderWidth: 1, borderColor: palette.line },
  sideRowText:     { flex: 1, fontFamily: Fonts.sans, fontSize: 16, color: palette.ivory },
  headerLink:      { minHeight: 44, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  headerLinkText:  { fontFamily: Fonts.sans, fontSize: 15, color: palette.ivory },
  whoReads:        { fontFamily: Fonts.sans, fontSize: 14, color: palette.smoke, marginTop: spacing.sm },

  composeCard:     { marginBottom: spacing.lg, backgroundColor: palette.graphite, borderRadius: radii.sm, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: palette.line },
  composeBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: spacing.sm, borderRadius: 999, borderWidth: 1, borderColor: palette.lineGold },
  photoBtnText:    { fontFamily: Fonts.sans, fontSize: 15, color: palette.goldText },
  publishBtn:      { minHeight: 44, minWidth: 120, paddingHorizontal: spacing.lg, borderRadius: 999, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  publishBtnOff:   { opacity: 0.35 },
  publishText:     { fontFamily: Fonts.display, fontWeight: '700', fontSize: 12, letterSpacing: 1.2, color: palette.ink },
  previewWrap:     { position: 'relative', alignSelf: 'flex-start' },
  preview:         { width: 120, height: 120, borderRadius: radii.sm },
  previewRemove:   { position: 'absolute', top: 6, right: 6, width: 32, height: 32, borderRadius: 16, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  postPhoto:       { marginHorizontal: -spacing.md, marginBottom: spacing.sm, backgroundColor: palette.black },
  composeInput:    { flex: 1, paddingTop: 10, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 17, minHeight: 56, maxHeight: 140, lineHeight: 24 },
  postError:       { color: palette.danger, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, marginTop: -spacing.sm, marginBottom: spacing.md },

  notice:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: spacing.md, marginBottom: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: palette.goldLight, borderWidth: 1, borderColor: palette.lineGold, borderRadius: radii.sm },
  noticeText:      { flex: 1, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 12.5, lineHeight: 17 },


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
  emptyTitle:      { fontFamily: Fonts.sans, fontSize: 17, color: palette.ivory },
  emptySubtext:    { ...typography.caption, color: palette.smoke },


  pinnedBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  pinnedText:      { fontFamily: Fonts.sans, fontSize: 13, color: palette.smoke },

  postHeader:      { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  postMeta:        { flex: 1, gap: 2 },
  postAuthor:      { fontFamily: Fonts.sans, fontSize: 16, color: palette.ivory, fontWeight: '600', letterSpacing: 0.2 },
  postTime:        { fontFamily: Fonts.sans, fontSize: 13, color: palette.smoke },
  moreBtn:         { padding: 6, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },

  postContent:     { fontFamily: Fonts.sans, fontSize: 17, color: palette.ivory, lineHeight: 26, marginBottom: spacing.md },

  postActions:     { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  // Reaccionar/comentar: el numero puede ser una sola cifra ("3"), asi que
  // el contenido por si solo deja una caja mas angosta que un dedo.
  likeBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minWidth: 44, minHeight: 44 },
  likeCount:       { fontSize: 14, color: palette.ash, fontFamily: Fonts.sans },

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
