import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GoldDivider, PremiumCard, screen } from '@/components/polaris';
import { Fonts, palette, radii, spacing, typography } from '@/constants/theme';
import {
  AMBIENCE_OPTIONS,
  BINAURAL_PRESETS,
  TIMER_OPTIONS,
  type AmbienceType,
  type BinauralPreset,
} from '@/data/wellness';
import { useLifeFlow } from '@/hooks/use-lifeflow';
import { createBinauralAudio, type BinauralAudioHandle } from '@/lib/binaural';

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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: palette.gold, cursor: 'pointer' }}
        />
        <Text style={slider.val}>{Math.round(value * 100)}%</Text>
      </View>
    );
  }
  // Native: simple touch bar (tap to set approximate value)
  return (
    <View style={slider.row}>
      <Text style={slider.label}>{label}</Text>
      <View style={slider.track}>
        <View style={[slider.fill, { width: `${value * 100}%` as unknown as number }]} />
      </View>
      <Text style={slider.val}>{Math.round(value * 100)}%</Text>
    </View>
  );
}

const slider = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: palette.ash,
    width: 70,
    fontSize: 10,
    letterSpacing: 1,
  },
  track: {
    flex: 1,
    height: 4,
    backgroundColor: palette.charcoal,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: palette.gold,
  },
  val: {
    ...typography.mono,
    color: palette.smoke,
    fontSize: 11,
    width: 32,
    textAlign: 'right',
  },
});

// ─── Mixer mode presets ───────────────────────────────────────────────────────
interface MixerPreset {
  id: string;
  label: string;
  description: string;
  carrierHz: number;
  beatHz: number;
  color: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
}

const MIXER_PRESETS: MixerPreset[] = [
  { id: 'intelligence', label: 'INTELLIGENCE',  description: '40 Hz Gamma — Foco máximo y cognición',      carrierHz: 200, beatHz: 40,   color: '#4a90d9', icon: 'psychology'       },
  { id: 'intuition',    label: 'INTUITION',     description: '8 Hz Alpha — Creatividad e intuición',       carrierHz: 210, beatHz: 8,    color: '#9c6aff', icon: 'auto-awesome'     },
  { id: 'euphoria',     label: 'EUPHORIA',      description: '10 Hz Alpha — Estados elevados de bienestar', carrierHz: 432, beatHz: 10,   color: '#e8a62a', icon: 'sentiment-very-satisfied' },
  { id: 'healing',      label: 'HEALING',       description: '7.83 Hz Schumann — Resonancia terrestre',    carrierHz: 200, beatHz: 7.83, color: '#2e7d52', icon: 'favorite'         },
  { id: 'memory',       label: 'MEMORY',        description: '4 Hz Theta — Memoria profunda y sueños',     carrierHz: 100, beatHz: 4,    color: '#c0392b', icon: 'memory'           },
];

// ─── Wave Visualizer ──────────────────────────────────────────────────────────
function WaveVisualizer({ active, color }: { active: boolean; color: string }) {
  const bars = useRef(
    Array.from({ length: 7 }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (!active) {
      bars.forEach((b) => Animated.timing(b, { toValue: 0.3, duration: 300, useNativeDriver: false }).start());
      return;
    }
    const anims = bars.map((bar, i) => {
      const delay = i * 80;
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(bar, { toValue: 0.2 + Math.random() * 0.6, duration: 300 + Math.random() * 200, useNativeDriver: false }),
          Animated.timing(bar, { toValue: 0.2 + Math.random() * 0.4, duration: 300 + Math.random() * 200, useNativeDriver: false }),
        ])
      );
    });
    Animated.stagger(60, anims).start();
    return () => anims.forEach((a) => a.stop());
  }, [active]);

  return (
    <View style={wave.row}>
      {bars.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            wave.bar,
            {
              backgroundColor: color,
              height: anim.interpolate({ inputRange: [0, 1], outputRange: [6, 40] }),
              opacity: active ? 1 : 0.3,
            },
          ]}
        />
      ))}
    </View>
  );
}

const wave = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 48,
    paddingHorizontal: spacing.md,
  },
  bar: {
    width: 5,
    borderRadius: 3,
    minHeight: 6,
  },
});

// ─── Binaural Player ──────────────────────────────────────────────────────────

