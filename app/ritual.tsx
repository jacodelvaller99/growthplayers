/**
 * El Umbral — ritual de entrada, primera apertura del DÍA.
 *
 * "Apenas abrimos la app debemos respirar y tenemos que venderle a la
 * persona que debe sí o sí respirar porque está a punto de entrar en una
 * app que le va a cambiar la perspectiva." Se interpone entre `index` y el
 * check-in/dashboard — una sola vez por día (`ritualLogic.needsRitual`).
 *
 * Guiado = respiración en caja (mismo patrón 4·4·4·4 que checkin.tsx, en
 * versión standalone). Libre = salta directo, sin negar el paso: la jornada
 * de hoy queda igual de pendiente que si no hubiera entrado.
 */
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, screen } from '@/components/polaris';
import { Fonts, palette, spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { withRitualDone, RITUAL_LOG_KEY, type RitualMode } from '@/lib/ritualLogic';
import { localDateKey } from '@/lib/jornadaLogic';
import { logSilentError } from '@/lib/observability';
import { writeLocal } from '@/storage/local';

const BOX_PHASES = [
  { label: 'INHALA', duration: 4, scale: 1.25 },
  { label: 'SOSTÉN', duration: 4, scale: 1.25 },
  { label: 'EXHALA', duration: 4, scale: 0.78 },
  { label: 'SOSTÉN', duration: 4, scale: 0.78 },
] as const;
const CYCLES = 4; // ~64s — umbral corto, no una sesión completa

const ORB = 140;

type Phase = 'venta' | 'breathing' | 'done';

export default function RitualScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('venta');
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseLeft, setPhaseLeft] = useState<number>(BOX_PHASES[0].duration);
  const [cycles, setCycles] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const finish = useCallback(async (mode: RitualMode) => {
    try {
      await writeLocal(RITUAL_LOG_KEY, withRitualDone(localDateKey(new Date()), mode));
    } catch (e) {
      logSilentError('ritual.finish', e);
    }
    router.replace('/checkin');
  }, [router]);

  const animatePhase = useCallback((idx: number) => {
    const p = BOX_PHASES[idx];
    if (reducedMotion) {
      scaleAnim.setValue(p.scale);
    } else {
      Animated.timing(scaleAnim, { toValue: p.scale, duration: p.duration * 1000, useNativeDriver: true }).start();
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [reducedMotion, scaleAnim]);

  useEffect(() => {
    if (phase !== 'breathing') return;
    tickRef.current = setInterval(() => {
      setPhaseLeft((left) => {
        if (left > 1) return left - 1;
        const nextIdx = (phaseIdx + 1) % BOX_PHASES.length;
        if (nextIdx === 0) setCycles((c) => c + 1);
        setPhaseIdx(nextIdx);
        animatePhase(nextIdx);
        return BOX_PHASES[nextIdx].duration;
      });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, phaseIdx]);

  useEffect(() => {
    if (phase === 'breathing' && cycles >= CYCLES) {
      if (tickRef.current) clearInterval(tickRef.current);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase('done');
    }
  }, [cycles, phase]);

  const startBreathing = () => {
    setPhase('breathing');
    setPhaseIdx(0);
    setPhaseLeft(BOX_PHASES[0].duration);
    setCycles(0);
    animatePhase(0);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const currentPhase = BOX_PHASES[phaseIdx];

  return (
    <View style={[screen.root, styles.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      {phase === 'venta' && (
        <View style={styles.center}>
          <Text style={styles.tag}>ANTES DE ENTRAR</Text>
          <Text style={styles.title}>Estás a punto de entrar a{'\n'}algo que te va a cambiar{'\n'}la perspectiva.</Text>
          <Text style={styles.body}>
            Es fundamental: respira antes. 64 segundos de respiración en caja para que llegues al
            resto de tu día con el sistema calibrado, no en piloto automático.
          </Text>
          <PrimaryButton label="RESPIRAR AHORA" icon="air" onPress={startBreathing} />
          <Pressable
            onPress={() => void finish('libre')}
            accessibilityRole="button"
            accessibilityLabel="Entrar por mi cuenta, sin el ritual"
            style={({ pressed }) => [styles.skip, pressed && { opacity: 0.6 }]}>
            <Text style={styles.skipText}>Entrar por mi cuenta</Text>
          </Pressable>
        </View>
      )}

      {phase === 'breathing' && (
        <View style={styles.center}>
          <Text style={styles.tag}>CICLO {Math.min(cycles + 1, CYCLES)}/{CYCLES}</Text>
          <View style={styles.orbStage}>
            <View style={styles.orbRing} />
            <Animated.View style={[styles.orb, { transform: [{ scale: scaleAnim }] }]}>
              <Text style={styles.orbPhase}>{currentPhase.label}</Text>
              <Text style={styles.orbCount}>{phaseLeft}</Text>
            </Animated.View>
          </View>
        </View>
      )}

      {phase === 'done' && (
        <View style={styles.center}>
          <Text style={styles.tag}>LISTO</Text>
          <Text style={styles.title}>Ahora sí.</Text>
          <Text style={styles.body}>Tu sistema está calibrado. Sigamos.</Text>
          <PrimaryButton label="CONTINUAR" icon="arrow-forward" onPress={() => void finish('guiado')} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', backgroundColor: palette.black, justifyContent: 'center' },
  center: { alignItems: 'center', gap: spacing.lg, maxWidth: 380, paddingHorizontal: spacing.xl },
  tag: { color: palette.goldText, fontFamily: Fonts.display, fontSize: 11, letterSpacing: 2 },
  title: {
    color: palette.ivory, fontFamily: Fonts.display, fontSize: 26, fontWeight: '800',
    lineHeight: 32, textAlign: 'center', textTransform: 'uppercase',
  },
  body: { color: palette.ash, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  skip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.lg },
  skipText: { color: palette.smoke, fontFamily: Fonts.display, fontSize: 12, letterSpacing: 1 },
  orbStage: { alignItems: 'center', justifyContent: 'center', height: ORB * 1.45, width: ORB * 1.45 },
  orbRing: {
    position: 'absolute', width: ORB * 1.4, height: ORB * 1.4, borderRadius: (ORB * 1.4) / 2,
    borderWidth: 1, borderColor: palette.lineGold, opacity: 0.35,
  },
  orb: {
    width: ORB, height: ORB, borderRadius: ORB / 2, borderWidth: 1.5, borderColor: palette.lineGold,
    backgroundColor: palette.goldLight, alignItems: 'center', justifyContent: 'center',
  },
  orbPhase: { fontFamily: Fonts.display, color: palette.goldText, fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  orbCount: { fontFamily: Fonts.display, color: palette.ivory, fontSize: 36, fontWeight: '700', marginTop: 2 },
});
