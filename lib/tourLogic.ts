/**
 * tourLogic — el secuenciador puro del tour guiado de Norman.
 *
 * "Botón flotante de guía en toda la app: explica cada elemento real, con la
 * VOZ de Norman, toggle on/off." Este módulo es solo la secuencia — sin IO,
 * sin React, sin audio.
 *
 * ponytail: sin spotlight-por-elemento (measureInWindow + hueco recortado
 * sobre el punto exacto). El tour navega la pantalla REAL y explica por qué
 * existe con un panel a pantalla completa — mismo valor ("Norman te explica
 * su propia creación"), sin la plomería de medir y re-medir cada ancla en
 * cada resize/scroll de ~58 pantallas. Si se pide precisión pixel-perfect
 * más adelante, el punto de entrada es `TourOverlay` — la secuencia de abajo
 * no cambia.
 */
export interface TourStep {
  id: string;
  /** Ruta real de la app — el tour navega, no simula. */
  route: string;
  title: string;
  /** El "esto lo creamos para ti por esto" que pidió el dueño. */
  why: string;
}

export function nextIndex(current: number, total: number): number | null {
  const n = current + 1;
  return n < total ? n : null;
}

export function prevIndex(current: number, total: number): number | null {
  const p = current - 1;
  return p >= 0 ? p : null;
}

export function isLast(current: number, total: number): boolean {
  return current >= total - 1;
}

export function clampIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(index, total - 1));
}

/** URL del mp3 de voz para un paso, en el mismo bucket que el resto de audio
 *  de marca. Puede no existir todavía (handoff de generación) — quien
 *  reproduce ya degrada a silencio sin URL. */
export function voiceUrlFor(stepId: string): string {
  return `https://bizbbtiyftfjufxinwsu.supabase.co/storage/v1/object/public/wellness-audio/tour/${stepId}.mp3`;
}
