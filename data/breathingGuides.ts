/**
 * Guías de entrada de las 8 técnicas de Respiración — la voz de Norman
 * explicando postura y ritmo, y callándose ANTES de que empiece el ciclo.
 *
 * Mismo patrón que `data/binauralGuides.ts`, con una diferencia deliberada:
 * ahí la voz y el tono arrancan JUNTOS (el tono sigue solo mientras la voz
 * habla encima). Aquí la voz termina PRIMERO y solo entonces arranca el
 * ciclo INHALA/EXHALA/RETÉN — no tiene sentido que el círculo ya esté
 * marcando el ritmo mientras Norman todavía está explicando la postura.
 *
 * HONESTIDAD: igual que en binaurales, "muchos la usan para" en vez de "esto
 * te va a producir X". Wim Hof y Tummo llevan además la misma advertencia de
 * precaución que ya tiene el catálogo (`BREATHING_TECHNIQUES`).
 */

export interface BreathingGuideSegment {
  text: string;
  /** Segundos totales de la fase: voz + el silencio que la sigue. */
  duration: number;
  /** Silencio tras la voz, en segundos. */
  pauseAfter: number;
}

export interface BreathingGuide {
  /** Coincide con `BreathingTechnique.id` de data/wellness.ts. */
  id: '4-7-8' | 'box' | 'coherente' | 'wim-hof' | 'fisiologica' | 'nadi-shodhana' | '2-1' | 'tummo';
  segments: BreathingGuideSegment[];
}

