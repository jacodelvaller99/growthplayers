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
  useScreen,
} from '@/components/polaris';
import { POLARIS_MODULES } from '@/data/modules';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useLifeFlow } from '@/hooks/use-lifeflow';

// A module is unlocked when either:
//  - It is the first active module (static status 'active')
//  - All lessons of the previous module have been completed
function isModuleUnlocked(
  modules: typeof POLARIS_MODULES,
  moduleIndex: number,
  completedLessons: string[],
): boolean {
  const mod = modules[moduleIndex];
  if (mod.status === 'coming_soon') return false;
  if (moduleIndex === 0) return true;
  const prev = modules[moduleIndex - 1];
  if (prev.status === 'coming_soon' || prev.lessons.length === 0) return false;
  return prev.lessons.every((l) => completedLessons.includes(l.id));
}

export default function ProgramasScreen() {
  const sc = useScreen();
  const { isDesktop } = useBreakpoint();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useLifeFlow();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const completedLessons = state.completedLessons ?? [];
  const completedCount = POLARIS_MODULES.filter((m) => m.status === 'completed').length;
  const totalLessons = POLARIS_MODULES.reduce((acc, m) => acc + m.lessons.length, 0);
  const overallProgress = totalLessons > 0
    ? Math.round((completedLessons.length / totalLessons) * 100)
    : 0;

  // ── Module card renderer (shared between mobile and desktop) ──────────────
  // Vertical "compass" card: module nº top-left, state indicator top-right,
  // archetype eyebrow + name + "subtitle · N lecciones" + progress at the base.
  const renderModuleCard = (module: typeof POLARIS_MODULES[number], idx: number, wrapStyle?: object) => {
    const isComingSoon = module.status === 'coming_soon';
    const unlocked = isModuleUnlocked(POLARIS_MODULES, idx, completedLessons);
    const isLocked = !unlocked && !isComingSoon;
    const moduleDone = module.lessons.filter((l) => completedLessons.includes(l.id)).length;
    const isAllDone = module.lessons.length > 0 && moduleDone === module.lessons.length;
    const moduleProgress = module.lessons.length > 0
      ? Math.round((moduleDone / module.lessons.length) * 100)
      : 0;
    const effectiveStatus = isAllDone ? 'completed' : unlocked ? 'active' : module.status;
    const isActive = effectiveStatus === 'active';
    const dimmed = isLocked || isComingSoon;
    const lessonsLabel = module.lessons.length === 1 ? '1 lección' : `${module.lessons.length} lecciones`;

    return (
      <View key={module.id} style={wrapStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Modulo ${module.order}: ${module.title}`}
          onPress={() => {
            if (isComingSoon) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              showToast(`Módulo ${module.order} en construcción — completa los anteriores mientras tanto`);
              return;
            }
            if (isLocked) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              const prevModule = POLARIS_MODULES[idx - 1];
              showToast(prevModule ? `Termina "${prevModule.title}" para abrir este` : 'Completa el módulo anterior para desbloquear este');
              return;
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({ pathname: '/module/[id]', params: { id: module.id } });
          }}
          style={({ pressed }) => [pressed && !dimmed && { opacity: 0.82 }]}>
          <PremiumCard style={[styles.moduleCard, isActive && styles.moduleCardActive, dimmed && styles.moduleCardDimmed]}>
            {/* Top row — number + state indicator */}
            <View style={styles.moduleTop}>
              <Text style={[styles.moduleNumber, isActive && styles.moduleNumberActive]}>
                {String(module.order).padStart(2, '0')}
              </Text>
              {isComingSoon ? (
                <View style={styles.soonBadge}>
                  <Text style={styles.soonBadgeText}>PRONTO</Text>
                </View>
              ) : isLocked ? (
                <MaterialIcons name="lock" size={18} color={palette.smoke} />
              ) : isActive ? (
                <View style={styles.liveDot} />
              ) : (
                <MaterialIcons name="check-circle" size={18} color={palette.success} />
              )}
            </View>

            {/* Base — archetype, name, meta, progress */}
            <View style={styles.moduleBase}>
              {module.arquetipo ? (
                <Text style={styles.moduleArq} numberOfLines={1}>EL {module.arquetipo.toUpperCase()}</Text>
              ) : null}
              <Text style={styles.moduleTitle} numberOfLines={2}>{module.title}</Text>
              <Text style={styles.moduleSubtitle} numberOfLines={1}>{module.subtitle} · {lessonsLabel}</Text>
              {isActive && (
                <View style={styles.progressWrap}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${moduleProgress}%` }]} />
                  </View>
                  <Text style={styles.progressPct}>{moduleProgress}%</Text>
                </View>
              )}
            </View>
          </PremiumCard>
        </Pressable>

        {/* Explorar en Skool — for coming_soon or locked modules with a URL */}
        {(isComingSoon || isLocked) && module.skoolUrl && (
          <Pressable
            style={({ pressed }) => [styles.skoolLink, pressed && { opacity: 0.7 }]}
            onPress={() => Linking.openURL(module.skoolUrl!)}>
            <MaterialIcons name="open-in-new" size={12} color={palette.gold} />
            <Text style={styles.skoolLinkText}>Explorar en Skool →</Text>
          </Pressable>
        )}
      </View>
    );
  };

  // ── DESKTOP LAYOUT ────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={styles.root}>
        <ScrollView
          style={sc.root}
          contentContainerStyle={styles.contentDesktop}
          showsVerticalScrollIndicator={false}
          bounces
          overScrollMode="never"
          keyboardShouldPersistTaps="handled">
          <AppHeader title="PROGRAMA" />

          {/* Hero row — left title + stats + progress */}
          <View style={styles.desktopHero}>
            <View style={styles.desktopHeroLeft}>
              <Text style={styles.heroEyebrow}>PROTOCOLO SOBERANO</Text>
              <Text style={styles.heroTitle}>90 DÍAS DE{'\n'}EJECUCIÓN.</Text>
              <StatusPill label="ACTIVO" tone="gold" dot />
            </View>

            <View style={styles.desktopHeroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{completedCount}</Text>
                <Text style={styles.heroStatMeta}>MÓDULOS{'\n'}COMPLETADOS</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{POLARIS_MODULES.length}</Text>
                <Text style={styles.heroStatMeta}>MÓDULOS{'\n'}TOTALES</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{totalLessons}</Text>
                <Text style={styles.heroStatMeta}>LECCIONES{'\n'}EN TOTAL</Text>
              </View>
            </View>

            <View style={styles.desktopHeroProgress}>
              <ProgressCard
                label="Avance total"
                value={`${overallProgress}% · ${completedLessons.length}/${totalLessons} lecciones`}
                progress={overallProgress}
              />
            </View>
          </View>

          {/* Module grid — 2 columns */}
          <GoldDivider label="MÓDULOS" />
          <View style={styles.desktopModuleGrid}>
            {POLARIS_MODULES.map((module, idx) =>
              renderModuleCard(module, idx, styles.desktopModuleItem),
            )}
          </View>
        </ScrollView>

        {/* Toast */}
        {toast && (
          <View style={[styles.toast, { bottom: insets.bottom + 16 }]}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        )}
      </View>
    );
  }

  // ── MOBILE / TABLET LAYOUT ───────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ScrollView
        style={sc.root}
        contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, gap: spacing.xl }]}
        showsVerticalScrollIndicator={false}
        bounces
        overScrollMode="never"
        keyboardShouldPersistTaps="handled">
        {/* ── Header ── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>PROGRAMAS</Text>
          <Text style={styles.pageSub}>Nueve arquetipos. Un camino de soberanía.</Text>
        </View>

        {/* ── Ruta completada ── */}
        <PremiumCard style={styles.routeCard}>
          <MaterialIcons name="workspace-premium" size={20} color={palette.gold} />
          <View style={styles.routeBody}>
            <Text style={styles.routeLabel}>RUTA COMPLETADA</Text>
            <View style={styles.routeTrack}>
              <View style={[styles.routeFill, { width: `${overallProgress}%` }]} />
            </View>
          </View>
          <Text style={styles.routePct}>{overallProgress}%</Text>
        </PremiumCard>

        {/* ── Module grid (2 columns) ── */}
        <View style={styles.grid}>
          {POLARIS_MODULES.map((module, idx) =>
            renderModuleCard(module, idx, styles.gridItem),
          )}
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

  // ── Page header ──
  pageHeader: {
    gap: spacing.sm,
  },
  pageTitle: {
    ...typography.title,
    color: palette.ivory,
    fontSize: 21,
  },
  pageSub: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
  },

  // ── Ruta completada card ──
  routeCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  routeBody: {
    flex: 1,
    gap: spacing.sm,
  },
  routeLabel: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 10,
    letterSpacing: 1,
  },
  routeTrack: {
    backgroundColor: palette.charcoal,
    borderRadius: radii.pill,
    height: 6,
    overflow: 'hidden',
  },
  routeFill: {
    backgroundColor: palette.gold,
    borderRadius: radii.pill,
    height: '100%',
  },
  routePct: {
    color: palette.gold,
    fontFamily: Fonts.display,
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Module grid ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  gridItem: {
    width: '48%',
  },

  // ── Module card (vertical) ──
  moduleCard: {
    justifyContent: 'space-between',
    minHeight: 168,
    overflow: 'hidden',
  },
  moduleCardActive: {
    borderColor: palette.lineGold,
  },
  moduleCardDimmed: {
    opacity: 0.62,
  },
  moduleTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moduleNumber: {
    color: palette.smoke,
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  moduleNumberActive: {
    color: palette.gold,
  },
  liveDot: {
    backgroundColor: palette.success,
    borderRadius: radii.pill,
    height: 7,
    marginTop: 7,
    width: 7,
  },
  soonBadge: {
    borderColor: palette.lineGold,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  soonBadgeText: {
    color: palette.gold,
    fontFamily: Fonts.mono,
    fontSize: 8,
    letterSpacing: 1.5,
  },
  moduleBase: {
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  moduleArq: {
    color: palette.ash,
    fontFamily: Fonts.mono,
    fontSize: 8.5,
    letterSpacing: 1.6,
  },
  moduleTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
    lineHeight: 19,
    textTransform: 'uppercase',
  },
  moduleSubtitle: {
    ...typography.caption,
    color: palette.ash,
    fontSize: 11.5,
  },
  progressWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  progressTrack: {
    backgroundColor: palette.charcoal,
    borderRadius: radii.pill,
    flex: 1,
    height: 4,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: palette.gold,
    borderRadius: radii.pill,
    height: '100%',
  },
  progressPct: {
    color: palette.gold,
    fontFamily: Fonts.mono,
    fontSize: 9,
  },

  // ── Desktop hero (unchanged) ──
  heroEyebrow: {
    ...typography.label,
    color: palette.ash,
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
    fontSize: 11,
    textAlign: 'center',
  },
  heroStatDivider: {
    backgroundColor: palette.lineSoft,
    height: 40,
    width: 1,
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
    fontSize: 11,
    letterSpacing: 0.5,
  },

  // Toast
  toast: {
    alignSelf: 'center',
    backgroundColor: palette.charcoal,
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

  // ── Desktop layout ──────────────────────────────────────────────────────
  contentDesktop: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 60,
    gap: 24,
  },
  desktopHero: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'stretch',
    backgroundColor: palette.graphite,
    borderRadius: 12,
    padding: 24,
  },
  desktopHeroLeft: {
    flex: 2,
    gap: 12,
    justifyContent: 'center',
  },
  desktopHeroStats: {
    flex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  desktopHeroProgress: {
    flex: 2,
    justifyContent: 'center',
  },
  desktopModuleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  desktopModuleItem: {
    width: '48%',
  },
});
