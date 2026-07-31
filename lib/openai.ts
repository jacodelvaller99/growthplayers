// ─── OpenAI – SSE Streaming (fallback) ───────────────────────────────────────
// Modelo: gpt-4o-mini (fijado server-side en el ai-proxy).
//
// SOLO vía ai-proxy. La clave de OpenAI es secret del servidor: no existe
// camino directo client-side. El que había leía EXPO_PUBLIC_OPENAI_API_KEY,
// que se inlinea en el bundle web — la clave viajaba al navegador de cada
// usuario y cualquiera podía copiarla desde devtools.

import { ENV } from '@/app/config/env';
import type { ChatMessage } from './nvidia';
import { parseSSEStream, createStreamGuard } from './nvidia';

/**
 * Hace streaming de la respuesta OpenAI vía ai-proxy.
 * Lanza si el proxy no está configurado — el caller cae al siguiente proveedor.
 * @param messages  Array de mensajes en formato OpenAI.
 * @param onChunk   Callback invocado con cada fragmento de texto recibido.
 * @returns         Texto completo de la respuesta.
 */
export async function streamOpenAI(
  messages: ChatMessage[],
  onChunk: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!ENV.aiProxyUrl) {
    throw new Error('OpenAI requiere ai-proxy (EXPO_PUBLIC_AI_PROXY_URL no configurada).');
  }
  const guard = createStreamGuard(signal);
  try {
    const { proxyChatFetch } = await import('./aiProxy');
    const response = await proxyChatFetch('openai', messages, guard.signal);
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
