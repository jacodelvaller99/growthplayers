import type { SleepSession } from '../sleep';

export const RELAX_SESSIONS: SleepSession[] = [
  // ── relax-1 · Relajación Muscular Progresiva · 15 min ───────────────────────
  // Técnica Jacobson: tensar y soltar grupo por grupo. 22 segmentos.
  {
    id: 'relax-1',
    title: 'Relajación Muscular Progresiva',
    category: 'relax',
    durationMinutes: 15,
    segments: [
      {
        text: 'Túmbate cómodo.\nVamos a tensar y soltar, parte por parte.',
        pauseAfter: 22,
      },
      {
        text: 'La idea es simple.\nAprietas unos segundos, y luego sueltas del todo.',
        pauseAfter: 24,
      },
      {
        text: 'Empieza por los pies.\nDobla los dedos hacia dentro. Aprieta.',
        pauseAfter: 14,
      },
      {
        text: 'Y suelta.\nSiente cómo se descargan.',
        pauseAfter: 42,
      },
      {
        text: 'Ahora las pantorrillas y los muslos.\nTensa toda la pierna. Firme.',
        pauseAfter: 14,
      },
      {
        text: 'Suelta.\nDeja que las piernas pesen contra la cama.',
        pauseAfter: 44,
      },
      {
        text: 'Los glúteos.\nApriétalos con fuerza. Aguanta.',
        pauseAfter: 14,
      },
      {
        text: 'Y suelta.\nQue la cadera se hunda.',
        pauseAfter: 44,
      },
      {
        text: 'El abdomen.\nMete el ombligo hacia dentro. Tensa.',
        pauseAfter: 14,
      },
      {
        text: 'Suelta.\nDeja que el vientre se afloje del todo.',
        pauseAfter: 44,
      },
      {
        text: 'Las manos.\nCierra los puños. Aprieta fuerte.',
        pauseAfter: 14,
      },
      {
        text: 'Y abre.\nDeja los dedos sueltos, sin forma.',
        pauseAfter: 44,
      },
      {
        text: 'Los brazos.\nFlexiónalos y tensa el bíceps. Aguanta.',
        pauseAfter: 14,
      },
      {
        text: 'Suelta.\nDeja caer los brazos, pesados.',
        pauseAfter: 44,
      },
      {
        text: 'Los hombros.\nSúbelos hacia las orejas. Aprieta.',
        pauseAfter: 14,
      },
      {
        text: 'Y déjalos caer.\nMás abajo de donde estaban antes.',
        pauseAfter: 46,
      },
      {
        text: 'La cara.\nArruga la frente y aprieta los ojos. Tensa.',
        pauseAfter: 14,
      },
      {
        text: 'Suelta.\nQue toda la cara se alise.',
        pauseAfter: 46,
      },
      {
        text: 'Ahora todo el cuerpo a la vez.\nTensa de pies a cabeza. Aguanta.',
        pauseAfter: 16,
      },
      {
        text: 'Y suelta todo de golpe.\nDéjalo ir por completo.',
        pauseAfter: 40,
      },
      {
        text: 'No queda tensión que apretar.\nEl cuerpo ya está suelto, entero.',
        pauseAfter: 38,
      },
      {
        text: 'Respira despacio.\nDéjate hundir. Descansa.',
        pauseAfter: 40,
      },
    ],
  },

  // ── relax-2 · Coherencia Cardíaca Nocturna · 10 min ─────────────────────────
  // Respiración 5-5 guiada para calmar el sistema. 15 segmentos.
  {
    id: 'relax-2',
    title: 'Coherencia Cardíaca Nocturna',
    category: 'relax',
    durationMinutes: 10,
    segments: [
      {
        text: 'Vamos a respirar juntos.\nCinco segundos al entrar, cinco al salir.',
        pauseAfter: 18,
      },
      {
        text: 'No fuerces nada.\nDeja que el ritmo te lleve.',
        pauseAfter: 22,
      },
      {
        text: 'Toma aire.\nDos… tres… cuatro… cinco.',
        pauseAfter: 24,
      },
      {
        text: 'Suelta.\nDos… tres… cuatro… cinco.',
        pauseAfter: 28,
      },
      {
        text: 'Otra vez, entra el aire.\nLento, hasta llenar.',
        pauseAfter: 28,
      },
      {
        text: 'Y sale.\nLargo, hasta vaciar.',
        pauseAfter: 30,
      },
      {
        text: 'Siente el corazón.\nCon cada salida, va más despacio.',
        pauseAfter: 32,
      },
      {
        text: 'Inhala.\nDeja que el pecho se abra, sin prisa.',
        pauseAfter: 30,
      },
      {
        text: 'Exhala.\nSuelta el aire y un poco de peso con él.',
        pauseAfter: 34,
      },
      {
        text: 'Sigue tú ahora.\nCinco al entrar, cinco al salir.',
        pauseAfter: 36,
      },
      {
        text: 'El sistema se está calmando.\nDéjalo. No tienes que ayudar.',
        pauseAfter: 36,
      },
      {
        text: 'Cada respiración te baja un escalón.\nMás abajo. Más quieto.',
        pauseAfter: 36,
      },
      {
        text: 'El aire entra solo.\nEl aire sale solo.',
        pauseAfter: 38,
      },
      {
        text: 'No queda nada por hacer.\nSolo respirar y soltar.',
        pauseAfter: 38,
      },
      {
        text: 'Quédate aquí.\nEn calma. Descansa.',
        pauseAfter: 40,
      },
    ],
  },
];
