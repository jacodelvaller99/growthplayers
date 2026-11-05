/**
 * Gramática de pantalla del rediseño (canvas "Polaris — rediseño de la app").
 *
 * Cada pantalla dice lo mismo en el mismo orden: dónde estás (meta), qué
 * importa ahora (titular + una frase), UNA acción grande (TarjetaOro) y, a lo
 * sumo, unas filas para lo demás. Sin tarjetas apiladas, sin etiquetas sobre
 * cada bloque. Los colores salen de `palette` (cambian solos en claro/oscuro).
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useSegments } from 'expo-router';

import { PolarisLogo } from '@/components/PolarisLogo';
import { Fonts, palette, spacing } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

type PantallaProps = {
  meta: string;
  metaRight?: string;
  title: string;
  sub?: string;
  /** La acción principal. En escritorio va a la derecha del titular. */
  hero?: ReactNode;
  children?: ReactNode;
  /** Algo pequeño bajo todo (p.ej. el interruptor del staff). */
  footer?: ReactNode;
  /**
   * Flecha de volver. Por defecto aparece sola en toda pantalla que NO es una
   * de las 4 pestañas (Hoy, Norman, Progreso, Yo); `false` la oculta.
   */
  onBack?: (() => void) | false;
};

// Los tests de pantalla mockean expo-router a medias: si falta un hook, no hay flecha.
const useRouterSeguro: () => ReturnType<typeof useRouter> | null =
  typeof useRouter === 'function' ? useRouter : () => null;
const useSegmentsSeguro: () => string[] =
  typeof useSegments === 'function' ? (useSegments as () => string[]) : () => [];

/** Alto del botón flotante de Norman (48) + su margen (16) + aire (32). */
const FAB_CLEARANCE = 96;

export function Pantalla({ meta, metaRight, title, sub, hero, children, footer, onBack }: PantallaProps) {
  const insets = useSafeAreaInsets();
  const { isDesktop } = useBreakpoint();
  const reduced = useReducedMotion();
  const router = useRouterSeguro();
  const segments = useSegmentsSeguro() as string[];
  const esPestana = segments[0] === '(tabs)' && ['comando', 'mentor', 'progreso', 'yo'].includes(segments[1] ?? '');
  // Sin historial (enlace directo, PWA recién abierta) `back()` no hace nada:
  // se cae al lugar natural de donde se viene.
  const volverPorDefecto = () => {
    if (!router) return;
    if (router.canGoBack?.()) router.back();
    else router.replace((segments[0] === 'bienestar' && segments.length > 1 ? '/bienestar' : '/(tabs)/yo') as never);
  };
  const back = onBack === false ? null : onBack ?? (esPestana || !router ? null : volverPorDefecto);
  // GrandisExtended es ancha: una palabra de 10+ letras a 64 px no cabe en la
  // columna del titular y se partía (Mentoría, Suplementos). Se baja un escalón.
  const longest = Math.max(...title.split(/\s+/).map((w) => w.length));
  const size = isDesktop ? (longest > 9 ? 52 : 64) : (longest > 10 ? 34 : 40);

  const head = (
    // Sin tarjeta a la derecha el titular toma todo el ancho: con 420 fijo,
    // «Suplementos» a 64 px se partía en dos.
    <View style={isDesktop ? (hero ? s.headDesk : s.headDeskFull) : undefined}>
      <Text accessibilityRole="header" style={[s.title, { fontSize: size, lineHeight: Math.round(size * 1.04) }]}>
        {title}
      </Text>
      {!!sub && <Text style={[s.sub, isDesktop && s.subDesk]}>{sub}</Text>}
    </View>
  );

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[
        s.content,
        isDesktop
          ? s.contentDesk
          : { paddingTop: insets.top + 24, paddingBottom: insets.bottom + FAB_CLEARANCE },
      ]}
      showsVerticalScrollIndicator={false}>
      <Animated.View entering={reduced ? undefined : FadeIn.duration(240)} style={s.inner}>
        {!!back && (
          <Pressable
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            hitSlop={8}
            style={s.back}>
            <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
          </Pressable>
        )}
        <View style={s.metaRow}>
          <Text style={s.meta}>{meta}</Text>
          {!!metaRight && <Text style={s.meta}>{metaRight}</Text>}
        </View>

        {isDesktop ? (
          <View style={s.deskTop}>
            {head}
            {!!hero && <View style={s.heroDesk}>{hero}</View>}
          </View>
        ) : (
          <>
            {head}
            {!!hero && <View style={s.heroMob}>{hero}</View>}
          </>
        )}

        {!!children && <View style={[s.rows, isDesktop && s.rowsDesk]}>{children}</View>}
        {!!footer && <View style={s.footer}>{footer}</View>}
      </Animated.View>
    </ScrollView>
  );
}

