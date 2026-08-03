/**
 * useBinauralEngine — React hook wrapping lib/binaural.ts
 *
 * Audio handle lives at module level so it persists across component unmounts
 * (user navigates away → mini player still works).
 * Zustand store holds all reactive UI state.
 */
import { useCallback } from 'react';

import { createBinauralAudio, type BinauralAudioHandle } from '@/lib/binaural';
import { createNarrationPlayer, type NarrationHandle, type NarrationPhase } from '@/lib/narrationPlayer';
import type { AmbienceType } from '@/data/wellness';
import { useWellnessStore } from '@/store/wellnessStore';

// ─── Module-level audio singleton ────────────────────────────────────────────
let _handle: BinauralAudioHandle | null = null;
let _narration: NarrationHandle | null = null;
let _timer: ReturnType<typeof setInterval> | null = null;
let _startMs = 0;

/** Stop audio and timer globally (callable outside of React) */
export function stopBinauralGlobal(): void {
  if (_timer) { clearInterval(_timer); _timer = null; }
  _handle?.stop();
  _handle = null;
  _narration?.stop();
  _narration = null;
}

// ─── Registro de la sesión de bienestar en curso ──────────────────────────────
/**
 * EL PROBLEMA QUE RESUELVE: el mini-player tenía un botón de STOP que no paraba
 * nada. Llamaba a `stopBinauralGlobal`, que solo ve el singleton de ESTE módulo
 * — pero Meditación y Binaurales guardan su handle en refs de componente. El
 * usuario pulsaba stop, el mini-player desaparecía, y el audio seguía sonando
 * sin ninguna UI para pararlo. El `resume` era igual de falso: cambiaba el
 * estado del store sin tocar el audio.
 *
 * Y al revés: `start()` mataba "cualquier sesión en curso" con la misma función
 * ciega, así que lanzar Sueño con una meditación sonando dejaba las dos a la vez.
 *
 * La cura es que haya UN sitio donde vive "quién manda ahora". Cada pantalla
 * registra los controles que YA tiene escritos — los mismos que usan sus propios
 * botones, así el estado local de React no se queda desincronizado con el audio —
 * y quien quiera parar/pausar desde fuera llama aquí.
 *
 * ponytail: un solo slot, no una pila. Solo puede sonar una sesión de bienestar
 * a la vez, que es justo el invariante que se estaba rompiendo.
 */
export interface SessionControls {
  stop: () => void;
  pause?: () => void;
  resume?: () => void;
}

let _controls: SessionControls | null = null;

/**
 * Registra los controles de la sesión que arranca. Devuelve la baja.
 *
 * Al pisar el slot hay que PARAR a quien estaba: en cuanto se sobrescribe, su
 * `stop` se vuelve inalcanzable y su audio ya no lo para nadie.
 * `useBinauralEngine.start()` (Sueño, binaurales) ya llamaba a
 * `stopWellnessSession()` por su cuenta, pero meditación, respiración y
 * movimiento arrancan su audio directamente y no lo hacían — abrir una de esas
 * con otra sonando dejaba la anterior sonando para siempre y sin UI que la
 * alcanzara. El guard vive aquí, que es por donde pasan las cinco pantallas.
 *
 * Solo el `stop` del anterior, NO `stopWellnessSession()`: ese además llama a
 * `stopSession()` del store, que tumbaría el estado de la sesión que está
 * entrando (el engine registra DESPUÉS de `startSession`).
 */
export function registerSessionControls(controls: SessionControls): () => void {
  const previous = _controls;
  _controls = controls;
  if (previous && previous !== controls) previous.stop();
  return () => { if (_controls === controls) _controls = null; };
}

/**
 * Para la sesión en curso, la haya lanzado quien la haya lanzado.
 * `stopSession()` del store va SIEMPRE: los controles de pantalla ya lo llaman,
 * pero es idempotente y cubre que no haya nadie registrado.
 */
export function stopWellnessSession(): void {
  const controls = _controls;
  _controls = null;
  controls?.stop();
  stopBinauralGlobal();
  useWellnessStore.getState().stopSession();
}

export function pauseWellnessSession(): void {
  _controls?.pause?.();
  useWellnessStore.getState().pauseSession();
}

export function resumeWellnessSession(): void {
  _controls?.resume?.();
  useWellnessStore.getState().resumeSession();
}

