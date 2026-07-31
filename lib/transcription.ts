// ─── Transcripción de audio — OpenAI Whisper ─────────────────────────────────
// Pipeline de mentoría: audio de sesión → transcripción → Norman redacta notas.
//
// UN solo camino: el ai-proxy (supabase/functions/ai-proxy, ruta /transcribe),
// donde vive la clave de OpenAI. El camino directo que existía leía
// EXPO_PUBLIC_OPENAI_API_KEY, y todo lo EXPO_PUBLIC_* se inlinea en el bundle:
// la clave acababa en el navegador del usuario, copiable desde devtools.

import { Platform } from 'react-native';
import { ENV } from '@/app/config/env';

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
 * @throws Error si el ai-proxy no está configurado o responde con error.
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

/** Un único intento de transcripción (siempre vía proxy). FormData fresco por intento. */
async function attemptTranscribe(
  source: AudioSource,
  fileName: string,
  options: TranscribeOptions,
): Promise<string> {
  if (!ENV.aiProxyUrl) {
    throw new Error('La transcripción requiere ai-proxy (EXPO_PUBLIC_AI_PROXY_URL no configurada).');
  }
  const { proxyTranscribeFetch } = await import('./aiProxy');
  const form = new FormData();
  if (options.language) form.append('language', options.language);
  await appendAudio(form, source, fileName);
  return proxyTranscribeFetch(form, options.signal);
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
  // Falta de configuración (sin proxy) — reintentar 3 veces no la arregla.
  if (/requiere ai-proxy/.test(msg)) return true;
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
