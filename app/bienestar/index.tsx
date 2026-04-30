import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, screen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useLifeFlow } from '@/hooks/use-lifeflow';

// ─── Daily phrases (stoic / logotherapy) ─────────────────────────────────────
const DAILY_PHRASES = [
  '"La mente ansiosa por el futuro es miserable." — Séneca',
  '"No podemos elegir circunstancias, sí nuestra respuesta." — Epicteto',
  '"El obstáculo es el camino." — Marco Aurelio',
  '"Sufrir es inevitable. Ser víctima es opcional." — Viktor Frankl',
  '"Perder el tiempo es la única pérdida real." — Marco Aurelio',
  '"La vida no examinada no vale vivirse." — Sócrates',
  '"Te perturban tus opiniones, no los hechos." — Epicteto',
  '"Actúa bien hoy. Mañana también será hoy." — Séneca',
  '"El propósito es la fuente de toda energía." — Viktor Frankl',
  '"Eres lo que haces, no lo que dices que harás." — Aristóteles',
  '"La disciplina es recordar lo que quieres." — D. Campbell',
  '"Ningún viento es favorable sin destino." — Séneca',
  '"Primero decide quién quieres ser." — Epicteto',
  '"No busques que lo que ocurre sea como quieres." — Epicteto',
  '"El significado no se encuentra, se construye." — Viktor Frankl',
  '"Lo que haces hoy es lo que más importa." — Buda',
  '"La mente lo es todo. En lo que piensas, te conviertes." — Marco Aurelio',
  '"Nada es tuyo excepto tu voluntad." — Epicteto',
  '"El descanso no es ocio. Es combustible." — Séneca',
  '"Sé el amo de tu atención o serás esclavo del ruido." — Marco Aurelio',
  '"Actúa como si importara. Importa." — William James',
  '"El miedo no detiene la muerte. Solo detiene la vida." — Paulo Coelho',
  '"Tus valores son lo que haces cuando nadie te ve." — Epicteto',
  '"Cada acción es un voto por quien quieres ser." — James Clear',
  '"Disciplina = Libertad." — Jocko Willink',
  '"El sufrimiento sin sentido es desesperación." — Viktor Frankl',
  '"La gravedad de tu norte calibra el tamaño de tu esfuerzo." — Polaris',
  '"Lo urgente ocupa el lugar de lo importante." — Eisenhower',
  '"El guerrero más peligroso es el que tiene propósito." — Polaris',
  '"Duerme temprano. El que conquista la noche conquista el día." — Polaris',
];

function getTodayPhrase(): string {
  const day = new Date().getDate();
  return DAILY_PHRASES[day % DAILY_PHRASES.length];
}

// ─── Time chips ───────────────────────────────────────────────────────────────
const TIME_CHIPS = [1, 3, 5, 10, 15, 20] as const;
type TimeChip = typeof TIME_CHIPS[number];

// ─── Quick-access blocks ──────────────────────────────────────────────────────
type Block = {
  route: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  color: string;
  type: 'meditation' | 'breathing' | 'binaural' | 'sleep' | 'library' | 'journal';
};

