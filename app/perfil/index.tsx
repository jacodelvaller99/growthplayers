/**
 * app/perfil/index.tsx — "Tu perfil".
 *
 * Gramática del rediseño (como /yo): meta → titular en palabras del usuario →
 * UNA acción amarilla → filas. Sin "score soberano" ni jerga: el puntaje solo
 * aparece explicado en una frase. El día del programa es honesto: si el
 * protocolo se reinició después de los primeros registros, se dice.
 */
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Fila, Pantalla, TarjetaOro } from '@/components/pantalla';
import { Fonts, palette, spacing } from '@/constants/theme';
import { POLARIS_MODULES } from '@/data/modules';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { buildHistoria } from '@/lib/narrativeLogic';
import { protocolSnapshot } from '@/lib/protocolSnapshot';

const DAY_MS = 24 * 60 * 60 * 1000;

function fechaCorta(ms: number): string {
  return new Date(ms).toLocaleDateString('es', { day: 'numeric', month: 'long' });
}

export default function PerfilScreen() {
  const router = useRouter();
  const { state, averages } = useLifeFlow();
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const wellnessSessions = state.wellnessSessions ?? [];
  const wellnessMeditation = wellnessSessions.filter((s) => s.type === 'meditation').length;
  const wellnessBreathing  = wellnessSessions.filter((s) => s.type === 'breathing').length;
  const wellnessBinaural   = wellnessSessions.filter((s) => s.type === 'binaural').length;
  const practices = wellnessMeditation + wellnessBreathing + wellnessBinaural;
  const lessons = (state.completedLessons ?? []).length;

  // Día, racha y puntaje: la MISMA fuente que Comando y Progreso.
  const snap = useMemo(() => protocolSnapshot({
    protocolStartDate: state.protocolStartDate,
    checkIns: state.checkIns,
    completedLessons: lessons,
    completedTasks: Object.keys(state.completedTasks ?? {}).length,
    wellness: { meditation: wellnessMeditation, breathing: wellnessBreathing, binaural: wellnessBinaural },
    now: new Date(),
  }), [state.protocolStartDate, state.checkIns, lessons, state.completedTasks, wellnessMeditation, wellnessBreathing, wellnessBinaural]);
  const { protocolDay, streak } = snap;
  const score = snap.score ?? 0;

  // ¿Se reinició el protocolo? Hay registros anteriores a su fecha de inicio.
  const restartedAt = useMemo(() => {
    if (!state.protocolStartDate) return null;
    const start = new Date(state.protocolStartDate).getTime();
    if (Number.isNaN(start)) return null;
    const first = Math.min(...state.checkIns.map((c) => new Date(c.date).getTime()).filter((t) => !Number.isNaN(t)));
    return Number.isFinite(first) && start - first >= DAY_MS ? start : null;
  }, [state.protocolStartDate, state.checkIns]);

  const earnedArchetypes = useMemo(() => {
    const completed = state.completedLessons ?? [];
    return POLARIS_MODULES
      .filter((m) => m.arquetipo)
      .filter((m) => {
        const total = m.lessons.length;
        return total > 0 && m.lessons.filter((l) => completed.includes(l.id)).length >= total;
      })
      .map((m) => m.arquetipo as string);
  }, [state.completedLessons]);

  const firstName = (state.profile.name || 'Tú').split(' ')[0];

  // La historia — misma fuente que Progreso (buildHistoria).
  const historia = useMemo(() => buildHistoria({
    protocolDay,
    painPoint: state.profile.painPoint,
    purpose: state.northStar.purpose,
    identity: state.northStar.identity,
    completedLessonCount: lessons,
    taskCount: Object.keys(state.completedTasks ?? {}).length,
    checkInsCount: state.checkIns.length,
    avgEnergy: averages.energy ?? 0,
    archetypesEarned: earnedArchetypes,
    daysSinceLastCheckIn: snap.daysSinceLastReading,
  }), [protocolDay, state.profile.painPoint, state.northStar.purpose, state.northStar.identity, lessons, state.completedTasks, state.checkIns.length, averages.energy, earnedArchetypes, snap.daysSinceLastReading]);

  const sub = restartedAt
    ? `Reiniciaste el programa el ${fechaCorta(restartedAt)}. Lo que hiciste antes — ${state.checkIns.length} registros y ${lessons} lecciones — sigue contando.`
    : state.northStar.identity
      ? `“${state.northStar.identity.slice(0, 140)}”`
      : 'Aquí ves lo que llevas hecho y lo que sigue.';

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const text = [
      'POLARIS — MI AVANCE',
      '',
      state.profile.name,
      `Día ${protocolDay} de 90`,
      `${lessons} lecciones · ${state.checkIns.length} registros diarios · ${practices} prácticas`,
    ].join('\n');
    try {
      if (Platform.OS === 'web') {
        const nav = (typeof navigator !== 'undefined' ? navigator : null) as { share?: (d: unknown) => Promise<void>; clipboard?: { writeText?: (t: string) => Promise<void> } } | null;
        if (nav?.share) {
          await nav.share({ title: 'Mi avance — Polaris', text });
        } else if (nav?.clipboard?.writeText) {
          await nav.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }
      } else {
        await Share.share({ message: text, title: 'Mi avance — Polaris' });
      }
    } catch {
      // Cancelado o no soportado — sin ruido.
    } finally {
      setSharing(false);
    }
  };

  return (
    <Pantalla
      meta="TU PERFIL"
      metaRight={`DÍA ${protocolDay} DE 90`}
      title={`${firstName}, vas en el día ${protocolDay} de 90.`}
      sub={sub}
      hero={snap.readingToday ? (
        <TarjetaOro
          meta="TU PROCESO"
          title="Ver tu memoria"
          detail="Tu resumen, tus compromisos y lo que has avanzado."
          onPress={() => router.push('/perfil/cliente' as never)}
        />
      ) : (
        <TarjetaOro
          meta="HOY"
          title="Contar cómo estás"
          detail="Un minuto. Es lo que mueve todo lo demás."
          onPress={() => router.push('/checkin' as never)}
        />
      )}
      footer={
        <Pressable onPress={handleShare} disabled={sharing} accessibilityRole="button" style={styles.quiet}>
          <Text style={styles.quietText}>{sharing ? 'Compartiendo…' : copied ? 'Copiado' : 'Compartir mi avance'}</Text>
        </Pressable>
      }>
      <Fila label="RACHA" value={streak > 0 ? `${streak} días seguidos` : 'Empieza con el registro de hoy'} />
      <Fila label="REGISTROS DIARIOS" value={`${state.checkIns.length}`} />
      <Fila label="LECCIONES" value={`${lessons}`} />
      <Fila label="PRÁCTICAS" value={`${practices}`} />
      {snap.hasReadings && (
        <Fila label="PUNTAJE" value={`${score} de 1000 · sube con cada registro, lección y práctica`} />
      )}
      {earnedArchetypes.length > 0 && <Fila label="ETAPAS COMPLETAS" value={earnedArchetypes.join(' · ')} />}
      {!snap.readingToday && (
        <Fila label="TU MEMORIA" value="Resumen y compromisos" onPress={() => router.push('/perfil/cliente' as never)} />
      )}
      <Fila label="TU RELOJ" value="Conectar o sincronizar" onPress={() => router.push('/perfil/wearables' as never)} />
      <Fila label="APARIENCIA" value="Claro u oscuro" onPress={() => router.push('/perfil/apariencia' as never)} />
      <Fila label="PROGRESO" value="Tus números, semana a semana" onPress={() => router.push('/(tabs)/progreso' as never)} last />

      {historia.length > 0 && (
        <View style={styles.historia}>
          {historia.map((c) => (
            <View key={c.label} style={styles.chapter}>
              <Text style={styles.chapterLabel}>{c.label.toUpperCase()}</Text>
              <Text style={styles.chapterText}>{c.text}</Text>
            </View>
          ))}
        </View>
      )}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  historia: { marginTop: spacing.xxl, gap: spacing.lg, maxWidth: 680 },
  chapter: { gap: 6 },
  chapterLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke },
  chapterText: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24, color: palette.ivory },
  quiet: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  quietText: { fontFamily: Fonts.sans, fontSize: 15, color: palette.smoke },
});
