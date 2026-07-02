/**
 * EL CÍRCULO — Descubrir espacios.
 * Lista de círculos activos (más miembros primero) con unirse 1-tap y CTA crear.
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

import { ENV } from '@/app/config/env';
import { CircleDisabled, CircleEmpty, SpaceCard } from '@/components/circle';
import { GoldDivider, useScreen } from '@/components/polaris';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { fetchMyMemberships, fetchSpaces, joinSpace } from '@/lib/circle';
import type { Space } from '@/lib/circleLogic';

export default function EspaciosScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [mySpaceIds, setMySpaceIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [all, mine] = await Promise.all([fetchSpaces(), fetchMyMemberships(userId ?? null)]);
    setSpaces(all);
    setMySpaceIds(new Set(mine.map((m) => m.space_id)));
    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleJoin = async (space: Space) => {
    if (!userId || joiningId) return;
    setJoiningId(space.id);
    const res = await joinSpace(userId, space.id);
    if (res.success) setMySpaceIds((prev) => new Set([...prev, space.id]));
    setJoiningId(null);
  };

  if (!ENV.socialSpacesEnabled) {
    return <View style={[sc.root, { paddingTop: insets.top }]}><CircleDisabled /></View>;
  }

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={palette.goldText} />}>

      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}>
          <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>ESPACIOS</Text>
        <Pressable
          style={s.createBtn}
          onPress={() => router.push('/comunidad/espacios/crear' as never)}
          accessibilityRole="button"
          accessibilityLabel="Crear un espacio nuevo">
          <MaterialIcons name="add" size={16} color={palette.ink} />
          <Text style={s.createBtnText}>CREAR</Text>
        </Pressable>
      </View>
      <Text style={s.intro}>Círculos por tema, creados por la hermandad. Únete o funda el tuyo.</Text>

      <GoldDivider label={`${spaces.length} ESPACIOS ACTIVOS`} />

      {loading ? (
        <ActivityIndicator color={palette.goldText} style={{ marginTop: spacing.xxxl }} />
      ) : spaces.length === 0 ? (
        <CircleEmpty
          icon="workspaces"
          text={'Aún no existe ningún espacio.\nFunda el primero y convoca a los tuyos.'}
          ctaLabel="CREAR EL PRIMER ESPACIO"
          onCta={() => router.push('/comunidad/espacios/crear' as never)}
        />
      ) : (
        <View style={s.list}>
          {spaces.map((sp) => {
            const isMember = mySpaceIds.has(sp.id);
            return (
              <View key={sp.id} style={s.rowWrap}>
                <View style={{ flex: 1 }}>
                  <SpaceCard
                    space={sp}
                    isMember={isMember}
                    onPress={() => router.push(`/comunidad/espacios/${sp.id}` as never)}
                  />
                </View>
                {!isMember && (
                  <Pressable
                    style={[s.joinBtn, joiningId === sp.id && { opacity: 0.5 }]}
                    disabled={joiningId === sp.id}
                    onPress={() => handleJoin(sp)}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: joiningId === sp.id }}
                    accessibilityLabel={`Unirme al espacio ${sp.name}`}>
                    <Text style={s.joinBtnText}>UNIRME</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, marginBottom: spacing.xs },
  backBtn: { padding: spacing.xs },
  title: { ...typography.title, color: palette.ivory, flex: 1 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette.gold, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: 8, minHeight: 36 },
  createBtnText: { ...typography.label, color: palette.ink, fontSize: 9, letterSpacing: 1 },
  intro: { ...typography.caption, color: palette.smoke, paddingHorizontal: spacing.lg, marginBottom: spacing.md, fontSize: 12 },
  list: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  rowWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  joinBtn: { borderWidth: 1, borderColor: palette.gold, borderRadius: radii.sm, paddingHorizontal: spacing.md, minHeight: 44, justifyContent: 'center' },
  joinBtnText: { ...typography.label, color: palette.goldText, fontSize: 9, letterSpacing: 1 },
});
