// ─── OpenAI – SSE Streaming (fallback) ───────────────────────────────────────
// Modelo: gpt-4o-mini

import { ENV } from '@/app/config/env';
import type { ChatMessage } from './nvidia';
import { parseSSEStream, createStreamGuard } from './nvidia';

const OPENAI_BASE = 'https://api.openai.com/v1';
const MODEL = 'gpt-4o-mini';

/**
 * Hace streaming de la respuesta OpenAI.
 * @param messages  Array de mensajes en formato OpenAI.
 * @param onChunk   Callback invocado con cada fragmento de texto recibido.
 * @returns         Texto completo de la respuesta.
 */
export async function streamOpenAI(
  messages: ChatMessage[],
  onChunk: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const guard = createStreamGuard(signal);
  try {
    // Camino proxy (clave server-side); fallback al directo si hay clave local.
    if (ENV.aiProxyUrl) {
      try {
        const { proxyChatFetch } = await import('./aiProxy');
        const response = await proxyChatFetch('openai', messages, guard.signal);
        return await parseSSEStream(response, onChunk, guard.signal, guard.activity);
      } catch (err) {
        if (guard.signal.aborted || (err as Error)?.name === 'AbortError') throw err;
        if (!ENV.openaiApiKey) throw err;
        console.warn('[OpenAI] proxy falló, usando llamada directa:', err);
      }
    }

    const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ENV.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: true,
        max_tokens: 512,
        temperature: 0.7,
      }),
      signal: guard.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`OpenAI API ${response.status}: ${body}`);
    }

    const text = await parseSSEStream(response, onChunk, guard.signal, guard.activity);
    if (guard.timedOut && !text) throw new Error('OpenAI stream timeout (no data)');
    return text;
  } catch (err) {
    if (guard.timedOut && !signal?.aborted) throw new Error('OpenAI stream timeout');
    throw err;
  } finally {
    guard.dispose();
  }
}
