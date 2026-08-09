/**
 * bodyScanRender — el pintor compartido del canvas 2D del cuerpo de
 * partículas. Antes vivía solo dentro de `BodyMap3D` (widget interactivo);
 * se extrae para que `BodyScanReport` (el reporte de 6 vistas) pinte
 * EXACTAMENTE el mismo cuerpo con la misma física visual, no una segunda
 * implementación que puede desalinearse del original con el tiempo.
 *
 * Sigue siendo un módulo `.ts` puro en el sentido de "sin React" — recibe un
 * `CanvasRenderingContext2D` ya resuelto por quien llama (ambos
 * consumidores son `.web.tsx`, nunca corre en nativo).
 */
import { palette } from '@/constants/theme';
import type { BodyZone } from '@/lib/bodyMapLogic';
import { PHASE, WORLD } from '@/lib/bodyScanWorld';
import { projectPoint, type Camera } from '@/lib/humanFigure3DLogic';

/**
 * En web `cv()` (constants/themeColors.ts) devuelve strings `var(--c-*)` para
 * los tokens tematizables — y `canvas.fillStyle` NO entiende `var()`: pintaría
 * negro en silencio. Se resuelve la variable real del documento, con el hex
 * de fallback si aún no se inyectó el <style> del tema.
 */
function cssColor(value: string, fallback: string): string {
  if (!value.startsWith('var(')) return value;
  const name = value.slice(4, -1).trim();
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return resolved || fallback;
}

export interface DrawScanOptions {
  /** Zonas señaladas, la primera manda (mismo criterio que el resto de la
   *  app: la que el usuario tocó primero es "la elegida"). */
  selected: BodyZone[];
  /** Segundos transcurridos — controla el shimmer. `0` (o reduce-motion) da
   *  un frame estático determinista, útil para el reporte de 6 vistas. */
  nowSec?: number;
  reducedMotion?: boolean;
}

/** Dibuja un frame completo del cuerpo de partículas en `ctx`, del tamaño
 *  `w`×`h`, con la cámara `cam`. Reusado por el widget interactivo (anima) y
 *  el reporte estático (un solo frame por vista). */
export function drawBodyScan(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cam: Camera,
  opts: DrawScanOptions,
): void {
  const { selected, nowSec = 0, reducedMotion = false } = opts;
  ctx.clearRect(0, 0, w, h);

  const gold = palette.gold; // hex constante de marca — directo.
  const goldDim = cssColor(palette.goldText, '#FFC804');
  const silver = cssColor(palette.silhouette, '#5F5F5F');

  // Resplandor tras la zona primaria: 3 pasadas ADITIVAS (`lighter`) en vez
  // de un único gradiente — más densidad de "arde en oro" sin dibujar nada
  // por punto, que es lo que arrodilla el frame rate.
  const primary = selected[0];
  if (primary) {
    const pts = WORLD.filter((d) => d.zone === primary && !d.edge);
    if (pts.length) {
      let cx = 0, cy = 0, cz = 0;
      for (const d of pts) { cx += d.x; cy += d.y; cz += d.z; }
      const centro = projectPoint(
        { x: cx / pts.length, y: cy / pts.length, z: cz / pts.length },
        cam,
      );
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const pass of [
        { r: 92, a: 0.09 },
        { r: 62, a: 0.15 },
        { r: 32, a: 0.22 },
      ]) {
        const radio = pass.r * centro.scale;
        const glow = ctx.createRadialGradient(centro.sx, centro.sy, 0, centro.sx, centro.sy, radio);
        glow.addColorStop(0, `rgba(255, 200, 4, ${pass.a})`);
        glow.addColorStop(1, 'rgba(255, 200, 4, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(centro.sx, centro.sy, radio, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Proyectar, ordenar de atrás hacia adelante (pintor) y dibujar.
  const projected = WORLD.map((d, i) => {
    const p = projectPoint(d, cam);
    const idx = d.zone ? selected.indexOf(d.zone) : -1;
    const color = idx === 0 ? gold : idx > 0 ? goldDim : silver;
    let alpha = idx === 0 ? (d.edge ? 0.55 : 1)
      : idx > 0 ? (d.edge ? 0.35 : 0.8)
      : d.edge ? 0.28 : 0.85;
    alpha *= Math.max(0.5, Math.min(1, 1 - (p.depth - 520) / 190));
    if (!reducedMotion) alpha *= 0.82 + 0.18 * Math.sin(nowSec * 1.6 + PHASE[i]);
    return { p, color, alpha, r: Math.max(0.4, d.r * p.scale * 0.62) };
  });
  projected.sort((a, b) => b.p.depth - a.p.depth);

  for (const e of projected) {
    ctx.globalAlpha = e.alpha;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.p.sx, e.p.sy, e.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
