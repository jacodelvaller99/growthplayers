// ─── Transcripción de audio — OpenAI Whisper ─────────────────────────────────
// Pipeline de mentoría: audio de sesión → transcripción → Norman redacta notas.
// Client-side, mismo patrón que lib/openai.ts (EXPO_PUBLIC_OPENAI_API_KEY).
//
// Nota de arquitectura: la key viaja al cliente (inlineada en build). A mediano
// plazo conviene mover esto a una Edge Function `transcribe-session` para que la
// key viva en el servidor (handoff de deploy). Por ahora se mantiene la línea
// client-side ya establecida en el resto de la capa IA.

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
  if (!ENV.openaiApiKey) {
    throw new Error('OpenAI API key ausente — no se puede transcribir.');
  }

  const fileName = options.fileName ?? defaultFileName(source);
  const form = new FormData();
  form.append('model', MODEL);
  form.append('response_format', 'text');
  if (options.language) form.append('language', options.language);

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

function defaultFileName(source: AudioSource): string {
  if (typeof source === 'string') {
    const tail = source.split('/').pop() ?? '';
    if (tail.includes('.')) return tail;
  }
  return 'session.m4a';
}