const BLOCKS: Block[] = [
  { route: '/bienestar/binaurales',  icon: 'graphic-eq',      label: 'BINAURALES',  color: '#b07d1a', type: 'binaural'   },
  { route: '/bienestar/respiracion', icon: 'air',              label: 'RESPIRACIÓN', color: '#2e7d52', type: 'breathing'  },
  { route: '/bienestar/meditacion',  icon: 'self-improvement', label: 'MEDITACIÓN',  color: '#7c5cbf', type: 'meditation' },
  { route: '/bienestar/sueno',       icon: 'bedtime',          label: 'SUEÑO',       color: '#4a6fa5', type: 'sleep'      },
  { route: '/bienestar/biblioteca',  icon: 'library-music',    label: 'BIBLIOTECA',  color: '#556B2F', type: 'library'    },
  { route: '/bienestar/diario',      icon: 'edit-note',        label: 'DIARIO',      color: '#7D5A50', type: 'journal'    },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

function getWeekDots(sessions: { completedAt: string }[]): boolean[] {
  const now = new Date();
  // 0 = Monday
  const dayOfWeek = (now.getDay() + 6) % 7;
  const dots: boolean[] = Array(7).fill(false);
  sessions.forEach(({ completedAt }) => {
    const d = new Date(completedAt);
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff < 7) {
      const dotIdx = (dayOfWeek - diff + 7) % 7;
      dots[dotIdx] = true;
    }
  });
  return dots;
}

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BienestarHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state } = useLifeFlow();

  const [selectedTime, setSelectedTime] = useState<TimeChip | null>(null);
  const [journalText, setJournalText] = useState('');
  const [saving, setSaving] = useState(false);
  const [journalSaved, setJournalSaved] = useState(false);

  const sessions = state.wellnessSessions ?? [];

  const stats = useMemo(() => {
    const now = new Date();
    const thisWeek = sessions.filter((s) => {
      const diff = (now.getTime() - new Date(s.completedAt).getTime()) / 86400000;
      return diff < 7;
    });
    const minutes = Math.round(thisWeek.reduce((acc, s) => acc + s.durationSeconds, 0) / 60);
    return { weekMinutes: minutes, weekSessions: thisWeek.length, total: sessions.length };
  }, [sessions]);

  const weekDots = useMemo(() => getWeekDots(sessions), [sessions]);

  // Wellness streak: consecutive days back from today with at least one session
  const streak = useMemo(() => {
    const now = new Date();
    let count = 0;
    for (let i = 0; i < 365; i++) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().slice(0, 10);
      const hasSession = sessions.some((s) => s.completedAt.slice(0, 10) === dayStr);
      if (hasSession) count++;
      else if (i > 0) break;
    }
    return count;
  }, [sessions]);

  const saveJournal = useCallback(async () => {
    if (!journalText.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('journal_entries').insert({
          user_id:    user.id,
          content:    journalText.trim(),
          entry_type: 'reflection',
        });
      }
      setJournalText('');
      setJournalSaved(true);
      setTimeout(() => setJournalSaved(false), 2000);
    } catch {
      // Silent fail — journal is best-effort
    } finally {
      setSaving(false);
    }
  }, [journalText]);

  const phrase = useMemo(() => getTodayPhrase(), []);

  return (
    <ScrollView
      style={screen.root}
      contentContainerStyle={[screen.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">

      {/* ── Back + title ── */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={styles.screenTitle}>BIENESTAR</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Greeting + streak ── */}
      <View style={styles.greetingRow}>
        <View style={styles.greetingLeft}>
          <Text style={styles.greetingText}>{greeting()}, {state.profile.name.split(' ')[0]}.</Text>
          <View style={styles.streakRow}>
            <MaterialIcons name="local-fire-department" size={14} color={palette.gold} />
            <Text style={styles.streakText}>{streak} días</Text>
          </View>
        </View>
        <View style={styles.dotRow}>
          {DAY_LABELS.map((label, i) => (
            <View key={label} style={styles.dotItem}>
              <View style={[styles.dot, weekDots[i] && styles.dotActive]} />
              <Text style={styles.dotLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Stats row ── */}
      <PremiumCard style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.weekMinutes}</Text>
            <Text style={styles.statLabel}>min semana</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.weekSessions}</Text>
            <Text style={styles.statLabel}>sesiones</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>total</Text>
          </View>
        </View>
      </PremiumCard>

      {/* ── Time chips ── */}
      <View style={styles.chipsSection}>
        <Text style={styles.chipsLabel}>¿CUÁNTO TIEMPO TIENES?</Text>
        <View style={styles.chipsRow}>
          {TIME_CHIPS.map((t) => (
            <Pressable
              key={t}
              onPress={() => setSelectedTime(selectedTime === t ? null : t)}
              style={[styles.chip, selectedTime === t && styles.chipActive]}>
              <Text style={[styles.chipText, selectedTime === t && styles.chipTextActive]}>
                {t}min
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── 6-block grid ── */}
      <GoldDivider label="MÓDULOS" />
      <View style={styles.grid}>
        {BLOCKS.map((b) => (
          <Pressable
            key={b.route}
            onPress={() => router.push(b.route as never)}
            style={({ pressed }) => [styles.gridCard, pressed && { opacity: 0.75 }]}>
            <View style={[styles.gridIcon, { backgroundColor: b.color + '22' }]}>
              <MaterialIcons name={b.icon} size={26} color={b.color} />
            </View>
            <Text style={[styles.gridLabel, { color: b.color }]}>{b.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* ── Frase del día ── */}
      <GoldDivider label="FRASE DEL DÍA" />
      <PremiumCard style={styles.phraseCard}>
        <MaterialIcons name="format-quote" size={20} color={palette.goldMuted} />
        <Text style={styles.phraseText}>{phrase}</Text>
      </PremiumCard>

      {/* ── Journal ── */}
      <GoldDivider label="REFLEXIÓN" />
      <PremiumCard style={styles.journalCard}>
        <Text style={styles.journalHint}>
          Comparte tu reflexión, intención o gratitud de hoy...
        </Text>
        <TextInput
          style={styles.journalInput}
          multiline
          value={journalText}
          onChangeText={setJournalText}
          placeholder="Escribe aquí..."
          placeholderTextColor={palette.smoke}
          textAlignVertical="top"
          returnKeyType="default"
        />
        <Pressable
          style={[styles.journalBtn, (!journalText.trim() || saving) && styles.journalBtnDisabled]}
          onPress={saveJournal}
          disabled={!journalText.trim() || saving}>
          {saving
            ? <ActivityIndicator size="small" color={palette.black} />
            : journalSaved
              ? <MaterialIcons name="check" size={18} color={palette.black} />
              : <Text style={styles.journalBtnText}>GUARDAR</Text>
          }
        </Pressable>
      </PremiumCard>

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { ...typography.title, color: palette.ivory, fontSize: 18 },

  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  greetingLeft: { gap: 4 },
  greetingText: { ...typography.body, color: palette.ivory, fontSize: 16, fontWeight: '600' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakText: { ...typography.mono, color: palette.ash, fontSize: 12 },
  dotRow: { flexDirection: 'row', gap: 6 },
  dotItem: { alignItems: 'center', gap: 3 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.charcoal,
    borderWidth: 1,
    borderColor: palette.smoke,
  },
  dotActive: { backgroundColor: palette.gold, borderColor: palette.gold },
  dotLabel: { ...typography.label, color: palette.smoke, fontSize: 8, letterSpacing: 0 },

  statsCard: { marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontFamily: Fonts.display, color: palette.ivory, fontSize: 28, letterSpacing: 1 },
  statLabel: { ...typography.label, color: palette.smoke, marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: palette.line },

  chipsSection: { marginBottom: spacing.lg, gap: spacing.sm },
  chipsLabel: { ...typography.label, color: palette.ash },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.line,
  },
  chipActive: { backgroundColor: palette.goldLight, borderColor: palette.gold },
  chipText: { ...typography.label, color: palette.ash },
  chipTextActive: { color: palette.gold },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  gridCard: {
    width: '30%',
    flexGrow: 1,
    aspectRatio: 1,
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    minWidth: 90,
  },
  gridIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    ...typography.label,
    fontSize: 9,
    letterSpacing: 1.5,
    textAlign: 'center',
  },

  phraseCard: { gap: spacing.sm, marginBottom: spacing.lg },
  phraseText: { ...typography.body, color: palette.ash, fontStyle: 'italic', lineHeight: 22 },

  journalCard: { gap: spacing.md },
  journalHint: { ...typography.caption, color: palette.smoke },
  journalInput: {
    ...typography.body,
    color: palette.ivory,
    minHeight: 80,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.graphite,
  },
  journalBtn: {
    backgroundColor: palette.gold,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  journalBtnDisabled: { opacity: 0.4 },
  journalBtnText: { ...typography.label, color: palette.black, fontWeight: '700' },
});
