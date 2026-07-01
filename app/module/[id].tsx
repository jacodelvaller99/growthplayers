import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppHeader,
  GoldDivider,
  PremiumCard,
  PrimaryButton,
  ProgressCard,
  SecondaryButton,
  StatusPill,
  useScreen,
} from '@/components/polaris';
import { POLARIS_MODULES } from '@/data/modules';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

function lessonIcon(status: string) {
  if (status === 'completed') return 'check-circle' as const;
  if (status === 'active') return 'play-circle-filled' as const;
  return 'lock' as const;
}

function lessonIconColor(status: string) {
  if (status === 'completed') return palette.success;
  // La fila activa tiene fondo gold (lessonRowActive) → el ícono debe ser ink
  // (oscuro), no gold: gold-sobre-gold es invisible. El resto de la fila ya usa ink.
  if (status === 'active') return palette.ink;
  return palette.smoke;
}

function deriveLessonStatus(
  lessonId: string,
  lessonIndex: number,
  allLessons: { id: string; status: string }[],
  completedLessons: string[],
): 'completed' | 'active' | 'locked' {
  if (completedLessons.includes(lessonId)) return 'completed';
  // active if first lesson or previous is completed
  if (lessonIndex === 0) return 'active';
  const prevId = allLessons[lessonIndex - 1].id;
  if (completedLessons.includes(prevId) || allLessons[lessonIndex - 1].status === 'completed') {
    return 'active';
  }
  return 'locked';
}

