// ─── Claude Sonnet 4.6 — primario de Norman, SOLO vía ai-proxy ────────────────
// La clave de Anthropic vive exclusivamente como secret del servidor
// (supabase/functions/ai-proxy). NO existe camino directo client-side:
// deliberado — la clave jamás se inline-a en el bundle.
//
// El proxy traduce el SSE del Messages API de Anthropic al formato OpenAI,
// así que el parseSSEStream compartido funciona sin cambios.

import { ENV } from '@/app/config/env';
import type { ChatMessage } from './nvidia';
import { parseSSEStream, createStreamGuard } from './nvidia';

/**
 * Hace streaming de la respuesta de Claude (claude-sonnet-4-6) vía ai-proxy.
 * Lanza si el proxy no está configurado — el caller (mentor.ts) cae al
 * siguiente proveedor de la cadena.
 */
export async function streamAnthropic(
  messages: ChatMessage[],
  onChunk: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!ENV.aiProxyUrl) {
    throw new Error('Claude requiere ai-proxy (EXPO_PUBLIC_AI_PROXY_URL no configurada).');
  }
  const guard = createStreamGuard(signal);
  try {
    const { proxyChatFetch } = await import('./aiProxy');
    const response = await proxyChatFetch('anthropic', messages, guard.signal);
    const text = await parseSSEStream(response, onChunk, guard.signal, guard.activity);
    if (guard.timedOut && !text) throw new Error('Claude stream timeout (no data)');
    return text;
  } catch (err) {
    if (guard.timedOut && !signal?.aborted) throw new Error('Claude stream timeout');
    throw err;
  } finally {
    guard.dispose();
  }
}
