import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db2 } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { palette, spacing, typography, Fonts, radii } from '@/constants/theme';
import {
  HABIT_CATALOG,
  MORNING_HABITS,
  EVENING_HABITS,
  findTemplate,
  type HabitTemplate,
  type HabitOption,
  type TimeOfDay,
} from '@/data/habits';
import {
  requestNotificationPermissions,
  scheduleDailyRoutineReminder,
  cancelScheduledNotification,
} from '@/services/notifications';

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const TODAY_DOW = new Date().getDay(); // 0=dom, 1=lun…

interface Habit {
  id: string;
  name: string;
  category: string;
  streak: number;
  completedToday: boolean;
  // ── Columnas nuevas (migración meeting_features) — leídas vía cliente sin tipar
  timeOfDay: TimeOfDay;
  sequenceOrder: number;
  points: number;
  importanceText: string | null;
  videoUrl: string | null;
  guideUrl: string | null;
  options: HabitOption[];
  /** id de la notificación local agendada (en memoria; solo nativo) */
  reminderId?: string | null;
}

// Ruta interna asociada a un hábito (deep-link de la práctica / notificación).
function routeForCategory(category: string): string | undefined {
  return findTemplate(category)?.route;
}

export default function HabitosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  // ids de hábitos con recordatorio agendado en esta sesión (solo nativo)
  const [reminders, setReminders] = useState<Record<string, string>>({});

  const loadHabits = async () => {
    if (!userId) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      // Pedimos también las columnas nuevas. db2.habits() es el cliente SIN TIPAR.
      const { data } = await db2.habits()
        .select(`id, name, category, streak, time_of_day, sequence_order, points, importance_text, video_url, guide_url, options, habit_logs(date)`)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('sequence_order', { ascending: true });

      const mapped: Habit[] = (data ?? []).map((h: any) => {
        const tmpl = findTemplate(h.category);
        return {
          id:             h.id,
          name:           h.name,
          category:       h.category,
          streak:         h.streak ?? 0,
          completedToday: (h.habit_logs ?? []).some((l: any) => l.date === today),
          timeOfDay:      (h.time_of_day as TimeOfDay) ?? tmpl?.timeOfDay ?? 'anytime',
          sequenceOrder:  h.sequence_order ?? tmpl?.sequence ?? 0,
          points:         h.points ?? tmpl?.points ?? 10,
          importanceText: h.importance_text ?? tmpl?.importance ?? null,
          videoUrl:       h.video_url ?? tmpl?.videoUrl ?? null,
          guideUrl:       h.guide_url ?? tmpl?.guideUrl ?? null,
          options:        Array.isArray(h.options) && h.options.length
            ? (h.options as HabitOption[])
            : (tmpl?.options ?? []),
          reminderId:     undefined,
        };
      });
      setHabits(mapped);
    } catch { /* la tabla/columnas pueden no existir aún */ }
    setLoading(false);
  };

  useEffect(() => { loadHabits(); }, [userId]);

  const createHabit = async (template: HabitTemplate) => {
    if (!userId) return;
    try {
      // Persistimos las columnas nuevas con el contenido del catálogo semilla.
      await db2.habits().insert({
        user_id:         userId,
        name:            template.name,
        category:        template.category,
        icon:            template.icon,
        time_of_day:     template.timeOfDay,
        sequence_order:  template.sequence,
        points:          template.points,
        importance_text: template.importance,
        video_url:       template.videoUrl ?? null,
        guide_url:       template.guideUrl ?? null,
        options:         template.options ?? [],
      });
      loadHabits();
    } catch { Alert.alert('Error', 'No se pudo crear el hábito.'); }
  };

  const toggleToday = async (habit: Habit) => {
    if (!userId) return;
    const today = new Date().toISOString().split('T')[0];
    // Optimista: refleja el cambio de inmediato (puntos + check).
    setHabits((prev) => prev.map((h) =>
      h.id === habit.id
        ? { ...h, completedToday: !h.completedToday, streak: h.completedToday ? Math.max(0, h.streak - 1) : h.streak + 1 }
        : h,
    ));
    try {
      if (habit.completedToday) {
        await db2.habitLogs()
          .delete()
          .eq('habit_id', habit.id)
          .eq('user_id', userId)
          .eq('date', today);
        await db2.habits()
          .update({ streak: Math.max(0, habit.streak - 1) })
          .eq('id', habit.id);
      } else {
        await db2.habitLogs().upsert({
          habit_id: habit.id, user_id: userId, date: today,
        });
        await db2.habits()
          .update({ streak: habit.streak + 1 })
          .eq('id', habit.id);
      }
      loadHabits();
    } catch { loadHabits(); /* revertir desde servidor */ }
  };

  // ── Recordatorio con deep-link (WS-7): agenda/cancela la notificación ────────
  const toggleReminder = async (habit: Habit) => {
    if (Platform.OS === 'web') {
      Alert.alert('No disponible', 'Los recordatorios funcionan en la app móvil.');
      return;
    }
    const existing = reminders[habit.id];
    if (existing) {
      await cancelScheduledNotification(existing);
      setReminders((prev) => {
        const next = { ...prev };
        delete next[habit.id];
        return next;
      });
      return;
    }
    const tmpl = findTemplate(habit.category);
    if (!tmpl?.reminderHour && tmpl?.reminderHour !== 0) {
      Alert.alert('Sin horario', 'Este hábito no tiene un horario sugerido.');
      return;
    }
    const granted = await requestNotificationPermissions();
    if (!granted) {
      Alert.alert('Permiso requerido', 'Activa las notificaciones para recibir recordatorios.');
      return;
    }
    const id = await scheduleDailyRoutineReminder({
      title:  habit.name.toUpperCase(),
      body:   habit.importanceText ?? 'Es hora de tu práctica.',
      hour:   tmpl.reminderHour,
      minute: tmpl.reminderMinute ?? 0,
      // Deep-link: abre la práctica si existe; si no, el check-in.
      route:  tmpl.route ?? '/bienestar/habitos',
    });
    if (id) {
      setReminders((prev) => ({ ...prev, [habit.id]: id }));
      Alert.alert(
        'Recordatorio activado',
        `Te avisaremos a las ${String(tmpl.reminderHour).padStart(2, '0')}:${String(tmpl.reminderMinute ?? 0).padStart(2, '0')}.`,
      );
    }
  };

  // ── Derivados ────────────────────────────────────────────────────────────────
  const completed   = habits.filter((h) => h.completedToday);
  const activeCount  = completed.length;
  const pointsToday  = completed.reduce((sum, h) => sum + h.points, 0);
  const pointsTotal  = habits.reduce((sum, h) => sum + h.points, 0);

  const morning = habits.filter((h) => h.timeOfDay === 'morning').sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const evening = habits.filter((h) => h.timeOfDay === 'evening').sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const other   = habits.filter((h) => h.timeOfDay !== 'morning' && h.timeOfDay !== 'evening');

  const addedCategories = new Set(habits.map((h) => h.category));

  const renderHabitStep = (habit: Habit, index: number) => {
    const isExpanded = expanded === habit.id;
    const tmpl = findTemplate(habit.category);
    const hasReminder = !!reminders[habit.id];
    const route = routeForCategory(habit.category);
    return (
      <View key={habit.id} style={styles.stepWrap}>
        {/* Conector de secuencia (ruta paso a paso) */}
        <View style={styles.stepRail}>
          <View style={[styles.stepNumber, habit.completedToday && styles.stepNumberDone]}>
            <Text style={[styles.stepNumberText, habit.completedToday && styles.stepNumberTextDone]}>
              {index + 1}
            </Text>
          </View>
          <View style={styles.stepLine} />
        </View>

        <View style={[styles.habitCard, habit.completedToday && styles.habitCardDone]}>
          <View style={styles.habitRow}>
            <Pressable
              onPress={() => toggleToday(habit)}
              hitSlop={8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: habit.completedToday }}
              accessibilityLabel={`Marcar ${habit.name}`}
              style={[styles.habitCheck, habit.completedToday && styles.habitCheckDone]}
            >
              {habit.completedToday && (
                <MaterialIcons name="check" size={16} color={palette.ink} />
              )}
            </Pressable>

            <Pressable style={styles.habitInfo} onPress={() => setExpanded(isExpanded ? null : habit.id)}>
              <View style={styles.habitTitleRow}>
                {tmpl?.icon && (
                  <MaterialIcons name={tmpl.icon} size={16} color={palette.goldText} style={{ marginRight: 6 }} />
                )}
                <Text style={[styles.habitName, habit.completedToday && styles.habitNameDone]} numberOfLines={1}>
                  {habit.name}
                </Text>
              </View>
              <View style={styles.habitMetaRow}>
                <Text style={styles.habitPoints}>+{habit.points} pts</Text>
                <Text style={styles.habitDot}>·</Text>
                <Text style={styles.habitStreak}>
                  {habit.streak > 0 ? `🔥 ${habit.streak}` : 'Empieza hoy'}
                </Text>
              </View>
            </Pressable>

            <Pressable onPress={() => setExpanded(isExpanded ? null : habit.id)} hitSlop={8} style={styles.expandBtn}>
              <MaterialIcons
                name={isExpanded ? 'expand-less' : 'expand-more'}
                size={22}
                color={palette.ash}
              />
            </Pressable>
          </View>

          {isExpanded && (
            <View style={styles.habitDetail}>
              {!!habit.importanceText && (
                <>
                  <Text style={styles.detailLabel}>POR QUÉ IMPORTA</Text>
                  <Text style={styles.detailText}>{habit.importanceText}</Text>
                </>
              )}

              {!!tmpl?.warning && (
                <View style={styles.warningRow}>
                  <MaterialIcons name="info-outline" size={14} color={palette.warning} />
                  <Text style={styles.warningText}>{tmpl.warning}</Text>
                </View>
              )}

              {habit.options.length > 0 && (
                <>
                  <Text style={styles.detailLabel}>OPCIONES</Text>
                  {habit.options.map((opt, i) => (
                    <View key={`${opt.label}-${i}`} style={styles.optionRow}>
                      <MaterialIcons name="chevron-right" size={14} color={palette.goldText} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.optionLabel}>{opt.label}</Text>
                        {!!opt.detail && <Text style={styles.optionDetail}>{opt.detail}</Text>}
                      </View>
                    </View>
                  ))}
                </>
              )}

              <View style={styles.detailActions}>
                {!!route && (
                  <Pressable style={styles.detailAction} onPress={() => router.push(route as never)}>
                    <MaterialIcons name="play-circle-outline" size={16} color={palette.goldText} />
                    <Text style={styles.detailActionText}>Abrir práctica</Text>
                  </Pressable>
                )}
                {!!habit.guideUrl && (
                  <Pressable style={styles.detailAction} onPress={() => openExternal(habit.guideUrl!)}>
                    <MaterialIcons name="menu-book" size={16} color={palette.goldText} />
                    <Text style={styles.detailActionText}>Guía</Text>
                  </Pressable>
                )}
                {!!habit.videoUrl && (
                  <Pressable style={styles.detailAction} onPress={() => openExternal(habit.videoUrl!)}>
                    <MaterialIcons name="ondemand-video" size={16} color={palette.goldText} />
                    <Text style={styles.detailActionText}>Video</Text>
                  </Pressable>
                )}
                {(tmpl?.reminderHour !== undefined) && (
                  <Pressable style={styles.detailAction} onPress={() => toggleReminder(habit)}>
                    <MaterialIcons
                      name={hasReminder ? 'notifications-active' : 'notifications-none'}
                      size={16}
                      color={hasReminder ? palette.goldText : palette.ash}
                    />
                    <Text style={[styles.detailActionText, !hasReminder && { color: palette.ash }]}>
                      {hasReminder ? 'Recordatorio activo' : 'Recordarme'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderRoutineSection = (title: string, list: Habit[]) => {
    if (list.length === 0) return null;
    const done = list.filter((h) => h.completedToday).length;
    return (
      <View style={styles.section}>
        <View style={styles.routineHeader}>
          <Text style={styles.sectionLabel}>{title}</Text>
          <Text style={styles.routineCount}>{done}/{list.length}</Text>
        </View>
        {list.map((h, i) => renderHabitStep(h, i))}
      </View>
    );
  };

  // Templates por rutina, ocultando los ya añadidos.
  const renderTemplateGroup = (title: string, list: HabitTemplate[]) => {
    const pending = list.filter((t) => !addedCategories.has(t.category));
    if (pending.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{title}</Text>
        {pending.map((t) => (
          <Pressable key={t.category} onPress={() => createHabit(t)} style={styles.templateRow}>
            <View style={styles.templateIcon}>
              <MaterialIcons name={t.icon} size={20} color={palette.goldText} />
            </View>
            <View style={styles.templateInfo}>
              <Text style={styles.templateName}>{t.name}</Text>
              <Text style={styles.templateScience} numberOfLines={2}>{t.science}</Text>
            </View>
            <View style={styles.templatePts}>
              <Text style={styles.templatePtsText}>+{t.points}</Text>
            </View>
            <MaterialIcons name="add-circle-outline" size={22} color={palette.goldText} />
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ivory} />
        </Pressable>
        <Text style={styles.title}>HÁBITOS</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progreso del día — hábitos + puntos */}
        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View style={styles.progressCol}>
              <Text style={styles.progressLabel}>HOY</Text>
              <Text style={styles.progressValue}>{activeCount}/{Math.max(habits.length, 1)}</Text>
              <Text style={styles.progressSub}>hábitos</Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressCol}>
              <Text style={styles.progressLabel}>PUNTOS</Text>
              <Text style={[styles.progressValue, { color: palette.goldText }]}>{pointsToday}</Text>
              <Text style={styles.progressSub}>de {pointsTotal}</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${pointsTotal ? (pointsToday / pointsTotal) * 100 : 0}%` as any }]} />
          </View>
        </View>

        {/* Días de la semana */}
        <View style={styles.weekRow}>
          {DAY_LABELS.map((d, i) => {
            const adjustedToday = TODAY_DOW === 0 ? 6 : TODAY_DOW - 1;
            const isPast   = i < adjustedToday;
            const isToday  = i === adjustedToday;
            return (
              <View key={d} style={styles.dayItem}>
                <View style={[styles.dayDot, isPast && styles.dayDotPast, isToday && styles.dayDotToday]} />
                <Text style={[styles.dayLabel, isToday && { color: palette.goldText }]}>{d}</Text>
              </View>
            );
          })}
        </View>

        {/* Rutinas en secuencia */}
        {renderRoutineSection('RUTINA MATUTINA', morning)}
        {renderRoutineSection('RUTINA NOCTURNA', evening)}
        {renderRoutineSection('OTROS HÁBITOS', other)}

        {/* Catálogo — agregar por rutina */}
        {renderTemplateGroup('AÑADIR · MATUTINOS', MORNING_HABITS)}
        {renderTemplateGroup('AÑADIR · NOCTURNOS', EVENING_HABITS)}

        {habits.length >= HABIT_CATALOG.length && (
          <Text style={styles.allAdded}>✓ Rutina completa — todos los hábitos añadidos</Text>
        )}
      </ScrollView>
    </View>
  );
}

// Abre un recurso externo (guía/video). Carga perezosa para no romper en web.
function openExternal(url: string) {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.open(url, '_blank');
      return;
    }
    const Linking = require('expo-linking');
    Linking.openURL(url);
  } catch { /* silencioso */ }
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: palette.black },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn:        { padding: 8 },
  title:          { fontFamily: Fonts.display, fontSize: 16, color: palette.ivory, letterSpacing: 3 },

  content:        { paddingHorizontal: spacing.md, paddingBottom: 40 },

  progressCard:   { backgroundColor: palette.graphite, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md },
  progressTop:    { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  progressCol:    { flex: 1, alignItems: 'center' },
  progressDivider:{ width: 1, alignSelf: 'stretch', backgroundColor: palette.line, marginHorizontal: spacing.sm },
  progressLabel:  { ...typography.label, color: palette.goldText, marginBottom: 4 },
  progressValue:  { fontFamily: Fonts.display, fontSize: 34, color: palette.ivory, lineHeight: 40 },
  progressSub:    { ...typography.caption, color: palette.ash },
  progressBar:    { width: '100%', height: 3, backgroundColor: palette.line, borderRadius: 2, overflow: 'hidden' },
  progressFill:   { height: '100%', backgroundColor: palette.gold, borderRadius: 2 },

  weekRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  dayItem:        { alignItems: 'center', gap: 4 },
  dayDot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.line },
  dayDotPast:     { backgroundColor: palette.gold },
  dayDotToday:    { backgroundColor: palette.gold, width: 12, height: 12, borderRadius: 6 },
  dayLabel:       { ...typography.caption, color: palette.ash },

  section:        { marginBottom: spacing.lg },
  routineHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionLabel:   { ...typography.label, color: palette.goldText },
  routineCount:   { fontFamily: Fonts.display, fontSize: 12, color: palette.ash, letterSpacing: 1 },

  // ── Secuencia (ruta paso a paso) ─────────────────────────────────────────────
  stepWrap:       { flexDirection: 'row', gap: spacing.sm },
  stepRail:       { alignItems: 'center', width: 24 },
  stepNumber:     { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.graphite },
  stepNumberDone: { backgroundColor: palette.gold, borderColor: palette.gold },
  stepNumberText: { fontFamily: Fonts.display, fontSize: 11, color: palette.ash },
  stepNumberTextDone: { color: palette.ink },
  stepLine:       { flex: 1, width: 1, backgroundColor: palette.line, marginVertical: 2 },

  habitCard:      { flex: 1, backgroundColor: palette.graphite, borderRadius: radii.sm, marginBottom: 8, overflow: 'hidden' },
  habitCardDone:  { opacity: 0.75 },
  habitRow:       { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, gap: spacing.sm },
  habitCheck:     { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  habitCheckDone: { backgroundColor: palette.gold, borderColor: palette.gold },
  habitInfo:      { flex: 1 },
  habitTitleRow:  { flexDirection: 'row', alignItems: 'center' },
  habitName:      { flex: 1, fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory },
  habitNameDone:  { textDecorationLine: 'line-through', color: palette.ash },
  habitMetaRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 6 },
  habitPoints:    { fontFamily: Fonts.mono, fontSize: 11, color: palette.goldText },
  habitDot:       { color: palette.smoke, fontSize: 11 },
  habitStreak:    { fontSize: 11, color: palette.smoke },
  expandBtn:      { padding: 2 },

  habitDetail:    { paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, gap: 4, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: spacing.sm },
  detailLabel:    { ...typography.label, color: palette.goldText, marginTop: 4 },
  detailText:     { ...typography.caption, color: palette.ash },

  warningRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, backgroundColor: 'rgba(212,160,23,0.10)', borderRadius: radii.xs, padding: 6 },
  warningText:    { flex: 1, fontSize: 11, color: palette.warning },

  optionRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 },
  optionLabel:    { fontFamily: Fonts.sansBold, fontSize: 12, color: palette.ivory },
  optionDetail:   { fontSize: 11, color: palette.smoke, marginTop: 1 },

  detailActions:  { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  detailAction:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailActionText:{ fontFamily: Fonts.sansBold, fontSize: 12, color: palette.goldText },

  templateRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.graphite, borderRadius: radii.sm, padding: spacing.sm, marginBottom: 8, gap: spacing.sm },
  templateIcon:   { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.goldLight, alignItems: 'center', justifyContent: 'center' },
  templateInfo:   { flex: 1 },
  templateName:   { fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory },
  templateScience:{ fontSize: 11, color: palette.smoke, marginTop: 2 },
  templatePts:    { backgroundColor: palette.goldLight, borderRadius: radii.xs, paddingHorizontal: 6, paddingVertical: 2 },
  templatePtsText:{ fontFamily: Fonts.mono, fontSize: 11, color: palette.goldText },

  allAdded:       { ...typography.caption, color: palette.goldText, textAlign: 'center', paddingVertical: spacing.sm },
});
