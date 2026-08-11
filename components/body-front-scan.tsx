/**
 * BodyFrontScan — base visual de alta fidelidad para el check-in.
 *
 * La anatomía vive en un único asset frontal optimizado. React Native solo
 * anima respiración, pulso, selección y barrido: así la cara, las manos y los
 * filamentos conservan el mismo detalle en web, iOS y Android sin seis
 * contextos WebGL ni una nube procedural distinta por plataforma.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { useReducedMotion } from '@/hooks/use-reduced-motion';
import type { BodyZone } from '@/lib/bodyMapLogic';
import type { BodyPoint } from '@/lib/bodyPointLogic';

// Asset aprobado por el dueño: conservar el PNG original, sin reinterpretar
// anatomía, partículas ni color durante el render.
const BODY_FRONT = require('../assets/images/checkin-body-interactive.png');

/** Proporción real 1024×1536: no estirar anatomía para llenar. */
export const BODY_FRONT_ASPECT = 1024 / 1536;

interface BodyFrontScanProps {
  selected: BodyZone[];
  points?: readonly BodyPoint[];
}

interface GlowPosition {
  x: `${number}%`;
  y: `${number}%`;
  size: number;
}

const ZONE_GLOW: Record<Exclude<BodyZone, 'manos'>, GlowPosition> = {
  cabeza: { x: '50%', y: '8%', size: 70 },
  mandibula: { x: '50%', y: '15%', size: 62 },
  garganta: { x: '50%', y: '19%', size: 66 },
  hombros: { x: '50%', y: '24%', size: 140 },
  pecho: { x: '50%', y: '27%', size: 106 },
  estomago: { x: '50%', y: '42%', size: 92 },
  espalda: { x: '35%', y: '35%', size: 88 },
  brazos: { x: '50%', y: '38%', size: 170 },
  cadera: { x: '50%', y: '54%', size: 100 },
  piernas: { x: '50%', y: '73%', size: 190 },
  pies: { x: '50%', y: '94%', size: 140 },
};

const HAND_GLOWS: readonly GlowPosition[] = [
  { x: '20%', y: '51%', size: 68 },
  { x: '80%', y: '51%', size: 68 },
];

const SPARKS: readonly { x: `${number}%`; y: `${number}%`; size: number }[] = [
  { x: '44%', y: '21%', size: 2 },
  { x: '57%', y: '24%', size: 3 },
  { x: '39%', y: '29%', size: 2 },
  { x: '63%', y: '33%', size: 2 },
  { x: '48%', y: '38%', size: 2 },
  { x: '53%', y: '46%', size: 2 },
];

function positionsFor(zone: BodyZone | undefined): readonly GlowPosition[] {
  if (!zone) return [];
  if (zone === 'manos') return HAND_GLOWS;
  return [ZONE_GLOW[zone]];
}

