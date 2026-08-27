import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppHeader,
  GoldAccentCard,
  GoldDivider,
  PremiumCard,
  PremiumInput,
  PrimaryButton,
  ScaleSelector,
  SecondaryButton,
  screen,
  useScreen,
} from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import { alpha } from '@/constants/themeColors';
import { useToast } from '@/context/ToastContext';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { ConsequenceCard, MilestoneToast } from '@/components/narrative';
import { analytics } from '@/lib/analytics';
import { checkMilestone } from '@/lib/milestoneCheck';
import { coherenceOf, deltaSince, type Milestone } from '@/lib/narrativeLogic';
import { withStepDone } from '@/lib/jornadaLogic';
import { selectTurno } from '@/lib/turnoLogic';
import { useJornada } from '@/hooks/use-jornada';
import { ACTIVE_MODULE } from '@/data/modules';
import { BodyMap } from '@/components/body-map';
import { BodyFocusCard } from '@/components/body-focus-card';
import { readBody, ZONE_AURA_ORIGIN, type BodyZone } from '@/lib/bodyMapLogic';
import { parseBodyPoints, toggleBodyPoint, zonesFromBodyPoints, type BodyPoint } from '@/lib/bodyPointLogic';
import { energyFocusForBodyPoint, needsChestSafety } from '@/lib/energyFocusLogic';
import { Aura } from '@/components/aura';
import { auraFromCheckIn } from '@/lib/auraLogic';
import { logSilentError } from '@/lib/observability';
import { computeStreak } from '@/lib/utils';
import { scheduleCheckinReminder } from '@/services/notifications';

function todayLabel() {
  return new Date()
    .toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();
}

const CHECK_IN_TITLES = [
  'LEE EL\nSISTEMA.',
  'AUDITA\nTU ESTADO.',
  'CALIBRA\nEL SISTEMA.',
  'MIDE EL\nTERRENO.',
  'LEE TU\nSEÑAL.',
  'REGISTRA\nLA SEÑAL.',
  'VERIFICA\nTU BASE.',
];

function checkInTitle(streak: number): string {
  const idx = streak % CHECK_IN_TITLES.length;
  return CHECK_IN_TITLES[idx];
}

// ── Micro-ritual: box-breathing inline (4·4·4·4) ────────────────────────────
// Que el check-in REGULE, no solo recolecte. Reusa el patrón del orbe de
// app/bienestar/respiracion.tsx en versión compacta (sin librerías nuevas).
const BOX_PHASES = [
  { label: 'INHALA', duration: 4, scale: 1.25 },
  { label: 'SOSTÉN', duration: 4, scale: 1.25 },
  { label: 'EXHALA', duration: 4, scale: 0.78 },
  { label: 'SOSTÉN', duration: 4, scale: 0.78 },
] as const;
const RITUAL_CYCLES = 6; // ~96s — entra en la ventana de 2–3 min con el pre/post

const ORB = 132;

type RitualPhase = 'intro' | 'breathing' | 'post';

