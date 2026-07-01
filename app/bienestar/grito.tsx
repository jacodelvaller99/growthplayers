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

import { useScreen } from '@/components/polaris';
import SafetyWarning from '@/components/SafetyWarning';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

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

const MODALITIES: {
  id: Modality;
  label: string;
  sub: string;
  reps: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}[] = [
  {
    id: 'largo',
    label: 'GRITO LARGO',
    sub: 'Inhala desde el abdomen. Expulsa con fuerza sin forzar la garganta.',
    reps: '3–5 veces',
    icon: 'graphic-eq',
  },
  {
    id: 'crecimiento',
    label: 'GRITO EN CRECIMIENTO',
    sub: 'Empieza con un murmullo. Sube el tono hasta el grito completo.',
    reps: '2–3 veces',
    icon: 'trending-up',
  },
  {
    id: 'golpes',
    label: 'GOLPES DE VOZ',
    sub: 'Impulsos cortos "¡Ah! ¡Ah! ¡Ah!" coordinados con golpes a un cojín.',
    reps: '8–12 impulsos',
    icon: 'bolt',
  },
];

// ─── Activation timer ─────────────────────────────────────────────────────────
const ACTIVATION_SECS = 180; // 3 min

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─── Circular countdown ring (web SVG + native ring) ──────────────────────────
function CountdownRing({
  progress,
  label,
  size = 188,
  stroke = 8,
}: {
  progress: number;
  label: string;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Platform.OS === 'web' ? (
        // @ts-ignore web SVG
        <svg width={size} height={size} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={palette.charcoal} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={palette.gold}
            strokeWidth={stroke}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: stroke,
            borderColor: palette.charcoal,
          }}
        />
      )}
      <Text style={ringStyles.value}>{label}</Text>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  value: {
    fontFamily: Fonts.display,
    color: palette.goldText,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
});

