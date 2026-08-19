/**
 * Focus Deck — las piezas de COMPOSICIÓN, no de color.
 *
 * El sistema de tema resolvió cómo se pinta la app. Esto resuelve cómo se
 * ORDENA, que era el hueco real: las pantallas apilaban seis, diez, diecisiete
 * secciones y obligaban a recorrerlas todas para encontrar la única que
 * importaba hoy.
 *
 * Tres reglas, tomadas del concepto aprobado:
 *
 *   1. UN HÉROE, UNA DECISIÓN. Arriba se ve el estado de un vistazo y UNA sola
 *      acción. No cuatro CTAs compitiendo.
 *   2. TRES NÚMEROS COMO MUCHO. Si hay un cuarto dato, no cabe en el resumen:
 *      vive dentro de su lente.
 *   3. LENTES EN VEZ DE PILA. Seis secciones apiladas se convierten en un
 *      módulo con pestañas. El lector ELIGE por dónde mirar en vez de bajar por
 *      todo. Esta es la que de verdad baja la densidad.
 *
 * Todo sale de los tokens, así que sigue los dos ejes de color sin tocar nada.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { alpha } from '@/constants/themeColors';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';

// ─── 1 · Héroe ────────────────────────────────────────────────────────────────

export type DirectiveProps = {
  /** Qué hacer. Corto, imperativo, en voz de la marca. */
  title: string;
  /** Por qué hoy y no otro día. Es lo que convierte una orden en un consejo. */
  reason: string;
  onPress: () => void;
};

/**
 * La ÚNICA acción del héroe. Si una pantalla necesita dos, es que no ha decidido
 * cuál importa — y esa decisión es del diseño, no del usuario.
 */
