// ─── constants/themeColors.ts — contrato del sistema de tema claro/oscuro ─────
// Estas invariantes protegen contra el bug "fondos negros en modo claro":
// si una var existe en dark pero falta en light, el modo claro hereda el valor
// oscuro y la pantalla queda negra.

import { THEME_VARS, buildThemeCSS, cv } from '@/constants/themeColors';

describe('THEME_VARS', () => {
  it('dark y light definen exactamente el mismo set de variables', () => {
    const darkKeys = Object.keys(THEME_VARS.dark).sort();
    const lightKeys = Object.keys(THEME_VARS.light).sort();
    expect(lightKeys).toEqual(darkKeys);
  });

  it('todas las variables usan el namespace --c-*', () => {
    for (const key of Object.keys(THEME_VARS.dark)) {
      expect(key).toMatch(/^--c-/);
    }
  });

  it('ninguna variable queda vacía en ningún tema', () => {
    for (const theme of ['dark', 'light'] as const) {
      for (const [key, value] of Object.entries(THEME_VARS[theme])) {
        expect(value.trim().length).toBeGreaterThan(0);
        expect(`${theme}:${key}=${value}`).not.toContain('undefined');
      }
    }
  });

  it('el texto dorado difiere entre temas (ámbar legible en claro)', () => {
    expect(THEME_VARS.dark['--c-gold-text']).not.toBe(THEME_VARS.light['--c-gold-text']);
  });
});

describe('buildThemeCSS', () => {
  it('emite ambos bloques y cada variable aparece en los dos', () => {
    const css = buildThemeCSS();
    expect(css).toContain(':root,[data-theme="dark"]');
    expect(css).toContain('[data-theme="light"]');
    for (const key of Object.keys(THEME_VARS.dark)) {
      const occurrences = css.split(key).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('cv()', () => {
  it('en nativo (jest-expo = ios) devuelve el hex real, no var()', () => {
    expect(cv('--c-bg', '#090909')).toBe('#090909');
    expect(cv('--c-gold-text', '#FFC804')).not.toContain('var(');
  });
});
