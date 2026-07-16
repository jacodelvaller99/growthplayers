import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const namespace = 'lifeflow:v2';

// SecureStore solo acepta [A-Za-z0-9._-] en las claves — 'lifeflow:v2:x' lanzaba
// "Invalid key provided to SecureStore" en TODA lectura/escritura nativa (la
// persistencia local nativa nunca funcionó, así que sanear no rompe datos previos).
// Web conserva la clave con ':' porque localStorage la permite y ya hay datos.
function nativeKey(storageKey: string): string {
  return storageKey.replace(/[^A-Za-z0-9._-]/g, '.');
}

export async function readLocal<T>(key: string): Promise<T | null> {
  const storageKey = `${namespace}:${key}`;
  const raw =
    Platform.OS === 'web'
      ? typeof window !== 'undefined'
        ? window.localStorage.getItem(storageKey)
        : null
      : await SecureStore.getItemAsync(nativeKey(storageKey));

  return raw ? (JSON.parse(raw) as T) : null;
}

export async function writeLocal<T>(key: string, value: T): Promise<void> {
  const storageKey = `${namespace}:${key}`;
  const raw = JSON.stringify(value);

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, raw);
    }
    return;
  }

  await SecureStore.setItemAsync(nativeKey(storageKey), raw);
}

export async function removeLocal(key: string): Promise<void> {
  const storageKey = `${namespace}:${key}`;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
    return;
  }

  await SecureStore.deleteItemAsync(nativeKey(storageKey));
}
