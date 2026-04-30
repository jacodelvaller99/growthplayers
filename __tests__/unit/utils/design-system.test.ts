/**
 * Unit tests — constants/theme.ts design system tokens
 *
 * Validates: palette integrity, typography scale, spacing scale,
 * radii values, and animation tokens. These tests fail if someone
 * accidentally breaks a token (e.g. makes gold white, sets padding to 0).
 */

import { palette, spacing, radii, typography, Fonts } from '@/constants/theme';

// ─── Palette ──────────────────────────────────────────────────────────────────

describe('palette — gold discipline', () => {
  it('palette.gold is the correct brand gold (#FFC804)', () => {
    expect(palette.gold).toBe('#FFC804');
  });

  it('palette.black is a near-black (not pure white or mid-gray)', () => {
    const hex = palette.black.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (r + g + b) / 3;
    expect(luminance).toBeLessThan(30); // very dark
  });

  it('palette.ivory is a near-white', () => {
    const hex = palette.ivory.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (r + g + b) / 3;
    expect(luminance).toBeGreaterThan(200); // very light
  });

  it('palette.ash is a mid-gray (used for secondary text)', () => {
    const hex = palette.ash.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    expect(r).toBeGreaterThan(100);
    expect(r).toBeLessThan(210);
  });

  it('palette.smoke is darker than palette.ash (hierarchy intact)', () => {
    const ashHex = palette.ash.replace('#', '');
    const smokeHex = palette.smoke.replace('#', '');
    const ashR = parseInt(ashHex.slice(0, 2), 16);
    const smokeR = parseInt(smokeHex.slice(0, 2), 16);
    expect(smokeR).toBeLessThan(ashR);
  });

  it('palette.success is green-ish', () => {
    const hex = palette.success.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    expect(g).toBeGreaterThan(r); // more green than red
  });

  it('palette.line is a low-opacity border (not solid gold or white)', () => {
    // line should be rgba(...) with low alpha OR a dark hex
    const line = palette.line;
    const isRgba = line.startsWith('rgba');
    const isDarkHex = !isRgba && parseInt(line.replace('#', '').slice(0, 2), 16) < 80;
    expect(isRgba || isDarkHex).toBe(true);
  });

  it('palette.goldLight exists and is defined', () => {
    expect(palette.goldLight).toBeDefined();
    expect(palette.goldLight.length).toBeGreaterThan(0);
  });
});

// ─── Spacing scale ────────────────────────────────────────────────────────────

describe('spacing — scale ordering', () => {
  it('all spacing values are positive numbers', () => {
    for (const [key, val] of Object.entries(spacing)) {
      expect(typeof val).toBe('number');
      expect(val as number).toBeGreaterThan(0);
    }
  });

  it('spacing.xs < spacing.sm < spacing.md < spacing.lg < spacing.xl', () => {
    expect(spacing.xs).toBeLessThan(spacing.sm);
    expect(spacing.sm).toBeLessThan(spacing.md);
    expect(spacing.md).toBeLessThan(spacing.lg);
    expect(spacing.lg).toBeLessThan(spacing.xl);
  });

  it('spacing.md is at least 12px (minimum comfortable touch target padding)', () => {
    expect(spacing.md).toBeGreaterThanOrEqual(12);
  });
});

// ─── Radii ────────────────────────────────────────────────────────────────────

describe('radii — token values', () => {
  it('radii.xs === 4 (design spec)', () => {
    expect(radii.xs).toBe(4);
  });

  it('radii.sm === 8 (design spec)', () => {
    expect(radii.sm).toBe(8);
  });

  it('radii.md === 12 (design spec)', () => {
    expect(radii.md).toBe(12);
  });

  it('radii.lg >= 16 (design spec)', () => {
    expect(radii.lg).toBeGreaterThanOrEqual(16);
  });

  it('radii ordering: xs < sm < md < lg', () => {
    expect(radii.xs).toBeLessThan(radii.sm);
    expect(radii.sm).toBeLessThan(radii.md);
    expect(radii.md).toBeLessThan(radii.lg);
  });
});

// ─── Typography ───────────────────────────────────────────────────────────────

describe('typography — font sizes are positive', () => {
  it('all typography fontSize values are positive', () => {
    for (const [, style] of Object.entries(typography)) {
      if (typeof style === 'object' && style !== null && 'fontSize' in style) {
        expect((style as any).fontSize).toBeGreaterThan(0);
      }
    }
  });

  it('typography.body exists and has a fontSize', () => {
    expect(typography.body).toBeDefined();
    expect((typography.body as any).fontSize).toBeGreaterThan(0);
  });

  it('typography.label exists and is smaller than body', () => {
    expect(typography.label).toBeDefined();
    expect((typography.label as any).fontSize).toBeLessThanOrEqual((typography.body as any).fontSize);
  });
});

// ─── Fonts ────────────────────────────────────────────────────────────────────

describe('Fonts — font family names defined', () => {
  it('Fonts.display is defined and is a string', () => {
    expect(typeof Fonts.display).toBe('string');
    expect(Fonts.display.length).toBeGreaterThan(0);
  });

  it('Fonts.mono is defined', () => {
    expect(typeof Fonts.mono).toBe('string');
    expect(Fonts.mono.length).toBeGreaterThan(0);
  });

  it('Fonts.sans is defined', () => {
    expect(typeof Fonts.sans).toBe('string');
    expect(Fonts.sans.length).toBeGreaterThan(0);
  });
});
