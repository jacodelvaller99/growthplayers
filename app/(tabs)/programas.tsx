import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppHeader,
  GoldDivider,
  PremiumCard,
  ProgressCard,
  StatusPill,
  screen,
} from '@/components/polaris';
import { POLARIS_MODULES } from '@/data/modules';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';

function statusTone(status: string) {
  if (status === 'active') return 'gold' as const;
  if (status === 'completed') return 'success' as const;
  return 'muted' as const;
}

function statusLabel(status: string) {
  if (status === 'completed') return 'COMPLETADO';
  if (status === 'active') return 'ACTIVO';
  if (status === 'coming_soon') return 'PRÓXIMAMENTE';
  return 'BLOQUEADO';
}

export default function ProgramasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const completedCount = POLARIS_MODULES.filter((m) => m.status === 'completed').length;
  const totalLessons = POLARIS_MODULES.reduce((acc, m) => acc + m.lessons.length, 0);

  return (
    <View style={styles.root}>
      <ScrollView
        style={screen.root}
        contentContainerStyle={[screen.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        bounces
        overScrollMode="never"
        keyboardShouldPersistTaps="handled">
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
            const isActive = module.status === 'active';
            const isComingSoon = module.status === 'coming_soon';
            return (
              <View key={module.id}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Modulo ${module.order}: ${module.title}`}
                  onPress={() => {
                    if (isComingSoon) {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      showToast('Este módulo se publica cuando completes el módulo anterior');
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
                          {String(module.order).padStart(2, '0')}
                        </Text>
                        <StatusPill
                          label={statusLabel(module.status)}
                          tone={statusTone(module.status)}
                        />
                      </View>
                      <Text style={styles.moduleTitle}>{module.title}</Text>
                      <Text style={styles.moduleSubtitle}>{module.subtitle}</Text>
                      <View style={styles.moduleFooter}>
                        <Text style={styles.moduleLessons}>
                          {isComingSoon ? 'PRÓXIMAMENTE' : `${module.lessons.length} LECCIONES`}
                        </Text>
                        {!isComingSoon && (
                          <View style={styles.progressWrap}>
                            <View style={styles.progressTrack}>
                              <View style={[styles.progressFill, { width: `${module.progress}%` }]} />
                            </View>
                            <Text style={styles.progressPct}>{module.progress}%</Text>
                          </View>
                        )}
                        <MaterialIcons
                          name={isComingSoon ? 'lock' : 'chevron-right'}
                          size={20}
                          color={isActive ? palette.black : palette.gold}
                        />
                      </View>
                    </View>
                    {/* Coming soon overlay */}
                    {isComingSoon && <View style={styles.comingSoonOverlay} />}
                  </PremiumCard>
                </Pressable>

                {/* Explorar en Skool — only for coming_soon modules with a URL */}
                {isComingSoon && module.skoolUrl && (
                  <Pressable
                    style={({ pressed }) => [styles.skoolLink, pressed && { opacity: 0.7 }]}
                    onPress={() => Linking.openURL(module.skoolUrl!)}>
                    <MaterialIcons name="open-in-new" size={12} color={palette.gold} />
                    <Text style={styles.skoolLinkText}>Explorar en Skool →</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ── Toast ── */}
      {toast && (
        <View style={[styles.toast, { bottom: insets.bottom + 16 }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.black,
  },

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

  // Coming soon overlay
  comingSoonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 15, 15, 0.50)',
    borderRadius: radii.md,
  },

  // Skool link
  skoolLink: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: 4,
    marginTop: -spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  skoolLinkText: {
    ...typography.mono,
    color: palette.gold,
    fontSize: 10,
    letterSpacing: 0.5,
  },

  // Toast
  toast: {
    alignSelf: 'center',
    backgroundColor: '#1E1E1E',
    borderColor: palette.lineSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    bottom: 16,
    elevation: 8,
    maxWidth: '85%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  toastText: {
    ...typography.body,
    color: palette.ivory,
    textAlign: 'center',
  },
});
