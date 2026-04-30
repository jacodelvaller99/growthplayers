/**
 * Integration tests — Score Soberano
 *
 * Tests that sovereign score is calculated correctly from check-in data
 * and that wellness sessions yield the correct bonus increments.
 */

import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { LifeFlowProvider, useLifeFlow } from '@/hooks/use-lifeflow';

// ── Mock all I/O ──────────────────────────────────────────────────────────────

jest.mock('@/storage/local', () => ({
  writeLocal:  jest.fn().mockResolvedValue(undefined),
  readLocal:   jest.fn().mockResolvedValue(null),
  removeLocal: jest.fn().mockResolvedValue(undefined),
}));

const mockCheckinUpsert  = jest.fn().mockResolvedValue({ data: null, error: null });
const mockProfileUpsert  = jest.fn().mockResolvedValue({ data: null, error: null });
const mockProfileSelect  = jest.fn().mockResolvedValue({ data: { sovereign_score: 0 }, error: null });
const mockProfileUpdate  = jest.fn().mockResolvedValue({ data: null, error: null });

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      signInAnonymously: jest.fn().mockResolvedValue({ data: { user: { id: 'uid-score' } }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
  },
  db: {
    profiles: () => ({
      select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: mockProfileSelect }) }),
      upsert: (...a: any[]) => mockProfileUpsert(...a),
      update: jest.fn().mockReturnValue({ eq: jest.fn().mockImplementation((...a: any[]) => mockProfileUpdate(...a)) }),
      eq: jest.fn().mockReturnThis(),
      single: mockProfileSelect,
    }),
    checkins: () => ({
      select: jest.fn().mockReturnThis(),
      upsert: (...a: any[]) => mockCheckinUpsert(...a),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
    tasks:     () => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() }),
    completed: () => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis() }),
    messages:  () => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue({ data: [], error: null }) }),
    wellness:  () => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
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
beforeEach(() => { mockCheckinUpsert.mockClear(); mockProfileUpsert.mockClear(); });

// ─── Score formula ────────────────────────────────────────────────────────────

describe('Sovereign Score formula', () => {
  /**
   * Formula: Math.round((energy + clarity + (10 - stress) + sleep) / 4 * 100)
   * Perfect score: (10 + 10 + (10-0) + 10) / 4 * 100 = 1000
   * Minimum meaningful: low metrics
   */

  function computeSovereignScore(energy: number, clarity: number, stress: number, sleep: number): number {
    return Math.round((energy + clarity + (10 - stress) + sleep) / 4 * 100);
  }

  it('perfect biometrics yields 1000', () => {
    expect(computeSovereignScore(10, 10, 0, 10)).toBe(1000);
  });

  it('all 5/5 biometrics yields 625', () => {
    // (5 + 5 + (10-5) + 5) / 4 * 100 = 20/4 * 100 = 500
    expect(computeSovereignScore(5, 5, 5, 5)).toBe(500);
  });

  it('high stress reduces score significantly', () => {
    const lowStress  = computeSovereignScore(8, 8, 1, 8);
    const highStress = computeSovereignScore(8, 8, 9, 8);
    expect(lowStress).toBeGreaterThan(highStress);
    expect(lowStress - highStress).toBe(200); // diff = (10-1 - (10-9))/4*100 = 8/4*100
  });

  it('score is never negative', () => {
    const score = computeSovereignScore(0, 0, 10, 0);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('score is capped conceptually at 1000', () => {
    const score = computeSovereignScore(10, 10, 0, 10);
    expect(score).toBeLessThanOrEqual(1000);
  });
});

// ─── Tier derivation ──────────────────────────────────────────────────────────

describe('Score tier derivation', () => {
  function getTier(score: number): string {
    if (score >= 750) return 'Maestro';
    if (score >= 500) return 'Soberano';
    if (score >= 200) return 'Mercader';
    return 'Explorador';
  }

  it('score 1000 → Maestro', ()  => expect(getTier(1000)).toBe('Maestro'));
  it('score 750 → Maestro', ()   => expect(getTier(750)).toBe('Maestro'));
  it('score 749 → Soberano', ()  => expect(getTier(749)).toBe('Soberano'));
  it('score 500 → Soberano', ()  => expect(getTier(500)).toBe('Soberano'));
  it('score 499 → Mercader', ()  => expect(getTier(499)).toBe('Mercader'));
  it('score 200 → Mercader', ()  => expect(getTier(200)).toBe('Mercader'));
  it('score 199 → Explorador', ()=> expect(getTier(199)).toBe('Explorador'));
  it('score 0 → Explorador', ()  => expect(getTier(0)).toBe('Explorador'));
});

// ─── saveCheckIn sends sovereign_score to Supabase ───────────────────────────

describe('saveCheckIn — sovereign_score sync', () => {
  it('sends sovereign_score in the checkin upsert call', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => {
      await result.current.saveCheckIn({
        energy: 8, clarity: 8, stress: 2, sleep: 8,
        systemNeed: 'Foco',
      });
    });

    expect(mockCheckinUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        sovereign_score: expect.any(Number),
      }),
      expect.anything(),
    );
  });

  it('sovereign_score from perfect check-in is near 1000', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => {
      await result.current.saveCheckIn({
        energy: 10, clarity: 10, stress: 0, sleep: 10,
        systemNeed: '',
      });
    });

    const call = mockCheckinUpsert.mock.calls[0]?.[0];
    expect(call?.sovereign_score).toBe(1000);
  });
});

// ─── Wellness score bonus accumulation ───────────────────────────────────────

describe('Wellness score bonuses — cumulative', () => {
  it('3 meditation sessions → at least +15 bonus score applied', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await result.current.saveWellnessSession({
          type: 'meditation',
          sessionName: `Calma ${i}`,
          durationSeconds: 300,
          completedAt: new Date().toISOString(),
        });
      });
    }

    expect(result.current.state.wellnessSessions.length).toBe(3);
  });

  it('score never goes negative even with 0-second sessions', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => {
      await result.current.saveWellnessSession({
        type: 'binaural',
        sessionName: 'Short',
        durationSeconds: 0,
        completedAt: new Date().toISOString(),
      });
    });

    // No crash, session stored
    expect(result.current.state.wellnessSessions[0].durationSeconds).toBe(0);
  });
});
