/**
 * ai-proxy — proxy server-side para la cadena de IA del mentor + Whisper.
 *
 * Objetivo (gobernanza de IA): que las claves de NVIDIA/Groq/OpenAI vivan SOLO
 * en el servidor. El cliente activa este camino seteando EXPO_PUBLIC_AI_PROXY_URL;
 * sin esa var, sigue el camino directo actual (transicional).
 *
 * Rutas (POST, JWT de usuario requerido):
 *   /ai-proxy/chat        { provider: 'anthropic'|'nvidia'|'groq'|'openai', messages: [...] }
 *                         → SSE en formato OpenAI (text/event-stream).
 *                           El cliente lo parsea con parseSSEStream sin cambios.
 *                           'anthropic' (Claude Sonnet 4.6, primario de Norman) usa el
 *                           Messages API y se TRADUCE al formato OpenAI en el servidor.
 *   /ai-proxy/transcribe  multipart { file, language? }
 *                         → OpenAI Whisper (whisper-1), respuesta text/plain.
 *
 * Secrets requeridos (Dashboard → Edge Functions → Secrets):
 *   ANTHROPIC_API_KEY · NVIDIA_API_KEY · GROQ_API_KEY · OPENAI_API_KEY
 */

import { corsHeaders, adminSupabase, json } from '../_shared/supabase.ts';

const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Límite defensivo del payload de chat (~64 KB de mensajes). Presupuesto burdo:
// evita contextos desbocados antes de tener budgets por interacción reales.
const MAX_MESSAGES_BYTES = 64_000;

type ChatMessage = { role: string; content: string };

// Mapa de proveedores — modelos/params idénticos a las libs del cliente
// (lib/nvidia.ts · lib/groq.ts · lib/openai.ts). Mantener en sincronía.
const PROVIDERS: Record<
  string,
  { url: string; keyEnv: string; body: (messages: ChatMessage[]) => unknown }
> = {
  nvidia: {
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    keyEnv: 'NVIDIA_API_KEY',
    body: (messages) => ({
      model: 'deepseek-ai/deepseek-v4-pro',
      messages,
      stream: true,
      temperature: 1,
      top_p: 0.95,
      max_tokens: 16384,
      chat_template_kwargs: { thinking: false },
    }),
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    keyEnv: 'GROQ_API_KEY',
    body: (messages) => ({
      model: 'llama-3.3-70b-versatile',
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 0.9,
    }),
  },
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    keyEnv: 'OPENAI_API_KEY',
    body: (messages) => ({
      model: 'gpt-4o-mini',
      messages,
      stream: true,
      max_tokens: 512,
      temperature: 0.7,
    }),
  },
};

// ─── Claude (Anthropic) — Messages API + traducción SSE → formato OpenAI ─────
// El parseSSEStream del cliente espera chunks `choices[0].delta.content`;
// Anthropic emite `content_block_delta` con `delta.text`. Traducimos aquí para
// que el cliente no cambie. Modelo fijo: claude-sonnet-4-6 (restricción de la clave).

const ANTHROPIC_MODEL = 'claude-sonnet-4-6';

function anthropicToOpenAISSE(upstream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = '';
  return upstream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue; // 'event:' y vacías se ignoran
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (
              parsed.type === 'content_block_delta' &&
              parsed.delta?.type === 'text_delta' &&
              parsed.delta.text
            ) {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ choices: [{ delta: { content: parsed.delta.text } }] })}\n\n`,
              ));
            } else if (parsed.type === 'message_stop') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            }
          } catch {
            /* línea malformada — se ignora, igual que el parser del cliente */
          }
        }
      },
    }),
  );
}

async function handleAnthropicChat(
  messages: ChatMessage[],
  origin: string | undefined,
): Promise<Response> {
  const key = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
  if (!key) return json({ error: 'anthropic key not configured' }, 503, origin);

  // El Messages API separa el system prompt y exige que messages inicie con 'user'.
  let system: string | undefined;
  let msgs = [...messages];
  if (msgs[0]?.role === 'system') {
    system = msgs[0].content;
    msgs = msgs.slice(1);
  }
  // Descarta turnos assistant iniciales (el opener canned de Norman).
  while (msgs[0]?.role === 'assistant') msgs = msgs.slice(1);
  if (msgs.length === 0) {
    return json({ error: 'messages must include a user turn' }, 400, origin);
  }

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      stream: true,
      // Chat conversacional: sin thinking + effort medio = respuesta ágil.
      thinking: { type: 'disabled' },
      output_config: { effort: 'medium' },
      ...(system ? { system } : {}),
      messages: msgs,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    return json(
      { error: `upstream ${upstream.status}`, detail: detail.slice(0, 300) },
      502,
      origin,
    );
  }

  return new Response(anthropicToOpenAISSE(upstream.body), {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      ...corsHeaders(origin),
    },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') ?? undefined;

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(origin) });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin);
  }

  // ── AUTH — JWT de usuario obligatorio (es una función user-facing) ──────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Unauthorized' }, 401, origin);

  if (token !== SERVICE_ROLE_KEY) {
    const { data: userData, error: authError } = await adminSupabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return json({ error: 'Unauthorized' }, 401, origin);
    }
  }

  const route = new URL(req.url).pathname.split('/').filter(Boolean).pop();

  // ── /transcribe — Whisper ────────────────────────────────────────────────────
  if (route === 'transcribe') {
    const key = Deno.env.get('OPENAI_API_KEY') ?? '';
    if (!key) return json({ error: 'OPENAI_API_KEY not configured' }, 503, origin);

    let incoming: FormData;
    try {
      incoming = await req.formData();
    } catch {
      return json({ error: 'multipart form-data required' }, 400, origin);
    }
    const file = incoming.get('file');
    if (!(file instanceof File)) {
      return json({ error: 'file is required' }, 400, origin);
    }

    // Reconstruimos el form: el servidor fija modelo/formato, el cliente no.
    const form = new FormData();
    form.append('model', 'whisper-1');
    form.append('response_format', 'text');
    const language = incoming.get('language');
    if (typeof language === 'string' && language) form.append('language', language);
    form.append('file', file, file.name || 'session.m4a');

    const upstream = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ...corsHeaders(origin) },
    });
  }

  // ── /chat — passthrough SSE ──────────────────────────────────────────────────
  if (route === 'chat') {
    let body: { provider?: string; messages?: ChatMessage[] };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, origin);
    }

    const messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'messages is required' }, 400, origin);
    }
    if (JSON.stringify(messages).length > MAX_MESSAGES_BYTES) {
      return json({ error: 'payload too large' }, 413, origin);
    }

    // Claude (primario de Norman) requiere transformación de formato → rama propia.
    if (body.provider === 'anthropic') {
      return handleAnthropicChat(messages, origin);
    }

    const provider = PROVIDERS[body.provider ?? ''];
    if (!provider) return json({ error: 'Unknown provider' }, 400, origin);

    const key = Deno.env.get(provider.keyEnv) ?? '';
    if (!key) return json({ error: `${body.provider} key not configured` }, 503, origin);

    const upstream = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(provider.body(messages)),
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '');
      return json(
        { error: `upstream ${upstream.status}`, detail: detail.slice(0, 300) },
        502,
        origin,
      );
    }

    // Passthrough del stream SSE tal cual — parseSSEStream del cliente lo
    // consume sin cambios.
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        ...corsHeaders(origin),
      },
    });
  }

  return json({ error: 'Not found' }, 404, origin);
});
