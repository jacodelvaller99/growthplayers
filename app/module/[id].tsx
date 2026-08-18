import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { alpha } from '@/constants/themeColors';
import { useLifeFlow } from '@/hooks/use-lifeflow';

function lessonIcon(status: string) {
  if (status === 'completed') return 'check-circle' as const;
  if (status === 'active') return 'play-circle-filled' as const;
  // Contorno, no candado: está abierta, simplemente no es la que toca ahora.
  return 'play-circle-outline' as const;
}

function lessonIconColor(status: string) {
  if (status === 'completed') return palette.success;
  // La fila activa tiene fondo gold (lessonRowActive) → el ícono debe ser ink
  // (oscuro), no gold: gold-sobre-gold es invisible. El resto de la fila ya usa ink.
  if (status === 'active') return palette.ink;
  return palette.ash;
}

/**
 * Todas las lecciones están abiertas. Antes la N seguía cerrada hasta
 * completar la N-1, así que abrir el catálogo sin tocar esto dejaría al
 * cliente entrando al Módulo 3 para encontrarse seis candados.
 *
 * Pero NO todas salen 'active': el fondo dorado de `lessonRowActive` significa
 * «esta es la tuya ahora», y siete filas doradas es no marcar ninguna. La
 * primera pendiente manda; el resto quedan navegables y sobrias.
 */
function deriveLessonStatus(
  lessonId: string,
  lessonIndex: number,
  allLessons: { id: string; status: string }[],
  completedLessons: string[],
): 'completed' | 'active' | 'available' {
  if (completedLessons.includes(lessonId)) return 'completed';
  const primeraPendiente = allLessons.findIndex((l) => !completedLessons.includes(l.id));
  return lessonIndex === primeraPendiente ? 'active' : 'available';
}

