/**
 * BodyMap — señala dónde lo sientes.
 *
 * El check-in pregunta cuánto (energía, claridad, tensión, sueño) y nunca
 * dónde. "Tensión 8" no distingue una mandíbula apretada de un estómago
 * cerrado, y se regulan distinto. Tocar la silueta toma dos segundos y da una
 * señal que ningún deslizador da.
 *
 * El significado vive en `lib/bodyMapLogic.ts` (puro, testeado, con el filtro
 * anti-lenguaje-clínico). La base visual es un único escaneo frontal de alta
 * fidelidad (`BodyFrontScan`) compartido por web/iOS/Android. Aquí solo viven
 * el tacto continuo y los siete atajos accesibles.
 *
 * El gesto se normaliza a 0..1 sobre el mismo bitmap. Así una rodilla sigue
 * siendo la misma rodilla en una pantalla pequeña, web o un móvil grande, y
 * el fondo negro nunca se registra como parte del cuerpo.
 */
import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { BODY_FRONT_ASPECT, BodyFrontScan } from '@/components/body-front-scan';
import { Fonts, palette, spacing, typography } from '@/constants/theme';
import { BODY_ZONE_SHORTCUTS, ZONE_LABEL, type BodyZone } from '@/lib/bodyMapLogic';
import { bodyPointAt, type BodyPoint } from '@/lib/bodyPointLogic';

export interface BodyMapProps {
  selected: BodyZone[];
  onToggle: (zone: BodyZone) => void;
  points?: readonly BodyPoint[];
  onPointToggle?: (point: BodyPoint) => void;
  /** El check-in usa 320; la vista dedicada puede ampliar el mismo asset. */
  maxBodyWidth?: number;
}

export function BodyMap({
  selected,
  onToggle,
  points = [],
  onPointToggle,
  maxBodyWidth = 320,
}: BodyMapProps) {
  const canvasSize = useRef({ width: 0, height: 0 });

  // Manipulación directa (audit "Fluidez Polaris" §Fase 4, ítems 01/02/05):
  // antes el toque solo se registraba al SOLTAR (onPress). Ahora el marcador
  // sigue el dedo en vivo (markerX/Y, en el hilo de UI vía la worklet de
  // Gesture.Pan — sin esto se sentía con retraso) y la colocación real
  // (haptic + toggle) dispara en .onBegin, no al soltar: la respuesta es
  // instantánea al tocar, no al levantar el dedo.
  const markerX = useSharedValue(0);
  const markerY = useSharedValue(0);
  const markerOpacity = useSharedValue(0);

  // JS thread — bodyPointAt/haptics/callback no son worklets, por eso viven
  // acá y se llaman vía runOnJS desde el gesto (que corre en el hilo de UI).
  const commitPoint = (x: number, y: number) => {
    const { width, height } = canvasSize.current;
    if (width <= 0 || height <= 0) return;
    const point = bodyPointAt(x / width, y / height);
    if (!point) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPointToggle) onPointToggle(point);
    else onToggle(point.zone);
  };

  const pan = Gesture.Pan()
    .onBegin((e) => {
      markerX.value = e.x;
      markerY.value = e.y;
      markerOpacity.value = withTiming(1, { duration: 100 });
      runOnJS(commitPoint)(e.x, e.y);
    })
    .onUpdate((e) => {
      // Solo visual — un solo commit por gesto (arriba, en onBegin). Arrastrar
      // no re-selecciona zona por zona; solo previsualiza dónde estás.
      markerX.value = e.x;
      markerY.value = e.y;
    })
    .onFinalize(() => {
      markerOpacity.value = withTiming(0, { duration: 150 });
    });

  const markerStyle = useAnimatedStyle(() => ({
    opacity: markerOpacity.value,
    transform: [
      { translateX: markerX.value - 14 },
      { translateY: markerY.value - 14 },
    ],
  }));

  return (
    <View style={s.root}>
      <View
        style={[s.canvas, { maxWidth: maxBodyWidth }]}
        accessibilityRole="none"
        onLayout={(event) => {
          canvasSize.current = event.nativeEvent.layout;
        }}>
        <BodyFrontScan selected={selected} points={points} />
        <GestureDetector gesture={pan}>
          <Animated.View
            testID="body-touch-surface"
            accessibilityRole="button"
            accessibilityLabel="Señalar un punto exacto del cuerpo"
            accessibilityHint="Toca la parte de la figura donde lo sientes"
            style={StyleSheet.absoluteFillObject}
          />
        </GestureDetector>
        {/* Marcador que sigue el dedo — puramente visual, no dispara commits. */}
        <Animated.View pointerEvents="none" style={[s.liveMarker, markerStyle]} />
      </View>

      {/* Las etiquetas viven fuera de la silueta: dentro competirían con el
          gesto y obligarían a tipografía de 8px sobre un área táctil. */}
      <View style={s.legend}>
        {BODY_ZONE_SHORTCUTS.map((zone) => {
          const on = selected.includes(zone);
          return (
            <Pressable
              key={zone}
              onPress={() => {
                // El chip hace exactamente lo mismo que la silueta; que uno
                // vibre y el otro no es la clase de inconsistencia que se nota
                // sin saber nombrarla.
                if (Platform.OS !== 'web') {
                  if (on) Haptics.selectionAsync();
                  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                onToggle(zone);
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={ZONE_LABEL[zone]}
              accessibilityHint="En la lista"
              style={[s.chip, on && s.chipOn, on && selected[0] === zone && s.chipPrimary]}>
              <Text style={[s.chipText, on && s.chipTextOn, on && selected[0] === zone && s.chipTextPrimary]}>
                {ZONE_LABEL[zone].replace(/^(La|El|Las|Los) /, '')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: spacing.lg },
  // El aspecto sigue al bitmap real para no deformar la anatomía.
  canvas: {
    alignSelf: 'center',
    width: '100%',
    aspectRatio: BODY_FRONT_ASPECT,
    backgroundColor: '#000000',
    overflow: 'hidden',
    position: 'relative',
  },
  // 28×28, centrado por translate (-14) en markerStyle. Opacidad arranca en
  // 0 (useSharedValue(0)) — invisible hasta el primer .onBegin.
  liveMarker: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: palette.gold,
    backgroundColor: 'transparent',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
  },
  chipOn: { backgroundColor: palette.goldLight, borderColor: palette.gold },
  chipPrimary: {
    backgroundColor: palette.gold,
    borderWidth: 2,
  },
  chipText: { ...typography.caption, color: palette.ash },
  chipTextOn: { color: palette.goldText, fontFamily: Fonts.displayMedium },
  // Sobre oro macizo el texto tiene que ser tinta, no oro.
  chipTextPrimary: {
    color: palette.ink,
  },
});
