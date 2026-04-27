/**
 * Unit tests — diffDays (protocol day counter)
 *
 * Source: lib/utils.ts → diffDays(fromIso: string): number
 * Formula: Math.max(1, Math.floor(msSinceStart / 86400000) + 1)
 *   Day 1 = the start date itself (or any time on that calendar day).
 */

import { diffDays } from '@/lib/utils';

// Freeze time so ms calculations are deterministic
const NOW = new Date('2026-04-27T12:00:00.000Z');

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 86_400_000).toISOString();
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('diffDays', () => {
  it('returns day 1 when protocol started today', () => {
    expect(diffDays(NOW.toISOString())).toBe(1);
  });

  it('returns day 45 when protocol started 44 days ago', () => {
    expect(diffDays(daysAgo(44))).toBe(45);
  });

  it('returns day 89 when protocol started 88 days ago', () => {
    expect(diffDays(daysAgo(88))).toBe(89);
  });

  it('returns day 90 when protocol started 89 days ago', () => {
    expect(diffDays(daysAgo(89))).toBe(90);
  });

  it('returns day > 90 — protocolDay is NOT capped at 90', () => {
    /**
     * BUG: protocolDay is uncapped.
     *
     * After day 90 the dashboard header shows "DIA 91 · PROTOCOLO SOBERANO",
     * "DIA 150 · PROTOCOLO SOBERANO", etc., which may confuse users who have
     * completed the 90-day protocol cycle.
     *
     * The ProgressCard does cap via Math.min(progress, 100), but the raw
     * protocolDay counter keeps incrementing.
     *
     * Issue: consider resetting the protocol or capping protocolDay display at 90
     * once the protocol is complete.
     */
    expect(diffDays(daysAgo(100))).toBe(101); // returns 101, NOT 90
  });
});
