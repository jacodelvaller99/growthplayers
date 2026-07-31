// ─── lib/internist.ts — guardarraíl de salida del internista educativo ────────
//
// POR QUÉ EXISTE: `detectForbiddenLanguage` estaba escrita, testeada y SIN
// NINGÚN LLAMADOR en producción. El internista streameaba lo que dijera el
// modelo directo a la UI y a `internist_sessions`, así que una prescripción
// ("te receto 500 mg de metformina") se mostraba, se guardaba, y volvía al
// prompt en el turno siguiente como precedente aceptable.
//
// Los proveedores se mockean en la frontera de I/O; el corte, el no-reintento y
// la persistencia se prueban de verdad.

jest.mock('@/app/config/env', () => ({
  ENV: {
    isDev: false,
    revenueCatApiKey: '',
    // El proxy es el ÚNICO camino a la IA (las claves son secrets del
    // servidor). Con proxy → los 4 eslabones habilitados.
    aiProxyUrl: 'https://proxy.test',
  },
}));
jest.mock('@/lib/anthropic', () => ({ streamAnthropic: jest.fn() }));
jest.mock('@/lib/nvidia', () => ({ streamNvidia: jest.fn(), parseSSEStream: jest.fn() }));
jest.mock('@/lib/groq', () => ({ streamGroq: jest.fn() }));
jest.mock('@/lib/openai', () => ({ streamOpenAI: jest.fn() }));
jest.mock('@/lib/observability', () => ({ logSilentError: jest.fn() }));

const mockInsert = jest.fn().mockResolvedValue({ error: null });
jest.mock('@/lib/supabase', () => ({
  supabase: { from: () => ({ insert: mockInsert }) },
}));

import { streamInternistResponse, persistInternistTurn } from '@/lib/internist';
import { streamAnthropic } from '@/lib/anthropic';
import { streamNvidia } from '@/lib/nvidia';
import { streamGroq } from '@/lib/groq';
import { streamOpenAI } from '@/lib/openai';
import { logSilentError } from '@/lib/observability';

const anthropicMock = streamAnthropic as jest.Mock;
const nvidiaMock = streamNvidia as jest.Mock;
const groqMock = streamGroq as jest.Mock;
const openaiMock = streamOpenAI as jest.Mock;
const logMock = logSilentError as jest.Mock;

/**
 * Proveedor que emite `chunks` por el sink y devuelve el texto completo.
 *
 * Respeta el `signal` como lo hace un proveedor real: si el guardarraíl aborta
 * a mitad del stream, lanza `AbortError` en vez de terminar tranquilamente. Sin
 * esto el test del no-reintento pasaría por el motivo equivocado — el abort
 * nunca llegaría al `catch`, que es justo la rama donde vive el riesgo.
 */
const emits = (chunks: string[]) =>
  jest.fn(async (_m: unknown, sink: (d: string) => void, signal?: AbortSignal) => {
    for (const c of chunks) {
      sink(c);
      if (signal?.aborted) {
        const e = new Error('Aborted');
        e.name = 'AbortError';
        throw e;
      }
    }
    return chunks.join('');
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockInsert.mockResolvedValue({ error: null });
});

describe('streamInternistResponse — guardarraíl de lenguaje prohibido', () => {
  // La frase se completa en el 2º chunk: el usuario alcanza a ver "Por lo que
  // veo, " pero NO el chunk que la completa ni nada posterior.
  const PRESCRIBE = ['Por lo que veo, ', 'te receto 500 mg', ' de metformina al día'];

  it('corta el stream y devuelve el texto correctivo', async () => {
    anthropicMock.mockImplementation(emits(PRESCRIBE));
    const seen: string[] = [];

    const out = await streamInternistResponse({}, 'mi glucosa está en 130', [], (d) => seen.push(d));

    expect(seen).toEqual(['Por lo que veo, ']);
    expect(seen.join('')).not.toContain('te receto');
    expect(out.text).toContain('Corté esa respuesta a mitad');
    expect(out.text).not.toContain('metformina');
    expect(out.forbidden).toEqual(['te receto']);
  });

  // EL TEST QUE IMPORTA. Sin la comprobación de `violation` en la cadena, el
  // abort por contenido se lee como un fallo de proveedor y se reintenta con
  // los otros tres: cuatro llamadas de API y cuatro fragmentos pintados por una
  // sola infracción.
  it('NO reintenta con los siguientes proveedores tras una violación', async () => {
    anthropicMock.mockImplementation(emits(PRESCRIBE));

    await streamInternistResponse({}, 'mi glucosa está en 130', [], () => {});

    expect(anthropicMock).toHaveBeenCalledTimes(1);
    expect(nvidiaMock).toHaveBeenCalledTimes(0);
    expect(groqMock).toHaveBeenCalledTimes(0);
    expect(openaiMock).toHaveBeenCalledTimes(0);
  });

  it('registra solo las frases, nunca el texto del modelo', async () => {
    anthropicMock.mockImplementation(emits(PRESCRIBE));

    await streamInternistResponse({}, 'mi glucosa está en 130', [], () => {});

    const call = logMock.mock.calls.find((c) => c[0] === 'internist.forbiddenLanguage');
    expect(call).toBeDefined();
    expect(String(call![1])).toContain('te receto');
    expect(String(call![1])).not.toContain('metformina');
  });

  it('una respuesta limpia pasa intacta (no-regresión)', async () => {
    const CLEAN = ['La glucosa en ayunas ', 'entre 100 y 125 mg/dL ', 'se considera prediabetes.'];
    anthropicMock.mockImplementation(emits(CLEAN));
    const seen: string[] = [];

    const out = await streamInternistResponse({}, 'qué significa 110', [], (d) => seen.push(d));

    expect(seen).toEqual(CLEAN);
    expect(out.text).toBe(CLEAN.join(''));
    expect(out.forbidden).toBeUndefined();
  });

  it('la red-flag urgente sigue cortocircuitando antes del modelo (no-regresión)', async () => {
    const out = await streamInternistResponse({}, 'últimamente tengo pensamientos suicidas', [], () => {});

    expect(anthropicMock).toHaveBeenCalledTimes(0);
    expect(out.redFlags.some((f) => f.severity === 'urgent')).toBe(true);
  });
});

describe('persistInternistTurn — auditoría sin transcripción', () => {
  it('guarda las frases como red-flag y NO el texto ofensivo', async () => {
    await persistInternistTurn('u-1', 'assistant', 'Corté esa respuesta a mitad…', [], ['te receto']);

    const row = mockInsert.mock.calls[0][0];
    expect(row.content).toContain('Corté esa respuesta');
    expect(JSON.stringify(row)).not.toContain('metformina');
    expect(row.red_flags).toEqual([
      { trigger: 'forbidden_language', severity: 'blocked', keyword: 'te receto' },
    ]);
  });

  it('sin red-flags ni frases, red_flags queda null (no-regresión)', async () => {
    await persistInternistTurn('u-1', 'assistant', 'texto normal');
    expect(mockInsert.mock.calls[0][0].red_flags).toBeNull();
  });
});
