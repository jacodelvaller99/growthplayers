import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, StatusPill, useScreen } from '@/components/polaris';
import SafetyWarning from '@/components/SafetyWarning';
import { palette, radii, spacing, typography } from '@/constants/theme';
import { MOVEMENT_PRACTICES, movementPhasesToNarration, type MovementPractice } from '@/data/movement';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { registerSessionControls } from '@/hooks/useBinauralEngine';
import { analytics } from '@/lib/analytics';
import { createNarrationPlayer, type NarrationHandle } from '@/lib/narrationPlayer';
import { useWellnessStore } from '@/store/wellnessStore';
import { BodyContextCard, PracticeClose } from './body-context';

function haptic(type: 'light' | 'medium' | 'success') {
  if (Platform.OS === 'web') return;
  if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.impactAsync(type === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
}

const LEVEL_LABEL: Record<MovementPractice['level'], string> = {
  principiante: 'PRINCIPIANTE',
  intermedio:   'INTERMEDIO',
  avanzado:     'AVANZADO',
};

// ─── Player — mismo patrón de fases que meditacion.tsx, con una diferencia
// deliberada: aquí la última fase CIERRA la sesión. En meditación el texto
// cicla, y ahí está bien porque manda un reloj total que es quien termina; el
// movimiento no tiene ese reloj, así que si ciclara no acabaría nunca. ────────
function MovementPlayer({
  practice,
  onComplete,
  onExit,
}: {
  practice: MovementPractice;
  onComplete: (secs: number) => void;
  onExit: () => void;
}) {
  const { startSession: storeStart, stopSession: storeStop, setElapsed: storeElapsed } = useWellnessStore();
  const totalSeconds = practice.phases.reduce((acc, p) => acc + p.duration, 0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseRemaining, setPhaseRemaining] = useState(practice.phases[0]?.duration ?? 0);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const narrationRef = useRef<NarrationHandle | null>(null);

  const finish = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    narrationRef.current?.stop();
    narrationRef.current = null;
    setRunning(false);
    setDone(true);
    haptic('success');
    storeStop();
    onComplete(Math.round((Date.now() - startTimeRef.current) / 1000));
  }, [onComplete, storeStop]);

  const start = useCallback(() => {
    setRunning(true);
    setDone(false);
    setPhaseIdx(0);
    setPhaseRemaining(practice.phases[0]?.duration ?? 0);
    startTimeRef.current = Date.now();
    haptic('medium');
    storeStart({ type: 'movement', sessionName: practice.title, targetSeconds: totalSeconds });

    // Guion narrado: la voz manda el avance de fase (mismo patrón que
    // meditacion.tsx). Sin `narrated` (los 3 circuitos), el tick de abajo
    // sigue llevando todo, como antes — sin regresión.
    if (practice.narrated) {
      const n = createNarrationPlayer({
        phases: movementPhasesToNarration(practice),
        onPhaseChange: (i) => {
          setPhaseIdx(i);
          setPhaseRemaining(practice.phases[i].duration);
          haptic('light');
        },
        onComplete: finish,
      });
      narrationRef.current = n;
      n?.start();
    }
  }, [practice, totalSeconds, storeStart, finish]);

  useEffect(() => {
    if (!running) return;

    // Narrado: el avance de fase lo manda la voz (onPhaseChange/onComplete
    // de arriba). Este tick solo alimenta el reloj total del mini-player y
    // el countdown visual del paso — nunca decide cuándo avanzar o cerrar.
    if (practice.narrated) {
      let elapsedTotal = 0;
      timerRef.current = setInterval(() => {
        elapsedTotal += 1;
        storeElapsed(elapsedTotal);
        setPhaseRemaining((r) => Math.max(0, r - 1));
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }

    // Sin narración: el tick de siempre manda todo el avance. La ÚLTIMA fase
    // CIERRA el flow, no cicla — a diferencia de meditación (que sí cicla el
    // TEXTO porque un reloj total independiente es quien termina la sesión);
    // el movimiento no tiene ese reloj, así que si ciclara no acabaría nunca.
    let idx = 0;
    let elapsedInPhase = 0;
    let elapsedTotal = 0;
    timerRef.current = setInterval(() => {
      elapsedInPhase += 1;
      elapsedTotal += 1;
      storeElapsed(elapsedTotal);
      const dur = practice.phases[idx].duration;
      if (elapsedInPhase >= dur) {
        if (idx === practice.phases.length - 1) {
          finish();
          return;
        }
        idx += 1;
        elapsedInPhase = 0;
        setPhaseIdx(idx);
        setPhaseRemaining(practice.phases[idx].duration);
        haptic('light');
      } else {
        setPhaseRemaining(dur - elapsedInPhase);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const handleStop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    narrationRef.current?.stop();
    narrationRef.current = null;
    storeStop();
    setRunning(false);
    setDone(false);
    setPhaseIdx(0);
    setPhaseRemaining(practice.phases[0]?.duration ?? 0);
  }, [practice, storeStop]);

  // Cleanup al desmontar — salir de la pantalla a mitad de un flow narrado
  // dejaba la voz sonando para siempre (los timers ya se limpian solos vía
  // su propio efecto, pero la narración no tenía a quién).
  useEffect(() => () => {
    narrationRef.current?.stop();
  }, []);

  // El mini-player debe poder parar esta sesión igual que meditación,
  // binaurales, sueño y respiración — sin esto, STOP escondía el mini-player
  // mientras la voz seguía sonando.
  useEffect(() => {
    if (!running) return;
    return registerSessionControls({ stop: handleStop });
  }, [running, handleStop]);

  const progress = (phaseIdx + (practice.phases[phaseIdx] ? 1 - phaseRemaining / practice.phases[phaseIdx].duration : 0)) / practice.phases.length;

  return (
    <View style={player.root}>
      <View style={player.header}>
        <Pressable onPress={() => { handleStop(); onExit(); }} style={player.backBtn} accessibilityRole="button" accessibilityLabel="Salir del movimiento">
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <StatusPill label={LEVEL_LABEL[practice.level]} tone="gold" />
        <View style={{ width: 36 }} />
      </View>

      <Text style={player.title}>{practice.title}</Text>
      <Text style={player.desc}>{practice.description}</Text>

      <View style={player.barTrack}>
        <View style={[player.barFill, { width: `${Math.min(100, progress * 100)}%` }]} />
      </View>
      <Text style={player.stepLabel}>
        {done ? 'COMPLETADO' : `PASO ${phaseIdx + 1} / ${practice.phases.length}`}
      </Text>

      {(running || done) && (
        <PremiumCard style={player.guideCard}>
          <Text style={player.guideText}>
            {done ? '✦ Movimiento completado ✦' : practice.phases[phaseIdx]?.text}
          </Text>
        </PremiumCard>
      )}

      {done && (
        <PracticeClose message="Movimiento cerrado. ¿Qué cambió en tu cuerpo? Regístralo — es el dato que importa." />
      )}

      <View style={player.controls}>
        {!running && !done && (
          <Pressable style={player.startBtn} onPress={start} accessibilityRole="button" accessibilityLabel="Iniciar movimiento">
            <MaterialIcons name="play-arrow" size={28} color={palette.ink} />
            <Text style={player.startBtnText}>INICIAR</Text>
          </Pressable>
        )}
        {running && (
          <Pressable style={player.stopBtn} onPress={handleStop} accessibilityRole="button" accessibilityLabel="Detener movimiento">
            <MaterialIcons name="stop" size={22} color={palette.ash} />
            <Text style={player.stopBtnText}>DETENER</Text>
          </Pressable>
        )}
        {done && (
          <Pressable style={player.startBtn} onPress={onExit} accessibilityRole="button" accessibilityLabel="Completado, volver">
            <MaterialIcons name="check" size={22} color={palette.ink} />
            <Text style={player.startBtnText}>VOLVER</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function MovimientoScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saveWellnessSession, state } = useLifeFlow();
  const [active, setActive] = useState<MovementPractice | null>(null);

  const completedIds = new Set(
    (state.wellnessSessions ?? [])
      .filter((s) => s.type === 'movement')
      .map((s) => s.metadata?.practiceId as string),
  );

  const handleComplete = useCallback(
    async (practice: MovementPractice, secs: number) => {
      await saveWellnessSession({
        type: 'movement',
        sessionName: practice.title,
        durationSeconds: secs,
        completedAt: new Date().toISOString(),
        metadata: { practiceId: practice.id, category: practice.category },
      });
      analytics.track('movement_complete', { practice: practice.title, secs });
      haptic('success');
    },
    [saveWellnessSession],
  );

  if (active) {
    return (
      <MovementPlayer
        practice={active}
        onComplete={(secs) => handleComplete(active, secs)}
        onExit={() => setActive(null)}
      />
    );
  }

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}>

      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={styles.title}>MOVIMIENTO</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.intro}>
        Secuencias breves de respiración y movimiento guiado, paso a paso.
      </Text>

      <SafetyWarning
        body="Estas prácticas son de bienestar general, no ejercicio terapéutico ni tratamiento médico. Si tienes una lesión, condición cardiovascular o dolor, consulta a un profesional antes de practicar. Detente si sientes mareo, dolor o falta de aire."
      />

      <BodyContextCard frame="Elige el movimiento según tu estado de hoy, no según lo que hiciste ayer." />

      <GoldDivider label="FLOWS" />
      {MOVEMENT_PRACTICES.filter((p) => p.category === 'flow').map((p) => (
        <PracticeCard key={p.id} practice={p} done={completedIds.has(p.id)} onPress={() => setActive(p)} />
      ))}

      <GoldDivider label="CIRCUITOS" />
      {MOVEMENT_PRACTICES.filter((p) => p.category === 'circuito').map((p) => (
        <PracticeCard key={p.id} practice={p} done={completedIds.has(p.id)} onPress={() => setActive(p)} />
      ))}

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  );
}

function PracticeCard({ practice, done, onPress }: { practice: MovementPractice; done: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => { haptic('light'); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={`${practice.title}, ${practice.level}${done ? ', completado' : ''}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
      <PremiumCard style={styles.cardInner}>
        <View style={styles.cardTop}>
          <View style={styles.iconBox}>
            <MaterialIcons name="directions-walk" size={26} color={palette.ash} />
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.cardTitle}>{practice.title.toUpperCase()}</Text>
            <View style={styles.cardTags}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{LEVEL_LABEL[practice.level]}</Text>
              </View>
              <Text style={styles.duration}>{practice.phases.length} pasos</Text>
            </View>
          </View>
          {done
            ? <MaterialIcons name="check-circle" size={26} color={palette.success} />
            : <MaterialIcons name="play-circle" size={26} color={palette.goldText} />
          }
        </View>
        <Text style={styles.cardDesc}>{practice.description}</Text>
      </PremiumCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: palette.ivory, fontSize: 18 },
  intro: { ...typography.body, color: palette.ash, marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  cardPressed: { opacity: 0.8 },
  cardInner: { gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: { width: 52, height: 52, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.charcoal },
  cardMeta: { flex: 1, gap: 4 },
  cardTitle: { ...typography.section, color: palette.ivory, fontSize: 14, letterSpacing: 2 },
  cardTags: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tag: { borderWidth: 1, borderColor: palette.line, borderRadius: radii.sm, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { ...typography.label, color: palette.smoke, fontSize: 8, letterSpacing: 1.5 },
  duration: { ...typography.mono, color: palette.smoke, fontSize: 11 },
  cardDesc: { ...typography.body, color: palette.ash, fontSize: 13 },
});

const player = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.black, paddingHorizontal: spacing.xl, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingTop: 56, marginBottom: spacing.lg },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: palette.ivory, fontSize: 22, textAlign: 'center', marginBottom: spacing.sm },
  desc: { ...typography.body, color: palette.smoke, textAlign: 'center', marginBottom: spacing.xl },
  barTrack: { width: '100%', height: 6, borderRadius: 3, backgroundColor: palette.charcoal, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: palette.gold, borderRadius: 3 },
  stepLabel: { ...typography.label, color: palette.smoke, marginTop: spacing.sm, letterSpacing: 1.5 },
  guideCard: { width: '100%', alignItems: 'center', paddingVertical: spacing.xl, marginVertical: spacing.lg },
  guideText: { ...typography.body, textAlign: 'center', fontSize: 16, lineHeight: 25, color: palette.ivory },
  controls: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.md },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: palette.gold, paddingHorizontal: spacing.xxxl, paddingVertical: spacing.lg, borderRadius: radii.sm },
  startBtnText: { ...typography.label, color: palette.ink, fontSize: 14, fontWeight: '700' },
  stopBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderColor: palette.smoke, borderWidth: 1, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radii.sm },
  stopBtnText: { ...typography.label, color: palette.smoke, fontSize: 12 },
});
