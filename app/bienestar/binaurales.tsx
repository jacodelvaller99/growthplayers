import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fila, Pantalla, TarjetaOro } from '@/components/pantalla';
import SafetyWarning from '@/components/SafetyWarning';
import { Fonts, palette, radii, spacing } from '@/constants/theme';
import {
  AMBIENCE_OPTIONS,
  BINAURAL_PRESETS,
  TIMER_OPTIONS,
  binauralMusicForBeat,
  normanVoiceUrl,
  type AmbienceType,
  type BinauralPreset,
} from '@/data/wellness';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { useWellnessStore } from '@/store/wellnessStore';
import { createBinauralAudio, type BinauralAudioHandle } from '@/lib/binaural';
import { createNarrationPlayer, type NarrationHandle } from '@/lib/narrationPlayer';
import { getBinauralGuide } from '@/data/binauralGuides';
import { analytics } from '@/lib/analytics';

// ─── Haptic helper ────────────────────────────────────────────────────────────
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

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Cada sonido se nombra por para qué sirve. La banda técnica (delta, theta…)
 * y los hercios no salen a la cara: no le dicen nada a quien solo quiere
 * dormir o concentrarse.
 */
const PURPOSE: Record<string, { name: string; detail: string }> = {
  delta: { name: 'Dormir profundo', detail: 'Un tono lento para acompañar el descanso.' },
  theta: { name: 'Relajarte',       detail: 'Para soltar el día y bajar el ritmo.' },
  alpha: { name: 'Calma alerta',    detail: 'Tranquilo, pero presente.' },
  beta:  { name: 'Concentrarte',    detail: 'Para sostener la atención en una tarea.' },
  gamma: { name: 'Atención intensa', detail: 'Para un bloque corto de trabajo exigente.' },
};
const purposeOf = (p: BinauralPreset) => PURPOSE[p.id] ?? { name: p.label, detail: p.benefit };

// ─── Tu mezcla: tonos extra, nombrados por intención ─────────────────────────
interface MixerPreset {
  id: string;
  name: string;
  detail: string;
  carrierHz: number;
  beatHz: number;
}

const MIXER_PRESETS: MixerPreset[] = [
  { id: 'intelligence', name: 'Foco',        detail: 'Un tono rápido para trabajar.',      carrierHz: 200, beatHz: 40 },
  { id: 'intuition',    name: 'Creatividad', detail: 'Un tono medio para pensar suelto.',  carrierHz: 210, beatHz: 8 },
  { id: 'euphoria',     name: 'Ánimo',       detail: 'Un tono medio, más brillante.',      carrierHz: 432, beatHz: 10 },
  { id: 'healing',      name: 'Calma',       detail: 'Un tono suave para relajarte.',      carrierHz: 200, beatHz: 7.83 },
  { id: 'memory',       name: 'Ensoñación',  detail: 'Un tono lento, entre la vigilia y el sueño.', carrierHz: 100, beatHz: 4 },
];

const mixerToPreset = (mp: MixerPreset): BinauralPreset => ({
  id: mp.id,
  label: mp.name,
  description: mp.name,
  benefit: mp.detail,
  carrierHz: mp.carrierHz,
  beatHz: mp.beatHz,
  color: palette.ash,
  icon: 'graphic-eq',
});

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

// ─── Simple Slider (web + native compatible) ──────────────────────────────────
function VolumeSlider({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  if (Platform.OS === 'web') {
    return (
      <View style={slider.row}>
        <Text style={slider.label}>{label}</Text>
        {/* @ts-ignore web-only */}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={value}
          aria-label={label}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: palette.gold, cursor: 'pointer' }}
        />
      </View>
    );
  }
  // Native: barra de lectura (el volumen fino se ajusta con los botones del equipo)
  return (
    <View style={slider.row}>
      <Text style={slider.label}>{label}</Text>
      <View style={slider.track}>
        <View style={[slider.fill, { width: `${value * 100}%` as unknown as number }]} />
      </View>
    </View>
  );
}

const slider = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 },
  label: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke, width: 96 },
  track: { flex: 1, height: 4, backgroundColor: palette.charcoal, borderRadius: radii.xs, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: palette.ash },
});

// ─── Binaural Player ──────────────────────────────────────────────────────────
// Negro plano, temporizador grande, un solo botón. Sin anillos ni hercios.

