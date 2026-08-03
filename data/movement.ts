// ─── LifeFlow Movement ────────────────────────────────────────────────────────
// Catálogo de movimientos guiados. Mismo shape que MeditationSession/GuidedPhase
// (data/wellness.ts) para reusar el patrón de reproductor por fases.

// Extensión explícita a propósito: el generador de voz (Node,
// --experimental-strip-types) no resuelve imports de VALORES sin extensión —
// mismo motivo por el que data/sleep.ts tiene el comentario equivalente.
// `allowImportingTsExtensions` ya está activado en tsconfig.json para esto.
import { estimateVoiceSeconds, normanVoiceUrl, type GuidedPhase } from './wellness.ts';

export type MovementCategory = 'flow' | 'circuito';

export const MOVEMENT_CATEGORY_META: Record<MovementCategory, { label: string; description: string }> = {
  flow:     { label: 'FLOW',     description: 'Secuencia guiada de respiración y movimiento.' },
  circuito: { label: 'CIRCUITO', description: 'Combina movimiento con una decisión o registro concreto.' },
};

export interface MovementPractice {
  id: string;
  title: string;
  durationMinutes: number;
  category: MovementCategory;
  level: 'principiante' | 'intermedio' | 'avanzado';
  description: string;
  phases: GuidedPhase[];
  /**
   * La voz de Norman narra cada fase desde un mp3 propio (mismo mecanismo que
   * `MeditationSession.narrated` en data/wellness.ts). Los 3 circuitos no lo
   * declaran todavía — no tienen guion narrado, solo texto en pantalla.
   */
  narrated?: boolean;
}

/**
 * Fases de una práctica narrada, listas para `createNarrationPlayer`.
 * Mismo cálculo que `meditationPhasesToNarration` (data/wellness.ts): el
 * `pauseAfter` explícito si lo hay, o todo lo que sobra de `duration` después
 * de hablar. No se reusa esa función directamente porque `MovementPractice`
 * no tiene la forma de `MeditationSession` (sin `ambientType`/`category` de
 * meditación) — la lógica es la misma, tres líneas, no vale la pena forzar
 * un cast.
 */
export function movementPhasesToNarration(practice: MovementPractice) {
  return practice.phases.map((p, i) => ({
    url: normanVoiceUrl(practice.id, p, i),
    duration: p.duration,
    pauseAfter: p.pauseAfter ?? Math.max(0, p.duration - estimateVoiceSeconds(p.text)),
  }));
}

