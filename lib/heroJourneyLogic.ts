/**
 * heroJourneyLogic — Fase 2 (Motor de Momentos), lógica pura.
 *
 * Un "momento" es la única cosa que el camino del héroe le muestra al usuario
 * al entrar, como mucho una vez por día: o bien un eco de lo último que le
 * dijo a Norman (si hay algo nuevo que ecoar), o un recordatorio de gratitud.
 * Nunca ambos — un popup por día, no una acumulación.
 */

export interface HeroMomentState {
  lastShownDate: string | null;
  lastEchoedSummaryId: string | null;
}

export const defaultHeroMomentState: HeroMomentState = {
  lastShownDate: null,
  lastEchoedSummaryId: null,
};

export interface LatestSummaryInput {
  id: string;
  summary: string;
}

export type HeroMoment =
  | { kind: 'ai_echo'; summaryId: string; message: string }
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

export function selectMoment(input: {
  today: string;
  name: string;
  latestSummary: LatestSummaryInput | null;
  state: HeroMomentState;
}): HeroMoment | null {
  const { today, name, latestSummary, state } = input;
  if (state.lastShownDate === today) return null;

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
  };
}
