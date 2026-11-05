import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fila, Pantalla, TarjetaOro } from '@/components/pantalla';
import SafetyWarning from '@/components/SafetyWarning';
import { Fonts, palette, radii, spacing } from '@/constants/theme';
import { BREATHING_TECHNIQUES, type BreathingTechnique } from '@/data/wellness';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { analytics } from '@/lib/analytics';
import { useWellnessStore } from '@/store/wellnessStore';
import { BodyContextCard, PracticeClose } from './body-context';

// ─── Haptic helper (web-safe) ─────────────────────────────────────────────────
function haptic(type: 'light' | 'medium' | 'success') {
  if (Platform.OS === 'web') return;
  if (type === 'success') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    Haptics.impactAsync(
      type === 'medium'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light,
    );
  }
}

// Nombres por intención: la técnica (4·7·8, caja, Wim Hof…) no le dice nada a
// quien llega cansado. El patrón técnico vive en `description`, como detalle.
// Cinco intenciones distintas; las técnicas casi iguales (5·5, 2:1, tummo) no
// se listan para no hacer elegir entre dos cosas que suenan igual.
const PURPOSE: Record<string, string> = {
  '4-7-8': 'Para dormir',
  'box': 'Para enfocarte',
  'wim-hof': 'Para activarte',
  'fisiologica': 'Para calmarte ya',
  'nadi-shodhana': 'Para ordenar la mente',
};
const purpose = (t: BreathingTechnique) => PURPOSE[t.id] ?? t.subtitle;
const LISTED = BREATHING_TECHNIQUES.filter((t) => t.id in PURPOSE);
const minutesOf = (t: BreathingTechnique) =>
  Math.max(1, Math.round((t.phases.reduce((a, p) => a + p.duration, 0) * t.cycles) / 60));

/** La propuesta según la hora: noche → dormir, mañana → enfocarte, resto → calmarte ya. */
function suggestedTech(): BreathingTechnique {
  const h = new Date().getHours();
  const id = h >= 20 || h < 5 ? '4-7-8' : h < 11 ? 'box' : 'fisiologica';
  return BREATHING_TECHNIQUES.find((t) => t.id === id) ?? BREATHING_TECHNIQUES[0];
}

function AntesDeEmpezar({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel="Antes de empezar" style={s.antes}>
        <Text style={s.antesLabel}>ANTES DE EMPEZAR</Text>
        <MaterialIcons name={open ? 'expand-less' : 'expand-more'} size={20} color={palette.smoke} />
      </Pressable>
      {open && <View style={{ paddingBottom: 16 }}>{children}</View>}
    </View>
  );
}

const ORB = 220;

