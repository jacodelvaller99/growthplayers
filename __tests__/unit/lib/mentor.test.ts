/**
 * Unit tests — streamMentorResponse + buildSystemPrompt
 *
 * Source: lib/mentor.ts
 *
 * Priority routing:
 *   1. DEV simulation (isDev=true AND no API keys)
 *   2. NVIDIA NIM     (ENV.nvidiaApiKey set)
 *   3. OpenAI         (ENV.openaiApiKey set, fallback)
 *   4. DEV simulation (last resort when all providers fail)
 */

import { buildSystemPrompt, streamMentorResponse, type MentorContext } from '@/lib/mentor';

// ── Module mocks (hoisted by jest) ───────────────────────────────────────────

// Control ENV per-test via a mutable object captured by the factory closure
const mockEnv = {
  isDev: false,
  nvidiaApiKey: 'nvidia-test-key',
  openaiApiKey: 'openai-test-key',
};
jest.mock('@/app/config/env', () => ({ get ENV() { return mockEnv; } }));

const mockStreamNvidia = jest.fn();
const mockStreamOpenAI = jest.fn();
jest.mock('@/lib/nvidia', () => ({ streamNvidia: (...args: any[]) => mockStreamNvidia(...args) }));
jest.mock('@/lib/openai', () => ({ streamOpenAI: (...args: any[]) => mockStreamOpenAI(...args) }));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const baseCtx: MentorContext = {
  name: 'Juan Carlos',
  role: 'Empresario',
  protocolDay: 7,
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
    expect(prompt).toContain('7/90');
  });

  it('includes north star purpose', () => {
    const prompt = buildSystemPrompt(baseCtx);
    expect(prompt).toContain('Construir una vida soberana');
  });

  it('uses fallback message when no check-in available', () => {
    const prompt = buildSystemPrompt({ ...baseCtx, todayCheckIn: null });
    expect(prompt).toContain('Sin check-in registrado hoy');
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
    expect(prompt).toContain('Energía 8/10');
    expect(prompt).toContain('Estrés 3/10');
    expect(prompt).toContain('Mas foco');
  });
});

// ── streamMentorResponse — DEV mode simulation ───────────────────────────────

describe('streamMentorResponse — DEV mode', () => {
  beforeEach(() => {
    // Switch to DEV mode with no API keys → should use dev simulation
    mockEnv.isDev = true;
    mockEnv.nvidiaApiKey = '';
    mockEnv.openaiApiKey = '';
    jest.useFakeTimers();
  });

  afterEach(() => {
    mockEnv.isDev = false;
    mockEnv.nvidiaApiKey = 'nvidia-test-key';
    mockEnv.openaiApiKey = 'openai-test-key';
    jest.useRealTimers();
  });

  it('returns a non-empty string without calling NVIDIA or OpenAI', async () => {
    const onChunk = jest.fn();
    const promise = streamMentorResponse(baseCtx, 'Analiza mi estado', [], onChunk);

    // Advance all setTimeout timers used by the char-by-char simulation
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result.length).toBeGreaterThan(0);
    expect(mockStreamNvidia).not.toHaveBeenCalled();
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

// ── streamMentorResponse — network error fallback ────────────────────────────

describe('streamMentorResponse — network error falls back to dev simulation', () => {
  beforeEach(() => {
    mockEnv.isDev = false;
    mockEnv.nvidiaApiKey = 'nvidia-test-key';
    mockEnv.openaiApiKey = 'openai-test-key';

    // Both providers throw
    mockStreamNvidia.mockRejectedValue(new Error('NVIDIA timeout'));
    mockStreamOpenAI.mockRejectedValue(new Error('OpenAI timeout'));

    jest.useFakeTimers();
  });

  afterEach(() => {
    mockStreamNvidia.mockReset();
    mockStreamOpenAI.mockReset();
    jest.useRealTimers();
  });

  it('falls back to dev simulation when both NVIDIA and OpenAI fail', async () => {
    const onChunk = jest.fn();
    const promise = streamMentorResponse(baseCtx, 'Hola', [], onChunk);
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result.length).toBeGreaterThan(0);
    expect(mockStreamNvidia).toHaveBeenCalledTimes(1);
    expect(mockStreamOpenAI).toHaveBeenCalledTimes(1);
  });
});
