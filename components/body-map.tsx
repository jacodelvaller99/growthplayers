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
import { Platform, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
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

  const handleBodyPress = (event: GestureResponderEvent) => {
    const { width, height } = canvasSize.current;
    if (width <= 0 || height <= 0) return;
    // React Native entrega locationX/Y dentro de nativeEvent. RN Web 0.21 los
    // expone en el evento respondedor de nivel superior (ver
    // createResponderEvent.js); soportamos ambos contratos.
    const webEvent = event as unknown as { locationX?: number; locationY?: number };
    const domNativeEvent = event.nativeEvent as unknown as { offsetX?: number; offsetY?: number };
    const locationX = Number.isFinite(event.nativeEvent.locationX)
      ? event.nativeEvent.locationX
      : Number.isFinite(webEvent.locationX) ? webEvent.locationX : domNativeEvent.offsetX;
    const locationY = Number.isFinite(event.nativeEvent.locationY)
      ? event.nativeEvent.locationY
      : Number.isFinite(webEvent.locationY) ? webEvent.locationY : domNativeEvent.offsetY;
    if (!Number.isFinite(locationX) || !Number.isFinite(locationY)) return;
    const point = bodyPointAt(locationX! / width, locationY! / height);
    if (!point) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPointToggle) onPointToggle(point);
    else onToggle(point.zone);
  };

  return (
    <View style={s.root}>
      <View
        style={[s.canvas, { maxWidth: maxBodyWidth }]}
        accessibilityRole="none"
        onLayout={(event) => {
          canvasSize.current = event.nativeEvent.layout;
        }}>
        <BodyFrontScan selected={selected} points={points} />
        <Pressable
          testID="body-touch-surface"
          onPress={handleBodyPress}
          accessibilityRole="button"
          accessibilityLabel="Señalar un punto exacto del cuerpo"
          accessibilityHint="Toca la parte de la figura donde lo sientes"
          style={StyleSheet.absoluteFillObject}
        />
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
