/**
 * Marco de las pantallas de ingreso (bienvenida, entrar, crear cuenta,
 * recuperar, nueva contraseña) — diseño "Acceso" del canvas de rediseño.
 *
 * Una idea por pantalla: arriba quién eres y dónde estás, en medio el titular
 * y los campos, abajo la única acción. En escritorio el mismo bloque va a la
 * derecha y la izquierda es el panel amarillo de marca con la estrella.
 */
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PolarisLogo } from '@/components/PolarisLogo';
import { Fonts, palette, spacing } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// La estrella decorativa sigue al tema REAL (el atributo `data-theme` de
// <html>), no al estado de React: en la captura de Norte en claro salía
// amarilla porque `mode` del contexto no siempre coincide con el atributo
// (p. ej. si el tema se fija desde fuera, o la pantalla queda fuera del
// proveedor). Una variable CSS no puede desincronizarse.
const STAR_VAR = '--c-decor-star';
function injectStarVar() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('polaris-decor-star')) return;
  const style = document.createElement('style');
  style.id = 'polaris-decor-star';
  style.textContent =
    `:root{${STAR_VAR}:${palette.gold}}[data-theme="light"]{${STAR_VAR}:${palette.starOnLight}}`;
  document.head.appendChild(style);
}

export function useDecorStarColor() {
  // Nativo no tiene tema claro (cv() devuelve los hex oscuros): oro siempre.
  if (Platform.OS !== 'web') return palette.gold;
  injectStarVar();
  return `var(${STAR_VAR})`;
}

type FrameProps = {
  meta: string;
  metaRight?: string;
  /** Estrella pequeña junto a la etiqueta de arriba (solo en "Entrar"). */
  brand?: boolean;
  /** Estrella grande sobre el titular (estado "revisa tu correo"). */
  star?: boolean;
  /** Estrella gigante de fondo, abajo a la derecha (bienvenida). */
  backdropStar?: boolean;
  title: string;
  titleSize?: number;
  sub?: string;
  children?: ReactNode;
  /** Acción principal + enlace de pie. Va pegado abajo en el teléfono. */
  bottom: ReactNode;
};

export function AccessFrame({
  meta, metaRight, brand, star, backdropStar, title, titleSize = 34, sub, children, bottom,
}: FrameProps) {
  const insets = useSafeAreaInsets();
  const { isDesktop } = useBreakpoint();
  const reduced = useReducedMotion();
  const starColor = useDecorStarColor();

  const column = (
    <Animated.View
      style={styles.column}
      entering={reduced ? undefined : FadeIn.duration(220)}>
      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          {brand && <PolarisLogo size={18} color={palette.gold} />}
          <Text style={styles.meta}>{meta}</Text>
        </View>
        {!!metaRight && <Text style={styles.meta}>{metaRight}</Text>}
      </View>

      <View style={styles.body}>
        {star && (
          <View style={styles.bigStar}>
            <PolarisLogo size={72} color={starColor} />
          </View>
        )}
        <Text
          accessibilityRole="header"
          style={[styles.title, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.08) }]}>
          {title}
        </Text>
        {!!sub && <Text style={styles.sub}>{sub}</Text>}
        {!!children && <View style={styles.fields}>{children}</View>}
      </View>

      <View style={styles.bottom}>{bottom}</View>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, isDesktop && styles.rootDesktop]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {isDesktop && (
        <View style={styles.brandPanel}>
          <View style={styles.brandMark}>
            <PolarisLogo size={28} color={palette.ink} />
            <Text style={styles.brandName}>POLARIS</Text>
          </View>
          <View style={styles.brandStar}>
            <PolarisLogo size={420} color={palette.ink} />
          </View>
          <Text style={styles.brandLine}>Persigue el estado,{'\n'}no el resultado.</Text>
        </View>
      )}

      <View style={styles.side}>
        {backdropStar && !isDesktop && (
          <View style={styles.backdropStar} pointerEvents="none">
            <PolarisLogo size={420} color={starColor} />
          </View>
        )}
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + (isDesktop ? 56 : 40), paddingBottom: insets.bottom + 28 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {column}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

