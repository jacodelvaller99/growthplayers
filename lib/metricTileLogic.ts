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
  Baseline,
  CoherenceState,
  DailyMetrics,
  FatigueRisk,
  RecoveryState,
  SleepState,
} from '@/lib/biometricLogic';
import { coherenceState, sleepState } from '@/lib/biometricLogic';

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
 * Estrés — `stress_score` viene 0..100, más alto = más estrés (al revés que
 * las demás, que suben cuando el cuerpo está bien). Umbrales explicables, no
 * clínicos: son coaching, no diagnóstico.
 */
export function stressTile(stressScore: number | null | undefined): TileState {
  if (stressScore == null || !Number.isFinite(stressScore)) return SIN_DATO;
  if (stressScore <= 35) return { label: 'BAJO', tone: 'good' };
  if (stressScore <= 60) return { label: 'MEDIO', tone: 'mid' };
  return { label: 'ELEVADO', tone: 'bad' };
}

/**
 * Carga — recibe un porcentaje 0..100 YA normalizado por quien llama.
 *
 * `strain_score` (WHOOP, 0..21) y `activity_score` (0..100) viven en escalas
 * distintas; normalizar es responsabilidad del caller (que sabe cuál de los
 * dos tiene). Aquí solo se interpreta el porcentaje resultante — el mismo
 * contrato que las demás fichas.
 */
export function loadTile(loadPercent: number | null | undefined): TileState {
  if (loadPercent == null || !Number.isFinite(loadPercent)) return SIN_DATO;
  if (loadPercent <= 40) return { label: 'BAJA', tone: 'good' };
  if (loadPercent <= 70) return { label: 'MEDIA', tone: 'mid' };
  return { label: 'ALTA', tone: 'bad' };
}

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

// ─── Composición de las 4 fichas del día ───────────────────────────────────────

export type DayTile = {
  label: string;
  value: string;
  unit?: string;
  stateLabel: string;
  state: TileTone;
  series: number[];
};

export type DayTilesSource = 'wearable' | 'checkin' | 'none';

export type CheckinAverages = { energy: number; clarity: number; stress: number; sleep: number };

const SIN_DATO_TILE = (label: string): DayTile => ({ label, value: '—', stateLabel: 'SIN DATO', state: 'none', series: [] });

/**
 * Une wearable → check-in → SIN DATO en una sola función pura y testeable.
 *
 * `latest` es el día más reciente con wearable; `series` es la ventana para las
 * mini-barras (ya en orden cronológico); `baseline` viene de `computeBaseline`.
 * Si no hay wearable pero sí check-ins, las fichas se arman con los promedios
 * 1..10 del usuario (etiquetadas "según tu check-in" por quien las pinta, no
 * aquí — esto solo decide `source`).
 */
export function composeDayTiles(
  latest: DailyMetrics | null,
  series: DailyMetrics[],
  baseline: Baseline,
  checkinAvgs: CheckinAverages | null,
): { tiles: DayTile[]; source: DayTilesSource } {
  const hasWearable = latest != null && (
    latest.hrv_ms != null || latest.sleep_score != null || latest.sleep_duration_min != null ||
    latest.strain_score != null || latest.activity_score != null || latest.stress_score != null
  );

  if (hasWearable && latest) {
    const hrvSt = coherenceTile(coherenceState(latest, baseline));
    const sleepSt = sleepTile(sleepState(latest));
    const loadRaw = latest.strain_score != null
      ? (latest.strain_score / 21) * 100   // WHOOP strain: 0..21
      : latest.activity_score;              // ya 0..100
    const loadSt = loadTile(loadRaw);
    const stressSt = stressTile(latest.stress_score);

    const hours = latest.sleep_duration_min != null ? latest.sleep_duration_min / 60 : null;

    const tiles: DayTile[] = [
      {
        label: 'HRV', value: latest.hrv_ms != null ? String(Math.round(latest.hrv_ms)) : '—', unit: 'ms',
        stateLabel: hrvSt.label, state: hrvSt.tone,
        series: normalizeSeries(series.map((d) => d.hrv_ms)),
      },
      {
        label: 'SUEÑO',
        value: hours != null ? `${Math.floor(hours)}h${String(Math.round((hours % 1) * 60)).padStart(2, '0')}` : '—',
        stateLabel: sleepSt.label, state: sleepSt.tone,
        series: normalizeSeries(series.map((d) => d.sleep_duration_min)),
      },
      {
        label: 'CARGA', value: loadRaw != null ? String(Math.round(loadRaw)) : '—', unit: '%',
        stateLabel: loadSt.label, state: loadSt.tone,
        series: normalizeSeries(series.map((d) => d.strain_score ?? d.activity_score)),
      },
      {
        label: 'ESTRÉS', value: latest.stress_score != null ? String(Math.round(latest.stress_score)) : '—', unit: '%',
        stateLabel: stressSt.label, state: stressSt.tone,
        series: normalizeSeries(series.map((d) => d.stress_score)),
      },
    ];
    return { tiles, source: 'wearable' };
  }

  if (checkinAvgs) {
    // Check-in es 1..10 — se traduce a las mismas 4 fichas sin fingir precisión
    // de wearable. Estrés se invierte: un check-in de estrés alto es "malo".
    const toTone = (v: number, invert = false): TileTone => {
      const good = invert ? v <= 4 : v >= 7;
      const bad = invert ? v >= 7 : v <= 4;
      if (good) return 'good';
      if (bad) return 'bad';
      return 'mid';
    };
    const label = (v: number, words: [string, string, string], invert = false) => {
      const t = toTone(v, invert);
      return t === 'good' ? words[0] : t === 'bad' ? words[2] : words[1];
    };
    const tiles: DayTile[] = [
      { label: 'ENERGÍA', value: checkinAvgs.energy.toFixed(1), unit: '/10', stateLabel: label(checkinAvgs.energy, ['ALTA', 'MEDIA', 'BAJA']), state: toTone(checkinAvgs.energy), series: [] },
      { label: 'SUEÑO', value: checkinAvgs.sleep.toFixed(1), unit: '/10', stateLabel: label(checkinAvgs.sleep, ['COMPLETO', 'REGULAR', 'CORTO']), state: toTone(checkinAvgs.sleep), series: [] },
      { label: 'CLARIDAD', value: checkinAvgs.clarity.toFixed(1), unit: '/10', stateLabel: label(checkinAvgs.clarity, ['ALTA', 'MEDIA', 'BAJA']), state: toTone(checkinAvgs.clarity), series: [] },
      { label: 'ESTRÉS', value: checkinAvgs.stress.toFixed(1), unit: '/10', stateLabel: label(checkinAvgs.stress, ['BAJO', 'MEDIO', 'ELEVADO'], true), state: toTone(checkinAvgs.stress, true), series: [] },
    ];
    return { tiles, source: 'checkin' };
  }

  return {
    tiles: [SIN_DATO_TILE('HRV'), SIN_DATO_TILE('SUEÑO'), SIN_DATO_TILE('CARGA'), SIN_DATO_TILE('ESTRÉS')],
    source: 'none',
  };
}
