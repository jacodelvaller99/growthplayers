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

export default function ClienteMemoriaScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useLifeFlow();
  const [profile, setProfile] = useState<MemoryProfile | null>(null);
  const [summaries, setSummaries] = useState<MemorySummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const [p, s] = await Promise.all([fetchMemoryProfile(userId), fetchLatestSummaries(userId, 8)]);
    setProfile(clientSafeProfile(p));
    setSummaries(s);
    setLoading(false);
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  const wins = profile?.recent_wins ?? [];

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
});
