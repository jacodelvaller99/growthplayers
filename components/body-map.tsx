/**
 * BodyMap — señala dónde lo sientes.
 *
 * El check-in pregunta cuánto (energía, claridad, tensión, sueño) y nunca
 * dónde. "Tensión 8" no distingue una mandíbula apretada de un estómago
 * cerrado, y se regulan distinto. Tocar la silueta toma dos segundos y da una
 * señal que ningún deslizador da.
 *
 * El significado vive en `lib/bodyMapLogic.ts` (puro, testeado, con el filtro
 * anti-lenguaje-clínico). La GEOMETRÍA del cuerpo vive en
 * `lib/humanFigureLogic.ts` (también puro y testeado): una figura humana real
 * —cabeza, cuello, hombros, brazos, piernas— descrita con elipses y cápsulas
 * y renderizada como una nube de puntos, no como siete rectángulos con borde.
 * Aquí solo vive el SVG y el tacto.
 *
 * El punto se ve pequeño; el objetivo tiene que ser grande. Los puntos
 * dibujan el cuerpo, pero lo que se toca es un rectángulo invisible bastante
 * más generoso que el racimo de puntos de esa zona — calculado por
 * `computeTouchRegions`/`expandToTouchTarget` a partir de la figura real, no
 * a mano: en react-native-web, `hitSlop` no existe, así que el rectángulo
 * invisible ES el área de toque completa.
 */
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { BodyMap3D } from '@/components/body-map-3d';
import { Fonts, palette, spacing, typography } from '@/constants/theme';
import { BODY_ZONES, ZONE_LABEL, type BodyZone } from '@/lib/bodyMapLogic';
import {
  computeTouchRegions,
  expandToTouchTarget,
  generateFigure,
  VIEWBOX,
  type FigureDot,
} from '@/lib/humanFigureLogic';

export interface BodyMapProps {
  selected: BodyZone[];
  onToggle: (zone: BodyZone) => void;
}

/** Semilla fija: la figura es la misma en cada sesión, en cada dispositivo —
 *  es un activo de marca, no un efecto aleatorio en pantalla. */
const FIGURE = generateFigure({ seed: 90417 });
const TOUCH_REGIONS = expandToTouchTarget(computeTouchRegions(FIGURE));

function dotColor(dot: FigureDot, selected: BodyZone[]): { fill: string; opacity: number } {
  const idx = dot.zone ? selected.indexOf(dot.zone) : -1;
  if (idx === 0) {
    // La primera zona tocada manda (`readBody` enruta por `zones[0]`): oro
    // macizo, la misma gramática que el resto de la marca usa para "lo
    // elegido" — nunca un borde de más, un relleno sólido.
    return { fill: palette.gold, opacity: dot.edge ? 0.55 : 1 };
  }
  if (idx > 0) {
    // Zonas señaladas después de la primera: oro, pero tintado — recorrido,
    // no elegido.
    return { fill: palette.goldText, opacity: dot.edge ? 0.3 : 0.75 };
  }
  return { fill: palette.silhouette, opacity: dot.edge ? 0.35 : 0.85 };
}

export function BodyMap({ selected, onToggle }: BodyMapProps) {
  // El resplandor detrás de la zona primaria: unos puntos dorados grandes y
  // muy tenues DEBAJO de la figura, no un filtro de blur — `react-native-svg`
  // soporta `<filter>` de forma desigual entre nativo y web, y esta ronda no
  // vuelve a meter esa clase de trampa cruzada de plataforma.
  const glow = useMemo(() => {
    const primary = selected[0];
    if (!primary) return null;
    const pts = FIGURE.filter((d) => d.zone === primary && !d.edge);
    if (!pts.length) return null;
    const cx = pts.reduce((s, d) => s + d.x, 0) / pts.length;
    const cy = pts.reduce((s, d) => s + d.y, 0) / pts.length;
    return { cx, cy };
  }, [selected]);

  return (
    <View style={s.root}>
      <View style={s.canvas} accessibilityRole="none">
        {/* Web: la nube de partículas 3D real (three.js), validada contra el
            prototipo de diseño aprobado. Nativo: sigue en SVG 2D hasta que
            exista un build (`eas build`) que pueda correr `expo-gl` —
            `BodyMap3D` nativo es un stub inalcanzable, ver
            `components/body-map-3d.tsx`. La zona se elige con el legend de
            abajo en ambos casos; el toque directo sobre el cuerpo es
            exclusivo de la versión 2D. */}
        {Platform.OS === 'web' && <BodyMap3D selected={selected} />}
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`}
          style={[StyleSheet.absoluteFillObject as never, Platform.OS === 'web' && { display: 'none' }]}>
          {glow && (
            <Circle cx={glow.cx} cy={glow.cy} r={46} fill={palette.gold} opacity={0.1} />
          )}
          {FIGURE.map((dot, i) => {
            const { fill, opacity } = dotColor(dot, selected);
            return <Circle key={i} cx={dot.x} cy={dot.y} r={dot.r} fill={fill} opacity={opacity} />;
          })}
        </Svg>

        {Platform.OS !== 'web' && TOUCH_REGIONS.map((region, i) => {
          const on = selected.includes(region.zone);
          const { x0, y0, x1, y1 } = region.bounds;
          return (
            <Pressable
              key={`${region.zone}-${i}`}
              onPress={() => {
                // El gesto más corporal de la app era el único sin háptica,
                // mientras el resto de la pantalla vibra. Tocarte y que el
                // teléfono no responda rompe justo la sensación que buscamos.
                if (Platform.OS !== 'web') {
                  if (on) Haptics.selectionAsync();
                  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                onToggle(region.zone);
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={ZONE_LABEL[region.zone]}
              // La silueta y la lista repiten las 7 zonas: sin esto, un lector
              // de pantalla lee catorce casillas con el mismo nombre.
              accessibilityHint="En la silueta"
              style={{
                position: 'absolute',
                left: `${(x0 / VIEWBOX.w) * 100}%`,
                top: `${(y0 / VIEWBOX.h) * 100}%`,
                width: `${((x1 - x0) / VIEWBOX.w) * 100}%`,
                height: `${((y1 - y0) / VIEWBOX.h) * 100}%`,
              }}
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
  // El aspecto sigue al viewBox real (300×486) para que la figura no se
  // distorsione — con `width:'100%'` escala igual en cualquier ancho.
  canvas: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 300,
    aspectRatio: VIEWBOX.w / VIEWBOX.h,
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