export default function ModuleDetailScreen() {
  const sc = useScreen();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useLifeFlow();
  // Sin `?? POLARIS_MODULES[0]`: un id desconocido —un deep link viejo, un
  // enlace mal copiado— aterrizaba en Onboarding SIN decirlo, y el usuario
  // creía que el módulo que pidió era ese. La pantalla de lección ya resuelve
  // esto con un estado explícito; ésta mentía.
  const module = POLARIS_MODULES.find((item) => item.id === id) ?? null;

  const completedLessons = state.completedLessons ?? [];

  // Después de TODOS los hooks (los cinco están arriba) y antes del primer uso
  // de `module`: así el orden de hooks no cambia entre renders.
  if (!module) {
    return (
      <View style={[sc.root, styles.notFound]}>
        <MaterialIcons name="explore-off" size={28} color={palette.smoke} />
        <Text style={styles.notFoundTitle}>MÓDULO NO ENCONTRADO</Text>
        <Text style={styles.notFoundBody}>
          Ese enlace ya no apunta a ningún módulo del protocolo.
        </Text>
        <SecondaryButton
          label="VER TODOS LOS MÓDULOS"
          icon="arrow-back"
          onPress={() => router.replace('/(tabs)/programas' as never)}
        />
      </View>
    );
  }

  const lessonsWithStatus = module.lessons.map((lesson, idx) => ({
    ...lesson,
    status: deriveLessonStatus(lesson.id, idx, module.lessons, completedLessons),
  }));

  const activeLesson = lessonsWithStatus.find((l) => l.status === 'active') ?? lessonsWithStatus[0];
  const completedCount = lessonsWithStatus.filter((l) => l.status === 'completed').length;
  const dynamicProgress = module.lessons.length > 0
    ? Math.round((completedCount / module.lessons.length) * 100)
    : 0;

  // El módulo que sigue en el catálogo — lo usan el CTA del banner de
  // completado y el teaser (ahora pulsable) del pie.
  const currentModuleIdx = POLARIS_MODULES.findIndex((m) => m.id === module.id);
  const siguiente = POLARIS_MODULES[currentModuleIdx + 1] ?? null;
  const nextModule = siguiente && siguiente.status !== 'coming_soon' ? siguiente : null;

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

      {/* ── Lesson List ──
          Algunos módulos (8, 9, Sesiones Semanales) no tienen lecciones sueltas:
          su contenido vive entero en su classroom de Skool. Antes se renderizaba
          una lista vacía y, como 0 === 0, el banner de abajo felicitaba por
          "MÓDULO COMPLETADO" sin que el usuario hubiera abierto nada. */}
      <GoldDivider label="LECCIONES" />
      {module.lessons.length === 0 ? (
        <PremiumCard style={styles.skoolOnly}>
          <MaterialIcons name="school" size={22} color={palette.goldText} />
          <Text style={styles.skoolOnlyTitle}>CONTENIDO EN EL CLASSROOM</Text>
          <Text style={styles.skoolOnlyBody}>
            Este módulo se trabaja completo en el classroom de Polaris, no por lecciones sueltas.
          </Text>
          {module.skoolUrl ? (
            <PrimaryButton
              label="ABRIR CLASSROOM"
              icon="open-in-new"
              onPress={() => { void Linking.openURL(module.skoolUrl as string); }}
            />
          ) : null}
        </PremiumCard>
      ) : null}
      <View style={styles.lessons}>
        {lessonsWithStatus.map((lesson, index) => {
          const isActive = lesson.status === 'active';
          const isCompleted = lesson.status === 'completed';
          // Todas: ya no hay estado no-navegable en un módulo abierto.
          const isNavigable = true;
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
                  {/* Condicional: NINGUNA lección de `data/modules.ts` trae
                      `duration` (el campo es opcional en el tipo), así que
                      esto pintaba una línea vacía bajo cada uno de los 41
                      títulos. */}
                  {lesson.duration ? (
                    <Text style={[styles.lessonMeta, isActive && styles.lessonMetaActive]}>
                      {lesson.duration}
                    </Text>
                  ) : null}
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

      {module.lessons.length > 0 && completedCount === module.lessons.length ? (
        <>
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
          {/* Terminar un módulo entero era un callejón: el banner no era
              pulsable y la única salida era "VOLVER". Un final es donde MÁS
              hace falta el siguiente paso. */}
          {nextModule ? (
            <PrimaryButton
              label={`SIGUIENTE MÓDULO: ${(nextModule.arquetipo ?? nextModule.title).toUpperCase()}`}
              icon="arrow-forward"
              onPress={() => router.push(`/module/${nextModule.id}` as never)}
            />
          ) : (
            <PrimaryButton
              label="VER TU PROGRESO"
              icon="insights"
              onPress={() => router.push('/(tabs)/progreso' as never)}
            />
          )}
        </>
      ) : activeLesson ? (
        // `activeLesson` sale de `lessonsWithStatus[0]` (:65): en un módulo sin
        // lecciones propias es `undefined`, y esto reventaba con "Cannot read
        // properties of undefined (reading 'title')". Los módulos solo-classroom
        // (8, 9, Sesiones Semanales) son exactamente ese caso. Antes costaba
        // llegar porque la cadena de desbloqueo los dejaba cerrados; ahora que
        // el catálogo abre, se entra directo. No hace falta CTA alternativo:
        // esos módulos ya renderizan "ABRIR CLASSROOM" más arriba (:148-157).
        <PrimaryButton
          label={`CONTINUAR: ${activeLesson.title.toUpperCase()}`}
          icon="play-arrow"
          onPress={() => router.push(`/lesson/${activeLesson.id}` as never)}
        />
      ) : null}

      {/* Next module strip — pulsable, y sin candado: el catálogo está
          abierto a propósito (quien paga entra donde quiera), así que un
          candado aquí mentía y un teaser que no navegaba era un callejón. */}
      {nextModule && (
        <Pressable
          onPress={() => router.push(`/module/${nextModule.id}` as never)}
          accessibilityRole="button"
          accessibilityLabel={`Siguiente módulo: ${nextModule.title}`}
          style={({ pressed }) => [styles.nextModuleTeaser, pressed && { opacity: 0.8 }]}>
          <MaterialIcons name="arrow-forward" size={12} color={palette.smoke} />
          <View style={styles.nextModuleCopy}>
            <Text style={styles.nextModuleLabel}>SIGUIENTE MÓDULO</Text>
            <Text style={styles.nextModuleTitle}>{nextModule.title}</Text>
          </View>
        </Pressable>
      )}

      <SecondaryButton label="VOLVER" icon="arrow-back" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  notFound: {
    alignItems: 'center',
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  notFoundTitle: {
    ...typography.label,
    color: palette.ivoryDim,
  },
  notFoundBody: {
    ...typography.body,
    color: palette.smoke,
    textAlign: 'center',
  },
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

  // Módulos cuyo contenido vive entero en el classroom de Skool
  skoolOnly: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  skoolOnlyTitle: {
    ...typography.section,
    color: palette.ivory,
    textAlign: 'center',
  },
  skoolOnlyBody: {
    ...typography.body,
    color: palette.ash,
    textAlign: 'center',
    lineHeight: 20,
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
    borderColor: alpha(palette.gold, '55'),
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
