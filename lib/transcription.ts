// ─── Transcripción de audio — OpenAI Whisper ─────────────────────────────────
// Pipeline de mentoría: audio de sesión → transcripción → Norman redacta notas.
//
// Dos caminos:
//   1. ai-proxy (EXPO_PUBLIC_AI_PROXY_URL seteada) — la key vive en el servidor
//      (supabase/functions/ai-proxy, ruta /transcribe). Preferido.
//   2. Directo (transicional) — usa EXPO_PUBLIC_OPENAI_API_KEY en el cliente,
//      misma línea client-side del resto de la capa IA.

import { Platform } from 'react-native';
import { ENV } from '@/app/config/env';

const OPENAI_TRANSCRIPTIONS = 'https://api.openai.com/v1/audio/transcriptions';
const MODEL = 'whisper-1';

/** Fuente de audio aceptada: un URI `file://` / `blob:` (RN) o un Blob (web). */
export type AudioSource = string | Blob;

export interface TranscribeOptions {
  /** Idioma esperado (ISO-639-1, ej. 'es'). Mejora precisión y latencia. */
  language?: string;
  /** Nombre de archivo enviado en el multipart (la extensión importa). */
  fileName?: string;
  /** Cancelación. */
  signal?: AbortSignal;
  /** Nº de intentos (default 3) con backoff exponencial 1s/2s/5s. */
  retries?: number;
}

/** Deriva un mime razonable a partir de la extensión del nombre/URI. */
function guessMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'm4a':
    case 'mp4':
      return 'audio/m4a';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'webm':
      return 'audio/webm';
    case 'caf':
      return 'audio/x-caf';
    case 'ogg':
      return 'audio/ogg';
    default:
      return 'audio/m4a';
  }
}

/**
 * Transcribe un audio con OpenAI Whisper y devuelve el texto plano.
 *
 * Acepta tanto un URI local (`file://…`, típico de expo-av en nativo) como un
 * `Blob` (web). En nativo, React Native permite adjuntar `{ uri, name, type }`
 * directamente al FormData sin leer el archivo a memoria.
 *
 * @throws Error si no hay API key o si la API responde con error.
 */
export async function transcribeAudio(
  source: AudioSource,
  options: TranscribeOptions = {},
): Promise<string> {
  const fileName = options.fileName ?? defaultFileName(source);
  const maxAttempts = Math.max(1, options.retries ?? 3);
  const backoff = [1000, 2000, 5000]; // ms entre intentos

  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (options.signal?.aborted) throw abortError();
    try {
      return await attemptTranscribe(source, fileName, options);
    } catch (err) {
      lastErr = err;
      // No reintentar si el usuario canceló o si es error de cliente (auth/audio inválido).
      if (isNonRetryable(err) || attempt === maxAttempts - 1) throw err;
      console.warn(`[Whisper] intento ${attempt + 1}/${maxAttempts} falló, reintentando:`, err);
      await sleep(backoff[Math.min(attempt, backoff.length - 1)], options.signal);
    }
  }
  throw lastErr;
}

/** Un único intento de transcripción (proxy o directo). FormData fresco por intento. */
async function attemptTranscribe(
  source: AudioSource,
  fileName: string,
  options: TranscribeOptions,
): Promise<string> {
  // ── Camino proxy (clave server-side) ──────────────────────────────────────
  if (ENV.aiProxyUrl) {
    const { proxyTranscribeFetch } = await import('./aiProxy');
    const form = new FormData();
    if (options.language) form.append('language', options.language);
    await appendAudio(form, source, fileName);
    return proxyTranscribeFetch(form, options.signal);
  }

  // ── Camino directo (transicional, requiere clave en el cliente) ───────────
  if (!ENV.openaiApiKey) {
    throw new Error('OpenAI API key ausente — no se puede transcribir.');
  }

  const form = new FormData();
  form.append('model', MODEL);
  form.append('response_format', 'text');
  if (options.language) form.append('language', options.language);
  await appendAudio(form, source, fileName);

  const response = await fetch(OPENAI_TRANSCRIPTIONS, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ENV.openaiApiKey}`,
      // No fijar Content-Type: el runtime añade el boundary del multipart.
    },
    body: form,
    signal: options.signal,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Whisper API ${response.status}: ${body}`);
  }

  // response_format=text → cuerpo es texto plano.
  const text = await response.text();
  return text.trim();
}

/** Error con name 'AbortError' (DOMException no siempre existe en Hermes). */
function abortError(): Error {
  const e = new Error('Aborted');
  e.name = 'AbortError';
  return e;
}

/**
 * ¿Vale la pena reintentar este error? No para: cancelación del usuario, o
 * errores 4xx de cliente (auth, audio inválido, payload) — salvo 429 (rate limit).
 */
function isNonRetryable(err: unknown): boolean {
  if ((err as Error)?.name === 'AbortError') return true;
  const msg = (err as Error)?.message ?? '';
  if (/API key ausente/.test(msg)) return true;
  const m = msg.match(/(\d{3})/);
  if (m) {
    const code = parseInt(m[1], 10);
    if (code >= 400 && code < 500 && code !== 429) return true;
  }
  return false;
}

/** Sleep cancelable: rechaza con AbortError si la señal se dispara. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener('abort', () => { clearTimeout(t); reject(abortError()); }, { once: true });
    }
  });
}

function defaultFileName(source: AudioSource): string {
  if (typeof source === 'string') {
    const tail = source.split('/').pop() ?? '';
    if (tail.includes('.')) return tail;
  }
  return 'session.m4a';
}

/** Adjunta la fuente de audio al FormData según plataforma/tipo. */
async function appendAudio(
  form: FormData,
  source: AudioSource,
  fileName: string,
): Promise<void> {
  if (typeof source === 'string') {
    if (Platform.OS === 'web') {
      // En web un "uri" suele ser blob:/data: → materializamos el Blob.
      const blob = await fetch(source).then((r) => r.blob());
      form.append('file', blob, fileName);
    } else {
      // En nativo, RN FormData adjunta el archivo por referencia (uri).
      form.append('file', {
        uri: source,
        name: fileName,
        type: guessMime(fileName),
        // RN espera este shape; TS no lo conoce → cast puntual.
      } as unknown as Blob);
    }
  } else {
    form.append('file', source, fileName);
  }
}
