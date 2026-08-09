/**
 * auraLogic — la única concesión de color de la marca.
 *
 * El invariante que de verdad protege el diseño: la opacidad NUNCA supera el
 * techo. Sin este test, "súbelo un poquito" convierte la atmósfera en adorno y
 * el fondo empieza a competir con el texto.
 */
import {
  auraForState,
  auraFromCheckIn,
  MAX_OPACITY,
  type AuraState,
} from '@/lib/auraLogic';

const ESTADOS: AuraState[] = ['reposo', 'recuperado', 'tension', 'noche', 'umbral'];

/**
 * Techo LITERAL, deliberadamente NO importado de la implementación.
 *
 * La primera versión de este test comparaba contra `MAX_OPACITY` importado —
 * y por eso subir la constante a 0.55 pasaba en verde: la mutación movía los
 * dos lados de la comparación a la vez. Un test tautológico que decía proteger
 * el diseño y no protegía nada. Este número es el contrato de marca; si alguien
 * necesita cambiarlo, tiene que venir aquí a discutirlo.
 */
const TECHO_DE_MARCA = 0.14;

describe('auraForState — el techo es sagrado', () => {
  it('la constante pública no se sube sin tocar este test', () => {
    expect(MAX_OPACITY).toBeLessThanOrEqual(TECHO_DE_MARCA);
  });

  it('ningún estado, con ningún peso, supera el techo de marca', () => {
    for (const state of ESTADOS) {
      for (const weight of [0, 0.25, 0.5, 0.75, 1]) {
        expect(auraForState({ state, weight }).opacity).toBeLessThanOrEqual(TECHO_DE_MARCA);
      }
    }
  });

  it('un peso fuera de rango se clampa en vez de romper el techo', () => {
    expect(auraForState({ state: 'tension', weight: 99 }).opacity).toBeLessThanOrEqual(TECHO_DE_MARCA);
    expect(auraForState({ state: 'tension', weight: -5 }).opacity).toBeGreaterThan(0);
    expect(auraForState({ state: 'tension', weight: NaN }).opacity).toBeGreaterThan(0);
  });

  it('nunca se apaga del todo — un aura en cero parpadea y se lee como bug', () => {
    for (const state of ESTADOS) {
      expect(auraForState({ state, weight: 0 }).opacity).toBeGreaterThan(0);
    }
  });

  it('más peso, más presencia (monótona creciente)', () => {
    const bajo = auraForState({ state: 'noche', weight: 0.1 }).opacity;
    const alto = auraForState({ state: 'noche', weight: 0.9 }).opacity;
    expect(alto).toBeGreaterThan(bajo);
  });

  it('cada estado tiene su propio color y ninguno se repite', () => {
    const colores = ESTADOS.map((s) => auraForState({ state: s }).color);
    expect(new Set(colores).size).toBe(ESTADOS.length);
  });

  it('un estado inventado degrada a reposo en vez de dejar el color undefined', () => {
    const out = auraForState({ state: 'fiesta' as AuraState });
    expect(out.color).toBe(auraForState({ state: 'reposo' }).color);
  });

  it('la paleta es de croma bajo — saturación acotada, nada estridente', () => {
    // Croma se mide como saturación relativa, NO como oscuridad: un color puede
    // ser claro y seguir siendo apagado. La versión anterior de este test exigía
    // max(r,g,b) <= 0x40 — o sea, exigía que fuese casi negro — y por eso la
    // paleta salió invisible sobre un fondo #090909.
    for (const state of ESTADOS) {
      const hex = auraForState({ state }).color;
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturacion = max === 0 ? 0 : (max - min) / max;
      expect(saturacion).toBeLessThanOrEqual(0.7); // apagado, no neón
    }
  });

  /**
   * EL TEST QUE FALTABA.
   *
   * El suite original tenía 8 aserciones de "que no se pase" y CERO de "que se
   * note". Por eso la primera paleta salió matemáticamente invisible —
   * componiendo #3A2E1C al 10% sobre #090909, el canal más fuerte se movía de
   * 12.5 a 13.4 sobre 255 — y aun así CI estaba en verde. Un aura que nadie ve
   * cumple el techo perfectamente y no sirve para nada.
   */
  describe('perceptibilidad — el suelo también es sagrado', () => {
    const FONDO = 0x09; // palette.black real de la app

    /** Composita el canal más fuerte del aura sobre el fondo de la app. */
    function deltaVisible(state: AuraState, weight: number): number {
      const { color, opacity } = auraForState({ state, weight });
      const canal = Math.max(...[1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)));
      return (canal - FONDO) * opacity;
    }

    it('todo estado se separa del fondo de forma perceptible', () => {
      // ~3/255 es el umbral práctico por debajo del cual un degradado sobre
      // negro no se distingue en una pantalla de teléfono.
      for (const state of ESTADOS) {
        expect(deltaVisible(state, 0.6)).toBeGreaterThan(3);
      }
    });

    it('incluso en su peso mínimo el aura sigue existiendo en pantalla', () => {
      for (const state of ESTADOS) {
        expect(deltaVisible(state, 0)).toBeGreaterThan(1.5);
      }
    });
  });
});

describe('auraFromCheckIn — el fondo refleja lo que la persona declaró', () => {
  it('la noche manda sobre todo lo demás', () => {
    expect(auraFromCheckIn({ stress: 9, energy: 9, hour: 23 })).toBe('noche');
    expect(auraFromCheckIn({ stress: 9, energy: 9, hour: 3 })).toBe('noche');
  });

  it('la tensión alta pesa más que haber dormido bien', () => {
    expect(auraFromCheckIn({ stress: 8, energy: 9, hour: 10 })).toBe('tension');
  });

  it('energía alta sin tensión → recuperado', () => {
    expect(auraFromCheckIn({ stress: 2, energy: 8, hour: 10 })).toBe('recuperado');
  });

  it('energía alta CON tensión media no es recuperado — no se maquilla el estado', () => {
    expect(auraFromCheckIn({ stress: 6, energy: 9, hour: 10 })).toBe('reposo');
  });

  it('sin datos degrada a reposo, no revienta', () => {
    expect(auraFromCheckIn({})).toBe('reposo');
    expect(auraFromCheckIn({ stress: null, energy: null })).toBe('reposo');
  });
});
