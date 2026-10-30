/**
 * MyMentorCard — "Tu mentor": quién te acompaña y cómo escribirle.
 *
 * El cliente no tenía forma de saber quién era su mentor humano (la
 * asignación vivía solo en el admin). Lee `my_mentor()` (migración
 * 20261030000000), que devuelve únicamente la fila del propio cliente. Sin
 * asignación, o sin la migración aplicada, no se pinta nada — nunca un hueco.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { logSilentError } from '@/lib/observability';
import { supabase } from '@/lib/supabase';

interface MyMentor {
  mentor_id: string;
  name: string | null;
  avatar_url: string | null;
  assigned_at: string | null;
}

const mentorCache = new Map<string, MyMentor | null>();

export function useMyMentor(): MyMentor | null {
  const { userId } = useLifeFlow();
  const [mentor, setMentor] = useState<MyMentor | null>(() => (userId ? mentorCache.get(userId) ?? null : null));

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase.rpc('my_mentor').then(({ data, error }) => {
      if (cancelled) return;
      if (error) { logSilentError('useMyMentor', error); return; }
      const row = (Array.isArray(data) ? data[0] : data) as MyMentor | undefined;
      mentorCache.set(userId, row ?? null);
      setMentor(row ?? null);
    });
    return () => { cancelled = true; };
  }, [userId]);

  return mentor;
}

export function MyMentorCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const router = useRouter();
  const mentor = useMyMentor();
  if (!mentor) return null;

  const name = mentor.name?.trim() || 'Tu mentor';
  const since = mentor.assigned_at
    ? new Date(mentor.assigned_at).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    : null;

  return (
    <View style={[s.card, style]} accessibilityLabel={`Tu mentor es ${name}`}>
      <View style={s.avatar}>
        {mentor.avatar_url ? (
          <Image source={{ uri: mentor.avatar_url }} style={s.avatarImg} contentFit="cover" accessibilityIgnoresInvertColors />
        ) : (
          <Text style={s.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={s.info}>
        <Text style={s.kicker}>Tu mentor</Text>
        <Text style={s.name} numberOfLines={1}>{name}</Text>
        {since && <Text style={s.since}>Te acompaña desde {since}</Text>}
      </View>
      <Pressable
        onPress={() => router.push({ pathname: '/comunidad/chat/[id]', params: { id: mentor.mentor_id, name } } as never)}
        style={({ pressed }) => [s.cta, pressed && { opacity: 0.75 }]}
        accessibilityRole="button"
        accessibilityLabel={`Escribirle a ${name}`}>
        <MaterialIcons name="chat-bubble-outline" size={16} color={palette.goldText} />
        <Text style={s.ctaText}>ESCRIBIRLE</Text>
      </Pressable>
    </View>
  );
}

const AVATAR = 48;

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.graphite,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 1,
    borderColor: palette.lineGold,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: AVATAR, height: AVATAR },
  avatarText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 18, color: palette.goldText },
  info: { flex: 1, minWidth: 0 },
  kicker: { ...typography.caption, color: palette.ash },
  name: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 16, letterSpacing: 0.4, color: palette.ivory, marginTop: 2 },
  since: { ...typography.caption, color: palette.smoke, marginTop: 2 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.lineGold,
  },
  ctaText: { ...typography.label, color: palette.goldText, fontSize: 11 },
});
