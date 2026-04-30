/**
 * Global wellness player store (Zustand v5).
 * Holds mini-player state that persists across tab navigation.
 */
import { create } from 'zustand';
import type { AmbienceType } from '@/data/wellness';

export type SessionType = 'binaural' | 'meditation' | 'breathing' | null;
export type SubscriptionTier = 'free' | 'premium' | 'premium_plus';

// ─── Weekly activity: index 0 = Monday, 6 = Sunday ────────────────────────────
export type WeeklyActivity = [boolean, boolean, boolean, boolean, boolean, boolean, boolean];

export interface WellnessPlayer {
  isPlaying: boolean;
  type: SessionType;
  sessionName: string;
  leftHz: number;
  rightHz: number;
  bgTrack: AmbienceType;
  waveVolume: number;
  bgVolume: number;
  elapsedSeconds: number;
  targetSeconds: number;   // 0 = infinite
  minimized: boolean;
}

export interface WellnessUser {
  subscriptionTier: SubscriptionTier;
  streak: number;
  totalWellnessMinutes: number;
  weeklyActivity: WeeklyActivity;
}

interface WellnessStore {
  player: WellnessPlayer;
  user: WellnessUser;

  startSession: (config: {
    type: Exclude<SessionType, null>;
    sessionName: string;
    leftHz?: number;
    rightHz?: number;
    bgTrack?: AmbienceType;
    waveVolume?: number;
    bgVolume?: number;
    targetSeconds?: number;
  }) => void;

  stopSession: () => void;
  minimizePlayer: () => void;
  expandPlayer: () => void;
  setVolumes: (wave: number, bg: number) => void;
  setElapsed: (seconds: number) => void;
  setUserData: (data: Partial<WellnessUser>) => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────
const defaultPlayer: WellnessPlayer = {
  isPlaying:      false,
  type:           null,
  sessionName:    '',
  leftHz:         200,
  rightHz:        210,
  bgTrack:        'none',
  waveVolume:     0.6,
  bgVolume:       0.4,
  elapsedSeconds: 0,
  targetSeconds:  600,
  minimized:      false,
};

const defaultUser: WellnessUser = {
  subscriptionTier:    'free',
  streak:              0,
  totalWellnessMinutes: 0,
  weeklyActivity:      [false, false, false, false, false, false, false],
};

// ─── Store ────────────────────────────────────────────────────────────────────
export const useWellnessStore = create<WellnessStore>((set) => ({
  player: { ...defaultPlayer },
  user:   { ...defaultUser   },

  startSession: (config) =>
    set(() => ({
      player: {
        ...defaultPlayer,
        ...config,
        isPlaying:      true,
        elapsedSeconds: 0,
        leftHz:         config.leftHz  ?? 200,
        rightHz:        config.rightHz ?? 210,
        bgTrack:        config.bgTrack ?? 'none',
        waveVolume:     config.waveVolume ?? 0.6,
        bgVolume:       config.bgVolume   ?? 0.4,
        targetSeconds:  config.targetSeconds ?? 600,
        minimized:      false,
      },
    })),

  stopSession: () =>
    set(() => ({ player: { ...defaultPlayer } })),

  minimizePlayer: () =>
    set((s) => ({ player: { ...s.player, minimized: true } })),

  expandPlayer: () =>
    set((s) => ({ player: { ...s.player, minimized: false } })),

  setVolumes: (wave, bg) =>
    set((s) => ({ player: { ...s.player, waveVolume: wave, bgVolume: bg } })),

  setElapsed: (seconds) =>
    set((s) => ({ player: { ...s.player, elapsedSeconds: seconds } })),

  setUserData: (data) =>
    set((s) => ({ user: { ...s.user, ...data } })),
}));
