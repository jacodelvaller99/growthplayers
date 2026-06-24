// ─── Pure helpers — extracted for testability ────────────────────────────────

/** Raw day counter (1-based, uncapped). Used internally and for other calculations. */
export function diffDays(fromIso: string): number {
  const ms = new Date().getTime() - new Date(fromIso).getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

/**
 * Protocol day (1–90 hard cap).
 *
 * The Protocolo Soberano is a 90-day program. Once completed, the counter
 * stays at 90 rather than incrementing beyond the program boundary.
 * Use this everywhere protocolDay is displayed to the user.
 */
export function calcProtocolDay(fromIso: string): number {
  return Math.min(diffDays(fromIso), 90);
}

// ─── Sovereign Score v2 ───────────────────────────────────────────────────────

export interface SovereignScoreInput {
  energy: number;
  clarity: number;
  stress: number;
  sleep: number;
  streak: number;
  completedLessons: number;
  completedTasks: number;
  wellnessMeditation?: number;   // sessions completed
  wellnessBreathing?: number;
  wellnessBinaural?: number;
}

/**
 * Sovereign Score v2 (0–1000).
 *
 * checkinScore   = avg(energy, clarity, (10-stress), sleep) / 10 × 200  — max 200
 * lessonScore    = min(completedLessons × 15, 400)                       — max 400
 * taskScore      = min(completedTasks × 25, 200)                         — max 200
 * streakBonus    = 150 if streak ≥ 30 | 50 if streak ≥ 7 | 0            — max 150
 * wellnessBonus  = meditation×5 + breathing×3 + binaural×2 (capped 100) — max 100
 * result         = min(round(sum), 1000)
 */
export function calcSovereignScore(opts: SovereignScoreInput): number {
  const checkinScore =
    ((opts.energy + opts.clarity + (10 - opts.stress) + opts.sleep) / 4) * 20;
  const lessonScore    = Math.min(opts.completedLessons * 15, 400);
  const taskScore      = Math.min(opts.completedTasks * 25, 200);
  const streakBonus    = opts.streak >= 30 ? 150 : opts.streak >= 7 ? 50 : 0;
  const wellnessBonus  = Math.min(
    (opts.wellnessMeditation ?? 0) * 5 +
    (opts.wellnessBreathing  ?? 0) * 3 +
    (opts.wellnessBinaural   ?? 0) * 2,
    100,
  );
  return Math.min(Math.round(checkinScore + lessonScore + taskScore + streakBonus + wellnessBonus), 1000);
}

export type SovereignTier = 'ELITE' | 'AVANZADO' | 'EN ASCENSO' | 'INICIANDO';

/**
 * Tier from score: ELITE (≥800) · AVANZADO (≥600) · EN ASCENSO (≥400) · INICIANDO (<400)
 */
export function calcSovereignTier(score: number): SovereignTier {
  if (score >= 800) return 'ELITE';
  if (score >= 600) return 'AVANZADO';
  if (score >= 400) return 'EN ASCENSO';
  return 'INICIANDO';
}

// ─── Sovereign Score "delta-driven" — premia el CAMBIO, no el absoluto ─────────
//
// calcSovereignScore (arriba) premia valores absolutos/frecuencia — el admin
// rankea por él, NO se toca. Estas funciones miden PROGRESO: el cuerpo de hoy
// contra la línea base del propio cliente (sus primeros 7 días). Reusa el patrón
// de coachIntelligenceLogic (semana actual vs previa) + biometricLogic (baseline).
//
// PURO: las ventanas se derivan de las FECHAS de los check-ins (el más reciente
// como referencia) — nunca Date.now()/new Date() sin argumento.

/** Check-in mínimo necesario para el cálculo de progreso. */
export interface SovereignCheckIn {
  date: string;        // ISO
  energy: number;      // 0–10
  clarity: number;     // 0–10
  stress: number;      // 0–10 (se invierte a coherence = 10-stress)
  sleep: number;       // 0–10
}

/** Promedio compuesto de las 4 dimensiones (coherence ya invertida). */
export interface SovereignDimensions {
  energy: number;
  clarity: number;
  coherence: number;   // = 10 - stress
  sleep: number;
}

export interface SovereignBaseline extends SovereignDimensions {
  /** true si hay ≥3 check-ins en los primeros 7 días calendario. */
  ready: boolean;
}

export type SovereignDeltaState = 'gaining' | 'stable' | 'declining';

export interface SovereignDelta {
  hasBaseline: boolean;
  /** Cambio % del compuesto (energy+clarity+coherence+sleep) vs línea base. */
  deltaPct: number;
  /** Cambio en puntos por dimensión (positivo = mejor). */
  subDeltas: SovereignDimensions;
  /** Síntesis legible para la UI. */
  label: string;
  state: SovereignDeltaState;
}

const DAY_MS_SOVEREIGN = 86_400_000;

/** ms del inicio del día UTC de un ISO (para agrupar por día calendario). */
function dayStartMs(iso: string): number {
  const t = new Date(iso).getTime();
  return Math.floor(t / DAY_MS_SOVEREIGN) * DAY_MS_SOVEREIGN;
}

/** Promedio de un campo numérico sobre un set de check-ins (0 si vacío). */
function avgField(rows: SovereignCheckIn[], pick: (c: SovereignCheckIn) => number): number {
  if (!rows.length) return 0;
  return rows.reduce((a, c) => a + pick(c), 0) / rows.length;
}

/** Compuesto = energy + clarity + coherence + sleep (máx 40). */
function compositeOf(d: SovereignDimensions): number {
  return d.energy + d.clarity + d.coherence + d.sleep;
}

/**
 * Línea base soberana: promedia los check-ins de los PRIMEROS 7 días calendario
 * (contados desde el check-in más antiguo). `ready` es true solo con ≥3 check-ins
 * en esa ventana — antes, el cliente aún está construyendo su línea base.
 */
export function calcSovereignBaseline(checkIns: SovereignCheckIn[]): SovereignBaseline {
  const empty: SovereignBaseline = { ready: false, energy: 0, clarity: 0, coherence: 0, sleep: 0 };
  if (!checkIns || checkIns.length < 3) return empty;

  const oldest = Math.min(...checkIns.map((c) => dayStartMs(c.date)));
  // Ventana = [día0, día0 + 7 días) — los primeros 7 días calendario.
  const windowEnd = oldest + 7 * DAY_MS_SOVEREIGN;
  const inWindow = checkIns.filter((c) => {
    const d = dayStartMs(c.date);
    return d >= oldest && d < windowEnd;
  });

  if (inWindow.length < 3) return empty;

  return {
    ready: true,
    energy: avgField(inWindow, (c) => c.energy),
    clarity: avgField(inWindow, (c) => c.clarity),
    coherence: avgField(inWindow, (c) => 10 - c.stress),
    sleep: avgField(inWindow, (c) => c.sleep),
  };
}

/**
 * Delta soberano: promedio de los ÚLTIMOS 7 días calendario (contados hacia atrás
 * desde el check-in más reciente) contra la línea base. Sin línea base lista
 * (días 1–7) → `hasBaseline:false`, la UI muestra "construyendo tu línea base".
 *
 * `deltaPct` = cambio % del compuesto; `state` = gaining (≥+5%) / declining (≤−5%)
 * / stable. `label` cita el driver dominante (mayor |subDelta|).
 */
export function calcSovereignDelta(checkIns: SovereignCheckIn[]): SovereignDelta {
  const flat: SovereignDimensions = { energy: 0, clarity: 0, coherence: 0, sleep: 0 };
  const none: SovereignDelta = {
    hasBaseline: false,
    deltaPct: 0,
    subDeltas: { ...flat },
    label: 'Construyendo tu línea base',
    state: 'stable',
  };

  const baseline = calcSovereignBaseline(checkIns);
  if (!baseline.ready) return none;

  // Ventana actual = últimos 7 días calendario desde el check-in más reciente.
  const newest = Math.max(...checkIns.map((c) => dayStartMs(c.date)));
  const windowStart = newest - 6 * DAY_MS_SOVEREIGN; // inclusivo: 7 días
  const recent = checkIns.filter((c) => dayStartMs(c.date) >= windowStart);

  const current: SovereignDimensions = {
    energy: avgField(recent, (c) => c.energy),
    clarity: avgField(recent, (c) => c.clarity),
    coherence: avgField(recent, (c) => 10 - c.stress),
    sleep: avgField(recent, (c) => c.sleep),
  };

  const subDeltas: SovereignDimensions = {
    energy: current.energy - baseline.energy,
    clarity: current.clarity - baseline.clarity,
    coherence: current.coherence - baseline.coherence,
    sleep: current.sleep - baseline.sleep,
  };

  const baseComposite = compositeOf(baseline);
  const curComposite = compositeOf(current);
  const deltaPct = baseComposite > 0
    ? ((curComposite - baseComposite) / baseComposite) * 100
    : 0;

  const state: SovereignDeltaState =
    deltaPct >= 5 ? 'gaining' : deltaPct <= -5 ? 'declining' : 'stable';

  // Driver dominante = dimensión con mayor cambio absoluto.
  const dims: { key: keyof SovereignDimensions; es: string }[] = [
    { key: 'energy', es: 'energía' },
    { key: 'clarity', es: 'claridad' },
    { key: 'coherence', es: 'coherencia' },
    { key: 'sleep', es: 'sueño' },
  ];
  const dominant = dims.reduce((best, d) =>
    Math.abs(subDeltas[d.key]) > Math.abs(subDeltas[best.key]) ? d : best,
  );
  const dv = subDeltas[dominant.key];
  const head = state === 'gaining' ? 'ascenso' : state === 'declining' ? 'descenso' : 'estable';
  const sign = dv >= 0 ? '+' : '';
  const label = `${head} · ${sign}${dv.toFixed(1)} de ${dominant.es} vs tu línea base`;

  return { hasBaseline: true, deltaPct, subDeltas, label, state };
}
