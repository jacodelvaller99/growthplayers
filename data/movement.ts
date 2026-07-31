// ─── LifeFlow Movement ────────────────────────────────────────────────────────
// Catálogo de movimientos guiados. Mismo shape que MeditationSession/GuidedPhase
// (data/wellness.ts) para reusar el patrón de reproductor por fases.

import type { GuidedPhase } from './wellness';

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
}

export const MOVEMENT_PRACTICES: MovementPractice[] = [
  {
    id: 'flow-principiante',
    title: 'Flow principiante',
    durationMinutes: 1,
    category: 'flow',
    level: 'principiante',
    description: 'Un primer estado honesto antes de registrar cómo llegaste.',
    phases: [
      { text: 'Siente los pies en el suelo.\nSuelta los hombros.', duration: 15 },
      { text: 'Abre las manos.\nRespira sin intentar cambiar nada.', duration: 15 },
      { text: 'Solo observa cómo estás.', duration: 10 },
      { text: 'Eso es suficiente para empezar:\ncuerpo presente, atención honesta.', duration: 10 },
    ],
  },
  {
    id: 'flow-recuperacion',
    title: 'Flow de recuperación',
    durationMinutes: 1,
    category: 'flow',
    level: 'principiante',
    description: 'Un minuto para volver al cuerpo cuando la energía está baja.',
    phases: [
      { text: 'Separa los pies. Suelta los hombros.', duration: 10 },
      { text: 'Inhala por la nariz durante 4 segundos.\nSiente cómo se expanden las costillas.', duration: 10 },
      { text: 'Exhala lentamente durante 6.\nDeja caer un poco la cabeza y los brazos.', duration: 12 },
      { text: 'Vuelve al centro y repite.', duration: 12 },
      { text: 'Registra cómo llegaste y cómo te vas.', duration: 6 },
    ],
  },
  {
    id: 'flow-avanzado',
    title: 'Flow avanzado',
    durationMinutes: 1,
    category: 'flow',
    level: 'avanzado',
    description: 'Sostener la emoción con presencia — toques suaves y una frase honesta.',
    phases: [
      { text: 'Empieza con toques suaves\nen el canto de la mano.', duration: 12 },
      { text: 'Nombra en una frase\nla emoción que está presente.', duration: 10 },
      { text: 'Pasa a la ceja, al lateral del ojo\ny a la clavícula.', duration: 12 },
      { text: 'Mantén una respiración cómoda.', duration: 8 },
      { text: 'Termina con una mano en el pecho\ny registra qué cambió.', duration: 13 },
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
    phases: [
      { text: 'De pie o sentado, inhala por la nariz\nmientras abres el pecho.', duration: 10 },
      { text: 'Exhala y gira el torso suavemente\nhacia la derecha. Vuelve al centro.', duration: 12 },
      { text: 'Repite hacia la izquierda.\nSin buscar rango.', duration: 10 },
      { text: 'Solo acompaña el movimiento\ncon una exhalación más larga.', duration: 8 },
      { text: 'Última ronda: lleva los brazos arriba al inhalar\ny déjalos caer al exhalar.', duration: 12 },
      { text: 'Siente el peso bajando de los hombros.', duration: 8 },
    ],
  },
  {
    id: 'tapping-seis-puntos',
    title: 'Tapping de seis puntos',
    durationMinutes: 1,
    category: 'flow',
    level: 'principiante',
    description: 'Baja la activación reconociendo la emoción en el cuerpo.',
    phases: [
      { text: 'Con dos dedos, da toques suaves\nen la ceja.', duration: 10 },
      { text: 'Respira y di en voz baja:\n"ahora mismo siento…"', duration: 8 },
      { text: 'Pasa al lateral del ojo, debajo del ojo,\ndebajo de la nariz, mentón y clavícula.', duration: 15 },
      { text: 'Entre seis y ocho toques por punto,\nsin golpear fuerte.', duration: 10 },
      { text: 'Termina con una exhalación larga.\nObserva si la intensidad cambió del uno al diez.', duration: 12 },
    ],
  },
  {
    id: 'tapping-respiracion',
    title: 'Tapping + respiración',
    durationMinutes: 1,
    category: 'flow',
    level: 'intermedio',
    description: 'Ancla la calma después de nombrar la emoción.',
    phases: [
      { text: 'Pon una mano sobre el pecho\ny otra sobre el abdomen.', duration: 8 },
      { text: 'Inhala 4 segundos por la nariz.\nHaz una pausa cómoda.', duration: 10 },
      { text: 'Exhala durante 6 u 8 segundos.', duration: 10 },
      { text: 'Repite cuatro veces.\nEn cada exhalación suelta mandíbula, hombros y manos.', duration: 15 },
      { text: 'Registra qué sentías antes,\nqué sientes ahora y tu siguiente acción.', duration: 12 },
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
    phases: [
      { text: 'Siéntate con los pies apoyados\ny la espalda lejos del respaldo.', duration: 10 },
      { text: 'Inhala 4 segundos por la nariz\nabriendo el pecho.', duration: 10 },
      { text: 'Exhala 6 segundos\ny deja caer los hombros.', duration: 10 },
      { text: 'Gira el torso suavemente hacia un lado,\nsostén dos respiraciones y vuelve al centro.', duration: 12 },
      { text: 'Repite hacia el otro lado.', duration: 10 },
      { text: 'Quédate quieto un momento\nantes de seguir con tu día.', duration: 8 },
    ],
  },
  {
    id: 'fase1-flow-1',
    title: 'Fase 1 · Flow 1 — cimientos',
    durationMinutes: 1,
    category: 'flow',
    level: 'principiante',
    description: 'La postura base de la que parten todos los demás flows.',
    phases: [
      { text: 'De pie, pies al ancho de cadera,\npeso repartido por igual.', duration: 10 },
      { text: 'Inhala por la nariz\nsintiendo cómo se expande el abdomen.', duration: 10 },
      { text: 'Exhala por la boca,\nmás largo que la inhalación.', duration: 10 },
      { text: 'Repite tres veces\nsin cambiar el ritmo a la fuerza.', duration: 12 },
      { text: 'Nota qué parte del cuerpo\nsostiene más tensión hoy.', duration: 8 },
    ],
  },
  {
    id: 'fase1-flow-2',
    title: 'Fase 1 · Flow 2 — apertura',
    durationMinutes: 1,
    category: 'flow',
    level: 'principiante',
    description: 'Suma movimiento de hombros y cuello a la respiración de base.',
    phases: [
      { text: 'Desde la misma postura,\ninhala y sube los hombros hacia las orejas.', duration: 10 },
      { text: 'Exhala y déjalos caer de un solo golpe suave.', duration: 8 },
      { text: 'Repite tres veces.', duration: 10 },
      { text: 'Inclina la cabeza hacia un hombro,\nsostén una respiración completa.', duration: 12 },
      { text: 'Repite hacia el otro lado\ny vuelve al centro.', duration: 10 },
    ],
  },
  {
    id: 'fase1-flow-3',
    title: 'Fase 1 · Flow 3 — integración',
    durationMinutes: 1,
    category: 'flow',
    level: 'intermedio',
    description: 'Une respiración, hombros y torso en una sola secuencia.',
    phases: [
      { text: 'Retoma la respiración de base:\ninhala por la nariz, exhala por la boca.', duration: 10 },
      { text: 'En la siguiente inhalación,\nsube los brazos por los costados.', duration: 10 },
      { text: 'Al exhalar, gira el torso suavemente\nhacia un lado y baja los brazos.', duration: 12 },
      { text: 'Repite hacia el otro lado.', duration: 10 },
      { text: 'Cierra de pie, quieto,\nnotando la diferencia con el inicio.', duration: 10 },
    ],
  },
  {
    id: 'fase2-flow-1',
    title: 'Fase 2 · Flow 1 — nombrar antes de soltar',
    durationMinutes: 1,
    category: 'flow',
    level: 'intermedio',
    description: 'El puente entre el movimiento físico y la regulación emocional de Fase 2.',
    phases: [
      { text: 'Pon una mano en el pecho\ny otra en el abdomen.', duration: 8 },
      { text: 'Antes de respirar, nombra en una palabra\ncómo llegaste a esta práctica.', duration: 10 },
      { text: 'Inhala 4 segundos, exhala 6.\nRepite cuatro veces.', duration: 15 },
      { text: 'En cada exhalación,\nsuelta un poco más la mandíbula.', duration: 10 },
      { text: 'Registra si esa palabra inicial\nsigue siendo la misma ahora.', duration: 10 },
    ],
  },
];
