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
 * ESTRUCTURA (~10 min): preparación · descenso corporal · conteo · centro ·
 * ancla · declaración · retorno.
 *
 * POR QUÉ 10 MIN Y NO 17: la voz real (guion V2, denso y continuo) más
 * pausas de respiración razonables suma ~10 min. Forzar la duración a 17
 * habría significado o bien pausas de 40-70s otra vez (el mismo hueco muerto
 * que se reportó como "horrible"), o texto inflado sin necesidad. Un
 * `durationMinutes` que miente sobre cuánto dura realmente la guía es peor
 * que uno corto y honesto.
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
    // 10 min = 600 s = EXACTAMENTE la suma de las fases. No es cosmético:
    // el reproductor rota las fases con `idx % phases.length`, así que si las
    // fases sumaran más que la duración, el guión se reiniciaría a mitad de
    // sesión — el usuario volvería a "cierra los ojos" estando ya en su centro.
    durationMinutes: 10,
    category: 'inmersión',
    description:
      'La inducción base. Aprende a bajar el sistema y a declarar tu Norte desde ahí. Con auriculares y sin interrupciones.',
    ambientType: 'brown',
    narrated: true,
    // 7 Hz — frontera alpha/theta, el rango que la literatura clásica de
    // inducción (Jacobson, Schultz) asocia a relajación profunda con alerta
    // reducida. Carrier 200 Hz sigue la misma convención que BINAURAL_PRESETS.
    binaural: { carrierHz: 200, beatHz: 7 },
    // GUION V2 — narración continua. La versión anterior dejaba frases muy
    // cortas dentro de huecos largos (pauseAfter grande): la voz real sumaba
    // ~12 min mientras la pantalla contaba 17, y como `onComplete` de la
    // narración no está conectado a nada en meditacion.tsx, al terminar las
    // frases el usuario se quedaba ~5 min en silencio con el texto congelado.
    // Aquí Norman habla casi todo el tramo de cada fase — las pausas que
    // quedan son de respiración, no huecos muertos — para que voz+pausa por
    // fase se acerque a su `duration` y la sesión completa suene guiada de
    // principio a fin. Excepción deliberada: `declaracion` sigue con pausa
    // larga — ahí el usuario lee su Norte en silencio, eso no es un hueco,
    // es el punto de la fase.
    phases: [
      // ── Preparación ───────────────────────────────────────────────────────
      {
        id: 'entrada',
        text: 'Siéntate con la espalda recta, sin rigidez, como si un hilo te sostuviera desde la coronilla.\nLos pies apoyados en el suelo, las plantas completas. Nota el peso ahí, sosteniéndote.',
        duration: 23,
        pauseAfter: 8,
      },
      {
        id: 'permiso',
        text: 'Cierra los ojos.\nDurante los próximos minutos no tienes que hacer nada bien. No hay una forma correcta de llegar aquí — solo llegar.',
        duration: 21,
        pauseAfter: 8,
      },
      {
        id: 'respiracion-1',
        text: 'Inhala por la nariz, sin prisa, llenando primero el abdomen y después el pecho.\nY exhala más largo de lo que inhalaste — como si soltaras el aire por una pajilla, despacio.',
        duration: 25,
        pauseAfter: 10,
      },
      {
        id: 'respiracion-2',
        text: 'Otra vez, a tu ritmo.\nLa exhalación larga es la que baja el sistema nervioso — no la fuerces, solo alárgala un poco más que la vez anterior. Con cada salida de aire, un grado menos de tensión.',
        duration: 33,
        pauseAfter: 10,
      },

      // ── Descenso corporal (Jacobson) ──────────────────────────────────────
      {
        id: 'soltar-frente',
        text: 'Ahora vamos a soltar el cuerpo, zona por zona.\nEmpieza por la frente. Las cejas. Los párpados. Deja que pesen, que se hundan un poco más con cada respiración.',
        duration: 21,
        pauseAfter: 8,
      },
      {
        id: 'soltar-mandibula',
        text: 'Baja a la mandíbula.\nSepara un poco los dientes, sin abrir la boca. Ahí guardas más tensión de la que crees — la mayoría de la gente aprieta sin darse cuenta. Suéltala.',
        duration: 22,
        pauseAfter: 8,
      },
      {
        id: 'soltar-cuello',
        text: 'El cuello.\nLos hombros bajan un centímetro, solo eso — no los fuerces hacia abajo, simplemente deja de sostenerlos arriba. Nota la diferencia.',
        duration: 20,
        pauseAfter: 8,
      },
      {
        id: 'soltar-brazos',
        text: 'Los brazos pesan.\nDéjalos caer del todo sobre tus piernas o el apoyo que tengas. Las manos se abren solas, los dedos se relajan uno por uno.',
        duration: 22,
        pauseAfter: 8,
      },
      {
        id: 'soltar-torso',
        text: 'El pecho. El abdomen.\nDeja que la respiración se mueva sola, sin dirigirla. Solo obsérvala entrar y salir, como si no fuera tuya.',
        duration: 20,
        pauseAfter: 8,
      },
      {
        id: 'soltar-piernas',
        text: 'Las piernas.\nLos pies. El peso entero del cuerpo cae hacia abajo, hacia la silla, hacia el suelo. Nada que sostener, nada que cargar.',
        duration: 22,
        pauseAfter: 8,
      },
      {
        id: 'chequeo',
        text: 'Recorre el cuerpo completo una vez más, de la cabeza a los pies.\nDonde encuentres una zona que no soltó del todo, no la fuerces — solo llévale la atención y suéltala un poco más en la próxima exhalación.',
        duration: 26,
        pauseAfter: 10,
      },

      // ── Descenso por conteo ───────────────────────────────────────────────
      {
        id: 'descenso-intro',
        text: 'Ahora vas a bajar más profundo.\nVoy a contar de diez a uno. Cada número es un escalón — no tienes que hacer nada, solo dejarte ir un poco más con cada uno.',
        duration: 18,
        pauseAfter: 6,
      },
      {
        id: 'descenso-10-8',
        text: 'Diez. Un poco más abajo.\nNueve. El cuerpo se hunde.\nOcho. Cada vez más ligero, más lejos de la superficie.',
        duration: 25,
        pauseAfter: 12,
      },
      {
        id: 'descenso-7-5',
        text: 'Siete. Sigue bajando.\nSeis. No hay prisa, no hay meta — solo descender.\nCinco. Más abajo, más quieto, más tuyo.',
        duration: 21,
        pauseAfter: 12,
      },
      {
        id: 'descenso-4-2',
        text: 'Cuatro. Ya casi llegas.\nTres. La mente empieza a hablar menos.\nDos. Un escalón más.',
        duration: 20,
        pauseAfter: 12,
      },
      {
        id: 'descenso-1',
        text: 'Uno.\nEstás abajo. Completamente. Este es tu punto de descanso — nada que resolver desde aquí, solo estar.',
        duration: 20,
        pauseAfter: 10,
      },

      // ── Centro y ancla ────────────────────────────────────────────────────
      {
        id: 'centro',
        text: 'Este es tu centro.\nAquí la mente no discute — solo registra. No hay que convencer a nadie de nada, ni siquiera a ti mismo. Solo estar, quieto, en el fondo.',
        duration: 30,
        pauseAfter: 12,
      },
      {
        id: 'ancla',
        text: 'Pon la palma abierta sobre el esternón.\nEste gesto y este estado quedan unidos desde hoy: cuando lo repitas afuera, en medio del ruido del día, tu cuerpo va a recordar el camino de vuelta hasta aquí.',
        duration: 35,
        pauseAfter: 12,
      },

      // ── Declaración — la pantalla muestra SU Norte ─────────────────────────
      {
        id: 'declaracion-intro',
        text: 'Trae tu Norte a la mente.\nNo lo pienses, no lo analices — solo tráelo, tal como lo escribiste. Va a aparecer frente a ti.',
        duration: 17,
        pauseAfter: 6,
      },
      {
        id: 'declaracion',
        // Pausa larga deliberada: aquí el usuario lee su propio Norte en
        // silencio — no es un hueco muerto, es literalmente el punto de la
        // fase (ver comentario de cabecera del guion).
        text: 'Léelo despacio, desde este centro.\nEn silencio, o en voz baja si prefieres. Repítelo hasta que deje de sonar como una frase y empiece a sonar como algo que ya sabías.',
        duration: 95,
        pauseAfter: 70,
        showsNorthStar: true,
      },
      {
        id: 'fijacion',
        text: 'Guárdalo ahí, con la mano en el pecho.\nEsto no es una promesa que te exige — es una dirección que ya elegiste. Llévala contigo cuando subas.',
        duration: 21,
        pauseAfter: 10,
      },

      // ── Retorno ───────────────────────────────────────────────────────────
      {
        id: 'retorno-intro',
        text: 'Vas a subir ahora, con calma.\nVoy a contar hasta cinco. Con cada número vuelves un poco más, hasta abrir los ojos despierto y con el estado que construiste puesto.',
        duration: 20,
        pauseAfter: 6,
      },
      {
        id: 'retorno',
        text: 'Uno. Dos.\nTres — vuelve el peso del cuerpo, sientes otra vez la silla, el suelo.\nCuatro. La luz entra un poco.\nCinco. Abre los ojos.',
        duration: 23,
        pauseAfter: 8,
      },
    ],
  },
];
