/**
 * adminCopilot — IA copiloto SOLO para el equipo admin (Cluster A3).
 *
 * "Un espacio de la IA que nos acompaña pero fraccionada solo para los admin,
 * para que nos ayude a tomar decisiones." NO es el Norman del cliente: es un
 * asistente operativo para el coach/dueño. Ve señales cross-client (at-risk,
 * ranking, fricciones, bienestar, notas privadas) y ayuda a decidir a quién
 * contactar y qué hacer. CITA el dato, no inventa. Nunca cliente-facing.
 *
 * Reusa los proveedores ya endurecidos (createStreamGuard vía cada provider) y la
 * misma cadena de fallback que el mentor, pero con un system prompt admin distinto.
 */

import { ENV } from '@/app/config/env';
import { streamAnthropic } from './anthropic';
import { streamNvidia, type ChatMessage } from './nvidia';
import { streamGroq } from './groq';
import { streamOpenAI } from './openai';

// ─── Contexto cross-client que ve el copiloto ──────────────────────────────────

export interface AdminCopilotContext {
  adminName?: string;
  totalUsers?: number;
  atRisk?: Array<{ name: string; churn: string; days: number }>;
  topRanked?: Array<{ name: string; score: number; lead: string }>;
  bottomRanked?: Array<{ name: string; score: number }>;
  notes?: Array<{ name: string; note: string }>;
}

function listOrNone(lines: string[]): string {
  return lines.length ? lines.join('\n') : '  (sin datos)';
}

export function buildAdminCopilotPrompt(ctx: AdminCopilotContext): string {
  const atRisk = listOrNone((ctx.atRisk ?? []).slice(0, 8).map(
    (u) => `  - ${u.name}: churn ${u.churn}, ${u.days}d sin actividad`,
  ));
  const top = listOrNone((ctx.topRanked ?? []).slice(0, 5).map(
    (u) => `  - ${u.name}: ${u.score}/100 (lidera ${u.lead})`,
  ));
  const bottom = listOrNone((ctx.bottomRanked ?? []).slice(0, 5).map(
    (u) => `  - ${u.name}: ${u.score}/100`,
  ));
  const notes = listOrNone((ctx.notes ?? []).slice(0, 8).map(
    (n) => `  - ${n.name}: "${n.note}"`,
  ));

  return [
    'Eres el COPILOTO OPERATIVO del equipo de Polaris Growth Institute (coaches + dueño).',
    'NO eres Norman (el mentor del cliente). NO hablas con clientes. Hablas con el ADMIN.',
    '',
    'Tu trabajo: ayudar al coach/dueño a TOMAR DECISIONES de operación —',
    'a quién contactar hoy, a quién confrontar, a quién celebrar, dónde está el riesgo.',
    '',
    'REGLAS:',
    '- CITA el dato concreto (nombre, %, días, nota). NUNCA inventes cifras ni clientes.',
    '- Si no tienes el dato, dilo y pide al admin abrir el dossier del cliente.',
    '- Sé conciso y accionable: prioriza, no enumeres todo. Da el siguiente paso.',
    '- No das consejo clínico ni médico. No reemplazas criterio humano — lo asistes.',
    '- Castellano neutro, tono operativo (sala de control), sin floreo.',
    '',
    `ADMIN: ${ctx.adminName ?? 'Coach'} · Usuarios totales: ${ctx.totalUsers ?? '—'}`,
    '',
    'EN RIESGO (churn/inactividad):',
    atRisk,
    '',
    'MEJOR RANKEADOS (ponderación):',
    top,
    '',
    'PEOR RANKEADOS (necesitan atención):',
    bottom,
    '',
    'NOTAS PRIVADAS RECIENTES (admin-only — nunca las repitas a un cliente):',
    notes,
  ].join('\n');
}

// ─── Orquestación con fallback (misma cadena que el mentor) ────────────────────

export type CopilotTurn = { role: 'user' | 'assistant'; text: string };

// Red de seguridad — mismo rol que streamDevSimulation en lib/mentor.ts, tono
// propio (operativo, no de coaching al cliente). Antes, sin proveedor o con
// los 4 caídos, el copiloto imprimía un string de error crudo — a diferencia
// de Norman, que siempre "responde" algo. Copy propio en vez de reusar
// DEV_RESPONSES de mentor.ts: esas líneas están escritas en voz de Norman
// hablándole al cliente, tono equivocado para un admin.
const COPILOT_FALLBACK = [
  'No pude conectar con ningún proveedor de IA en este momento. Verifica el estado del ai-proxy o intenta de nuevo en unos segundos.',
  'La cadena de proveedores de IA no respondió — puede ser transitorio. Reintenta la pregunta.',
];

