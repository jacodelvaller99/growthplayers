/**
 * humanFigure3DLogic — le da profundidad a la figura de partículas.
 *
 * `humanFigureLogic.ts` ya resuelve x/y (elipses+cápsulas, 7 zonas, sin
 * solape, testeado). Aquí solo se añade z: el mismo punto 2D, con una
 * profundidad determinista según a qué parte del cuerpo pertenece — la
 * cabeza es casi tan honda como ancha, el pecho menos, el cuello poco. Sin
 * esto la "nube de partículas 3D" sería una tarjeta plana vista de perfil.
 *
 * Determinista por coordenada (hash de x,y), no por índice de un PRNG con
 * estado: la misma figura de `generateFigure()` siempre produce la misma
 * profundidad por punto, sin acoplarse al orden en que esa función itera.
 */
import type { BodyZone } from './bodyMapLogic';
import { generateFigure, type FigureDot, type GenerateFigureOptions } from './humanFigureLogic';

export interface FigureDot3D extends FigureDot {
  z: number;
}

/** Medio-espesor por zona, mismas unidades que x/y. Aproximado por
 *  proporción anatómica real (la cabeza es casi esférica, el torso es
 *  bastante más ancho que hondo), no medido — no hay una referencia exacta
 *  que clonar, y no hace falta: solo tiene que leerse como un cuerpo, no
 *  como una tarjeta. */
const ZONE_DEPTH: Record<BodyZone, number> = {
  cabeza: 30,
  mandibula: 22,
  garganta: 16,
  pecho: 36,
  estomago: 38,
  espalda: 36,
  manos: 13,
};
/** Piernas/pies no son ninguna de las 7 zonas tocables — mismo criterio que
 *  `zone: null` en `humanFigureLogic.ts` — pero igual necesitan un espesor. */
const DECORATIVE_DEPTH = 17;

function zoneDepth(zone: BodyZone | null): number {
  return zone ? ZONE_DEPTH[zone] : DECORATIVE_DEPTH;
}

/** Hash determinista de un número a [0, 1) — sin estado, sin `Math.random`.
 *  Mismo patrón que un ruido de shader: rápido y sobra para jitter visual. */
function hash(n: number): number {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
}

/** Promedio de 3 hashes independientes: reparte los valores hacia el centro
 *  (0.5) en vez de plano — el núcleo del cuerpo debe verse más denso que el
 *  borde, igual que ya pasa en x/y con el halo de `generateFigure`. */
function centeredUnit(x: number, y: number, salt: number): number {
  const h1 = hash(x * 12.9898 + y * 78.233 + salt);
  const h2 = hash(x * 39.346 + y * 11.135 + salt + 7.1);
  const h3 = hash(x * 73.156 + y * 52.235 + salt + 13.7);
  return (h1 + h2 + h3) / 3;
}

/**
 * La figura 2D con z añadida. Reusa `generateFigure()` sin tocarla — misma
 * semilla, mismo x/y, misma anatomía y las mismas 30 pruebas que ya la
 * cubren; esto solo proyecta cada punto a un cuerpo con volumen.
 */
export function generateFigure3D(opts: GenerateFigureOptions = {}): FigureDot3D[] {
  const dots = generateFigure(opts);
  return dots.map((dot) => {
    const depth = zoneDepth(dot.zone);
    const unit = centeredUnit(dot.x, dot.y, dot.edge ? 91.3 : 0);
    return { ...dot, z: (unit - 0.5) * 2 * depth };
  });
}
