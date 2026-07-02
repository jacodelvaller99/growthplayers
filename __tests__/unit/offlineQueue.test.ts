/**
 * offlineQueue — flushQueue con fallback 42P10: si el upsert con onConflict
 * falla porque la BD no tiene árbitro (índice ausente/parcial), reintenta como
 * insert simple para que el dato no quede atascado para siempre.
 */
const mockStore: Record<string, unknown> = {};
jest.mock('@/storage/local', () => ({
  readLocal: jest.fn(async (k: string) => mockStore[k] ?? null),
  writeLocal: jest.fn(async (k: string, v: unknown) => { mockStore[k] = v; }),
}));

const mockUpsert = jest.fn();
const mockInsert = jest.fn();
jest.mock('@/lib/supabase', () => ({
  supabase: { from: () => ({ upsert: mockUpsert, insert: mockInsert }) },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { enqueueWrite, flushQueue } = require('@/lib/offlineQueue');

const QUEUE = 'offline_queue_v1';
const item = {
  table: 'mentor_messages',
  payload: { user_id: 'u1', role: 'user', content: 'hola', client_id: 'c1' },
  onConflict: 'user_id,client_id',
};

beforeEach(() => {
  delete mockStore[QUEUE];
  mockUpsert.mockReset();
  mockInsert.mockReset();
});

describe('flushQueue', () => {
  it('upsert OK → la cola queda vacía', async () => {
    await enqueueWrite(item);
    mockUpsert.mockResolvedValue({ error: null });
    await flushQueue();
    expect(mockStore[QUEUE]).toEqual([]);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('42P10 (sin árbitro ON CONFLICT) → cae a insert simple y drena', async () => {
    await enqueueWrite(item);
    mockUpsert.mockResolvedValue({
      error: { message: 'there is no unique or exclusion constraint matching the ON CONFLICT specification' },
    });
    mockInsert.mockResolvedValue({ error: null });
    await flushQueue();
    expect(mockInsert).toHaveBeenCalledWith(item.payload);
    expect(mockStore[QUEUE]).toEqual([]);
  });

  it('42P10 y el insert también falla → el ítem se conserva', async () => {
    await enqueueWrite(item);
    mockUpsert.mockResolvedValue({ error: { message: '42P10' } });
    mockInsert.mockResolvedValue({ error: { message: 'rls denied' } });
    await flushQueue();
    expect((mockStore[QUEUE] as unknown[]).length).toBe(1);
  });

  it('error distinto (p.ej. red) → conserva el ítem sin intentar insert', async () => {
    await enqueueWrite(item);
    mockUpsert.mockResolvedValue({ error: { message: 'fetch failed' } });
    await flushQueue();
    expect(mockInsert).not.toHaveBeenCalled();
    expect((mockStore[QUEUE] as unknown[]).length).toBe(1);
  });
});
