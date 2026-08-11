/**
 * Focos de atención para la práctica contemplativa del check-in.
 *
 * Son una interfaz simbólica, no anatomía clínica ni causalidad emocional.
 * Nunca diagnostican, explican el origen físico del dolor ni sustituyen una
 * evaluación profesional. La ubicación declarada solo personaliza la guía.
 */
import type { BodyPoint, BodyRegion } from '@/lib/bodyPointLogic';

export type EnergyFocusId =
  | 'frente'
  | 'garganta'
  | 'pecho'
  | 'plexo'
  | 'abdomen'
  | 'base'
  | 'arraigo';

export interface EnergyFocus {
  id: EnergyFocusId;
  label: string;
  practice: string;
  reflection: string;
  cue: string;
  /** Fracciones del alto/ancho del modelo 3D, no una medición médica. */
  model: { x: number; y: number; z: number };
}

export const ENERGY_FOCI: readonly EnergyFocus[] = [
  {
    id: 'frente',
    label: 'Frente · claridad',
    practice: 'Atención abierta',
    reflection: '¿Qué pensamiento está ocupando más espacio ahora?',
    cue: 'Suaviza la frente y observa tres respiraciones sin resolver nada todavía.',
    model: { x: 0, y: 0.93, z: 0.07 },
  },
  {
    id: 'garganta',
    label: 'Garganta · expresión',
    practice: 'Exhalación larga',
    reflection: '¿Qué necesitas nombrar con más honestidad y menos presión?',
    cue: 'Inhala suave y deja que la exhalación sea un poco más larga.',
    model: { x: 0, y: 0.835, z: 0.055 },
  },
  {
    id: 'pecho',
    label: 'Pecho · presencia',
    practice: 'Respiración consciente',
    reflection: '¿Qué emoción notas al respirar, sin convertirla en una explicación?',
    cue: 'Apoya la atención en el movimiento del pecho; no fuerces la respiración.',
    model: { x: 0, y: 0.72, z: 0.075 },
  },
  {
    id: 'plexo',
    label: 'Plexo · capacidad',
    practice: 'Respiración en caja suave',
    reflection: '¿Qué parte de esta situación sí está bajo tu influencia hoy?',
    cue: 'Respira en cuatro tiempos cómodos y reduce la cuenta si aparece tensión.',
    model: { x: 0, y: 0.63, z: 0.07 },
  },
  {
    id: 'abdomen',
    label: 'Abdomen · centro',
    practice: 'Respiración abdominal sin esfuerzo',
    reflection: '¿Qué cambia cuando dejas de sostener el abdomen por un momento?',
    cue: 'Permite que el abdomen se mueva de forma natural durante tres ciclos.',
    model: { x: 0, y: 0.545, z: 0.065 },
  },
  {
    id: 'base',
    label: 'Base · estabilidad',
    practice: 'Escaneo corporal',
    reflection: '¿Qué apoyo concreto necesitas para sentir más estabilidad?',
    cue: 'Nota el peso de la pelvis y el contacto del cuerpo con la superficie.',
    model: { x: 0, y: 0.47, z: 0.035 },
  },
  {
    id: 'arraigo',
    label: 'Arraigo · apoyo',
    practice: 'Meditación de contacto',
    reflection: '¿Dónde puedes encontrar apoyo real en este momento?',
    cue: 'Lleva la atención a piernas y pies; siente el apoyo antes de cambiar nada.',
    model: { x: 0, y: 0.11, z: 0.02 },
  },
] as const;

const FOCUS_BY_ID = new Map(ENERGY_FOCI.map((focus) => [focus.id, focus]));

const REGION_FOCUS: Record<BodyRegion, EnergyFocusId> = {
  cabeza: 'frente',
  frente: 'frente',
  mandibula: 'garganta',
  garganta: 'garganta',
  hombro: 'pecho',
  pecho: 'pecho',
  abdomen: 'abdomen',
  brazo_superior: 'pecho',
  codo: 'pecho',
  antebrazo: 'pecho',
  muneca: 'pecho',
  mano: 'pecho',
  cadera: 'base',
  muslo: 'arraigo',
  rodilla: 'arraigo',
  pantorrilla: 'arraigo',
  tobillo: 'arraigo',
  pie: 'arraigo',
};

export function energyFocusById(id: EnergyFocusId): EnergyFocus {
  return FOCUS_BY_ID.get(id) ?? ENERGY_FOCI[0];
}

/** Frontera segura para parámetros de ruta o datos persistidos. */
export function parseEnergyFocusId(value: unknown): EnergyFocusId | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== 'string') return null;
  return FOCUS_BY_ID.has(candidate as EnergyFocusId) ? candidate as EnergyFocusId : null;
}

export function energyFocusForBodyPoint(point: BodyPoint): EnergyFocus {
  if (point.region === 'abdomen' && point.y < 0.41) return energyFocusById('plexo');
  return energyFocusById(REGION_FOCUS[point.region]);
}

export interface ProjectedEnergyFocus {
  id: EnergyFocusId;
  x: number;
  y: number;
}

/** Picking puro para el HUD 3D; el botón más cercano dentro del radio gana. */
export function pickEnergyFocus(
  candidates: readonly ProjectedEnergyFocus[],
  x: number,
  y: number,
  maxDistance: number,
): EnergyFocusId | null {
  let best: EnergyFocusId | null = null;
  let bestDistance = maxDistance * maxDistance;
  for (const candidate of candidates) {
    const distance = (candidate.x - x) ** 2 + (candidate.y - y) ** 2;
    if (distance <= bestDistance) {
      best = candidate.id;
      bestDistance = distance;
    }
  }
  return best;
}

export function needsChestSafety(point: BodyPoint | undefined): boolean {
  return point?.region === 'pecho';
}
