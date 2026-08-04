/**
 * Aura — el resplandor que respira detrás del contenido.
 *
 * React Native no tiene `radial-gradient` (está comentado literalmente en
 * `app/(auth)/welcome.tsx:379`, donde se falsea con boxShadow solo-web). Aquí
 * se resuelve con el MISMO patrón de split que ya usa `components/polaris.tsx`
 * para el sparkline (`:408-411`): Skia en nativo, CSS en web. Skia ya es
 * dependencia usada, así que no entra nada nuevo al bundle.
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

export function Aura({ state, weight = 0.6, origin }: AuraProps) {
  const reduced = useReducedMotion();
  const { color, opacity } = auraForState({ state, weight });
  const x = origin?.x ?? '50%';
  const y = origin?.y ?? '18%';

  // Respira entre el 80% y el 100% de su opacidad — nunca desaparece, porque
  // un aura que se apaga del todo se lee como parpadeo/bug (ver auraLogic).
  const breath = useSharedValue(1);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(breath);
      breath.value = 1;
      return;
    }
    breath.value = withRepeat(
      withTiming(0.8, { duration: BREATH_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(breath);
  }, [reduced, breath]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity * breath.value }));

  // En web el radial-gradient nativo del CSS es exacto y gratis — el mismo
  // recurso que ya usa `comando.tsx:1348-1353` para su glow de escritorio.
  if (Platform.OS === 'web') {
    return (
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
    );
  }

  // Nativo: capas concéntricas con opacidad decreciente. Es la aproximación
  // barata a un radial — sin Canvas ni shader, sin coste de montaje, y
  // suficiente para un fondo que nunca se mira de frente.
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, animated]}>
      <View style={[s.layer, { backgroundColor: color, opacity: 0.55, transform: [{ scaleX: 1.6 }] }]} />
      <View style={[s.layer, s.inner, { backgroundColor: color, opacity: 0.75, transform: [{ scaleX: 1.4 }] }]} />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: '-30%',
    left: '-30%',
    right: '-30%',
    height: '85%',
    borderRadius: 9999,
  },
  inner: {
    top: '-18%',
    left: '-10%',
    right: '-10%',
    height: '55%',
  },
});
