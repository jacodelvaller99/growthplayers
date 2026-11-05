import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkoolVideo } from '@/components/SkoolVideo';
import { PrimaryButton, SecondaryButton, useScreen } from '@/components/polaris';
import EmptyState from '@/components/EmptyState';
import { POLARIS_MODULES } from '@/data/modules';
import { LESSON_TASKS } from '@/data/tasks';
import { animation, EASING_HOUSE, Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { alpha } from '@/constants/themeColors';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { readLocal, writeLocal } from '@/storage/local';
import { logJornadaStep, useJornada } from '@/hooks/use-jornada';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { analytics } from '@/lib/analytics';
import { withStepDone } from '@/lib/jornadaLogic';
import type { TaskField } from '@/types/lifeflow';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findLessonMeta(lessonId: string) {
  for (const mod of POLARIS_MODULES) {
    const idx = mod.lessons.findIndex((l) => l.id === lessonId);
    if (idx !== -1) {
      const lesson = mod.lessons[idx];
      const next = mod.lessons[idx + 1] ?? null;
      const isLastInModule = idx === mod.lessons.length - 1;
      return { lesson, mod, next, isLastInModule };
    }
  }
  return null;
}

// ─── Field Components ─────────────────────────────────────────────────────────

function TextAreaField({
  field,
  value,
  onChange,
  multiline = true,
}: {
  field: TaskField;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  const focused = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    // AMBOS extremos van en hex/rgba LITERAL, nunca un token `cv()`. En web
    // `cv()` devuelve `var(--c-…)` y `interpolateColor` no sabe leer una
    // variable CSS: lanzaba "Interpolation input and output ranges should
    // contain at least two values" y el ErrorBoundary se comía la pantalla
    // ENTERA de lección — el Protocolo completo estaba muerto en la PWA.
    //
    // El reposo es el fallback nativo de `cv('--c-border-soft', …)`. El foco
    // usa `goldStatic` y NO `palette.gold`: desde que el oro entró al eje de
    // señal, `palette.gold` también es `var()` en web y reintroducía el mismo
    // crash. Coste asumido: este borde no sigue el cambio a ámbar.
    borderColor: interpolateColor(focused.value, [0, 1], ['rgba(255, 255, 255, 0.05)', palette.goldStatic]),
  }));

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const wordHint =
    wordCount === 0 ? null
    : wordCount < 10 ? `${wordCount} palabras — profundiza más`
    : wordCount < 30 ? `${wordCount} palabras — bien`
    : `${wordCount} palabras`;

  return (
    <View style={styles.fieldWrap}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{field.label}</Text>
        {wordHint && multiline ? (
          <Text style={[styles.wordCount, wordCount >= 30 && styles.wordCountGood]}>{wordHint}</Text>
        ) : null}
      </View>
      <Animated.View style={[styles.inputBox, animStyle]}>
        <TextInput
          multiline={multiline}
          style={[styles.input, multiline && styles.inputMulti]}
          value={value}
          onChangeText={onChange}
          placeholder={field.placeholder ?? ''}
          placeholderTextColor={palette.smoke}
          onFocus={() => { focused.value = withTiming(1, { duration: 200, easing: Easing.bezier(...EASING_HOUSE) }); }}
          onBlur={() => { focused.value = withTiming(0, { duration: 200, easing: Easing.bezier(...EASING_HOUSE) }); }}
          textAlignVertical="top"
        />
      </Animated.View>
    </View>
  );
}

