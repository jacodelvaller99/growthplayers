// ─── Groq – SSE Streaming ────────────────────────────────────────────────────
// Modelo: qwen/qwen3-32b (extended thinking, temperatura 0.6, top_p 0.95)
// Endpoint: https://api.groq.com/openai/v1/chat/completions
// La API de Groq es compatible con el formato OpenAI → reutiliza parseSSEStream.

import { ENV } from '@/app/config/env';
import type { ChatMessage } from './nvidia';
import { parseSSEStream, createStreamGuard } from './nvidia';

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const MODEL = 'llama-3.3-70b-versatile'; // qwen3-32b daba 413 (payload too large con system prompts largos)

/**
 * Hace streaming de la respuesta Groq (Qwen3-32b).
 *
 * Parámetros alineados con el snippet oficial:
 *   temperature      0.6  — balance creatividad/precisión recomendado por Qwen
 *   top_p            0.95
 *   reasoning_effort "default"  — activa el razonamiento interno de Qwen3
 *
 * @param messages  Array de mensajes en formato OpenAI.
 * @param onChunk   Callback invocado con cada fragmento de texto recibido.
 * @returns         Texto completo de la respuesta.
 */
export async function streamGroq(
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
        const response = await proxyChatFetch('groq', messages, guard.signal);
        return await parseSSEStream(response, onChunk, guard.signal, guard.activity);
      } catch (err) {
        if (guard.signal.aborted || (err as Error)?.name === 'AbortError') throw err;
        if (!ENV.groqApiKey) throw err;
        console.warn('[Groq] proxy falló, usando llamada directa:', err);
      }
    }

    const response = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ENV.groqApiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 0.9,
      }),
      signal: guard.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Groq API ${response.status}: ${body}`);
    }

    const text = await parseSSEStream(response, onChunk, guard.signal, guard.activity);
    if (guard.timedOut && !text) throw new Error('Groq stream timeout (no data)');
    return text;
  } catch (err) {
    if (guard.timedOut && !signal?.aborted) throw new Error('Groq stream timeout');
    throw err;
  } finally {
    guard.dispose();
  }
}
