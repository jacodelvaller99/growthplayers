import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AppHeader,
  GoldDivider,
  PremiumCard,
  PrimaryButton,
  ProgressCard,
  SecondaryButton,
  StatusPill,
  screen,
} from '@/components/polaris';
import { POLARIS_MODULES } from '@/data/modules';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';

function lessonIcon(status: string) {
  if (status === 'completed') return 'check-circle' as const;
  if (status === 'active') return 'play-circle-filled' as const;
  return 'lock' as const;
}

function lessonIconColor(status: string) {
  if (status === 'completed') return palette.success;
  if (status === 'active') return palette.gold;
  return palette.smoke;
}

export default function ModuleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const module = POLARIS_MODULES.find((item) => item.id === id) ?? POLARIS_MODULES[0];
  const activeLesson = module.lessons.find((lesson) => lesson.status === 'active') ?? module.lessons[0];
  const completedLessons = module.lessons.filter((l) => l.status === 'completed').length;

  return (
    <ScrollView style={screen.root} contentContainerStyle={screen.content}>
      <AppHeader title={`MODULO 0${module.number}`} />

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
          <Text style={styles.heroNumber}>0{module.number}</Text>
        </View>
        <Text style={styles.heroTitle}>{module.title}</Text>
        <Text style={styles.heroBody}>{module.subtitle}</Text>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{completedLessons}</Text>
            <Text style={styles.heroStatLabel}>COMPLETADAS</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{module.lessons.length}</Text>
            <Text style={styles.heroStatLabel}>LECCIONES</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{module.progress}%</Text>
            <Text style={styles.heroStatLabel}>AVANCE</Text>
          </View>
        </View>
      </PremiumCard>

      <ProgressCard
        label="Progreso del modulo"
        value={`${module.progress}%`}
        progress={module.progress}
      />

      {/* ── Lesson List ── */}
      <GoldDivider label="LECCIONES" />
      <View style={styles.lessons}>
        {module.lessons.map((lesson, index) => {
          const isActive = lesson.status === 'active';
          return (
            <PremiumCard
              key={lesson.id}
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
              {isActive && (
                <View style={styles.activeIndicator}>
                  <MaterialIcons name="chevron-right" size={18} color={palette.black} />
                </View>
              )}
            </PremiumCard>
          );
        })}
      </View>

      <PrimaryButton
        label={`CONTINUAR: ${activeLesson.title.toUpperCase()}`}
        icon="play-arrow"
      />
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
    color: palette.gold,
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
    color: palette.black,
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
});
