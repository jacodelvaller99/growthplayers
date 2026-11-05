import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, useScreen } from '@/components/polaris';
import { PolarisLogo } from '@/components/PolarisLogo';
import EmptyState from '@/components/EmptyState';
import { POLARIS_MODULES, arquetipoConArticulo } from '@/data/modules';
import { Fonts, palette, spacing } from '@/constants/theme';
import { alpha } from '@/constants/themeColors';
import { useLifeFlow } from '@/hooks/use-lifeflow';

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
        <EmptyState
          icon="explore-off"
          title="MÓDULO NO ENCONTRADO"
          body="Ese enlace ya no apunta a ningún módulo del protocolo."
          actionLabel="VER TODOS LOS MÓDULOS"
          onAction={() => router.replace('/(tabs)/programas' as never)}
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

  // Misma cuenta que Programa: sin Bienvenida (orden 0) ni las sesiones en vivo.
  const numerados = POLARIS_MODULES.filter((m) => m.order > 0 && !m.id.includes('sesiones')).length;
  const pendientes = module.lessons.length - completedCount;
  const todoHecho = module.lessons.length > 0 && completedCount === module.lessons.length;
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/programas' as never));

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        showsVerticalScrollIndicator={false}>
        {/* ── Cabecera amarilla: el módulo y su avance en marcas ── */}
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <View style={styles.inner}>
            <View style={styles.heroTop}>
              <Pressable onPress={volver} accessibilityRole="button" accessibilityLabel="Volver" hitSlop={8} style={styles.back}>
                <MaterialIcons name="arrow-back" size={22} color={palette.ink} />
              </Pressable>
              <Text style={styles.heroMeta}>
                {module.id.includes('sesiones')
                  ? 'SESIONES EN VIVO'
                  : module.order > 0 ? `MÓDULO ${module.order} DE ${numerados}` : 'PRIMEROS PASOS'}
              </Text>
            </View>
            <PolarisLogo size={56} color={palette.ink} />
            <Text accessibilityRole="header" style={styles.heroTitle}>{`${module.title.replace(': ', ':\n')}.`}</Text>
            {!!module.subtitle && <Text style={styles.heroSub}>{module.subtitle}</Text>}
            {module.lessons.length > 0 && (
              <View
                style={styles.ticks}
                accessible
                accessibilityLabel={`${completedCount} de ${module.lessons.length} lecciones · ${dynamicProgress} %`}>
                {lessonsWithStatus.map((l) => (
                  <View
                    key={l.id}
                    style={[
                      styles.tick,
                      l.status === 'completed' && styles.tickDone,
                      l.status === 'active' && styles.tickNow,
                    ]}
                  />
                ))}
              </View>
            )}
            {/* La acción principal va EN el bloque amarillo: en el teléfono
                quedaba bajo el pliegue, después de las lecciones ya vistas. */}
            {!todoHecho && activeLesson && (
              <Pressable
                onPress={() => router.push(`/lesson/${activeLesson.id}` as never)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.heroBtn, pressed && styles.rowPressed]}>
                <Text style={styles.heroBtnText}>{completedCount === 0 ? 'EMPEZAR' : 'SEGUIR DONDE IBA'}</Text>
                <MaterialIcons name="arrow-forward" size={18} color={palette.goldStatic} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={[styles.inner, styles.body]}>
          {module.lessons.length > 0 && (
            <Text style={styles.arquetipo}>
              {todoHecho
                ? `Terminaste este módulo.${module.arquetipo ? ` Integraste ${arquetipoConArticulo(module.arquetipo)}.` : ''}`
                : `Te faltan ${pendientes} ${pendientes === 1 ? 'lección' : 'lecciones'} para terminar este módulo.`}
            </Text>
          )}

          {module.lessons.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>El contenido de este módulo está en Skool.</Text>
              {module.skoolUrl ? (
                <PrimaryButton
                  label="ABRIR EN SKOOL"
                  icon="open-in-new"
                  onPress={() => Linking.openURL(module.skoolUrl!)}
                />
              ) : null}
            </View>
          ) : (
            <View style={styles.list}>
              {lessonsWithStatus.map((lesson, i) => {
                const isNavigable = true;
                return (
                  <Pressable
                    key={lesson.id}
                    disabled={!isNavigable}
                    onPress={() => router.push(`/lesson/${lesson.id}` as never)}
                    accessibilityRole="link"
                    accessibilityLabel={`Lección ${lesson.order}: ${lesson.title}${lesson.status === 'completed' ? ', completada' : lesson.status === 'active' ? ', la que sigue' : ''}`}
                    style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                      styles.row,
                      i === lessonsWithStatus.length - 1 && styles.rowLast,
                      (pressed || hovered) && styles.rowPressed,
                    ]}>
                    <View style={styles.mark}>
                      {lesson.status === 'completed' ? (
                        <MaterialIcons name="check" size={18} color={palette.ash} />
                      ) : (
                        <View style={[styles.dot, lesson.status === 'active' && styles.dotNow]} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.rowTitle,
                        lesson.status === 'active' && styles.rowTitleNow,
                        lesson.status === 'completed' && styles.rowTitleDone,
                      ]}>
                      {lesson.title}
                    </Text>
                    {!!lesson.duration && <Text style={styles.rowMeta}>{lesson.duration}</Text>}
                    <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.actions}>
            {todoHecho ? (
              <PrimaryButton
                label={nextModule ? `SIGUIENTE: ${nextModule.title.toUpperCase()}` : 'VER MI PROGRESO'}
                icon="arrow-forward"
                onPress={() =>
                  router.push((nextModule ? `/module/${nextModule.id}` : '/(tabs)/progreso') as never)
                }
              />
            ) : null}
            {nextModule && !todoHecho && (
              <Pressable
                onPress={() => router.push(`/module/${nextModule.id}` as never)}
                accessibilityRole="link"
                style={styles.nextLink}>
                <Text style={styles.nextLinkText}>Después: {nextModule.title}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.black },
  notFound: { justifyContent: 'center' },
  inner: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: spacing.lg },

  hero: { backgroundColor: palette.gold, paddingBottom: 28 },
  heroTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: -10, marginBottom: 24,
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heroMeta: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.ink },
  heroTitle: {
    marginTop: 20, fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 34, lineHeight: 36, color: palette.ink,
  },
  heroSub: { marginTop: 10, fontFamily: Fonts.sans, fontSize: 16, lineHeight: 23, color: palette.ink },
  ticks: { flexDirection: 'row', gap: 6, marginTop: 28 },
  // Pendiente: tinta al 55 % (~3,9:1 sobre oro, WCAG 1.4.11). Al 25 % se perdía.
  tick: { flex: 1, height: 6, borderRadius: 999, backgroundColor: alpha(palette.ink, '8C') },
  heroBtn: {
    marginTop: 24, height: 52, borderRadius: 10, backgroundColor: palette.ink,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  heroBtnText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 14, letterSpacing: 1, color: palette.goldStatic },
  tickDone: { backgroundColor: palette.ink },
  tickNow: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: palette.ink },

  body: { paddingTop: 28 },
  arquetipo: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24, color: palette.ash, marginBottom: 20 },

  list: {},
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: palette.line,
  },
  rowLast: { borderBottomWidth: 1, borderBottomColor: palette.line },
  rowPressed: { opacity: 0.7 },
  mark: { width: 22, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 999, borderWidth: 1.5, borderColor: palette.smoke },
  dotNow: { backgroundColor: palette.gold, borderColor: palette.gold },
  rowTitle: { flex: 1, fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, color: palette.ivory },
  rowTitleNow: { fontWeight: '600' },
  rowTitleDone: { color: palette.ash },
  rowMeta: { fontFamily: Fonts.sans, fontSize: 14, color: palette.smoke },

  empty: { gap: spacing.lg },
  emptyText: { fontFamily: Fonts.sans, fontSize: 17, lineHeight: 26, color: palette.ash },

  actions: { marginTop: 32, gap: spacing.xs },
  nextLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  nextLinkText: { fontFamily: Fonts.sans, fontSize: 15, color: palette.smoke },
});
