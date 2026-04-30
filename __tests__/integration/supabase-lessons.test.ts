/**
 * Integration tests — lesson completion + task persistence
 *
 * Tests that:
 * 1. markLessonComplete → persists and is idempotent
 * 2. saveLessonTask → persists with full shape
 * 3. Next lesson logic based on completedLessons
 * 4. Cross-user isolation: user A's progress ≠ user B's
 */

import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { LifeFlowProvider, useLifeFlow } from '@/hooks/use-lifeflow';

// ── Mock all I/O ──────────────────────────────────────────────────────────────

const mockWriteLocal = jest.fn().mockResolvedValue(undefined);
jest.mock('@/storage/local', () => ({
  writeLocal:  (...a: any[]) => mockWriteLocal(...a),
  readLocal:   jest.fn().mockResolvedValue(null),
  removeLocal: jest.fn().mockResolvedValue(undefined),
}));

const mockTasksUpsert     = jest.fn().mockResolvedValue({ data: null, error: null });
const mockCompletedUpsert = jest.fn().mockResolvedValue({ data: null, error: null });

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      signInAnonymously: jest.fn().mockResolvedValue({ data: { user: { id: 'uid-lessons' } }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
  },
  db: {
    profiles:  () => ({ select: jest.fn().mockReturnThis(), upsert: jest.fn().mockResolvedValue({ data: null, error: null }), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }) }),
    checkins:  () => ({ select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue({ data: [], error: null }) }),
    tasks:     () => ({ select: jest.fn().mockReturnThis(), upsert: (...a: any[]) => mockTasksUpsert(...a), eq: jest.fn().mockReturnThis(), delete: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnThis() }) }),
    completed: () => ({ select: jest.fn().mockReturnThis(), upsert: (...a: any[]) => mockCompletedUpsert(...a), eq: jest.fn().mockReturnThis(), delete: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnThis() }) }),
    messages:  () => ({ select: jest.fn().mockReturnThis(), insert: jest.fn(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue({ data: [], error: null }) }),
    wellness:  () => ({ select: jest.fn().mockReturnThis(), insert: jest.fn(), eq: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue({ data: [], error: null }) }),
  },
}));

jest.mock('@/services/revenuecat', () => ({
  initRevenueCat:    jest.fn().mockResolvedValue(undefined),
  checkSubscription: jest.fn().mockResolvedValue(false),
}));

jest.mock('@/data/modules', () => ({
  ACTIVE_MODULE: { id: 'modulo-1', order: 1, title: 'Guerrero: Mentalidad', progress: 0 },
  POLARIS_MODULES: [{
    id: 'modulo-1', order: 1, title: 'Guerrero: Mentalidad', status: 'active', progress: 0,
    lessons: [
      { id: 'm1-1', order: 1, title: 'Nunca es Suficiente', status: 'active' },
      { id: 'm1-2', order: 2, title: 'Resultados', status: 'locked' },
    ],
  }],
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
  mockTasksUpsert.mockClear();
  mockCompletedUpsert.mockClear();
});

// ─── markLessonComplete ───────────────────────────────────────────────────────

describe('markLessonComplete — persistence', () => {
  it('adds lessonId to completedLessons', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => { await result.current.markLessonComplete('m1-1'); });

    expect(result.current.state.completedLessons).toContain('m1-1');
  });

  it('upserts to Supabase completed table with correct shape', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => { await result.current.markLessonComplete('m1-1'); });

    expect(mockCompletedUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id:   'uid-lessons',
        lesson_id: 'm1-1',
        module_id: 'm1',
      }),
      expect.objectContaining({ onConflict: 'user_id,lesson_id' }),
    );
  });

  it('is idempotent: completing same lesson twice has 1 entry in array', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => { await result.current.markLessonComplete('m1-1'); });
    await act(async () => { await result.current.markLessonComplete('m1-1'); });

    const count = result.current.state.completedLessons.filter((id) => id === 'm1-1').length;
    expect(count).toBe(1);
  });

  it('does not call writeLocal on second (no-op) completion', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => { await result.current.markLessonComplete('m1-2'); });
    mockWriteLocal.mockClear();

    // Second call — should be no-op (already completed)
    await act(async () => { await result.current.markLessonComplete('m1-2'); });
    expect(mockWriteLocal).not.toHaveBeenCalled();
  });
});

// ─── saveLessonTask ───────────────────────────────────────────────────────────