export const BREATHING_GUIDES: BreathingGuide[] = [
  // ─── 4·7·8 · calma profunda ─────────────────────────────────────────────
  {
    id: '4-7-8',
    segments: [
      {
        text: 'Siéntate o recuéstate, donde vayas a quedarte quieto un rato.\nEsta respiración es de las mejor estudiadas para bajar revoluciones.',
        duration: 28,
        pauseAfter: 10,
      },
      {
        text: 'Pon la punta de la lengua detrás de los dientes de arriba\ny déjala ahí toda la práctica.',
        duration: 24,
        pauseAfter: 10,
      },
      {
        text: 'Vas a inhalar cuatro segundos por la nariz,\nsostener siete, y soltar ocho por la boca, con sonido.',
        duration: 26,
        pauseAfter: 12,
      },
      {
        text: 'Sigue el círculo que ves en pantalla: se expande al inhalar,\nse queda quieto al sostener, se encoge al exhalar.',
        duration: 24,
        pauseAfter: 12,
      },
      {
        text: 'Si te mareas en las primeras rondas, es normal — respira normal un momento y retoma.\nEmpezamos.',
        duration: 26,
        pauseAfter: 10,
      },
    ],
  },

  // ─── BOX · enfoque y control ────────────────────────────────────────────
  {
    id: 'box',
    segments: [
      {
        text: 'Siéntate con la espalda recta, sin rigidez.\nEsta es la respiración que usan equipos que necesitan calma bajo presión.',
        duration: 28,
        pauseAfter: 10,
      },
      {
        text: 'Cuatro tiempos iguales: inhala cuatro, sostén cuatro,\nexhala cuatro, sostén cuatro con los pulmones vacíos.',
        duration: 26,
        pauseAfter: 12,
      },
      {
        text: 'El círculo marca cada tramo.\nCuando se queda quieto, ahí sostienes — no importa si es con aire dentro o fuera.',
        duration: 26,
        pauseAfter: 12,
      },
      {
        text: 'No es una carrera. Si cuatro segundos se sienten largos,\nbaja el ritmo mentalmente, no fuerces el conteo.',
        duration: 24,
        pauseAfter: 10,
      },
      {
        text: 'Empieza cuando quieras.\nYo me callo aquí.',
        duration: 16,
        pauseAfter: 8,
      },
    ],
  },

  // ─── 5·5 · coherencia cardíaca ──────────────────────────────────────────
  {
    id: 'coherente',
    segments: [
      {
        text: 'Siéntate cómodo, sin necesidad de cerrar los ojos.\nEsta es la más simple de las ocho: cinco y cinco, sin retenciones.',
        duration: 26,
        pauseAfter: 10,
      },
      {
        text: 'Inhala cinco segundos por la nariz.\nExhala cinco, también por la nariz si puedes.',
        duration: 22,
        pauseAfter: 10,
      },
      {
        text: 'El objetivo no es respirar hondo — es respirar PAREJO.\nMismo tiempo entrando que saliendo, ronda tras ronda.',
        duration: 24,
        pauseAfter: 12,
      },
      {
        text: 'Puedes usarla mientras trabajas, con los ojos abiertos.\nEl círculo lleva el ritmo por ti.',
        duration: 22,
        pauseAfter: 10,
      },
    ],
  },

  // ─── WIM HOF · energía y activación ─────────────────────────────────────
  {
    id: 'wim-hof',
    segments: [
      {
        text: 'Siéntate o recuéstate en un lugar seguro — nunca de pie, nunca en el agua, nunca manejando.\nEsta versión es rápida y activadora, no la del método completo con retención larga.',
        duration: 32,
        pauseAfter: 12,
      },
      {
        text: 'Vas a inhalar y exhalar rápido por la nariz o la boca,\nsin pausas entre una y otra, siguiendo el círculo.',
        duration: 26,
        pauseAfter: 12,
      },
      {
        text: 'Puede aparecer hormigueo en manos o mareo leve — es la respuesta normal a la hiperventilación.\nSi se vuelve incómodo, para y respira normal.',
        duration: 30,
        pauseAfter: 12,
      },
      {
        text: 'No hay retención larga ni fase de recuperación guiada en esta versión:\nson rondas cortas de respiración rápida, nada más.',
        duration: 26,
        pauseAfter: 12,
      },
      {
        text: 'Mejor en la mañana, nunca antes de dormir.\nEmpezamos.',
        duration: 18,
        pauseAfter: 8,
      },
    ],
  },

  // ─── SUSPIRO FISIOLÓGICO · reset rápido de estrés ───────────────────────
  // Adaptado del guion largo de la meditación 'suspiro-fisiologico'
  // (data/wellness.ts) — condensado a intro, no a la práctica completa: aquí
  // solo se explica el patrón, después el círculo lleva el ritmo.
  {
    id: 'fisiologica',
    segments: [
      {
        text: 'Siéntate o recuéstate.\nEsta es la práctica de cinco minutos con más respaldo que existe — y la más rápida de aprender.',
        duration: 28,
        pauseAfter: 10,
      },
      {
        text: 'Vas a inhalar por la nariz hasta llenar,\ny sin soltar, robar una segunda inhalación corta encima.',
        duration: 26,
        pauseAfter: 12,
      },
      {
        text: 'Esa segunda inhalación es la que abre los alveolos que quedaron colapsados.\nDespués, sueltas todo por la boca, largo y lento.',
        duration: 28,
        pauseAfter: 12,
      },
      {
        text: 'El círculo marca las dos inhalaciones seguidas y después la exhalación larga.\nNo cuentes, no lo hagas perfecto.',
        duration: 26,
        pauseAfter: 10,
      },
      {
        text: 'Solo que la salida sea más larga que la entrada.\nEmpezamos.',
        duration: 18,
        pauseAfter: 8,
      },
    ],
  },

  // ─── RESPIRACIÓN ALTERNA · equilibrio y claridad ────────────────────────
  {
    id: 'nadi-shodhana',
    segments: [
      {
        text: 'Siéntate con la espalda recta.\nEsta es una práctica tradicional de respiración alternando fosas nasales.',
        duration: 26,
        pauseAfter: 10,
      },
      {
        text: 'Con el pulgar cierras una fosa e inhalas por la otra;\ncon el anular cierras esa y exhalas por la que tenías cerrada.',
        duration: 30,
        pauseAfter: 12,
      },
      {
        text: 'La app no puede seguir cuál fosa te toca en cada momento —\neso lo llevas tú. El círculo solo marca cuándo inhalar, sostener y exhalar.',
        duration: 28,
        pauseAfter: 12,
      },
      {
        text: 'Si prefieres, respira solo por la nariz sin alternar\ny quédate con el ritmo. También funciona.',
        duration: 24,
        pauseAfter: 10,
      },
      {
        text: 'Empieza cuando quieras.',
        duration: 12,
        pauseAfter: 6,
      },
    ],
  },

  // ─── EXHALACIÓN 2:1 · calma parasimpática ───────────────────────────────
  {
    id: '2-1',
    segments: [
      {
        text: 'Siéntate o recuéstate.\nAquí la única regla es que la exhalación dure el doble que la inhalación.',
        duration: 24,
        pauseAfter: 10,
      },
      {
        text: 'Inhala cuatro segundos por la nariz.\nExhala ocho, despacio, por la nariz o la boca.',
        duration: 22,
        pauseAfter: 10,
      },
      {
        text: 'Cuanto más larga la salida frente a la entrada,\nmás señal de calma le mandas al cuerpo. No hay más truco que ese.',
        duration: 26,
        pauseAfter: 12,
      },
      {
        text: 'El círculo se encoge más lento de lo que se expande — síguelo así.\nEmpezamos.',
        duration: 22,
        pauseAfter: 8,
      },
    ],
  },

  // ─── TUMMO SIMPLE · calor y energía interna ─────────────────────────────
  {
    id: 'tummo',
    segments: [
      {
        text: 'Siéntate en un lugar seguro, nunca de pie ni en el agua.\nEsta es una versión simple de la respiración tibetana del calor interno.',
        duration: 28,
        pauseAfter: 12,
      },
      {
        text: 'Inhala fuerte y profundo por la nariz,\nexhala con fuerza por la boca — un ritmo más intenso que el resto del catálogo.',
        duration: 28,
        pauseAfter: 12,
      },
      {
        text: 'Muchos reportan sensación de calor o activación con la práctica sostenida;\nno hay garantía de eso, y si sientes mareo, para.',
        duration: 28,
        pauseAfter: 12,
      },
      {
        text: 'Para activarte, no para dormir. Con precaución.\nEmpezamos.',
        duration: 18,
        pauseAfter: 8,
      },
    ],
  },
];

/** Guía de entrada de una técnica, o `undefined` si aún no tiene guión. */
export function getBreathingGuide(id: string): BreathingGuide | undefined {
  return BREATHING_GUIDES.find((g) => g.id === id);
}
