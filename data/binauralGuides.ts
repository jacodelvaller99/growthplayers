/**
 * Guías de entrada para los contadores binaurales — la voz de Norman llevando
 * a la persona al estado, con el tono trabajando debajo.
 *
 * POR QUÉ SON CORTAS (y no un guión de 20 minutos): una sesión binaural la
 * elige el usuario en minutos (10, 20, 45…) y el trabajo lo hace el TONO, no
 * la voz. Norman abre — postura, respiración, qué esperar de esta banda — y
 * después se calla para que el arrastre ocurra en silencio. Una voz que
 * siguiera hablando encima del binaural durante 45 minutos rompería
 * exactamente aquello que la persona vino a buscar.
 *
 * Por eso cada guía dura ~2-3 minutos y termina; el contador sigue corriendo.
 *
 * HONESTIDAD SOBRE LO QUE SE PROMETE: el copy dice "banda asociada a" y nunca
 * "esto te va a producir X". Los binaurales tienen evidencia mixta y desigual
 * según la banda; el catálogo (`BINAURAL_PRESETS`) ya usa ese lenguaje
 * prudente y estas guías lo respetan. Norman no promete resultados
 * neurológicos que no podemos sostener.
 */

export interface BinauralGuideSegment {
  text: string;
  /** Segundos totales de la fase: voz + el silencio que la sigue. */
  duration: number;
  /** Silencio tras la voz, en segundos. */
  pauseAfter: number;
}

export interface BinauralGuide {
  /** Coincide con `BinauralPreset.id` de data/wellness.ts. */
  id: 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';
  segments: BinauralGuideSegment[];
}