async function streamDevFallback(onChunk: (delta: string) => void): Promise<string> {
  const reply = COPILOT_FALLBACK[Math.floor(Math.random() * COPILOT_FALLBACK.length)];
  let full = '';
  for (const char of reply) {
    await new Promise<void>((r) => setTimeout(r, 12));
    full += char;
    onChunk(char);
  }
  return full;
}

async function streamWithFallback(
  messages: ChatMessage[],
  onChunk: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) return '';
  const isAbort = (err: unknown) => signal?.aborted || (err as Error)?.name === 'AbortError';

  // Claude → NVIDIA → Groq → OpenAI, todos vía ai-proxy: las claves son secrets
  // del servidor (un EXPO_PUBLIC_* se inlinea en el bundle y se lee en
  // devtools). Sin proxy no existe ningún eslabón.
  if (ENV.aiProxyUrl) {
    for (const stream of [streamAnthropic, streamNvidia, streamGroq, streamOpenAI]) {
      try { return await stream(messages, onChunk, signal); }
      catch (err) { if (isAbort(err)) throw err; /* sigue */ }
    }
  }

  return streamDevFallback(onChunk);
}

export async function streamAdminCopilot(
  ctx: AdminCopilotContext,
  userMessage: string,
  history: CopilotTurn[],
  onChunk: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) return '';
  const messages: ChatMessage[] = [
    { role: 'system', content: buildAdminCopilotPrompt(ctx) },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.text })),
    { role: 'user', content: userMessage },
  ];
  return streamWithFallback(messages, onChunk, signal);
}

// ─── Copiloto de sesión — un solo cliente (Espacio del Mentor) ─────────────────

export interface ClientDeskContext {
  adminName?: string;
  clientName: string;
  week?: number;
  /** Agenda de la sesión, ya digerida (execution_state, said_would_do, top_questions...). */
  agenda?: string[];
  /** Resumen de memoria del cliente (summary + temas sugeridos), ya digerido. */
  briefing?: string[];
  /** Primeros ~500 caracteres de la nota que el mentor está escribiendo ahora. */
  notesExcerpt?: string;
}

export function buildClientDeskPrompt(ctx: ClientDeskContext): string {
  return [
    `Eres el COPILOTO DE SESIÓN del mentor durante su reunión con ${ctx.clientName}` +
      (ctx.week ? ` (SEMANA ${ctx.week}).` : '.'),
    'NO eres Norman (el mentor IA del cliente). NO hablas con el cliente — hablas con el MENTOR HUMANO.',
    '',
    'Tu trabajo: ayudar al mentor a preparar y conducir ESTA sesión — qué preguntar,',
    'qué confrontar, qué celebrar. Respuestas cortas y accionables.',
    '',
    'REGLAS:',
    '- CITA el dato concreto (agenda, briefing, nota en curso). NUNCA inventes.',
    '- Si no tienes el dato, dilo — no rellenes con generalidades de coaching.',
    '- Castellano neutro, tono operativo, sin floreo.',
    '- Si tu respuesta incluye acciones CONCRETAS para el plan de la semana o',
    '  tareas de seguimiento (no simple charla/análisis), termina con un bloque',
    '  ===ACCIONES=== y una acción por línea con guion. Sin acciones concretas,',
    '  no agregues el bloque — el mentor decide con un toque si las aplica, así',
    '  que cada línea debe poder pegarse tal cual en el plan.',
    '',
    `MENTOR: ${ctx.adminName ?? 'Coach'}`,
    '',
    'AGENDA DE LA SESIÓN:',
    listOrNone(ctx.agenda ?? []),
    '',
    'BRIEFING DEL CLIENTE:',
    listOrNone(ctx.briefing ?? []),
    '',
    'NOTA EN CURSO (lo que el mentor lleva escrito hoy):',
    ctx.notesExcerpt?.trim() ? `  "${ctx.notesExcerpt.trim()}"` : '  (aún no ha escrito nada)',
  ].join('\n');
}

export async function streamClientDesk(
  ctx: ClientDeskContext,
  userMessage: string,
  history: CopilotTurn[],
  onChunk: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) return '';
  const messages: ChatMessage[] = [
    { role: 'system', content: buildClientDeskPrompt(ctx) },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.text })),
    { role: 'user', content: userMessage },
  ];
  return streamWithFallback(messages, onChunk, signal);
}
