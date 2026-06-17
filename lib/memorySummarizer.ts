/**
 * memorySummarizer — generación IA del Memory OS (corre client-side vía Norman).
 *
 * Reutiliza `streamMentorResponse` (misma cadena Claude→NVIDIA→Groq→OpenAI que el
 * resto del app, igual que las notas de mentoría). Produce:
 *   1) resumen estructurado de una conversación/sesión/llamada  → memory_summaries
 *   2) síntesis acumulativa del perfil vivo                      → user_memory_profile
 *   3) briefing operativo pre-mentoría (ADMIN)                   → admin_briefings
 *
 * Todo degrada en silencio: si la IA o la BD fallan, no rompe el flujo del usuario.
 * Throttle: el llamador decide CUÁNDO (al cerrar sesión), no por mensaje.
 */
import { streamMentorResponse, type MentorContext } from '@/lib/mentor';
import {
  extractSection,
  mergeMemoryProfile,
  parseSummaryBlocks,
  splitList,
  type MemoryProfile,
  type ParsedSummary,
} from '@/lib/memoryLogic';
import {
  fetchLatestSummaries,
  fetchMemoryProfile,
  insertBriefing,
  insertSummary,
  upsertMemoryProfile,
  type AdminBriefing,
  type MemorySummaryRow,
} from '@/lib/memory';
import { fetchConfrontationItems } from '@/lib/confrontation';
import type { ConfrontationItem } from '@/lib/confrontationLogic';

export type SummarySource = 'chat' | 'mentorship' | 'plaud' | 'manual';

export interface ConversationTurn {
  role: 'user' | 'assistant' | string;
  text: string;
}

// ─── Contexto mínimo (para llamadas admin que no tienen el MentorContext completo) ─
export function makeMinimalContext(userName = 'el operador', role = 'Operador'): MentorContext {
  return {
    userName,
    role,
    totalDays: 0,
    streak: 0,
    sovereignScore: 0,
    tier: 'soberano',
    activeModuleTitle: '',
    activeModuleProgress: 0,
    northStar: { purpose: '', identity: '', nonNegotiables: [], dailyReminder: '' },
    todayCheckIn: null,
    messageCount: 0,
  };
}

const noop = () => {};

function turnsToTranscript(turns: ConversationTurn[]): string {
  return turns
    .map((t) => {
      const isAssistant = t.role === 'assistant' || t.role === 'mentor';
      return `${isAssistant ? 'NORMAN' : 'OPERADOR'}: ${t.text}`;
    })
    .join('\n')
    .slice(0, 12000);
}

// ─── 1. Resumen de una conversación / sesión / llamada ───────────────────────────
const SUMMARY_INSTRUCTION =
  'Resume la siguiente interacción para mi sistema de memoria. Devuelve EXACTAMENTE estos ' +
  'bloques con sus marcadores (sin texto fuera de ellos):\n' +
  '===RESUMEN===\n(2-4 frases: qué se trabajó, decisiones, estado)\n' +
  '===TEMAS===\n- tema\n- tema\n' +
  '===COMPROMISOS===\n- lo que el operador dijo que haría (verbo + plazo si lo hay)\n' +
  '===PREGUNTAS===\n- preguntas o asuntos sin resolver\n' +
  '===TONO===\n(una línea: estado emocional dominante)\n' +
  '===FOCO===\n(una frase: el foco sugerido para la próxima vez)';

export async function summarizeConversation(
  userId: string,
  ctx: MentorContext,
  turns: ConversationTurn[],
  source: SummarySource,
  sourceId?: string,
): Promise<ParsedSummary | null> {
  if (!userId || turns.length === 0) return null;
  try {
    const transcript = turnsToTranscript(turns);
    let out = '';
    await streamMentorResponse(
      ctx,
      `${SUMMARY_INSTRUCTION}\n\nINTERACCIÓN:\n${transcript}`,
      [],
      (d) => { out += d; },
    );
    const parsed = parseSummaryBlocks(out);
    if (!parsed.summary && parsed.commitments.length === 0) return null;
    const row: MemorySummaryRow & { user_id: string } = {
      user_id: userId,
      source_type: source,
      source_id: sourceId ?? null,
      ...parsed,
    };
    await insertSummary(row);
    return parsed;
  } catch {
    return null;
  }
}

