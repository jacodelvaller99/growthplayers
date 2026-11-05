import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Pantalla, TarjetaOro } from '@/components/pantalla';
import { db2 } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { palette, Fonts, hitBox } from '@/constants/theme';
import {
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
  getScheduledRemindersByHabit,
} from '@/services/notifications';

interface Habit {
  id: string;
  name: string;
  category: string;
  streak: number;
  completedToday: boolean;
  // ── Columnas nuevas (migración meeting_features) — leídas vía cliente sin tipar
  timeOfDay: TimeOfDay;
  sequenceOrder: number;
  /** Se sigue leyendo/escribiendo (columna existente); la UI no lo muestra. */
  points: number;
  importanceText: string | null;
  videoUrl: string | null;
  guideUrl: string | null;
  options: HabitOption[];
}

// Ruta interna asociada a un hábito (deep-link de la práctica / notificación).
function routeForCategory(category: string): string | undefined {
  return findTemplate(category)?.route;
}

// Marcar un hábito es LA acción diaria de esta pantalla. El círculo mide 28;
// `hitBox` crece la caja táctil a 44×44 (también en web, donde `hitSlop` no
// existe) sin mover el círculo.
function HabitCheckButton({ completed, onPress, label }: { completed: boolean; onPress: () => void; label: string }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 250 }); }}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={label}
        style={hitBox(28)}
      >
        <View style={[styles.check, completed && styles.checkDone]}>
          {completed && <MaterialIcons name="check" size={16} color={palette.ink} />}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function HabitosScreen() {
  const router = useRouter();
  const { userId } = useLifeFlow();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  // ids de hábitos con recordatorio agendado (solo nativo)
  const [reminders, setReminders] = useState<Record<string, string>>({});
  // Aviso en línea en la voz de la interfaz; se oculta solo.
  const [banner, setBanner] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showBanner = useCallback((tone: 'success' | 'error', text: string) => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBanner({ tone, text });
    bannerTimer.current = setTimeout(() => setBanner(null), 4000);
  }, []);
  useEffect(() => () => { if (bannerTimer.current) clearTimeout(bannerTimer.current); }, []);

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
          // La plantilla manda sobre el texto guardado: así la copia corregida
          // (sin mecanismos inventados) llega también a quien ya tenía el hábito.
          importanceText: tmpl?.importance ?? h.importance_text ?? null,
          videoUrl:       h.video_url ?? tmpl?.videoUrl ?? null,
          guideUrl:       h.guide_url ?? tmpl?.guideUrl ?? null,
          options:        tmpl?.options ?? (Array.isArray(h.options) ? (h.options as HabitOption[]) : []),
        };
      });
      setHabits(mapped);
      // Rehidrata los recordatorios desde el SO (persisten entre reinicios).
      setReminders(await getScheduledRemindersByHabit());
    } catch { /* la tabla/columnas pueden no existir aún */ }
  };

  useEffect(() => { loadHabits(); }, [userId]);

  const createHabit = async (template: HabitTemplate) => {
    if (!userId) return;
    try {
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
    } catch { showBanner('error', 'No se pudo añadir el hábito. Intenta de nuevo.'); }
  };

  const toggleToday = async (habit: Habit) => {
    if (!userId) return;
    const today = new Date().toISOString().split('T')[0];
    // Optimista: refleja el cambio de inmediato.
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
    if (Platform.OS === 'web') return; // solo existen en nativo
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
      showBanner('error', 'Este hábito no tiene un horario sugerido.');
      return;
    }
    const granted = await requestNotificationPermissions();
    if (!granted) {
      showBanner('error', 'Activa las notificaciones para recibir recordatorios.');
      return;
    }
    const id = await scheduleDailyRoutineReminder({
      title:  habit.name.toUpperCase(),
      body:   habit.importanceText ?? 'Es hora de tu práctica.',
      hour:   tmpl.reminderHour,
      minute: tmpl.reminderMinute ?? 0,
      // Deep-link: abre la práctica si existe; si no, esta pantalla.
      route:  tmpl.route ?? '/bienestar/habitos',
      data:   { habitId: habit.id },
    });
    if (id) {
      setReminders((prev) => ({ ...prev, [habit.id]: id }));
      showBanner(
        'success',
        `Te avisaremos a las ${String(tmpl.reminderHour).padStart(2, '0')}:${String(tmpl.reminderMinute ?? 0).padStart(2, '0')}.`,
      );
    }
  };

  // ── Derivados ────────────────────────────────────────────────────────────────
  const doneCount = habits.filter((h) => h.completedToday).length;
  const bySeq = (a: Habit, b: Habit) => a.sequenceOrder - b.sequenceOrder;
  const morning = habits.filter((h) => h.timeOfDay === 'morning').sort(bySeq);
  const evening = habits.filter((h) => h.timeOfDay === 'evening').sort(bySeq);
  const other   = habits.filter((h) => h.timeOfDay !== 'morning' && h.timeOfDay !== 'evening');
  const ordered = [...morning, ...evening, ...other];
  const nextHabit = ordered.find((h) => !h.completedToday) ?? null;

  const addedCategories = new Set(habits.map((h) => h.category));
  const firstTemplate = [...MORNING_HABITS, ...EVENING_HABITS].find((t) => !addedCategories.has(t.category)) ?? null;

  const heroIsTemplate = !nextHabit && habits.length === 0 && !!firstTemplate;
  // UNA acción: el siguiente hábito por marcar; sin hábitos, añadir el primero.
  const hero = nextHabit ? (
    <TarjetaOro
      meta="SIGUIENTE"
      metaRight={`${doneCount} DE ${habits.length}`}
      title={nextHabit.name}
      detail="Toca cuando lo hayas hecho."
      onPress={() => toggleToday(nextHabit)}
      accessibilityLabel={`Marcar como hecho: ${nextHabit.name}`}
    />
  ) : habits.length === 0 && firstTemplate ? (
    <TarjetaOro
      meta="PARA EMPEZAR"
      title={firstTemplate.name}
      detail={firstTemplate.science}
      onPress={() => createHabit(firstTemplate)}
      accessibilityLabel={`Añadir hábito: ${firstTemplate.name}`}
    />
  ) : undefined;

  const sub = habits.length === 0
    ? 'Elige uno para empezar.'
    : doneCount === habits.length
      ? `Hoy: ${doneCount} de ${habits.length} hechos. Listo por hoy.`
      : `Hoy: ${doneCount} de ${habits.length} hechos.`;

  const renderHabit = (habit: Habit) => {
    const isExpanded = expanded === habit.id;
    const tmpl = findTemplate(habit.category);
    const hasReminder = !!reminders[habit.id];
    const route = routeForCategory(habit.category);
    const toggleExpand = () => setExpanded(isExpanded ? null : habit.id);
    return (
      <View key={habit.id} style={styles.row}>
        <View style={styles.rowMain}>
          <HabitCheckButton
            completed={habit.completedToday}
            onPress={() => toggleToday(habit)}
            label={`Marcar ${habit.name}`}
          />
          {/* Toda la fila (nombre + flecha) abre el detalle: un objetivo grande. */}
          <Pressable
            style={styles.rowInfo}
            onPress={toggleExpand}
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
            accessibilityLabel={`${habit.name}. ${isExpanded ? 'Ocultar detalle' : 'Ver detalle'}`}>
            <View style={styles.rowText}>
              <Text style={[styles.name, habit.completedToday && styles.nameDone]}>{habit.name}</Text>
              {habit.streak > 1 && <Text style={styles.meta}>{habit.streak} días seguidos</Text>}
            </View>
            <MaterialIcons name={isExpanded ? 'expand-less' : 'expand-more'} size={22} color={palette.smoke} />
          </Pressable>
        </View>

        {isExpanded && (
          <View style={styles.detail}>
            {!!habit.importanceText && <Text style={styles.detailText}>{habit.importanceText}</Text>}
            {!!tmpl?.warning && <Text style={styles.detailText}>{tmpl.warning}</Text>}
            {habit.options.map((opt, i) => (
              <Text key={`${opt.label}-${i}`} style={styles.detailText}>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                {opt.detail ? ` — ${opt.detail}` : ''}
              </Text>
            ))}
            <View style={styles.detailActions}>
              {!!route && (
                <Pressable style={styles.detailAction} onPress={() => router.push(route as never)} accessibilityRole="button" accessibilityLabel="Abrir práctica">
                  <Text style={styles.detailActionText}>Abrir práctica</Text>
                </Pressable>
              )}
              {!!habit.guideUrl && (
                <Pressable style={styles.detailAction} onPress={() => openExternal(habit.guideUrl!)} accessibilityRole="button" accessibilityLabel="Abrir guía (enlace externo)">
                  <Text style={styles.detailActionText}>Guía</Text>
                </Pressable>
              )}
              {!!habit.videoUrl && (
                <Pressable style={styles.detailAction} onPress={() => openExternal(habit.videoUrl!)} accessibilityRole="button" accessibilityLabel="Ver video (enlace externo)">
                  <Text style={styles.detailActionText}>Video</Text>
                </Pressable>
              )}
              {/* Recordatorios = notificaciones locales: solo en nativo. */}
              {(tmpl?.reminderHour !== undefined) && Platform.OS !== 'web' && (
                <Pressable
                  style={styles.detailAction}
                  onPress={() => toggleReminder(habit)}
                  accessibilityRole="button"
                  accessibilityLabel={hasReminder ? 'Desactivar recordatorio' : 'Activar recordatorio'}
                  accessibilityState={{ selected: hasReminder }}>
                  <Text style={styles.detailActionText}>
                    {hasReminder ? 'Quitar recordatorio' : 'Recordarme'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderGroup = (title: string, list: Habit[]) => {
    if (list.length === 0) return null;
    return (
      <View style={styles.group}>
        <Text style={styles.groupLabel}>{title}</Text>
        {list.map(renderHabit)}
      </View>
    );
  };

  // Catálogo por rutina, sin los ya añadidos. Toda la fila añade (≥56 px).
  const renderTemplates = (title: string, list: HabitTemplate[]) => {
    // Lo que ya propone la tarjeta amarilla no se repite como fila.
    const pending = list.filter((t) => !addedCategories.has(t.category) && !(heroIsTemplate && t === firstTemplate));
    if (pending.length === 0) return null;
    return (
      <View style={styles.group}>
        <Text style={styles.groupLabel}>{title}</Text>
        {pending.map((t) => (
          <Pressable
            key={t.category}
            onPress={() => createHabit(t)}
            style={({ pressed }) => [styles.row, styles.rowMain, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Añadir hábito: ${t.name}`}>
            <View style={styles.rowText}>
              <Text style={styles.name}>{t.name}</Text>
              <Text style={styles.meta}>{t.science}</Text>
            </View>
            <MaterialIcons name="add" size={22} color={palette.smoke} />
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <Pantalla
      meta="BIENESTAR · CUERPO"
      title="Hábitos"
      sub={sub}
      hero={hero}>
      {banner && (
        <Text
          style={[styles.banner, { color: banner.tone === 'success' ? palette.ash : palette.danger }]}
          accessibilityRole="alert"
          accessibilityLiveRegion={banner.tone === 'success' ? 'polite' : 'assertive'}>
          {banner.text}
        </Text>
      )}

      {renderGroup('MAÑANA', morning)}
      {renderGroup('NOCHE', evening)}
      {renderGroup('OTROS', other)}

      {renderTemplates('AÑADIR · MAÑANA', MORNING_HABITS)}
      {renderTemplates('AÑADIR · NOCHE', EVENING_HABITS)}
    </Pantalla>
  );
}

// Abre un recurso externo (guía/video). Carga perezosa para no romper en web.
function openExternal(url: string) {
  try {
    if (Platform.OS === 'web') {
      // noopener,noreferrer: evita reverse-tabnabbing en el link externo.
      if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    const Linking = require('expo-linking');
    Linking.openURL(url);
  } catch { /* silencioso */ }
}

const styles = StyleSheet.create({
  banner:      { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 21, marginBottom: 16 },

  group:       { marginBottom: 32 },
  groupLabel:  { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke, marginBottom: 8 },

  row:         { borderTopWidth: 1, borderTopColor: palette.line },
  rowMain:     { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 },
  rowInfo:     { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText:     { flex: 1, gap: 2 },
  pressed:     { opacity: 0.7 },
  name:        { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 22, color: palette.ivory },
  nameDone:    { color: palette.smoke },
  meta:        { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, color: palette.smoke },

  check:       { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: palette.lineHard, alignItems: 'center', justifyContent: 'center' },
  checkDone:   { backgroundColor: palette.gold, borderColor: palette.gold },

  detail:      { paddingLeft: 44, paddingBottom: 16, gap: 8 },
  detailText:  { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, color: palette.ash },
  optionLabel: { fontFamily: Fonts.sansBold, color: palette.ivory },
  detailActions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 24 },
  detailAction:  { minHeight: 44, justifyContent: 'center' },
  detailActionText: { fontFamily: Fonts.sansBold, fontSize: 15, color: palette.goldText },
});
