import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
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

import { db2 } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { palette, spacing, typography, Fonts, radii } from '@/constants/theme';

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
  const inputRef = useRef<TextInput>(null);

  const loadPosts = async () => {
    try {
      // Cargar posts (sin join — evita problema de FK en PostgREST)
      const { data, error } = await db2.communityPosts()
        .select('id, user_id, content, likes_count, is_pinned, created_at')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !data) { setPosts([]); return; }

      // Resolver nombres de autor
      const userIds = [...new Set(data.map((p: any) => p.user_id).filter(Boolean))];
      const nameMap: Record<string, string> = {};
      if (userIds.length > 0) {
        try {
          const { supabase } = await import('@/lib/supabase');
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

      const mapped: Post[] = data.map((p: any) => ({
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
  };

  useEffect(() => { loadPosts(); }, [userId]);

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
    setSubmitting(true);
    try {
      await db2.communityPosts().insert({
        user_id:   userId,
        content:   newPost.trim(),
        is_pinned: false,
      });
      setNewPost('');
      inputRef.current?.blur();
      loadPosts();
    } catch { /* silencioso */ }
    setSubmitting(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.bottom}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
          </Pressable>
          <Text style={styles.title}>COMUNIDAD</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Input nuevo post */}
        <View style={styles.composeBox}>
          <TextInput
            ref={inputRef}
            style={styles.composeInput}
            value={newPost}
            onChangeText={setNewPost}
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
              </View>
            </View>
          ))}

          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: palette.black },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn:         { padding: 8 },
  title:           { fontFamily: Fonts.display, fontSize: 16, color: palette.ivory, letterSpacing: 3 },

  composeBox:      { flexDirection: 'row', alignItems: 'flex-end', marginHorizontal: spacing.md, marginBottom: spacing.sm, backgroundColor: palette.graphite, borderRadius: radii.sm, padding: spacing.sm, gap: 8, borderWidth: 1, borderColor: palette.line },
  composeInput:    { flex: 1, color: palette.ivory, fontFamily: Fonts.sans, fontSize: 14, maxHeight: 100, lineHeight: 20 },
  sendBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: palette.graphite, borderWidth: 1, borderColor: palette.line },

  feed:            { paddingHorizontal: spacing.md },

  loadingState:    { paddingVertical: 40, alignItems: 'center' },
  loadingText:     { ...typography.caption, color: palette.ash },

  emptyState:      { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyTitle:      { fontFamily: Fonts.display, fontSize: 16, color: palette.ash, letterSpacing: 1 },
  emptySubtext:    { ...typography.caption, color: palette.smoke },

  postCard:        { backgroundColor: palette.graphite, borderRadius: radii.sm, padding: spacing.md, marginBottom: 10, borderWidth: 1, borderColor: 'transparent' },
  postCardPinned:  { borderColor: 'rgba(212,175,55,0.3)', borderWidth: 1 },

  pinnedBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  pinnedText:      { fontFamily: Fonts.display, fontSize: 10, color: palette.gold, letterSpacing: 1 },

  postHeader:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatarCircle:    { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(212,175,55,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(212,175,55,0.3)' },
  avatarInitial:   { fontFamily: Fonts.display, fontSize: 16, color: palette.gold },
  postMeta:        { flex: 1 },
  postAuthor:      { fontFamily: Fonts.sans, fontSize: 13, color: palette.ivory, fontWeight: '600' },
  postTime:        { fontSize: 11, color: palette.smoke },

  postContent:     { fontFamily: Fonts.sans, fontSize: 14, color: palette.ash, lineHeight: 22, marginBottom: 12 },

  postActions:     { flexDirection: 'row', gap: spacing.md },
  likeBtn:         { flexDirection: 'row', alignItems: 'center', gap: 5 },
  likeCount:       { fontSize: 13, color: palette.ash, fontFamily: Fonts.mono },
});
