import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  PremiumCard,
  PrimaryButton,
} from '@/components/polaris';
import { Fonts, palette, spacing, typography } from '@/constants/theme';
import { alpha } from '@/constants/themeColors';
import { useToast } from '@/context/ToastContext';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { MilestoneToast } from '@/components/narrative';
import { analytics } from '@/lib/analytics';
import { checkMilestone } from '@/lib/milestoneCheck';
import { coherenceOf, deltaSince, type Milestone } from '@/lib/narrativeLogic';
import { withStepDone } from '@/lib/jornadaLogic';
import { selectTurno } from '@/lib/turnoLogic';
import { useJornada } from '@/hooks/use-jornada';
import { ACTIVE_MODULE } from '@/data/modules';
import { BodyMap } from '@/components/body-map';
import { BodyFocusCard } from '@/components/body-focus-card';
import { readBody, type BodyZone } from '@/lib/bodyMapLogic';
import { parseBodyPoints, toggleBodyPoint, zonesFromBodyPoints, type BodyPoint } from '@/lib/bodyPointLogic';
import { energyFocusForBodyPoint, needsChestSafety } from '@/lib/energyFocusLogic';
import { PolarisLogo } from '@/components/PolarisLogo';
import { useDecorStarColor } from '@/components/auth/AccessFrame';
import { logSilentError } from '@/lib/observability';
import { computeStreak } from '@/lib/utils';
import { scheduleCheckinReminder } from '@/services/notifications';