function CheckboxField({
  field,
  value,
  onChange,
}: {
  field: TaskField;
  value: string;
  onChange: (v: string) => void;
}) {
  const options = (field.placeholder ?? '').split('\n').filter(Boolean);
  const selected = value ? value.split('||') : [];

  const toggle = (item: string) => {
    const next = selected.includes(item)
      ? selected.filter((s) => s !== item)
      : [...selected, item];
    onChange(next.join('||'));
  };

  if (!options.length) {
    return <TextAreaField field={field} value={value} onChange={onChange} />;
  }

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{field.label}</Text>
      {options.map((opt) => {
        const checked = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            style={({ pressed }) => [
              styles.checkItem,
              checked && styles.checkItemSelected,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => toggle(opt)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={opt}>
            <MaterialIcons
              name={checked ? 'check-box' : 'check-box-outline-blank'}
              size={20}
              color={checked ? palette.goldText : palette.smoke}
            />
            <Text style={[styles.checkLabel, checked && styles.checkLabelSelected]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TaskForm({
  fields,
  responses,
  onchange,
}: {
  fields: TaskField[];
  responses: Record<string, string>;
  onchange: (id: string, value: string) => void;
}) {
  return (
    <View style={styles.formFields}>
      {fields.map((field) => {
        const value = responses[field.id] ?? '';
        if (field.type === 'checkbox') {
          return (
            <CheckboxField
              key={field.id}
              field={field}
              value={value}
              onChange={(v) => onchange(field.id, v)}
            />
          );
        }
        const isMultiline = field.type === 'multiline' || field.type === 'textarea';
        return (
          <TextAreaField
            key={field.id}
            field={field}
            value={value}
            onChange={(v) => onchange(field.id, v)}
            multiline={isMultiline}
          />
        );
      })}
    </View>
  );
}

// ─── Antes de la lección: un paso, opcional ──────────────────────────────────
// Antes eran 3 pasos (Respira → Intención → Compromiso) ANTES de cada lección
// no completada, con la promesa «tu sistema nervioso entra en modo
// aprendizaje» (sin evidencia). Ahora: un solo paso, solo en la primera
// lección del día, y la acción principal es empezar.

/** Clave local: el día (AAAA-MM-DD) en que ya se ofreció la pausa. */
const RITUAL_DAY_KEY = 'lesson-ritual-day';
const hoyClave = () => new Date().toISOString().slice(0, 10);

function FocusRitualModal({
  visible,
  onComplete,
}: {
  visible: boolean;
  onComplete: () => void;
}) {
  const [breathing, setBreathing] = useState(false);

  const done = () => {
    onComplete();
    setTimeout(() => setBreathing(false), 500);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={done}>
      <View style={ritualStyles.overlay}>
        <View style={ritualStyles.card}>
          <Text style={ritualStyles.eyebrow}>ANTES DE EMPEZAR</Text>
          <Text style={ritualStyles.headline}>
            {breathing ? 'Respira tres veces.' : '¿Una pausa antes?'}
          </Text>
          <Text style={ritualStyles.body}>
            {breathing
              ? 'Inhala 4 segundos, retén 4, exhala 6. Cuando termines, empieza.'
              : 'Treinta segundos de respiración lenta ayudan a llegar con la cabeza aquí. Es opcional.'}
          </Text>
          <Pressable
            style={({ pressed }) => [ritualStyles.btn, pressed && { opacity: 0.85 }]}
            onPress={done}
            accessibilityRole="button">
            <Text style={ritualStyles.btnText}>EMPEZAR LA LECCIÓN</Text>
          </Pressable>
          {!breathing && (
            <Pressable
              onPress={() => setBreathing(true)}
              style={ritualStyles.skipBtn}
              accessibilityRole="button">
              <Text style={ritualStyles.skipText}>Respirar antes (30 s)</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const ritualStyles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: alpha(palette.blackDeep, 'EB'),
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: palette.graphite,
    borderRadius: 16,
    gap: 16,
    maxWidth: 380,
    padding: 32,
    width: '100%',
  },
  eyebrow: {
    color: palette.ash,
    fontFamily: Fonts.display,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
  },
  headline: {
    color: palette.ivory,
    fontFamily: Fonts.displayRegular,
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 32,
  },
  body: {
    color: palette.ash,
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 24,
  },
  btn: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 52,
  },
  btnText: {
    color: palette.ink,
    fontFamily: Fonts.display,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  skipBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  skipText: {
    color: palette.ivory,
    fontFamily: Fonts.sans,
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});

// ─── Archetype Crystallization Modal ─────────────────────────────────────────

function ArchetypeModal({
  visible,
  arquetipo,
  moduleTitle,
  keyEvidence,
  onContinue,
}: {
  visible: boolean;
  arquetipo: string;
  moduleTitle: string;
  keyEvidence: string | null;
  onContinue: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={archStyles.overlay}>
        <View style={archStyles.card}>
          <Text style={archStyles.eyebrow}>MÓDULO COMPLETADO</Text>
          <Text style={archStyles.headline}>Ya eres el</Text>
          <Text style={archStyles.arquetipo}>{arquetipo.toUpperCase()}</Text>
          <View style={archStyles.divider} />
          <Text style={archStyles.moduleLabel}>{moduleTitle}</Text>
          {keyEvidence ? (
            <View style={archStyles.evidenceBox}>
              <MaterialIcons name="format-quote" size={16} color={palette.goldText} />
              <Text style={archStyles.evidenceText}>{keyEvidence}</Text>
            </View>
          ) : null}
          <Text style={archStyles.body}>
            No es un certificado — es un rito de paso. Completaste las lecciones que la mayoría nunca
            termina. Tu identidad cambió. Ya no puedes volver a quien eras antes de esto.
          </Text>
          <Text style={archStyles.bodySecondary}>
            El siguiente módulo ya está desbloqueado.
          </Text>
          <Pressable
            style={({ pressed }) => [archStyles.btn, pressed && { opacity: 0.85 }]}
            onPress={onContinue}
            accessibilityRole="button"
            accessibilityLabel="Continuar el protocolo"
          >
            <Text style={archStyles.btnText}>CONTINUAR EL PROTOCOLO</Text>
            <MaterialIcons name="arrow-forward" size={18} color={palette.ink} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Lesson Completion Celebration ────────────────────────────────────────────

/**
 * Shown after completing any lesson that is NOT the last in a module
 * with an arquetipo. Luxury flash — auto-dismisses in 2.5 s or on tap.
 *
 * Design: luxury/refined — the score number is the hero, not a wall of text.
 */
function LessonCelebrationModal({
  visible,
  lessonIndex,
  lessonTitle,
  completedInModule,
  totalInModule,
  onContinue,
}: {
  visible: boolean;
  lessonIndex: number;
  lessonTitle: string;
  completedInModule: number;
  totalInModule: number;
  onContinue: () => void;
}) {
  const opacity   = useSharedValue(0);
  const scale     = useSharedValue(0.9);
  const barScale  = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const cardStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ scale: scale.value }],
  }));
  // scaleX en vez de width (audit "Fluidez Polaris" §Fase 3 "10") — anima
  // transform, no layout.
  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: barScale.value }],
  }));

  useEffect(() => {
    if (!visible) return;
    if (reducedMotion) {
      // Cross-fade corto, sin escala ni overshoot — la tarjeta no "salta".
      opacity.value = withTiming(1, { duration: 120, easing: Easing.linear });
      scale.value   = 1;
    } else {
      // Momento de logro — spring con leve bounce, no timing (audit §Fase 3
      // "04"): la celebración es la excepción explícita al "reveal one-shot
      // se queda en timing".
      opacity.value  = withTiming(1, { duration: 280, easing: Easing.bezier(...EASING_HOUSE) });
      scale.value    = withSpring(1, animation.spring.bounce);
    }
    // Barra de tiempo restante: informativa (cuánto falta para el auto-avance),
    // no decorativa — se deja animar incluso con reduced motion, avance
    // constante, no ease-out (regla de la casa: "constante → linear",
    // APPLE_GRADE_BRIEF.md).
    barScale.value = withTiming(1, { duration: 2500, easing: Easing.linear });

    const timer = setTimeout(onContinue, 2600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reducedMotion]);

  if (!visible) return null;

  const pct = totalInModule > 0 ? Math.round((completedInModule / totalInModule) * 100) : 0;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Pressable style={celebStyles.overlay} onPress={onContinue} accessibilityRole="button" accessibilityLabel="Continuar a la siguiente lección">
        <Animated.View style={[celebStyles.card, cardStyle]}>
          {/* Eyebrow */}
          <Text style={celebStyles.eyebrow}>LECCIÓN COMPLETADA</Text>

          {/* Icon */}
          <View style={celebStyles.iconWrap}>
            <MaterialIcons name="check-circle" size={48} color={palette.goldText} />
          </View>

          {/* Lesson label */}
          <Text style={celebStyles.lessonNum}>
            LECCIÓN {String(lessonIndex + 1).padStart(2, '0')}
          </Text>
          <Text style={celebStyles.lessonTitle}>{lessonTitle}</Text>

          {/* Module progress */}
          <View style={celebStyles.progressRow}>
            <Text style={celebStyles.progressText}>
              {completedInModule} <Text style={celebStyles.progressTotal}>/ {totalInModule}</Text>
              {'  '}lecciones del módulo
            </Text>
            <Text style={celebStyles.progressPct}>{pct}%</Text>
          </View>
          <View style={celebStyles.progressBar}>
            <View style={[celebStyles.progressFill, { width: `${pct}%` as unknown as number }]} />
          </View>

          {/* Micro identity line */}
          <Text style={celebStyles.identity}>
            {completedInModule >= totalInModule
              ? 'Módulo absorbido. El siguiente ya está desbloqueado.'
              : `Seguiste. Eso ya es parte de quien eres.`}
          </Text>

          {/* Auto-close timer bar */}
          <View style={celebStyles.timerBar}>
            <Animated.View style={[celebStyles.timerFill, barStyle]} />
          </View>

          {/* CTA */}
          <Pressable
            style={({ pressed }) => [celebStyles.btn, pressed && { opacity: 0.85 }]}
            onPress={onContinue}
            accessibilityRole="button"
            accessibilityLabel="Siguiente">
            <Text style={celebStyles.btnText}>SIGUIENTE →</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const celebStyles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems:      'center',
    justifyContent:  'center',
    padding:         24,
  },
  card: {
    backgroundColor: palette.black,
    borderColor:     palette.gold,
    borderRadius:    radii.md,
    borderWidth:     1.5,
    alignItems:      'center',
    gap:             spacing.md,
    padding:         spacing.xl + 4,
    width:           '100%',
    maxWidth:        360,
  },
  eyebrow: {
    // goldText (no gold): texto sobre card con fondo palette.black (theme-aware).
    color:       palette.goldText,
    fontFamily:  Fonts.display,
    fontSize:    11,
    letterSpacing: 3,
  },
  iconWrap: {
    marginVertical: spacing.xs,
  },
  lessonNum: {
    color:        palette.smoke,
    fontFamily:   Fonts.display,
    fontSize:     11,
    letterSpacing: 2,
    marginBottom: -spacing.xs,
  },
  lessonTitle: {
    color:        palette.ivory,
    fontFamily:   Fonts.display,
    fontSize:     20,
    fontWeight:   '800',
    letterSpacing: 0.4,
    lineHeight:   26,
    textAlign:    'center',
    textTransform: 'uppercase',
  },
  progressRow: {
    alignItems:     'center',
    flexDirection:  'row',
    justifyContent: 'space-between',
    width:          '100%',
    marginTop:       spacing.sm,
  },
  progressText: {
    fontFamily: Fonts.display, fontWeight: '700', lineHeight: 16,
    color:     palette.ash,
    fontSize:  11,
  },
  progressTotal: {
    color: palette.smoke,
  },
  progressPct: {
    color:       palette.goldText,
    fontFamily:  Fonts.display,
    fontSize:    12,
    fontWeight:  '700',
  },
  progressBar: {
    backgroundColor: palette.charcoal,
    borderRadius:    2,
    height:          4,
    overflow:        'hidden',
    width:           '100%',
  },
  progressFill: {
    backgroundColor: palette.gold,
    borderRadius:    2,
    height:          4,
  },
  identity: {
    ...typography.body,
    color:     palette.smoke,
    fontSize:  13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  timerBar: {
    backgroundColor: palette.line,
    borderRadius:    2,
    height:          2,
    overflow:        'hidden',
    width:           '100%',
  },
  timerFill: {
    backgroundColor: palette.gold,
    borderRadius:    2,
    height:          2,
    width:           '100%',
    transformOrigin: 'left',
  },
  btn: {
    alignItems:       'center',
    borderColor:      alpha(palette.gold, '66'),
    borderRadius:     radii.sm,
    borderWidth:      1,
    minHeight:        44,
    justifyContent:   'center',
    paddingHorizontal: spacing.xl,
    paddingVertical:   spacing.sm,
    width:            '100%',
    marginTop:         spacing.xs,
  },
  btnText: {
    color:         palette.goldText,
    fontFamily:    Fonts.display,
    fontSize:      12,
    fontWeight:    '700',
    letterSpacing:  2,
  },
});

// ─── Norman insight generator (variable reward after task save) ──────────────

function generateNormanInsight(taskType: string, responses: Record<string, string>): string {
  const allText = Object.values(responses).join(' ');
  const wordCount = allText.split(/\s+/).filter(Boolean).length;

  if (wordCount > 50) {
    return `${wordCount} palabras. Eso no es ejercicio — es honestidad en papel. El cerebro que escribe así ya está en proceso de reescritura.`;
  }
  if (wordCount < 15 && taskType === 'reflection') {
    return `La brevedad aquí es una señal. Lo que más duele cuesta más palabras, no menos. Considera volver a esto con más espacio.`;
  }
  if (/miedo|temor|temo/i.test(allText)) {
    return `Nombraste el miedo. Eso ya es valentía que la mayoría no completa. El miedo nombrado pierde poder.`;
  }
  if (/familia|hijo|hija|padre|madre|esposa|esposo/i.test(allText)) {
    return `Cuando el "por qué" incluye a alguien más, la motivación deja de ser opcional. Ese es tu combustible real.`;
  }
  if (/dinero|ingreso|empresa|negocio|ventas/i.test(allText)) {
    return `El dinero fluye hacia quien está alineado con servir. ¿Estás sirviendo o persiguiendo? Esa pregunta vale más que cualquier estrategia.`;
  }
  if (/libertad|libre|tiempo/i.test(allText)) {
    return `La libertad es la meta real detrás de todo lo demás. Quien la nombra ya la busca en el lugar correcto: adentro.`;
  }
  const defaults: Record<string, string> = {
    reflection: 'El trabajo interno que acabas de hacer tiene más impacto que cualquier estrategia externa. Sin excepción.',
    exercise: 'Los ejercicios no cambian nada en papel — lo cambian todo cuando se aplican. ¿Cuándo lo aplicas en las próximas 24 horas?',
    action: 'La distancia entre insight y transformación es la acción. Acabas de recortarla.',
  };
  return defaults[taskType] ?? 'Tarea completada. El trabajo interior que hiciste es invisible pero real.';
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LessonScreen() {
  const sc = useScreen();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: lessonId } = useLocalSearchParams<{ id: string }>();
  const { state, saveLessonTask, markLessonComplete } = useLifeFlow();
  const jornada = useJornada();

  const meta = useMemo(() => findLessonMeta(lessonId), [lessonId]);
  const task = LESSON_TASKS[lessonId] ?? null;
  const savedTask = (state.completedTasks ?? {})[lessonId] ?? null;
  const isLessonCompleted = (state.completedLessons ?? []).includes(lessonId);

  const [responses, setResponses] = useState<Record<string, string>>(
    savedTask?.responses ?? {},
  );
  const [taskSaved, setTaskSaved] = useState(!!savedTask);
  const [editing, setEditing] = useState(false);
  const [showArchetype, setShowArchetype] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  // La pausa se ofrece solo en la primera lección (no completada) del día.
  const [showRitual, setShowRitual] = useState(false);
  useEffect(() => {
    if (isLessonCompleted) return;
    readLocal<string>(RITUAL_DAY_KEY)
      .then((dia) => { if (dia !== hoyClave()) setShowRitual(true); })
      .catch(() => {});
    // Solo al abrir la lección: completarla después no debe reabrir la pausa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);
  const closeRitual = () => {
    setShowRitual(false);
    writeLocal(RITUAL_DAY_KEY, hoyClave()).catch(() => {});
  };
  const [normanInsight, setNormanInsight] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Personal notes — stored as __notes key inside completedTasks responses
  const [lessonNotes, setLessonNotes] = useState<string>(
    savedTask?.responses?.__notes ?? '',
  );
  const [notesSaved, setNotesSaved] = useState(false);

  const handleSaveNotes = async () => {
    // Merge notes into existing responses (or create a new entry)
    const merged = { ...(savedTask?.responses ?? {}), __notes: lessonNotes };
    await saveLessonTask(lessonId, merged);
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Module progress for celebration modal
  const completedCountInModule = useMemo(() => {
    if (!meta) return 0;
    const completed = state.completedLessons ?? [];
    return meta.mod.lessons.filter((l) => completed.includes(l.id)).length;
  }, [meta, state.completedLessons]);

  // Key evidence = first required field response of the first task in the module
  const keyEvidence = useMemo(() => {
    if (!meta) return null;
    const firstLesson = meta.mod.lessons[0];
    const firstTask = firstLesson ? (state.completedTasks ?? {})[firstLesson.id] : null;
    if (!firstTask?.responses) return null;
    const vals = Object.values(firstTask.responses).filter((v) => v.trim().length > 20);
    return vals[0]?.slice(0, 160) ?? null;
  }, [meta, state.completedTasks]);

  const handleFieldChange = useCallback((id: string, value: string) => {
    setResponses((prev) => ({ ...prev, [id]: value }));
  }, []);

  const requiredFields = task?.fields.filter((f) => f.required) ?? [];
  const allRequiredFilled = requiredFields.every((f) => (responses[f.id] ?? '').trim().length > 0);
  const canComplete = !task || taskSaved;
  const canSaveTask = task && allRequiredFilled && (editing || !taskSaved);

  // Track lesson start on mount
  const lessonStartMs = useRef(Date.now());
  useEffect(() => {
    lessonStartMs.current = Date.now();
    if (meta) {
      analytics.lessonStart(lessonId, meta.mod.id);
    }
    return () => {
      // Track abandon if not completed when component unmounts
      if (!isLessonCompleted && meta) {
        const elapsed = Date.now() - lessonStartMs.current;
        analytics.lessonAbandon(lessonId, 0, elapsed);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const handleSaveTask = async () => {
    if (!task || !canSaveTask) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await saveLessonTask(lessonId, responses);
    setTaskSaved(true);
    setEditing(false);
    setNormanInsight(generateNormanInsight(task.type, responses));
  };

  const handleCompleteLesson = async () => {
    if (!canComplete) return;
    await markLessonComplete(lessonId);
    // Completar una lección ES el paso EJECUTA de la jornada. Fire-and-forget:
    // perder el log no puede costar la lección (la jornada guía, no bloquea).
    void logJornadaStep('ejecuta');
    analytics.lessonComplete(lessonId, Date.now() - lessonStartMs.current);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Last lesson of a module with arquetipo → identity crystallization
    if (meta?.isLastInModule && meta.mod.arquetipo) {
      setShowArchetype(true);
    } else {
      // All other completions → celebration flash
      setShowCelebration(true);
    }
  };

  // Sin siguiente lección, el "SIGUIENTE →" del modal seguía la escalera al
  // catálogo — un menú, no un paso. Ahora sigue a la JORNADA: normalmente
  // REGULA (respiración); si ya regulaste, CIERRA (diario). El catálogo queda
  // como último recurso cuando el log aún no cargó.
  const rutaTrasEjecutar = (): string => {
    if (meta?.next) return `/lesson/${meta.next.id}`;
    const despues = jornada ? withStepDone(jornada, 'ejecuta') : null;
    switch (despues?.current) {
      case 'leete':  return '/checkin';
      case 'regula': return '/bienestar/respiracion';
      case 'cierra': return '/bienestar/diario';
      case null:     return despues ? '/(tabs)/progreso' : '/(tabs)/programas';
      default:       return '/(tabs)/programas';
    }
  };

  const handleCelebrationContinue = () => {
    setShowCelebration(false);
    router.replace(rutaTrasEjecutar() as never);
  };

  const handleArchetypeContinue = () => {
    setShowArchetype(false);
    router.replace(rutaTrasEjecutar() as never);
  };

  if (!meta) {
    return (
      <View style={[sc.root, styles.center]}>
        <EmptyState
          icon="explore-off"
          title="LECCIÓN NO ENCONTRADA"
          body="Ese enlace ya no apunta a ninguna lección del protocolo."
          actionLabel="VOLVER"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const { lesson, mod } = meta;
  const lessonIndex = mod.lessons.findIndex((l) => l.id === lessonId);
  const moduleLabel = `MÓDULO ${mod.order} · ${(mod.arquetipo ?? mod.title).toUpperCase()}`;
  const lessonBadge = `LECCIÓN ${String(lessonIndex + 1).padStart(2, '0')}`;

  return (
    <>
      <Stack.Screen options={{ title: lesson.title }} />
      <FocusRitualModal visible={showRitual} onComplete={closeRitual} />
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0 /* pantalla sin header: el KAV arranca en y=0 */}>
      <ScrollView
        ref={scrollRef}
        style={sc.root}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Video Section (fullwidth banner) ── */}
        <View style={styles.videoBanner}>
          {/* Tres casos, y el del medio es el que importa:
              1. La lección tiene SU video → se reproduce (módulos 0–4).
              2. La lección NO lo tiene pero el módulo sí (5–7): antes se
                 embebía el classroom del módulo bajo el título de la
                 lección — las 8 lecciones del módulo 5 abrían el MISMO
                 video con 8 títulos distintos. Eso es mentirle al usuario:
                 ahora se dice dónde está el contenido de verdad.
              3. Ni una ni otra → próximamente (hoy inalcanzable). */}
          {lesson.vimeoId || lesson.skoolUrl ? (
            <SkoolVideo url={lesson.skoolUrl} vimeoId={lesson.vimeoId} height={232} />
          ) : mod.skoolUrl ? (
            <View style={styles.videoComingSoon}>
              <MaterialIcons name="school" size={24} color={palette.goldText} />
              <Text style={styles.videoComingSoonText}>
                Esta lección se ve en Skool, dentro del módulo.
              </Text>
              <Pressable
                onPress={() => { void Linking.openURL(mod.skoolUrl as string); }}
                accessibilityRole="button"
                style={styles.classroomBtn}>
                <MaterialIcons name="open-in-new" size={16} color={palette.ink} />
                <Text style={styles.classroomBtnText}>ABRIR EN SKOOL ↗</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.videoComingSoon}>
              <MaterialIcons name="schedule" size={24} color={palette.smoke} />
              <Text style={styles.videoComingSoonText}>Video próximamente</Text>
            </View>
          )}
          {/* Floating back button */}
          <Pressable
            style={({ pressed }) => [
              styles.backBtn,
              { top: insets.top + 8 },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver">
            <MaterialIcons name="arrow-back" size={20} color={palette.ivory} />
          </Pressable>
        </View>

        {/* ── Lesson Info ── */}
        <View style={styles.lessonBody}>
          <View style={styles.lessonBadgeRow}>
            <Text style={styles.lessonBadgeText}>
              {moduleLabel} · {lessonBadge}{lesson.duration ? ` · ${lesson.duration.toUpperCase()}` : ''}
            </Text>
            {isLessonCompleted && <Text style={styles.lessonDoneText}>VISTA ✓</Text>}
          </View>
          <Text accessibilityRole="header" style={styles.lessonTitle}>{lesson.title}</Text>
        </View>

        <View style={styles.bodyPad}>

        {/* ── Recursos de la lección (guías de Skool) ── */}
        {(lesson.resources ?? []).length > 0 && (
          <View style={styles.resourcesWrap}>
            {(lesson.resources ?? []).map((r) => (
              <Pressable
                key={r.url}
                onPress={() => { void Linking.openURL(r.url); }}
                accessibilityRole="link"
                accessibilityLabel={`Abrir ${r.title}`}
                style={({ pressed }) => [styles.resourceRow, pressed && { opacity: 0.8 }]}>
                <MaterialIcons name="description" size={18} color={palette.goldText} />
                <View style={styles.resourceCopy}>
                  <Text style={styles.resourceTitle}>{r.title.toUpperCase()}</Text>
                  <Text style={styles.resourceSub}>
                    {r.url.includes('docs.google.com/document') && r.url.endsWith('/copy')
                      ? 'Se crea tu propia copia del documento'
                      : 'Se abre en el navegador'}
                  </Text>
                </View>
                <MaterialIcons name="open-in-new" size={16} color={palette.smoke} />
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Task Section ── */}
        {task ? (
          <View style={styles.taskCard}>
            {/* Task header */}
            <View style={styles.taskYellow}>
              <View style={styles.taskHeader}>
                <Text style={styles.taskHeaderLabel}>TU TAREA</Text>
                {taskSaved && !editing && <Text style={styles.completedBadgeText}>HECHA ✓</Text>}
              </View>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <Text style={styles.taskDesc}>{task.description}</Text>
            </View>

            {/* Form or completed view */}
            {taskSaved && !editing ? (
              <View style={styles.savedResponses}>
                {task.fields.map((field) => (
                  <View key={field.id} style={styles.savedField}>
                    <Text style={styles.savedFieldLabel}>{field.label}</Text>
                    <Text style={styles.savedFieldValue}>
                      {responses[field.id] || '—'}
                    </Text>
                  </View>
                ))}
                {normanInsight ? (
                  <View style={styles.normanInsightBox}>
                    <Text style={styles.normanInsightLabel}>NORMAN IA</Text>
                    <Text style={styles.normanInsightText}>{normanInsight}</Text>
                  </View>
                ) : null}
                <SecondaryButton
                  label="EDITAR RESPUESTAS"
                  icon="edit"
                  onPress={() => setEditing(true)}
                />
              </View>
            ) : (
              <>
                <TaskForm
                  fields={task.fields}
                  responses={responses}
                  onchange={handleFieldChange}
                />
                <PrimaryButton
                  label="GUARDAR TAREA"
                  icon="save"
                  onPress={handleSaveTask}
                  disabled={!canSaveTask}
                />
              </>
            )}
          </View>
        ) : (
          <View style={styles.noTaskCard}>
            <MaterialIcons name="menu-book" size={28} color={palette.ash} />
            <Text style={styles.noTaskText}>
              Reflexiona sobre lo aprendido y marca la lección como completada.
            </Text>
          </View>
        )}

        {/* ── Personal Notes ── */}
        <View style={styles.notesCard}>
          <View style={styles.notesHeader}>
            <Text style={styles.notesTitle}>TUS NOTAS</Text>
            {notesSaved && (
              <View style={styles.notesSavedBadge}>
                <MaterialIcons name="check" size={12} color={palette.success} />
                <Text style={styles.notesSavedText}>Guardado</Text>
              </View>
            )}
          </View>
          <TextInput
            multiline
            style={styles.notesInput}
            value={lessonNotes}
            onChangeText={setLessonNotes}
            placeholder="¿Qué te llevas de esta lección? ¿Qué aplicarás en las próximas 24 horas?"
            placeholderTextColor={palette.smoke}
            textAlignVertical="top"
            onBlur={lessonNotes.trim().length > 0 ? handleSaveNotes : undefined}
          />
          {lessonNotes.trim().length > 0 && !notesSaved && (
            <Pressable
              style={styles.notesSaveBtn}
              onPress={handleSaveNotes}
              accessibilityRole="button"
              accessibilityLabel="Guardar notas">
              <MaterialIcons name="save" size={14} color={palette.goldText} />
              <Text style={styles.notesSaveBtnText}>GUARDAR NOTAS</Text>
            </Pressable>
          )}
        </View>

        {/* ── Next lesson teaser — PULSABLE. Era un View inerte: mostraba la
            próxima lección sin llevar a ella, así que quien volvía a una
            lección ya completada veía el botón principal deshabilitado y un
            teaser que no hacía nada — un callejón. Mismo destino que el
            modal de celebración. ── */}
        {isLessonCompleted && meta.next && (
          <Pressable
            onPress={() => router.replace(`/lesson/${meta.next!.id}` as never)}
            accessibilityRole="button"
            accessibilityLabel={`Próxima lección: ${meta.next.title}`}
            style={({ pressed }) => [styles.nextLessonTeaser, pressed && { opacity: 0.8 }]}>
            <Text style={styles.nextLessonLabel}>PRÓXIMA LECCIÓN</Text>
            <Text style={styles.nextLessonTitle}>{meta.next.title}</Text>
            {meta.next.duration ? (
              <Text style={styles.nextLessonMeta}>{meta.next.duration}</Text>
            ) : null}
          </Pressable>
        )}

        {/* ── Complete Button ── */}
        <View style={styles.completeSection}>
          {!canComplete && (
            <Text style={styles.completeHint}>Guarda tu tarea para marcar la lección como vista.</Text>
          )}
          <PrimaryButton
            label={isLessonCompleted ? 'LECCIÓN VISTA ✓' : 'MARCAR COMO VISTA'}
            icon={isLessonCompleted ? 'check-circle' : 'arrow-forward'}
            onPress={handleCompleteLesson}
            disabled={!canComplete || isLessonCompleted}
          />
        </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>

    {/* Celebration flash — every non-archetype lesson completion */}
    <LessonCelebrationModal
      visible={showCelebration}
      lessonIndex={lessonIndex}
      lessonTitle={lesson.title}
      completedInModule={completedCountInModule}
      totalInModule={meta.mod.lessons.length}
      onContinue={handleCelebrationContinue}
    />

    {meta?.isLastInModule && meta.mod.arquetipo ? (
      <ArchetypeModal
        visible={showArchetype}
        arquetipo={meta.mod.arquetipo}
        moduleTitle={meta.mod.title}
        keyEvidence={keyEvidence}
        onContinue={handleArchetypeContinue}
      />
    ) : null}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.black },
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  // Misma columna que Módulo en escritorio: el campo de texto a 760 px de
  // ancho de línea no se lee.
  content: {
    gap: 0,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },

  // Video banner (fullwidth) + floating chrome
  videoBanner: {
    position: 'relative',
  },
  // Sin borde de caja; un círculo del tema para que la flecha se lea sobre el video.
  backBtn: {
    alignItems: 'center',
    backgroundColor: alpha(palette.blackDeep, 'B3'),
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    left: spacing.lg,
    position: 'absolute',
    width: 44,
    zIndex: 3,
  },
  videoComingSoon: {
    alignItems: 'center',
    backgroundColor: palette.graphite,
    borderColor: palette.charcoal,
    borderBottomWidth: 1,
    gap: spacing.sm,
    height: 232,
    justifyContent: 'center',
  },
  classroomBtn: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    height: 36,
    justifyContent: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  classroomBtnText: {
    color: palette.ink,
    fontFamily: Fonts.display,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  videoComingSoonText: {
    color: palette.smoke,
    fontFamily: Fonts.sans,
    fontSize: 13,
  },

  // Lesson info (below the banner)
  lessonBody: {
    gap: spacing.md,
    paddingHorizontal: 20,
    paddingTop: spacing.xl,
  },
  lessonBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lessonBadgeText: {
    flex: 1,
    color: palette.ash,
    fontFamily: Fonts.display,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  lessonDoneText: {
    color: palette.ash,
    fontFamily: Fonts.display,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  lessonTitle: {
    color: palette.ivory,
    fontFamily: Fonts.displayRegular,
    fontSize: 30,
    fontWeight: '400',
    lineHeight: 33,
  },

  // Body (everything below lesson info — restores horizontal padding + spacing)
  bodyPad: {
    gap: spacing.lg,
    paddingHorizontal: 20,
    paddingTop: spacing.lg,
  },

  // Recursos de la lección (guías de Skool)
  resourcesWrap: { gap: spacing.sm, marginBottom: spacing.lg },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
  },
  resourceCopy: { flex: 1, gap: 2, minWidth: 0 },
  resourceTitle: {
    fontFamily: Fonts.display,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: palette.goldText,
  },
  resourceSub: { ...typography.caption, color: palette.smoke, fontSize: 11 },

  // Task card
  taskCard: {
    gap: spacing.lg,
  },
  // Superficie neutra: el oro se reserva al botón activo (antes la tarjeta,
  // GUARDAR TAREA y MARCAR COMO VISTA eran tres amarillos a la vez).
  taskYellow: {
    backgroundColor: palette.graphite,
    borderColor: palette.lineSoft,
    borderWidth: 1,
    borderRadius: 8,
    gap: spacing.sm,
    padding: 20,
  },
  taskHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  taskHeaderLabel: {
    color: palette.ash,
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  completedBadgeText: {
    color: palette.ash,
    fontFamily: Fonts.display,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  taskTitle: {
    color: palette.ivory,
    fontFamily: Fonts.displayRegular,
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 24,
  },
  taskDesc: {
    color: palette.ash,
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 22,
  },

  // Form
  formFields: {
    gap: spacing.lg,
  },
  fieldWrap: {
    gap: spacing.sm,
  },
  fieldLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    ...typography.body,
    color: palette.ivory,
    fontWeight: '600',
    lineHeight: 20,
  },
  wordCount: {
    fontFamily: Fonts.display, fontWeight: '700', lineHeight: 16,
    color: palette.smoke,
    fontSize: 11,
  },
  wordCountGood: {
    color: palette.goldText,
  },
  inputBox: {
    borderRadius: radii.sm,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  input: {
    backgroundColor: palette.graphiteLight,
    color: palette.ivory,
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputMulti: {
    maxHeight: 300,
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Checkbox
  checkItem: {
    alignItems: 'flex-start',
    backgroundColor: palette.graphiteLight,
    borderColor: palette.lineSoft,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  checkItemSelected: {
    borderColor: palette.gold,
  },
  checkLabel: {
    ...typography.body,
    color: palette.ash,
    flex: 1,
    lineHeight: 22,
  },
  checkLabelSelected: {
    color: palette.ivory,
  },

  // Saved responses
  savedResponses: {
    gap: spacing.md,
  },
  savedField: {
    gap: spacing.xs,
  },
  savedFieldLabel: {
    ...typography.label,
    color: palette.ash,
    fontSize: 11,
    letterSpacing: 1,
  },
  savedFieldValue: {
    ...typography.body,
    color: palette.ivory,
    lineHeight: 22,
  },

  // Norman insight box
  normanInsightBox: {
    backgroundColor: alpha(palette.gold, '14'),
    borderColor: palette.gold,
    borderLeftWidth: 2,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  normanInsightLabel: {
    color: palette.goldText,
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 4,
  },
  normanInsightText: {
    ...typography.body,
    color: palette.ivoryDim,
    fontSize: 13,
    lineHeight: 20,
  },

  // No task
  noTaskCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  noTaskText: {
    ...typography.body,
    color: palette.ash,
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
  },

  // Complete
  completeSection: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  completeHint: {
    ...typography.label,
    color: palette.smoke,
    letterSpacing: 0.8,
    textAlign: 'center',
  },

  // Next lesson teaser
  nextLessonTeaser: {
    borderTopColor: palette.line,
    borderTopWidth: 1,
    borderBottomColor: palette.line,
    borderBottomWidth: 1,
    gap: 4,
    minHeight: 64,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  nextLessonLabel: {
    ...typography.label,
    color: palette.goldText,
    fontSize: 11,
    letterSpacing: 2,
  },
  nextLessonTitle: {
    color: palette.ivory,
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  nextLessonMeta: {
    fontFamily: Fonts.display, fontWeight: '700', lineHeight: 16,
    color: palette.ash,
    fontSize: 11,
  },

  // Personal notes
  notesCard: {
    gap: spacing.sm,
  },
  notesHeader: {
    alignItems:   'center',
    flexDirection: 'row',
    gap:           spacing.sm,
  },
  notesTitle: {
    color: palette.smoke,
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  notesSavedBadge: {
    alignItems:   'center',
    flexDirection: 'row',
    gap:           3,
  },
  notesSavedText: {
    color:       palette.success,
    fontFamily:  Fonts.display,
    fontSize:    11,
    letterSpacing: 1,
  },
  notesInput: {
    borderBottomColor: palette.line,
    borderBottomWidth: 1,
    color: palette.ivory,
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 72,
    paddingVertical: spacing.sm,
    textAlignVertical: 'top',
  },
  notesSaveBtn: {
    alignItems:   'center',
    alignSelf:    'flex-end',
    flexDirection: 'row',
    gap:           spacing.xs,
  },
  notesSaveBtnText: {
    // goldText (no gold): texto del botón sobre la página (fondo theme-aware).
    color:       palette.goldText,
    fontFamily:  Fonts.display,
    fontSize:    11,
    letterSpacing: 1.5,
  },
});

// ─── Archetype modal styles ───────────────────────────────────────────────────
const archStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: palette.black,
    borderColor: palette.gold,
    borderRadius: radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 420,
  },
  eyebrow: {
    ...typography.label,
    color: palette.smoke,
    letterSpacing: 2.5,
    fontSize: 11,
  },
  headline: {
    fontFamily: Fonts.display,
    fontSize: 14,
    color: palette.ash,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  arquetipo: {
    fontFamily: Fonts.display,
    fontSize: 36,
    color: palette.goldText,
    letterSpacing: 4,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: palette.gold,
    width: '60%',
    opacity: 0.4,
  },
  moduleLabel: {
    fontFamily: Fonts.display, fontWeight: '700', lineHeight: 16,
    color: palette.ash,
    textAlign: 'center',
    fontSize: 11,
  },
  evidenceBox: {
    borderColor: palette.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  evidenceText: {
    ...typography.body,
    color: palette.ivory,
    flex: 1,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  body: {
    ...typography.body,
    color: palette.smoke,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  bodySecondary: {
    fontFamily: Fonts.display, fontWeight: '700', lineHeight: 16,
    color: palette.goldText,
    fontSize: 11,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: -4,
  },
  btn: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    width: '100%',
    marginTop: spacing.sm,
  },
  btnText: {
    ...typography.section,
    color: palette.ink,
    fontSize: 11,
    letterSpacing: 2,
  },
});