type Mode = 'idle' | 'running' | 'paused' | 'done';

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RespiracionScreen() {
  const insets = useSafeAreaInsets();
  const { saveWellnessSession } = useLifeFlow();
  const {
    startSession: storeStart,
    stopSession: storeStop,
    setElapsed: storeElapsed,
  } = useWellnessStore();

  const [suggested] = useState(suggestedTech);
  const [tech, setTech] = useState<BreathingTechnique>(suggested);
  const [mode, setMode] = useState<Mode>('idle');
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseLeft, setPhaseLeft] = useState(suggested.phases[0].duration);
  const [cycles, setCycles] = useState(0);
  const [doneMinutes, setDoneMinutes] = useState(0);

  const running = mode === 'running';
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const phaseTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tiempo activo: acumulado de los tramos corridos (las pausas no cuentan).
  const activeMsRef = useRef(0);
  const resumedAtRef = useRef(0);

  const phases = tech.phases;
  const currentPhase = phases[phaseIdx];

  const elapsedSecs = () =>
    Math.round((activeMsRef.current + (resumedAtRef.current ? Date.now() - resumedAtRef.current : 0)) / 1000);

  // Lleva el círculo al tamaño de la fase. El movimiento ES el ejercicio guiado:
  // no se apaga con reduced-motion (igual que antes).
  const animateTo = useCallback((scale: number, secs: number) => {
    Animated.timing(scaleAnim, { toValue: scale, duration: secs * 1000, useNativeDriver: true }).start();
  }, [scaleAnim]);

  // Phase countdown + advance (1s tick)
  useEffect(() => {
    if (!running) return;
    phaseTickRef.current = setInterval(() => {
      setPhaseLeft((left) => {
        if (left > 1) return left - 1;
        const nextIdx = (phaseIdx + 1) % phases.length;
        if (nextIdx === 0) setCycles((c) => c + 1);
        setPhaseIdx(nextIdx);
        animateTo(phases[nextIdx].scale, phases[nextIdx].duration);
        haptic('light');
        return phases[nextIdx].duration;
      });
    }, 1000);
    return () => {
      if (phaseTickRef.current) clearInterval(phaseTickRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phaseIdx, tech.id]);

  // Total elapsed → wellness store (mini player)
  useEffect(() => {
    if (!running) return;
    totalTimerRef.current = setInterval(() => storeElapsed(elapsedSecs()), 1000);
    return () => { if (totalTimerRef.current) clearInterval(totalTimerRef.current); };
  }, [running, storeElapsed]);

  const start = useCallback((t: BreathingTechnique) => {
    setTech(t);
    setPhaseIdx(0);
    setPhaseLeft(t.phases[0].duration);
    setCycles(0);
    activeMsRef.current = 0;
    resumedAtRef.current = Date.now();
    setMode('running');
    haptic('medium');
    scaleAnim.setValue(1);
    animateTo(t.phases[0].scale, t.phases[0].duration);
    storeStart({ type: 'breathing', sessionName: t.title, targetSeconds: minutesOf(t) * 60 });
  }, [animateTo, scaleAnim, storeStart]);

  const pause = useCallback(() => {
    activeMsRef.current += Date.now() - resumedAtRef.current;
    resumedAtRef.current = 0;
    scaleAnim.stopAnimation();
    setMode('paused');
  }, [scaleAnim]);

  const resume = useCallback(() => {
    resumedAtRef.current = Date.now();
    animateTo(currentPhase.scale, phaseLeft);
    setMode('running');
  }, [animateTo, currentPhase.scale, phaseLeft]);

  const finish = useCallback(async () => {
    const elapsed = elapsedSecs();
    activeMsRef.current = 0;
    resumedAtRef.current = 0;
    scaleAnim.stopAnimation();
    scaleAnim.setValue(1);
    storeStop();
    if (cycles > 0 && elapsed > 5) {
      setDoneMinutes(Math.max(1, Math.round(elapsed / 60)));
      setMode('done');
      await saveWellnessSession({
        type: 'breathing',
        sessionName: tech.title,
        durationSeconds: elapsed,
        completedAt: new Date().toISOString(),
        metadata: { techniqueId: tech.id, cycles },
      });
      analytics.breathingComplete(tech.title, cycles, elapsed * 1000);
      haptic('success');
    } else {
      setMode('idle');
    }
  }, [cycles, saveWellnessSession, scaleAnim, storeStop, tech.id, tech.title]);

  // Al completar los ciclos de la técnica, termina sola.
  useEffect(() => {
    if (running && cycles >= tech.cycles) void finish();
  }, [running, cycles, tech.cycles, finish]);

  // ── Final ──────────────────────────────────────────────────────────────────
  if (mode === 'done') {
    return (
      <Pantalla meta="BIENESTAR · CALMA" title="Hecho." sub={`${doneMinutes}\u00A0min.`} onBack={() => setMode('idle')}>
        <PracticeClose message="¿Cómo aterriza tu cuerpo ahora? Registrarlo es el dato que sí importa." />
      </Pantalla>
    );
  }

  // ── Reproductor ────────────────────────────────────────────────────────────
  if (mode === 'running' || mode === 'paused') {
    return (
      <View style={[s.player, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
        <View style={s.playerTop}>
          <Pressable onPress={() => void finish()} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Terminar y volver">
            <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
          </Pressable>
          <Text style={s.playerMeta}>{purpose(tech).toUpperCase()}</Text>
          <View style={s.backSpacer} />
        </View>

        <View style={s.stage}>
          <Animated.View style={[s.orb, { transform: [{ scale: scaleAnim }] }]} />
          <View style={s.orbText} pointerEvents="none">
            <Text style={s.orbPhase}>{currentPhase.label}</Text>
            <Text style={s.orbCount} accessibilityLiveRegion="polite">{phaseLeft}</Text>
          </View>
        </View>

        <Text style={s.pattern}>{tech.description}</Text>
        {mode === 'paused' && (
          <Text style={s.cycles}>{cycles} de {tech.cycles} ciclos</Text>
        )}

        <View style={s.controls}>
          {mode === 'running' ? (
            <Pressable onPress={pause} style={[s.btn, s.btnOutline]} accessibilityRole="button" accessibilityLabel="Pausa">
              <Text style={s.btnTextOutline}>PAUSA</Text>
            </Pressable>
          ) : (
            <>
              <Pressable onPress={resume} style={[s.btn, s.btnGold]} accessibilityRole="button" accessibilityLabel="Seguir">
                <Text style={s.btnTextGold}>SEGUIR</Text>
              </Pressable>
              <Pressable onPress={() => void finish()} style={[s.btn, s.btnOutline]} accessibilityRole="button" accessibilityLabel="Terminar">
                <Text style={s.btnTextOutline}>TERMINAR</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  }

  // ── Elegir ─────────────────────────────────────────────────────────────────
  const rest = LISTED.filter((t) => t.id !== suggested.id);
  return (
    <Pantalla
      meta="BIENESTAR · CALMA"
      title="Respiración"
      sub="Baja el ritmo en pocos minutos. Elige para qué."
      hero={
        <TarjetaOro
          meta="PARA AHORA"
          metaRight={`${minutesOf(suggested)} MIN`}
          title={purpose(suggested)}
          detail={suggested.description}
          onPress={() => start(suggested)}
          accessibilityLabel={`Empezar: ${purpose(suggested)}, ${minutesOf(suggested)} minutos`}
        />
      }>
      {rest.map((t) => (
        <Fila
          key={t.id}
          label={purpose(t).toUpperCase()}
          value={`${minutesOf(t)}\u00A0min`}
          onPress={() => start(t)}
        />
      ))}
      <AntesDeEmpezar>
        <SafetyWarning
          body="No realices estos ejercicios mientras conduces, en el agua, o de pie. Si estás embarazada, tienes epilepsia, problemas cardíacos o respiratorios, consulta a tu médico antes. Si sientes mareo intenso, detente."
        />
      </AntesDeEmpezar>
      <BodyContextCard />
    </Pantalla>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  antes: { minHeight: 56, borderTopWidth: 1, borderTopColor: palette.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  antesLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke },

  player: { flex: 1, backgroundColor: palette.black, paddingHorizontal: spacing.lg, alignItems: 'center' },
  playerTop: { width: '100%', maxWidth: 680, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backSpacer: { width: 44, height: 44 },
  playerMeta: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke },

  stage: { flex: 1, minHeight: ORB * 1.5, width: '100%', alignItems: 'center', justifyContent: 'center' },
  // Círculo plano: borde visible en ambos temas, sin halo ni relleno teñido.
  orb: { width: ORB, height: ORB, borderRadius: ORB / 2, borderWidth: 2, borderColor: palette.lineHard },
  orbText: { position: 'absolute', alignItems: 'center' },
  orbPhase: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 14, letterSpacing: 2, color: palette.ivory },
  orbCount: { fontFamily: Fonts.displayRegular, fontWeight: '400', fontSize: 72, lineHeight: 80, color: palette.ivory },

  pattern: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 22, color: palette.ash, textAlign: 'center' },
  cycles: { marginTop: spacing.sm, fontFamily: Fonts.sans, fontSize: 15, color: palette.smoke, textAlign: 'center' },

  controls: { width: '100%', maxWidth: 420, marginTop: spacing.xl, gap: spacing.sm },
  btn: { height: 52, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  btnGold: { backgroundColor: palette.gold },
  btnOutline: { borderWidth: 1, borderColor: palette.lineHard },
  btnTextGold: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 13, letterSpacing: 1.5, color: palette.ink },
  btnTextOutline: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 13, letterSpacing: 1.5, color: palette.ivory },
});
