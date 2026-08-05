/**
 * humanFigure3DLogic — la profundidad añadida a la figura ya testeada.
 */
import { generateFigure3D } from '@/lib/humanFigure3DLogic';
import { generateFigure } from '@/lib/humanFigureLogic';

describe('generateFigure3D — reusa la anatomía 2D y le da volumen', () => {
  it('misma semilla, mismo x/y que generateFigure (no reinventa la anatomía)', () => {
    const flat = generateFigure({ seed: 90417 });
    const withDepth = generateFigure3D({ seed: 90417 });
    expect(withDepth.map(({ x, y, r, zone, edge }) => ({ x, y, r, zone, edge }))).toEqual(flat);
  });

  it('determinista: la misma semilla da siempre el mismo z por punto', () => {
    const a = generateFigure3D({ seed: 90417 });
    const b = generateFigure3D({ seed: 90417 });
    expect(a).toEqual(b);
  });

  it('todo punto tiene un z finito y acotado', () => {
    const dots = generateFigure3D();
    for (const d of dots) {
      expect(Number.isFinite(d.z)).toBe(true);
      expect(Math.abs(d.z)).toBeLessThanOrEqual(40);
    }
  });

  it('no todos los z son el mismo valor — hay volumen, no una tarjeta plana', () => {
    const dots = generateFigure3D();
    const distinctZ = new Set(dots.map((d) => Math.round(d.z * 1000)));
    expect(distinctZ.size).toBeGreaterThan(50);
  });
});
