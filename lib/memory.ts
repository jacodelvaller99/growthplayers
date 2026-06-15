/**
 * memory — capa de ACCESO A DATOS del Memory OS (IO).
 *
 * Toda lectura/escritura está envuelta en try/catch y degrada a vacío: si la
 * migración aún no se aplicó o no hay red, la app no rompe — simplemente no hay
 * memoria todavía. La lógica pura vive en `lib/memoryLogic.ts`.
 *
 * Privacidad: `admin_briefings` y `admin_notes` son admin-only por RLS; un cliente
 * que intente leerlas recibe filas vacías. Nunca se inyectan al contexto de Norman.
 */
import { mem, intel } from '@/lib/supabase';
import {
  assembleMentorMemory,
  type AssembledMentorMemory,
  type MemoryProfile,
  type MemorySnippet,
  type MemorySummaryRow,
} from '@/lib/memoryLogic';

export type {
  MemoryProfile,
  MemorySummaryRow,
  MemorySnippet,
  AssembledMentorMemory,
  Commitment,
  ParsedSummary,
} from '@/lib/memoryLogic';

export interface AdminBriefing {
  id?: string;
  user_id: string;
  generated_for_date?: string;
  summary?: string;
  what_they_asked_recently?: string[];
  recurring_themes?: string[];
  open_loops?: string[];
  suggested_mentorship_topics?: string[];
  challenge_points?: string[];
  recent_progress?: string[];
  risk_level?: 'low' | 'medium' | 'high';
  generated_at?: string;
}

export interface AdminNote {
  id?: string;
  user_id: string;
  author_id?: string | null;
  note: string;
  created_at?: string;
}

export interface RecentMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

const PROFILE_COLS =
  'user_id,identity_summary,current_goal,transformation_goal,business_context,' +
  'recurring_blockers,emotional_patterns,decision_style,current_risks,recent_wins,' +
  'commitments_open,commitments_completed,mentorship_focus,preferred_language_style,' +
  'relationship_context,health_energy_context,updated_at';

// ─── Perfil vivo ──────────────────────────────────────────────────────────────────
export async function fetchMemoryProfile(userId: string): Promise<MemoryProfile | null> {
  if (!userId) return null;
  try {
    const { data, error } = await mem.memoryProfile()
      .select(PROFILE_COLS)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return data as MemoryProfile;
  } catch {
    return null;
  }
}

/**
 * Upsert directo del perfil COMPLETO ya mezclado por el llamador (vía
 * `mergeMemoryProfile`). Directo (no offline queue) para evitar clobber por
 * merge contra estado obsoleto. Degrada en silencio si falla.
 */
export async function upsertMemoryProfile(
  userId: string,
  fullProfile: MemoryProfile,
): Promise<boolean> {
  if (!userId) return false;
  try {
    const row = { ...fullProfile, user_id: userId, updated_at: new Date().toISOString() };
    const { error } = await mem.memoryProfile().upsert(row, { onConflict: 'user_id' });
    return !error;
  } catch {
    return false;
  }
}

// ─── Resúmenes unificados ──────────────────────────────────────────────────────────
export async function fetchLatestSummaries(
  userId: string,
  limit = 5,
): Promise<MemorySummaryRow[]> {
  if (!userId) return [];
  try {
    const { data, error } = await mem.summaries()
      .select('id,user_id,source_type,source_id,summary,key_topics,commitments,unresolved_questions,emotional_tone,suggested_next_focus,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as MemorySummaryRow[];
  } catch {
    return [];
  }
}

export async function insertSummary(row: MemorySummaryRow & { user_id: string }): Promise<boolean> {
  if (!row.user_id) return false;
  try {
    const { error } = await mem.summaries().insert({
      user_id:              row.user_id,
      source_type:          row.source_type ?? 'chat',
      source_id:            row.source_id ?? null,
      summary:              row.summary ?? '',
      key_topics:           row.key_topics ?? [],
      commitments:          row.commitments ?? [],
      unresolved_questions: row.unresolved_questions ?? [],
      emotional_tone:       row.emotional_tone ?? '',
      suggested_next_focus: row.suggested_next_focus ?? '',
    });
    return !error;
  } catch {
    return false;
  }
}

// ─── Briefings de admin (admin-only por RLS) ───────────────────────────────────────
export async function fetchAdminBriefing(userId: string): Promise<AdminBriefing | null> {
  if (!userId) return null;
  try {
    const { data, error } = await mem.briefings()
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return data as AdminBriefing;
  } catch {
    return null;
  }
}

export async function insertBriefing(row: AdminBriefing): Promise<boolean> {
  if (!row.user_id) return false;
  try {
    const { error } = await mem.briefings().insert({
      user_id:                     row.user_id,
      summary:                     row.summary ?? '',
      what_they_asked_recently:    row.what_they_asked_recently ?? [],
      recurring_themes:            row.recurring_themes ?? [],
      open_loops:                  row.open_loops ?? [],
      suggested_mentorship_topics: row.suggested_mentorship_topics ?? [],
      challenge_points:            row.challenge_points ?? [],
      recent_progress:             row.recent_progress ?? [],
      risk_level:                  row.risk_level ?? 'low',
    });
    return !error;
  } catch {
    return false;
  }
}

// ─── Notas privadas del coach (admin-only por RLS) ─────────────────────────────────
export async function fetchAdminNotes(userId: string): Promise<AdminNote[]> {
  if (!userId) return [];
  try {
    const { data, error } = await mem.adminNotes()
      .select('id,user_id,author_id,note,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as AdminNote[];
  } catch {
    return [];
  }
}

export async function addAdminNote(
  userId: string,
  authorId: string,
  note: string,
): Promise<boolean> {
  if (!userId || !note.trim()) return false;
  try {
    const { error } = await mem.adminNotes().insert({
      user_id: userId,
      author_id: authorId,
      note: note.trim(),
    });
    return !error;
  } catch {
    return false;
  }
}

// ─── Mensajes recientes (continuidad conversacional) ───────────────────────────────
export async function fetchRecentMessages(userId: string, limit = 12): Promise<RecentMessage[]> {
  if (!userId) return [];
  try {
    const { data, error } = await intel.conversations()
      .select('role,content,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    // Devolver en orden cronológico (más viejo→nuevo) para el prompt.
    return (data as RecentMessage[]).slice().reverse();
  } catch {
    return [];
  }
}

// ─── Ensamblado del contexto de memoria para Norman ────────────────────────────────
/**
 * Reúne perfil + últimos resúmenes (+ memorias relevantes ya recuperadas por el
 * llamador vía useMentorMemory.searchMemories) y los compacta para `MentorContext`.
 * NO toca briefings/notas de admin.
 */
export async function buildMentorMemoryContext(
  userId: string,
  relevantMemories?: MemorySnippet[],
): Promise<AssembledMentorMemory | null> {
  if (!userId) return null;
  try {
    const [profile, summaries] = await Promise.all([
      fetchMemoryProfile(userId),
      fetchLatestSummaries(userId, 3),
    ]);
    if (!profile && summaries.length === 0 && (!relevantMemories || relevantMemories.length === 0)) {
      return null;
    }
    return assembleMentorMemory(profile, summaries, relevantMemories ?? []);
  } catch {
    return null;
  }
}
