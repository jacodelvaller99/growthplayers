/**
 * Física compartida de bottom sheet gesto-driven.
 *
 * Auditoría "Fluidez Polaris" §Fase 4 (ítems 06+08): el sheet de comentarios
 * (components/circle.tsx) y el sheet de hilos de Norman (app/(tabs)/mentor.tsx)
 * eran <Modal> con `animationType="slide"` — cierre solo por botón/tap fuera,
 * sin arrastre, sin momentum, sin rubber-band. Un solo hook para los dos: la
 * física del gesto no debe desincronizarse entre pantallas.
 *
 * Decisión de diseño (no está en el audit tal cual, documentada porque tiene
 * trade-offs reales): el audit sugiere "usá withDecay con la velocidad del
 * gesto para proyectar el punto de reposo". Un sheet de 2 estados (abierto en
 * 0 / cerrado en sheetHeight) necesita terminar EXACTO en uno de esos dos
 * valores — withDecay no garantiza eso (decelera hasta que la velocidad
 * llega a ~0, no hasta un target fijo). Se usa la idea de withDecay
 * (proyectar el punto de reposo combinando posición + velocidad, como hacen
 * los sheets nativos de iOS) para DECIDIR abrir vs. cerrar, y luego
 * withSpring(target, {velocity}) para animar — eso sí garantiza el target
 * exacto y de paso hereda la velocidad real del gesto (el "traspaso de
 * velocidad" que pide el ítem 05).
 */
import { useCallback } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { EASING_HOUSE } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

// Constante de rubber-band de la skill apple-design: resistencia progresiva,
// nunca un tope duro.
const RUBBER_BAND_CONSTANT = 0.55;

function rubberBand(overshoot: number, dimension: number): number {
  'worklet';
  return (overshoot * dimension * RUBBER_BAND_CONSTANT) / (dimension + RUBBER_BAND_CONSTANT * Math.abs(overshoot));
}

// Resorte "pesado" — un sheet de pantalla completa no debe sentirse como un
// botón (animation.spring.press/bounce son demasiado vivos para esta masa).
const SHEET_SPRING = { damping: 28, stiffness: 260, mass: 0.9 };

export function useGestureSheet(sheetHeight: number, onDismissed: () => void) {
  const translateY = useSharedValue(sheetHeight);
  const startY = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const open = useCallback(() => {
    translateY.value = reducedMotion
      ? 0
      : withTiming(0, { duration: 280, easing: Easing.bezier(...EASING_HOUSE) });
  }, [reducedMotion, translateY]);

  /** Cierre programático (botón X, tap en backdrop) — no gesto. */
  const close = useCallback(() => {
    if (reducedMotion) {
      translateY.value = sheetHeight;
      onDismissed();
      return;
    }
    translateY.value = withTiming(
      sheetHeight,
      { duration: 220, easing: Easing.bezier(...EASING_HOUSE) },
      (finished) => { if (finished) runOnJS(onDismissed)(); },
    );
  }, [reducedMotion, sheetHeight, translateY, onDismissed]);

  const pan = Gesture.Pan()
    .onStart(() => {
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      const next = startY.value + e.translationY;
      // Rubber-band solo hacia arriba del punto "abierto" (next < 0) — no se
      // puede arrastrar el sheet más allá de su posición abierta sin
      // resistencia progresiva. Hacia abajo (cerrar) es 1:1, sin resistir.
      translateY.value = next < 0 ? -rubberBand(-next, sheetHeight) : next;
    })
    .onEnd((e) => {
      // Punto de reposo proyectado: posición + un tramo de la velocidad
      // (mismo principio que withDecay — dónde terminarías si soltaras el
      // deslizamiento ahora mismo), no un snap ciego al punto más cercano.
      const projected = translateY.value + e.velocityY * 0.15;
      const shouldDismiss = projected > sheetHeight * 0.5;
      const target = shouldDismiss ? sheetHeight : 0;
      translateY.value = withSpring(
        target,
        { ...SHEET_SPRING, velocity: e.velocityY },
        (finished) => { if (finished && shouldDismiss) runOnJS(onDismissed)(); },
      );
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Dimming progresivo atado al mismo shared value — no binario.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, sheetHeight], [1, 0], Extrapolation.CLAMP),
  }));

  return { pan, sheetStyle, backdropStyle, open, close };
}
