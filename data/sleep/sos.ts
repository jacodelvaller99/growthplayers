// ─── SOS + Relax — guiones narrados por Norman (voz nocturna) ──────────────────
// Piezas de descompresión rápida y relajación profunda para la pantalla de Sueño.
// La voz aparece poco; el silencio entre segmentos (pauseAfter) lo llena el
// ambiente sonoro + binaural. Tono: firme pero calmado, frases cortas, sin relleno.

import type { SleepSession } from '../sleep';

export const SOS_SESSIONS: SleepSession[] = [
  // ── sos-1 · Relajación de Emergencia · 5 min ────────────────────────────────
  // Objetivo: bajar el sistema nervioso a cero, rápido. 11 segmentos.
  {
    id: 'sos-1',
    title: 'Relajación de Emergencia',
    category: 'sos',
    durationMinutes: 5,
    segments: [
      {
        text: 'Quédate donde estás.\nNo tienes que hacer nada más esta noche.',
        pauseAfter: 18,
      },
      {
        text: 'El día terminó.\nYa no hay nada que sostener.',
        pauseAfter: 22,
      },
      {
        text: 'Toma aire por la nariz, despacio.\nLlénate sin prisa.',
        pauseAfter: 20,
      },
      {
        text: 'Y suéltalo por la boca.\nLargo. Hasta el final.',
        pauseAfter: 24,
      },
      {
        text: 'Suelta los hombros.\nDeja que el peso caiga.',
        pauseAfter: 22,
      },
      {
        text: 'Afloja la mandíbula.\nSepara un poco los dientes.',
        pauseAfter: 22,
      },
      {
        text: 'Otra vez, aire que entra.\nY al salir, suelta un poco más.',
        pauseAfter: 26,
      },
      {
        text: 'Lo urgente puede esperar.\nAquí no hay nada que resolver.',
        pauseAfter: 26,
      },
      {
        text: 'Siente el cuerpo más pesado.\nMás hundido en el lugar donde estás.',
        pauseAfter: 28,
      },
      {
        text: 'Respira a tu ritmo.\nNo lo controles. Solo déjalo pasar.',
        pauseAfter: 30,
      },
      {
        text: 'Estás a salvo.\nDescansa.',
        pauseAfter: 34,
      },
    ],
  },

  // ── sos-2 · Body Scan Rápido · 8 min ────────────────────────────────────────
  // Objetivo: recorrer el cuerpo y soltar parte por parte. 15 segmentos.
  {
    id: 'sos-2',
    title: 'Body Scan Rápido',
    category: 'sos',
    durationMinutes: 8,
    segments: [
      {
        text: 'Cierra los ojos.\nVamos a recorrer el cuerpo, de arriba a abajo.',
        pauseAfter: 20,
      },
      {
        text: 'Empieza por la frente.\nDeja que se alise. Sin tensión.',
        pauseAfter: 26,
      },
      {
        text: 'Los ojos, por dentro.\nDéjalos quietos, pesados.',
        pauseAfter: 26,
      },
      {
        text: 'La mandíbula.\nAflójala. La lengua, suelta.',
        pauseAfter: 28,
      },
      {
        text: 'El cuello.\nDeja que la cabeza descanse del todo.',
        pauseAfter: 28,
      },
      {
        text: 'Los hombros.\nQue bajen. Que se alejen de las orejas.',
        pauseAfter: 30,
      },
      {
        text: 'Los brazos.\nPesados, abandonados a los lados.',
        pauseAfter: 30,
      },
      {
        text: 'Las manos.\nAbre los dedos un poco y suéltalos.',
        pauseAfter: 30,
      },
      {
        text: 'El pecho.\nDeja que la respiración se haga sola.',
        pauseAfter: 32,
      },
      {
        text: 'El vientre.\nQue suba y baje, sin esfuerzo.',
        pauseAfter: 32,
      },
      {
        text: 'La espalda.\nSiéntela apoyada, sostenida por completo.',
        pauseAfter: 32,
      },
      {
        text: 'Las caderas.\nDéjalas caer en el colchón.',
        pauseAfter: 32,
      },
      {
        text: 'Las piernas.\nMuslos, rodillas, pantorrillas. Todo pesado.',
        pauseAfter: 34,
      },
      {
        text: 'Los pies.\nSuéltalos. Ya no llevan a ningún lado.',
        pauseAfter: 34,
      },
      {
        text: 'Todo el cuerpo, en reposo.\nNada que sostener. Déjate ir.',
        pauseAfter: 36,
      },
    ],
  },
];
