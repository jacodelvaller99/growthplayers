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

import { GoldDivider, PremiumCard, screen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { BREATHING_TECHNIQUES, type BreathingTechnique } from '@/data/wellness';
import { useLifeFlow } from '@/hooks/use-lifeflow';
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

// ─── Breathing Player Component ───────────────────────────────────────────────

function BreathPlayer({
  technique,
  onComplete,
  onExit,
}: {
  technique: BreathingTechnique;
  onComplete: (durationSecs: number) => void;
  onExit: () => void;
}) {
  const { startSession: storeStart, stopSession: storeStop, setElapsed: storeElapsed } = useWellnessStore();
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [phaseTime, setPhaseTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const startTimeRef = useRef<number>(0);
  const phaseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const targetCycles = technique.cycles;
  const phases = technique.phases;

  // Idle pulse animation
  useEffect(() => {
    if (!running) {
      const pulse = Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0,  duration: 1800, useNativeDriver: true }),
      ]);
      Animated.loop(pulse).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [running, pulseAnim]);

  const animatePhase = useCallback((idx: number) => {
    const phase = phases[idx];
    Animated.timing(scaleAnim, {
      toValue: phase.scale,
      duration: phase.duration * 1000,
      useNativeDriver: true,
    }).start();
    haptic('light');
  }, [phases, scaleAnim]);

  const startSession = useCallback(() => {
    setRunning(true);
    setPhaseIdx(0);
    setCycleCount(0);
    setPhaseTime(0);
    startTimeRef.current = Date.now();
    haptic('medium');
    animatePhase(0);
    // Wire to global wellness store so mini player appears
    const targetSecs = Math.round(
      phases.reduce((acc, p) => acc + p.duration, 0) * targetCycles,
    );
    storeStart({ type: 'breathing', sessionName: technique.title, targetSeconds: targetSecs });
  }, [animatePhase, phases, targetCycles, technique.title, storeStart]);

  // Phase timer — advances phases
  useEffect(() => {
    if (!running) return;

    const phase = phases[phaseIdx];
    let elapsed = 0;

    phaseTimerRef.current = setInterval(() => {
      elapsed += 0.1;
      setPhaseTime(elapsed);

      if (elapsed >= phase.duration) {
        clearInterval(phaseTimerRef.current!);
        const nextIdx = (phaseIdx + 1) % phases.length;
        const nextCycle = nextIdx === 0 ? cycleCount + 1 : cycleCount;

        if (nextIdx === 0 && nextCycle >= targetCycles) {
          // Done
          setRunning(false);
          setDone(true);
          haptic('success');
          scaleAnim.setValue(1);
          storeStop();
          onComplete(Math.round((Date.now() - startTimeRef.current) / 1000));
        } else {
          setCycleCount(nextCycle);
          setPhaseIdx(nextIdx);
          setPhaseTime(0);
          animatePhase(nextIdx);
        }
      }
    }, 100);

    return () => {
      if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phaseIdx, cycleCount]);

  // Total time counter + sync elapsed to wellness store
  useEffect(() => {
    if (!running) return;
    totalTimerRef.current = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      setTotalTime(elapsed);
      storeElapsed(elapsed);
    }, 1000);
    return () => { if (totalTimerRef.current) clearInterval(totalTimerRef.current); };
  }, [running, storeElapsed]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const currentPhase = phases[phaseIdx];

  return (
    <View style={player.root}>
      {/* Header */}
      <View style={player.header}>
        <Pressable onPress={onExit} style={player.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={player.titleText}>{technique.title}</Text>
        <Text style={player.timer}>{formatTime(totalTime)}</Text>
      </View>

      {/* Description */}
      <Text style={player.desc}>{technique.description}</Text>

      {/* Circle */}
      <View style={player.circleWrap}>
        <Animated.View
          style={[
            player.outerRing,
            { transform: [{ scale: running ? scaleAnim : pulseAnim }] },
          ]}>
          <View style={player.circle}>
            {running || done ? (
              <>
                <Text style={player.phaseLabel}>
                  {done ? '✓' : currentPhase.label}
                </Text>
                {running && (
                  <Text style={player.phaseCount}>
                    {Math.ceil(currentPhase.duration - phaseTime)}s
                  </Text>
                )}
              </>
            ) : (
              <MaterialIcons name={technique.icon as React.ComponentProps<typeof MaterialIcons>['name']} size={40} color={palette.gold} />
            )}
          </View>
        </Animated.View>
      </View>

      {/* Phase indicator & cycle counter */}
      <View style={player.infoRow}>
        <View style={player.cycleBox}>
          <Text style={player.cycleValue}>{cycleCount}</Text>
          <Text style={player.cycleLabel}>/ {targetCycles} ciclos</Text>
        </View>
        <View style={player.phaseDots}>
          {phases.map((p, i) => (
            <View
              key={i}
              style={[player.phaseDot, i === phaseIdx && running && player.phaseDotActive]}
            />
          ))}
        </View>
      </View>

      {/* CTA */}
      {!running && !done && (
        <Pressable style={player.startBtn} onPress={startSession}>
          <MaterialIcons name="play-arrow" size={24} color={palette.black} />
          <Text style={player.startBtnText}>INICIAR</Text>
        </Pressable>
      )}
      {done && (
        <View style={player.doneBox}>
          <Text style={player.doneText}>SESIÓN COMPLETADA</Text>
          <Pressable style={player.startBtn} onPress={onExit}>
            <Text style={player.startBtnText}>CONTINUAR</Text>
          </Pressable>
        </View>
      )}
      {running && (
        <Pressable style={player.stopBtn} onPress={() => { setRunning(false); scaleAnim.setValue(1); storeStop(); }}>
          <MaterialIcons name="stop" size={20} color={palette.ash} />
          <Text style={player.stopBtnText}>DETENER</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RespiracionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saveWellnessSession } = useLifeFlow();
  const [active, setActive] = useState<BreathingTechnique | null>(null);

  const handleComplete = useCallback(async (technique: BreathingTechnique, secs: number) => {
    await saveWellnessSession({
      type: 'breathing',
      sessionName: technique.title,
      durationSeconds: secs,
      completedAt: new Date().toISOString(),
      metadata: { techniqueId: technique.id, cycles: technique.cycles },
    });
    haptic('success');
  }, [saveWellnessSession]);

  if (active) {
    return (
      <BreathPlayer
        technique={active}
        onComplete={(secs) => handleComplete(active, secs)}
        onExit={() => setActive(null)}
      />
    );
  }

  return (
    <ScrollView
      style={screen.root}
      contentContainerStyle={[screen.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={styles.title}>RESPIRACIÓN</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.intro}>
        Controla tu sistema nervioso con precisión. Elige una técnica.
      </Text>

      <GoldDivider label="TÉCNICAS" />

      {BREATHING_TECHNIQUES.map((tech) => (
        <Pressable
          key={tech.id}
          onPress={() => { haptic('light'); setActive(tech); }}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
          <PremiumCard style={styles.cardInner}>
            <View style={styles.cardTop}>
              <View style={styles.iconBox}>
                <MaterialIcons name={tech.icon as React.ComponentProps<typeof MaterialIcons>['name']} size={24} color={palette.gold} />
              </View>
              <View style={styles.cardMeta}>
                <Text style={styles.cardTitle}>{tech.title}</Text>
                <Text style={styles.cardSubtitle}>{tech.subtitle}</Text>
              </View>
              <MaterialIcons name="play-circle" size={32} color={palette.gold} />
            </View>
            <Text style={styles.cardDesc}>{tech.description}</Text>
            <Text style={styles.cardBenefit}>{tech.benefit}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardCycles}>{tech.cycles} ciclos</Text>
            </View>
          </PremiumCard>
        </Pressable>
      ))}

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
    color: palette.ivory,
    fontSize: 18,
  },
  intro: {
    ...typography.body,
    color: palette.ash,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardPressed: {
    opacity: 0.8,
  },
  cardInner: {
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: palette.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: {
    flex: 1,
  },
  cardTitle: {
    ...typography.section,
    color: palette.ivory,
    fontSize: 16,
    letterSpacing: 2.5,
  },
  cardSubtitle: {
    ...typography.body,
    color: palette.gold,
    fontSize: 12,
    marginTop: 2,
  },
  cardDesc: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 12,
  },
  cardBenefit: {
    ...typography.body,
    color: palette.smoke,
    fontSize: 12,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cardCycles: {
    ...typography.label,
    color: palette.goldMuted,
  },
});

const player = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.black,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 56,
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    ...typography.section,
    color: palette.ivory,
    fontSize: 16,
    letterSpacing: 3,
  },
  timer: {
    fontFamily: Fonts.mono,
    color: palette.smoke,
    fontSize: 14,
    letterSpacing: 1,
  },
  desc: {
    ...typography.body,
    color: palette.smoke,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  circleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xxl,
  },
  outerRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: palette.gold + '44',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: palette.gold + '18',
    borderWidth: 2,
    borderColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseLabel: {
    ...typography.section,
    color: palette.gold,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
  },
  phaseCount: {
    fontFamily: Fonts.display,
    color: palette.ivory,
    fontSize: 36,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.xxl,
  },
  cycleBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  cycleValue: {
    fontFamily: Fonts.display,
    color: palette.gold,
    fontSize: 28,
  },
  cycleLabel: {
    ...typography.body,
    color: palette.smoke,
    fontSize: 13,
  },
  phaseDots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.charcoal,
  },
  phaseDotActive: {
    backgroundColor: palette.gold,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.gold,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.lg,
    borderRadius: radii.sm,
  },
  startBtnText: {
    ...typography.label,
    color: palette.black,
    fontSize: 14,
    fontWeight: '700',
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderColor: palette.smoke,
    borderWidth: 1,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
  },
  stopBtnText: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 12,
  },
  doneBox: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  doneText: {
    ...typography.section,
    color: palette.gold,
    letterSpacing: 3,
  },
});
