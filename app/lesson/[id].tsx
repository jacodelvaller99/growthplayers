import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  KeyboardAvoidingView,
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
import { GoldDivider, PrimaryButton, SecondaryButton, useScreen } from '@/components/polaris';
import { POLARIS_MODULES } from '@/data/modules';
import { LESSON_TASKS } from '@/data/tasks';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { analytics } from '@/lib/analytics';
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
    borderColor: interpolateColor(focused.value, [0, 1], [palette.lineSoft, palette.gold]),
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
          onFocus={() => { focused.value = withTiming(1, { duration: 200 }); }}
          onBlur={() => { focused.value = withTiming(0, { duration: 200 }); }}
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
            style={[styles.checkItem, checked && styles.checkItemSelected]}
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

// ─── Flow State Pre-Lesson Ritual ────────────────────────────────────────────

const INTENTIONS = [
  'Aplicar esto hoy mismo',
  'Entender a profundidad',
  'Resolver algo que me pesa',
] as const;

function FocusRitualModal({
  visible,
  lessonTitle,
  onComplete,
}: {
  visible: boolean;
  lessonTitle: string;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [intention, setIntention] = useState('');

  const handleBreathDone = () => setStep(1);

  const handleIntention = (val: string) => {
    setIntention(val);
    setStep(2);
  };

  const handleCommit = () => {
    onComplete();
    // Reset for next use
    setTimeout(() => { setStep(0); setIntention(''); }, 500);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={ritualStyles.overlay}>
        <View style={ritualStyles.card}>

          {step === 0 && (
            <>
              <Text style={ritualStyles.eyebrow}>RITUAL DE ENFOQUE</Text>
              <Text style={ritualStyles.headline}>RESPIRA.</Text>
              <Text style={ritualStyles.body}>
                Toma 3 respiraciones lentas.{'\n'}
                Inhala 4 seg · retén 4 seg · exhala 6 seg.{'\n\n'}
                Tu sistema nervioso entra en modo aprendizaje.
              </Text>
              <Pressable
                style={({ pressed }) => [ritualStyles.btn, pressed && { opacity: 0.85 }]}
                onPress={handleBreathDone}
                accessibilityRole="button"
                accessibilityLabel="Listo, respiración completada">
                <Text style={ritualStyles.btnText}>LISTO</Text>
              </Pressable>
            </>
          )}

          {step === 1 && (
            <>
              <Text style={ritualStyles.eyebrow}>INTENCIÓN</Text>
              <Text style={ritualStyles.headline}>¿QUÉ BUSCAS{'\n'}HOY?</Text>
              <Text style={ritualStyles.lessonRef}>{lessonTitle}</Text>
              {INTENTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  style={({ pressed }) => [ritualStyles.intentBtn, pressed && { opacity: 0.8 }]}
                  onPress={() => handleIntention(opt)}
                  accessibilityRole="button"
                  accessibilityLabel={opt}>
                  <Text style={ritualStyles.intentText}>{opt}</Text>
                </Pressable>
              ))}
            </>
          )}

          {step === 2 && (
            <>
              <Text style={ritualStyles.eyebrow}>COMPROMISO</Text>
              <Text style={ritualStyles.headline}>ENTRA.{'\n'}COMPLETA.</Text>
              <Text style={ritualStyles.body}>
                Intención: <Text style={{ color: palette.goldText }}>{intention}</Text>
              </Text>
              <Text style={ritualStyles.body}>
                El cerebro transforma cuando cierra ciclos completos — no cuando consume fragmentos. Una lección. Un bloque de tiempo. Sin interrupciones.
              </Text>
              <Pressable
                style={({ pressed }) => [ritualStyles.btn, pressed && { opacity: 0.85 }]}
                onPress={handleCommit}
                accessibilityRole="button"
                accessibilityLabel="Entro y me comprometo">
                <Text style={ritualStyles.btnText}>ENTRO · ME COMPROMETO</Text>
              </Pressable>
            </>
          )}

          <Pressable onPress={onComplete} style={ritualStyles.skipBtn} accessibilityRole="button" accessibilityLabel="Saltar ritual de enfoque">
            <Text style={ritualStyles.skipText}>Saltar ritual →</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const ritualStyles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.92)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: palette.graphite,
    borderColor: palette.lineSoft,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
    maxWidth: 380,
    padding: 32,
    width: '100%',
  },
  eyebrow: {
    color: palette.goldText,
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 2,
  },
  headline: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
    lineHeight: 34,
    textTransform: 'uppercase',
  },
  lessonRef: {
    color: palette.ash,
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  body: {
    color: palette.ash,
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 22,
  },
  btn: {
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: 8,
    paddingVertical: 14,
  },
  btnText: {
    color: palette.ink,
    fontFamily: Fonts.mono,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
  intentBtn: {
    borderColor: palette.lineSoft,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  intentText: {
    color: palette.ivory,
    fontFamily: Fonts.sans,
    fontSize: 15,
  },
  skipBtn: {
    alignItems: 'center',
  },
  skipText: {
    color: palette.smoke,
    fontFamily: Fonts.mono,
    fontSize: 11,
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
  const barWidth  = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%` as unknown as number,
  }));

  useEffect(() => {
    if (!visible) return;
    opacity.value  = withTiming(1, { duration: 280 });
    scale.value    = withTiming(1, { duration: 280 });
    barWidth.value = withTiming(100, { duration: 2500 });

    const timer = setTimeout(onContinue, 2600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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
    fontFamily:  Fonts.mono,
    fontSize:    9,
    letterSpacing: 3,
  },
  iconWrap: {
    marginVertical: spacing.xs,
  },
  lessonNum: {
    color:        palette.smoke,
    fontFamily:   Fonts.mono,
    fontSize:     10,
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
    ...typography.mono,
    color:     palette.ash,
    fontSize:  11,
  },
  progressTotal: {
    color: palette.smoke,
  },
  progressPct: {
    color:       palette.goldText,
    fontFamily:  Fonts.mono,
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
  },
  btn: {
    alignItems:       'center',
    borderColor:      palette.gold + '66',
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
    fontFamily:    Fonts.mono,
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
  const [showRitual, setShowRitual] = useState(!isLessonCompleted);
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

  const handleCelebrationContinue = () => {
    setShowCelebration(false);
    if (meta?.next) {
      router.replace(`/lesson/${meta.next.id}` as never);
    } else {
      router.replace('/(tabs)/programas' as never);
    }
  };

  const handleArchetypeContinue = () => {
    setShowArchetype(false);
    if (meta?.next) {
      router.replace(`/lesson/${meta.next.id}` as never);
    } else {
      router.replace('/(tabs)/programas' as never);
    }
  };

  if (!meta) {
    return (
      <View style={[sc.root, styles.center]}>
        <Text style={styles.errorText}>Lección no encontrada.</Text>
        <SecondaryButton label="VOLVER" icon="arrow-back" onPress={() => router.back()} />
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
      <FocusRitualModal
        visible={showRitual}
        lessonTitle={lesson.title}
        onComplete={() => setShowRitual(false)}
      />
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}>
      <ScrollView
        ref={scrollRef}
        style={sc.root}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Video Section (fullwidth banner) ── */}
        <View style={styles.videoBanner}>
          {(lesson.vimeoId || lesson.skoolUrl) ? (
            <SkoolVideo url={lesson.skoolUrl} vimeoId={lesson.vimeoId} height={232} />
          ) : (
            <View style={styles.videoComingSoon}>
              <Text style={styles.videoComingSoonIcon}>⏳</Text>
              <Text style={styles.videoComingSoonText}>Video próximamente</Text>
            </View>
          )}
          {/* Floating back button */}
          <Pressable
            style={[styles.backBtn, { top: insets.top + 8 }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver">
            <MaterialIcons name="arrow-back" size={20} color={palette.ivory} />
          </Pressable>
          {/* Module · archetype label */}
          <Text style={[styles.videoLabel, { top: insets.top + 14 }]} numberOfLines={1}>
            {moduleLabel}
          </Text>
        </View>

        {/* ── Lesson Info ── */}
        <View style={styles.lessonBody}>
          <View style={styles.lessonBadgeRow}>
            <View style={styles.lessonBadge}>
              <Text style={styles.lessonBadgeText}>{lessonBadge}</Text>
            </View>
            {isLessonCompleted && (
              <View style={styles.lessonDoneChip}>
                <MaterialIcons name="check-circle" size={14} color={palette.success} />
                <Text style={styles.lessonDoneText}>COMPLETADA</Text>
              </View>
            )}
          </View>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          {lesson.duration ? (
            <Text style={styles.lessonMeta}>{lesson.duration}</Text>
          ) : null}
        </View>

        <View style={styles.bodyPad}>
        <GoldDivider label="LECCIÓN" />

        {/* ── Task Section ── */}
        {task ? (
          <View style={styles.taskCard}>
            {/* Task header */}
            <View style={styles.taskHeader}>
              <MaterialIcons name="stars" size={18} color={palette.goldText} />
              <Text style={styles.taskHeaderLabel}>TAREA DE ESTA LECCIÓN</Text>
              {taskSaved && !editing && (
                <View style={styles.completedBadge}>
                  <MaterialIcons name="check-circle" size={14} color={palette.success} />
                  <Text style={styles.completedBadgeText}>Completada</Text>
                </View>
              )}
            </View>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskDesc}>{task.description}</Text>

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
                    <Text style={styles.normanInsightLabel}>NORMAN</Text>
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
            <MaterialIcons name="edit-note" size={18} color={palette.ash} />
            <Text style={styles.notesTitle}>NOTAS PERSONALES</Text>
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

        {/* ── Next lesson anticipation teaser ── */}
        {isLessonCompleted && meta.next && (
          <View style={styles.nextLessonTeaser}>
            <Text style={styles.nextLessonLabel}>PRÓXIMA LECCIÓN</Text>
            <Text style={styles.nextLessonTitle}>{meta.next.title}</Text>
            {meta.next.duration ? (
              <Text style={styles.nextLessonMeta}>{meta.next.duration}</Text>
            ) : null}
          </View>
        )}

        {/* ── Complete Button ── */}
        <View style={styles.completeSection}>
          {!canComplete && (
            <Text style={styles.completeHint}>Completa la tarea para avanzar</Text>
          )}
          <PrimaryButton
            label={isLessonCompleted ? 'LECCIÓN COMPLETADA ✓' : 'COMPLETAR LECCIÓN'}
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
  content: {
    gap: 0,
  },

  // Video banner (fullwidth) + floating chrome
  videoBanner: {
    position: 'relative',
  },
  backBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderColor: palette.lineHard,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    left: spacing.lg,
    position: 'absolute',
    width: 38,
    zIndex: 3,
  },
  videoLabel: {
    color: palette.goldText,
    fontFamily: Fonts.mono,
    fontSize: 9.5,
    letterSpacing: 1.4,
    maxWidth: '52%',
    position: 'absolute',
    right: spacing.lg,
    textAlign: 'right',
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
  videoComingSoonIcon: {
    fontSize: 32,
  },
  videoComingSoonText: {
    color: palette.smoke,
    fontFamily: Fonts.sans,
    fontSize: 13,
  },

  // Lesson info (below the banner)
  lessonBody: {
    gap: spacing.sm,
    paddingHorizontal: 20,
    paddingTop: spacing.xl,
  },
  lessonBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lessonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: palette.goldLight,
    borderColor: palette.lineGold,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  lessonBadgeText: {
    color: palette.goldText,
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
  },
  lessonDoneChip: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  lessonDoneText: {
    color: palette.success,
    fontFamily: Fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
  },
  lessonTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 0.4,
    lineHeight: 25,
    textTransform: 'uppercase',
  },
  lessonMeta: {
    ...typography.mono,
    color: palette.ash,
  },

  // Body (everything below lesson info — restores horizontal padding + spacing)
  bodyPad: {
    gap: spacing.lg,
    paddingHorizontal: 20,
    paddingTop: spacing.lg,
  },

  // Task card
  taskCard: {
    borderColor: palette.gold,
    borderRadius: radii.md,
    borderWidth: 1.5,
    gap: spacing.md,
    padding: spacing.lg,
  },
  taskHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  taskHeaderLabel: {
    ...typography.label,
    color: palette.ash,
    flex: 1,
    letterSpacing: 1.5,
  },
  completedBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  completedBadgeText: {
    ...typography.label,
    color: palette.success,
    fontSize: 10,
  },
  taskTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
    lineHeight: 22,
  },
  taskDesc: {
    ...typography.body,
    color: palette.ash,
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
    ...typography.mono,
    color: palette.smoke,
    fontSize: 10,
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
    fontSize: 10,
    letterSpacing: 1,
  },
  savedFieldValue: {
    ...typography.body,
    color: palette.ivory,
    lineHeight: 22,
  },

  // Norman insight box
  normanInsightBox: {
    backgroundColor: 'rgba(179,141,60,0.08)',
    borderColor: palette.gold,
    borderLeftWidth: 2,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  normanInsightLabel: {
    color: palette.goldText,
    fontFamily: Fonts.mono,
    fontSize: 9,
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
    backgroundColor: palette.graphite,
    borderRadius: radii.md,
    gap: spacing.sm,
    paddingVertical: spacing.xl,
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
    backgroundColor: 'rgba(201, 160, 0, 0.06)',
    borderColor: palette.gold + '44',
    borderLeftWidth: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  nextLessonLabel: {
    ...typography.label,
    color: palette.goldText,
    fontSize: 8,
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
    ...typography.mono,
    color: palette.ash,
    fontSize: 10,
  },

  // Personal notes
  notesCard: {
    borderColor:   palette.lineSoft,
    borderRadius:  radii.md,
    borderWidth:   1,
    gap:           spacing.sm,
    padding:       spacing.lg,
  },
  notesHeader: {
    alignItems:   'center',
    flexDirection: 'row',
    gap:           spacing.sm,
  },
  notesTitle: {
    ...typography.label,
    color:        palette.ash,
    flex:         1,
    letterSpacing: 1.5,
  },
  notesSavedBadge: {
    alignItems:   'center',
    flexDirection: 'row',
    gap:           3,
  },
  notesSavedText: {
    color:       palette.success,
    fontFamily:  Fonts.mono,
    fontSize:    9,
    letterSpacing: 1,
  },
  notesInput: {
    backgroundColor: palette.graphiteLight,
    borderColor:     palette.lineSoft,
    borderRadius:    radii.sm,
    borderWidth:     1,
    color:           palette.ivory,
    fontFamily:      Fonts.sans,
    fontSize:        14,
    lineHeight:      22,
    minHeight:       80,
    paddingHorizontal: spacing.md,
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
    fontFamily:  Fonts.mono,
    fontSize:    10,
    letterSpacing: 1.5,
  },

  // Error
  errorText: {
    ...typography.body,
    color: palette.ash,
    marginBottom: spacing.lg,
    textAlign: 'center',
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
    fontSize: 9,
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
    ...typography.mono,
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
    ...typography.mono,
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