export const BINAURAL_GUIDES: BinauralGuide[] = [
  // ─── DELTA · 2 Hz · descanso profundo ──────────────────────────────────────
  {
    id: 'delta',
    segments: [
      {
        text: 'Ponte cómodo, mejor tumbado.\nEsta banda es la del descanso profundo — no la trabajes, déjate caer en ella.',
        duration: 26,
        pauseAfter: 12,
      },
      {
        text: 'Ponte los auriculares bien.\nEl efecto depende de que cada oído reciba su tono; sin auriculares esto es solo un zumbido.',
        duration: 28,
        pauseAfter: 12,
      },
      {
        text: 'Cierra los ojos.\nInhala por la nariz, y exhala más largo de lo que inhalaste.',
        duration: 24,
        pauseAfter: 12,
      },
      {
        text: 'Suelta la mandíbula. Los hombros.\nDeja que el peso del cuerpo se entregue a lo que te sostiene.',
        duration: 24,
        pauseAfter: 12,
      },
      {
        text: 'No tienes que quedarte despierto para que esto funcione.\nSi te duermes, era exactamente lo que tu cuerpo necesitaba.',
        duration: 26,
        pauseAfter: 14,
      },
      {
        text: 'Te dejo con el tono.\nYo me callo aquí.',
        duration: 18,
        pauseAfter: 10,
      },
    ],
  },

  // ─── THETA · 6 Hz · meditación profunda ────────────────────────────────────
  {
    id: 'theta',
    segments: [
      {
        text: 'Siéntate con la espalda recta, sin rigidez.\nEsta es la banda de la meditación profunda: la frontera donde la mente deja de discutir.',
        duration: 28,
        pauseAfter: 12,
      },
      {
        text: 'Auriculares puestos, los dos oídos cubiertos.\nSin eso, el efecto binaural no existe.',
        duration: 22,
        pauseAfter: 10,
      },
      {
        text: 'Cierra los ojos.\nTres respiraciones, la exhalación siempre más larga que la entrada.',
        duration: 24,
        pauseAfter: 14,
      },
      {
        text: 'Van a aparecer pensamientos. Es lo que hace la mente.\nNo los persigas y no pelees con ellos: déjalos pasar como quien ve pasar un coche.',
        duration: 28,
        pauseAfter: 14,
      },
      {
        text: 'Lleva la atención al tono, sin analizarlo.\nSolo escúchalo.',
        duration: 20,
        pauseAfter: 12,
      },
      {
        text: 'A partir de aquí, silencio.\nEl trabajo lo hace el sonido.',
        duration: 18,
        pauseAfter: 10,
      },
    ],
  },

  // ─── ALPHA · 10 Hz · calma alerta ──────────────────────────────────────────
  {
    id: 'alpha',
    segments: [
      {
        text: 'Siéntate cómodo, pero no te derrumbes.\nEsta banda no busca dormirte: busca calma con los ojos abiertos por dentro.',
        duration: 26,
        pauseAfter: 12,
      },
      {
        text: 'Auriculares puestos.\nLos dos oídos, siempre.',
        duration: 18,
        pauseAfter: 10,
      },
      {
        text: 'Respira sin forzar.\nDeja que el aire entre y salga a su ritmo, sin dirigirlo.',
        duration: 24,
        pauseAfter: 12,
      },
      {
        text: 'Suelta la tensión de la cara y de las manos, que es donde se acumula sin que lo notes.\nEl resto del cuerpo sigue solo.',
        duration: 26,
        pauseAfter: 12,
      },
      {
        text: 'Puedes usar este estado para pensar mejor, no para dejar de pensar.\nSi viene una idea clara, tómala.',
        duration: 26,
        pauseAfter: 12,
      },
      {
        text: 'Te dejo con el tono.',
        duration: 16,
        pauseAfter: 10,
      },
    ],
  },

  // ─── BETA · 20 Hz · concentración ──────────────────────────────────────────
  {
    id: 'beta',
    segments: [
      {
        text: 'Siéntate como te sentarías a trabajar en serio.\nEsta banda acompaña la concentración: no vienes a relajarte, vienes a enfocarte.',
        duration: 28,
        pauseAfter: 12,
      },
      {
        text: 'Auriculares puestos.\nY el teléfono fuera de la mesa, no boca abajo: fuera.',
        duration: 22,
        pauseAfter: 10,
      },
      {
        text: 'Antes de empezar, decide UNA cosa.\nUna sola. La que si la terminas hoy, el día ya valió.',
        duration: 26,
        pauseAfter: 14,
      },
      {
        text: 'Ténla clara antes de que yo me calle.\nEl tono no elige por ti — solo sostiene el foco que tú pongas.',
        duration: 26,
        pauseAfter: 14,
      },
      {
        text: 'Empieza ahora.\nYo me callo.',
        duration: 16,
        pauseAfter: 8,
      },
    ],
  },

  // ─── GAMMA · 40 Hz · integración ───────────────────────────────────────────
  {
    id: 'gamma',
    segments: [
      {
        text: 'Postura erguida, pecho abierto.\nEsta es la banda más alta: se asocia a la integración, a unir piezas que estaban sueltas.',
        duration: 28,
        pauseAfter: 12,
      },
      {
        text: 'Auriculares puestos, volumen moderado.\nNo lo subas de más: con las bandas altas, más volumen no es más efecto — es solo más fatiga.',
        duration: 28,
        pauseAfter: 12,
      },
      {
        text: 'Respira hondo dos veces y suelta el aire por la boca.',
        duration: 22,
        pauseAfter: 12,
      },
      {
        text: 'Trae el problema que estás intentando resolver.\nNo lo empujes: ponlo delante y déjalo ahí.',
        duration: 26,
        pauseAfter: 14,
      },
      {
        text: 'Si notas tensión en la cabeza o los ojos, para la sesión.\nEsta banda no es para forzarla.',
        duration: 24,
        pauseAfter: 12,
      },
      {
        text: 'Te dejo con el tono.',
        duration: 16,
        pauseAfter: 10,
      },
    ],
  },
];

/** Guía de entrada de una banda, o `undefined` si aún no tiene guión. */
export function getBinauralGuide(id: string): BinauralGuide | undefined {
  return BINAURAL_GUIDES.find((g) => g.id === id);
}
