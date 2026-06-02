/**
 * Grito de Liberación — herramienta somática guiada
 * Basada en Doc 3.2 del curso Polaris (Capuozzo 2.0)
 *
 * Fases:
 *  0 — Preparación (instrucciones)
 *  1 — Activación  (temporizador 3 min + sacudida corporal)
 *  2 — Ejecución   (3 modalidades a elegir)
 *  3 — Integración (respiración de cierre + reflexión)
 */
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

import { GoldAccentCard, GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { analytics } from '@/lib/analytics';

// ─── Haptic (web-safe) ────────────────────────────────────────────────────────
function haptic(type: 'light' | 'success') {
  if (Platform.OS === 'web') return;
  if (type === 'success') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = 0 | 1 | 2 | 3 | 4; // 4 = done

type Modality = 'largo' | 'crecimiento' | 'golpes';

const MODALITIES: { id: Modality; label: string; sub: string; reps: string }[] = [
  {
    id: 'largo',
    label: 'GRITO LARGO',
    sub: 'Inhala desde el abdomen. Expulsa con fuerza sin forzar la garganta.',
    reps: '3–5 veces',
  },
  {
    id: 'crecimiento',
    label: 'GRITO EN CRECIMIENTO',
    sub: 'Empieza con un murmullo. Sube el tono hasta el grito completo.',
    reps: '2–3 veces',
  },
  {
    id: 'golpes',
    label: 'GOLPES DE VOZ',
    sub: 'Impulsos cortos "¡Ah! ¡Ah! ¡Ah!" coordinados con golpes a un cojín.',
    reps: '8–12 impulsos',
  },
];

// ─── Activation timer ─────────────────────────────────────────────────────────
const ACTIVATION_SECS = 180; // 3 min

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─── Circular Progress (web SVG + native fallback) ────────────────────────────
function CircleProgress({ progress, size = 160 }: { progress: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, progress)));

  if (Platform.OS === 'web') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* @ts-ignore web SVG */}
        <svg width={size} height={size} style={{ position: 'absolute' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={palette.charcoal} strokeWidth={6} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={palette.gold}
            strokeWidth={6}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
      </View>
    );
  }
  // Native: simple animated bar
  return (
    <View style={{ width: size, height: 6, backgroundColor: palette.charcoal, borderRadius: 3, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%`, height: '100%', backgroundColor: palette.gold, borderRadius: 3 }} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function GritoScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saveWellnessSession } = useLifeFlow();

  const [phase, setPhase] = useState<Phase>(0);
  const [modality, setModality] = useState<Modality | null>(null);
  const [activationSecs, setActivationSecs] = useState(ACTIVATION_SECS);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse when phase 1 running
  useEffect(() => {
    if (phase === 1 && running) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0,  duration: 1200, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }
    pulseAnim.setValue(1);
    return undefined;
  }, [phase, running, pulseAnim]);

  // Activation countdown
  useEffect(() => {
    if (phase === 1 && running) {
      timerRef.current = setInterval(() => {
        setActivationSecs((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            haptic('success');
            setRunning(false);
            setPhase(2);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, running]);

  const startActivation = useCallback(() => {
    setStartedAt(Date.now());
    setRunning(true);
    setPhase(1);
    haptic('light');
  }, []);

  const skipToExecution = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setPhase(2);
    haptic('light');
  }, []);

  const chooseModality = useCallback((m: Modality) => {
    setModality(m);
    setPhase(3);
    haptic('light');
  }, []);

  const finish = useCallback(async () => {
    const secs = Math.round((Date.now() - (startedAt || Date.now())) / 1000);
    await saveWellnessSession({ type: 'breathing', sessionName: 'Grito de Liberación', durationSeconds: Math.max(secs, 60), completedAt: new Date().toISOString() });
    haptic('success');
    setPhase(4);
  }, [saveWellnessSession, startedAt]);

  // ── Phase 0: Preparación ────────────────────────────────────────────────────
  if (phase === 0) {
    return (
      <ScrollView
        style={sc.root}
        contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
            <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
          </Pressable>
          <Text style={styles.title}>GRITO DE LIBERACIÓN</Text>
          <View style={{ width: 44 }} />
        </View>

        <GoldAccentCard>
          <Text style={styles.eyebrow}>HERRAMIENTA SOMÁTICA</Text>
          <Text style={styles.heroText}>
            Libera lo que{'\n'}el cuerpo carga.
          </Text>
          <Text style={styles.heroSub}>
            Tu sistema nervioso guarda la información. Esta técnica la saca a través del cuerpo, no de la mente.
          </Text>
        </GoldAccentCard>

        <GoldDivider label="PREPARACIÓN" />
        <PremiumCard style={styles.card}>
          {[
            { icon: 'lock' as const,       text: 'Busca un espacio privado donde no te interrumpan.' },
            { icon: 'king-bed' as const,   text: 'Ten a mano una almohada o toalla (amortigua el sonido si lo necesitas).' },
            { icon: 'volume-off' as const, text: 'Silencia el teléfono. Esto es solo para ti.' },
            { icon: 'timer' as const,      text: 'El ejercicio completo dura entre 8 y 15 minutos.' },
          ].map(({ icon, text }, i) => (
            <View key={i} style={styles.prepRow}>
              <MaterialIcons name={icon} size={16} color={palette.gold} />
              <Text style={styles.prepText}>{text}</Text>
            </View>
          ))}
        </PremiumCard>

        <Pressable style={styles.primaryBtn} onPress={startActivation}>
          <MaterialIcons name="play-arrow" size={20} color={palette.ink} />
          <Text style={styles.primaryBtnText}>COMENZAR</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Phase 1: Activación ─────────────────────────────────────────────────────
  if (phase === 1) {
    const progress = 1 - activationSecs / ACTIVATION_SECS;
    return (
      <View style={[sc.root, styles.centeredPhase, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.phaseEyebrow}>FASE 1 — ACTIVACIÓN</Text>
        <Text style={styles.phaseTitle}>Despierta el cuerpo</Text>

        <View style={styles.timerBlock}>
          <CircleProgress progress={progress} size={160} />
          <Animated.View style={[styles.timerTextWrap, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.timerText}>{fmt(activationSecs)}</Text>
          </Animated.View>
        </View>

        <PremiumCard style={[styles.card, { marginHorizontal: spacing.lg }]}>
          <Text style={styles.instructionLabel}>MIENTRAS EL TEMPORIZADOR CORRE:</Text>
          {[
            'Sacude suavemente los hombros, brazos y piernas.',
            'Da golpes suaves en el pecho y abdomen para conectar con el diafragma.',
            'Inhala profundo por la nariz, retén 3–5 segundos, exhala con sonido largo.',
            'Permite que cualquier emoción aparezca sin juzgarla.',
          ].map((inst, i) => (
            <View key={i} style={styles.instrRow}>
              <Text style={styles.instrNum}>{i + 1}.</Text>
              <Text style={styles.instrText}>{inst}</Text>
            </View>
          ))}
        </PremiumCard>

        <Pressable style={styles.skipBtn} onPress={skipToExecution}>
          <Text style={styles.skipBtnText}>Saltar activación →</Text>
        </Pressable>
      </View>
    );
  }

  // ── Phase 2: Ejecución ──────────────────────────────────────────────────────
  if (phase === 2) {
    return (
      <ScrollView
        style={sc.root}
        contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}>
        <Text style={[styles.phaseEyebrow, { marginBottom: 4 }]}>FASE 2 — EJECUCIÓN</Text>
        <Text style={styles.phaseTitle}>Elige tu modalidad</Text>
        <Text style={styles.modalityIntro}>
          Escoge la que sientas más natural ahora. No hay una correcta.
        </Text>

        <GoldDivider label="MODALIDADES" />

        {MODALITIES.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => chooseModality(m.id)}
            style={({ pressed }) => [styles.modalityCard, pressed && { opacity: 0.75 }]}>
            <View style={styles.modalityHeader}>
              <Text style={styles.modalityLabel}>{m.label}</Text>
              <Text style={styles.modalityReps}>{m.reps}</Text>
            </View>
            <Text style={styles.modalitySub}>{m.sub}</Text>
            <View style={styles.modalityArrow}>
              <MaterialIcons name="arrow-forward" size={16} color={palette.gold} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  // ── Phase 3: Integración ────────────────────────────────────────────────────
  if (phase === 3) {
    const sel = MODALITIES.find((m) => m.id === modality)!;
    return (
      <ScrollView
        style={sc.root}
        contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}>
        <Text style={[styles.phaseEyebrow, { marginBottom: 4 }]}>EJECUCIÓN</Text>
        <Text style={styles.phaseTitle}>{sel.label}</Text>

        <PremiumCard style={styles.card}>
          <Text style={styles.instructionLabel}>INSTRUCCIONES</Text>
          <Text style={styles.instrBody}>{sel.sub}</Text>
          <View style={styles.repsChip}>
            <MaterialIcons name="repeat" size={14} color={palette.gold} />
            <Text style={styles.repsText}>{sel.reps}</Text>
          </View>
        </PremiumCard>

        <GoldDivider label="INTEGRACIÓN" />
        <PremiumCard style={styles.card}>
          <Text style={styles.instructionLabel}>DESPUÉS DE TU GRITO:</Text>
          {[
            'Respira lento. Inhala 4 seg — retén 4 — exhala 6.',
            'Siente el cuerpo relajarse. No hagas nada por 1–2 minutos.',
            'Observa sin juzgar qué emociones quedaron en la superficie.',
            'Este espacio post-grito es donde ocurre la integración real.',
          ].map((inst, i) => (
            <View key={i} style={styles.instrRow}>
              <MaterialIcons name="check" size={14} color={palette.gold} />
              <Text style={styles.instrText}>{inst}</Text>
            </View>
          ))}
        </PremiumCard>

        <Pressable style={styles.primaryBtn} onPress={finish}>
          <MaterialIcons name="check" size={20} color={palette.ink} />
          <Text style={styles.primaryBtnText}>COMPLETAR SESIÓN</Text>
        </Pressable>

        <Pressable style={styles.backModalBtn} onPress={() => setPhase(2)}>
          <Text style={styles.backModalText}>← Cambiar modalidad</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Phase 4: Done ───────────────────────────────────────────────────────────
  return (
    <View style={[sc.root, styles.centeredPhase, { paddingTop: insets.top + 16 }]}>
      <MaterialIcons name="check-circle" size={64} color={palette.gold} />
      <Text style={styles.doneTitle}>Sesión completada.</Text>
      <Text style={styles.doneSub}>
        Lo que liberaste hoy ya no ocupa espacio en tu sistema nervioso.{'\n'}
        Eso es información que el cuerpo procesó, no debilidad.
      </Text>
      <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
        <Text style={styles.primaryBtnText}>VOLVER AL CENTRO</Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: palette.ivory, fontSize: 16 },

  eyebrow: { fontFamily: Fonts.display, color: palette.goldMuted, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' as const },
  heroText: {
    fontFamily: Fonts.display,
    color: palette.ivory,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
    lineHeight: 36,
    marginVertical: spacing.sm,
  },
  heroSub: { ...typography.body, color: palette.ash, lineHeight: 22 },

  card: { gap: spacing.md },

  prepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  prepText: { ...typography.body, color: palette.ash, flex: 1, lineHeight: 20 },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    minHeight: 52,
    marginTop: spacing.lg,
  },
  primaryBtnText: { fontFamily: Fonts.display, color: palette.ink, fontWeight: '700', fontSize: 14, letterSpacing: 1.5 },

  centeredPhase: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  phaseEyebrow: { fontFamily: Fonts.display, color: palette.goldMuted, fontSize: 11, letterSpacing: 2, textAlign: 'center', textTransform: 'uppercase' as const },
  phaseTitle: {
    fontFamily: Fonts.display,
    color: palette.ivory,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  timerBlock: { position: 'relative', alignItems: 'center', justifyContent: 'center', width: 160, height: 160 },
  timerTextWrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  timerText: { fontFamily: Fonts.display, color: palette.gold, fontSize: 36, fontWeight: '800', letterSpacing: -1 },

  instructionLabel: { ...typography.label, color: palette.goldMuted, fontSize: 11, marginBottom: 4 },
  instrRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  instrNum: { ...typography.mono, color: palette.goldMuted, fontSize: 12, minWidth: 18 },
  instrText: { ...typography.body, color: palette.ash, flex: 1, lineHeight: 20 },
  instrBody: { ...typography.body, color: palette.ivory, lineHeight: 22 },

  skipBtn: { paddingVertical: spacing.md, alignItems: 'center' },
  skipBtnText: { ...typography.caption, color: palette.smoke },

  modalityIntro: { ...typography.body, color: palette.ash, marginBottom: spacing.sm, lineHeight: 20 },
  modalityCard: {
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  modalityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalityLabel: { fontFamily: Fonts.display, color: palette.ivory, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  modalityReps: { fontFamily: Fonts.display, color: palette.goldMuted, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  modalitySub: { ...typography.body, color: palette.ash, lineHeight: 20 },
  modalityArrow: { alignSelf: 'flex-end' },

  repsChip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  repsText: { ...typography.mono, color: palette.gold, fontSize: 12 },

  backModalBtn: { alignItems: 'center', paddingVertical: spacing.md },
  backModalText: { ...typography.caption, color: palette.smoke },

  doneTitle: {
    fontFamily: Fonts.display,
    color: palette.ivory,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  doneSub: { ...typography.body, color: palette.ash, textAlign: 'center', lineHeight: 22 },
});