export interface BinauralConfig {
  carrierHz:     number;
  beatHz:        number;
  sessionName:   string;
  targetSeconds: number;    // 0 = infinite
  ambience?:     AmbienceType;
  waveVolume?:   number;    // 0–1
  bgVolume?:     number;    // 0–1
  musicUrl?:     string;    // cama musical Suno (opcional, degrada a nada)
  /**
   * Voz de Norman guiando la sesión encima de la cama. Las fases traen ya
   * resuelta su URL (`normanVoiceUrl`) y su duración — el engine no sabe de
   * catálogos, solo reproduce. Si falta, la sesión suena como siempre: cama
   * y binaural sin voz.
   */
  narration?:    NarrationPhase[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useBinauralEngine() {
  const startSession = useWellnessStore((s) => s.startSession);
  const setElapsed   = useWellnessStore((s) => s.setElapsed);
  const setVolumes   = useWellnessStore((s) => s.setVolumes);
  const player       = useWellnessStore((s) => s.player);

  // ── start ──────────────────────────────────────────────────────────────────
  const start = useCallback((cfg: BinauralConfig) => {
    // Mata la sesión en curso SEA DE QUIEN SEA. Antes esto era
    // `stopBinauralGlobal()`, que solo ve los handles de este módulo: lanzar
    // Sueño con una meditación sonando dejaba las dos a la vez.
    stopWellnessSession();

    const wv = cfg.waveVolume ?? 0.6;
    const bv = cfg.bgVolume   ?? 0.4;

    // Web: Web Audio oscillators + procedural ambience. Native: createBinauralAudio
    // degrades internally to a looped Suno music-bed via expo-av (see lib/binaural.ts).
    const h = createBinauralAudio(cfg.carrierHz, cfg.beatHz, cfg.musicUrl);
    if (h) {
      _handle = h;
      h.start();
      h.setVolume(wv);
      h.setAmbienceVolume(bv);
      if (cfg.ambience && cfg.ambience !== 'none') h.setAmbience(cfg.ambience);
    }

    // Voz de Norman por encima. El player de narración NO gestiona la cama
    // aquí (ya la lleva `_handle` con su propio timer y mini-player): solo
    // reproduce la voz y avisa por `onDuck` cuándo bajar el binaural, para
    // que la voz no compita con el tono.
    if (cfg.narration?.length) {
      const n = createNarrationPlayer({
        phases: cfg.narration,
        onDuck: (ducked) => _handle?.setVolume(ducked ? wv * 0.35 : wv),
      });
      if (n) { _narration = n; n.start(); }
    }

    // El timer vive en una función para poder rearmarlo igual al arrancar y
    // al reanudar de una pausa — antes solo existía inline en el arranque, así
    // que no había forma de re-crearlo sin duplicar el cuerpo.
    function armTimer() {
      _timer = setInterval(() => {
        const elapsed = Math.round((Date.now() - _startMs) / 1000);
        setElapsed(elapsed);

        // Auto-stop when target reached (targetSeconds > 0)
        if (cfg.targetSeconds > 0 && elapsed >= cfg.targetSeconds) {
          stopWellnessSession();
        }
      }, 500);
    }

    // Pausa/reanuda real: cama, voz y el timer que los gobierna. Antes esta
    // sesión (Sueño) solo registraba `stop` — pulsar el indicador de pausa del
    // mini-player no llegaba a ningún lado para esta sesión en concreto.
    let pausedAtMs = 0;
    function pause() {
      if (_timer) { clearInterval(_timer); _timer = null; }
      pausedAtMs = Date.now();
      void _handle?.suspend();
      _narration?.pause();
    }
    function resume() {
      _startMs += Date.now() - pausedAtMs;
      void _handle?.resume();
      _narration?.resume();
      armTimer();
    }

    // El mini-player para ESTA sesión por aquí, igual que para las de
    // Meditación y Binaurales. Un solo camino para todas.
    registerSessionControls({ stop: stopBinauralGlobal, pause, resume });

    startSession({
      // `useBinauralEngine` hoy solo lo usa `sueno.tsx` (Sleep) — `binaurales.tsx`
      // maneja su propio handle y llama a `startSession` directo con
      // type: 'binaural'. Antes esto también decía 'binaural' aquí, así que el
      // mini-player mostraba "BINAURAL" y navegaba a /bienestar/binaurales al
      // tocar una sesión de Sueño en curso.
      type:          'sleep',
      sessionName:   cfg.sessionName,
      leftHz:        cfg.carrierHz,
      rightHz:       cfg.carrierHz + cfg.beatHz,
      bgTrack:       cfg.ambience ?? 'none',
      waveVolume:    wv,
      bgVolume:      bv,
      targetSeconds: cfg.targetSeconds,
    });

    _startMs = Date.now();
    armTimer();
  }, [startSession, setElapsed]);

  // ── stop ───────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    stopWellnessSession();
  }, []);

  // ── pause / resume ─────────────────────────────────────────────────────────
  const pause = useCallback(() => {
    pauseWellnessSession();
  }, []);

  const resume = useCallback(() => {
    resumeWellnessSession();
  }, []);

  // ── set volumes (live) ─────────────────────────────────────────────────────
  const updateVolumes = useCallback((wave: number, bg: number) => {
    _handle?.setVolume(wave);
    _handle?.setAmbienceVolume(bg);
    setVolumes(wave, bg);
  }, [setVolumes]);

  // ── set ambience (live) ────────────────────────────────────────────────────
  const setAmbience = useCallback((type: AmbienceType) => {
    _handle?.setAmbience(type);
  }, []);

  return { start, stop, pause, resume, updateVolumes, setAmbience, player };
}
