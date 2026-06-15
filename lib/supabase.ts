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
    storage:            SecureStoreAdapter,
    autoRefreshToken:   true,
    persistSession:     true,
    // false: we use localStorage-based session persistence, not URL hash tokens.
    // Setting true on web adds unnecessary URL parsing overhead on every init.
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 2 },   // limit reconnect aggressiveness
  },
});

// ─── TCP preconnect warm-up (web only) ────────────────────────────────────────
// Opens the TCP connection to Supabase before the first query fires.
// Non-blocking — errors are silently ignored.
if (Platform.OS === 'web' && typeof window !== 'undefined' && SUPABASE_URL) {
  fetch(`${SUPABASE_URL}/rest/v1/`, { method: 'HEAD' }).catch(() => {});
}

// ─── Typed table helpers ──────────────────────────────────────────────────────
export const db = {
  profiles:  () => supabase.from('user_profiles'),
  checkins:  () => supabase.from('daily_checkins'),
  tasks:     () => supabase.from('lesson_tasks'),
  completed: () => supabase.from('completed_lessons'),
  messages:  () => supabase.from('mentor_messages'),
  wellness:  () => supabase.from('wellness_sessions'),
  journal:   () => supabase.from('journal_entries'),
};

/**
 * Intelligence Engine table helpers — untyped (tables added in migration
 * 20260502000000; regenerate Supabase types to get full type safety).
 * eslint-disable-next-line @typescript-eslint/no-explicit-any
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyClient = supabase as any;
export const intel = {
  events:           () => anyClient.from('user_events'),
  intelligence:     () => anyClient.from('user_intelligence'),
  memories:         () => anyClient.from('mentor_memories'),
  conversations:    () => anyClient.from('mentor_conversations'),
  notifications:    () => anyClient.from('smart_notifications'),
  /** profiles — base table with id = auth.uid(), is_admin flag */
  profiles:         () => anyClient.from('profiles'),
};

// ─── Additive v4.1 table helpers — untyped (tables added in migration 20260513000000) ──
export const db2 = {
  habits:             () => anyClient.from('habits'),
  habitLogs:          () => anyClient.from('habit_logs'),
  fasting:            () => anyClient.from('fasting_sessions'),
  communityPosts:     () => anyClient.from('community_posts'),
  communityReactions: () => anyClient.from('community_reactions'),
  bodyMeasurements:   () => anyClient.from('body_measurements'),
  nutritionProfiles:  () => anyClient.from('nutrition_profiles'),
  supplements:        () => anyClient.from('supplement_stacks'),
  weeklySessions:     () => anyClient.from('weekly_sessions'),
  mentorThreads:      () => anyClient.from('mentor_threads'),
};

// ─── Memory OS table helpers — untyped (migración 20260615000000_memory_system) ──
// user_memory_profile/memory_summaries: dueño+admin · admin_briefings/admin_notes: admin-only (RLS).
export const mem = {
  memoryProfile: () => anyClient.from('user_memory_profile'),
  summaries:     () => anyClient.from('memory_summaries'),
  briefings:     () => anyClient.from('admin_briefings'),
  adminNotes:    () => anyClient.from('admin_notes'),
};
