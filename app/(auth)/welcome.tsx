/**
 * app/(auth)/welcome.tsx
 *
 * Pantalla de bienvenida cinématica — primera impresión para usuarios no autenticados.
 * Se muestra antes del formulario de login/registro, estableciendo identidad de marca.
 *
 * Flujo:
 *   ACTIVAR ACCESO  → auth index con mode=register
 *   Ya soy operador → auth index con mode=login (default)
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PolarisMark, PrimaryButton } from '@/components/polaris';
import { Fonts, palette, spacing, typography } from '@/constants/theme';

export default function WelcomeScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  // ── Shared animation values ──────────────────────────────────────────────
  const markO   = useSharedValue(0);
  const markS   = useSharedValue(0.78);
  const eyeO    = useSharedValue(0);
  const eyeY    = useSharedValue(12);
  const ruleW   = useSharedValue(0);
  const titleO  = useSharedValue(0);
  const titleY  = useSharedValue(32);
  const bodyO   = useSharedValue(0);
  const statsO  = useSharedValue(0);
  const ctaO    = useSharedValue(0);
  const ctaY    = useSharedValue(22);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    const quad = Easing.out(Easing.quad);

    // ① Mark (150ms)
    markO.value  = withDelay(150,  withTiming(1,  { duration: 700, easing: ease }));
    markS.value  = withDelay(150,  withTiming(1,  { duration: 700, easing: ease }));
    // ② Eyebrow (650ms)
    eyeO.value   = withDelay(650,  withTiming(1,  { duration: 420 }));
    eyeY.value   = withDelay(650,  withTiming(0,  { duration: 420, easing: quad }));
    // ③ Gold rule (950ms)
    ruleW.value  = withDelay(950,  withTiming(40, { duration: 350, easing: quad }));
    // ④ Headline (1 100ms)
    titleO.value = withDelay(1100, withTiming(1,  { duration: 560, easing: ease }));
    titleY.value = withDelay(1100, withTiming(0,  { duration: 560, easing: ease }));
    // ⑤ Manifesto (1 550ms)
    bodyO.value  = withDelay(1550, withTiming(1,  { duration: 600 }));
    // ⑥ Stats (1 850ms)
    statsO.value = withDelay(1850, withTiming(1,  { duration: 500 }));
    // ⑦ CTAs (2 200ms)
    ctaO.value   = withDelay(2200, withTiming(1,  { duration: 520 }));
    ctaY.value   = withDelay(2200, withTiming(0,  { duration: 520, easing: quad }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Animated styles ──────────────────────────────────────────────────────
  const markStyle  = useAnimatedStyle(() => ({
    opacity: markO.value,
    transform: [{ scale: markS.value }],
  }));
  const eyeStyle   = useAnimatedStyle(() => ({
    opacity: eyeO.value,
    transform: [{ translateY: eyeY.value }],
  }));
  const ruleStyle  = useAnimatedStyle(() => ({ width: ruleW.value }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleO.value,
    transform: [{ translateY: titleY.value }],
  }));
  const bodyStyle  = useAnimatedStyle(() => ({ opacity: bodyO.value }));
  const statsStyle = useAnimatedStyle(() => ({ opacity: statsO.value }));
  const ctaStyle   = useAnimatedStyle(() => ({
    opacity: ctaO.value,
    transform: [{ translateY: ctaY.value }],
  }));

  // ── Navigation ───────────────────────────────────────────────────────────
  const goRegister = () =>
    router.replace({ pathname: '/(auth)', params: { mode: 'register' } } as never);
  const goLogin = () =>
    router.replace('/(auth)' as never);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 },
      ]}>

      {/* ── Brand section ── */}
      <View style={styles.brand}>
        <Animated.View style={markStyle}>
          <PolarisMark size={88} />
        </Animated.View>

        <Animated.Text style={[styles.eyebrow, eyeStyle]}>
          POLARIS GROWTH INSTITUTE
        </Animated.Text>

        {/* Gold accent rule — animates from 0 to 40px width */}
        <Animated.View style={[styles.goldRule, ruleStyle]} />
      </View>

      {/* ── Center: headline + manifesto + stats ── */}
      <View style={styles.center}>
        <Animated.Text style={[styles.headline, titleStyle]}>
          SISTEMA{'\n'}INTERNO.
        </Animated.Text>

        <Animated.Text style={[styles.manifesto, bodyStyle]}>
          La distancia entre donde estás y donde quieres estar no es de estrategia
          {' — '}es de sistema interno.
        </Animated.Text>

        {/* ── Stats triad ── */}
        <Animated.View style={[styles.statsRow, statsStyle]}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>90</Text>
            <Text style={styles.statLabel}>DÍAS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>360°</Text>
            <Text style={styles.statLabel}>BIENESTAR</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>1</Text>
            <Text style={styles.statLabel}>PROTOCOLO</Text>
          </View>
        </Animated.View>
      </View>

      {/* ── CTAs ── */}
      <Animated.View style={[styles.actions, ctaStyle]}>
        <PrimaryButton
          label="ENTRAR AL SISTEMA"
          icon="arrow-forward"
          onPress={goRegister}
        />

        <Pressable style={styles.loginRow} onPress={goLogin} accessibilityRole="button">
          <Text style={styles.loginText}>Ya tengo cuenta</Text>
          <MaterialIcons name="arrow-forward" size={13} color={palette.smoke} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.black,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },

  // ── Brand ──────────────────────────────────────────────────────────────
  brand: {
    gap: spacing.md,
  },
  eyebrow: {
    ...typography.label,
    color: palette.gold,
    letterSpacing: 2.5,
  },
  goldRule: {
    height: 2,
    backgroundColor: palette.gold,
    borderRadius: 1,
    // width animated externally
  },

  // ── Center ─────────────────────────────────────────────────────────────
  center: {
    gap: spacing.xl,
  },
  headline: {
    color:        palette.ivory,
    fontFamily:   Fonts.display,
    fontSize:     62,
    fontWeight:   '800',
    letterSpacing: -1,
    lineHeight:   66,
    textTransform: 'uppercase',
  },
  manifesto: {
    ...typography.body,
    color:      palette.ash,
    fontSize:   15,
    lineHeight: 24,
    fontStyle:  'italic',
  },

  // ── Stats ───────────────────────────────────────────────────────────────
  statsRow: {
    alignItems:     'center',
    flexDirection:  'row',
    gap:            spacing.xl,
  },
  stat: {
    alignItems: 'center',
    gap:        4,
  },
  statNum: {
    color:        palette.gold,
    fontFamily:   Fonts.display,
    fontSize:     28,
    fontWeight:   '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    ...typography.label,
    color:        palette.smoke,
    fontSize:     9,
    letterSpacing: 1.5,
  },
  statDivider: {
    width:           1,
    height:          36,
    backgroundColor: palette.line,
  },

  // ── CTAs ────────────────────────────────────────────────────────────────
  actions: {
    gap: spacing.lg,
  },
  loginRow: {
    alignItems:      'center',
    flexDirection:   'row',
    gap:             spacing.xs,
    justifyContent:  'center',
    paddingVertical: spacing.md,
  },
  loginText: {
    ...typography.body,
    color:              palette.smoke,
    fontSize:           14,
    textDecorationLine: 'underline',
  },
});
