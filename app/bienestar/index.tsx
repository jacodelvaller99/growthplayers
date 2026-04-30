import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader, GoldDivider, PremiumCard, screen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

type Block = {
  route: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  subtitle: string;
  desc: string;
  color: string;
  score: string;
};

const BLOCKS: Block[] = [
  {
    route: '/bienestar/meditacion',
    icon: 'self-improvement',
    title: 'MEDITACIÓN',
    subtitle: 'Sesiones guiadas',
    desc: '5 sesiones · mañana, noche, enfoque, estrés',
    color: '#7c5cbf',
    score: '+5 pts / sesión',
  },
  {
    route: '/bienestar/respiracion',
    icon: 'air',
    title: 'RESPIRACIÓN',
    subtitle: 'Control del sistema nervioso',
    desc: '4 técnicas · 4-7-8, Box, Coherente, Wim Hof',
    color: '#2e7d52',
    score: '+3 pts / sesión',
  },
  {
    route: '/bienestar/binaurales',
    icon: 'graphic-eq',
    title: 'BINAURALES',
    subtitle: 'Frecuencias para la mente',
    desc: 'Delta · Theta · Alpha · Beta · Gamma',
    color: '#b07d1a',
    score: '+2 pts / sesión',
  },
];

export default function BienestarHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useLifeFlow();

  const stats = useMemo(() => {
    const sessions = state.wellnessSessions ?? [];
    const thisWeek = sessions.filter((s) => {
      const d = new Date(s.completedAt);
      const now = new Date();
      const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diff < 7;
    });
    const totalMinutes = Math.round(
      thisWeek.reduce((acc, s) => acc + s.durationSeconds, 0) / 60,
    );
    return {
      total: sessions.length,
      weekTotal: thisWeek.length,
      weekMinutes: totalMinutes,
      meditation: sessions.filter((s) => s.type === 'meditation').length,
      breathing:  sessions.filter((s) => s.type === 'breathing').length,
      binaural:   sessions.filter((s) => s.type === 'binaural').length,
    };
  }, [state.wellnessSessions]);

  return (
    <ScrollView
      style={screen.root}
      contentContainerStyle={[screen.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}>
      <AppHeader title="BIENESTAR" />

      {/* ── Stats summary ── */}
      <PremiumCard style={styles.statsCard}>
        <Text style={styles.statsTitle}>ESTA SEMANA</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.weekMinutes}</Text>
            <Text style={styles.statLabel}>minutos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.weekTotal}</Text>
            <Text style={styles.statLabel}>sesiones</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>total</Text>
          </View>
        </View>
      </PremiumCard>

      <GoldDivider label="MÓDULOS" />

      {/* ── Blocks ── */}
      {BLOCKS.map((block) => {
        const count =
          block.route.includes('meditacion') ? stats.meditation
          : block.route.includes('respiracion') ? stats.breathing
          : stats.binaural;

        return (
          <Pressable
            key={block.route}
            onPress={() => router.push(block.route as never)}
            style={({ pressed }) => [styles.block, pressed && styles.blockPressed]}>
            <View style={[styles.blockIcon, { backgroundColor: block.color + '22' }]}>
              <MaterialIcons name={block.icon} size={28} color={block.color} />
            </View>
            <View style={styles.blockBody}>
              <View style={styles.blockTop}>
                <Text style={styles.blockTitle}>{block.title}</Text>
                {count > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{count}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.blockSubtitle}>{block.subtitle}</Text>
              <Text style={styles.blockDesc}>{block.desc}</Text>
              <Text style={[styles.scoreHint, { color: block.color }]}>{block.score}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={palette.smoke} />
          </Pressable>
        );
      })}

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statsTitle: {
    ...typography.label,
    color: palette.gold,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 28,
    letterSpacing: 1,
  },
  statLabel: {
    ...typography.label,
    color: palette.smoke,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: palette.line,
  },

  block: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  blockPressed: {
    opacity: 0.75,
  },
  blockIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  blockBody: {
    flex: 1,
    gap: 3,
  },
  blockTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  blockTitle: {
    ...typography.section,
    color: palette.ivory,
    fontSize: 13,
    letterSpacing: 2,
  },
  countBadge: {
    backgroundColor: palette.gold,
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countText: {
    color: palette.black,
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: '700',
  },
  blockSubtitle: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
  },
  blockDesc: {
    ...typography.caption,
    color: palette.smoke,
  },
  scoreHint: {
    ...typography.label,
    marginTop: 4,
  },
});
