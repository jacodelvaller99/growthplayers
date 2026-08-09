/**
 * bodyScanWorld — la nube de puntos en coordenadas de MUNDO, calculada UNA
 * vez a nivel de módulo. La comparten `BodyMap3D` (widget interactivo del
 * check-in) y `BodyScanReport` (el reporte de 6 vistas estilo la referencia
 * del dueño) — antes cada uno la recalculaba por su cuenta; dos copias de
 * "la figura" son dos oportunidades de que diverjan en silencio.
 *
 * Puro y sin DOM — puede importarse desde cualquier plataforma, aunque hoy
 * solo lo consume código web (los dos consumidores son `.web.tsx`).
 */
import { generateFigure3D } from './humanFigure3DLogic';
import { VIEWBOX } from './humanFigureLogic';

/** Semilla fija — el mismo activo de marca en cada sesión. `cell: 3` es el
 *  "escaneo biométrico": ~5.5k puntos, la densidad de la referencia. */
const FIGURE_3D = generateFigure3D({ seed: 90417, cell: 3 });

export const WORLD = FIGURE_3D.map((d) => ({
  x: d.x - VIEWBOX.w / 2,
  y: -(d.y - VIEWBOX.h / 2),
  z: d.z,
  r: d.r,
  zone: d.zone,
  edge: d.edge,
}));

/** Fase de shimmer por punto — determinista, calculada una vez. */
function hash01(n: number): number {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
}
export const PHASE = WORLD.map((d, i) => hash01(d.x * 12.9898 + d.y * 78.233 + i * 0.0013) * Math.PI * 2);
