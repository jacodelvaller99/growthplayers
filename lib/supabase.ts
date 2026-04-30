import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Database } from '@/types/supabase';

// ─── Env vars ─────────────────────────────────────────────────────────────────
const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? '';
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn(
    '[Supabase] EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY no están definidas.',
  );
}

// ─── Storage adapter ──────────────────────────────────────────────────────────
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
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string): void | Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

// ─── Typed client ─────────────────────────────────────────────────────────────
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// ─── Typed table helpers ──────────────────────────────────────────────────────
export const db = {
  profiles:  () => supabase.from('user_profiles'),
  checkins:  () => supabase.from('daily_checkins'),
  tasks:     () => supabase.from('lesson_tasks'),
  completed: () => supabase.from('completed_lessons'),
  messages:  () => supabase.from('mentor_messages'),
  wellness:  () => supabase.from('wellness_sessions'),
};
