// Estado local en iPhone/Android: archivo legible síncrono al arrancar + migración desde el Llavero.
const mockDisco = new Map<string, string>();
const mockLlavero = new Map<string, string>();

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-file-system', () => ({
  Paths: { document: 'doc' },
  File: class {
    uri: string;
    constructor(dir: string, name: string) { this.uri = `${dir}/${name}`; }
    get exists() { return mockDisco.has(this.uri); }
    textSync() { return mockDisco.get(this.uri) as string; }
    write(s: string) { mockDisco.set(this.uri, s); }
    delete() { mockDisco.delete(this.uri); }
  },
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: async (k: string) => mockLlavero.get(k) ?? null,
  deleteItemAsync: async (k: string) => { mockLlavero.delete(k); },
  setItemAsync: async (k: string, v: string) => { mockLlavero.set(k, v); },
}));

import { readLocal, readLocalSync, removeLocal, writeLocal } from '@/storage/local';

beforeEach(() => { mockDisco.clear(); mockLlavero.clear(); });

it('lo escrito se lee síncrono en el siguiente arranque', async () => {
  await writeLocal('state', { onboardingCompleted: true });
  expect(readLocalSync('state')).toEqual({ onboardingCompleted: true });
});

it('migra lo que estaba en el Llavero al archivo y lo borra de allá', async () => {
  mockLlavero.set('lifeflow.v2.state', JSON.stringify({ a: 1 }));
  expect(await readLocal('state')).toEqual({ a: 1 });
  expect(mockLlavero.size).toBe(0);
  expect(readLocalSync('state')).toEqual({ a: 1 });
});

it('removeLocal borra el archivo', async () => {
  await writeLocal('state', { a: 1 });
  await removeLocal('state');
  expect(readLocalSync('state')).toBeNull();
});
