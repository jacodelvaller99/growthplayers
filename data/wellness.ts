// ─── Meditation Sessions ──────────────────────────────────────────────────────

export type MeditationCategory =
  | 'mañana'
  | 'noche'
  | 'enfoque'
  | 'estrés'
  | 'identidad'   // visualización del yo soberano, futuro, identidad declarada
  | 'decisión'    // claridad estratégica antes de decidir, soltar el ruido
  | 'energía';    // activación, recarga, picos de fatiga

// Metadata de cada categoría — usado por la UI de Meditación para agrupar/filtrar.
export const MEDITATION_CATEGORY_META: Record<
  MeditationCategory,
  { label: string; description: string }
> = {
  'mañana':    { label: 'MAÑANA',    description: 'Arranca el día con presencia y dirección.' },
  'noche':     { label: 'NOCHE',     description: 'Cierra el día, suelta la carga, prepara el descanso.' },
  'enfoque':   { label: 'ENFOQUE',   description: 'Concentra la energía antes de ejecutar.' },
  'estrés':    { label: 'CALMA',     description: 'Desactiva la alerta y regula el sistema nervioso.' },
  'identidad': { label: 'IDENTIDAD', description: 'Habita al operador soberano que estás construyendo.' },
  'decisión':  { label: 'DECISIÓN',  description: 'Claridad estratégica para decidir desde criterio.' },
  'energía':   { label: 'ENERGÍA',   description: 'Activa el cuerpo y recarga la mente.' },
};

export interface GuidedPhase {
  text: string;
  duration: number; // seconds
}

export interface MeditationSession {
  id: string;
  title: string;
  durationMinutes: number;
  category: MeditationCategory;
  description: string;
  ambientType: 'brown' | 'pink' | 'white';
  phases: GuidedPhase[];
}

