// ─── Yoga Nidra — guiones narrados por Norman (voz nocturna) ───────────────────
// Yoga Nidra es el "sueño yóguico": un recorrido estructurado por el cuerpo y la
// consciencia que conduce al estado entre la vigilia y el sueño. La estructura
// clásica encadena: preparación → sankalpa (intención) → rotación de consciencia
// por el cuerpo → sensaciones → respiración → cierre.
//
// `pauseAfter` = segundos de silencio/ambiente tras narrar el segmento. En nidra
// el silencio es donde ocurre el trabajo: la voz solo señala, el cuerpo reposa.
// Las pausas se alargan hacia las fases de reposo profundo, donde el descanso
// manda y la voz casi desaparece.

import type { SleepSession } from '../sleep';

export const NIDRA_SESSIONS: SleepSession[] = [
  // ─── nidra-1 · Intro · 20 min ────────────────────────────────────────────────
  {
    id: 'nidra-1',
    title: 'Nidra Intro — 20 min',
    category: 'nidra',
    durationMinutes: 20,
    segments: [
      // Preparación
      {
        text: 'Túmbate boca arriba.\nLos brazos un poco separados del cuerpo, las palmas hacia el techo.\nLas piernas sueltas, los pies cayendo hacia los lados.',
        pauseAfter: 34,
      },
      {
        text: 'Este es el yoga del sueño.\nNo tienes que hacer nada. Solo escuchar mi voz y dejarla pasar.',
        pauseAfter: 32,
      },
      {
        text: 'Cierra los ojos.\nDeja que el peso de tu cuerpo se entregue por completo al suelo.',
        pauseAfter: 38,
      },
      {
        text: 'Haz una respiración larga por la nariz.\nY al soltar el aire, suelta también el día entero.',
        pauseAfter: 38,
      },
      // Sankalpa
      {
        text: 'Antes de empezar, elige tu sankalpa.\nUna intención breve, en presente, como si ya fuera verdad.',
        pauseAfter: 32,
      },
      {
        text: '"Estoy en paz." "Descanso profundamente." "Estoy completo."\nElige una frase. La tuya.',
        pauseAfter: 36,
      },
      {
        text: 'Repítela tres veces en silencio, con calma y firmeza.\nPlántala como una semilla en el fondo de tu mente.',
        pauseAfter: 40,
      },
      // Rotación de consciencia (rápida)
      {
        text: 'Ahora vamos a recorrer el cuerpo.\nNo lo muevas. Solo lleva tu atención a cada parte cuando la nombre.',
        pauseAfter: 28,
      },
      {
        text: 'Lleva tu atención a la mano derecha.\nEl pulgar derecho. El índice. El medio. El anular. El meñique.\nLa palma de la mano derecha. El dorso. La muñeca.',
        pauseAfter: 32,
      },
      {
        text: 'El antebrazo derecho. El codo. El brazo. El hombro derecho.\nLa axila. El costado derecho. La cadera derecha.',
        pauseAfter: 32,
      },
      {
        text: 'La pierna derecha. La rodilla. La pantorrilla. El tobillo.\nEl talón. La planta del pie. Los cinco dedos del pie derecho.',
        pauseAfter: 34,
      },
      {
        text: 'Ahora la mano izquierda.\nEl pulgar izquierdo. El índice. El medio. El anular. El meñique.\nLa palma. El dorso. La muñeca izquierda.',
        pauseAfter: 32,
      },
      {
        text: 'El antebrazo izquierdo. El codo. El brazo. El hombro izquierdo.\nLa axila. El costado izquierdo. La cadera izquierda.',
        pauseAfter: 32,
      },
      {
        text: 'La pierna izquierda. La rodilla. La pantorrilla. El tobillo.\nEl talón. La planta del pie. Los cinco dedos del pie izquierdo.',
        pauseAfter: 34,
      },
      {
        text: 'Lleva la atención a la espalda.\nToda la espalda apoyada contra el suelo, de los hombros a la cintura.',
        pauseAfter: 36,
      },
      {
        text: 'Ahora la parte delantera.\nEl vientre. El pecho. La garganta.',
        pauseAfter: 34,
      },
      {
        text: 'El rostro.\nLa mandíbula suelta. Los labios. Las mejillas. Los ojos quietos.\nLa frente lisa. Todo el cuero cabelludo.',
        pauseAfter: 38,
      },
      {
        text: 'Y ahora el cuerpo entero, de una sola vez.\nTodo el cuerpo, pesado, completo, en reposo.',
        pauseAfter: 44,
      },
      // Respiración
      {
        text: 'Lleva la atención a la respiración.\nNo la cambies. Solo obsérvala entrar y salir por la nariz.',
        pauseAfter: 42,
      },
      {
        text: 'Empieza a contar las respiraciones hacia atrás.\nInhalo, exhalo, diez. Inhalo, exhalo, nueve.',
        pauseAfter: 44,
      },
      {
        text: 'Sigue tú solo, en silencio, hasta uno.\nSi pierdes la cuenta, no importa. Vuelve a empezar.',
        pauseAfter: 46,
      },
      {
        text: 'Cada exhalación te hunde un poco más.\nMás cerca de ese punto entre estar despierto y dormido.',
        pauseAfter: 44,
      },
      // Cierre
      {
        text: 'Suelta la cuenta.\nSuelta la respiración. Suelta hasta el escuchar.',
        pauseAfter: 46,
      },
      {
        text: 'Vuelve por un instante a tu sankalpa.\nRepite tu frase tres veces más, con la misma calma de antes.',
        pauseAfter: 42,
      },
      {
        text: 'Ya está plantada.\nNo tienes que hacer nada más. El descanso continúa solo.',
        pauseAfter: 46,
      },
      {
        text: 'Quédate aquí, en este reposo, todo el tiempo que tu cuerpo necesite.\nYo me retiro. Buenas noches.',
        pauseAfter: 48,
      },
    ],
  },

  // ─── nidra-2 · Profundo · 40 min ─────────────────────────────────────────────
  {
    id: 'nidra-2',
    title: 'Nidra Profundo — 40 min',
    category: 'nidra',
    durationMinutes: 40,
    segments: [
      // Preparación
      {
        text: 'Túmbate boca arriba y ponte cómodo.\nLos brazos junto al cuerpo, las palmas abiertas hacia arriba.\nLas piernas relajadas, los pies abiertos hacia los lados.',
        pauseAfter: 40,
      },
      {
        text: 'Esta es una práctica larga. No tienes ningún sitio al que ir.\nSolo vas a estar aquí, tumbado, escuchando.',
        pauseAfter: 38,
      },
      {
        text: 'Cierra los ojos con suavidad.\nHaz un último movimiento para acomodarte, y luego quédate completamente quieto.',
        pauseAfter: 42,
      },
      {
        text: 'Siente todos los puntos donde tu cuerpo toca el suelo.\nLos talones. Las pantorrillas. La pelvis. La espalda. Los hombros. La cabeza.',
        pauseAfter: 44,
      },
      {
        text: 'Respira hondo por la nariz, llenando el vientre.\nY suelta el aire despacio, dejando que el cuerpo pese más.',
        pauseAfter: 42,
      },
      {
        text: 'Una vez más. Inhala todo lo que el día te dejó.\nExhala, y deja que se vaya con el aire.',
        pauseAfter: 44,
      },
      // Sankalpa
      {
        text: 'Es momento de tu sankalpa.\nUna resolución corta, en presente, formulada como un hecho ya cumplido.',
        pauseAfter: 38,
      },
      {
        text: 'No "quiero descansar", sino "descanso". No "buscaré paz", sino "estoy en paz".\nElige tu frase. Que sea sencilla y tuya.',
        pauseAfter: 42,
      },
      {
        text: 'Repítela tres veces, en silencio, con plena convicción.\nDéjala caer hasta el fondo, donde nada la discute.',
        pauseAfter: 46,
      },
      // Rotación de consciencia (detallada) — lado derecho
      {
        text: 'Empieza ahora el viaje por el cuerpo.\nNo muevas nada. Solo lleva tu mente a cada punto que voy nombrando, y déjalo.',
        pauseAfter: 34,
      },
      {
        text: 'Lleva la atención al pulgar de la mano derecha.\nEl dedo índice. El dedo medio. El dedo anular. El dedo meñique.',
        pauseAfter: 34,
      },
      {
        text: 'La palma de la mano derecha. El dorso de la mano. La muñeca.\nEl antebrazo. El codo. La parte alta del brazo. El hombro derecho.',
        pauseAfter: 36,
      },
      {
        text: 'La axila derecha. Todo el costado derecho.\nLa cintura del lado derecho. La nalga derecha. La cadera.',
        pauseAfter: 36,
      },
      {
        text: 'El muslo derecho. La rodilla. La espinilla. La pantorrilla.\nEl tobillo derecho. El talón. El empeine. La planta del pie.',
        pauseAfter: 36,
      },
      {
        text: 'El dedo gordo del pie derecho. El segundo dedo. El tercero.\nEl cuarto. El dedo pequeño del pie derecho.',
        pauseAfter: 38,
      },
      // lado izquierdo
      {
        text: 'Pasa ahora al pulgar de la mano izquierda.\nEl dedo índice. El dedo medio. El dedo anular. El dedo meñique.',
        pauseAfter: 34,
      },
      {
        text: 'La palma de la mano izquierda. El dorso de la mano. La muñeca.\nEl antebrazo. El codo. La parte alta del brazo. El hombro izquierdo.',
        pauseAfter: 36,
      },
      {
        text: 'La axila izquierda. Todo el costado izquierdo.\nLa cintura del lado izquierdo. La nalga izquierda. La cadera.',
        pauseAfter: 36,
      },
      {
        text: 'El muslo izquierdo. La rodilla. La espinilla. La pantorrilla.\nEl tobillo izquierdo. El talón. El empeine. La planta del pie.',
        pauseAfter: 36,
      },
      {
        text: 'El dedo gordo del pie izquierdo. El segundo dedo. El tercero.\nEl cuarto. El dedo pequeño del pie izquierdo.',
        pauseAfter: 38,
      },
      // espalda y frente del torso
      {
        text: 'Lleva ahora la atención a la espalda entera.\nLos omóplatos. La columna, vértebra a vértebra. La zona baja de la espalda.',
        pauseAfter: 40,
      },
      {
        text: 'El vientre. El ombligo. El estómago.\nEl pecho. Las costillas que suben y bajan con la respiración.',
        pauseAfter: 40,
      },
      {
        text: 'La garganta. La nuca.\nLos dos hombros a la vez. El cuello entero, suelto.',
        pauseAfter: 40,
      },
      // cabeza y rostro
      {
        text: 'Sube al rostro.\nLa barbilla. La mandíbula, que se afloja. Los labios, que se separan apenas.',
        pauseAfter: 38,
      },
      {
        text: 'La mejilla derecha. La mejilla izquierda. La nariz.\nLos dos ojos, quietos y pesados bajo los párpados.',
        pauseAfter: 40,
      },
      {
        text: 'Las cejas. El entrecejo, que se alisa. La frente ancha y lisa.\nLas sienes. Las orejas. Todo el cuero cabelludo.',
        pauseAfter: 42,
      },
      {
        text: 'Y ahora el cuerpo entero, de una sola pieza.\nTodo el cuerpo, pesado, presente, en reposo absoluto.',
        pauseAfter: 50,
      },
      // Sensaciones opuestas — pesadez / ligereza
      {
        text: 'Lleva la atención a la sensación de pesadez.\nSiente todo el cuerpo pesado, hundiéndose en el suelo como plomo.',
        pauseAfter: 48,
      },
      {
        text: 'Ahora invierte la sensación. Imagina el cuerpo ligero.\nTan liviano que casi flota, sin peso, suspendido.',
        pauseAfter: 48,
      },
      // calor / frío
      {
        text: 'Siente ahora calor.\nUn calor suave que sube desde el centro del cuerpo y llena cada extremidad.',
        pauseAfter: 48,
      },
      {
        text: 'Y ahora frescor.\nUn aire fresco que recorre la piel, claro y limpio.',
        pauseAfter: 48,
      },
      {
        text: 'Suelta los opuestos.\nDeja que el cuerpo encuentre por sí solo su temperatura, su peso, su quietud.',
        pauseAfter: 48,
      },
      // Visualización
      {
        text: 'Mantén los ojos cerrados y deja aparecer una imagen.\nUn cielo nocturno, inmenso, completamente despejado sobre ti.',
        pauseAfter: 48,
      },
      {
        text: 'No hay nubes. Solo el negro profundo y las estrellas, lejanas y serenas.\nEstás tumbado bajo todo ese espacio, pequeño y a salvo.',
        pauseAfter: 50,
      },
      {
        text: 'Una estrella, más brillante que las demás, sostiene tu mirada interior.\nEs tu norte. Fija, silenciosa, siempre en el mismo sitio.',
        pauseAfter: 50,
      },
      {
        text: 'Deja que el cielo se vuelva más y más oscuro.\nLas estrellas se apagan despacio, una a una, hasta el silencio total.',
        pauseAfter: 50,
      },
      // Respiración
      {
        text: 'Vuelve a la respiración.\nObsérvala entrar fresca y salir tibia, sin tocar nada, sin cambiar nada.',
        pauseAfter: 48,
      },
      {
        text: 'Cuenta hacia atrás desde veintisiete.\nInhalo, exhalo, veintisiete. Inhalo, exhalo, veintiséis.',
        pauseAfter: 48,
      },
      {
        text: 'Sigue tú solo, en silencio, descendiendo número a número.\nSi te pierdes, no pasa nada. La cuenta no importa, el descenso sí.',
        pauseAfter: 50,
      },
      {
        text: 'Cada exhalación es un escalón hacia abajo.\nMás hondo, más lento, más cerca del sueño.',
        pauseAfter: 50,
      },
      // Cierre lento
      {
        text: 'Suelta la cuenta. Suelta el contar.\nDeja que la respiración se haga sola, allá abajo, sin ti.',
        pauseAfter: 50,
      },
      {
        text: 'Regresa una última vez a tu sankalpa.\nRepite tu frase tres veces, con la misma calma del principio.',
        pauseAfter: 48,
      },
      {
        text: 'La intención ya está sembrada en lo más hondo.\nTrabajará por sí sola, mientras tú descansas.',
        pauseAfter: 50,
      },
      {
        text: 'No hay nada más que hacer.\nNi escuchar, ni contar, ni sostener. Solo reposar.',
        pauseAfter: 50,
      },
      {
        text: 'Quédate en este sueño yóguico todo el tiempo que quieras.\nSi el sueño verdadero llega, déjalo venir.',
        pauseAfter: 50,
      },
      {
        text: 'Yo me retiro ahora.\nEl cuerpo descansa. La mente descansa. Estás en paz. Buenas noches.',
        pauseAfter: 50,
      },
    ],
  },
];
