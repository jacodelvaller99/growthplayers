// ─── NVIDIA NIM – SSE Streaming ──────────────────────────────────────────────
// Modelo: deepseek-ai/deepseek-v4-pro (fijado server-side en el ai-proxy)
//
// SOLO vía ai-proxy. La clave de NVIDIA es secret del servidor: no existe
// camino directo client-side. El que había leía EXPO_PUBLIC_NVIDIA_API_KEY,
// que se inlinea en el bundle web — la clave viajaba al navegador de cada
// usuario y cualquiera podía copiarla desde devtools.

import { ENV } from '@/app/config/env';

export type ChatMessage = { role: string; content: string };

// ─── Stream guard: timeout total + watchdog de inactividad ───────────────────
// Combina una señal externa (cancelación del usuario) con un timeout total y un
// watchdog que aborta si no llega ningún byte en `idleMs`. Distingue el motivo:
// `timedOut` es true solo si abortó por timeout (no por el usuario) — así el
// orquestador (lib/mentor.ts) avanza al siguiente proveedor en un cuelgue, pero
// se detiene si el usuario pulsó "Detener".
export interface StreamGuard {
  signal: AbortSignal;
  /** Llamar en cada byte recibido para rearmar el watchdog de inactividad. */
  activity: () => void;
  /** Limpia timers + listeners. Llamar siempre en finally. */
  dispose: () => void;
  readonly timedOut: boolean;
}

export function createStreamGuard(
  external: AbortSignal | undefined,
  opts: { totalMs?: number; idleMs?: number } = {},
): StreamGuard {
  const { totalMs = 45000, idleMs = 8000 } = opts;
  const ctrl = new AbortController();
  let timedOut = false;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let totalTimer: ReturnType<typeof setTimeout> | undefined;

  const clear = () => {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = undefined; }
    if (totalTimer) { clearTimeout(totalTimer); totalTimer = undefined; }
  };
  const fireTimeout = () => {
    timedOut = true;
    clear();
    try { ctrl.abort(); } catch { /* noop */ }
  };
  const onExternalAbort = () => {
    clear();
    try { ctrl.abort(); } catch { /* noop */ }
  };

  if (external) {
    if (external.aborted) { try { ctrl.abort(); } catch { /* noop */ } }
    else external.addEventListener('abort', onExternalAbort, { once: true });
  }
  totalTimer = setTimeout(fireTimeout, totalMs);
  idleTimer = setTimeout(fireTimeout, idleMs);

  return {
    signal: ctrl.signal,
    activity() {
      if (ctrl.signal.aborted) return;
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(fireTimeout, idleMs);
    },
    dispose() {
      clear();
      if (external) { try { external.removeEventListener('abort', onExternalAbort); } catch { /* noop */ } }
    },
    get timedOut() { return timedOut; },
  };
}

/**
 * Hace streaming de la respuesta NVIDIA NIM vía ai-proxy.
 * Lanza si el proxy no está configurado — el caller (mentor.ts) cae al
 * siguiente proveedor de la cadena.
 * @param messages  Array de mensajes en formato OpenAI.
 * @param onChunk   Callback invocado con cada fragmento de texto recibido.
 * @returns         Texto completo de la respuesta.
 */
export async function streamNvidia(
  messages: ChatMessage[],
  onChunk: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!ENV.aiProxyUrl) {
    throw new Error('NVIDIA requiere ai-proxy (EXPO_PUBLIC_AI_PROXY_URL no configurada).');
  }
  const guard = createStreamGuard(signal);
  try {
    const { proxyChatFetch } = await import('./aiProxy');
    const response = await proxyChatFetch('nvidia', messages, guard.signal);
    const text = await parseSSEStream(response, onChunk, guard.signal, guard.activity);
    if (guard.timedOut && !text) throw new Error('NVIDIA stream timeout (no data)');
    return text;
  } catch (err) {
    // Timeout del guard (no cancelación del usuario) → error NO-abort para que el
    // orquestador avance al siguiente proveedor en vez de detener la cadena.
    if (guard.timedOut && !signal?.aborted) throw new Error('NVIDIA stream timeout');
    throw err;
  } finally {
    guard.dispose();
  }
}

// ─── Shared SSE parser (también usada por openai.ts) ─────────────────────────

export async function parseSSEStream(
  response: Response,
  onChunk: (delta: string) => void,
  signal?: AbortSignal,
  onActivity?: () => void,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is null');

  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  try {
    while (true) {
      // Cancelación cooperativa: si el usuario abortó, devolvemos lo acumulado.
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      // Hubo bytes → rearma el watchdog de inactividad del guard.
      onActivity?.();

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
  } catch (err) {
    // Si fue cancelación del usuario (abort), devolvemos el texto parcial acumulado.
    if (signal?.aborted || (err as Error)?.name === 'AbortError') {
      return full;
    }
    throw err;
  } finally {
    try { reader.releaseLock(); } catch { /* noop */ }
  }

  return full;
}
