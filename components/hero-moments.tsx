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
import { Aura } from '@/components/aura';
import { palette, radii, spacing, typography } from '@/constants/theme';
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
          // `source_type: 'manual'` lo escribe SOLO `seedHeroOrigin`, y su
          // resumen SIEMPRE abre con la etiqueta "Día 0 — el umbral." Para un
          // usuario nuevo esa fila es la más reciente (chat y mentoría aún no
          // han corrido), así que `firstSentence` cortaba justo ahí y el día 1
          // Norman decía «La última vez me dijiste: "Día 0 — el umbral."» — a
          // 26px, en la voz más íntima del producto, citando al usuario algo
          // que jamás dijo. El Umbral entero existe para demostrar que la app
          // escuchó; 24h después demostraba lo contrario. Sin eco real, cae a
          // gratitud, que sí es cierto.
          latestSummary:
            latest?.id && latest.source_type !== 'manual'
              ? { id: latest.id, summary: latest.summary ?? '' }
              : null,
          recentWins: profile?.recent_wins ?? [],
          state: momentState,
        });

        if (!selected) {
          // Primera vez: `selectMoment` calla a propósito (decir "bienvenido de
          // nuevo" a quien nunca ha vuelto es mentir). Pero hay que SEMBRAR la
          // fecha igual, o `lastShownDate` se queda en null para siempre y el
          // motor no arranca nunca. Mañana ya hay historia que contar.
          if (momentState.lastShownDate === null) {
            await writeLocal(STORAGE_KEY, { ...momentState, lastShownDate: today });
          }
          return;
        }
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
        {/* El momento del héroe es de los pocos instantes inmersivos del
            producto: el aura le da cuerpo al fondo en vez de dejarlo en un
            velo negro plano. */}
        <Aura state="umbral" weight={0.75} />
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
  // Las palabras del propio usuario a 14px dentro de una tarjeta era lo
  // contrario de la referencia, donde el usuario es lo MÁS grande de la
  // pantalla. Aquí es lo único que hay: que pese como tal.
  message: {
    // Era 26/34 escrito a mano aquí. Ahora es el token `statement`, que nació
    // de este mismo caso: la frase del usuario tiene un tamaño en la marca,
    // no uno por pantalla.
    ...typography.statement,
    color: palette.ivory,
  },
});
