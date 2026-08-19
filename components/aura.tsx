/**
 * Aura — el resplandor que respira detrás del contenido.
 *
 * React Native no tiene `radial-gradient` (está comentado literalmente en
 * `app/(auth)/welcome.tsx:379`, donde se falsea con boxShadow solo-web). Se
 * resuelve con el mismo patrón de split que ya usa `components/polaris.tsx`
 * para el sparkline (`:408-411`): CSS `radial-gradient` en web, y en nativo un
 * `expo-linear-gradient` vertical — dependencia ya instalada que hasta hoy
 * tenía CERO imports, así que no entra nada nuevo al bundle.
 *
 * (Una versión anterior de este comentario prometía Skia. No lo usa: montar un
 * Canvas por pantalla para un fondo que nadie mira de frente no se paga.)
 *
 * Va SIEMPRE detrás: `pointerEvents="none"` y posición absoluta. No captura
 * toques ni cambia el layout de la pantalla que lo monta.
 *
 * DÓNDE SÍ: umbral, prácticas de bienestar, check-in, momentos del héroe.
 * DÓNDE NO: Comando, Progreso, Programas y TODO el admin. El cockpit no se
 * decora — es la regla de marca, no una preferencia.
 */
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { auraForState, type AuraState } from '@/lib/auraLogic';

export interface AuraProps {
  state: AuraState;
  /** 0-1. Cuánto pesa el estado; se escala contra el techo de marca. */
  weight?: number;
  /** Dónde se centra el resplandor. Por defecto arriba-centro, detrás del titular. */
  origin?: { x: `${number}%`; y: `${number}%` };
}

/** Ciclo de respiración: 4s dentro, 4s fuera. Lo bastante lento para leerse
 *  como atmósfera y no como un pulso que compite por la atención. */
const BREATH_MS = 4000;

/**
 * El aura se RECORTA A SÍ MISMA.
 *
 * Respira escalando hasta 1.08, así que a 390px de ancho ocupa 421 y empuja el
 * scroll lateral de la página: medido en checkin, respiración, binaurales y
 * sueño, entre 5 y 11px de desborde. Un fondo decorativo no puede cambiar las
 * dimensiones del documento.
 *
 * El recorte vive AQUÍ y no en las seis pantallas que la usan: quien crea el
 * desborde es quien debe contenerlo, y así una séptima pantalla no lo hereda.
 */
const clip = [StyleSheet.absoluteFill, { overflow: 'hidden' as const }];

export function Aura({ state, weight = 0.6, origin }: AuraProps) {
  const reduced = useReducedMotion();
  const { color, opacity } = auraForState({ state, weight });
  const x = origin?.x ?? '50%';
  const y = origin?.y ?? '18%';

  // Respira en ESCALA, no en opacidad.
  //
  // La primera versión animaba opacidad entre el 80% y el 100% de un alfa que
  // ya era ~0.10: el resultado era una variación por debajo de un nivel de
  // cuantización del display — invisible por definición. Un borde difuso que
  // CRUZA píxeles sí se percibe; dos centésimas de alfa no. La opacidad se
  // queda fija (y acotada por el techo de marca); lo que se mueve es el tamaño.
  const breath = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(breath);
      breath.value = 1;
      return;
    }
    breath.value = withRepeat(
      withTiming(1.08, { duration: BREATH_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(breath);
  }, [reduced, breath]);

  const animated = useAnimatedStyle(() => ({
    opacity,
    transform: [{ scale: breath.value }],
  }));

  // En web el radial-gradient nativo del CSS es exacto y gratis — el mismo
  // recurso que ya usa `comando.tsx:1348-1353` para su glow de escritorio.
  if (Platform.OS === 'web') {
    return (
      <View style={clip} pointerEvents="none">
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          StyleSheet.absoluteFill,
          animated,
          { backgroundImage: `radial-gradient(ellipse 90% 55% at ${x} ${y}, ${color} 0%, transparent 70%)` },
        ]}
      />
      </View>
    );
  }

  // Nativo: gradiente real con `expo-linear-gradient` (ya era dependencia con
  // CERO imports en el repo — no entra nada nuevo al bundle).
  //
  // La primera versión apilaba dos Views de color plano. Eso deja un ESCALÓN
  // duro entre capas, más visible que la propia respiración: se leía como un
  // rectángulo mal puesto, no como atmósfera. El degradado elimina el borde.
  //
  // Es un gradiente lineal, no radial: RN no tiene radial nativo y montar Skia
  // aquí costaría un Canvas por pantalla para un fondo que nadie mira de
  // frente. Con el origen arriba y el desvanecido hacia abajo, la diferencia
  // contra un radial es imperceptible en un fondo de esta opacidad.
  return (
    <View style={clip} pointerEvents="none">
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, animated]}>
      <LinearGradient
        colors={[color, `${color}00`]}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.85 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
    </View>
  );
}
