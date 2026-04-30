// ─── Meditation Sessions ──────────────────────────────────────────────────────

export type MeditationCategory = 'mañana' | 'noche' | 'enfoque' | 'estrés';

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
