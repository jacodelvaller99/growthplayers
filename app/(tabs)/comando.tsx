import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMetricasDia } from '@/hooks/use-metricas-dia';
import { useAppMode } from '@/hooks/use-app-mode';
// EspecificoMode (components/comando-modes/especifico.tsx) no se usa aquí a
// propósito: el modo "Específico" ES la composición móvil/escritorio que ya
// existe abajo — reescribirla con el componente nuevo es riesgo sin
// beneficio. El componente queda listo para cuando otras pantallas lo
// necesiten como referencia del patrón completo.
import EsencialMode from '@/components/comando-modes/esencial';
import OperadorMode from '@/components/comando-modes/operador';
import CalmaMode from '@/components/comando-modes/calma';
import GuiadoMode from '@/components/comando-modes/guiado';
import LogosMode from '@/components/comando-modes/logos';
import {
  AppHeader,
  useScreen,
} from '@/components/polaris';
import { ACTIVE_MODULE } from '@/data/modules';
import { currentWeek, currentWeekNumber, TOTAL_WEEKS } from '@/data/mentorship';
import { Fila, Pantalla, TarjetaOro } from '@/components/pantalla';
import { spacing } from '@/constants/theme';
import { protocolSnapshot } from '@/lib/protocolSnapshot';
import { selectTurno, type TurnoKind } from '@/lib/turnoLogic';
import { fetchCoachIntelligence } from '@/lib/coachIntelligence';
import { clientSafeNarrative } from '@/lib/coachIntelligenceLogic';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { MilestoneToast } from '@/components/narrative';
import { ModeSwitch } from '@/components/ModeSwitch';
import { arcForDay } from '@/lib/narrativeLogic';
import { checkMilestone } from '@/lib/milestoneCheck';
import { useJornada } from '@/hooks/use-jornada';
import { JORNADA_LABEL } from '@/lib/jornadaLogic';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useUserIntelligence } from '@/hooks/useUserIntelligence';
import { logSilentError } from '@/lib/observability';
import { generateWeeklySessionIfNeeded } from '@/lib/weekly-session-generator';

