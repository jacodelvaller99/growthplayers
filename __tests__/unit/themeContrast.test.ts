/**
 * Contraste WCAG de las 56 combinaciones (8 fondos × 7 señales).
 *
 * POR QUE ESTE FICHERO: los ejes se eligen desde una pantalla de ajustes, así
 * que cualquier cliente puede aterrizar en cualquier combinación. Revisar 30
 * paletas a ojo no escala y no deja rastro; el fallo típico —un texto de acento
 * que se hunde en su propio fondo— es invisible hasta que alguien no puede leer
 * un error. Aquí se MIDE, y añadir un fondo o una señal nueva obliga a pasar
 * por la misma barra.
 *
 * También fija los dos defectos que motivaron rehacer el tema claro:
 *   - la rampa de elevación debe ser monótona (bg era más claro que surface-3,
 *     así que una tarjeta elevada se leía como agujero);
 *   - el oro con alfa debe recalibrarse sobre claro (rgba(255,200,4,0.12) sobre
 *     blanco compone #FFF8E1, indistinguible del papel).
 */
import {
  LIGHT_BACKDROPS,
  LIGHT_SIGNAL_OVERRIDES,
  SIGNAL_VARS,
  THEME_VARS,
  type BackdropId,
  type SignalId,
} from '@/constants/themeColors';

// ─── Medición ─────────────────────────────────────────────────────────────────

const channel = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** Luminancia relativa (WCAG 2.1). Solo hex de 6 dígitos. */
export function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Los valores efectivos de una combinación, tal como los fusiona la cascada. */
function resolve(backdrop: BackdropId, signal: SignalId): Record<string, string> {
  return {
    ...THEME_VARS[backdrop],
    ...SIGNAL_VARS[signal],
    ...(LIGHT_BACKDROPS.includes(backdrop) ? LIGHT_SIGNAL_OVERRIDES[signal] : {}),
  };
}

const BACKDROPS = Object.keys(THEME_VARS) as BackdropId[];
const SIGNALS = Object.keys(SIGNAL_VARS) as SignalId[];

/** Fondos sobre los que de hecho se pinta texto. */
const GROUNDS = ['--c-bg', '--c-surface', '--c-surface-2', '--c-surface-3', '--c-overlay'];

/**
 * Tokens que llevan TEXTO corrido → AA estricto (4.5:1).
 *
 * `--c-text-faint` queda fuera a propósito: es decorativo (separadores, marcas
 * de agua) y exigirle 4.5:1 lo volvería indistinguible del texto real, que es
 * justo lo contrario de su función.
 */
const COPY = ['--c-text', '--c-text-2', '--c-text-3', '--c-gold-text', '--c-danger-text'];

/**
 * Acentos semánticos → 3:1 (WCAG 1.4.11, contraste de elementos NO textuales).
 *
 * No es una barra rebajada por conveniencia: es que estos tokens son rellenos,
 * bordes e iconos, no cuerpo de texto. El proyecto ya asumía esta separación —
 * por eso existe `--c-danger-text` aparte de `--c-danger`: el rojo de marca
 * (#C0392B) mide 3.47:1 sobre superficie oscura y nunca fue apto para el texto
 * del mensaje de error. Si algún día un acento tiene que llevar copy, la salida
 * es un token `-text` propio, no bajar esta constante.
 */
const ACCENTS = ['--c-success', '--c-warning', '--c-danger', '--c-calm', '--c-info'];

const AA = 4.5;
const NON_TEXT = 3;

// ─── Invariantes ──────────────────────────────────────────────────────────────

describe('contraste AA en las 56 combinaciones', () => {
  it('la matriz no está vacía (si lo estuviera, lo de abajo no probaría nada)', () => {
    expect(BACKDROPS.length).toBe(8);
    expect(SIGNALS.length).toBe(7);
  });

  for (const backdrop of BACKDROPS) {
    for (const signal of SIGNALS) {
      it(`${backdrop} · ${signal} — texto ≥ ${AA}:1, acentos ≥ ${NON_TEXT}:1`, () => {
        const vars = resolve(backdrop, signal);
        const failures: string[] = [];

        for (const [tokens, bar] of [[COPY, AA], [ACCENTS, NON_TEXT]] as const) {
          for (const ink of tokens) {
            for (const ground of GROUNDS) {
              const ratio = contrast(vars[ink], vars[ground]);
              if (ratio < bar) {
                failures.push(`${ink} sobre ${ground}: ${ratio.toFixed(2)}:1 (< ${bar})`);
              }
            }
          }
        }

        expect(failures).toEqual([]);
      });
    }
  }
});

describe('rampa de elevación', () => {
  // El bug del tema claro viejo: bg (lum .897) caía ENTRE surface-2 (.948) y
  // surface-3 (.841), así que dos tarjetas elevadas iban en direcciones opuestas.
  for (const backdrop of BACKDROPS) {
    it(`${backdrop} — toda superficie se separa del fondo en la misma dirección`, () => {
      const v = THEME_VARS[backdrop];
      const bg = luminance(v['--c-bg']);
      const surfaces = ['--c-surface', '--c-surface-2', '--c-surface-3'].map((k) => luminance(v[k]));
      const goingUp = surfaces.map((s) => s > bg);
      // Todas por encima (oscuro) o todas por debajo (claro) — nunca mezclado.
      expect(new Set(goingUp).size).toBe(1);
    });
  }
});

describe('el oro con alfa se recalibra sobre claro', () => {
  // Sin esto el tema claro se ve "plano": los rellenos y líneas doradas están
  // calibrados para tapar un fondo oscuro y sobre blanco no dibujan nada.
  const ALPHA_GOLD = ['--c-gold-light', '--c-gold-glow', '--c-gold-muted', '--c-line-gold', '--c-line-gold-subtle'];

  for (const signal of SIGNALS) {
    it(`${signal} — claro redefine los 5 tokens de oro con alfa`, () => {
      for (const token of ALPHA_GOLD) {
        expect(LIGHT_SIGNAL_OVERRIDES[signal]).toHaveProperty(token);
        // Y la base debe ser MÁS oscura que la de oscuro: sobre papel se gana
        // contraste bajando luminancia, no subiéndola.
        expect(LIGHT_SIGNAL_OVERRIDES[signal][token]).not.toBe(SIGNAL_VARS[signal][token]);
      }
    });
  }
});
