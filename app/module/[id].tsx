import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppHeader, PremiumCard, PrimaryButton, ProgressCard, SecondaryButton, StatusPill, screen } from '@/components/polaris';
import { POLARIS_MODULES } from '@/data/modules';
import { palette, spacing, typography } from '@/constants/theme';

export default function ModuleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const module = POLARIS_MODULES.find((item) => item.id === id) ?? POLARIS_MODULES[0];
  const activeLesson = module.lessons.find((lesson) => lesson.status === 'active') ?? module.lessons[0];

  return (
    <ScrollView style={screen.root} contentContainerStyle={screen.content}>
      <AppHeader title={`MODULO 0${module.number}`} />
      <PremiumCard style={styles.hero}>
        <StatusPill label={module.status === 'active' ? 'ACTIVO' : module.status === 'completed' ? 'COMPLETADO' : 'BLOQUEADO'} />
        <Text style={styles.title}>{module.title}</Text>
        <Text style={styles.body}>{module.subtitle}</Text>
      </PremiumCard>
      <ProgressCard label="Progreso del modulo" value={`${module.progress}%`} progress={module.progress} />

      <View style={styles.lessons}>
        <Text style={screen.sectionTitle}>LECCIONES</Text>
        {module.lessons.map((lesson) => (
          <PremiumCard key={lesson.id} style={styles.lessonRow}>
            <MaterialIcons
              name={lesson.status === 'completed' ? 'check' : lesson.status === 'active' ? 'play-arrow' : 'lock'}
              color={lesson.status === 'locked' ? palette.smoke : palette.gold}
              size={20}
            />
            <View style={styles.lessonCopy}>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              <Text style={styles.lessonMeta}>{lesson.duration}</Text>
            </View>
            <StatusPill label={lesson.status.toUpperCase()} tone={lesson.status === 'locked' ? 'muted' : 'gold'} />
          </PremiumCard>
        ))}
      </View>

      <PrimaryButton label={`CONTINUAR LECCION: ${activeLesson.title}`} icon="play-arrow" />
      <SecondaryButton label="VOLVER" icon="arrow-back" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.lg,
  },
  title: {
    ...typography.hero,
    color: palette.ivory,
  },
  body: {
    ...typography.body,
    color: palette.ash,
  },
  lessons: {
    gap: spacing.md,
  },
  lessonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  lessonCopy: {
    flex: 1,
  },
  lessonTitle: {
    ...typography.section,
    color: palette.ivory,
  },
  lessonMeta: {
    ...typography.mono,
    color: palette.ash,
  },
});
