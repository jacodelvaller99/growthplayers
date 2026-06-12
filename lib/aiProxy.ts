// ─── Cliente del ai-proxy (Edge Function) ─────────────────────────────────────
// Camino server-side opcional para la cadena de IA: activo solo cuando
// EXPO_PUBLIC_AI_PROXY_URL está configurada. Las claves de proveedor viven en
// el servidor; el cliente se autentica con su JWT de Supabase.

import { ENV } from '@/app/config/env';
import { supabase } from '@/lib/supabase';
import type { ChatMessage } from './nvidia';

export type ProxyProvider = 'nvidia' | 'groq' | 'openai';

function proxyBase(): string {
  return ENV.aiProxyUrl.replace(/\/+$/, '');
}

async function getSessionToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('AI proxy requiere sesión activa.');
  return token;
}

/**
 * POST /chat al proxy. Devuelve la Response cruda (SSE) para que el caller la
 * consuma con parseSSEStream — mismo contrato que los proveedores directos.
 */
export async function proxyChatFetch(
  provider: ProxyProvider,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<Response> {
  const token = await getSessionToken();
  const response = await fetch(`${proxyBase()}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ provider, messages }),
    signal,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`AI proxy ${response.status}: ${body}`);
  }
  return response;
}

/** POST /transcribe al proxy (multipart con `file` y `language?`). */
export async function proxyTranscribeFetch(
  form: FormData,
  signal?: AbortSignal,
): Promise<string> {
  const token = await getSessionToken();
  const response = await fetch(`${proxyBase()}/transcribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`AI proxy transcribe ${response.status}: ${body}`);
  }
  return (await response.text()).trim();
}
