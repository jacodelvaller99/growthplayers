import { create } from 'zustand';
import type { User, JournalEntry, SovereigntyWheel, BiometricData, AiSession } from '../lib/supabase';
import type { PolarisProfile } from '../types/polaris';
import { MOCK_USER, MOCK_WHEEL, MOCK_JOURNAL_ENTRY } from '../lib/mockData';
import { supabase } from '../lib/supabase';

// ========== BLOQUE 0: TIPOS DE EVALUACIÓN Y PERSONALIZACIÓN ==========

// Tipos para la Rueda de la Vida
export type AreaVida =
  | 'salud'
  | 'carrera'
  | 'finanzas'
  | 'relaciones'
  | 'familia'
  | 'mente'
  | 'espiritualidad'
  | 'diversion';

// Arquetipos de motivación
export type ArquetipoMotivacion =
  | 'constructor'
  | 'conector'
  | 'explorador'
  | 'guardian';

// Puntuación de un área (satisfacción + importancia)
export interface AreaScore {
  satisfaccion: number; // 1-10
  importancia: number;  // 1-10
}

// Rueda de la Vida completa (8 áreas)
export interface WheelOfLife {
  salud: AreaScore;
  carrera: AreaScore;
  finanzas: AreaScore;
  relaciones: AreaScore;
  familia: AreaScore;
  mente: AreaScore;
  espiritualidad: AreaScore;
  diversion: AreaScore;
  evaluado_at: string;
}

// Perfil de Motivación (calculado a partir de Rueda + Polaris)
export interface MotivacionProfile {
  arquetipo: ArquetipoMotivacion;
  area_dominante: AreaVida;    // Mayor GAP (importancia - satisfacción)
  area_ancla: AreaVida;        // Mayor energía (satisfacción + importancia)
  punto_ciego: AreaVida;       // Menor atención
  motivador_personal: string;  // Texto libre del usuario
  completado_at: string;
}

// Check-in diario
export interface DailyCheckin {
  fecha: string;
  energia_cuerpo: number;       // 1-5
  foco_area: AreaVida;
  calidad_sueno: number;        // 1-5
  protocolo_ajustado: boolean;
}

// Auth Store
interface AuthState {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  initialize: () => void;
  setUser: (user: User | null) => void;
  setSession: (session: any | null) => void;
  setIsLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  initialize: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        set({ session, user: (session?.user as unknown as User) ?? null, isLoading: false })
      } else {
        // Don't overwrite a session already set (e.g. dev-bypass before this resolves)
        set((state) => ({ ...state, isLoading: false }))
      }
    }).catch(error => {
      console.warn("Supabase auth error (posibles credenciales incorrectas):", error);
      set((state) => ({ ...state, isLoading: false }));
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) set({ session, user: (session?.user as unknown as User) ?? null, isLoading: false })
    })
  },
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setIsLoading: (isLoading) => set({ isLoading }),
  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null })
  },
  logout: () => set({ user: null, session: null }),
}));

// Journal Store
interface JournalState {
  entries: JournalEntry[];
  currentEntry: JournalEntry | null;
  isCompleted: boolean;
  streak: number;
  setEntries: (entries: JournalEntry[]) => void;
  setCurrentEntry: (entry: JournalEntry | null) => void;
  setIsCompleted: (completed: boolean) => void;
  setStreak: (streak: number) => void;
  addGratitude: (index: number, text: string) => void;
  addVictory: (text: string) => void;
  removeVictory: (index: number) => void;
  addChallenge: (text: string) => void;
  removeChallenge: (index: number) => void;
  setIntention: (text: string) => void;
}

export const useJournalStore = create<JournalState>((set) => ({
  entries: [],
  currentEntry: MOCK_JOURNAL_ENTRY as JournalEntry,
  isCompleted: false,
  streak: MOCK_USER.streak,
  setEntries: (entries) => set({ entries }),
  setCurrentEntry: (entry) => set({ currentEntry: entry }),
  setIsCompleted: (completed) => set({ isCompleted: completed }),
  setStreak: (streak) => set({ streak }),
  addGratitude: (index, text) =>
    set((state) => {
      const entry = state.currentEntry;
      if (!entry) return state;
      const gratitudes = [entry.gratitud_1, entry.gratitud_2, entry.gratitud_3];
      gratitudes[index] = text;
      return {
        currentEntry: {
          ...entry,
          gratitud_1: gratitudes[0],
          gratitud_2: gratitudes[1],
          gratitud_3: gratitudes[2],
        },
      };
    }),
  addVictory: (text) =>
    set((state) => {
      if (!state.currentEntry) return state;
      return {
        currentEntry: {
          ...state.currentEntry,
          victorias: [...state.currentEntry.victorias, text],
        },
      };
    }),
  removeVictory: (index) =>
    set((state) => {
      if (!state.currentEntry) return state;
      return {
        currentEntry: {
          ...state.currentEntry,
          victorias: state.currentEntry.victorias.filter((_, i) => i !== index),
        },
      };
    }),
  addChallenge: (text) =>
    set((state) => {
      if (!state.currentEntry) return state;
      return {
        currentEntry: {
          ...state.currentEntry,
          retos: [...state.currentEntry.retos, text],
        },
      };
    }),
  removeChallenge: (index) =>
    set((state) => {
      if (!state.currentEntry) return state;
      return {
        currentEntry: {
          ...state.currentEntry,
          retos: state.currentEntry.retos.filter((_, i) => i !== index),
        },
      };
    }),
  setIntention: (text) =>
    set((state) => {
      if (!state.currentEntry) return state;
      return {
        currentEntry: {
          ...state.currentEntry,
          intencion: text,
        },
      };
    }),
}));

