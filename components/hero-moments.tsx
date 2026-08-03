/**
 * hero-moments — Camino del Héroe, Motor de Momentos.
 *
 * Al entrar, como mucho una vez por día: ecoa lo último que el usuario le
 * dijo a Norman (si hay algo nuevo que ecoar), si no un logro viejo que
 * todavía no tuvo su momento, y si no, un recordatorio de gratitud. Nunca
 * más de uno — un solo momento por día, descartable.
 */
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { analytics } from '@/lib/analytics';
import {
  defaultHeroMomentState,
  markMomentShown,
  selectMoment,
  type HeroMoment,
  type HeroMomentState,
} from '@/lib/heroJourneyLogic';
import { fetchLatestSummaries, fetchMemoryProfile } from '@/lib/memory';
import { logSilentError } from '@/lib/observability';
import { readLocal, writeLocal } from '@/storage/local';

const STORAGE_KEY = 'hero:v1';

export function HeroMoments() {
  const { userId, isLoaded, state } = useLifeFlow();
  const [moment, setMoment] = useState<HeroMoment | null>(null);

  useEffect(() => {
    if (!isLoaded || !userId) return;
    // El momento se monta en el layout raíz, así que también corría ENCIMA del
    // onboarding: un usuario nuevo recibía "Bienvenido de nuevo" antes de haber
    // entrado una sola vez, tapando el flujo que aún estaba completando. El
    // umbral es justo lo que este componente celebra — no puede pisarlo.
    if (!state.onboardingCompleted) return;
    let cancelled = false;

    (async () => {
      try {
        const [storedState, summaries, profile] = await Promise.all([
          readLocal<Partial<HeroMomentState>>(STORAGE_KEY),
          fetchLatestSummaries(userId, 1),
          fetchMemoryProfile(userId),
        ]);
        if (cancelled) return;

        // Spread sobre el default: un `hero:v1` guardado antes de Fase 3 no
        // tiene `echoedWinKeys` — sin esto, un momento viejo en disco revienta.
        const momentState: HeroMomentState = { ...defaultHeroMomentState, ...storedState };

        const today = new Date().toISOString().slice(0, 10);
        const latest = summaries[0];
        const selected = selectMoment({
          today,
          name: state.profile.name,
          latestSummary: latest?.id ? { id: latest.id, summary: latest.summary ?? '' } : null,
          recentWins: profile?.recent_wins ?? [],
          state: momentState,
        });

        if (!selected) return;
        setMoment(selected);
        analytics.track('hero_moment_shown', { kind: selected.kind });
        await writeLocal(STORAGE_KEY, markMomentShown(momentState, today, selected));
      } catch (e) {
        logSilentError('heroMoments.select', e);
      }
    })();

    return () => { cancelled = true; };
  }, [isLoaded, userId, state.onboardingCompleted, state.profile.name]);

  if (!moment) return null;

  const dismiss = () => {
    analytics.track('hero_moment_dismissed', { kind: moment.kind });
    setMoment(null);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <Pressable style={s.backdrop} onPress={dismiss}>
        <Pressable style={s.panel} onPress={(e) => e.stopPropagation()}>
          <View style={s.topAccent} />
          <View style={s.content}>
            <Text style={s.message}>{moment.message}</Text>
            <PrimaryButton label="SEGUIR" onPress={dismiss} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  panel: {
    backgroundColor: palette.graphiteLight,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radii.lg,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: palette.blackDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 20,
  },
  topAccent: {
    height: 3,
    backgroundColor: palette.gold,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  message: {
    ...typography.body,
    fontFamily: Fonts.displayMedium,
    color: palette.ivory,
    lineHeight: 24,
  },
});