export const MEDITATION_SESSIONS: MeditationSession[] = [
  {
    id: 'despertar-consciente',
    title: 'Despertar Consciente',
    durationMinutes: 5,
    category: 'mañana',
    description: 'Activa tu mente con presencia y claridad para el día.',
    ambientType: 'pink',
    phases: [
      { text: 'Cierra los ojos.\nSiente el contacto con tu asiento.', duration: 30 },
      { text: 'Observa tu respiración\nsin modificarla.', duration: 45 },
      { text: 'Lleva atención\na cada parte de tu cuerpo.', duration: 60 },
      { text: 'Establece tu intención\npara las próximas horas.', duration: 60 },
      { text: 'Visualiza\nel resultado de tu día ideal.', duration: 60 },
      { text: 'Siente gratitud\npor este momento de claridad.', duration: 45 },
    ],
  },
  {
    id: 'calma-profunda',
    title: 'Calma Profunda',
    durationMinutes: 10,
    category: 'estrés',
    description: 'Desactiva el modo alerta y restaura la calma interna.',
    ambientType: 'brown',
    phases: [
      { text: 'Cierra los ojos.\nSuelta la tensión de tu mandíbula.', duration: 30 },
      { text: 'Inhala profundo por 4 segundos.\nExhala por 6.', duration: 60 },
      { text: 'Observa los pensamientos\nsin engancharte en ellos.', duration: 90 },
      { text: 'Relaja los hombros,\nlas manos, la frente.', duration: 60 },
      { text: 'El único momento real\nes este instante.', duration: 60 },
      { text: 'Descansa\nen la quietud.', duration: 120 },
      { text: 'Cada exhalación\nte lleva más profundo.', duration: 90 },
      { text: 'Estás seguro.\nNo hay nada que resolver ahora.', duration: 90 },
    ],
  },
  {
    id: 'enfoque-total',
    title: 'Enfoque Total',
    durationMinutes: 7,
    category: 'enfoque',
    description: 'Lleva tu atención a un punto único y mantén la concentración.',
    ambientType: 'pink',
    phases: [
      { text: 'Postura alerta.\nColumna recta, mentón paralelo al suelo.', duration: 30 },
      { text: 'Lleva toda tu atención\na un punto frente a ti.', duration: 60 },
      { text: 'Define tu objetivo\nde la próxima sesión de trabajo.', duration: 60 },
      { text: 'Elimina mentalmente\ntodo lo que no es esa tarea.', duration: 60 },
      { text: 'Siente la energía\nconcentrarse en tu mente.', duration: 60 },
      { text: 'Cuando abras los ojos,\nactúa sin dilación.', duration: 60 },
      { text: 'Modo mercader:\nun objetivo, toda la energía.', duration: 90 },
    ],
  },
  {
    id: 'cierre-del-dia',
    title: 'Cierre del Día',
    durationMinutes: 8,
    category: 'noche',
    description: 'Procesa el día, suelta la carga y prepara el descanso.',
    ambientType: 'brown',
    phases: [
      { text: 'El día terminó.\nDeja que tu cuerpo lo sepa.', duration: 45 },
      { text: 'Recuerda tres acciones\nque ejecutaste hoy.', duration: 60 },
      { text: 'Reconoce una lección\nque se revela en la revisión.', duration: 60 },
      { text: 'Libera lo que no pudiste resolver.\nNo es urgente.', duration: 60 },
      { text: 'Siente gratitud\npor lo que tienes ahora mismo.', duration: 60 },
      { text: 'Tu mente puede descansar.\nMañana hay espacio para actuar.', duration: 60 },
      { text: 'Suelta el peso del día.\nEstás a salvo.', duration: 90 },
      { text: 'Respira y\npermítete descansar.', duration: 45 },
    ],
  },
  {
    id: 'respiracion-478',
    title: 'Respiración 4-7-8',
    durationMinutes: 4,
    category: 'estrés',
    description: 'Técnica de respiración para calmar el sistema nervioso en minutos.',
    ambientType: 'white',
    phases: [
      { text: 'Posición cómoda.\nLengua en el paladar superior.', duration: 20 },
      { text: 'Exhala completamente\npor la boca.', duration: 15 },
      { text: 'Inhala por la nariz\ncuenta 4 tiempos.', duration: 30 },
      { text: 'Retén el aire\ncuenta 7 tiempos.', duration: 40 },
      { text: 'Exhala lentamente\ncuenta 8 tiempos.', duration: 45 },
      { text: 'Repite el ciclo.\nObserva la calma que llega.', duration: 90 },
    ],
  },

  // ─── IDENTIDAD — el yo soberano, futuro, identidad declarada ───────────────
  {
    id: 'el-yo-soberano',
    title: 'El Yo Soberano',
    durationMinutes: 7,
    category: 'identidad',
    description: 'Visualiza al soberano que ya vive dentro de ti y ocupa su lugar.',
    ambientType: 'brown',
    phases: [
      { text: 'Cierra los ojos.\nDeja de actuar para los demás.', duration: 40 },
      { text: 'Respira hondo.\nAquí no hay público, solo tú.', duration: 45 },
      { text: 'Hay una versión tuya\nque no pide permiso.', duration: 55 },
      { text: 'Míralo de frente:\nse sostiene solo, decide solo.', duration: 70 },
      { text: 'No es un sueño lejano.\nEs quien eres cuando dejas de dudar.', duration: 70 },
      { text: 'Ocupa ese cuerpo ahora.\nEspalda recta, mirada firme.', duration: 60 },
      { text: 'El soberano no espera permiso.\nSe lo da a sí mismo.', duration: 50 },
      { text: 'Abre los ojos.\nGobiérnate.', duration: 30 },
    ],
  },
  {
    id: 'cinco-anos-adelante',
    title: 'Cinco Años Adelante',
    durationMinutes: 8,
    category: 'identidad',
    description: 'Encuentra a tu versión de 5 años en el futuro y recibe su consejo.',
    ambientType: 'brown',
    phases: [
      { text: 'Respira despacio.\nSuelta el ruido de hoy.', duration: 45 },
      { text: 'Avanza cinco años en el tiempo.\nMira sin prisa.', duration: 60 },
      { text: 'Ahí estás tú.\nMás sólido, más limpio, más claro.', duration: 70 },
      { text: 'Observa cómo se mueve.\nNada de lo que hoy te frena lo toca.', duration: 75 },
      { text: 'Pregúntale:\n¿qué decidí para llegar aquí?', duration: 80 },
      { text: 'Escucha la respuesta.\nNo la juzgues, recíbela.', duration: 75 },
      { text: 'Esa vida ya empezó.\nLa construyes en el presente.', duration: 60 },
      { text: 'Abre los ojos.\nDa el primer paso hacia él.', duration: 35 },
    ],
  },
  {
    id: 'la-identidad-declarada',
    title: 'La Identidad Declarada',
    durationMinutes: 6,
    category: 'identidad',
    description: 'Declara en presente quién eres y deja de negociarlo contigo mismo.',
    ambientType: 'pink',
    phases: [
      { text: 'Siéntate firme.\nEsto no es un deseo, es una declaración.', duration: 40 },
      { text: 'Lo que repites de ti\nse vuelve quien eres.', duration: 50 },
      { text: 'Declara en presente:\nsoy alguien que cumple su palabra.', duration: 65 },
      { text: 'Repítelo por dentro.\nSin condiciones, sin algún día.', duration: 70 },
      { text: 'Soy disciplinado.\nSoy dueño de mi tiempo.', duration: 65 },
      { text: 'No lo estás fingiendo.\nLo estás eligiendo.', duration: 50 },
      { text: 'Abre los ojos.\nVive a la altura de lo dicho.', duration: 30 },
    ],
  },
  {
    id: 'encarnar-la-decision',
    title: 'Encarnar la Decisión',
    durationMinutes: 6,
    category: 'identidad',
    description: 'Convierte una decisión mental en algo que tu cuerpo ya habita.',
    ambientType: 'pink',
    phases: [
      { text: 'Respira y enfoca.\nHay una decisión que ya tomaste.', duration: 40 },
      { text: 'Tráela al frente.\nVela con claridad.', duration: 55 },
      { text: 'No vive solo en tu cabeza.\nBájala al cuerpo.', duration: 65 },
      { text: 'Siente cómo cambia tu postura\ncuando ya está decidido.', duration: 70 },
      { text: 'El que duda titubea.\nEl que decidió, se mueve.', duration: 60 },
      { text: 'Modo mercader:\nun objetivo, toda la energía.', duration: 50 },
      { text: 'Abre los ojos.\nActúa como quien ya eligió.', duration: 30 },
    ],
  },
  {
    id: 'el-operador-en-calma',
    title: 'El Operador en Calma',
    durationMinutes: 7,
    category: 'identidad',
    description: 'Encarna al operador que decide con criterio en medio del ruido.',
    ambientType: 'brown',
    phases: [
      { text: 'Baja el ritmo.\nEl operador no reacciona, responde.', duration: 45 },
      { text: 'Respira lento.\nLa calma también es una habilidad.', duration: 55 },
      { text: 'Imagina el caos alrededor.\nTú, en el centro, quieto.', duration: 70 },
      { text: 'Desde aquí ves todo el tablero.\nNada te arrastra.', duration: 75 },
      { text: 'El criterio nace en calma,\nnunca en el pánico.', duration: 65 },
      { text: 'Este es tu estado base.\nControlado, despierto, frío.', duration: 60 },
      { text: 'Abre los ojos.\nOpera desde la calma.', duration: 30 },
    ],
  },
  {
    id: 'desprenderte-de-quien-fuiste',
    title: 'Desprenderte de Quien Fuiste',
    durationMinutes: 7,
    category: 'identidad',
    description: 'Suelta la versión antigua de ti que ya no sirve a tu misión.',
    ambientType: 'brown',
    phases: [
      { text: 'Cierra los ojos.\nHay un peso que ya no es tuyo.', duration: 45 },
      { text: 'Respira.\nMira a quien fuiste sin rencor.', duration: 55 },
      { text: 'Te trajo hasta aquí.\nPero no llega a donde vas.', duration: 70 },
      { text: 'Sus miedos, sus excusas,\nsus límites viejos.', duration: 65 },
      { text: 'Déjalos ir en la exhalación.\nNo los necesitas más.', duration: 75 },
      { text: 'Lo que sueltas\nlibera espacio para quien llegas a ser.', duration: 60 },
      { text: 'Abre los ojos.\nAvanza más ligero.', duration: 30 },
    ],
  },

  // ─── DECISIÓN — claridad estratégica, soltar el ruido ──────────────────────
  {
    id: 'claridad-antes-de-decidir',
    title: 'Claridad Antes de Decidir',
    durationMinutes: 7,
    category: 'decisión',
    description: 'Limpia la mente y entra a la decisión viendo el tablero completo.',
    ambientType: 'pink',
    phases: [
      { text: 'Postura firme.\nNo vas a decidir corriendo.', duration: 30 },
      { text: 'Nombra en silencio\nla decisión que tienes delante.', duration: 60 },
      { text: 'Suelta el resultado que deseas.\nMira solo lo que es.', duration: 60 },
      { text: 'Separa el dato\nde la historia que le montaste encima.', duration: 75 },
      { text: 'Pregúntate qué decidirías\nsi nadie estuviera mirando.', duration: 75 },
      { text: 'Observa el tablero completo,\nno solo la casilla que te aprieta.', duration: 75 },
      { text: 'La claridad no se busca.\nSe deja aparecer cuando callas el resto.', duration: 60 },
      { text: 'Abres los ojos viendo.\nAhora sí, decides.', duration: 45 },
    ],
  },
  {
    id: 'soltar-el-ruido',
    title: 'Soltar el Ruido',
    durationMinutes: 6,
    category: 'decisión',
    description: 'Baja el volumen de las opiniones ajenas y recupera tu voz.',
    ambientType: 'pink',
    phases: [
      { text: 'Cierra los ojos.\nEl ruido no es información.', duration: 30 },
      { text: 'Escucha todas las voces\nque opinan sobre tu decisión.', duration: 60 },
      { text: 'Una por una,\nbájales el volumen.', duration: 75 },
      { text: 'La opinión del que no paga el costo\nno entra al cuarto.', duration: 75 },
      { text: 'Bajo el ruido hay una voz.\nLa tuya. Llevas rato sin oírla.', duration: 75 },
      { text: 'No negocio con el ruido.\nDecido desde lo que sé que es cierto.', duration: 75 },
      { text: 'Silencio.\nAhí está tu criterio, intacto.', duration: 60 },
    ],
  },
  {
    id: 'la-decision-dificil',
    title: 'La Decisión Difícil',
    durationMinutes: 8,
    category: 'decisión',
    description: 'Enfrenta de pie la decisión que llevas días evitando.',
    ambientType: 'brown',
    phases: [
      { text: 'Respira hondo.\nLa que evitas es la que importa.', duration: 45 },
      { text: 'Trae a la mente esa decisión\nque vienes esquivando.', duration: 60 },
      { text: 'No es difícil por compleja.\nEs difícil porque algo te va a costar.', duration: 75 },
      { text: 'Nombra ese costo.\nMíralo de frente, sin adornarlo.', duration: 90 },
      { text: 'Ahora mira el costo de no decidir.\nEse también se paga, en silencio.', duration: 90 },
      { text: 'El operador no elige sin dolor.\nElige cuál dolor vale la pena.', duration: 90 },
      { text: 'El obstáculo es el camino.\nAtravesarlo es la única salida.', duration: 75 },
      { text: 'Ya sabes qué toca.\nLo demás es valor.', duration: 55 },
    ],
  },
  {
    id: 'criterio-vs-urgencia',
    title: 'Criterio vs Urgencia',
    durationMinutes: 7,
    category: 'decisión',
    description: 'Distingue lo que arde de lo que importa antes de mover ficha.',
    ambientType: 'pink',
    phases: [
      { text: 'Detente.\nLa urgencia quiere que decidas ya.', duration: 30 },
      { text: 'Siente la prisa en el cuerpo.\nNo la obedezcas. Solo obsérvala.', duration: 60 },
      { text: 'Pregunta: ¿esto es importante\no solo está gritando más fuerte?', duration: 75 },
      { text: 'Lo urgente caduca hoy.\nLo importante define el año.', duration: 75 },
      { text: 'Imagina esta decisión\ndesde ti mismo dentro de un año.', duration: 75 },
      { text: 'Desde ahí, el incendio de hoy\nse ve pequeño.', duration: 60 },
      { text: 'Hoy mando desde criterio,\nno desde urgencia.', duration: 60 },
      { text: 'Abres los ojos sin prisa.\nDecides a tu ritmo, no al del fuego.', duration: 45 },
    ],
  },
  {
    id: 'el-costo-de-no-decidir',
    title: 'El Costo de No Decidir',
    durationMinutes: 6,
    category: 'decisión',
    description: 'Haz visible el precio de la indecisión y recupera el mando.',
    ambientType: 'white',
    phases: [
      { text: 'Quédate quieto.\nNo decidir también es decidir.', duration: 30 },
      { text: 'Trae esa elección\nque llevas semanas en pausa.', duration: 60 },
      { text: 'Mientras dudas, la decisión\nla está tomando el tiempo por ti.', duration: 75 },
      { text: 'Calcula lo que cada día de espera\nte está cobrando en silencio.', duration: 75 },
      { text: 'La indecisión no es neutral.\nEs una sangría lenta de energía.', duration: 75 },
      { text: 'Recupera el mando.\nElige, aunque elijas esperar a conciencia.', duration: 60 },
      { text: 'Decidir cierra puertas.\nNo decidir las pudre todas abiertas.', duration: 60 },
      { text: 'Respira.\nEl soberano decide. El resto deriva.', duration: 45 },
    ],
  },

  // ─── ENERGÍA — activación, recarga, picos de fatiga ────────────────────────
  {
    id: 'activacion-matutina',
    title: 'Activación Matutina',
    durationMinutes: 5,
    category: 'energía',
    description: 'Enciende el cuerpo y la mente para arrancar el día con fuerza.',
    ambientType: 'pink',
    phases: [
      { text: 'De pie o sentado, columna recta.\nInhala fuerte por la nariz.', duration: 30 },
      { text: 'Aprieta los puños.\nTensa todo el cuerpo tres segundos.', duration: 40 },
      { text: 'Suelta de golpe.\nSiente la sangre moverse.', duration: 45 },
      { text: 'Tres inhalaciones rápidas.\nLlena el pecho de combustible.', duration: 60 },
      { text: 'El día no empieza solo.\nLo enciendes tú.', duration: 60 },
      { text: 'Cuando abras los ojos,\nla primera acción ya está decidida.', duration: 65 },
    ],
  },
  {
    id: 'recarga-mediodia',
    title: 'Recarga de Mediodía',
    durationMinutes: 5,
    category: 'energía',
    description: 'Reinicia el sistema en mitad de la jornada y vuelve afilado.',
    ambientType: 'pink',
    phases: [
      { text: 'Cierra los ojos un momento.\nLa mañana ya cumplió.', duration: 35 },
      { text: 'Inhala por la nariz, profundo.\nExhala soltando la fatiga.', duration: 50 },
      { text: 'Rueda los hombros hacia atrás.\nDespeja la tensión acumulada.', duration: 50 },
      { text: 'Tres respiraciones potentes.\nRecarga el tanque.', duration: 55 },
      { text: 'No arrastres la mañana a la tarde.\nEmpiezas de nuevo.', duration: 55 },
      { text: 'Define la próxima victoria.\nVuelve a la mesa con hambre.', duration: 55 },
    ],
  },
  {
    id: 'salir-del-bajon',
    title: 'Salir del Bajón',
    durationMinutes: 4,
    category: 'energía',
    description: 'Recupera el foco en el pico de fatiga y rompe la inercia.',
    ambientType: 'pink',
    phases: [
      { text: 'El bajón es físico, no es identidad.\nLo atraviesas.', duration: 30 },
      { text: 'Inhala rápido por la nariz.\nExhala por la boca con fuerza.', duration: 45 },
      { text: 'Frota las manos.\nDespierta la circulación.', duration: 40 },
      { text: 'Una sola tarea.\nLa más pequeña que puedas ejecutar.', duration: 55 },
      { text: 'El operador no espera ganas.\nActúa y las ganas llegan.', duration: 70 },
    ],
  },
  {
    id: 'pre-entreno',
    title: 'Pre-Entreno',
    durationMinutes: 4,
    category: 'energía',
    description: 'Activa el cuerpo y la determinación antes de entrenar.',
    ambientType: 'pink',
    phases: [
      { text: 'Postura firme.\nEste cuerpo está a punto de trabajar.', duration: 30 },
      { text: 'Respiraciones cortas y rápidas.\nSube las pulsaciones.', duration: 45 },
      { text: 'Tensa cada músculo.\nDespierta lo que vas a usar.', duration: 45 },
      { text: 'Visualiza la primera serie.\nYa la estás dominando.', duration: 55 },
      { text: 'No negocias con la pereza.\nEntras y ejecutas.', duration: 65 },
    ],
  },
  {
    id: 'segundo-aire',
    title: 'Segundo Aire',
    durationMinutes: 5,
    category: 'energía',
    description: 'Encuentra la reserva oculta para cerrar el día con potencia.',
    ambientType: 'pink',
    phases: [
      { text: 'Queda jornada por delante.\nQueda combustible dentro.', duration: 35 },
      { text: 'Inhala profundo, retén un segundo.\nExhala con decisión.', duration: 50 },
      { text: 'Endereza la espalda.\nLevanta el mentón.', duration: 45 },
      { text: 'El cansancio dice "para".\nEl criterio dice "una más".', duration: 60 },
      { text: 'Reserva tu segundo aire.\nSiempre hay una marcha más.', duration: 55 },
      { text: 'Cuando abras los ojos,\ncierra lo que empezaste.', duration: 55 },
    ],
  },

  // ─── MAÑANA (expansión) — arranque del día ─────────────────────────────────
  {
    id: 'la-primera-hora',
    title: 'La Primera Hora',
    durationMinutes: 6,
    category: 'mañana',
    description: 'Toma el control de la primera hora antes de que el día te lo tome.',
    ambientType: 'pink',
    phases: [
      { text: 'Acabas de despertar.\nEsta hora decide el resto del día.', duration: 45 },
      { text: 'Antes de tocar el teléfono,\nrespira tres veces, profundo.', duration: 50 },
      { text: 'El que revisa mensajes al despertar\nempieza obedeciendo agendas ajenas.', duration: 55 },
      { text: 'Hoy no.\nLa primera hora es tuya.', duration: 50 },
      { text: 'Define lo primero que vas a ejecutar.\nUna acción, no una lista.', duration: 60 },
      { text: 'Siente el cuerpo despertar\nbajo tu mando, no bajo la prisa.', duration: 55 },
      { text: 'Abre los ojos.\nGobierna tu primera hora.', duration: 45 },
    ],
  },
  {
    id: 'intencion-del-dia',
    title: 'Intención del Día',
    durationMinutes: 6,
    category: 'mañana',
    description: 'Fija una sola intención que ordene cada decisión de la jornada.',
    ambientType: 'pink',
    phases: [
      { text: 'Siéntate firme.\nUn día sin intención lo dirige el azar.', duration: 45 },
      { text: 'Respira y pregúntate:\n¿quién quiero ser hoy?', duration: 55 },
      { text: 'No qué quiero hacer.\nQuién quiero ser mientras lo hago.', duration: 60 },
      { text: 'Elige una palabra.\nFoco. Calma. Coraje. La que toque hoy.', duration: 55 },
      { text: 'Esa palabra es tu filtro.\nCada decisión pasa por ella.', duration: 55 },
      { text: 'Establece tu intención\npara las próximas horas.', duration: 50 },
      { text: 'Abre los ojos.\nVive el día desde esa palabra.', duration: 40 },
    ],
  },
  {
    id: 'claridad-matutina',
    title: 'Claridad Matutina',
    durationMinutes: 6,
    category: 'mañana',
    description: 'Disuelve la niebla mental del despertar y entra al día viendo claro.',
    ambientType: 'pink',
    phases: [
      { text: 'La mente al despertar\nes niebla. Vamos a despejarla.', duration: 45 },
      { text: 'Inhala por la nariz, lento.\nExhala soltando el sueño pesado.', duration: 55 },
      { text: 'Deja que los pensamientos\npasen sin engancharte.', duration: 60 },
      { text: 'Bajo la niebla\nya sabes qué importa hoy.', duration: 55 },
      { text: 'Que aparezca solo,\nsin forzarlo.', duration: 55 },
      { text: 'La claridad no se piensa.\nSe deja emerger.', duration: 50 },
      { text: 'Abre los ojos.\nVe el día con criterio limpio.', duration: 40 },
    ],
  },
  {
    id: 'gratitud-al-despertar',
    title: 'Gratitud al Despertar',
    durationMinutes: 6,
    category: 'mañana',
    description: 'Arranca desde la abundancia que ya tienes, no desde lo que falta.',
    ambientType: 'pink',
    phases: [
      { text: 'Despertaste.\nNo todos tuvieron ese privilegio hoy.', duration: 45 },
      { text: 'Respira y reconoce\nque el cuerpo responde, el aire entra.', duration: 55 },
      { text: 'El que empieza desde la carencia\npersigue todo el día.', duration: 60 },
      { text: 'Reconoce tres cosas\nque ya tienes ahora mismo.', duration: 60 },
      { text: 'No es debilidad.\nEs el operador que sabe lo que posee.', duration: 50 },
      { text: 'Siente gratitud\npor este momento de claridad.', duration: 50 },
      { text: 'Abre los ojos.\nConstruye desde lo que ya es tuyo.', duration: 40 },
    ],
  },
  {
    id: 'el-plan-de-batalla',
    title: 'El Plan de Batalla',
    durationMinutes: 6,
    category: 'mañana',
    description: 'Visualiza las tres batallas del día y entra a librarlas con ventaja.',
    ambientType: 'pink',
    phases: [
      { text: 'Postura de comandante.\nEl día es terreno a conquistar.', duration: 45 },
      { text: 'Respira hondo.\nUn general no improvisa el ataque.', duration: 50 },
      { text: 'Identifica las tres batallas\nque definen hoy tu avance.', duration: 60 },
      { text: 'Visualízate ganando cada una.\nMira el movimiento exacto.', duration: 65 },
      { text: 'Lo que se anticipa en la mente\nse ejecuta sin titubeo en el campo.', duration: 55 },
      { text: 'El resto son escaramuzas.\nNo gastes pólvora en ellas.', duration: 50 },
      { text: 'Abre los ojos.\nEntra al día con el plan trazado.', duration: 35 },
    ],
  },

  // ─── NOCHE (expansión) — cierre del día ────────────────────────────────────
  {
    id: 'descarga-mental',
    title: 'Descarga Mental',
    durationMinutes: 8,
    category: 'noche',
    description: 'Vacía la mente de pendientes para que el sueño no cargue con ellos.',
    ambientType: 'brown',
    phases: [
      { text: 'El día terminó.\nDeja que tu cuerpo lo sepa.', duration: 45 },
      { text: 'Tu mente sigue corriendo.\nNo la pelees. Solo obsérvala.', duration: 60 },
      { text: 'Nombra el pendiente que más pesa.\nReconócelo sin resolverlo ahora.', duration: 60 },
      { text: 'Imagina que lo escribes\ny lo dejas fuera de la habitación.', duration: 60 },
      { text: 'Haz lo mismo con cada tarea\nque tu mente intenta sostener.', duration: 75 },
      { text: 'Nada de esto requiere tu vigilancia\nmientras duermes.', duration: 60 },
      { text: 'La mente vacía no es debilidad.\nEs el operador que confía en su sistema.', duration: 60 },
      { text: 'Respira.\nMañana retomas el control con todo.', duration: 60 },
    ],
  },
  {
    id: 'soltar-lo-no-resuelto',
    title: 'Soltar lo No Resuelto',
    durationMinutes: 8,
    category: 'noche',
    description: 'Perdona, suelta y libera lo que quedó abierto sin cargarlo a la noche.',
    ambientType: 'brown',
    phases: [
      { text: 'Hoy quedaron cosas abiertas.\nAsí funciona el juego.', duration: 50 },
      { text: 'Trae a tu mente eso que no cerró.\nEl error, la tensión, lo no dicho.', duration: 60 },
      { text: 'No lo justifiques ni lo castigues.\nSolo míralo de frente.', duration: 60 },
      { text: 'El rencor es peso muerto.\nUn soberano no carga lo que no le sirve.', duration: 60 },
      { text: 'Perdona al otro.\nNo por él. Por tu descanso.', duration: 60 },
      { text: 'Perdónate a ti.\nHiciste con el criterio que tenías.', duration: 75 },
      { text: 'Suelta el peso del día.\nEstás a salvo.', duration: 60 },
      { text: 'Lo no resuelto seguirá ahí mañana.\nHoy ya no es tu carga.', duration: 55 },
    ],
  },
  {
    id: 'revision-del-operador',
    title: 'Revisión del Operador',
    durationMinutes: 8,
    category: 'noche',
    description: 'Audita tu día con criterio frío: qué ejecutaste, qué corriges mañana.',
    ambientType: 'brown',
    phases: [
      { text: 'El día cerró.\nAhora toca la revisión, sin emoción.', duration: 50 },
      { text: 'Recuerda la acción más importante\nque ejecutaste hoy.', duration: 60 },
      { text: 'Reconócela.\nEse movimiento te acercó a tu norte.', duration: 60 },
      { text: 'Ahora identifica una decisión\nque tomarías distinto.', duration: 60 },
      { text: 'No es culpa. Es data.\nEl operador revisa para ajustar.', duration: 60 },
      { text: 'Define la corrección\nen una sola frase clara.', duration: 75 },
      { text: 'Guárdala para mañana.\nHoy ya cumpliste tu parte.', duration: 60 },
      { text: 'Cierra la auditoría.\nDescansa quien ejecutó con criterio.', duration: 55 },
    ],
  },
  {
    id: 'antesala-del-sueno',
    title: 'Antesala del Sueño',
    durationMinutes: 8,
    category: 'noche',
    description: 'Lleva el cuerpo del estado de mando al estado de reposo profundo.',
    ambientType: 'brown',
    phases: [
      { text: 'Todo el día estuviste en mando.\nAhora bajas la guardia a propósito.', duration: 50 },
      { text: 'Afloja la mandíbula.\nLlevas horas apretándola sin saberlo.', duration: 60 },
      { text: 'Suelta los hombros.\nDeja que el peso caiga hacia la cama.', duration: 60 },
      { text: 'Tu respiración se vuelve más lenta.\nNo la fuerzas. La permites.', duration: 60 },
      { text: 'El cuerpo entiende la señal.\nYa no hay nada que defender.', duration: 75 },
      { text: 'Cada exhalación te hunde\nun poco más en el descanso.', duration: 60 },
      { text: 'No necesitas vigilar nada.\nEl sistema te sostiene mientras duermes.', duration: 60 },
      { text: 'Déjate ir.\nEl sueño es donde se reconstruye el soberano.', duration: 55 },
    ],
  },
  {
    id: 'cerrar-cuentas-del-dia',
    title: 'Cerrar Cuentas del Día',
    durationMinutes: 8,
    category: 'noche',
    description: 'Salda el balance del día con gratitud antes de apagar la jornada.',
    ambientType: 'brown',
    phases: [
      { text: 'Hora de cerrar cuentas.\nEl día se liquida antes de dormir.', duration: 50 },
      { text: 'Repasa lo que recibiste hoy.\nUna oportunidad, un aprendizaje, un apoyo.', duration: 60 },
      { text: 'El mercader sabe lo que tiene.\nReconoce tres cosas que hoy sumaron.', duration: 75 },
      { text: 'Gratitud por lo que está,\nno reclamo por lo que falta.', duration: 60 },
      { text: 'Salda también contigo.\nDiste lo que tenías para dar hoy.', duration: 60 },
      { text: 'El balance queda en cero.\nNada pendiente de cobrar esta noche.', duration: 60 },
      { text: 'Cierra el libro del día.\nMañana abres una página limpia.', duration: 60 },
      { text: 'Respira y permítete descansar.\nLas cuentas están en orden.', duration: 55 },
    ],
  },

  // ─── ENFOQUE (expansión) — concentración antes de ejecutar ─────────────────
  {
    id: 'pre-bloque-profundo',
    title: 'Antes del Bloque Profundo',
    durationMinutes: 6,
    category: 'enfoque',
    description: 'Calibra tu mente justo antes de entrar al trabajo profundo.',
    ambientType: 'pink',
    phases: [
      { text: 'Antes de abrir nada,\nsiéntate. Columna recta.', duration: 30 },
      { text: 'Tres respiraciones lentas.\nBaja las revoluciones.', duration: 45 },
      { text: 'Nombra el bloque que viene.\nUna tarea, un resultado.', duration: 60 },
      { text: 'Define cómo se ve terminado.\nSi no lo ves, no lo ejecutas.', duration: 60 },
      { text: 'Pon límite al ruido:\nsin notificaciones, sin pestañas, sin excusas.', duration: 60 },
      { text: 'El operador no espera ganas.\nEspera la hora. Y la hora es ahora.', duration: 75 },
      { text: 'Abre los ojos.\nEntra al bloque y no salgas hasta terminar.', duration: 30 },
    ],
  },
  {
    id: 'reset-de-atencion',
    title: 'Reset de Atención',
    durationMinutes: 6,
    category: 'enfoque',
    description: 'Recupera el foco cuando la mente ya se dispersó.',
    ambientType: 'white',
    phases: [
      { text: 'Tu atención se fugó.\nNo te juzgues. Recupérala.', duration: 30 },
      { text: 'Cierra los ojos.\nSuelta la pantalla que te tenía.', duration: 45 },
      { text: 'Respira por la nariz.\nCuenta cuatro entrando, seis saliendo.', duration: 60 },
      { text: 'Observa el pensamiento que te sacó.\nMíralo. No lo persigas.', duration: 60 },
      { text: 'Déjalo pasar de largo.\nNo es tu trabajo de ahora.', duration: 60 },
      { text: 'Vuelve a la única tarea.\nLa que dejaste a medias.', duration: 60 },
      { text: 'Atención recalibrada.\nRetoma justo donde la perdiste.', duration: 45 },
    ],
  },
  {
    id: 'un-solo-objetivo',
    title: 'Un Solo Objetivo',
    durationMinutes: 6,
    category: 'enfoque',
    description: 'Reduce el día a la única cosa que mueve la aguja.',
    ambientType: 'pink',
    phases: [
      { text: 'Postura firme.\nMentón paralelo al suelo.', duration: 30 },
      { text: 'Tienes mil cosas en la cabeza.\nVamos a tirar 999.', duration: 45 },
      { text: 'Pregúntate:\n¿qué cosa, si la hago, vuelve el resto irrelevante?', duration: 75 },
      { text: 'Esa es. No la negocies.\nEse es tu objetivo único.', duration: 60 },
      { text: 'Lo demás puede esperar.\nDelegado, agendado o descartado.', duration: 60 },
      { text: 'Modo mercader:\nun objetivo, toda la energía.', duration: 60 },
      { text: 'Cuando abras los ojos,\nvas a por esa. Solo por esa.', duration: 30 },
    ],
  },
  {
    id: 'eliminar-la-distraccion',
    title: 'Eliminar la Distracción',
    durationMinutes: 6,
    category: 'enfoque',
    description: 'Limpia el campo mental de todo lo que no es tu tarea.',
    ambientType: 'white',
    phases: [
      { text: 'Quieto.\nManos sobre las piernas, ojos cerrados.', duration: 30 },
      { text: 'Imagina tu mente como una mesa.\nAhora mismo está saturada.', duration: 45 },
      { text: 'Una por una, retira las distracciones.\nEl teléfono, fuera.', duration: 60 },
      { text: 'Las conversaciones pendientes, fuera.\nEl ruido de fondo, fuera.', duration: 60 },
      { text: 'Sobre la mesa queda una sola cosa:\ntu tarea.', duration: 60 },
      { text: 'Elimina mentalmente\ntodo lo que no es esa tarea.', duration: 75 },
      { text: 'Campo limpio.\nNada compite por tu criterio. Ejecuta.', duration: 30 },
    ],
  },
  {
    id: 'entrar-en-flow',
    title: 'Entrar en Flow',
    durationMinutes: 6,
    category: 'enfoque',
    description: 'Cruza el umbral hacia el estado donde el trabajo se ejecuta solo.',
    ambientType: 'pink',
    phases: [
      { text: 'Respira hondo.\nVamos a cruzar un umbral.', duration: 30 },
      { text: 'El flow no llega rogando.\nSe entra con disciplina, no con suerte.', duration: 45 },
      { text: 'Fija un punto frente a ti.\nDeja que el resto se vuelva borroso.', duration: 60 },
      { text: 'El reto es alto, tu habilidad también.\nAhí vive el estado.', duration: 60 },
      { text: 'Suelta el reloj.\nSuelta el resultado. Quédate en la acción.', duration: 60 },
      { text: 'Da el primer movimiento limpio.\nEl segundo viene solo.', duration: 75 },
      { text: 'Estás dentro.\nNo lo pienses más. Trabaja.', duration: 30 },
    ],
  },

  // ─── ESTRÉS (expansión) — regulación del sistema nervioso ──────────────────
  {
    id: 'ansiedad-aguda',
    title: 'Ancla en la Tormenta',
    durationMinutes: 7,
    category: 'estrés',
    description: 'Corta el pico de ansiedad y devuelve el control en minutos.',
    ambientType: 'brown',
    phases: [
      { text: 'La ansiedad llegó.\nNo la combatas. Obsérvala.', duration: 40 },
      { text: 'Apoya los pies en el suelo.\nSiente el peso de tu cuerpo.', duration: 50 },
      { text: 'Nombra cinco cosas\nque ves a tu alrededor.', duration: 70 },
      { text: 'Inhala por 4.\nExhala largo por 6.', duration: 80 },
      { text: 'Esto es una ola.\nLas olas siempre bajan.', duration: 70 },
      { text: 'Estás seguro.\nNo hay nada que resolver ahora.', duration: 80 },
      { text: 'El criterio vuelve.\nTú decides, no la alarma.', duration: 30 },
    ],
  },
  {
    id: 'bajo-presion',
    title: 'Bajo Presión',
    durationMinutes: 8,
    category: 'estrés',
    description: 'Despeja la sobrecarga y recupera el mando cuando todo aprieta.',
    ambientType: 'brown',
    phases: [
      { text: 'Todo pesa a la vez.\nDetente diez segundos.', duration: 40 },
      { text: 'Respira hondo.\nLa carga no desaparece, pero tú te ordenas.', duration: 60 },
      { text: 'Solo existe la siguiente acción.\nUna, no diez.', duration: 70 },
      { text: 'Suelta lo que no controlas.\nNo es tu batalla ahora.', duration: 70 },
      { text: 'El operador no corre.\nElige y ejecuta.', duration: 70 },
      { text: 'Hombros abajo.\nMandíbula suelta. Sigues al mando.', duration: 60 },
      { text: 'La presión es combustible\ncuando tienes criterio.', duration: 60 },
      { text: 'Abre los ojos.\nUn paso firme a la vez.', duration: 50 },
    ],
  },
  {
    id: 'regular-antes-reaccionar',
    title: 'El Espacio Antes',
    durationMinutes: 7,
    category: 'estrés',
    description: 'Crea el espacio entre el estímulo y tu respuesta para no reaccionar en caliente.',
    ambientType: 'brown',
    phases: [
      { text: 'Algo te activó.\nAntes de responder, frena.', duration: 40 },
      { text: 'Inhala profundo.\nEntre el golpe y tu reacción hay un espacio.', duration: 60 },
      { text: 'En ese espacio\nvive tu poder.', duration: 60 },
      { text: 'Tu cuerpo quiere reaccionar.\nDeja que el impulso pase.', duration: 70 },
      { text: 'Pregúntate:\n¿esto importará mañana?', duration: 70 },
      { text: 'El soberano responde.\nEl esclavo reacciona.', duration: 60 },
      { text: 'Ahora elige tu respuesta\ncon criterio, no con ira.', duration: 60 },
    ],
  },
  {
    id: 'calma-corporal-total',
    title: 'Calma Corporal Total',
    durationMinutes: 9,
    category: 'estrés',
    description: 'Recorre y descarga la tensión física acumulada de pies a cabeza.',
    ambientType: 'brown',
    phases: [
      { text: 'Recuéstate o siéntate.\nEl trabajo de hoy se quedó en el cuerpo.', duration: 45 },
      { text: 'Lleva la atención a tus pies.\nTénsalos y suéltalos.', duration: 70 },
      { text: 'Sube a las piernas.\nDeja que pesen contra el suelo.', duration: 70 },
      { text: 'Afloja el vientre.\nNada que sostener aquí.', duration: 70 },
      { text: 'Suelta los hombros,\nlos brazos, las manos.', duration: 75 },
      { text: 'Relaja la mandíbula,\nla lengua, la frente.', duration: 75 },
      { text: 'Todo el cuerpo descansa.\nLa tensión se vacía.', duration: 90 },
      { text: 'Respira lento.\nEstás en calma, de la cabeza a los pies.', duration: 75 },
    ],
  },
];

