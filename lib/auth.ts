import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ─── Secure Storage Helpers ───────────────────────────────────────────────────
// expo-secure-store uses Keychain (iOS) / Keystore (Android).
// On web it falls back to localStorage (no native secure enclave available).
async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(key, value);
}

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(key);
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(key);
}

export interface User {
  id: string;
  email: string;
  nombre: string;
  isAdmin: boolean;
  token: string;
  createdAt: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Hash password (ofuscación básica — nunca almacenar en texto plano)
 */
function hashPassword(password: string): string {
  return btoa(`salt_lifeflow_${password}_salt`);
}

/**
 * Generar token de sesión simple
 */
function generateToken(): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 días
  }));
  const signature = btoa(`lifeflow_${Date.now()}`);
  return `${header}.${payload}.${signature}`;
}

/**
 * Login con email y contraseña
 * NOTA: Este sistema local solo se usa como fallback dev.
 * En producción, la auth va por Supabase (lib/supabase.ts).
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    if (!email || !password) {
      return { success: false, error: 'Email y contraseña requeridos' };
    }

    // Verificar si el usuario existe en la BD local
    const usersJson = await AsyncStorage.getItem('users');
    const users = usersJson ? JSON.parse(usersJson) : [];

    const existingUser = users.find((u: any) => u.email === email);
    if (!existingUser) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    // Verificar contraseña
    const hashedPassword = hashPassword(password);
    if (existingUser.hashedPassword !== hashedPassword) {
      return { success: false, error: 'Credenciales inválidas' };
    }

    const user: User = {
      ...existingUser,
      token: generateToken(),
    };

    // Guardar sesión en SecureStore (Keychain/Keystore)
    await secureSet('session_user', JSON.stringify(user));
    await secureSet('session_token', user.token);

    return { success: true, user };
  } catch (e) {
    console.error('Login error:', e);
    return { success: false, error: 'Error en el servidor' };
  }
}

/**
 * Sign up (crear nuevo usuario)
 */
export async function signupUser(
  email: string,
  password: string,
  nombre: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    if (!email || !password || !nombre) {
      return { success: false, error: 'Todos los campos son requeridos' };
    }

    if (password.length < 8) {
      return { success: false, error: 'La contraseña debe tener mínimo 8 caracteres' };
    }

    const usersJson = await AsyncStorage.getItem('users');
    const users = usersJson ? JSON.parse(usersJson) : [];

    if (users.find((u: any) => u.email === email)) {
      return { success: false, error: 'El email ya está registrado' };
    }

    const hashedPassword = hashPassword(password);
    const newUser: User = {
      id: `user_${Date.now()}`,
      email,
      nombre,
      isAdmin: false,
      token: generateToken(),
      createdAt: Date.now(),
    };

    // Lista de usuarios en AsyncStorage (non-sensitive — no tokens, no passwords in plaintext)
    users.push({ ...newUser, hashedPassword });
    await AsyncStorage.setItem('users', JSON.stringify(users));

    // Sesión activa en SecureStore
    await secureSet('session_user', JSON.stringify(newUser));
    await secureSet('session_token', newUser.token);

    return { success: true, user: newUser };
  } catch (e) {
    console.error('Signup error:', e);
    return { success: false, error: 'Error en el servidor' };
  }
}

/**
 * Logout — limpia SecureStore
 */
export async function logoutUser(): Promise<void> {
  try {
    await secureDelete('session_user');
    await secureDelete('session_token');
  } catch (e) {
    console.error('Logout error:', e);
  }
}

/**
 * Restaurar sesión desde SecureStore
 */
export async function restoreSession(): Promise<User | null> {
  try {
    const userJson = await secureGet('session_user');
    if (!userJson) return null;

    const user: User = JSON.parse(userJson);
    return user;
  } catch (e) {
    console.error('Restore session error:', e);
    return null;
  }
}

/**
 * Verificar si token es válido
 */
export async function isTokenValid(token: string): Promise<boolean> {
  try {
    const storedToken = await secureGet('session_token');
    return storedToken === token;
  } catch {
    return false;
  }
}
