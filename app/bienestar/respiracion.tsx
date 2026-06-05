import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScreen } from '@/components/polaris';
import SafetyWarning from '@/components/SafetyWarning';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { BREATHING_TECHNIQUES, type BreathingTechnique } from '@/data/wellness';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { analytics } from '@/lib/analytics';
import { useWellnessStore } from '@/store/wellnessStore';

// ─── Haptic helper (web-safe) ─────────────────────────────────────────────────
function haptic(type: 'light' | 'medium' | 'success') {
  if (Platform.OS === 'web') return;
  if (type === 'success') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    Haptics.impactAsync(
      type === 'medium'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    );
  }
}

// ─── Orb geometry ─────────────────────────────────────────────────────────────
// Design: outer rings 300px; orb scales between ~200 (idle) and 195–240 (active).
// We use a fixed 200px base orb and drive expansion via Animated scale per phase.
const ORB_BASE = 200;
const RING_OUTER = 300;
const RING_INNER = 240;

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RespiracionScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saveWellnessSession } = useLifeFlow();
  const {
    startSession: storeStart,
    stopSession: storeStop,
    setElapsed: storeElapsed,
  } = useWellnessStore();

  const [tech, setTech] = useState<BreathingTechnique>(BREATHING_TECHNIQUES[0]);
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseLeft, setPhaseLeft] = useState(BREATHING_TECHNIQUES[0].phases[0].duration);
  const [cycles, setCycles] = useState(0);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const phaseTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const phases = tech.phases;
  const currentPhase = phases[phaseIdx];

  // Idle pulse when not running
  useEffect(() => {
    if (running) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [running, pulseAnim]);

  // Animate orb scale to the current phase target
  const animatePhase = useCallback((idx: number) => {
    const phase = phases[idx];
    Animated.timing(scaleAnim, {
      toValue: phase.scale,
      duration: phase.duration * 1000,
      useNativeDriver: true,
    }).start();
    haptic('light');
  }, [phases, scaleAnim]);

  // Phase countdown + advance (1s tick, mirrors design)
  useEffect(() => {
    if (!running) return;

    phaseTickRef.current = setInterval(() => {
      setPhaseLeft((left) => {
        if (left > 1) return left - 1;
        // advance to next phase
        const nextIdx = (phaseIdx + 1) % phases.length;
        if (nextIdx === 0) setCycles((c) => c + 1);
        setPhaseIdx(nextIdx);
        animatePhase(nextIdx);
        return phases[nextIdx].duration;
      });
    }, 1000);

    return () => {
      if (phaseTickRef.current) clearInterval(phaseTickRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phaseIdx, tech.id]);

  // Total elapsed → wellness store (mini player)
  useEffect(() => {
    if (!running) return;
    totalTimerRef.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      storeElapsed(elapsed);
    }, 1000);
    return () => { if (totalTimerRef.current) clearInterval(totalTimerRef.current); };
  }, [running, storeElapsed]);

  const start = useCallback(() => {
    setRunning(true);
    setPhaseIdx(0);
    setPhaseLeft(phases[0].duration);
    setCycles(0);
    startTimeRef.current = Date.now();
    haptic('medium');
    animatePhase(0);
    const targetSecs = Math.round(
      phases.reduce((acc, p) => acc + p.duration, 0) * tech.cycles,
    );
    storeStart({ type: 'breathing', sessionName: tech.title, targetSeconds: targetSecs });
  }, [animatePhase, phases, tech.cycles, tech.title, storeStart]);

  const stop = useCallback(async () => {
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    setRunning(false);
    scaleAnim.stopAnimation();
    scaleAnim.setValue(1);
    storeStop();
    if (cycles > 0 && elapsed > 5) {
      await saveWellnessSession({
        type: 'breathing',
        sessionName: tech.title,
        durationSeconds: elapsed,
        completedAt: new Date().toISOString(),
        metadata: { techniqueId: tech.id, cycles },
      });
      analytics.breathingComplete(tech.title, cycles, elapsed * 1000);
      haptic('success');
    }
  }, [cycles, saveWellnessSession, scaleAnim, storeStop, tech.id, tech.title]);

  const selectTech = useCallback((t: BreathingTechnique) => {
    // switching technique resets the session
    if (running) {
      setRunning(false);
      scaleAnim.stopAnimation();
      scaleAnim.setValue(1);
      storeStop();
    }
    setTech(t);
    setPhaseIdx(0);
    setPhaseLeft(t.phases[0].duration);
    setCycles(0);
    haptic('light');
  }, [running, scaleAnim, storeStop]);

  return (
    <View style={sc.root}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityLabel="Volver"
            accessibilityRole="button">
            <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
          </Pressable>
          <Text style={styles.title}>RESPIRACIÓN</Text>
          <View style={styles.backBtn} />
        </View>

        <SafetyWarning
          body="No realices estos ejercicios mientras conduces, en el agua, o de pie. Si estás embarazada, tienes epilepsia, problemas cardíacos o respiratorios, consulta a tu médico antes. Si sientes mareo intenso, detente."
        />

        {/* Orb */}
        <View style={styles.orbStage}>
          <View style={styles.ringOuter} />
          <View style={styles.ringInner} />
          <Animated.View
            style={[
              styles.orb,
              { transform: [{ scale: running ? scaleAnim : pulseAnim }] },
            ]}>
            <View style={styles.orbInner} pointerEvents="none">
              <Text style={styles.orbPhase}>{running ? currentPhase.label : 'LISTO'}</Text>
              <Text style={styles.orbCount}>{running ? phaseLeft : '—'}</Text>
            </View>
          </Animated.View>
        </View>

        <Text style={styles.cyclesLabel}>CICLOS COMPLETADOS · {cycles}</Text>

        {/* Technique chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}>
          {BREATHING_TECHNIQUES.map((t) => {
            const active = t.id === tech.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => selectTech(t)}
                style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                accessibilityRole="button"
                accessibilityLabel={t.title}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.title}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Primary action */}
        <Pressable
          onPress={() => (running ? stop() : start())}
          style={[styles.cta, running ? styles.ctaOutline : styles.ctaGold]}
          accessibilityRole="button"
          accessibilityLabel={running ? 'Detener' : 'Comenzar sesión'}>
          <MaterialIcons
            name={running ? 'stop' : 'play-arrow'}
            size={20}
            color={running ? palette.goldText : palette.ink}
          />
          <Text style={[styles.ctaText, running ? styles.ctaTextOutline : styles.ctaTextGold]}>
            {running ? 'DETENER' : 'COMENZAR SESIÓN'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 430,
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.graphite,
  },
  title: {
    ...typography.title,
    color: palette.ivory,
    fontSize: 18,
  },

  // Orb stage
  orbStage: {
    width: RING_OUTER,
    height: RING_OUTER,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  ringOuter: {
    position: 'absolute',
    width: RING_OUTER - 10,
    height: RING_OUTER - 10,
    borderRadius: (RING_OUTER - 10) / 2,
    borderWidth: 1,
    borderColor: palette.lineGold,
    opacity: 0.4,
  },
  ringInner: {
    position: 'absolute',
    width: RING_INNER,
    height: RING_INNER,
    borderRadius: RING_INNER / 2,
    borderWidth: 1,
    borderColor: palette.lineGold,
    opacity: 0.25,
  },
  orb: {
    width: ORB_BASE,
    height: ORB_BASE,
    borderRadius: ORB_BASE / 2,
    borderWidth: 1.5,
    borderColor: palette.lineGold,
    backgroundColor: palette.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 8,
  },
  orbInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbPhase: {
    fontFamily: Fonts.display,
    color: palette.goldText,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
  },
  orbCount: {
    fontFamily: Fonts.display,
    color: palette.ivory,
    fontSize: 44,
    fontWeight: '700',
    marginTop: 6,
  },

  cyclesLabel: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 11,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },

  // Chips
  chipScroll: {
    flexGrow: 0,
    marginBottom: spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: palette.gold,
  },
  chipInactive: {
    backgroundColor: palette.goldLight,
    borderWidth: 1,
    borderColor: palette.lineGold,
  },
  chipText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: palette.goldMuted,
  },
  chipTextActive: {
    color: palette.ink,
    fontWeight: '700',
  },

  // CTA
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 52,
    borderRadius: radii.sm,
  },
  ctaGold: {
    backgroundColor: palette.gold,
  },
  ctaOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: palette.lineGold,
  },
  ctaText: {
    fontFamily: Fonts.display,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  ctaTextGold: { color: palette.ink },
  ctaTextOutline: { color: palette.goldText },
});
