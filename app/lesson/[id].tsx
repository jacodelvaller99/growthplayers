import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  KeyboardAvoidingView,
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
import { GoldDivider, PrimaryButton, SecondaryButton, screen } from '@/components/polaris';
import { POLARIS_MODULES } from '@/data/modules';
import { LESSON_TASKS } from '@/data/tasks';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
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

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{field.label}</Text>
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
            onPress={() => toggle(opt)}>
            <MaterialIcons
              name={checked ? 'check-box' : 'check-box-outline-blank'}
              size={20}
              color={checked ? palette.gold : palette.smoke}
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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LessonScreen() {
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
  const scrollRef = useRef<ScrollView>(null);

  const handleFieldChange = useCallback((id: string, value: string) => {
    setResponses((prev) => ({ ...prev, [id]: value }));
  }, []);

  const requiredFields = task?.fields.filter((f) => f.required) ?? [];
  const allRequiredFilled = requiredFields.every((f) => (responses[f.id] ?? '').trim().length > 0);
  const canComplete = !task || taskSaved;
  const canSaveTask = task && allRequiredFilled && (editing || !taskSaved);

  const handleSaveTask = async () => {
    if (!task || !canSaveTask) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await saveLessonTask(lessonId, responses);
    setTaskSaved(true);
    setEditing(false);
  };

  const handleCompleteLesson = async () => {
    if (!canComplete) return;
    await markLessonComplete(lessonId);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (meta?.next) {
      router.replace(`/lesson/${meta.next.id}` as never);
    } else {
      router.replace('/(tabs)/programas' as never);
    }
  };

  if (!meta) {
    return (
      <View style={[screen.root, styles.center]}>
        <Text style={styles.errorText}>Lección no encontrada.</Text>
        <SecondaryButton label="VOLVER" icon="arrow-back" onPress={() => router.back()} />
      </View>
    );
  }

  const { lesson, mod } = meta;
  const lessonIndex = mod.lessons.findIndex((l) => l.id === lessonId);
  const headerLabel = `MÓDULO ${String(mod.order).padStart(2, '0')} · LECCIÓN ${String(lessonIndex + 1).padStart(2, '0')}`;

  return (
    <>
      <Stack.Screen options={{ title: lesson.title }} />
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}>
      <ScrollView
        ref={scrollRef}
        style={screen.root}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32, paddingHorizontal: 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
          </Pressable>
          <Text style={styles.headerLabel}>{headerLabel}</Text>
          {isLessonCompleted && (
            <MaterialIcons name="check-circle" size={20} color={palette.success} />
          )}
        </View>

        {/* ── Video Section ── */}
        {(lesson.vimeoId || lesson.skoolUrl) ? (
          <SkoolVideo url={lesson.skoolUrl} vimeoId={lesson.vimeoId} height={220} />
        ) : (
          <View style={styles.videoComingSoon}>
            <Text style={styles.videoComingSoonIcon}>⏳</Text>
            <Text style={styles.videoComingSoonText}>Video próximamente</Text>
          </View>
        )}

        {/* ── Lesson Info ── */}
        <View style={styles.lessonInfo}>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <Text style={styles.lessonMeta}>
            {lesson.duration ? `${lesson.duration} · ` : ''}MÓDULO {String(mod.order).padStart(2, '0')}
          </Text>
        </View>

        <GoldDivider label="LECCIÓN" />

        {/* ── Task Section ── */}
        {task ? (
          <View style={styles.taskCard}>
            {/* Task header */}
            <View style={styles.taskHeader}>
              <MaterialIcons name="stars" size={18} color={palette.gold} />
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

      </ScrollView>
    </KeyboardAvoidingView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.black },
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  content: {
    gap: spacing.lg,
  },

  // Header
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 44,
  },
  backBtn: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerLabel: {
    ...typography.label,
    color: palette.ash,
    flex: 1,
    letterSpacing: 1.5,
  },

  // Video
  videoComingSoon: {
    alignItems: 'center',
    backgroundColor: '#111',
    borderColor: '#2A2A2A',
    borderRadius: radii.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: spacing.sm,
    height: 220,
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

  // Lesson info
  lessonInfo: {
    gap: spacing.xs,
  },
  lessonTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.4,
    lineHeight: 30,
    textTransform: 'uppercase',
  },
  lessonMeta: {
    ...typography.mono,
    color: palette.ash,
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
  fieldLabel: {
    ...typography.body,
    color: palette.ivory,
    fontWeight: '600',
    lineHeight: 20,
  },
  inputBox: {
    borderRadius: radii.sm,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  input: {
    backgroundColor: '#1A1A1A',
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
    backgroundColor: '#1A1A1A',
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

  // Error
  errorText: {
    ...typography.body,
    color: palette.ash,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
});
