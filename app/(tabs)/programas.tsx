import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { POLARIS_MODULES, arquetipoConArticulo } from '@/data/modules';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { alpha } from '@/constants/themeColors';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { modulosNumerados } from '@/lib/modulosCuenta';
import { Pantalla, TarjetaOro } from '@/components/pantalla';
import { PolarisLogo } from '@/components/PolarisLogo';

/**
 * El catálogo está ABIERTO. Quien paga, entra donde quiera.
 *
 * Antes: cada módulo exigía tener completadas TODAS las lecciones del
 * anterior. Un cliente recién llegado veía únicamente Onboarding, y para
 * alcanzar el Módulo 1 tenía que marcar sus 7 lecciones; para el 2, las 7 del
 * 1; y así hasta 41. El programa entero detrás de una cadena.
 *
 * Y había un defecto encima: el comentario de esta función prometía que un
 * módulo con `status: 'active'` estaba abierto, y el código NUNCA leía ese
 * campo. Los módulos 5, 6, 7, 8, 9 y Sesiones Semanales están marcados
 * 'active' en `data/modules.ts` —alguien los abrió a propósito— y seguían
 * cerrados igual. Marcar un módulo como abierto no hacía absolutamente nada.
 *
 * `coming_soon` sigue cerrando, y eso no es una excepción al principio: esos
 * módulos no tienen contenido detrás. Abrirlos sería prometer una pantalla
 * vacía, que es peor que un candado honesto. Hoy no hay ninguno en el
 * catálogo — el guard existe para cuando se añada uno.
 */
export function isModuleUnlocked(
  modules: typeof POLARIS_MODULES,
  moduleIndex: number,
  _completedLessons: string[],
): boolean {
  // exportada para test — ver __tests__/unit/programasScreen.test.tsx
  return modules[moduleIndex].status !== 'coming_soon';
}

// "Por qué importa" — el peso del módulo en el camino, no su contenido literal.
// Mantiene al usuario dentro del producto en vez de mandarlo a Skool.
function moduleStakes(module: typeof POLARIS_MODULES[number]): string {
  return module.subtitle
    ? `${module.subtitle}. Cuando llegues aquí, ya tendrás la base de los módulos anteriores.`
    : 'Cuando llegues aquí, ya tendrás la base de los módulos anteriores.';
}

