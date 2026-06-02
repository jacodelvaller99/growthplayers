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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db2 } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { palette, spacing, typography, Fonts, radii } from '@/constants/theme';

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const TODAY_DOW = new Date().getDay(); // 0=dom, 1=lun…

const HABIT_TEMPLATES = [
  { category: 'agua',       icon: 'water-drop',        name: 'Agua al despertar',    science: 'Reactiva el metabolismo. Elimina toxinas acumuladas.' },
  { category: 'sol',        icon: 'wb-sunny',           name: 'Sol matutino 10 min',  science: 'Regula el ritmo circadiano. Síntesis de vitamina D.' },
  { category: 'grounding',  icon: 'grass',              name: 'Grounding 5 min',      science: 'Reduce inflamación sistémica. Regula el sistema nervioso.' },
  { category: 'meditacion', icon: 'self-improvement',   name: 'Meditación matutina',  science: 'Activa corteza prefrontal. Reduce cortisol en 23%.' },
  { category: 'movimiento', icon: 'fitness-center',     name: 'Movimiento 30 min',    science: 'Libera BDNF. Mejora estado de ánimo y claridad mental.' },
  { category: 'frio',       icon: 'ac-unit',            name: 'Ducha fría 2 min',     science: 'Activa norepinefrina. Mejora foco y resistencia al frío.' },
] as const;

interface Habit {
  id: string;
  name: string;
  category: string;
  streak: number;
  completedToday: boolean;
}

