/**
 * Unit tests — streamMentorResponse + buildSystemPrompt
 *
 * Source: lib/mentor.ts
 *
 * Priority routing:
 *   1. DEV simulation (isDev=true AND no API keys)
 *   2. NVIDIA NIM     (ENV.nvidiaApiKey set)
 *   3. Groq           (ENV.groqApiKey set — qwen/qwen3-32b)
 *   4. OpenAI         (ENV.openaiApiKey set, final fallback)
 *   5. DEV simulation (last resort when all providers fail)
 */

import { buildSystemPrompt, streamMentorResponse, type MentorContext } from '@/lib/mentor';

// ── Module mocks (hoisted by jest) ───────────────────────────────────────────

// Control ENV per-test via a mutable object captured by the factory closure
const mockEnv = {
  isDev: false,
  nvidiaApiKey: 'nvidia-test-key',
  groqApiKey: 'groq-test-key',
  openaiApiKey: 'openai-test-key',
};
jest.mock('@/app/config/env', () => ({ get ENV() { return mockEnv; } }));

const mockStreamNvidia = jest.fn();
const mockStreamGroq   = jest.fn();
const mockStreamOpenAI = jest.fn();
jest.mock('@/lib/nvidia', () => ({ streamNvidia: (...args: any[]) => mockStreamNvidia(...args) }));
jest.mock('@/lib/groq',   () => ({ streamGroq:   (...args: any[]) => mockStreamGroq(...args)   }));
jest.mock('@/lib/openai', () => ({ streamOpenAI: (...args: any[]) => mockStreamOpenAI(...args) }));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const baseCtx: MentorContext = {
  userName: 'Juan Carlos',
  role: 'Empresario',
  totalDays: 7,
  streak: 3,
  sovereignScore: 650,
  tier: 'Soberano',
  activeModuleTitle: 'Mercader: Gestión del Tiempo',
  activeModuleProgress: 25,
  northStar: {
    purpose: 'Construir una vida soberana',
    identity: 'Empresario soberano',
    nonNegotiables: ['Entrenar', 'Bloque profundo'],
    dailyReminder: 'No negocio con el ruido.',
  },
  todayCheckIn: null,
  messageCount: 1,
};

// ── buildSystemPrompt ────────────────────────────────────────────────────────

describe('buildSystemPrompt', () => {
  it('includes operator name and protocol day', () => {
    const prompt = buildSystemPrompt(baseCtx);
    expect(prompt).toContain('Juan Carlos');
    expect(prompt).toContain('7 días juntos');
  });

  it('includes north star purpose', () => {
    const prompt = buildSystemPrompt(baseCtx);
    expect(prompt).toContain('Construir una vida soberana');
  });

  it('uses fallback message when no check-in available', () => {
    const prompt = buildSystemPrompt({ ...baseCtx, todayCheckIn: null });
    expect(prompt).toContain('No registrado hoy');
  });

  it('injects check-in biometrics when available', () => {
    const prompt = buildSystemPrompt({
      ...baseCtx,
      todayCheckIn: {
        id: 'ci-today',
        date: new Date().toISOString(),
        energy: 8,
        clarity: 7,
        stress: 3,
        sleep: 7,
        systemNeed: 'Mas foco',
      },
    });
    expect(prompt).toContain('Energía: 8/10');
    expect(prompt).toContain('Estrés: 3/10');
    expect(prompt).toContain('Mas foco');
  });
});

// ── streamMentorResponse — DEV mode simulation ───────────────────────────────

describe('streamMentorResponse — DEV mode', () => {
  beforeEach(() => {
    mockEnv.isDev = true;
    mockEnv.nvidiaApiKey = '';
    mockEnv.groqApiKey   = '';
    mockEnv.openaiApiKey = '';
    jest.useFakeTimers();
  });

  afterEach(() => {
    mockEnv.isDev = false;
    mockEnv.nvidiaApiKey = 'nvidia-test-key';
    mockEnv.groqApiKey   = 'groq-test-key';
    mockEnv.openaiApiKey = 'openai-test-key';
    jest.useRealTimers();
  });

  it('returns a non-empty string without calling any provider', async () => {
    const onChunk = jest.fn();
    const promise = streamMentorResponse(baseCtx, 'Analiza mi estado', [], onChunk);

    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result.length).toBeGreaterThan(0);
    expect(mockStreamNvidia).not.toHaveBeenCalled();
    expect(mockStreamGroq).not.toHaveBeenCalled();
    expect(mockStreamOpenAI).not.toHaveBeenCalled();
  });

  it('calls onChunk for each character streamed', async () => {
    const chunks: string[] = [];
    const promise = streamMentorResponse(
      baseCtx,
      'Ordena mi dia',
      [],
      (delta) => chunks.push(delta),
    );

    await jest.runAllTimersAsync();
    const result = await promise;

    expect(chunks.length).toBe(result.length);
    expect(chunks.join('')).toBe(result);
  });
});

// ── streamMentorResponse — Groq as primary when NVIDIA key absent ─────────────

describe('streamMentorResponse — Groq slot', () => {
  beforeEach(() => {
    mockEnv.isDev = false;
    mockEnv.nvidiaApiKey = '';         // no NVIDIA key
    mockEnv.groqApiKey   = 'groq-test-key';
    mockEnv.openaiApiKey = 'openai-test-key';
    mockStreamGroq.mockResolvedValue('Respuesta de Groq.');
  });

  afterEach(() => {
    mockEnv.nvidiaApiKey = 'nvidia-test-key';
    mockStreamGroq.mockReset();
  });

  it('calls streamGroq when no NVIDIA key and groqApiKey is set', async () => {
    const onChunk = jest.fn();
    const result = await streamMentorResponse(baseCtx, 'Hola', [], onChunk);

    expect(mockStreamGroq).toHaveBeenCalledTimes(1);
    expect(mockStreamNvidia).not.toHaveBeenCalled();
    expect(result).toBe('Respuesta de Groq.');
  });
});

// ── streamMentorResponse — full cascade fallback ──────────────────────────────

describe('streamMentorResponse — cascade: NVIDIA → Groq → OpenAI → dev sim', () => {
  beforeEach(() => {
    mockEnv.isDev = false;
    mockEnv.nvidiaApiKey = 'nvidia-test-key';
    mockEnv.groqApiKey   = 'groq-test-key';
    mockEnv.openaiApiKey = 'openai-test-key';

    // All three providers throw
    mockStreamNvidia.mockRejectedValue(new Error('NVIDIA timeout'));
    mockStreamGroq.mockRejectedValue(new Error('Groq timeout'));
    mockStreamOpenAI.mockRejectedValue(new Error('OpenAI timeout'));

    jest.useFakeTimers();
  });

  afterEach(() => {
    mockStreamNvidia.mockReset();
    mockStreamGroq.mockReset();
    mockStreamOpenAI.mockReset();
    jest.useRealTimers();
  });

  it('falls back to dev simulation when NVIDIA, Groq, and OpenAI all fail', async () => {
    const onChunk = jest.fn();
    const promise = streamMentorResponse(baseCtx, 'Hola', [], onChunk);
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result.length).toBeGreaterThan(0);
    expect(mockStreamNvidia).toHaveBeenCalledTimes(1);
    expect(mockStreamGroq).toHaveBeenCalledTimes(1);
    expect(mockStreamOpenAI).toHaveBeenCalledTimes(1);
  });
});
