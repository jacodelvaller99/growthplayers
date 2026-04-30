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

import { GoldDivider, PremiumCard, StatusPill, screen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { MEDITATION_SESSIONS, type MeditationSession } from '@/data/wellness';
import { createMeditationAudio } from '@/lib/binaural';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useWellnessStore } from '@/store/wellnessStore';

function haptic(type: 'light' | 'medium' | 'success') {
  if (Platform.OS === 'web') return;
  if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.impactAsync(type === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
}

const CATEGORY_COLOR: Record<string, string> = {
  mañana: '#b07d1a',
  noche:  '#4a6fa5',
  enfoque: '#2e7d52',
  estrés:  '#7c5cbf',
};

const CATEGORY_ICON: Record<string, React.ComponentProps<typeof MaterialIcons>['name']> = {
  mañana:  'wb-sunny',
  noche:   'bedtime',
  enfoque: 'psychology',
  estrés:  'spa',
};

// ─── Circular timer ───────────────────────────────────────────────────────────

function CircleTimer({ progress, size = 200 }: { progress: number; size?: number }) {
  const r = (size - 16) / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - progress);

  // Web SVG-based circle timer
  if (Platform.OS === 'web') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* @ts-ignore web SVG */}
        <svg width={size} height={size} style={{ position: 'absolute' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={palette.charcoal}
            strokeWidth={8}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={palette.gold}
            strokeWidth={8}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
      </View>
    );
  }

  // Native fallback — just a progress ring using border
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 8,
        borderColor: palette.gold,
        opacity: 0.3 + progress * 0.7,
      }}
    />
  );
}

// ─── Meditation Player ────────────────────────────────────────────────────────

