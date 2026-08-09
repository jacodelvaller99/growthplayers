// ─── Groq – SSE Streaming ────────────────────────────────────────────────────
// Modelo: llama-3.3-70b-versatile (fijado server-side en el ai-proxy).
// La API de Groq es compatible con el formato OpenAI → reutiliza parseSSEStream.
//
// SOLO vía ai-proxy. La clave de Groq es secret del servidor: no existe camino
// directo client-side. El que había leía EXPO_PUBLIC_GROQ_API_KEY, que se
// inlinea en el bundle web — la clave viajaba al navegador de cada usuario y
// cualquiera podía copiarla desde devtools.

import { ENV } from '@/app/config/env';
import type { ChatMessage } from './nvidia';
import { parseSSEStream, createStreamGuard } from './nvidia';

/**
 * Hace streaming de la respuesta Groq vía ai-proxy.
 * Lanza si el proxy no está configurado — el caller cae al siguiente proveedor.
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
  if (!ENV.aiProxyUrl) {
    throw new Error('Groq requiere ai-proxy (EXPO_PUBLIC_AI_PROXY_URL no configurada).');
  }
  const guard = createStreamGuard(signal);
  try {
    const { proxyChatFetch } = await import('./aiProxy');
    const response = await proxyChatFetch('groq', messages, guard.signal);
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
