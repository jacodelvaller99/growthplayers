import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase credentials not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Types para la BD
export interface User {
  id: string;
  email: string;
  nombre: string;
  avatar_url?: string;
  objetivo_90_dias: string;
  avatar_descripcion: string;
  pilar_mas_debil: string;
  streak: number;
  tier: 'free' | 'soberano' | 'maestro';
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  fecha: string;
  gratitud_1: string;
  gratitud_2: string;
  gratitud_3: string;
  victorias: string[];
  retos: string[];
  intencion: string;
  completado: boolean;
  completed_at?: string;
  created_at: string;
}

export interface SovereigntyWheel {
  id: string;
  user_id: string;
  fe: number;
  finanzas: number;
  salud: number;
  familia: number;
  mente: number;
  negocio: number;
  impacto: number;
  legado: number;
  actualizado_at: string;
}

export interface BiometricData {
  id: string;
  user_id: string;
  fecha: string;
  hrv: number;
  resting_hr: number;
  sleep_score: number;
  recovery_score: number;
  source: 'whoop' | 'oura';
  created_at: string;
}

export interface AiSession {
  id: string;
  user_id: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  mostrar_upgrade: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunitySector {
  id: string;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  created_at: string;
}

export interface CommunityAgent {
  id: string;
  sector_id: string;
  nombre: string;
  especialidad: string;
  avatar_url: string;
  activo: boolean;
  created_at: string;
}

// MOCK SERVICE FUNCTIONS
// Estas funciones retornan datos mock mientras Supabase no esté conectado
// Reemplazar con llamadas reales a Supabase cuando sea necesario

import { MOCK_USER, MOCK_WHEEL, MOCK_JOURNAL_ENTRY, MOCK_SECTORS, MOCK_SESSION } from './mockData';

export const mockServices = {
  getUserProfile: async (userId: string): Promise<User> => {
    console.log('[MOCK] getUserProfile llamada — conectar Supabase después');
    return MOCK_USER as User;
  },

  getWheelData: async (userId: string): Promise<SovereigntyWheel> => {
    console.log('[MOCK] getWheelData llamada — conectar Supabase después');
    return MOCK_WHEEL as SovereigntyWheel;
  },

  getJournalEntry: async (userId: string, date: string): Promise<JournalEntry> => {
    console.log('[MOCK] getJournalEntry llamada — conectar Supabase después');
    return MOCK_JOURNAL_ENTRY as JournalEntry;
  },

  getCommunitySectors: async (): Promise<typeof MOCK_SECTORS> => {
    console.log('[MOCK] getCommunitySectors llamada — conectar Supabase después');
    return MOCK_SECTORS;
  },

  updateWheelPillar: async (userId: string, pillar: string, value: number): Promise<SovereigntyWheel> => {
    console.log(`[MOCK] updateWheelPillar(${pillar}, ${value}) llamada — conectar Supabase después`);
    return {
      ...MOCK_WHEEL,
      [pillar]: value,
    } as SovereigntyWheel;
  },

  createJournalEntry: async (userId: string, entry: Partial<JournalEntry>): Promise<JournalEntry> => {
    console.log('[MOCK] createJournalEntry llamada — conectar Supabase después');
    return {
      ...MOCK_JOURNAL_ENTRY,
      ...entry,
    } as JournalEntry;
  },

  updateJournalEntry: async (entryId: string, updates: Partial<JournalEntry>): Promise<JournalEntry> => {
    console.log('[MOCK] updateJournalEntry llamada — conectar Supabase después');
    return {
      ...MOCK_JOURNAL_ENTRY,
      ...updates,
    } as JournalEntry;
  },
};
