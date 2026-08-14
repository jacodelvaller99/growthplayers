/**
 * plaud-sync — importación automática de mentorías desde Plaud.
 *
 * Flujo: el dueño graba la sesión en Plaud nombrándola con el nombre del
 * cliente ("Juan Pérez — sesión 3"). Cada hora (cron) o a demanda (admin):
 *   1. Lista grabaciones nuevas en Plaud (API oficial de la CLI @plaud-ai/cli,
 *      verificada contra su fuente: platform.plaud.ai/developer/api).
 *   2. Baja transcript (source_list, bloque 'transaction') + resumen nativo
 *      (note_list, 'auto_sum_note').
 *   3. Matchea el nombre contra user_progress.name (nombre completo,
 *      normalizado). Único match → procesa; 0 o 2+ → cola 'pending_review'
 *      en plaud_imports para asignación manual en admin. Nunca adivina.
 *   4. Procesar = el mismo pipeline que una sesión de mentoría manual
 *      (confirmDraft): resumen estructurado vía ai-proxy → mentorship_sessions
 *      (transcript = NULL: el crudo es solo-admin, queda en plaud_imports) →
 *      memory_summaries (source_type 'plaud', source_id = file id, dedupe por
 *      índice único) → síntesis del perfil de memoria.
 *
 * Tokens: Plaud puede rotar el refresh_token en cada refresh → el token vivo
 * se persiste en plaud_tokens (RLS sin políticas = solo service role). El
 * secret PLAUD_REFRESH_TOKEN solo siembra la primera fila.
 *
 * POST body:
 *   { batch: 'all' }                      — cron (service role only)
 *   { action: 'sync' }                    — admin: batch a demanda
 *   { action: 'assign', import_id, user_id } — admin: asignar de la cola
 *   { action: 'ignore', import_id }       — admin: descartar de la cola
 */

// deno-lint-ignore-file no-explicit-any
import { adminSupabase, corsHeaders, json } from '../_shared/supabase.ts';

const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const PLAUD_SEED_REFRESH_TOKEN = Deno.env.get('PLAUD_REFRESH_TOKEN') ?? '';
const PLAUD_API_BASE = Deno.env.get('PLAUD_API_BASE') ?? 'https://platform.plaud.ai/developer/api';
const PLAUD_REFRESH_URL =
  Deno.env.get('PLAUD_REFRESH_URL') ??
  'https://platform.plaud.ai/developer/api/oauth/third-party/access-token/refresh';

// ─── Lógica pura (espejo de lib/plaudLogic.ts — mantener en sincronía) ────────

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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

function matchRecordingToUser(
  recordingName: string,
  candidates: { userId: string; fullName: string }[],
): { kind: 'match'; userId: string } | { kind: 'ambiguous' } | { kind: 'none' } {
  const title = normalizeName(recordingName);
  if (!title) return { kind: 'none' };
  const titleWords = title.split(' ');
  const hits: string[] = [];
  for (const c of candidates) {
    const name = normalizeName(c.fullName);
    if (!name) continue;
    if (containsWordSequence(titleWords, name.split(' '))) hits.push(c.userId);
  }
  if (hits.length === 1) return { kind: 'match', userId: hits[0] };
  if (hits.length > 1) return { kind: 'ambiguous' };
  return { kind: 'none' };
}

function segmentsToTranscript(segments: any[]): string {
  return segments
    .map((seg) => {
      const text = String(seg?.content ?? seg?.topic ?? '').trim();
      if (!text) return null;
      return seg?.speaker ? `${seg.speaker}: ${text}` : text;
    })
    .filter((l): l is string => l !== null)
    .join('\n');
}

// Parsers de bloques ===CLAVE=== (espejo de lib/memoryLogic.ts).
function extractSection(text: string, label: string): string {
  const re = new RegExp(`===\\s*${label}\\s*===([\\s\\S]*?)(?:===\\s*[A-ZÁÉÍÓÚÑ]+\\s*===|$)`, 'i');
  const m = text.trim().match(re);
  return m ? m[1].trim() : '';
}

function splitList(raw: string): string[] {
  const r = raw.trim();
  if (!r) return [];
  return r
    .split('\n')
    .map((l) => l.replace(/^[\s]*[-•*]\s?/, '').trim())
    .filter(Boolean);
}

// ─── Cliente Plaud (endpoints de la CLI oficial, Bearer access token) ─────────

