/**
 * Native loop player (expo-av) — the counterpart to lib/binaural.ts's Web
 * Audio engine for iOS/Android. Precise binaural-beat oscillators are a web-only
 * capability; on native we play the same Suno music bed (wellness-audio bucket)
 * on loop instead of leaving the session in silence. No network / broken URL /
 * missing expo-av → degrades to null, caller falls back to silence exactly as
 * before (no regression, no crash).
 */
import { Platform } from 'react-native';

export interface NativeLoopHandle {
  start: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
}

export function createNativeLoopPlayer(url?: string): NativeLoopHandle | null {
  if (Platform.OS === 'web' || !url) return null;

  let sound: { setVolumeAsync: (v: number) => Promise<unknown>; stopAsync: () => Promise<unknown>; unloadAsync: () => Promise<unknown> } | null = null;
  let stopped = false;
  let targetVolume = 0.3;

  async function start() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Audio } = require('expo-av');
      const { sound: s } = await Audio.Sound.createAsync(
        { uri: url },
        { isLooping: true, volume: 0, shouldPlay: true },
      );
      if (stopped) {
        s.unloadAsync().catch(() => {});
        return;
      }
      sound = s;
      await s.setVolumeAsync(targetVolume);
    } catch {
      // sin red, pista rota, o expo-av no disponible — queda en silencio, sin crash
    }
  }

  function stop() {
    stopped = true;
    sound?.stopAsync().catch(() => {});
    sound?.unloadAsync().catch(() => {});
    sound = null;
  }

  function setVolume(v: number) {
    targetVolume = Math.max(0, Math.min(1, v));
    sound?.setVolumeAsync(targetVolume).catch(() => {});
  }

  return { start, stop, setVolume };
}