export const MOVEMENT_PRACTICES: MovementPractice[] = [
  {
    id: 'flow-principiante',
    title: 'Flow principiante',
    durationMinutes: 2,
    category: 'flow',
    level: 'principiante',
    description: 'Tu primer estado honesto — cómo entrar, qué sentir, cómo sostenerlo antes de registrar cómo llegaste.',
    narrated: true,
    phases: [
      {
        id: 'entrada',
        text: 'Ponte de pie o siéntate, donde estés.\nEsto no es ejercicio: es notar honestamente cómo llegaste, antes de seguir con tu día.',
        duration: 14,
      },
      {
        id: 'pies',
        text: 'Siente los tres puntos de apoyo de cada pie contra el suelo.\nSi estás sentado, siente el peso del cuerpo sobre la silla.',
        duration: 14,
      },
      {
        id: 'hombros',
        text: 'Sube los hombros hacia las orejas al inhalar,\ny déjalos caer de golpe al exhalar. Repite una vez más.',
        duration: 16,
      },
      {
        id: 'manos',
        text: 'Abre las manos, dedos separados.\nRespira sin intentar cambiar nada todavía — solo mira qué está pasando.',
        duration: 16,
      },
      {
        id: 'observa',
        text: 'Nombra en silencio una palabra para cómo llegaste:\ncansado, disperso, tenso, bien. La que sea, sin corregirla.',
        duration: 16,
      },
      {
        id: 'sostener',
        text: 'Quédate ahí un momento más.\nNo necesitas sentirte mejor todavía — solo estar presente con lo que hay.',
        duration: 14,
      },
      {
        id: 'cierre',
        text: 'Eso es suficiente para empezar: cuerpo presente, atención honesta.\nAhora registra cómo llegaste.',
        duration: 16,
      },
    ],
  },
  {
    id: 'flow-recuperacion',
    title: 'Flow de recuperación',
    durationMinutes: 1,
    category: 'flow',
    level: 'principiante',
    description: 'Un minuto para volver al cuerpo cuando la energía está baja.',
    narrated: true,
    phases: [
      { id: 'postura', text: 'Separa los pies al ancho de la cadera.\nDeja caer los hombros, sin forzarlo.', duration: 12 },
      { id: 'inhala', text: 'Inhala por la nariz durante cuatro segundos,\nsintiendo cómo se expanden las costillas, no solo el pecho.', duration: 14 },
      { id: 'exhala', text: 'Exhala lentamente durante seis.\nDeja caer un poco más la cabeza y los brazos en cada salida.', duration: 14 },
      { id: 'repite', text: 'Vuelve al centro y repite el ciclo dos veces más,\na tu propio ritmo, sin apurarte.', duration: 16 },
      { id: 'nota', text: 'Nota si algo cambió en tu energía,\naunque sea poco.', duration: 10 },
      { id: 'cierre', text: 'Registra cómo llegaste y cómo te vas — ese dato es el que importa.', duration: 12 },
    ],
  },
  {
    id: 'flow-avanzado',
    title: 'Flow avanzado',
    durationMinutes: 1,
    category: 'flow',
    level: 'avanzado',
    description: 'Sostener la emoción con presencia — toques suaves y una frase honesta.',
    narrated: true,
    phases: [
      { id: 'inicio', text: 'Empieza con toques suaves y constantes\nen el canto de la mano, el punto de kárate.', duration: 10 },
      { id: 'nombra', text: 'Mientras tocas, nombra en una frase completa\nla emoción que está presente ahora mismo — no la evites.', duration: 14 },
      { id: 'puntos', text: 'Pasa a la ceja, después al lateral del ojo\ny luego a la clavícula. Ritmo constante, sin prisa.', duration: 14 },
      { id: 'respira', text: 'Mantén una respiración cómoda todo el tiempo.\nNo necesitas controlarla, solo dejarla pasar.', duration: 14 },
      { id: 'revisa', text: 'Vuelve a nombrar la emoción —\n¿cambió algo en su intensidad?', duration: 12 },
      { id: 'cierre', text: 'Termina con una mano en el pecho.\nRegistra qué cambió, aunque sea pequeño.', duration: 14 },
    ],
  },
  {
    // El id conserva el nombre de la pieza de origen (6 min). El guion es una
    // destilación de ~1 min, así que el TÍTULO no puede prometer seis: describe
    // para qué sirve, que es lo que el usuario necesita para elegir.
    id: 'flow-6-min',
    title: 'Flow de descarga',
    durationMinutes: 1,
    category: 'flow',
    level: 'intermedio',
    description: 'Descarga la carga de una reunión o conversación difícil.',
    narrated: true,
    phases: [
      { id: 'apertura', text: 'De pie o sentado, inhala por la nariz\nmientras abres el pecho y llevas los hombros hacia atrás.', duration: 14 },
      { id: 'giro-derecha', text: 'Exhala y gira el torso suavemente hacia la derecha,\nsin forzar el rango. Vuelve al centro.', duration: 14 },
      { id: 'giro-izquierda', text: 'Repite el giro hacia la izquierda,\ncon la misma exhalación larga.', duration: 12 },
      { id: 'exhalacion', text: 'Ahora acompaña cada giro con una exhalación\nmás larga que la inhalación — eso es lo que baja la carga.', duration: 16 },
      { id: 'brazos', text: 'Última ronda: sube los brazos al inhalar\ny déjalos caer de golpe al exhalar.', duration: 14 },
      { id: 'cierre', text: 'Siente el peso bajando de los hombros\ny de la mandíbula.', duration: 10 },
    ],
  },
  {
    id: 'tapping-seis-puntos',
    title: 'Tapping de seis puntos',
    durationMinutes: 1,
    category: 'flow',
    level: 'principiante',
    description: 'Baja la activación reconociendo la emoción en el cuerpo.',
    narrated: true,
    phases: [
      { id: 'ceja', text: 'Con dos dedos, da toques suaves y constantes\nen la ceja, cerca del entrecejo.', duration: 12 },
      { id: 'nombra', text: 'Mientras tocas, di en voz baja o en tu mente:\n"ahora mismo siento…" y completa la frase.', duration: 16 },
      { id: 'puntos', text: 'Pasa al lateral del ojo, debajo del ojo,\ndebajo de la nariz, el mentón y la clavícula.', duration: 16 },
      { id: 'ritmo', text: 'Entre seis y ocho toques por punto,\nsin golpear fuerte — es contacto, no percusión.', duration: 14 },
      { id: 'cierre', text: 'Termina con una exhalación larga.\nObserva si la intensidad cambió del uno al diez.', duration: 14 },
    ],
  },
  {
    id: 'tapping-respiracion',
    title: 'Tapping + respiración',
    durationMinutes: 1,
    category: 'flow',
    level: 'intermedio',
    description: 'Ancla la calma después de nombrar la emoción.',
    narrated: true,
    phases: [
      { id: 'manos', text: 'Pon una mano sobre el pecho\ny otra sobre el abdomen.', duration: 10 },
      { id: 'inhala', text: 'Inhala cuatro segundos por la nariz.\nHaz una pausa cómoda antes de soltar.', duration: 14 },
      { id: 'exhala', text: 'Exhala durante seis u ocho segundos,\nel doble de largo que la entrada si puedes.', duration: 14 },
      { id: 'repite', text: 'Repite el ciclo cuatro veces.\nEn cada exhalación suelta mandíbula, hombros y manos.', duration: 16 },
      { id: 'cierre', text: 'Registra qué sentías antes,\nqué sientes ahora y tu siguiente acción.', duration: 14 },
    ],
  },
  {
    id: 'circuito-incomodo',
    title: 'El circuito incómodo',
    durationMinutes: 1,
    category: 'circuito',
    level: 'intermedio',
    description: 'Mira un patrón real de tu semana y decide una acción concreta.',
    phases: [
      { text: 'Abre Comando y mira un patrón real\nde esta semana.', duration: 10 },
      { text: 'Puede ser sueño, energía, presencia\no cumplimiento de un hábito.', duration: 8 },
      { text: 'Respira durante un minuto\ny di en voz alta qué decisión vas a tomar hoy.', duration: 15 },
      { text: 'No digas "voy a mejorar".\nDi qué harás, a qué hora y durante cuánto tiempo.', duration: 12 },
      { text: 'Registra el compromiso\ny revísalo mañana.', duration: 10 },
    ],
  },
  {
    id: 'circuito-principiante',
    title: 'Circuito principiante',
    durationMinutes: 1,
    category: 'circuito',
    level: 'principiante',
    description: 'Respirar, sentir, escribir — el punto de partida si nunca has practicado.',
    phases: [
      { text: 'Inhala 4 segundos por la nariz\ny exhala 6. Repite tres veces.', duration: 15 },
      { text: 'No busques hacerlo perfecto.\nSolo nota dónde sientes el aire.', duration: 8 },
      { text: 'Completa una sola frase:\n"hoy estoy evitando…"', duration: 12 },
      { text: 'Escribe lo primero que aparezca,\nsin corregirlo.', duration: 8 },
      { text: 'Pon una mano en el pecho.\n¿Cuál es la acción más pequeña que puedes hacer hoy?', duration: 12 },
    ],
  },
  {
    id: 'circuito-avanzado',
    title: 'Circuito avanzado',
    durationMinutes: 1,
    category: 'circuito',
    level: 'avanzado',
    description: 'Permanecer sin reaccionar — sentir la incomodidad y elegir después.',
    phases: [
      { text: 'De pie, abre el pecho\ny lleva la mirada al horizonte.', duration: 8 },
      { text: 'Inhala 4 segundos y exhala 6.\nRepite cinco veces.', duration: 15 },
      { text: 'Mientras respiras, nombra la situación\nque te activa. No la resuelvas todavía.', duration: 12 },
      { text: 'Solo observa dónde aparece en el cuerpo.', duration: 8 },
      { text: 'Ahora di: "puedo sentir esto\nsin tomar una decisión impulsiva."', duration: 10 },
      { text: 'Registra lo que observaste\ny decide cuándo y cómo vas a responder.', duration: 12 },
    ],
  },
  // Los 5 siguientes no tienen guion en guiones_36/ — MBE no llegó a describirse
  // en detalle para estas piezas (solo capturamos frames, sin transcripción).
  // Contenido 100% original de Polaris, escrito para cerrar el catálogo en las
  // 14 piezas reales de workout-programs, no una adaptación de texto ajeno.
  {
    id: 'flow-sentado',
    title: 'Flow sentado',
    durationMinutes: 1,
    category: 'flow',
    level: 'principiante',
    description: 'La misma calma, sin necesidad de estar de pie.',
    narrated: true,
    phases: [
      { id: 'postura', text: 'Siéntate con los pies apoyados en el suelo\ny la espalda lejos del respaldo.', duration: 12 },
      { id: 'inhala', text: 'Inhala cuatro segundos por la nariz,\nabriendo el pecho sin levantar los hombros.', duration: 14 },
      { id: 'exhala', text: 'Exhala seis segundos\ny deja caer los hombros de verdad, no solo un poco.', duration: 14 },
      { id: 'giro', text: 'Gira el torso suavemente hacia un lado,\nsostén dos respiraciones completas y vuelve al centro.', duration: 16 },
      { id: 'giro-otro-lado', text: 'Repite hacia el otro lado,\ncon la misma calma.', duration: 12 },
      { id: 'cierre', text: 'Quédate quieto un momento\nantes de seguir con tu día.', duration: 10 },
    ],
  },
  {
    id: 'fase1-flow-1',
    title: 'Fase 1 · Flow 1 — cimientos',
    durationMinutes: 1,
    category: 'flow',
    level: 'principiante',
    description: 'La postura base de la que parten todos los demás flows.',
    narrated: true,
    phases: [
      { id: 'postura', text: 'De pie, pies al ancho de cadera,\npeso repartido por igual entre los dos.', duration: 12 },
      { id: 'inhala', text: 'Inhala por la nariz\nsintiendo cómo se expande el abdomen, no solo el pecho.', duration: 14 },
      { id: 'exhala', text: 'Exhala por la boca,\nmás largo que la inhalación — deja salir el aire entero.', duration: 14 },
      { id: 'repite', text: 'Repite el ciclo tres veces\nsin cambiar el ritmo a la fuerza.', duration: 14 },
      { id: 'nota', text: 'Nota qué parte del cuerpo\nsostiene más tensión hoy, sin intentar arreglarla.', duration: 14 },
    ],
  },
  {
    id: 'fase1-flow-2',
    title: 'Fase 1 · Flow 2 — apertura',
    durationMinutes: 1,
    category: 'flow',
    level: 'principiante',
    description: 'Suma movimiento de hombros y cuello a la respiración de base.',
    narrated: true,
    phases: [
      { id: 'hombros-sube', text: 'Desde la misma postura de base,\ninhala y sube los hombros hacia las orejas.', duration: 12 },
      { id: 'hombros-suelta', text: 'Exhala y déjalos caer de un solo golpe suave,\ncomo si soltaras un peso.', duration: 12 },
      { id: 'repite', text: 'Repite el gesto tres veces,\nsintiendo el contraste entre tensión y suelta.', duration: 14 },
      { id: 'cuello', text: 'Inclina la cabeza hacia un hombro\ny sostén una respiración completa ahí.', duration: 14 },
      { id: 'cuello-otro-lado', text: 'Repite hacia el otro lado\ny vuelve al centro despacio.', duration: 12 },
    ],
  },
  {
    id: 'fase1-flow-3',
    title: 'Fase 1 · Flow 3 — integración',
    durationMinutes: 1,
    category: 'flow',
    level: 'intermedio',
    description: 'Une respiración, hombros y torso en una sola secuencia.',
    narrated: true,
    phases: [
      { id: 'base', text: 'Retoma la respiración de base:\ninhala por la nariz, exhala por la boca.', duration: 12 },
      { id: 'brazos-sube', text: 'En la siguiente inhalación,\nsube los brazos por los costados hasta arriba de la cabeza.', duration: 14 },
      { id: 'giro', text: 'Al exhalar, gira el torso suavemente\nhacia un lado y baja los brazos con el movimiento.', duration: 16 },
      { id: 'giro-otro-lado', text: 'Repite hacia el otro lado,\ncon la misma coordinación entre brazos y respiración.', duration: 16 },
      { id: 'cierre', text: 'Cierra de pie, quieto,\nnotando la diferencia con cómo empezaste.', duration: 14 },
    ],
  },
  {
    id: 'fase2-flow-1',
    title: 'Fase 2 · Flow 1 — nombrar antes de soltar',
    durationMinutes: 1,
    category: 'flow',
    level: 'intermedio',
    description: 'El puente entre el movimiento físico y la regulación emocional de Fase 2.',
    narrated: true,
    phases: [
      { id: 'manos', text: 'Pon una mano en el pecho\ny otra en el abdomen.', duration: 10 },
      { id: 'nombra', text: 'Antes de respirar, nombra en una palabra\ncómo llegaste a esta práctica — solo una.', duration: 14 },
      { id: 'respira', text: 'Inhala cuatro segundos, exhala seis.\nRepite el ciclo cuatro veces.', duration: 16 },
      { id: 'suelta', text: 'En cada exhalación,\nsuelta un poco más la mandíbula y los hombros.', duration: 14 },
      { id: 'cierre', text: 'Registra si esa palabra inicial\nsigue siendo la misma ahora, o si cambió.', duration: 14 },
    ],
  },
];
