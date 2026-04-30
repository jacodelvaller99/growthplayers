/**
 * generate-embeddings — OpenAI text-embedding-3-small via Deno Edge.
 *
 * Two operation modes (determined by request body):
 *
 * MODE A — STORE: body = { memory_id, content, user_id }
 *   Generates embedding for a new mentor_memories row and updates it.
 *
 * MODE B — SEARCH: body = { search_query, user_id, limit? }
 *   Generates embedding for a query string, runs pgvector cosine search,
 *   returns top-N memories sorted by similarity.
 */

import { corsHeaders, adminSupabase, json } from '../_shared/supabase.ts';

// ─── OpenAI Embeddings ────────────────────────────────────────────────────────

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMS  = 1536;

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.trim().slice(0, 8192), // token safety cap
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI embeddings error ${response.status}: ${err}`);
  }

  const result = await response.json();
  const embedding: number[] = result?.data?.[0]?.embedding;

  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMS) {
    throw new Error(`Unexpected embedding shape: ${embedding?.length}`);
  }

  return embedding;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') ?? undefined;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, origin);
  }

  const { memory_id, content, search_query, user_id, limit = 5 } = body as {
    memory_id?:    string;
    content?:      string;
    search_query?: string;
    user_id?:      string;
    limit?:        number;
  };

  if (!user_id) {
    return json({ error: 'user_id is required' }, 400, origin);
  }

  // ── MODE B: SEARCH ─────────────────────────────────────────────────────────
  if (search_query) {
    if (search_query.trim().length < 5) {
      return json({ memories: [] }, 200, origin);
    }

    let queryEmbedding: number[];
    try {
      queryEmbedding = await generateEmbedding(search_query);
    } catch (err) {
      console.error('[generate-embeddings] search embedding error:', err);
      // Fallback: return recent memories by importance
      const { data } = await adminSupabase
        .from('mentor_memories')
        .select('id, content, memory_type, importance, created_at, metadata')
        .eq('user_id', user_id)
        .order('importance', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit as number);
      return json({ memories: data ?? [], fallback: true }, 200, origin);
    }

    // pgvector cosine similarity search via RPC
    const { data: memories, error } = await adminSupabase
      .rpc('search_mentor_memories', {
        p_user_id:   user_id,
        p_embedding: `[${queryEmbedding.join(',')}]`,
        p_limit:     Math.min(limit as number, 20),
      });

    if (error) {
      console.error('[generate-embeddings] pgvector search error:', error);
      return json({ error: 'Search failed', detail: error.message }, 500, origin);
    }

    return json({ memories: memories ?? [] }, 200, origin);
  }

  // ── MODE A: STORE ──────────────────────────────────────────────────────────
  if (!memory_id || !content) {
    return json({ error: 'memory_id and content are required for store mode' }, 400, origin);
  }

  if (content.trim().length < 10) {
    return json({ skipped: true, reason: 'content too short' }, 200, origin);
  }

  // Verify memory belongs to this user
  const { data: memRow, error: memErr } = await adminSupabase
    .from('mentor_memories')
    .select('id, user_id')
    .eq('id', memory_id)
    .single();

  if (memErr || !memRow) {
    return json({ error: 'Memory not found' }, 404, origin);
  }

  if (memRow.user_id !== user_id) {
    return json({ error: 'Forbidden' }, 403, origin);
  }

  // Generate and store embedding
  let embedding: number[];
  try {
    embedding = await generateEmbedding(content);
  } catch (err) {
    console.error('[generate-embeddings] store embedding error:', err);
    return json({ error: 'Embedding generation failed' }, 500, origin);
  }

  const { error: updateErr } = await adminSupabase
    .from('mentor_memories')
    .update({ embedding: `[${embedding.join(',')}]` })
    .eq('id', memory_id);

  if (updateErr) {
    console.error('[generate-embeddings] update error:', updateErr);
    return json({ error: 'Failed to store embedding' }, 500, origin);
  }

  return json({ success: true, memory_id, dims: embedding.length }, 200, origin);
});
