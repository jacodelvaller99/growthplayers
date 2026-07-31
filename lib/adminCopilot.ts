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

export async function streamAdminCopilot(
  ctx: AdminCopilotContext,
  userMessage: string,
  history: CopilotTurn[],
  onChunk: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) return '';
  const isAbort = (err: unknown) => signal?.aborted || (err as Error)?.name === 'AbortError';

  const messages: ChatMessage[] = [
    { role: 'system', content: buildAdminCopilotPrompt(ctx) },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.text })),
    { role: 'user', content: userMessage },
  ];

  // Claude → NVIDIA → Groq → OpenAI, todos vía ai-proxy: las claves son secrets
  // del servidor (un EXPO_PUBLIC_* se inlinea en el bundle y se lee en
  // devtools). Sin proxy no existe ningún eslabón.
  if (ENV.aiProxyUrl) {
    for (const stream of [streamAnthropic, streamNvidia, streamGroq, streamOpenAI]) {
      try { return await stream(messages, onChunk, signal); }
      catch (err) { if (isAbort(err)) throw err; /* sigue */ }
    }
  }

  // Sin proveedor: degradación honesta.
  const msg = 'No hay un proveedor de IA configurado para el copiloto. Activa el ai-proxy (EXPO_PUBLIC_AI_PROXY_URL).';
  onChunk(msg);
  return msg;
}
