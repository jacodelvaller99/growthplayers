/**
 * humanFigure3DLogic — la profundidad añadida a la figura ya testeada.
 */
import {
  generateFigure3D,
  pickZone,
  projectPoint,
  shortestYawDelta,
  VIEW_PRESETS,
  type Camera,
} from '@/lib/humanFigure3DLogic';
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

describe('pickZone — tocar las partículas directo en el cuerpo', () => {
  const candidates = [
    { sx: 100, sy: 100, zone: 'cabeza' as const },
    { sx: 100, sy: 200, zone: 'pecho' as const },
  ];

  it('elige el candidato más cercano dentro del radio', () => {
    expect(pickZone(candidates, 102, 98, 20)).toBe('cabeza');
    expect(pickZone(candidates, 100, 205, 20)).toBe('pecho');
  });

  it('null si nada cae dentro de maxDist — un toque en el aire no selecciona', () => {
    expect(pickZone(candidates, 100, 150, 20)).toBeNull();
  });

  it('lista vacía → null, no revienta', () => {
    expect(pickZone([], 0, 0, 999)).toBeNull();
  });
});

describe('VIEW_PRESETS — el HUD de 6 vistas', () => {
  it('son exactamente 6, con id y label únicos', () => {
    expect(VIEW_PRESETS).toHaveLength(6);
    expect(new Set(VIEW_PRESETS.map((v) => v.id)).size).toBe(6);
    expect(new Set(VIEW_PRESETS.map((v) => v.label)).size).toBe(6);
  });
});

describe('shortestYawDelta — el tween nunca gira la vuelta larga', () => {
  it('caso simple: de 0 a π/2 es +π/2', () => {
    expect(shortestYawDelta(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2, 5);
  });

  it('cruzando la costura: de 350° a 10° es +20°, no -340°', () => {
    const from = (350 * Math.PI) / 180;
    const to = (10 * Math.PI) / 180 + Math.PI * 2; // equivalente, ángulo "grande"
    const delta = shortestYawDelta(from, to);
    expect(Math.abs(delta)).toBeLessThan(Math.PI / 2);
  });

  it('el resultado siempre cae en (-π, π]', () => {
    for (const from of [-10, -3, 0, 3, 10]) {
      for (const to of [-10, -3, 0, 3, 10]) {
        const d = shortestYawDelta(from, to);
        expect(d).toBeGreaterThan(-Math.PI - 1e-9);
        expect(d).toBeLessThanOrEqual(Math.PI + 1e-9);
      }
    }
  });
});
