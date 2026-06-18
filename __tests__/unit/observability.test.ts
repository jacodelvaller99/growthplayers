import { logSilentError } from '@/lib/observability';

describe('logSilentError', () => {
  const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  const spyErr = jest.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => { spyWarn.mockClear(); spyErr.mockClear(); });
  afterAll(() => { spyWarn.mockRestore(); spyErr.mockRestore(); });

  it('no lanza nunca — degrada con rastro', () => {
    expect(() => logSilentError('ctx', new Error('boom'))).not.toThrow();
  });

  it('tolera valores no-Error', () => {
    expect(() => logSilentError('ctx', 'string error')).not.toThrow();
    expect(() => logSilentError('ctx', null)).not.toThrow();
    expect(() => logSilentError('ctx', undefined)).not.toThrow();
    expect(() => logSilentError('ctx', { code: 42 })).not.toThrow();
  });

  it('emite un rastro (console.warn o console.error) con el contexto', () => {
    logSilentError('memory.fetch', new Error('x'));
    const emitted = spyWarn.mock.calls.length + spyErr.mock.calls.length;
    expect(emitted).toBeGreaterThan(0);
    const all = [...spyWarn.mock.calls, ...spyErr.mock.calls].flat().join(' ');
    expect(all).toContain('memory.fetch');
  });
});
