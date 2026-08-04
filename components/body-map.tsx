/**
 * BodyMap — señala dónde lo sientes.
 *
 * El check-in pregunta cuánto (energía, claridad, tensión, sueño) y nunca
 * dónde. "Tensión 8" no distingue una mandíbula apretada de un estómago
 * cerrado, y se regulan distinto. Tocar la silueta toma dos segundos y da una
 * señal que ningún deslizador da.
 *
 * El significado vive en `lib/bodyMapLogic.ts` (puro, testeado, con el filtro
 * anti-lenguaje-clínico). Aquí solo vive la silueta y el tacto.
 *
 * Deliberadamente NO es un SVG anatómico: una silueta reconocible construida
 * con Views redondeadas pesa cero, se tinta con los tokens del tema y no
 * necesita assets. La precisión anatómica sería falsa precisión — son 7 zonas.
 */
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Fonts, palette, spacing, typography } from '@/constants/theme';
import { BODY_ZONES, ZONE_LABEL, type BodyZone } from '@/lib/bodyMapLogic';

export interface BodyMapProps {
  selected: BodyZone[];
  onToggle: (zone: BodyZone) => void;
}

/**
 * Geometría de la silueta, en porcentajes del contenedor.
 *
 * Una versión anterior de este comentario afirmaba que cada zona era un área
 * táctil de 44pt. Era falso: con el canvas fijo de 200×260, la garganta medía
 * 28×18pt. El área táctil real la da `hitSlop` en el Pressable, más el chip
 * equivalente de la leyenda (que sí es de 44pt de alto) — dos formas de tocar
 * la misma zona, para dedo grande y para dedo fino.
 */
const ZONE_BOX: Record<BodyZone, { top: string; left: string; width: string; height: string; radius: number }> = {
  cabeza:    { top: '2%',  left: '38%', width: '24%', height: '14%', radius: 999 },
  mandibula: { top: '15%', left: '40%', width: '20%', height: '7%',  radius: 8 },
  garganta:  { top: '21%', left: '43%', width: '14%', height: '7%',  radius: 6 },
  pecho:     { top: '27%', left: '30%', width: '40%', height: '17%', radius: 14 },
  estomago:  { top: '43%', left: '33%', width: '34%', height: '15%', radius: 12 },
  espalda:   { top: '27%', left: '12%', width: '15%', height: '31%', radius: 12 },
  manos:     { top: '50%', left: '73%', width: '15%', height: '14%', radius: 999 },
};

export function BodyMap({ selected, onToggle }: BodyMapProps) {
  return (
    <View style={s.root}>
      <View style={s.canvas} accessibilityRole="none">
        {/* Silueta de referencia — puramente decorativa, no se toca. */}
        <View pointerEvents="none" style={s.torso} />
        <View pointerEvents="none" style={s.head} />

        {BODY_ZONES.map((zone) => {
          const box = ZONE_BOX[zone];
          const on = selected.includes(zone);
          return (
            <Pressable
              key={zone}
              onPress={() => {
                // El gesto más corporal de la app era el único sin háptica,
                // mientras el resto de la pantalla vibra. Tocarte y que el
                // teléfono no responda rompe justo la sensación que buscamos.
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggle(zone);
              }}
              // Varias zonas (garganta, mandíbula) dibujan menos de 44pt a
              // propósito — anatómicamente son pequeñas. `hitSlop` da el área
              // táctil que exige PRODUCT.md sin deformar el cuerpo.
              hitSlop={12}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={ZONE_LABEL[zone]}
              style={({ pressed }) => [
                s.zone,
                {
                  top: box.top as never,
                  left: box.left as never,
                  width: box.width as never,
                  height: box.height as never,
                  borderRadius: box.radius,
                },
                on && s.zoneOn,
                pressed && { opacity: 0.7 },
              ]}
            />
          );
        })}
      </View>

      {/* Las etiquetas viven fuera de la silueta: dentro competirían con el
          gesto y obligarían a tipografía de 8px sobre un área táctil. */}
      <View style={s.legend}>
        {BODY_ZONES.map((zone) => {
          const on = selected.includes(zone);
          return (
            <Pressable
              key={zone}
              onPress={() => onToggle(zone)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={ZONE_LABEL[zone]}
              style={[s.chip, on && s.chipOn]}>
              <Text style={[s.chipText, on && s.chipTextOn]}>
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
  // Antes era 200x260 FIJO en cualquier dispositivo: diminuto en un teléfono
  // grande y apretado en uno pequeño. Con aspectRatio escala con el ancho real.
  canvas: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 340,
    aspectRatio: 0.72,
    position: 'relative',
  },
  // Silueta: hombros anchos que se estrechan. Sugiere un cuerpo sin dibujarlo.
  torso: {
    position: 'absolute',
    top: '25%',
    left: '22%',
    right: '22%',
    height: '48%',
    borderRadius: 28,
    backgroundColor: palette.graphiteLight,
    opacity: 0.95,
  },
  head: {
    position: 'absolute',
    top: '2%',
    left: '38%',
    width: '24%',
    height: '14%',
    borderRadius: 999,
    backgroundColor: palette.graphiteLight,
    opacity: 0.95,
  },
  zone: {
    position: 'absolute',
    borderWidth: 1,
    // `line` (alfa 0.07) sobre la silueta era invisible: no se veía que
    // hubiera regiones tocables hasta tocarlas. `lineHard` las declara.
    borderColor: palette.lineHard,
    backgroundColor: 'transparent',
  },
  // El oro marca lo señalado. Es el acento ganado de la marca: aquí lo gana el
  // usuario al decir dónde le duele.
  zoneOn: {
    backgroundColor: palette.goldLight,
    borderColor: palette.gold,
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
  chipText: { ...typography.caption, color: palette.ash },
  chipTextOn: { color: palette.goldText, fontFamily: Fonts.displayMedium },
});