const MONTHS_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const DAYS_ES = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
function todayLabel() {
  const d = new Date();
  return `${DAYS_ES[d.getDay()]} · ${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

export default function DashboardScreen() {
  const sc = useScreen();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useBreakpoint();
  const { state, todayCheckIn, latestCheckIn, userId, isLoaded } = useLifeFlow();
  // UNA fuente de verdad para día, racha, score y línea base (ver
  // lib/protocolSnapshot). Progreso lee la misma función.
  const snap = useMemo(() => {
    const ws = state.wellnessSessions ?? [];
    return protocolSnapshot({
      protocolStartDate: state.protocolStartDate,
      checkIns: state.checkIns,
      completedLessons: (state.completedLessons ?? []).length,
      completedTasks: Object.keys(state.completedTasks ?? {}).length,
      wellness: {
        meditation: ws.filter((s) => s.type === 'meditation').length,
        breathing: ws.filter((s) => s.type === 'breathing').length,
        binaural: ws.filter((s) => s.type === 'binaural').length,
      },
      now: new Date(),
    });
  }, [state.protocolStartDate, state.checkIns, state.completedLessons, state.completedTasks, state.wellnessSessions]);
  const protocolDay = snap.protocolDay;
  const { intelligence } = useUserIntelligence(userId);
  const metricasDia = useMetricasDia();
  const { mode: appMode } = useAppMode();
  // SETUP del arco: dónde está el usuario en la historia de 90 días.
  // La voz vive en lib/narrativeLogic para que Comando, Progreso y Check-in
  // hablen igual sin copiar strings.
  // Con sus palabras: el arco es la voz diaria, y sin esto le hablaba a
  // cualquiera. `state.profile.painPoint` lo escribe `completeOnboarding`.
  const arc = arcForDay(protocolDay, {
    painPoint: state.profile.painPoint,
    purpose: state.northStar.purpose,
    identity: state.northStar.identity,
  }, snap.daysSinceLastReading);
  const checkIn = todayCheckIn ?? latestCheckIn;

  useEffect(() => {
    if (userId && state.profile) {
      generateWeeklySessionIfNeeded(userId, protocolDay, state.profile)
        .catch((e) => logSilentError('comando.weeklySession', e));
    }
  }, [userId]);

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
        { streak: snap.streak, protocolDay },
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

  // Racha, score y línea base salen de `snap` (lib/protocolSnapshot): la MISMA
  // función que lee Perfil. Antes cada pantalla promediaba a su manera y daban
  // 348 aquí y 353 allí. Sin lecturas, `score` es null — no se fabrica número.
  const sovereignScore = snap.score ?? 0;
  const sovereignTier = snap.tier ?? 'INICIANDO';
  const sinLecturas = !snap.hasReadings;

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
    if (!todayCheckIn) return `Sin lectura de hoy, ${first}. Empieza por ahí.`;
    if (checkIn && checkIn.stress >= 8) return 'Tensión alta detectada. Hoy: un frente, no diez. Define el objetivo único.';
    if (checkIn && checkIn.energy <= 3) return 'Energía baja hoy. Cambiamos el protocolo: una sola acción de alto impacto.';
    return `Día ${protocolDay} — ${ACTIVE_MODULE.title.split(':')[0]}. ¿En qué trabajamos hoy?`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.mentorMessages, todayCheckIn, checkIn?.stress, checkIn?.energy, protocolDay]);

  // ── Shared JSX blocks (idénticos en mobile y desktop) ─────────────────────

  // metricsRow (TU TABLERO, personalización con MetricCard) se retiró de la
  // vista principal — decisión #7 del plan Focus Deck: las 4 MetricTile ya
  // cubren la biometría con el lenguaje del mockup, y mostrar ambas era la
  // misma información dos veces. `useDashboardPrefs` se conserva por si se
  // reactiva la personalización más adelante.

  // «SIN LECTURA» junto a barras llenas era el promedio histórico de check-ins
  // pintado como si fuera hoy. Sin wearable y sin lectura de hoy, las fichas
  // no tienen dato: no se pintan valores llenos (aquí ni en los modos).
  const tilesFresh = metricasDia.source !== 'checkin' || !!todayCheckIn;
  const dayTiles: typeof metricasDia.tiles = tilesFresh
    ? metricasDia.tiles
    : metricasDia.tiles.map((t) => ({ label: t.label, value: '—', stateLabel: 'SIN DATO', state: 'none', series: [] }));
  const dayTilesSource = tilesFresh ? metricasDia.source : 'none';

  // protocolBlock (tarjeta "MÓDULO · ACTIVO" + CONTINUAR LECCIÓN) se retiró:
  // era la misma acción que mNextLessonBlock, dibujada dos veces.

  // ══════════════════════════════════════════════════════════════════════════
  // MOBILE-ONLY BLOCKS — composición fiel al diseño "CENTRO DE COMANDO"
  // ══════════════════════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════════════════════
  // DESKTOP-ONLY — "Cockpit Polaris": hero cinematográfico + command grid
  // ══════════════════════════════════════════════════════════════════════════

  // ── El tercer eje: MODO ─────────────────────────────────────────────────
  // Los 4 modos no-especifico son composiciones PRESENTACIONALES alternativas
  // sobre los MISMOS datos ya calculados arriba — nunca recalculan nada, así
  // nunca pueden desincronizarse entre sí. 'especifico' sigue el camino de
  // siempre (móvil/escritorio tal como estaban) para cero regresión.
  const recoveryTile = dayTiles.find((t) => t.label === 'HRV') ?? dayTiles[0];
  const modeProps = {
    isDesktop,
    eyebrow: `PROTOCOLO SOBERANO · DÍA ${protocolDay} DE 90`,
    statement: arc.line,
    score: sinLecturas ? 0 : sovereignScore,
    scoreMax: 1000,
    scoreTier: sovereignTier,
    sinLecturas,
    directiveTitle: turno.verb,
    directiveReason: turno.why,
    onDirective: () => router.push(turno.route as never),
    tiles: dayTiles,
    tilesSource: dayTilesSource,
    rows: [
      { label: 'Racha', value: snap.streakLabel },
      { label: 'Módulo activo', value: `0${ACTIVE_MODULE.order} · ${ACTIVE_MODULE.title.split(/[\s:]/)[0]}` },
      { label: 'Próxima lección', value: `${nextLesson.pct}% avanzado` },
      { label: 'Día de protocolo', value: `${protocolDay} / 90` },
    ],
    recoveryLabel: recoveryTile?.label ?? 'RECUPERACIÓN',
    recoveryValue: recoveryTile && recoveryTile.stateLabel !== 'SIN DATO'
      ? `${recoveryTile.value}${recoveryTile.unit ?? ''}`
      : 'SIN DATO',
    recoveryState: recoveryTile?.state ?? 'none',
    // Proporción honesta para el anillo de Calma: con check-in, energía/10 es
    // una fracción real; con wearable el HRV no tiene máximo teórico → null
    // (el Dial pinta solo la pista — la ausencia es información).
    recoveryPct: metricasDia.source === 'checkin' && todayCheckIn ? todayCheckIn.energy / 10 : null,
    recoverySuggestion: recoveryTile?.state === 'bad'
      ? 'Tu cuerpo pide ritmo suave hoy. Ocho minutos de respiración antes de decidir cualquier otra cosa.'
      : 'Tu sistema está en rango — igual vale un momento de respiración consciente antes de arrancar.',
    onRecoveryAction: () => router.push('/bienestar/respiracion' as never),
    normanLine: normanInsight,
    onOpenNorman: () => router.push('/(tabs)/mentor' as never),
    moduleLabel: `MÓDULO ${ACTIVE_MODULE.order} · ${(ACTIVE_MODULE.arquetipo ?? ACTIVE_MODULE.title.split(/[\s:]/)[0]).toUpperCase()}`,
    lessonTitle: nextLesson.lessonTitle,
    lessonPct: nextLesson.pct,
    onContinueLesson: () => router.push({ pathname: '/module/[id]', params: { id: ACTIVE_MODULE.id } }),
    // Guiado espeja la JORNADA persistida del día — el mismo estado que pinta
    // el héroe. Un wizard con puntos decorativos viola la Biblia; estos son
    // los pasos reales, y el activo es el primero sin hacer.
    guidedStepLabel: jornada?.complete ? 'COMPLETA' : JORNADA_LABEL[jornada?.current ?? 'leete'],
    guidedQuestion: jornada?.complete
      ? 'Jornada completa. Lo de hoy ya está — mañana se abre otra.'
      : jornada?.current === 'ejecuta'
        ? `Tu lección de hoy: ${nextLesson.lessonTitle}.`
        : jornada?.current === 'regula'
          ? 'Diez minutos para regular el sistema antes de seguir.'
          : jornada?.current === 'cierra'
            ? 'Cierra el día: ¿qué quedó y qué se suelta?'
            : '¿Cómo entra tu sistema hoy? Empieza por tu lectura.',
    guidedTotalSteps: 4,
    guidedStepIndex: Math.min(jornada?.doneCount ?? 0, 3),
    onGuidedNext: () => {
      const route = jornada?.complete
        ? '/(tabs)/progreso'
        : jornada?.current === 'ejecuta'
          ? (nextLessonRoute ?? `/module/${ACTIVE_MODULE.id}`)
          : jornada?.current === 'regula'
            ? '/bienestar/respiracion'
            : jornada?.current === 'cierra'
              ? '/bienestar/diario'
              : '/checkin';
      router.push(route as never);
    },
    onNavigate: (route: string) => router.push(route as never),
  };

  if (appMode !== 'especifico') {
    const ModeComponent = {
      esencial: EsencialMode,
      operador: OperadorMode,
      calma: CalmaMode,
      guiado: GuiadoMode,
      logos: LogosMode,
    }[appMode];
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
        {/* Los modos alternos no pintan la cabecera de Inicio: sin esto, el
            staff en Esencial/Operador/Calma… no veía el interruptor en el celular. */}
        {!isDesktop && <ModeSwitch current="client" style={mob.modeSwitchTop} />}
        <ModeComponent {...modeProps} />
      </ScrollView>
    );
  }

  // ── HOY (rediseño) ────────────────────────────────────────────────────────
  // Una pantalla, una decisión: la tarjeta amarilla es SIEMPRE el turno de
  // `selectTurno` (antes del check-in, el turno ES el check-in). Debajo, solo
  // tres filas para lo que sigue. El resto de la información vive donde se
  // usa: puntaje y tendencias en Progreso, prácticas en Bienestar.
  const firstName = state.profile.name.split(' ')[0] || state.profile.name;
  const pendingCheckIn = turno.route === '/checkin';
  const anomalyLine =
    intelligence.anomaly_detected && intelligence.anomaly_type
      ? intelligence.anomaly_type === 'mood_drop'
        ? 'Tu energía bajó estos días'
        : intelligence.anomaly_type === 'streak_break'
          ? 'Se cortó tu racha'
          : 'Notó un cambio en tus datos'
      : null;
  const week = currentWeek(protocolDay);

  return (
    <Pantalla
      meta={todayLabel().toUpperCase()}
      metaRight={`DÍA ${protocolDay} / 90`}
      title={`Hola,\n${firstName}.`}
      sub={arc.line}
      hero={
        <TarjetaOro
          meta={pendingCheckIn ? 'CHECK-IN' : 'TU SIGUIENTE PASO'}
          metaRight={pendingCheckIn ? '2 MIN' : todayCheckIn ? `ESTADO ${coherenceToday} / 10` : undefined}
          // Con narrativa, el titular dice QUÉ pasa («Cierra lo que dijiste que
          // harías»); el verbo suelto («Hablar con Norman») no lo decía.
          title={pendingCheckIn ? '¿Cómo\nllegas hoy?' : turno.source === 'narrative' ? turno.headline : capitalize(turno.verb)}
          detail={pendingCheckIn ? undefined : turno.why}
          onPress={() => router.push(turno.route as never)}
        />
      }
      // En escritorio el interruptor ya vive en la barra lateral.
      footer={isDesktop ? undefined : <ModeSwitch current="client" />}>
      <MilestoneToast milestone={milestone} />
      {!!anomalyLine && (
        <Fila label="NORMAN NOTÓ" value={anomalyLine} tone="warn" onPress={() => router.push('/(tabs)/mentor' as never)} />
      )}
      <Fila
        label={nextLesson.isDayZero ? 'EMPIEZA AQUÍ' : 'TU LECCIÓN'}
        value={nextLesson.lesson?.title ?? ACTIVE_MODULE.title}
        onPress={() => router.push((nextLessonRoute ?? `/module/${ACTIVE_MODULE.id}`) as never)}
      />
      <Fila
        label="MENTORÍA"
        value={`Semana ${currentWeekNumber(protocolDay)} de ${TOTAL_WEEKS} · ${week.phase === 'Onboarding' ? 'Empezar' : week.phase}`}
        onPress={() => router.push('/mentoria' as never)}
      />
      <Fila
        label="BIENESTAR"
        value="Respirar, meditar, escribir"
        onPress={() => router.push('/bienestar' as never)}
        last
      />
    </Pantalla>
  );
}

/** «HACER MI CHECK-IN» → «Hacer mi check-in»: el turno viene en mayúsculas de la lógica. */
function capitalize(verb: string) {
  const lower = verb.toLowerCase().replace(/norman/g, 'Norman');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

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
});

const mob = StyleSheet.create({
  modeSwitchTop: { marginBottom: spacing.lg },
});