// ─── Breathing Techniques ─────────────────────────────────────────────────────

export interface BreathPhase {
  label: 'INHALA' | 'RETÉN' | 'EXHALA';
  duration: number; // seconds
  scale: number;    // circle scale target (0.7 - 1.5)
}

export interface BreathingTechnique {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  benefit: string;
  cycles: number; // default cycles
  phases: BreathPhase[];
  icon: string;
}

export const BREATHING_TECHNIQUES: BreathingTechnique[] = [
  {
    id: '4-7-8',
    title: '4 · 7 · 8',
    subtitle: 'Calma profunda',
    description: 'Inhala 4s · Retén 7s · Exhala 8s',
    benefit: 'Activa el parasimpático. Reduce ansiedad en minutos.',
    cycles: 4,
    icon: 'air',
    phases: [
      { label: 'INHALA', duration: 4, scale: 1.4 },
      { label: 'RETÉN',  duration: 7, scale: 1.4 },
      { label: 'EXHALA', duration: 8, scale: 0.7 },
    ],
  },
  {
    id: 'box',
    title: 'BOX',
    subtitle: 'Enfoque y control',
    description: 'Inhala 4s · Retén 4s · Exhala 4s · Retén 4s',
    benefit: 'Usado por fuerzas especiales. Calma sin adormecimiento.',
    cycles: 5,
    icon: 'crop-square',
    phases: [
      { label: 'INHALA', duration: 4, scale: 1.4 },
      { label: 'RETÉN',  duration: 4, scale: 1.4 },
      { label: 'EXHALA', duration: 4, scale: 0.7 },
      { label: 'RETÉN',  duration: 4, scale: 0.7 },
    ],
  },
  {
    id: 'coherente',
    title: '5 · 5',
    subtitle: 'Coherencia cardíaca',
    description: 'Inhala 5s · Exhala 5s',
    benefit: 'Sincroniza corazón y cerebro. Estado de flow.',
    cycles: 6,
    icon: 'favorite',
    phases: [
      { label: 'INHALA', duration: 5, scale: 1.35 },
      { label: 'EXHALA', duration: 5, scale: 0.75 },
    ],
  },
  {
    id: 'wim-hof',
    title: 'WIM HOF',
    subtitle: 'Energía y activación',
    description: '30 resp. rápidas · Retención · Recuperación',
    benefit: 'Eleva energía y claridad mental. Activa el sistema.',
    cycles: 3,
    icon: 'bolt',
    phases: [
      { label: 'INHALA', duration: 1.5, scale: 1.5 },
      { label: 'EXHALA', duration: 1.5, scale: 0.7 },
      // After 30 cycles, hold — handled specially in the component
    ],
  },
  {
    id: 'fisiologica',
    title: 'SUSPIRO FISIOLÓGICO',
    subtitle: 'Reset rápido de estrés',
    description: 'Doble inhalación nasal · Exhalación larga por boca',
    benefit: 'Reinfla los alvéolos y descarga CO2 de golpe. Baja el estrés en 1-2 respiraciones.',
    cycles: 5,
    icon: 'air',
    phases: [
      { label: 'INHALA', duration: 2, scale: 1.25 },
      { label: 'INHALA', duration: 1, scale: 1.45 },
      { label: 'EXHALA', duration: 6, scale: 0.7 },
    ],
  },
  {
    id: 'nadi-shodhana',
    title: 'RESPIRACIÓN ALTERNA',
    subtitle: 'Equilibrio y claridad',
    description: 'Inhala · Retén · Exhala alternando fosas nasales',
    benefit: 'Equilibra los dos hemisferios. Ordena la mente y afina la claridad.',
    cycles: 6,
    icon: 'sync',
    phases: [
      { label: 'INHALA', duration: 4, scale: 1.4 },
      { label: 'RETÉN',  duration: 4, scale: 1.4 },
      { label: 'EXHALA', duration: 6, scale: 0.7 },
    ],
  },
  {
    id: '2-1',
    title: 'EXHALACIÓN 2:1',
    subtitle: 'Calma parasimpática',
    description: 'Inhala 4s · Exhala 8s',
    benefit: 'La exhalación larga activa el nervio vago. Frena el ritmo cardíaco y relaja.',
    cycles: 6,
    icon: 'waves',
    phases: [
      { label: 'INHALA', duration: 4, scale: 1.4 },
      { label: 'EXHALA', duration: 8, scale: 0.7 },
    ],
  },
  {
    id: 'tummo',
    title: 'TUMMO SIMPLE',
    subtitle: 'Calor y energía interna',
    description: 'Inhala fuerte · Exhala con fuerza',
    benefit: 'Respiración tibetana del calor interno. Genera energía y enciende el cuerpo.',
    cycles: 4,
    icon: 'whatshot',
    phases: [
      { label: 'INHALA', duration: 2, scale: 1.5 },
      { label: 'EXHALA', duration: 2, scale: 0.7 },
    ],
  },
];

