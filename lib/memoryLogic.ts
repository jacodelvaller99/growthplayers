/**
 * memoryLogic — lógica PURA del Memory OS (sin IO, sin React, sin Supabase).
 *
 * Vive aparte de `lib/memory.ts` (que hace IO) para poder testear la síntesis del
 * perfil, el parseo de resúmenes y el ensamblado de contexto sin arrastrar el cliente.
 *
 * Reglas clave:
 *  - El perfil vivo SINTETIZA, no acumula ruido: dedup + caps por campo (anti-bloat).
 *  - El parser tolera salida malformada de Norman (degradación elegante).
 *  - `clientSafeProfile` quita lo clínico/áspero para la vista de apoyo del cliente.
 */

// ─── Tipos ──────────────────────────────────────────────────────────────────────
export interface Commitment {
  id: string;
  text: string;
  created_at?: string;
  completed_at?: string;
  source?: string;
}

export interface MemoryProfile {
  user_id?: string;
  identity_summary?: string | null;
  current_goal?: string | null;
  transformation_goal?: string | null;
  business_context?: string | null;
  recurring_blockers?: string[];
  emotional_patterns?: string[];
  decision_style?: string | null;
  current_risks?: string[];
  recent_wins?: string[];
  commitments_open?: Commitment[];
  commitments_completed?: Commitment[];
  mentorship_focus?: string | null;
  preferred_language_style?: string | null;
  relationship_context?: Record<string, unknown>;
  health_energy_context?: Record<string, unknown>;
  updated_at?: string;
}

export interface ParsedSummary {
  summary: string;
  key_topics: string[];
  commitments: string[];
  unresolved_questions: string[];
  emotional_tone: string;
  suggested_next_focus: string;
}

export interface MemorySummaryRow extends ParsedSummary {
  id?: string;
  user_id?: string;
  source_type?: 'chat' | 'mentorship' | 'plaud' | 'manual' | 'aggregate';
  source_id?: string | null;
  created_at?: string;
}

export interface MemorySnippet {
  content: string;
  memory_type?: string;
  importance?: number;
  similarity?: number;
}

export interface AssembledMentorMemory {
  synopsis: string;
  openCommitments: string[];
  recentWins: string[];
  recurringBlockers: string[];
  openLoops: string[];
  nextFocus: string | null;
  relevantMemories: MemorySnippet[];
}

// ─── Caps (anti-bloat) ────────────────────────────────────────────────────────────
const CAP = {
  blockers: 6,
  patterns: 6,
  risks: 6,
  wins: 8,
  commitmentsCompleted: 25,
  text: 600, // longitud máx. de campos de texto sintetizados
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────────
function clean(s: unknown): string {
  return typeof s === 'string' ? s.trim() : '';
}

/** Une listas de strings, deduplica (case-insensitive), prioriza `incoming` y capea. */
function mergeStrings(existing: unknown, incoming: unknown, cap: number): string[] {
  const toArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(clean).filter(Boolean) : [];
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const item of [...toArr(incoming), ...toArr(existing)]) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= cap) break;
  }
  return merged;
}

/** Texto: `incoming` pisa si trae contenido; si no, conserva `existing`. Capa longitud. */
function pickText(existing: unknown, incoming: unknown): string | null {
  const inc = clean(incoming);
  if (inc) return inc.slice(0, CAP.text);
  const ex = clean(existing);
  return ex ? ex.slice(0, CAP.text) : null;
}

function asCommitments(v: unknown): Commitment[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((c): Commitment | null => {
      if (typeof c === 'string') {
        const text = clean(c);
        return text ? { id: text.toLowerCase().slice(0, 80), text } : null;
      }
      if (c && typeof c === 'object') {
        const obj = c as Record<string, unknown>;
        const text = clean(obj.text);
        if (!text) return null;
        return {
          id: clean(obj.id) || text.toLowerCase().slice(0, 80),
          text,
          created_at: clean(obj.created_at) || undefined,
          completed_at: clean(obj.completed_at) || undefined,
          source: clean(obj.source) || undefined,
        };
      }
      return null;
    })
    .filter((c): c is Commitment => c !== null);
}

