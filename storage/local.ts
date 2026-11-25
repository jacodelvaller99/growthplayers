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

// Nativo: archivo en el sandbox de la app (cifrado en reposo por el SO), no el Llavero.
// El Llavero es para secretos chicos (la sesión vive ahí, en lib/supabase.ts); el estado
// completo pesa decenas de KB y leerlo/escribirlo ahí era lento. Además se puede leer
// SÍNCRONO al arrancar → el iPhone abre con lo último que vio, igual que la web.
function archivo(storageKey: string) {
  const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  return new File(Paths.document, `${nativeKey(storageKey)}.json`);
}

/** Lectura síncrona (solo para el estado inicial). Web: localStorage; nativo: archivo. */
export function readLocalSync<T>(key: string): T | null {
  const storageKey = `${namespace}:${key}`;
  try {
    if (Platform.OS === 'web') {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const f = archivo(storageKey);
    return f.exists ? (JSON.parse(f.textSync()) as T) : null;
  } catch {
    return null;
  }
}

export async function readLocal<T>(key: string): Promise<T | null> {
  const storageKey = `${namespace}:${key}`;
  if (Platform.OS === 'web') {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
    return raw ? (JSON.parse(raw) as T) : null;
  }
  const enArchivo = readLocalSync<T>(key);
  if (enArchivo !== null) return enArchivo;
  // Datos de antes del cambio: siguen en el Llavero; se leen una vez y pasan al archivo.
  const raw = await SecureStore.getItemAsync(nativeKey(storageKey));
  if (!raw) return null;
  try { archivo(storageKey).write(raw); await SecureStore.deleteItemAsync(nativeKey(storageKey)); } catch { /* se reintenta en la próxima lectura */ }
  return JSON.parse(raw) as T;
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

  archivo(storageKey).write(raw);
}

export async function removeLocal(key: string): Promise<void> {
  const storageKey = `${namespace}:${key}`;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
    return;
  }

  try { const f = archivo(storageKey); if (f.exists) f.delete(); } catch { /* nada que borrar */ }
  await SecureStore.deleteItemAsync(nativeKey(storageKey));
}
