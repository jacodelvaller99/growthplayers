/**
 * Unit tests — diffDays (días brutos) + calcProtocolDay (1–90 capped)
 *
 * Source: lib/utils.ts
 *
 * diffDays      → días transcurridos sin cap, mínimo 1.
 * calcProtocolDay → wraps diffDays, min 1, max 90 (límite del Protocolo Soberano).
 */

import { diffDays, calcProtocolDay } from '@/lib/utils';

// Freeze time so ms calculations are deterministic
const NOW = new Date('2026-04-27T12:00:00.000Z');

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

// ── Helper ───────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * 86_400_000).toISOString();
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('calcProtocolDay', () => {
  it('returns day 1 when protocol started today', () => {
    expect(calcProtocolDay(NOW.toISOString())).toBe(1);
  });

  it('returns day 45 when protocol started 44 days ago', () => {
    expect(calcProtocolDay(daysAgo(44))).toBe(45);
  });

  it('returns day 89 when protocol started 88 days ago', () => {
    expect(calcProtocolDay(daysAgo(88))).toBe(89);
  });

  it('returns day 90 when protocol started 89 days ago', () => {
    expect(calcProtocolDay(daysAgo(89))).toBe(90);
  });

  it('no retorna > 90 aunque pasen más días', () => {
    expect(calcProtocolDay(daysAgo(100))).toBe(90);
    expect(calcProtocolDay(daysAgo(365))).toBe(90);
  });
});