// ─── Progress steps (4 segments across the 4 phases) ──────────────────────────
function PhaseSteps({ phase }: { phase: Phase }) {
  return (
    <View
      style={styles.steps}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Progreso del ejercicio"
      accessibilityValue={{ min: 1, max: 4, now: Math.min(phase, 3) + 1 }}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[styles.stepSeg, i <= phase ? styles.stepSegOn : styles.stepSegOff]}
        />
      ))}
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
    haptic('light');
  }, []);

  const finish = useCallback(async () => {
    const secs = Math.round((Date.now() - (startedAt || Date.now())) / 1000);
    await saveWellnessSession({ type: 'breathing', sessionName: 'Grito de Liberación', durationSeconds: Math.max(secs, 60), completedAt: new Date().toISOString() });
    haptic('success');
    setPhase(4);
  }, [saveWellnessSession, startedAt]);

  // Shared header
  const Header = (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backBtn}
        accessibilityLabel="Volver"
        accessibilityRole="button">
        <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
      </Pressable>
      <Text style={styles.title}>GRITO DE LIBERACIÓN</Text>
      <View style={styles.backBtn} />
    </View>
  );

  const contentStyle = [
    sc.content,
    { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
  ];

  // ── Phase 0: Preparación ────────────────────────────────────────────────────
  if (phase === 0) {
    return (
      <ScrollView style={sc.root} contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
        {Header}
        <PhaseSteps phase={phase} />

        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>VACÍA EL SISTEMA.</Text>
          <Text style={styles.heroBody}>
            La voz mueve lo que la mente no suelta. Tres minutos para descargar lo que llevas comprimido.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>ANTES DE COMENZAR</Text>
        <View style={styles.prepList}>
          {[
            { icon: 'lock' as const,       t: 'Privacidad',      d: 'Asegura un espacio donde nadie te interrumpa.' },
            { icon: 'king-bed' as const,   t: 'Almohada',        d: 'Ten una almohada cerca para amortiguar el sonido.' },
            { icon: 'volume-off' as const, t: 'Silencio externo', d: 'Silencia notificaciones y baja estímulos.' },
          ].map((x) => (
            <View key={x.t} style={styles.prepCard}>
              <MaterialIcons name={x.icon} size={22} color={palette.goldText} />
              <View style={styles.prepText}>
                <Text style={styles.prepTitle}>{x.t}</Text>
                <Text style={styles.prepDesc}>{x.d}</Text>
              </View>
            </View>
          ))}
        </View>

        <SafetyWarning
          tone="danger"
          body="Practica en un espacio seguro y privado. Puede liberar emociones intensas. No sustituye atención psicológica. Si atraviesas una crisis, busca ayuda profesional."
        />

        <Pressable style={styles.primaryBtn} onPress={startActivation} accessibilityRole="button" accessibilityLabel="Comenzar">
          <MaterialIcons name="campaign" size={20} color={palette.ink} />
          <Text style={styles.primaryBtnText}>COMENZAR</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Phase 1: Activación ─────────────────────────────────────────────────────
  if (phase === 1) {
    const progress = 1 - activationSecs / ACTIVATION_SECS;
    return (
      <ScrollView style={sc.root} contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
        {Header}
        <PhaseSteps phase={phase} />

        <View style={styles.centerBlock}>
          <Text style={styles.phaseEyebrow}>FASE 1 · ACTIVACIÓN CORPORAL</Text>
          <Animated.View style={{ transform: [{ scale: pulseAnim }], marginTop: spacing.lg }}>
            <CountdownRing progress={progress} label={fmt(activationSecs)} />
          </Animated.View>
          <Text style={styles.centerCopy}>
            Sacude todo el cuerpo. Brazos, piernas, mandíbula. Suelta la tensión física para abrir paso a la voz.
          </Text>
          <Pressable style={styles.skipBtn} onPress={skipToExecution} accessibilityRole="button" accessibilityLabel="Saltar activación">
            <Text style={styles.skipBtnText}>Saltar activación →</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ── Phase 2: Ejecución ──────────────────────────────────────────────────────
  if (phase === 2) {
    return (
      <ScrollView style={sc.root} contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
        {Header}
        <PhaseSteps phase={phase} />

        <Text style={styles.phaseEyebrow}>FASE 2 · EJECUCIÓN</Text>

        <View style={styles.modalityList}>
          {MODALITIES.map((m) => {
            const active = modality === m.id;
            return (
              <Pressable
                key={m.id}
                onPress={() => chooseModality(m.id)}
                style={[styles.modalityCard, active && styles.modalityCardActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${m.label}. ${m.sub}`}>
                <MaterialIcons name={m.icon} size={26} color={active ? palette.goldText : palette.ash} />
                <View style={styles.modalityText}>
                  <Text style={[styles.modalityLabel, active && { color: palette.goldText }]}>{m.label}</Text>
                  <Text style={styles.modalitySub}>{m.sub}</Text>
                </View>
                {active && <MaterialIcons name="check-circle" size={20} color={palette.goldText} />}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.primaryBtn, !modality && styles.primaryBtnDisabled]}
          onPress={() => modality && setPhase(3)}
          disabled={!modality}
          accessibilityRole="button"
          accessibilityState={{ disabled: !modality }}
          accessibilityLabel="Ejecutar y cerrar">
          <MaterialIcons name="arrow-forward" size={20} color={palette.ink} />
          <Text style={styles.primaryBtnText}>EJECUTAR Y CERRAR</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Phase 3: Integración ────────────────────────────────────────────────────
  if (phase === 3) {
    const sel = MODALITIES.find((m) => m.id === modality)!;
    return (
      <ScrollView style={sc.root} contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
        {Header}
        <PhaseSteps phase={phase} />

        {/* Selected modality recap */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>{sel.label}</Text>
          <Text style={styles.heroBody}>{sel.sub}</Text>
          <View style={styles.repsChip}>
            <MaterialIcons name="repeat" size={14} color={palette.goldText} />
            <Text style={styles.repsText}>{sel.reps}</Text>
          </View>
        </View>

        <View style={styles.centerBlock}>
          <View style={styles.integrationIcon}>
            <MaterialIcons name="self-improvement" size={36} color={palette.goldText} />
          </View>
          <Text style={styles.integrationTitle}>INTEGRACIÓN</Text>
          <Text style={styles.centerCopy}>
            Cierra los ojos. Tres respiraciones lentas. Observa el espacio que dejó la descarga. No lo llenes — habítalo.
          </Text>
        </View>

        <Pressable style={styles.primaryBtn} onPress={finish} accessibilityRole="button" accessibilityLabel="Completar sesión">
          <MaterialIcons name="check" size={20} color={palette.ink} />
          <Text style={styles.primaryBtnText}>COMPLETAR SESIÓN</Text>
        </Pressable>

        <Pressable style={styles.backModalBtn} onPress={() => setPhase(2)} accessibilityRole="button" accessibilityLabel="Cambiar modalidad">
          <Text style={styles.backModalText}>← Cambiar modalidad</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Phase 4: Done ───────────────────────────────────────────────────────────
  return (
    <View style={[sc.root, styles.donePhase, { paddingTop: insets.top + 16 }]}>
      <View style={styles.integrationIcon}>
        <MaterialIcons name="check-circle" size={40} color={palette.goldText} />
      </View>
      <Text style={styles.doneTitle}>Sesión completada.</Text>
      <Text style={styles.doneSub}>
        Lo que liberaste hoy ya no ocupa espacio en tu sistema nervioso.{'\n'}
        Eso es información que el cuerpo procesó, no debilidad.
      </Text>
      <Pressable style={[styles.primaryBtn, { alignSelf: 'stretch' }]} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver al centro">
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
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.graphite,
  },
  title: { ...typography.title, color: palette.ivory, fontSize: 16 },

  // Progress steps
  steps: { flexDirection: 'row', gap: 6, marginBottom: spacing.xl },
  stepSeg: { flex: 1, height: 4, borderRadius: radii.pill },
  stepSegOn: { backgroundColor: palette.gold },
  stepSegOff: { backgroundColor: palette.charcoal },

  // Hero / gold card
  heroCard: {
    backgroundColor: palette.goldLight,
    borderWidth: 1,
    borderColor: palette.lineGold,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroEyebrow: { fontFamily: Fonts.display, color: palette.goldText, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  heroBody: { ...typography.body, color: palette.ivory, lineHeight: 22 },

  sectionLabel: { ...typography.label, color: palette.goldText, fontSize: 11, letterSpacing: 1.8 },

  // Prep list
  prepList: { gap: spacing.md },
  prepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  prepText: { flex: 1 },
  prepTitle: { fontFamily: Fonts.display, color: palette.ivory, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  prepDesc: { ...typography.caption, color: palette.ash, marginTop: 3 },

  // Centered phases
  centerBlock: { alignItems: 'center', paddingTop: spacing.sm },
  phaseEyebrow: {
    fontFamily: Fonts.mono,
    color: palette.ash,
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  centerCopy: {
    ...typography.body,
    color: palette.ash,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 22,
    maxWidth: 290,
  },

  skipBtn: { marginTop: spacing.xl, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  skipBtnText: { fontFamily: Fonts.mono, color: palette.goldText, fontSize: 12, letterSpacing: 1 },

  // Modalities
  modalityList: { gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.xl },
  modalityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  modalityCardActive: {
    borderColor: palette.lineGold,
    backgroundColor: palette.goldLight,
  },
  modalityText: { flex: 1 },
  modalityLabel: { fontFamily: Fonts.display, color: palette.ivory, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  modalitySub: { ...typography.caption, color: palette.ash, marginTop: 4, lineHeight: 18 },

  repsChip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  repsText: { fontFamily: Fonts.mono, color: palette.goldText, fontSize: 12 },

  // Integration
  integrationIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.goldLight,
    borderWidth: 1,
    borderColor: palette.lineGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  integrationTitle: {
    fontFamily: Fonts.display,
    color: palette.ivory,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: spacing.lg,
    textAlign: 'center',
  },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    height: 52,
    marginTop: spacing.xl,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontFamily: Fonts.display, color: palette.ink, fontWeight: '700', fontSize: 13, letterSpacing: 1.5 },

  backModalBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  backModalText: { ...typography.caption, color: palette.smoke },

  // Done
  donePhase: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  doneTitle: { fontFamily: Fonts.display, color: palette.ivory, fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: spacing.sm },
  doneSub: { ...typography.body, color: palette.ash, textAlign: 'center', lineHeight: 22 },
});