/** La única acción grande de la pantalla: bloque amarillo plano con la estrella. */
export function TarjetaOro({
  meta, metaRight, title, detail, onPress, accessibilityLabel,
}: {
  meta: string;
  metaRight?: string;
  title: string;
  detail?: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const { isDesktop } = useBreakpoint();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title.replace(/\n/g, ' ')}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        s.oro,
        isDesktop && s.oroDesk,
        (pressed || hovered) && s.oroPressed,
      ]}>
      <View style={s.oroMeta}>
        <Text style={s.oroMetaText}>{meta}</Text>
        {!!metaRight && <Text style={s.oroMetaText}>{metaRight}</Text>}
      </View>
      <View style={s.oroBottom}>
        <View style={s.oroText}>
          <Text style={[s.oroTitle, isDesktop && s.oroTitleDesk]}>{title}</Text>
          {!!detail && <Text style={s.oroDetail} numberOfLines={3}>{detail}</Text>}
        </View>
        <PolarisLogo size={isDesktop ? 88 : 56} color={palette.ink} />
      </View>
    </Pressable>
  );
}

/** Fila etiqueta → valor, separada por líneas. Con `onPress` se vuelve un enlace. */
export function Fila({
  label, value, onPress, tone, last,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  /** `warn`: algo pide atención (en el color de acento). */
  tone?: 'warn';
  last?: boolean;
}) {
  const body = (
    <>
      <Text style={s.filaLabel}>{label}</Text>
      <View style={s.filaRight}>
        <Text style={[s.filaValue, tone === 'warn' && s.filaWarn]} numberOfLines={2}>{value}</Text>
        {!!onPress && <MaterialIcons name="arrow-forward" size={18} color={palette.smoke} />}
      </View>
    </>
  );
  const style = [s.fila, last && s.filaLast];
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        ...style,
        (pressed || hovered) && s.filaPressed,
      ]}>
      {body}
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.black },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg },
  contentDesk: { paddingHorizontal: 72, paddingTop: 48, paddingBottom: FAB_CLEARANCE },
  inner: { width: '100%', maxWidth: 1128, alignSelf: 'center' },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 24, gap: spacing.md },
  // El meta va en gris: el amarillo se gana (es de la tarjeta de acción).
  meta: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.ash },
  back: { width: 44, height: 44, marginLeft: -10, marginBottom: 8, alignItems: 'center', justifyContent: 'center' },

  title: { marginTop: 40, fontFamily: Fonts.displayRegular, fontWeight: '400', color: palette.ivory, letterSpacing: -0.3 },
  sub: { marginTop: 20, fontFamily: Fonts.sans, fontSize: 17, lineHeight: 26, color: palette.ash, maxWidth: 340 },
  subDesk: { fontSize: 18, lineHeight: 28, maxWidth: 400 },

  deskTop: { flexDirection: 'row', gap: 48, alignItems: 'flex-start', justifyContent: 'space-between' },
  headDesk: { flexShrink: 1, flexBasis: 420 },
  headDeskFull: { flex: 1 },
  heroDesk: { marginTop: 56, flexBasis: 528, flexShrink: 1 },
  heroMob: { marginTop: 32 },

  rows: { marginTop: 32 },
  rowsDesk: { marginTop: 72 },
  footer: { marginTop: 32 },

  oro: {
    minHeight: 168, borderRadius: 8, backgroundColor: palette.gold, padding: 22,
    justifyContent: 'space-between', gap: 20,
  },
  oroDesk: { minHeight: 300, padding: 32 },
  oroPressed: { opacity: 0.92 },
  oroMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  oroMetaText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.ink },
  oroBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 },
  oroText: { flex: 1, gap: 8 },
  oroTitle: { fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 26, lineHeight: 29, color: palette.ink },
  oroTitleDesk: { fontSize: 40, lineHeight: 43 },
  oroDetail: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 21, color: palette.ink },

  fila: {
    minHeight: 56, paddingVertical: 16, borderTopWidth: 1, borderTopColor: palette.line,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16,
  },
  filaLast: { borderBottomWidth: 1, borderBottomColor: palette.line },
  filaPressed: { opacity: 0.7 },
  filaLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke },
  filaRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  filaValue: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, color: palette.ivory, textAlign: 'right', flexShrink: 1 },
  filaWarn: { color: palette.goldText },
});
