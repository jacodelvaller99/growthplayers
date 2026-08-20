import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedNumber } from '@/components/AnimatedNumber';

import { HeroPanel, HeroRule, LensTabs, MetricTile, RowList } from '@/components/focus-deck';
import { useMetricasDia } from '@/hooks/use-metricas-dia';
import {
  AppHeader,
  GoldAccentCard,
  GoldDivider,
  HoverCard,
  PremiumCard,
  PrimaryButton,
  ProgressCard,
  SovereignDeltaTag,
  StateMeter,
  StatusPill,
  screen,
  useScreen,
} from '@/components/polaris';
import { ACTIVE_MODULE } from '@/data/modules';
import { currentWeek, currentWeekNumber, TOTAL_WEEKS } from '@/data/mentorship';
import { Fonts, palette, radii, spacing, surfaces, typography } from '@/constants/theme';
import { alpha } from '@/constants/themeColors';
import { calcSovereignScore, calcSovereignTier, calcSovereignBaseline, calcSovereignDelta, computeStreak } from '@/lib/utils';
import { selectTurno, type TurnoKind } from '@/lib/turnoLogic';
import { fetchCoachIntelligence } from '@/lib/coachIntelligence';
import { clientSafeNarrative } from '@/lib/coachIntelligenceLogic';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { ArcHeader, MilestoneToast } from '@/components/narrative';
import { JornadaTracker } from '@/components/jornada';
import { arcForDay } from '@/lib/narrativeLogic';
import { checkMilestone } from '@/lib/milestoneCheck';
import { useJornada } from '@/hooks/use-jornada';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useUserIntelligence } from '@/hooks/useUserIntelligence';
import { useWellnessStore } from '@/store/wellnessStore';
import { stripMarkdownLite } from '@/lib/markdownLite';
import { logSilentError } from '@/lib/observability';
import { generateWeeklySessionIfNeeded } from '@/lib/weekly-session-generator';
import { useWearableConnections } from '@/lib/wearables';
import { LIVE_SESSION, LIVE_SESSION_READY, getNextSession, formatSessionDate } from '@/data/live-sessions';
import { db2, supabase } from '@/lib/supabase';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'BUENOS DÍAS';
  if (hour < 18) return 'BUENAS TARDES';
  return 'BUENAS NOCHES';
}

