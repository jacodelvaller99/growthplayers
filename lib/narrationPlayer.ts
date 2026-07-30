/**
 * Player de narración de 3 capas — voz de Norman sobre cama musical.
 *
 * POR QUÉ EXISTE: hasta ahora nativo solo sabía reproducir UNA pista por handle
 * (`lib/nativeAudio.ts`), y el player de meditación **reemplazaba** la música en
 * vez de mezclarla (`lib/binaural.ts:169`). Con ~630 segmentos de guión ya
 * escritos, esa era la única pieza que faltaba para que sonaran.
 *
 * LAS CAPAS:
 *   voz (frente)  — un mp3 por fase, secuencial, se descarga y descarta
 *   música (fondo) — un loop continuo que nunca para
 *
 * EL DUCKING es lo que separa "meditación guiada" de "voz peleando con música":
 * la música baja mientras Norman habla y sube en los silencios. Sin esto, o la
 * música tapa la voz o la voz suena pegada sobre un fondo plano.
 *
 * DEGRADACIÓN: si un mp3 de voz no carga, la fase NO se cuelga — cae a un
 * temporizador con su duración declarada y sigue. Una práctica de 17 minutos que
 * se congela en el minuto 4 es peor que una sin voz.
 */
import { Platform } from 'react-native';

export interface NarrationPhase {
  /** URL del mp3 de voz. Si falta, la fase transcurre en silencio con música. */
  url?: string;
  /** Segundos totales que dura la fase (voz + silencio). Es el plan B del timer. */
  duration: number;
  /** Silencio tras la voz, en segundos. */
  pauseAfter: number;
}

export interface NarrationHandle {
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setMusicVolume: (v: number) => void;
  setVoiceVolume: (v: number) => void;
}

interface Options {
  musicUrl?: string;
  phases: NarrationPhase[];
  /** Se llama al entrar en cada fase — la pantalla sincroniza el texto con esto. */
  onPhaseChange?: (index: number) => void;
  onComplete?: () => void;
}

/** Volumen de la cama en silencio y mientras Norman habla. */
const MUSIC_IDLE = 0.30;
const MUSIC_DUCKED = 0.10;
const VOICE_LEVEL = 1.0;

export function createNarrationPlayer(opts: Options): NarrationHandle | null {
  const { musicUrl, phases, onPhaseChange, onComplete } = opts;
  if (phases.length === 0) return null;

  let Audio: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Audio = require('expo-av').Audio;
  } catch {
    return null; // sin expo-av no hay player; el llamador decide qué hacer
  }

  let stopped = false;
  let musicSound: any = null;
  let voiceSound: any = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let musicVolume = MUSIC_IDLE;
  let voiceVolume = VOICE_LEVEL;

  // Los avances de fase son `setTimeout`, y un setTimeout no se pausa. Para que
  // Pausa funcione de verdad guardamos qué iba a pasar y cuándo, de modo que al
  // reanudar se re-arma con el tiempo que quedaba — no desde cero.
  let pendingFn: (() => void) | null = null;
  let pendingAt = 0;
  let pausedRemaining = 0;

  function clearTimer() {
    if (timer) { clearTimeout(timer); timer = null; }
    pendingFn = null;
  }

  function arm(fn: () => void, ms: number) {
    if (timer) clearTimeout(timer);
    pendingFn = fn;
    pendingAt = Date.now() + ms;
    timer = setTimeout(() => { pendingFn = null; timer = null; fn(); }, ms);
  }

  async function unloadVoice() {
    const s = voiceSound;
    voiceSound = null;
    if (!s) return;
    try { await s.stopAsync(); } catch { /* ya parado */ }
    try { await s.unloadAsync(); } catch { /* ya descargado */ }
  }

  function duck(on: boolean) {
    const target = on ? Math.min(musicVolume, MUSIC_DUCKED) : musicVolume;
    musicSound?.setVolumeAsync(target).catch(() => {});
  }

  /** Avanza a la fase `i`. Devuelve sin hacer nada si ya se paró. */
  async function playPhase(i: number) {
    if (stopped) return;
    if (i >= phases.length) {
      duck(false);
      onComplete?.();
      return;
    }

    const phase = phases[i];
    onPhaseChange?.(i);

    const pauseMs = Math.max(0, phase.pauseAfter) * 1000;
    const next = () => { void playPhase(i + 1); };

    // Sin URL de voz: la fase es solo música durante su duración declarada.
    if (!phase.url) {
      arm(next, Math.max(0, phase.duration) * 1000);
      return;
    }

    // Plan B: si el audio no dispara `didJustFinish` (red lenta, mp3 corrupto),
    // la fase avanza igual con su duración declarada. Nunca se queda colgada.
    let advanced = false;
    const advanceOnce = () => {
      if (advanced || stopped) return;
      advanced = true;
      duck(false);
      void unloadVoice();
      arm(next, pauseMs);
    };
    arm(advanceOnce, Math.max(0, phase.duration) * 1000);

    try {
      duck(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri: phase.url },
        { shouldPlay: true, volume: voiceVolume },
      );
      if (stopped) { sound.unloadAsync().catch(() => {}); return; }
      voiceSound = sound;
      sound.setOnPlaybackStatusUpdate((st: { didJustFinish?: boolean }) => {
        if (st?.didJustFinish) advanceOnce();
      });
    } catch {
      // El mp3 no cargó — el temporizador de arriba ya cubre el avance.
      duck(false);
    }
  }

  async function start() {
    try {
      // Sin esto, en iOS con el interruptor de silencio puesto la práctica entera
      // suena a nada — y el usuario cree que la app está rota.
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch { /* la política de audio no es bloqueante */ }

    if (musicUrl) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: musicUrl },
          { isLooping: true, volume: musicVolume, shouldPlay: true },
        );
        if (stopped) { sound.unloadAsync().catch(() => {}); }
        else musicSound = sound;
      } catch { /* sin cama musical, la voz suena sola */ }
    }

    void playPhase(0);
  }

  function stop() {
    stopped = true;
    clearTimer();
    void unloadVoice();
    musicSound?.stopAsync().catch(() => {});
    musicSound?.unloadAsync().catch(() => {});
    musicSound = null;
  }

  function pause() {
    if (timer) { clearTimeout(timer); timer = null; }
    pausedRemaining = Math.max(0, pendingAt - Date.now());
    voiceSound?.pauseAsync().catch(() => {});
    musicSound?.pauseAsync().catch(() => {});
  }

  function resume() {
    if (stopped) return;
    voiceSound?.playAsync().catch(() => {});
    musicSound?.playAsync().catch(() => {});
    if (pendingFn) arm(pendingFn, pausedRemaining);
  }

  function setMusicVolume(v: number) {
    musicVolume = Math.max(0, Math.min(1, v));
    musicSound?.setVolumeAsync(musicVolume).catch(() => {});
  }

  function setVoiceVolume(v: number) {
    voiceVolume = Math.max(0, Math.min(1, v));
    voiceSound?.setVolumeAsync(voiceVolume).catch(() => {});
  }

  return { start, stop, pause, resume, setMusicVolume, setVoiceVolume };
}

/** `true` si esta plataforma puede reproducir narración con expo-av. */
export function narrationSupported(): boolean {
  // expo-av reproduce en web vía HTML5 Audio, así que no se excluye ninguna
  // plataforma; solo se comprueba que el módulo esté presente.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return Boolean(require('expo-av')?.Audio) || Platform.OS === 'web';
  } catch {
    return false;
  }
}
