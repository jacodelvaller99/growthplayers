/**
 * Admin — Ranking ponderado de usuarios (Cluster A2).
 *
 * Organiza a TODOS los usuarios y los compara con una ponderación explicable
 * (sovereign + engagement + bienestar + retención). Cada fila muestra el score,
 * el percentil y qué dimensión pesó más. Chips para reordenar por dimensión.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { fetchUserRanking } from '@/lib/userRanking';
import {
  DIMENSION_LABEL,
  sortByDimension,
  type RankDimension,
  type RankedUser,
} from '@/lib/userRankingLogic';

const DIMS: (RankDimension | 'TODOS')[] = ['TODOS', 'sovereign', 'engagement', 'wellbeing', 'churn', 'executionMomentum', 'relationalDepth'];

function scoreColor(score: number): string {
  if (score >= 72) return palette.success;
  if (score >= 55) return palette.goldText;
  if (score >= 35) return palette.warning;
  return palette.danger;
}

function Row({ r, onPress }: { r: RankedUser; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={4} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
      <Text style={s.rank}>{r.rank}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.name}>{r.name}</Text>
        <Text style={s.sub} numberOfLines={1}>
          {r.topDriver ? `Lidera: ${r.topDriver.label}` : 'Sin señal dominante'} · percentil {r.percentile}
        </Text>
        <View style={s.barTrack}>
          <View style={[s.barFill, { width: `${r.score}%`, backgroundColor: scoreColor(r.score) }]} />
        </View>
      </View>
      <Text style={[s.score, { color: scoreColor(r.score) }]}>{r.score}</Text>
      <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
    </Pressable>
  );
}

export default function AdminRankingScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ranked, setRanked] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dim, setDim] = useState<RankDimension | 'TODOS'>('TODOS');

  const load = useCallback(async () => {
    setRanked(await fetchUserRanking());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const shown = useMemo(
    () => (dim === 'TODOS' ? ranked : sortByDimension(ranked, dim)),
    [ranked, dim],
  );

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}>

      <View style={s.topRow}>
        <Pressable onPress={() => router.back()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>RANKING</Text>
        <View style={{ width: 36 }} />
      </View>
      <Text style={s.intro}>Todos los usuarios, comparados con una ponderación explicable. Toca un chip para reordenar por dimensión.</Text>

      {/* Chips de dimensión */}
      <View style={s.chips}>
        {DIMS.map((d) => {
          const active = dim === d;
          const label = d === 'TODOS' ? 'GENERAL' : DIMENSION_LABEL[d].toUpperCase();
          return (
            <Pressable key={d} onPress={() => setDim(d)} style={[s.chip, active && s.chipActive]}>
              <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={palette.gold} style={{ marginTop: spacing.xxxl }} />
      ) : ranked.length === 0 ? (
        <PremiumCard style={s.card}>
          <Text style={s.empty}>Aún no hay usuarios con señales para rankear.</Text>
        </PremiumCard>
      ) : (
        <>
          <GoldDivider label={`${shown.length} USUARIOS`} />
          <PremiumCard style={s.card}>
            {shown.map((r) => <Row key={r.id} r={r} onPress={() => router.push(`/admin/usuarios/${r.id}` as never)} />)}
          </PremiumCard>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: palette.ivory, fontSize: 18 },
  intro: { ...typography.body, color: palette.ash, marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: palette.charcoal },
  chipActive: { backgroundColor: palette.gold },
  chipText: { ...typography.label, color: palette.ash, fontSize: 9, letterSpacing: 1 },
  chipTextActive: { color: palette.ink },
  card: { gap: 2, marginBottom: spacing.md },
  empty: { ...typography.caption, color: palette.smoke, fontSize: 12, fontStyle: 'italic' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: palette.line },
  rank: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 16, color: palette.goldText, width: 26, textAlign: 'center' },
  name: { ...typography.section, color: palette.ivory, fontSize: 13, letterSpacing: 0.4 },
  sub: { ...typography.caption, color: palette.smoke, fontSize: 11, marginTop: 1 },
  barTrack: { height: 4, backgroundColor: palette.charcoal, borderRadius: 2, overflow: 'hidden', marginTop: 4 },
  barFill: { height: 4, borderRadius: 2 },
  score: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 20, marginLeft: 2 },
});