async function getPlaudAccessToken(): Promise<string> {
  // Token vivo desde la BD; si no existe, sembrar desde el secret.
  const { data: row } = await adminSupabase
    .from('plaud_tokens')
    .select('refresh_token')
    .eq('id', 1)
    .maybeSingle();

  let refreshToken = row?.refresh_token ?? '';
  if (!refreshToken) {
    if (!PLAUD_SEED_REFRESH_TOKEN) {
      throw new Error('Plaud no configurado: falta el secret PLAUD_REFRESH_TOKEN (siembra inicial)');
    }
    refreshToken = PLAUD_SEED_REFRESH_TOKEN;
  }

  const res = await fetch(PLAUD_REFRESH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    throw new Error(`Plaud token refresh failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();

  // Persistir la rotación (si Plaud no rota, se re-guarda el mismo).
  await adminSupabase.from('plaud_tokens').upsert({
    id: 1,
    refresh_token: data.refresh_token ?? refreshToken,
    updated_at: new Date().toISOString(),
  });

  return data.access_token as string;
}

async function plaudGet(path: string, token: string): Promise<any> {
  const res = await fetch(`${PLAUD_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Plaud API ${path} failed: ${res.status}`);
  return res.json();
}

/** Contenido de un bloque: inline (data_content) o por link (data_link). */
async function loadBlockContent(block: any): Promise<string> {
  if (!block) return '';
  if (typeof block.data_content === 'string' && block.data_content.length > 0) {
    return block.data_content;
  }
  if (typeof block.data_link === 'string' && block.data_link.length > 0) {
    const res = await fetch(block.data_link);
    if (!res.ok) return '';
    return await res.text();
  }
  return '';
}

// ─── IA vía ai-proxy (acepta bearer service-role) ────────────────────────────
// Cadena reducida anthropic→groq→openai: mismo orden que el cliente, sin
// nvidia (deepseek razona lento para un job batch). Acumula el SSE a texto.

async function aiComplete(prompt: string): Promise<string> {
  const providers = ['anthropic', 'groq', 'openai'];
  for (const provider of providers) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ provider, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!res.ok || !res.body) continue;

      let out = '';
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data: ')) continue;
          const payload = t.slice(6);
          if (payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            out += parsed.choices?.[0]?.delta?.content ?? '';
          } catch { /* línea malformada — ignorar */ }
        }
      }
      if (out.trim()) return out;
    } catch (e) {
      console.error(`[plaud-sync] ai provider ${provider} failed:`, e);
    }
  }
  return '';
}

// Prompts — espejo de lib/memorySummarizer.ts (mismos bloques que parsea el cliente).
const SUMMARY_INSTRUCTION =
  'Resume la siguiente sesión de mentoría para mi sistema de memoria. Devuelve EXACTAMENTE estos ' +
  'bloques con sus marcadores (sin texto fuera de ellos):\n' +
  '===RESUMEN===\n(2-4 frases: qué se trabajó, decisiones, estado)\n' +
  '===TEMAS===\n- tema\n- tema\n' +
  '===COMPROMISOS===\n- lo que el operador dijo que haría (verbo + plazo si lo hay)\n' +
  '===PREGUNTAS===\n- preguntas o asuntos sin resolver\n' +
  '===TONO===\n(una línea: estado emocional dominante)\n' +
  '===FOCO===\n(una frase: el foco sugerido para la próxima vez)';

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

// Merge de listas del perfil (espejo compacto de mergeMemoryProfile: lo nuevo
// primero, dedupe case-insensitive, cap).
function mergeStrings(existing: unknown, incoming: string[], cap: number): string[] {
  const ex = Array.isArray(existing) ? existing.map((s: any) => String(s).trim()).filter(Boolean) : [];
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const item of [...incoming, ...ex]) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= cap) break;
  }
  return merged;
}

// ─── Procesar un import asignado ─────────────────────────────────────────────

async function processImport(imp: any, userId: string): Promise<void> {
  await adminSupabase.from('plaud_imports')
    .update({ status: 'processing', matched_user_id: userId })
    .eq('id', imp.id);

  try {
    const transcript = String(imp.transcript ?? '').slice(0, 12000);
    if (!transcript) throw new Error('import sin transcript');

    // 1. Resumen estructurado (misma instrucción que el pipeline manual).
    const out = await aiComplete(`${SUMMARY_INSTRUCTION}\n\nINTERACCIÓN:\n${transcript}`);
    if (!out) throw new Error('IA no disponible (ai-proxy sin proveedores)');

    const summary = extractSection(out, 'RESUMEN').slice(0, 4000);
    const keyTopics = splitList(extractSection(out, 'TEMAS'));
    const commitments = splitList(extractSection(out, 'COMPROMISOS'));
    const questions = splitList(extractSection(out, 'PREGUNTAS'));
    const tone = extractSection(out, 'TONO').split('\n')[0]?.trim() ?? '';
    const focus = extractSection(out, 'FOCO').trim();
    if (!summary && commitments.length === 0) throw new Error('resumen IA vacío');

    // 2. Sesión de mentoría — transcript NULL a propósito: el crudo es
    //    solo-admin y vive en plaud_imports; el cliente ve notes + action_plan.
    const { data: session, error: sessErr } = await adminSupabase
      .from('mentorship_sessions')
      .insert({
        user_id: userId,
        session_date: (imp.recorded_at ?? imp.created_at ?? new Date().toISOString()).slice(0, 10),
        transcript: null,
        notes: summary,
        action_plan: commitments.map((text: string) => ({ text, done: false })),
      })
      .select('id')
      .single();
    if (sessErr) throw new Error(`mentorship_sessions: ${sessErr.message}`);

    // 3. Resumen a la memoria (timeline cliente + admin). El índice único
    //    (user_id, source_type, source_id) hace el insert idempotente.
    const { error: sumErr } = await adminSupabase.from('memory_summaries').upsert(
      {
        user_id: userId,
        source_type: 'plaud',
        source_id: imp.plaud_file_id,
        summary,
        key_topics: keyTopics,
        commitments,
        unresolved_questions: questions,
        emotional_tone: tone,
        suggested_next_focus: focus,
      },
      { onConflict: 'user_id,source_type,source_id', ignoreDuplicates: true },
    );
    if (sumErr) throw new Error(`memory_summaries: ${sumErr.message}`);

    // 4. Síntesis del perfil vivo (best-effort: si la IA falla aquí, el import
    //    ya vale — resumen y sesión existen).
    try {
      const { data: profile } = await adminSupabase
        .from('user_memory_profile')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const digest =
        `RESUMEN NUEVO: ${summary}\nTEMAS: ${keyTopics.join(', ')}\n` +
        `COMPROMISOS: ${commitments.join(' | ')}\nPREGUNTAS ABIERTAS: ${questions.join(' | ')}\n` +
        `PERFIL ACTUAL: ${profile ? JSON.stringify({
          identity: profile.identity_summary, goal: profile.current_goal,
          blockers: profile.recurring_blockers, focus: profile.mentorship_focus,
        }) : '(vacío)'}`;
      const synth = await aiComplete(`${PROFILE_SYNTH_INSTRUCTION}\n\n${digest}`);

      if (synth) {
        const pick = (label: string, prev: unknown) =>
          extractSection(synth, label).slice(0, 600) || (prev ?? null);
        const openIncoming = commitments.map((text: string) => ({
          id: text.toLowerCase().slice(0, 80),
          text,
        }));
        const prevOpen = Array.isArray(profile?.commitments_open) ? profile.commitments_open : [];
        const openById = new Map<string, any>();
        for (const c of [...openIncoming, ...prevOpen]) {
          if (c?.id && !openById.has(c.id)) openById.set(c.id, c);
        }

        await adminSupabase.from('user_memory_profile').upsert({
          user_id: userId,
          identity_summary: pick('IDENTIDAD', profile?.identity_summary),
          current_goal: pick('META', profile?.current_goal),
          decision_style: pick('ESTILO', profile?.decision_style),
          mentorship_focus: pick('FOCO', profile?.mentorship_focus),
          recurring_blockers: mergeStrings(profile?.recurring_blockers, splitList(extractSection(synth, 'BLOQUEOS')), 6),
          recent_wins: mergeStrings(profile?.recent_wins, splitList(extractSection(synth, 'LOGROS')), 20),
          current_risks: mergeStrings(profile?.current_risks, splitList(extractSection(synth, 'RIESGOS')), 6),
          commitments_open: Array.from(openById.values()),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      }
    } catch (e) {
      console.error('[plaud-sync] profile synth failed (no bloquea el import):', e);
    }

    await adminSupabase.from('plaud_imports').update({
      status: 'imported',
      session_id: session.id,
      processed_at: new Date().toISOString(),
      error: null,
    }).eq('id', imp.id);

    console.log(`[plaud-sync] imported ${imp.plaud_file_id} → user ${userId}`);
  } catch (e: any) {
    await adminSupabase.from('plaud_imports').update({
      status: 'error',
      error: String(e?.message ?? e).slice(0, 500),
    }).eq('id', imp.id);
    throw e;
  }
}

// ─── Batch: traer grabaciones nuevas de Plaud ────────────────────────────────

async function runBatch(): Promise<{ fetched: number; imported: number; queued: number }> {
  const token = await getPlaudAccessToken();

  // Dos páginas de 50 — un cron horario nunca va a atrasarse más que eso.
  const files: any[] = [];
  for (const page of [1, 2]) {
    const res = await plaudGet(`/open/third-party/files/?page=${page}&page_size=50`, token);
    const data = Array.isArray(res?.data) ? res.data : [];
    files.push(...data);
    if (data.length < 50) break;
  }
  if (files.length === 0) return { fetched: 0, imported: 0, queued: 0 };

  const ids = files.map((f) => String(f.id));
  const { data: existing } = await adminSupabase
    .from('plaud_imports')
    .select('plaud_file_id')
    .in('plaud_file_id', ids);
  const known = new Set((existing ?? []).map((r: any) => r.plaud_file_id));
  const fresh = files.filter((f) => !known.has(String(f.id)));
  if (fresh.length === 0) return { fetched: files.length, imported: 0, queued: 0 };

  // user_progress = la tabla real de usuarios con nombre (misma fuente que el
  // panel admin, ver lib/admin/queries.ts fetchUsers).
  const { data: users } = await adminSupabase
    .from('user_progress')
    .select('user_id, name');
  const candidates = (users ?? [])
    .filter((u: any) => u.name)
    .map((u: any) => ({ userId: u.user_id, fullName: u.name }));

  let imported = 0;
  let queued = 0;

  for (const file of fresh) {
    try {
      const detail = await plaudGet(`/open/third-party/files/${file.id}`, token);

      const sourceList = detail.source_list ?? [];
      const txBlock = sourceList.find((s: any) => s.data_type === 'transaction');
      const rawTx = await loadBlockContent(txBlock);
      let transcript = '';
      if (rawTx) {
        try {
          transcript = segmentsToTranscript(JSON.parse(rawTx));
        } catch {
          transcript = rawTx; // por si algún día viene texto plano
        }
      }

      const noteList = detail.note_list ?? [];
      const sumNote = noteList.find((n: any) => n.data_type === 'auto_sum_note');
      const plaudSummary = await loadBlockContent(sumNote);

      const { data: imp, error: insErr } = await adminSupabase
        .from('plaud_imports')
        .insert({
          plaud_file_id: String(file.id),
          recording_name: file.name ?? null,
          recorded_at: file.start_at ?? file.created_at ?? null,
          duration_sec: typeof file.duration === 'number' ? Math.round(file.duration) : null,
          transcript: transcript || null,
          plaud_summary: plaudSummary || null,
          status: 'pending_review',
        })
        .select('*')
        .single();
      if (insErr) {
        // Carrera con otro batch (unique en plaud_file_id) — no es un error real.
        console.warn(`[plaud-sync] skip ${file.id}: ${insErr.message}`);
        continue;
      }

      if (!transcript) { queued++; continue; } // sin transcript aún: queda en cola, reintento manual

      const match = matchRecordingToUser(String(file.name ?? ''), candidates);
      if (match.kind === 'match') {
        await processImport(imp, match.userId);
        imported++;
      } else {
        queued++; // 'none' o 'ambiguous' → cola de revisión (nunca adivinar)
      }
    } catch (e) {
      console.error(`[plaud-sync] file ${file.id} failed:`, e);
    }
  }

  return { fetched: files.length, imported, queued };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') ?? undefined;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);

  try {
    const body = await req.json().catch(() => ({}));
    const { batch, action, import_id, user_id } = body;

    // AUTH — mismo patrón que sync-wearables: service role o JWT; las acciones
    // de operación exigen además is_admin (esta función toca datos de terceros).
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const isServiceRole = token.length > 0 && token === SERVICE_ROLE_KEY;

    let isAdmin = false;
    if (token && !isServiceRole) {
      const { data: { user } } = await adminSupabase.auth.getUser(token);
      if (user) {
        const { data: prof } = await adminSupabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle();
        isAdmin = Boolean(prof?.is_admin);
      }
    }

    if (batch === 'all') {
      if (!isServiceRole) return json({ error: 'Unauthorized' }, 401, origin);
      return json({ ok: true, ...(await runBatch()) }, 200, origin);
    }

    if (!isServiceRole && !isAdmin) return json({ error: 'Unauthorized' }, 401, origin);

    if (action === 'sync') {
      return json({ ok: true, ...(await runBatch()) }, 200, origin);
    }

    if (action === 'assign') {
      if (!import_id || !user_id) return json({ error: 'import_id y user_id requeridos' }, 400, origin);
      const { data: imp } = await adminSupabase
        .from('plaud_imports')
        .select('*')
        .eq('id', import_id)
        .maybeSingle();
      if (!imp) return json({ error: 'import no encontrado' }, 404, origin);
      if (imp.status === 'imported') return json({ error: 'ya importado' }, 409, origin);
      await processImport(imp, user_id);
      return json({ ok: true }, 200, origin);
    }

    if (action === 'ignore') {
      if (!import_id) return json({ error: 'import_id requerido' }, 400, origin);
      await adminSupabase.from('plaud_imports')
        .update({ status: 'ignored' })
        .eq('id', import_id)
        .neq('status', 'imported');
      return json({ ok: true }, 200, origin);
    }

    return json({ error: 'acción desconocida' }, 400, origin);
  } catch (err: any) {
    console.error('[plaud-sync]', err);
    return json({ error: String(err?.message ?? err) }, 500, origin);
  }
});
