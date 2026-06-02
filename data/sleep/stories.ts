// ─── Sleep Stories — narraciones inmersivas para dormir ───────────────────────
// Norman te lleva, con voz cálida y pausada, a un lugar tranquilo y te acompaña
// hasta el sueño. No hay nada que lograr aquí: solo dejarse llevar. Los
// `pauseAfter` son largos (20-45 s) porque la historia avanza lento y el
// silencio —con su ambiente sonoro— es parte del viaje.

import type { SleepSession } from '../sleep';

export const STORY_SESSIONS: SleepSession[] = [
  // ── 1. El Bosque de las Secuoyas — 20 min ──────────────────────────────────
  {
    id: 'story-1',
    title: 'El Bosque de las Secuoyas',
    category: 'stories',
    durationMinutes: 20,
    segments: [
      {
        text: 'Soy Norman.\nEsta noche no tienes que ir a ningún sitio.\nDeja que la voz te lleve, sin esfuerzo, mientras el cuerpo se suelta.',
        pauseAfter: 22,
      },
      {
        text: 'Imagina que estás de pie al borde de un bosque antiguo.\nEs el final de la tarde.\nEl aire es fresco y huele a tierra húmeda y a madera.',
        pauseAfter: 28,
      },
      {
        text: 'Frente a ti se abre un sendero de tierra blanda.\nLo cubre una alfombra de hojas y agujas de pino.\nDas el primer paso, y el suelo cede apenas, mullido bajo tus pies.',
        pauseAfter: 34,
      },
      {
        text: 'A ambos lados se alzan las secuoyas.\nÁrboles inmensos, tan altos que no alcanzas a ver dónde terminan.\nLlevan aquí miles de años, en silencio.',
        pauseAfter: 34,
      },
      {
        text: 'Apoyas una mano en el tronco más cercano.\nLa corteza es gruesa, rojiza, surcada de líneas profundas.\nEstá tibia, como si guardara el calor del día.',
        pauseAfter: 36,
      },
      {
        text: 'Una niebla suave flota entre los árboles.\nSe mueve despacio, sin prisa, igual que tu respiración.\nTodo aquí va lento. Tú también puedes ir lento.',
        pauseAfter: 36,
      },
      {
        text: 'Sigues caminando.\nLa luz del atardecer se filtra entre las ramas en haces dorados.\nCae sobre el sendero en manchas suaves que se mueven con el viento.',
        pauseAfter: 38,
      },
      {
        text: 'El musgo cubre las piedras y la base de los troncos.\nEs de un verde profundo, casi aterciopelado.\nSi lo tocaras, sería fresco y blando bajo los dedos.',
        pauseAfter: 37,
      },
      {
        text: 'Te detienes un momento.\nEscuchas.\nMuy a lo lejos, el canto de un pájaro. Después, otra vez el silencio.',
        pauseAfter: 38,
      },
      {
        text: 'El sendero desciende con suavidad.\nCada paso es más lento que el anterior.\nNo hay ninguna prisa por llegar. El bosque no espera nada de ti.',
        pauseAfter: 36,
      },
      {
        text: 'Pasas junto a un tronco caído, cubierto de helechos.\nDe sus grietas brotan pequeños brotes nuevos, verdes y tiernos.\nLa vida sigue su curso, callada, sin esfuerzo.',
        pauseAfter: 35,
      },
      {
        text: 'El aire se vuelve más fresco y más quieto.\nRespiras hondo una vez.\nEl olor a pino y a tierra llena tu pecho, y al soltar el aire, los hombros bajan.',
        pauseAfter: 38,
      },
      {
        text: 'Más adelante, el sendero se abre en un pequeño claro.\nUn rayo de luz cae justo en el centro, sobre la hierba.\nTe acercas, despacio.',
        pauseAfter: 36,
      },
      {
        text: 'En el claro hay una roca lisa y ancha, cubierta de musgo.\nTe sientas sobre ella.\nEstá tibia. Encaja con tu cuerpo como si te esperara.',
        pauseAfter: 38,
      },
      {
        text: 'Desde aquí miras hacia arriba.\nLos troncos suben y suben, perdiéndose en la niebla.\nTe sientes pequeño, y al mismo tiempo, a salvo.',
        pauseAfter: 40,
      },
      {
        text: 'La niebla se posa entre las copas como un manto.\nLa luz se vuelve más tenue, más suave.\nEl día se retira sin hacer ruido.',
        pauseAfter: 39,
      },
      {
        text: 'Sientes el peso de tu cuerpo sobre la roca.\nLas piernas, pesadas.\nLa espalda, suelta.\nTodo se afloja, un poco más.',
        pauseAfter: 40,
      },
      {
        text: 'Una brisa muy leve cruza el claro.\nMueve apenas las hojas, allá arriba.\nUn susurro largo, suave, que va y viene como el mar.',
        pauseAfter: 42,
      },
      {
        text: 'Cierras los ojos en el bosque.\nLa niebla te envuelve, tibia.\nNo hay nada que hacer. Nada que pensar.',
        pauseAfter: 42,
      },
      {
        text: 'El bosque respira contigo.\nLento.\nProfundo.\nUna y otra vez.',
        pauseAfter: 43,
      },
      {
        text: 'Las secuoyas velan tu descanso.\nLlevan aquí mil años.\nNada malo puede pasar bajo su sombra.',
        pauseAfter: 43,
      },
      {
        text: 'Te hundes un poco más en el musgo tibio.\nMás pesado.\nMás quieto.',
        pauseAfter: 44,
      },
      {
        text: 'La luz se apaga, despacio.\nEl bosque queda en penumbra.\nY tú, en calma.',
        pauseAfter: 44,
      },
      {
        text: 'Quédate aquí.\nDuerme.\nEl bosque te cuida.',
        pauseAfter: 45,
      },
    ],
  },

  // ── 2. La Orilla del Mar Tranquilo — 25 min ────────────────────────────────
  {
    id: 'story-2',
    title: 'La Orilla del Mar Tranquilo',
    category: 'stories',
    durationMinutes: 25,
    segments: [
      {
        text: 'Soy Norman.\nDeja que el día se quede atrás.\nEsta noche te acompaño hasta la orilla del mar, y allí descansas.',
        pauseAfter: 24,
      },
      {
        text: 'Imagina una playa larga y abierta.\nEs el atardecer.\nEl cielo se tiñe de naranja, de rosa, de un oro suave que se derrama sobre el agua.',
        pauseAfter: 30,
      },
      {
        text: 'Estás de pie sobre la arena.\nEs fina y tibia, todavía guarda el calor del sol.\nTus pies se hunden apenas en ella con cada paso.',
        pauseAfter: 36,
      },
      {
        text: 'Frente a ti, el mar.\nUna extensión inmensa y tranquila que se mece despacio.\nLas olas llegan a la orilla, una tras otra, sin prisa.',
        pauseAfter: 38,
      },
      {
        text: 'Escuchas el sonido del agua.\nLlega.\nSe retira.\nLlega de nuevo. Un ritmo lento que no se detiene nunca.',
        pauseAfter: 38,
      },
      {
        text: 'Caminas hacia la orilla, despacio.\nLa arena cambia bajo tus pies: más firme, más fresca, más húmeda.\nEl mar la ha alisado hasta dejarla como un espejo.',
        pauseAfter: 39,
      },
      {
        text: 'Una ola sube y roza tus pies.\nEl agua es tibia y suave.\nSe queda un instante, y luego se retira, llevándose un poco de arena bajo tus talones.',
        pauseAfter: 38,
      },
      {
        text: 'Levantas la mirada hacia el horizonte.\nAllí, a lo lejos, el mar y el cielo se encuentran en una línea.\nEl sol baja despacio hacia esa línea, sin ninguna prisa.',
        pauseAfter: 37,
      },
      {
        text: 'El aire huele a sal y a mar.\nRespiras hondo, y el pecho se llena.\nAl soltar el aire, algo dentro de ti se afloja.',
        pauseAfter: 38,
      },
      {
        text: 'Una brisa tibia cruza la playa.\nTe roza la piel, mueve apenas tu cabello.\nViene del mar, y trae consigo la calma del agua.',
        pauseAfter: 39,
      },
      {
        text: 'Encuentras un lugar en la arena seca, un poco más arriba.\nTe sientas allí.\nLa arena tibia cede bajo tu cuerpo y te sostiene.',
        pauseAfter: 38,
      },
      {
        text: 'Desde aquí miras el oleaje.\nCada ola se forma, crece, y se deshace en espuma blanca sobre la orilla.\nUna y otra vez. Sin esfuerzo. Sin fin.',
        pauseAfter: 40,
      },
      {
        text: 'El sol toca el horizonte.\nEl agua se enciende con su reflejo dorado.\nUn camino de luz se extiende sobre el mar, directo hacia ti.',
        pauseAfter: 40,
      },
      {
        text: 'Los colores del cielo se hacen más profundos.\nEl naranja se vuelve rojo. El rojo, violeta.\nTodo cambia despacio, sin que nada lo apresure.',
        pauseAfter: 41,
      },
      {
        text: 'Apoyas las manos en la arena, a los lados.\nEstá tibia bajo tus palmas.\nSientes el peso de tu cuerpo descansar por completo sobre la tierra.',
        pauseAfter: 40,
      },
      {
        text: 'El sonido de las olas te envuelve.\nLlega.\nSe retira.\nTu respiración empieza a seguir ese mismo ritmo, sin que lo decidas.',
        pauseAfter: 42,
      },
      {
        text: 'Inspiras cuando la ola sube.\nSueltas el aire cuando se retira.\nEl mar respira por ti. No tienes que hacer nada más.',
        pauseAfter: 42,
      },
      {
        text: 'El sol se hunde un poco más.\nQueda solo la mitad sobre el horizonte.\nLa luz es más suave ahora, más dorada, más tenue.',
        pauseAfter: 41,
      },
      {
        text: 'Sientes el cuerpo cada vez más pesado.\nLos hombros caen.\nLa mandíbula se afloja.\nLa arena tibia te sostiene entero.',
        pauseAfter: 42,
      },
      {
        text: 'La espuma de las olas brilla en la penumbra.\nBlanca, suave, fugaz.\nAparece y desaparece sobre la arena oscura.',
        pauseAfter: 43,
      },
      {
        text: 'El último borde del sol se desliza bajo el mar.\nEl cielo se tiñe de un azul profundo.\nLa primera estrella aparece, muy alta, muy lejana.',
        pauseAfter: 43,
      },
      {
        text: 'Las olas siguen llegando en la oscuridad.\nNo las ves ya.\nSolo las escuchas, suaves, constantes, cerca de ti.',
        pauseAfter: 44,
      },
      {
        text: 'Te recuestas sobre la arena tibia.\nMiras el cielo que se llena de estrellas.\nEstás a salvo. No hay nada que temer.',
        pauseAfter: 44,
      },
      {
        text: 'El mar canta su nana antigua.\nLlega.\nSe retira.\nUna y otra vez, solo para ti.',
        pauseAfter: 44,
      },
      {
        text: 'Cierras los ojos junto al agua.\nEl sonido del mar te mece.\nMás suave.\nMás lento.',
        pauseAfter: 45,
      },
      {
        text: 'Te dejas llevar por las olas.\nPesado.\nQuieto.\nEn calma.',
        pauseAfter: 45,
      },
      {
        text: 'Quédate aquí, en la orilla.\nDuerme.\nEl mar te acompaña toda la noche.',
        pauseAfter: 45,
      },
    ],
  },

  // ── 3. Cabaña en las Montañas — 18 min ─────────────────────────────────────
  {
    id: 'story-3',
    title: 'Cabaña en las Montañas',
    category: 'stories',
    durationMinutes: 18,
    segments: [
      {
        text: 'Soy Norman.\nAfuera hace frío, pero aquí dentro estás a salvo y en calma.\nDeja que te lleve a un refugio cálido en lo alto de las montañas.',
        pauseAfter: 24,
      },
      {
        text: 'Imagina una pequeña cabaña de madera.\nEstá sola, en lo alto de una montaña, rodeada de nieve.\nLas ventanas brillan con una luz cálida y dorada.',
        pauseAfter: 30,
      },
      {
        text: 'Abres la puerta y entras.\nEl aire tibio te recibe enseguida.\nHuele a madera, a leña encendida y a algo dulce.',
        pauseAfter: 32,
      },
      {
        text: 'Cierras la puerta tras de ti.\nEl frío se queda afuera.\nAquí dentro todo es tibio, callado y seguro.',
        pauseAfter: 33,
      },
      {
        text: 'En el centro de la cabaña hay una chimenea de piedra.\nEl fuego arde despacio.\nLas llamas se mueven suaves, naranjas y doradas, sin prisa.',
        pauseAfter: 35,
      },
      {
        text: 'Escuchas el crepitar de la leña.\nUn chasquido. Después otro.\nUn sonido suave y tibio que llena el silencio de la habitación.',
        pauseAfter: 36,
      },
      {
        text: 'Te acercas al fuego.\nSientes su calor en la piel del rostro y de las manos.\nEl frío del cuerpo se disuelve, poco a poco.',
        pauseAfter: 35,
      },
      {
        text: 'Junto a la chimenea hay un sillón hondo y blando.\nEstá cubierto de mantas de lana suave.\nTe acomodas en él, y el sillón te recibe entero.',
        pauseAfter: 37,
      },
      {
        text: 'Te cubres con una manta.\nEs gruesa, tibia y pesada.\nSu peso suave sobre ti te hace sentir resguardado, como un abrazo.',
        pauseAfter: 38,
      },
      {
        text: 'Miras hacia la ventana.\nAfuera, la nieve cae despacio.\nCopos blancos que descienden sin ruido, girando, en la luz tenue del exterior.',
        pauseAfter: 39,
      },
      {
        text: 'La nieve cubre todo de blanco.\nLos árboles, el suelo, el alféizar de la ventana.\nEl mundo afuera está quieto, dormido bajo su manto.',
        pauseAfter: 40,
      },
      {
        text: 'Aquí dentro, el fuego sigue ardiendo.\nSu luz dorada baila en las paredes de madera.\nTodo es tibio. Todo está en su sitio.',
        pauseAfter: 39,
      },
      {
        text: 'Sientes el peso de la manta sobre el cuerpo.\nLas piernas, pesadas y tibias.\nLos hombros, sueltos.\nNada que hacer, ningún lugar adonde ir.',
        pauseAfter: 41,
      },
      {
        text: 'El crepitar del fuego es un murmullo constante.\nVa y viene, suave.\nTu respiración se vuelve más lenta, más profunda, casi por sí sola.',
        pauseAfter: 42,
      },
      {
        text: 'Afuera, un viento muy lejano susurra entre los pinos.\nUn sonido grave y suave, que apenas se escucha.\nAquí dentro, en cambio, todo es calma.',
        pauseAfter: 42,
      },
      {
        text: 'Las llamas se hacen más bajas.\nMás suaves.\nUn brillo cálido y dorado que se apaga muy despacio.',
        pauseAfter: 42,
      },
      {
        text: 'Te hundes más en el sillón.\nLa manta tibia te envuelve por completo.\nLos párpados pesan. Dejas que se cierren.',
        pauseAfter: 43,
      },
      {
        text: 'La nieve sigue cayendo afuera, en silencio.\nEl fuego brilla, bajo y tranquilo.\nEstás a salvo, abrigado, en calma.',
        pauseAfter: 43,
      },
      {
        text: 'No hay nada que cuidar esta noche.\nNada que pensar.\nSolo el calor de la manta y el murmullo del fuego.',
        pauseAfter: 44,
      },
      {
        text: 'El cuerpo, pesado.\nLa respiración, lenta.\nLa cabaña, tibia y quieta.',
        pauseAfter: 44,
      },
      {
        text: 'El fuego se apaga, despacio.\nLa luz se vuelve suave.\nY tú te dejas ir.',
        pauseAfter: 44,
      },
      {
        text: 'Quédate aquí, al calor.\nDuerme.\nLa montaña te guarda toda la noche.',
        pauseAfter: 45,
      },
    ],
  },
];
