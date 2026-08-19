/**
 * De estado clínico a ficha de métrica. Puro, sin IO.
 *
 * POR QUE EXISTE: la ficha del diseño muestra una PALABRA de estado junto al
 * número (ÓPTIMO / MEDIA / ELEVADO) y tiñe su serie con ese estado. Esa palabra
 * es una afirmación sobre el cuerpo de alguien, así que no se inventa aquí: se
 * traduce de `lib/biometricLogic.ts`, que ya tiene los umbrales y ya pasó
 * revisión. Este módulo NO decide qué es "óptimo"; solo le pone nombre y color
 * a lo que otro ya decidió.
 *
 * Vocabulario: de acompañamiento, no clínico. "ATENCIÓN" y no "patológico";
 * "BAJO" y no "deficiente". La app no diagnostica y su lenguaje tampoco.
 */
import type {
  CoherenceState,
  FatigueRisk,
  RecoveryState,
  SleepState,
} from '@/lib/biometricLogic';

/** Cómo pinta la ficha. `bad` = pide atención, no "malo" como juicio. */
export type TileTone = 'good' | 'mid' | 'bad' | 'none';

export type TileState = { label: string; tone: TileTone };

const SLEEP: Record<SleepState, TileState> = {
  excellent: { label: 'ÓPTIMO', tone: 'good' },
  good:      { label: 'COMPLETO', tone: 'good' },
  fragile:   { label: 'FRÁGIL', tone: 'mid' },
  poor:      { label: 'CORTO', tone: 'bad' },
  critical:  { label: 'MUY CORTO', tone: 'bad' },
};

const RECOVERY: Record<RecoveryState, TileState> = {
  strong:      { label: 'FUERTE', tone: 'good' },
  adequate:    { label: 'SUFICIENTE', tone: 'good' },
  compromised: { label: 'JUSTA', tone: 'mid' },
  weak:        { label: 'BAJA', tone: 'bad' },
  high_risk:   { label: 'ATENCIÓN', tone: 'bad' },
};

const COHERENCE: Record<CoherenceState, TileState> = {
  stable:            { label: 'ESTABLE', tone: 'good' },
  slightly_disturbed:{ label: 'LEVE', tone: 'mid' },
  unstable:          { label: 'INESTABLE', tone: 'bad' },
  highly_unstable:   { label: 'MUY INESTABLE', tone: 'bad' },
};

const FATIGUE: Record<FatigueRisk, TileState> = {
  low:      { label: 'BAJA', tone: 'good' },
  moderate: { label: 'MEDIA', tone: 'mid' },
  elevated: { label: 'ELEVADA', tone: 'mid' },
  high:     { label: 'ALTA', tone: 'bad' },
};

const SIN_DATO: TileState = { label: 'SIN DATO', tone: 'none' };

export const sleepTile     = (s: SleepState | null | undefined): TileState => (s ? SLEEP[s] : SIN_DATO);
export const recoveryTile  = (s: RecoveryState | null | undefined): TileState => (s ? RECOVERY[s] : SIN_DATO);
export const coherenceTile = (s: CoherenceState | null | undefined): TileState => (s ? COHERENCE[s] : SIN_DATO);
export const fatigueTile   = (s: FatigueRisk | null | undefined): TileState => (s ? FATIGUE[s] : SIN_DATO);

/**
 * Normaliza una serie a 0..1 para las barras.
 *
 * Escala al RANGO PROPIO de la serie, no a un máximo teórico: con siete valores
 * de sueño entre 6h y 7h, escalar sobre 12h daría siete barras idénticas y la
 * variación —que es justo lo que se quiere ver— desaparecería. Si todos los
 * valores coinciden, devuelve media altura: plano es plano, no cero.
 */
export function normalizeSeries(values: (number | null | undefined)[]): number[] {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (nums.length === 0) return [];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (max === min) return nums.map(() => 0.5);
  return nums.map((v) => (v - min) / (max - min));
}
