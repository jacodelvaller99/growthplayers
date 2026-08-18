// ─── constants/themeColors.ts — contrato del sistema de tema (2 ejes) ─────────
// Estas invariantes protegen contra el bug "fondos negros en modo claro": si una
// var existe en un eje pero falta en otra variante del MISMO eje, esa variante
// hereda el valor anterior y la pantalla queda con colores del tema equivocado.
//
// Con dos ejes el riesgo se duplica, así que la paridad se exige sobre TODAS las
// variantes de cada eje, no solo sobre el par dark/light original.

import {
  LIGHT_SIGNAL_OVERRIDES,
  SIGNAL_VARS,
  THEME_VARS,
  alpha,
  buildThemeCSS,
  cv,
  type BackdropId,
  type SignalId,
} from '@/constants/themeColors';

const BACKDROPS = Object.keys(THEME_VARS) as BackdropId[];
const SIGNALS = Object.keys(SIGNAL_VARS) as SignalId[];

describe('EJE 1 · fondos (THEME_VARS)', () => {
  it('los cuatro fondos definen exactamente el mismo set de variables', () => {
    const ref = Object.keys(THEME_VARS.dark).sort();
    for (const id of BACKDROPS) {
      expect(Object.keys(THEME_VARS[id]).sort()).toEqual(ref);
    }
  });

  it('incluye los fondos nuevos además de los originales', () => {
    expect(BACKDROPS).toEqual(expect.arrayContaining(['dark', 'light', 'carbon', 'aura']));
  });

  it('todas las variables usan el namespace --c-* y ninguna queda vacía', () => {
    for (const id of BACKDROPS) {
      for (const [key, value] of Object.entries(THEME_VARS[id])) {
        expect(key).toMatch(/^--c-/);
        expect(value.trim().length).toBeGreaterThan(0);
        expect(`${id}:${key}=${value}`).not.toContain('undefined');
      }
    }
  });

  it('el fondo por defecto (dark) conserva su rampa de producción', () => {
    // Ampliar el sistema no puede cambiar el aspecto de arranque de la app.
    // Las ÚNICAS excepciones son correcciones de contraste medidas (text-3 y
    // danger-text subieron ~1% de luminancia para cerrar AA); las fija
    // themeContrast.test.ts, no este fichero.
    expect(THEME_VARS.dark['--c-bg']).toBe('#090909');
    expect(THEME_VARS.dark['--c-surface']).toBe('#111111');
    expect(THEME_VARS.dark['--c-surface-3']).toBe('#222222');
    expect(THEME_VARS.dark['--c-text']).toBe('#EBEBEB');
  });

  it('claro usa los neutros del manual, no un crema derivado', () => {
    // El crema anterior (#F5F3EE) no salía de ningún sitio: el Manual de Marca
    // entrega neutros PUROS. Además su rampa de elevación era incoherente —
    // ver el comentario del bloque `light` y themeContrast.test.ts.
    for (const key of ['--c-bg', '--c-surface-2', '--c-surface-3', '--c-overlay'] as const) {
      const [r, g, b] = [1, 3, 5].map((i) => THEME_VARS.light[key].slice(i, i + 2));
      expect(`${key}:${r}${g}${b}`).toBe(`${key}:${r}${r}${r}`); // gris puro
    }
    expect(THEME_VARS.light['--c-text']).toBe('#0F0F0F');       // Smoky Black
  });
});

