/**
 * La Inmersión — inducción guiada de Polaris.
 *
 * ORIGEN Y PROPIEDAD INTELECTUAL (importante, no borrar):
 * Este guión es ORIGINAL de Polaris. No reproduce ningún método con marca
 * registrada. La mecánica que usa es literatura pública desde hace 90 años:
 *   · Relajación muscular progresiva — Edmund Jacobson, 1938
 *   · Entrenamiento autógeno — Johannes Schultz, 1932
 *   · Inducción por conteo descendente y anclaje — psicología clásica
 * Cualquier método comercial que use estas técnicas las tomó de ahí. Nosotros
 * también, directamente de la fuente, con copy propio y voz propia.
 *
 * ESTRUCTURA (~15 min): preparación · descenso corporal · conteo · centro ·
 * ancla · declaración · retorno.
 *
 * LA DECLARACIÓN es lo que hace esto de Polaris y no una meditación genérica:
 * la fase `declaracion` marca `showsNorthStar`, así que la pantalla muestra el
 * Norte que el usuario escribió en `Mi Norte` mientras la voz dice algo neutro.
 * Un solo mp3 sirve para todos, y aun así cada quien lee lo suyo.
 *
 * SERIE: esto es la semana 1. La progresión prevista acorta el descenso a
 * medida que el cuerpo aprende — semana 2 baja de 5 a 1, semana 3 de 3 a 1.
 * Por eso vive en archivo propio y no dentro de wellness.ts.
 */

import type { MeditationSession } from './wellness';

export const INMERSION_SESSIONS: MeditationSession[] = [
  {
    id: 'inmersion-s1',
    title: 'La Inmersión · Semana 1',
    // 17 min = 1020 s = EXACTAMENTE la suma de las fases. No es cosmético:
    // el reproductor rota las fases con `idx % phases.length`, así que si las
    // fases sumaran más que la duración, el guión se reiniciaría a mitad de
    // sesión — el usuario volvería a "cierra los ojos" estando ya en su centro.
    durationMinutes: 17,
    category: 'inmersión',
    description:
      'La inducción base. Aprende a bajar el sistema y a declarar tu Norte desde ahí. Con auriculares y sin interrupciones.',
    ambientType: 'brown',
    narrated: true,
    // 7 Hz — frontera alpha/theta, el rango que la literatura clásica de
    // inducción (Jacobson, Schultz) asocia a relajación profunda con alerta
    // reducida. Carrier 200 Hz sigue la misma convención que BINAURAL_PRESETS.
    binaural: { carrierHz: 200, beatHz: 7 },
    phases: [
      // ── Preparación ───────────────────────────────────────────────────────
      {
        id: 'entrada',
        text: 'Siéntate con la espalda recta, sin rigidez.\nLos pies en el suelo.',
        duration: 35,
        pauseAfter: 20,
      },
      {
        id: 'permiso',
        // Sin cifra concreta a propósito: si mañana ajustamos la duración, no
        // hay que regenerar este mp3 en ElevenLabs.
        text: 'Cierra los ojos.\nDurante los próximos minutos no tienes que hacer nada bien.',
        duration: 35,
        pauseAfter: 22,
      },
      {
        id: 'respiracion-1',
        text: 'Inhala por la nariz, sin prisa.\nExhala más largo de lo que inhalaste.',
        duration: 45,
        pauseAfter: 30,
      },
      {
        id: 'respiracion-2',
        text: 'Otra vez.\nLa exhalación larga es la que baja el sistema. No la fuerces: alárgala.',
        duration: 45,
        pauseAfter: 30,
      },

      // ── Descenso corporal (Jacobson) ──────────────────────────────────────
      {
        id: 'soltar-frente',
        text: 'Suelta la frente.\nLas cejas. Los párpados.',
        duration: 40,
        pauseAfter: 26,
      },
      {
        id: 'soltar-mandibula',
        text: 'La mandíbula.\nSepara un poco los dientes. Ahí guardas más de lo que crees.',
        duration: 40,
        pauseAfter: 26,
      },
      {
        id: 'soltar-cuello',
        text: 'El cuello.\nLos hombros bajan un centímetro. Solo eso.',
        duration: 40,
        pauseAfter: 26,
      },
      {
        id: 'soltar-brazos',
        text: 'Los brazos pesan.\nLas manos se abren solas.',
        duration: 40,
        pauseAfter: 26,
      },
      {
        id: 'soltar-torso',
        text: 'El pecho. El abdomen.\nDeja que la respiración se mueva sola.',
        duration: 40,
        pauseAfter: 26,
      },
      {
        id: 'soltar-piernas',
        text: 'Las piernas.\nLos pies. El peso entero cae hacia abajo.',
        duration: 40,
        pauseAfter: 26,
      },
      {
        id: 'chequeo',
        text: 'Recorre el cuerpo completo.\nDonde encuentres tensión, suéltala en la próxima exhalación.',
        duration: 40,
        pauseAfter: 26,
      },

      // ── Descenso por conteo ───────────────────────────────────────────────
      {
        id: 'descenso-intro',
        text: 'Ahora vas a bajar.\nVoy a contar de diez a uno. Cada número, un escalón.',
        duration: 30,
        pauseAfter: 12,
      },
      {
        id: 'descenso-10-8',
        text: 'Diez.\nNueve.\nOcho.',
        duration: 55,
        pauseAfter: 38,
      },
      {
        id: 'descenso-7-5',
        text: 'Siete.\nSeis.\nCinco.\nMás abajo.',
        duration: 55,
        pauseAfter: 38,
      },
      {
        id: 'descenso-4-2',
        text: 'Cuatro.\nTres.\nDos.',
        duration: 55,
        pauseAfter: 38,
      },
      {
        id: 'descenso-1',
        text: 'Uno.\nEstás abajo.',
        duration: 45,
        pauseAfter: 34,
      },

      // ── Centro y ancla ────────────────────────────────────────────────────
      {
        id: 'centro',
        text: 'Este es tu centro.\nAquí la mente no discute. Solo registra.',
        duration: 55,
        pauseAfter: 38,
      },
      {
        id: 'ancla',
        text: 'Pon la palma abierta sobre el esternón.\nEste gesto y este estado quedan unidos: cuando lo repitas fuera, tu cuerpo recuerda el camino.',
        duration: 55,
        pauseAfter: 34,
      },

      // ── Declaración — la pantalla muestra SU Norte ─────────────────────────
      {
        id: 'declaracion-intro',
        text: 'Trae tu Norte.\nNo lo pienses: léelo.',
        duration: 25,
        pauseAfter: 10,
      },
      {
        id: 'declaracion',
        text: 'Léelo despacio.\nEn silencio, o en voz baja. Repítelo hasta que deje de ser una frase.',
        duration: 90,
        pauseAfter: 70,
        showsNorthStar: true,
      },
      {
        id: 'fijacion',
        text: 'Guárdalo con la mano en el pecho.\nNo es una promesa. Es una dirección.',
        duration: 50,
        pauseAfter: 34,
      },

      // ── Retorno ───────────────────────────────────────────────────────────
      {
        id: 'retorno-intro',
        text: 'Vas a subir.\nCuento hasta cinco y abres los ojos, despierto y con el estado puesto.',
        duration: 25,
        pauseAfter: 8,
      },
      {
        id: 'retorno',
        text: 'Uno. Dos.\nTres — vuelve el peso del cuerpo.\nCuatro.\nCinco. Abre los ojos.',
        duration: 40,
        pauseAfter: 8,
      },
    ],
  },
];
