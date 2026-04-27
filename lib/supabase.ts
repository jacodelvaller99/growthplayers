import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// ─── Env vars ─────────────────────────────────────────────────────────────────
// Defínelas en .env.local (local) o en Vercel → Settings → Environment Variables
const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn(
    '[Supabase] EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY no están definidas. ' +
    'Agrega estas variables en .env.local para desarrollo o en Vercel para producción.',
  );
}

// ─── Storage adapter ──────────────────────────────────────────────────────────
// · Web  → localStorage (síncrono, ok para SPA)
// · iOS/Android → expo-secure-store (cifrado en el dispositivo)
const SecureStoreAdapter = {
  getItem: (key: string): string | null | Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string): void | Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string): void | Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

// ─── Client ──────────────────────────────────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// ─── Database types (coinciden con schema.sql) ───────────────────────────────
export type DbProfile = {
  id: string;
  name: string;
  role: string;
  onboarding_completed: boolean;
  protocol_start_date: string;
  active_program_id: string;
  active_module_id: string;
  created_at: string;
  updated_at: string;
};

export type DbNorthStar = {
  id: string;
  user_id: string;
  purpose: string;
  identity: string;
  non_negotiables: string[];
  daily_reminder: string;
  updated_at: string;
};

export type DbCheckIn = {
  id: string;
  user_id: string;
  date: string;
  energy: number;
  clarity: number;
  stress: number;
  sleep: number;
  system_need: string;
  created_at: string;
};

export type DbMentorMessage = {
  id: string;
  user_id: string;
  role: 'mentor' | 'user';
  text: string;
  created_at: string;
};
