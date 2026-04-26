import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, G } from 'react-native-svg';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors } from '../constants/Colors';
import { Typography } from '../constants/Typography';
import { Layout } from '../constants/Layout';

// ─── Constants ───────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SVG_SIZE = Math.min(SCREEN_WIDTH - 64, 300);
const CENTER = SVG_SIZE / 2;
const PROGRESS_RADIUS = SVG_SIZE * 0.46;
const CIRCUMFERENCE = 2 * Math.PI * PROGRESS_RADIUS;
const BREATH_BASE_RADIUS = SVG_SIZE * 0.26; // inner circle at rest (0.6 scale)
const PHASE_MS = 4000;
const ROUND_OPTIONS = [3, 5, 10] as const;
type RoundOption = (typeof ROUND_OPTIONS)[number];

// Animated SVG circle
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Phase config ─────────────────────────────────────────────────────────────

type Phase = 'inhale' | 'hold1' | 'exhale' | 'hold2';

const PHASES: Phase[] = ['inhale', 'hold1', 'exhale', 'hold2'];

const PHASE_CFG: Record<
  Phase,
  { label: string; circleScale: number; glowOpacity: number; isHold: boolean }
> = {
  inhale: { label: 'INHALA', circleScale: 1.0, glowOpacity: 0.85, isHold: false },
  hold1:  { label: 'SOSTÉN', circleScale: 1.0, glowOpacity: 0.55, isHold: true  },
  exhale: { label: 'EXHALA', circleScale: 0.6, glowOpacity: 0.28, isHold: false },
  hold2:  { label: 'SOSTÉN', circleScale: 0.6, glowOpacity: 0.20, isHold: true  },
};