export function Directive({ title, reason, onPress }: DirectiveProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${reason}`}
      style={({ pressed }) => [s.directive, pressed && { opacity: 0.85 }]}>
      <View style={s.directiveMark} />
      <View style={s.directiveCopy}>
        <Text style={s.directiveTitle}>{title}</Text>
        <Text style={s.directiveReason}>{reason}</Text>
      </View>
      <View style={s.directiveGo}>
        <MaterialIcons name="arrow-forward" size={20} color={palette.ink} />
      </View>
    </Pressable>
  );
}

export type FocusHeroProps = {
  /** Contexto breve sobre el titular: acto, día, momento. */
  eyebrow: string;
  /**
   * La frase. Va en peso LIGERO y caja baja a propósito: es una lectura, no un
   * rótulo. El titular pesado en mayúsculas grita, y aquí el tono es de alguien
   * que te está contando algo.
   */
  statement: string;
  /** Dato grande de un vistazo (score, racha, minutos). Opcional. */
  metric?: { value: string; caption: string };
  directive?: DirectiveProps;
};

export function FocusHero({ eyebrow, statement, metric, directive }: FocusHeroProps) {
  return (
    <View style={s.hero}>
      <View style={s.heroTop}>
        {metric && (
          <View style={s.metricWrap}>
            <Text style={s.metricValue}>{metric.value}</Text>
            <Text style={s.metricCaption}>{metric.caption}</Text>
          </View>
        )}
        <View style={s.heroCopy}>
          <Text style={s.eyebrow}>{eyebrow}</Text>
          <Text style={s.statement}>{statement}</Text>
        </View>
      </View>
      {directive && <Directive {...directive} />}
    </View>
  );
}

// ─── 2 · Tres números ─────────────────────────────────────────────────────────

export type Stat = { name: string; value: string; tone?: 'normal' | 'warn' | 'good' };

/**
 * El resumen. Corta en TRES a propósito — no es una limitación técnica: un
 * cuarto número convierte el vistazo en una lectura, y entonces ya no es un
 * resumen. Lo que sobra pertenece a una lente.
 */
export function StatStack({ stats }: { stats: Stat[] }) {
  return (
    <View style={s.statStack}>
      {stats.slice(0, 3).map((st) => (
        <View key={st.name} style={s.statCard}>
          <Text style={s.statName}>{st.name}</Text>
          <Text
            style={[
              s.statValue,
              st.tone === 'warn' && { color: palette.warning },
              st.tone === 'good' && { color: palette.success },
            ]}>
            {st.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── 3 · Lentes ───────────────────────────────────────────────────────────────

export type Lens = { id: string; label: string; render: () => ReactNode };

/**
 * Sustituye una pila de secciones. El coste de una pestaña es que oculta; el
 * beneficio es que la pantalla deja de pedir que la recorras entera. Con seis
 * secciones o más, el beneficio gana siempre.
 *
 * Las pestañas hacen scroll horizontal en vez de encogerse: cuatro etiquetas en
 * 390px repartidas a partes iguales dejan cada una en ~85px, y en una
 * tipografía extended eso parte palabras.
 */
export function LensTabs({ lenses, initial }: { lenses: Lens[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? lenses[0]?.id);
  const current = lenses.find((l) => l.id === active) ?? lenses[0];

  return (
    <View style={s.module}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabs}
        accessibilityRole="tablist">
        {lenses.map((l) => {
          const on = l.id === current?.id;
          return (
            <Pressable
              key={l.id}
              onPress={() => setActive(l.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={l.label}
              style={({ pressed }) => [s.tab, on && s.tabOn, pressed && { opacity: 0.8 }]}>
              <Text style={[s.tabText, on && s.tabTextOn]}>{l.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={s.panel}>{current?.render()}</View>
    </View>
  );
}

/** Fila de destino dentro de una lente. Sustituye al mosaico de iconos. */
export function LensRow({
  icon, label, sub, onPress, badge,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  sub: string;
  onPress: () => void;
  badge?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${sub}`}
      style={({ pressed }) => [s.row, pressed && { opacity: 0.8 }]}>
      <View style={s.rowIcon}>
        <MaterialIcons name={icon} size={20} color={palette.goldText} />
      </View>
      <View style={s.rowCopy}>
        <Text style={s.rowLabel}>{label}</Text>
        <Text style={s.rowSub}>{sub}</Text>
      </View>
      {badge ? <Text style={s.rowBadge}>{badge}</Text> : null}
      <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  // Héroe
  hero: {
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.lineGold,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  metricWrap: { alignItems: 'center', minWidth: 86 },
  metricValue: {
    fontFamily: Fonts.mono,
    fontSize: 38,
    fontWeight: '700',
    color: palette.goldText,
    fontVariant: ['tabular-nums'],
  },
  metricCaption: { ...typography.caption, color: palette.smoke, fontSize: 10, letterSpacing: 1 },
  heroCopy: { flex: 1, gap: 8, minWidth: 0 },
  eyebrow: {
    fontFamily: Fonts.display,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: palette.goldText,
    textTransform: 'uppercase',
  },
  // Peso 300 y caja baja: es una lectura, no un rótulo.
  statement: { ...typography.body, fontWeight: '300', fontSize: 19, lineHeight: 27, color: palette.ivory },

  // Directiva
  directive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.graphiteLight,
    borderWidth: 1,
    borderColor: palette.lineHard,
    borderRadius: radii.md,
    padding: spacing.md,
    minHeight: 44,
  },
  directiveMark: { width: 3, alignSelf: 'stretch', backgroundColor: palette.gold, borderRadius: 2 },
  directiveCopy: { flex: 1, gap: 3, minWidth: 0 },
  directiveTitle: { ...typography.section, color: palette.ivory, fontSize: 12 },
  directiveReason: { ...typography.caption, color: palette.ash, fontSize: 12, lineHeight: 17 },
  directiveGo: {
    width: 40, height: 40, borderRadius: radii.sm,
    backgroundColor: palette.gold, alignItems: 'center', justifyContent: 'center',
  },

  // Números
  statStack: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1, minWidth: 0,
    backgroundColor: palette.graphite,
    borderWidth: 1, borderColor: palette.line, borderRadius: radii.md,
    padding: spacing.md, gap: 4,
  },
  statName: { ...typography.caption, color: palette.smoke, fontSize: 10, letterSpacing: 1 },
  statValue: {
    fontFamily: Fonts.mono, fontSize: 17, fontWeight: '700',
    color: palette.ivory, fontVariant: ['tabular-nums'],
  },

  // Lentes
  module: {
    backgroundColor: palette.graphite,
    borderWidth: 1, borderColor: palette.line, borderRadius: radii.lg,
    overflow: 'hidden',
  },
  tabs: { flexDirection: 'row', gap: spacing.xs, padding: spacing.sm },
  tab: {
    paddingHorizontal: spacing.md, minHeight: 44, justifyContent: 'center',
    borderRadius: 999, borderWidth: 1, borderColor: 'transparent',
  },
  tabOn: { backgroundColor: palette.goldLight, borderColor: palette.lineGold },
  tabText: { ...typography.label, color: palette.smoke, fontSize: 10, letterSpacing: 1.4 },
  tabTextOn: { color: palette.goldText },
  panel: { padding: spacing.md, paddingTop: 0, gap: spacing.xs },

  // Filas
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    minHeight: 56, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: radii.sm,
    backgroundColor: alpha(palette.gold, '1A'),
    alignItems: 'center', justifyContent: 'center',
  },
  rowCopy: { flex: 1, gap: 2, minWidth: 0 },
  rowLabel: { ...typography.section, color: palette.ivory, fontSize: 12 },
  rowSub: { ...typography.caption, color: palette.smoke, fontSize: 11 },
  rowBadge: { ...typography.caption, color: palette.goldText, fontSize: 11, fontFamily: Fonts.mono },
});