export default function ProgramasScreen() {
  const router = useRouter();
  const { state } = useLifeFlow();
  // Teaser in-app: módulo seleccionado para "Ver qué incluye" (no saca a Skool).
  const [teaser, setTeaser] = useState<typeof POLARIS_MODULES[number] | null>(null);


  const completedLessons = state.completedLessons ?? [];
  const totalLessons = POLARIS_MODULES.reduce((acc, m) => acc + m.lessons.length, 0);
  const overallProgress = totalLessons > 0
    ? Math.round((completedLessons.length / totalLessons) * 100)
    : 0;

  // ── Agrupación para lentes ACTIVO/COMPLETADOS/POR VENIR ────────────────────
  // Duplica el mismo cálculo que ya vive dentro de renderModuleCard (isAllDone/
  // isLocked) — a propósito: mover esa lógica afuera para compartirla habría
  // sido tocar un renderer que ya funciona por un beneficio que un `useMemo`
  // de 6 líneas ya da sin el riesgo.
  type ModuleGroup = 'activo' | 'completado' | 'porvenir';
  const moduleGroup = (module: typeof POLARIS_MODULES[number], idx: number): ModuleGroup => {
    const isComingSoon = module.status === 'coming_soon';
    const unlocked = isModuleUnlocked(POLARIS_MODULES, idx, completedLessons);
    const isLocked = !unlocked && !isComingSoon;
    const moduleDone = module.lessons.filter((l) => completedLessons.includes(l.id)).length;
    const isAllDone = module.lessons.length > 0 && moduleDone === module.lessons.length;
    if (isAllDone) return 'completado';
    if (isLocked || isComingSoon) return 'porvenir';
    return 'activo';
  };
  const groupedModules: Record<ModuleGroup, [typeof POLARIS_MODULES[number], number][]> = {
    activo: [], completado: [], porvenir: [],
  };
  POLARIS_MODULES.forEach((m, i) => groupedModules[moduleGroup(m, i)].push([m, i]));


  // ── Teaser IN-APP — "qué viene + por qué importa" (sin sacar a Skool) ──────
  const teaserModal = (
    <Modal
      visible={!!teaser}
      transparent
      animationType="fade"
      onRequestClose={() => setTeaser(null)}>
      <Pressable style={styles.teaserOverlay} onPress={() => setTeaser(null)}>
        <Pressable style={styles.teaserCard} onPress={(e) => e.stopPropagation()}>
          {teaser && (
            <>
              <View style={styles.teaserHeadRow}>
                <Text style={styles.teaserEyebrow}>
                  {teaser.status === 'coming_soon' ? 'PRÓXIMAMENTE' : 'AÚN BLOQUEADO'} · MÓDULO {String(teaser.order).padStart(2, '0')}
                </Text>
                <Pressable
                  onPress={() => setTeaser(null)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar">
                  <MaterialIcons name="close" size={20} color={palette.smoke} />
                </Pressable>
              </View>

              {teaser.arquetipo ? (
                <Text style={styles.teaserArq}>{arquetipoConArticulo(teaser.arquetipo).toUpperCase()}</Text>
              ) : null}
              <Text style={styles.teaserTitle}>{teaser.title}</Text>
              <Text style={styles.teaserSub}>{teaser.subtitle}</Text>

              {/* Por qué importa */}
              <View style={styles.teaserStakesBox}>
                <Text style={styles.teaserStakesLabel}>POR QUÉ IMPORTA</Text>
                <Text style={styles.teaserStakesText}>{moduleStakes(teaser)}</Text>
              </View>

              {/* Qué viene — lecciones del módulo */}
              {teaser.lessons.length > 0 ? (
                <View style={styles.teaserLessons}>
                  <Text style={styles.teaserStakesLabel}>QUÉ VIENE</Text>
                  {teaser.lessons.map((l, i) => (
                    <View key={l.id} style={styles.teaserLessonRow}>
                      <Text style={styles.teaserLessonNum}>{String(i + 1).padStart(2, '0')}</Text>
                      <Text style={styles.teaserLessonTitle} numberOfLines={2}>{l.title}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.teaserStakesText}>
                  Las lecciones de este módulo se revelan cuando llegues aquí. Mantén el ritmo.
                </Text>
              )}

              <Pressable
                style={({ pressed }) => [styles.teaserDismiss, pressed && { opacity: 0.85 }]}
                onPress={() => setTeaser(null)}
                accessibilityRole="button"
                accessibilityLabel="Seguir en mi módulo actual">
                <Text style={styles.teaserDismissText}>SEGUIR EN MI MÓDULO ACTUAL</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );

  // ── DESKTOP LAYOUT ────────────────────────────────────────────────────────
  // ── PROGRAMA (rediseño) ────────────────────────────────────────────────────
  // Dónde estás, una sola acción para seguir, y el camino completo debajo.
  // "Aquí" = el primer módulo (en orden) con lecciones aún sin terminar.
  const conLecciones = POLARIS_MODULES.filter((m) => m.lessons.length > 0);
  const hechas = (m: typeof POLARIS_MODULES[number]) =>
    m.lessons.filter((l) => completedLessons.includes(l.id)).length;
  const aqui = conLecciones.find((m) => hechas(m) < m.lessons.length) ?? conLecciones[conLecciones.length - 1];
  const siguienteLeccion = aqui?.lessons.find((l) => !completedLessons.includes(l.id)) ?? aqui?.lessons[0];
  // Una sola cuenta en toda la app: sin Bienvenida (orden 0) ni las sesiones
  // en vivo — «Módulo 1 de 11» con Onboarding listado antes confundía.
  const numerados = modulosNumerados();
  const posicion = aqui && siguienteLeccion ? aqui.lessons.indexOf(siguienteLeccion) + 1 : 0;
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/yo' as never));

  const abrir = (module: typeof POLARIS_MODULES[number], idx: number) => {
    const isComingSoon = module.status === 'coming_soon';
    if (isComingSoon || !isModuleUnlocked(POLARIS_MODULES, idx, completedLessons)) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setTeaser(module);
      return;
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/module/[id]', params: { id: module.id } } as never);
  };

  return (
    <View style={styles.root}>
      <Pantalla
        onBack={volver}
        meta="TU PROGRAMA · 90 DÍAS"
        metaRight={aqui && numerados.includes(aqui) ? `MÓDULO ${aqui.order} DE ${numerados.length}` : `${overallProgress} % HECHO`}
        title={aqui ? `${(aqui.order === 0 ? 'Bienvenida' : aqui.title).replace(': ', ':\n')}.` : 'Tu programa.'}
        sub={aqui?.subtitle}
        hero={siguienteLeccion ? (
          <TarjetaOro
            meta={hechas(aqui!) === 0 ? 'EMPIEZA AQUÍ' : 'SEGUIR'}
            metaRight={`LECCIÓN ${posicion} DE ${aqui!.lessons.length}`}
            title={siguienteLeccion.title}
            onPress={() => router.push(`/lesson/${siguienteLeccion.id}` as never)}
          />
        ) : undefined}>
        <View style={styles.track} accessibilityLabel={`Programa completo al ${overallProgress} %`}>
          <View style={[styles.trackFill, { width: `${Math.max(overallProgress, 2)}%` }]} />
        </View>
        <Text style={styles.trackText}>{overallProgress} % del programa · {completedLessons.length} de {totalLessons} lecciones</Text>

        <View style={styles.route}>
          <View style={styles.routeLine} />
          {POLARIS_MODULES.map((m, idx) => {
            const total = m.lessons.length;
            const done = hechas(m);
            const completo = total > 0 && done === total;
            const esAqui = m.id === aqui?.id;
            const pronto = m.status === 'coming_soon';
            const titulo = m.order === 0 ? 'Bienvenida' : m.title;
            const estado = completo
              ? 'Terminado'
              : esAqui
                ? `Vas en la ${posicion} de ${total}`
                : pronto
                  ? 'Pronto'
                  : total > 0
                    ? `${total} lecciones`
                    : 'Se abre en Skool ↗';
            return (
              <Pressable
                key={m.id}
                onPress={() => abrir(m, idx)}
                accessibilityRole="link"
                accessibilityLabel={`${titulo}. ${estado}`}
                style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                  styles.routeRow,
                  (pressed || hovered) && styles.routeRowPressed,
                ]}>
                <View style={styles.routeMark}>
                  {esAqui ? (
                    <PolarisLogo size={22} color={palette.gold} />
                  ) : (
                    <View style={[styles.dot, completo && styles.dotDone]} />
                  )}
                </View>
                <View style={styles.routeText}>
                  <Text style={[styles.routeTitle, esAqui && styles.routeTitleNow, completo && styles.routeTitleDone]}>
                    {titulo}
                  </Text>
                  <Text style={[styles.routeState, esAqui && styles.routeStateNow]}>{estado}</Text>
                </View>
                {!pronto && <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />}
              </Pressable>
            );
          })}
        </View>
      </Pantalla>


      {teaserModal}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Rediseño ──
  track: { height: 4, borderRadius: 999, backgroundColor: palette.line, overflow: 'hidden' },
  trackFill: { height: 4, borderRadius: 999, backgroundColor: palette.gold },
  trackText: { marginTop: 12, fontFamily: Fonts.sans, fontSize: 15, color: palette.ash },
  route: { marginTop: 32, position: 'relative' },
  routeLine: { position: 'absolute', left: 10, top: 20, bottom: 20, width: 1, backgroundColor: palette.line },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 18, minHeight: 64, paddingVertical: 10 },
  routeRowPressed: { opacity: 0.7 },
  routeMark: { width: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.black },
  dot: { width: 10, height: 10, borderRadius: 999, borderWidth: 1.5, borderColor: palette.smoke, backgroundColor: palette.black },
  dotDone: { backgroundColor: palette.ivory, borderColor: palette.ivory },
  routeText: { flex: 1, gap: 2 },
  routeTitle: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, color: palette.ivory },
  routeTitleNow: { fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 18, lineHeight: 24 },
  routeTitleDone: { color: palette.ash },
  routeState: { fontFamily: Fonts.sans, fontSize: 13, color: palette.smoke },
  routeStateNow: { color: palette.goldText },
  root: {
    flex: 1,
    backgroundColor: palette.black,
  },









  // Teaser modal
  teaserOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.88)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  teaserCard: {
    backgroundColor: palette.graphite,
    borderColor: palette.lineSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    maxWidth: 420,
    padding: spacing.xl,
    width: '100%',
  },
  teaserHeadRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  teaserEyebrow: {
    color: palette.goldText,
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 1.6,
  },
  teaserArq: {
    color: palette.ash,
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 2,
    marginTop: spacing.xs,
  },
  teaserTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 25,
    textTransform: 'uppercase',
  },
  teaserSub: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
  },
  teaserStakesBox: {
    borderColor: palette.lineSoft,
    borderLeftColor: palette.gold,
    borderLeftWidth: 2,
    borderRadius: 4,
    borderWidth: 1,
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  teaserStakesLabel: {
    color: palette.goldText,
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 2,
  },
  teaserStakesText: {
    color: palette.ivory,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 20,
  },
  teaserLessons: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  teaserLessonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  teaserLessonNum: {
    color: palette.smoke,
    fontFamily: Fonts.display,
    fontSize: 11,
    width: 22,
  },
  teaserLessonTitle: {
    color: palette.ash,
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  teaserDismiss: {
    alignItems: 'center',
    borderColor: alpha(palette.gold, '66'),
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  teaserDismissText: {
    color: palette.goldText,
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 1.5,
  },


});
