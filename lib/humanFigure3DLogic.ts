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

// ── Proyección en perspectiva ─────────────────────────────────────────────────
//
// El renderer web dibuja la nube con canvas 2D y ESTA función — no con
// three.js. La cadena three/react-three-fiber acumuló tres fallos de
// integración con Metro/Expo Web (import.meta, doble copia de three, canvas
// vacío en el navegador real); para una nube de puntos, una proyección de
// cámara son veinte líneas deterministas y testeables — exactamente lo que
// three.js haría por dentro, sin el motor entero ni sus riesgos de bundler.

export interface Camera {
  /** Rotación alrededor del eje vertical, en radianes. */
  yaw: number;
  /** Rotación alrededor del eje horizontal, en radianes. */
  pitch: number;
  /** 1 = encuadre por defecto. */
  zoom: number;
  /** Tamaño del lienzo destino, en píxeles. */
  w: number;
  h: number;
}

export interface ProjectedPoint {
  /** Posición en pantalla, en píxeles del lienzo. */
  sx: number;
  sy: number;
  /** Factor para escalar el radio del punto (perspectiva: lejos = pequeño). */
  scale: number;
  /** Distancia a la cámara — ordenar DESCENDENTE para pintar de atrás
   *  hacia adelante (algoritmo del pintor). */
  depth: number;
}

/** Distancia de la cámara al origen y distancia focal — los mismos valores
 *  con los que se validó visualmente el visor de la figura. */
const CAM_DIST = 520;
const FOCAL = 620;
/** Divisor del encuadre: con el cuerpo centrado (~486 de alto), min(w,h)/340
 *  lo deja completo en el lienzo con aire a los lados. */
const FRAME = 340;

/**
 * Proyecta un punto del MUNDO (centrado en el origen, +y hacia arriba) al
 * lienzo. Quien llama centra la figura antes:
 *   wx = x - VIEWBOX.w/2 · wy = -(y - VIEWBOX.h/2) · wz = z
 */
export function projectPoint(
  p: { x: number; y: number; z: number },
  cam: Camera,
): ProjectedPoint {
  const cosY = Math.cos(cam.yaw);
  const sinY = Math.sin(cam.yaw);
  const cosX = Math.cos(cam.pitch);
  const sinX = Math.sin(cam.pitch);

  // Yaw (gira alrededor del eje vertical)…
  const x1 = p.x * cosY - p.z * sinY;
  const z1 = p.x * sinY + p.z * cosY;
  // …luego pitch (inclina alrededor del eje horizontal).
  const y2 = p.y * cosX - z1 * sinX;
  const z2 = p.y * sinX + z1 * cosX;

  const depth = z2 + CAM_DIST;
  const f = FOCAL / depth;
  const s = (Math.min(cam.w, cam.h) / FRAME) * cam.zoom;

  return {
    sx: cam.w / 2 + x1 * f * s,
    sy: cam.h / 2 - y2 * f * s,
    scale: f * s,
    depth,
  };
}

// ── Toque directo sobre el cuerpo ───────────────────────────────────────────
//
// El dueño lo pidió explícito: "tocar las partículas directo en el cuerpo".
// Sin picking por partícula, el único gesto tocable era el legend de abajo
// (`body-map.tsx`) — la nube en sí era decorativa. `pickZone` cierra eso: el
// candidato más cercano al toque, dentro de un radio, gana. Puro — quien
// llama ya proyectó los puntos del frame actual.

export interface ZoneCandidate {
  sx: number;
  sy: number;
  zone: BodyZone;
}

/** El candidato tocable más cercano a (sx,sy), o `null` si ninguno cae dentro
 *  de `maxDist` píxeles — un toque en el aire junto al cuerpo no debe
 *  seleccionar la zona más próxima aunque esté a 80px. */
export function pickZone(
  candidates: ZoneCandidate[],
  sx: number,
  sy: number,
  maxDist: number,
): BodyZone | null {
  let best: BodyZone | null = null;
  let bestDistSq = maxDist * maxDist;
  for (const c of candidates) {
    const dx = c.sx - sx;
    const dy = c.sy - sy;
    const distSq = dx * dx + dy * dy;
    if (distSq <= bestDistSq) {
      bestDistSq = distSq;
      best = c.zone;
    }
  }
  return best;
}

// ── Vistas preset — el HUD "01. VISTA FRONTAL" … "06. 3/4 DERECHO" ─────────

export interface ViewPreset {
  id: string;
  label: string;
  yaw: number;
  pitch: number;
}

const HALF_PI = Math.PI / 2;

// Mismo orden que la referencia del dueño: frontal, posterior, los dos
// perfiles, los dos 3/4.
export const VIEW_PRESETS: readonly ViewPreset[] = [
  { id: '01', label: 'VISTA FRONTAL',      yaw: 0,               pitch: -0.05 },
  { id: '02', label: 'VISTA POSTERIOR',    yaw: Math.PI,         pitch: -0.05 },
  { id: '03', label: 'PERFIL IZQUIERDO',   yaw: -HALF_PI,        pitch: -0.05 },
  { id: '04', label: 'PERFIL DERECHO',     yaw: HALF_PI,         pitch: -0.05 },
  { id: '05', label: '3/4 IZQUIERDO',      yaw: -HALF_PI / 2,    pitch: -0.05 },
  { id: '06', label: '3/4 DERECHO',        yaw: HALF_PI / 2,     pitch: -0.05 },
];

const TAU = Math.PI * 2;

/** El delta de yaw más corto de `from` a `to`, en (-π, π] — sin esto un tween
 *  lineal de 350° a 10° gira "la vuelta larga" (por 340° en vez de 20°)
 *  cada vez que la órbita libre del usuario cruza la costura de 2π. */
export function shortestYawDelta(from: number, to: number): number {
  let delta = (to - from) % TAU;
  if (delta > Math.PI) delta -= TAU;
  if (delta < -Math.PI) delta += TAU;
  return delta;
}
