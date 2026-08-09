/**
 * humanFigure3DLogic — la profundidad añadida a la figura ya testeada.
 */
import { generateFigure3D, projectPoint, type Camera } from '@/lib/humanFigure3DLogic';
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

describe('projectPoint — la cámara del renderer web, sin three.js', () => {
  const cam: Camera = { yaw: 0, pitch: 0, zoom: 1, w: 300, h: 486 };

  it('sin rotación, preserva izquierda/derecha y arriba/abajo del mundo', () => {
    const derecha = projectPoint({ x: 40, y: 0, z: 0 }, cam);
    const izquierda = projectPoint({ x: -40, y: 0, z: 0 }, cam);
    const arriba = projectPoint({ x: 0, y: 40, z: 0 }, cam);
    const abajo = projectPoint({ x: 0, y: -40, z: 0 }, cam);
    expect(derecha.sx).toBeGreaterThan(cam.w / 2);
    expect(izquierda.sx).toBeLessThan(cam.w / 2);
    // +y del mundo es hacia arriba; en pantalla eso es sy MENOR.
    expect(arriba.sy).toBeLessThan(cam.h / 2);
    expect(abajo.sy).toBeGreaterThan(cam.h / 2);
  });

  it('girar 180° de yaw espeja la figura horizontalmente', () => {
    const frente = projectPoint({ x: 40, y: 10, z: 0 }, cam);
    const espalda = projectPoint({ x: 40, y: 10, z: 0 }, { ...cam, yaw: Math.PI });
    // El punto que estaba a la derecha pasa a la izquierda, a la misma
    // distancia del centro; la altura no cambia.
    expect(espalda.sx).toBeCloseTo(cam.w - frente.sx, 5);
    expect(espalda.sy).toBeCloseTo(frente.sy, 5);
  });

  it('perspectiva real: lo lejano proyecta más pequeño', () => {
    const cerca = projectPoint({ x: 0, y: 0, z: -50 }, cam);
    const lejos = projectPoint({ x: 0, y: 0, z: 50 }, cam);
    expect(lejos.scale).toBeLessThan(cerca.scale);
    expect(lejos.depth).toBeGreaterThan(cerca.depth);
  });

  it('depth ordena para el algoritmo del pintor (mayor primero)', () => {
    const pts = [
      { x: 0, y: 0, z: 30 },
      { x: 0, y: 0, z: -30 },
      { x: 0, y: 0, z: 0 },
    ].map((p) => ({ p, proj: projectPoint(p, cam) }));
    const ordenados = [...pts].sort((a, b) => b.proj.depth - a.proj.depth);
    expect(ordenados.map((e) => e.p.z)).toEqual([30, 0, -30]);
  });

  it('el zoom escala el tamaño en pantalla sin mover el centro', () => {
    const base = projectPoint({ x: 40, y: 0, z: 0 }, cam);
    const doble = projectPoint({ x: 40, y: 0, z: 0 }, { ...cam, zoom: 2 });
    expect(doble.scale).toBeCloseTo(base.scale * 2, 5);
    const centroBase = projectPoint({ x: 0, y: 0, z: 0 }, cam);
    const centroDoble = projectPoint({ x: 0, y: 0, z: 0 }, { ...cam, zoom: 2 });
    expect(centroDoble.sx).toBeCloseTo(centroBase.sx, 5);
    expect(centroDoble.sy).toBeCloseTo(centroBase.sy, 5);
  });
});