export default function CheckInScreen() {
  const { isDesktop } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { todayCheckIn, saveCheckIn, state, protocolDay } = useLifeFlow();
  const { showToast } = useToast();
  const starColor = useDecorStarColor();

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
  const systemNeed = todayCheckIn?.systemNeed ?? '';
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

  const submit = async () => {
    if (submitting || !listo) return;
    setSubmitting(true);
    try {
      // No se espera a Supabase para confirmar: el check-in ya quedó guardado
      // en el dispositivo y, si no hay red, en la cola de reintento. Esperar
      // la ida y vuelta (0,3–1,5 s cada escritura) era lo que se sentía lento.
      const sync = saveCheckIn({
        energy: energy!,
        clarity: clarity!,
        stress: stress!,
        sleep: sleep!,
        systemNeed: systemNeed.trim() || 'Orden, foco y ejecucion sin ruido.',
        zones: bodyZones.length ? bodyZones : undefined,
        bodyPoints: bodyPoints.length ? bodyPoints : undefined,
      });
      // Honestidad de guardado: si no hubo red, el dato quedó encolado — se dice.
      sync
        .then((syncStatus) => {
          if (syncStatus === 'queued') {
            showToast('Guardado en este dispositivo — se sincronizará al recuperar conexión', 'warning');
          }
        })
        .catch((e) => {
          logSilentError('checkin.submit', e);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showToast('No se pudo guardar tu check-in. Inténtalo de nuevo.', 'error');
          setSaved(false);
          setSubmitting(false);
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
  // Salir SIN guardar: `back()` cierra el modal como el swipe nativo de iOS y
  // devuelve a quien lo abrió. `replace` solo si no hay pila (deep link o
  // notificación en frío), para no dejar al usuario sin salida. Los destinos
  // POST-guardado siguen con `replace`: ahí el check-in ya no debe quedar atrás.
  const salir = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/comando'));

  // Distancia real entre el borde superior de la ventana y esta pantalla. Es un
  // modal SIN header (`headerShown: false` en app/_layout.tsx): en iOS se
  // presenta como hoja, cuyo tope NO es `insets.top` — usar insets dejaba un
  // hueco (o un solape) sobre el teclado. KeyboardAvoidingView mide su frame
  // relativo a la hoja, así que el offset tiene que ser el tope de la hoja.
  // Android: el modal ocupa la ventana entera → 0; además medir allí durante el
  // slide_from_bottom daría la posición a mitad de animación.

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

  // El delta contra el registro anterior: la recompensa de haber guardado.
  // El primer check-in no tiene contra qué compararse — se dice eso.
  const previousCheckIn = state.checkIns.find((c) => c.id !== todayCheckIn?.id) ?? null;
  const deltaLine = listo && previousCheckIn
    ? deltaSince({ energy: energy!, clarity: clarity!, stress: stress!, sleep: sleep! }, previousCheckIn)
    : 'Esta es tu línea base. A partir de mañana todo se mide contra esto.';

  // ── Rediseño: una pregunta por pantalla ──────────────────────────────────────
  // Cuatro pasos sobre amarillo. Cada uno pregunta UNA cosa con cinco
  // respuestas en palabras; el dato se sigue guardando en la escala 1–10 de
  // siempre (respuesta × 2), así Norman, el puntaje y la historia no cambian.
  const [step, setStep] = useState(0);
  const pasos = [
    { key: 'energy', label: 'ENERGÍA', q: '¿Cuánta energía\ntraes?', value: energy, set: setEnergy,
      words: ['Nada', 'Poca', 'Normal', 'Buena', 'Mucha'] },
    { key: 'clarity', label: 'CLARIDAD', q: '¿Qué tan claro\nves tu día?', value: clarity, set: setClarity,
      words: ['Nublado', 'Confuso', 'Normal', 'Claro', 'Muy claro'] },
    { key: 'sleep', label: 'SUEÑO', q: '¿Cómo\ndormiste?', value: sleep, set: setSleep,
      words: ['Muy mal', 'Mal', 'Normal', 'Bien', 'Muy bien'] },
    { key: 'stress', label: 'PRESIÓN', q: '¿Cuánta presión\nsientes?', value: stress, set: setStress,
      words: ['Nada', 'Poca', 'Normal', 'Alta', 'Al límite'] },
  ] as const;
  const paso = pasos[Math.min(step, 3)];
  const elegido = paso.value === null ? null : Math.min(5, Math.max(1, Math.round(paso.value / 2)));
  const esUltimo = step === 3;

  const avanzar = () => {
    if (elegido === null) return;
    if (esUltimo) void submit();
    else setStep((n) => n + 1);
  };
  const atras = () => (step > 0 ? setStep((n) => n - 1) : salir());

  // Lo que se marca en el cuerpo después de guardar se guarda también.
  const [cuerpoAbierto, setCuerpoAbierto] = useState(false);
  const persistirCuerpo = () => {
    if (!listo || (!bodyZones.length && !bodyPoints.length)) return;
    saveCheckIn({
      energy: energy!, clarity: clarity!, stress: stress!, sleep: sleep!,
      systemNeed: systemNeed.trim() || 'Orden, foco y ejecucion sin ruido.',
      zones: bodyZones.length ? bodyZones : undefined,
      bodyPoints: bodyPoints.length ? bodyPoints : undefined,
    }).catch((e) => logSilentError('checkin.saveBody', e));
  };
  const irA = (route: string) => {
    persistirCuerpo();
    router.replace(route as never);
  };
  const destino = turnoSiguiente
    ? { route: turnoSiguiente.route, verb: turnoSiguiente.verb }
    : { route: recommendation.route, verb: recommendation.cta };
  const hora = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

  const bodyCard = (
    <PremiumCard style={styles.card}>
      {/* Una pregunta, no un rótulo. Pasó por `systemLabel` (11px, versalitas,
          la misma voz que "necesidad del sistema") y luego por `title` — que es
          EL MISMO token que "CHECK-IN DIARIO" y "BIOMETRÍA". Subió de tamaño y
          se quedó gritando. En caja baja se lee como lo que es: alguien
          preguntándote algo. */}
      <Text style={styles.bodyQuestion}>¿Dónde lo sientes?</Text>
      <Text style={styles.bodyOptional}>Opcional · toca la zona del cuerpo</Text>

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

  // ── Guardado: una lectura y un paso ─────────────────────────────────────────
  if (saved) {
    return (
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={[
            styles.listoContent,
            { paddingTop: insets.top + (isDesktop ? 48 : 24), paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.listoInner}>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>CHECK-IN GUARDADO</Text>
              <Text style={styles.meta}>{hora}</Text>
            </View>
            <View style={styles.listoStar}>
              <PolarisLogo size={isDesktop ? 220 : 160} color={starColor} />
            </View>
            <Text accessibilityRole="header" style={[styles.listoTitle, isDesktop && styles.listoTitleDesk]}>
              {recommendation.title}
            </Text>
            <Text style={styles.listoSub}>{deltaLine}</Text>
            <MilestoneToast milestone={milestone} />

            <View style={styles.listoActions}>
              <PrimaryButton
                label={destino.verb}
                icon="arrow-forward"
                onPress={() => irA(destino.route)}
              />
              {turnoSiguiente && recommendation.route !== turnoSiguiente.route && (
                <Pressable onPress={() => irA(recommendation.route)} accessibilityRole="link" style={styles.link}>
                  <Text style={styles.linkText}>{capitalizar(recommendation.cta)}</Text>
                </Pressable>
              )}
              {recordatorio === 'ofrecer' && (
                <Pressable onPress={activarRecordatorio} accessibilityRole="button" style={styles.link}>
                  <Text style={styles.linkText}>Recuérdamelo mañana a las 7:00</Text>
                </Pressable>
              )}
              {recordatorio === 'listo' && <Text style={styles.listoNote}>Te lo recordamos mañana a las 7:00.</Text>}
              <Pressable
                onPress={() => setCuerpoAbierto((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: cuerpoAbierto }}
                style={styles.link}>
                <Text style={styles.linkText}>
                  {cuerpoAbierto ? 'Ocultar el cuerpo' : '¿Lo sientes en el cuerpo? Márcalo'}
                </Text>
              </Pressable>
              <Pressable onPress={() => { persistirCuerpo(); goToCommando(); }} accessibilityRole="link" style={styles.link}>
                <Text style={styles.linkMuted}>Volver a Hoy</Text>
              </Pressable>
            </View>
            {cuerpoAbierto && <View style={styles.bodyWrap}>{bodyCard}</View>}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Las cuatro preguntas ─────────────────────────────────────────────────────
  const opciones = (
    <View style={[styles.options, isDesktop && styles.optionsDesk]} accessibilityRole="radiogroup">
      {paso.words.map((word, i) => {
        const n = i + 1;
        const on = elegido === n;
        return (
          <Pressable
            key={word}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              paso.set(n * 2);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${n} de 5, ${word}`}
            style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && !on && styles.optionPressed]}>
            <Text style={[styles.optionN, on && styles.optionNOn]}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.yellow, { paddingTop: insets.top + (isDesktop ? 40 : 12), paddingBottom: insets.bottom + 28 }]}>
      <View style={[styles.qTop, isDesktop && styles.qPadDesk]}>
        <Pressable
          onPress={salir}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sin guardar"
          hitSlop={8}
          style={styles.close}>
          <MaterialIcons name="close" size={24} color={palette.ink} />
        </Pressable>
        <Text style={styles.qMeta}>{`${step + 1} / 4 · ${paso.label}`}</Text>
      </View>

      <View style={[styles.qBody, isDesktop && styles.qBodyDesk, isDesktop && styles.qPadDesk]}>
        <Text accessibilityRole="header" style={[styles.question, isDesktop && styles.questionDesk]}>
          {paso.q}
        </Text>
        <View style={[styles.bigRow, isDesktop && styles.bigRowDesk]}>
          <Text style={[styles.big, isDesktop && styles.bigDesk]} accessibilityLiveRegion="polite">
            {elegido ?? ''}
          </Text>
          <Text style={styles.bigWord}>{elegido ? paso.words[elegido - 1].toUpperCase() : ''}</Text>
        </View>
      </View>

      <View style={[styles.qBottom, isDesktop && styles.qBottomDesk, isDesktop && styles.qPadDesk]}>
        {/* «ELIGE UNO» justo encima de los botones, y debajo qué significa cada
            punta: antes la escala se elegía a ciegas. */}
        <View style={[styles.scale, isDesktop && styles.scaleDesk]}>
          <Text style={styles.scaleHint}>ELIGE UNO</Text>
          {opciones}
          <View style={styles.scaleEnds}>
            <Text style={styles.scaleEnd}>{`1 = ${paso.words[0].toLowerCase()}`}</Text>
            <Text style={styles.scaleEnd}>{`5 = ${paso.words[4].toLowerCase()}`}</Text>
          </View>
        </View>
        <View style={[styles.qActions, isDesktop && styles.qActionsDesk]}>
          {step > 0 && (
            <Pressable onPress={atras} accessibilityRole="button" style={styles.backLink}>
              <Text style={styles.backText}>Atrás</Text>
            </Pressable>
          )}
          <Pressable
            onPress={avanzar}
            disabled={elegido === null || submitting}
            accessibilityRole="button"
            accessibilityState={{ disabled: elegido === null || submitting }}
            style={({ pressed }) => [
              styles.next,
              isDesktop && styles.nextDesk,
              (elegido === null || submitting) && styles.nextOff,
              pressed && styles.nextPressed,
            ]}>
            <Text style={[styles.nextText, (elegido === null || submitting) && styles.nextTextOff]}>
              {submitting ? 'GUARDANDO…' : esUltimo ? 'GUARDAR' : 'SIGUIENTE'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** «IR A RESPIRACIÓN» → «Ir a respiración». */
function capitalizar(t: string) {
  const lower = t.toLowerCase().replace(/norman/g, 'Norman');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

const styles = StyleSheet.create({
  // ── Rediseño: preguntas sobre amarillo ──────────────────────────────────────
  yellow: { flex: 1, backgroundColor: palette.gold, paddingHorizontal: spacing.lg },
  qTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: -10 },
  qPadDesk: { paddingHorizontal: 48 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  qMeta: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.ink },
  qBody: { flex: 1, paddingTop: 48, gap: 32 },
  qBodyDesk: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 96 },
  question: {
    fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 38, lineHeight: 40, color: palette.ink,
  },
  questionDesk: { fontSize: 72, lineHeight: 74, maxWidth: 680 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 16 },
  bigRowDesk: { flexDirection: 'column', alignItems: 'flex-end', gap: 4 },
  big: { fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 120, lineHeight: 120, minHeight: 120, color: palette.ink },
  bigDesk: { fontSize: 280, lineHeight: 280, minHeight: 280 },
  bigWord: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 13, letterSpacing: 1, color: palette.ink },
  qBottom: { gap: 16 },
  qBottomDesk: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 32 },
  scale: { gap: 8 },
  scaleDesk: { flex: 1 },
  scaleHint: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.ink },
  scaleEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleEnd: { fontFamily: Fonts.sans, fontSize: 13, color: palette.ink },
  options: { flexDirection: 'row', gap: 10 },
  optionsDesk: { gap: 14 },
  option: {
    flex: 1, minWidth: 56, height: 56, borderRadius: 8, borderWidth: 1.5, borderColor: palette.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  optionOn: { backgroundColor: palette.ink },
  optionPressed: { opacity: 0.6 },
  optionN: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 18, color: palette.ink },
  optionNOn: { color: palette.goldStatic },
  qActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qActionsDesk: { minWidth: 360 },
  backLink: { minHeight: 58, paddingHorizontal: 12, justifyContent: 'center' },
  backText: { fontFamily: Fonts.sans, fontSize: 16, color: palette.ink, textDecorationLine: 'underline' },
  next: {
    flex: 1, height: 58, borderRadius: 8, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center',
  },
  nextDesk: { height: 64 },
  // Deshabilitado = hueco hundido sin borde: velo de tinta al 8 % y texto de
  // tinta atenuado. El contorno al 40 % de opacidad se leía «mostaza roto».
  nextOff: { backgroundColor: alpha(palette.ink, '14') },
  nextTextOff: { color: alpha(palette.ink, '80') },
  nextPressed: { opacity: 0.85 },
  nextText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 14, letterSpacing: 1, color: palette.goldStatic },

  // ── Rediseño: guardado ──────────────────────────────────────────────────────
  root: { flex: 1, backgroundColor: palette.black },
  listoContent: { flexGrow: 1, paddingHorizontal: spacing.lg },
  listoInner: { width: '100%', maxWidth: 560, alignSelf: 'center', flexGrow: 1 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.goldText },
  listoStar: { alignItems: 'center', marginTop: 40, marginBottom: 32 },
  listoTitle: {
    fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 34, lineHeight: 37,
    color: palette.ivory, textAlign: 'center',
  },
  listoTitleDesk: { fontSize: 48, lineHeight: 51 },
  listoSub: {
    marginTop: 16, fontFamily: Fonts.sans, fontSize: 17, lineHeight: 26, color: palette.ash,
    textAlign: 'center', alignSelf: 'center', maxWidth: 420,
  },
  listoActions: { marginTop: 40, gap: 4 },
  listoNote: { fontFamily: Fonts.sans, fontSize: 15, color: palette.ash, textAlign: 'center', paddingVertical: 12 },
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontFamily: Fonts.sans, fontSize: 16, fontWeight: '600', color: palette.goldText },
  linkMuted: { fontFamily: Fonts.sans, fontSize: 15, color: palette.smoke },
  bodyWrap: { marginTop: 24 },

  // Biometrics card
  card: {
    gap: spacing.xl,
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

  bodyOptional: {
    ...typography.caption,
    color: palette.ash,
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

  // Recommendation (post-save closing card)

});