export default function ModuleDetailScreen() {
  const sc = useScreen();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useLifeFlow();
  const module = POLARIS_MODULES.find((item) => item.id === id) ?? POLARIS_MODULES[0];

  const completedLessons = state.completedLessons ?? [];

  const lessonsWithStatus = module.lessons.map((lesson, idx) => ({
    ...lesson,
    status: deriveLessonStatus(lesson.id, idx, module.lessons, completedLessons),
  }));

  const activeLesson = lessonsWithStatus.find((l) => l.status === 'active') ?? lessonsWithStatus[0];
  const completedCount = lessonsWithStatus.filter((l) => l.status === 'completed').length;
  const dynamicProgress = module.lessons.length > 0
    ? Math.round((completedCount / module.lessons.length) * 100)
    : 0;

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      bounces
      overScrollMode="never"
      keyboardShouldPersistTaps="handled">
      <AppHeader title={`MÓDULO ${String(module.order).padStart(2, '0')}`} />

      {/* ── Module Hero ── */}
      <PremiumCard style={styles.hero}>
        <View style={styles.heroTop}>
          <StatusPill
            label={
              module.status === 'active'
                ? 'ACTIVO'
                : module.status === 'completed'
                  ? 'COMPLETADO'
                  : 'BLOQUEADO'
            }
            tone={
              module.status === 'active'
                ? 'gold'
                : module.status === 'completed'
                  ? 'success'
                  : 'muted'
            }
            dot={module.status === 'active'}
          />
          <Text style={styles.heroNumber}>{String(module.order).padStart(2, '0')}</Text>
        </View>
        <Text style={styles.heroTitle}>{module.title}</Text>
        {module.arquetipo ? (
          <View style={styles.arquetipoRow}>
            <MaterialIcons name="person" size={12} color={palette.goldText} />
            <Text style={styles.arquetipoText}>
              {module.status === 'completed'
                ? `Ya eres el ${module.arquetipo.toUpperCase()}`
                : `Arquetipo: ${module.arquetipo}`}
            </Text>
          </View>
        ) : null}
        <Text style={styles.heroBody}>{module.subtitle}</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{completedCount}</Text>
            <Text style={styles.heroStatLabel}>COMPLETADAS</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{module.lessons.length}</Text>
            <Text style={styles.heroStatLabel}>LECCIONES</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{dynamicProgress}%</Text>
            <Text style={styles.heroStatLabel}>AVANCE</Text>
          </View>
        </View>
      </PremiumCard>

      <ProgressCard
        label="Progreso del modulo"
        value={`${dynamicProgress}%`}
        progress={dynamicProgress}
      />

      {/* ── Lesson List ── */}
      <GoldDivider label="LECCIONES" />
      <View style={styles.lessons}>
        {lessonsWithStatus.map((lesson, index) => {
          const isActive = lesson.status === 'active';
          const isCompleted = lesson.status === 'completed';
          const isNavigable = isActive || isCompleted;
          return (
            <Pressable
              key={lesson.id}
              disabled={!isNavigable}
              accessibilityRole="button"
              accessibilityState={{ disabled: !isNavigable }}
              accessibilityLabel={`Lección ${index + 1}: ${lesson.title}. ${isCompleted ? 'Completada' : isActive ? 'Disponible' : 'Bloqueada'}`}
              onPress={() => router.push(`/lesson/${lesson.id}` as never)}>
              <PremiumCard
                style={[styles.lessonRow, isActive && styles.lessonRowActive]}>
                <View style={styles.lessonIconWrap}>
                  <MaterialIcons
                    name={lessonIcon(lesson.status)}
                    color={lessonIconColor(lesson.status)}
                    size={20}
                  />
                </View>
                <View style={styles.lessonCopy}>
                  <Text style={[styles.lessonIndex, isActive && styles.lessonIndexActive]}>
                    LECCION {String(index + 1).padStart(2, '0')}
                  </Text>
                  <Text style={[styles.lessonTitle, isActive && styles.lessonTitleActive]}>
                    {lesson.title}
                  </Text>
                  <Text style={[styles.lessonMeta, isActive && styles.lessonMetaActive]}>
                    {lesson.duration}
                  </Text>
                </View>
                {isNavigable && (
                  <View style={styles.activeIndicator}>
                    <MaterialIcons
                      name="chevron-right"
                      size={18}
                      color={isActive ? palette.ink : palette.ash}
                    />
                  </View>
                )}
              </PremiumCard>
            </Pressable>
          );
        })}
      </View>

      {completedCount === module.lessons.length ? (
        <View style={styles.completionBanner}>
          <MaterialIcons name="emoji-events" size={20} color={palette.goldText} />
          <View style={styles.completionCopy}>
            <Text style={styles.completionTitle}>MÓDULO COMPLETADO</Text>
            <Text style={styles.completionBody}>
              {module.arquetipo
                ? `Ya eres el ${module.arquetipo.toUpperCase()}. Eso no se puede desaprender.`
                : 'Has absorbido este módulo. Lleva lo aprendido al siguiente nivel.'}
            </Text>
          </View>
        </View>
      ) : (
        <PrimaryButton
          label={`CONTINUAR: ${activeLesson.title.toUpperCase()}`}
          icon="play-arrow"
          onPress={() => router.push(`/lesson/${activeLesson.id}` as never)}
        />
      )}

      {/* Next module anticipation strip */}
      {(() => {
        const currentIdx = POLARIS_MODULES.findIndex((m) => m.id === module.id);
        const nextMod = POLARIS_MODULES[currentIdx + 1] ?? null;
        if (!nextMod || nextMod.status === 'coming_soon') return null;
        return (
          <View style={styles.nextModuleTeaser}>
            <MaterialIcons name="lock" size={12} color={palette.smoke} />
            <View style={styles.nextModuleCopy}>
              <Text style={styles.nextModuleLabel}>SIGUIENTE MÓDULO</Text>
              <Text style={styles.nextModuleTitle}>{nextMod.title}</Text>
            </View>
          </View>
        );
      })()}

      <SecondaryButton label="VOLVER" icon="arrow-back" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Hero
  hero: {
    gap: spacing.lg,
  },
  heroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroNumber: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 13,
  },
  heroTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.5,
    lineHeight: 34,
    textTransform: 'uppercase',
  },
  arquetipoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  arquetipoText: {
    color: palette.goldText,
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  heroBody: {
    ...typography.body,
    color: palette.ash,
  },
  heroStats: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  heroStat: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  heroStatNum: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  heroStatLabel: {
    ...typography.label,
    color: palette.ash,
    fontSize: 7,
    textAlign: 'center',
  },
  heroStatDivider: {
    backgroundColor: palette.lineSoft,
    height: 32,
    width: 1,
  },

  // Lessons
  lessons: {
    gap: spacing.sm,
  },
  lessonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  lessonRowActive: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  lessonIconWrap: {
    alignItems: 'center',
    width: 28,
  },
  lessonCopy: {
    flex: 1,
    gap: 3,
  },
  lessonIndex: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 7,
  },
  lessonIndexActive: {
    color: palette.graphite,
  },
  lessonTitle: {
    ...typography.section,
    color: palette.ivory,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'none',
  },
  lessonTitleActive: {
    color: palette.ink,
  },
  lessonMeta: {
    ...typography.mono,
    color: palette.ash,
  },
  lessonMetaActive: {
    color: palette.graphite,
  },
  activeIndicator: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: radii.sm,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },

  // Next module teaser
  nextModuleTeaser: {
    alignItems: 'center',
    backgroundColor: palette.lineSoft,
    borderColor: palette.lineSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    opacity: 0.6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  nextModuleCopy: {
    flex: 1,
    gap: 2,
  },
  nextModuleLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 7,
    letterSpacing: 2,
  },
  nextModuleTitle: {
    color: palette.ash,
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
  },

  // Module completion banner
  completionBanner: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(201,160,0,0.06)',
    borderColor: palette.gold + '55',
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  completionCopy: {
    flex: 1,
    gap: 4,
  },
  completionTitle: {
    color: palette.goldText,
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  completionBody: {
    ...typography.body,
    color: palette.ivory,
    fontSize: 13,
    lineHeight: 20,
  },
});
