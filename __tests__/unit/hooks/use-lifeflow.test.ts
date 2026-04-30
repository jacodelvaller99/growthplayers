/**
 * Unit tests — hooks/use-lifeflow.tsx
 *
 * Tests: saveLessonTask, markLessonComplete, updateNorthStar, updateProfile.
 * All I/O boundaries (Supabase, local storage) are mocked.
 */

import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { LifeFlowProvider, useLifeFlow } from '@/hooks/use-lifeflow';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockWriteLocal = jest.fn().mockResolvedValue(undefined);
const mockReadLocal  = jest.fn().mockResolvedValue(null);
jest.mock('@/storage/local', () => ({
  writeLocal:  (...args: any[]) => mockWriteLocal(...args),
  readLocal:   (...args: any[]) => mockReadLocal(...args),
  removeLocal: jest.fn().mockResolvedValue(undefined),
}));

const mockUpsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockDelete = jest.fn().mockReturnThis();
const mockUpdate = jest.fn().mockReturnThis();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      signInAnonymously: jest.fn().mockResolvedValue({ data: { user: { id: 'test-uid' } }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: jest.fn().mockImplementation((table: string) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockImplementation((...args: any[]) => mockInsert(table, ...args)),
      upsert: jest.fn().mockImplementation((...args: any[]) => mockUpsert(table, ...args)),
      update: jest.fn().mockImplementation(() => ({ eq: jest.fn().mockResolvedValue({ data: null, error: null }) })),
      delete: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnThis() }),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
      returns: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
  db: {
    profiles:  () => ({ select: jest.fn().mockReturnThis(), upsert: mockUpsert, update: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnThis() }), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }) }),
    checkins:  () => ({ select: jest.fn().mockReturnThis(), upsert: mockUpsert, insert: mockInsert, eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue({ data: [], error: null }) }),
    tasks:     () => ({ select: jest.fn().mockReturnThis(), upsert: mockUpsert, insert: mockInsert, eq: jest.fn().mockReturnThis(), delete: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnThis() }) }),
    completed: () => ({ select: jest.fn().mockReturnThis(), upsert: mockUpsert, insert: mockInsert, eq: jest.fn().mockReturnThis(), delete: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnThis() }) }),
    messages:  () => ({ select: jest.fn().mockReturnThis(), insert: mockInsert, eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue({ data: [], error: null }) }),
    wellness:  () => ({ select: jest.fn().mockReturnThis(), insert: mockInsert, eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue({ data: [], error: null }) }),
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
beforeEach(() => mockWriteLocal.mockClear());

// ─── saveLessonTask ───────────────────────────────────────────────────────────

describe('saveLessonTask', () => {
  it('adds task to state.completedTasks keyed by lessonId', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => {
      await result.current.saveLessonTask('m1-1', { fear: 'Miedo al fracaso', roles: 'Empresario', commitment: '3 veces' });
    });

    expect(result.current.state.completedTasks['m1-1']).toBeDefined();
    expect(result.current.state.completedTasks['m1-1'].responses?.fear).toBe('Miedo al fracaso');
  });

  it('sets completedAt timestamp on the task', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => {
      await result.current.saveLessonTask('m1-1', { fear: 'X', roles: 'Y', commitment: 'Z' });
    });

    expect(result.current.state.completedTasks['m1-1'].completedAt).toBeDefined();
    expect(typeof result.current.state.completedTasks['m1-1'].completedAt).toBe('string');
  });

  it('persists to local storage', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });
    mockWriteLocal.mockClear();

    await act(async () => {
      await result.current.saveLessonTask('m1-1', { fear: 'X', roles: 'Y', commitment: 'Z' });
    });

    expect(mockWriteLocal).toHaveBeenCalledWith('state', expect.objectContaining({
      completedTasks: expect.objectContaining({
        'm1-1': expect.objectContaining({ lessonId: 'm1-1' }),
      }),
    }));
  });

  it('overwrites previous task responses (upsert behaviour)', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => {
      await result.current.saveLessonTask('m1-1', { fear: 'Old answer', roles: 'Y', commitment: 'Z' });
    });
    await act(async () => {
      await result.current.saveLessonTask('m1-1', { fear: 'New answer', roles: 'Y', commitment: 'Z' });
    });

    expect(result.current.state.completedTasks['m1-1'].responses?.fear).toBe('New answer');
  });

  it('does nothing for unknown lessonId (no template)', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });
    mockWriteLocal.mockClear();

    await act(async () => {
      await result.current.saveLessonTask('nonexistent-lesson-xyz', { answer: 'test' });
    });

    // writeLocal should NOT be called for an unknown lesson (no template)
    expect(mockWriteLocal).not.toHaveBeenCalled();
    expect(result.current.state.completedTasks['nonexistent-lesson-xyz']).toBeUndefined();
  });
});

// ─── markLessonComplete ───────────────────────────────────────────────────────

describe('markLessonComplete', () => {
  it('adds lessonId to state.completedLessons', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => { await result.current.markLessonComplete('ob-1'); });

    expect(result.current.state.completedLessons).toContain('ob-1');
  });

  it('is idempotent: completing same lesson twice does not duplicate', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => { await result.current.markLessonComplete('ob-1'); });
    await act(async () => { await result.current.markLessonComplete('ob-1'); });

    const count = result.current.state.completedLessons.filter((id) => id === 'ob-1').length;
    expect(count).toBe(1);
  });

  it('persists completedLessons to local storage', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });
    mockWriteLocal.mockClear();

    await act(async () => { await result.current.markLessonComplete('ob-2'); });

    expect(mockWriteLocal).toHaveBeenCalledWith('state', expect.objectContaining({
      completedLessons: expect.arrayContaining(['ob-2']),
    }));
  });
});

// ─── updateNorthStar ──────────────────────────────────────────────────────────

describe('updateNorthStar', () => {
  it('updates the northStar in state', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    const newNorth = {
      purpose:         'Nuevo propósito',
      identity:        'Nueva identidad',
      nonNegotiables:  ['Entrenar', 'Meditar'],
      dailyReminder:   'Nuevo recordatorio',
    };

    await act(async () => { await result.current.updateNorthStar(newNorth); });

    expect(result.current.state.northStar.purpose).toBe('Nuevo propósito');
    expect(result.current.state.northStar.nonNegotiables).toHaveLength(2);
  });
});

// ─── computed values ──────────────────────────────────────────────────────────

describe('computed: todayCheckIn', () => {
  it('returns null when no check-ins exist', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    expect(result.current.todayCheckIn).toBeNull();
  });
});

describe('computed: averages', () => {
  it('returns zeros when no check-ins exist', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    expect(result.current.averages.energy).toBe(0);
    expect(result.current.averages.clarity).toBe(0);
  });
});
