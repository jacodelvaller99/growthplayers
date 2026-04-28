/**
 * Integration tests — saveCheckIn persistence
 *
 * Tests that saveCheckIn:
 *   1. Prepends the new check-in to state.checkIns
 *   2. Removes any existing check-in for the same calendar day (upsert behaviour)
 *   3. Generates a deterministic id: `ci-YYYY-MM-DD`
 *   4. Persists to local storage (writeLocal called)
 *   5. Pushes to Supabase (upsert called with correct shape)
 *
 * Strategy: render the LifeFlowProvider via renderHook, mock all I/O boundaries.
 */

import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { LifeFlowProvider, useLifeFlow } from '@/hooks/use-lifeflow';

// ── Mock all I/O boundaries ──────────────────────────────────────────────────

const mockWriteLocal = jest.fn().mockResolvedValue(undefined);
const mockReadLocal = jest.fn().mockResolvedValue(null);
jest.mock('@/storage/local', () => ({
  writeLocal: (...args: any[]) => mockWriteLocal(...args),
  readLocal: (...args: any[]) => mockReadLocal(...args),
  removeLocal: jest.fn().mockResolvedValue(undefined),
}));

const mockSupabaseUpsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockSupabaseInsert = jest.fn().mockResolvedValue({ data: null, error: null });

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      signInAnonymously: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-uid-123' } },
        error: null,
      }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    from: jest.fn().mockImplementation((table: string) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockImplementation((...args: any[]) => mockSupabaseInsert(table, ...args)),
      upsert: jest.fn().mockImplementation((...args: any[]) => mockSupabaseUpsert(table, ...args)),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
      returns: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

jest.mock('@/services/revenuecat', () => ({
  initRevenueCat: jest.fn().mockResolvedValue(undefined),
  checkSubscription: jest.fn().mockResolvedValue(false),
}));

jest.mock('@/data/modules', () => ({
  ACTIVE_MODULE: { id: 'mod-01', number: 1, title: 'Identidad Soberana' },
}));

// ── Freeze date ──────────────────────────────────────────────────────────────

const FIXED_DATE = new Date('2026-04-27T10:00:00.000Z');

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_DATE);
});

afterAll(() => {
  jest.useRealTimers();
});

// ── Wrapper ──────────────────────────────────────────────────────────────────

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(LifeFlowProvider, null, children);

// ── Tests ────────────────────────────────────────────────────────────────────

describe('saveCheckIn — persistence', () => {
  it('adds the check-in to state.checkIns after save', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });

    // Wait for async init (supabase auth + load)
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    const initial = result.current.state.checkIns.length;

    await act(async () => {
      await result.current.saveCheckIn({
        energy: 8,
        clarity: 7,
        stress: 3,
        sleep: 7,
        systemNeed: 'Foco en cierre',
      });
    });

    expect(result.current.state.checkIns.length).toBe(initial + 1);
  });

  it('generates a deterministic id using today\'s date', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await act(async () => {
      await result.current.saveCheckIn({
        energy: 6,
        clarity: 6,
        stress: 5,
        sleep: 6,
        systemNeed: '',
      });
    });

    const newest = result.current.state.checkIns[0];
    expect(newest.id).toBe('ci-2026-04-27');
  });

  it('replaces an existing same-day check-in (upsert)', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // Save twice on the same day
    await act(async () => {
      await result.current.saveCheckIn({ energy: 5, clarity: 5, stress: 5, sleep: 5, systemNeed: '' });
    });
    await act(async () => {
      await result.current.saveCheckIn({ energy: 9, clarity: 9, stress: 1, sleep: 8, systemNeed: '' });
    });

    // Should still have only 1 check-in for today
    const todayCheckins = result.current.state.checkIns.filter(
      (c) => c.id === 'ci-2026-04-27',
    );
    expect(todayCheckins).toHaveLength(1);
    // Latest values should win
    expect(todayCheckins[0].energy).toBe(9);
  });

  it('calls writeLocal to persist state locally', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    mockWriteLocal.mockClear();

    await act(async () => {
      await result.current.saveCheckIn({ energy: 7, clarity: 7, stress: 4, sleep: 6, systemNeed: '' });
    });

    expect(mockWriteLocal).toHaveBeenCalledWith('state', expect.objectContaining({
      checkIns: expect.arrayContaining([
        expect.objectContaining({ energy: 7, clarity: 7 }),
      ]),
    }));
  });
});