function MicroRitual({
  preTension,
  preTensionReal,
  onLog,
}: {
  /** Banda 1-3, comparable con el post. Elige la COPY del delta. */
  preTension: number;
  /** El número que el usuario declaró (1-10). Es el que se le muestra. */
  preTensionReal: number;
  onLog: (durationSeconds: number, cycles: number) => void;
}) {
  const [phase, setPhase] = useState<RitualPhase>('intro');
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseLeft, setPhaseLeft] = useState<number>(BOX_PHASES[0].duration);
  const [cycles, setCycles] = useState(0);
  const [postTension, setPostTension] = useState<number | null>(null);

  const scale = useSharedValue(0.9);
  const reducedMotion = useReducedMotion();
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatePhase = useCallback(
    (idx: number) => {
      const p = BOX_PHASES[idx];
      // Spring, no timing (audit "Fluidez Polaris" §Fase 3 "03"/"04"):
      // interrumpibilidad nativa — reasignar `.value` retoma desde el
      // valor/velocidad actuales sin stopAnimation() manual (ver endEarly y
      // el auto-cierre más abajo). `duration`+`dampingRatio:1` en vez de
      // damping/stiffness crudos porque necesitamos que el resorte tarde
      // los mismos ~4s que la fase real de respiración — la firma rápida de
      // un botón (animation.spring.*) no sirve aquí. Reduced motion: salta
      // directo al tamaño de la fase, igual que ritual.tsx (mismo patrón en
      // onboarding) — sin la firma de "cross-fade" no existe hoy en ningún
      // lado del repo, se sigue la referencia real, no una inventada.
      scale.value = reducedMotion
        ? p.scale
        : withSpring(p.scale, { duration: p.duration * 1000, dampingRatio: 1 });
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [scale, reducedMotion],
  );

  // Phase countdown (1s tick)
  useEffect(() => {
    if (phase !== 'breathing') return;
    tickRef.current = setInterval(() => {
      setPhaseLeft((left) => {
        if (left > 1) return left - 1;
        const nextIdx = (phaseIdx + 1) % BOX_PHASES.length;
        if (nextIdx === 0) setCycles((c) => c + 1);
        setPhaseIdx(nextIdx);
        animatePhase(nextIdx);
        return BOX_PHASES[nextIdx].duration;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, phaseIdx]);

  // Auto-cierre tras completar los ciclos previstos → pasa al pre/post
  useEffect(() => {
    if (phase === 'breathing' && cycles >= RITUAL_CYCLES) {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (tickRef.current) clearInterval(tickRef.current);
      scale.value = reducedMotion ? 0.9 : withSpring(0.9, { duration: 400, dampingRatio: 1 });
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onLog(elapsed, cycles);
      setPhase('post');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycles, phase, reducedMotion]);

  const startBreathing = () => {
    setPhase('breathing');
    setPhaseIdx(0);
    setPhaseLeft(BOX_PHASES[0].duration);
    setCycles(0);
    startTimeRef.current = Date.now();
    animatePhase(0);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const endEarly = () => {
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    if (tickRef.current) clearInterval(tickRef.current);
    scale.value = reducedMotion ? 0.9 : withSpring(0.9, { duration: 300, dampingRatio: 1 });
    if (cycles > 0) onLog(elapsed, cycles);
    setPhase('post');
  };

  const currentPhase = BOX_PHASES[phaseIdx];

  // ── Intro ──
  if (phase === 'intro') {
    return (
      <PremiumCard style={styles.ritualCard}>
        <Text style={styles.ritualTag}>MICRO-RITUAL · 2 MIN</Text>
        <Text style={styles.ritualTitle}>Antes de salir, regula el sistema</Text>
        <Text style={styles.ritualBody}>
          Seis ciclos de respiración en caja — inhala 4, sostén 4, exhala 4, sostén 4. No es relleno:
          baja tu carga real antes de ejecutar.
        </Text>
        <PrimaryButton label="EMPEZAR RESPIRACIÓN" icon="air" onPress={startBreathing} />
      </PremiumCard>
    );
  }

  // ── Breathing (orbe activo) ──
  if (phase === 'breathing') {
    return (
      <PremiumCard style={styles.ritualCard}>
        <Text style={styles.ritualTag}>RESPIRACIÓN EN CAJA · CICLO {Math.min(cycles + 1, RITUAL_CYCLES)}/{RITUAL_CYCLES}</Text>
        <View style={styles.orbStage}>
          <View style={styles.orbRing} />
          <Animated.View style={[styles.orb, orbStyle]}>
            <Text style={styles.orbPhase}>{currentPhase.label}</Text>
            <Text style={styles.orbCount}>{phaseLeft}</Text>
          </Animated.View>
        </View>
        <Pressable
          onPress={endEarly}
          accessibilityRole="button"
          accessibilityLabel="Terminar respiración"
          style={({ pressed }) => [styles.ritualEndBtn, pressed && { opacity: 0.7 }]}>
          <Text style={styles.ritualEndText}>TERMINAR</Text>
        </Pressable>
      </PremiumCard>
    );
  }

  // ── Post: captura mini-estado + delta ──
  const delta = postTension == null ? null : preTension - postTension;
  const deltaCopy =
    delta == null
      ? null
      : delta >= 2
        ? `Bajaste ${delta} de tensión. Eso es regulación real, no placebo.`
        : delta === 1
          ? 'Un punto menos de tensión. Pequeño, pero el cuerpo respondió.'
          : delta === 0
            ? 'Igual que antes. A veces el sistema solo necesita registrar; vuelve más tarde.'
            : 'Subió un poco — la mente sigue activa. Sin juicio: el dato queda registrado.';

  return (
    <PremiumCard style={styles.ritualCard}>
      <Text style={styles.ritualTag}>¿CÓMO ESTÁS AHORA?</Text>
      <Text style={styles.ritualBody}>
        Tu tensión antes era {preTensionReal}/10. Marca dónde está ahora — un toque.
      </Text>
      <View style={styles.postScale}>
        {[1, 2, 3].map((v) => {
          const labels = ['CALMA', 'MEDIA', 'ALTA'];
          const active = postTension === v;
          return (
            <Pressable
              key={v}
              onPress={() => {
                setPostTension(v);
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`Tensión ahora: ${labels[v - 1]}`}
              style={[styles.postChip, active && styles.postChipActive]}>
              <Text style={[styles.postChipNum, active && styles.postChipNumActive]}>{v}</Text>
              <Text style={[styles.postChipLabel, active && styles.postChipLabelActive]}>
                {labels[v - 1]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {deltaCopy ? (
        <View style={styles.deltaRow}>
          <MaterialIcons
            name={delta != null && delta > 0 ? 'trending-down' : delta === 0 ? 'remove' : 'trending-up'}
            size={18}
            color={delta != null && delta > 0 ? palette.goldText : palette.ash}
          />
          <Text style={styles.deltaText}>{deltaCopy}</Text>
        </View>
      ) : null}
    </PremiumCard>
  );
}

export default function CheckInScreen() {
  const sc = useScreen();
  const { isDesktop } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { todayCheckIn, saveCheckIn, saveWellnessSession, state, protocolDay } = useLifeFlow();
  const { showToast } = useToast();

  // Racha real para el aviso de protección (días consecutivos, no días de calendario).
  const streak = computeStreak(state.checkIns);
  // ARRANCAN VACÍOS. Venían en 7/7/4/7, así que la pantalla abría con el aura
  // verde de "recuperado" y un 7/10 "SISTEMA OPERATIVO" antes de que el usuario
  // tocara nada: la app se contestaba a sí misma y le enseñaba el resultado
  // como si fuera suyo. Es el mismo pecado que ya se corrigió en `defaultNorth`
  // —donde el onboarding venía relleno con la identidad de otro— y aquí seguía
  // vivo, en el dato que alimenta a Norman y el score soberano.
  //
  // Cuesta cuatro toques. Un check-in ES cuatro toques; pre-rellenarlo hacía
  // que la mayoría pulsara guardar sobre ficción.
  const [energy, setEnergy]   = useState<number | null>(todayCheckIn?.energy ?? null);
  const [clarity, setClarity] = useState<number | null>(todayCheckIn?.clarity ?? null);
  const [stress, setStress]   = useState<number | null>(todayCheckIn?.stress ?? null);
  const [sleep, setSleep]     = useState<number | null>(todayCheckIn?.sleep ?? null);
  // La lectura no existe hasta que las cuatro existen. Media verdad leída como
  // verdad entera es peor que esperar.
  const listo = energy !== null && clarity !== null && stress !== null && sleep !== null;
  const [systemNeed, setSystemNeed] = useState(todayCheckIn?.systemNeed ?? '');
  const [saved, setSaved] = useState(false);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  // 'ofrecer' | 'listo' | 'oculto' — el gancho de la sesión 2. Se oculta si ya
  // hay racha (ya vuelve solo) o si el permiso no se puede pedir.
  const [recordatorio, setRecordatorio] = useState<'ofrecer' | 'listo' | 'oculto'>(
    // Oculto en web: `scheduleCheckinReminder` devuelve null ahí (no hay
    // notificaciones locales en la PWA). Ofrecer un recordatorio que no puede
    // llegar y luego decir "mañana a las 7:00" sería exactamente la clase de
    // mentira que este bucle lleva seis rondas quitando.
    // Oculto también con racha: quien ya vuelve solo no necesita que lo llamen.
    Platform.OS === 'web' || streak >= 3 ? 'oculto' : 'ofrecer',
  );
  // Guard anti-doble-tap: saveCheckIn es async → evita doble submit del check-in.
  const [submitting, setSubmitting] = useState(false);
  // Simplificación (feedback Capuozzo): camino mínimo = 4 sliders → guardar.
  // La lectura interna es opcional, y el ritual/recomendación se difieren a una oferta.
  const [showNeed, setShowNeed]     = useState(false);
  const [showRegula, setShowRegula] = useState(false);
  // Rehidrata como los otros cinco campos. Era el ÚNICO que no lo hacía:
  // reabrir el check-in la misma tarde y volver a guardar escribía `zones:
  // null` encima de lo que habías señalado por la mañana, y erosionaba en
  // silencio el detector de Norman, que pide 3 apariciones en 7 registros.
  const [bodyZones, setBodyZones]   = useState<BodyZone[]>(todayCheckIn?.zones ?? []);
  const [bodyPoints, setBodyPoints] = useState<BodyPoint[]>(parseBodyPoints(todayCheckIn?.bodyPoints));

  // Real-time coherence score — 0 mientras falte algún valor (la tarjeta que lo
  // muestra no se renderiza hasta que `listo`, así que nunca se ve ese 0).
  // La fórmula vive en narrativeLogic (`coherenceOf`) — era la tercera copia.
  const coherence = listo
    ? coherenceOf({ energy: energy!, clarity: clarity!, stress: stress!, sleep: sleep! })
    : 0;
  const coherenceStrong = coherence >= 7;
  const coherenceLabel =
    coherence >= 8
      ? 'CAPACIDAD MAXIMA · EJECUTA SIN LIMITE'
      : coherence >= 6
        ? 'SISTEMA OPERATIVO · CALIBRA Y MUEVE'
        : coherence >= 4
          ? 'CARGA ALTA · UN FOCO, UNA ACCIÓN'
          : 'MODO RECUPERACION · PRIMERO EL SISTEMA';

  // Stress as intelligence — never a failure
  const stressReading =
    (stress ?? 0) >= 8
      ? `Estrés ${stress}/10 — tu sistema reconoce un desafío real. Eso es información, no debilidad.`
      : (stress ?? 0) >= 6
        ? `Estrés ${stress}/10 — carga moderada activa. Opera con claridad sobre tus prioridades.`
        : (stress ?? 99) <= 3
          ? `Estrés ${stress}/10 — sistema en calma. Condiciones óptimas para trabajo profundo.`
          : null;

  const submit = async () => {
    if (submitting || !listo) return;
    setSubmitting(true);
    try {
      const syncStatus = await saveCheckIn({
        energy: energy!,
        clarity: clarity!,
        stress: stress!,
        sleep: sleep!,
        systemNeed: systemNeed.trim() || 'Orden, foco y ejecucion sin ruido.',
        zones: bodyZones.length ? bodyZones : undefined,
        bodyPoints: bodyPoints.length ? bodyPoints : undefined,
      });
      analytics.checkinSubmit(energy, clarity, stress, sleep);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // El cruce que pasaba en silencio — la evaluación vive ahora en
      // lib/milestoneCheck.ts para que Comando y el cierre de jornada también
      // la corran (un hito de calendario se perdía si ese día no había
      // check-in). Si ya había check-in de hoy esto es una corrección, no un
      // día nuevo: `computeStreak` ya lo contaba; sumar inflaría la racha.
      setMilestone(await checkMilestone(
        { streak: todayCheckIn ? streak : streak + 1, protocolDay },
        { painPoint: state.profile.painPoint, purpose: state.northStar.purpose },
      ));
      // Honestidad de guardado: si no hubo red, el dato quedó encolado — se dice.
      if (syncStatus === 'queued') {
        showToast('Guardado en este dispositivo — se sincronizará al recuperar conexión', 'warning');
      }
      // Revela la recomendación de cierre antes de redirigir (WS-3).
      setSaved(true);
    } catch (e) {
      // Si el guardado falla, re-habilita para reintentar (no dejamos el botón muerto)
      // y se lo decimos: antes el botón revivía sin explicación y parecía un bug.
      logSilentError('checkin.submit', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('No se pudo guardar tu check-in. Inténtalo de nuevo.', 'error');
      setSubmitting(false);
    }
  };

  // El aura sigue al gesto, no solo a los números.
  //
  // Se disparaba únicamente con `listo` (los cuatro deslizadores). En móvil el
  // mapa va ANTES, así que tocar tu propio cuerpo —la pieza que el dueño llamó
  // el mejor UX que ha visto— no movía el fondo ni un píxel, y mover un número
  // administrativo sí. Ahora la primera zona señalada decide el estado y el
  // ORIGEN del resplandor: tocas el pecho y la pantalla se ilumina ahí.
  const auraOrigin = bodyPoints.length
    ? {
        x: `${bodyPoints[0].x * 100}%` as `${number}%`,
        y: `${bodyPoints[0].y * 100}%` as `${number}%`,
      }
    : bodyZones.length ? ZONE_AURA_ORIGIN[bodyZones[0]] : undefined;
  const auraState = listo
    ? auraFromCheckIn({ stress: stress!, energy: energy!, hour: new Date().getHours() })
    : bodyZones.length ? 'tension'
    : 'reposo';
  const auraWeight = listo
    ? Math.min(1, Math.max(stress!, 10 - energy!) / 10)
    : bodyZones.length ? 0.7
    : 0.4;

  // ── Dónde lo sientes ────────────────────────────────────────────────────────
  // Los deslizadores dicen CUÁNTO y nunca DÓNDE. "Tensión 8" no distingue una
  // mandíbula apretada de un estómago cerrado, y se regulan distinto. Tocar la
  // silueta cuesta dos segundos y da una señal que ningún número da.
  // Opcional a propósito: el camino mínimo del check-in sigue siendo 30s.
  const bodyInsight = readBody({ zones: bodyZones, points: bodyPoints, stress });
  const lastBodyPoint = bodyPoints[bodyPoints.length - 1];
  const meditationFocus = lastBodyPoint ? energyFocusForBodyPoint(lastBodyPoint) : null;
  const showChestSafety = bodyPoints.some(needsChestSafety);

  const toggleZone = (zone: BodyZone) => {
    const removing = bodyZones.includes(zone);
    setBodyZones((current) => (
      removing ? current.filter((item) => item !== zone) : [...current, zone]
    ));
    if (removing) setBodyPoints((current) => current.filter((point) => point.zone !== zone));
  };

  const toggleExactPoint = (point: BodyPoint) => {
    const nextPoints = toggleBodyPoint(bodyPoints, point);
    const previousPointZones = new Set(zonesFromBodyPoints(bodyPoints));
    const manualZones = bodyZones.filter((zone) => !previousPointZones.has(zone));
    setBodyPoints(nextPoints);
    setBodyZones([...new Set([...manualZones, ...zonesFromBodyPoints(nextPoints)])]);
  };

  // ── Recomendación accionable post-guardado ──────────────────────────────────
  // Lógica local determinista, priorizando el sistema más comprometido.
  const recommendation = (() => {
    // Lo que la persona SEÑALÓ gana sobre lo que el deslizador estimó.
    //
    // Antes esta cadena no leía `bodyZones` ni una vez: señalabas la mandíbula
    // y la app te mandaba a respiración por tener tensión ≥7. El gesto más
    // íntimo del producto no cambiaba nada de lo que pasaba después — y un
    // gesto sin consecuencia es una demo, no un mecanismo.
    //
    // El número dice CUÁNTO (y sigue graduando el tono de la lectura); la zona
    // dice DÓNDE, que es lo que decide la salida física.
    if (bodyZones.length && bodyInsight.practice) {
      return {
        icon: 'accessibility-new' as const,
        tag: 'LO QUE SEÑALASTE',
        title: bodyInsight.reading,
        body: bodyInsight.practice.why,
        route: bodyInsight.practice.route,
        cta: bodyInsight.practice.label.toUpperCase(),
      };
    }
    if ((stress ?? 0) >= 7) {
      return {
        icon: 'self-improvement' as const,
        tag: 'DESCOMPRESIÓN',
        title: 'Baja la carga antes de ejecutar',
        body: 'Tu sistema marca tensión alta. Antes de arrancar, 5 minutos de respiración o un grito de descarga. Luego un solo foco — no abras frentes nuevos hoy.',
        route: '/bienestar/respiracion' as const,
        cta: 'IR A RESPIRACIÓN',
      };
    }
    if ((sleep ?? 99) <= 4) {
      return {
        icon: 'bedtime' as const,
        tag: 'RECUPERACIÓN',
        title: 'Prioriza recuperar el sistema',
        body: 'Dormiste por debajo de tu base. Hoy opera en mínimo viable, hidrátate y protege una siesta corta o cierre temprano. La recuperación es parte del protocolo, no su pausa.',
        route: '/bienestar/meditacion' as const,
        cta: 'IR A MEDITACIÓN',
      };
    }
    if ((energy ?? 99) <= 4) {
      return {
        icon: 'battery-charging-full' as const,
        tag: 'PROTEGER ENERGÍA',
        title: 'Una acción, sin culpa',
        body: 'Energía baja: elige la única acción que mueve la aguja y apaga lo no urgente. Proteger la energía hoy es ganar capacidad mañana.',
        route: '/bienestar/binaurales' as const,
        cta: 'ENFOCAR CON BINAURALES',
      };
    }
    if (coherence >= 8) {
      return {
        icon: 'rocket-launch' as const,
        tag: 'CAPITALIZA',
        title: 'Estás en ventana de alto rendimiento',
        body: 'Tu capacidad está al máximo. Bloquea ahora tu trabajo más difícil y de mayor impacto — la claridad de hoy no se desperdicia en lo trivial.',
        route: '/(tabs)/programas' as const,
        cta: 'IR AL PROTOCOLO',
      };
    }
    return {
      icon: 'center-focus-strong' as const,
      tag: 'CALIBRA Y MUEVE',
      title: 'Sistema operativo — ejecuta con foco',
      body: 'Condiciones estables. Define tus tres prioridades, protege un bloque sin interrupciones y muévete sin sobre-analizar.',
      route: '/(tabs)/programas' as const,
      cta: 'IR AL PROTOCOLO',
    };
  })();

  const activarRecordatorio = async () => {
    try {
      const id = await scheduleCheckinReminder(protocolDay);
      // `null` = no se agendó (permiso denegado o plataforma sin soporte). No
      // se confirma lo que no ocurrió.
      setRecordatorio(id ? 'listo' : 'oculto');
      if (!id) showToast('No se pudo activar el recordatorio. Puedes hacerlo en Perfil.', 'warning');
    } catch (e) {
      // Si el permiso se deniega no se miente diciendo que quedó puesto.
      logSilentError('checkin.reminder', e);
      setRecordatorio('oculto');
      showToast('No se pudo activar el recordatorio. Puedes hacerlo en Perfil.', 'warning');
    }
  };

  const goToCommando = () => router.replace('/(tabs)/comando');
  const followRecommendation = () => router.replace(recommendation.route as never);

  // ── El siguiente paso de la JORNADA ─────────────────────────────────────────
  // Guardar el check-in completa LÉETE; la pantalla entrega el paso que sigue
  // en vez de soltar al usuario. `withStepDone` pinta el estado post-guardado
  // sin esperar a que el log local se relea, y `selectTurno` decide el destino
  // con las MISMAS reglas de siempre (una alarma de tensión/sueño/energía
  // sigue ganando al paso — mandan a regulación, que también es un paso).
  const jornada = useJornada();
  const nextLessonRoute = (() => {
    const done = new Set(state.completedLessons ?? []);
    const lesson = ACTIVE_MODULE.lessons.find((l) => !done.has(l.id)) ?? ACTIVE_MODULE.lessons[0];
    return lesson ? `/lesson/${lesson.id}` : null;
  })();
  const turnoSiguiente = listo
    ? selectTurno({
        narrative: null, kind: null,
        todayCheckIn: { energy: energy!, clarity: clarity!, stress: stress!, sleep: sleep! },
        daysSinceLastCheckIn: 0,
        jornada: jornada ? withStepDone(jornada, 'leete') : null,
        nextLessonRoute,
      })
    : null;
  const followTurnoSiguiente = () => {
    if (turnoSiguiente) router.replace(turnoSiguiente.route as never);
  };

  // ── Micro-ritual: estado pre (tensión declarada, banda 1–3) + logging ──────
  // El check-in mide estrés 1–10; lo llevamos a la misma escala 1–3 del post
  // para que el delta sea comparable de un toque.
  // La BANDA elige el copy; el NUMERO es el que el usuario dijo.
  //
  // Se pasaba la banda al ritual y este imprimia `{preTension}/10`: al que puso
  // 9 la app le contestaba "tu tension antes era 3/10". Le devolvia su propio
  // dato mal, en la pantalla que existe para devolverle datos.
  const preTensionBand = (stress ?? 0) >= 7 ? 3 : (stress ?? 0) >= 4 ? 2 : 1;
  const logBreathing = (durationSeconds: number, cycles: number) => {
    if (cycles <= 0 || durationSeconds <= 5) return;
    void saveWellnessSession({
      type: 'breathing',
      sessionName: 'Respiración en caja · Check-in',
      durationSeconds,
      completedAt: new Date().toISOString(),
      metadata: { techniqueId: 'box', cycles, source: 'checkin' },
    });
  };

  const ritualBlock = (
    <MicroRitual preTension={preTensionBand} preTensionReal={stress ?? 5} onLog={logBreathing} />
  );

  // El delta contra el registro anterior. Es la ÚNICA información que aparece
  // por haber guardado: la coherencia de hoy ya se veía en vivo mientras movías
  // los sliders (:284), así que sin esto el acto de guardar no revela nada y la
  // pantalla se siente como un formulario, no como una lectura.
  const previousCheckIn = state.checkIns.find((c) => c.id !== todayCheckIn?.id) ?? null;
  // El primer check-in no tiene contra qué compararse, así que `deltaSince`
  // devuelve null y la tarjeta se quedaba sin su única línea de recompensa —
  // precisamente el día en que el usuario más necesita saber para qué sirvió.
  // No hay dato: hay que decir eso, que además es verdad y es una promesa.
  const deltaLine = previousCheckIn
    ? deltaSince({ energy: energy!, clarity: clarity!, stress: stress!, sleep: sleep! }, previousCheckIn)
    : 'Esta es tu línea base. A partir de mañana todo se mide contra esto.';

  // El CTA primario es el SIGUIENTE PASO de la jornada — la misión continúa.
  // La recomendación local queda como salida secundaria SOLO cuando difiere
  // (p. ej. señalaste la mandíbula y el paso que toca es la lección): ofrecer
  // dos botones que van al mismo sitio con dos nombres sería la clase de
  // duplicado que EL TURNO vino a matar.
  const recommendationCard = (
    <ConsequenceCard
      icon={recommendation.icon}
      tag={`LECTURA DEL SISTEMA · ${recommendation.tag}`}
      title={recommendation.title}
      body={recommendation.body}
      delta={deltaLine}>
      {turnoSiguiente ? (
        <PrimaryButton
          label={`SIGUIENTE: ${turnoSiguiente.verb}`}
          icon="arrow-forward"
          onPress={followTurnoSiguiente}
        />
      ) : (
        <PrimaryButton label={recommendation.cta} icon="arrow-forward" onPress={followRecommendation} />
      )}
      {turnoSiguiente && recommendation.route !== turnoSiguiente.route && (
        <SecondaryButton label={recommendation.cta} icon="explore" onPress={followRecommendation} />
      )}
      <SecondaryButton label="VOLVER AL COMANDO" icon="dashboard" onPress={goToCommando} />
    </ConsequenceCard>
  );

  // ── Shared JSX blocks ──────────────────────────────────────────────────────
  // Desktop variant — vertical stack (number on top of bar)
  const coherenceCard = (
    <PremiumCard style={styles.coherenceCard}>
      <Text style={styles.coherenceEyebrow}>ÍNDICE DE CAPACIDAD HOY</Text>
      <View style={styles.coherenceRow}>
        <Text style={[styles.coherenceScore, coherenceStrong && styles.coherenceScoreStrong]}>
          {coherence}
        </Text>
        <Text style={styles.coherenceDenom}>/10</Text>
      </View>
      <View style={styles.coherenceTrack}>
        <View
          style={[
            styles.coherenceFill,
            {
              transform: [{ scaleX: coherence / 10 }],
              backgroundColor: coherenceStrong ? palette.gold : palette.smoke,
            },
          ]}
        />
      </View>
      <Text style={[styles.coherenceStatus, coherenceStrong && { color: palette.goldText }]}>
        {coherenceLabel}
      </Text>
      {stressReading ? (
        <Text style={styles.stressReading}>{stressReading}</Text>
      ) : null}
    </PremiumCard>
  );

  // Mobile variant — "ÍNDICE DE CAPACIDAD" card: big number/10 on the left,
  // progress + status on the right (matches mobile prototype composition).
  const capacityCardMobile = (
    <PremiumCard style={styles.capacityCard}>
      <View style={styles.capacityScoreCol}>
        <View style={styles.coherenceRow}>
          <Text style={[styles.capacityScore, coherenceStrong && styles.coherenceScoreStrong]}>
            {coherence}
          </Text>
          <Text style={styles.capacityDenom}>/10</Text>
        </View>
        <Text style={styles.capacityEyebrow}>ÍNDICE DE CAPACIDAD</Text>
      </View>
      <View style={styles.capacityMeterCol}>
        <View style={styles.coherenceTrack}>
          <View
            style={[
              styles.coherenceFill,
              {
                width: `${coherence * 10}%` as `${number}%`,
                backgroundColor: coherenceStrong ? palette.gold : palette.smoke,
              },
            ]}
          />
        </View>
        <Text style={[styles.capacityStatus, coherenceStrong && { color: palette.goldText }]}>
          {coherenceLabel}
        </Text>
        {stressReading ? <Text style={styles.stressReading}>{stressReading}</Text> : null}
      </View>
    </PremiumCard>
  );

  const systemNeedSuggestions =
    (stress ?? 0) >= 7
      ? ['Decomprimirme antes de arrancar', 'Espacio para procesar sin decidir', 'Un solo foco hoy']
      : (energy ?? 99) <= 4
        ? ['Mínimo viable hoy — una acción', 'Descanso sin culpa esta tarde', 'Apagar lo no urgente']
        : ['Claridad sobre mis prioridades', 'Foco sin interrupciones', 'Ejecutar sin analizar de más'];

  const systemNeedCard = (
    <PremiumCard style={styles.card}>
      <Text style={styles.systemLabel}>LECTURA DEL SISTEMA</Text>
      {!systemNeed.trim() && (
        <View style={styles.needSuggestions}>
          {systemNeedSuggestions.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSystemNeed(s)}
              accessibilityRole="button"
              accessibilityLabel={`Usar: ${s}`}
              style={({ pressed }) => [styles.needPill, pressed && { opacity: 0.7 }]}>
              <Text style={styles.needPillText}>+ {s}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <PremiumInput
        value={systemNeed}
        onChangeText={setSystemNeed}
        placeholder="¿Qué necesita tu sistema para operar bien hoy?"
        multiline
        style={styles.textArea}
        accessibilityLabel="Que necesita tu sistema hoy"
      />
    </PremiumCard>
  );

  const bodyCard = (
    <PremiumCard style={styles.card}>
      {/* Una pregunta, no un rótulo. Pasó por `systemLabel` (11px, versalitas,
          la misma voz que "necesidad del sistema") y luego por `title` — que es
          EL MISMO token que "CHECK-IN DIARIO" y "BIOMETRÍA". Subió de tamaño y
          se quedó gritando. En caja baja se lee como lo que es: alguien
          preguntándote algo. */}
      <Text style={styles.bodyQuestion}>¿Dónde lo sientes?</Text>

      {/* LA RESPUESTA VA ANTES DEL MAPA, no después.
          Renderizada debajo, nacía ~124pt por DEBAJO del borde de la pantalla:
          el canvas mide 420pt y la leyenda otros 92. El usuario tocaba su
          mandíbula y lo único que ocurría en su campo de visión era que un
          rectángulo se pintaba de oro; la frase existía, bien escrita y a
          26px, a un scroll de distancia. Aquí cambia donde ya tiene los ojos.
          `minHeight` reserva las dos líneas para que aparecer no empuje nada.
          Y el vacío usa el texto que `readBody` ya escribía para el caso sin
          zonas y que no se renderizaba en ninguna parte del producto. */}
      <View style={styles.bodyReading}>
        <Text
          // Que un lector de pantalla anuncie la frase al tocar. Hoy decía
          // "La mandíbula, seleccionado" y jamás lo que el producto existe
          // para devolverle.
          accessible
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
          style={[
            styles.bodyReadingText,
            // ORO cuando ha señalado algo. Es lo que el Umbral ya hace con sus
            // frases —"es suyo"— y aquí faltaba: la respuesta al gesto salía en
            // el MISMO gris del rótulo que la pregunta. La pantalla cambia de
            // color cuando tocas tu cuerpo; eso es todo lo que hacía falta.
            bodyZones.length ? styles.bodyReadingOn : styles.bodyReadingEmpty,
          ]}>
          {bodyInsight.reading}
        </Text>
      </View>

      <BodyMap
        selected={bodyZones}
        points={bodyPoints}
        onToggle={toggleZone}
        onPointToggle={toggleExactPoint}
      />

      {meditationFocus ? (
        <BodyFocusCard focus={meditationFocus} showChestSafety={showChestSafety} />
      ) : null}

      <Pressable
        onPress={() => router.push('/bienestar/escaneo' as never)}
        accessibilityRole="button"
        accessibilityLabel="Ver el escaneo biométrico completo, las 6 vistas"
        style={({ pressed }) => [styles.scanLink, pressed && { opacity: 0.7 }]}>
        <MaterialIcons name="view-in-ar" size={16} color={palette.goldText} />
        <Text style={styles.scanLinkText}>VER ESCANEO COMPLETO</Text>
      </Pressable>
    </PremiumCard>
  );

  // Toggle de "lectura interna" — opcional, fuera del camino mínimo.
  const needToggle = (
    <Pressable
      onPress={() => setShowNeed((v) => !v)}
      accessibilityRole="button"
      accessibilityLabel={showNeed ? 'Ocultar lectura interna' : 'Anotar qué necesita tu sistema'}
      style={({ pressed }) => [styles.needToggle, pressed && { opacity: 0.7 }]}>
      <MaterialIcons name={showNeed ? 'remove' : 'add'} size={16} color={palette.goldText} />
      <Text style={styles.needToggleText}>
        {showNeed ? 'Ocultar lectura interna' : '¿Algo más? Anota qué necesita tu sistema (opcional)'}
      </Text>
    </Pressable>
  );

  // Móvil y desktop compartían este botón copiado literalmente. Se extrae como
  // el resto de bloques de esta pantalla, para que el label, el ícono y el
  // estado disabled no puedan divergir entre layouts.
  const submitButton = (
    <PrimaryButton
      label={
        submitting ? 'GUARDANDO...'
        : listo ? 'GUARDAR CHECK-IN'
        // Deshabilitado y mudo era un callejón: el botón decía "guardar" y no
        // guardaba, sin decir por qué.
        : 'MARCA LOS CUATRO'
      }
      icon={submitting ? 'hourglass-empty' : 'check'}
      onPress={submit}
      disabled={submitting || !listo}
    />
  );

  // Post-guardado — la CONSECUENCIA primero, siempre.
  //
  // Antes esto era solo "Check-in guardado." + una oferta de respirar, y la
  // recomendación real vivía dentro de `regulaBlock`, detrás de aceptar el
  // ritual. Quien pulsaba "VOLVER AL COMANDO" —el camino de menor fricción—
  // se llevaba una línea de acuse y nada más: registraba su estado y no
  // recibía ninguna lectura a cambio. Ese era, literalmente, el "¿pero para
  // qué?". La respiración sigue ofreciéndose, pero como siguiente paso, no
  // como peaje para ver tu propia lectura.
  const savedOffer = (
    <>
      <View style={styles.savedRow}>
        <MaterialIcons name="check-circle" size={18} color={palette.success} />
        <Text style={styles.savedText}>Check-in guardado.</Text>
      </View>
      {/* El único mecanismo que produce la sesión 2.
          La sesión 1 terminaba y no había nada que trajera al usuario de
          vuelta: el recordatorio de las 7:00 vive en un interruptor al fondo
          de Perfil, donde nadie nuevo lo encuentra. Se ofrece aquí, una vez,
          en el momento en que acaba de ver para qué sirvió — que es el único
          instante en que la respuesta honesta es sí. */}
      {recordatorio === 'ofrecer' && (
        <PremiumCard style={styles.savedOffer}>
          <Text style={styles.savedSub}>¿Te lo recuerdo mañana a las 7:00?</Text>
          <PrimaryButton label="SÍ, RECUÉRDAMELO" icon="notifications-active" onPress={activarRecordatorio} />
        </PremiumCard>
      )}
      {recordatorio === 'listo' && (
        <View style={styles.savedRow}>
          <MaterialIcons name="notifications-active" size={16} color={palette.goldText} />
          <Text style={styles.savedText}>Mañana a las 7:00.</Text>
        </View>
      )}
      {/* Va ANTES de la recomendación: cruzar los 7 días es la noticia, y la
          lectura del sistema viene después. Casi siempre es null — un hito que
          aparece a diario deja de ser un hito. */}
      <MilestoneToast milestone={milestone} />
      {recommendationCard}
      {showRegula ? (
        ritualBlock
      ) : (
        <PremiumCard style={styles.savedOffer}>
          <Text style={styles.savedSub}>¿Dos minutos para regular tu sistema antes de seguir?</Text>
          <SecondaryButton
            label="RESPIRAR 2 MIN"
            icon="self-improvement"
            onPress={() => setShowRegula(true)}
          />
        </PremiumCard>
      )}
    </>
  );

  // ── Desktop layout ──────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <KeyboardAvoidingView
        style={sc.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}>
      {/* El aura va FUERA del ScrollView, anclada al viewport.
          Dentro del `contentContainerStyle` quedaba atrapada en `sc.content`
          (maxWidth 430, centrado): en tablet o PWA ancha se veía como una BANDA
          con costura vertical contra el negro — el rectángulo de color literal
          que esto existe para no ser. Y se iba con el scroll. Aquí cubre la
          pantalla y se queda quieta. */}
      <Aura
        state={auraState}
        weight={auraWeight}
        origin={auraOrigin}
      />
        <ScrollView
          contentContainerStyle={[styles.contentDesktop, { paddingTop: insets.top + 32 }]}
          showsVerticalScrollIndicator={false}
          bounces
          overScrollMode="never"
          keyboardShouldPersistTaps="handled">
          <AppHeader title="CHECK-IN DIARIO" />

          <View style={styles.desktopGrid}>
            {/* ── Left column: Biometría ── */}
            <View style={styles.desktopLeft}>
              <GoldAccentCard>
                <Text style={styles.dateLabel}>{todayLabel()}</Text>
                <Text style={styles.introTitle}>{checkInTitle(streak)}</Text>
                <Text style={styles.introBody}>
                  Esta medición calibra tu dashboard, mentor y score soberano. La honestidad aquí es
                  una ventaja competitiva.
                </Text>
              </GoldAccentCard>

              <GoldDivider label="BIOMETRÍA" />

              <PremiumCard style={styles.card}>
                <ScaleSelector label="ENERGÍA" value={energy} onChange={setEnergy} icon="bolt" />
                <ScaleSelector
                  label="CLARIDAD MENTAL"
                  value={clarity}
                  onChange={setClarity}
                  icon="center-focus-strong"
                />
                <ScaleSelector
                  label="NIVEL DE SATURACIÓN"
                  value={stress}
                  onChange={setStress}
                  icon="device-thermostat"
                  guide="1-3 Despejado · 4-7 Cargado · 8-10 Saturado"
                />
                <ScaleSelector
                  label="CALIDAD DE SUEÑO"
                  value={sleep}
                  onChange={setSleep}
                  icon="bedtime"
                />
              </PremiumCard>
            </View>

            {/* ── Right column: Coherencia + Necesidad ── */}
            <View style={styles.desktopRight}>
              {listo && coherenceCard}

              {!saved ? (
                <>
                  {bodyCard}
                  {submitButton}
                  {needToggle}
                  {showNeed && systemNeedCard}
                  <SecondaryButton label="VOLVER" icon="close" onPress={() => router.back()} />
                </>
              ) : (
                savedOffer
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Mobile layout ───────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={sc.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}>
    {/* El aura va FUERA del ScrollView, anclada al viewport.
        Dentro del `contentContainerStyle` quedaba atrapada en `sc.content`
        (maxWidth 430, centrado): en tablet o PWA ancha se veía como una BANDA
        con costura vertical contra el negro — el rectángulo de color literal
        que esto existe para no ser. Y se iba con el scroll. Aquí cubre la
        pantalla y se queda quieta. */}
    <Aura
      state={auraState}
      weight={auraWeight}
      origin={auraOrigin}
    />
    <ScrollView
      contentContainerStyle={[sc.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      bounces
      overScrollMode="never"
      keyboardShouldPersistTaps="handled">
      {/* ── Header: back → comando · fecha · título ── */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.replace('/(tabs)/comando')}
          accessibilityRole="button"
          accessibilityLabel="Volver al centro de comando"
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.65 }]}>
          <MaterialIcons name="arrow-back" size={20} color={palette.ash} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.dateLabel}>{todayLabel()}</Text>
          <Text style={styles.headerTitle}>CHECK-IN DIARIO</Text>
        </View>
      </View>

      {/* ── Intro: "LEE EL SISTEMA." ── */}
      <GoldAccentCard>
        {streak >= 3 && (
          <View style={styles.streakRow}>
            <MaterialIcons name="local-fire-department" size={14} color={palette.goldText} />
            <Text style={styles.streakText}>Racha de {streak} días — no la rompas hoy</Text>
          </View>
        )}
        <Text style={styles.introTitle}>{checkInTitle(streak)}</Text>
        <Text style={styles.introBody}>
          No calibras para sentirte bien. Calibras para saber con qué tropas sales hoy al campo.
        </Text>
      </GoldAccentCard>

      {/* La pregunta abre; los deslizadores completan.
          Estaba el CUARTO bloque: header → intro → BIOMETRÍA → cuatro
          ScaleSelector (que en 375px envuelven a dos filas cada uno) → tarjeta
          de capacidad, y recién ahí el cuerpo — unos 1.200px de scroll y 40
          objetivos táctiles administrativos antes de la pieza que el dueño
          llamó el mejor UX que ha visto. La ronda anterior le quitó el plegado
          pero no lo sacó del sótano. En escritorio ya estaba arriba. */}
      {!saved && bodyCard}

      {/* ── Biometrics ── */}
      {/* `!saved` como el mapa: post-guardado se podían seguir moviendo los
          cuatro y el ÍNDICE DE CAPACIDAD recalculaba sobre un dato que ya no
          se guarda. Un número que cambia y no significa nada. */}
      {!saved && (
      <>
      <GoldDivider label="BIOMETRÍA" />
      <PremiumCard style={styles.card}>
        <ScaleSelector label="ENERGÍA" value={energy} onChange={setEnergy} icon="bolt" />
        <ScaleSelector
          label="CLARIDAD MENTAL"
          value={clarity}
          onChange={setClarity}
          icon="adjust"
        />
        <ScaleSelector
          label="NIVEL DE SATURACIÓN"
          value={stress}
          onChange={setStress}
          icon="device-thermostat"
          guide="1-3 Despejado · 4-7 Cargado · 8-10 Saturado"
        />
        <ScaleSelector label="CALIDAD DE SUEÑO" value={sleep} onChange={setSleep} icon="bedtime" />
      </PremiumCard>
      </>
      )}

      {/* ── Lectura en vivo: se evalúa al mover los sliders ── */}
      {/* La lectura llega cuando llegan los cuatro. Antes se pintaba con los
          valores por defecto, así que el usuario veía su "capacidad de hoy"
          antes de haber dicho nada sobre hoy. */}
      {listo && capacityCardMobile}

      {/* ── Camino mínimo: guardar. Lectura interna opcional · regulación diferida ── */}
      {!saved ? (
        <>
          {submitButton}
          {needToggle}
          {showNeed && systemNeedCard}
        </>
      ) : (
        savedOffer
      )}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // Header (mobile) — back · date · title
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  backBtn: {
    alignItems: 'center',
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginTop: 2,
    width: 44,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  headerTitle: {
    ...typography.title,
    color: palette.ivory,
  },

  // Intro
  dateLabel: {
    ...typography.mono,
    color: palette.ash,
  },
  streakRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  streakText: {
    color: palette.goldText,
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  introTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
    lineHeight: 30,
    textTransform: 'uppercase',
  },
  introBody: {
    ...typography.body,
    color: palette.ash,
    fontSize: 14,
    lineHeight: 22,
  },

  // Biometrics card
  card: {
    gap: spacing.xl,
  },

  // Coherence
  coherenceCard: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  coherenceEyebrow: {
    ...typography.label,
    color: palette.ash,
    fontSize: 11,
  },
  coherenceRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
  },
  coherenceScore: {
    ...typography.numeric,
    color: palette.smoke,
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 60,
  },
  coherenceScoreStrong: {
    color: palette.goldText,
  },
  coherenceDenom: {
    ...typography.body,
    color: palette.ash,
    marginBottom: 10,
  },
  coherenceTrack: {
    backgroundColor: palette.charcoal,
    height: 2,
    overflow: 'hidden',
    width: '100%',
  },
  coherenceFill: {
    height: '100%',
    width: '100%',
    transformOrigin: 'left',
  },
  coherenceStatus: {
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: palette.smoke,
  },
  stressReading: {
    ...typography.caption,
    color: palette.ash,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
  },

  // Capacity card (mobile) — score column + meter column
  capacityCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  capacityScoreCol: {
    gap: 4,
  },
  capacityScore: {
    ...typography.numeric,
    color: palette.smoke,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 46,
  },
  capacityDenom: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 16,
    marginBottom: 6,
  },
  capacityEyebrow: {
    ...typography.label,
    color: palette.ash,
    fontSize: 10,
  },
  capacityMeterCol: {
    flex: 1,
    gap: spacing.sm,
  },
  capacityStatus: {
    fontFamily: Fonts.display,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: palette.smoke,
  },

  // System need
  systemLabel: {
    ...typography.label,
    color: palette.ash,
    fontSize: 11,
  },
  needSuggestions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
  },
  needPill: {
    backgroundColor: alpha(palette.gold, '14'),
    borderColor: alpha(palette.gold, '44'),
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  needPillText: {
    color: palette.goldText,
    fontFamily: Fonts.display,
    fontSize: 12,
    lineHeight: 16,
  },
  textArea: {
    minHeight: 110,
    paddingTop: spacing.lg,
    textAlignVertical: 'top',
  },

  scanLink: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  scanLinkText: {
    color: palette.goldText,
    fontFamily: Fonts.display,
    fontSize: 11,
    letterSpacing: 1.5,
  },

  // Lectura interna opcional (toggle) + oferta post-guardado
  needToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  needToggleText: {
    ...typography.caption,
    color: palette.ash,
    fontSize: 13,
    flex: 1,
  },

  bodyQuestion: {
    ...typography.statement,
    color: palette.ivory,
  },

  // Lectura del cuerpo — le devuelve en palabras lo que acaba de señalar.
  // Va ENCIMA de la silueta y con altura reservada: aparecer no puede empujar
  // el mapa hacia abajo justo cuando el usuario esta tocandolo. 68 = dos lineas
  // de `statement` (34 x 2).
  bodyReading: {
    // 102, no 68. El hueco reservaba DOS líneas y el texto que lo llena mide
    // TRES (el copy vacío son 76 caracteres a 28 por línea), así que la
    // silueta saltaba 34pt bajo el dedo en el primer toque — justo el
    // movimiento que este hueco existe para evitar.
    minHeight: 102,
    justifyContent: 'center',
  },
  bodyReadingText: {
    // La frase sobre su propio cuerpo. Iba en `body` (14px) — el mismo tamaño
    // que el pie de una tarjeta, y más pequeña que el rótulo que la anuncia.
    ...typography.statement,
    color: palette.ivory,
  },
  // Antes de tocar es una invitacion, no una lectura: mismo tamaño (no es menos
  // importante), menos peso de color (todavia no dice nada de el).
  bodyReadingEmpty: {
    color: palette.smoke,
  },
  bodyReadingOn: {
    color: palette.goldText,
  },
  savedOffer: {
    borderColor: palette.lineGold,
    borderWidth: 1,
    gap: spacing.md,
  },
  savedRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  savedText: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 16,
    fontWeight: '700',
  },
  savedSub: {
    ...typography.body,
    color: palette.ash,
    fontSize: 14,
    lineHeight: 21,
  },

  // Recommendation (post-save closing card)

  // Micro-ritual (box-breathing inline)
  ritualCard: {
    alignItems: 'center',
    borderColor: palette.lineGold,
    borderWidth: 1,
    gap: spacing.md,
  },
  ritualTag: {
    ...typography.label,
    color: palette.goldText,
    fontSize: 9,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  ritualTitle: {
    color: palette.ivory,
    fontFamily: Fonts.display,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
  ritualBody: {
    ...typography.body,
    color: palette.ash,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  orbStage: {
    alignItems: 'center',
    justifyContent: 'center',
    height: ORB * 1.45,
    width: ORB * 1.45,
    marginVertical: spacing.xs,
  },
  orbRing: {
    position: 'absolute',
    width: ORB * 1.4,
    height: ORB * 1.4,
    borderRadius: (ORB * 1.4) / 2,
    borderWidth: 1,
    borderColor: palette.lineGold,
    opacity: 0.35,
  },
  orb: {
    width: ORB,
    height: ORB,
    borderRadius: ORB / 2,
    borderWidth: 1.5,
    borderColor: palette.lineGold,
    backgroundColor: palette.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbPhase: {
    fontFamily: Fonts.display,
    color: palette.goldText,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
  },
  orbCount: {
    fontFamily: Fonts.display,
    color: palette.ivory,
    fontSize: 34,
    fontWeight: '700',
    marginTop: 2,
  },
  ritualEndBtn: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  ritualEndText: {
    color: palette.ash,
    fontFamily: Fonts.display,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  postScale: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  postChip: {
    alignItems: 'center',
    backgroundColor: palette.goldLight,
    borderColor: palette.lineGold,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 64,
    paddingVertical: spacing.sm,
  },
  postChipActive: {
    backgroundColor: palette.gold,
  },
  postChipNum: {
    color: palette.goldText,
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '800',
  },
  postChipNumActive: {
    color: palette.ink,
  },
  postChipLabel: {
    color: palette.ash,
    fontFamily: Fonts.display,
    fontSize: 9,
    letterSpacing: 1,
  },
  postChipLabelActive: {
    color: palette.ink,
  },
  deltaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  deltaText: {
    ...typography.body,
    color: palette.ivory,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },

  // Desktop layout
  contentDesktop: {
    alignSelf: 'center' as const,
    width: '100%',
    maxWidth: 1200,
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 60,
    gap: 24,
  },
  desktopGrid: {
    flexDirection: 'row' as const,
    gap: 32,
    alignItems: 'flex-start' as const,
  },
  desktopLeft: {
    flex: 1,
    gap: 16,
  },
  desktopRight: {
    flex: 1,
    gap: 16,
  },
});
