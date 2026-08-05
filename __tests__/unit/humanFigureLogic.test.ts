/**
 * humanFigureLogic — la silueta como cuerpo real, no como siete cajas.
 *
 * Antes estos invariantes se comprobaban leyendo el CÓDIGO FUENTE del
 * componente con una regex (`ZONE_BOX` era privado a propósito). Ahora la
 * geometría es lógica pura de verdad, así que se importa y se prueba como
 * cualquier otra — sin depender de que un comentario describa correctamente
 * lo que el código hace.
 */
import { BODY_ZONES, type BodyZone } from '@/lib/bodyMapLogic';
import {
  computeTouchRegions,
  expandToTouchTarget,
  generateFigure,
  VIEWBOX,
  zoneAt,
} from '@/lib/humanFigureLogic';

describe('generateFigure — determinista y dentro del lienzo', () => {
  it('la misma semilla da SIEMPRE la misma figura', () => {
    const a = generateFigure({ seed: 90417 });
    const b = generateFigure({ seed: 90417 });
    expect(a).toEqual(b);
  });

  it('una semilla distinta da una figura distinta', () => {
    const a = generateFigure({ seed: 1 });
    const b = generateFigure({ seed: 2 });
    expect(a).not.toEqual(b);
  });

  it('todo punto cae dentro del lienzo', () => {
    const dots = generateFigure();
    for (const d of dots) {
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x).toBeLessThanOrEqual(VIEWBOX.w);
      expect(d.y).toBeGreaterThanOrEqual(0);
      expect(d.y).toBeLessThanOrEqual(VIEWBOX.h);
    }
  });

  it('genera un cuerpo reconocible, no un puñado de puntos sueltos', () => {
    // Cota floja a propósito — no fija un número mágico de puntos, solo que
    // haya "una figura", no una silueta rota o vacía por un cambio futuro.
    const dots = generateFigure();
    expect(dots.length).toBeGreaterThan(400);
  });

  it('cada una de las 7 zonas tiene al menos un punto', () => {
    const dots = generateFigure();
    for (const zone of BODY_ZONES) {
      expect(dots.some((d) => d.zone === zone)).toBe(true);
    }
  });

  it('las piernas y los pies son decorativos: ningún punto ahí pertenece a una zona', () => {
    // A la altura de los pies (muy abajo del lienzo) no hay ninguna de las 7
    // zonas tocables — igual que la versión de cajas, que nunca tuvo una
    // zona "piernas".
    const dots = generateFigure();
    const puntosDePie = dots.filter((d) => d.y > VIEWBOX.h - 30);
    expect(puntosDePie.length).toBeGreaterThan(0); // hay puntos ahí…
    expect(puntosDePie.every((d) => d.zone === null)).toBe(true); // …pero ninguno es zona
  });
});

describe('zoneAt — cada punto pertenece a una zona y solo una', () => {
  it('el centro de cada zona clave devuelve lo esperado', () => {
    expect(zoneAt(150, 30)).toBe('cabeza');
    expect(zoneAt(150, 90)).toBe('mandibula');
    expect(zoneAt(150, 130)).toBe('garganta');
    expect(zoneAt(30, 300)).toBe('manos');   // brazo izquierdo
    expect(zoneAt(270, 300)).toBe('manos');  // brazo derecho
  });

  it('un punto en la banda del torso pero fuera del ancho del torso y del brazo no es ninguna zona', () => {
    // `zoneAt` decide cabeza/mandíbula/garganta por banda de altura sin mirar
    // el ancho (ver el porqué en el propio código): esas bandas asumen que
    // solo se llama con puntos que `generateFigure` ya aceptó dentro de la
    // silueta. El torso sí acota por ancho, y ahí un punto realmente fuera
    // —ni en el torso ni en un brazo— es el caso real de "no es ninguna zona".
    expect(zoneAt(295, 200)).toBeNull();
  });
});

