/**
 * Mi Memoria (cliente) — vista de apoyo de su propio proceso.
 *
 * Lee SOLO el perfil propio (RLS user_id = auth.uid()) + sus resúmenes. Pasa por
 * `clientSafeProfile` para no mostrar lo clínico/estratégico. NUNCA toca briefings
 * ni notas de admin (RLS lo bloquea de todos modos). Tono: acompañar, no exponer.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommitmentsCard, ConversationTimeline, ProfileSynopsisCard } from '@/components/memory';
import { PremiumCard, useScreen } from '@/components/polaris';
import { palette, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { fetchLatestSummaries, fetchMemoryProfile, type MemoryProfile, type MemorySummaryRow } from '@/lib/memory';
import { clientSafeProfile } from '@/lib/memoryLogic';
import { fetchTasks, type MentorTask } from '@/lib/mentorExecution';
import { clientProgress, clientSafeTasks } from '@/lib/mentorExecutionLogic';

// Estado de tarea en tono de apoyo (sin "vencida/evitada" duro hacia el cliente).
const CLIENT_STATUS: Record<string, { label: string; color: string }> = {
  completed:   { label: 'Hecha',     color: palette.success },
  in_progress: { label: 'En curso',  color: palette.goldText },
  overdue:     { label: 'Pendiente', color: palette.warning },
  blocked:     { label: 'En pausa',  color: palette.warning },
  avoided:     { label: 'En pausa',  color: palette.warning },
  not_started: { label: 'Por hacer', color: palette.smoke },
};

export default function ClienteMemoriaScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, isSubscribed } = useLifeFlow();
  const [profile, setProfile] = useState<MemoryProfile | null>(null);
  const [summaries, setSummaries] = useState<MemorySummaryRow[]>([]);
  const [tasks, setTasks] = useState<MentorTask[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const [p, s, t] = await Promise.all([
      fetchMemoryProfile(userId),
      fetchLatestSummaries(userId, 8),
      fetchTasks(userId),
    ]);
    setProfile(clientSafeProfile(p));
    setSummaries(s);
    setTasks(t);
    setLoading(false);
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  const wins = profile?.recent_wins ?? [];
  const safeTasks = clientSafeTasks(tasks);
  const activeTasks = safeTasks.filter((t) => !t.done);
  const nextTask = activeTasks[0] ?? null;
  const progress = clientProgress(tasks);

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16, paddingBottom: 80 }]}
      showsVerticalScrollIndicator={false}>

      <View style={s.topRow}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={s.title}>MI MEMORIA</Text>
        <View style={{ width: 36 }} />
      </View>
      <Text style={s.intro}>Tu proceso, en un solo lugar. Norman recuerda lo que trabajas para acompañarte mejor.</Text>

      {loading ? (
        <ActivityIndicator color={palette.gold} style={{ marginTop: spacing.xxxl }} />
      ) : (
        <>
          <ProfileSynopsisCard profile={profile} variant="client" />

          {nextTask && (
            <PremiumCard style={[s.card, { borderColor: palette.lineGold }]}>
              <Text style={s.label}>LO SIGUIENTE</Text>
              <Text style={s.nextTitle}>{nextTask.title}</Text>
              {!!nextTask.category && <Text style={s.nextCat}>{nextTask.category}</Text>}
            </PremiumCard>
          )}

          {isSubscribed ? (
            <PremiumCard style={s.card}>
              <Text style={s.label}>MIS TAREAS ACTIVAS</Text>
              {activeTasks.length === 0 ? (
                <Text style={s.muted}>{progress.total > 0 ? '¡Todo al día!' : 'Aún sin tareas asignadas.'}</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {activeTasks.map((t, i) => {
                    const st = CLIENT_STATUS[t.status] ?? CLIENT_STATUS.not_started;
                    return (
                      <View key={i} style={s.taskRow}>
                        <MaterialIcons name="radio-button-unchecked" size={16} color={palette.smoke} />
                        <Text style={s.taskText}>{t.title}</Text>
                        <Text style={[s.taskState, { color: st.color }]}>{st.label}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
              {progress.total > 0 && (
                <Text style={s.progress}>{progress.done}/{progress.total} completadas</Text>
              )}
            </PremiumCard>
          ) : (
            activeTasks.length > 1 && (
              <PremiumCard style={s.card}>
                <Text style={s.muted}>Tu plan completo de tareas y seguimiento está en Premium.</Text>
              </PremiumCard>
            )
          )}

          {wins.length > 0 && (
            <PremiumCard style={s.card}>
              <Text style={s.label}>MIS AVANCES</Text>
              <View style={{ gap: 6 }}>
                {wins.map((w, i) => (
                  <View key={i} style={s.winRow}>
                    <MaterialIcons name="trending-up" size={16} color={palette.success} />
                    <Text style={s.winText}>{w}</Text>
                  </View>
                ))}
              </View>
            </PremiumCard>
          )}

          <CommitmentsCard
            open={profile?.commitments_open}
            completed={profile?.commitments_completed}
            variant="client"
          />

          <ConversationTimeline summaries={summaries} variant="client" />
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.title, color: palette.ivory, fontSize: 18 },
  intro: { ...typography.body, color: palette.ash, marginBottom: spacing.lg },
  card: { gap: spacing.sm, marginBottom: spacing.md },
  label: { ...typography.label, color: palette.goldText, fontSize: 11, letterSpacing: 1.8 },
  winRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  winText: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 19, flex: 1 },
  nextTitle: { ...typography.body, color: palette.ivory, fontSize: 15, lineHeight: 21 },
  nextCat: { ...typography.caption, color: palette.smoke, fontSize: 11 },
  muted: { ...typography.caption, color: palette.smoke, fontSize: 12, fontStyle: 'italic' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taskText: { ...typography.body, color: palette.ash, fontSize: 13, flex: 1 },
  taskState: { ...typography.label, fontSize: 10, letterSpacing: 0.5 },
  progress: { ...typography.mono, color: palette.smoke, fontSize: 11, marginTop: 4 },
});