function BinauralPlayer({
  preset,
  onComplete,
  onExit,
}: {
  preset: BinauralPreset;
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

  const [running, setRunning] = useState(false);
  const [paused, setPaused]   = useState(false);
  const [done, setDone]       = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState<(typeof TIMER_OPTIONS)[number]>(10);
  const [binauralVol, setBinauralVol] = useState(0.6);
  const [ambienceVol, setAmbienceVol] = useState(0.4);
  const [ambience, setAmbience] = useState<AmbienceType>('none');

  const audioRef    = useRef<BinauralAudioHandle | null>(null);
  const narrationRef = useRef<NarrationHandle | null>(null);
  const startTimeRef = useRef(0);
  const pausedAtRef  = useRef(0);   // Date.now() when paused
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetSecs  = timerMinutes * 60;
  const purpose = purposeOf(preset);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.stop();
      narrationRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const tick = useCallback(() => {
    const secs = Math.round((Date.now() - startTimeRef.current) / 1000);
    setElapsed(secs);
    storeElapsed(secs);
    if (secs >= targetSecs) {
      clearInterval(timerRef.current!);
      audioRef.current?.stop();
      audioRef.current = null;
      narrationRef.current?.stop();
      narrationRef.current = null;
      setRunning(false);
      setDone(true);
      haptic('success');
      storeStop();
      onComplete(secs);
    }
  }, [targetSecs, onComplete, storeStop, storeElapsed]);

  const startSession = useCallback(() => {
    const handle = createBinauralAudio(preset.carrierHz, preset.beatHz, binauralMusicForBeat(preset.beatHz));
    if (handle) {
      handle.start();
      handle.setVolume(binauralVol);
      handle.setAmbienceVolume(ambienceVol);
      if (ambience !== 'none') handle.setAmbience(ambience);
      audioRef.current = handle;
    }
    // Guía de entrada: Norman abre la sesión y se calla; el tono sigue.
    const guide = getBinauralGuide(preset.id);
    if (guide) {
      const n = createNarrationPlayer({
        phases: guide.segments.map((seg, i) => ({
          url: normanVoiceUrl(`binaural-${guide.id}`, {}, i),
          duration: seg.duration,
          pauseAfter: seg.pauseAfter,
        })),
        // Agacha el tono para no tapar la voz.
        onDuck: (ducked) => audioRef.current?.setVolume(ducked ? binauralVol * 0.35 : binauralVol),
      });
      if (n) { narrationRef.current = n; n.start(); }
    }

    startTimeRef.current = Date.now();
    setRunning(true);
    setPaused(false);
    setElapsed(0);
    haptic('medium');

    // Wire to global wellness store so mini player appears
    storeStart({
      type:          'binaural',
      sessionName:   purpose.name,
      leftHz:        preset.carrierHz,
      rightHz:       preset.carrierHz + preset.beatHz,
      waveVolume:    binauralVol,
      bgVolume:      ambienceVol,
      bgTrack:       ambience,
      targetSeconds: targetSecs,
    });

    timerRef.current = setInterval(tick, 500);
  }, [preset, purpose.name, binauralVol, ambienceVol, ambience, targetSecs, storeStart, tick]);

  const stopSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    audioRef.current?.stop();
    audioRef.current = null;
    narrationRef.current?.stop();
    narrationRef.current = null;
    setRunning(false);
    setPaused(false);
    setElapsed(0);
    storeStop();
    haptic('light');
  }, [storeStop]);

  const pauseSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    audioRef.current?.suspend();
    narrationRef.current?.pause();
    pausedAtRef.current = Date.now();
    setRunning(false);
    setPaused(true);
    storePause();
    haptic('light');
  }, [storePause]);

  const resumeSession = useCallback(() => {
    // Slide startTime forward by the duration we were paused
    startTimeRef.current += Date.now() - pausedAtRef.current;
    audioRef.current?.resume();
    narrationRef.current?.resume();
    setRunning(true);
    setPaused(false);
    storeResume();
    haptic('light');
    timerRef.current = setInterval(tick, 500);
  }, [storeResume, tick]);

  const handleBinauralVol = (v: number) => {
    setBinauralVol(v);
    audioRef.current?.setVolume(v);
  };

  const handleAmbienceVol = (v: number) => {
    setAmbienceVol(v);
    audioRef.current?.setAmbienceVolume(v);
  };

  const handleAmbience = (a: AmbienceType) => {
    setAmbience(a);
    haptic('light');
    audioRef.current?.setAmbience(a);
  };

  // Final limpio: "Hecho. N min." + Volver.
  if (done) {
    return (
      <Pantalla meta="BIENESTAR · SONIDOS" title="Hecho." sub={`${Math.max(1, Math.round(elapsed / 60))} min.`}>
        <Fila label="VOLVER" value="Sonidos" onPress={onExit} last />
      </Pantalla>
    );
  }

  const started = running || paused;
  const remaining = Math.max(targetSecs - elapsed, 0);

  return (
    <ScrollView
      style={play.root}
      contentContainerStyle={[play.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}>
      <View style={play.inner}>
        <Pressable onPress={() => { stopSession(); onExit(); }} style={play.backBtn} accessibilityRole="button" accessibilityLabel="Salir de la sesión">
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>

        <Text style={play.title}>{purpose.name}</Text>
        <Text style={play.desc}>{purpose.detail}</Text>

        <Text style={play.time} accessibilityRole="timer">{formatTime(started ? remaining : targetSecs)}</Text>

        {!started && (
          <>
            <Text style={play.groupLabel}>DURACIÓN</Text>
            <View style={play.optRow}>
              {TIMER_OPTIONS.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => { setTimerMinutes(m); haptic('light'); }}
                  accessibilityRole="button"
                  accessibilityLabel={`${m} minutos`}
                  accessibilityState={{ selected: timerMinutes === m }}
                  style={play.opt}>
                  <Text style={[play.optText, timerMinutes === m && play.optTextOn]}>{m} min</Text>
                </Pressable>
              ))}
            </View>

            <Text style={play.groupLabel}>FONDO</Text>
            <View style={play.optRow}>
              {AMBIENCE_OPTIONS.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => handleAmbience(a.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Fondo: ${a.label.toLowerCase()}`}
                  accessibilityState={{ selected: ambience === a.id }}
                  style={play.opt}>
                  <Text style={[play.optText, ambience === a.id && play.optTextOn]}>
                    {a.label.charAt(0) + a.label.slice(1).toLowerCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <View style={play.vols}>
          <VolumeSlider value={binauralVol} onChange={handleBinauralVol} label="TONO" />
          <VolumeSlider value={ambienceVol} onChange={handleAmbienceVol} label="FONDO" />
        </View>

        <Text style={play.notice}>Usa audífonos. Si te mareas, para.</Text>
        {Platform.OS !== 'web' && (
          <Text style={play.notice}>En la app suena la música de fondo; el tono completo está en la versión web.</Text>
        )}

        <View style={play.controls}>
          {!started && (
            <Pressable style={play.mainBtn} onPress={startSession} accessibilityRole="button" accessibilityLabel={`Empezar ${timerMinutes} minutos`}>
              <Text style={play.mainBtnText}>EMPEZAR</Text>
            </Pressable>
          )}
          {running && (
            <Pressable style={play.ghostBtn} onPress={pauseSession} accessibilityRole="button" accessibilityLabel="Pausar sesión">
              <Text style={play.ghostBtnText}>PAUSA</Text>
            </Pressable>
          )}
          {paused && (
            <>
              <Pressable style={play.mainBtn} onPress={resumeSession} accessibilityRole="button" accessibilityLabel="Seguir con la sesión">
                <Text style={play.mainBtnText}>SEGUIR</Text>
              </Pressable>
              <Pressable style={play.textBtn} onPress={stopSession} accessibilityRole="button" accessibilityLabel="Terminar sesión">
                <Text style={play.textBtnText}>Terminar</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BinauralesScreen() {
  const router = useRouter();
  const { saveWellnessSession } = useLifeFlow();
  const [active, setActive] = useState<BinauralPreset | null>(null);
  const [mixerOpen, setMixerOpen] = useState(false);

  const handleComplete = useCallback(async (preset: BinauralPreset, secs: number) => {
    await saveWellnessSession({
      type: 'binaural',
      sessionName: purposeOf(preset).name,
      durationSeconds: secs,
      completedAt: new Date().toISOString(),
      metadata: { presetId: preset.id, beatHz: preset.beatHz, carrierHz: preset.carrierHz },
    });
    analytics.binauralComplete(preset.label, secs);
    haptic('success');
  }, [saveWellnessSession]);

  if (active) {
    return (
      <BinauralPlayer
        preset={active}
        onComplete={(secs) => handleComplete(active, secs)}
        onExit={() => setActive(null)}
      />
    );
  }

  const open = (preset: BinauralPreset) => {
    haptic('light');
    analytics.binauralStart(preset.label, 0, preset.beatHz);
    setActive(preset);
  };

  // Propuesta por hora: de noche, dormir; de día, concentrarte.
  const hour = new Date().getHours();
  const suggestedId = hour >= 20 || hour < 5 ? 'delta' : hour < 12 ? 'beta' : 'alpha';
  const suggested = BINAURAL_PRESETS.find((p) => p.id === suggestedId) ?? BINAURAL_PRESETS[0];
  const rest = BINAURAL_PRESETS.filter((p) => p.id !== suggested.id);

  return (
    <Pantalla
      meta="BIENESTAR · CALMA"
      title="Sonidos"
      sub="Para concentrarte o calmarte. Usa audífonos. Si te mareas, para."
      hero={
        <TarjetaOro
          meta="PARA AHORA"
          metaRight="10 MIN"
          title={purposeOf(suggested).name}
          detail={purposeOf(suggested).detail}
          onPress={() => open(suggested)}
        />
      }>
      {rest.map((preset) => (
        <Fila
          key={preset.id}
          label={purposeOf(preset).name.toUpperCase()}
          value={purposeOf(preset).detail}
          onPress={() => open(preset)}
        />
      ))}

      <Fila
        label="HACER TU MEZCLA"
        value={mixerOpen ? 'Cerrar' : 'Más tonos'}
        onPress={() => { setMixerOpen((o) => !o); haptic('light'); }}
      />
      {mixerOpen && MIXER_PRESETS.map((mp) => (
        <View key={mp.id} style={styles.sub}>
          <Fila
            label={mp.name.toUpperCase()}
            value={mp.detail}
            onPress={() => { haptic('medium'); setActive(mixerToPreset(mp)); }}
          />
        </View>
      ))}

      <AntesDeEmpezar>
        <SafetyWarning
          title="SOBRE LOS BINAURALES"
          body="Los efectos de los ritmos binaurales en foco, calma o energía están investigados pero no son concluyentes; la respuesta es individual. Es un complemento de bienestar, no un tratamiento médico ni un sustituto de atención profesional. No los uses mientras conduces u operas maquinaria, y consulta a tu médico si tienes epilepsia o fotosensibilidad. Si durante la sesión aumenta la angustia o sientes desconexión de tu cuerpo o del entorno, detenla."
        />
      </AntesDeEmpezar>

      <Fila label="VOLVER" value="Bienestar" onPress={() => router.back()} last />
    </Pantalla>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sub: { paddingLeft: spacing.lg },
  antes: { minHeight: 56, borderTopWidth: 1, borderTopColor: palette.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  antesLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: 11, letterSpacing: 1, color: palette.smoke },
});

const play = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.black },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg },
  inner: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  title: {
    marginTop: spacing.xl, fontFamily: Fonts.displayRegular, fontWeight: '400',
    fontSize: 32, lineHeight: 36, color: palette.ivory,
  },
  desc: { marginTop: spacing.md, fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24, color: palette.ash },
  time: {
    marginTop: spacing.xxl, fontFamily: Fonts.display, fontWeight: '700',
    fontSize: 72, lineHeight: 80, color: palette.ivory, fontVariant: ['tabular-nums'],
  },
  groupLabel: {
    marginTop: spacing.xl, fontFamily: Fonts.display, fontWeight: '700',
    fontSize: 11, letterSpacing: 1, color: palette.smoke,
  },
  optRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg },
  opt: { minHeight: 44, justifyContent: 'center' },
  optText: { fontFamily: Fonts.sans, fontSize: 16, color: palette.smoke },
  optTextOn: { color: palette.ivory, textDecorationLine: 'underline' },
  vols: { marginTop: spacing.xl, gap: spacing.xs },
  notice: { marginTop: spacing.md, fontFamily: Fonts.sans, fontSize: 14, lineHeight: 20, color: palette.smoke },
  controls: { marginTop: spacing.xl, gap: spacing.md },
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