describe('computeTouchRegions + expandToTouchTarget — el piso táctil real', () => {
  // El invariante que costó varias rondas en la versión de cajas: en la PWA
  // react-native-web ignora `hitSlop`, así que el rectángulo invisible ES el
  // área de toque completa. Aquí se corre sobre la figura REAL generada, no
  // sobre una tabla aparte que pueda desalinearse de lo que se pinta.
  const dots = generateFigure();
  const raw = computeTouchRegions(dots);
  const regions = expandToTouchTarget(raw);

  it('hay al menos una región por cada una de las 7 zonas', () => {
    const zonas = new Set(regions.map((r) => r.zone));
    for (const z of BODY_ZONES) expect(zonas.has(z)).toBe(true);
  });

  it('`manos` da DOS regiones — el brazo izquierdo y el derecho', () => {
    const manos = regions.filter((r) => r.zone === 'manos');
    expect(manos).toHaveLength(2);
  });

  it('ninguna región baja del mínimo táctil, ni de ancho ni de alto', () => {
    const PISO = 44;
    const flacas = regions.filter(
      (r) => r.bounds.x1 - r.bounds.x0 < PISO || r.bounds.y1 - r.bounds.y0 < PISO,
    );
    expect(flacas.map((r) => r.zone)).toEqual([]);
  });

  it('ningún par de regiones se solapa', () => {
    const solapes: string[] = [];
    for (let i = 0; i < regions.length; i++) {
      for (let j = i + 1; j < regions.length; j++) {
        const a = regions[i].bounds;
        const b = regions[j].bounds;
        const cruzaY = !(a.y1 <= b.y0 || b.y1 <= a.y0);
        const cruzaX = !(a.x1 <= b.x0 || b.x1 <= a.x0);
        if (cruzaY && cruzaX) solapes.push(`${regions[i].zone}#${i}/${regions[j].zone}#${j}`);
      }
    }
    expect(solapes).toEqual([]);
  });

  it('expandir no encoge nada: cada región sale igual o más grande que la cruda', () => {
    for (let i = 0; i < regions.length; i++) {
      const r = raw[i].bounds;
      const e = regions[i].bounds;
      expect(e.x0).toBeLessThanOrEqual(r.x0);
      expect(e.x1).toBeGreaterThanOrEqual(r.x1);
      expect(e.y0).toBeLessThanOrEqual(r.y0);
      expect(e.y1).toBeGreaterThanOrEqual(r.y1);
    }
  });
});

describe('expandToTouchTarget — el algoritmo de reparto, aislado de la figura real', () => {
  // Casos de laboratorio: fijan CÓMO reparte el hueco libre, sin depender de
  // que la figura genere exactamente esta geometría.
  const zone = (z: BodyZone) => z; // solo para tipar los fixtures abajo

  it('una región ya de 44+ no se toca', () => {
    const out = expandToTouchTarget([
      { zone: zone('cabeza'), bounds: { x0: 0, y0: 0, x1: 50, y1: 50 } },
    ]);
    expect(out[0].bounds).toEqual({ x0: 0, y0: 0, x1: 50, y1: 50 });
  });

  it('sin vecinas, crece libre hasta el mínimo por los dos lados', () => {
    const out = expandToTouchTarget([
      { zone: zone('cabeza'), bounds: { x0: 100, y0: 100, x1: 110, y1: 110 } }, // 10×10
    ]);
    const b = out[0].bounds;
    expect(b.x1 - b.x0).toBe(44);
    expect(b.y1 - b.y0).toBe(44);
    // Centrado: crece lo mismo para cada lado.
    expect(b.x0).toBeCloseTo(100 - 17, 5);
    expect(b.x1).toBeCloseTo(110 + 17, 5);
  });

  it('con una vecina pegada, el reparto para justo en la mitad del hueco — nunca se cruzan', () => {
    const out = expandToTouchTarget([
      { zone: zone('cabeza'),    bounds: { x0: 0, y0: 0, x1: 10, y1: 44 } },
      { zone: zone('mandibula'), bounds: { x0: 20, y0: 0, x1: 30, y1: 44 } }, // hueco de 10 entre ambas
    ]);
    const [a, b] = out.map((r) => r.bounds);
    expect(a.x1).toBeCloseTo(15, 5); // 10 + hueco/2
    expect(b.x0).toBeCloseTo(15, 5); // 20 - hueco/2
    expect(a.x1).toBeLessThanOrEqual(b.x0); // se tocan, nunca se cruzan
  });

  it('zonas en esquinas distintas (sin solape perpendicular) no se limitan entre sí', () => {
    const out = expandToTouchTarget([
      { zone: zone('cabeza'),  bounds: { x0: 0, y0: 0, x1: 10, y1: 10 } },
      { zone: zone('manos'),   bounds: { x0: 200, y0: 200, x1: 210, y1: 210 } }, // lejos, otra esquina
    ]);
    // Ninguna debería quedarse corta por la otra: las dos llegan a 44.
    for (const r of out) {
      expect(r.bounds.x1 - r.bounds.x0).toBe(44);
      expect(r.bounds.y1 - r.bounds.y0).toBe(44);
    }
  });
});