// ─── 2. Síntesis del perfil vivo ─────────────────────────────────────────────────
const PROFILE_SYNTH_INSTRUCTION =
  'Actualiza el PERFIL del operador integrando el nuevo resumen con lo que ya sabíamos. ' +
  'Sintetiza, no acumules ruido. Devuelve EXACTAMENTE estos bloques (deja vacío el que no ' +
  'tenga señal nueva):\n' +
  '===IDENTIDAD===\n(1-2 frases de quién es operativamente)\n' +
  '===META===\n(su meta/transformación actual)\n' +
  '===BLOQUEOS===\n- patrón que lo frena\n' +
  '===LOGROS===\n- avance reciente concreto\n' +
  '===RIESGOS===\n- riesgo operativo o de bienestar\n' +
  '===ESTILO===\n(cómo decide / cómo prefiere que le hablen)\n' +
  '===FOCO===\n(en qué debería enfocarse la mentoría ahora)';

function profilePatchFromBlocks(out: string): Partial<MemoryProfile> {
  return {
    identity_summary:   extractSection(out, 'IDENTIDAD') || undefined,
    current_goal:       extractSection(out, 'META') || undefined,
    recurring_blockers: splitList(extractSection(out, 'BLOQUEOS')),
    recent_wins:        splitList(extractSection(out, 'LOGROS')),
    current_risks:      splitList(extractSection(out, 'RIESGOS')),
    decision_style:     extractSection(out, 'ESTILO') || undefined,
    mentorship_focus:   extractSection(out, 'FOCO') || undefined,
  };
}

export async function updateProfileFromSummary(
  userId: string,
  ctx: MentorContext,
  parsed: ParsedSummary,
): Promise<boolean> {
  if (!userId) return false;
  try {
    const existing = await fetchMemoryProfile(userId);
    let out = '';
    const digest =
      `RESUMEN NUEVO: ${parsed.summary}\n` +
      `TEMAS: ${parsed.key_topics.join(', ')}\n` +
      `COMPROMISOS: ${parsed.commitments.join(' | ')}\n` +
      `PREGUNTAS ABIERTAS: ${parsed.unresolved_questions.join(' | ')}\n` +
      `PERFIL ACTUAL: ${existing ? JSON.stringify({
        identity: existing.identity_summary, goal: existing.current_goal,
        blockers: existing.recurring_blockers, focus: existing.mentorship_focus,
      }) : '(vacío)'}`;
    await streamMentorResponse(ctx, `${PROFILE_SYNTH_INSTRUCTION}\n\n${digest}`, [], (d) => { out += d; });

    const patch = profilePatchFromBlocks(out);
    // Compromisos del resumen → nuevos compromisos abiertos (mergeMemoryProfile re-normaliza).
    patch.commitments_open = parsed.commitments.map((text) => ({
      id: text.toLowerCase().slice(0, 80),
      text,
    }));
    const merged = mergeMemoryProfile(existing, patch);
    return await upsertMemoryProfile(userId, merged);
  } catch {
    return false;
  }
}