function BinauralPlayer({
  preset,
  onComplete,
  onExit,
}: {
  preset: BinauralPreset;
  onComplete: (secs: number) => void;
  onExit: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState<(typeof TIMER_OPTIONS)[number]>(10);
  const [binauralVol, setBinauralVol] = useState(0.6);
  const [ambienceVol, setAmbienceVol] = useState(0.4);
  const [ambience, setAmbience] = useState<AmbienceType>('none');

  const audioRef = useRef<BinauralAudioHandle | null>(null);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetSecs = timerMinutes * 60;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startSession = useCallback(() => {
    const handle = createBinauralAudio(preset.carrierHz, preset.beatHz);
    if (!handle) {
      // Non-web: just run timer without audio
    } else {
      handle.start();
      handle.setVolume(binauralVol);
      handle.setAmbienceVolume(ambienceVol);
      if (ambience !== 'none') handle.setAmbience(ambience);
      audioRef.current = handle;
    }
    startTimeRef.current = Date.now();
    setRunning(true);
    setElapsed(0);
    haptic('medium');

    timerRef.current = setInterval(() => {
      const secs = Math.round((Date.now() - startTimeRef.current) / 1000);
      setElapsed(secs);
      if (secs >= targetSecs) {
        clearInterval(timerRef.current!);
        audioRef.current?.stop();
        audioRef.current = null;
        setRunning(false);
        setDone(true);
        haptic('success');
        onComplete(secs);
      }
    }, 500);
  }, [preset, binauralVol, ambienceVol, ambience, targetSecs, onComplete]);

  const stopSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    audioRef.current?.stop();
    audioRef.current = null;
    setRunning(false);
    setElapsed(0);
    haptic('light');
  }, []);

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

  const progress = Math.min(elapsed / targetSecs, 1);
  const remaining = Math.max(targetSecs - elapsed, 0);

  return (
    <ScrollView
      style={[screen.root]}
      contentContainerStyle={[screen.content, { paddingTop: 56, alignItems: 'center' }]}
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={play.header}>
        <Pressable onPress={onExit} style={play.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={play.titleText}>{preset.label}</Text>
        <Text style={play.elapsed}>{formatTime(elapsed)}</Text>
      </View>

      <Text style={play.descText}>{preset.benefit}</Text>

      {/* Ring progress */}
      <View style={play.ringWrap}>
        {Platform.OS === 'web' ? (
          <WebRing progress={progress} color={preset.color} label={done ? '✓' : running ? formatTime(remaining) : preset.description} />
        ) : (
          <NativeRing progress={progress} color={preset.color} label={done ? '✓' : running ? formatTime(remaining) : preset.description} />
        )}
        <WaveVisualizer active={running} color={preset.color} />
      </View>

      {/* Hz info */}
      <View style={play.hzRow}>
        <View style={play.hzBox}>
          <Text style={play.hzValue}>{preset.carrierHz}</Text>
          <Text style={play.hzLabel}>Hz portadora</Text>
        </View>
        <View style={play.hzDivider} />
        <View style={play.hzBox}>
          <Text style={play.hzValue}>{preset.beatHz}</Text>
          <Text style={play.hzLabel}>Hz beat</Text>
        </View>
        <View style={play.hzDivider} />
        <View style={play.hzBox}>
          <Text style={play.hzValue}>{preset.carrierHz + preset.beatHz}</Text>
          <Text style={play.hzLabel}>Hz derecho</Text>
        </View>
      </View>

      <GoldDivider label="CONFIGURACIÓN" />

      {/* Timer selector */}
      {!running && !done && (
        <>
          <View style={play.timerRow}>
            {TIMER_OPTIONS.map((m) => (
              <Pressable
                key={m}
                onPress={() => { setTimerMinutes(m); haptic('light'); }}
                style={[play.timerBtn, timerMinutes === m && play.timerBtnActive]}>
                <Text style={[play.timerBtnText, timerMinutes === m && play.timerBtnTextActive]}>
                  {m}m
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Ambience selector */}
          <View style={play.ambienceRow}>
            {AMBIENCE_OPTIONS.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => handleAmbience(a.id)}
                style={[play.ambienceBtn, ambience === a.id && play.ambienceBtnActive]}>
                <MaterialIcons
                  name={a.icon as React.ComponentProps<typeof MaterialIcons>['name']}
                  size={16}
                  color={ambience === a.id ? palette.black : palette.ash}
                />
                <Text style={[play.ambienceBtnText, ambience === a.id && play.ambienceBtnTextActive]}>
                  {a.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* Volume controls */}
      <PremiumCard style={play.volCard}>
        <VolumeSlider value={binauralVol} onChange={handleBinauralVol} label="TONO BINAURAL" />
        <VolumeSlider value={ambienceVol} onChange={handleAmbienceVol} label="AMBIENTE" />
      </PremiumCard>

      {/* Headphone notice */}
      <View style={play.noticeRow}>
        <MaterialIcons name="headphones" size={14} color={palette.goldMuted} />
        <Text style={play.noticeText}>Requiere audífonos para el efecto binaural</Text>
      </View>

      {/* CTA */}
      {!running && !done && (
        <Pressable style={play.startBtn} onPress={startSession}>
          <MaterialIcons name="play-arrow" size={24} color={palette.black} />
          <Text style={play.startBtnText}>INICIAR {timerMinutes} MIN</Text>
        </Pressable>
      )}
      {running && (
        <Pressable style={play.stopBtn} onPress={stopSession}>
          <MaterialIcons name="stop" size={20} color={palette.ash} />
          <Text style={play.stopBtnText}>DETENER</Text>
        </Pressable>
      )}
      {done && (
        <View style={play.doneBox}>
          <Text style={play.doneText}>SESIÓN COMPLETADA</Text>
          <Pressable style={play.startBtn} onPress={onExit}>
            <Text style={play.startBtnText}>CONTINUAR</Text>
          </Pressable>
        </View>
      )}

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  );
}

// ─── Ring components ──────────────────────────────────────────────────────────

function WebRing({ progress, color, label }: { progress: number; color: string; label: string }) {
  const r = 88;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - progress);

  return (
    // @ts-ignore web SVG
    <svg width={200} height={200} style={{ transform: 'rotate(-90deg)' }}>
      {/* @ts-ignore */}
      <circle cx={100} cy={100} r={r} fill="none" stroke={palette.charcoal} strokeWidth={6} />
      {/* @ts-ignore */}
      <circle
        cx={100} cy={100} r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={circ}
        strokeDashoffset={dash}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s linear' }}
      />
      {/* Center label rendered via foreignObject */}
      {/* @ts-ignore */}
      <foreignObject x={30} y={70} width={140} height={60} style={{ transform: 'rotate(90deg)', transformOrigin: '100px 100px' }}>
        <div
          // @ts-ignore
          xmlns="http://www.w3.org/1999/xhtml"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <span style={{ color: palette.ivory, fontFamily: 'SpaceMono_400Regular, monospace', fontSize: 18, letterSpacing: 1, textAlign: 'center' }}>
            {label}
          </span>
        </div>
      </foreignObject>
    </svg>
  );
}

function NativeRing({ progress, color, label }: { progress: number; color: string; label: string }) {
  return (
    <View style={[ring.outer, { borderColor: color + '44' }]}>
      <View style={[ring.inner, { borderColor: color }]}>
        <Text style={[ring.label, { color }]}>{label}</Text>
      </View>
    </View>
  );
}

const ring = StyleSheet.create({
  outer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    backgroundColor: palette.graphite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: Fonts.mono,
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 1,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BinauralesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saveWellnessSession } = useLifeFlow();
  const [active, setActive] = useState<BinauralPreset | null>(null);
  const [mixerMode, setMixerMode] = useState(false);
  const [activeMixer, setActiveMixer] = useState<MixerPreset | null>(null);

  const handleComplete = useCallback(async (preset: BinauralPreset, secs: number) => {
    await saveWellnessSession({
      type: 'binaural',
      sessionName: preset.label,
      durationSeconds: secs,
      completedAt: new Date().toISOString(),
      metadata: { presetId: preset.id, beatHz: preset.beatHz, carrierHz: preset.carrierHz },
    });
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

  return (
    <ScrollView
      style={screen.root}
      contentContainerStyle={[screen.content, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={palette.ash} />
        </Pressable>
        <Text style={styles.title}>BINAURALES</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.intro}>
        Frecuencias que sincronizan hemisferios cerebrales. Requiere audífonos.
      </Text>

      {/* Headphone banner */}
      <PremiumCard style={styles.noticeBanner}>
        <MaterialIcons name="headphones" size={20} color={palette.gold} />
        <Text style={styles.noticeText}>
          Los beats binaurales requieren audífonos estéreo. El cerebro percibe la diferencia entre el tono izquierdo y el derecho.
        </Text>
      </PremiumCard>

      {/* Mode toggle */}
      <View style={styles.modeToggleRow}>
        <Pressable
          onPress={() => { setMixerMode(false); haptic('light'); }}
          style={[styles.modeBtn, !mixerMode && styles.modeBtnActive]}>
          <MaterialIcons name="queue-music" size={16} color={!mixerMode ? palette.black : palette.ash} />
          <Text style={[styles.modeBtnText, !mixerMode && styles.modeBtnTextActive]}>BÁSICO</Text>
        </Pressable>
        <Pressable
          onPress={() => { setMixerMode(true); haptic('light'); }}
          style={[styles.modeBtn, mixerMode && styles.modeBtnActive]}>
          <MaterialIcons name="tune" size={16} color={mixerMode ? palette.black : palette.ash} />
          <Text style={[styles.modeBtnText, mixerMode && styles.modeBtnTextActive]}>MEZCLADOR</Text>
        </Pressable>
      </View>

      {!mixerMode ? (
        <>
          <GoldDivider label="FRECUENCIAS" />
          {BINAURAL_PRESETS.map((preset) => (
            <Pressable
              key={preset.id}
              onPress={() => { haptic('light'); setActive(preset); }}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
              <View style={[styles.colorBar, { backgroundColor: preset.color }]} />
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <View style={[styles.iconBox, { backgroundColor: preset.color + '22' }]}>
                    <MaterialIcons
                      name={preset.icon as React.ComponentProps<typeof MaterialIcons>['name']}
                      size={24}
                      color={preset.color}
                    />
                  </View>
                  <View style={styles.cardMeta}>
                    <Text style={styles.cardLabel}>{preset.label}</Text>
                    <Text style={[styles.cardHz, { color: preset.color }]}>{preset.description}</Text>
                  </View>
                  <MaterialIcons name="play-circle" size={32} color={preset.color} />
                </View>
                <Text style={styles.cardBenefit}>{preset.benefit}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardFooterText}>{preset.beatHz} Hz beat · {preset.carrierHz} Hz portadora</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <GoldDivider label="FRECUENCIAS AVANZADAS" />
          <Text style={styles.mixerIntro}>
            Selecciona una categoría de estado mental y lanza la sesión desde el mezclador.
          </Text>
          <View style={styles.mixerGrid}>
            {MIXER_PRESETS.map((mp) => (
              <Pressable
                key={mp.id}
                onPress={() => { setActiveMixer(activeMixer?.id === mp.id ? null : mp); haptic('light'); }}
                style={[
                  styles.mixerCard,
                  activeMixer?.id === mp.id && { borderColor: mp.color, backgroundColor: mp.color + '18' },
                ]}>
                <View style={[styles.mixerIconBox, { backgroundColor: mp.color + '22' }]}>
                  <MaterialIcons name={mp.icon} size={22} color={mp.color} />
                </View>
                <Text style={[styles.mixerLabel, { color: mp.color }]}>{mp.label}</Text>
                <Text style={styles.mixerDesc} numberOfLines={2}>{mp.description}</Text>
                <Text style={styles.mixerHz}>{mp.beatHz} Hz · {mp.carrierHz} Hz</Text>
              </Pressable>
            ))}
          </View>

          {activeMixer && (
            <PremiumCard style={[styles.mixerPlayerCard, { borderColor: activeMixer.color + '66' }]}>
              <View style={styles.mixerPlayerHeader}>
                <Text style={[styles.mixerPlayerTitle, { color: activeMixer.color }]}>
                  {activeMixer.label}
                </Text>
                <WaveVisualizer active={false} color={activeMixer.color} />
              </View>
              <View style={styles.mixerHzRow}>
                <View style={styles.mixerHzBox}>
                  <Text style={[styles.mixerHzVal, { color: activeMixer.color }]}>{activeMixer.carrierHz}</Text>
                  <Text style={styles.mixerHzLabel}>Hz portadora</Text>
                </View>
                <View style={styles.hzDividerV} />
                <View style={styles.mixerHzBox}>
                  <Text style={[styles.mixerHzVal, { color: activeMixer.color }]}>{activeMixer.beatHz}</Text>
                  <Text style={styles.mixerHzLabel}>Hz beat</Text>
                </View>
                <View style={styles.hzDividerV} />
                <View style={styles.mixerHzBox}>
                  <Text style={[styles.mixerHzVal, { color: activeMixer.color }]}>
                    {activeMixer.carrierHz + activeMixer.beatHz}
                  </Text>
                  <Text style={styles.mixerHzLabel}>Hz derecho</Text>
                </View>
              </View>
              <Pressable
                style={[styles.mixerStartBtn, { backgroundColor: activeMixer.color }]}
                onPress={() => {
                  haptic('medium');
                  // Convert mixer preset to BinauralPreset shape and launch player
                  setActive({
                    id: activeMixer.id,
                    label: activeMixer.label,
                    description: `${activeMixer.beatHz} Hz beat`,
                    benefit: activeMixer.description,
                    carrierHz: activeMixer.carrierHz,
                    beatHz: activeMixer.beatHz,
                    color: activeMixer.color,
                    icon: activeMixer.icon as string,
                  } as BinauralPreset);
                }}>
                <MaterialIcons name="play-arrow" size={22} color={palette.black} />
                <Text style={styles.mixerStartText}>LANZAR SESIÓN</Text>
              </Pressable>
            </PremiumCard>
          )}
        </>
      )}

      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
    color: palette.ivory,
    fontSize: 18,
  },
  intro: {
    ...typography.body,
    color: palette.ash,
    marginBottom: spacing.lg,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  noticeText: {
    ...typography.body,
    color: palette.ash,
    flex: 1,
    fontSize: 13,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: palette.graphite,
    borderColor: palette.line,
    borderWidth: 1,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.8,
  },
  colorBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: {
    flex: 1,
  },
  cardLabel: {
    ...typography.section,
    color: palette.ivory,
    fontSize: 16,
    letterSpacing: 2.5,
  },
  cardHz: {
    ...typography.mono,
    fontSize: 12,
    marginTop: 2,
  },
  cardBenefit: {
    ...typography.body,
    color: palette.ash,
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cardFooterText: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 10,
  },

  // Mode toggle
  modeToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.line,
  },
  modeBtnActive: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  modeBtnText: {
    ...typography.label,
    color: palette.ash,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  modeBtnTextActive: {
    color: palette.black,
    fontWeight: '700',
  },

  // Mixer
  mixerIntro: {
    ...typography.body,
    color: palette.smoke,
    fontSize: 12,
    marginBottom: spacing.lg,
  },
  mixerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  mixerCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: palette.graphite,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
    minWidth: 130,
  },
  mixerIconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixerLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  mixerDesc: {
    ...typography.caption,
    color: palette.smoke,
    fontSize: 10,
    lineHeight: 14,
  },
  mixerHz: {
    ...typography.mono,
    color: palette.ash,
    fontSize: 9,
    marginTop: 2,
  },
  mixerPlayerCard: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  mixerPlayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mixerPlayerTitle: {
    fontFamily: Fonts.display,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  mixerHzRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  mixerHzBox: {
    alignItems: 'center',
    flex: 1,
  },
  mixerHzVal: {
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '800',
  },
  mixerHzLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 9,
    marginTop: 2,
  },
  hzDividerV: {
    width: 1,
    height: 28,
    backgroundColor: palette.line,
  },
  mixerStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  mixerStartText: {
    ...typography.label,
    color: palette.black,
    fontWeight: '700',
    fontSize: 13,
  },
});

const play = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    ...typography.section,
    color: palette.ivory,
    fontSize: 18,
    letterSpacing: 4,
  },
  elapsed: {
    fontFamily: Fonts.mono,
    color: palette.smoke,
    fontSize: 14,
    letterSpacing: 1,
  },
  descText: {
    ...typography.body,
    color: palette.smoke,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xxl,
  },
  hzRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: spacing.xl,
  },
  hzBox: {
    alignItems: 'center',
    flex: 1,
  },
  hzValue: {
    fontFamily: Fonts.display,
    color: palette.gold,
    fontSize: 22,
  },
  hzLabel: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  hzDivider: {
    width: 1,
    height: 32,
    backgroundColor: palette.line,
  },
  timerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    width: '100%',
    justifyContent: 'center',
  },
  timerBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.line,
  },
  timerBtnActive: {
    backgroundColor: palette.goldLight,
    borderColor: palette.gold,
  },
  timerBtnText: {
    ...typography.label,
    color: palette.ash,
    fontSize: 12,
  },
  timerBtnTextActive: {
    color: palette.gold,
  },
  ambienceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    width: '100%',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  ambienceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.line,
  },
  ambienceBtnActive: {
    backgroundColor: palette.gold,
    borderColor: palette.gold,
  },
  ambienceBtnText: {
    ...typography.label,
    color: palette.ash,
    fontSize: 10,
  },
  ambienceBtnTextActive: {
    color: palette.black,
  },
  volCard: {
    gap: spacing.lg,
    width: '100%',
    marginBottom: spacing.lg,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  noticeText: {
    ...typography.caption,
    color: palette.goldMuted,
    fontSize: 11,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.gold,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: spacing.lg,
    borderRadius: radii.sm,
    marginBottom: spacing.lg,
  },
  startBtnText: {
    ...typography.label,
    color: palette.black,
    fontSize: 14,
    fontWeight: '700',
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderColor: palette.smoke,
    borderWidth: 1,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.sm,
    marginBottom: spacing.lg,
  },
  stopBtnText: {
    ...typography.label,
    color: palette.smoke,
    fontSize: 12,
  },
  doneBox: {
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  doneText: {
    ...typography.section,
    color: palette.gold,
    letterSpacing: 3,
  },
});