describe('EJE 2 · señales (SIGNAL_VARS)', () => {
  it('las cuatro señales definen exactamente el mismo set de variables', () => {
    const ref = Object.keys(SIGNAL_VARS.oro).sort();
    for (const id of SIGNALS) {
      expect(Object.keys(SIGNAL_VARS[id]).sort()).toEqual(ref);
    }
  });

  it('la señal por defecto (oro) conserva el acento de marca de producción', () => {
    // El oro es del manual y es intocable. El rojo NO está en el manual: es
    // derivado, y subió a #CF3D2E porque #C0392B no llegaba ni a 3:1 sobre la
    // superficie más elevada — ni siquiera como relleno o borde.
    expect(SIGNAL_VARS.oro['--c-gold']).toBe('#FFC804');       // Philippine Yellow
    expect(SIGNAL_VARS.oro['--c-success']).toBe('#52A878');
  });

  it('ámbar cambia el acento al segundo oro del manual, no a un matiz inventado', () => {
    expect(SIGNAL_VARS.ambar['--c-gold']).toBe('#EDBA01');
  });

  it('semáforo diferencia los tres estados (el defecto no tiene por qué)', () => {
    const s = SIGNAL_VARS.semaforo;
    expect(new Set([s['--c-success'], s['--c-warning'], s['--c-danger']]).size).toBe(3);
  });

  it('calma separa la voz de recuperación del oro; las demás no', () => {
    expect(SIGNAL_VARS.calma['--c-calm']).not.toBe(SIGNAL_VARS.calma['--c-gold']);
    expect(SIGNAL_VARS.oro['--c-calm']).toBe(SIGNAL_VARS.oro['--c-gold']);
  });

  it('toda señal trae un override de contraste para fondo claro', () => {
    // El oro brillante como TEXTO sobre crema mide 1.8:1. Si una señal se añade
    // sin su override, sus rótulos dorados quedan ilegibles en modo claro.
    for (const id of SIGNALS) {
      expect(LIGHT_SIGNAL_OVERRIDES[id]['--c-gold-text']).toBeTruthy();
      expect(LIGHT_SIGNAL_OVERRIDES[id]['--c-gold-text']).not.toBe(SIGNAL_VARS[id]['--c-gold-text']);
    }
  });
});

describe('buildThemeCSS', () => {
  const css = buildThemeCSS();

  it('emite un bloque por cada fondo y por cada señal', () => {
    expect(css).toContain(':root,[data-theme="dark"]');
    expect(css).toContain(':root,[data-signal="oro"]');
    for (const id of BACKDROPS.filter((b) => b !== 'dark')) {
      expect(css).toContain(`[data-theme="${id}"]`);
    }
    for (const id of SIGNALS.filter((s) => s !== 'oro')) {
      expect(css).toContain(`[data-signal="${id}"]`);
    }
  });

  it('cada variable de fondo aparece en las cuatro variantes', () => {
    for (const key of Object.keys(THEME_VARS.dark)) {
      expect(css.split(key).length - 1).toBeGreaterThanOrEqual(BACKDROPS.length);
    }
  });

  it('los arreglos de claro usan selector de dos atributos para ganar especificidad', () => {
    // Un selector de un solo atributo empataría con el bloque de señal y el
    // resultado dependería del orden — frágil. Dos atributos (0,2,0) siempre gana.
    for (const id of SIGNALS) {
      expect(css).toContain(`[data-theme="light"][data-signal="${id}"]`);
    }
  });

  it('el fondo aura aporta su capa de resplandor sin tocar ninguna pantalla', () => {
    expect(css).toContain('[data-theme="aura"] body');
    expect(css).toContain('radial-gradient');
  });
});

describe('cv()', () => {
  it('en nativo (jest-expo = ios) devuelve el hex real, no var()', () => {
    expect(cv('--c-bg', '#090909')).toBe('#090909');
    expect(cv('--c-gold', '#FFC804')).not.toContain('var(');
  });
});

describe('alpha()', () => {
  it('en nativo concatena el hex igual que el patrón que reemplaza', () => {
    expect(alpha('#FFC804', '44')).toBe('#FFC80444');
  });

  it('en web emite color-mix, que SÍ opera sobre var()', () => {
    // Es la razón de existir del helper: `var(--c-gold)44` no es CSS válido y
    // el color desaparecería sin lanzar ningún error.
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const web = require('@/constants/themeColors');
      expect(web.alpha('var(--c-gold)', '44')).toBe(
        'color-mix(in srgb, var(--c-gold) 27%, transparent)',   // 0x44 = 68/255 ≈ 27%
      );
      expect(web.alpha('var(--c-danger)', '55')).toBe(
        'color-mix(in srgb, var(--c-danger) 33%, transparent)', // 0x55 = 85/255 ≈ 33%
      );
    });
  });
});