const MONTHS_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const DAYS_ES = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
function todayLabel() {
  const d = new Date();
  return `${DAYS_ES[d.getDay()]} · ${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Circular score ring (SVG) — mirrors design ScoreRing ────────────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function ScoreRing({
  value,
  max = 1000,
  size = 132,
  stroke = 8,
  sub,
  empty = false,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  sub?: string;
  /** Sin una sola lectura no hay score que enseñar. `averages` mete
   *  `stress: 5` por defecto y, como el término va invertido, eso son 25
   *  puntos fabricados en el anillo de oro el día 1. Un vacío honesto vale
   *  más que un número inventado. */
  empty?: boolean;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = empty ? 0 : Math.max(0, Math.min(1, value / max));

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(pct, { duration: 900 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  const dashProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={palette.charcoal}
          strokeWidth={stroke}
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={palette.gold}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={dashProps}
        />
      </Svg>
      <View style={ringStyles.center}>
        {empty ? (
          <Text style={ringStyles.big}>—</Text>
        ) : (
          <AnimatedNumber value={value} delay={120} style={ringStyles.big} />
        )}
        {empty ? (
          <Text style={ringStyles.sub}>SIN LECTURAS</Text>
        ) : sub ? (
          <Text style={ringStyles.sub}>{sub}</Text>
        ) : null}
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  big: {
    color: palette.goldText,
    fontFamily: Fonts.display,
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 48,
    letterSpacing: -1,
  },
  sub: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 10,
    marginTop: 2,
  },
});

export default function DashboardScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useBreakpoint();
  const { state, protocolDay, todayCheckIn, latestCheckIn, userId, isLoaded } = useLifeFlow();
  const { user: wellnessUser } = useWellnessStore();
  const { intelligence, engagementTier } = useUserIntelligence(userId);
  const metricasDia = useMetricasDia();
  const progress = Math.min(Math.round((protocolDay / 90) * 100), 100);
  // SETUP del arco: dónde está el usuario en la historia de 90 días.
  // La voz vive en lib/narrativeLogic para que Comando, Progreso y Check-in
  // hablen igual sin copiar strings.
  // Con sus palabras: el arco es la voz diaria, y sin esto le hablaba a
  // cualquiera. `state.profile.painPoint` lo escribe `completeOnboarding`.
  const arc = arcForDay(protocolDay, {
    painPoint: state.profile.painPoint,
    purpose: state.northStar.purpose,
    identity: state.northStar.identity,
  });
  const checkIn = todayCheckIn ?? latestCheckIn;

  const { isConnected: isWearableConnected } = useWearableConnections();
  const hasWearable = isWearableConnected('whoop') || isWearableConnected('oura');

  const [weeklySession, setWeeklySession] = useState<{ ai_message: string; week_number: number } | null>(null);

  useEffect(() => {
    if (userId && state.profile) {
      generateWeeklySessionIfNeeded(userId, protocolDay, state.profile)
        .then(s => { if (s?.ai_message) setWeeklySession(s); })
        .catch((e) => logSilentError('comando.weeklySession', e));
    }
  }, [userId]);

  // Intelligence-driven greeting suffix
  const intelligenceGreeting = (() => {
    if (intelligence.anomaly_detected && intelligence.anomaly_type === 'mood_drop') {
      return 'Tu energía ha bajado estos días. Hablemos con Norman sobre cómo reconectarte.';
    }
    if (intelligence.churn_risk_label === 'critical') {
      return 'Llevas varios días sin actividad. Un pequeño paso hoy reactiva todo el sistema.';
    }
    if (intelligence.churn_risk_label === 'high') {
      return 'Tu consistencia puede estar en riesgo. ¿Qué bloqueó tu práctica?';
    }
    if (engagementTier === 'excellent') {
      return '¡Excelente racha! Tu disciplina está construyendo constancia.';
    }
    return null;
  })();

  // ── EL TURNO — la única opinión de la app sobre qué toca ahora ──────────────
  // Antes esto era `nextActionConfig`, y era SIEMPRE null: indexaba un mapa de
  // slugs (`complete_checkin`) con lo que `calculate-intelligence` escribe, que
  // son frases en español ("Haz tu check-in de hoy"). Ninguna frase coincide
  // con una llave, así que la tarjeta de próxima acción no se renderizó nunca y
  // el Mando caía a una constante. Ahora ambos leen `selectTurno`, que además
  // trae el destino real — el texto y la ruta salen del mismo cómputo y no
  // pueden volver a contradecirse.
  //
  // El peldaño 1 SÍ está cableado: `fetchCoachIntelligence` se llama unas
  // líneas más abajo y su `kind` entra en `selectTurno`. Este comentario decía
  // lo contrario, y por creerlo la ronda anterior arregló los peldaños 2 y 3 y
  // dejó intacto el 1 —que es el que manda en cuanto hay ML—, donde el mismo
  // defecto seguía vivo. Los peldaños 2 y 3 son la degradación (sin ML, sin
  // red, sin consentimiento): el ML afina, no habilita.
  const daysSinceLastCheckIn = useMemo(() => {
    if (todayCheckIn) return 0;
    if (!latestCheckIn?.date) return null;
    const ms = Date.now() - new Date(latestCheckIn.date).getTime();
    return Math.max(0, Math.floor(ms / 86_400_000));
  }, [todayCheckIn, latestCheckIn?.date]);

  // Peldaño 1: la narrativa de coaching. `fetchCoachIntelligence` degrada a
  // vacío por su cuenta (sin red, sin datos, sin ML), así que un fallo aquí
  // simplemente deja la escalera en los peldaños 2 y 3 — nunca en blanco.
  const [coachNarrative, setCoachNarrative] = useState<{
    narrative: { headline: string; why: string };
    kind: TurnoKind;
  } | null>(null);

  useEffect(() => {
    if (!userId) { setCoachNarrative(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const { ci } = await fetchCoachIntelligence(userId);
        if (cancelled) return;
        const safe = clientSafeNarrative(ci);
        setCoachNarrative({
          narrative: { headline: safe.headline, why: safe.why },
          kind: ci.next_action.kind,
        });
      } catch (e) {
        logSilentError('comando.coachNarrative', e);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // La jornada del día (LÉETE → EJECUTA → REGULA → CIERRA). `null` mientras
  // el log local carga: selectTurno sin jornada se comporta como siempre, así
  // que el arranque es el turno clásico y se refina al llegar el log.
  const jornada = useJornada();

  // Hito de calendario al montar — SOLO cuando el estado ya hidrató: evaluar
  // con `checkIns` vacíos escribiría un snapshot de racha 0 encima del real y
  // regalaría (o robaría) un cruce en el siguiente check-in.
  const [milestone, setMilestone] = useState<import('@/lib/narrativeLogic').Milestone | null>(null);
  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    (async () => {
      const m = await checkMilestone(
        { streak: computeStreak(state.checkIns), protocolDay },
        { painPoint: state.profile.painPoint, purpose: state.northStar.purpose },
      );
      if (!cancelled && m) setMilestone(m);
    })();
    return () => { cancelled = true; };
    // Una vez por sesión de pantalla, al hidratar: el cruce de calendario
    // ocurre entre sesiones, no mientras se mira la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // Deep link a la próxima lección para el paso EJECUTA — el turno lleva a la
  // lección, no al catálogo. (nextLesson, más abajo, calcula más cosas para su
  // tarjeta; aquí solo hace falta la ruta y el orden de declaración manda.)
  const nextLessonRoute = useMemo(() => {
    const done = new Set(state.completedLessons ?? []);
    const lesson = ACTIVE_MODULE.lessons.find((l) => !done.has(l.id)) ?? ACTIVE_MODULE.lessons[0];
    return lesson ? `/lesson/${lesson.id}` : null;
  }, [state.completedLessons]);

  const turno = useMemo(() => selectTurno({
    narrative: coachNarrative?.narrative ?? null,
    kind: coachNarrative?.kind ?? null,
    todayCheckIn: todayCheckIn
      ? { energy: todayCheckIn.energy, clarity: todayCheckIn.clarity, stress: todayCheckIn.stress, sleep: todayCheckIn.sleep }
      : null,
    daysSinceLastCheckIn,
    jornada,
    nextLessonRoute,
  }), [coachNarrative, todayCheckIn, daysSinceLastCheckIn, jornada, nextLessonRoute]);

  // Wellness stats
  const totalWellnessSessions = (state.wellnessSessions ?? []).length;
  const totalWellnessMinutes = wellnessUser.totalWellnessMinutes > 0
    ? wellnessUser.totalWellnessMinutes
    : Math.round((state.wellnessSessions ?? []).reduce((acc, s) => acc + (s.durationSeconds ?? 0), 0) / 60);
  const wellnessStreak = wellnessUser.weeklyActivity.filter(Boolean).length;

  // Engagement bar animated width
  const engagementWidth = useSharedValue(0);
  useEffect(() => {
    if (intelligence.engagement_score > 0) {
      engagementWidth.value = withTiming(intelligence.engagement_score, { duration: 1000 });
    }
  }, [intelligence.engagement_score]);
  const engagementBarStyle = useAnimatedStyle(() => ({
    width: `${engagementWidth.value}%` as unknown as number,
  }));

  // Racha real = días consecutivos con check-in. Antes era
  // `Math.max(checkIns.length, protocolDay)`, que solo mide calendario.
  const checkinStreak = useMemo(() => computeStreak(state.checkIns), [state.checkIns]);

  // ── Sovereign Score (real) + tier + weekly delta ─────────────────────────────
  const averages = useMemo(() => {
    const ci = state.checkIns;
    const avg = (vals: number[]) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0);
    return {
      energy:  avg(ci.map((c) => c.energy)),
      clarity: avg(ci.map((c) => c.clarity)),
      stress:  ci.length ? avg(ci.map((c) => c.stress)) : 5,
      sleep:   avg(ci.map((c) => c.sleep)),
    };
  }, [state.checkIns]);

  const wellnessByType = useMemo(() => {
    const sessions = state.wellnessSessions ?? [];
    return {
      meditation: sessions.filter((s) => s.type === 'meditation').length,
      breathing:  sessions.filter((s) => s.type === 'breathing').length,
      binaural:   sessions.filter((s) => s.type === 'binaural').length,
    };
  }, [state.wellnessSessions]);

  const sovereignScore = useMemo(
    () =>
      calcSovereignScore({
        energy:           averages.energy,
        clarity:          averages.clarity,
        stress:           averages.stress,
        sleep:            averages.sleep,
        streak:           checkinStreak,
        completedLessons: (state.completedLessons ?? []).length,
        completedTasks:   Object.keys(state.completedTasks ?? {}).length,
        wellnessMeditation: wellnessByType.meditation,
        wellnessBreathing:  wellnessByType.breathing,
        wellnessBinaural:   wellnessByType.binaural,
      }),
    [averages, checkinStreak, state.completedLessons, state.completedTasks, wellnessByType],
  );
  const sovereignTier = calcSovereignTier(sovereignScore);
  /** Sin una sola lectura el score no mide nada: los 25 puntos que salían el
   *  día 1 venían del `stress: 5` por defecto de `averages`. */
  const sinLecturas = state.checkIns.length === 0;

  // Weekly score gain — real contribution from check-ins logged in the last 7 days.
  // Each check-in adds its coherence-derived points to the composite score.
  const weeklyScoreDelta = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    const recent = state.checkIns.filter((c) => new Date(c.date).getTime() >= weekAgo);
    const points = recent.reduce(
      (acc, c) => acc + Math.round(((c.energy + c.clarity + (10 - c.stress) + c.sleep) / 4) * 2),
      0,
    );
    return points;
  }, [state.checkIns]);

  // Sovereign delta — cuerpo de hoy vs la línea base propia (no el absoluto).
  const sovereignDelta = useMemo(() => calcSovereignDelta(state.checkIns), [state.checkIns]);
  // Día (1–7) dentro de la ventana de construcción de línea base, para el copy
  // "construyendo tu línea base · día X de 7" cuando aún no está lista.
  const baselineDay = useMemo(() => {
    if (calcSovereignBaseline(state.checkIns).ready) return 7;
    if (!state.checkIns.length) return 1;
    const oldest = Math.min(...state.checkIns.map((c) => new Date(c.date).getTime()));
    return Math.min(Math.max(Math.floor((Date.now() - oldest) / 86400000) + 1, 1), 7);
  }, [state.checkIns]);

  // Today's coherence (0–10) — same formula as the check-in screen.
  const coherenceToday = checkIn
    ? Math.round((checkIn.energy + checkIn.clarity + (11 - checkIn.stress) + checkIn.sleep) / 4)
    : 0;

  // Next lesson — first non-completed lesson in the active module.
  // Day-zero (0 lecciones completadas) reframes the lane as the entry point.
  const nextLesson = useMemo(() => {
    const done = new Set(state.completedLessons ?? []);
    const isDayZero = done.size === 0;
    const lesson = ACTIVE_MODULE.lessons.find((l) => !done.has(l.id)) ?? ACTIVE_MODULE.lessons[0];
    const total = ACTIVE_MODULE.lessons.length || 1;
    const completedInModule = ACTIVE_MODULE.lessons.filter((l) => done.has(l.id)).length;
    return {
      lesson,
      isDayZero,
      sectionLabel: isDayZero ? 'EMPIEZA AQUÍ' : 'PRÓXIMA LECCIÓN',
      moduleLabel: `MÓDULO ${ACTIVE_MODULE.order} · ${(ACTIVE_MODULE.arquetipo ?? ACTIVE_MODULE.title.split(/[\s:]/)[0]).toUpperCase()}`,
      lessonTitle: lesson
        ? isDayZero
          ? `Tu primera lección · ${lesson.title}`
          : `L${lesson.order} · ${lesson.title}`
        : ACTIVE_MODULE.title,
      pct: Math.round((completedInModule / total) * 100),
    };
  }, [state.completedLessons]);

  // Latest Norman insight — last mentor message (preview line on the Norman card),
  // falling back to a contextual prompt when the user hasn't chatted yet.
  const normanInsight = useMemo(() => {
    const lastMentor = [...state.mentorMessages].reverse().find((m) => m.role === 'mentor');
    if (lastMentor?.text?.trim()) return lastMentor.text.trim();
    const first = state.profile.name.split(' ')[0] || state.profile.name;
    if (!todayCheckIn) return `Sin lectura de hoy, ${first}. Calibra tu sistema antes de avanzar.`;
    if (checkIn && checkIn.stress >= 8) return 'Tensión alta detectada. Hoy: un frente, no diez. Define el objetivo único.';
    if (checkIn && checkIn.energy <= 3) return 'Energía baja hoy. Cambiamos el protocolo: una sola acción de alto impacto.';
    return `Día ${protocolDay} — ${ACTIVE_MODULE.title.split(':')[0]}. ¿En qué trabajamos hoy?`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mentorMessages, todayCheckIn, checkIn?.stress, checkIn?.energy, protocolDay]);

  // Quick-access wellness tiles (design "ACCESO RÁPIDO" grid).
  const quickAccess: { icon: React.ComponentProps<typeof MaterialIcons>['name']; label: string; route: string }[] = [
    { icon: 'air', label: 'Respiración', route: '/bienestar/respiracion' },
    { icon: 'self-improvement', label: 'Meditación', route: '/bienestar/meditacion' },
    { icon: 'menu-book', label: 'Diario', route: '/bienestar/diario' },
  ];

  // ── Shared JSX blocks (idénticos en mobile y desktop) ─────────────────────

  // LA JORNADA — la evolución de EL TURNO: la misma tarjeta única con una
  // sola opinión y un solo destino, ahora con la misión del día visible
  // (LÉETE → EJECUTA → REGULA → CIERRA). El componente absorbe el titular,
  // el delta y el porqué del turno — misma voz, un solo sitio
  // (components/jornada.tsx), montado igual en móvil y desktop.
  const mandoStripBlock = (
    <JornadaTracker
      flat={!isDesktop}
      jornada={jornada}
      turno={turno}
      arcPhrase={arc.line}
      onPressCta={() => router.push(turno.route as never)}
    />
  );

  const anomalyBlock = intelligence.anomaly_detected && intelligence.anomaly_type && (
    <HoverCard
      onPress={() => router.push('/(tabs)/mentor')}
      accessibilityRole="button"
      accessibilityLabel="Señal detectada — hablar con Norman"
      style={styles.anomalyCard}>
      <MaterialIcons name="warning-amber" size={18} color={palette.goldText} />
      <View style={styles.anomalyTextBlock}>
        <Text style={styles.anomalyTitle}>SEÑAL DETECTADA</Text>
        <Text style={styles.anomalyBody}>
          {intelligence.anomaly_type === 'mood_drop'
            ? 'Bajón de energía detectado. Norman puede ayudarte a entender qué está pasando.'
            : intelligence.anomaly_type === 'streak_break'
            ? 'Racha rota. Hoy es el mejor día para retomar.'
            : 'Llevas días sin conectar con tu mentor. ¿Cómo estás?'}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={18} color={palette.smoke} />
    </HoverCard>
  );

  // North Star daily anchor — identity primer before metrics
  const northAnchorStrip = state.northStar.dailyReminder ? (
    <HoverCard
      onPress={() => router.push('/(tabs)/norte')}
      accessibilityRole="button"
      accessibilityLabel="Recordatorio de tu Norte — ir a Mi Norte"
      style={styles.northAnchor}>
      <MaterialIcons name="north" size={12} color={palette.goldText} />
      <Text style={styles.northAnchorText} numberOfLines={2}>
        {state.northStar.dailyReminder}
      </Text>
    </HoverCard>
  ) : null;

  const engagementBlock = intelligence.engagement_score > 0 && (
    <View style={styles.engagementRow}>
      <Text style={styles.engagementLabel} numberOfLines={1}>ENGAGEMENT</Text>
      <Animated.View style={[styles.engagementBar, engagementBarStyle]} />
      <Text style={styles.engagementScore}>{intelligence.engagement_score}/100</Text>
    </View>
  );

  // metricsRow (TU TABLERO, personalización con MetricCard) se retiró de la
  // vista principal — decisión #7 del plan Focus Deck: las 4 MetricTile ya
  // cubren la biometría con el lenguaje del mockup, y mostrar ambas era la
  // misma información dos veces. `useDashboardPrefs` se conserva por si se
  // reactiva la personalización más adelante.

  const estadoBlock = (
    <View style={styles.stack}>
      <View style={styles.sectionTopRow}>
        <Text style={screen.sectionTitle}>Biometría</Text>
        <StatusPill
          label={todayCheckIn ? 'ACTUALIZADO' : 'SIN LECTURA'}
          tone={todayCheckIn ? 'gold' : 'muted'}
        />
      </View>
      {metricasDia.source !== 'none' ? (
        <>
          <View style={styles.tileGrid}>
            {metricasDia.tiles.map((t) => (
              <MetricTile
                key={t.label}
                label={t.label}
                value={t.value}
                unit={t.unit}
                stateLabel={t.stateLabel}
                state={t.state}
                series={t.series}
              />
            ))}
          </View>
          {metricasDia.source === 'checkin' && (
            <Text style={styles.tileGridNote}>Según tu check-in — conecta un wearable para lecturas exactas</Text>
          )}
        </>
      ) : checkIn ? (
        <PremiumCard style={styles.meterCard}>
          <StateMeter label="Energía" value={checkIn.energy} />
          <StateMeter label="Enfoque / claridad" value={checkIn.clarity} />
          <StateMeter label="Estrés" value={checkIn.stress} inverted />
        </PremiumCard>
      ) : (
        /* Informativo, no pulsable: era el CUARTO control a /checkin en el
           mismo scroll. Dice lo que falta; quien manda ahí es el Mando. */
        <View style={styles.estadoEmpty}>
          <MaterialIcons name="assignment" size={20} color={palette.smoke} />
          <View style={{ flex: 1 }}>
            <Text style={styles.estadoEmptyTitle}>SIN LECTURA HOY</Text>
            <Text style={styles.estadoEmptySub}>Registra tu check-in para calibrar el sistema</Text>
          </View>
        </View>
      )}
      {!hasWearable && protocolDay >= 3 && (
        <HoverCard
          onPress={() => router.push('/perfil/wearables' as never)}
          accessibilityRole="button"
          accessibilityLabel="Conectar wearable"
          style={styles.wearableCta}>
          <MaterialIcons name="watch" size={16} color={palette.goldText} />
          <View style={styles.wearableCtaCopy}>
            <Text style={styles.wearableCtaTitle}>CONECTA TU WEARABLE</Text>
            <Text style={styles.wearableCtaSub}>
              WHOOP u Oura — HRV, recuperación y sueño automáticos
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={16} color={palette.smoke} />
        </HoverCard>
      )}
    </View>
  );

  const protocolBlock = (
    <PremiumCard style={styles.protocolCard}>
      <StatusPill label={`MÓDULO ${ACTIVE_MODULE.order} · ACTIVO`} />
      <Text style={styles.protocolTitle}>{ACTIVE_MODULE.title}</Text>
      <Text style={styles.protocolBody}>
        Próxima acción: completa la lección activa y ejecuta un bloque mercader de 90 minutos
        sin mensajería.
      </Text>
      <PrimaryButton
        label="CONTINUAR LECCIÓN"
        icon="play-arrow"
        onPress={() => router.push({ pathname: '/module/[id]', params: { id: ACTIVE_MODULE.id } })}
      />
    </PremiumCard>
  );

  const wellnessBlock = (
    <PremiumCard style={styles.wellnessCard}>
      <View style={styles.wellnessRow}>
        <View style={styles.wellnessIconBox}>
          <MaterialIcons name="spa" size={28} color={palette.purple} />
        </View>
        <View style={styles.wellnessBody}>
          <Text style={styles.wellnessTitle}>LIFEFLOW</Text>
          <Text style={styles.wellnessSub}>Meditación · Respiración · Binaurales</Text>
        </View>
      </View>
      {totalWellnessSessions > 0 && (
        <View style={styles.wellnessStats}>
          <View style={styles.wellnessStat}>
            <AnimatedNumber value={totalWellnessSessions} delay={300} style={styles.wellnessStatNum} />
            <Text style={styles.wellnessStatLabel}>SESIONES</Text>
          </View>
          <View style={styles.wellnessStatDivider} />
          <View style={styles.wellnessStat}>
            <AnimatedNumber value={totalWellnessMinutes} delay={420} style={styles.wellnessStatNum} />
            <Text style={styles.wellnessStatLabel}>MINUTOS</Text>
          </View>
          <View style={styles.wellnessStatDivider} />
          <View style={styles.wellnessStat}>
            <AnimatedNumber value={wellnessStreak} delay={540} style={styles.wellnessStatNum} />
            <Text style={styles.wellnessStatLabel}>DÍAS/SEM</Text>
          </View>
        </View>
      )}
      <PrimaryButton
        label="ABRIR LIFEFLOW"
        icon="spa"
        onPress={() => router.push('/bienestar' as never)}
      />
    </PremiumCard>
  );

  // ── Norman Quick Panel — chips predictivos por módulo + estado ───────────────
  const normanChips = useMemo(() => {
    type Chip = { label: string; icon: React.ComponentProps<typeof MaterialIcons>['name']; prompt: string };
    const hour = new Date().getHours();
    const mo = ACTIVE_MODULE.order ?? 0;

    // Pool contextual (máx 2) — se insertan primero si aplican
    const ctx: Chip[] = [];
    if (!todayCheckIn) {
      ctx.push({ label: '¿Cómo está mi sistema?', icon: 'monitor-heart', prompt: 'Aún no registré mi check-in de hoy. ¿Cómo debo calibrar y preparar mi sistema antes de avanzar?' });
    }
    if (checkIn && checkIn.stress >= 7) {
      ctx.push({ label: 'Bajar tensión ahora', icon: 'self-improvement', prompt: `Mi estrés está en ${checkIn.stress}/10. Dame un protocolo inmediato de regulación del sistema nervioso que pueda aplicar ahora mismo.` });
    } else if (checkIn && checkIn.energy <= 3) {
      ctx.push({ label: 'Recuperar energía', icon: 'bolt', prompt: `Mi energía está en ${checkIn.energy}/10. ¿Cuál es la acción de mínimo esfuerzo y máximo impacto para este estado hoy?` });
    }
    if (ctx.length < 2) {
      if (hour >= 5 && hour < 10) {
        ctx.push({ label: 'Apertura del día', icon: 'wb-sunny', prompt: 'Estoy iniciando mi día. Dame una intención específica y una acción mercader concreta para las próximas 3 horas.' });
      } else if (hour >= 20) {
        ctx.push({ label: 'Cierre del día', icon: 'nights-stay', prompt: 'Estoy cerrando el día. Ayúdame a revisar qué avancé, qué evité y cómo preparo el sistema para mañana.' });
      }
    }

    // Chips por módulo activo (siempre 2 relevantes al contenido actual)
    const byModule: Record<number, [Chip, Chip]> = {
      0: [{ label: '¿Qué cambia primero en mí?', icon: 'military-tech', prompt: '¿Qué es lo primero que debe cambiar en mi sistema interno para que el Método Polaris funcione?' },
          { label: 'Acción del Método hoy', icon: 'play-arrow', prompt: 'Estoy en el módulo inicial del Método Polaris. ¿Qué acción concreta me recomiendas ejecutar hoy?' }],
      1: [{ label: 'Mi creencia más limitante', icon: 'fitness-center', prompt: '¿Cuál es la creencia limitante que más me está frenando hoy? Ayúdame a identificarla y a reformularla.' },
          { label: 'Mi yo en 5 años', icon: 'search', prompt: '¿Qué me diría mi versión de 5 años adelante sobre las decisiones que estoy tomando hoy?' }],
      2: [{ label: '¿Qué emoción evito sentir?', icon: 'bolt', prompt: '¿Qué emoción estoy evitando sentir ahora mismo? Guíame a nombrarla y a procesarla desde el Método.' },
          { label: 'Escritura terapéutica', icon: 'edit', prompt: 'Guíame con una práctica de escritura terapéutica del Método Polaris para liberar lo que tengo acumulado.' }],
      3: [{ label: '¿Qué me enseña esta crisis?', icon: 'explore', prompt: '¿Qué está intentando enseñarme la situación difícil que enfrento ahora? ¿Cómo la veo desde el protocolo?' },
          { label: 'Aplicar C.A.D.A.V.R.A.', icon: 'hub', prompt: '¿Cómo aplico el marco C.A.D.A.V.R.A. a mi situación actual? Dame los pasos específicos.' }],
      4: [{ label: 'Entrar en Flow ahora', icon: 'water', prompt: '¿Cómo entro en estado de Flow en los próximos 30 minutos? Dame el protocolo de entrada específico para mi estado actual.' },
          { label: 'Coherencia cardíaca', icon: 'favorite', prompt: 'Guíame en un protocolo de coherencia cardíaca ahora mismo. Necesito regular mi sistema nervioso autónomo.' }],
      5: [{ label: 'Mis llaves de éxito', icon: 'vpn-key', prompt: '¿Cuál es la llave maestra que más necesito abrir en esta fase del protocolo para desbloquear mi siguiente nivel?' },
          { label: 'Mi relación con el dinero', icon: 'attach-money', prompt: '¿Mi relación actual con el dinero viene del miedo o del servicio? Ayúdame a identificar el patrón real.' }],
      6: [{ label: 'Planear mi semana', icon: 'calendar-today', prompt: 'Ayúdame a planear mi semana desde el modelo Polaris. ¿Cuáles son mis 3 prioridades de alto impacto?' },
          { label: 'Mis PERAS esta semana', icon: 'hourglass-empty', prompt: '¿Qué actividad de mi semana consume más tiempo sin impactar mis PERAS? Ayúdame a identificarla y eliminarla.' }],
      7: [{ label: 'Relación que necesito atender', icon: 'people', prompt: '¿Cuál relación clave en mi vida necesita mi atención ahora? ¿Qué acción concreta tomo esta semana?' },
          { label: 'Servir desde mis dones', icon: 'volunteer-activism', prompt: '¿Cómo sirvo mejor a mi equipo y entorno desde mis dones naturales? ¿Dónde estoy operando fuera de ellos?' }],
    };

    const modChips: Chip[] = (byModule[mo] ?? byModule[0]);

    // Siempre: analizar coherencia como chip de cierre
    const base: Chip[] = [
      { label: 'Analizar coherencia', icon: 'psychology', prompt: 'Analiza mi coherencia interna hoy. ¿Estoy actuando desde mis valores o desde el miedo? Dame un diagnóstico específico.' },
      { label: 'Recordar mi norte', icon: 'north', prompt: '¿Por qué empecé el protocolo? Recuérdame mi propósito y dame una perspectiva de largo plazo que me ancore hoy.' },
    ];

    return [...ctx, ...modChips, ...base].slice(0, 4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayCheckIn, checkIn?.stress, checkIn?.energy, protocolDay, ACTIVE_MODULE.order]);

  const normanPanelLine = useMemo(() => {
    const first = state.profile.name.split(' ')[0] || state.profile.name;
    if (!todayCheckIn) return `Sin lectura de hoy, ${first}. ¿Cómo entra tu sistema al protocolo?`;
    if (checkIn && checkIn.stress >= 8) return `Tensión alta detectada. ¿Qué lo está generando — nómbralo.`;
    if (checkIn && checkIn.energy <= 3) return `Energía baja hoy. Cambiamos el protocolo: una acción de alto impacto.`;
    const hour = new Date().getHours();
    if (hour < 10) return `Es el momento de apertura. ¿Cuál es tu intención para las próximas 3 horas?`;
    if (hour >= 20) return `Es hora de cierre. ¿Qué avanzaste hoy y qué preparas para mañana?`;
    return `Día ${protocolDay} — ${ACTIVE_MODULE.title.split(':')[0]}. ¿En qué trabajamos?`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayCheckIn, checkIn?.stress, checkIn?.energy, protocolDay]);

  const normanQuickPanel = (
    <GoldAccentCard style={styles.normanQP}>
      {/* Header */}
      <View style={styles.normanQPHeader}>
        <View style={styles.normanQPAvatar}>
          <MaterialIcons name="psychology" size={18} color={palette.goldText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.normanQPName}>NORMAN · MENTOR IA</Text>
          <Text style={styles.normanQPMeta}>Protocolo Soberano · Día {protocolDay}</Text>
        </View>
        <View style={styles.normanQPOnline} />
        <Pressable
          onPress={() => router.push('/(tabs)/mentor' as never)}
          style={({ pressed }) => [styles.normanQPOpen, pressed && { opacity: 0.75 }]}
          accessibilityLabel="Abrir mentor">
          <MaterialIcons name="open-in-new" size={13} color={palette.ink} />
        </Pressable>
      </View>

      {/* Context line */}
      <Text style={styles.normanQPLine}>{normanPanelLine}</Text>

      {/* Chips — 2 × 2 */}
      <View style={styles.normanQPChips}>
        {normanChips.map((chip) => (
          <Pressable
            key={chip.label}
            style={({ pressed }) => [styles.normanChip, pressed && { opacity: 0.75 }]}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/mentor',
                params: { initialPrompt: chip.prompt },
              } as never)
            }>
            <MaterialIcons name={chip.icon} size={12} color={palette.goldText} />
            <Text style={styles.normanChipText} numberOfLines={2}>{chip.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Weekly dispatch — folded inline when available */}
      {weeklySession && (
        <View style={styles.normanWeeklySnippet}>
          <Text style={styles.normanWeeklyLabel}>DESPACHO · SEMANA {weeklySession.week_number}</Text>
          <Text style={styles.normanWeeklyText} numberOfLines={4}>{stripMarkdownLite(weeklySession.ai_message)}</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/mentor' as never)}
            style={({ pressed }) => [styles.normanWeeklyBtn, pressed && { opacity: 0.75 }]}>
            <Text style={styles.normanWeeklyBtnText}>RESPONDER A NORMAN</Text>
            <MaterialIcons name="arrow-forward" size={12} color={palette.goldText} />
          </Pressable>
        </View>
      )}
    </GoldAccentCard>
  );

  // ── Live Session Card ────────────────────────────────────────────────────────
  // No se monta con el `joinUrl` de marcador de posición: la cuenta atrás es
  // real y el botón AGENDAR llevaba a un 404 de Zoom. Vuelve sola en cuanto
  // haya enlace (`LIVE_SESSION_READY`).
  const liveSession = getNextSession(LIVE_SESSION);
  const liveSessionBlock = !LIVE_SESSION_READY ? null : (
    <HoverCard
      style={[styles.liveCard, liveSession.isOngoing && styles.liveCardOngoing]}
      onPress={() => {
        if (typeof window !== 'undefined') {
          // noopener,noreferrer: evita reverse-tabnabbing en el link externo.
          window.open(LIVE_SESSION.joinUrl, '_blank', 'noopener,noreferrer');
        } else {
          const Linking = require('expo-linking');
          Linking.openURL(LIVE_SESSION.joinUrl);
        }
      }}
      accessibilityRole="button"
      accessibilityLabel="Unirse a la sesión en vivo">
      {/* Live indicator */}
      <View style={styles.liveTopRow}>
        <View style={[styles.liveDotWrap, liveSession.isOngoing && styles.liveDotOngoing]}>
          <View style={[styles.liveDot, liveSession.isOngoing && styles.liveDotActive]} />
          <Text style={[styles.liveLabel, liveSession.isOngoing && styles.liveLabelActive]}>
            {liveSession.isOngoing ? 'EN VIVO AHORA' : 'PRÓXIMA SESIÓN'}
          </Text>
        </View>
        <MaterialIcons
          name={liveSession.isOngoing ? 'videocam' : 'event'}
          size={16}
          color={liveSession.isOngoing ? palette.danger : palette.goldText}
        />
      </View>

      {/* Session info */}
      <Text style={styles.liveTitle}>{LIVE_SESSION.title}</Text>
      <Text style={styles.liveSub}>{LIVE_SESSION.subtitle}</Text>

      {/* Countdown */}
      <View style={styles.liveCountdownRow}>
        {liveSession.isOngoing ? (
          <Text style={styles.liveCountdownOngoing}>Sesión en curso · ÚNETE AHORA</Text>
        ) : (
          <>
            <MaterialIcons name="schedule" size={13} color={palette.smoke} />
            <Text style={styles.liveCountdown}>
              {formatSessionDate(liveSession.date, liveSession.isToday, liveSession.daysUntil)}
              {' · '}{LIVE_SESSION.time} COT
              {liveSession.daysUntil === 0 && liveSession.minutesUntil > 0
                ? `  · en ${liveSession.minutesUntil < 60
                    ? `${liveSession.minutesUntil} min`
                    : `${Math.floor(liveSession.minutesUntil / 60)}h ${liveSession.minutesUntil % 60}m`}`
                : ''}
            </Text>
          </>
        )}
      </View>

      {/* Join CTA */}
      <View style={[styles.liveBtn, liveSession.isOngoing && styles.liveBtnOngoing]}>
        <MaterialIcons
          name={liveSession.isOngoing ? 'videocam' : 'open-in-new'}
          size={15}
          color={liveSession.isOngoing ? palette.paper : palette.ink}
        />
        <Text style={[styles.liveBtnText, liveSession.isOngoing && styles.liveBtnTextOngoing]}>
          {liveSession.isOngoing ? 'UNIRME A LA SESIÓN' : `AGENDAR · ${LIVE_SESSION.durationMinutes} MIN`}
        </Text>
      </View>
    </HoverCard>
  );

  // ── Community Teaser ─────────────────────────────────────────────────────────
  const communityBlock = (
    <HoverCard
      style={styles.communityCard}
      onPress={() => router.push('/bienestar/comunidad' as never)}
      accessibilityRole="button"
      accessibilityLabel="Ver comunidad de Operadores Soberanos">
      <View style={styles.communityHeader}>
        <View style={styles.communityIconBox}>
          <MaterialIcons name="groups" size={22} color={palette.goldText} />
        </View>
        <View style={styles.communityCopy}>
          <Text style={styles.communityTitle}>OPERADORES SOBERANOS</Text>
          <Text style={styles.communitySub}>Comunidad del Protocolo</Text>
        </View>
        <MaterialIcons name="chevron-right" size={18} color={palette.smoke} />
      </View>
      <Text style={styles.communityBody}>
        Comparte insights, celebra victorias y mantén la accountability con otros en el protocolo.
      </Text>
    </HoverCard>
  );

  // ── Bienvenida contextual de mentoría (semana actual + CTA) ──────────────────
  const mentoriaBlock = (
    <HoverCard
      style={styles.mentoriaRow}
      onPress={() => router.push('/mentoria' as never)}
      accessibilityRole="button"
      accessibilityLabel="Abrir mi mentoría"
    >
      <GoldAccentCard style={styles.mentoriaCard}>
        <View style={styles.mentoriaHead}>
          <MaterialIcons name="route" size={15} color={palette.goldText} />
          <Text style={styles.mentoriaEyebrow}>
            MENTORÍA · SEMANA {currentWeekNumber(protocolDay)} DE {TOTAL_WEEKS}
          </Text>
        </View>
        <Text style={styles.mentoriaTitle}>{currentWeek(protocolDay).phase}</Text>
        <Text style={styles.mentoriaFocus} numberOfLines={2}>
          {currentWeek(protocolDay).focus}
        </Text>
      </GoldAccentCard>
      <MaterialIcons name="chevron-right" size={20} color={palette.smoke} />
    </HoverCard>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // MOBILE-ONLY BLOCKS — composición fiel al diseño "CENTRO DE COMANDO"
  // ══════════════════════════════════════════════════════════════════════════

  // Header: fecha mono + título display + botón explore → norte
  const mHeader = (
    <View style={mob.header}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={mob.headerDate}>{todayLabel()}</Text>
        <Text style={mob.headerTitle}>CENTRO DE COMANDO</Text>
      </View>
      <Pressable
        onPress={() => router.push('/(tabs)/norte')}
        accessibilityRole="button"
        accessibilityLabel="Ir a Mi Norte"
        style={({ pressed }) => [mob.headerAction, pressed && { opacity: 0.7 }]}>
        <MaterialIcons name="explore" size={20} color={palette.goldText} />
      </Pressable>
    </View>
  );

  // Score Soberano — ring + eyebrow + descripción + delta semanal
  const mScoreCard = (
    <View style={mob.scoreCard}>
      <ScoreRing
        value={sovereignScore}
        max={1000}
        size={96}
        stroke={7}
        sub={`/ ${sovereignTier}`}
        empty={sinLecturas}
      />
      <View style={{ flex: 1 }}>
        <Text style={mob.eyebrow}>SCORE SOBERANO</Text>
        {/* El copy decía "últimos 14 días" y era falso: `averages` promedia TODO
            el historial y 800 de los 1000 puntos son contadores vitalicios
            (lecciones, tareas, bonus) — el score no puede bajar. Se corrige el
            texto, no la fórmula: cambiarla movería el score de todos los
            usuarios y rompería el ranking admin. */}
        <Text style={mob.scoreDesc}>
          {sinLecturas
            ? 'Falta 1 check-in para encender el score. Se calcula sobre tus lecturas: sin ninguna, no hay nada que medir.'
            : 'Acumulado de todo tu historial: promedio de tus check-ins + lecciones y tareas completadas. No baja — el movimiento reciente lo marca el delta.'}
        </Text>
        <View style={mob.deltaWrap}>
          <SovereignDeltaTag delta={sovereignDelta} baselineDay={baselineDay} />
        </View>
        {weeklyScoreDelta > 0 && (
          <View style={mob.deltaRow}>
            <MaterialIcons name="trending-up" size={16} color={palette.success} />
            <Text style={mob.deltaText}>+{weeklyScoreDelta} esta semana</Text>
          </View>
        )}
      </View>
    </View>
  );

  // Check-in: hecho → COHERENCIA DE HOY · pendiente → CALIBRAR SISTEMA HOY
  //
  // La variante PENDIENTE no se monta si el Mando ya lleva ahí: sería el
  // tercer control al mismo destino en la misma pantalla. La variante HECHO se
  // queda siempre — da la coherencia del día, un dato que el Mando no da.
  const checkinDuplicaAlMando = !todayCheckIn && turno.route === '/checkin';
  const mCheckinCard = todayCheckIn ? (
    <HoverCard
      onPress={() => router.push('/checkin')}
      accessibilityRole="button"
      accessibilityLabel="Revisar coherencia de hoy"
      style={mob.checkinDoneCard}>
      <View style={mob.rowBetween}>
        <Text style={[mob.eyebrow, { color: palette.goldText }]}>COHERENCIA DE HOY</Text>
        <MaterialIcons name="check-circle" size={20} color={palette.goldText} />
      </View>
      <View style={mob.coherenceRow}>
        <Text style={mob.coherenceNum}>{coherenceToday}</Text>
        <Text style={mob.coherenceMax}>/ 10</Text>
        <Text style={mob.coherenceStatus}>SISTEMA EN LÍNEA</Text>
      </View>
      <View style={mob.track}>
        <View style={[mob.trackFill, { width: `${coherenceToday * 10}%` }]} />
      </View>
    </HoverCard>
  ) : checkinDuplicaAlMando ? null : (
    <HoverCard
      onPress={() => router.push('/checkin')}
      accessibilityRole="button"
      accessibilityLabel="Calibrar sistema hoy"
      style={mob.checkinCta}>
      <View style={mob.checkinCtaIcon}>
        <MaterialIcons name="monitor-heart" size={24} color={palette.goldText} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={mob.checkinCtaTitle}>CALIBRAR SISTEMA HOY</Text>
        <Text style={mob.checkinCtaSub}>Aún no lees tu estado de hoy</Text>
      </View>
      <MaterialIcons name="arrow-forward" size={22} color={palette.goldText} />
    </HoverCard>
  );

  // Norman — avatar + nombre + ACTIVO + chip CONSULTAR + insight (borde-izq oro)
  const mNormanCard = (
    <Pressable
      onPress={() => router.push('/(tabs)/mentor')}
      accessibilityRole="button"
      accessibilityLabel="Consultar a Norman"
      style={({ pressed }) => [mob.normanCard, pressed && { opacity: 0.9 }]}>
      <View style={mob.normanTop}>
        <View style={mob.normanAvatar}>
          <MaterialIcons name="psychology" size={22} color={palette.goldText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={mob.normanName}>NORMAN · MENTOR IA</Text>
          <View style={mob.normanStatusRow}>
            <View style={mob.normanDot} />
            <Text style={mob.normanStatusText}>ACTIVO</Text>
          </View>
        </View>
        <View style={mob.normanChip}>
          <Text style={mob.normanChipText}>CONSULTAR</Text>
        </View>
      </View>
      <GoldAccentCard style={mob.normanInsightWrap}>
        <Text style={mob.normanInsight} numberOfLines={4}>{normanInsight}</Text>
      </GoldAccentCard>
    </Pressable>
  );

  // Próxima lección — section label + card (thumbnail + play + módulo + título + %)
  const mNextLessonBlock = (
    <View style={mob.section}>
      <View style={mob.sectionLabelRow}>
        <Text style={mob.sectionLabel}>{nextLesson.sectionLabel}</Text>
        <View style={mob.sectionRule} />
      </View>
      <HoverCard
        onPress={() =>
          router.push({ pathname: '/module/[id]', params: { id: ACTIVE_MODULE.id } })
        }
        accessibilityRole="button"
        accessibilityLabel={`Abrir lección: ${nextLesson.lessonTitle}`}
        style={mob.lessonCard}>
        <View style={mob.lessonThumb}>
          <View style={mob.lessonPlay}>
            <MaterialIcons name="play-arrow" size={28} color={palette.ink} />
          </View>
          <Text style={mob.lessonModule}>{nextLesson.moduleLabel}</Text>
        </View>
        <View style={mob.lessonBody}>
          <Text style={mob.lessonTitle} numberOfLines={2}>{nextLesson.lessonTitle}</Text>
          <View style={mob.lessonProgressRow}>
            <View style={[mob.track, { flex: 1 }]}>
              <View style={[mob.trackFill, { width: `${nextLesson.pct}%` }]} />
            </View>
            <Text style={mob.lessonPct}>{nextLesson.pct}%</Text>
          </View>
        </View>
      </HoverCard>
    </View>
  );

  // Acceso rápido — grid 3: Respiración / Meditación / Diario
  const mQuickAccessBlock = (
    <View style={mob.section}>
      <View style={mob.sectionLabelRow}>
        <Text style={mob.sectionLabel}>ACCESO RÁPIDO</Text>
        <View style={mob.sectionRule} />
      </View>
      <View style={mob.quickGrid}>
        {quickAccess.map((q) => (
          <Pressable
            key={q.label}
            onPress={() => router.push(q.route as never)}
            accessibilityRole="button"
            accessibilityLabel={q.label}
            style={({ pressed }) => [mob.quickTile, pressed && { opacity: 0.85 }]}>
            <MaterialIcons name={q.icon} size={24} color={palette.goldText} />
            <Text style={mob.quickLabel}>{q.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // DESKTOP-ONLY — "Cockpit Polaris": hero cinematográfico + command grid
  // ══════════════════════════════════════════════════════════════════════════

  // Banda hero full-width: estado del sistema (ring) · decisión de hoy (mando)
  // · calibración (check-in) — el orden narrativo de móvil, en una sola mirada.
  const deskHero = isDesktop ? (
    <Animated.View
      entering={FadeInDown.springify().damping(20).stiffness(180)}
      style={[styles.deskHeroBand, deskHeroGlow]}>
      <View style={styles.deskScoreCol}>
        <ScoreRing
          value={sovereignScore}
          max={1000}
          size={180}
          stroke={10}
          sub={`/ ${sovereignTier}`}
          empty={sinLecturas}
        />
        <SovereignDeltaTag delta={sovereignDelta} baselineDay={baselineDay} />
        {weeklyScoreDelta > 0 && (
          <View style={styles.deskDeltaRow}>
            <MaterialIcons name="trending-up" size={14} color={palette.success} />
            <Text style={styles.deskDeltaText}>+{weeklyScoreDelta} esta semana</Text>
          </View>
        )}
      </View>
      <View style={styles.deskHeroCenter}>
        {/* Sin `DÍA N ·`: lo dice el eyebrow del ArcHeader tres líneas abajo
            («ACTO II · PROFUNDIDAD · DÍA 45 · 90»), y decirlo dos veces en la
            misma banda es ruido. El arco es el dueño de dónde estás. */}
        <Text style={styles.deskHeroEyebrow}>{`PROTOCOLO SOBERANO · ${todayLabel()}`}</Text>
        <Text style={styles.deskHeroTitle}>{`${greeting()},\n${state.profile.name}.`}</Text>
        {intelligenceGreeting ? (
          <Text style={styles.deskHeroBody}>{intelligenceGreeting}</Text>
        ) : null}
        <MilestoneToast milestone={milestone} />
        {mandoStripBlock}
        {/* El `PrimaryButton` de oro macizo que vivía aquí se quitó: el Mando
            de arriba YA es una tarjeta pulsable con su propio verbo y su
            flecha, y en el día normal los dos apuntaban a /checkin. Dos CTA de
            oro en la misma banda es exactamente el «nada es primero» que este
            trabajo vino a matar. La afordancia sobrevive en la tarjeta de
            check-in, a la derecha del hero. */}
        <View style={styles.deskHeroActions}>
          <Text style={styles.time} numberOfLines={1}>
            {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </Text>
        </View>
      </View>
      <View style={styles.deskHeroCheckin}>{mCheckinCard}</View>
    </Animated.View>
  ) : null;

  return (
    <ScrollView
      style={sc.root}
      contentContainerStyle={
        isDesktop
          ? styles.contentDesktop
          : [sc.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]
      }
      showsVerticalScrollIndicator={false}
      bounces
      overScrollMode="never"
      keyboardShouldPersistTaps="handled">

      {isDesktop && <AppHeader title="POLARIS" />}

      {isDesktop ? (
        /* ══════════════════════════════════════════════════════════
           DESKTOP LAYOUT — "Cockpit Polaris": hero + command grid 3/5/3
           ══════════════════════════════════════════════════════════ */
        <>
          {/* SETUP — el mismo arco que en móvil. El hero ya trae "DÍA N" en su
              eyebrow, pero no la línea narrativa: es la única voz de la app y
              vivía enterrada en la pestaña Progreso. */}
          {/* SIN `compact`. Con él, la frase que cita al usuario no se pintaba
              en ninguna parte: los cuatro consumidores lo pasaban, así que el
              arco personalizado vivía solo en el `accessibilityLabel`. El
              problema real era el PÁRRAFO de tres oraciones, no la línea — así
              que la rama se acortó a una sola frase y el «DÍA N · 90» se mudó
              al eyebrow. El Mando sigue siendo lo único grande. */}
          <ArcHeader arc={arc} />
          {northAnchorStrip}

          {/* ZONA 1 — hero cinematográfico full-width */}
          {deskHero}

          {/* ZONA 2 — engagement. Las fichas biométricas viven en `estadoBlock`
              (ZONA 3, más abajo) — no se repiten aquí. metricsRow (el
              MetricCard viejo) se retiró de esta zona sin sustituto: hacerlo
              con una copia propia habría dibujado las mismas 4 fichas dos
              veces en la misma pantalla, verificado en el navegador. */}
          <Animated.View
            entering={FadeInDown.delay(120).springify().damping(20).stiffness(180)}
            style={styles.deskZone2}>
            {engagementBlock}
          </Animated.View>

          {/* ZONA 3 — command grid: ESTADO · ACCIÓN · RAIL VIVO */}
          <View style={styles.deskGrid}>
            <Animated.View
              entering={FadeInDown.delay(200).springify().damping(20).stiffness(180)}
              style={styles.deskColEstado}>
              <GoldDivider label="ESTADO DEL DÍA" />
              {estadoBlock}
              <ProgressCard
                label={protocolDay >= 60 ? 'ARC DE TRANSFORMACIÓN · FASE FINAL' : protocolDay >= 30 ? 'ARC DE TRANSFORMACIÓN · PROFUNDIDAD' : 'ARC DE TRANSFORMACIÓN · BASE'}
                value={`${progress}% · Día ${protocolDay} de 90`}
                progress={progress}
              />
              <GoldDivider label="LIFEFLOW" />
              {wellnessBlock}
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(280).springify().damping(20).stiffness(180)}
              style={styles.deskColAccion}>
              {anomalyBlock}
              <GoldDivider label="HOY EN TU PROTOCOLO" />
              {mNextLessonBlock}
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(360).springify().damping(20).stiffness(180)}
              style={styles.deskColRail}>
              <View style={[styles.deskRailInner, deskRailSticky]}>
                <GoldDivider label="NORMAN · MENTOR IA" />
                {normanQuickPanel}
                <GoldDivider label="MENTORÍA" />
                {mentoriaBlock}
                <GoldDivider label="SESIÓN EN VIVO" />
                {liveSessionBlock}
                <GoldDivider label="COMUNIDAD" />
                {communityBlock}
                <CommunityPreview />
                <GoldDivider label="MI NORTE" />
                <PremiumCard style={styles.northCard}>
                  <Text style={styles.northTitle}>{state.northStar.purpose || 'Define tu norte'}</Text>
                  <Text style={styles.northBody}>
                    {state.northStar.dailyReminder || 'Agrega tu recordatorio diario en Mi Norte.'}
                  </Text>
                  <PrimaryButton
                    label="EDITAR NORTE"
                    icon="explore"
                    onPress={() => router.push('/(tabs)/norte')}
                  />
                </PremiumCard>
              </View>
            </Animated.View>
          </View>
        </>
      ) : (
        /* ══════════════════════════════════════════════════════════
           MOBILE LAYOUT — "CENTRO DE COMANDO" (fiel al diseño)
           ══════════════════════════════════════════════════════════ */
        <>
          {/* Núcleo del diseño */}
          {mHeader}
          {/* SETUP — día y acto. El móvil no tenía NINGÚN marcador de posición
              en el protocolo: el "Día N de 90" solo existía en la rama desktop. */}
          {/* SIN `compact`. Con él, la frase que cita al usuario no se pintaba
              en ninguna parte: los cuatro consumidores lo pasaban, así que el
              arco personalizado vivía solo en el `accessibilityLabel`. El
              problema real era el PÁRRAFO de tres oraciones, no la línea — así
              que la rama se acortó a una sola frase y el «DÍA N · 90» se mudó
              al eyebrow. El Mando sigue siendo lo único grande. */}
          <ArcHeader arc={arc} />
          {/* El hito de calendario (día 30/90) se evalúa al montar: antes solo
              lo evaluaba el guardado del check-in y se perdía si ese día no
              había lectura. `milestone:v1` lo hace idempotente. */}
          <MilestoneToast milestone={milestone} />
          {/* TENSIÓN — la única decisión de hoy. mandoStripBlock estaba escrito
              pero solo se montaba dentro de deskHero, así que el teléfono
              —donde se abre a diario— perdía la única pieza direccional. */}
          {/* ── HÉROE CONSOLIDADO ────────────────────────────────────────
              En escritorio, score + jornada + coherencia comparten UNA tarjeta.
              En móvil eran tres apiladas, cada una con su borde y su título: la
              misma información enmarcada tres veces. Mismo contenido, un marco. */}
          <HeroPanel>
            {mandoStripBlock}
            <HeroRule />
            {mScoreCard}
            {mCheckinCard ? <><HeroRule />{mCheckinCard}</> : null}
          </HeroPanel>

          {/* Señales en tiempo real (solo cuando aplican) */}
          {northAnchorStrip}
          {anomalyBlock}

          {/* Norman */}
          {mNormanCard}

          {/* Próxima lección + acceso rápido */}
          {mNextLessonBlock}
          {mQuickAccessBlock}

          {/* ── LENTES ──────────────────────────────────────────────────
              Debajo del héroe había SIETE secciones apiladas con su divisor:
              mentoría, protocolo, estado del día, lifeflow, sesión en vivo,
              comunidad y norte. Todas siguen aquí con el mismo contenido; lo que
              cambia es que se elige una en vez de recorrerlas todas cada mañana. */}
          <LensTabs
            lenses={[
              { id: 'hoy', label: 'HOY', render: () => (<>
                {protocolBlock}
                {estadoBlock}
                <View style={{ gap: spacing.sm }}>
                  <Text style={screen.sectionTitle}>Estado del día</Text>
                  <RowList
                    rows={[
                      { label: 'Racha', value: checkinStreak > 0 ? `${checkinStreak} días seguidos` : 'retomar hoy' },
                      { label: 'Módulo activo', value: `0${ACTIVE_MODULE.order} · ${ACTIVE_MODULE.title.split(/[\s:]/)[0]}` },
                      { label: 'Próxima lección', value: `${nextLesson.lessonTitle} · ${nextLesson.pct}%` },
                      { label: 'Día de protocolo', value: `${protocolDay} / 90` },
                    ]}
                  />
                </View>
              </>) },
              { id: 'cuerpo', label: 'CUERPO', render: () => (<>{wellnessBlock}</>) },
              { id: 'personas', label: 'PERSONAS', render: () => (<>
                {mentoriaBlock}
                {liveSessionBlock}
                {communityBlock}
                <CommunityPreview />
              </>) },
              { id: 'norte', label: 'MI NORTE', render: () => (<>
          <PremiumCard style={styles.northCard}>
            <Text style={styles.northTitle}>{state.northStar.purpose || 'Define tu norte'}</Text>
            <Text style={styles.northBody}>
              {state.northStar.dailyReminder || 'Agrega tu recordatorio diario en Mi Norte.'}
            </Text>
            <PrimaryButton
              label="EDITAR NORTE"
              icon="explore"
              onPress={() => router.push('/(tabs)/norte')}
            />
          </PremiumCard>
              </>) },
            ]}
          />
        </>
      )}
    </ScrollView>
  );
}

// ── Desktop-only (web): fondo radial del hero + rail sticky ──────────────────
// backgroundImage/position:sticky solo existen en react-native-web; en nativo
// estos objetos son undefined y el spread en el style array es un no-op.
const deskHeroGlow = Platform.select<object | undefined>({
  web: {
    backgroundImage: `radial-gradient(ellipse at 18% 0%, ${palette.goldGlow} 0%, transparent 55%)`,
  },
  default: undefined,
});

const deskRailSticky = Platform.select<object | undefined>({
  web: { position: 'sticky', top: 24 },
  default: undefined,
});

const styles = StyleSheet.create({
  // ── Desktop content container — "Cockpit Polaris" ──────────────────────────
  contentDesktop: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 1440,
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 80,
    gap: 32,
  },
  // ZONA 1 — banda hero full-width (score · mando · check-in)
  deskHeroBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxl,
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.lineGoldSubtle,
    borderRadius: radii.xl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    minHeight: 260,
  },
  deskScoreCol: {
    width: 220,
    alignItems: 'center',
    gap: spacing.md,
  },
  deskDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deskDeltaText: { ...typography.caption, color: palette.success, fontWeight: '600' },
  deskHeroCenter: {
    flex: 1,
    minWidth: 0,
    gap: spacing.md,
  },
  deskHeroEyebrow: {
    ...typography.label,
    color: palette.goldText,
    fontSize: 10,
    letterSpacing: 2,
  },
  deskHeroTitle: {
    ...typography.hero,
    color: palette.ivory,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: 1.5,
  },
  deskHeroBody: {
    ...typography.body,
    color: palette.ash,
  },
  deskHeroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  deskHeroCheckin: { width: 300 },
  // ZONA 2 — instrumentos
  deskZone2: { gap: spacing.lg },
  // Metric grid: 4 cols on desktop
  gridDesktop: {
    flexWrap: 'nowrap',
  },
  metricCardDesktop: {
    flex: 1,
    width: undefined,
    minHeight: 120,
  },
  // ZONA 3 — command grid 3/5/3
  deskGrid: {
    flexDirection: 'row',
    gap: spacing.xl,
    alignItems: 'flex-start',
  },
  deskColEstado: { flex: 3, minWidth: 300, gap: spacing.lg },
  deskColAccion: { flex: 5, minWidth: 0, gap: spacing.lg },
  deskColRail: { flex: 3, minWidth: 300 },
  deskRailInner: { gap: spacing.lg },

  // ── Norman Quick Panel ──────────────────────────────────────────────────────
  normanQP: {
    gap: spacing.md,
  },
  normanQPHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  normanQPAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(200,160,80,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  normanQPName: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.ivory,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    lineHeight: 15,
  },
  normanQPMeta: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 11,
    marginTop: 1,
  },
  normanQPOnline: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.success,
  },
  normanQPOpen: {
    backgroundColor: palette.gold,
    borderRadius: radii.sm,
    padding: 6,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  normanQPLine: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  normanQPChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  normanChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.lineSoft,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    width: '48%',
    minHeight: 44,
  },
  normanChipText: {
    ...typography.label,
    color: palette.ash,
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },

  // ── North anchor strip ───────────────────────────────────────────────────
  northAnchor: {
    alignItems: 'center',
    backgroundColor: 'rgba(179,141,60,0.07)',
    borderColor: 'rgba(179,141,60,0.25)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
  },
  northAnchorText: {
    color: palette.goldText,
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Wearable CTA
  wearableCta: {
    alignItems: 'center',
    borderColor: alpha(palette.gold, '33'),
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(201,160,0,0.05)',
    minHeight: 52,
  },
  wearableCtaCopy: {
    flex: 1,
    gap: 2,
  },
  wearableCtaTitle: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.goldText,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    lineHeight: 15,
  },
  wearableCtaSub: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 11,
  },

  // ── Mando de hoy (hero forward) ─────────────────────────────────────────────
  mandoLabel: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.goldText,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  mandoText: {
    // La ÚNICA frase directiva de la app: qué toca ahora. Si algo merece el
    // tamaño grande en el cockpit, es esto.
    //
    // Pasó por dos versiones malas. `typography.body` a 15px: copy de párrafo
    // compitiendo con un anillo de 132px. Y luego `typography.title`, que es
    // uppercase — pero `turno.headline` son oraciones con punto final, así que
    // salía "BAJA LA CARGA ANTES DE EJECUTAR." Una instrucción gritada en
    // versalitas no es autoridad, es un rótulo mal usado.
    ...typography.statement,
    color: palette.ivory,
  },
  mandoCaption: {
    ...typography.body,
    color: palette.smoke,
    fontSize: 12,
    lineHeight: 17,
  },
  // El delta es lo único que el usuario no podía deducir solo: va en oro-texto,
  // por encima del porqué.
  mandoDelta: {
    ...typography.body,
    color: palette.goldText,
    fontSize: 13,
  },
  mandoCta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  mandoCtaText: {
    ...typography.section,
    color: palette.goldText,
  },

  // ── Shared ────────────────────────────────────────────────────────────────
  time: {
    color: palette.goldText,
    fontFamily: Fonts.mono,
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stack: {
    gap: spacing.md,
  },
  sectionTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meterCard: {
    gap: spacing.lg,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tileGridNote: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 11,
  },
  protocolCard: {
    gap: spacing.lg,
  },
  protocolTitle: {
    ...typography.title,
    color: palette.ivory,
  },
  protocolBody: {
    ...typography.body,
    color: palette.ash,
  },
  wellnessCard: {
    gap: spacing.lg,
    marginBottom: 0,
  },
  wellnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  wellnessIconBox: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    backgroundColor: palette.purpleMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  wellnessBody: {
    flex: 1,
    gap: 3,
  },
  wellnessTitle: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.ivory,
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    lineHeight: 18,
  },
  wellnessSub: {
    ...typography.body,
    color: palette.ash,
    fontSize: 12,
  },
  wellnessStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.purpleGlow,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
  },
  wellnessStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  wellnessStatNum: {
    fontFamily: Fonts.display,
    color: palette.purple,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  wellnessStatLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 11,
    letterSpacing: 1,
  },
  wellnessStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: palette.purpleDim,
  },
  northCard: {
    gap: spacing.lg,
  },
  northTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.8,
    lineHeight: 26,
    textTransform: 'uppercase',
  },
  northBody: {
    ...typography.body,
    color: palette.ash,
    fontStyle: 'italic',
  },

  // ── Tablero personalizable ──────────────────────────────────────────────────
  tableroHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    paddingHorizontal: 2,
  },
  tableroLabel: {
    color: palette.smoke,
    fontFamily: Fonts.display,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  tableroPicker: {
    backgroundColor: palette.graphite,
    borderColor: palette.lineSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  tableroPickerHint: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 11,
  },
  tableroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tableroChip: {
    alignItems: 'center',
    borderColor: palette.line,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 32,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  tableroChipActive: {
    backgroundColor: palette.goldLight,
    borderColor: palette.gold,
  },
  tableroChipText: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 11,
  },
  tableroChipTextActive: {
    color: palette.goldText,
    fontWeight: '700',
  },
  tableroChipIndex: {
    color: palette.goldText,
    fontFamily: Fonts.mono,
    fontSize: 9,
    fontWeight: '700',
  },

  // ── Anomaly alert card ──────────────────────────────────────────────────────
  anomalyCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 200, 4, 0.07)',
    borderColor: palette.gold,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  anomalyTextBlock: {
    flex: 1,
    gap: 2,
  },
  anomalyTitle: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.goldText,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    lineHeight: 15,
  },
  anomalyBody: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
    lineHeight: 19,
  },

  // ── Next best action card ───────────────────────────────────────────────────

  // ── Engagement bar ──────────────────────────────────────────────────────────
  engagementRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  engagementLabel: {
    ...typography.label,
    color: palette.smoke,
    flexShrink: 0,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  engagementBar: {
    backgroundColor: palette.gold,
    borderRadius: 2,
    flex: 1,
    height: 4,
    maxWidth: '60%',
    opacity: 0.6,
  },
  engagementScore: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 11,
    width: 52,
    textAlign: 'right',
  },

  // ── Live Session Card ───────────────────────────────────────────────────────
  liveCard: {
    backgroundColor:  'rgba(10,10,10,0.85)',
    borderColor:      alpha(palette.gold, '55'),
    borderRadius:     radii.md,
    borderWidth:      1.5,
    gap:              spacing.md,
    padding:          spacing.lg,
  },
  liveCardOngoing: {
    borderColor: palette.danger,
    borderWidth: 2,
  },
  liveTopRow: {
    alignItems:    'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  liveDotWrap: {
    alignItems:   'center',
    flexDirection: 'row',
    gap:           spacing.xs,
  },
  liveDotOngoing: {},
  liveDot: {
    backgroundColor: palette.gold,
    borderRadius:    4,
    height:          6,
    width:           6,
  },
  liveDotActive: {
    backgroundColor: palette.danger,
  },
  liveLabel: {
    color:        palette.gold,
    fontFamily:   Fonts.mono,
    fontSize:     11,
    letterSpacing: 2,
  },
  liveLabelActive: {
    color: palette.danger,
  },
  liveTitle: {
    color:         palette.ivory,
    fontFamily:    Fonts.display,
    fontSize:      18,
    fontWeight:    '800',
    letterSpacing:  1,
    textTransform: 'uppercase',
  },
  liveSub: {
    ...typography.mono,
    color:   palette.smoke,
    fontSize: 11,
    marginTop: -spacing.xs,
  },
  liveCountdownRow: {
    alignItems:   'center',
    flexDirection: 'row',
    gap:           spacing.xs,
  },
  liveCountdown: {
    ...typography.body,
    color:    palette.ash,
    fontSize: 12,
    lineHeight: 18,
  },
  liveCountdownOngoing: {
    color:       palette.danger,
    fontFamily:  Fonts.mono,
    fontSize:    11,
    letterSpacing: 1.5,
  },
  liveBtn: {
    alignItems:      'center',
    backgroundColor: palette.gold,
    borderRadius:    radii.sm,
    flexDirection:   'row',
    gap:              spacing.sm,
    justifyContent:  'center',
    minHeight:        44,
    paddingVertical:  spacing.sm,
  },
  liveBtnOngoing: {
    backgroundColor: palette.danger,
  },
  liveBtnText: {
    color:        palette.ink,
    fontFamily:   Fonts.mono,
    fontSize:     11,
    fontWeight:   '700',
    letterSpacing: 2,
  },
  liveBtnTextOngoing: {
    color: palette.paper,
  },

  // ── Community Teaser Card ───────────────────────────────────────────────────
  communityCard: {
    backgroundColor: palette.lineSoft,
    borderColor:     palette.lineSoft,
    borderRadius:    radii.md,
    borderWidth:     1,
    gap:             spacing.md,
    padding:         spacing.lg,
  },

  // Mentoría contextual card
  mentoriaRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
  },
  mentoriaCard: {
    flex:      1,
    gap:       3,
    minHeight: 72,
    justifyContent: 'center',
  },
  mentoriaHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mentoriaEyebrow: {
    fontFamily:    Fonts.mono,
    fontSize:      10,
    color:         palette.gold,
    letterSpacing: 1,
  },
  mentoriaTitle: {
    fontFamily:    Fonts.display,
    fontWeight:    '700',
    fontSize:      15,
    color:         palette.ivory,
    letterSpacing: 0.3,
  },
  mentoriaFocus: {
    ...typography.body,
    fontSize:   12.5,
    color:      palette.ash,
    lineHeight: 17,
  },
  communityHeader: {
    alignItems:   'center',
    flexDirection: 'row',
    gap:           spacing.md,
  },
  communityIconBox: {
    alignItems:      'center',
    backgroundColor: 'rgba(179,141,60,0.10)',
    borderRadius:    radii.sm,
    height:          40,
    justifyContent:  'center',
    width:           40,
    flexShrink:      0,
  },
  communityCopy: {
    flex: 1,
    gap:  2,
  },
  communityTitle: {
    color:         palette.ivory,
    fontFamily:    Fonts.display,
    fontSize:      13,
    fontWeight:    '700',
    letterSpacing:  1.5,
  },
  communitySub: {
    ...typography.mono,
    color:   palette.smoke,
    fontSize: 11,
  },
  communityBody: {
    ...typography.body,
    color:    palette.ash,
    fontSize: 13,
    lineHeight: 20,
  },

  // ── Biometrics empty state ──────────────────────────────────────────────────
  estadoEmpty: {
    alignItems: 'center',
    backgroundColor: palette.lineSoft,
    borderColor: palette.lineSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  estadoEmptyTitle: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.smoke,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    lineHeight: 15,
  },
  estadoEmptySub: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },

  // ── Norman weekly dispatch (inline) ────────────────────────────────────────
  normanWeeklySnippet: {
    borderTopWidth: 1,
    borderTopColor: palette.lineSoft,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  normanWeeklyLabel: {
    ...typography.label,
    color: palette.goldText,
    fontSize: 11,
    letterSpacing: 2,
  },
  normanWeeklyText: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  normanWeeklyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  normanWeeklyBtnText: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.goldText,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    lineHeight: 15,
  },
});

// ════════════════════════════════════════════════════════════════════════════
// MOBILE design styles — "CENTRO DE COMANDO" (tokens only, fiel al handoff)
// ════════════════════════════════════════════════════════════════════════════
const mob = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerDate: {
    ...typography.mono,
    color: palette.goldText,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  headerTitle: {
    fontFamily: Fonts.display,
    color: palette.ivory,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1.2,
    lineHeight: 28,
    textTransform: 'uppercase',
  },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Shared eyebrow (mono, like .eyebrow)
  eyebrow: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Shared progress track
  track: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: palette.charcoal,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: palette.gold,
  },

  // Score Soberano card
  // Sin marco: vive DENTRO del panel del héroe. Conservarlo dibujaría una
  // tarjeta dentro de otra, que es exactamente el ruido que se quita.
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: 26,
    paddingHorizontal: 22,
  },
  scoreDesc: {
    ...typography.body,
    color: palette.ash,
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: spacing.sm,
  },
  deltaWrap: {
    marginTop: spacing.sm,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  deltaText: {
    ...typography.mono,
    color: palette.success,
    fontSize: 12,
  },

  // Check-in — done state
  checkinDoneCard: {
    gap: spacing.md,   // sin marco: dentro del panel del héroe
  },
  coherenceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  coherenceNum: {
    fontFamily: Fonts.display,
    color: palette.goldText,
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 44,
  },
  coherenceMax: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 14,
  },
  coherenceStatus: {
    ...typography.mono,
    color: palette.success,
    fontSize: 11,
    letterSpacing: 1,
    marginLeft: 'auto',
  },

  // Check-in — CTA state
  checkinCta: {
    ...surfaces.premiumCard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  checkinCtaIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: palette.goldLight,
    borderWidth: 1,
    borderColor: palette.lineGold,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkinCtaTitle: {
    fontFamily: Fonts.display,
    color: palette.ivory,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    lineHeight: 18,
  },
  checkinCtaSub: {
    ...typography.body,
    color: palette.ash,
    fontSize: 12,
    marginTop: 3,
  },

  // Norman card
  normanCard: {
    ...surfaces.premiumCard,
    padding: spacing.lg,
    gap: spacing.md,
  },
  normanTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  normanAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: palette.goldLight,
    borderWidth: 1,
    borderColor: palette.lineGold,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  normanName: {
    ...typography.mono,
    color: palette.ivory,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  normanStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  normanDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.success,
  },
  normanStatusText: {
    ...typography.mono,
    color: palette.success,
    fontSize: 9.5,
    letterSpacing: 1,
  },
  normanChip: {
    borderWidth: 1,
    borderColor: palette.lineGold,
    backgroundColor: palette.goldLight,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  normanChipText: {
    fontFamily: Fonts.sansBold,
    color: palette.goldText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  normanInsightWrap: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  normanInsight: {
    ...typography.body,
    color: palette.ash,
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },

  // Section label (mono + rule line)
  section: {
    gap: spacing.md,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: palette.line,
  },

  // Próxima lección card
  lessonCard: {
    ...surfaces.premiumCard,
    padding: 0,
    overflow: 'hidden',
  },
  lessonThumb: {
    height: 96,
    backgroundColor: palette.graphiteLight,
    borderBottomWidth: 1,
    borderBottomColor: palette.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonPlay: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonModule: {
    ...typography.mono,
    position: 'absolute',
    top: 12,
    left: 14,
    color: palette.goldText,
    fontSize: 9.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  lessonBody: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  lessonTitle: {
    fontFamily: Fonts.display,
    color: palette.ivory,
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  lessonProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  lessonPct: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 10,
  },

  // Acceso rápido grid
  quickGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  quickTile: {
    ...surfaces.premiumCard,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    minHeight: 76,
  },
  quickLabel: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 9.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});

// ════════════════════════════════════════════════════════════════════════════
// CommunityPreview — sección autocontenida (WS-8): preview de los posts más
// recientes de la comunidad + enlace al feed (estilo Skool). No depende de nada
// del Dashboard: hace su propio fetch y trae sus propios estilos. Diseñada para
// AÑADIRSE bajo el divider "COMUNIDAD" sin tocar el resto de comando.
// ════════════════════════════════════════════════════════════════════════════
interface PreviewPost {
  id: string;
  author: string;
  content: string;
}

function CommunityPreview() {
  const router = useRouter();
  const { userId } = useLifeFlow();
  const [previews, setPreviews] = useState<PreviewPost[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Bloqueos del usuario → no mostrar su contenido en el preview.
        let blocked = new Set<string>();
        if (userId) {
          try {
            const { data: blocks } = await (supabase as any)
              .from('user_blocks')
              .select('blocked_id')
              .eq('blocker_id', userId);
            blocked = new Set<string>((blocks ?? []).map((b: any) => b.blocked_id as string));
          } catch (e) { logSilentError('comando.previewBlocks', e); }
        }

        const { data, error } = await db2.communityPosts()
          .select('id, user_id, content, is_pinned, created_at')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(6);
        if (error || !data) {
          // Fallo y vacío se veían igual: sin rastro no se podía diagnosticar.
          if (error) logSilentError('comando.communityPreviews', error);
          if (!cancelled) setLoaded(true);
          return;
        }

        const visible = (data as any[]).filter((p) => !blocked.has(p.user_id)).slice(0, 2);
        const ids = [...new Set<string>(visible.map((p) => p.user_id).filter(Boolean))];
        const nameMap: Record<string, string> = {};
        if (ids.length > 0) {
          try {
            const { data: profiles } = await supabase
              .from('user_profiles')
              .select('user_id, name')
              .in('user_id', ids);
            (profiles ?? []).forEach((p: any) => { if (p.name) nameMap[p.user_id] = p.name; });
          } catch (e) { logSilentError('comando.previewNames', e); }
        }

        if (!cancelled) {
          setPreviews(visible.map((p) => ({
            id: p.id,
            author: nameMap[p.user_id] ?? 'Miembro',
            content: p.content ?? '',
          })));
          setLoaded(true);
        }
      } catch (e) {
        logSilentError('comando.communityPreviews', e);
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Hasta cargar o si no hay nada que mostrar, no renderizamos nada extra
  // (el teaser de comunidad existente ya cubre el caso vacío).
  if (!loaded || previews.length === 0) return null;

  return (
    <View style={cp.wrap}>
      {previews.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => router.push('/bienestar/comunidad' as never)}
          style={({ pressed }) => [cp.post, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel={`Publicación de ${p.author}`}>
          <View style={cp.avatar}>
            <Text style={cp.avatarText}>{p.author.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={cp.body}>
            <Text style={cp.author}>{p.author}</Text>
            <Text style={cp.content} numberOfLines={2}>{p.content}</Text>
          </View>
        </Pressable>
      ))}
      <Pressable
        onPress={() => router.push('/bienestar/comunidad' as never)}
        accessibilityRole="button"
        accessibilityLabel="Ver toda la comunidad"
        style={({ pressed }) => [cp.viewAll, pressed && { opacity: 0.8 }]}>
        <Text style={cp.viewAllText}>VER TODA LA COMUNIDAD</Text>
        <MaterialIcons name="arrow-forward" size={14} color={palette.goldText} />
      </Pressable>
    </View>
  );
}

const cp = StyleSheet.create({
  wrap: { gap: spacing.sm },
  post: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.goldLight,
    borderWidth: 1,
    borderColor: palette.lineGold,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontFamily: Fonts.display, fontSize: 14, color: palette.goldText },
  body: { flex: 1, gap: 3 },
  author: { fontFamily: Fonts.sans, fontSize: 13, fontWeight: '600', color: palette.ivory },
  content: { ...typography.body, color: palette.ash, fontSize: 13, lineHeight: 19 },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  viewAllText: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: palette.goldText,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