/** Campo de ingreso: etiqueta arriba, texto sobre una línea. Las contraseñas traen VER/OCULTAR. */
export function AccessField({
  label, secret, ...input
}: TextInputProps & { label: string; secret?: boolean }) {
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  return (
    <View style={[styles.field, focused && styles.fieldFocused]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldRow}>
        <TextInput
          {...input}
          accessibilityLabel={input.accessibilityLabel ?? label}
          secureTextEntry={secret && !shown}
          placeholderTextColor={palette.smoke}
          selectionColor={palette.gold}
          onFocus={(e) => { setFocused(true); input.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); input.onBlur?.(e); }}
          style={[styles.fieldInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
        />
        {secret && (
          <Pressable
            onPress={() => setShown((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={shown ? 'Ocultar contraseña' : 'Ver contraseña'}
            hitSlop={8}
            style={styles.fieldAside}>
            <Text style={styles.fieldAsideText}>{shown ? 'OCULTAR' : 'VER'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Enlace de texto con área táctil de 44 px. `strong` va en el color de acento. */
export function AccessLink({
  lead, label, onPress, align = 'center',
}: { lead?: string; label: string; onPress: () => void; align?: 'center' | 'end' }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={lead ? `${lead} ${label}` : label}
      style={[styles.link, align === 'end' && styles.linkEnd]}>
      {!!lead && <Text style={styles.linkLead}>{lead} </Text>}
      <Text style={styles.linkStrong}>{label}</Text>
    </Pressable>
  );
}

/** Mensaje de error o de confirmación bajo los campos. */
export function AccessNotice({ tone, children }: { tone: 'error' | 'ok'; children: string }) {
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion={tone === 'error' ? 'assertive' : 'polite'}
      style={[styles.notice, { color: tone === 'error' ? palette.dangerText : palette.ash }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.black },
  rootDesktop: { flexDirection: 'row' },

  brandPanel: {
    flex: 1,
    backgroundColor: palette.gold,
    overflow: 'hidden',
    padding: 72,
    justifyContent: 'space-between',
  },
  brandMark: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandName: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 14, letterSpacing: 2, color: palette.ink },
  brandStar: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  brandLine: {
    fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 34, lineHeight: 38, color: palette.ink,
  },

  side: { flex: 1, overflow: 'hidden' },
  backdropStar: { position: 'absolute', right: -170, bottom: 120 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: 420 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 24 },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meta: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.goldText },

  body: { marginTop: 56, marginBottom: spacing.xl },
  bigStar: { marginTop: spacing.lg, marginBottom: 36, marginLeft: -2 },
  title: { fontFamily: Fonts.displayRegular, fontWeight: '400', color: palette.ivory, letterSpacing: -0.3 },
  sub: { marginTop: 18, fontSize: 17, lineHeight: 26, color: palette.ash, fontFamily: Fonts.sans, maxWidth: 340 },
  fields: { marginTop: 40, gap: spacing.lg },

  bottom: { marginTop: 'auto', gap: spacing.sm },

  field: { borderBottomWidth: 1, borderBottomColor: palette.line, paddingBottom: 6, gap: 4 },
  fieldFocused: { borderBottomColor: palette.gold },
  fieldLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke },
  fieldRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  fieldInput: { flex: 1, fontSize: 18, color: palette.ivory, fontFamily: Fonts.sans, paddingVertical: 8 },
  fieldAside: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  fieldAsideText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.ash },

  link: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' },
  linkEnd: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  linkLead: { fontSize: 15, color: palette.ash, fontFamily: Fonts.sans },
  linkStrong: { fontSize: 15, color: palette.goldText, fontFamily: Fonts.sans, fontWeight: '600' },

  notice: { fontSize: 15, lineHeight: 22, fontFamily: Fonts.sans },
});
