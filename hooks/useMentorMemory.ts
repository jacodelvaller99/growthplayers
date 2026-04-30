/**
 * useMentorMemory — vector memory for Norman.
 *
 * addMemory():    saves a memory + triggers embedding generation (edge function)
 * searchMemories(): calls pgvector cosine search via edge function
 * getRecentMemories(): last N memories ordered by importance + recency
 */
import { useCallback } from 'react';
import { supabase, intel } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemoryType = 'conversation' | 'insight' | 'breakthrough' | 'struggle' | 'goal' | 'reflection';

export interface MentorMemory {
  id:           string;
  content:      string;
  memory_type:  MemoryType;
  importance:   number;
  created_at:   string;
  similarity?:  number;
  metadata?:    Record<string, unknown>;
}

// Keywords that indicate high-importance memories (importance >= 8)
const BREAKTHROUGH_KEYWORDS = [
  'miedo', 'fear', 'bloqueo', 'breakthrough', 'entendí', 'comprendí',
  'propósito', 'meta', 'objetivo', 'comprometido', 'cambié', 'transformé',
  'decidí', 'prometo', 'juro', 'nunca más', 'siempre', 'mi norte',
];

function estimateImportance(content: string): number {
  const lower = content.toLowerCase();
  const matches = BREAKTHROUGH_KEYWORDS.filter((kw) => lower.includes(kw)).length;
  if (matches >= 3) return 9;
  if (matches >= 2) return 8;
  if (matches >= 1) return 7;
  if (content.length > 200) return 6;
  if (content.length > 100) return 5;
  return 4;
}

function classifyType(content: string): MemoryType {
  const lower = content.toLowerCase();
  if (['breakthrough', 'entendí', 'transformé', 'cambié'].some((k) => lower.includes(k))) return 'breakthrough';
  if (['miedo', 'bloqueo', 'dificultad', 'problema', 'lucha'].some((k) => lower.includes(k))) return 'struggle';
  if (['meta', 'objetivo', 'propósito', 'comprometido', 'goal'].some((k) => lower.includes(k))) return 'goal';
  if (['reflexión', 'reflexiono', 'me doy cuenta', 'insight'].some((k) => lower.includes(k))) return 'insight';
  if (['diario', 'escribo', 'siento', 'sentí'].some((k) => lower.includes(k))) return 'reflection';
  return 'conversation';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMentorMemory(userId: string | null) {

  /**
   * Save a memory and trigger embedding generation.
   * Only saves if content is meaningful (>= 30 chars).
   */
  const addMemory = useCallback(async (
    content:     string,
    typeOverride?: MemoryType,
    importanceOverride?: number,
    metadata?: Record<string, unknown>,
  ): Promise<string | null> => {
    if (!userId || content.trim().length < 30) return null;

    const memory_type = typeOverride ?? classifyType(content);
    const importance  = importanceOverride ?? estimateImportance(content);

    // Insert without embedding first (edge function will add it async)
    const { data, error } = await intel.memories()
      .insert({
        user_id: userId,
        content:  content.trim(),
        memory_type,
        importance,
        metadata: metadata ?? {},
      })
      .select('id')
      .single();

    if (error || !data) return null;

    const memoryId = data.id;

    // Trigger embedding generation in background (fire and forget)
    supabase.functions
      .invoke('generate-embeddings', {
        body: { memory_id: memoryId, content, user_id: userId },
      })
      .catch(() => { /* silent */ });

    return memoryId;
  }, [userId]);

  /**
   * Semantic search: generates embedding query-side, then calls
   * the edge function which does pgvector cosine search.
   */
  const searchMemories = useCallback(async (
    query: string,
    limit = 5,
  ): Promise<MentorMemory[]> => {
    if (!userId || query.trim().length < 5) return [];

    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: { search_query: query, user_id: userId, limit },
      });

      if (error || !data?.memories) return [];
      return data.memories as MentorMemory[];
    } catch {
      return [];
    }
  }, [userId]);

  /**
   * Get recent high-importance memories (no embedding needed).
   * Used as fallback when no search query is available.
   */
  const getRecentMemories = useCallback(async (
    limit = 5,
    types?: MemoryType[],
  ): Promise<MentorMemory[]> => {
    if (!userId) return [];

    let query = intel.memories()
      .select('id, content, memory_type, importance, created_at, metadata')
      .eq('user_id', userId)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (types && types.length > 0) {
      query = query.in('memory_type', types);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]) as MentorMemory[];
  }, [userId]);

  return { addMemory, searchMemories, getRecentMemories };
}