describe('saveLessonTask — persistence', () => {
  it('stores task with lessonId as key in completedTasks', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => {
      await result.current.saveLessonTask('m1-1', {
        fear: 'Miedo al fracaso',
        roles: 'Empresario',
        commitment: '3 veces',
      });
    });

    expect(result.current.state.completedTasks['m1-1']).toBeDefined();
  });

  it('upserts to Supabase tasks table with correct columns', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => {
      await result.current.saveLessonTask('m1-1', { fear: 'Test', roles: 'Empresario', commitment: '3' });
    });

    expect(mockTasksUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id:   'uid-lessons',
        lesson_id: 'm1-1',
        module_id: 'm1',
        responses: expect.objectContaining({ fear: 'Test' }),
      }),
      expect.objectContaining({ onConflict: 'user_id,lesson_id' }),
    );
  });

  it('overwrites previous responses on second save (upsert)', async () => {
    const { result } = renderHook(() => useLifeFlow(), { wrapper });
    await act(async () => { await jest.runAllTimersAsync(); });

    await act(async () => {
      await result.current.saveLessonTask('m1-1', { fear: 'First', roles: 'A', commitment: 'B' });
    });
    await act(async () => {
      await result.current.saveLessonTask('m1-1', { fear: 'Updated', roles: 'A', commitment: 'B' });
    });

    expect(result.current.state.completedTasks['m1-1'].responses?.fear).toBe('Updated');
  });
});

// ─── Next lesson unlock logic ─────────────────────────────────────────────────

describe('Next lesson derivation', () => {
  it('first lesson is always active (no prerequisite)', () => {
    const completedLessons: string[] = [];
    const lessons = [
      { id: 'm1-1', order: 1 },
      { id: 'm1-2', order: 2 },
    ];

    function deriveLessonStatus(
      lessonId: string,
      lessonIndex: number,
      allLessons: { id: string }[],
      completed: string[],
    ): 'completed' | 'active' | 'locked' {
      if (completed.includes(lessonId)) return 'completed';
      if (lessonIndex === 0) return 'active';
      const prevId = allLessons[lessonIndex - 1].id;
      if (completed.includes(prevId)) return 'active';
      return 'locked';
    }

    expect(deriveLessonStatus('m1-1', 0, lessons, completedLessons)).toBe('active');
    expect(deriveLessonStatus('m1-2', 1, lessons, completedLessons)).toBe('locked');
  });

  it('completing lesson N unlocks lesson N+1', () => {
    const completedLessons = ['m1-1'];
    const lessons = [
      { id: 'm1-1', order: 1 },
      { id: 'm1-2', order: 2 },
      { id: 'm1-3', order: 3 },
    ];

    function deriveLessonStatus(
      lessonId: string,
      lessonIndex: number,
      allLessons: { id: string }[],
      completed: string[],
    ): 'completed' | 'active' | 'locked' {
      if (completed.includes(lessonId)) return 'completed';
      if (lessonIndex === 0) return 'active';
      const prevId = allLessons[lessonIndex - 1].id;
      if (completed.includes(prevId)) return 'active';
      return 'locked';
    }

    expect(deriveLessonStatus('m1-1', 0, lessons, completedLessons)).toBe('completed');
    expect(deriveLessonStatus('m1-2', 1, lessons, completedLessons)).toBe('active');
    expect(deriveLessonStatus('m1-3', 2, lessons, completedLessons)).toBe('locked');
  });
});

// ─── Cross-user isolation ─────────────────────────────────────────────────────

describe('Cross-user isolation', () => {
  it('each renderHook gets its own provider tree — state is not shared across instances', async () => {
    // Each renderHook({ wrapper }) creates a SEPARATE LifeFlowProvider instance.
    // This is the correct React Context behaviour: two provider trees = two isolated stores.
    // Real cross-user RLS isolation is enforced by Supabase (tested via k6/E2E).
    const { result: r1 } = renderHook(() => useLifeFlow(), { wrapper });
    const { result: r2 } = renderHook(() => useLifeFlow(), { wrapper });

    await act(async () => { await jest.runAllTimersAsync(); });

    // Complete a lesson in hook 1's provider tree
    await act(async () => { await r1.current.markLessonComplete('m1-1'); });

    // r1 sees its own completion
    expect(r1.current.state.completedLessons).toContain('m1-1');

    // r2 has an ISOLATED provider tree — it does NOT see r1's completion
    // This is correct: no state bleed between separate users / sessions
    expect(r2.current.state.completedLessons).not.toContain('m1-1');
  });
});
