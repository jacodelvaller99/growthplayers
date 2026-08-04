/**
 * heroJourneyLogic — Motor de Momentos, lógica pura.
 *
 * Un "momento" es la única cosa que el camino del héroe le muestra al usuario
 * al entrar, como mucho una vez por día — nunca más de uno apilado. Ladder,
 * de mayor a menor prioridad:
 *   1. ai_echo      — algo nuevo que Norman todavía no le ecoó (Fase 2).
 *   2. memory_echo  — un logro viejo (`recent_wins`) que nunca tuvo su momento
 *                     antes de arriesgarse a caer del cupo (Fase 3 — "Ecos de
 *                     memoria"). El más antiguo que sigue vivo, primero: es el
 *                     que más cerca está de desaparecer para siempre.
 *   3. gratitude    — si no hay nada nuevo que ecoar, un recordatorio simple.
 */

export interface HeroMomentState {
  lastShownDate: string | null;
  lastEchoedSummaryId: string | null;
  /** Logros (`recent_wins`) que ya tuvieron su momento — en minúsculas, dedup. */
  echoedWinKeys: string[];
}

export const defaultHeroMomentState: HeroMomentState = {
  lastShownDate: null,
  lastEchoedSummaryId: null,
  echoedWinKeys: [],
};

// Cota de higiene para el estado local — no está atado al cupo de `recent_wins`
// (que puede rotar), solo evita que la lista de "ya ecoados" crezca sin límite.
const ECHOED_WINS_CAP = 40;

export interface LatestSummaryInput {
  id: string;
  summary: string;
}

export type HeroMoment =
  | { kind: 'ai_echo'; summaryId: string; message: string }
  | { kind: 'memory_echo'; win: string; message: string }
  | { kind: 'gratitude'; message: string };

function greeting(name: string): string {
  const trimmed = name.trim();
  return trimmed ? `Bienvenido de nuevo, ${trimmed}.` : 'Bienvenido de nuevo.';
}

function firstSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^[^.!?\n]+[.!?]?/);
  return (match ? match[0] : trimmed).trim();
}

/** El logro vivo más antiguo que todavía no tuvo su momento. `recentWins[0]` es
 *  el más nuevo (así los guarda `mergeMemoryProfile`), así que se recorre desde
 *  el final — el que más cerca está de caer del cupo por antigüedad. */
function pickUnechoedWin(recentWins: string[], echoedKeys: string[]): string | null {
  const echoed = new Set(echoedKeys.map((k) => k.toLowerCase()));
  for (let i = recentWins.length - 1; i >= 0; i--) {
    const win = recentWins[i].trim();
    if (win && !echoed.has(win.toLowerCase())) return win;
  }
  return null;
}

export function selectMoment(input: {
  today: string;
  name: string;
  latestSummary: LatestSummaryInput | null;
  recentWins: string[];
  state: HeroMomentState;
}): HeroMoment | null {
  const { today, name, latestSummary, recentWins, state } = input;
  if (state.lastShownDate === today) return null;

  // PRIMERA VEZ: callarse. `lastShownDate === null` significa que este usuario
  // nunca vio un momento — y la rama de gratitud dice "Bienvenido de NUEVO" y
  // "gracias por VOLVER a aparecer hoy". A alguien que acaba de terminar el
  // onboarding eso es una mentira verificable, en la primera frase que el
  // producto le dirige. En una marca cuyo principio 1 es confrontar con dato,
  // abrir mintiendo es el peor arranque posible. El momento empieza mañana,
  // cuando volver ya es cierto.
  if (state.lastShownDate === null) return null;

  const hasFreshEcho =
    !!latestSummary?.summary.trim() && latestSummary.id !== state.lastEchoedSummaryId;

  if (hasFreshEcho && latestSummary) {
    const echo = firstSentence(latestSummary.summary);
    return {
      kind: 'ai_echo',
      summaryId: latestSummary.id,
      message: `${greeting(name)} La última vez me dijiste: "${echo}". Sigo aquí, y lo recuerdo.`,
    };
  }

  const win = pickUnechoedWin(recentWins, state.echoedWinKeys);
  if (win) {
    return {
      kind: 'memory_echo',
      win,
      message: `${greeting(name)} ¿Recuerdas esto? Hace un tiempo lograste: "${win}". Sigue contando.`,
    };
  }

  return {
    kind: 'gratitude',
    message: `${greeting(name)} Antes de seguir: gracias por volver a aparecer hoy.`,
  };
}

export function markMomentShown(
  state: HeroMomentState,
  today: string,
  moment: HeroMoment,
): HeroMomentState {
  return {
    lastShownDate: today,
    lastEchoedSummaryId: moment.kind === 'ai_echo' ? moment.summaryId : state.lastEchoedSummaryId,
    echoedWinKeys:
      moment.kind === 'memory_echo'
        ? [...state.echoedWinKeys, moment.win.toLowerCase()].slice(-ECHOED_WINS_CAP)
        : state.echoedWinKeys,
  };
}
