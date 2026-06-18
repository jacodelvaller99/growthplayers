/**
 * userRankingLogic — lógica PURA de ponderación/ranking de usuarios (Cluster A2).
 *
 * "Organización de todos los usuarios que permita compararlos para hacer una
 * ponderación entre ellos." Combina las señales que el sistema ya produce en un
 * score 0-100 ponderado, EXPLICABLE (cada usuario lleva qué dimensión pesó), y
 * rankea con percentil. Pesos por defecto calibrados con criterio bayesiano: no
 * sobre-pesar una sola señal, y separar lo positivo (progreso/bienestar) de lo
 * negativo (churn/fricción) para no doble-contar.
 *
 * Determinista, sin Date.now ni Math.random.
 */

// ─── Dimensiones de entrada (todas opcionales/nullable, 0-100 salvo nota) ──────

export interface RankableUser {
  id: string;
  name: string;
  /** Sovereign score 0-100 (progreso del protocolo). */
  sovereign?: number | null;
  /** Engagement 0-100 (motor heurístico). */
  engagement?: number | null;
  /** Churn risk 0-1 (se invierte: menor churn = mejor). */
  churnRisk?: number | null;
  /** Bienestar 0-100 (de wellbeingLogic). */
  wellbeing?: number | null;
  /** Momentum de ejecución 0-100 (Mentor Execution OS). */
  executionMomentum?: number | null;
  /** Profundidad relacional con Norman 0-100 (Coach Intelligence v2). */
  relationalDepth?: number | null;
}

export type RankDimension =
  | 'sovereign' | 'engagement' | 'churn' | 'wellbeing' | 'executionMomentum' | 'relationalDepth';

export type RankingWeights = Record<RankDimension, number>;

/**
 * Pesos por defecto (suman 1.0). Razonamiento:
 *  - sovereign 0.25: el resultado del protocolo es el norte, pero no lo único.
 *  - engagement 0.15 + wellbeing 0.15: uso real + cómo se siente, balanceados.
 *  - churn 0.20: señal negativa fuerte (invertida) — predice abandono.
 *  - executionMomentum 0.15: hace lo que dice (no solo entra).
 *  - relationalDepth 0.10: profundidad con Norman, complemento.
 */
export const DEFAULT_WEIGHTS: RankingWeights = {
  sovereign: 0.25,
  engagement: 0.15,
  wellbeing: 0.15,
  churn: 0.20,
  executionMomentum: 0.15,
  relationalDepth: 0.10,
};

export interface RankedUser {
  id: string;
  name: string;
  /** Score ponderado 0-100. */
  score: number;
  /** Posición 1-based. */
  rank: number;
  /** Percentil 0-100 (100 = el mejor). */
  percentile: number;
  /** Qué dimensión aportó más (positivo) y cuál lastró (negativo). */
  topDriver: { dimension: RankDimension; label: string; contribution: number } | null;
  /** Aporte por dimensión (para el desglose). */
  contributions: Partial<Record<RankDimension, number>>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const clamp = (n: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, n));
const isNum = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v);

export const DIMENSION_LABEL: Record<RankDimension, string> = {
  sovereign: 'Soberanía',
  engagement: 'Engagement',
  wellbeing: 'Bienestar',
  churn: 'Retención',
  executionMomentum: 'Ejecución',
  relationalDepth: 'Relación',
};

/** Normaliza cada dimensión a 0-100 "más alto = mejor". Churn se invierte. */
function dimensionValue(u: RankableUser, dim: RankDimension): number | null {
  switch (dim) {
    case 'sovereign':          return isNum(u.sovereign) ? clamp(u.sovereign) : null;
    case 'engagement':         return isNum(u.engagement) ? clamp(u.engagement) : null;
    case 'wellbeing':          return isNum(u.wellbeing) ? clamp(u.wellbeing) : null;
    case 'executionMomentum':  return isNum(u.executionMomentum) ? clamp(u.executionMomentum) : null;
    case 'relationalDepth':    return isNum(u.relationalDepth) ? clamp(u.relationalDepth) : null;
    case 'churn':              return isNum(u.churnRisk) ? clamp((1 - u.churnRisk) * 100) : null; // invertido
  }
}

// ─── Score ponderado por usuario ──────────────────────────────────────────────

/**
 * Score 0-100 ponderado. Re-normaliza los pesos sobre las dimensiones DISPONIBLES
 * (un usuario sin bienestar no se penaliza a cero — se reparte el peso entre lo que sí hay).
 */
export function computeWeightedScore(
  u: RankableUser,
  weights: RankingWeights = DEFAULT_WEIGHTS,
): { score: number; contributions: Partial<Record<RankDimension, number>> } {
  const dims = Object.keys(weights) as RankDimension[];
  const present = dims
    .map((d) => ({ d, v: dimensionValue(u, d), w: weights[d] }))
    .filter((x): x is { d: RankDimension; v: number; w: number } => x.v !== null && x.w > 0);

  if (present.length === 0) return { score: 0, contributions: {} };

  const totalW = present.reduce((acc, x) => acc + x.w, 0);
  const contributions: Partial<Record<RankDimension, number>> = {};
  let score = 0;
  for (const x of present) {
    const wNorm = x.w / totalW;          // re-normaliza sobre lo disponible
    const contrib = x.v * wNorm;
    contributions[x.d] = Math.round(contrib);
    score += contrib;
  }
  return { score: clamp(Math.round(score)), contributions };
}

// ─── Ranking del conjunto ─────────────────────────────────────────────────────

/** Rankea usuarios por score ponderado (desc), con rank + percentil + driver dominante. */
export function rankUsers(
  users: RankableUser[],
  weights: RankingWeights = DEFAULT_WEIGHTS,
): RankedUser[] {
  const scored = users.map((u) => {
    const { score, contributions } = computeWeightedScore(u, weights);
    // Driver dominante = la dimensión con mayor aporte absoluto.
    let topDriver: RankedUser['topDriver'] = null;
    for (const [dim, c] of Object.entries(contributions) as [RankDimension, number][]) {
      if (topDriver === null || c > topDriver.contribution) {
        topDriver = { dimension: dim, label: DIMENSION_LABEL[dim], contribution: c };
      }
    }
    return { id: u.id, name: u.name, score, contributions, topDriver };
  });

  // Orden estable: score desc, luego nombre asc para empates.
  scored.sort((a, b) => (b.score - a.score) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const n = scored.length;
  return scored.map((s, i) => ({
    ...s,
    rank: i + 1,
    percentile: n <= 1 ? 100 : Math.round(((n - 1 - i) / (n - 1)) * 100),
  }));
}

/** Reordena un ranking ya calculado por una sola dimensión (para los chips de la UI). */
export function sortByDimension(ranked: RankedUser[], dim: RankDimension): RankedUser[] {
  return [...ranked].sort(
    (a, b) => (b.contributions[dim] ?? -1) - (a.contributions[dim] ?? -1),
  );
}
