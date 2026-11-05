import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BodyFocusCard } from '@/components/body-focus-card';
import { Fila, Pantalla, TarjetaOro } from '@/components/pantalla';
import SafetyWarning from '@/components/SafetyWarning';
import { Fonts, palette, radii, spacing } from '@/constants/theme';
import {
  MEDITATION_CATEGORY_MUSIC,
  MEDITATION_SESSIONS,
  meditationPhasesToNarration,
  type MeditationSession,
} from '@/data/wellness';
import { EVIDENCE, EVIDENCE_GRADE_LABEL } from '@/data/wellnessEvidence';
import { createMeditationAudio } from '@/lib/binaural';
import { createNarrationPlayer, type NarrationHandle } from '@/lib/narrationPlayer';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useWellnessStore } from '@/store/wellnessStore';
import { analytics } from '@/lib/analytics';
import { energyFocusById, parseEnergyFocusId } from '@/lib/energyFocusLogic';
import { BodyContextCard, PracticeClose } from './body-context';

function haptic(type: 'light' | 'medium' | 'success') {
  if (Platform.OS === 'web') return;
  if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.impactAsync(type === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
}

/**
 * Los grupos salen de los DATOS, no de una lista escrita a mano: una sesión
 * con categoría nueva aparece sola en su grupo.
 */
const CATEGORIES = [...new Set(MEDITATION_SESSIONS.map((s) => s.category))];
const SESSIONS_BY_CATEGORY = Object.fromEntries(
  CATEGORIES.map((c) => [c, MEDITATION_SESSIONS.filter((s) => s.category === c)]),
) as Record<string, MeditationSession[]>;

/** "Para ahora": la categoría que pide la hora del día. */
function categoryForHour(hour: number): string {
  if (hour < 11) return 'mañana';
  if (hour >= 20) return 'noche';
  return 'estrés';
}

function AntesDeEmpezar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel="Antes de empezar" style={styles.antes}>
        <Text style={styles.antesLabel}>ANTES DE EMPEZAR</Text>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={20} color={palette.smoke} />
      </Pressable>
      {open && <View style={{ paddingBottom: 16 }}>{children}</View>}
    </View>
  );
}

// ─── Meditation Player ────────────────────────────────────────────────────────
// Negro plano, temporizador grande, un solo botón. Sin anillos ni brillos.

