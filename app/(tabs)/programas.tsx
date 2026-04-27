import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AppHeader,
  GoldDivider,
  PremiumCard,
  ProgressCard,
  StatusPill,
  screen,
} from '@/components/polaris';
import { POLARIS_MODULES, PREMIUM_MODULE_NUMBERS } from '@/data/modules';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

function statusTone(status: string) {
  if (status === 'active') return 'gold' as const;
  if (status === 'completed') return 'success' as const;
  return 'muted' as const;
}

function statusLabel(status: string) {
  if (status === 'completed') return 'COMPLETADO';
  if (status === 'active') return 'ACTIVO';
  return 'BLOQUEADO';
}

export default function ProgramasScreen() {
  const router = useRouter();
  const { isSubscribed } = useLifeFlow();

  const completedCount = POLARIS_MODULES.filter((m) => m.status === 'completed').length;
  const totalLessons = POLARIS_MODULES.reduce((acc, m) => acc + m.lessons.length, 0);

  return (
    <ScrollView style={screen.root} contentContainerStyle={screen.content}>
      <AppHeader title="PROGRAMA" />

      {/* ── Protocol Hero ── */}
      <PremiumCard style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.heroTitleWrap}>
            <Text style={styles.heroEyebrow}>PROTOCOLO SOBERANO</Text>
            <Text style={styles.heroTitle}>90 DIAS DE{'\n'}EJECUCION.</Text>
          </View>
          <StatusPill label="ACTIVO" tone="gold" dot />
        </View>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{completedCount}</Text>
            <Text style={styles.heroStatMeta}>MODULOS{'\n'}COMPLETADOS</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{POLARIS_MODULES.length}</Text>
            <Text style={styles.heroStatMeta}>MODULOS{'\n'}TOTALES</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{totalLessons}</Text>
            <Text style={styles.heroStatMeta}>LECCIONES{'\n'}EN TOTAL</Text>
          </View>
        </View>
      </PremiumCard>

      <ProgressCard label="Avance total del protocolo" value="62%" progress={62} />

      {/* ── Module List ── */}
      <GoldDivider label="MODULOS" />
      <View style={styles.list}>
        {POLARIS_MODULES.map((module) => {
          const isActive  = module.status === 'active';
          const isPremium = PREMIUM_MODULE_NUMBERS.has(module.number) && !isSubscribed;
          return (
            <Pressable
              key={module.id}
              accessibilityRole="button"
              accessibilityLabel={`Modulo ${module.number}: ${module.title}`}
              onPress={() => {
                if (isPremium) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  router.push('/paywall');
                  return;
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: '/module/[id]', params: { id: module.id } });
              }}
              style={({ pressed }) => [pressed && { opacity: 0.82 }]}>
              <PremiumCard style={[styles.moduleCard, isActive && styles.moduleCardActive]}>
                {isActive && <View style={styles.activeStripe} />}
                <View style={[styles.moduleInner, !isActive && styles.moduleInnerFull]}>
                  <View style={styles.moduleTop}>
                    <Text style={[styles.moduleNumber, isActive && styles.moduleNumberActive]}>
                      {module.number < 10 ? `0${module.number}` : module.number}
                    </Text>
                    <StatusPill
                      label={isPremium ? 'PREMIUM' : statusLabel(module.status)}
                      tone={isPremium ? 'gold' : statusTone(module.status)}
                    />
                  </View>
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                  <Text style={styles.moduleSubtitle}>{module.subtitle}</Text>
                  <View style={styles.moduleFooter}>
                    <Text style={styles.moduleLessons}>
                      {module.lessons.length} LECCIONES
                    </Text>
                    <View style={styles.progressWrap}>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${module.progress}%` }]} />
                      </View>
                      <Text style={styles.progressPct}>{module.progress}%</Text>
                    </View>
                    <MaterialIcons
                      name={isPremium ? 'lock' : 'chevron-right'}
                      size={20}
                      color={isActive ? palette.black : palette.gold}
                    />
                  </View>
                </View>
                {/* Premium overlay */}
                {isPremium && <View style={styles.premiumOverlay} />}
              </PremiumCard>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Hero
  heroCard: {
    gap: spacing.lg,
    overflow: 'hidden',
  },
  heroTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroTitleWrap: {
    gap: spacing.xs,
  },
  heroEyebrow: {
    ...typography.label,
    color: palette.gold,
  },
  heroTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
    lineHeight: 30,
    textTransform: 'uppercase',
  },
  heroStats: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  heroStat: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  heroStatNum: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 32,
  },
  heroStatMeta: {
    ...typography.label,
    color: palette.ash,
    fontSize: 8,
    textAlign: 'center',
  },
  heroStatDivider: {
    backgroundColor: palette.lineSoft,
    height: 40,
    width: 1,
  },

  // Module list
  list: {
    gap: spacing.md,
  },

  // Module card
  moduleCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 0,
  },
  moduleCardActive: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  activeStripe: {
    backgroundColor: palette.black,
    opacity: 0.18,
    width: 4,
  },
  moduleInner: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  moduleInnerFull: {
    paddingLeft: spacing.lg,
  },
  moduleTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moduleNumber: {
    ...typography.mono,
    color: palette.gold,
  },
  moduleNumberActive: {
    color: palette.black,
  },
  moduleTitle: {
    ...typography.title,
    color: palette.ivory,
    fontSize: 18,
  },
  moduleSubtitle: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
  },
  moduleFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  moduleLessons: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 9,
  },
  progressWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    flex: 1,
    height: 2,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: palette.gold,
    height: '100%',
  },
  progressPct: {
    ...typography.mono,
    color: palette.gold,
    fontSize: 9,
  },

  // Premium lock overlay
  premiumOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 15, 15, 0.55)',
    borderRadius: radii.md,
  },
});
