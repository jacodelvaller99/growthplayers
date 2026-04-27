// ─── NVIDIA NIM – SSE Streaming ──────────────────────────────────────────────
// Modelo: meta/llama-3.3-70b-instruct
// Endpoint: https://integrate.api.nvidia.com/v1/chat/completions

import { ENV } from '@/app/config/env';

const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';
const MODEL = 'meta/llama-3.3-70b-instruct';

export type ChatMessage = { role: string; content: string };

/**
 * Hace streaming de la respuesta NVIDIA NIM.
 * @param messages  Array de mensajes en formato OpenAI.
 * @param onChunk   Callback invocado con cada fragmento de texto recibido.
 * @returns         Texto completo de la respuesta.
 */
export async function streamNvidia(
  messages: ChatMessage[],
  onChunk: (delta: string) => void,
): Promise<string> {
  const response = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ENV.nvidiaApiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      max_tokens: 512,
      temperature: 0.7,
      top_p: 0.9,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`NVIDIA API ${response.status}: ${body}`);
  }

  return parseSSEStream(response, onChunk);
}

// ─── Shared SSE parser (también usada por openai.ts) ─────────────────────────

export async function parseSSEStream(
  response: Response,
  onChunk: (delta: string) => void,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is null');

  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');

    // Último elemento puede ser incompleto → lo guardamos en buffer
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const json = trimmed.slice(6).trim();
      if (json === '[DONE]') continue;

      try {
        const parsed = JSON.parse(json);
        const delta: string = parsed.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          full += delta;
          onChunk(delta);
        }
      } catch {
        // fragmento malformado – se ignora
      }
    }
  }

  return full;
}
