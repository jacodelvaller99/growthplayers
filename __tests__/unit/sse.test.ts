// ─── lib/nvidia.ts parseSSEStream — parser SSE compartido (real, sin mocks) ───
// Es la pieza por la que pasa TODO el streaming del mentor (NVIDIA/Groq/OpenAI
// y el futuro ai-proxy). Se prueba con Responses sintéticas.

import { parseSSEStream } from '@/lib/nvidia';

/** Construye un objeto tipo Response cuyo body emite los chunks dados. */
function sseResponse(chunks: string[]): Response {
  let i = 0;
  const encoder = new TextEncoder();
  return {
    body: {
      getReader: () => ({
        read: async () =>
          i < chunks.length
            ? { done: false, value: encoder.encode(chunks[i++]) }
            : { done: true, value: undefined },
        releaseLock: () => {},
      }),
    },
  } as unknown as Response;
}

const dataLine = (content: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n`;

describe('parseSSEStream', () => {
  it('concatena deltas y notifica cada chunk', async () => {
    const onChunk = jest.fn();
    const res = sseResponse([dataLine('Hola '), dataLine('mundo'), 'data: [DONE]\n']);
    const full = await parseSSEStream(res, onChunk);
    expect(full).toBe('Hola mundo');
    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk).toHaveBeenNthCalledWith(1, 'Hola ');
  });

  it('re-ensambla líneas partidas entre chunks de red', async () => {
    const line = dataLine('Hola');
    const cut = 18; // corta en medio del JSON
    const res = sseResponse([line.slice(0, cut), line.slice(cut)]);
    const full = await parseSSEStream(res, () => {});
    expect(full).toBe('Hola');
  });

  it('ignora líneas malformadas sin romper el stream', async () => {
    const res = sseResponse([
      dataLine('ok1'),
      'data: {esto no es json}\n',
      'evento-no-sse\n',
      dataLine('ok2'),
    ]);
    const full = await parseSSEStream(res, () => {});
    expect(full).toBe('ok1ok2');
  });

  it('abort a mitad de stream devuelve el texto parcial acumulado', async () => {
    const controller = new AbortController();
    const onChunk = jest.fn((delta: string) => {
      if (delta === 'parcial') controller.abort();
    });
    const res = sseResponse([dataLine('parcial'), dataLine('nunca-llega')]);
    const full = await parseSSEStream(res, onChunk, controller.signal);
    expect(full).toBe('parcial');
    expect(onChunk).toHaveBeenCalledTimes(1);
  });

  it('body nulo lanza error explícito', async () => {
    await expect(
      parseSSEStream({ body: null } as unknown as Response, () => {}),
    ).rejects.toThrow('Response body is null');
  });
});
