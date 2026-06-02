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
