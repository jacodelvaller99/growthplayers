/**
 * plaudLogic — lógica pura del sync de Plaud (sin IO, testeable en Jest).
 *
 * El mapeo grabación→cliente es por CONVENCIÓN DE NOMBRE: el dueño nombra la
 * grabación empezando por el nombre del cliente tal como está en Polaris
 * ("Juan Pérez — sesión semana 3"). Decisión confirmada: matcheo automático +
 * cola de revisión en admin para lo que no matchea (cero pérdidas, sin
 * adivinar). Un match AMBIGUO (dos clientes cuyo nombre aparece en el título)
 * también cae a la cola — asignar al cliente equivocado sería peor que pedir
 * un clic.
 */

export interface PlaudMatchCandidate {
  userId: string;
  fullName: string;
}

export type PlaudMatchResult =
  | { kind: 'match'; userId: string }
  | { kind: 'ambiguous'; userIds: string[] }
  | { kind: 'none' };

/** Normaliza para comparar: minúsculas, sin acentos, espacios colapsados. */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Matchea el nombre de una grabación contra los clientes.
 *
 * Regla: el nombre COMPLETO normalizado del cliente debe aparecer como
 * subsecuencia de palabras dentro del título normalizado. Se exige el nombre
 * completo (no solo el primer nombre) a propósito: "Juan" solo matchearía a
 * todos los Juanes → ambiguo → cola. Nombres de una sola palabra se aceptan
 * pero con match de palabra exacta, no substring ("Ana" no matchea "Mariana").
 */
export function matchRecordingToUser(
  recordingName: string,
  candidates: PlaudMatchCandidate[],
): PlaudMatchResult {
  const title = normalizeName(recordingName);
  if (!title) return { kind: 'none' };
  const titleWords = title.split(' ');

  const hits: string[] = [];
  for (const c of candidates) {
    const name = normalizeName(c.fullName);
    if (!name) continue;
    const nameWords = name.split(' ');
    if (containsWordSequence(titleWords, nameWords)) hits.push(c.userId);
  }

  if (hits.length === 1) return { kind: 'match', userId: hits[0] };
  if (hits.length > 1) return { kind: 'ambiguous', userIds: hits };
  return { kind: 'none' };
}

/** ¿Aparece `seq` como secuencia contigua de palabras dentro de `words`? */
function containsWordSequence(words: string[], seq: string[]): boolean {
  if (seq.length === 0) return false;
  outer: for (let i = 0; i <= words.length - seq.length; i++) {
    for (let j = 0; j < seq.length; j++) {
      if (words[i + j] !== seq[j]) continue outer;
    }
    return true;
  }
  return false;
}

// ─── Transcript de Plaud → texto plano ───────────────────────────────────────

/** Segmento del bloque `transaction` de Plaud (JSON dentro de data_content). */
export interface PlaudSegment {
  start_time?: number;
  end_time?: number;
  speaker?: string;
  content?: string;
  topic?: string;
}

/**
 * Convierte los segmentos del transcript de Plaud a texto legible
 * "Speaker: texto" por línea — el mismo shape que espera el prompt de resumen.
 * Tolerante: segmentos sin speaker o sin content no rompen.
 */
export function segmentsToTranscript(segments: PlaudSegment[]): string {
  return segments
    .map((seg) => {
      const text = (seg.content ?? seg.topic ?? '').trim();
      if (!text) return null;
      return seg.speaker ? `${seg.speaker}: ${text}` : text;
    })
    .filter((line): line is string => line !== null)
    .join('\n');
}