// ─── 3. Briefing operativo pre-mentoría (ADMIN) ──────────────────────────────────
const BRIEFING_INSTRUCTION =
  'Prepárame un BRIEFING operador para la próxima mentoría con este cliente. Tono filoso, ' +
  'premium, útil — como un jefe de staff que confronta. Devuelve EXACTAMENTE estos bloques:\n' +
  '===RESUMEN===\n(quién es y qué está atravesando, 2-3 frases)\n' +
  '===PREGUNTO===\n- lo que ha estado preguntando últimamente\n' +
  '===TEMAS===\n- temas recurrentes a los que vuelve\n' +
  '===LOOPS===\n- compromisos hechos sin cerrar / asuntos abiertos\n' +
  '===TOPICOS===\n- 3 temas a tratar en la próxima sesión\n' +
  '===CHALLENGE===\n- 1-2 afirmaciones que confronten su patrón real (ej: "Pides foco, pero el problema es que evitas decidir")\n' +
  '===FRICCIONES===\n(lista las fricciones pre-rankeadas que recibiste. Cada línea: "[fecha] DIJO X — HIZO Y — gap Z". NO infieras nuevas. Si no recibiste fricciones en el digest, deja este bloque VACÍO)\n' +
  '===PROGRESO===\n- progreso o regresión visible desde la última vez\n' +
  '===RIESGO===\n(una palabra: low | medium | high)';

function parseRisk(raw: string): 'low' | 'medium' | 'high' {
  const r = raw.toLowerCase();
  if (r.includes('high') || r.includes('alto')) return 'high';
  if (r.includes('medium') || r.includes('medio')) return 'medium';
  return 'low';
}

export async function generateAdminBriefing(
  userId: string,
  opts?: { ctx?: MentorContext; userName?: string },
): Promise<AdminBriefing | null> {
  if (!userId) return null;
  try {
    const [profile, summaries, confrontations] = await Promise.all([
      fetchMemoryProfile(userId),
      fetchLatestSummaries(userId, 6),
      fetchConfrontationItems(userId).catch(() => [] as ConfrontationItem[]),
    ]);
    const ctx = opts?.ctx ?? makeMinimalContext(opts?.userName);
    const friccionesBlock = confrontations.length > 0
      ? `\n\nFRICCIONES DETECTADAS (pre-rankeadas — incluí las TOP 3 en el bloque ===FRICCIONES=== citando el dato literal; NO inventes otras):\n` +
        confrontations.slice(0, 3).map((c, i) => {
          const said = c.evidence.said ? `"${c.evidence.said.text}"${c.evidence.said.source_date ? ` (${new Date(c.evidence.said.source_date).toLocaleDateString('es-CO')})` : ''}` : '(sin verbo registrado)';
          return `${i + 1}. [${c.dimension} · ${c.severity}] DIJO: ${said} — HIZO: ${c.evidence.did.value} (${c.evidence.did.detail}) — sugerencia: ${c.confrontation_prompt}`;
        }).join('\n')
      : '';
    const digest =
      `PERFIL: ${profile ? JSON.stringify(profile).slice(0, 2500) : '(sin perfil)'}\n\n` +
      `ÚLTIMOS RESÚMENES:\n${summaries
        .map((s, i) => `${i + 1}. [${s.source_type}] ${s.summary} (temas: ${(s.key_topics ?? []).join(', ')}; loops: ${(s.unresolved_questions ?? []).join(', ')})`)
        .join('\n') || '(sin resúmenes)'}` +
      friccionesBlock;

    let out = '';
    await streamMentorResponse(ctx, `${BRIEFING_INSTRUCTION}\n\n${digest}`, [], (d) => { out += d; });

    const briefing: AdminBriefing = {
      user_id: userId,
      summary:                     extractSection(out, 'RESUMEN'),
      what_they_asked_recently:    splitList(extractSection(out, 'PREGUNTO')),
      recurring_themes:            splitList(extractSection(out, 'TEMAS')),
      open_loops:                  splitList(extractSection(out, 'LOOPS')),
      suggested_mentorship_topics: splitList(extractSection(out, 'TOPICOS')),
      challenge_points:            splitList(extractSection(out, 'CHALLENGE')),
      frictions:                   splitList(extractSection(out, 'FRICCIONES')),
      recent_progress:             splitList(extractSection(out, 'PROGRESO')),
      risk_level:                  parseRisk(extractSection(out, 'RIESGO')),
    };
    if (!briefing.summary && (briefing.suggested_mentorship_topics?.length ?? 0) === 0) return null;
    await insertBriefing(briefing);
    return briefing;
  } catch {
    return null;
  }
}