// ─── Binaural Presets ─────────────────────────────────────────────────────────

export interface BinauralPreset {
  id: string;
  label: string;
  beatHz: number;       // binaural beat difference
  carrierHz: number;    // base carrier frequency
  description: string;
  benefit: string;
  icon: string;
  color: string;
}

export const BINAURAL_PRESETS: BinauralPreset[] = [
  {
    id: 'delta',
    label: 'DELTA',
    beatHz: 2,
    carrierHz: 200,
    description: '0.5 – 4 Hz',
    benefit: 'Sueño profundo · Recuperación · Reparación',
    icon: 'bedtime',
    color: '#4a6fa5',
  },
  {
    id: 'theta',
    label: 'THETA',
    beatHz: 6,
    carrierHz: 200,
    description: '4 – 8 Hz',
    benefit: 'Meditación profunda · Creatividad · Insight',
    icon: 'self-improvement',
    color: '#7c5cbf',
  },
  {
    id: 'alpha',
    label: 'ALPHA',
    beatHz: 10,
    carrierHz: 200,
    description: '8 – 14 Hz',
    benefit: 'Relajación activa · Estado de Flow · Calma alerta',
    icon: 'water',
    color: '#2e7d52',
  },
  {
    id: 'beta',
    label: 'BETA',
    beatHz: 20,
    carrierHz: 200,
    description: '14 – 30 Hz',
    benefit: 'Concentración · Alerta mental · Productividad',
    icon: 'psychology',
    color: '#b07d1a',
  },
  {
    id: 'gamma',
    label: 'GAMMA',
    beatHz: 40,
    carrierHz: 200,
    description: '30 – 100 Hz',
    benefit: 'Alta cognición · Integración · Claridad máxima',
    icon: 'bolt',
    color: '#c0392b',
  },
];

export type AmbienceType = 'none' | 'rain' | 'forest' | 'ocean';

export const AMBIENCE_OPTIONS: { id: AmbienceType; label: string; icon: string }[] = [
  { id: 'none',   label: 'SOLO TONO', icon: 'music-note' },
  { id: 'rain',   label: 'LLUVIA',    icon: 'water-drop' },
  { id: 'forest', label: 'BOSQUE',    icon: 'park' },
  { id: 'ocean',  label: 'OCÉANO',    icon: 'waves' },
];

export const TIMER_OPTIONS = [5, 10, 20, 30] as const;
