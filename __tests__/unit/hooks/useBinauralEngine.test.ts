/**
 * Unit tests — hooks/useBinauralEngine.ts
 *
 * Tests the Zustand-backed binaural engine hook.
 * Audio layer (createBinauralAudio) is mocked — we test state transitions,
 * timer behaviour, and volume routing.
 */

import { renderHook, act } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useBinauralEngine, stopBinauralGlobal } from '@/hooks/useBinauralEngine';
import { useWellnessStore } from '@/store/wellnessStore';
import { createBinauralAudio } from '@/lib/binaural';

// ─── Mock lib/binaural ────────────────────────────────────────────────────────
// IMPORTANT: Do NOT reference outer-scope variables in the factory — they are
// undefined at factory-evaluation time due to jest.mock() hoisting.
// Instead, configure the return value in beforeEach after all declarations run.

jest.mock('@/lib/binaural', () => ({
  createBinauralAudio: jest.fn(),
  createMeditationAudio: jest.fn().mockReturnValue(null),
}));

// ─── Mock handle — configured in beforeEach ───────────────────────────────────
const mockHandle = {
  start:              jest.fn(),
  stop:               jest.fn(),
  suspend:            jest.fn().mockResolvedValue(undefined),
  resume:             jest.fn().mockResolvedValue(undefined),
  setVolume:          jest.fn(),
  setAmbienceVolume:  jest.fn(),
  setAmbience:        jest.fn(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetStore() {
  useWellnessStore.setState({
    player: {
      isPlaying: false, isPaused: false, type: null, sessionName: '',
      leftHz: 200, rightHz: 210, bgTrack: 'none', waveVolume: 0.6, bgVolume: 0.4,
      elapsedSeconds: 0, targetSeconds: 600, minimized: false,
    },
  });
}

const defaultCfg = {
  carrierHz: 200,
  beatHz: 10,
  sessionName: 'Alpha',
  targetSeconds: 0,
  waveVolume: 0.6,
  bgVolume: 0.4,
};

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  // Force Platform.OS = 'web' so the hook's web-audio branch is taken
  Object.defineProperty(Platform, 'OS', { value: 'web', writable: true, configurable: true });

  // Configure createBinauralAudio to return our mock handle.
  // This MUST be in beforeEach (not in the factory) so it runs after module
  // declarations and after jest.clearAllMocks() has cleared previous counts.
  (createBinauralAudio as jest.Mock).mockReturnValue(mockHandle);

  jest.useFakeTimers();
  resetStore();

  // Clear call counts on all mock handle methods (keep implementations)
  Object.values(mockHandle).forEach((fn) => {
    if (jest.isMockFunction(fn)) fn.mockClear();
  });
});

afterEach(() => {
  stopBinauralGlobal();
  jest.useRealTimers();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useBinauralEngine — start()', () => {
  it('sets isPlaying=true in the store after start()', () => {
    const { result } = renderHook(() => useBinauralEngine());

    act(() => { result.current.start(defaultCfg); });

    expect(result.current.player.isPlaying).toBe(true);
  });

  it('sets sessionName in the store', () => {
    const { result } = renderHook(() => useBinauralEngine());

    act(() => { result.current.start({ ...defaultCfg, sessionName: 'Delta Deep' }); });

    expect(result.current.player.sessionName).toBe('Delta Deep');
  });

  it('sets leftHz = carrierHz', () => {
    const { result } = renderHook(() => useBinauralEngine());

    act(() => { result.current.start({ ...defaultCfg, carrierHz: 300 }); });

    expect(result.current.player.leftHz).toBe(300);
  });

  it('sets rightHz = carrierHz + beatHz', () => {
    const { result } = renderHook(() => useBinauralEngine());

    act(() => { result.current.start({ ...defaultCfg, carrierHz: 300, beatHz: 15 }); });

    expect(result.current.player.rightHz).toBe(315);
  });

  it('calling start() twice stops the previous session first (no duplicate audio contexts)', () => {
    const { result } = renderHook(() => useBinauralEngine());

    act(() => { result.current.start(defaultCfg); });
    act(() => { result.current.start({ ...defaultCfg, sessionName: 'Beta' }); });

    // stop() on the binaural handle should have been called once (for the first session)
    expect(mockHandle.stop).toHaveBeenCalledTimes(1);
  });
});

describe('useBinauralEngine — stop()', () => {
  it('sets isPlaying=false after stop()', () => {
    const { result } = renderHook(() => useBinauralEngine());

    act(() => { result.current.start(defaultCfg); });
    act(() => { result.current.stop(); });

    expect(result.current.player.isPlaying).toBe(false);
  });

  it('stop() calls handle.stop() to release audio resources', () => {
    const { result } = renderHook(() => useBinauralEngine());

    act(() => { result.current.start(defaultCfg); });
    act(() => { result.current.stop(); });

    expect(mockHandle.stop).toHaveBeenCalled();
  });
});

describe('useBinauralEngine — updateVolumes()', () => {
  it('updates waveVolume in the store', () => {
    const { result } = renderHook(() => useBinauralEngine());

    act(() => { result.current.start(defaultCfg); });
    act(() => { result.current.updateVolumes(0, 0.4); });

    expect(result.current.player.waveVolume).toBe(0);
  });

  it('calls handle.setVolume with the wave value', () => {
    const { result } = renderHook(() => useBinauralEngine());

    act(() => { result.current.start(defaultCfg); });
    act(() => { result.current.updateVolumes(0.5, 0.3); });

    expect(mockHandle.setVolume).toHaveBeenCalledWith(0.5);
  });

  it('calls handle.setAmbienceVolume with the bg value', () => {
    const { result } = renderHook(() => useBinauralEngine());

    act(() => { result.current.start(defaultCfg); });
    act(() => { result.current.updateVolumes(0.6, 0.2); });

    expect(mockHandle.setAmbienceVolume).toHaveBeenCalledWith(0.2);
  });
});

describe('useBinauralEngine — elapsed timer', () => {
  it('elapsedSeconds increments over time', () => {
    const { result } = renderHook(() => useBinauralEngine());

    act(() => { result.current.start(defaultCfg); });

    // Advance 2 seconds (timer fires every 500ms)
    act(() => { jest.advanceTimersByTime(2000); });

    expect(result.current.player.elapsedSeconds).toBeGreaterThanOrEqual(2);
  });

  it('auto-stops when targetSeconds reached', () => {
    const { result } = renderHook(() => useBinauralEngine());

    act(() => { result.current.start({ ...defaultCfg, targetSeconds: 3 }); });

    act(() => { jest.advanceTimersByTime(4000); });

    expect(result.current.player.isPlaying).toBe(false);
  });

  it('no auto-stop when targetSeconds is 0 (infinite)', () => {
    const { result } = renderHook(() => useBinauralEngine());

    act(() => { result.current.start({ ...defaultCfg, targetSeconds: 0 }); });

    // Advance 600s — should still be playing
    act(() => { jest.advanceTimersByTime(600_000); });

    expect(result.current.player.isPlaying).toBe(true);
  });
});