// ─── 1. mergeMemoryProfile — síntesis acumulativa pero acotada ───────────────────
/**
 * Mezcla el perfil existente con la actualización propuesta por Norman.
 * - Texto: la actualización pisa si trae contenido.
 * - Listas: unión deduplicada y capeada (lo nuevo primero).
 * - Compromisos: cualquier id presente en `incoming.commitments_completed` (o con
 *   `completed_at`) se MUEVE de open→completed; los demás se conservan abiertos.
 * No toca `updated_at` (lo sella la capa IO).
 */
export function mergeMemoryProfile(
  existing: MemoryProfile | null | undefined,
  incoming: Partial<MemoryProfile> | null | undefined,
): MemoryProfile {
  const ex: MemoryProfile = existing ?? {};
  const inc: Partial<MemoryProfile> = incoming ?? {};

  // Compromisos: construir el set de "completados" (por id) a partir de ambos lados.
  const exOpen = asCommitments(ex.commitments_open);
  const incOpen = asCommitments(inc.commitments_open);
  const exDone = asCommitments(ex.commitments_completed);
  const incDone = asCommitments(inc.commitments_completed);

  const doneById = new Map<string, Commitment>();
  for (const c of [...exDone, ...incDone]) doneById.set(c.id, c);
  // open que llegan ya con completed_at → pasan a done
  for (const c of [...exOpen, ...incOpen]) {
    if (c.completed_at && !doneById.has(c.id)) doneById.set(c.id, c);
  }

  const openById = new Map<string, Commitment>();
  for (const c of [...incOpen, ...exOpen]) {
    if (doneById.has(c.id)) continue;
    if (!openById.has(c.id)) openById.set(c.id, c);
  }

  const completed = Array.from(doneById.values()).slice(-CAP.commitmentsCompleted);

  return {
    identity_summary:        pickText(ex.identity_summary, inc.identity_summary),
    current_goal:            pickText(ex.current_goal, inc.current_goal),
    transformation_goal:     pickText(ex.transformation_goal, inc.transformation_goal),
    business_context:        pickText(ex.business_context, inc.business_context),
    decision_style:          pickText(ex.decision_style, inc.decision_style),
    mentorship_focus:        pickText(ex.mentorship_focus, inc.mentorship_focus),
    preferred_language_style: pickText(ex.preferred_language_style, inc.preferred_language_style),
    recurring_blockers:      mergeStrings(ex.recurring_blockers, inc.recurring_blockers, CAP.blockers),
    emotional_patterns:      mergeStrings(ex.emotional_patterns, inc.emotional_patterns, CAP.patterns),
    current_risks:           mergeStrings(ex.current_risks, inc.current_risks, CAP.risks),
    recent_wins:             mergeStrings(ex.recent_wins, inc.recent_wins, CAP.wins),
    commitments_open:        Array.from(openById.values()),
    commitments_completed:   completed,
    relationship_context:    { ...(ex.relationship_context ?? {}), ...(inc.relationship_context ?? {}) },
    health_energy_context:   { ...(ex.health_energy_context ?? {}), ...(inc.health_energy_context ?? {}) },
  };
}

// ─── Parsers de bloques etiquetados `===CLAVE===` (reusados por summarizer) ──────
/** Extrae el cuerpo de una sección `===LABEL=== … ` hasta la próxima sección o el fin. */
export function extractSection(text: string, label: string): string {
  const re = new RegExp(
    `===\\s*${label}\\s*===([\\s\\S]*?)(?:===\\s*[A-ZÁÉÍÓÚÑ]+\\s*===|$)`,
    'i',
  );
  const m = clean(text).match(re);
  return m ? m[1].trim() : '';
}

/** Convierte un bloque en lista: líneas `- item` o una sola línea separada por comas. */
export function splitList(raw: string): string[] {
  const r = clean(raw);
  if (!r) return [];
  const lines = r
    .split('\n')
    .map((l) => l.replace(/^[\s]*[-•*]\s?/, '').trim())
    .filter(Boolean);
  if (lines.length === 1 && lines[0].includes(',') && !/[.!?]$/.test(lines[0])) {
    return lines[0].split(',').map((s) => s.trim()).filter(Boolean);
  }
  return lines;
}

// ─── 2. parseSummaryBlocks — parser tolerante de la salida de Norman ─────────────
/**
 * Norman devuelve secciones etiquetadas con marcadores `===CLAVE===`:
 *   ===RESUMEN=== / ===TEMAS=== / ===COMPROMISOS=== / ===PREGUNTAS=== / ===TONO=== / ===FOCO===
 * Las listas son líneas `- item`. Si no hay marcadores, todo el texto = resumen.
 */
