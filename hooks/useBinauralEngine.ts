/**
 * useBinauralEngine — React hook wrapping lib/binaural.ts
 *
 * Audio handle lives at module level so it persists across component unmounts
 * (user navigates away → mini player still works).
 * Zustand store holds all reactive UI state.
 */
import { useCallback } from 'react';
import { Platform } from 'react-native';

import { createBinauralAudio, type BinauralAudioHandle } from '@/lib/binaural';
import type { AmbienceType } from '@/data/wellness';
import { useWellnessStore } from '@/store/wellnessStore';

// ─── Module-level audio singleton ────────────────────────────────────────────
let _handle: BinauralAudioHandle | null = null;
let _timer: ReturnType<typeof setInterval> | null = null;
let _startMs = 0;

/** Stop audio and timer globally (callable outside of React) */
export function stopBinauralGlobal(): void {
  if (_timer) { clearInterval(_timer); _timer = null; }
  _handle?.stop();
  _handle = null;
}

export interface BinauralConfig {
  carrierHz:     number;
  beatHz:        number;
  sessionName:   string;
  targetSeconds: number;    // 0 = infinite
  ambience?:     AmbienceType;
  waveVolume?:   number;    // 0–1
  bgVolume?:     number;    // 0–1
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useBinauralEngine() {
  const startSession = useWellnessStore((s) => s.startSession);
  const stopSession  = useWellnessStore((s) => s.stopSession);
  const setElapsed   = useWellnessStore((s) => s.setElapsed);
  const setVolumes   = useWellnessStore((s) => s.setVolumes);
  const player       = useWellnessStore((s) => s.player);

  // ── start ──────────────────────────────────────────────────────────────────
  const start = useCallback((cfg: BinauralConfig) => {
    // Kill any running session first
    stopBinauralGlobal();

    const wv = cfg.waveVolume ?? 0.6;
    const bv = cfg.bgVolume   ?? 0.4;

    // Attempt Web Audio (web only)
    if (Platform.OS === 'web') {
      const h = createBinauralAudio(cfg.carrierHz, cfg.beatHz);
      if (h) {
        _handle = h;
        h.start();
        h.setVolume(wv);
        h.setAmbienceVolume(bv);
        if (cfg.ambience && cfg.ambience !== 'none') h.setAmbience(cfg.ambience);
      }
    }
    // Native: no binaural audio (Web Audio unavailable) — timer only

    startSession({
      type:          'binaural',
      sessionName:   cfg.sessionName,
      leftHz:        cfg.carrierHz,
      rightHz:       cfg.carrierHz + cfg.beatHz,
      bgTrack:       cfg.ambience ?? 'none',
      waveVolume:    wv,
      bgVolume:      bv,
      targetSeconds: cfg.targetSeconds,
    });

    // Timer
    _startMs = Date.now();
    _timer = setInterval(() => {
      const elapsed = Math.round((Date.now() - _startMs) / 1000);
      setElapsed(elapsed);

      // Auto-stop when target reached (targetSeconds > 0)
      if (cfg.targetSeconds > 0 && elapsed >= cfg.targetSeconds) {
        stopBinauralGlobal();
        useWellnessStore.getState().stopSession();
      }
    }, 500);
  }, [startSession, setElapsed]);

  // ── stop ───────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    stopBinauralGlobal();
    stopSession();
  }, [stopSession]);

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

  return { start, stop, updateVolumes, setAmbience, player };
}
