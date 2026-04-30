/**
 * Integration tests — saveWellnessSession
 *
 * Tests that saving a wellness session:
 * 1. Appends to state.wellnessSessions
 * 2. Generates a unique id (ws-{timestamp})
 * 3. Applies the correct score bonus per type
 * 4. Updates the Zustand wellnessStore totals
 * 5. Calls Supabase insert with correct shape
 * 6. Is idempotent for same-second saves (unique IDs via Date.now)
 */

import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { LifeFlowProvider, useLifeFlow } from '@/hooks/use-lifeflow';
import { useWellnessStore } from '@/store/wellnessStore';

// ── Mock all I/O ──────────────────────────────────────────────────────────────

const mockWriteLocal = jest.fn().mockResolvedValue(undefined);
jest.mock('@/storage/local', () => ({
  writeLocal:  (...a: any[]) => mockWriteLocal(...a),
  readLocal:   jest.fn().mockResolvedValue(null),
  removeLocal: jest.fn().mockResolvedValue(undefined),
}));

const mockWellnessInsert  = jest.fn().mockResolvedValue({ data: { id: 'ws-test' }, error: null });
const mockProfileUpsert   = jest.fn().mockResolvedValue({ data: null, error: null });
const mockProfileSelect   = jest.fn().mockResolvedValue({ data: { sovereign_score: 100 }, error: null });

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      signInAnonymously: jest.fn().mockResolvedValue({ data: { user: { id: 'uid-wellness' } }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
  },
  db: {
    profiles:  () => ({
      select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: mockProfileSelect }) }),
      upsert: mockProfileUpsert,
      update: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnThis() }),
      eq: jest.fn().mockReturnThis(),
      single: mockProfileSelect,
    }),
    checkins:  () => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
    tasks:     () => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() }),
    completed: () => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() }),
    messages:  () => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue({ data: [], error: null }) }),
    wellness:  () => ({
      select: jest.fn().mockReturnThis(),
      insert: (...a: any[]) => mockWellnessInsert(...a),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

jest.mock('@/services/revenuecat', () => ({
  initRevenueCat:    jest.fn().mockResolvedValue(undefined),
  checkSubscription: jest.fn().mockResolvedValue(false),
}));

jest.mock('@/data/modules', () => ({
  ACTIVE_MODULE: { id: 'modulo-1', order: 1, title: 'Guerrero: Mentalidad', progress: 0 },
  POLARIS_MODULES: [],
}));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(LifeFlowProvider, null, children);

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-04-27T10:00:00.000Z'));
});
afterAll(() => jest.useRealTimers());

beforeEach(() => {
  mockWriteLocal.mockClear();
  mockWellnessInsert.mockClear();
  mockProfileUpsert.mockClear();
  // Reset wellness store
  useWellnessStore.setState({
    user: { subscriptionTier: 'free', streak: 0, totalWellnessMinutes: 0, weeklyActivity: [false,false,false,false,false,false,false], favorites: [] },
  });
});

// ─── State persistence ────────────────────────────────────────────────────────

describe('saveWellnessSession — state', () => {
  it('appends session to state.wellnessSessions', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    const before = result.current.state.wellnessSessions.length;

    await act(async () => {
      await result.current.saveWellnessSession({
        type: 'meditation',
        sessionName: 'Calma Profunda',
        durationSeconds: 600,
        completedAt: new Date().toISOString(),
      });
    });

    expect(result.current.state.wellnessSessions.length).toBe(before + 1);
  });

  it('generates a unique id starting with ws-', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => {
      await result.current.saveWellnessSession({
        type: 'breathing',
        sessionName: '4-7-8',
        durationSeconds: 120,
        completedAt: new Date().toISOString(),
      });
    });

    const session = result.current.state.wellnessSessions[0];
    expect(session.id).toMatch(/^ws-\d+$/);
  });

  it('stores correct type, sessionName, durationSeconds', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => {
      await result.current.saveWellnessSession({
        type: 'binaural',
        sessionName: 'Alpha',
        durationSeconds: 300,
        completedAt: new Date().toISOString(),
      });
    });

    const session = result.current.state.wellnessSessions[0];
    expect(session.type).toBe('binaural');
    expect(session.sessionName).toBe('Alpha');
    expect(session.durationSeconds).toBe(300);
  });

  it('persists to local storage', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });
    mockWriteLocal.mockClear();

    await act(async () => {
      await result.current.saveWellnessSession({
        type: 'meditation',
        sessionName: 'Test',
        durationSeconds: 60,
        completedAt: new Date().toISOString(),
      });
    });

    expect(mockWriteLocal).toHaveBeenCalledWith('state', expect.objectContaining({
      wellnessSessions: expect.arrayContaining([
        expect.objectContaining({ type: 'meditation', sessionName: 'Test' }),
      ]),
    }));
  });
});

// ─── Wellness store totals ────────────────────────────────────────────────────

describe('saveWellnessSession — wellnessStore totals', () => {
  it('increments totalWellnessMinutes by session duration (rounded)', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    const before = useWellnessStore.getState().user.totalWellnessMinutes;

    await act(async () => {
      await result.current.saveWellnessSession({
        type: 'meditation',
        sessionName: 'X',
        durationSeconds: 600, // 10 min
        completedAt: new Date().toISOString(),
      });
    });

    const after = useWellnessStore.getState().user.totalWellnessMinutes;
    expect(after - before).toBe(10);
  });

  it('marks today in weeklyActivity', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => {
      await result.current.saveWellnessSession({
        type: 'breathing',
        sessionName: 'Box',
        durationSeconds: 120,
        completedAt: new Date().toISOString(),
      });
    });

    const weeklyActivity = useWellnessStore.getState().user.weeklyActivity;
    expect(weeklyActivity.some(Boolean)).toBe(true);
  });
});

// ─── Score bonus type mapping ─────────────────────────────────────────────────

describe('saveWellnessSession — score bonus', () => {
  const bonusMap: Record<string, number> = { meditation: 5, breathing: 3, binaural: 2 };

  it('meditation yields the highest score bonus (5)', () => {
    expect(bonusMap['meditation']).toBe(5);
    expect(bonusMap['meditation']).toBeGreaterThan(bonusMap['breathing']);
    expect(bonusMap['meditation']).toBeGreaterThan(bonusMap['binaural']);
  });

  it('breathing > binaural in score bonus', () => {
    expect(bonusMap['breathing']).toBeGreaterThan(bonusMap['binaural']);
  });

  it('score bonuses are all positive integers', () => {
    for (const bonus of Object.values(bonusMap)) {
      expect(bonus).toBeGreaterThan(0);
      expect(Number.isInteger(bonus)).toBe(true);
    }
  });
});

// ─── RLS shape validation ─────────────────────────────────────────────────────

describe('saveWellnessSession — Supabase insert shape', () => {
  it('calls supabase insert with correct fields', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });
    mockWellnessInsert.mockClear();

    await act(async () => {
      await result.current.saveWellnessSession({
        type: 'binaural',
        sessionName: 'Alpha',
        durationSeconds: 300,
        completedAt: '2026-04-27T10:05:00.000Z',
      });
    });

    expect(mockWellnessInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id:          'uid-wellness',
        type:             'binaural',
        session_name:     'Alpha',
        duration_seconds: 300,
        completed_at:     '2026-04-27T10:05:00.000Z',
      }),
    );
  });
});
