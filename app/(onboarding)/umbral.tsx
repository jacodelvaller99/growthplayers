/**
 * El Umbral — el cruce hacia el protocolo.
 *
 * POR QUÉ EXISTE: el onboarding terminaba con `router.replace('/(tabs)/comando')`.
 * El usuario acababa de escribir qué se interpone en su vida, cuál es su norte y
 * quién decide ser — y la app respondía a eso apareciendo, sin decir nada, en un
 * tablero de métricas. El momento con más carga de todo el producto se gastaba
 * en una transición de router.
 *
 * Aquí se le lee de vuelta lo que acaba de escribir. Es el método que el dueño
 * eligió de la referencia: las palabras del propio usuario, grandes, solas en la
 * pantalla. No hay dato nuevo — el valor es que la app demuestre, antes de
 * pedirle nada más, que escuchó.
 *
 * El aura en estado `umbral` es uno de los cuatro momentos inmersivos donde la
 * marca permite color de fondo. El cockpit sigue monocromo.
 */
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aura } from '@/components/aura';
import { PolarisLogo } from '@/components/PolarisLogo';
import { PrimaryButton } from '@/components/polaris';
import { Colors, palette, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { UMBRAL_BEAT_MS, UMBRAL_CLOSING, UMBRAL_SCRIPT } from '@/data/umbral';

/** Una frase que aparece sola. Fade + un desplazamiento mínimo hacia arriba. */
function Beat({ text, quoted = false }: { text: string; quoted?: boolean }) {
  const reduced = useReducedMotion();
  const anim = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) return;
    Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [anim, reduced]);

  return (
    <Animated.Text
      style={[
        styles.beat,
        quoted && styles.beatQuoted,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}>
      {text}
    </Animated.Text>
  );
}

export default function UmbralScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { state } = useLifeFlow();

  // Las palabras del propio usuario, tal cual las escribió. Se leen del estado
  // —ya están ahí tras `completeOnboarding`— y NO viajan como parámetros de
  // ruta: en web eso las pondría en la barra de direcciones, y son lo más
  // íntimo que ha escrito en la app.
  const purpose = state.northStar.purpose.trim();
  const identity = state.northStar.identity.trim();

  const beats: { text: string; quoted?: boolean }[] = [
    ...UMBRAL_SCRIPT.map((text) => ({ text })),
    ...(purpose ? [{ text: `Dijiste que tu norte es «${purpose}».`, quoted: true }] : []),
    ...(identity ? [{ text: `Y que decides ser «${identity}».`, quoted: true }] : []),
    { text: UMBRAL_CLOSING },
  ];

  // Con movimiento reducido no hay secuencia: está todo desde el primer frame,
  // incluido el botón. Esperar 15 segundos a que aparezca una salida que no se
  // anima sería castigar justo a quien pidió menos animación.
  const [shown, setShown] = useState(reduced ? beats.length : 1);

  useEffect(() => {
    if (reduced || shown >= beats.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), UMBRAL_BEAT_MS);
    return () => clearTimeout(t);
  }, [reduced, shown, beats.length]);

  const done = shown >= beats.length;
  const enter = () => router.replace('/(tabs)/comando');

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <Aura state="umbral" weight={0.9} origin={{ x: '50%', y: '35%' }} />

      {/* Saltar, desde el primer segundo. Mismo patrón que `welcome.tsx`: una
          secuencia cinematográfica sin salida es una pantalla de carga. */}
      {!done && (
        <Pressable
          onPress={() => setShown(beats.length)}
          accessibilityRole="button"
          accessibilityLabel="Saltar la introducción"
          style={({ pressed }) => [styles.skip, { top: insets.top + spacing.md }, pressed && { opacity: 0.6 }]}>
          <Text style={styles.skipText}>SALTAR</Text>
        </Pressable>
      )}

      <View style={styles.stage}>
        {beats.slice(0, shown).map((b) => (
          <Beat key={b.text} text={b.text} quoted={b.quoted} />
        ))}
      </View>

      {done && (
        <View style={styles.footer}>
          <PolarisLogo size={36} color={palette.gold} />
          <PrimaryButton label="CRUZAR EL UMBRAL" icon="arrow-forward" onPress={enter} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  skip: {
    position: 'absolute',
    right: spacing.xl,
    padding: spacing.sm,
    zIndex: 2,
  },
  skipText: {
    ...typography.label,
    color: palette.smoke,
  },
  stage: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xl,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  beat: {
    ...typography.statement,
    color: palette.ivory,
  },
  // Lo que escribió el usuario se distingue de lo que dice la app: mismo
  // tamaño (no es menos importante), color de marca (es suyo).
  beatQuoted: {
    color: palette.goldText,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.lg,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
});