const PHASE_HAPTIC: Record<Phase, () => void> = {
  inhale: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  hold1:  () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  exhale: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  hold2:  () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
};

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function RespiracionScreen() {
  const router = useRouter();

  // ── Display state ─────────────────────────────────────────────────────────
  const [phase, setPhase]               = useState<Phase>('inhale');
  const [countdown, setCountdown]       = useState(4);
  const [currentRound, setCurrentRound] = useState(1);
  const [selectedRounds, setSelectedRounds] = useState<RoundOption>(5);
  const [isRunning, setIsRunning]       = useState(false);
  const [isComplete, setIsComplete]     = useState(false);

  // ── Refs (mutable values safe in timer closures) ──────────────────────────
  const phaseIndexRef     = useRef(0);
  const currentRoundRef   = useRef(1);
  const selectedRoundsRef = useRef<number>(5);
  const isRunningRef      = useRef(false);
  const phaseTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cdTimerRef        = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Animations ───────────────────────────────────────────────────────────
  const circleScale   = useSharedValue(BREATH_BASE_RADIUS * 0.6);
  const glowOpacity   = useSharedValue(0.2);
  const progressOff   = useSharedValue(CIRCUMFERENCE);

  // Animated props for the SVG progress ring
  const progressProps = useAnimatedProps(() => ({
    strokeDashoffset: progressOff.value,
  }));

  // Animated styles for the inner breathing circle + glow
  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // ── Keep refs in sync ─────────────────────────────────────────────────────
  useEffect(() => { selectedRoundsRef.current = selectedRounds; }, [selectedRounds]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  // ── Timer helpers ─────────────────────────────────────────────────────────

  const clearTimers = useCallback(() => {
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    if (cdTimerRef.current)    clearInterval(cdTimerRef.current);
    phaseTimerRef.current = null;
    cdTimerRef.current    = null;
  }, []);

  // ── Core phase engine ─────────────────────────────────────────────────────
  // startPhase is stable (empty deps) — reads only from refs

  const startPhase = useCallback((phaseIndex: number) => {
    const phaseName = PHASES[phaseIndex];
    const cfg = PHASE_CFG[phaseName];

    phaseIndexRef.current = phaseIndex;
    setPhase(phaseName);
    setCountdown(4);

    // Haptic
    PHASE_HAPTIC[phaseName]();

    // Circle scale animation
    cancelAnimation(circleScale);
    circleScale.value = withTiming(cfg.circleScale, {
      duration: cfg.isHold ? 200 : PHASE_MS,
      easing: Easing.inOut(Easing.ease),
    });

    // Glow animation
    cancelAnimation(glowOpacity);
    if (cfg.isHold) {
      // Gentle pulse during hold
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(cfg.glowOpacity * 0.55, { duration: 1000 }),
          withTiming(cfg.glowOpacity, { duration: 1000 })
        ),
        2,
        true
      );
    } else {
      glowOpacity.value = withTiming(cfg.glowOpacity, { duration: PHASE_MS });
    }

    // Progress ring — reset to empty then fill over 4s
    cancelAnimation(progressOff);
    progressOff.value = CIRCUMFERENCE;
    progressOff.value = withTiming(0, { duration: PHASE_MS, easing: Easing.linear });

    // Countdown display (1s ticks)
    clearInterval(cdTimerRef.current!);
    let count = 4;
    cdTimerRef.current = setInterval(() => {
      count -= 1;
      setCountdown(Math.max(1, count));
      if (count <= 0) clearInterval(cdTimerRef.current!);
    }, 1000);

    // Phase completion timer
    clearTimeout(phaseTimerRef.current!);
    phaseTimerRef.current = setTimeout(() => {
      clearInterval(cdTimerRef.current!);

      const nextPhaseIndex = (phaseIndex + 1) % 4;

      // End of round (hold2 → back to inhale)
      if (phaseIndex === 3) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const nextRound = currentRoundRef.current + 1;

        if (nextRound > selectedRoundsRef.current) {
          // Session complete
          setIsRunning(false);
          isRunningRef.current = false;
          setIsComplete(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return;
        }

        currentRoundRef.current = nextRound;
        setCurrentRound(nextRound);
      }

      startPhase(nextPhaseIndex);
    }, PHASE_MS);
  }, []); // stable — all accessed via refs

  // ── Controls ──────────────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    if (isComplete) return;
    setIsRunning(true);
    isRunningRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startPhase(phaseIndexRef.current);
  }, [isComplete, startPhase]);

  const handlePause = useCallback(() => {
    setIsRunning(false);
    isRunningRef.current = false;
    clearTimers();
    cancelAnimation(circleScale);
    cancelAnimation(glowOpacity);
    cancelAnimation(progressOff);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [clearTimers]);

  const handleReset = useCallback(() => {
    clearTimers();
    cancelAnimation(circleScale);
    cancelAnimation(glowOpacity);
    cancelAnimation(progressOff);

    phaseIndexRef.current   = 0;
    currentRoundRef.current = 1;
    isRunningRef.current    = false;

    setPhase('inhale');
    setCountdown(4);
    setCurrentRound(1);
    setIsRunning(false);
    setIsComplete(false);

    circleScale.value = withTiming(0.6, { duration: 400 });
    glowOpacity.value = withTiming(0.2, { duration: 400 });
    progressOff.value = CIRCUMFERENCE;
  }, [clearTimers]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  // ── Render ────────────────────────────────────────────────────────────────

  const phaseLabel = PHASE_CFG[phase].label;
  const isMidCycle = phase !== 'inhale' || currentRound > 1;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar barStyle="light-content" />

      {/* Tactical dot grid background */}
      <View style={{ position: 'absolute', inset: 0, opacity: 0.04 }}>
        {Array.from({ length: 20 }).map((_, row) =>
          Array.from({ length: 10 }).map((_, col) => (
            <View
              key={`${row}-${col}`}
              style={{
                position: 'absolute',
                width: 2,
                height: 2,
                borderRadius: 1,
                backgroundColor: Colors.mint,
                top: row * 48 + 24,
                left: col * 40 + 20,
              }}
            />
          ))
        )}
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: Layout.spacing.lg,
            paddingTop: Layout.spacing.md,
            paddingBottom: Layout.spacing.lg,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.surfaceAlt,
              borderWidth: 1,
              borderColor: Colors.mintBorder,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <MaterialCommunityIcons name="arrow-left" size={18} color={Colors.mint} />
          </Pressable>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[Typography.tag, { color: Colors.mint, fontSize: 10, letterSpacing: 3 }]}>
              RESPIRACIÓN TÁCTICA
            </Text>
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary, fontSize: 11 }]}>
              Box Breathing · 4-4-4-4
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* ── Rounds selector (only when idle) ───────────────────────── */}
        {!isRunning && !isComplete && (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: Layout.spacing.xl }}>
            {ROUND_OPTIONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => {
                  setSelectedRounds(r);
                  selectedRoundsRef.current = r;
                  Haptics.selectionAsync();
                }}
                style={({ pressed }) => ({
                  paddingHorizontal: 20,
                  paddingVertical: 8,
                  borderRadius: Layout.borderRadius.round,
                  backgroundColor: selectedRounds === r ? Colors.mint : Colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: selectedRounds === r ? Colors.mint : Colors.mintBorder,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={[
                    Typography.tag,
                    {
                      color: selectedRounds === r ? Colors.background : Colors.textSecondary,
                      fontSize: 12,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {r} RONDAS
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Main circle area ────────────────────────────────────────── */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {/* SVG: grid rings + animated progress arc */}
          <View style={{ width: SVG_SIZE, height: SVG_SIZE }}>
            <Svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}>
              {/* Faint grid concentric rings */}
              {[0.28, 0.35, 0.43].map((ratio, i) => (
                <Circle
                  key={`grid-${i}`}
                  cx={CENTER}
                  cy={CENTER}
                  r={SVG_SIZE * ratio}
                  stroke={Colors.mint}
                  strokeWidth={0.5}
                  fill="none"
                  opacity={0.08}
                  strokeDasharray="4 6"
                />
              ))}

              {/* Outer guide ring */}
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={PROGRESS_RADIUS}
                stroke={Colors.mint}
                strokeWidth={1.5}
                fill="none"
                opacity={0.1}
              />

              {/* Animated progress arc */}
              <AnimatedCircle
                cx={CENTER}
                cy={CENTER}
                r={PROGRESS_RADIUS}
                stroke={Colors.mint}
                strokeWidth={2.5}
                fill="none"
                strokeDasharray={CIRCUMFERENCE}
                strokeLinecap="round"
                strokeOpacity={isRunning ? 0.9 : 0}
                animatedProps={progressProps}
                transform={`rotate(-90 ${CENTER} ${CENTER})`}
              />
            </Svg>

            {/* Glow halo behind the breathing circle */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: CENTER - BREATH_BASE_RADIUS - 18,
                  left: CENTER - BREATH_BASE_RADIUS - 18,
                  width: (BREATH_BASE_RADIUS + 18) * 2,
                  height: (BREATH_BASE_RADIUS + 18) * 2,
                  borderRadius: BREATH_BASE_RADIUS + 18,
                  backgroundColor: Colors.mint,
                  shadowColor: Colors.mint,
                  shadowOpacity: 0.9,
                  shadowRadius: 28,
                  elevation: 12,
                },
                glowStyle,
              ]}
            />

            {/* Breathing circle (animated scale) */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  top: CENTER - BREATH_BASE_RADIUS,
                  left: CENTER - BREATH_BASE_RADIUS,
                  width: BREATH_BASE_RADIUS * 2,
                  height: BREATH_BASE_RADIUS * 2,
                  borderRadius: BREATH_BASE_RADIUS,
                  backgroundColor: 'rgba(174, 254, 240, 0.06)',
                  borderWidth: 2,
                  borderColor: Colors.mint,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: Colors.mint,
                  shadowOpacity: 0.4,
                  shadowRadius: 16,
                  elevation: 8,
                },
                circleStyle,
              ]}
            >
              {/* Phase text inside circle */}
              <Text
                style={[
                  Typography.tag,
                  {
                    color: Colors.mint,
                    fontSize: 11,
                    letterSpacing: 3,
                    marginBottom: 4,
                  },
                ]}
              >
                {isComplete ? '✓' : isRunning ? phaseLabel : 'LISTO'}
              </Text>
              {isRunning && (
                <Text
                  style={[
                    Typography.h2,
                    {
                      color: Colors.mint,
                      fontSize: 36,
                      lineHeight: 40,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {countdown}
                </Text>
              )}
            </Animated.View>
          </View>

          {/* ── Round counter ──────────────────────────────────────── */}
          <View style={{ marginTop: Layout.spacing.xl, alignItems: 'center', gap: 6 }}>
            {isComplete ? (
              <Text style={[Typography.h3, { color: Colors.mint, textAlign: 'center' }]}>
                Sesión Completada
              </Text>
            ) : (
              <>
                <Text style={[Typography.tag, { color: Colors.textSecondary, fontSize: 10, letterSpacing: 2 }]}>
                  RONDA
                </Text>
                <Text style={[Typography.h2, { color: Colors.mint, fontSize: 28 }]}>
                  {currentRound}{' '}
                  <Text style={[Typography.body, { color: Colors.textSecondary, fontSize: 16 }]}>
                    de {selectedRounds}
                  </Text>
                </Text>

                {/* Round dots */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {Array.from({ length: selectedRounds }).map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: i < currentRound - (isRunning ? 0 : 1)
                          ? Colors.mint
                          : Colors.surfaceAlt,
                        borderWidth: 1,
                        borderColor: i === currentRound - 1 && isRunning
                          ? Colors.mint
                          : Colors.mintBorder,
                        shadowColor: i < currentRound ? Colors.mint : 'transparent',
                        shadowOpacity: 0.6,
                        shadowRadius: 4,
                      }}
                    />
                  ))}
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Phase guide (only while running) ───────────────────────── */}
        {isRunning && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 4,
              paddingHorizontal: Layout.spacing.xl,
              marginBottom: Layout.spacing.lg,
            }}
          >
            {PHASES.map((p) => (
              <View
                key={p}
                style={{
                  flex: 1,
                  paddingVertical: 6,
                  borderRadius: 4,
                  backgroundColor: phase === p ? `${Colors.mint}22` : Colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: phase === p ? Colors.mint : Colors.mintBorder,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={[
                    Typography.tag,
                    {
                      color: phase === p ? Colors.mint : Colors.textSecondary,
                      fontSize: 9,
                      letterSpacing: 0.5,
                    },
                  ]}
                >
                  {PHASE_CFG[p].label}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Controls ────────────────────────────────────────────────── */}
        <View
          style={{
            paddingHorizontal: Layout.spacing.xl,
            paddingBottom: Layout.spacing.xxl,
            gap: Layout.spacing.md,
          }}
        >
          {isComplete ? (
            <Pressable
              onPress={handleReset}
              style={({ pressed }) => ({
                height: 52,
                borderRadius: Layout.borderRadius.lg,
                backgroundColor: Colors.mint,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: pressed ? 0.85 : 1,
                shadowColor: Colors.mint,
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6,
              })}
            >
              <Text
                style={[
                  Typography.tag,
                  { color: Colors.background, fontSize: 13, letterSpacing: 2, fontWeight: '700' },
                ]}
              >
                NUEVA SESIÓN
              </Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={isRunning ? handlePause : handleStart}
                style={({ pressed }) => ({
                  height: 52,
                  borderRadius: Layout.borderRadius.lg,
                  backgroundColor: Colors.mint,
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: pressed ? 0.85 : 1,
                  shadowColor: Colors.mint,
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 6,
                })}
              >
                <Text
                  style={[
                    Typography.tag,
                    { color: Colors.background, fontSize: 13, letterSpacing: 2, fontWeight: '700' },
                  ]}
                >
                  {isRunning ? 'PAUSAR' : isMidCycle ? 'REANUDAR' : 'INICIAR'}
                </Text>
              </Pressable>

              {(isRunning || isMidCycle) && (
                <Pressable
                  onPress={handleReset}
                  style={({ pressed }) => ({
                    height: 44,
                    borderRadius: Layout.borderRadius.lg,
                    backgroundColor: Colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: Colors.mintBorder,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={[
                      Typography.tag,
                      { color: Colors.textSecondary, fontSize: 11, letterSpacing: 2 },
                    ]}
                  >
                    REINICIAR
                  </Text>
                </Pressable>
              )}
            </>
          )}

          {/* Protocol note */}
          <Text
            style={[
              Typography.bodySmall,
              {
                color: Colors.textMuted,
                textAlign: 'center',
                fontSize: 10,
                letterSpacing: 0.5,
              },
            ]}
          >
            Protocolo Navy SEAL · Reduce cortisol · Activa modo enfoque
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
