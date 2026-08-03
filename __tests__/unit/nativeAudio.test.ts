/**
 * createNativeLoopPlayer — la cama musical de respaldo en nativo (iOS/Android)
 * para binaurales/meditación cuando no hay osciladores Web Audio.
 *
 * POR QUÉ ESTOS TESTS: dos huecos reales en nativo, ambos silenciosos —
 * ninguno tira error, solo se comportan mal:
 *
 * 1. Nunca llamaba `Audio.setAudioModeAsync`. Con el interruptor de silencio
 *    de iOS puesto, la cama entera sonaba a nada (mismo bug que
 *    `narrationPlayer.ts` ya resuelve para voz — aquí faltaba, porque esta
 *    pista se crea aparte y no pasa por ese código).
 * 2. No tenía `pause`/`resume` reales — `createNativeBinauralAudio` los
 *    envolvía en no-ops (`async () => {}`). PAUSAR en `binaurales.tsx` en un
 *    dispositivo nativo real cambiaba el estado de la pantalla a "pausado"
 *    pero la cama seguía sonando: teatro, no pausa.
 */
import { createNativeLoopPlayer } from '@/lib/nativeAudio';

const mockSound = {
  setVolumeAsync: jest.fn().mockResolvedValue(undefined),
  stopAsync: jest.fn().mockResolvedValue(undefined),
  unloadAsync: jest.fn().mockResolvedValue(undefined),
  pauseAsync: jest.fn().mockResolvedValue(undefined),
  playAsync: jest.fn().mockResolvedValue(undefined),
};

const mockSetAudioModeAsync = jest.fn().mockResolvedValue(undefined);
const mockCreateAsync = jest.fn().mockResolvedValue({ sound: mockSound });

jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...args),
    Sound: { createAsync: (...args: unknown[]) => mockCreateAsync(...args) },
  },
}));

beforeEach(() => {
  mockSetAudioModeAsync.mockClear();
  mockCreateAsync.mockClear();
  mockSound.pauseAsync.mockClear();
  mockSound.playAsync.mockClear();
});

describe('createNativeLoopPlayer', () => {
  it('configura el modo de audio para sonar con el silencio de iOS activado', async () => {
    const player = createNativeLoopPlayer('https://example.test/cama.mp3');
    expect(player).not.toBeNull();

    player!.start();
    await new Promise((r) => setTimeout(r, 10));

    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ playsInSilentModeIOS: true }),
    );
  });

  it('pause() y resume() llaman a pauseAsync()/playAsync() reales, no son teatro', async () => {
    const player = createNativeLoopPlayer('https://example.test/cama.mp3');
    expect(player).not.toBeNull();

    player!.start();
    await new Promise((r) => setTimeout(r, 10));

    player!.pause();
    expect(mockSound.pauseAsync).toHaveBeenCalledTimes(1);

    player!.resume();
    expect(mockSound.playAsync).toHaveBeenCalledTimes(1);
  });
});
