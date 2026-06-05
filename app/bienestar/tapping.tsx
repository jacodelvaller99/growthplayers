/**
 * Tapping EFT — Técnica de Liberación Emocional
 * Basada en Doc 4.3 del curso Polaris (Capuozzo 2.0)
 *
 * Flujo:
 *  0 — Configuración  (define la emoción + intensidad inicial)
 *  1 — Punto Karate   (frase de instalación)
 *  2–9 — 8 puntos de acupresión + frases de liberación
 *  10 — Cierre        (nueva intensidad + afirmación de abundancia)
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
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useScreen } from '@/components/polaris';
import SafetyWarning from '@/components/SafetyWarning';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';

// ─── Haptic ───────────────────────────────────────────────────────────────────
function haptic(type: 'light' | 'success') {
  if (Platform.OS === 'web') return;
  if (type === 'success') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

// ─── Tapping points data ─────────────────────────────────────────────────────
interface TappingPoint {
  id: string;
  name: string;
  location: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  script: string;        // negative/release phrase
  reps: number;
}

// Punto 0 = Karate (instalación)
// Puntos 1-8 = secuencia estándar EFT
const TAPPING_POINTS: TappingPoint[] = [
  {
    id: 'karate',
    name: 'PUNTO KARATE',
    location: 'Borde externo de la mano — lado del meñique',
    icon: 'back-hand',
    script: 'Aunque siento [EMOCIÓN], me acepto completamente.\nAunque siento [EMOCIÓN], elijo liberarme.\nAunque llevo este peso, soy suficiente y estoy a salvo.',
    reps: 3,
  },
  {
    id: 'ceja',
    name: 'INICIO DE LA CEJA',
    location: 'Inicio de la ceja, sobre el puente nasal',
    icon: 'remove',
    script: 'Esta [EMOCIÓN] que llevo en mi cuerpo...\nEste patrón que ya no me sirve...',
    reps: 7,
  },
  {
    id: 'lado-ojo',
    name: 'LADO DEL OJO',
    location: 'Borde externo del ojo, sobre el pómulo',
    icon: 'visibility',
    script: 'Elijo soltar esta [EMOCIÓN]...\nNo necesito cargar esto más...',
    reps: 7,
  },
  {
    id: 'debajo-ojo',
    name: 'DEBAJO DEL OJO',
    location: 'Debajo del ojo, sobre el pómulo',
    icon: 'do-not-disturb-on',
    script: 'Permito que mi sistema nervioso se regule...\nLibero esta tensión de mi cuerpo...',
    reps: 7,
  },
  {
    id: 'nariz',
    name: 'DEBAJO DE LA NARIZ',
    location: 'Surco entre nariz y labio superior',
    icon: 'face',
    script: 'Mi cuerpo sabe cómo soltar esto...\nConfío en mi capacidad de sanar...',
    reps: 7,
  },
  {
    id: 'menton',
    name: 'BARBILLA',
    location: 'Centrado debajo del labio inferior',
    icon: 'sentiment-neutral',
    script: 'Me doy permiso de sentir y de soltar...\nEsta emoción ya cumplió su función...',
    reps: 7,
  },
  {
    id: 'clavícula',
    name: 'CLAVÍCULA',
    location: 'Debajo del hueso de la clavícula, a ambos lados',
    icon: 'airline-seat-flat',
    script: 'Elijo la paz sobre la tensión...\nPermito que la prosperidad fluya...',
    reps: 7,
  },
  {
    id: 'axila',
    name: 'AXILA',
    location: 'Costado del cuerpo, a la altura del pecho',
    icon: 'vertical-align-center',
    script: 'Libero todo lo que bloquea mi abundancia...\nEstoy abierto a recibir...',
    reps: 7,
  },
  {
    id: 'coronilla',
    name: 'CORONILLA',
    location: 'Centro de la parte superior de la cabeza',
    icon: 'brightness-high',
    script: 'Mi cuerpo, mente y espíritu están alineados.\nEstoy completo. Estoy en paz. Soy abundancia.',
    reps: 7,
  },
];

// ─── Intensity Selector (square 1–10 grid) ────────────────────────────────────
function IntensitySelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.intensityRow}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const on = n <= value;
        return (
          <Pressable
            key={n}
            onPress={() => { onChange(n); haptic('light'); }}
            style={[styles.intensityBtn, on && styles.intensityBtnActive]}
            accessibilityRole="button"
            accessibilityLabel={`Intensidad ${n}`}>
            <Text style={[styles.intensityNum, on && styles.intensityNumActive]}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Glowing point icon (idle pulse like design polaris-glow) ─────────────────
function PointGlyph({ icon }: { icon: React.ComponentProps<typeof MaterialIcons>['name'] }) {
  const glow = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1.06, duration: 1000, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 1.0,  duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);
  return (
    <Animated.View style={[styles.glyphCircle, { transform: [{ scale: glow }] }]}>
      <MaterialIcons name={icon} size={44} color={palette.goldText} />
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TappingScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saveWellnessSession } = useLifeFlow();

  // Screen states: 'setup' | 'tapping' | 'close' | 'done'
  type ScreenState = 'setup' | 'tapping' | 'close' | 'done';
  const [screen, setScreen] = useState<ScreenState>('setup');
  const [emotion, setEmotion] = useState('');
  const [intensityBefore, setIntensityBefore] = useState(7);
  const [intensityAfter, setIntensityAfter] = useState(3);
  const [pointIdx, setPointIdx] = useState(0);
  const [startedAt] = useState(Date.now());

  const point = TAPPING_POINTS[pointIdx];
  const isLast = pointIdx === TAPPING_POINTS.length - 1;

  const emotionLabel = emotion.trim() || 'esta emoción';

  const nextPoint = useCallback(() => {
    if (isLast) {
      haptic('success');
      setScreen('close');
    } else {
      haptic('light');
      setPointIdx((p) => p + 1);
    }
  }, [isLast]);

  const prevPoint = useCallback(() => {
    if (pointIdx > 0) {
      haptic('light');
      setPointIdx((p) => p - 1);
    } else {
      setScreen('setup');
    }
  }, [pointIdx]);

  const finish = useCallback(async () => {
    const secs = Math.round((Date.now() - startedAt) / 1000);
    await saveWellnessSession({ type: 'meditation', sessionName: 'Tapping EFT', durationSeconds: Math.max(secs, 60), completedAt: new Date().toISOString() });
    haptic('success');
    setScreen('done');
  }, [saveWellnessSession, startedAt]);

  // Shared header
  const renderHeader = (onBack: () => void) => (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
        <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
      </Pressable>
      <Text style={styles.title}>TAPPING · EFT</Text>
      <View style={styles.backBtn} />
    </View>
  );

  const contentStyle = [
    sc.content,
    { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 },
  ];

  // ── Setup ──────────────────────────────────────────────────────────────────
  if (screen === 'setup') {
    return (
      <ScrollView
        style={sc.root}
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {renderHeader(() => router.back())}

        <Text style={styles.intro}>
          Nombra lo que cargas y mídelo. Vamos a bajar su intensidad punto por punto.
        </Text>

        <SafetyWarning
          body="El tapping es una herramienta de autorregulación, no un tratamiento médico ni psicológico. Si tienes una condición de salud mental, consúltala con un profesional."
        />

        <Text style={styles.fieldLabel}>¿QUÉ EMOCIÓN VAS A LIBERAR?</Text>
        <TextInput
          style={styles.emotionInput}
          value={emotion}
          onChangeText={setEmotion}
          placeholder="Ej. ansiedad por la reunión de mañana"
          placeholderTextColor={palette.smoke}
          returnKeyType="done"
          maxLength={80}
        />

        <Text style={styles.fieldLabel}>INTENSIDAD ACTUAL · {intensityBefore}/10</Text>
        <IntensitySelector value={intensityBefore} onChange={setIntensityBefore} />

        <Pressable
          style={[styles.primaryBtn, !emotion.trim() && styles.primaryBtnDisabled]}
          onPress={() => { haptic('light'); setPointIdx(0); setScreen('tapping'); }}
          disabled={!emotion.trim()}
          accessibilityRole="button"
          accessibilityLabel="Iniciar secuencia">
          <MaterialIcons name="touch-app" size={20} color={palette.ink} />
          <Text style={styles.primaryBtnText}>INICIAR SECUENCIA</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Tapping sequence ────────────────────────────────────────────────────────
  if (screen === 'tapping') {
    const progress = (pointIdx + 1) / TAPPING_POINTS.length;
    const scriptFilled = point.script.replace(/\[EMOCIÓN\]/g, emotionLabel);

    return (
      <ScrollView style={sc.root} contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
        {renderHeader(() => setScreen('setup'))}

        {/* Progress */}
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as `${number}%` }]} />
          </View>
          <Text style={styles.progressText}>{pointIdx + 1}/{TAPPING_POINTS.length}</Text>
        </View>

        {/* Point */}
        <View style={styles.pointBlock}>
          <PointGlyph icon={point.icon} />
          <Text style={styles.pointName}>{point.name}</Text>
          <Text style={styles.pointLoc}>{point.location.toUpperCase()}</Text>
          <View style={styles.scriptWrap}>
            {scriptFilled.split('\n').map((line, i) => (
              <Text key={i} style={styles.scriptLine}>&ldquo;{line}&rdquo;</Text>
            ))}
          </View>
          <View style={styles.repsRow}>
            <MaterialIcons name="touch-app" size={14} color={palette.goldText} />
            <Text style={styles.repsText}>Golpea suavemente × {point.reps} veces</Text>
          </View>
        </View>

        {/* Navigation */}
        <View style={styles.navRow}>
          <Pressable style={styles.prevBtn} onPress={prevPoint} accessibilityRole="button" accessibilityLabel="Anterior">
            <MaterialIcons name="arrow-back" size={18} color={palette.goldText} />
            <Text style={styles.prevBtnText}>Anterior</Text>
          </Pressable>
          <Pressable style={styles.nextBtn} onPress={nextPoint} accessibilityRole="button" accessibilityLabel={isLast ? 'Cerrar' : 'Siguiente punto'}>
            <Text style={styles.nextBtnText}>{isLast ? 'CERRAR' : 'SIGUIENTE PUNTO'}</Text>
            <MaterialIcons name="arrow-forward" size={18} color={palette.ink} />
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ── Cierre ─────────────────────────────────────────────────────────────────
  if (screen === 'close') {
    return (
      <ScrollView style={sc.root} contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
        {renderHeader(() => setScreen('tapping'))}

        <View style={styles.closeHeader}>
          <MaterialIcons name="spa" size={40} color={palette.goldText} />
          <Text style={styles.closeTitle}>SISTEMA RECALIBRADO</Text>
        </View>

        {/* Before → After */}
        <View style={styles.compareCard}>
          <View style={styles.compareCol}>
            <Text style={styles.compareEyebrow}>ANTES</Text>
            <Text style={[styles.compareNum, { color: palette.danger }]}>{intensityBefore}</Text>
          </View>
          <MaterialIcons name="arrow-forward" size={24} color={palette.ash} />
          <View style={styles.compareCol}>
            <Text style={styles.compareEyebrow}>DESPUÉS</Text>
            <Text style={[styles.compareNum, { color: palette.success }]}>{intensityAfter}</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>¿CÓMO ESTÁ LA CARGA AHORA? (1–10)</Text>
        <IntensitySelector value={intensityAfter} onChange={setIntensityAfter} />

        {intensityAfter < intensityBefore && (
          <View style={styles.resultBanner}>
            <MaterialIcons name="trending-down" size={16} color={palette.success} />
            <Text style={styles.resultText}>
              Bajaste {intensityBefore - intensityAfter} puntos. Tu sistema nervioso procesó información.
            </Text>
          </View>
        )}
        {intensityAfter >= intensityBefore && (
          <Text style={styles.resultNote}>
            Si la intensidad no bajó, es normal. Algunas capas necesitan varias rondas. Repite la secuencia.
          </Text>
        )}

        {/* Closing affirmation */}
        <View style={styles.affirmCard}>
          <Text style={styles.affirmText}>
            &ldquo;Suelto la escasez. Me abro a recibir lo que mi trabajo merece. La abundancia es mi estado natural.&rdquo;
          </Text>
          <Text style={styles.affirmSub}>Repite 3 veces mientras sientes el cuerpo.</Text>
        </View>

        <Pressable style={styles.primaryBtn} onPress={finish} accessibilityRole="button" accessibilityLabel="Guardar sesión">
          <MaterialIcons name="check" size={20} color={palette.ink} />
          <Text style={styles.primaryBtnText}>GUARDAR SESIÓN</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  return (
    <View style={[sc.root, styles.donePhase, { paddingTop: insets.top + 16 }]}>
      <MaterialIcons name="check-circle" size={64} color={palette.goldText} />
      <Text style={styles.doneTitle}>Sesión completada.</Text>
      <Text style={styles.doneSub}>
        Cada sesión de Tapping es un paso hacia un sistema nervioso más libre y una mente más clara.
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

  intro: { ...typography.body, color: palette.ash, lineHeight: 22 },

  fieldLabel: { ...typography.label, color: palette.goldText, fontSize: 11, letterSpacing: 1.8 },

  emotionInput: {
    ...typography.body,
    color: palette.ivory,
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
  },

  // Intensity grid
  intensityRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'nowrap' },
  intensityBtn: {
    flex: 1,
    aspectRatio: 1,
    minWidth: 26,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.graphite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intensityBtnActive: { backgroundColor: palette.gold, borderColor: palette.gold },
  intensityNum: { fontFamily: Fonts.display, color: palette.ash, fontSize: 15, fontWeight: '700' },
  intensityNumActive: { color: palette.ink },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    height: 52,
    marginTop: spacing.lg,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { fontFamily: Fonts.display, color: palette.ink, fontWeight: '700', fontSize: 13, letterSpacing: 1.5 },

  // Progress
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: palette.charcoal,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: palette.gold, borderRadius: radii.pill },
  progressText: { fontFamily: Fonts.mono, color: palette.goldText, fontSize: 12 },

  // Point block
  pointBlock: { alignItems: 'center', marginTop: spacing.sm },
  glyphCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: palette.goldLight,
    borderWidth: 1,
    borderColor: palette.lineGold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 6,
  },
  pointName: { fontFamily: Fonts.display, color: palette.ivory, fontSize: 19, fontWeight: '800', letterSpacing: 0.5, marginTop: spacing.xl, textAlign: 'center' },
  pointLoc: { fontFamily: Fonts.mono, color: palette.ash, fontSize: 11, letterSpacing: 1, marginTop: 6, textAlign: 'center' },
  scriptWrap: { marginTop: spacing.xl, maxWidth: 290, gap: 4 },
  scriptLine: { ...typography.body, color: palette.ivory, fontStyle: 'italic', fontSize: 15, lineHeight: 24, textAlign: 'center' },
  repsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg },
  repsText: { fontFamily: Fonts.mono, color: palette.goldText, fontSize: 12 },

  // Navigation
  navRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxl },
  prevBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderWidth: 1,
    borderColor: palette.lineGold,
    borderRadius: radii.sm,
  },
  prevBtnText: { fontFamily: Fonts.sans, color: palette.goldText, fontSize: 13, fontWeight: '600' },
  nextBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    height: 48,
  },
  nextBtnText: { fontFamily: Fonts.display, color: palette.ink, fontWeight: '700', fontSize: 13, letterSpacing: 1 },

  // Close
  closeHeader: { alignItems: 'center', gap: spacing.md },
  closeTitle: { fontFamily: Fonts.display, color: palette.ivory, fontSize: 18, fontWeight: '800', letterSpacing: 1 },

  compareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  compareCol: { alignItems: 'center' },
  compareEyebrow: { fontFamily: Fonts.mono, color: palette.ash, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  compareNum: { fontFamily: Fonts.display, fontSize: 34, fontWeight: '800', marginTop: 6 },

  resultBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  resultText: { ...typography.body, color: palette.success, flex: 1, lineHeight: 20 },
  resultNote: { ...typography.caption, color: palette.smoke, fontStyle: 'italic', lineHeight: 18 },

  affirmCard: {
    backgroundColor: palette.goldLight,
    borderWidth: 1,
    borderColor: palette.lineGold,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  affirmText: { ...typography.body, color: palette.ivory, fontStyle: 'italic', fontSize: 14, lineHeight: 24 },
  affirmSub: { ...typography.caption, color: palette.ash },

  // Done
  donePhase: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  doneTitle: { fontFamily: Fonts.display, color: palette.ivory, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  doneSub: { ...typography.body, color: palette.ash, textAlign: 'center', lineHeight: 22 },
});