export default function HabitosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHabits = async () => {
    if (!userId) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await db2.habits()
        .select(`id, name, category, streak, habit_logs(date)`)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at');

      const mapped: Habit[] = (data ?? []).map((h: any) => ({
        id:            h.id,
        name:          h.name,
        category:      h.category,
        streak:        h.streak ?? 0,
        completedToday: (h.habit_logs ?? []).some((l: any) => l.date === today),
      }));
      setHabits(mapped);
    } catch { /* tabla puede no existir aún */ }
    setLoading(false);
  };

  useEffect(() => { loadHabits(); }, [userId]);

  const createHabit = async (template: typeof HABIT_TEMPLATES[number]) => {
    if (!userId) return;
    try {
      await db2.habits().insert({
        user_id:  userId,
        name:     template.name,
        category: template.category,
        icon:     template.icon,
      });
      loadHabits();
    } catch { Alert.alert('Error', 'No se pudo crear el hábito.'); }
  };

  const toggleToday = async (habit: Habit) => {
    if (!userId) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      if (habit.completedToday) {
        await db2.habitLogs()
          .delete()
          .eq('habit_id', habit.id)
          .eq('user_id', userId)
          .eq('date', today);
      } else {
        await db2.habitLogs().upsert({
          habit_id: habit.id, user_id: userId, date: today,
        });
        // Actualizar streak
        const newStreak = habit.streak + 1;
        await db2.habits()
          .update({ streak: newStreak })
          .eq('id', habit.id);
      }
      loadHabits();
    } catch { /* silencioso */ }
  };

  const activeCount = habits.filter(h => h.completedToday).length;

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
        {/* Progreso del día */}
        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>HOY</Text>
          <Text style={styles.progressValue}>{activeCount}/{Math.max(habits.length, 1)}</Text>
          <Text style={styles.progressSub}>hábitos completados</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${habits.length ? (activeCount / habits.length) * 100 : 0}%` as any }]} />
          </View>
        </View>

        {/* Días de la semana */}
        <View style={styles.weekRow}>
          {DAY_LABELS.map((d, i) => {
            // Convertir: 0=dom en JS → posición 6 en L-D
            const adjustedToday = TODAY_DOW === 0 ? 6 : TODAY_DOW - 1;
            const isPast   = i < adjustedToday;
            const isToday  = i === adjustedToday;
            return (
              <View key={d} style={styles.dayItem}>
                <View style={[styles.dayDot, isPast && styles.dayDotPast, isToday && styles.dayDotToday]} />
                <Text style={[styles.dayLabel, isToday && { color: palette.gold }]}>{d}</Text>
              </View>
            );
          })}
        </View>

        {/* Lista de hábitos activos */}
        {habits.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>MIS HÁBITOS</Text>
            {habits.map(habit => (
              <Pressable
                key={habit.id}
                onPress={() => toggleToday(habit)}
                style={[styles.habitRow, habit.completedToday && styles.habitRowDone]}
              >
                <View style={[styles.habitCheck, habit.completedToday && styles.habitCheckDone]}>
                  {habit.completedToday && (
                    <MaterialIcons name="check" size={16} color={palette.ink} />
                  )}
                </View>
                <View style={styles.habitInfo}>
                  <Text style={[styles.habitName, habit.completedToday && styles.habitNameDone]}>
                    {habit.name}
                  </Text>
                  <Text style={styles.habitStreak}>
                    {habit.streak > 0 ? `🔥 ${habit.streak} días seguidos` : 'Empieza hoy'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Templates para agregar */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>AGREGAR HÁBITO</Text>
          {HABIT_TEMPLATES.map((t) => {
            const alreadyAdded = habits.some(h => h.category === t.category);
            if (alreadyAdded) return null;
            return (
              <Pressable key={t.category} onPress={() => createHabit(t)} style={styles.templateRow}>
                <View style={styles.templateIcon}>
                  <MaterialIcons name={t.icon as any} size={20} color={palette.gold} />
                </View>
                <View style={styles.templateInfo}>
                  <Text style={styles.templateName}>{t.name}</Text>
                  <Text style={styles.templateScience}>{t.science}</Text>
                </View>
                <MaterialIcons name="add-circle-outline" size={22} color={palette.gold} />
              </Pressable>
            );
          })}
          {habits.length >= HABIT_TEMPLATES.length && (
            <Text style={styles.allAdded}>✓ Todos los hábitos añadidos</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: palette.ink },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  backBtn:        { padding: 8 },
  title:          { fontFamily: Fonts.display, fontSize: 16, color: palette.ivory, letterSpacing: 3 },

  content:        { paddingHorizontal: spacing.md, paddingBottom: 40 },

  progressCard:   { backgroundColor: palette.graphite, borderRadius: radii.md, padding: spacing.md, alignItems: 'center', marginBottom: spacing.md },
  progressLabel:  { ...typography.label, color: palette.gold, marginBottom: 4 },
  progressValue:  { fontFamily: Fonts.display, fontSize: 40, color: palette.ivory, lineHeight: 48 },
  progressSub:    { ...typography.caption, color: palette.ash, marginBottom: spacing.sm },
  progressBar:    { width: '100%', height: 3, backgroundColor: palette.line, borderRadius: 2, overflow: 'hidden' },
  progressFill:   { height: '100%', backgroundColor: palette.gold, borderRadius: 2 },

  weekRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  dayItem:        { alignItems: 'center', gap: 4 },
  dayDot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.line },
  dayDotPast:     { backgroundColor: palette.gold },
  dayDotToday:    { backgroundColor: palette.gold, width: 12, height: 12, borderRadius: 6 },
  dayLabel:       { ...typography.caption, color: palette.ash },

  section:        { marginBottom: spacing.lg },
  sectionLabel:   { ...typography.label, color: palette.gold, marginBottom: spacing.sm },

  habitRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.graphite, borderRadius: radii.sm, padding: spacing.sm, marginBottom: 8, gap: spacing.sm },
  habitRowDone:   { opacity: 0.7 },
  habitCheck:     { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: palette.gold, alignItems: 'center', justifyContent: 'center' },
  habitCheckDone: { backgroundColor: palette.gold, borderColor: palette.gold },
  habitInfo:      { flex: 1 },
  habitName:      { fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory },
  habitNameDone:  { textDecorationLine: 'line-through', color: palette.ash },
  habitStreak:    { fontSize: 11, color: palette.smoke, marginTop: 2 },

  templateRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.graphite, borderRadius: radii.sm, padding: spacing.sm, marginBottom: 8, gap: spacing.sm },
  templateIcon:   { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(212,175,55,0.1)', alignItems: 'center', justifyContent: 'center' },
  templateInfo:   { flex: 1 },
  templateName:   { fontFamily: Fonts.sans, fontSize: 14, color: palette.ivory },
  templateScience:{ fontSize: 11, color: palette.smoke, marginTop: 2 },

  allAdded:       { ...typography.caption, color: palette.gold, textAlign: 'center', paddingVertical: spacing.sm },
});
