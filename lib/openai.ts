// ─── OpenAI – SSE Streaming (fallback) ───────────────────────────────────────
// Modelo: gpt-4o-mini

import { ENV } from '@/app/config/env';
import type { ChatMessage } from './nvidia';
import { parseSSEStream } from './nvidia';

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
): Promise<string> {
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
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenAI API ${response.status}: ${body}`);
  }

  return parseSSEStream(response, onChunk);
}
