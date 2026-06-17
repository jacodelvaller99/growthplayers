// ─── lib/mentor.ts — cadena de fallback + contrato de honestidad/seguridad ────
// Los proveedores se mockean en la frontera de I/O; la lógica de orquestación
// (orden NVIDIA → Groq → OpenAI, corte por abort) se prueba real.

jest.mock('@/app/config/env', () => ({
  ENV: {
    isDev: false,
    nvidiaApiKey: 'nv-test',
    groqApiKey: 'gq-test',
    openaiApiKey: 'sk-test',
    revenueCatApiKey: '',
    aiProxyUrl: '', // sin proxy → Claude se salta, cadena clásica intacta
  },
}));
jest.mock('@/lib/anthropic', () => ({ streamAnthropic: jest.fn() }));
jest.mock('@/lib/nvidia', () => ({
  streamNvidia: jest.fn(),
  parseSSEStream: jest.fn(),
}));
jest.mock('@/lib/groq', () => ({ streamGroq: jest.fn() }));
jest.mock('@/lib/openai', () => ({ streamOpenAI: jest.fn() }));

import { streamMentorResponse, buildSystemPrompt, modePromptBlock, MentorContext, MentorMode } from '@/lib/mentor';
import { streamNvidia } from '@/lib/nvidia';
import { streamGroq } from '@/lib/groq';
import { streamOpenAI } from '@/lib/openai';

const nvidiaMock = streamNvidia as jest.Mock;
const groqMock = streamGroq as jest.Mock;
const openaiMock = streamOpenAI as jest.Mock;

const ctx: MentorContext = {
  userName: 'Ana',
  role: 'Fundadora',
  totalDays: 12,
  streak: 4,
  sovereignScore: 520,
  tier: 'EN ASCENSO',
  activeModuleTitle: 'Guerrero',
  activeModuleProgress: 30,
  northStar: {
    purpose: 'Construir con libertad',
    identity: 'Operadora soberana',
    nonNegotiables: ['Dormir 8h'],
    dailyReminder: 'Primero el estado',
  },
  todayCheckIn: null,
  messageCount: 2,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('streamMentorResponse — fallback chain', () => {
  it('usa NVIDIA cuando responde; no toca Groq/OpenAI', async () => {
    nvidiaMock.mockResolvedValue('respuesta-nvidia');
    const out = await streamMentorResponse(ctx, 'hola', [], () => {});
    expect(out).toBe('respuesta-nvidia');
    expect(groqMock).not.toHaveBeenCalled();
    expect(openaiMock).not.toHaveBeenCalled();
  });

  it('si NVIDIA falla cae a Groq', async () => {
    nvidiaMock.mockRejectedValue(new Error('NVIDIA API 500'));
    groqMock.mockResolvedValue('respuesta-groq');
    const out = await streamMentorResponse(ctx, 'hola', [], () => {});
    expect(out).toBe('respuesta-groq');
    expect(openaiMock).not.toHaveBeenCalled();
  });

  it('si NVIDIA y Groq fallan cae a OpenAI', async () => {
    nvidiaMock.mockRejectedValue(new Error('boom'));
    groqMock.mockRejectedValue(new Error('boom'));
    openaiMock.mockResolvedValue('respuesta-openai');
    const out = await streamMentorResponse(ctx, 'hola', [], () => {});
    expect(out).toBe('respuesta-openai');
  });

  it('una cancelación del usuario NO sigue la cadena: re-lanza', async () => {
    const controller = new AbortController();
    nvidiaMock.mockImplementation(async () => {
      controller.abort();
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    });
    await expect(
      streamMentorResponse(ctx, 'hola', [], () => {}, controller.signal),
    ).rejects.toThrow();
    expect(groqMock).not.toHaveBeenCalled();
    expect(openaiMock).not.toHaveBeenCalled();
  });

  it('señal ya abortada → devuelve "" sin llamar a ningún proveedor', async () => {
    const controller = new AbortController();
    controller.abort();
    const out = await streamMentorResponse(ctx, 'hola', [], () => {}, controller.signal);
    expect(out).toBe('');
    expect(nvidiaMock).not.toHaveBeenCalled();
  });

  it('pasa el system prompt + historial reciente + mensaje al proveedor', async () => {
    nvidiaMock.mockResolvedValue('ok');
    await streamMentorResponse(
      ctx,
      '¿cómo cierro la semana?',
      [{ role: 'user', text: 'contexto previo' }],
      () => {},
    );
    const messages = nvidiaMock.mock.calls[0][0] as { role: string; content: string }[];
    expect(messages[0].role).toBe('system');
    expect(messages.at(-1)).toEqual({ role: 'user', content: '¿cómo cierro la semana?' });
  });
});

describe('buildSystemPrompt — contrato de compliance (no regresionar)', () => {
  const prompt = buildSystemPrompt(ctx);

  it('contextualiza al usuario', () => {
    expect(prompt).toContain('Ana');
  });

  it('mantiene la REGLA DE HONESTIDAD (divulgación de IA)', () => {
    expect(prompt).toContain('REGLA DE HONESTIDAD');
    expect(prompt).toContain('inteligencia artificial');
  });

  it('mantiene el bloque de SEGURIDAD (ruteo de crisis)', () => {
    expect(prompt).toContain('SEGURIDAD');
  });
});

describe('modePromptBlock — modos explícitos de Norman', () => {
  const MODES: MentorMode[] = ['diagnosis', 'decision', 'accountability', 'reflection'];

  it('devuelve vacío sin modo', () => {
    expect(modePromptBlock(undefined)).toBe('');
  });

  it('cada modo produce un bloque no vacío y distinto', () => {
    const blocks = MODES.map((m) => modePromptBlock(m));
    blocks.forEach((b) => {
      expect(b).toContain('MODO ACTIVO');
      expect(b).toContain('SEGURIDAD'); // el modo nunca anula la seguridad
    });
    expect(new Set(blocks).size).toBe(MODES.length); // todos distintos
  });

  it('etiqueta correcta por modo', () => {
    expect(modePromptBlock('accountability')).toContain('RENDICIÓN DE CUENTAS');
    expect(modePromptBlock('diagnosis')).toContain('DIAGNÓSTICO');
  });

  it('buildSystemPrompt inyecta el modo cuando ctx.mode está presente y no cuando no', () => {
    expect(buildSystemPrompt(ctx)).not.toContain('MODO ACTIVO');
    expect(buildSystemPrompt({ ...ctx, mode: 'decision' })).toContain('MODO ACTIVO — DECISIÓN');
  });
});