export function parseSummaryBlocks(aiOutput: string): ParsedSummary {
  const text = clean(aiOutput);
  const empty: ParsedSummary = {
    summary: '',
    key_topics: [],
    commitments: [],
    unresolved_questions: [],
    emotional_tone: '',
    suggested_next_focus: '',
  };
  if (!text) return empty;

  // Sin marcadores → degradar: todo es resumen.
  if (!/===\s*[A-ZÁÉÍÓÚÑ]+\s*===/i.test(text)) {
    return { ...empty, summary: text.slice(0, 4000) };
  }

  return {
    summary:              extractSection(text, 'RESUMEN').slice(0, 4000),
    key_topics:           splitList(extractSection(text, 'TEMAS')),
    commitments:          splitList(extractSection(text, 'COMPROMISOS')),
    unresolved_questions: splitList(extractSection(text, 'PREGUNTAS')),
    emotional_tone:       extractSection(text, 'TONO').split('\n')[0]?.trim() ?? '',
    suggested_next_focus: extractSection(text, 'FOCO').trim(),
  };
}

// ─── 3. clientSafeProfile — versión de apoyo para el cliente ─────────────────────
/**
 * Quita campos clínicos/ásperos o privados. El cliente ve su narrativa de progreso,
 * NO los riesgos crudos, patrones emocionales, estilo de decisión, ni contexto de
 * relaciones/salud (privacidad). Las notas privadas del admin viven en otra tabla.
 */
export function clientSafeProfile(profile: MemoryProfile | null | undefined): MemoryProfile {
  const p = profile ?? {};
  return {
    identity_summary:      p.identity_summary ?? null,
    current_goal:          p.current_goal ?? null,
    transformation_goal:   p.transformation_goal ?? null,
    recent_wins:           p.recent_wins ?? [],
    commitments_open:      p.commitments_open ?? [],
    commitments_completed: p.commitments_completed ?? [],
    mentorship_focus:      p.mentorship_focus ?? null,
  };
}

// ─── 4. assembleMentorMemory — contexto compacto para Norman ─────────────────────
/**
 * Compone lo que `buildSystemPrompt` inyecta en el bloque "MEMORIA DEL CLIENTE".
 * NUNCA incluye briefings ni notas de admin (esos son otra capa). Solo perfil +
 * últimos resúmenes + memorias relevantes ya recuperadas.
 */
export function assembleMentorMemory(
  profile: MemoryProfile | null | undefined,
  summaries: MemorySummaryRow[] | null | undefined,
  memories: MemorySnippet[] | null | undefined,
): AssembledMentorMemory {
  const p = profile ?? {};
  const sums = (summaries ?? []).slice(0, 3);

  const synopsisParts = [
    clean(p.identity_summary),
    p.current_goal ? `Meta actual: ${clean(p.current_goal)}` : '',
    p.decision_style ? `Estilo de decisión: ${clean(p.decision_style)}` : '',
    p.preferred_language_style ? `Prefiere: ${clean(p.preferred_language_style)}` : '',
  ].filter(Boolean);

  const openLoops: string[] = [];
  const seenLoops = new Set<string>();
  for (const s of sums) {
    for (const q of s.unresolved_questions ?? []) {
      const t = clean(q);
      if (t && !seenLoops.has(t.toLowerCase())) {
        seenLoops.add(t.toLowerCase());
        openLoops.push(t);
      }
    }
  }

  const nextFocus =
    clean(sums.find((s) => clean(s.suggested_next_focus))?.suggested_next_focus) ||
    clean(p.mentorship_focus) ||
    null;

  return {
    synopsis: synopsisParts.join(' · '),
    openCommitments: (p.commitments_open ?? []).map((c) => clean(c.text)).filter(Boolean).slice(0, 6),
    recentWins: (p.recent_wins ?? []).map(clean).filter(Boolean).slice(0, 4),
    recurringBlockers: (p.recurring_blockers ?? []).map(clean).filter(Boolean).slice(0, 4),
    openLoops: openLoops.slice(0, 5),
    nextFocus,
    relevantMemories: (memories ?? []).slice(0, 4),
  };
}
