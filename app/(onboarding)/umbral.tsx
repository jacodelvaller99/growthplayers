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
import { citar, UMBRAL_BEAT_MS, UMBRAL_CLOSING, UMBRAL_SCRIPT } from '@/data/umbral';

const BEAT_MS = 700;

/**
 * Aparece con un fade y un desplazamiento mínimo hacia arriba.
 *
 * Genérico a propósito: lo usan la frase (`Beat`) y el cierre. La única razón
 * de que el cierre no entrara igual era que estaba escrito aparte.
 */
function Fade({ style, children }: { style?: object; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const anim = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) { anim.setValue(1); return; }
    Animated.timing(anim, { toValue: 1, duration: BEAT_MS, useNativeDriver: true }).start();

    // Misma red de seguridad que las frases: sin fotogramas, esto se queda en
    // opacidad 0 para siempre y no habría botón para cruzar.
    const net = setTimeout(() => anim.setValue(1), BEAT_MS + 200);
    return () => clearTimeout(net);
  }, [anim, reduced]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

/** Una frase que aparece sola. Fade + un desplazamiento mínimo hacia arriba. */
function Beat({ text, quoted = false }: { text: string; quoted?: boolean }) {
  const reduced = useReducedMotion();
  const anim = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) { anim.setValue(1); return; }
    Animated.timing(anim, { toValue: 1, duration: BEAT_MS, useNativeDriver: true }).start();

    // Red de seguridad: si nunca corre un frame, la frase se queda en opacidad 0
    // PARA SIEMPRE y el Umbral se ve en blanco. No es teórico — se reprodujo:
    // en una pestaña oculta `requestAnimationFrame` no dispara (0 frames en un
    // segundo, medido) y las cuatro frases quedaban invisibles con el botón
    // solo en pantalla. Los temporizadores sí siguen corriendo ahí, así que
    // este `setTimeout` es el canal fiable: al terminar lo que debía durar la
    // animación, se fuerza el estado final. Si la animación sí corrió, es un
    // no-op (ya vale 1).
    //
    // La regla general: una animación de entrada MEJORA algo ya visible; nunca
    // es la condición para que se vea.
    const net = setTimeout(() => anim.setValue(1), BEAT_MS + 200);
    return () => clearTimeout(net);
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
  const { state } = useLifeFlow();

  // Las palabras del propio usuario, tal cual las escribió. Se leen del estado
  // —ya están ahí tras `completeOnboarding`— y NO viajan como parámetros de
  // ruta: en web eso las pondría en la barra de direcciones, y son lo más
  // íntimo que ha escrito en la app.
  const painPoint = citar(state.profile.painPoint ?? '');
  const purpose = citar(state.northStar.purpose);
  const identity = citar(state.northStar.identity);
  const name = state.profile.name.trim();

  // Las suyas primero. Los tres campos son opcionales en el onboarding, así que
  // si no escribió ninguno el Umbral no contendría una sola palabra suya: para
  // ese caso queda su nombre, que sí es obligatorio. Una app que te lee de
  // vuelta y no tiene nada que leer debe decir eso, no fingir que sí.
  const suyas: { text: string; quoted?: boolean }[] = [
    ...(painPoint ? [{ text: `Dijiste que lo que se interpone es «${painPoint}».`, quoted: true }] : []),
    ...(purpose ? [{ text: `Y que tu norte es «${purpose}».`, quoted: true }] : []),
    ...(identity ? [{ text: `Decides ser «${identity}».`, quoted: true }] : []),
  ];

  const beats: { text: string; quoted?: boolean }[] = [
    // SIN `quoted`: esta frase la escribe la app, no el usuario. El oro marca
    // lo que es suyo, y pintar de oro el respaldo era decir "esto lo dijiste tú"
    // sobre copy nuestro — la misma mentira que el filtro de `source_type`
    // acaba de quitar del eco del día 1.
    ...(suyas.length ? suyas : [{ text: `${name || 'Aquí'} empieza el día 0.` }]),
    ...UMBRAL_SCRIPT.map((text) => ({ text })),
    { text: UMBRAL_CLOSING },
  ];

  // `shown` va de 1 a beats.length + 1. El último paso NO monta una frase: monta
  // el cierre. La frase final necesita su propio silencio — compartir fotograma
  // con un botón le quita exactamente lo que la hace pesar.
  const [shown, setShown] = useState(1);

  // MOVIMIENTO REDUCIDO NO TOCA ESTE RELOJ. Ni antes ni después.
  //
  // Dos versiones equivocadas seguidas, ambas en esta línea, ambas por creer
  // que la preferencia tenía algo que ver con la secuencia:
  //
  //  · `useState(reduced ? beats.length : 1)` + `if (reduced) return`: como
  //    `useReducedMotion` arranca SIEMPRE en false (lee la preferencia por
  //    promesa), al resolver a true el efecto salía por el `return` y `shown`
  //    se quedaba en 1 para siempre. Una frase y ninguna salida.
  //  · `reduced ? 0 : UMBRAL_BEAT_MS`: 0ms encadena macrotasks, así que las
  //    siete frases pasaban en ~20ms y ese usuario no leía NINGUNA de las
  //    suyas. Verificado con un test que renderiza con `reduced` y avanza cero
  //    milisegundos: llegaba al botón igual.
  //
  // Los dos extremos del mismo error. "Reducir movimiento" significa MENOS
  // MOVIMIENTO, nunca menos contenido — y el fade ya se salta él solo dentro
  // de `Beat`, así que aquí no hay nada que animar de todos modos. El reloj
  // es el mismo para todos.
  useEffect(() => {
    if (shown > beats.length) return;
    // El último beat dura más: es el remate del guion y se sostenía exactamente
    // lo mismo que "Esto no es una app de hábitos".
    const esCierre = shown === beats.length;
    const t = setTimeout(() => setShown((n) => n + 1), esCierre ? UMBRAL_BEAT_MS * 1.5 : UMBRAL_BEAT_MS);
    return () => clearTimeout(t);
  }, [shown, beats.length]);

  const done = shown > beats.length;
  // Cuando entra el cierre, la última frase SE QUEDA. Desaparecerla para poner
  // un botón sería cambiar la frase por el trámite.
  const current = beats[Math.min(shown, beats.length) - 1];
  const enter = () => router.replace('/(tabs)/comando');

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <Aura state="umbral" weight={0.9} origin={{ x: '50%', y: '35%' }} />

      {/* Saltar, desde el primer segundo. Mismo patrón que `welcome.tsx`: una
          secuencia cinematográfica sin salida es una pantalla de carga. */}
      {!done && (
        <Pressable
          onPress={() => setShown(beats.length + 1)}
          accessibilityRole="button"
          accessibilityLabel="Saltar la introducción"
          style={({ pressed }) => [styles.skip, { top: insets.top + spacing.md }, pressed && { opacity: 0.6 }]}>
          <Text style={styles.skipText}>SALTAR</Text>
        </Pressable>
      )}

      {/* UNA frase a la vez. Antes era `slice(0, shown)` y se apilaban: el
          contenedor no tiene scroll, así que con el guion completo el texto se
          salía por abajo —y lo que se salía eran justo las citas del usuario,
          que no tienen tope de longitud—. Además cada frase nueva empujaba a
          las anteriores de un salto sin animar: no era cine, era una lista
          creciendo a tirones. Es lo que decía el propio `data/umbral.ts`:
          "en el orden en que aparecen, una a una". */}
      {/* Tocar adelanta — el gesto de Stories. 2.6s es el ritmo de quien lee
          despacio; quien ya leyó no tiene por qué esperarlo. Sin esto, la
          unica alternativa era saltarse el guion entero. */}
      <Pressable
        style={styles.stage}
        onPress={() => setShown((n) => Math.min(n + 1, beats.length + 1))}
        accessibilityRole="button"
        // SIN `accessibilityLabel`. Lo tenía, y un `Pressable` accesible con
        // label propio GANA sobre el texto hijo: un lector de pantalla
        // anunciaba "Siguiente frase, botón" y JAMÁS las palabras del usuario,
        // que son la única razón de existir de esta pantalla.
        accessibilityHint="Toca para adelantar"
        disabled={done}>
        <Beat key={current.text} text={current.text} quoted={current.quoted} />
      </Pressable>

      {/* El cierre entra DEBAJO de la última frase, no en su lugar: la frase se
          queda en pantalla mientras aparece la salida. Y llega un tiempo
          después, no en el mismo fotograma — la frase que cierra el guion
          necesita su propio silencio antes de que haya un botón que pulsar. */}
      {/* El hueco del pie existe SIEMPRE, ocupado o no. `stage` es flex:1
          centrado, así que montar el pie al final recalculaba el centro y la
          última frase —el remate del guion— saltaba 52pt hacia arriba justo en
          el instante que más quieto debería estar. */}
      <View style={styles.footerSlot}>
        {done && (
          <Fade style={styles.footer}>
            <PolarisLogo size={36} color={palette.gold} />
            <PrimaryButton label="CRUZAR EL UMBRAL" icon="arrow-forward" onPress={enter} />
          </Fade>
        )}
      </View>
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
    // 44 de alto: el único escape de la secuencia medía 29pt, por debajo del
    // piso táctil, en una pantalla sin ningún otro control.
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
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
  footerSlot: {
    height: 128,
    justifyContent: 'flex-end',
  },
  footer: {
    alignItems: 'center',
    gap: spacing.lg,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
});
