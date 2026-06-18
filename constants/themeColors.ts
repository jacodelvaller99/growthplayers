/**
 * themeColors.ts — Light/Dark theme via CSS custom properties (web).
 *
 * How it works:
 *   The neutral palette tokens in theme.ts resolve to `var(--c-*)` on web.
 *   This module injects a <style> with the dark + light values at startup,
 *   and the active theme is selected with `data-theme` on <html>.
 *   Result: every screen (which already references palette.*) re-themes
 *   instantly when the attribute flips — no per-screen refactor needed.
 *
 *   Native (iOS/Android) keeps the real dark hex values (static StyleSheet),
 *   so native stays dark for now; the toggle is a web/desktop feature.
 *
 * Accent (gold) and status colors stay constant across themes (brand + the
 * 26 `palette.gold + 'NN'` opacity concatenations rely on real hex values).
 */
import { Platform } from 'react-native';

// ─── CSS variable values per theme ─────────────────────────────────────────────
// Keys are the CSS custom-property names referenced by theme.ts on web.
export const THEME_VARS: Record<'dark' | 'light', Record<string, string>> = {
  dark: {
    '--c-bg':           '#090909',
    '--c-bg-deep':      '#050505',
    '--c-surface':      '#111111',
    '--c-surface-2':    '#181818',
    '--c-surface-3':    '#222222',
    '--c-overlay':      '#1C1C1C',
    '--c-text':         '#EBEBEB',
    '--c-text-warm':    '#F0EBE0',
    '--c-text-dim':     'rgba(235,235,235,0.55)',
    '--c-text-2':       '#AAAAAA',
    '--c-text-3':       '#888888',
    '--c-text-faint':   '#444444',
    '--c-border':       'rgba(255,255,255,0.07)',
    '--c-border-soft':  'rgba(255,255,255,0.05)',
    '--c-border-hard':  'rgba(255,255,255,0.13)',
    '--c-border-focus': 'rgba(255,255,255,0.20)',
    // gold AS TEXT/icon on a surface: bright gold reads great on dark…
    '--c-gold-text':    '#FFC804',
  },
  light: {
    '--c-bg':           '#F5F3EE',
    '--c-bg-deep':      '#ECE8DF',
    '--c-surface':      '#FFFFFF',
    '--c-surface-2':    '#FBF9F4',
    '--c-surface-3':    '#F0ECE3',
    '--c-overlay':      '#E8E3D9',
    '--c-text':         '#0D0D0D',
    '--c-text-warm':    '#1A1A1A',
    '--c-text-dim':     'rgba(13,13,13,0.55)',
    '--c-text-2':       '#4A4A4A',
    '--c-text-3':       '#6B6B6B',
    '--c-text-faint':   '#9A9A9A',
    '--c-border':       'rgba(13,13,13,0.10)',
    '--c-border-soft':  'rgba(13,13,13,0.06)',
    '--c-border-hard':  'rgba(13,13,13,0.15)',
    '--c-border-focus': 'rgba(13,13,13,0.22)',
    // …but bright gold fails on cream. Deep amber keeps the brand warmth and
    // stays readable (AA-ish on #F5F3EE) for eyebrows/labels/timestamps.
    '--c-gold-text':    '#8A6500',
  },
};

/** web helper: token resolves to a CSS var on web, real hex on native. */
export const cv = (varName: string, nativeHex: string): string =>
  Platform.OS === 'web' ? `var(${varName})` : nativeHex;

function block(selector: string, vars: Record<string, string>): string {
  const body = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
  return `${selector}{${body}}`;
}

/** The full CSS: :root + [data-theme="dark"] = dark, [data-theme="light"] = light. */
export function buildThemeCSS(): string {
  return (
    block(':root,[data-theme="dark"]', THEME_VARS.dark) +
    block('[data-theme="light"]', THEME_VARS.light)
  );
}

/** Inject the theme variables into <head> once (web only). Idempotent. */
export function injectThemeVars(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('polaris-theme-vars')) return;
  const style = document.createElement('style');
  style.id = 'polaris-theme-vars';
  style.textContent = buildThemeCSS();
  document.head.appendChild(style);
}
