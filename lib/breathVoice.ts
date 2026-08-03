/**
 * breathVoice — clips atómicos de conteo para Respiración.
 *
 * POR QUÉ NO `lib/narrationPlayer.ts`: ese motor es LINEAL — un mp3 por fase
 * completa, que avanza cuando la voz termina. Sirve para meditación/sueño,
 * donde cada fase ES un guion. No sirve aquí: Respiración necesita anunciar
 * un NÚMERO suelto dentro de una fase que ya está corriendo (el tick de 1s de
 * `respiracion.tsx`) sin tocar ese timer.
 *
 * Por eso este módulo hace UNA cosa distinta: precarga ~11 clips cortos
 * (palabras y números) como `Audio.Sound` UNA sola vez al montar la pantalla,
 * y expone `playBreathCue()` para reproducir uno bajo demanda con
 * `.replayAsync()` — nunca `Audio.Sound.createAsync()` en cada tick, que
 * sería lento y con latencia de red en cada segundo.
 *
 * DEGRADACIÓN: si un clip no cargó (falta el mp3, sin red, sin expo-av), esa
 * palabra simplemente no suena — el tick sigue solo, igual que el patrón ya
 * establecido en `narrationPlayer.ts` para la cama musical ausente.
 *
 * BUCKET: carpeta nueva `breathing/` en `wellness-audio`. Archivos esperados
 * (ver `CUE_FILES` abajo): inhala.mp3, exhala.mp3, reten.mp3, sosten.mp3,
 * dos.mp3, tres.mp3, cuatro.mp3, cinco.mp3, seis.mp3, siete.mp3, ocho.mp3.
 */
import type { BreathPhase } from '@/data/wellness';

export type BreathCue =
  | 'inhala' | 'exhala' | 'reten' | 'sosten'
  | '2' | '3' | '4' | '5' | '6' | '7' | '8';

const CUE_FILES: Record<BreathCue, string> = {
  inhala: 'inhala.mp3',
  exhala: 'exhala.mp3',
  reten:  'reten.mp3',
  sosten: 'sosten.mp3',
  '2': 'dos.mp3',
  '3': 'tres.mp3',
  '4': 'cuatro.mp3',
  '5': 'cinco.mp3',
  '6': 'seis.mp3',
  '7': 'siete.mp3',
  '8': 'ocho.mp3',
};

const BREATHING_AUDIO_BASE =
  'https://bizbbtiyftfjufxinwsu.supabase.co/storage/v1/object/public/wellness-audio/breathing';

type LoadedSound = { replayAsync: () => Promise<any> };

let sounds: Partial<Record<BreathCue, LoadedSound>> | null = null;
let loading: Promise<void> | null = null;

async function ensureLoaded(): Promise<void> {
  if (sounds || loading) return loading ?? undefined;
  loading = (async () => {
    let Audio: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      Audio = require('expo-av').Audio;
    } catch {
      sounds = {}; // sin expo-av (web/SSR/test): silencio, no rompe nada
      return;
    }
    const cues = Object.keys(CUE_FILES) as BreathCue[];
    const loaded = await Promise.all(
      cues.map(async (cue) => {
        try {
          const { sound } = await Audio.Sound.createAsync(
            { uri: `${BREATHING_AUDIO_BASE}/${CUE_FILES[cue]}` },
            { shouldPlay: false },
          );
          return [cue, sound] as const;
        } catch {
          return null; // ese clip no está subido todavía — silencio, no error
        }
      }),
    );
    sounds = Object.fromEntries(
      loaded.filter((e): e is readonly [BreathCue, LoadedSound] => e !== null),
    );
  })();
  return loading;
}

/** Precarga los clips. Llamar una vez al montar la pantalla de Respiración. */
export function preloadBreathVoice(): void {
  void ensureLoaded();
}

/** Reproduce un cue si ya cargó. Silencioso si falta — nunca rompe el ejercicio. */
export function playBreathCue(cue: BreathCue): void {
  void sounds?.[cue]?.replayAsync().catch(() => {});
}

/**
 * Palabra que corresponde a una fase, según su label y la fase anterior.
 * PURA — sin esto no hay nada que testear por mutación en este archivo.
 *
 * `RETÉN` es ambiguo en el catálogo: BOX lo usa dos veces por ciclo (tras
 * inhalar, con los pulmones llenos; tras exhalar, vacíos). Distinguirlos por
 * la fase anterior evita decir "retén… retén" indistinto dos veces seguidas.
 */
export function cueForPhaseLabel(
  label: BreathPhase['label'],
  prevLabel: BreathPhase['label'] | undefined,
): BreathCue {
  if (label === 'INHALA') return 'inhala';
  if (label === 'EXHALA') return 'exhala';
  return prevLabel === 'EXHALA' ? 'sosten' : 'reten';
}

/** Cue del conteo de segundos restantes, o `null` si no hay clip para ese número. */
export function cueForCount(secondsLeft: number): BreathCue | null {
  return Number.isInteger(secondsLeft) && secondsLeft >= 2 && secondsLeft <= 8
    ? (String(secondsLeft) as BreathCue)
    : null;
}
