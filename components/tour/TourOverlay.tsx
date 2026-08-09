/**
 * TourOverlay — el panel de Norman explicando la pantalla real en la que
 * estás. Navega de verdad (router.push) en vez de simular una captura; el
 * usuario ve el producto, no una maqueta.
 *
 * Voz: intenta reproducir el mp3 del paso (bucket wellness-audio/tour/<id>),
 * y si no existe o expo-av falla, el panel de texto sigue contando la
 * historia entera — nunca bloquea al usuario esperando audio.
 */
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';

import { PrimaryButton, SecondaryButton } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { TOUR_STEPS } from '@/data/tour';
import { isLast, nextIndex, prevIndex, voiceUrlFor } from '@/lib/tourLogic';
import { logSilentError } from '@/lib/observability';
import { useTourStore } from '@/store/tourStore';

export function TourOverlay() {
  const router = useRouter();
  const active = useTourStore((s) => s.active);
  const stepIndex = useTourStore((s) => s.stepIndex);
  const voiceEnabled = useTourStore((s) => s.voiceEnabled);
  const goTo = useTourStore((s) => s.goTo);
  const stop = useTourStore((s) => s.stop);
  const setVoiceEnabled = useTourStore((s) => s.setVoiceEnabled);

  const step = TOUR_STEPS[stepIndex];
  const soundRef = useRef<{ unloadAsync: () => Promise<void> } | null>(null);

  // Navega a la pantalla real del paso + intenta la voz. Un solo efecto: el
  // paso ES la unidad de navegación aquí, no un scroll dentro de la misma.
  useEffect(() => {
    if (!active || !step) return;
    router.push(step.route as never);
    AccessibilityInfo.announceForAccessibility?.(`${step.title}. ${step.why}`);

    let cancelled = false;
    if (voiceEnabled) {
      (async () => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const { Audio } = require('expo-av');
          const { sound } = await Audio.Sound.createAsync(
            { uri: voiceUrlFor(step.id) },
            { shouldPlay: true },
          );
          if (cancelled) { sound.unloadAsync().catch(() => {}); return; }
          soundRef.current = sound;
        } catch (e) {
          // Sin expo-av o sin mp3 generado todavía (handoff pendiente) — el
          // texto del panel ya cuenta la historia completa.
          logSilentError('tour.voice', e);
        }
      })();
    }

    return () => {
      cancelled = true;
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex, voiceEnabled]);

  if (!active || !step) return null;

  const next = nextIndex(stepIndex, TOUR_STEPS.length);
  const prev = prevIndex(stepIndex, TOUR_STEPS.length);
  const last = isLast(stepIndex, TOUR_STEPS.length);

  return (
    <View style={s.backdrop} pointerEvents="box-none">
      <View style={s.panel}>
        <View style={s.header}>
          <Text style={s.eyebrow}>NORMAN TE GUÍA · {stepIndex + 1}/{TOUR_STEPS.length}</Text>
          <Pressable
            onPress={() => setVoiceEnabled(!voiceEnabled)}
            accessibilityRole="button"
            accessibilityLabel={voiceEnabled ? 'Apagar la voz de Norman' : 'Encender la voz de Norman'}
            style={s.voiceBtn}>
            <MaterialIcons name={voiceEnabled ? 'volume-up' : 'volume-off'} size={18} color={palette.goldText} />
          </Pressable>
        </View>
        <Text style={s.title}>{step.title}</Text>
        <Text style={s.why}>{step.why}</Text>
        <View style={s.actions}>
          {prev !== null && (
            <SecondaryButton label="ANTERIOR" icon="arrow-back" onPress={() => goTo(prev)} />
          )}
          {!last && next !== null && (
            <PrimaryButton label="SIGUIENTE" icon="arrow-forward" onPress={() => goTo(next)} />
          )}
          {last && <PrimaryButton label="TERMINAR" icon="check" onPress={stop} />}
        </View>
        <Pressable
          onPress={stop}
          accessibilityRole="button"
          accessibilityLabel="Saltar el tour"
          style={s.skip}>
          <Text style={s.skipText}>SALTAR TOUR</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 900,
    ...(Platform.OS === 'web' ? { position: 'fixed' as never } : null),
  },
  panel: {
    backgroundColor: palette.graphite,
    borderColor: palette.lineGold,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: { ...typography.label, color: palette.goldText, fontSize: 10 },
  voiceBtn: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  title: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  why: { ...typography.body, color: palette.ash, fontSize: 14, lineHeight: 21 },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  skip: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: { color: palette.smoke, fontFamily: Fonts.display, fontSize: 11, letterSpacing: 1.5 },
});