export function BodyFrontScan({ selected, points = [] }: BodyFrontScanProps) {
  const reducedMotion = useReducedMotion();
  const breath = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const scan = useRef(new Animated.Value(0)).current;
  const glows = useMemo(() => points.length ? [] : positionsFor(selected[0]), [points.length, selected]);

  useEffect(() => {
    if (reducedMotion) {
      breath.setValue(0.35);
      pulse.setValue(0.45);
      scan.setValue(0.5);
      return;
    }

    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const heartbeat = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 720,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1280,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const scanner = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scan, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(900),
      ]),
    );

    breathing.start();
    heartbeat.start();
    scanner.start();
    return () => {
      breathing.stop();
      heartbeat.stop();
      scanner.stop();
    };
  }, [breath, pulse, reducedMotion, scan]);

  const bodyScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] });
  const bodyOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.22] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 0.42, 1], outputRange: [0.22, 0.82, 0.12] });
  const markerOpacity = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.72, 1, 0.78] });
  const scanY = scan.interpolate({ inputRange: [0, 1], outputRange: [-205, 205] });
  const scanOpacity = scan.interpolate({ inputRange: [0, 0.08, 0.92, 1], outputRange: [0, 0.55, 0.55, 0] });

  return (
    <View style={s.root} pointerEvents="none">
      <Animated.View style={[s.bodyStage, { opacity: bodyOpacity, transform: [{ scale: bodyScale }] }]}>
        <Image
          source={BODY_FRONT}
          style={s.image}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={reducedMotion ? 0 : 220}
          accessible={false}
        />
      </Animated.View>

      {/* El corazón ya existe en el asset; esta capa solo le da vida. */}
      <Animated.View
        style={[
          s.heartPulse,
          { opacity: pulseOpacity, transform: [{ translateX: -52 }, { translateY: -52 }, { scale: pulseScale }] },
        ]}>
        <View style={s.heartRingOuter} />
        <View style={s.heartRingInner} />
      </Animated.View>

      {/* Respuesta inmediata a la primera zona señalada. */}
      {glows.map((glow, index) => (
        <Animated.View
          key={`${selected[0]}-${index}`}
          style={[
            s.zoneGlow,
            {
              left: glow.x,
              top: glow.y,
              width: glow.size,
              height: glow.size,
              borderRadius: glow.size / 2,
              opacity: pulseOpacity,
              transform: [
                { translateX: -glow.size / 2 },
                { translateY: -glow.size / 2 },
                { scale: pulseScale },
              ],
            },
          ]}
        />
      ))}

      {/* Cada toque exacto permanece sobre la misma anatomía como retícula. */}
      {points.map((point, index) => (
        <Animated.View
          key={`${point.x}-${point.y}-${index}`}
          style={[
            s.pointMarker,
            {
              left: `${point.x * 100}%`,
              top: `${point.y * 100}%`,
              opacity: markerOpacity,
              transform: [{ translateX: -19 }, { translateY: -19 }, { scale: pulseScale }],
            },
          ]}>
          <View style={s.pointMarkerRing} />
          <View style={s.pointMarkerCore} />
          <View style={s.pointMarkerHorizontal} />
          <View style={s.pointMarkerVertical} />
        </Animated.View>
      ))}

      <View style={s.scanWindow}>
        <Animated.View style={[s.scanLine, { opacity: scanOpacity, transform: [{ translateY: scanY }] }]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,200,4,0.72)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      {SPARKS.map((spark, index) => (
        <Animated.View
          key={`${spark.x}-${spark.y}`}
          style={[
            s.spark,
            {
              left: spark.x,
              top: spark.y,
              width: spark.size,
              height: spark.size,
              borderRadius: spark.size / 2,
              opacity: index % 2 ? pulseOpacity : bodyOpacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  bodyStage: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  heartPulse: {
    alignItems: 'center',
    height: 104,
    justifyContent: 'center',
    left: '50%',
    position: 'absolute',
    top: '27%',
    width: 104,
  },
  heartRingOuter: {
    borderColor: 'rgba(255,200,4,0.44)',
    borderRadius: 52,
    borderWidth: 1,
    height: 104,
    position: 'absolute',
    width: 104,
  },
  heartRingInner: {
    backgroundColor: 'rgba(255,200,4,0.11)',
    borderColor: 'rgba(255,200,4,0.76)',
    borderRadius: 27,
    borderWidth: 1,
    height: 54,
    width: 54,
  },
  zoneGlow: {
    backgroundColor: 'rgba(255,200,4,0.11)',
    borderColor: 'rgba(255,200,4,0.58)',
    borderWidth: 1,
    position: 'absolute',
  },
  pointMarker: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    position: 'absolute',
    width: 38,
  },
  pointMarkerRing: {
    borderColor: 'rgba(255,200,4,0.92)',
    borderRadius: 19,
    borderWidth: 1,
    height: 38,
    position: 'absolute',
    width: 38,
  },
  pointMarkerCore: {
    backgroundColor: '#FFF4B0',
    borderRadius: 4,
    height: 8,
    shadowColor: '#FFC804',
    shadowOpacity: 0.9,
    shadowRadius: 7,
    width: 8,
  },
  pointMarkerHorizontal: {
    backgroundColor: 'rgba(255,200,4,0.58)',
    height: 1,
    position: 'absolute',
    width: 54,
  },
  pointMarkerVertical: {
    backgroundColor: 'rgba(255,200,4,0.58)',
    height: 54,
    position: 'absolute',
    width: 1,
  },
  scanWindow: {
    bottom: '7%',
    left: '8%',
    overflow: 'hidden',
    position: 'absolute',
    right: '8%',
    top: '7%',
  },
  scanLine: {
    height: 12,
    left: 0,
    position: 'absolute',
    right: 0,
    top: '50%',
  },
  spark: {
    backgroundColor: '#FFC804',
    position: 'absolute',
  },
});