function MeditationPlayer({
  session,
  onComplete,
  onExit,
}: {
  session: MeditationSession;
  onComplete: (secs: number) => void;
  onExit: () => void;
}) {
  const { startSession: storeStart, stopSession: storeStop, setElapsed: storeElapsed } = useWellnessStore();
  const totalSeconds = session.durationMinutes * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [currentPhaseText, setCurrentPhaseText] = useState(session.phases[0]?.text ?? '');
  const [phaseIdx, setPhaseIdx] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const audioRef = useRef<ReturnType<typeof createMeditationAudio>>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Idle pulse
  useEffect(() => {
    if (!running) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0,  duration: 2000, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [running, pulseAnim]);

  const startSession = useCallback(() => {
    setRunning(true);
    setRemaining(totalSeconds);
    startTimeRef.current = Date.now();
    haptic('medium');

    // Start audio
    const audio = createMeditationAudio(session.ambientType);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (audioRef as any).current = audio;
    audio?.start();
    audio?.bell();

    // Wire to global wellness store so mini player appears
    storeStart({ type: 'meditation', sessionName: session.title, targetSeconds: totalSeconds });
  }, [totalSeconds, session.ambientType, session.title, storeStart]);

  // Countdown timer
  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setRunning(false);
          setDone(true);
          haptic('success');
          storeStop();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (audioRef as any).current?.bell();
          setTimeout(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (audioRef as any).current?.stop();
          }, 3500);
          onComplete(Math.round((Date.now() - startTimeRef.current) / 1000));
          return 0;
        }
        const elapsed = totalSeconds - (prev - 1);
        storeElapsed(elapsed);
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, onComplete, storeStop, storeElapsed, totalSeconds]);

  // Phase rotation
  useEffect(() => {
    if (!running || !session.phases.length) return;
    let idx = phaseIdx;
    let elapsed = 0;
    const phaseDurations = session.phases.map((p) => p.duration);

    phaseTimerRef.current = setInterval(() => {
      elapsed += 1;
      const dur = phaseDurations[idx];
      if (elapsed >= dur) {
        elapsed = 0;
        idx = (idx + 1) % session.phases.length;
        setPhaseIdx(idx);
        setCurrentPhaseText(session.phases[idx].text);
        haptic('light');
      }
    }, 1000);
    return () => { if (phaseTimerRef.current) clearInterval(phaseTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const handleStop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (audioRef as any).current?.stop();
    storeStop();
    setRunning(false);
    setRemaining(totalSeconds);
    setPhaseIdx(0);
    setCurrentPhaseText(session.phases[0]?.text ?? '');
  }, [totalSeconds, session.phases, storeStop]);

  const progress = (totalSeconds - remaining) / totalSeconds;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeLabel = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const catColor = CATEGORY_COLOR[session.category] ?? palette.gold;

  return (
    <View style={player.root}>
      <View style={player.header}>
        <Pressable onPress={() => { handleStop(); onExit(); }} style={player.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <StatusPill label={session.category.toUpperCase()} tone="gold" />
        <View style={{ width: 36 }} />
      </View>

      <Text style={player.sessionTitle}>{session.title}</Text>
      <Text style={player.sessionDesc}>{session.description}</Text>

      {/* Timer circle */}
      <View style={player.circleContainer}>
        <CircleTimer progress={progress} size={220} />
        <View style={player.circleCenter}>
          <Text style={player.timeText}>{timeLabel}</Text>
          <Text style={player.timeSub}>{session.durationMinutes} min</Text>
        </View>
      </View>

      {/* Guidance text */}
      {(running || done) && (
        <PremiumCard style={player.guideCard}>
          <Text style={[player.guideText, { color: catColor }]}>
            {done ? '✦ Sesión completada ✦' : currentPhaseText}
          </Text>
        </PremiumCard>
      )}

      {/* Controls */}
      <View style={player.controls}>
        {!running && !done && (
          <Pressable style={player.startBtn} onPress={startSession}>
            <MaterialIcons name="play-arrow" size={28} color={palette.black} />
            <Text style={player.startBtnText}>INICIAR SESIÓN</Text>
          </Pressable>
        )}
        {running && (
          <Pressable style={player.stopBtn} onPress={handleStop}>
            <MaterialIcons name="stop" size={22} color={palette.ash} />
            <Text style={player.stopBtnText}>DETENER</Text>
          </Pressable>
        )}
        {done && (
          <Pressable style={player.startBtn} onPress={onExit}>
            <MaterialIcons name="check" size={22} color={palette.black} />
            <Text style={player.startBtnText}>COMPLETADO</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MeditacionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saveWellnessSession, state } = useLifeFlow();
  const [active, setActive] = useState<MeditationSession | null>(null);

  const completedIds = new Set(
    (state.wellnessSessions ?? [])
      .filter((s) => s.type === 'meditation')
      .map((s) => s.metadata?.sessionId as string),
  );

  const handleComplete = useCallback(
    async (session: MeditationSession, secs: number) => {
      await saveWellnessSession({
        type: 'meditation',
        sessionName: session.title,
        durationSeconds: secs,
        completedAt: new Date().toISOString(),
        metadata: { sessionId: session.id, category: session.category },
      });
      haptic('success');
    },
    [saveWellnessSession],
  );

  if (active) {
    return (
      <MeditationPlayer
        session={active}
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

      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={styles.title}>MEDITACIÓN</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.intro}>
        Sesiones guiadas con audio ambiental. Usa auriculares para mejor experiencia.
      </Text>

      <GoldDivider label="SESIONES" />

      {MEDITATION_SESSIONS.map((session) => {
        const done = completedIds.has(session.id);
        const catColor = CATEGORY_COLOR[session.category] ?? palette.gold;
        const catIcon = CATEGORY_ICON[session.category] ?? 'self-improvement';

        return (
          <Pressable
            key={session.id}
            onPress={() => { haptic('light'); setActive(session); }}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <PremiumCard style={styles.cardInner}>
              <View style={styles.cardTop}>
                <View style={[styles.iconBox, { backgroundColor: catColor + '22' }]}>
                  <MaterialIcons name={catIcon} size={26} color={catColor} />
                </View>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardTitle}>{session.title}</Text>
                  <View style={styles.cardTags}>
                    <View style={[styles.tag, { borderColor: catColor }]}>
                      <Text style={[styles.tagText, { color: catColor }]}>
                        {session.category.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.duration}>{session.durationMinutes} min</Text>
                  </View>
                </View>
                {done
                  ? <MaterialIcons name="check-circle" size={26} color={palette.success} />
                  : <MaterialIcons name="play-circle" size={26} color={palette.gold} />
                }
              </View>
              <Text style={styles.cardDesc}>{session.description}</Text>
            </PremiumCard>
          </Pressable>
        );
      })}

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
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
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
  card: { marginBottom: spacing.md },
  cardPressed: { opacity: 0.8 },
  cardInner: { gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 52, height: 52,
    borderRadius: radii.md,
    alignItems: 'center', justifyContent: 'center',
  },
  cardMeta: { flex: 1, gap: 4 },
  cardTitle: {
    ...typography.section,
    color: palette.ivory,
    fontSize: 14,
    letterSpacing: 2,
  },
  cardTags: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tag: {
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    ...typography.label,
    fontSize: 8,
    letterSpacing: 1.5,
  },
  duration: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 11,
  },
  cardDesc: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
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
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  sessionTitle: {
    ...typography.title,
    color: palette.ivory,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  sessionDesc: {
    ...typography.body,
    color: palette.smoke,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  circleCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  timeText: {
    fontFamily: Fonts.display,
    color: palette.ivory,
    fontSize: 42,
    letterSpacing: 2,
  },
  timeSub: {
    ...typography.label,
    color: palette.smoke,
    marginTop: 4,
  },
  guideCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginVertical: spacing.lg,
  },
  guideText: {
    ...typography.body,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 24,
  },
  controls: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
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
});
