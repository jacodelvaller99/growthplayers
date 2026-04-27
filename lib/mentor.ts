// ─── Mentor Polaris IA ────────────────────────────────────────────────────────
// Orquesta: dev simulation → NVIDIA NIM (primary) → OpenAI (fallback)

import { ENV } from '@/app/config/env';
import { streamNvidia } from './nvidia';
import { streamOpenAI } from './openai';
import type { CheckIn } from '@/types/lifeflow';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MentorContext {
  name: string;
  role: string;
  protocolDay: number;
  northStar: {
    purpose: string;
    identity: string;
    nonNegotiables: string[];
    dailyReminder: string;
  };
  todayCheckIn: CheckIn | null;
  messageCount: number;
}

// ─── System Prompt ────────────────────────────────────────────────────────────

export function buildSystemPrompt(ctx: MentorContext): string {
  const ci = ctx.todayCheckIn;
  const checkInBlock = ci
    ? [
        `Check-in HOY:`,
        `· Energía ${ci.energy}/10`,
        `· Claridad ${ci.clarity}/10`,
        `· Estrés ${ci.stress}/10`,
        `· Sueño ${ci.sleep}/10`,
        ci.systemNeed ? `· Sistema necesita: "${ci.systemNeed}"` : '',
      ]
        .filter(Boolean)
        .join('\n')
    : 'Sin check-in registrado hoy. El mentor opera con datos históricos.';

  const nonNegs = ctx.northStar.nonNegotiables.length
    ? ctx.northStar.nonNegotiables.map((n) => `  · ${n}`).join('\n')
    : '  (sin definir)';

  return `Eres el Mentor Polaris, coach ejecutivo de élite del Polaris Growth Institute.

OPERADOR: ${ctx.name}, ${ctx.role}
DÍA DE PROTOCOLO: ${ctx.protocolDay}/90

NORTE DEL OPERADOR:
· Propósito: ${ctx.northStar.purpose}
· Identidad: ${ctx.northStar.identity}
· No negociables:
${nonNegs}
· Recordatorio diario: "${ctx.northStar.dailyReminder}"

${checkInBlock}

INSTRUCCIONES DE COMUNICACIÓN:
· Responde siempre en español.
· Tono: directo, preciso, sin relleno. Como un mentor ejecutivo de élite.
· Máximo 3 párrafos por respuesta, nunca listas largas.
· Termina SIEMPRE con una acción operativa concreta (una sola).
· Sin saludos vacíos ("Hola", "Claro", "Por supuesto").
· Usa datos del check-in cuando estén disponibles.
· Habla al operador de tú, con respeto pero sin paternalismo.`.trim();
}

// ─── Dev Simulation ───────────────────────────────────────────────────────────

const DEV_RESPONSES = [
  'Estado operativo confirmado. La lectura de tu sistema indica que el vector de mayor retorno hoy es cerrar la decisión pendiente más costosa. Elimina variables, protege el bloque de 45 minutos y registra evidencia al cierre. Una salida medible antes del mediodía.',
  'Tu energía es un recurso finito, no renovable por voluntad. Reduce amplitud: una prioridad, una conversación que cierra un frente, un bloque sin interrupción. El sistema no necesita más inputs hoy; necesita salidas limpias. Ejecuta ahora.',
  'Claridad operativa: tienes suficiente información para decidir. El análisis adicional es ruido. Selecciona el vector de mayor retorno neto, configura 45 minutos de bloque profundo y ejecuta con criterio. Cierra el día con una evidencia tangible, no con planes.',
  'Protocolo activo. Tu identidad de empresario soberano requiere que el día genere algo irreversible. No optimices en exceso; ejecuta. Bloque profundo, una decisión cerrada, energía protegida. Eso es ejecución soberana. ¿Qué abres ahora?',
];

async function streamDevSimulation(
  userMessage: string,
  onChunk: (delta: string) => void,
): Promise<string> {
  const lower = userMessage.toLowerCase();
  let reply: string;

  if (lower.includes('norte') || lower.includes('recuerd')) {
    reply = DEV_RESPONSES[3];
  } else if (lower.includes('practica') || lower.includes('ejer')) {
    reply = DEV_RESPONSES[1];
  } else if (lower.includes('ordena') || lower.includes('dia') || lower.includes('día')) {
    reply = DEV_RESPONSES[2];
  } else {
    reply = DEV_RESPONSES[Math.floor(Math.random() * DEV_RESPONSES.length)];
  }

  let full = '';
  for (const char of reply) {
    await new Promise<void>((r) => setTimeout(r, 18));
    full += char;
    onChunk(char);
  }
  return full;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Envía un mensaje al mentor y hace streaming de la respuesta.
 *
 * Prioridad:
 * 1. Dev simulation (cuando isDev y sin claves de API)
 * 2. NVIDIA NIM  (si ENV.nvidiaApiKey está definida)
 * 3. OpenAI      (fallback si NVIDIA falla o no hay clave)
 * 4. Dev simulation (último recurso)
 */
export async function streamMentorResponse(
  ctx: MentorContext,
  userMessage: string,
  history: { role: 'mentor' | 'user'; text: string }[],
  onChunk: (delta: string) => void,
): Promise<string> {
  // ── Dev simulation cuando no hay claves de API
  if (ENV.isDev && !ENV.nvidiaApiKey && !ENV.openaiApiKey) {
    return streamDevSimulation(userMessage, onChunk);
  }

  const systemPrompt = buildSystemPrompt(ctx);

  const messages = [
    { role: 'system', content: systemPrompt },
    // Últimos 10 mensajes del historial para contexto
    ...history.slice(-10).map((m) => ({
      role: m.role === 'mentor' ? ('assistant' as const) : ('user' as const),
      content: m.text,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  // ── NVIDIA (primary)
  if (ENV.nvidiaApiKey) {
    try {
      return await streamNvidia(messages, onChunk);
    } catch (err) {
      console.warn('[Mentor] NVIDIA falló, cambiando a OpenAI:', err);
    }
  }

  // ── OpenAI (fallback)
  if (ENV.openaiApiKey) {
    try {
      return await streamOpenAI(messages, onChunk);
    } catch (err) {
      console.warn('[Mentor] OpenAI falló, usando simulación:', err);
    }
  }

  // ── Simulación dev (último recurso)
  return streamDevSimulation(userMessage, onChunk);
}
