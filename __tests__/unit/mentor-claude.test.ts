// ─── lib/mentor.ts — cadena con Claude Sonnet 4.6 primario (ai-proxy activo) ──
// Espejo de mentor.test.ts pero con EXPO_PUBLIC_AI_PROXY_URL configurada:
// Claude encabeza la cadena; NVIDIA/Groq/OpenAI quedan de fallback.

jest.mock('@/app/config/env', () => ({
  ENV: {
    isDev: false,
    nvidiaApiKey: 'nv-test',
    groqApiKey: 'gq-test',
    openaiApiKey: 'sk-test',
    revenueCatApiKey: '',
    aiProxyUrl: 'https://proxy.test/functions/v1/ai-proxy',
  },
}));
jest.mock('@/lib/anthropic', () => ({ streamAnthropic: jest.fn() }));
jest.mock('@/lib/nvidia', () => ({
  streamNvidia: jest.fn(),
  parseSSEStream: jest.fn(),
}));
jest.mock('@/lib/groq', () => ({ streamGroq: jest.fn() }));
jest.mock('@/lib/openai', () => ({ streamOpenAI: jest.fn() }));

import { streamMentorResponse, MentorContext } from '@/lib/mentor';
import { streamAnthropic } from '@/lib/anthropic';
import { streamNvidia } from '@/lib/nvidia';
import { streamGroq } from '@/lib/groq';

const anthropicMock = streamAnthropic as jest.Mock;
const nvidiaMock = streamNvidia as jest.Mock;
const groqMock = streamGroq as jest.Mock;

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
    nonNegotiables: [],
    dailyReminder: 'Primero el estado',
  },
  todayCheckIn: null,
  messageCount: 2,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('streamMentorResponse — Claude primario con ai-proxy', () => {
  it('usa Claude cuando responde; no toca NVIDIA/Groq/OpenAI', async () => {
    anthropicMock.mockResolvedValue('respuesta-claude');
    const out = await streamMentorResponse(ctx, 'hola', [], () => {});
    expect(out).toBe('respuesta-claude');
    expect(anthropicMock).toHaveBeenCalledTimes(1);
    expect(nvidiaMock).not.toHaveBeenCalled();
    expect(groqMock).not.toHaveBeenCalled();
  });

  it('si Claude falla, cae a la cadena clásica (NVIDIA primero)', async () => {
    anthropicMock.mockRejectedValue(new Error('AI proxy 503'));
    nvidiaMock.mockResolvedValue('respuesta-nvidia');
    const out = await streamMentorResponse(ctx, 'hola', [], () => {});
    expect(out).toBe('respuesta-nvidia');
    expect(anthropicMock).toHaveBeenCalledTimes(1);
  });

  it('cancelación del usuario en Claude re-lanza sin seguir la cadena', async () => {
    const controller = new AbortController();
    anthropicMock.mockImplementation(async () => {
      controller.abort();
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    });
    await expect(
      streamMentorResponse(ctx, 'hola', [], () => {}, controller.signal),
    ).rejects.toThrow();
    expect(nvidiaMock).not.toHaveBeenCalled();
    expect(groqMock).not.toHaveBeenCalled();
  });

  it('pasa system prompt + mensaje a Claude (mismo contrato que los demás)', async () => {
    anthropicMock.mockResolvedValue('ok');
    await streamMentorResponse(ctx, '¿cómo cierro la semana?', [], () => {});
    const messages = anthropicMock.mock.calls[0][0] as { role: string; content: string }[];
    expect(messages[0].role).toBe('system');
    expect(messages.at(-1)).toEqual({ role: 'user', content: '¿cómo cierro la semana?' });
  });
});
