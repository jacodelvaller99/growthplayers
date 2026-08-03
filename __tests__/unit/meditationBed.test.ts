/**
 * La cama musical de las meditaciones: que exista, y que su ausencia no se
 * lleve por delante la voz.
 *
 * POR QUÉ ESTE TEST: `compasión` era la única categoría del catálogo sin
 * entrada en `MEDITATION_CATEGORY_MUSIC`. Sus dos sesiones son `narrated` y no
 * declaran `binaural`, así que `createNarrationPlayer` arrancaba sin cama de
 * ningún tipo — Norman sonando en seco. Nadie lo detectó porque un `undefined`
 * no genera petición que pueda dar 404: no hay error, hay silencio.
 *
 * El segundo test fija el degradado del que depende el plan de lanzamiento: la
 * URL de la cama de compasión está cableada ANTES de que el mp3 exista, y hasta
 * que se suba devuelve 400. Eso tiene que sonar a voz sola, no a sesión rota.
 */
import { MEDITATION_CATEGORY_MUSIC, MEDITATION_SESSIONS } from '@/data/wellness';
import { createNarrationPlayer } from '@/lib/narrationPlayer';

const MUSIC_URL = 'https://example.test/cama-que-no-existe.mp3';

jest.mock('expo-av', () => {
  const sound = {
    setOnPlaybackStatusUpdate: jest.fn(),
    stopAsync: jest.fn().mockResolvedValue(undefined),
    unloadAsync: jest.fn().mockResolvedValue(undefined),
    setVolumeAsync: jest.fn().mockResolvedValue(undefined),
    pauseAsync: jest.fn().mockResolvedValue(undefined),
    playAsync: jest.fn().mockResolvedValue(undefined),
  };
  return {
    Audio: {
      setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
      Sound: {
        createAsync: jest.fn(async ({ uri }: { uri: string }) => {
          // La CAMA falla (mp3 aún no subido). La VOZ carga bien.
          if (uri === 'https://example.test/cama-que-no-existe.mp3') {
            throw new Error('404');
          }
          return {
            sound: {
              ...sound,
              // La voz "termina" sola en cuanto el player se suscribe.
              setOnPlaybackStatusUpdate: (cb: (s: { didJustFinish: boolean }) => void) => {
                setTimeout(() => cb({ didJustFinish: true }), 1);
              },
            },
          };
        }),
      },
    },
  };
});

describe('toda sesión tiene cama', () => {
  it('ninguna categoría usada por el catálogo se queda sin cama ni binaural', () => {
    const sinCama = MEDITATION_SESSIONS
      .filter((s) => !MEDITATION_CATEGORY_MUSIC[s.category] && !s.binaural)
      .map((s) => `${s.id} (${s.category})`);

    expect(sinCama).toEqual([]);
  });

  it('compasión tiene su propia pista, no la prestada de otra categoría', () => {
    const compasion = MEDITATION_CATEGORY_MUSIC['compasión'];
    expect(compasion).toContain('/meditation/compasion.mp3');

    // Que no sea un alias de otra cama: el dueño pidió pista propia.
    const otras = Object.entries(MEDITATION_CATEGORY_MUSIC)
      .filter(([cat]) => cat !== 'compasión')
      .map(([, url]) => url);
    expect(otras).not.toContain(compasion);
  });
});

describe('cama que no carga', () => {
  it('la voz sigue sonando y la práctica llega al final', async () => {
    const fases: number[] = [];
    const completado = new Promise<void>((resolve) => {
      const player = createNarrationPlayer({
        musicUrl: MUSIC_URL,
        phases: [
          { url: 'https://example.test/voz-0.mp3', duration: 5, pauseAfter: 0 },
          { url: 'https://example.test/voz-1.mp3', duration: 5, pauseAfter: 0 },
          { url: 'https://example.test/voz-2.mp3', duration: 5, pauseAfter: 0 },
        ],
        onPhaseChange: (i) => fases.push(i),
        onComplete: resolve,
      });
      expect(player).not.toBeNull();
      player?.start();
    });

    await completado;

    // Las tres fases sonaron, en orden, pese a que la cama nunca cargó.
    expect(fases).toEqual([0, 1, 2]);
  });
});