// Biometrics Store
interface BiometricsState {
  data: BiometricData[];
  connected: boolean;
  setData: (data: BiometricData[]) => void;
  setConnected: (connected: boolean) => void;
}

export const useBiometricsStore = create<BiometricsState>((set) => ({
  data: [],
  connected: false,
  setData: (data) => set({ data }),
  setConnected: (connected) => set({ connected }),
}));

// UI Store
interface UIState {
  isMenuOpen: boolean;
  unreadMessages: number;
  setIsMenuOpen: (open: boolean) => void;
  setUnreadMessages: (count: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isMenuOpen: false,
  unreadMessages: 0,
  setIsMenuOpen: (open) => set({ isMenuOpen: open }),
  setUnreadMessages: (count) => set({ unreadMessages: count }),
}));

// Sovereignty Wheel Store
interface WheelState {
  wheel: {
    physical?: number;
    financial?: number;
    social?: number;
    purpose?: number;
  } | null;
  setWheel: (wheel: any) => void;
  updatePillar: (pillar: string, value: number) => void;
}

export const useWheelStore = create<WheelState>((set) => ({
  wheel: null,
  setWheel: (wheel) => set({ wheel }),
  updatePillar: (pillar, value) =>
    set((state) => {
      if (!state.wheel) return state;
      return {
        wheel: {
          ...state.wheel,
          [pillar]: value,
        },
      };
    }),
}));

// Polaris Profile Store
interface PolarisState {
  polaris: {
    dolor?: string;
    deseo?: string;
    patron?: string;
    objecion?: string;
  } | null;
  setPolaris: (polaris: any) => void;
  profile: PolarisProfile | null;
  setProfile: (profile: PolarisProfile | null) => void;
}

export const usePolarisStore = create<PolarisState>((set) => ({
  polaris: null,
  setPolaris: (polaris) => set({ polaris }),
  profile: null,
  setProfile: (profile) => set({ profile }),
}));

// ========== BLOQUE 0 STORES ==========

// Wheel of Life Store (Rueda de la Vida)
interface WheelOfLifeState {
  wheel: WheelOfLife | null;
  setWheel: (wheel: WheelOfLife) => void;
  updateArea: (area: AreaVida, score: AreaScore) => void;
}

export const useWheelOfLifeStore = create<WheelOfLifeState>((set) => ({
  wheel: null,
  setWheel: (wheel) => set({ wheel }),
  updateArea: (area, score) =>
    set((state) => {
      if (!state.wheel) return state;
      return {
        wheel: {
          ...state.wheel,
          [area]: score,
        },
      };
    }),
}));

// Motivación Profile Store
interface MotivacionState {
  motivacion: MotivacionProfile | null;
  setMotivacion: (motivacion: MotivacionProfile) => void;
}

export const useMotivacionStore = create<MotivacionState>((set) => ({
  motivacion: null,
  setMotivacion: (motivacion) => set({ motivacion }),
}));

// Daily Check-in Store
interface CheckinState {
  checkinHoy: DailyCheckin | null;
  setCheckinHoy: (checkin: DailyCheckin) => void;
  historialCheckins: DailyCheckin[];
  addCheckin: (checkin: DailyCheckin) => void;
}

export const useCheckinStore = create<CheckinState>((set) => ({
  checkinHoy: null,
  setCheckinHoy: (checkin) => set({ checkinHoy: checkin }),
  historialCheckins: [],
  addCheckin: (checkin) =>
    set((state) => ({
      historialCheckins: [...state.historialCheckins, checkin],
    })),
}));

export { useProgramStore, getModulesForProgram, POLARIS_MODULES, GP_MODULES } from './programStore'
export type { ProgramType, ProgramModule, ModuleProgress } from './programStore'
