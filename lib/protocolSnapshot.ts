/**
 * protocolSnapshot — UNA fuente de verdad para día del protocolo, racha,
 * Score Soberano y línea base. Pura: `now` entra por parámetro.
 *
 * POR QUÉ: Comando y Perfil calculaban cada uno lo suyo y se contradecían —
 * Comando promediaba sin redondear (348) y Perfil con los promedios redondeados
 * del contexto (353); el día salía del inicio del protocolo y la línea base del
 * check-in más antiguo («Día 1» junto a «línea base día 7 de 7»). Si dos
 * pantallas muestran el mismo número, lo leen de aquí.
 *
 * Regla: sin dato, `null` — ningún widget pinta un valor lleno inventado.
 */
import {
  calcSovereignBaseline,
  calcSovereignScore,
  calcSovereignTier,
  computeStreak,
  type SovereignCheckIn,
  type SovereignTier,
} from './utils';

import { RECENT_DAYS } from './narrativeLogic';

const DAY_MS = 86_400_000;

export interface ProtocolSnapshotInput {
  protocolStartDate: string;
  checkIns: SovereignCheckIn[];
  completedLessons: number;
  completedTasks: number;
  wellness?: { meditation: number; breathing: number; binaural: number };
  now: Date;
}

export interface ProtocolSnapshot {
  /** 1..90. */
  protocolDay: number;
  /** Días consecutivos con lectura hasta hoy (0 si hoy no hay). */
  streak: number;
  /** La racha dicha sin culpa — misma frase en todas las pantallas. */
  streakLabel: string;
  hasReadings: boolean;
  readingToday: boolean;
  /** Días desde la última lectura (0 = hoy). `null` = nunca leyó. */
  daysSinceLastReading: number | null;
  /** Hubo lectura en los últimos `RECENT_DAYS` días (narrativeLogic). */
  recentlyActive: boolean;
  /** 0..1000, o `null` sin lecturas (no se fabrica un número). */
  score: number | null;
  tier: SovereignTier | null;
  /**
   * Día 1..7 de la ventana de línea base, solo mientras hay una ventana
   * abierta (lectura en los últimos 7 días). `null` si no hay lecturas o si no
   * leyó esta semana: en ambos casos «día X de 7» sería falso.
   */
  baselineDay: number | null;
}

/** Día UTC (mismo criterio que `computeStreak`: los 10 primeros chars ISO). */
const utcDay = (ms: number) => Math.floor(ms / DAY_MS);

export function protocolSnapshot(input: ProtocolSnapshotInput): ProtocolSnapshot {
  const { checkIns, now } = input;
  const nowMs = now.getTime();

  const startMs = new Date(input.protocolStartDate).getTime();
  const rawDay = Number.isFinite(startMs) ? Math.floor((nowMs - startMs) / DAY_MS) + 1 : 1;
  const protocolDay = Math.min(Math.max(rawDay, 1), 90);

  const hasReadings = checkIns.length > 0;
  const streak = computeStreak(checkIns, now);

  let daysSinceLastReading: number | null = null;
  if (hasReadings) {
    const newest = Math.max(...checkIns.map((c) => new Date(c.date.slice(0, 10)).getTime()));
    daysSinceLastReading = Math.max(0, utcDay(nowMs) - utcDay(newest));
  }
  const readingToday = daysSinceLastReading === 0;
  const recentlyActive = daysSinceLastReading !== null && daysSinceLastReading <= RECENT_DAYS;

  // Promedios REDONDEADOS: los mismos que expone `useLifeFlow().averages`, así
  // la Tarjeta Soberana (app/perfil) y estas pantallas dan el mismo número.
  const avg = (pick: (c: SovereignCheckIn) => number) =>
    Math.round(checkIns.reduce((a, c) => a + pick(c), 0) / checkIns.length);
  const score = hasReadings
    ? calcSovereignScore({
        energy: avg((c) => c.energy),
        clarity: avg((c) => c.clarity),
        stress: avg((c) => c.stress),
        sleep: avg((c) => c.sleep),
        streak,
        completedLessons: input.completedLessons,
        completedTasks: input.completedTasks,
        wellnessMeditation: input.wellness?.meditation ?? 0,
        wellnessBreathing: input.wellness?.breathing ?? 0,
        wellnessBinaural: input.wellness?.binaural ?? 0,
      })
    : null;

  let baselineDay: number | null = null;
  if (hasReadings) {
    if (calcSovereignBaseline(checkIns).ready) {
      baselineDay = 7;
    } else {
      // Ventana abierta = la que empieza en la lectura más antigua de los
      // últimos 7 días (la regla de calcSovereignBaseline admite cualquier
      // inicio). Sin lectura en esa semana no hay ventana abierta → null.
      const today = utcDay(nowMs);
      const recent = checkIns
        .map((c) => utcDay(new Date(c.date.slice(0, 10)).getTime()))
        .filter((d) => d <= today && today - d < 7);
      baselineDay = recent.length ? today - Math.min(...recent) + 1 : null;
    }
  }

  const streakLabel =
    streak > 0 ? `${streak} día${streak === 1 ? '' : 's'} seguido${streak === 1 ? '' : 's'}`
    : daysSinceLastReading === null ? 'empieza con tu primera lectura'
    : daysSinceLastReading === 1 ? 'sigue si lees hoy'
    : 'se retoma con una lectura';

  return {
    protocolDay,
    streak,
    streakLabel,
    hasReadings,
    readingToday,
    daysSinceLastReading,
    recentlyActive,
    score,
    tier: score === null ? null : calcSovereignTier(score),
    baselineDay,
  };
}
