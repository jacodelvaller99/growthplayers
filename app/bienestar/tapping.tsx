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
import { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldAccentCard, GoldDivider, PremiumCard, useScreen } from '@/components/polaris';
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

// ─── Intensity Selector ───────────────────────────────────────────────────────
function IntensitySelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.intensityRow}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <Pressable
          key={n}
          onPress={() => { onChange(n); haptic('light'); }}
          style={[styles.intensityBtn, value === n && styles.intensityBtnActive]}>
          <Text style={[styles.intensityNum, value === n && styles.intensityNumActive]}>{n}</Text>
        </Pressable>
      ))}
    </View>
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
    }
  }, [pointIdx]);

  const finish = useCallback(async () => {
    const secs = Math.round((Date.now() - startedAt) / 1000);
    await saveWellnessSession({ type: 'meditation', sessionName: 'Tapping EFT', durationSeconds: Math.max(secs, 60), completedAt: new Date().toISOString() });
    haptic('success');
    setScreen('done');
  }, [saveWellnessSession, startedAt]);

  // ── Setup ──────────────────────────────────────────────────────────────────
  if (screen === 'setup') {
    return (
      <ScrollView
        style={sc.root}
        contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Volver" accessibilityRole="button">
            <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
          </Pressable>
          <Text style={styles.title}>TAPPING EFT</Text>
          <View style={{ width: 44 }} />
        </View>

        <GoldAccentCard>
          <Text style={styles.eyebrow}>TÉCNICA DE LIBERACIÓN EMOCIONAL</Text>
          <Text style={styles.heroText}>
            9 puntos.{'\n'}Una emoción.{'\n'}Libertad.
          </Text>
          <Text style={styles.heroSub}>
            El Tapping activa los meridianos energéticos del cuerpo para liberar patrones emocionales bloqueados.
          </Text>
        </GoldAccentCard>

        <SafetyWarning
          body="El tapping es una herramienta de autorregulación, no un tratamiento médico ni psicológico. Si tienes una condición de salud mental, consúltala con un profesional."
        />

        <GoldDivider label="CONFIGURA TU SESIÓN" />
        <PremiumCard style={styles.card}>
          <Text style={styles.cardLabel}>¿QUÉ EMOCIÓN QUIERES LIBERAR HOY?</Text>
          <TextInput
            style={styles.emotionInput}
            value={emotion}
            onChangeText={setEmotion}
            placeholder="Ej: ansiedad, rabia, miedo al fracaso..."
            placeholderTextColor={palette.smoke}
            returnKeyType="done"
            maxLength={80}
          />

          <Text style={[styles.cardLabel, { marginTop: spacing.md }]}>INTENSIDAD AHORA (1–10)</Text>
          <IntensitySelector value={intensityBefore} onChange={setIntensityBefore} />
          <Text style={styles.intensityHint}>
            {intensityBefore >= 8
              ? 'Alta carga. El tapping te ayudará a regular.'
              : intensityBefore >= 5
              ? 'Carga moderada. Excelente momento para limpiar.'
              : 'Carga baja. Perfecto para mantenimiento.'}
          </Text>
        </PremiumCard>

        <Pressable
          style={[styles.primaryBtn, !emotion.trim() && { opacity: 0.5 }]}
          onPress={() => { haptic('light'); setScreen('tapping'); }}
          disabled={!emotion.trim()}>
          <MaterialIcons name="play-arrow" size={20} color={palette.ink} />
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
      <ScrollView
        style={sc.root}
        contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}>

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as `${number}%` }]} />
        </View>
        <Text style={styles.progressText}>{pointIdx + 1} / {TAPPING_POINTS.length}</Text>

        {/* Point */}
        <View style={styles.pointHeader}>
          <MaterialIcons name={point.icon} size={36} color={palette.gold} />
          <Text style={styles.pointName}>{point.name}</Text>
        </View>

        <PremiumCard style={styles.card}>
          <Text style={styles.cardLabel}>UBICACIÓN</Text>
          <Text style={styles.locationText}>{point.location}</Text>

          <View style={styles.repsRow}>
            <MaterialIcons name="touch-app" size={14} color={palette.gold} />
            <Text style={styles.repsText}>Golpea suavemente × {point.reps} veces</Text>
          </View>
        </PremiumCard>

        <GoldDivider label="MIENTRAS TAPEAS, DI EN VOZ ALTA" />
        <PremiumCard style={[styles.card, styles.scriptCard]}>
          {scriptFilled.split('\n').map((line, i) => (
            <Text key={i} style={styles.scriptLine}>{line}</Text>
          ))}
        </PremiumCard>

        {/* Navigation */}
        <View style={styles.navRow}>
          {pointIdx > 0 && (
            <Pressable style={styles.prevBtn} onPress={prevPoint}>
              <MaterialIcons name="arrow-back" size={18} color={palette.ash} />
              <Text style={styles.prevBtnText}>Anterior</Text>
            </Pressable>
          )}
          <Pressable style={[styles.nextBtn, pointIdx === 0 && { marginLeft: 'auto' }]} onPress={nextPoint}>
            <Text style={styles.nextBtnText}>{isLast ? 'FINALIZAR' : 'SIGUIENTE PUNTO'}</Text>
            <MaterialIcons name="arrow-forward" size={18} color={palette.ink} />
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ── Cierre ─────────────────────────────────────────────────────────────────
  if (screen === 'close') {
    return (
      <ScrollView
        style={sc.root}
        contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}>
        <Text style={styles.eyebrow}>CIERRE DE SESIÓN</Text>
        <Text style={styles.phaseTitle}>Mide tu avance</Text>

        <PremiumCard style={styles.card}>
          <Text style={styles.cardLabel}>INTENSIDAD ANTES: {intensityBefore}/10</Text>
          <Text style={[styles.cardLabel, { marginTop: spacing.md }]}>¿CÓMO ESTÁ LA CARGA AHORA? (1–10)</Text>
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
        </PremiumCard>

        <GoldDivider label="AFIRMACIÓN DE CIERRE" />
        <GoldAccentCard>
          <Text style={styles.affirmText}>
            "Soy abundancia. Fluyo con la vida. Recibo con gratitud y doy con propósito."
          </Text>
          <Text style={styles.affirmSub}>Repite 3 veces mientras sientes el cuerpo.</Text>
        </GoldAccentCard>

        <Pressable style={styles.primaryBtn} onPress={finish}>
          <MaterialIcons name="check" size={20} color={palette.ink} />
          <Text style={styles.primaryBtnText}>GUARDAR SESIÓN</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  return (
    <View style={[sc.root, styles.centeredPhase, { paddingTop: insets.top + 16 }]}>
      <MaterialIcons name="check-circle" size={64} color={palette.gold} />
      <Text style={styles.phaseTitle}>Sesión completada.</Text>
      <Text style={styles.doneSub}>
        Cada sesión de Tapping es un paso hacia un sistema nervioso más libre y una mente más clara.
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
    lineHeight: 38,
    marginVertical: spacing.sm,
  },
  heroSub: { ...typography.body, color: palette.ash, lineHeight: 22 },
  phaseTitle: {
    fontFamily: Fonts.display,
    color: palette.ivory,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginVertical: spacing.sm,
  },

  card: { gap: spacing.md },
  cardLabel: { ...typography.label, color: palette.ash, fontSize: 11 },

  emotionInput: {
    ...typography.body,
    color: palette.ivory,
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    padding: spacing.md,
    minHeight: 48,
  },

  intensityRow: { flexDirection: 'row', gap: 4, flexWrap: 'nowrap' },
  intensityBtn: {
    flex: 1,
    height: 44,
    minWidth: 28,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intensityBtnActive: { backgroundColor: palette.gold, borderColor: palette.gold },
  intensityNum: { ...typography.mono, color: palette.ash, fontSize: 13 },
  intensityNumActive: { color: palette.ink, fontWeight: '700' },
  intensityHint: { ...typography.caption, color: palette.smoke, fontStyle: 'italic' },

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

  progressBar: {
    height: 3,
    backgroundColor: palette.charcoal,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: palette.gold, borderRadius: 2 },
  progressText: { ...typography.mono, color: palette.smoke, fontSize: 11, textAlign: 'right', marginBottom: spacing.lg },

  pointHeader: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  pointName: {
    fontFamily: Fonts.display,
    color: palette.ivory,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  locationText: { ...typography.body, color: palette.ivory, lineHeight: 22 },
  repsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  repsText: { ...typography.mono, color: palette.gold, fontSize: 12 },

  scriptCard: { backgroundColor: 'rgba(201,160,0,0.06)', borderColor: palette.gold + '30' },
  scriptLine: { ...typography.body, color: palette.ivory, lineHeight: 26, fontStyle: 'italic' },

  navRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  prevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
  },
  prevBtnText: { ...typography.label, color: palette.ash },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  nextBtnText: { fontFamily: Fonts.display, color: palette.ink, fontWeight: '700', fontSize: 13, letterSpacing: 1.5 },

  resultBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginTop: 4 },
  resultText: { ...typography.body, color: palette.success, flex: 1, lineHeight: 20 },
  resultNote: { ...typography.caption, color: palette.smoke, fontStyle: 'italic', lineHeight: 18, marginTop: 4 },

  affirmText: { ...typography.body, color: palette.ivory, fontStyle: 'italic', lineHeight: 26, fontSize: 16 },
  affirmSub: { ...typography.caption, color: palette.ash, marginTop: spacing.sm },

  centeredPhase: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, gap: spacing.lg },
  doneSub: { ...typography.body, color: palette.ash, textAlign: 'center', lineHeight: 22 },
});