function MeditationPlayer({
  session,
  northStar,
  onComplete,
  onExit,
}: {
  session: MeditationSession;
  /** El Norte del usuario, para las fases que marcan `showsNorthStar`. */
  northStar?: string;
  onComplete: (secs: number) => void;
  onExit: () => void;
}) {
  const insets = useSafeAreaInsets();
  const {
    startSession: storeStart,
    stopSession: storeStop,
    pauseSession: storePause,
    resumeSession: storeResume,
    setElapsed: storeElapsed,
  } = useWellnessStore();
  const totalSeconds = session.durationMinutes * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [paused, setPaused]   = useState(false);
  const [done, setDone] = useState(false);
  const [doneSecs, setDoneSecs] = useState(0);
  const [currentPhaseText, setCurrentPhaseText] = useState(session.phases[0]?.text ?? '');
  const [phaseIdx, setPhaseIdx] = useState(0);
  const audioRef = useRef<ReturnType<typeof createMeditationAudio>>(null);
  const narrationRef = useRef<NarrationHandle | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Una sesión narrada puede terminar su guion antes de que el reloj visual
  // llegue a cero — sin este guard, `finishSession` correría dos veces.
  const finishedRef = useRef(false);

  /**
   * Cierra la sesión — llamada tanto por el reloj visual (llega a cero) como
   * por el guion narrado (termina su última fase).
   */
  const finishSession = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setDone(true);
    haptic('success');
    storeStop();
     
    (audioRef as any).current?.bell();
    narrationRef.current?.stop();
    setTimeout(() => {
       
      (audioRef as any).current?.stop();
    }, 3500);
    const secs = Math.round((Date.now() - startTimeRef.current) / 1000);
    setDoneSecs(secs);
    onComplete(secs);
  }, [onComplete, storeStop]);

  const startSession = useCallback(() => {
    setRunning(true);
    setPaused(false);
    setRemaining(totalSeconds);
    startTimeRef.current = Date.now();
    finishedRef.current = false;
    haptic('medium');

    if (session.narrated) {
      // Sesión narrada: manda la voz. El texto en pantalla lo dicta el mp3 que
      // esté sonando, no un contador.
      const narration = createNarrationPlayer({
        musicUrl: MEDITATION_CATEGORY_MUSIC[session.category],
        binaural: session.binaural,
        phases: meditationPhasesToNarration(session),
        onPhaseChange: (i) => {
          setPhaseIdx(i);
          setCurrentPhaseText(session.phases[i].text);
        },
        onComplete: finishSession,
      });
      narrationRef.current = narration;
      narration?.start();
    } else {
      // Cama musical por categoría si existe; si no, ruido procedural.
      const audio = createMeditationAudio(session.ambientType, MEDITATION_CATEGORY_MUSIC[session.category]);
       
      (audioRef as any).current = audio;
      audio?.start();
      audio?.bell();
    }

    // Wire to global wellness store so mini player appears
    storeStart({ type: 'meditation', sessionName: session.title, targetSeconds: totalSeconds });
  }, [totalSeconds, session, storeStart, finishSession]);

  // Countdown timer
  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          finishSession();
          return 0;
        }
        const elapsed = totalSeconds - (prev - 1);
        storeElapsed(elapsed);
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, finishSession, storeElapsed, totalSeconds]);

  // Phase rotation (solo sesiones no narradas: en las narradas manda la voz)
  useEffect(() => {
    if (!running || !session.phases.length || session.narrated) return;
    let idx = phaseIdx;
    let elapsed = 0;
    const phaseDurations = session.phases.map((p) => p.duration);

    phaseTimerRef.current = setInterval(() => {
      elapsed += 1;
      const dur = phaseDurations[idx];
      if (elapsed >= dur) {
        elapsed = 0;
        idx = (idx + 1) % session.phases.length;
        setPhaseIdx(idx);
        setCurrentPhaseText(session.phases[idx].text);
        haptic('light');
      }
    }, 1000);
    return () => { if (phaseTimerRef.current) clearInterval(phaseTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const handleStop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
     
    (audioRef as any).current?.stop();
    narrationRef.current?.stop();
    narrationRef.current = null;
    storeStop();
    setRunning(false);
    setPaused(false);
    setRemaining(totalSeconds);
    setPhaseIdx(0);
    setCurrentPhaseText(session.phases[0]?.text ?? '');
  }, [totalSeconds, session.phases, storeStop]);

  const handlePause = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (phaseTimerRef.current) clearInterval(phaseTimerRef.current);
    narrationRef.current?.pause();
    setRunning(false);
    setPaused(true);
    storePause();
    haptic('light');
  }, [storePause]);

  const handleResume = useCallback(() => {
    narrationRef.current?.resume();
    setRunning(true);
    setPaused(false);
    storeResume();
    haptic('light');
  }, [storeResume]);

  // Final limpio: "Hecho. N min." + Volver. Sin confeti ni puntos.
  if (done) {
    return (
      <Pantalla
        meta="BIENESTAR · MEDITACIÓN"
        title="Hecho."
        sub={`${Math.max(1, Math.round(doneSecs / 60))} min.`}>
        <PracticeClose message="¿Cómo aterriza tu mente ahora? Registrarlo es el dato que sí importa." />
        <Fila label="VOLVER" value="Meditación" onPress={onExit} last />
      </Pantalla>
    );
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeLabel = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const started = running || paused;
  const evidence = session.evidence ? EVIDENCE[session.evidence] : null;

  return (
    <View style={[player.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}>
      <View style={player.inner}>
        <Pressable onPress={() => { handleStop(); onExit(); }} style={player.backBtn} accessibilityRole="button" accessibilityLabel="Salir de la sesión">
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>

        <Text style={player.sessionTitle}>{session.title}</Text>
        {!started && <Text style={player.sessionDesc}>{session.description}</Text>}
        {!started && evidence && (
          <Text style={player.evidence}>
            {EVIDENCE_GRADE_LABEL[evidence.grade]}
          </Text>
        )}

        <Text style={player.timeText} accessibilityRole="timer">{timeLabel}</Text>

        {started && (
          <View style={player.guide}>
            <Text style={player.guideText}>{currentPhaseText}</Text>
            {/* En la fase de declaración la pantalla muestra el Norte que
                escribió ESTE usuario. */}
            {northStar && session.phases[phaseIdx]?.showsNorthStar && (
              <Text style={player.northStarText}>{northStar}</Text>
            )}
          </View>
        )}

        <View style={player.controls}>
          {!started && (
            <Pressable style={player.mainBtn} onPress={startSession} accessibilityRole="button" accessibilityLabel="Empezar sesión">
              <Text style={player.mainBtnText}>EMPEZAR</Text>
            </Pressable>
          )}
          {running && (
            <Pressable style={player.ghostBtn} onPress={handlePause} accessibilityRole="button" accessibilityLabel="Pausar sesión">
              <Text style={player.ghostBtnText}>PAUSA</Text>
            </Pressable>
          )}
          {paused && (
            <>
              <Pressable style={player.mainBtn} onPress={handleResume} accessibilityRole="button" accessibilityLabel="Seguir con la sesión">
                <Text style={player.mainBtnText}>SEGUIR</Text>
              </Pressable>
              <Pressable style={player.textBtn} onPress={handleStop} accessibilityRole="button" accessibilityLabel="Terminar sesión">
                <Text style={player.textBtnText}>Terminar</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MeditacionScreen() {
  const router = useRouter();
  const { focus: focusParam } = useLocalSearchParams<{ focus?: string | string[] }>();
  const { saveWellnessSession, state, latestCheckIn } = useLifeFlow();
  // Si la saturación viene alta, la pantalla lo dice con el dato.
  const stressReading = latestCheckIn?.stress ?? null;
  const introLine =
    stressReading !== null && stressReading >= 7
      ? `Tu estrés está en ${stressReading}/10 en tu check-in. Diez minutos aquí ayudan. Usa audífonos.`
      : 'Unos minutos en los que no se te pide nada. Usa audífonos.';
  const [active, setActive] = useState<MeditationSession | null>(null);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const contextualFocusId = parseEnergyFocusId(focusParam);
  const contextualFocus = contextualFocusId ? energyFocusById(contextualFocusId) : null;

  const completedIds = new Set(
    (state.wellnessSessions ?? [])
      .filter((s) => s.type === 'meditation')
      .map((s) => s.metadata?.sessionId as string),
  );

  const handleComplete = useCallback(
    async (session: MeditationSession, secs: number) => {
      await saveWellnessSession({
        type: 'meditation',
        sessionName: session.title,
        durationSeconds: secs,
        completedAt: new Date().toISOString(),
        metadata: { sessionId: session.id, category: session.category },
      });
      analytics.meditationComplete(session.title, secs);
      haptic('success');
    },
    [saveWellnessSession],
  );

  if (active) {
    return (
      <MeditationPlayer
        session={active}
        northStar={state.northStar?.identity || state.northStar?.purpose}
        onComplete={(secs) => handleComplete(active, secs)}
        onExit={() => setActive(null)}
      />
    );
  }

  // "Para ahora": primera sesión de la categoría de la hora que aún no hiciste.
  const pool = SESSIONS_BY_CATEGORY[categoryForHour(new Date().getHours())] ?? MEDITATION_SESSIONS;
  const suggested = pool.find((s) => !completedIds.has(s.id)) ?? pool[0] ?? MEDITATION_SESSIONS[0];

  const open = (session: MeditationSession) => { haptic('light'); setActive(session); };

  return (
    <Pantalla
      meta="BIENESTAR · CALMA"
      title="Meditación"
      sub={introLine}
      hero={
        <TarjetaOro
          meta="PARA AHORA"
          metaRight={`${suggested.durationMinutes} MIN`}
          title={suggested.title}
          detail={suggested.description}
          onPress={() => open(suggested)}
          accessibilityLabel={`Empezar: ${suggested.title}, ${suggested.durationMinutes} minutos`}
        />
      }>
      {contextualFocus ? (
        <View style={styles.focusCard}>
          <BodyFocusCard
            focus={contextualFocus}
            showChestSafety={contextualFocus.id === 'pecho'}
            showMeditationAction={false}
          />
        </View>
      ) : null}

      {/* Las demás, agrupadas por para qué y plegadas: un grupo abierto a la vez. */}
      {CATEGORIES.map((cat) => {
        const items = SESSIONS_BY_CATEGORY[cat];
        const isOpen = openCat === cat;
        return (
          <View key={cat}>
            <Fila
              label={cat.toUpperCase()}
              value={isOpen ? 'Cerrar' : `${items.length} ${items.length === 1 ? 'sesión' : 'sesiones'}`}
              onPress={() => setOpenCat(isOpen ? null : cat)}
            />
            {isOpen && items.map((session) => (
              <View key={session.id} style={styles.sub}>
                <Fila
                  label={session.title.toUpperCase()}
                  value={`${session.durationMinutes} min${completedIds.has(session.id) ? ' · hecha' : ''}`}
                  onPress={() => open(session)}
                />
              </View>
            ))}
          </View>
        );
      })}

      <AntesDeEmpezar>
        <SafetyWarning
          body="La meditación es una práctica de bienestar, no un tratamiento médico ni psicológico. Si atraviesas ansiedad intensa, trauma o una condición de salud mental, consúltalo con un profesional. No practiques mientras conduces u operas maquinaria. Si durante la práctica aumenta la angustia, sientes desconexión de tu cuerpo o del entorno, o aparece miedo intenso, detén la sesión y abre los ojos: parar es la respuesta correcta, no algo que haya que atravesar."
        />
      </AntesDeEmpezar>

      {/* Contexto biométrico del día (honesto, no en vivo) */}
      <View style={styles.context}>
        <BodyContextCard frame="Medita para acompañar tu recuperación de hoy. Persigue el estado, no el número." />
      </View>

      <Fila label="VOLVER" value="Bienestar" onPress={() => router.back()} last />
    </Pantalla>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  focusCard: { marginBottom: spacing.lg },
  sub: { paddingLeft: spacing.lg },
  context: { marginVertical: spacing.lg },
  antes: { minHeight: 56, borderTopWidth: 1, borderTopColor: palette.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  antesLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke },
});

const player = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.black, paddingHorizontal: spacing.lg },
  inner: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  sessionTitle: {
    marginTop: spacing.xl, fontFamily: Fonts.displayRegular, fontWeight: '400',
    fontSize: 32, lineHeight: 36, color: palette.ivory,
  },
  sessionDesc: { marginTop: spacing.md, fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24, color: palette.ash },
  evidence: { marginTop: spacing.sm, fontFamily: Fonts.sans, fontSize: 13, lineHeight: 18, color: palette.smoke },
  timeText: {
    marginTop: spacing.xxxl, fontFamily: Fonts.display, fontWeight: '700',
    fontSize: 72, lineHeight: 80, color: palette.ivory, fontVariant: ['tabular-nums'],
  },
  guide: { marginTop: spacing.xl, gap: spacing.md },
  guideText: { fontFamily: Fonts.sans, fontSize: 17, lineHeight: 26, color: palette.ash },
  northStarText: {
    fontFamily: Fonts.displayRegular, fontWeight: '400', color: palette.ivory, fontSize: 18, lineHeight: 26,
  },
  controls: { marginTop: spacing.xxxl, gap: spacing.md },
  mainBtn: {
    minHeight: 52, borderRadius: radii.sm, backgroundColor: palette.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  mainBtnText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 13, letterSpacing: 1, color: palette.ink },
  ghostBtn: {
    minHeight: 52, borderRadius: radii.sm, borderWidth: 1, borderColor: palette.lineHard,
    alignItems: 'center', justifyContent: 'center',
  },
  ghostBtnText: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 13, letterSpacing: 1, color: palette.ivory },
  textBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  textBtnText: { fontFamily: Fonts.sans, fontSize: 15, color: palette.smoke },
});
