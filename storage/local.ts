import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const namespace = 'lifeflow:v2';

export async function readLocal<T>(key: string): Promise<T | null> {
  const storageKey = `${namespace}:${key}`;
  const raw =
    Platform.OS === 'web'
      ? typeof window !== 'undefined'
        ? window.localStorage.getItem(storageKey)
        : null
      : await SecureStore.getItemAsync(storageKey);

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

  await SecureStore.setItemAsync(storageKey, raw);
}

export async function removeLocal(key: string): Promise<void> {
  const storageKey = `${namespace}:${key}`;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
    return;
  }

  await SecureStore.deleteItemAsync(storageKey);
}
